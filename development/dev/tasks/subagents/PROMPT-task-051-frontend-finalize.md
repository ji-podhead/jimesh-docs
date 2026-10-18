# TASK-051 — Frontend-Finalisierung: SDK-Logs-UI + Presets (040/042-Welle)

**Status:** ✅ done (14.9.2026 — Implementierungsrunde; Verifikation s. Ergebnis) | **Quelle:** Handoff-Map 040–042 (Frontend-Welle,
nie gebaut) + Operator 13.9. („Networks aber auch Code")

## Fundstellen (was fehlt)

1. **Audit-Logs-UI FEHLT KOMPLETT:** Backend `/api/sdk/logs`
   (type=audit|agent|app, Filter ?level=&workspace=&session=&agent=&limit=)
   existiert seit TASK-032 (d36c62e) — Frontend konsumiert es NICHT
   (DiscoveryPage/LogsPage: 0 audit-Referenzen). DAS ist der
   Sprint-36-Kern: „Logs für alles, gefiltert nach Agent/App/Session".
2. **Presets nur Runtime:** dsh|python|go|node|docker|base existieren
   (ProjectsPage:41) — die **Network-Presets fehlen**
   (gVisor-NAT/Airgap/Host-Passthrough nach R33-Blueprint).
3. **SecurityReportPage** ist als /security/events/:id eingebunden — OK.

## Aufgabe

1. **SDK-Logs-Ansicht** (neue View oder LogsPage-Erweiterung):
   GET /api/sdk/logs mit Filter-Dropdowns (type, level, workspace,
   session, agent) + Live-Refresh (Polling reicht v1, SSE später);
   type=audit|agent|app-Tabs. Budget-Kontext: /api/analytics/by-workspace
   daneben (Per-App-Kosten).
2. **Network-Presets im Project-Create** (ProjectsPage Runtime-Picker
   erweitern): gVisor-NAT (default) | Airgap | Host-Passthrough (rotes
   Warning-Badge) nach R33-Blueprint; Wire zum Deploy-Request (runtime-
   analog).
3. i18n de/en, lucide-Icons, bestehende shadcn-Komponenten.

## Regeln

- NUR src/frontend/** (037-Merge-Runde ist vorbei; kein Konflikt)
- No-Mock: echte /api/sdk/logs-Calls; Backend-Fehler ehrlich anzeigen
- Build-Verifizierung: Frontend-Container läuft (localhost:19090, dev-
  mode) — live 200-Checks auf deine Routen; KEIN `next build` (korrumpiert
  den Dev-Server, .next geteilt — 13.9.-Lesson!)
- GIT: nur eigene Files, kein -A, nicht pushen
- Doku: Sprint-36-WP1-Frontend-Zeile checkoff + Task-File-Status

## Ergebnis (14.9.2026)

Gebaut (alles `src/frontend/**`, echte Calls, ehrliche Empty/Error-States):

1. **SDKLogsPage** (`src/views/SDKLogsPage.tsx`, neu): type-Tabs audit|agent|app,
   Filter level/workspace/session/agent (Datalists aus echten Row-IDs) +
   range (15m|1h|24h|7d|30d|all) + limit (50–1000), Polling 5 s mit
   Pause/Resume/Live-Badge, `GET /api/sdk/logs` via apiFetch;
   Per-App-Kosten-Panel aus `GET /api/analytics/by-workspace` (30 s, 24h|7d|30d,
   Workspace-Filter gespiegelt). Backend-Note: `successRate` ist Prozent (0–100),
   `errorRate = 1 − Prozent` ist ein Backend-Formelfehler — UI zeigt Fehleranteil
   ehrlich als `100 − successRate` (analytics_derived.go:70-75, 240).
2. **Network-Presets** (`src/views/ProjectsPage.tsx`): 3 Preset-Karten in
   Create- UND Edit-Dialog vor den rohen Feldern (die sichtbar + synchron
   bleiben) — gVisor-NAT (default + „Recommended") | Airgap | Host-Passthrough
   mit rotem destructive Badge „Bypasses kernel isolation" + Warn-Box bei
   Auswahl; exakte Feld-Ableitung, sonst ehrlich „custom". Create-Form startet
   jetzt auf gVisor-NAT (isolated/enableNat/useGVisor=true, R33-Default;
   Backend fällt ohne runsc ehrlich auf runc zurück).
3. **Route/Nav**: `/sdk-logs` + `/networks` in App.tsx (PROXY_BASES, proxyItems,
   Route :527) und Command-Palette (`components/command-palette.tsx:122-123`).
4. **i18n en+de**: `nav.sdkLogs/nav.networks`, `sdkLogs.*` (ca. 50 Keys),
   `networkPresets.*`, `exposure.hierarchy.*` (Selector war hartcodiert EN),
   `securityReport.requestLogCard.none` (R39-#8-Key-Bug), ehrliche
   `network.loadError`. Andere 58 Locales bewusst nicht (Präzedenz
   NetworksPage; Checker bleibt bei denselben 58 Fehlern — nicht verschlimmert).
5. **R39-Top-10 frontend-seitig**: #3/#4 SDK-Logs-UI + Filter gebaut (die
   Sprint-36:46-Zeile hat der Doku-Agent bereits ehrlich auf [ ] gesetzt —
   Doku-Checkoff gehört ihm); #2 NetworksPage: falscher Backend-Kommentar
   korrigiert, apiFetch statt raw fetch (echte Server-Fehlermeldung im Banner),
   Nav+Palette-Wiring; #8 requestLogCard.none en+de; #10 rotes Badge im Picker,
   FallbackPage dark:-Varianten (alle 14 rose/emerald-Stellen), NetworksPage
   Offline-Punkt dark:, SecurityExposure-Selector i18n'd. NICHT gemacht (out of
   bounded scope): FallbackPage/ProjectsPage/OnboardingPage Voll-Übersetzung,
   Headscale-Backend-Routen (Backend-Lane 037/050).

**Verifikation** (alles live, kein `next build`/`npm run build`): Frontend
:19090 `/` und `/sdk-logs` → 200; App-Chunk `_app-pages-browser_src_App_tsx.js`
(24 MB, alle Views) kompiliert 200 und enthält SDKLogsPage/Presets/api-Calls;
de-Locale-Chunk 200 mit neuen Keys; authentifiziert (Admin-Login):
`/api/sdk/logs?type=…&level=…&range=…&limit=…` → 200 `{"count":0,"logs":[]}`
(ehrlich leer), alle UI-Filter-Kombos 200, invalid range → lautes 400;
`/api/analytics/by-workspace?range=24h` → 200 `{"byWorkspace":[],"count":0}`.
`tsc --noEmit -p tsconfig.app.json`: 227 Fehler, ALLE pre-existing (Noise +
Parallel-Arbeit), 0 in den eigenen Dateien; eslint auf den geänderten Dateien:
keine neuen Findings; `check:i18n`: unverändert 58 Errors (vorher wie nachher).
Nicht headless verifizierbar: Browser-Rendering selbst (Operator-Blick:
`http://localhost:19090/sdk-logs`).

**Commit-Zuordnung (Staging-Kollision im Shared Tree):** Die komplette
TASK-051-Arbeit (SDKLogsPage + Route + Presets + i18n + R39-Fixes, alle 10
Dateien, inhaltlich verifiziert: `git diff ab99f24 -- <Dateien>` = 0) wurde
NICHT wie geplant als eigener `feat(frontend)`-Commit gesetzt: ein
Parallel-Agent (Doku-Lane, CHAT_LOG_20260913-Export) hat zwischen `git add`
und `git commit` der 051-Session ein eigenes `git commit` ausgeführt und das
fremde Staging mitgenommen — alle TASK-051-Dateien landeten in **ab99f24**
(`docs(prompts): CHAT_LOG_20260913 …`). Dieser Commit wurde von jener Lane
(direkt oder indirekt) auch bereits **gepusht** (origin/main = ab99f24), weshalb
die History NICHT mehr umgeschrieben wird (kein amend/rebase auf
gepushten Commits). Inhaltlich ist alles vollständig und verifiziert
vorhanden; nur die Commit-Message beschreibt die TASK-051-Anteile nicht —
diese Zuordnung trägt dieser Abschnitt nach (Mandat 1/5: retro honesty).
Lesson für künftige Parallel-Wellen: vor jedem `git commit` im Shared Tree
`git status --porcelain` auf fremde Staging prüfen ODER direkt mit Pathspec
committen (`git commit -m … -- <eigene Dateien>`).
