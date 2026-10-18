# SPRINT 2: APP/DEPLOYMENT/INTERFACE-WAHRHEIT

| | |
|---|---|
| **Status** | Geplant |
| **Ziel** | Deploy-Pipeline schreibt echte Deployment-Rows + Interfaces, Team-Bindings, IaC-Discovery |
| **Dauer** | 1 Woche |

## Arbeitspakete

### WP1: Deploy-Persistenz (Backend, grösste Lücke) — FERTIG (P0-4)
- [x] `deployments`-Tabelle: `interfaces`-Spalte + `workspace_id` + `type`(=framework) — idempotente `columnExists`-Migration fuer Bestands-DBs + DDL fuer neue (35591ae legte `interfaces` nur in die DDL; 17db45f ergaenzte `workspace_id` + beide ALTERs)
- [x] `executeDeploy` schreibt Deployment-Row nach erfolgreichem Deploy — UPSERT pro `(projectId, workspaceId)` statt INSERT-Duplikat pro Redeploy (App-Identity: created_at bleibt Erstdeploy-Timestamp); Undeploy + erfolgreicher Redeploy-Pre-Sweep flippen den Scope auf `stopped` (17db45f, 52fdc42)
- [x] `interfaces` aus `allocatedPort/allocatedVncPort/allocatedVSCodePort` ableiten — `DeriveInterfaces` ist die EINZIGE Ableitungsstelle (vorher toter Helper neben duplizierter Store-Logik; Table-Test `deployment_interfaces_test.go`)
- [x] `GET /api/deployments` liefert echte Interfaces — `Interfaces`-Typ mit sql.Scanner/driver.Valuer (json.RawMessage wird unter go1.27/jsonv2 vom TEXT-Scan zurueckgewiesen — 52fdc42); alle SELECTs + Deploy-/Undeploy-Responses fuehren `interfaces`/`workspaceId`/`deploymentId`/`deploymentsStopped`

**Retrospektive WP1 (20.9.):** Teil 1 (interfaces-Spalte + INSERT im Deploy-Pfad) kam am 19.9. mit 35591ae, HINTERLIESS aber: Rows nur bei Erst-Deploy (Redeploys duplizierten), interfaces nur per Update auf die jeweils neueste Row des Projekts, kein Lesen der Spalte in irgendeinem GET, kein Undeploy-/Redeploy-Statuswechsel, tote `DeriveInterfaces`-Helper. P0-4 (REQUESTS-TRACKING E7) schloss die Restluecke: UpsertDeployment + MarkDeploymentsStopped in `store/deployments.go`, Engine-Verdrahtung in `projects_ssh.go` (executeDeploy/handleProjectUndeploy/handleProjectRedeploy), Regression `store/deployments_test.go` (4 Tests, Wegwerf-DB-Muster) + `deployment_interfaces_test.go`. Verifikation: `go build ./...` + `go vet ./...` gruen, volle Backend-Suite `go test ./...` exit=0 gegen frische `jimesh_test`-DB. Commits: 17db45f, 52fdc42 + Test-Commit.

### WP2: Apps & Deployments UI (aus Stitch-Designs implementieren)
- [ ] App-Overview-Page mit Interface-Badges (Terminal, VS Code, VNC, Web)
- [ ] Integration-Install: `POST /api/apps/{id}/integrations`
- [ ] Browser-Integration: KasmWeb Chrome + VNC Desktop Deploy-Option
- [ ] Playwright-Integration: als Zusatz-Option

### WP3: Team→Server-Bindings
- [ ] `team_resource_bindings`-Tabelle (team_id, resource_type, resource_id, vererbbar)
- [ ] `GET/POST/DELETE /api/team-bindings`
- [ ] OPA-Modul `team-bindings.rego`
- [ ] UI: Teams-Page bekommt Resource-Bindings Tab

### WP4: IaC-Discovery
- [ ] `iac_files`-Tabelle
- [ ] `GET /api/projects/{id}/iac-files` (Datei-Index)
- [ ] `POST /api/projects/{id}/iac-files/scan` (SSH-Scan)
- [ ] `GET /api/projects/{id}/iac-files/{fileId}` (Content-Read)
- [ ] UI: Project-Overview "Deployment Code" Tab

## Referenzen
- Plugins-Concept: `docs/FE-PLUGINS-CONCEPT.md` §7 (API) + §8 (Migration)
- IaC-Discovery: `docs/FE-IAC-DISCOVERY-SPEC.md` §4 (API-Design)
- Master-Plan: `docs/MASTER-PLAN.md` §2 P1
- IA-Spec Team-Bindings: `docs/FE-IA-SPEC.md` §Team-Bindings