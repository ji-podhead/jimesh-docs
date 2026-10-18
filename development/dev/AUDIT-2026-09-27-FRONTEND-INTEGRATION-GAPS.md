# AUDIT — Frontend Integration Gaps: Built-but-Unreachable (Route Wiring / Nav Reachability)

**Datum:** 27.9.2026
**Scope:** NUR Erreichbarkeit/Verdrahtung (Route existiert + hat Nav/Link-Eintrag?), NICHT ob die Feature-Logik selbst
vollständig ist (das deckt `docs_dev/AUDIT-2026-09-27-*.md` und `/home/ji/projects/ihc24/audit.md` bereits ab —
diese Funde werden hier NICHT wiederholt, nur als Kontext referenziert).

**Methode:**
1. `App.tsx` (772 Z.) vollständig gelesen — alle ~97 `<Route>`-Einträge extrahiert (inkl. verschachtelte
   `/security/*` und `/admin/*` Outlets).
2. `lib/section-nav.ts` (260 Z.) vollständig gelesen — jeder Top-Nav/Dropdown-Eintrag (`proxyItems`,
   `workspaceItems`, `platformItems`, `securityItems`, `dbItems`).
3. `components/sidebar/HierarchySidebar.tsx` vollständig gelesen — `NAVIGATION_ITEMS` + `EVENTS_ITEMS` (die
   zweite, unabhängige Link-Quelle neben der Top-Nav; erklärt, warum `firewall-rules` + `siem` entgegen dem
   ersten Blick auf section-nav.ts DOCH erreichbar sind).
4. `components/command-palette.tsx` gegrept — dritte Link-Quelle (Ctrl+K).
5. Für jede Route, die in keiner der drei Quellen auftaucht: Volltext-Grep über `src/frontend/src` nach dem
   Pfad-String in jeder Schreibweise (`'/x'`, `"/x"`, `` `/x/${…}` ``, `to="/x"`, `navigate('/x')`) — um jeden
   Einzel-Link aus einer beliebigen anderen Seite zu finden (z. B. das eine Inline-Link in `WorkspaceDetailPage`
   zu `/security/findings`).
6. Dead-Component-Scan: alle `.tsx`/`.ts` unter `components/` und `views/` (190 Dateien) gegen einen Import-Grep
   ihres Exportnamens über den ganzen Baum geprüft; 9 Treffer mit null Referenzen einzeln verifiziert (Export
   angeschaut, dann erneuter präziser Grep auf den echten Export-Bezeichner statt nur den Dateinamen).

---

## 1. Orphaned Routes (existieren + rendern echte Daten, aber 0 oder nur 1 zufälliger Link)

| Route | Real backend confirmed? | Currently linked from anywhere? | Recommended fix location |
|---|---|---|---|
| **`/agents/sessions/:sessionId`** (NEU) | yes — identische Komponente `AgentSessionDetailPage` wie das reguläre `/sessions/:sessionId` (das über `SubagentsPanel.tsx:368`, `SubagentApprovalQueuePage.tsx:511` und Selbst-Navigation erreichbar ist) | **no** — 0 Treffer im gesamten `src/frontend/src` außer der eigenen `<Route>`-Zeile (App.tsx:581). Kein Test, kein Kommentar, kein Link — nicht mal der stale-TODO-Typ, sondern buchstäblich nie referenziert | Route ist ein toter Duplikat-Pfad. Entweder löschen (die reguläre `/sessions/:sessionId` deckt den Fall ab) oder — falls für Agent-Kontext-Deep-Links gedacht — von `AgentsPage.tsx` je Agent-Zeile verlinken |
| **`/api-docs`** (NEU) | yes — rendert live `GET /openapi.json` (`OpenApiPage`) | **only-direct-url** (praktisch) — genau 1 Treffer im ganzen Frontend: ein `<Link to="/api-docs">` tief in `views/OpnsenseFirewallConfigPage.tsx:159`, einer fachfremden Firewall-Konfigseite. Kein Eintrag in `section-nav.ts` (keine Gruppe), kein Eintrag in `HierarchySidebar` `NAVIGATION_ITEMS`/`EVENTS_ITEMS`, kein Eintrag in `command-palette.tsx` (0 Treffer für „api-docs"/„OpenApi") | `platformItems` in `section-nav.ts` (neben Control-Planes/Vault/Networks/Builder — „wo läuft was, welche Engines" passt zur API-Doku) ODER ein Command-Palette-Eintrag |
| `/overview` (bereits bekannt, audit.md §10) | yes — echte SSOT-Hierarchie-Daten (`useSSOTStore`) | no — nur über den Root-Redirect (`/` → `/overview`) erreichbar, kein expliziter Nav-Eintrag in irgendeiner der 3 Quellen | Eigener Eintrag als „Home"/Landing-Item ganz oben in einer Nav-Gruppe (oder ein Klick auf `Brand`/Logo sollte explizit dorthin führen statt nur implizit über den Redirect) |
| `/security/findings` (bereits bekannt, audit.md F-Rest) | yes — aggregiert echte Feeds (`/api/sdk/logs`, `/api/security/events`, `/api/projects/{id}/iac-files`) | only-direct-url (fast) — genau 1 Inline-Link in `views/WorkspaceDetailPage.tsx:412` | `securityItems` in `section-nav.ts` (fehlt dort komplett, obwohl `securityOverview`, `exposure`, `wafMatrix` etc. alle vorhanden sind) |
| `/dbs/datalake` (bereits bekannt, audit.md §2) | partial — Route ist echt, liefert ehrlichen `not_connected`-Status (`/api/datalake/status` + `/api/datalake/pipelines`), aber die Pipeline selbst ist ein No-Op-Stub (B10) | no — 0 Treffer außer der `<Route>`-Zeile; `dbItems` in `section-nav.ts` hat nur `backups` + `discovery`, keinen `datalake`-Eintrag | `dbItems` in `section-nav.ts` um einen dritten Eintrag erweitern |

**Nicht als Orphan gezählt (verifiziert reachable, zur Abgrenzung dokumentiert):**
`/models/fusion|embeddings|image|video|audio(+/:id)` — fehlen in `section-nav.ts` UND `HierarchySidebar`, sind
aber alle 6 in `command-palette.tsx` verlinkt (`p-fusion`, `p-embeddings`, `p-image`, `p-video`, `p-audio`) und
untereinander über `components/models-tabs.tsx` verkettet — Ctrl+K findet sie, kein Orphan. `/premium` (Navbar
„Upgrade"-Button). `/sessions`, `/sessions/:sessionId` (mehrere echte Links). `/workspaces/projects/:projectId`,
`/workspaces/ws/:workspaceId`, `/workspaces/apps/:appId`, `/workspaces/deployments/:id/:id`,
`/workspaces/targets/:name`, `/config/:id`, `/security/events/:id` — alle mit ≥2 echten Inbound-Links gefunden.
`/admin/*` — eigene Sub-Nav in `AdminLayout.tsx`. `/security/firewall-rules`, `/security/siem`, `/networks`,
`/security/scans/sast`, `/security/scans/dast` — nicht in `section-nav.ts`, aber alle 5 in `HierarchySidebar`
`EVENTS_ITEMS` (bestätigt audit.md's Aussage „firewall-rules + siem sind via Sidebar erreichbar").

---

## 2. Dead/Unused Components (nie importiert — nicht mal an eine Route verdrahtet)

Alle 9 Treffer einzeln mit dem echten Export-Bezeichner (nicht nur Dateiname) nachverifiziert — 0 Referenzen
außerhalb der eigenen Datei.

| Component | Real backend confirmed? | Currently linked from anywhere? | Recommended fix location |
|---|---|---|---|
| **`components/playground/conversation-sidebar.tsx`** (`ConversationSidebar`) + **`components/playground/settings-rail.tsx`** (`SettingsRail`) + ihre 3 Support-Libs (`lib/playground-conversations.ts`, `lib/playground-sampling.ts`, `lib/playground-stream.ts`, je mit eigener Testdatei) | n/a (reines Frontend-Feature: Conversation-Persistenz + Sampling-Settings + Streaming) | **no** — 0 Referenzen irgendwo. Ihr einziger denkbarer Host, eine „Playground"-Seite unter `/projects`, existiert nicht mehr als eigene Page — `/projects` ist seit dem Workspaces-Rename nur noch `<Navigate to="/workspaces" replace />` (App.tsx:566). `FULL_BLEED_ROUTES`/`WIDE_ROUTES` in App.tsx referenzieren `/projects` immer noch als „the Playground" (Kommentar Z. 457–460), aber die Route rendert die Komponente gar nicht mehr | Kompletter, isolierter Sub-Baum eines früher gebauten Chat-Playgrounds (gespeicherte Conversations, Rename/Delete, Sampling-Regler, Streaming) — entweder eine eigene `/playground`-Route + Nav-Eintrag bauen, oder als toten Code entfernen (Operator-Entscheidung, kein reiner Nav-Fix) |
| `components/overview/ScopeSelectorModal.tsx` (`ScopeSelectorModal`) | n/a (UI-Modal auf `useSSOTStore`) | **no** — 0 echte Imports. Der eigene Datei-Kommentar behauptet „SPRINT-52 WP1 is its FIRST real consumer: the HierarchySidebar's Scope section opens it" — das stimmt nicht mehr: `HierarchySidebar.tsx`'s FIX-3-Refactor (Kommentar Z. 71–75, „K3 the level dropdown before the ScopeSelectorModal cascade" im eigenen KILL LIST) hat das Modal durch eine inline `ScopePopoverBody` ersetzt. Nur noch 5 Kommentar-Erwähnungen in `HierarchySidebar.tsx`, keine Nutzung | Toter Code nach Refactor — der Datei-Kommentar lügt jetzt aktiv über den eigenen Verwendungsstatus. Entfernen oder Kommentar korrigieren |
| `components/mesh/MeshBadge.tsx` (`MeshBadge`) | n/a (Badge-Primitive auf `OverviewBadge`-Schema) | **no** — 0 Referenzen | Falls `OverviewGrid`/`OverviewComponent`-Karten Badges brauchen (das Schema `OverviewBadge` existiert und wird an anderer Stelle befüllt) — hier verdrahten |
| `components/files/FileBrowserField.tsx` (`FileBrowserField`) | n/a (kombiniert `FilePathInput` + `FileBrowserModal`) | **no** — 0 Referenzen. Alle echten Aufrufer (`HierarchySidebar.tsx` Files-Button) nutzen `FileBrowserModal` direkt statt dieser fertigen Input+Button-Kombination | Formulare mit SSH-Pfad-Eingabe (z. B. Deploy-Dialoge), die aktuell `FileBrowserModal` roh verdrahten, könnten stattdessen diese Komponente nutzen |
| `components/ProviderStatus.tsx` (`ProviderStatus`) | **yes** — `GET /api/dsh/settings` (echter Endpoint) | **no** — 0 Referenzen | Keine Seite zeigt Provider-Status (API-Key konfiguriert? Play/Pause?) trotz fertiger, backend-gebundener Komponente — Kandidat für `/keys` oder Onboarding |
| `components/TierOnboarding.tsx` (`TierOnboarding`) | **yes** — `GET /api/dsh/settings` + `POST /api/dsh/import` (echte Endpoints) | **no** — 0 Referenzen | Passt thematisch zu `/onboarding` (`OnboardingPage`) oder `/agents` — fertige Tier-Model-Import-UI, aber nirgendwo gemountet |
| `components/ui/progress.tsx` (`Progress`) / `components/ui/separator.tsx` (`Separator`) | n/a (shadcn-Design-System-Primitive) | no | Geringe Priorität — Design-System-Leichen, kein Feature-Verlust; beim nächsten UI-Kit-Cleanup entfernen |

---

## 3. Einordnung ggü. audit.md

`audit.md` (Vollständigkeits-Audit PLAN-vs-CODE) behandelt **Feature-Vollständigkeit**, nicht Reachability —
seine 3 Erreichbarkeits-Funde (`/overview`, `/security/findings`, `/dbs/datalake`) sind hier als Kontext
übernommen (Tabelle 1, nicht neu gezählt). NEU in diesem Audit: `/agents/sessions/:sessionId` (echter
Null-Link-Orphan), `/api-docs` (Ein-Link-Zufallsfund) sowie der komplette Dead-Component-Befund (9 Komponenten +
3 Support-Libs), den audit.md nicht behandelt (es erwähnt nur `NetworkEditingGrid orphaned` als bereits gefixt).
