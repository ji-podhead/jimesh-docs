# GLM-Aufgaben nach dem Komplett-Audit (21.9.2026, spät)

Basis: 13 parallele Recherche-Agenten haben heute alle 51 Stitch-Designs
+ Sprints + Backend-Routen gegen den echten Code verifiziert (Grep+Read,
keine Vermutungen). Volltext: `docs_dev/AUDIT-2026-09-21-GAP-LIST.md`.
Live-Tabelle mit allen ~65 Einzelfunden (filterbar):
https://claude.ai/code/artifact/51a26daf-03ab-49bf-a7c8-27d285475d75
Alles nummeriert in `docs_dev/backlog/BACKLOG.md` (#142-172).

Standing-Regeln gelten weiter: No-Mock, Doku-Pflicht, Plan-vor-Code,
**keine Git-Ops ohne Freigabe**.

**Nicht dein Bereich** (läuft bei mir bzw. direkt beim Operator):
`docs_dev/prompts/glm-sidebar-scope-redesign.md` (Sidebar-Neustrukturierung,
der Operator koordiniert das selbst mit dir), Backlog #133-Rest, §8.3b
in `docs/ARCHITECTURE.md` (Project-Detail-Seite, RBAC-Visibility) — bitte
diese Dateien/Bereiche nicht parallel anfassen.

---

## TIER 0 — Sofort, vor allem anderen (kritisch)

### 1. #142 — `/api/ssh/explore` doppelt registriert (Absturz-Risiko)

Du hast `internal/gateway/ssh_explore.go` gebaut (Commit `0273f4a`), ohne
zu sehen dass `internal/deploy/ssh_explore.go` (mein älterer Commit
`bfdcff8`) dieselbe Route bereits registriert hatte — dein eigener
Kommentar im Code zeigt, dass du nur `internal/gateway/*.go` gegrept
hast, nicht `internal/deploy/*.go`. Beide sitzen auf demselben
`http.ServeMux`, Go panict garantiert bei Neustart.

**Verifizierter, sauberer Fix** (ich habe das geprüft — `ssh_explore.go`
in `deploy/` ist komplett self-contained, nichts anderes im Package
referenziert `handleSSHExplore`/`sanitizeExplorePath`/etc. aus dieser
Datei):

1. Lösche `src/backend/internal/deploy/ssh_explore.go` komplett.
2. Entferne Zeile `mux.HandleFunc("/api/ssh/explore", h.handleSSHExplore)`
   aus `src/backend/internal/deploy/deploy.go:78`.
3. Deine Version (`gateway/ssh_explore.go`) bleibt — sie hat die
   besseren Tests (10) und den saubereren Injection-Schutz.
4. `make go-build` + `make go-vet` danach zur Bestätigung.

### 2. #162 — `ProxyChainsPage.tsx:763` — expliziter MANDATES.md-Verstoß

`key.status || 'healthy'` ist wortwörtlich das in `MANDATES.md` genannte
Negativbeispiel ("hardcoded 'healthy' answer trains operators to trust
green lies"). Fix: unbekannten Status ehrlich als "unknown"/"—" zeigen,
nicht als "healthy" faken.

Auf derselben Seite außerdem entfernen/fixen: erfundene
`mesh://llm-proxy:8080/v1`-URI (Z.242,276 — nutze die echte Origin-URL
wie `LlmProxyOverviewPage.tsx` es korrekt macht), statisches "eBPF Token
Gate: Enforced"-Badge (Z.288-294, kein echter Check dahinter), "Simulate
Prompt Route"-Button ohne `onClick` (Z.296-299 — entweder verdrahten
oder entfernen), erfundene "100% Recovered"/"18ms eBPF switch"-Zahlen
(Z.360-366), statische Timeout-Pills (Z.644-649), fake
Tier/Token-Fallbacks (Z.706,711-713), und der "Verify Node
Config"-Button (Z.779-785) der nur `toast.info(...)` zeigt ohne jede
echte Backend-Aktion — entweder an eine echte Verify-Route hängen oder
entfernen.

### 3. #147 — `AgentSessionDetailPage.tsx` ist zu 100% Theater

Komplette Chat-Konversation (Z.109-180) ist ein hartcodiertes
`useState`-Array, nie vom Backend geladen — inkl. eines erfundenen
eBPF-Trace-Strings (Z.136). `handleSendMessage` hängt bei jeder Eingabe
eine weitere feste Fake-Antwort an. Rechtes "Failover Pipeline
State"/Metrik-Panel (Z.529-853) komplett statisch. "Session Tool
Invocations" (Z.736-814) fällt bei leerer echter Query auf 4
hartcodierte Fake-Einträge zurück. Dazu ein pulsierendes "LIVE
TELEMETRY"-Badge, obwohl nichts live ist.

Das ist keine kleine Korrektur — die Seite braucht eine echte
Datenquelle (Session-Messages aus dem Backend, echte Tool-Call-Historie)
oder muss ehrlich als "Demo/Konzept" gekennzeichnet werden, bis diese
Datenquelle existiert (Muster: `WorkspaceDetailPage.tsx`
"Beispieldaten"-Banner). Rücksprache mit Operator empfohlen, welche
Variante — echtes Backend-Wiring ist vermutlich mehr Aufwand als die
anderen Tier-0-Punkte.

### 4. #145 — `PluginCatalogPage.tsx:73-158` — fake Ratings/Reviews

`metadataMap` (Z.73-122) erfindet `rating`/`reviews`/`installs`/`author`
für ALLE Plugins inkl. echter (jules/linear/github_app).
`fallbackDefaults` (Z.126-146) injiziert 3 komplett fiktive Plugins
(stitch_designer/opnsense_firewall/playwright_auto) unmarkiert in die
echte Liste. Fix: beides entfernen — zeig nur was `GET /api/plugins`
wirklich liefert, keine erfundenen Zahlen.

---

## TIER 1 — Deine bestehende Queue (unverändert, 2 Korrekturen)

Aus `docs_dev/prompts/glm-session-full-task-split.md`, weiter in dieser
Reihenfolge:

1. **Item 2 — Secrets/Vault Pfad-Modell.** ZUSÄTZLICH aufnehmen: die
   SDK-Signatur `jimesh.secrets.get(<kv storage>, <secret>, <optional:
   secretsengine/target host>, <optional: jimesh api key>)` (#155) —
   der Operator hat das in einer alten Session diktiert, es fehlt
   bisher komplett aus §8.3c und deiner Spec.
2. **Item 3 — 5 Design-Routen, KORRIGIERT:**
   - App-Discovery, Deployment-Detail, SSH-Target-Detail: **bestätigt
     nochmal frisch verifiziert** (0 Route in `App.tsx`), Backend für
     Deployment-Detail ist real (`GET /api/deployments`, #151), für
     SSH-Target-Detail muss das SPRINT-48-Modell respektiert werden
     (kein FK mehr, Freitext-Label).
   - Browser-Integration-Selection **aus der Liste streichen** — fertig
     (`BrowserRuntimeModal.tsx`, #139).
   - OTel/Distributed-Trace-Detail bleibt blockiert bis Backend-Fix
     Audit F-05.
3. **Item 4 — WorkspaceDetailPage echtes Backend.** `GET /api/deployments`
   existiert jetzt real (#151) — das "Beispieldaten"-Banner für
   Container kann vermutlich weg, sobald verdrahtet. Secrets-Banner
   bleibt bis Item 2 fertig ist.
4. Danach wie geplant: #130 (User-Provisionierung), #131 (Shared
   Workspace), #132 (Projekt-Migration).

---

## TIER 2 — Schnelle No-Mock-/Tote-Link-Fixes (zwischendurch machbar)

- **#150** — 4 tote Frontend-Calls, führen zu echten 404s:
  `lib/playground-conversations.ts:171,175` (`/api/conversations` —
  Backend existiert gar nicht, ganze Playground-History ist Fiktion —
  entweder Backend bauen oder Feature ehrlich als "kommt noch"
  markieren), `lib/logs.ts:82` (`/api/logs`), `components/keys/shared.tsx:99`
  (`/api/models/custom/{id}` — Backend hat nur 1-Segment-Pfad),
  `components/keys/custom-provider-section.tsx:126` (`POST
  /api/media/custom` ohne ID — Backend hat nur `/api/media` +
  `/api/media/custom/{id}`).
- **#168** — Plugin Install Wizard: fake Connection-Test (nur 600ms
  Timeout, immer Erfolg), hartcodierte Capability-Liste pro Plugin,
  Deko-Strings "Pre-flight check passed"/"Vault KMS Unsealed" ohne
  echte Prüfung, vorausgefüllter Fake-API-Key.
- **#169** — Plugin Settings: Save/Discard/Sideload-Buttons ohne
  `onClick` (entweder verdrahten oder Buttons entfernen/disablen mit
  ehrlichem Tooltip wie beim Add-Binding-Muster), "Live Event Stream"
  mit nur einer statischen Zeile.
- **#154** — `NetworkEditingGrid.tsx`: komplett verwaist (0 Imports),
  fabrizierte Security-Badges für jedes Netzwerk gleich, toter "Scan
  NICs"-Button. Entweder einbinden (mit echten Daten) oder löschen.
- **#148** — SPRINT-16.md als "durch SPRINT-39 ersetzt" markieren (reine
  Doku-Korrektur, HashiCorp-Vault-Behauptung war nie real).
- **#152** — ~15 undokumentierte Routen in `API_DOCS.md` nachtragen
  (Liste steht im Backlog-Eintrag).

---

## TIER 3 — Größere neue Produktflächen (NICHT einfach anfangen — erst mit Operator/mir abstimmen, das sind Design-Entscheidungen, keine Lückenfüller)

Nur zur Kenntnis, bitte NICHT ungefragt bauen:

- #143 4 Selector-Modals (App/Project/Workspace/Target) — hängt an der
  Sidebar-Neustrukturierung, die der Operator separat mit dir koordiniert
- #153 ProjectsPage.tsx reaktivieren oder Delete-Funktion nach
  WorkspacesPage migrieren (hängt an M5)
- #159 CommandPalette Live-Registry-Suche
- #160 zwei parallele, beide verwaiste Scope-Selector-Implementierungen
  — welche gewinnt? (hängt an Sidebar-Redesign)
- #163 NetworkEditingPage — Multi-Netzwerk-Graph-Dashboard statt
  Ein-Projekt-Formular
- #164 Admin-Settings-API-Keys — Project-Override-Konzept ist komplett
  neu, nicht im Code
- #165 Teams & RBAC — Access-Preview/Live-Simulation-Sidebar
- #166 Secrets Vault — Real-Time-OPA-Evaluation-Stream
- #167 Vault Access Matrix — volle Struktur-Spec liegt bereits vor
  (siehe Audit-Doc §9), aber neues Feature
- #170 Integrations & Plugins — fehlende Sidecar-Deployment-Management-
  Hälfte
- #171 Security Findings — Wiring auf existierenden IaC-Scanner (das
  hier ist eigentlich TIER-2-tauglich, reines Wiring, kein neues
  Feature — kann vorgezogen werden wenn Zeit ist)
- #172 DLP — komplette "Live Inspector"-Sektion fehlt, braucht
  vermutlich neuen Backend-Endpoint
