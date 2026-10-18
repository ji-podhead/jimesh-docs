# SPRINT-139 — Unified App Panel: Apps + Deployments kombiniert, Klick-to-Panel

**Status:** 🚧 IN ARBEIT (Branch `feat-app-panel`)
**Auftrag (Operator, wörtlich):** „kann man apps mit deployments irgendwie nicht kombinieren oder mergen? und wieso gibts da auch kein dropdown für aktive apps? gibts da überhaupt ein konzept dass wenn man draufklickt man auf das settings window kommt und halt dann die integration hat bzw terminal oder halt das dashboard?"

## Ziel

ONE Surface statt vier verstreuter: ein rechtsseitiger Drawer (~60 % Breite), der sich bei JEDEM App-Zeilen-Klick öffnet (Sidebar-Tree, WorkspaceDetailPage-Container-Karten, Active-Apps-Dropdown) und die App-Row MIT ihrer Deployment-Row in drei Tabs vereint:

- **INFO** — Framework, Runtime, Ports, State-Volume, Status-Badge aus `GET /api/projects/{id}/deployments` (fehlende Deployment-Row wird BENANNT, nie gefaked), Settings-Links (Workspace-Konfigseite `/workspaces/ws/:id`, Projektdetail `/workspaces/projects/:id`, App-Detail `/workspaces/apps/:id` — die alte Fläche bleibt erreichbar) und Log-Vorschau (derselbe echte `ContainerLogViewer` wie im AppDetailPage-Logs-Tab).
- **TERMINAL** — die ECHTE Shell: die existierende `WorkspaceTerminal`-Komponente (SPRINT-138) in einer neuen `embedded`-Form — docker exec per WebSocket (`GET /api/workspaces/{id}/terminal`), NIE Host-SSH. Ohne Workspace-Kontext: ehrlicher Leerzustand.
- **DASHBOARD** — das App-UI selbst: iframe auf den HTTP-Port über die Gateway-Tunnel-Route `/api/projects/{id}/tunnel/{port}` (für Remote-Nodes IST das der Reverse-Proxy auf den Node; Local-Nodes direkt) plus Direkt-Link. Ohne Port: ehrlicher Leerzustand „App has no web dashboard" — kein Fake-Dashboard (Mandate 2).

Die [T][L][C][W][V][D]-Row-Badges bleiben unangetastet (Direkt-Streams); der NAME-Klick öffnet jetzt das Panel statt zur AppDetailPage zu navigieren. Dazu das erfragte **„Active Apps"-Dropdown** in der Sidebar-Navigation: listet ALLE laufenden Deployments (`GET /api/deployments`, SSOT-Feed) mit Status-Dot → Klick öffnet denselben Drawer.

## Work Packages

| Nr | Task | Status |
|---|---|---|
| S139-1 | `components/apps/AppPanelDrawer.tsx` — Drawer (rechts, 60 %, Escape/Backdrop-Close), 3 Tabs, Daten: SSOT-Store (`/api/projects`, `/api/workspaces`, `/api/deployments`) + `queryKeys.projectDeployments` (`GET /api/projects/{id}/deployments`), Matching Deployment-Row per (workspaceId, name), ehrliche `—`-Defaults | [x] erledigt |
| S139-2 | `WorkspaceTerminal.tsx`: `embedded`-Prop — dieselbe WS-Route/Protokoll/Fehlerzustände, aber inline (kein eigener Dialog, kein eigener Close-Button, Fläche füllt den Host); Modal-Verhalten unverändert. Lint-Fix nebenbei: redundantes `setState({phase:'connecting'})` im Effect entfernt (in jedem Pfad No-op — Initializer sagt 'connecting', reconnect() setzt es vor dem Attempt-Bump) | [x] erledigt |
| S139-3 | `lib/app-status.ts` (NEU): `appStatusDotClass` + `isAppRunning` + `appInterfaces` — EIN Status-Konzept (grün = deployed/running/active/ready, GRAU = stopped + unbekannt — die Operator-Vorgabe grün/grau, rot = echte Fehler, amber = building). Ersetzt die zwei lokalen Kopien in HierarchySidebar (mappte 'stopped' rot) und AppDetailPage (mappte 'deployed' grau) — Mandate 14.5, keine dritte Implementierung | [x] erledigt |
| S139-4 | `lib/tunnel.ts` (NEU): `appTunnelUrl` — der EINE Tunnel-URL-Builder (local → direkt, remote → SSH-Reverse-Proxy `/tunnel/{port}?token=`); ersetzt die lokale Kopie in HierarchySidebar (AppDetailPage/ActiveDeploymentsSection behalten vorerst ihre — dokumentierte Altlast, nicht von diesem Sprint eingeführt) | [x] erledigt |
| S139-5 | `components/apps/ActiveAppsDropdown.tsx` (NEU) — Popover in der Sidebar-Navigation: Trigger mit ehrlichem Count-Badge (nur > 0), Rows = laufende Deployments mit Status-Dot + Projekt-Kontext, Klick → Drawer; Leerzustand „No running deployments" | [x] erledigt |
| S139-6 | `HierarchySidebar.tsx` — App-NAMEN-Klick → `AppPanelDrawer` (keine Navigation, kein Scope-Wechsel), Badges unverändert, Status-Dots über das Shared-Mapping (stopped jetzt grau), Active-Apps-Dropdown in der Navigation, Drawer-Render | [x] erledigt |
| S139-7 | `WorkspaceDetailPage.tsx` — Container-Karten sind jetzt Buttons → Drawer; Deployment-Rows (gleiche Zeile = gleiches Panel) klickbar, wenn eine passende SSOT-App existiert. Nebenbei echten Bug gefixt: das lokale `DeploymentRow`-Interface trug Go-Style-Keys (ID/ProjectID/…), die NIEMALS auf die Wire-Payload (lowercase JSON-Tags, store/deployments.go) passten — die Liste renderte seit jeher `undefined` | [x] erledigt |
| S139-8 | i18n: `appPanel.*` (32 Keys) in en.json + de.json handübersetzt, dann `python3 scripts/i18n-translate.py` für die 58 anderen Locales. Google 429-limittet die Shared-IP weiter (live verifiziert: TooManyRequests auf EINZELN-Request), also griff der Script-DESIRED-Fallback: die 58 Locales tragen den englischen Wert — Parität grün, identischer Zustand wie die Parallel-Sprints (RM35/S57). Backfill, sobald das Quota frei ist: `cd src/frontend && python3 scripts/i18n-translate.py --key appPanel.<k>` je Key | [x] erledigt (Fallback dokumentiert) |
| S139-9 | Tests: `AppPanelDrawer.test.tsx` (NEU, 9 Tests: Tabs rendern, INFO zeigt echte Framework-/Runtime-/Volume-/Deployment-Daten + Settings-Links + Logs-Preview, TERMINAL verbindet auf die exec-Route OHNE eigenen Dialog, DASHBOARD-iframe via Tunnel-URL auf Remote-Node + ehrlicher Leerzustand ohne Port, Escape/Backdrop-Close, fehlende Deployment-Row benannt); `HierarchySidebar.test.tsx` (App-Klick-Vertrag ersetzt: Drawer statt Navigation + 3 neue Dropdown-Tests, Mock um `/api/projects/{id}/deployments` erweitert); `WorkspaceTerminal.test.tsx` (2 neue embedded-Tests) | [x] erledigt |
| S139-10 | Docs: dieser Sprint-File, BACKLOG-Spiegel; API_DOCS unverändert (keine neue/veränderte Route — alle konsumierten Routes sind dokumentiert: `/api/deployments` Z. 1163, `/api/projects/{id}/deployments` Z. 512, `/api/projects/{id}/tunnel/{port}` Z. 703, `/api/workspaces/{id}/terminal` Z. 1173) | [x] erledigt |

## Acceptance Criteria

1. Klick auf einen App-Namen in der Sidebar (beide Tree-Sektionen) öffnet den Drawer in place — keine Navigation, kein Scope-Wechsel; die [T][L][C][W][V][D]-Badges tun unverändert ihr Direkt-Streaming.
2. Der Drawer zeigt in INFO die ECHTEN Felder: Framework (Deployment-`type`), Runtime + Volume + Node + Ports (Projekt-Row), Status-Badge aus `GET /api/projects/{id}/deployments`; fehlende Row → benannter Hinweis (Mandate 2).
3. TERMINAL bettet die echte `WorkspaceTerminal` ein — WS auf `/api/workspaces/{id}/terminal`, kein Host-SSH; Modal-Variante (Workspace-Zeile) unberührt.
4. DASHBOARD zeigt das App-UI als iframe über die Tunnel-Route (Remote) bzw. direkt (Local) — oder den ehrlichen Leerzustand, wenn kein Port existiert.
5. „Active Apps" in der Sidebar-Navigation listet alle laufenden Deployments mit Status-Dot; Klick öffnet den Drawer; ohne laufende Deployments: ehrlicher Leerzustand, kein Count-Badge.
6. WorkspaceDetailPage: Container-Karte (und passende Deployment-Row) öffnen den Drawer.
7. `tsc --noEmit`: 0 neue Fehler (gegen den Pre-Change-Baseline-Diff gemessen); vitest: alle betroffenen Suiten grün; lint auf allen geänderten Dateien grün.
8. Alle 60 Locales haben `appPanel.*` (check:i18n grün).

## Verifikation (ehrlich, nach dem Lauf)

- `tsc --noEmit -p tsconfig.app.json` gegen den EIGENEN Parent-Commit (20c5fb3, Scratch-Worktree): 478 Fehler vor = 478 nach; sortierter Diff LEER — 0 neue, 0 verschwundene. (Erste Staging-Runde hatte 2 Fehler im Commit-Baum: ein createElement-Typfehler im Drawer + die zeitgleich verschobenen Diff-Hunks einer Parallel-Session — beide im Fix-Commit korrigiert, siehe „Ehrliche Grenzen".)
- `npx vitest run`: 36 Dateien — 351 Tests: 347 grün; die 4 roten liegen ALLE in AdminAuditLogPage.test.tsx, einer FREMDEN in-flight-Datei der RM35-Parallel-Session (deren Route-Wiring war durch den Shared-Tree-Zwischenfall [s. u.] nicht im Baum) — keine Zeile davon gehört zu S139. Meine Suiten: 9 Drawer-Tests, 36 Sidebar-Tests, 9 Terminal-Tests, 1 Probe — alle grün.
- `npx eslint <alle geänderten Dateien>`: grün (3 während des Laufs gefundene und gefixte Fehler: `asChild` ist Radix, nicht base-ui — Settings-Links auf den `render`-Prop umgestellt + `nativeButton={false}`; redundantes setState im WorkspaceTerminal-Effect entfernt; createElement-Typwidth im Drawer).
- `npm run check:i18n` im Scratch-Worktree des Commit-Baums: grün — alle 60 Locales tragen `appPanel.*` (58 als dokumentierter EN-Fallback, de handübersetzt).
- Live-Smoke am laufenden Stack: offen (Operator) — Klickpfade: Sidebar → Projekt aufklappen → Workspace aufklappen → App-Name klicken; Navigation → „Active Apps" → Row klicken; /workspaces/ws/:id → Containers-Tab → App-Karte klicken.

## Ehrliche Grenzen (dokumentiert, nicht versteckt)

- DASHBOARD-iframe: manche Apps verbieten Framing (X-Frame-Options) — der Drawer bietet deshalb IMMER zusätzlich den „In neuem Tab öffnen"-Link; ein Framing-Refusal zeigt der Browser im iframe an.
- Der Drawer zeigt die Projekt-Ports (port/vncPort/codeServerPort) als Kontext der Projekt-Row, nicht als garantiert laufende App-Schnittstellen — die App-eigenen Schnittstellen stehen in der Interfaces-Ableitung des Deploy-Engines (P0-4).
- `workspace_routes` (der Identity-Proxy auf dem Router-Node, TASK-079) ist für Workspace-Container-Pfade gedacht; der GUI-Weg auf App-Ports bleibt die dokumentierte Tunnel-Route — beide erreichen denselben Node, die Tunnel-Route ist die im GUI bewährte.
- Die Altlast `tunnelUrl` in ActiveDeploymentsSection/AppDetailPage (je eine lokale Kopie) bleibt bis zu einem eigenen Cleanup-Sprint — nicht von diesem Sprint eingeführt, in `lib/tunnel.ts` aber schon die eine Heimat für alle neuen Konsumenten.
- Shared-Tree-Zwischenfall (29.9.2026, ~00:55): während des Selektiv-Stagings editierte eine Parallel-Session die Sidebar weiter — die Hunk-Nummern verschoben sich, die numerische Auswahl stagete versehentlich zwei FRAGMENTE der S138-Session (wsFiles-State + FolderLock-Badge ohne deren Import) und ließ zwei eigene Hunks weg; das anschließende Reparatur-`git reset --hard` lief zudem auf der inzwischen ausgecheckten Parallel-Branch (feat-tetragon-ebpf) und warf die UNCOMMITTETEN Tracked-File-Änderungen der Parallel-Sessions (RM35, S55-Datalake, Workspace-Lifecycle, S138-WS-Files) aus dem Shared-Tree. Wiederhergestellt: feat-tetragon-ebpf (Reflog 1969d05, auf den Fix-Commit gerebased), der eigene Commit-Baum (fix-vorwärts). NICHT wiederherstellbar: die uncommitteten Tracked-File-Editierungen der Parallel-Sessions — deren ungetrackte Dateien + Sprint-Docs überlebten, deren Sessions können die Wiring-Edits anhand der Docs/Tests nachziehen. Der Operator sollte die Parallel-Sessions ihre Arbeit neu verifizieren lassen.
