# Komplette Gap-Liste — Design/Sprints/Research vs. echter Code (21.9.2026)

Methode: 13 parallele Recherche-Agenten in 2 Runden (5 Grep/Backend-Audits
+ 8 Design-vs-Code-Deep-Dives über alle 51 Stitch-Screens), jeder mit
Grep+Read-Verifikation gegen den echten Code (keine Vermutungen). Alle
Runden abgeschlossen.

**Lebendes, filterbares Artifact mit allen ~65 Einzelbefunden:**
https://claude.ai/code/artifact/51a26daf-03ab-49bf-a7c8-27d285475d75
(Suche/Filter nach Status built/partial/missing/mocked/doc-lie/critical,
Domäne, Prüftiefe deep/route). Dieses Dokument bleibt der Text-Volltext
für Details, die im Artifact nur als Kurznotiz stehen.

Bereits vorher bekannt und NICHT hier wiederholt: Backlog #099, #118-141
(siehe `docs_dev/backlog/BACKLOG.md`), insbesondere #124 (local-CP-Probe
kaputt), #126 (SSH blockiert), #130-133/135/137/140/141.

---

## 1. KRITISCH — Absturzrisiko (bereits committed, HEAD)

**Doppelte Route-Registrierung `/api/ssh/explore`.** Zwei komplett
unabhängige Implementierungen kollidieren auf demselben `http.ServeMux`:
- `src/backend/internal/deploy/deploy.go:78` → `deploy/ssh_explore.go`
  (`Handlers.handleSSHExplore`)
- `src/backend/internal/gateway/gateway.go:293` → `gateway/ssh_explore.go`
  (`Server.handleSSHExplore`)

Beide werden in derselben Funktion auf demselben `mux` registriert
(`s.deploy.Register(mux)` bei Zeile 222, dann `mux.HandleFunc(...)` bei
Zeile 293 — verifiziert per `git show HEAD:...`, kein Uncommitted-Artefakt).
Go's `net/http.ServeMux.HandleFunc` **panict** bei identischem Pattern
zweimal registriert. Klassische Kollision aus den zwei parallelen
Sessions (ich + GLM haben beide unabhängig "Sprint-48 File Browser
Backend" gebaut, ohne voneinander zu wissen). Muss vor dem nächsten
Backend-Neustart behoben werden — einer der beiden Registrierungspfade
muss raus (welche Implementierung die vollständigere ist, noch nicht
verglichen).

---

## 2. NICHT IMPLEMENTIERT (0 Code)

| Was | Quelle | Befund |
|---|---|---|
| App Selector Modal | Stitch-Design | Keine Datei im ganzen Frontend |
| Project Selector Modal | Stitch-Design | Keine Datei im ganzen Frontend |
| Workspace Selector Modal | Stitch-Design | Keine Datei im ganzen Frontend |
| Target Selector Modal | Stitch-Design | Keine Datei im ganzen Frontend |
| Vault Access Matrix (Secret×User/Team-Berechtigungsmatrix) | Stitch-Design | Existiert nur als statisches Screenshot-Bild in `TourPage.tsx` (`vault-access-matrix.png`), reine Marketing-Deko. `VaultDashboardPage.tsx` + `ProjectSecretsPage.tsx` (651 Zeilen) haben keine Matrix-/Grant-Struktur |
| Live-Proxy-Status im Agent-Chat | Stitch-Design | `ChatInterface.tsx` zeigt nur einen statischen Hinweistext ("Fallback chain is managed by..."), keine Live-Anzeige der aktuellen Proxy-/Routing-Kette während des Chats |

Die 4 Selector-Modals sind der wertvollste neue Fund: nicht mal
Platzhalter vorhanden, komplett vom Radar verschwunden — anders als
`ScopeSelectorModal.tsx` (Backlog #137), das wenigstens existiert, nur
verwaist ist.

---

## 3. BILLIG / GEMOCKT (No-Mock-Mandat-Verletzung, echte neue Funde)

**`src/frontend/src/views/PluginCatalogPage.tsx:73-158`** — Katalog holt
echte Plugins via `GET /api/plugins`, reichert aber JEDEN Eintrag
(auch echte wie `jules`, `linear`, `github_app`) über eine
`metadataMap` (Zeile 73-122) mit frei erfundenen `rating`, `reviews`,
`installs`, `author`, `permissions` an (`rating: '4.9', reviews: 128,
installs: '4.2k'`). Zusätzlich injiziert `fallbackDefaults`
(Zeile 126-146) drei komplett fiktive Plugin-Einträge (`stitch_designer`,
`opnsense_firewall`, `playwright_auto`), die per `combinedPlugins.push()`
(Zeile 154-158) **ungekennzeichnet** in die echte Liste gemischt werden.
Anders als bei `WorkspaceDetailPage.tsx` gibt es **kein**
"Beispieldaten"-Banner — sieht wie echte Marktplatz-Statistik aus.
Das ist gefälschter Social-Proof (Fake-Bewertungen/Fake-Installzahlen).

**`src/frontend/src/views/AgentSessionDetailPage.tsx:136`** — enthält
einen hartkodierten String, der wie ein echter eBPF-Trace-Log-Eintrag
aussieht (`bpf_trace_socket --pod=trading-router --port=443
--drop-reason=EAGAIN --threshold=50ms`). Nicht tief genug geprüft um
sicher zu klassifizieren (Zeitbudget des Audit-Agenten) — **muss noch
verifiziert werden**, ob das echter Backend-Output oder erfunden ist.

**Kleiner Fund (kein Mandat-Verstoß, aber irreführend):**
`src/frontend/src/components/apps/ContainerLogViewer.tsx:17-23` — alter
TODO-Kommentar ("Backend-Route existiert noch nicht") widerspricht dem
tatsächlichen, funktionierenden Code direkt darunter (Route wurde am
20.9. gebaut, Query ist aktiv). Nur Cleanup, keine funktionale Lücke.

Alles andere im Frontend wurde geprüft und ist sauber (echte
Query-Daten, keine Fixtures): `DlpSettingsPage.tsx`, `FirewallTrafficLogPage.tsx`,
`SecurityFindingsPage.tsx`, `OpnsenseFirewallConfigPage.tsx`,
`realtime-logs.tsx`. Keine leeren `onClick`-Handler gefunden.

---

## 4. DOKU-LÜGE — Sprint als "fertig" markiert, ist es nicht

**SPRINT-16-SECOPS-VAULT-RBAC.md** behauptet `[x]`: HashiCorp Vault im
docker-compose, Vault-API-Client (`vault_client.go`), Routen
`GET/POST/PUT/DELETE /api/vault/secrets[/{name}]`.

Verifiziert falsch:
- `security/vault_client.go` existiert als Datei, wird aber **nirgends
  aufgerufen** (0 Treffer für `security.NewVaultClient`/`vault_client.`
  im ganzen Backend) — toter Code.
- `/api/vault/secrets` ist **nicht** via `mux.HandleFunc` registriert.
  Einziger Treffer: ein Doku-Fiktions-Eintrag in `openapi.go`.
- `docker-compose.yml` hat **keinen** `hashicorp/vault`-Service. Nur
  `deploy/vault/defaults.yml` (Ansible-Dev-Mode-Template, explizit "NOT
  for production").

Der tatsächliche Secrets-Pfad heute ist die embedded AES-GCM/Postgres-
Lösung aus TASK-055 (`internal/store/vault.go`), angebunden über
`secretsengine.VaultEngine` (SPRINT-39, real registriert). SPRINT-16
wurde von SPRINT-39 stillschweigend ersetzt, ohne dass der alte
Sprint-Status korrigiert wurde — d.h. wer SPRINT-16 liest, glaubt an
einen Vault-Service, den es nie in Produktion gab.

Gegenprobe (bestätigt ECHT, nicht alles ist Slop): SPRINT-38
(Control-Planes), SPRINT-39 (Secrets-Engine), SPRINT-41 (VLAN), SPRINT-32
WP0/WP4 (Wazuh/Falco-Dateien) — alle stichprobenartig verifiziert und
korrekt.

---

## 5. BACKEND FERTIG, FRONTEND NUTZT ES NICHT

| Route | Datei | Bemerkung |
|---|---|---|
| `/api/project-roles`, `/api/project-roles/{id}` | `gateway/project_roles.go` | Sprint-47 "project-scoped developer tier grant" — 0 Frontend-Treffer |
| `/api/experts`, `/api/experts/execute`, `/api/experts/runs` | `orchestration/orchestrationhandlers.go` | 0 Frontend-Treffer |
| `/api/bridge/*` (provision/stream/tools/openapi.json) | `provisioning/bridge.go` | 0 Frontend-Treffer |
| `/api/cost-trackers` | `analytics/analytics.go` | Cost-Dashboards nutzen nur `/api/cost/*` |
| `/api/app-categories` | `security/security.go` | 0 Frontend-Treffer |
| `/api/model-roles`, `/api/chains/{id}/model-roles` | `orchestrationhandlers.go` | 0 Frontend-Treffer |
| `/api/dsh/preview` | `discovery/discoveryhandlers.go` | Restliche `/api/dsh/*` werden genutzt, `preview` nicht |
| `/api/firewall/config` | `security/security.go` | Restliche `/api/firewall/*` genutzt, `config` nicht — prüfen ob `OpnsenseFirewallConfigPage.tsx` überhaupt lädt |
| `/api/sessions/query`, `/api/agents/logs/stream` | — | 0 Frontend-Treffer |

## 6. FRONTEND RUFT NICHT-EXISTENTE BACKEND-ROUTE AUF (echte 404s)

| Aufruf | Datei:Zeile | Problem |
|---|---|---|
| `GET /api/conversations[/{id}]` | `lib/playground-conversations.ts:171,175` | **Kein Backend-Handler existiert überhaupt** — Playground-Conversation-History ist reine Frontend-Fiktion ohne Backend |
| `GET /api/logs?...` | `lib/logs.ts:82` | Kein Backend-Handler `/api/logs` |
| `/api/models/custom/{id}` | `components/keys/shared.tsx:99` | Backend hat nur `/api/models/{id}` (1 Segment) — 2-Segment-Pfad matcht in Go 1.22 ServeMux nicht → 404 |
| `POST /api/media/custom` (ohne ID) | `components/keys/custom-provider-section.tsx:126` | Backend registriert nur `/api/media` + `/api/media/custom/{id}`, kein bare Create-Pfad |

**Korrektur zu Backlog #128**: `/api/deployments` existiert entgegen der
bisherigen Annahme sehr wohl (`deploy.go:77`, `handleDeploymentsList`,
echtes PostgreSQL) — Backlog #128 an dieser Stelle veraltet. Muss geprüft
werden, ob `useSSOTStore()` es inzwischen nutzt oder wo der eigentliche
Fehler dann liegt.

## 7. API_DOCS.md — undokumentierte Routen (Doku-Mandat-Verletzung)

Wahrscheinlich echt fehlend (Regex-Diff, nicht Zeile für Zeile
verifiziert — vor Nutzung gegenprüfen): `/api/datalake/status`,
`/api/datalake/pipelines`, `/api/plugins`, `/api/plugin-installations`,
`/api/nodes/provision`, `/api/premium/key`, `/api/premium/portal`,
`/api/projects/{id}/containers/{cid}/logs`,
`/api/projects/{id}/iac-files`, `/api/projects/{id}/iac-files/scan`,
`/api/settings/dlp_enabled`, `/api/sse/analytics`, `/api/sse/models`,
`/api/sse/traces`, `/api/analytics/by-workspace`,
`/api/agents/logs/stream`.

---

## 8. Aus `docs_dev/session.jsonl` (alte DSH-Session, Operator-Anforderungen) — vergessene/unbekannte Funde

**Wichtigster Fund der ganzen Audit-Runde:**

**`ProjectsPage.tsx` (1351 Zeilen, mit echtem, funktionierendem
`DeleteProjectDialog`) ist komplett tot/unerreichbar.** `App.tsx:554` —
`/projects` ist nur `<Navigate to="/workspaces" replace/>`. Die Komponente
wird zwar importiert (`App.tsx:40`), aber nirgends gerendert (0 Treffer
für `<ProjectsPage`). Das ist mit hoher Wahrscheinlichkeit die Ursache für
den Operator-Wutausbruch in der alten Session (*"wieso haben wir diese
komischen geisterprojekte die im dropdown sind die man aber nicht
auswählen kann und löschen kann man die auch nciht"*) — die einzige
funktionierende Delete-Project-UI im gesamten Repo ist über keine Route
erreichbar. Backlog-Item `M5` kennt nur den geplanten Soll-Zustand
("ProjectsPage-Rest-Funktionen in WorkspacesPage übernehmen, /projects
wird Redirect"), nicht dass der aktuelle Redirect-Zwischenzustand aktiv
eine funktionierende Delete-Funktion versteckt.

**`NetworkEditingGrid.tsx` ist orphaned UND enthält fabrizierte
Security-Badges.** 0 Treffer für Imports außerhalb der eigenen Datei.
Zeile 78-88: die Badges "gVisor Isolated" / "L2 Promiscuous" / "WireGuard
Mesh" werden für JEDES Netzwerk-Objekt statisch gerendert, unabhängig vom
echten `net.driver`/Zustand — träfe live sogar auf ein simples
Bridge-Netzwerk zu. Zusätzlich ein "Scan NICs"-Button (Zeile 31-34) ganz
ohne `onClick`-Handler. Bekanntes Backlog-Item #098 nennt nur allgemein
"echte VLAN-Daten fehlen", nicht diese zwei konkreten Funde.

**`jimesh.secrets.get(<kv storage>, <secret>, <optional: secretsengine/
target host>, <optional: jimesh api key>)`** — exakte SDK-Funktionssignatur,
die der Operator in der alten Session diktiert hat (Secrets-Abruf mit
optionalem Override von Secrets-Engine/Zielhost/API-Key statt
automatischem Routing). Steht nirgends in `ARCHITECTURE.md` §8.3c (das
Kapitel dokumentiert nur das Pfadschema, nicht diese Funktionssignatur) —
fehlt komplett aus der Spec, die GLM für Item 2 bekommen hat.

**App-Icons für App-Discovery** (pro erkanntem App-Typ, aus Docker-Hub-
Metadaten oder optionalem Code-Scan) — vom Operator mehrfach in der alten
Session gefordert. 0 Treffer im gesamten Frontend außer einem Stitch-PNG.
Steckt zwar implizit unter GLMs bekanntem Item-3-Punkt "App-Discovery",
aber das Icon-Detail selbst ist in keinem Backlog-Text festgehalten.

**Onboarding-Node-Step soll auch fragen, welche Firewall UND welche
Utility-Apps deployt werden sollen** — über das bereits bekannte #135
(blockiert durch #124) hinaus nicht als eigener Onboarding-Schritt
spezifiziert.

**Scanopy — Kommunikationslücke, kein Umsetzungsgap.** Backend enthält 0
Scanopy-Code, aber das ist bewusst: Sprint-40 dokumentiert explizit, dass
Scanopy AGPL-3+Commercial-Dual lizenziert ist und deshalb nur als
Referenz (wie headscale-admin) diente, kein Code übernommen wurde. Der
Operator-Unmut in der alten Session deutet darauf hin, dass ihm diese
Lizenz-Entscheidung nie klar mitgeteilt wurde oder wieder entfallen ist —
sollte ihm nochmal explizit bestätigt werden, ist aber kein technischer
Gap.

**Nicht systematisch geprüft** (Zeitbudget des Agenten): die Rohdatei
enthält weit mehr Strategie-/Research-Diskussion (Secrets-Provider-
Interface, Access-Policy-Objekt, Cloud-Provider-Abstraktion über SSH,
IMDS-Egress-Deny) als konkrete UI-Anforderungen — diese wurden nicht
gegen `docs/PRODUCT-ROADMAP.md` abgeglichen, da außerhalb der
UI/Frontend-Gap-Fragestellung dieser Runde.

---

## 9. Runde 2 — Deep-Dive aller 51 Stitch-Screens (8 parallele Agenten)

Vollständige, zeilenscharfe Ergebnisse stehen im Artifact (Abschnitt
Kopf dieses Dokuments). Hier nur die schwersten NEUEN Funde, die über
Abschnitt 1-8 hinausgehen (Backlog #159-167):

**KRITISCH, während des Audits direkt gefixt (kein Git-Commit):**
`ProjectDetailPage.tsx:2` importierte `useParams`/`useNavigate` aus
`'react'` statt `'react-router-dom'` — diese Exports existieren im
`react`-Paket nicht. Datei wird eager in `App.tsx` importiert, reißt
potenziell den kompletten Frontend-Bundle. War bereits im HEAD committed
(`497a696`). 1-Zeilen-Fix angewendet, NICHT committed.

**KRITISCH, noch offen:** `ProxyChainsPage.tsx:763` — `key.status ||
'healthy'`. Das ist wortwörtlich das in `MANDATES.md` als
Negativbeispiel genannte Anti-Pattern ("a hardcoded 'healthy' answer
trains operators to trust green lies"). Auf derselben Seite 8 weitere
Fake-Stellen: erfundene `mesh://llm-proxy:8080/v1`-Ingress-URI
(widerspricht der echten Origin-URL auf `LlmProxyOverviewPage.tsx`),
statisches "eBPF Token Gate: Enforced"-Badge ohne Prüfung,
wirkungsloser "Simulate Prompt Route"-Button (kein onClick), erfundene
Failover-Statistik ("100% Recovered", "18ms eBPF switch"), statische
Timeout-Pills, fake Tier/Token-Fallbacks, und ein "Verify Node
Config"-Button, der nur `toast.info('Node settings verified with OPA
policy.')` zeigt — keine echte Backend-Aktion (#162).

**`AgentSessionDetailPage.tsx` ist zu 100% Theater.** Die komplette
Chat-Konversation inkl. des verdächtigen eBPF-Trace-Strings (Z.136) ist
ein hartcodiertes `useState`-Array, nie vom Backend geladen. Tool-
Invocations fallen praktisch immer auf 4 hardcodierte Fake-Einträge
zurück. Kein "Beispieldaten"-Hinweis, dafür ein pulsierendes "LIVE
TELEMETRY"-Badge — schwerster Mock-Fund der ganzen Runde, weil die
Seite sich aktiv als live ausgibt statt es nur zu verschweigen.

**Integrations & Plugins: nur die halbe Produktfläche gebaut.** Design
zeigt einen Sidecar-Deployment-Manager (Katalog links + "Active
Deployments"-Panel mit Sidecar-Management rechts + "Quick Deploy &
Attach"-Leiste). Echter Code (`PluginCatalogPage.tsx`, `/plugins`) deckt
nur die linke Katalog-Hälfte ab — die komplette Deployment-/Ressourcen-
Verwaltungshälfte fehlt vollständig, keine `/integrations`-Route
existiert.

**Plugin Install Wizard + Plugin Settings simulieren Vertrauens-
Signale.** Vorausgefüllter API-Key mit Fake-Maskierung, "Connection
Test" der nur 600ms wartet und immer Erfolg meldet, identische
Capability-Liste für jedes Plugin, "Pre-flight check passed (4/4)" ohne
echte Prüfung. In Plugin Settings: Sideload/Save/Discard-Buttons ohne
`onClick`, "Live Event Stream" mit genau einer statischen Zeile.

**Vault Access Matrix — volle Struktur-Spec extrahiert** (für künftige
Umsetzung, #167): Kreuztabelle Identity(`dsh-worker-*`, `claude-agent-*`,
`opencode-agent`, mit Rollen-Badge) × Vault-Ressource(`dsh-krb5-cluster`,
`prod-db`, `ai-tokens`, `vault-master`); Zell-Werte als Access-Level-
Badges (Full/Read-Only/Denied/Inherited); Violation-Highlight mit
Remediate-Tooltip; Footer mit "Active OPA Policy Rules"-Karten. Braucht
vermutlich einen neuen Backend-Endpoint, der pro (Identity, Resource)
das OPA-Ergebnis liefert — `capabilities.rego` (#070) potenziell
wiederverwendbar.

**Weitere neue Funde**, alle mit Datei:Zeile im Artifact/Backlog:
CommandPalette hat keine Live-Registry-Suche (#159); eine ZWEITE,
komplett unabhängige, ebenfalls verwaiste Scope-Selector-Implementierung
existiert (`components/layout/scope-selector.tsx`, TASK-074, #160) —
zwei Sessions haben unabhängig zwei Scope-Selectors gebaut, keiner ist
verdrahtet; DashboardBuilderPage.tsx ist ehrlich als Phase-2 markiert,
kein Mandats-Verstoß (#161); NetworkEditingPage.tsx ist strukturell
komplett anders als das Design (Ein-Projekt-Formular statt Multi-
Netzwerk-Graph-Dashboard), aber die Daten darin sind ehrlich echt
(#163); Admin-Settings-API-Keys ist eine komplett andere Produktidee als
im Design (#164); Teams & RBAC fehlt die Access-Preview/Live-Simulation-
Sidebar + Rule-Trace (#165); Secrets Vault fehlt der Real-Time-OPA-
Evaluation-Stream (#166).
