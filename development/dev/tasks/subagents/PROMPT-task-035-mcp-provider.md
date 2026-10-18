# TASK-035 — MCP-Provider (Sprint 36 WP4) — QUEUE

Nach TASK-032 (braucht SDK-Session-Mint). mark3labs/mcp-go (MIT, gepinnt —
R38 §5), Tools: register_db_endpoint, provision_workspace_db,
register_router_alias, list_sessions. Auth: Service-Keys.

---

## Status: ✅ gebaut (12.9.2026) — create_session-Integrationstest TODO

**Geliefert** (Commit in diesem Sprint):

- `src/backend/internal/mcpserver/` — `client.go` (GatewayClient:
  JIMESH_URL-Env, Default `http://127.0.0.1:19091` / in-Compose
  `http://jimesh:3010`; JIMESH_SERVICE_KEY → `Authorization: Bearer
  jimesh-ck-…`; fail-closed ohne Key; GatewayError gibt Status+Body
  ehrlich weiter), `server.go` (5 Tools, WithRecovery,
  WithInstructions), `tools_infra.go`, `tools_sessions.go`,
  `mcpserver_test.go` (httptest-Unit-Tests, keine DB nötig)
- `src/backend/cmd/jimesh-mcp/main.go` — stdio-Transport v1
  (server.ServeStdio), Diagnostics nur nach stderr (stdout = JSON-RPC)
- `src/backend/cmd/jimesh-mcp/README.md` — Tool-Schemata, Routen-Status,
  Claude-Code-/Gemini-CLI-Beispiele, Security-Hinweis
- Dependency `github.com/mark3labs/mcp-go v1.0.0` gepinnt
  (src/backend/go.mod/go.sum)

**Fundstellen je Tool** (Datei:Zeile):

- `register_db_endpoint` → POST `/api/db/endpoints` — tools_infra.go
  (HandleRegisterDBEndpoint); v1-Engines postgres|redis (Sprint 36 §2b)
- `provision_workspace_db` → POST `/api/db/provision` — tools_infra.go
  (HandleProvisionWorkspaceDB)
- `register_router_alias` → POST `/api/router/aliases` — tools_infra.go
  (HandleRegisterRouterAlias)
- `list_sessions` → GET `/api/sessions` (LIVE-Route, Client-seitiger
  project_id-Filter) — tools_sessions.go (HandleListSessions)
- `create_session` → POST `/api/sdk/sessions` — tools_sessions.go
  (HandleCreateSession)

**Route-Status (ehrlich):** `list_sessions` spricht die live existierende
Route (`internal/gateway/gateway.go` handleSessions). Die übrigen vier
Routen sind die dokumentierten Verträge (`cmd/jimesh-mcp/README.md`) — die
Gateway-Seite bauen die Parallel-Sessions (TASK-032 `/api/sdk/sessions`;
DB-Endpunkte/Router-Aliase Sprint 36). Bis dahin gibt jedes Tool den
Gateway-Fehler unverändert weiter (GatewayError, kein Fake-Success —
No-Mock-Mandat 2).

**TODO (Integrationstest):** sobald TASK-032 `/api/sdk/sessions` live ist:
Live-Test `create_session` gegen den laufenden Stack (Service-Key minten →
Tool-Call → Session-Zeile mit workspace_id prüfen) und Check-off hier.
Dasselbe Muster für die drei Infra-Routen, sobald deren Gateway-Seite steht.

**Verifikation:** `go build`/`go vet ./internal/mcpserver/...
./cmd/jimesh-mcp/...` + `go test ./internal/mcpserver/...` grün
(golang-Container, CGO_ENABLED=0); gofmt clean. `make go-build` (./...)
schlägt aktuell NUR in `internal/cdc/` fehl — ungetracktes WIP der
Parallel-Session (Sprint-26-WP3-CDC, undefined symbols in deren eigenen
Dateien), nicht durch diese Änderung verursacht; `go vet` über alle
anderen Packages grün.

**Git-Hinweis:** go.mod/go.sum sind Shared Files — im Diff liegen neben
mcp-go v1.0.0 auch `jackc/pgio`/`jackc/pglogrepl` (go-get der
CDC-Parallel-Session lief zwischen meinen Runs); mitgecommittet, weil
Partial-Staging einer Shared Datei zu riskant ist — im Bericht
dokumentiert.
