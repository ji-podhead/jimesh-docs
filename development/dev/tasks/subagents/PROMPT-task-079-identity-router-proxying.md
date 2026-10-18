# TASK-079 — Identity-based Router Proxying für parallele Workspaces (ERSETZT TASK-075)

**Status:** ✅ umgesetzt 14.9.2026 (SPRINT-41-IDENTITY-ROUTING.md, Worktree `task/079-identity-router`) | **QUELLE:** gVisor-Research (networks_gvisor.md, verifiziert):
gVisor hat NICHTS mit Port-Kollision zu tun — Docker-Netzwerk-Namespaces geben jedem
Container seinen eigenen Port-Space (egal ob runc/runsc). „Random Host-Port pro Clone"
ist das FALSCHE Modell — Codespaces/Gitpod/Coder haben Raw-Port-Exposure komplett
verlassen. Die echte Architektur: Identity-based Reverse-Proxy-Routing.

## Fundstellen
- docs/research/R32-claude-handoff-document.md (Zero-Port-Architektur: SSH-Direct-Dial
  zu interner Container-IP, keine published Ports — KONZEPTUELL DAS GLEICHE MODELL)
- cmd/jimesh-router/ (der existierende Router-Node)
- internal/auth/keycloak_oidc.go (JWT-Verifikation — WIEDERVERWENDEN, keine zweite Auth)
- internal/deploy/workspaces.go (TASK-037: per-User-Workspaces)

## Architektur (verifiziert, NICHT erraten)
- Jede App läuft auf ihrem natürlichen Port IM Container/gVisor-Sandbox — unberührt,
  nie direkt zum Host/Internet exponiert
- Der Router hält eine in-memory Routing-Tabelle: workspace_id → {ownerID, backendIP,
  targetPort}, befüllt beim Workspace/Clone-Start
- Incoming Requests: Subdomain-Pattern ({port}-{workspaceId}.domain) ODER path-based
  (check zuerst wie die existierenden Tunnel/Dashboard-URLs geformt sind!) — Requester-
  Identität validiert (Keycloak-JWT) + Ownership geprüft (Workspace gehört dem User)
  BEVOR irgendwas proxyt
- Raw non-HTTP TCP (DBs, SSH): GLEICHES Tunneling-Pattern wie der existierende
  SSH-Reverse-Proxy (R32) — KEIN zweiter Mechanismus, extend what's there

## Aufgabe
1. cmd/jimesh-router erweitern: Routing-Tabelle + Identity-Check (Go Reverse-Proxy,
   net/http/httputil.NewSingleHostReverseProxy als Basis, Director der authentifiziert
   + lookupt + rewrites — Standard-Shape, nicht overengineeren)
2. „Clone Workspace for another User" (check TASK-037 ob das Concept existiert oder
   neu ist) → registriert neue Row in der Routing-Tabelle statt Port-Allokation
3. VERIFY: 2 Workspaces vom selben Projekt, identische App auf identischem internen
   Port, beide gleichzeitig über den Router erreichbar — JEWEILS nur durch den echten
   Owner (test: User A's Token kann NICHT User B's Workspace erreichen)

- CGO_ENABLED=0; GIT: explizite Pfade, kein -A, NICHT pushen
- API_DOCS + Sprint-Doc + Task-File-Status

## Abschluss (14.9.2026)

- **Routing-Tabelle:** `cmd/jimesh-router/routes.go` (RouteTable, Pull-Applikation)
  + Store-Read `internal/store/workspace_routes.go` (ListWorkspaceRoutes +
  WorkspaceRoutesVersion, SHA-256-Fingerprint) + Pull-Response-Feld
  `workspaces` in `internal/gateway/router_config.go` + Composite-Version
  `al=…;ck=…;ws=…` — Long-Poll weckt bei Workspace-Deploy/Stop/Delete.
- **Identity-Check:** `cmd/jimesh-router/identity.go` — JWT RS256+JWKS, Kern
  kopiert+adaptiert aus internal/auth (Kopie-/Adaptionsliste im File-Header
  dokumentiert), Refetch bei kid-Miss (Keycloak-Rotation), fail-closed.
- **Proxy:** `cmd/jimesh-router/wsproxy.go` — Pfad-Schema
  `/ws/{wsId}/app/{port}/…` (PATH-BASED, konsistent zum bestehenden
  `/api/projects/{id}/tunnel/{port}`; Subdomain-Modell dokumentiert
  verworfen), httputil.NewSingleHostReverseProxy, Director mit Prefix-Strip
  + req.Host + server-derived X-JiMesh-*-Headern. Gate: 400 → 503
  (unkonfiguriert) → 401 (JWT) → 404 (unbekannt) → 503 (nicht deployed /
  Quarantine) → **403 (Ownership: sub != ownerSub)** → proxyt.
- **Raw TCP:** `<wsId>:<port>` im pg-database-Feld / Redis-AUTH (nach
  Alias-Miss) → `resolveWorkspaceTarget` → Direct-Dial backendIp:port durch
  die unveränderten Relays (R32-Direct-Dial, kein zweiter Mechanismus).
- **Clone-Flow:** Concept EXISTIERT (TASK-037: POST /api/workspaces +
  deploy {workspaceId}); die Routing-Row entsteht aus der existierenden
  Persistenz (ssh_<wsId>_internal_ip + status), KEINE Port-Allokation —
  internal/deploy/workspaces.go braucht keine Änderung (dokumentiert).
- **VERIFY (Kern-Test bestanden):** `TestWorkspaceOwnershipIsEnforced` —
  2 Workspaces, identische App auf IDENTISCHEM internen Port (127.0.0.2 /
  127.0.0.3, echte HTTP-Backends), A's Token auf B's Workspace = **403**
  und umgekehrt, beide parallel erreichbar (TestWorkspaceProxySimultaneous-
  Parallel); außerdem: Prefix-Strip, Header-Forgery-Abwehr, Quarantine
  unerreichbar, ?token=-iframe-Kontrakt, unkonfiguriert = ehrliches 503.
  Alle 9 TASK-079-Tests grün (echter TCP-→Demux-→Proxy-Pfad, echtes JWKS).
- Build/Vet/gofmt grün (CGO_ENABLED=0, golang-Container); kein neues Dep
  (golang-jwt v5 war schon in go.mod).
