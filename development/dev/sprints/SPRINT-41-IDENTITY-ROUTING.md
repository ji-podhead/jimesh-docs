# SPRINT-41 — Identity-based Router Proxying (TASK-079, ersetzt TASK-075)

**Schwester-Sprint:** `SPRINT-41-CAPABILITY-RBAC.md` (TASK-070) — gleiche
Sprint-Nummer, getrennte Work-Packages (SPRINT-40-Präzedenzfall:
CONSOLIDATION / HEADSCALE-NETWORKS / SECTION-NAVIGATION).

**Quelle:** TASK-079 (`docs/tasks/subagents/PROMPT-task-079-identity-router-proxying.md`)
auf verifizierter Research-Basis:

- `docs/research/networks_gvisor.md` — **gVisor hat NICHTS mit Port-Kollision
  zu tun.** Docker-Netns geben jedem Container (runc wie runsc) einen eigenen
  Port-Space; zehn Container lauschen parallel auf :3000 ohne Kollision.
  „Random Host-Port pro Clone" ist das FALSCHE Modell — Codespaces/Gitpod/
  Coder haben Raw-Port-Exposure verlassen; die echte Architektur ist
  Identity-based Reverse-Proxy-Routing über EINEN Ingress.
- `docs/research/R32-claude-handoff-document.md` — Zero-Port-Architektur:
  Container publishen NICHTS, Erreichbarkeit läuft über Direct-Dial zur
  internen Container-IP (Gateway: SSH-Kanal; Router: node-lokal) + Identity-
  Gate am Ingress.
- TASK-075 („Multi-User gVisor Random-Port") ist damit widerlegt und durch
  TASK-079 ERSETZT — kein Port-Allokations-Mechanismus wird gebaut.

**Prozessnotiz (Ehrlichkeit):** die erste Implementation in einem Worktree
auf Basis 51bdb68 wurde durch die Parallel-Session-Merge-Wave vom 14.9.
erfasst (Worktree ohne Commits wurde aufgeräumt, main zog auf 16a9d91:
TASK-070/071/074/076 gemerged). Neuaufbau auf 16a9d91 — berührte
Randbereiche verifiziert: `cmd/jimesh-router/` und `router_config.go`
unverändert zwischen den Ständen; der kopierte JWT-Kern
(`validKeycloakToken`) unverändert in `internal/auth`. Lektion: früher
committen (WIP-Commits im eigenen Worktree), erst rebase/squash am Ende.

## Plan (vor Code, Mandat 1.4)

**Ziel:** N parallele Workspaces desselben Projekts, identische App auf
identischem internen Port, gleichzeitig über den Router erreichbar —
JEWEILS nur durch den echten Owner (User A's Token kann User B's Workspace
NICHT erreichen). Keine Host-Ports, keine Port-Allokation.

**Work Packages:**

1. **WP1 Routing-Tabelle (Gateway-Pull-Erweiterung):** der bestehende
   Config-Pull `GET /api/router/config` (TASK-033/058, Long-Poll, Service-Key,
   projekt-gepinnt) liefert zusätzlich `workspaces`-Rows:
   `workspace_id → {ownerSub (users.keycloak_sub), backendIp (Setting
   ssh_<wsId>_internal_ip, persistiert seit TASK-037-Deploy), status}`.
   Neue Composite-Version `al=…;ck=…;ws=<Fingerprint>` — der ws-Teil ist ein
   SHA-256-Fingerprint über (wsId, ownerSub, backendIp, status), damit ein
   Workspace-Deploy/Undeploy/Delete den Long-Poll innerhalb des Intervalls
   weckt. Store-Read in NEUEM File `internal/store/workspace_routes.go`
   (keine bestehende Store-Datei angefasst — Scope-Erweiterung: der Gateway
   kann kein rohes SQL, Store-Methode ist die Minimalvoraussetzung).
2. **WP2 RouteTable im Router:** `cmd/jimesh-router/routes.go` —
   sync.RWMutex-Map workspace_id → Route, atomares Apply aus dem Pull
   (nil = unchanged, leeres Slice = Tabelle leeren — exakt das
   Registry.Apply-Kontrakt-Muster).
3. **WP3 Identity-Check:** `cmd/jimesh-router/identity.go` — Keycloak-JWT-
   Verifikation (RS256 + JWKS). KERN KOPIERT+ADAPTIERT aus
   `internal/auth/auth.go validKeycloakToken` (dokumentiert im File-Header):
   kopiert — manuelle RSA-JWKS-Extraktion, RS256-only, Issuer-Check
   (realms/jimesh), golang-jwt v5 (bereits in go.mod, kein neues Dep);
   adaptiert — standalone (internal/auth.Handlers zieht service.Service/
   Store/Policy in den Binary), JWKS-Refetch bei unbekanntem kid
   (Keycloak-Rotation; das Original cached einmalig prozesslebenslang).
   Ohne JWKS-URL: ehrliches 503, fail-closed.
4. **WP4 HTTP-Proxy:** `cmd/jimesh-router/wsproxy.go` —
   httputil.NewSingleHostReverseProxy, Director strippt den Prefix, setzt
   req.Host, server-derived X-JiMesh-*-Identity-Header (nach Verifikation).
   URL-Schema: **PATH-BASED** `/ws/{wsId}/app/{port}/…` auf dem bestehenden
   3100-HTTP-Demux. Begründung: die existierenden Tunnel-URLs sind
   path-based (`/api/projects/{id}/tunnel/{port}`, R32-iframe-Flow), der
   Router bindet einen fixen Loopback-Listener (kein Wildcard-DNS/TLS für
   Subdomains) — Subdomain-Modell (`{port}-{wsId}.domain`) dokumentiert
   verworfen. Prüfreihenfolge: URL parsen → Identity konfiguriert (503)
   → JWT verifizieren (Bearer oder ?token=, wie internal/auth bearerToken)
   → Lookup (404) → Status muss deployed sein (503) → **Ownership:
   sub == ownerSub, sonst 403** → proxyt.
5. **WP5 Raw TCP (DBs, SSH):** GLEICHES Direct-Dial-Muster wie R32
   (internalIP:port) — extend der BESTEHENDEN Relays, kein zweiter
   Mechanismus: `<wsId>:<port>` im pg-`database`-Feld bzw. Redis-AUTH
   (nach Alias-Miss) → RouteTable-Lookup → Direct-Dial backendIp:port
   durch den unveränderten Relay-Pfad. Transparent Relay = Auth bleibt
   Sache der Workspace-Services (wie die Alias-Registry); das harte
   Identity+Ownership-Gate ist die HTTP-Fläche.
6. **WP6 Clone-Flow:** Concept EXISTIERT bereits (TASK-037):
   `POST /api/workspaces {projectId, ownerUserId}` (Worktree+Key+Session,
   idempotent je Project×User) + `POST /api/projects/deploy {workspaceId}`
   persistiert `ssh_<wsId>_internal_ip` + status=deployed (TASK-037,
   projects_ssh.go). TASK-079 registriert KEINE neue Port-Allokation —
   die Routing-Row entsteht aus genau dieser existierenden Persistenz,
   sichtbar gemacht durch WP1. internal/deploy/workspaces.go braucht
   dafür KEINE Änderung (dokumentiert statt spekulativ geändert).
7. **WP7 Verify:** Unit-Tests am echten Pfad (keine Mocks im Proxy-Pfad):
   2 echte HTTP-Apps auf 127.0.0.2:<port> und 127.0.0.3:<port> — identische
   App, IDENTISCHER interner Port, verschiedene Backend-IPs (= Container-
   Modell); echtes JWKS über httptest (RSA-Key im Test erzeugt, 2 JWTs
   sub-a/sub-b); Requests durch den VOLLSTÄNDIGEN Demux-Pfad (TCP →
   handleConn → httpRelay → mux → wsProxy → App). Kern-Test: A's Token →
   ws-b = **403**, B's Token → ws-a = **403**, jeweils eigener Workspace
   = 200 mit unterscheidbarem Body, gleichzeitig (parallel).

**Akzeptanz:**

- 2 Workspaces, gleicher interner Port, beide parallel erreichbar, nur
  durch den Owner (Negativ-Test als Beweis im Test-Output).
- CGO_ENABLED=0, go-build + go-vet + gofmt grün, scoped Tests grün.
- Kein Task-075-Port-Allokations-Code. Bestehende Surfaces (Alias-Registry,
  Edge-Ingest, Firewall) unverändert im Verhalten.
- Docs: Router-README (Surface + Entscheidungen), Task-File-Status,
  BACKLOG-Spiegel, API_DOCS nur wenn die berührte Route dort bereits
  dokumentiert ist (GET /api/router/config: response-Feld-Extension).

## Retrospektive (was tatsächlich geliefert wurde — verifiziert gegen den Code)

Alle 7 Work Packages umgesetzt, verify bestanden. Fundstellen:

**WP1 — Routing-Tabelle via Config-Pull (Gateway, chirurgisch):**
- `src/backend/internal/store/workspace_routes.go:50` — der Routing-SELECT
  (workspaces × users × settings LEFT JOINs), `:62` ListWorkspaceRoutes
  (volle Liste, ehrliches [] statt nil), `:91` WorkspaceRoutesVersion
  (SHA-256-Fingerprint über wsId|projectID|ownerSub|backendIp|status).
- `src/backend/internal/gateway/router_config.go:158` — der Pull-Handler
  serviert `workspaces` (projekt-gepinnt wie Aliases/Hashes);
  `:197` Composite-Version `"al=…;ck=…;ws=…"` — Workspace-Deploy/Stop/
  Quarantine/Delete weckt den Long-Poll innerhalb des Intervalls.

**WP2 — RouteTable im Router:** `cmd/jimesh-router/routes.go:35`
(WorkspaceRoute), `:45` (RouteTable), `:58` (Apply — nil=unchanged, []=leeren,
Registry.Apply-Kontrakt). Pull-Contract: `pull.go:39` (Workspaces-Feld,
JSON getestet), `:133` (Apply im Loop).

**WP3 — Identity-Check:** `cmd/jimesh-router/identity.go:83` Verify
(RS256-only, Issuer `realms/jimesh`, sub-Pflicht — fail-closed mit Grund),
`:156` rsaKeyFromJWKS (Kopie aus internal/auth, dokumentiert), `:187`
bearerToken (Bearer + ?token=). Kopie-/Adaptionsliste + Warum-nicht-import
im File-Header. Ohne JWKS-URL: ehrliches 503 (Konfig-Zustand, nicht 401).

**WP4 — HTTP-Proxy + Ownership-Gate:** `cmd/jimesh-router/wsproxy.go:62`
wsPath-Parser, `:84` ServeHTTP-Gate (400→503→401→404→503→403→proxy),
**:122** DER OWNERSHIP-CHECK (sub != ownerSub → 403 — User A's Token
erreicht User B's Workspace nie), `:138` NewSingleHostReverseProxy,
`:140` Director (Prefix-Strip, req.Host, X-JiMesh-*-Header server-derived,
client-Forgery gestrippt). URL-Schema path-based `/ws/{wsId}/app/{port}/…`
— Wahl + Verwurf des Subdomain-Modells im File-Header begründet.

**WP5 — Raw TCP:** `cmd/jimesh-router/routes.go:124` resolveWorkspaceTarget
(`<wsId>:<port>`, nur deployed+IP), Fallback NACH Alias-Miss in
`postgres.go:173/:175` (database+user-Feld) und `redis.go:67` (AUTH-Wert)
— derselbe Relay-Pfad, derselbe Audit, R32-Direct-Dial ohne SSH-Strecke.

**WP6 — Clone-Flow:** KEINE Code-Änderung nötig — das Concept existiert
(TASK-037: POST /api/workspaces + deploy {workspaceId} persistiert
`ssh_<wsId>_internal_ip` + status='deployed'); die Routing-Row wird durch
WP1 daraus sichtbar. Dokumentiert statt spekulativ geändert — genau der
„statt Port-Allokation"-Punkt: es gibt keine Port-Allokation.

**WP7 — Verify (alle grün, `go test ./cmd/jimesh-router/ -count=1`):**
- `TestWorkspaceOwnershipIsEnforced` — **der Kern-Negativtest**: 2
  Workspaces eines Projekts, identische App auf IDENTISCHEM internen Port
  (127.0.0.2 / 127.0.0.3, echte Backends, echter JWKS-Server, echte
  RS256-JWTs), A→B und B→A jeweils **403** mit keinem Backend-Body-Leak,
  eigene Workspaces 200 mit unterscheidbarem Body.
- `TestWorkspaceProxySimultaneousParallel` — 24 parallele Requests auf
  beide Workspaces, alle 200, korrekte Bodies (kein Port-Kollisions-Problem
  — der Punkt der gVisor-Research).
- `TestWorkspaceProxyGateRefusals` (8 Sub-Tests: no/garbage/wrong-key/
  foreign-realm-Token, unknown workspace, stopped workspace, 2× malformed
  URL), `TestWorkspaceProxyPrefixStripAndIdentityHeaders` (Backend sieht
  `/deep/nested/path`, verifizierte Identität, Forged-Header kommt nie an),
  `TestWorkspaceProxyTokenQueryParam` (R32-iframe-Kontrakt + fremdes
  ?token= = 403), `TestWorkspaceProxyUnconfiguredIdentity` (503, ehrlich),
  + Unit-Tests (RouteTable-Semantik, wsPath, Pull-JSON-Contract,
  resolveWorkspaceTarget, Identity-Reasons).
- Der komplette Router-Package-Suite grün (Ingest-/Firewall-Regressionen
  unverändert). Build + vet + gofmt grün (CGO_ENABLED=0, golang-Container,
  keine neuen Dependencies — golang-jwt v5 war bereits in go.mod).

**Docs:** Router-README (TASK-079-Sektion + Flag-Tabelle), API_DOCS (GET
`/api/router/config`-Zeile NACHGETRAGEN — schließt die Doku-Lücke der
berührten Route und dokumentiert das `workspaces`-Feld), Task-File-Status,
BACKLOG-Spiegel (079 oben, 075 als widerlegtes Modell markiert).

**Ehrliche Offen-Posten (kein still-versprochenes Feature):**
- Frontend-Nutzung der /ws-URLs (iframe-Embed) = 066/074-Lane, nicht Scope.
- Live-Verify an echtem Remote-Node mit echtem Keycloak ausstehend — die
  Unit-Tests decken den VOLLSTÄNDIGEN Router-Pfad, aber die Test-Umgebung
  hat keinen Remote-Node (dasselbe ehrliche Limit wie TASK-059/061).
- Raw TCP bleibt transparenter Relay (Workspace-DB-Auth ist das Gate) —
  als v1-Grenze dokumentiert, nicht als Identity-Gate behauptet.
