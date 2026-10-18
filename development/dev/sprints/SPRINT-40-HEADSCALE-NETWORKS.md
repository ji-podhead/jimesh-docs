# SPRINT-40 — TASK-078: Echte Headscale-Networks-Page (headplane-Port) + Topology + OPA-RBAC

**Quelle:** `docs/tasks/subagents/PROMPT-task-078-headscale-networks.md`
(operator dispatch 14.9.2026, GLM-Session-Batch). Ersetzt TASK-077
(scanopy-Source existiert als eigenständiges Projekt nicht in der
angenommenen Form — unten ehrlich abgerechnet).

**Status:** ✅ fertig — Part 1 (Backend-Fundament) gebaut UND live
verifiziert (unten); Part 2 (headplane-Port) + Part 3 (Topology) gebaut,
geprüft (tsc/eslint/vitest/check:i18n) und live gegen den Stack verifiziert
(14.9., authenticated). Ehrliche Abrechnung unten, inkl. eines
Worktree-Verlusts mit Wiederaufbau.

## Ziel

Die NetworksPage hört auf, eine Shell mit drei 404-Routen zu sein
(R39-Audit S1/S2): `/api/networks/users|nodes|preauthkeys` zeigen auf
die **echte Headscale-Admin-API** des laufenden `jimesh-headscale`
(TASK-036, v0.29.3), die UI portiert **headplanes echte Screens**
(MIT-Port, keine Reskin-Inspiration), und Mesh-Mutationen laufen durch
**eine** OPA-Engine. Kein Mock, kein Fabrizieren — Headplane-Patterns
per Lizenz sauber getrennt.

## API-Befund (live verifiziert, 14.9. — die Grundlage für alles)

- Headscale 0.29.3 (Container distroless, kein Shell → `docker exec`
  nur mit dem headscale-Binary selbst). **Kein gRPC** mehr (≥0.26
  entfernt); die Admin-API ist eine **huma/REST-Surface auf demselben
  Port 8082** wie das Noise-Protokoll, Bearer `hskey-api-…`:
  - `GET /api/v1/user`, `GET /api/v1/node`, `GET /api/v1/preauthkey`
    (0.26+ listet ALLE Keys, kein per-user-Fallback nötig — headplane
    braucht den noch, 0.29 nicht)
  - `POST /api/v1/preauthkey` `{user,reusable,ephemeral,expiration,aclTags}`,
    `POST /api/v1/preauthkey/expire` `{id}`
  - `GET /api/v1/policy` `{policy,updatedAt}` + **`PUT /api/v1/policy`**
    (beide brauchen `policy.mode ≠ disabled`; PUT zusätzlich
    `policy.mode: database` — verifiziert am Source
    `hscontrol/api/v1/policy.go`, live: GET → 500 mit Botschaft
    „no supported policy mode found in configuration, policy.mode:
    ‚disabled'“)
- Vollständige Node-Felder (live): `ipAddresses` (nicht `addresses`!),
  `online` von Headscale berechnet, `tags`, `approvedRoutes`,
  `subnetRoutes`, `registerMethod`, `lastSeen`, `expiry`.

## Lizenz-Befunde (R35-Disziplin: verifizieren VOR dem Portieren)

| Projekt | Lizenz | Konsequenz |
|---|---|---|
| headplane (`github.com/tale/headplane`) | **MIT** (Aarnav Tale, 2024 — LICENSE-Datei im Clone gelesen) | ✅ echter Komponenten-Port erlaubt: Users/Machines/AuthKeys-Screens nach `NetworksPage.tsx` portiert (MIT-Herkunft im Header dokumentiert) |
| Atlas (`github.com/karam-ajaj/atlas`) | **MIT** (Karam Ajaj, 2025) | ✅ Pattern-Donor für die Topologie-Graph-Ansicht; benutzt vis-network — JiMesh portiert das Pattern auf das bereits vorhandene `@xyflow/react` (React Flow), keine neue Dependency |
| Scanopy (`github.com/scanopy/scanopy`) | **AGPL-3.0 + kommerzielle Dual-Lizenz** (LICENSE.md + COMMERCIAL-LICENSE.md im Clone) | ⛔ **REFERENCE-ONLY** wie headscale-admin (GPL-3): kein Code kopiert. Die View-Taxonomie (L2/L3/Workloads/Applications) ist der dokumentierte Ideengeber für die Tab-seitige Gruppierung; ehrlich dokumentiert, nichts übernommen |
| headscale selbst | BSD-3 | Client spricht nur die öffentliche REST-API — kein Codeübernahme |

## Work Packages

### Part 1 — Backend-Fundament (die 3 broken Routes) ✅ VERIFIZIERT
- [x] `internal/network/headscale.go` — reiner net/http-Client auf die
  REST-Surface, keine dritte Dependency, keine CGO. Fehlender Env →
  Fehler mit Namen, HeadScale-Fehler (huma-Body
  `{"code":N,"message":…}`) 1:1 durchgereicht.
- [x] `internal/gateway/networks.go` — 5 Routes (3 Reads + 2
  OPA-gated Mutationen + Policy-Read-Anker), `registerNetworks` aus
  `New()`, Client/Gate nil-tolerant (503/500-refuse statt Panik).
- [x] `internal/policy/policies/headscale.rego` +
  `internal/policy/headscale_gate.go` — drittes Modul auf DER Engine
  (source/roles-Input wie rbac+capabilities), **policy.go unberührt**
  (TASK-070-Lane). `JIMESH_HEADSCALE_POLICY`-Override symmetrisch.
- [x] Identity-Propagation: 13 additiv-Zeilen-Hunk in
  `internal/auth/auth.go` — verifizierte `requestIdentity` als
  server-derived `X-JiMesh-Identity-Source/-Roles`-Header
  (INGRESS-DERIVED-ONLY-Contract, TASK-050-Präzedenzfall; die Claims
  leben sonst nur in der Middleware).
- [x] Live-Beweis (authenticated, 19091): users → 1 echter User
  (`jimesh-operator`); nodes → ehrliches `{"count":0,"nodes":[]}`;
  preauthkeys → 2 echte maskierte Keys; policy → ehrlicher 502 mit
  Headscales eigenem „policy.mode disabled"-Grund; create (OPA erlaubt
  password-admin) → echter einmaliger Key `id=3` + sofortiges expire
  → 200; Tag-only-Key: bare `test078` → `tag:test078`, `user:null`;
  ohne Session → 401; ownerless Body → 400; `go test ./internal/policy/`
  grün (Gate-Unit-Tests: consumer-key deny, unknown action fail-closed,
  keycloak ohne Rolle deny).

### Part 2 — headplane-Port auf die NetworksPage ✅
- [x] Users-Screen-Pattern (Row + Display-Name-Fallback), Machines-
      Pattern (Sortierung Name/IP/LastSeen mit IPv4-Oktet-Vergleich und
      online-zuerst-Regel, Status-Filter online/offline/expired,
      Besitzer-Filter User/Tag-owned, „Showing X of Y"), AuthKeys-Pattern
      (Attribute-Rows Key/Owner/Reusable/Ephemeral/Used/Created/Expiration,
      zweistufiger Empty-State „none created yet" vs „none match filters",
      Status-Filter active/expired/reusable/ephemeral mit headplanes exakter
      Semantik, Create-Dialog mit EINMALIGEM Key-Reveal +
      `tailscale up --login-server=… --authkey …`-Copy-Block, Tag-Only-Key,
      Reusable/Ephemeral-Switches, Expire-ConfirmButton nur an
      nicht-abgelaufenen Keys), i18n — die 77 network-Keys aus dem
      Rescue-Commit d5a7269 sind jetzt tatsächlich verdrahtet + 3 neue
      Keys (userMachines/userNoMachines/topologyUnresolved) in 60 Locales
      via `scripts/task078-i18n-insert.py`.
      Dateien: `src/frontend/src/views/NetworksPage.tsx` (137→1104 Zeilen,
      echte Component-Portierung, MIT-Attribution im Header).
- [x] tsc --Emit-frei in allen TASK-078-Files (Baseline-Noise 223 in
      Fremd-Files unangetastet) + eslint 0 Befunde + Live-Curl-
      Verifikation: eigener Next-Dev-Server aus dem Worktree auf :5175
      (NODE_ENV=development — die Harness-Shell exportiert production und
      bricht sonst die CSS-Pipeline!), Next-Rewrite zeigt auf den
      laufenden Backend :19091. Beweise durch den EXAKTEN Browser-Pfad
      (Next rewrites /api→Backend): users → 1 echter User; nodes →
      ehrliches `{"count":0,"nodes":[]}`; preauthkeys → 4 echte maskierte
      Keys; policy → ehrlicher 502 mit Headscales eigener
      policy.mode-disabled-Botschaft; GET /networks → 200,
      `topologyFullMesh` + `networks/preauthkeys` nachweisbar im
      kompilierten Bundle.

### Part 3 — Topology-Visualizer ✅
- [x] „What's talking to what" als **ehrliche Mesh-Topologie aus
      Headscale-Daten**: Nodes als Graph (React Flow @xyflow/react —
      bereits vorhanden; Atlas' vis-network bewusst NICHT als neue
      Dependency aufgenommen), Registry-Kanten hub→node echt (online
      animiert grün, offline/expired gestrichelt grau), Online-Status
      farbcodiert. Peer-Kanten = Berechtigungs-Topologie: policy
      disabled → ehrlicher Voll-Mesh (IST der Zustand), policy aktiv →
      Kanten aus `src/lib/acl-policy.ts` (HuJSON-Scanner + Resolver,
      headplane-Muster-Port, fail-closed bei autogroup:internet/IPv6-CIDR/
      unbekannten Aliasen → KEINE Kanten statt Teil-Kanten), 21 Unit-Tests
      pinnen jede Form fest — live solange nicht prüfbar wie
      policy.mode=disabled steht (GET /api/v1/policy → 500). **Ehrlich
      dokumentiert:** Headscale sieht WireGuard-P2P-Verkehr NICHT — die
      Topologie ist Erlaubnisstruktur + Registry, nicht gemessene Bytes
      (Caption im UI sagt es). Scanopy (AGPL-3 + Commercial-Dual) =
      reference-only, KEIN Code übernommen — nur die
      „L2/L3-Gruppierungs"-Idee fand Eingang in die Sektionierung der
      Seite (Nodes/Keys/Users getrennt statt scanopy-clones).

### RBAC + Design (Operator-Priorität) — OPA→Headscale-Single-Source-of-Truth
- [x] ACL/Tagging-Anker: `GET /api/networks/policy` (zeigt ehrlich den
      disabled-Modus, siehe oben).
- [x] `push-policy`-Action bereits in der Gate-Vokabular + Client-Methode
      `SetPolicy` (PUT /api/v1/policy) implementiert — das Design landet
      verdrahtet, nicht angeklebt.
- [x] Design-Abschnitt (unten, „OPA als ACL-Single-Source-of-Truth").
- [x] Frontend-RBAC-Haltung: die Page hat KEIN eigenes Permission-System —
      Mint/Expire feuern auf die OPA-gated Routes, 403-Deny erscheint
      verbatim als Toast (Policy nennt source/roles/reason). Keine zweite
      Engine, kein Client-Side-Permission-Pretend.

## Design — OPA als ACL-Single-Source-of-Truth (API-verified)

**Mechanismus (festgelegt nach API-Verifikation, noch NICHT gebaut —
Bau = bewusster Operator-Entscheidung):**

1. JiMesh-OPA kompiliert aus den JiMesh-Rollen/Workspaces eine
   Headscale-ACL-Policy (HuJSON-Text: hosts/groups/tagOwners/ACLs).
2. `POST /api/networks/policy/push` (neue Route, wenn gebaut) → Gate
   `push-policy` (bereits im Rego) → Client `SetPolicy` → **`PUT
   /api/v1/policy`** auf der Control-Plane.
3. Voraussetzung (live verifiziert): `config/headscale/config.yaml`
   muss `policy.mode: database` setzen — aktuell steht dort `disabled`,
   PUT antwortet dann mit `400 policy update is disabled`. Das ist ein
   Control-Plane-Posture-Wechsel (Firewall-Enforcement AN), bewusst
   vom Operator via config + restart vorzunehmen — ein Dashboard-Default
   wäre der falsche Hebel. Bis dahin zeigt `GET /api/networks/policy`
   den echten Zustand.
4. Rollen-Mapping-Entwurf: JiMesh-Workspace→Headscale-User,
   JiMesh-Capabilities→tagOwners, OPA-Regel-Ergebnis→ACL-Zeilen;
   Widersprüche (Keycloak-Rollen vs. JiMesh-Budgets) fail-closed =
   kein Push.

## Akzeptanzkriterien

1. Alle 3 Networks-Routen liefern echte Daten ODER echte Fehler —
   niemals Zeilen aus dem Nichts (✅ curl-Beweise oben).
2. UI zeigt headplanes echte Screen-Strukturen, nicht eine erfundene
   Minimal-Liste; einmaliger Key-Reveal, nie persistiert.
3. Mesh-Mutationen nur durch OPA erlaubte Identitäten; consumer-key
   denies per Unit-Test festgenagelt.
4. Doku: API_DOCS + dieses File + BACKLOG-Spiegel + Task-File-Status
   im selben Change wie der Code.

## Ehrliche Abrechnung TASK-078 (was gebaut vs. offen, 14.9.)

**Gebaut & verifiziert:** alle drei Teile. Part 1 (Backend: 5 Routes,
Headscale-Client, OPA-Gate, Identity-Header — Commit b8bde4a, live
curl-bewiesen). Part 2 (headplane-UI-Port, Commits fec8a68/d93cd62/5fcafe3).
Part 3 (ACL-Resolver + MeshTopology-Graph, 21 Unit-Tests, live-200 über
:5175). RBAC-Design verdrahtet (Gate-Vokabular + SetPolicy-Client), Bau
des Push bewusst dem Operator überlassen (unten).

**Worktree-Verlust, offen dokumentiert:** die erste Part-2/3-Umsetzung
(arbeitete in `../jimesh-worktrees/task-078-headscale-networks`, Basis
51bdb68) wurde MITTEN IM LAUF extern entfernt — der Worktree samt
Branch-Registrierung verschwand in der Task-071/074/076-Merge-Cleanup-
Welle, uncommittet. Fünf Dateien (NetworksPage, acl-policy.ts + Tests,
mesh-topology.tsx, i18n-Insert 60 Locales) wurden aus der Session- arbeit
rekonstruiert, auf NEUEM main (16a9d91) neu aufgesetzt und diesmal
SOFORT pro Part committet (fec8a68 → d93cd62 → 5fcafe3). Lehre: „inkremen-
tell committen erlaubt" war ein Angebot, kein Nice-to-have — der nächste
Agent committet nach jedem grünen Check, nicht am Ende. Der Vorfall
verzögerte nichts Fundamentales (alle Checks grün, live-Verifikation
komplett), hat aber ~1h Rekonstruktionsarbeit gekostet.

**Kleinere Abweichungen von headplane (bewusst, ehrlich):**
- „Showing X of Y" erscheint immer bei >0 Nodes — headplane zeigt den
  Klartext („N machines") nur ohne Filter; wir sparen uns den Extra-Key.
- Machines-Row: headplane zeigt IP[0] + Copy-Menü mit MagicDNS-Hostnamen;
  wir zeigen alle `ipAddresses` gestapelt als Copy-Buttons (MagicDNS-
  Basis ist dem Frontend nicht bekannt — kein fabrizierter Hostname).
- Die User-Filter-Selects der Machines-/Keys-Sektionen zeigen echte
  Usernamen aus der API; „Tag-owned"-Einträge nur wenn relevante Daten
  existieren (Users > 0 / Tag-Keys > 0).

**Offen (bewusst, andere Lanes):** OPA→Headscale-Push-Route bauen
(Design unten — Voraussetzung policy.mode: database, Operator-
Entscheidung); ACL-on-Live-Verifikung des Resolvers gegen eine echte
Policy (geht erst wenn die Control-Plane policy.mode ≠ disabled);
Keycloak-Rollen → headscale-Rollen-Mapping im Push (Entwurf unten,
fail-closed).

---

# TASK-071 — Ghost-Data-Delete: DELETE /api/users/{id} + /api/projects/{id} + Confirm-Dialoge

**Quelle:** `docs/tasks/subagents/PROMPT-task-071-ghost-data-delete.md`
(operator 14.9.: „Geister users, keys und projects, man kann die nicht
löschen"; Audit-Fund: `docs/research/R41-operator-feedback-blitz.md:91`,
R39-Slop-Audit: das Backend-DELETE /api/projects/{id} existierte
bewusst UI-los, ein User-DELETE fehlte komplett).

**Ziel:** Test-User und Test-Projects (Ghost-Data) lassen sich wirklich
löschen — Backend-Route UND UI-Button mit einem Confirm-Dialog, der
EXAKT sagt was entfernt wird. Referenzen werden nie still kaskadiert:
sie verweigern mit 409 + exakter Liste (Mandat 2).

## Work Packages

### WP1 — Backend: beide DELETE-Routen ✅ (Committet auf main: `90b2c71`)
Eine Parallel-Session hat den kompletten Backend-Teil gebaut und auf
main committet (dieser Worktree brancht von dort ab); verifiziert gegen
Code + Live-Stack:
- [x] `DELETE /api/users/{id}` — Handler
      `internal/security/users.go:69` (`handleUserDelete`, Route
      `security.go:78`): Survey VOR jeder Mutation; 409 nennt jede
      referenzierende Tabelle mit Zählern; Ghost-User (Null Referenzen)
      löschen sauber; 404 unbekannt, 405 non-DELETE.
- [x] Store: `UserDeleteSurvey`/`SurveyUserDeletes`/`DeleteUser`
      (`internal/store/users.go:141-193`) — Referenz-Check aus
      `information_schema` (user_id in consumer_keys,
      project_user_budgets, team_members; workspaces.owner_user_id;
      subagents hat KEINE user-Spalte — nichts zu surveyen),
      `ProjectDeleteSurvey`/`SurveyProjectDeletes`
      (`internal/store/store.go:1749-1803`: consumer_keys, containers,
      deployments, project_user_budgets, router_aliases, sdk_logs,
      security_events, sessions, subagents, vault_audit_log,
      vault_secrets, workspaces). Tests:
      `internal/store/users_delete_test.go` (echte Tables, echte Rows,
      kein Mock — läuft gegen die Wegwerf-`jimesh_test`-DB).
- [x] `DELETE /api/projects/{id}` referenz-ehrlich gemacht
      (`internal/deploy/projects_ssh.go:2625` `handleProjectDelete`):
      dokumentierte CASCADE-Familie = workspaces + deren Service-Keys
      (widerrufen, TASK-037-Vertrag) + containers (FK ON DELETE
      CASCADE); ALLES ANDERE blockiert mit 409 + Counts. Survey läuft
      VOR der Mutation (ein 409 darf nicht bereits halb gelöscht
      haben). Route bestand schon (`deploy/deploy.go:52`), war
      UI-los (R39).
- [x] OPA-Gate: `internal/policy/policy.go` — `/api/users`-Prefix
      (Admin-Fläche wie gehabt) + präzises Ein-Segment-Match
      `isAdminProjectDeleteMutation` für GENAU
      DELETE /api/projects/{id} (nicht der ganze /api/projects-Prefix —
      deploy/redeploy/undeploy behalten ihre Session-Gate, keine
      Posture-Änderung außerhalb des Tasks). Enforced in der
      Middleware (`internal/auth/auth.go:736`, `rbac.Allow` →
      default.rego: password-Operator oder Keycloak-Rolle
      jimesh-admin).
- [x] API_DOCS: beide Tabellen-Rows (API_DOCS.md:768 users,
      :992 projects) + RBAC-Sektion (:682-694) im selben Change.

### WP2 — Frontend: Delete-Buttons + Confirm-Dialoge ✅ (dieser Branch)
- [x] AdminUsersPage (`src/views/AdminUsersPage.tsx`): Delete-Button
      je User-Row (neue Icon-Spalte, Trash2), informed Confirm-Dialog
      im bestehenden Dialog-Muster (`components/ui/dialog.tsx`, Vorlage:
      WorkspacesPage-Remove-Dialog): sagt exakt, dass NUR die User-Row
      entfernt wird, Referenzen mit 409 + Liste verweigern (Dialog
      bleibt bei Fehler offen), und die Keycloak-Identität unberührt
      bleibt (Re-Login re-creiert die Row — ehrlich).
- [x] ProjectsPage (`src/views/ProjectsPage.tsx`): die
      window.confirm-Kette (2× hintereinander, ghosts-fabrizierend —
      der Delete filterte nur lokalen State, die DB-Row überlebte)
      ersetzt durch EINEN informed Dialog: der echte
      `DELETE /api/projects/{id}` läuft jetzt VOR dem SSH-Sweep — bei
      403/409 wird nirgends etwas entfernt und das Projekt bleibt
      sichtbar (ehrlicher DB-Zustand); Volume-Purge bleibt separater
      expliziter Opt-in (Default: behalten); danach der bestehende
      Un-Deploy-Sweep (unverändert). `projects-summary`-Query wird
      invalidiert.
- [x] i18n: 16 neue Keys (admin.usersDelete* ×7, projects.delete* ×9)
      in `en.json` + alle 59 weiteren Locales — Repos-Standard
      eingehalten: echte deutsche Übersetzung nur für `de.json` (die
      einzige gepflegte Übersetzung), alle anderen Locales spiegeln
      das englische Original (exakt wie der vorhandene Zustand, z.B.
      fr/ja/yo „rolesSaved"). `check:i18n` grün: 60 Locales, 1920
      Keys.

### WP3 — RBAC-Bypass-Fix in der Auth-Middleware ✅ (live gefunden, dieser Branch)
Der erste Live-Test (T1) schlug fehl: der Keycloak-Test-User ohne
`jimesh-admin`-Rolle löschte eine User-Row mit **200 statt 403**.
Ursache (pre-existing, betraf das GANZE Admin-Gate, nicht nur 071):
eine per OIDC gemintete Dashboard-Session ist ein Hex-Token, kein
Keycloak-JWT → `validKeycloakToken` liefert `claims=nil` →
`requestIdentity(nil)` = `("password", ["admin"])` → die OPA-Policy
erlaubte jeden Keycloak-User als Operator. Fix (fail-closed, Mandat 8):
- [x] Callback (`internal/auth/keycloak_oidc.go`): der Session-Marker
      speichert jetzt die VERIFIZIERTE Identität — sub UND realm roles
      (`kcSessionMarker{sub, roles}`).
- [x] Middleware (`internal/auth/auth.go`): für gültige Sessions mit
      Marker werden die Marker-Daten zu synthetischen Claims resolved —
      der Admin-Gate (und die `X-JiMesh-Identity-*`-Header) sieht die
      echte `("keycloak", roles)`-Identität. Legacy-Marker (bare sub)
      lesen als Null Rollen → Admin-Mutationen bleiben verweigert bis
      Re-Login (fail-closed, nie umgekehrt).
- [x] `handleAuthStatus` liest über denselben Accessor (beide
      Marker-Formate).

## Referenz-Integrität — die ehrliche Entscheidung (dokumentiert)

**Keine stillen Cascades.** Der Users-DELETE BLOCKT auf jede Referenz
(workspaces.owner_user_id, consumer_keys.user_id,
project_user_budgets.user_id, team_members.user_id) mit 409 + Counts.
Der Projects-DELETE hat eine dokumentierte CASCADE-Familie
(workspaces + deren Service-Keys, containers via FK) und BLOCKT auf
alles andere (deployments, budgets, sdk_logs, security_events,
sessions, subagents, vault_audit_log, vault_secrets, router_aliases,
pinned consumer_keys). Grund: genau die Ghost-Rows, die der Operator
loswerden will, sind die referenz-freien; alles Referenzierte gehört
dem Operator zur bewussten Aufräum-Entscheidung, nicht einer
Hintergrund-Kaskade (Mandat 2).

## Akzeptanzkriterien (TASK-071)

1. ✅ DELETE als Admin entfernt die Row wirklich (Live-Curl-Beweis, T4/T8).
2. ✅ DELETE als Non-Admin (Keycloak ohne jimesh-admin) → 403 (T1/T2 —
   brauchte den WP3-RBAC-Fix, ohne ihn 200).
3. ✅ Referenzierte Rows → 409 mit exakter Liste, nichts gelöscht
   (T5/T5c/T6b — Survey-Details-Body mit Counts).
4. ✅ Confirm-Dialoge sagen exakt was passiert — kein window.confirm.
5. ✅ tsc --noEmit: identisch zur Baseline (205 pre-existing Noise-
   Errors, 0 in den geänderten Dateien); check:i18n grün (60 Locales,
   1920 Keys); vitest wie Baseline (5 pre-existing chart-axis-Failures);
   go vet clean; go test ./internal/auth/ 3× grün, internal/store grün.

## Verifikation (live, authentifiziert, 14.9.2026)

Eigene Worktree-Instanz (`task-071-ghost-data-delete`) auf :19099
gegen die echte Postgres-/Redis-/Keycloak-DB des Stacks — der
Operator-Stack auf :19091 blieb unberührt (er mountet den
Main-Checkout; der RBAC-Fix liegt nur in diesem Branch). Fixtures:
realer Keycloak-Test-User (`task071-test`, nur `default-roles-jimesh`,
via KC-Admin-REST erzeugt), SQL-Testprojekte (SELF-CLEANING — alle
Fixtures wurden über die DELETE-Routen selbst wieder entfernt, DB am
Ende verifiziert leer):

| Test | Ergebnis |
|---|---|
| T1 DELETE /api/users/{id} als Keycloak-Non-Admin | **403** „denied by policy (source: keycloak, roles: default-roles-jimesh, …)" |
| T2 DELETE /api/projects/{id} als Non-Admin | **403** |
| T3 DELETE unauthentifiziert | **401** |
| T4 Admin DELETE referenz-freies Ghost-Projekt | **200** `{success, id}` |
| T5 DELETE User mit Budget-Row | **409** `details:{workspaces:1, projectUserBudgets:1,…}`, Message nennt jede Referenz |
| T5c DELETE Projekt mit Budget-Row | **409** voller Survey-Body |
| T7 DELETE Projekt mit Workspace | **200** `{removedWorkspaces:["task071-ws"]}` — Workspace-Row danach DB-verifizert weg |
| T8 DELETE Ghost-User (Null Referenzen) | **200** `{ok, id, deleted:true}` |
| T9 DELETE unbekannte IDs | **404** mit Namen |
| T10 non-DELETE auf /api/users/{id} | **405** „DELETE only" |

**Offen (andere Lanes):** pre-existing Flaky-Test
`TestRenderNftScriptAcceptRule` — `renderNftScript` iteriert eine Go-Map
(`internal/security/firewall_provider.go:250`), der „Deterministic"-
Vergleich scheitert konstruktionsbedingt in ~1/6 der Läufe (vor diesem
Task nachgestellt, ohne Zusammenhang).

---

## Part 4 (15.9.2026) — Project↔Headscale-User-Kopplung + ACL-Editor + Users/Settings-Port

**Auslöser:** Operator fragte nach direkter Headplane-Integration
(github.com/tale/headplane, MIT). Recherche ergab: Machines/Auth-Keys/
User-Rows sind bereits 1:1 aus Headplane portiert (Part 2 oben,
`NetworksPage.tsx`). Echte Lücke: kein ACL-**Editor** (nur Read-Only-
Visualisierung über `permittedNodePairs`), kein Headscale-User-
Management, keine Settings-Sektion.

**Architektur-Entscheidung (Operator bestätigt):** Headscale-User ≙
JiMesh-Project, automatisch angelegt — kein manuelles User-CRUD mehr.
Begründung: ein Headscale-User ist eine Geräte-Gruppierung für ACL-
Policies, kein Login-Konzept; JiMeshs Projects sind bereits die
natürliche Isolationsgrenze (siehe
`docs/reference/networking-current-state-and-target.md` §Netzwerk-
Segmentierung). ACL-Policies werden damit in Project-Begriffen
autorierbar statt in rohen Headscale-Usernamen.

**Live-verifiziert gegen die echte Headscale-API (nicht aus Doku
übernommen)** vor Implementierung:
```
POST /api/v1/user {"name":"..."}   → {"user":{...}}   (200)
DELETE /api/v1/user/{id}           → {}                (200)
```
(Probe-User `probe-verify-user` angelegt und wieder gelöscht, DB
danach verifiziert leer — kein Rest.)

### Work Packages

- **WP1 Backend-Fundament** `internal/network/headscale.go`: `CreateUser`/
  `DeleteUser` auf `HeadscaleClient` (Methoden fehlten, jetzt live
  gegen die echte API verifiziert). `internal/store/store.go`: Spalte
  `projects.headscale_user` (idempotente Migration, `columnExists`-
  Guard wie alle bisherigen Projects-Spalten). Auto-Provisioning: bei
  Project-Create wird ein Headscale-User `proj-<projectId>` angelegt,
  die ID in der neuen Spalte persistiert; schlägt das fehl (Headscale
  down), wird das Project trotzdem angelegt — Netzwerk-Feature ist
  optional, kein Hard-Blocker (Mandat 2: ehrlicher Fehler im Response,
  kein stiller Fail). Bei Project-Delete: Headscale-User-Löschung
  best-effort + im Delete-Response gemeldet (Muster wie
  `vlanLeftover` aus TASK-080), keine stille Row-Löschung ohne Bericht.
- **WP2 ACL-Editor-Port** `NetworksPage.tsx` (oder neue
  `AclPolicyPage.tsx`, TBD beim Bauen): Port von Headplanes
  `routes/acls/dialogs/acl-rule.tsx` — Regel-Editor mit Project-Namen
  statt roher Tags/Usernamen als Quelle/Ziel, gegen die bestehenden
  `GetPolicy`/`SetPolicy`-Client-Methoden (existieren schon,
  ungenutzt für Schreibzugriff bisher).
- **WP3 Users-Screen** — kein manuelles Create/Delete mehr (das
  übernimmt WP1 automatisch); der Screen wird die Project↔Headscale-
  User-Zuordnung anzeigen (welches Project = welcher Headscale-User,
  wie viele Nodes, Re-Provision-Button falls die Zuordnung fehlt weil
  das Project vor diesem Sprint angelegt wurde — Backfill-Fall ehrlich
  behandeln, nicht stillschweigend ignorieren).
- **WP4 Settings-Port** — Umfang erst beim Blick in
  `headplane/app/routes/settings/` final festlegen (DNS-Records,
  Server-Config-Anzeige); nicht 1:1 kopieren, was mit `config_path:ro`
  ohnehin nicht schreibbar wäre.
- **WP5 Doku** — API_DOCS (neue Felder/Routen), Backlog-Spiegel,
  dieser Sprint-Datei Retrospektive.

### Abnahme-Kriterien

1. Neues Project → automatisch ein Headscale-User `proj-<id>`,
   live-verifiziert (`GET /api/v1/user` zeigt ihn).
2. ACL-Regel über die UI angelegt → `GET /api/v1/policy` zeigt sie
   real, kein Mock.
3. Project-Delete → Headscale-User weg, im Response gemeldet.
4. `make go-build && make go-vet` grün, gofmt clean, tsc/eslint/
   check:i18n keine neuen Fehler ggü. Baseline.
5. MIT-Lizenzhinweis im Code-Kommentar für jede portierte Datei
   (gleiches Muster wie Part 2 oben).
