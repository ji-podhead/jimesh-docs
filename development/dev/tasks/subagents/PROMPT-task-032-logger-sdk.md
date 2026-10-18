# TASK-032 — jimesh-logger SDK (Sprint 36 WP1)

**Status:** ✅ Code fertig + committet (Planungs-Session hat übernommen, Agent starb im Tool-Loop). Build+vet+gofmt grün verifiziert. API_DOCS + Checkoffs im selben Commit. OFFEN: Live-Verify (make restart-backend + curl) — Backend-Boot blockiert am Container-Netz-Ausfall (apt/docker-cli), Negative-Checks + Session-Mint-Live-Test nachholen wenn Stack kooperiert. Frontend-Filter-Dropdowns → TASK-036.
**Quelle:** `docs/sprints/SPRINT-36-LOGGER-SDK-ROUTER-CDC.md` WP1 + Operator-Direktive
„Endpoint + Filter ab Tag 1, kein Observability-first".

## Bereits gebaut (Fundstellen — NICHT neu erfinden)

- `consumer_keys` mit `kind` (`user`|`service`), `workspace_id`, `session_id` —
  `CreateServiceKey` in `internal/store/consumer_keys.go`
- X-Header `X-JiMesh-Key-Kind/Workspace-Id/Session-Id/Project-Id`: server-set
  in `internal/auth/auth.go` (Middleware-Eingang stripped Client-Copies)
- `RequestSummary.WorkspaceID` + `/api/analytics/by-workspace` — Attribution lebt
- OTel-Entscheidung: gen_ai.*-Feldnamen OHNE opentelemetry-go-Dependency in v1
  (R37 §2: internes Struct + Mapping-Layer, Version pinnen)

## Aufgabe

1. **`internal/sdk/logger/`** (neues Go-Package): `Logger`-Client → HTTP POST
   an `/api/sdk/logs`. Auth: `JIMESH_SERVICE_KEY`-Env (Bearer, jimesh-ck-…).
   Felder: `alias`, `level` (`audit|agent|app`), `message`, `payload`,
   `session_id`; Workspace/Project kommen SERVER-seitig aus dem Service-Key.
2. **Gateway-Ingest** `POST /api/sdk/logs` (`internal/analytics/` oder neues
   `internal/sdklogs/`): Consumer-Key-Auth via bestehende Middleware (der Pfad
   liegt unter `/api/` → Dashboard-Session ODER Service-Key — Service-Keys
   brauchen einen eigenen Gate-Zweig analog /v1), Persistenz in neue Tabelle
   `sdk_logs` (idempotentes CREATE TABLE im store.go-Muster) + Fire-and-forget
   in Redis Stream `jimesh:events` (bestehende Infra).
3. **Query-Endpoints** `GET /api/sdk/logs` mit Filtern:
   `?type=&level=&workspace=&session=&agent=&range=&limit=` — direkt querybar.
4. **Session-Helper**: `logger.NewSession(projectID)` → POST `/api/sdk/sessions`,
   Store-Insert via bestehendem `store.CreateSession` (rbac.go:117), gebunden
   an die Workspace des Service-Keys.
5. **LiteLLM/Client-Kompat**: Dokumentiert, wie die X-Header von jedem
   OpenAI-kompatiblen Client via `extra_headers` durchgereicht werden
   (verifiziert: litellm unterstützt es offiziell).
6. **Python-Wrapper-Stub**: `sdk/python/jimesh_logger.py` (requests, ~50 Zeilen,
   dieselbe HTTP-API — kein zweites Backend).

## Regeln (MANDATES.md / CLAUDE.md)

- **CGO_ENABLED=0, pure Go** — keine neue Dependency außer stdlib für v1
  (opentelemetry-go bewusst NICHT in v1 — R37-Entscheidung)
- **No-Mock (Mandat 2):** echte Persistenz, echte Fehler
- **Doku im selben Change:** `API_DOCS.md` (jede neue Route), Sprint-36-WP1
  Check-offs, Task-File-Status aktualisieren
- **Build:** `make go-build && make go-vet` (Host hat kein Go — Makefile läuft
  im golang:latest-Container), `gofmt` clean
- **Git:** NUR eigene Files adden (`git add <pfad>…`), **NIEMALS `git add -A`**
  (71 offene Änderungen von Parallel-Sessions im Tree!). NICHT pushen.
- Live-Verify via `make restart-backend` + curl, WENN der Stack kooperiert
  (Host-Docker-Netz hatte Ausfall — sonst ehrlich im Task-File dokumentieren)

## Akzeptanz

- [ ] `logger.Log()` aus einem Deployment → Eintrag mit workspace_id
- [ ] `/api/sdk/logs?workspace=…` filtert
- [ ] `/api/sdk/sessions` mintet Session an Service-Key gebunden
- [ ] API_DOCS + Sprint-36 aktualisiert
- [ ] build+vet+gofmt grün
