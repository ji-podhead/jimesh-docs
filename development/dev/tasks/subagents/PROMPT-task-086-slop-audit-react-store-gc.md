# TASK-086 — Frontend Slop-Audit & React Query Store / Subscription GC

Rolle: Du arbeitest im JiMesh-Repo unter den Operator-Mandaten M1–M7.

## KONTEXT
- Slop-Audit R39: Laufendes Audit zur Vermeidung von Schein-Erfolgen, falschen Mocks und unverbundenen Controls in allen React-Views.
- Store & Garbage Collection: React Query Subscriptions und Query Keys sollen zentralisiert werden, um verwaiste SSE-Streams/Polling-Loop-Hintergrundprozesse automatisch aufzuräumen (GC), wenn Komponenten unmounten.

## AUFGABE
1. **Slop-Scan & Pattern-Filter (WP1)**:
   - Scanne alle 29 Views in `src/frontend/src/views/` auf verbleibende Slop-Muster (Fake Toasts, ungeprüfte Ladezustände, stumme Error-Swallows).
2. **React Query Key Registry & Store GC (WP2 & WP3)**:
   - Erstelle eine zentrale Query Key Registry (`src/frontend/src/lib/query-keys.ts`).
   - Konfiguriere Stale-Time und Unsubscribe-GC für SSE-Streams und Polling-Intervalle, damit unmountete Views keine Hintergrund-Requests triggern.
3. **Automated Redundanz- & Slop-Gate (WP4)**:
   - Erstelle ein CI-Skript (`scripts/check-frontend-slop.mjs`), das tote API-Pfade und unbehandelte Promises im Frontend automatisiert erkennt.

## ACCEPTANCE
- Globale Query Key Registry `src/frontend/src/lib/query-keys.ts` erstellt.
- Alle SSE-Streams und Polling-Hooks nutzen saubere `enabled`-Guards und unmount-GC.
- `node scripts/check-frontend-slop.mjs` läuft grün durch.
- `npm run check:i18n` ✓ · `go build ./...` ✓.

## LIVE-VERIFY
- Beim Wechseln zwischen Tabs (z. B. Workspaces → Analytics → Security) werden alte Polling-Loops und SSE-Connections sofort geschlossen.
