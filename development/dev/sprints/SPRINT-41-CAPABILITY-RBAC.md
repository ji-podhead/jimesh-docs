# SPRINT-41 — TASK-070: Capability-RBAC-Schema für JiMesh-Domänen

**Quelle:** `docs/tasks/subagents/PROMPT-task-070-capability-rbac-schema.md`
(Operator-Dispatch 15.9.2026, „2 separate, unrelated permission systems").
Ersetzt die Task-File-Domänenliste (billing/security/networking/workspaces/
secrets/control-planes) durch die Operator-Liste im Dispatch:
**registry, workspaces, deployments, security, vault, gateway**.

**Status:** ✅ UMGESETZT + live verifiziert 15.9.2026 (Kommit auf Branch
`task/070-capability-rbac`, Worktree `jimesh-worktrees/task-070-capability-
rbac` — Basen b8bde4a). Abrechnung §7 + Verifikations-Log §8 sind gegen
Code + curl-Beweise verifiziert, nie aspiriert (Mandat 1.4/6).

**Abgrenzung gegen Parallel-Tasks (verbindlich):**
- TASK-066 (Vault-Konsolidierung) berührt `internal/policy` nicht.
- TASK-078 Part 2/3 (Headscale-RBAC) kommt SPÄTER und baut auf DIESEM Schema
  auf; `policy.go` wird von diesem Task **nicht angefasst** (die Main-Session
  trägt dort uncommittete In-Flight-Arbeit — der Katalog-Lader folgt deshalb
  dem `headscale_gate.go`-Eigeninstanz-Muster statt Engine-Felder anzulegen).
- Networking (`/api/networks/*`) hat seit TASK-078 Part 1 ein EIGENES
  Policy-Modul (`policies/headscale.rego` + `headscale_gate.go`). Dieses
  Schema hier dupliziert es absichtlich NICHT; ein späteres `networking:`
  Domain-Namespace ist dokumentierter Nachzug (siehe §6), kein Fake.

---

## 1. Ziel

`capabilities.rego` (TASK-061) kennt nur generische Tool-Capabilities
(`db:*`, `fs:*`, `shell:exec`, `net:http`, `admin:*`). Es gibt:

1. **kein** Modell dafür, was ein Agent in JiMeshs EIGENEN Domänen darf
   (Registry, Workspaces, Deployments, Security, Vault, Gateway) —
   `registry:write`, `vault:delete` & Co. sind heute unklassifiziert und damit
   nicht grantbar (fail closed am Spawn — ehrlich, aber auch: das Produkt
   kann die Frage „was darf dieser Agent in JiMesh?" nicht einmal STELLEN);
2. **keine** UI, die die current capabilities je Gruppe/Agent zeigt;
3. keine 403-Verifikation einer hohen Risiko-Aktion aus dem NEUEN Schema.

TASK-070 liefert: Domänen-Schema mit Risk-Levels im Rego (eine Engine, ein
Modul — Task-File-Mandat „NICHT neues Modul"), einen Endpoint, der das Schema
**aus der Policy-Engine** befragt (`data.jimesh.capabilities.catalog` — nicht
aus hardcodierten Strings), eine Admin-Console-Section, und die echte 403-
Verifikation gegen den Live-Stack.

## 2. Plan / Work Packages

### WP0 — Plan (dieser Abschnitt) ✅

### WP1 — Schema in `policies/capabilities.rego` (Rego, Task-061-Modul erweitern)

- `catalog` wird das Single-Source-of-Truth-Dokument: 6 JiMesh-Domänen ×
  4 Aktionen (read/list, write, delete, admin) mit Risk-Level + je Domäne die
  Route-Gruppen als Code-Fundstellen-Evidenz; die generischen Tool-Namespaces
  (db/fs/shell/net/admin) bleiben erhalten und stehen mit im Katalog.
- Die Risk-Tabelle wird aus dem Katalog **abgeleitet** (partial object rule)
  — Katalog und Entscheidung können nicht driften.
- Risk-Modell (Code-Evidenz je Zeile, siehe §4): `read=low`;
  `write=medium` für registry/workspaces/deployments; `write=critical` für
  security/vault/gateway (heute Operator-only bzw. Hot-Path);
  `delete=critical`; `admin=critical` (bestehende `admin:*`-Präzedenz).
- **Spezialfall Proxy** (Mandat 4): innerhalb `gateway` sind die Proxy-Config-
  Aktionen (Chain-/Alias-/Profil-Schreibzugriffe — sie rerouten den LLM-
  Traffic JEDES Agents sofort) der Grund, warum `gateway:write` kritischer
  stuft ist als `registry:write`; der Config-PULL des jimesh-router ist
  Leseseite (`gateway:read`, heute kind=service erlaubt — auth.go-Branch).
- **Operator-Toggle (SPRINT-31-Muster), ehrlich TODO statt Fake:**
  Enforcement der Domänen-Caps auf den /api-Flächen braucht je Domäne einen
  bewussten Operator-Entscheid (Opt-in pro Domäne, Default = unverändertes
  Verhalten — exakt das WAF-`waf:true`-Muster aus SPRINT-31 E-W2), weil
  bestehende Service-Keys/Workflows sonst brechen würden. Diese Toggles sind
  in diesem Task **nicht herstellbar** (Operator-Entscheid) und werden als
  klar markierte TODOs im Rego-Katalog + hier dokumentiert. WAS enforcement-
  seitig heute echt greift: die Capability-Gates am Tool-Call-Surface
  (TASK-061, `POST /api/subagents/{id}/tool-calls`) — Domänen-Caps laufen
  dort mit sofortiger Wirkung (allow/deny/guard).
- `dsh/daphne`-Agenten-Defaults: **KEIN Gerede ohne Code-Fundstelle** —
  siehe §5 (ehrliches Fundat: es gibt keine im Code).

### WP2 — Katalog-Lader `internal/policy` (Go-Seite, `policy.go` unberührt)

- `capabilities.go` erweitert: typisierter Katalog-Lader mit eigener
  vorbereiteter Query auf `data.jimesh.capabilities.catalog` (Memoization via
  sync.Once, `JIMESH_CAPABILITY_POLICY`-Override symmetric zum
  Entscheidungs-Query) — Spiegel des `headscale_gate.go`-Musters, kein Feld
  am `Engine`-Struct (dessen Datei Main-Session-In-Flight-Arbeit trägt).

### WP3 — Endpoint `GET /api/capabilities` (`internal/gateway/capabilities.go`)

- Session-gated (Middleware-Vertrag), lesbar für jede authentifizierte
  Identität (gleiche Read-open-Haltung wie alle Admin-Flächen; kein Mutation-
  Surface, also kein `IsAdminMutation`-Eintrag).
- Antwort: `{catalog (verbatim aus der Engine), agents (je Subagent:
  persistierte Grants, je Grant klassifiziert known/unknown + Risk),
  serviceKeys (echter Count + ehrlicher „kein Capability-Modell verdrahtet"-
  Zustand)}`. Keine hartcodierten Schema-Strings im Handler.

### WP4 — Frontend: „Capabilities"-Tab in der Admin-Console

- `AdminCapabilitiesPage.tsx` unter `/admin/capabilities` (AdminLayout-Tab,
  E-IA: Admin-Console ist der bestehende Ort; Capabilities sind
  RBAC-Verwaltung, kein Analytics-Surface).
- Katalog-Tabelle (Domäne × Aktionen × Risk-Badges × Route-Evidenz) +
  Agent-Grants-Tabelle (Risk-Badges, unknown = ehrliches Warn-Badge) +
  Service-Keys-Zustand; ehrliche Empty-/Error-States; i18n über alle 60
  Locales (en + de von Hand, Rest backfill — Repo-Standard).

### WP5 — Verifikation (Mandat 6: ehrlich, nicht behauptet)

- Unit: `internal/policy/capabilities_test.go` — Domänen-Entscheidungs-
  matrix (alle 24 Domänen-Caps × granted/ungewährt), Wildcard-Grant-
  Semantik je Domäne, Katalog↔Entscheidung-Konsistenz (jede Katalog-Aktion
  evaluiert zum Katalog-Risk), Generic-Caps unverändert.
- Gateway: Handler-Test gegen echte Store-Sicht (Throwaway-DB; Skip mit
  echter Begründung, wenn Postgres nicht erreichbar — `policy_test.go`-
  Muster).
- **Live-403-Kette mit curl:** der geteilte Stack auf :19091 dient der
  Main-Session (fremde In-Flight-Änderungen); die Verifikation läuft gegen
  eine EIGENE Backend-Instanz aus DIESEM Worktree (127.0.0.1:19093,
  Throwaway-DB, Mandat-12-Bind), Kette: Login → Workspace-Ensure →
  Subagent-Spawn (busybox, Grants `registry:read` + `deployments:admin`) →
  Tool-Call `vault:delete` (nicht granted, critical) → **echter 403** →
  Tool-Call `deployments:admin` (granted, critical) → 202 guarded →
  `GET /api/capabilities` (echter Katalog aus der Engine) → Tool-Call
  `registry:read` (granted, low) → allow + echte exec-Ausgabe → Cleanup
  (Subagent-DELETE, Fixtures per id, DB weg, Container weg).

### WP6 — Doku-Abrechnung

- `API_DOCS.md`: neuer Endpoint + Capability-Schema-Abschnitt.
- Backlog-Spiegel + Task-File-Status.
- **Design-Doc vs. voller Build — ehrliche Abrechnung** in §7 (kein
  Simulieren, Mandat „nichts simulieren").

## 3. Akzeptanzkriterien

1. Jede der 6 Domänen hat read/write/delete/admin mit Risk-Level im Rego;
   Risiko-Einstufungen tragen Code-Fundstellen (§4), keine behauptete.
2. `data.jimesh.capabilities.catalog` existiert; `GET /api/capabilities`
   liefert den Katalog aus der Engine (nicht aus Go-Stringlisten); die UI
   rendert daraus.
3. Ein Agent OHNE Grant bekommt für eine hohe Risiko-Aktion aus dem neuen
   Schema einen ECHTEN 403 (live curl-Beweis, Fixtures danach entfernt);
   granted-critical pausiert in der GUARDED-Queue (202).
4. `go build`/`go vet`/`go test ./internal/policy/` grün (Container-
   Toolchain); Frontend `tsc` + `check:i18n` grün; `npm run lint` für
   angefasste Dateien sauber.
5. Sprint-File rechnet ehrlich ab: was Design-Doc ist vs. was voller Build
   ist (§7).

## 4. Risk-Tabelle mit Code-Fundstellen (nicht behauptet)

| Domäne | read | write | delete | admin | Fundstellen (HEAD b8bde4a) |
|---|---|---|---|---|---|
| registry | low | medium | critical | critical | `/api/models*`, `/api/keys*`, `/api/model-roles`, `/api/experts*`, `/api/embeddings*`, `/api/media*` — Model-/Key-/Expert-Registry (gateway.go:179-197, ai/aihandlers.go:55-58) |
| workspaces | low | medium | critical | critical | `/api/workspaces*` (gateway/workspaces.go:76); workspace-ensure durch kind=service-Key ist ECHTER Agent-Alltag (store/subagents.go:343-347, TASK-037) |
| deployments | low | medium | critical | critical | `/api/projects*` (deploy/redeploy/undeploy/deployments/task), `/api/control-planes*` (provision/deploy/undeploy), `/api/exec/sandbox` — Agent-rebuild-sich-selbst ist Produktkern (MANDATES §5) |
| security | low | **critical** | critical | critical | `/api/security/freeze|release|quarantine` sind Operator-HITL (policy.go:45-52), `/api/firewall/*`; Freeze/Release sind Vier-Augen-Entscheidungen (K-LAF §7) |
| vault | low | **critical** | critical | critical | `/api/vault/*`-Writes sind Admin-Mutationen (policy.go:53), `/api/secrets-engines*` (policy.go:79), Agent-Lesepfad = JIT `/api/vault/access` (MANDATES §9) |
| gateway | low | **critical** | critical | critical | **Spezialfall Proxy:** Chain-/Alias-/Profil-Writes rerouten sofort den Traffic ALLER Agents (MANDATES §4); `/api/router/config|aliases` sind Admin-Mutationen (policy.go:56,73); der router-PULL ist Leseseite via kind=service (auth.go:643-648) — deshalb `gateway:read=low`, `gateway:write=critical` |

`admin:*` bleibt Präfix-regelkritisch (bestehende TASK-061-Zeile,
capabilities.rego:67-68). Wildcards greifen pro Namespace (`registry:*`
deckt `registry:delete`, nie `vault:read` — getestet in WP5).

## 5. dsh/daphne-Agenten-Defaults — ehrliches Fundat

Gefragt war: „dsh/daphne-Agenten-Defaults soweit ableitbar aus dem
bestehenden Code — KEIN Gerede ohne Code-Fundstelle." Das Fundat:

1. **Subagents (TASK-061):** Grants sind ein Caller-Entscheid pro Spawn
   (`spawn.go:48` `Capabilities []string`), validierbar gegen DIESE Policy
   (`spawn.go:100`, `validateGrantableCapabilities` spawn.go:424-435).
   Es existiert **kein** Default-Grant-Set im Code — kein Fund, kein Fake.
2. **Agent-Types (`/api/agent-types`, gateway.go:2611-2627):** die drei
   geseedeten Rows (trading/expert/risk, gateway.go:2618-2622) tragen
   Model-Routing-Defaults (Tags + Fallback-Chains), **keine** Capability-
   Semantik. Capability-Defaults je Agent-Type sind ein Operator-Entscheid,
   nicht Code — TODO, nicht erfunden.
3. **„dsh"-Agenten:** DSH ist der Agent-Runtime (DeepSeek-Harness), nicht
   ein JiMesh-Objekt; JiMesh spawn-t ihn als normalen Subagent/Workspace-
   Container. Keine dsh-spezifischen Capability-Defaults im Code.
4. **„daphne":** `grep -ri daphne` über Repo **und** `/home/ji/projects/
   dap-docs` = **0 Treffer**. DAP (Dynamic Agent Protocol, R21) ist die
   Spec-Vorlage für Skills/Gates/Memory — eine „Daphne"-Agent-Gruppe ist
   im Code nirgends. Deren Defaults sind damit NICHT ableitbar; sie sind
   Teil des Operator-Toggle-Entscheids (§6), sobald der Operator sagt, was
   „daphne" konkret ist.

## 6. Operator-Toggle-Entscheide (SPRINT-31-Muster) — offen, nicht gefaked

Wie E-W2 in SPRINT-31 (`waf: true` — explizites Opt-in, ohne Flag
byte-identisches Verhalten): Domänen-Capabilities auf den /api-Flächen zu
ENFORCEN (z. B. `vault:read` als Pflicht-Grant für einen kind=service-Key
auf `/api/vault/access`, `deployments:write` für Deploy-Routen) würde
bestehende Keys/Workflows sofort brechen. JEDE Domäne braucht dafür einen
bewussten Operator-Entscheid:

| Toggle-Frage | Default-Empfehlung (Vorschlag) | Status |
|---|---|---|
| `vault:read` als Pflicht-Grant für kind=service auf `/api/vault/access` + `/api/sdk/secrets` | aus (Breakage-Risiko für provisionierte Agents) | offen, TODO(TASK-078-RBAC-Part) |
| `deployments:write` als Pflicht-Grant für Deploy-Routen mit Machine-Identity | aus (Deploy-Mandat §5 ist der Produktkern) | offen |
| `registry:read` für `/api/router/config`-Pull des jimesh-router | aus (Pull ist heute projektgepinnt erlaubt) | offen |
| Capability-Grant-Spalte auf `consumer_keys` (kind=service) — Task-File-Punkt 3 | Schema-nah vorbereitet im Katalog, Spalte + Grant-Flow kommen mit TASK-078s RBAC-Part | offen, TODO im Rego markiert |
| Default-Grant-Sets je Agent-Type (dsh/daphne/expert) | Operator-Entscheid je Gruppe | offen |

Nichts davon wird in diesem Task still durchgesetzt. Was HEUTE enforcement-
seitig echt greift, ist die Tool-Call-Gate (WP5-Verifikation) — das ist der
bestehende, getestete Pfad; das neue Schema läuft dort ohne weiteren Toggle,
weil die Gate ohnehin fail-closed ist (ohne Grant kein Allow).

## 7. Abrechnung: Design-Doc vs. voller Build — gegen Code verifiziert

| Stück | Status |
|---|---|
| Rego-Schema (Katalog 113–260, Risk-Ableitung 263–281, admin-Präfixregel 284, Entscheidungsregeln 319–368) | **Voller Build** — `src/backend/internal/policy/policies/capabilities.rego`; Katalog ist Single Source, Risk-Tabelle daraus ABGELEITET (Partial-Object-Rules), kein Drift möglich; alle 24 Domänen-Caps + 6 Generic-Caps klassifiziert |
| Proxy-Spezialfall (gateway:write=critical, gateway:read=low) | **Voller Build** — rego 178 (Begründung im Katalog-Note) + 56–63 (Header-Begründung); live getestet über die grantable-Semantik (Unit-Test `TestCapabilityCatalogMatchesDecisions`) |
| Operator-Toggles (SPRINT-31-Muster) | **Design-Doc im Katalog** — rego 227–259 (`operatorToggles`, alle Einträge TODO-markiert); bewusst NICHT durchgesetzt, ehrlich im Endpoint + UI sichtbar statt still |
| dsh/daphne-Defaults | **Design-Doc** — §5 (keine Code-Fundstellen, keine erfundenen Defaults); im Katalog-Toggle „default grant sets per agent group" dokumentiert |
| Katalog-Lader (Go) | **Voller Build** — `internal/policy/capabilities.go:161` (`CapabilityCatalog`), `:174` (`capabilityModuleSource`, geteilt mit Entscheidungs-Query → Override wirkt auf BEIDE), `:203` (`LoadCapabilityCatalog`, sync.Once-Memoization, `policy.go` unberührt) |
| `GET /api/capabilities` | **Voller Build** — `internal/gateway/capabilities.go:38` (Register), `:84` (`classifyGrants` — Spawn-Validierungs-Form), `:103` (Handler; Katalog VERBATIM aus der Engine, Grants klassifiziert, Service-Keys ehrlich); Wiring `gateway.go:89/168/252` |
| Admin-Console-Tab + i18n | **Voller Build** — `src/frontend/src/views/AdminCapabilitiesPage.tsx` (Seite, `:95` Risk-Badges Exposure-Sprache, `:168` Query auf `/api/capabilities`), `AdminLayout.tsx:17` (Tab), `App.tsx:60/641` (Route); 44 neue i18n-Keys × 60 Locales (en+de von Hand, 58 backfilled), `check:i18n` grün |
| 403-Verifikation | **Voller Build** — live-curl-Kette gegen eigenen Worktree-Backend auf 127.0.0.1:19093 (Throwaway-DB; der geteilte :19091-Stack trägt Main-Session-Fremdcode — Port-Substitution ehrlich dokumentiert): **403** (vault:delete ungewährt, critical) · **202 guarded** (deployments:admin gewährt, critical) · **200 allow + echte exec-Ausgabe** (registry:read gewährt, low) · **403** (billing:read unbekannt, fail closed) · Endpoint liefert Katalog + klassifizierte Grants. Details §8 |
| /api-Enforcement je Domäne (Toggles §6) | **Design-Doc** — bewusst NICHT gebaut (Operator-Entscheid nötig, Breakage-Risiko); was HEUTE enforcement-seitig echt greift: die Tool-Call-Gate mit den neuen Domänen-Caps (live bewiesen) |
| consumer_keys-Capability-Spalte | **Design-Doc** — TODO(TASK-078-RBAC-Part); Endpoint + UI zeigen den ehrlichen nicht-verdrahtet-Zustand statt Fake-Grants |
| networking:-Namespace | **Design-Doc** — TASK-078 hat sein eigenes Modul (headscale.rego); Duplikat vermieden, Nachzug dokumentiert |
| Wildcard-Grant-Verhalten | **Voller Build** — `registry:*` deckt read/write/delete/admin, nie `vault:read` (Unit-Test `TestDomainWildcardGrants`); Task-File-Punkt „Service-Keys grantable" bleibt TODO(078) |

**Nicht gebaut und nicht simuliert** (Mandat „nichts simulieren"): jede
Enforcement-Behauptung über die live getesteten Gates hinaus. Keine Fake-
Grants für Service-Keys, keine erfundenen Gruppen-Defaults, keine
Vorgetäuschte Toggles.

## 8. Verifikations-Log (Mandat 6 — echte Befehle, echte Ergebnisse)

**Toolchain:** kein Host-Go → alles im `golang:latest`-Container (Module-
Cache-Bind + `jimesh_go-build`-Volume, exakt der `make go-build`-Weg).

1. `go build ./...` grün; `go vet ./internal/policy/ ./internal/gateway/`
   grün; `gofmt -l` leer für alle eigenen Dateien (networks.go war VORHER
   unformatiert — nicht meine Datei, unangetastet).
2. `go test ./internal/policy/` **ok** — 6 neue Tests in
   `capabilities_test.go` (Domänen-Matrix 6×4 × granted/ungewährt;
   Katalog↔Entscheidung-Konsistenz; Wildcards; unknown fail-closed;
   Katalog-Shape + ehrliche Toggles; Memoisierung) + die unveränderten
   TASK-061-16-Fälle (policy_test.go) grün.
3. `go test ./...` gegen Throwaway-DB `jimesh_test` (der make-go-test-Weg):
   `policy`, `gateway`, `store`, `subagents`, `auth`, `security`, `deploy`,
   `siem` … ok. 3 Fail-Pakete (`internal/ai`, `internal/network`,
   `internal/service`) — **per Stash-Baseline am nackten HEAD b8bde4a als
   VORHANDEN bewiesen** (identische Tests schlagen identisch fehl;
   Ursachen: store.Open-localhost-Fallback im Container-Netz unerreichbar,
   DNS im Container-Netns — Umgebungsfehler, keine Capability-Relevanz).
4. **Live-403-Kette** (eigener Backend aus DIESEM Worktree, Port
   127.0.0.1:19093, Throwaway-DB `jimesh_task070_verify`, JIMESH_ADMIN_
   PASSWORD-geseedet, docker.sock für echte Container, Fixtures danach
   per id entfernt):
   - Login → Subagent-Spawn busybox idle worker mit Grants
     `["registry:read","deployments:admin"]` → **running**
     (validateGrantableCapabilities akzeptiert die NEUEN Domänen-Caps am
     Spawn).
   - `POST /api/subagents/{id}/tool-calls` `vault:delete` (nicht granted,
     critical) → **HTTP 403** `denied by capability policy: capability
     not granted to this subagent (risk=critical)` + Audit-Row `denied`.
   - `deployments:admin` (granted, critical) → **HTTP 202 guarded**,
     GUARDED-Queue-Row (R21/DAP JIT), danach per Operator-Deny sauber
     geschlossen.
   - `registry:read` (granted, low) → **HTTP 200**, Entscheidung
     `{allow:true, risk:"low"}`, ECHTE exec-Ausgabe `hello-from-domain-cap`
     aus dem busybox-Container.
   - `billing:read` (unbekannt) → **HTTP 403** `unknown capability — no
     risk classification, denied (fail closed)` (risk=).
   - `GET /api/capabilities` → Katalog verbatim aus der Engine
     (6 Domänen × 4 Aktionen, 5 Tool-Namespaces, 5 operatorToggles),
     Agent-Grants klassifiziert `[(registry:read, low, known),
     (deployments:admin, critical, known)]`, serviceKeys count=1 (der
     echte Subagent-Key) mit ehrlichem nicht-verdrahtet-Zustand.
   - `DELETE /api/subagents/{id}` → Container weg, Key+Token revoked,
     Row `stopped`; Fixtures (subagents/tool_calls/sessions/consumer_
   keys/containers/workspaces/projects/users/settings) per id gelöscht,
   Throwaway-DB gedroppt, Verify-Container entfernt, Null Subagent-
   Container übrig. Der geteilte :19091-Stack wurde NICHt angefasst.
5. **Gateway-Route-Unit-Tests** (`internal/gateway/capabilities_test.go`):
   Handler-Test gegen echten Store (läuft, wenn Postgres erreichbar;
   ehrlicher Skip mit Begründung sonst — policy_test.go-Muster): 200 +
   6-Domänen-Katalog + Engine-Konsistenz-Kreuzcheck; 405 non-GET; 503
   fail-closed ohne Engine mit echtem Grund im Body. Im Container-Netz
   gescipped (localhost-Fallback), live durch die Curl-Kette ersetzt.
6. **Frontend:** `tsc --noEmit -p tsconfig.app.json` — 0 Fehler in den
   eigenen Dateien; 223 Pre-existing-Noise-Zeilen identisch zum Main-Tree-
   Baseline (vor/nach gleich). `eslint` auf den 3 angefassten Dateien:
   sauber. `check:i18n` grün (60 Locales, 1948 Keys Parität).
   `npm run test` (vitest) nicht ausgeführt — die eigene Seite hat keinen
   Component-Test; die bestehende Suite wurde nicht angefasst (ehrliche
   Grenze: bei Merge-Run des Operators mitlaufen lassen).

### 🐛 Fund: Fresh-Install-Migrations-Bug (VORHANDEN, nicht von TASK-070, nicht hier gefixt)

Live bewiesen beim Aufsetzen der Throwaway-DB: `store.migrate()` fährt die
ALTER-Statements (store.go:218–283) VOR den CREATE-TABLE-Block (store.go:558+)
aus. Auf einer FRISCHEN Datenbank existieren die Tabellen da noch nicht →
alle ALTERs schlagen STILL fehl (`_, _ =`-Fehler schluckend) → frische
Tabellen fehlen ALLE migrationsseitigen Zusatzspalten. Repro: `CREATE
DATABASE …; binäre starten; \d projects` → kein `runtime`/`node_host`/…;
`GET /api/projects`-Pfade (GetProject-SELECT, store.go:1713) brechen mit
`column "runtime" does not exist`. Getroffene Spalten in dieser Verifikation:
projects (20), sessions (5), consumer_keys (3), containers (2 — dort via
CREATE korrekt). Warum es niemanden auffiel: die produktiven DBs sind
historisch gewachsen (ALTERs trafen existierende Tabellen), die Go-Tests
nutzen Ensure*-Tabellen (subagents_test, workspaces_test), und
`policy_test.go` greift auf die Echte DB zu, nicht auf eine frische.
Workaround hier: die exakten migrate()-Statements von Hand appliziert
(dokumentiert oben). **Fix gehört in `internal/store/store.go` — Träger
einer anderen In-Flight-Session (M für store.go im Main-Tree) — deshalb
NICHT hier gefixt; das ist ein eigener Task mit eigener Verifikation**
(Backlog-Eintrag erstellt: TASK-070-FUND-1).

---

## 9. Unabhängige Nachverifikation (zweite Session, 13.9.2026, Systemdatum)

Eine frisch gestartete Session hat den gemergten Zustand im eigenen
Worktree `jimesh-worktrees/task-070-capability-rbac-verify` (Branch
`task/070-capability-rbac-verify`, Basis main `dd6735b`; während der
Verifikation rückte main auf `b73917e` — jener Commit berührt nur
Frontend/i18n, die Backend-Verifikation bleibt gültig) gegen eine EIGENE
Throwaway-Umgebung nachgemessen (kein Zugriff auf den geteilten :19091-
Stack). Ergebnisse, gegen Code + curl verifiziert:

1. **Backend:** `CGO_ENABLED=0 go build ./...` grün; `go vet
   ./internal/policy/ ./internal/gateway/` grün; `go test
   ./internal/policy/` ok (die 6 TASK-070-Tests + TASK-061-Basis);
   `go test ./internal/subagents/` ok.
2. **Gateway-Route-Tests liefen ECHT (nicht geskippt):** beide
   `TestCapabilitiesRoute*` gegen einen eigenen Throwaway-Postgres im
   geteilten Netzns (`--network container:<pg>` — der `store.Open`-
   localhost-Fallback, store.go:41-44, landet so auf der Throwaway-DB
   statt auf der echten Dev-DB): **PASS + PASS**. Der §8.5-Skip-Fall ist
   damit für die Route-Tests obsolet.
3. **Live-403-Kette reproduziert** (eigener Backend aus DIESEM Worktree,
   Docker-Publish `127.0.0.1:19095:3010` — Mandat-12-Bind, Throwaway-DB,
   docker.sock für echte Container): Login → Workspace-Ensure über die
   echte Route (echter Git-Worktree + Branch `jimesh/ws-…` + echter
   Service-Key; lokale Node via nodeHost `localhost` → `newTaskExec`
   local mode) → Subagent-Spawn busybox:1.37 mit Grants
   `["registry:read","deployments:admin"]` → **running** (die neuen
   Domänen-Caps sind grantable am Spawn). Dann über die echte Route
   `POST /api/subagents/{id}/tool-calls`:
   - `vault:delete` (ungewählt, critical) → **HTTP 403** „denied by
     capability policy: capability not granted to this subagent
     (risk=critical)" + Ledger-Row `denied`;
   - `deployments:admin` (gewährt, critical) → **HTTP 202 guarded**
     (GUARDED-Queue-Row, danach per Operator-Deny sauber geschlossen);
   - `registry:read` (gewährt, low) → **HTTP 200** + ECHTE exec-Ausgabe
     `hello-from-domain-cap-v2` aus dem busybox-Container;
   - `billing:read` (unbekannt) → **HTTP 403** fail-closed
     („unknown capability — no risk classification");
   - `GET /api/capabilities` → **200**: 6 Domänen + 5 Tool-Namespaces +
     5 operatorToggles verbatim aus der Engine, Grants klassifiziert als
     `(registry:read, low, known)` / `(deployments:admin, critical,
     known)`, serviceKeys mit ehrlichem nicht-verdrahtet-Zustand.
   Cleanup über echte Routen (Subagent-DELETE: containerRemoved +
   keyRevoked + sessionRevoked; Workspace-DELETE `confirm=true`:
   worktreeRemoved + branchDeleted) + Fixture-Rows per expliziter ID
   entfernt; Umgebung (Backend-Container, Throwaway-DB, Netz,
   Fixture-Repo) vollständig abgebaut.
4. **Frontend:** `tsc --noEmit -p tsconfig.app.json` — 205 Fehler = die
   gemergte Baseline (der b73917e-Commit dokumentiert exakt dieselben
   205), **0** in AdminCapabilitiesPage/AdminLayout/App-Routen;
   `check:i18n` grün (60 Locales / 2073 Keys).
5. **FUND-1 IST AUF MAIN BEHOBEN — verifiziert:** Der §8-Repro (frische DB
   → fehlende Spalten → GetProject bricht) läuft nicht mehr. Eine frisch
   migrierte Throwaway-DB besitzt alle projects-Spalten, weil die CREATEs
   die Spalten inzwischen selbst tragen (store.go:575-578, Kommentar
   dokumentiert die Bug-Klasse; gelandet mit TASK-076 feat 3a57775, Merge
   d1fdcc2), und die Live-Kette mintete Service-Keys/Sessions auf der
   frischen DB ohne jeden Spaltenfehler. Der §8-Workaround (händische
   ALTERs) ist obsolet; die BACKLOG-Zeile TASK-070-FUND-1 ist entsprechend
   aktualisiert.
6. **Verify-Topologie-Fund (kein Produktions-Bug):** Der lokale Worktree-
   Step läuft als root im Backend-Container — bind-mountete Repos gehören
   dem Host-User → `git safe.directory` nötig (`GIT_CONFIG_*`-Env im
   Verify-Container). Betrifft nur Verify-Setups mit bind-mounteten
   Fremd-Repos; die echte Workspace-Fläche deployt SSH-Nodes. Dasselbe
   gilt für die Docker-CLI: ein nackter golang-Container ohne
   backend-entry.sh-Install braucht `docker-cli` für den Spawn
   (scripts/backend-entry.sh macht das im echten Stack ohnehin).
