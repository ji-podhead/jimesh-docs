# TASK-084 — SSOT & Redundanz-Säuberung (Frontend-Backend Alignment)

Rolle: Du arbeitest im JiMesh-Repo unter den Operator-Mandaten:
- M1 Domänenmodell respektieren (Project → SSH Node → Workspace → Apps).
- M2 No Mock — niemals Erfolg vortäuschen; Fakes werden entfernt oder echt angebunden.
- M3 Ehrlichkeit — UI zeigt nur servergestreamte und serverseitig persistierte Zustände.
- M4 Doku — API_DOCS, Sprint-File, Task-File im selben Commit aktualisieren.
- M6 Live-Verify — Done heißt verifiziert: echte Requests gegen den laufenden Stack.

## KONTEXT
Obwohl grundlegende Mocks entfernt wurden, existieren noch vereinzelte `localStorage`-Muster und unverbundene Backend-Routen:
- `localStorage`-Persistenzreste in `AnalyticsPage`, `OnboardingPage`, `ProjectsPage`, `SecurityGuardDemoPage`.
- Dead-End Backend-Routen: `/api/subagents` (Subagent Progress SSE Panel & TASK-076 security-critical Injektionen) besitzen noch keine sichtbaren Frontend-Verbraucher.
- SSOT-Prinzip: Jede Route darf genau einen kanonischen Frontend-Consumer besitzen.

## AUFGABE
1. **`localStorage`-Muster säubern (WP1)**:
   - Prüfe alle Vorkommen von `localStorage` in `src/frontend/src/views/`.
   - Echtes UI-Preference Caching (Sortierreihenfolge, Tab-Auswahl) bleibt erlaubt.
   - Alle Fälle von Persistenz-Täuschung (Daten speichern ohne Backend-Call) auf echte Backend-Endpunkte umstellen oder entfernen.
2. **Dead Ends anbinden (WP2)**:
   - Integriere das Subagent Progress SSE Panel (`/api/subagents/{id}/events`) und die `security-critical` Injektionen in die Subagent-/Workspace-Views.
3. **SSOT & Redundanz-Säuberung (WP3 & WP4)**:
   - Stelle sicher, dass jede Route genau einen kanonischen Consumer hat.
   - Dokumentiere die Router-Config-Kette (`Store` → `Gateway` → `Router`) in `ARCHITECTURE.md`.

## ACCEPTANCE
- Keinerlei `localStorage`-Nutzung für Domain-Entitäten (Projects, Nodes, Keys, Settings).
- `/api/subagents/{id}/events` SSE-Stream ist in der UI live eingebunden.
- `npm run check:i18n` ✓ · `go build ./...` ✓.

## LIVE-VERIFY
- `grep -rn "localStorage" src/frontend/src/views/` zeigt ausschließlich reine UI-Präferenzen (Tabs, Sorting).
- Subagent SSE Progress Stream zeigt echte Server-Events im UI-Panel.
