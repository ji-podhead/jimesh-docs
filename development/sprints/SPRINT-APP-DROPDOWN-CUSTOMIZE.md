# SPRINT-APP-DROPDOWN-CUSTOMIZE — Apps-Dropdown self-konfiguriert (VS-Code-Show-all-Muster)

**Datum:** 2026-10-15
**Operator (wörtlich):** „ich will das der user bei den apps dropdown einstellen kann welche er da im dropdown anzeigt, quasi wie in vs code mit nem show all feld ganz unten und im apps details panel"

## Ziel

Apps-Dropdown (Sidebar-Cluster `Apps`) zeigt default NUR die Apps, die der User
`s_SCOPE والحérité`-scope konfiguiert hat. VS-Code-Pattern: unten ein permanentes **„Show all…"**;
Klick öffnet ein Management-Panel, wo der User HÄCKS je App setzt (und „Alle anzeigen"-Toggle).

## Verbindliche Regeln

| Regel | Umsetzung |
|---|---|
| **Empfehlung der Dropdown-Konfiguration** | pro-*Workspace* (Workspace-scoped Naive Sicht), gespeichert in Settings-KV `apps/dropdown/<wsId>` = `["app-id","app-b","…"]` |
| **Show-all unten** | permanenter Eintrag `Show all variants` am unteren Rand des Dropdown-Clusters — ON nutzt der User die komplette App-Liste (Nichtversteckte + versteckte) |
| **Apps-Detail-Panel** | im `AppDetailPage`-Panel: settings/dropdown-Picker (Häckchen je App), analog VS Code-Pattern |
| **Datenquelle** | bestehende `GET /api/apps`-Route bleibt管线; nur die **Dropdown enriched** Auslistung filtert by `apps/dropdown/<wsId>` (nicht perspektive for WsScope) |
| **Room for no default** | wenn KV leer = all Apps anzeigen (legacy Status quo) — kein invisibility default |

## Work Packages

| Nr | Task | Status |
|---|---|---|
| AD-1 | KV-Store-Kontrakt + `GET/PUT /api/workspaces/{id}/apps/dropdown-prefs` (admin/member-scope + user-spezifisch identity-seat via workspace-scope 교h workflow) | [x] |
| AD-2 | HierarchySidebar-Apps-Cluster-Filter nach Pref-Liste + „Show-all"-Element unten + Management Overlay (Häckchen-Picker je App) | [x] |
| AD-3 | AppDetailPage-Settings-Sektion mit gleichem Picker (steckt gleiche KV-Prefs) + in-panel-Speichern-Summary live-echo (workspace reuse) | [x] |
| AD-4 | i18n en/de hand keys (appPreference.*) + add-sprint-sweep an 58 locales; tests: (a) sidebar-filter hide/show, (b) management overlay roundtrip, (c) panel-prefs persistence, 3 Tests minimum | [x] |
