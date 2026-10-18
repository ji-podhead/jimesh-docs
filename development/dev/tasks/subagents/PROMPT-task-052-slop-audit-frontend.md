# TASK-052 — Slop-Audit + Frontend-Lücken-Dokument (EXTRA-Agent, dokumentierend)

**Status:** ✅ done (14.9.2026) — Ergebnis:
`docs/research/R39-frontend-slop-audit.md` (6 Slop-Funde, 11 Lücken, 9
i18n/Theme-Funde, 4 Dead-Code-Komponenten; alle 29 Views mit Status
OK/Lücke/Slop + Datei:Zeile + Top-10-Fix-Liste; Route-Checks authentifiziert
live verifiziert, kein Build). **P0-Warnung für 051-Review:** Klartext-SSH-
Credentials im uncommitteten ProjectsPage-Arbeitsbaum (wt:388-390) — vor
Merge entfernen. | **Quelle:** Operator 13.9. („slop audit und
frontend lücken finden dazu ein extra agent")

## Auftrag (DOKUMENTIER-AGENT — schreibt NACH docs/, NIEMALS src/frontend)

1. **Slop-Audit** über ALLE Frontend-Views (src/frontend/src/views/*.tsx,
   ~29 Dateien): Mandat-2-Verstöße (Fake-Success, gefälschte Kontrollen,
   Mock-Daten, tote Buttons die behaupten zu funktionieren), unverbundene
   UI (Buttons ohne Backend-Route), Konsistenz (i18n-Lücken, Theme-Breaks).
2. **Frontend-Lücken-Register:** geplant-vs-gebaut je View (Handoff-Map
   040–042, Sprint-36-WP1-Frontend-Zeile, R33-Blueprint-Presets, E-Projects-
   Network-Editing-Tab) + Dead-Code-Funde (tote Routen, unbenutzte
   Komponenten — RealtimeMonitor/RoutingAnalytics existieren und sind
   verdrahtet: OK).
3. **Ergebnis:** docs/research/R39-frontend-slop-audit.md — Struktur:
   pro View Status (OK/Lücke/Slop) + Fundstelle Datei:Zeile + Fix-Vorschlag
   + Priorität. Am Ende: Top-10-Fix-Liste für die nächste Frontend-Welle.

## Regeln

- Schreib-Lane: NUR docs/research/R39-frontend-slop-audit.md + Task-File-Status
  (kein src/frontend-Konflikt mit TASK-051, der parallel code baut)
- Jede Behauptung mit Datei:Zeile (Mandat: negative Funde zählen, nichts fabrizieren)
- Kein Build nötig — Code-Lektüre + Live-Curl (localhost:19090) wenn hilfreich
- GIT: nur deine 2 Docs-Files, kein -A, nicht pushen
