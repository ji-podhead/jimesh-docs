# GO-PUBLIC-PLAN — JiMesh als oeffentliches GitHub-Repo

> **Status:** PLAN, nicht ausgefuehrt. Jedes [ ] ist eine Operator-Aktion.
> **Erstellt:** 21.09.2026 (Subagent: GO-PUBLIC-Planung; alle Befunde gegen das
> echte Repo unter /home/ji/projects/jimesh verifiziert, main @ 0d491e0).
> **Vorgaenger:** docs/GO-PUBLIC.md aus Commit deb8da2 (13.9., inzwischen aus dem
> Tree entfernt, noch in der History). Dieser Plan ersetzt ihn.
> **Speicherort:** docs_dev/ ist gitignored — dieser Plan wird bewusst NICHT
> committet, denn er listet die Lecks, die genau nicht public werden duerfen.

---

## 0. Auftrag, Methodik, Grenzen

Geprueft wurden: MANDATES.md (14 Mandate), docs/REQUESTS-TRACKING.md (H1/H2:
Leak-Teilbereinigung + GO-PUBLIC-Plan TEILWEISE, History-Rewrite nie durchgefuehrt,
OP-01 SSH-Cred-Rotation offen), .env (nur Variablennamen, keine Werte kopiert),
git log/-p/-S/-G ueber ALLE 794 Commits und 40 lokalen Branches, git grep ueber den
getrackten Tree, Remote origin (github.com/ji-podhead/JiMesh2.git), Stashes,
Backup-Branch, getrackte Zertifikate, Workflow-Dateien.

**Nicht pruefen konnte ich** (Grenzen, ehrlich):
1. Ob JiMesh2 jemals — auch nur kurz — public stand. Indizien sprechen fuer
   durchgehend privat: GitHub-Pages-Deploy scheiterte am 19.9. mit 422
   „privates Repo" (Commit c2cfd6c). [ ] Operator bestaetigt das.
2. PNG-Bilder visuell: dieses Modell hat keine Bild-Eingabe. Die PNG-Betroffenheit
   ist aus den Quell-HTMLs bewiesen (die IP steht dort in sichtbaren
   UI-Elementen); die PNGs sind daraus gerenderte Screenshots.
   [ ] Vor dem Push visuell gegenpruefen.
3. Ob die Passwort-Werte aus .env.example.jimesh (Historie) jemals real deployed
   waren — sie matchen die HEUTIGE .env nicht (reiner Wertevergleich, ohne
   Werte auszugeben).

Der Smoke-Test des Operators (git log -p --all | grep -iE 'password|secret|key|token')
liefert massenhaft Rauschen („key" trifft i18n-Keys, API-Keys, Route-Keys). Die
harte Verifikation laeuft ueber die praezisen Muster in Paragraf 6.

---

## 1. Ausgangslage

| Fakt | Wert |
|---|---|
| Commits (git rev-list --all --count) | **794** |
| Getrackte Dateien | 1.541 |
| Lokale Branches | 40 (10x worktree-agent-*, 4x wt-*, 2x preserve/*, 1 Backup-Branch) |
| Tags | keine |
| Remote | origin → github.com/ji-podhead/JiMesh2.git — **privat** (Beleg c2cfd6c), traegt diverse Branches (docs/restructure, feat/..., feature/okf-...) |
| .git-Groesse | 55 MB loose / 159 MB pack |
| Betroffene Commits | **51** Commits (IP/Cred-Muster) + ca. 26 (/home/ji-Pfade, Zahl aus deb8da2) + Wazuh/SIEM-Demo-Defaults |
| Installierte Rewrite-Tools | **keine** — git-filter-repo, bfg, java, gitleaks, trufflehog fehlen alle |
| Offene Operator-Items | OP-01 (SSH-Creds rotieren) [ ], OP-04 (public Repo anlegen) [ ] — REQUESTS-TRACKING H1/H2 |

**Zwei-Repo-Architektur (aus deb8da2, bleibt bestehen):** JiMesh2 = privates
Archiv mit VOLLER History (alle Lecks bleiben dort gebunden), plus ein NEUES
oeffentliches Repo. **JiMesh2 wird niemals auf public geflippt** und die alte
History niemals in das public Repo gepusht.

---

## 2. Fundinventar — ALLE sensiblen Daten

### 2.1 P0 — echte Credentials (geleakt und bereits auf GitHub gepusht)

| # | Fund | Beweis | Folge |
|---|---|---|---|
| L1 | **SSH-Credential-Trio**: Host 100.113.144.81, User sys_ex, echtes Passwort (onboardPass='LITERAL — hier bewusst nicht abgedruckt') | Commit 60535c3 (docs/research/R39-frontend-slop-audit.md, **Zeile 145**) UND Commit 07cebbd (R43 zitiert dieselben Creds). Beide auf origin gepusht. | **Passwort ist verbrannt.** Rotation + PasswordAuth off zwingend (OP-01). |
| L2 | Dasselbe Host/User-Paar **im aktuellen Tree** | docs/API_DOCS.md:356,375 (HOST=http://100.113.144.81:19091), src/scripts/setup-ssh.sh:18-19 (REMOTE_HOST/REMOTE_USER hardcoded), src/examples/jimeshctl (bash, curl-Beispiele) | Tree-Scrub noetig (Phase 1). |
| L3 | .env.example.jimesh — 22 Variablen inkl. Passwort-Felder (POSTGRES_PASSWORD, VAULT_DEV_ROOT_TOKEN, KC_ADMIN_PASS, KC_DB_PASS, INITIAL_ADMIN_PASSWORD, DASHBOARD_CLIENT_SECRET) | Hinzugefuegt 4fde115, entfernt 2e6f919 → **nur in History**. Werte matchen NICHT die heutige .env, sind aber keine Platzhalter (Laengen 15-24). | Als jemals-gueltig annehmen → Rotation von Postgres/KC/Vault/Initial-Admin. Aus History purgen. |
| L4 | Wazuh/SIEM-Demo-Defaults | deploy/siem/docker-compose.yml:57,123,138,141,258 (Default-Fallbacks SecretPassword bzw. kibanaserver), deploy/siem/config/wazuh_indexer/internal_users.yml (Demo-User-Hash) | Defaults entfernen (Pflicht-Env statt :-Fallback), Config als Demo kennzeichnen. History: 2 Commits (Zahl aus deb8da2). |
| L5 | .env.example-Restwerte: KC_BOOTSTRAP_ADMIN_USERNAME == realer .env-Wert; KC_BOOTSTRAP_ADMIN_PASSWORD, DASHBOARD_CLIENT_SECRET, VITE_AUTH_MODE sind keine Platzhalter | Vergleich Example-vs-.env (Werte nie ausgegeben) | Username generisch machen; die zwei Secret-artigen Werte rotieren (falls je real deployed gewesen). |
| L6 | .env selbst — 57 Variablen, **nie committet** (git log --all --oneline -- .env leer), aber laut Sprint-19-Incident (MANDATES §12 Fall 1: „dumping six .env files in plaintext") einmal von aussen exfiltrierbar gewesen | MANDATES.md:189-199 | Alle .env-Secrets als exposed annehmen → volle Rotation (4.2), unabhaengig von jedem Rewrite. |

### 2.2 P0/P1 — Infrastruktur-Daten im aktuellen getrackten Tree

**Echte Public-IP des Trading-Node: 187.124.2.174** (haeufig verknuepft als root@):

- design-assets/stitch/ — **28 HTML-Dateien** (u. a. app-discovery, infrastructure-sidebar
  x2, ssh-target-detail-root-187-124-2-174, onboarding x2, workspace-detail,
  teams-bindings, tool-call-inspector, siem-events, target-selector x2,
  scope-selector x2, firewall-rules, global-search, integrations,
  notification-center, deployment-detail, container-logs, agent-session-detail,
  distributed-trace, app-detail, network-management, manifest.json, website-tour.html) — P0
- src/frontend/src/views/TourPage.tsx:272,276 und website/src/app/tour/page.tsx
  (root@187.124.2.174 im Mock-Konsolen-Text) — P0
- src/frontend/src/components/rbac/team-bindings-panel.test.tsx:28,97,125 (Test-Fixture) — P1
- stitch-gap3.cjs, stitch-gen.cjs, stitch-r4.cjs, stitch-selectors.cjs (Root;
  Stitch-Prompts mit realer IP) — P1
- docs/STITCH-MCP-GUIDE.md:66 (root@187.124.2.174, 100.64.0.6) — P1
- **docs/SSH-ACCESS-ROUTES.md — komplette Zugriffskarte**: SSH-Routen ueber
  jimesh-operator@172.17.0.2, 100.64.0.6:22, Public-IP-Route
  (ssh jimesh-operator@187.124.2.174), iptables-Regeln inkl.
  **Operator-Allowlist-IP 176.0.65.75** (Zeile 67), komplette Portmap — **P0:
  Datei hat im public Repo nichts verloren**
- docs/DEPLOYMENT-URLS-2026-09-19.md — Topologie: 100.64.0.6, 100.64.0.4,
  172.17.0.2, 187.124.2.174:443 (Headscale), Pfade, sudo-Hinweise — P0

**Tailnet-/VPN-IPs 100.64.0.6 (Control-Node) / 100.64.0.4 (Client)**, weiter verteilt in:
Makefile:279-280 (Default 100.64.0.6:8090), deploy/backend/defaults.yml:45,
deploy/podhead-client/entrypoint.sh, scripts/restore-jimesh-client.sh,
docs/AUDIT-DEPLOYMENT.md, docs/HANDOFF-2026-09-18/20, docs/JULES-SESSIONS-2026-09-19.md,
docs/STITCH-DESIGN-STATUS-USERFLOWS.md, docs/sprints/SPRINT-5-MARKETING-WEBSITE.md.

**Weitere:**
- 100.113.144.81: siehe L2.
- 88.198.67.200 (alte WAN-IP) — ausgerechnet in MANDATES.md:223 als Beispiel zitiert.
- 172.17.0.2 (Docker-Bridge = Operator-Host in den Topologie-Docs): in Code/Tests
  eine generische Docker-Bridge-Adresse (unbedenklich, bleibt); in den
  ausgeschlossenen Topologie-Docs verschwindet sie mit diesen.
- Test-Fixtures mit 100.64.0.1/.2 (exposure_test.go, acl-policy.test.ts): generische
  Beispiel-IPs, keine echten Nodes → OK, bleiben.

### 2.3 P1 — History-only (aus Tree bereits entfernt, aber in History)

| Fund | Beweis |
|---|---|
| docs/research/ (57 Dateien, R1-R43) inkl. der R39/R43-Cred-Leaks, R32-WAN-IP | entfernt in f0b3d93 |
| docs/sprints/ inkl. **committeter Session-Transcripts**: docs/sprints/session.jsonl, docs/sprints/subagents/*/session.jsonl (Blobs nachgewiesen), docs/sprints/dsh-advanced/, SPRINT-19-INCIDENT-Doc | committet ab faea7f1/a644f49, untracked in 24f281c/c61cfd5 — Gitignore-Kommentar: „have already contained real leaked credentials in the past" |
| .dsh/config.json (2.266 Zeilen Workspace-Deploy-State) | entfernt in 2e6f919 |
| .env.example.jimesh | siehe L3 |
| docs/GO-PUBLIC.md (deb8da2) — alte Plandatei mit Leak-Inventar | entfernt in 2e6f919 |
| .env.example-Historie vor der Platzhalter-Bereinigung | eeccea5 machte Example public-safe; aeltere Versionen bleiben in History |
| docs/prompts/CHAT_LOG* | interne Chat-Logs (deb8da2 §3 schloss sie bereits aus) |

### 2.4 P1 — Commit-Messages mit Infrastruktur-Daten

IPs/Ports stehen in Messages: e6458a1 („100.64.0.6:8090", „Operator-SSH via 2222"),
882cdbb („100.64.0.6:8090"), 097cc50 („172.17.0.2:8081"), 711e00b
(„socat 8090/8081/2222"), f062d45, 8f5e656, 2e6f919 u. a.
→ **Der Rewrite MUSS Commit-Messages mitscrubben. Das kann BFG nicht** (3.).

### 2.5 P2 — Identitaets-/Pfad-Reste

- /home/ji-Pfade: ca. 26 Commits laut deb8da2 (docker-compose.yml, Makefile,
  CLAUDE.md, cdc-Test-Kommentare). CLAUDE.md enthaelt zudem die
  Stitch-Projekt-ID (unkritisch ohne API-Key).
- Operator-Hostnamen (podhead, Node-Name trading in config.yml): podhead ist
  zugleich der oeffentliche Handle (ji-podhead) — im Marketing-Kontext OK; als
  Host-Beschreiber in Deploy-Docs intern. config.yml selbst ist sauber (nur
  Namen/Rollen, keine IPs — auch historisch nie, per Diff-Scan belegt).
- Autoren-E-Mail ji &lt;ji@podhead.com&gt; in allen Commits (Entscheidung 7).

### 2.6 Binaerdateien — PNGs

--replace-text ersetzt **keine** Binarinhalte. Betroffen:
1. design-assets/stitch: PNG-Gegenstuecke der 28 IP-belasteten HTMLs (die IP
   steht dort in sichtbaren UI-Elementen → sehr wahrscheinlich im Screenshot
   gerendert). Exakte Liste per Skript (Phase 2, Schritt 5).
2. website/public/screens/: 3 der 8 Tour-Screens stammen von IP-HTMLs:
   app-discovery-with-networks.png, network-management-vlans-overlay.png,
   agent-session-detail.png. Sobald das Repo public ist, veroeffentlicht
   GitHub Pages diese automatisch mit (der Workflow existiert bereits).
[ ] Visuelle Operator-Kontrolle vor Push (ich kann PNGs hier nicht ansehen).

### 2.7 Geprueft und SAUBER (Belege)

- .env: **nie** in irgendeinem Commit (git log --all --oneline -- .env leer).
- docs_dev/: nie committet.
- deploy-pi.sh, update-hermes.sh, monetization/, .ansible-run/, *.jsonl (nach
  Untrack), deploy/*/overrides.local.yml, .rendered.ini: nie committet.
- config.yml: getrackt, historisch und aktuell ohne IPs/Secrets.
- Keine privaten SSH-Keys in History (Pickaxe auf BEGIN OPENSSH/RSA/EC PRIVATE
  KEY trifft nur den Fake-Testkey in scanner_test.go:104); keine ghp_-/AIza/AKIA-/
  sk-or-v1-Literale ausser Test-Fixtures (scanner_test.go:92 = kanonischer
  AWS-Example-Key, K-LAF-ARCHITECTURE.md = Muster-Listing,
  WorkspaceEndpointsPage.tsx:452 = Input-Placeholder).
- knowledge/: sauber (Scrub ecf1764 wirkt; kein IP-//home/ji-Treffer).
- Tags: keine. Stashes: 2 (alter WIP; werden im Rewrite-Klon nicht uebernommen,
  bleiben im Privatarchiv).
- Backup-Branch backup-16-9-full-worktree-state-0919: traegt .dsh/config.json +
  .env.example.jimesh — bleibt im Privatarchiv, wird nie public gepusht.

---

## 3. Strategie: BFG vs. git filter-repo (vs. Fresh-Start)

| Kriterium | BFG | **git filter-repo** | Fresh-Start (deb8da2-Entscheidung) |
|---|---|---|---|
| Commit-Messages scrubben | nein (unmoeglich — K.-o., s. 2.4) | ja, --replace-message | ja (neue Messages) |
| Binaer-PNGs | nein | nein (nur Entfernen via Path-Purge) | ja (nur saubere Dateien exportieren) |
| Content-Replace (IPs, Pfade, Passwort) | ja, --replace-text | ja, --replace-text | entfaellt |
| Pfad-Purge ueber ganze History | ja | ja, --invert-paths / --paths-from-file | ja |
| Abhaengigkeit auf diesem Host | Java — nicht installiert | pip install git-filter-repo | keine |
| Wartung/Empfehlung | eingefroren | von GitHub dokumentiert (Sensitive Data Removal) | entfaellt |
| History bleibt | ja (geschrubbt) | ja (geschrubbt) | nein (single initial commit) |
| Restrisiko | mittel (Messages!) | gering nach Verifikation | am geringsten |

**Empfehlung: git filter-repo.**

1. BFG ist disqualifiziert: kein Java auf dem Host und — fundamental — BFG kann
   Commit-Messages nicht anfassen; die IP-Belege in Messages (2.4) blieben public.
2. filter-repo scrubbt mit derselben Replacement-Datei Blobs UND Messages und
   purgt ganze Pfade ueber die History — alles in einem deterministischen Lauf.
3. Der alte Einwand von deb8da2 („BFG/Filter-Branch unzuverlaessig, Tokens wandern
   durch Messages/Squash-Fragmente") trifft auf filter-repo + die
   Verifikations-Suite aus Paragraf 6 nicht mehr zu. Aber er traegt als
   Restrisiko-Argument weiter — deshalb Plan B.
4. **Plan B (falls die Verifikation auch nur EINEN echten Fund meldet):**
   Fresh-Start-Export (deb8da2 §4: orphan-branch, kuratierter Tree, kein
   History-Import). 100 % sicher, kostet die 794-Commit-Entwicklungsgeschichte.
5. **Der unverhandelbare Kern: Rotation geht vor Rewrite.** Die Lecks STANDEN auf
   GitHub (privat — aber jede spaetere Sichtbarkeitsaenderung, jedes Leaken von
   Access-Tokens, jeder Clone macht sie oeffentlich). Der Rewrite ist Hygiene,
   die Rotation ist Sicherheit. Beide sind Pflicht.

---

## 4. VORHER: Rotation & Vault/Env-Umzug (P0 — vor jedem Push)

### 4.1 Sofort (heute, unabhaengig vom Rest des Plans)

1. [ ] **sys_ex-Passwort auf 100.113.144.81 rotieren** (das Literal aus 60535c3
   ist das geleakte; OP-01). Danach PasswordAuthentication no in sshd_config,
   nur Key-Auth; AllowUsers + Firewall-Allowlist pruefen.
2. [ ] Auf der Trading-Node (187.124.2.174): SSH-Haertung pruefen (Passwort-Login
   aus? Key-only? Allowlist?) — die IP wird durch GO-PUBLIC oeffentlich bekannt
   (sie steckt in 28 Design-Dateien der History).
3. [ ] Bestaetigen: JiMesh2 war nie public (0.).
4. [ ] GitHub-PAT fuer Deployments/CI auf JiMesh2: neu, least-privilege ausstellen
   (Deploy-Mandat: GIT_TOKEN wandert in Container — alter Token hatte ggf.
   Vollzugriff).

### 4.2 Rotations-Tabelle (alle 57 .env-Variablen, kategorisiert)

**ROTATE — P0 (geleakt oder incident-exponiert; Sprint-19-Dump-Annahme):**

| Variable | Grund | Ziel |
|---|---|---|
| SYS_EX_PW | **direkt geleakt** (L1) | neuer Wert + Vault; Passwort-Login abschalten |
| JIMESH_ADMIN_PASSWORD, BACKEND_SETUP_CODE, ROUTER_PLATFORM_SERVICE_KEY | interne Admin-Secrets | rotieren → Vault |
| KC_BOOTSTRAP_ADMIN_PASSWORD, KC_BOOTSTRAP_ADMIN_USERNAME | Bootstrap; Username steht auch im Example | rotieren; Username generisch (admin) |
| DASHBOARD_CLIENT_SECRET | Keycloak-Client-Secret | rotieren (Realm neu importieren/sync — 5eaa026 zeigt die 4 OIDC-Env-Vars im Backend-Deploy) |
| VAULT_ROOT_TOKEN | Root-Token | rotieren (Vault re-seal/new root); Production: kein Root in .env |
| ENCRYPTION_KEY | AES-GCM-256-Fallback fuer vault_secrets | Achtung, **nicht einfach drehen**: Rotationsroutine noetig (alle verschluesselten Rows mit neuem Key re-encrypten), sonst Datenverlust. Eigener Task. |
| HEADSCALE_API_KEY, HEADSCALE_PREAUTH_KEY, HEADSCALE_OIDC_CLIENT_SECRET | Headscale-Control | rotieren |
| TAILSCALE_GATEWAY_AUTHKEY | Tailnet-Auth | rotieren (alten revoke) |
| CF_API_TOKEN, OPENCODE_GO_API_KEY, OPENCODE_ZEN_API_KEY, ARTIFICIAL_ANALYSIS_API_KEY, OPENROUTER_API_KEY, JULES_API_KEY, STITCH_API_KEY | Provider-Keys | rotieren beim jeweiligen Anbieter; danach im JiMesh-Vault/Pools pflegen |
| VITE_FIREBASE_API_KEY | Google-Key (client-public by design, aber ohne Restrictions abusable) | rotieren + Referrer-/API-Restrictions setzen; uebrige VITE_FIREBASE_* (Projekt-IDs) unkritisch |

**Nicht-Geheimnisse (bleiben):** PORT, NODE_ENV, alle *_PORT, POSTGRES_DB,
REDIS_URL ([ ] pruefen: enthaelt die URL ein Passwort? dann zu ROTATE),
REDIS_ENABLED, HOST_BIND (muss 127.0.0.1 sein — Mandat 12), VITE_AUTH_MODE.

**Infra-Identitaet (nicht rotierbar; verschwindet aus dem public Repo):**
TRADING_HOST/USER/PUBLIC_IP/VPN_IP/HEADSCALE_PORT, OPERATOR_TAILSCALE_IP,
SSH_ALLOWLIST_IPS, CLIENT_HOST/USER, HEADSCALE_URL, JIMESH_KEYCLOAK_PUBLIC_URL,
JIMESH_DASHBOARD_CALLBACK_URL, JIMESH_FRONTEND_ORIGIN, OPERATOR_SSH_PUBKEY
(Pubkey: Neugenerierung optional — reduziert Fingerprinting; dann authorized_keys
auf allen Nodes nachziehen), TAILSCALE_CGNAT_RANGE (Standard-CIDR, unkritisch).

### 4.3 Reihenfolge Vault/Deploy — die Login-Loop-Falle

Die falsche Reihenfolge produziert den 4-Tage-Login-Loop von 5eaa026/037ed11
nochmal. Richtig:

1. Neue Werte generieren (Rotation aus 4.2).
2. In **Vault** schreiben (Mandat 9; deploy/deployments/vault-managed.yml existiert
   als Preset). .env lokal bekommt parallel die neuen DEV-Werte.
3. Lokal: make restart-backend → /health pruefen → Login ueber
   http://localhost:8090 pruefen (Keycloak + die 4 OIDC-Env-Vars im Backend-Deploy!).
4. **Dann** Trading-Node redeployen (make deploy-all bzw. deploy-service) — die
   Node haelt alte Secrets in /opt/jimesh/deploy/backend.env und Container-Env;
   neue Werte dorthin synken, sonst divergiert Node vs. lokal.
5. Erst danach: Repo-Release-Push. Altes Keycloak-Client-Secret in Keycloak
   invalidieren, damit Deploy mit alten Werten nicht mehr funktioniert.

### 4.4 .env.example

KC_BOOTSTRAP_ADMIN_USERNAME generisch machen; die 4 Nicht-Platzhalter-Werte
(KC_BOOTSTRAP_ADMIN_PASSWORD, DASHBOARD_CLIENT_SECRET, VITE_AUTH_MODE, Username)
durch echte Platzhalter ersetzen. Commit VOR dem History-Scrub, damit die
gesaeuberte Example-Datei der neue HEAD ist.

---

## 5. Durchfuehrung — Phasen, Befehle, Timeline

### Phase 0 — SOFORT: Rotation & Haertung (heute, ca. 2-4 h)

Paragraf 4.1 + 4.2 P0-Teil. Unabhaengig von allem anderen. **Kein GO-PUBLIC ohne
gruenes Haekchen an OP-01.**

### Phase 1 — Tree-Scrub-Commit auf main (ca. 1 Tag)

Ein normaler Commit (kein Rewrite!) mit allen 2.2-Funden:

1. docs/SSH-ACCESS-ROUTES.md + docs/DEPLOYMENT-URLS-2026-09-19.md → nach docs_dev/
   verschieben (private Ops-Runbooks — wertvoll, aber nie public).
2. docs/API_DOCS.md:356,375 und src/examples/jimeshctl: 100.113.144.81 →
   Platzhalter bzw. Doku-IP 198.51.100.81.
3. src/scripts/setup-ssh.sh:18-19: REMOTE_HOST/REMOTE_USER als Pflicht-Env
   (Fehler wenn ungesetzt) statt Literale.
4. TourPage.tsx, website/src/app/tour/page.tsx, team-bindings-panel.test.tsx:
   root@187.124.2.174 → root@203.0.113.10 (TEST-NET-3).
5. stitch-*.cjs → nach docs_dev/ (lokale Stitch-Workflow-Skripte); docs/STITCH-MCP-GUIDE.md
   → docs_dev/ (Operator-Workflow, enthaelt IP + Projekt-ID).
6. MANDATES.md:223: 88.198.67.200 durch [WAN-IP] ersetzen (das Mandat verbietet die
   IP — und zitiert sie; doppelt falsch).
7. Makefile:279-280, deploy/backend/defaults.yml:45, deploy/podhead-client/entrypoint.sh,
   scripts/restore-jimesh-client.sh: 100.64.0.6 → Env-Variable bzw. Doku-Beispiel 192.0.2.6.
8. deploy/siem/docker-compose.yml: Default-Fallbacks (:-SecretPassword,
   :-kibanaserver) entfernen → Pflicht-Env-Variablen; internal_users.yml als
   Demo-Config dokumentieren.
9. PNGs (2.6): die 3 belasteten Tour-Screens durch saubere ersetzen (unbelastet
   vorhanden: dashboard-overview, admin-settings-api-keys, security-findings,
   vault-access-matrix, agent-chat) — Tour-Code auf saubere Screens umbiegen;
   belastete PNGs aus website/public/screens/ loeschen.
10. .env.example-Platzhalter (4.4).
11. Checks (Operator, Host-Toolchain — kein Go im Agent-Sandbox):
    cd src/backend && go build ./... && go vet ./... && go test ./...
    cd src/frontend && npx tsc --noEmit -p tsconfig.app.json && npm run test && npm run check:i18n
12. Commit-Message: scrub(security): GO-PUBLIC phase 1 — infra data removed from
    tree (see docs_dev/GO-PUBLIC-PLAN.md 2.2) — **ohne** IPs in der Message
    (Mandat-2-Geist: nicht wieder selbst rein schreiben).

### Phase 2 — History-Scrub im Fresh-Clone (ca. 1/2 Tag)

    # 0) Tools
    pip install --user git-filter-repo
    docker pull zricethezav/gitleaks:latest

    # 1) FRISCHER KLON (filter-repo verweigert verunreinigte Klone;
    #    Haupt-Checkout bleibt unangetastet = Privatarchiv)
    git clone --no-local /home/ji/projects/jimesh /home/ji/projects/jimesh-scrub
    cd /home/ji/projects/jimesh-scrub

    # 2) replacements.txt — Textersetzungen in Blobs UND Messages
    cat > replacements.txt <<'XEOF'
    187.124.2.174==>203.0.113.10
    100.64.0.6==>192.0.2.6
    100.64.0.4==>192.0.2.4
    100.113.144.81==>198.51.100.81
    88.198.67.200==>203.0.113.200
    176.0.65.75==>198.51.100.75
    sys_ex==>deploy-user
    /home/ji/==>/home/user/
    XEOF

    # 3) Das geleakte Passwort-Literal ergaenzen — ohne es hier abzudrucken
    #    (Beweis: Zeile 145; dasselbe Literal zitiert auch 07cebbd-R43;
    #    die Datei wird gleich komplett gepurgt — die Replacement-Zeile ist
    #    das Sicherheitsnetz fuer alle anderen Stellen):
    git show 60535c3:docs/research/R39-frontend-slop-audit.md | grep -oE "onboardPass='[^']*'" | cut -d"'" -f2 | sed "s/.*/&===>***REMOVED-ROTATED***/" >> replacements.txt

    # 4) purge-paths.txt — alles, was im public Repo NIE existieren darf
    cat > purge-paths.txt <<'XEOF'
    docs/sprints/
    docs/prompts/
    docs/research/
    docs/tasks/
    docs/backlog/
    docs/registers/
    docs/reference/
    docs/legacy/
    docs/i18n-translation/
    docs/GO-PUBLIC.md
    docs/SSH-ACCESS-ROUTES.md
    docs/DEPLOYMENT-URLS-2026-09-19.md
    docs/STITCH-MCP-GUIDE.md
    docs/STITCH-DESIGN-STATUS-USERFLOWS.md
    docs/FRONTEND-MOCK-PLAN.md
    docs/REQUESTS-TRACKING.md
    docs/HANDOFF-2026-09-18-FULL-TRANSFER.md
    docs/HANDOFF-2026-09-20-COMPLETE.md
    docs/JULES-SESSIONS-2026-09-19.md
    docs/AUDIT-DEPLOYMENT.md
    docs/AUDIT-BACKEND-SECURITY.md
    docs/AUDIT-FRONTEND-QUALITY.md
    .env.example.jimesh
    .dsh/
    stitch-gap3.cjs
    stitch-gen.cjs
    stitch-r4.cjs
    stitch-selectors.cjs
    scripts/restore-jimesh-client.sh
    scripts/extract-session-prompts.py
    XEOF

    # 5) Belastete Design-Assets (HTML + PNG-Pendants) + 3 Tour-Screens
    git grep -lE '187\.124\.2\.174|100\.64\.0\.[46]|100\.113\.144\.81' -- design-assets/stitch >> purge-paths.txt
    for f in $(git grep -lE '187\.124\.2\.174' -- design-assets/stitch | grep '\.html$'); do p=$(echo "$f" | sed 's/\.html$/.png/'); git ls-files --error-unmatch "$p" >/dev/null 2>&1 && echo "$p" >> purge-paths.txt; done
    echo website/public/screens/app-discovery-with-networks.png >> purge-paths.txt
    echo website/public/screens/network-management-vlans-overlay.png >> purge-paths.txt
    echo website/public/screens/agent-session-detail.png >> purge-paths.txt
    sort -u purge-paths.txt -o purge-paths.txt
    # [ ] Liste DURCHLESEN: alles, was im public Repo bleiben soll, wieder rausnehmen

    # 6) Der Rewrite — ein Lauf, alles zusammen
    git filter-repo --invert-paths --paths-from-file purge-paths.txt --replace-text replacements.txt --replace-message replacements.txt --force
    # Falls die filter-repo-Version --replace-message nicht kennt (ab ca. 2.45
    # vorhanden), stattdessen --message-callback mit denselben Ersetzungen
    # (message.replace(b"187.124.2.174", b"203.0.113.10") usw.).

    # 7) Nur main wird public — alle anderen Branches im Scrub-Klon loeschen
    #    (backup-Branch enthaelt .dsh/config.json + .env.example.jimesh → nie public!)
    git branch | grep -vE '^\*? *main$' | xargs -r git branch -D

Wichtig:
- filter-repo resettet Remotes — gut so. **Kein push --force auf JiMesh2!**
  JiMesh2 bleibt unveraendert als Privatarchiv stehen.
- Stashes und die uebrigen Branches bleiben im Original-Checkout (Privatarchiv).

### Phase 3 — Verifikation (ca. 1/2 Tag, ABBRUCHKRITERIUM → Plan B)

Siehe Paragraf 6. Kernaussage: alle Grep-/Pickaxe-Tests muessen LEER sein,
gitleaks muss 0 echte Funde melden, die 3 ersetzten Tour-Screens muessen visuell
sauber sein.

### Phase 4 — Public-Push & Repo-Setup (ca. 1/2 Tag)

1. [ ] Neues leeres Repo anlegen: github.com/ji-podhead/jimesh (Name frei —
   NICHT JiMesh2 flippen). Kein Init-README (sonst Merge-Konflikt).
2. git remote add public https://github.com/ji-podhead/jimesh.git && git push public main
3. GitHub aufruesten: Branch-Protection auf main (PR-only), **Secret Scanning +
   Push Protection ON**, Dependabot ON, gitleaks-CI-Job ergaenzen (bestehende
   .github/workflows/ci.yml erweitern — TASK-086-Slop-Gate-Geist).
4. Erste CI-Runner gegenlaufen lassen (go build/vet CGO-frei + tsc + vitest sind
   Runner-tauglich; DB-abhaengige Tests gehoeren nicht nach GitHub).
5. Pages: .github/workflows/deploy-website.yml feuert auf push main — entscheiden:
   Pages wirklich aktivieren (Screens sind sauber, wenn Phase 1+2 gruen sind).
6. Sichtbarer Endcheck: einen FRISCHEN GitHub-Clone ziehen und Paragraf 6 DARAUF
   laufen lassen (nicht nur im Scrub-Klon).

### Phase 5 — Post-Public (fortlaufend)

- JiMesh2-Archiv-Politik: privat lassen. Loesch-Entscheidung nach 30-90 Tagen
  (Backup-Strategie: git bundle auf verschluesseltes Ziel ausserhalb des Repos).
- GitHub Secret-Scanning-Alerts des public Repos 4 Wochen beobachten — jeder
  Alert = Verifikationsluecke = nacharbeiten.
- REQUESTS-TRACKING H2: OP-04 damit abgehakt; OP-01 war Phase 0.

### Timeline (realistisch)

| Tag | Phase | Ergebnis |
|---|---|---|
| T+0 | Phase 0 | sys_ex rotiert, SSH gehaertet, .env-Neuwerte erzeugt |
| T+1 | Phase 1 | Tree-Scrub-Commit, Checks gruen |
| T+2 | Phase 2 | Vault-Migration + restart-backend + Node-Redeploy (4.3-Reihenfolge!), Scrub-Lauf |
| T+3 | Phase 3 | Verifikation gruen ODER Plan-B-Entscheidung |
| T+4 | Phase 4 | public Repo lebt |
| T+5... | Phase 5 | Beobachtung, Archiv-Politik |

---

## 6. Verifikations-Checkliste (Mandat 6 — exakte Befehle, erwartete Ausgaben)

Ausgefuehrt im **Scrub-Klon** und nochmal im **frischen GitHub-Clone**:

    # 1) Operator-Smoke-Test — rauschanfaellig, aber laufen lassen:
    git log -p --all | grep -iE 'password|secret|key|token' | head -20
    #    Erwartung: nur i18n-/API-/Route-„key"-Treffer, KEINE Werte.

    # 2) Die harte Pruefung — ALLE muessen 0 Commits und 0 Dateien liefern.
    #    Das Passwort-Literal steht nur in replacements.txt (Phase 2, Schritt 3),
    #    nicht in diesem Plan — es wird hier zur Laufzeit herausgeholt
    #    (Inspiron = Dell-Modellkontext des geleakten Passworts):
    PW=$(grep -i inspiron replacements.txt | sed 's/==>.*//')
    for s in "$PW" '187\.124\.2\.174' '100\.113\.144\.81' '88\.198\.67\.200' '176\.0\.65\.75' '100\.64\.0\.[46]'; do echo "-- [pattern]: $(git log --all --oneline -S"$s" | wc -l) Commits, $(git grep -lE "$s" | wc -l) Dateien"; done

    # 3) Blob-Grep ueber die GESAMTE History (deckt Pickaxe-Luecken):
    git log -p --all | grep -cE "$PW|187\.124\.2\.174|100\.113\.144\.81"
    #    Erwartung: 0

    # 4) Private Keys / Token-Literale:
    git log --all -S'BEGIN OPENSSH PRIVATE KEY' --oneline | wc -l   # 0
    git log --all -S'BEGIN RSA PRIVATE KEY' --oneline --name-only --format='%h' | sort -u
    #    erlaubt: NUR src/backend/internal/scanner/scanner_test.go (bekannter
    #    Fake-Testkey, bleibt im Repo — gitleaks-allowlist); jeder andere Treffer = Fund
    git log --all -S'ghp_' --oneline | wc -l                       # 0

    # 5) Purge-Kontrolle:
    git log --all --oneline -- docs/sprints/ docs/research/ .env.example.jimesh .dsh/ | wc -l   # 0
    git ls-files | grep -cE 'session\.jsonl|\.pem$|\.dsh/'                                      # 0

    # 6) gitleaks (docker, ohne Host-Go):
    docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --no-banner
    #    Erwartung: 0 echte Funde; bekannte False-Positives via .gitleaks.toml-allowlist:
    #      [allowlist]
    #      description = "known test fixtures / pattern docs"
    #      paths = [
    #        '''src/backend/internal/scanner/scanner_test.go''',
    #        '''src/backend/internal/agentconfig/scanner_test.go''',
    #        '''docs/K-LAF-ARCHITECTURE.md''',
    #        '''src/frontend/src/views/WorkspaceEndpointsPage.tsx''',
    #      ]

    # 7) Visuell (Operator; ich kann PNGs hier nicht ansehen):
    #    - website/public/screens/: die 3 ersetzten Tour-Screens zeigen keine IP
    #    - git ls-files | wc -l → Zahl plausibel (purge hat Dateien entfernt)

    # 8) Build-Checks nach Phase 1 (Operator, Host-Toolchain):
    cd src/backend && go build ./... && go vet ./... && go test ./...
    cd src/frontend && npx tsc --noEmit -p tsconfig.app.json && npm run test && npm run check:i18n

    # 9) Commit-Zahl plausibel (Purge leert Commits, geleerte werden gepruned = OK):
    git rev-list --all --count   # etwas unter 794, kein massiver Einbruch

**Abbruchkriterium:** ANY der Tests 2-6 liefert einen ECHTEN Fund (kein
gelisteter False-Positive) → kein Push → Plan B (Fresh-Start) oder Fund
nachpflegen und Phase 2+3 wiederholen.

---

## 7. Offene Entscheidungen (Operator)

1. **History im public Repo?** Empfehlung: ja, geschrubbt (Entwicklungsgeschichte
   hat fuer ein Open-Source-Produkt Wert). Alternative Plan B steht bereit.
2. **IP 187.124.2.174 publizieren?** Der Scrub entfernt sie aus dem public Repo;
   die IP bleibt trotzdem angreifbar (war jahrelang aktiv). Optionen: Haertung
   reichen (Key-only + Allowlist — Pflicht) ODER IP beim Hoster wechseln
   (radikal, betrifft DNS/Headscale/SSH-Allowlist).
3. **Autoren-E-Mail:** ji@podhead.com in 794 Commits. Empfehlung: GitHub-Noreply
   (ID+ji-podhead@users.noreply.github.com) via filter-repo --email-callback —
   Spam-/Korrelationsschutz. Sonst bleibt sie public.
4. **Node-Name trading in config.yml:** verraet Host-Zweck. Umbenennen
   (control-1) beruehrt render-inventory.py/Deploy-Skripte — Aufwand abwaegen.
   podhead als Handle ist public-gewollt, als Hostname in Deploy-Dokumenten
   purgen wir ueber die Doku-Ausschluesse mit.
5. **design-assets/stitch im public Repo:** Empfehlung: nur gesaeuberte/
   unbelastete Screens behalten (Marketing nutzt ohnehin nur website/screens).
   Das komplette interne Design-Archiv kann in JiMesh2/privat bleiben.
6. **README/AGENTS.md/CLEAN-BACKLOG.md:** deb8da2 §5 hat den Inhalt bereits
   konzipiert (README-Rewrite ohne Task-Nummern/Operator-Namen, CLEAN BACKLOG als
   Jules-Task-Quelle, AGENTS.md statt CLAUDE.md). Das ist Schreibarbeit nach dem
   Security-Go — nicht Teil dieses Plans, aber vor Launch-PR sinnvoll.
7. **Lizenz:** LICENSE.md (PolyForm-Noncommercial) + docs/legal/ — deb8da2 sah
   Review vor; kurz pruefen, dass keine personengebundenen Texte drin stehen.
8. **GitHub Pages:** aktivieren (Workflow existiert) oder erst nach Content-Polish?

---

## 8. Was diesen Plan widerlegen koennte

- JiMesh2 war doch irgendwann public → dann sind alle L1/L3-Secrets uneingeschraenkt
  kompromittiert; Rotation reicht, Plan unveraendert, aber Dringlichkeit rot.
- Das geleakte Passwort ist dasselbe wie SYS_EX_PW in .env (sehr wahrscheinlich
  gleicher Maschinenkontext: Inspiron-Desktop 100.113.144.81) → Rotation deckt
  beides ab; trotzdem beide Kanaele (Git-History + .env) behandeln.
- Falls REDIS_URL Credentials enthaelt → zu ROTATE-Liste nachziehen (4.2 markiert).
- Backup-Branch oder Remote-Branches wurden je geclont/geforkt → Rotation (nicht
  der Rewrite) ist dann die einzige wirksame Massnahme — nochmal der Kern aus 3.
