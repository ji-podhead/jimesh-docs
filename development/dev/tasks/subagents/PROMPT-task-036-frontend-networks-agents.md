# TASK-036 — Frontend: Networks-Tab + Agents-Filter (Sprint 36 WP5-UI)

**Status:** ✅ abgeschlossen (ee7055b — live 200/200/200) — Quelle: Sprint 36 WP5-UI + Operator
zeigt networks/apps/deployments/nodes", „Agents-Tab filtern nach
endpoints/apps/sessions/agents", Directives R33/R35)

## Backend-Routes die JETZT live sind (Task-032/033/034/035 — Fundstellen):

- `GET /api/sdk/logs?type=&level=&workspace=&session=&agent=&alias=&limit=` (internal/sdklogs — TASK-032)
- `GET /api/analytics/by-workspace` (per-App-Kosten)
- `GET /api/router/config` (Edge-Node-Config-Pull — internal/gateway/router_config.go, TASK-033-WIP)
- `GET /api/sdk/sessions` (Session-Mint)

## Aufgabe

1. **NetworksPage.tsx erweitern** (Skeleton existiert — Headscale-API ist
   verdrahtet): Grid mit Nodes (Mesh-IPs), Workspaces/Deployments (aus
   bestehender projects/containers-API), Apps (App-Discovery-Daten),
   Networks (Docker/Mesh-Netzwerke je Node) — Endpoint `/api/sdk/logs`-Filter
   im Network-Kontext.
2. **Agents-Tab (LogsPage.tsx oder neuer SDK-Logs-View)**: Filter-Dropdowns
   (type/level/workspace/session/agent) auf `/api/sdk/logs` + Live-Stream
   SSE-Muster wie bestehende agents/logs.
3. **Router-Config-Panel** (optional): zeigt `/api/router/config`-Antwort
   im Networks-Tab (Alias→DB-Map).
4. i18n de/en + Theme beibehalten; lucide-Icons; bestehende UI-Komponenten.

## Regeln

- Nur Frontend-Files (src/frontend/**) + API_DOCS-Konsistenz-Check (nur
  falls Backend-Routen fehlen — Backend-Doku ist im Backend-Commit).
- Build: `npm run build` (falls Frontend-Container in-flight: dann
  `npm run lint` + `npx tsc --noEmit` scoped im Container).
- GIT: nur eigene Files, kein -A, nicht pushen. Kein API_DOCS-Touch
  (Backend-Doku kommt aus 032/033/034-Commits).
