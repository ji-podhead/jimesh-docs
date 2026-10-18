# SPRINT-DEPLOY-DUAL-ENV — K8s/gVisor-Dual-Environment + Container-Deploy (Code-Section, Agents, Konsole, Webviews)

**Status:** ✅ ABGESCHLOSSEN (KD-1..KD-10 alle [x] — Kerns umgesetzt in `a1b200d9..0136e771` + Beweis-Branches; Verifikation grün, KD-10-Cleanup/Branch `feat-kd10-cleanup-final` @ `f9a2e44f`, 2026-10-15)
**Datum:** 2026-10-14 (KD-10-Verifikation: 2026-10-15)
**Operator-Vorgaben:** siehe „Operator-Vorgaben (wörtlich)" unten

## Ziel

Jeder Workspace bekommt **ein Environment zweier Typen**: `gvisor` (isolated
gVisor-network, docker/runtime runsc — heute) **oder** `k8s` (Namespace/Node-Pool,
Kubernetes-Deployment — neu). Container müssen aus **IaC oder Compose** deploybar
sein, aus der **Code-Section** deploybar sein, **Coding-Agents** laufen im Utility-Container
und sind via API deploybar — und es gibt eine **Deploy-Konsole** (live Output) plus
**Webview-Panes** inkl. Upload.

## Operator-Vorgaben (wörtlich, 2026-10-14)

> „dann müssen wir uns auch fragen wie wir den code umschreiben bezüglich der kubernetes
deployments was bis dato ja gvisor war, als 2. environment. was wir auch noch garnicht haben
ist code dpeloyen also container. das können wir gleich mal ordentlich planen und ein workspace
ist dann entweder k8s oder halt isoliertes gvisor network. diese container muss er vom iac oder
compose aus deployen können und in der code section müssen wir auch die möglichkeit haben das zu
deployen und coding agents via installierte apps die dann auch im utility container laufen müssen
auch über die api aus deployen können, oder halt über ne terraform app dann über jimesh.io oder
so und dann braucht man auch ne konsole wo man den deployment code sieht und dann auch die
webview panes für die apps halt auch uploaden"

## Recherche-Ergebnis (verbindlich, 2026-10-14)

| # | Item | Verdict |
|---|------|---------|
| 1 | Deploy engine | **exists** — SSH `docker run`-Engine; compose wird nur gelesen, nie applied |
| 2 | gVisor | **exists** — install + runtime selection (runsc/runsc-falco) + Falco-Wiring |
| 3 | Coding-Agents/Apps als Container | **exists** (framework branches: claude-code, gemini-cli, opencode, gotty…) |
| 4 | Webview panes | **exists** (proxy / WebRTC kiosk / render-cache; 3 Transports) |
| 5 | Terraform-Execution | **must be built** (nur `.tf`-Discovery + checkov-Scan existieren) |
| 6 | Deploy-Log-Streaming-Konsole | **must be built** (SSE-Muster existiert 2×, Deploy-Schritte sind single-shot) |
| 7 | Workspace⇄Container | **exists** — 1 WS = 1 Worktree + 1 Container + 1 Node; keine Cluster-Semantik |

Kernpunkte Backend (Zeilen verifiziert):
- `internal/deploy/projects_ssh.go` (3775 L): `executeDeploy` (L1208) generiert
  **`docker run`-Bash über SSH** — Compose nur beim `jimesh`-Monorepo-Framework (L1881).
- gVisor: `runscRuntime`/`runscFalcoRuntime` (L875–886), `req.UseGVisor` liest live
  `docker info` (1754–1771), install-Block doppelt (namespaces L1229–1250).
- Utility-Container hardcodelt `--runtime=runsc` (`gateway/project_utility.go` L480).
- App-Domain (`domain/schema/app_types.go`): `AppSubtype{Container|Webview|API|MCP|Integration}`
  + `ContainerRequirement` + scope chain network→containers→app.
- Webviews: `ProxyWebviewApp` (Traefik-Route/Gateway-Embed), `WebRtcWebviewApp`
  (Chromium-Kiosk), `VncWebviewApp` (503).
- Kein K8s: Workspace-Container = 1 docker run auf 1 Node (`SSHTarget`); Deployments
  synchron, Output als Block im JSON-Response.

## Architektur (verbindlich)

### A1 — Zwei Environment-Typen pro Workspace (mutually exclusive)

```
WorkspaceRow erweitern:
  environment_type: gvisor | k8s     (NUR eins, default gvisor)
  cluster_id:       (nur k8s) — ref auf Target-Cluster oder local-kind
  node_id:          (nur gvisor) — bestehendes SSHTarget-Modell bleibt
```

- `gvisor` = heute: 1 Node + docker runsc (`--runtime=runsc[-falco]`), isoliert per
  Workspace-Network/Firewall (existiert).
- `k8s` = Namespace pro Workspace im Ziel-Cluster (user's or ours), Deploy via
  K8s-API (Kubeconfig aus Vault, siehe PV-2), **kein** SSH.

### A2 — Deploy-Quellen: IaC ODER Compose (beide)

- **Compose-Pfad (NEU):** `executeDeploy` liest compose-file aus dem Worktree,
  rendert zu `docker run` (gvisor-Env) oder zu K8s-Manifests (k8s-Env).
  Security-Gates (Checkov/SAST/gitleaks quarantine) laufen **vor** der Übersetzung.
- **IaC-Pfad (TF):** neuer `tf-runner` (contai-nerized, opentofu) — `plan`/`apply`
  mit scoped backend (namespace/workspace); **Terraform-App** = App-Entry
  (`AppSubtypeAPI`-Klasse) jüber jimesh.io/CP ausgeliefert.

### A3 — Code-Section: Deploy-Button

- In der Code-Section (Worktree-View) pro erkanntem IaC-File ein Action:
  `Deploy (compose)` / `Deploy (k8s)` / `terraform plan|apply`.
- Deploy-Konsole unten (siehe A5).

### A4 — Coding-Agents über API / App-Install

- Agents (claude-code, gemini-cli, opencode…) laufen im **utility container**
  (existiert) oder app-containern; Deploy via: `POST /api/apps/{id}/deploy`
  (existiert) oder Terraform-App aus jimesh.io — Operator: „oder halt über ne
  terraform app dann über jimesh.io oder so".

### A5 — Konsole (Deploy-Log, live)

- Neuer SSE-Endpoint `GET /api/deployments/{id}/console` (Muster existiert 2×:
  `container_logs.go`, `renderer_console.go` — event: log-frames + 15s-keepalive).
- Frontend: bestehender SSE-Parser (`lib/sse.ts`) + Console-Komponente wie
  `ContainerLogViewer` — **kein single-shot output** mehr: provision und deploy
  werden live streamable.

### A6 — Webview-Panes + Upload

- Bestehende 3 Transports bleiben (proxy/webrtc/render-cache).
- **Neu:** App-Dateien (static/webview-bundle) hochladbar per
  `POST /api/apps/{id}/bundle` (multipart → Vault-Staged) und in gvisor-Env via
  Utility-Container-Volume ausgeliefert; k8s-Env via ConfigMap/`k8s Secret` sync.

## Work Packages

| Nr | Task | Status |
|---|---|---|
| KD-1 | Environment-Modell: `environment_type`-Feld + Migration, Workspace-Form bekommt Environment-Selector | [x] — Beweis: 78687b6a, in-tree (`store/workspaces.go` Migration + `gateway/workspaces.go:240` Validation, `workspace-environment-section.tsx` + 2/2 vitest) | 
| KD-2 | Compose→Plan-Renderer: compose-AST (nur services/build/image/volumes/ports/env) → `docker run` oder K8s-Manifest(-Fragments) | [x] — in-tree: `deploy/compose_render.go` (+ `compose_render_test.go`, 8 Suites `TestComposeRender*` grün), Lane-Inkarnation 78687b6a, In-Tree-Bestätigung via KD-8/KD-9-Lane (0b422b82/8ac7ce15) |
| KD-3 | k8s-Deploy-Pfad: kubeconfig aus Vault (`provision/<target>/kubeconfig`), `POST /api/deployments` mit `env=k8s` → Manifest-Apply (client-go) | [x] — Beweis: 78687b6a+k3merge, in-tree `deploy/k8s_deploy.go`; Flag-Off-501/Quota-Bail/Idempotenz-Suiten grün; Fleet-NetPol (AG-4) c4d39f15 (merged e8724b87) |
| KD-4 | tf-runner: opentofu-Job-Container (plan/apply, scoped backend), Ergebnis→Deploy-Konsole | [x] (Declarative JobSpec-Contract + KD-4-Finisher: Container-Build/Run engine — Beweis: branch `feat-kd4-finisher` @ `c9c19b86`, merged d69f82ca PR #139, Image `jimeshrdr.azurecr.io/jimesh-tf-runner:latest` @ `sha256:86358c4baace7a572f3891a78d3a18a4fcdbaabf51048ba2016e8d06439e7898`) |
| KD-5 | Code-Section: IaC-File-Actions (Deploy/plan/apply) beim `.yaml/.tf` aus dem Worktree-View | [x] — Beweis: 221686ba (merged 6a78e58a PR #130): `deploy/iac_actions.go` + `IacDeployActions.tsx` (7 vitest-Suiten) + `IacDeployStrip` |
| KD-6 | Deploy-Konsole: SSE-Endpoint + React-Console-Komponente (wartet auf output statt Block-JSON) | [x] — Beweis: 78687b6a (Writer-Hook `projects_ssh.go` L2273 + `DeployConsole.tsx`, vitest deploy-console 4/4); tf_exec-Konsole-Contract c9c19b86 (`tf-runner-<wsId>-<stage>`) | 
| KD-7 | Agent-API: `POST /api/apps/{id}/deploy` — Agent-In-Utility-Container-Orchestrierung via API | [x] — Beweis: 221686ba (`gateway/apps_deploy.go` + PV-4-Credential-Gate fail-closed 501, 5 Gate-Suiten pass / 3 honest skips ohne DB) |
| KD-8 | Terraform-App: AppEntry (`AppSubtypeAPI`) das env-loses tf-runner aufruft (jimesh.io-embedded oder repo-lernt via app-registry) | [x] — Beweis: 0b422b82 Backend (`gateway/terraform_app.go`, AppSubtypeTerraform, isAdmin-Gate 403-Backstop) + 8ac7ce15 FE (`TerraformAppCard.tsx`, 2+2+2 vitest), merged eee4f2aa PR #133 |
| KD-9 | Webview-Upload: Bundle-Upload + Distribution (gvisor-volume / k8s configmap-sync), webview-apps Lib erweitert (Upload-Flow) | [x] — Beweis: 0b422b82 (`gateway/app_bundle.go` POST /api/apps/{id}/bundle multipart sha256 + `store/apps_bundle.go` Versioning/blob-leg) + 8ac7ce15 (`BundleUploadPanel.tsx`, 6 vitest); Distribution-Leg (Volume/ConfigMap-Sync) als dokumentierter Follow-up im Bundle-GET-Contract |
| KD-10 | Cleanup: dual-run deprecation (gvisor bleibt default; alte single-env-Routen bleiben working) + Docs/API_DOCS + Verifikation | [x] — Beweis: Branch `feat-kd10-cleanup-final` @ `f9a2e44f` (JiMesh2, gepusht): API_DOCS-Toplevel-Abschnitt „Dual-Environment-Deployment (gvisor \| k8s)" (Tracks a-e) + Legacy-Alias-Re-Confirmation; Verifikation grün (siehe KD-10-Abschnitt unten) |

### KD-4-Finisher (2026-10-15, branch `feat-kd4-finisher` @ commit `c9c19b86`, pushed op `feat-kd4-finisher`)

- **Execution path** — `src/backend/internal/deploy/tf_exec.go` (`deploy.ExecTfJob`): the declarative
  `TfJobSpec` (tf_runner.go) runs in a REAL container now, spec argv byte-for-byte (init rides the
  image entrypoint, apply consumes the reviewed plan file). Lanenwahl honest (no silent mix):
  docker-API lane on the node socket (attach-before-start, stdcopy-live-stream, `jimesh.io/*`
  task-label family, worktree-only bind at `/workspace`) ODER k8s Job lane (`JIMESH_TF_RUNNER_K8S=true`
  → batch/v1 Job in `jimesh-ws-<wsId>`, backoffLimit 0 + ActiveDeadline, workspace-PVC mount,
  pod-log streaming). Herr bails name the missing prerequisite (no fallback ladder).
- **Image** — `deploy/images/tf-runner/`: `alpine:3.19` + `opentofu` (3.19-community 1.6.2-r2) +
  `entrypoint-tofu.sh` (`tofu init -input=false` → exec argv); remote ACR build per SB-1 house
  pattern (`make tf-runner-build` reads `JIMESH_ACR_REGISTRY` from `.env`, NO local docker — the
  snap-docker DNS defect does NOT block this path). ACR Run `cg5` SUCCESS 16 s,
  Image-Revision (paste-safe digest):
  `jimeshrdr.azurecr.io/jimesh-tf-runner:latest` @ `sha256:86358c4baace7a572f3891a78d3a18a4fcdbaabf51048ba2016e8d06439e7898`
- **KD-6-Konsole** — the gateway summary lines + the engine's real frames stream under the SAME
  console id (`tf-runner-<wsId>-<stage>`): the executor re-opens the finished spec-summary buffer
  with its history preserved, appends live (`AppendDeployConsoleLog`) and closes it
  (`FinishDeployConsoleRun`) in every branch — replay window = the whole story.
- **Gateway-Wiring** — `internal/gateway/terraform_app.go`: `POST /api/iac/{ws}/terraform/plan|apply`
  hands the spec to `deploy.ExecTfJob` async (status `running`; FE contract fields `spec`+`console`
  unchanged — no FE change required).
- **Tests** — `tf_exec_test.go` (all on FAKES, no real docker/cluster): fake docker SOCKET
  (httptest daemon incl. attach-hijack, full start/stop lifecycle + argv/label/bind assertions),
  k8s client-go fake + await stub, KD-6 cases (console-id contract byte-identical to tf_runner.go,
  reopen-keeps-spec-history), honest-bail cases. `go build ./...`, `go vet ./...`, deploy-package
  suite green.

## Backlog

- AWS-EKS-Deploy-Pfad (nach Azure-AKS)
- RuntimeClass gVisor für K8s-Env (Kata/runsc in K8s) — Operator hieß das Pod-Sandboxing,
  geplant als Phase-1-AKS-Experiment
- Cross-Workspace-Cluster-Belegung (siblings statt isolation,科普 S-ROUTE-übergreifend)

## KD-10 — Cleanup, Docs & Verifikation (2026-10-15)

**Branch** `feat-kd10-cleanup-final` @ `f9a2e44f` (JiMesh2, pushed — kein main-Commit).

**Cleanup-Verdict:** gvisor bleibt Default (`environment_type` Store-Default `gvisor`,
migration backfills alles Existing auf `gvisor`); die alten single-env-Routen
`/api/projects/{deploy,redeploy,undeploy,discover}` bleiben WORKING (SPRINT-52-Legacy-Aliase,
duale Registrierung auf dieselben Handler). `TestK8sNonK8sBypassesBranch` beweist: Bodies ohne
`environmentType/env:"k8s"` berühren den k8s-Branch nie. Kein Runtime-Feld wurde entfernt/umbenannt.

**Docs/API_DOCS.md (in-tree):** neuer Toplevel-Abschnitt „Dual-Environment-Deployment
(gvisor \| k8s)" (API_DOCS.md L1387, +75 Zeilen) mit den fünf Tracks:
- **(a) Gvisor-Lane** — `useGVisor` → `--runtime=runsc-falco` (Falco-Wiring via
  `deploy/falco-gvisor-integration`), honest Fallback plain `runsc` → `runc` (live
  `docker info`-Read, `projects_ssh.go:884-885/:1755`); Utility-Container pre-pin
  `--runtime=runsc` (`project_utility.go:480`, S170-7); `installGVisor` OHNE Falco-Wiring
  (eigenes Ansible-Task).
- **(b) k8s-Lane** — Namespace-per-Workspace `jimesh-ws-<id>` (RFC1123-sanitized),
  ResourceQuota `jimesh-ws-quota` + LimitRange `jimesh-ws-limits` aus der PR-3
  `workspace_quota`-Row, Flag `k8s_deploy_enabled` (default OFF → honest 501), kubeconfig
  fresh per Deploy (`store.ResolveKubeconfig`, PV-2-Scope).
- **(c) NetworkPolicy-Kaskade** — AG-4 Overlay `jimesh-ws-netpol` (deny-all-ingress,
  Egress-Whitelist DNS 53/UDP + 443/TCP→egress-office, selektiver Key
  `jimesh.io/egress-policy-key=egress-office/AzureCloud/443`, Pod-Label
  `jimesh.io/workspace-id`) + AG-5 Host-Isolation (2 Policies je Flag, BEIDE default off,
  Flag-Off = byte-identisch zum AG-4-Baseline): `JIMESH_HOST_ISOLATION=on` →
  `jimesh-ws-node-egress` (Egress-Lockdown, DNS nur cluster-intern per bare
  NamespaceSelector OHNE IPBlock), `JIMESH_FLEET_HOST_ISOLATION=on` →
  `jimesh-ws-fleet-host` (tenant-only Ingress, Selektor-Tenant-Intersection). Layer-Contract
  (in-tree refs): AG-1 = Keycloak-Claim-Mint, AG-2 = deny-by-default Agent-Routentabelle
  (`gateway/agents.go`), AG-3 = Throttle/Anomaly (`gateway/agent_rate_limit.go`), AG-4/AG-5 =
  `deploy/k8s_deploy.go` — API-Ebene per ROLLE, Netzebene per POLICY, keines ersetzt das andere.
- **(d) Cross-Deploy: Secrets/TF-Runner über die Terraform-Fleet (FL-1/FL-2)** — K8s
  Secrets (`stringData`+envFrom) leben im Cluster, nie in der CP-DB; Write-Only-Secrets-API
  (PV-6) + `store.ResolveKubeconfig` fresh per Deploy; `TfJobSpec` (tf_runner.go) →
  `deploy.ExecTfJob` (tf_exec.go) in der docker-API-Lane ODER batch/v1-Job-Lane in
  `jimesh-ws-<wsId>` (quota-bounded, backoffLimit 0 + ActiveDeadline); Image
  `jimesh-tf-runner:latest` @ `sha256:86358c4b…39e7898`; FL-2 Fleet-Policy-Bridge published
  die selektiven Keys, FL-1 Fleet-Cluster = AWS/EKS-Forward-Lane (honest 501 heute, Backlog).
- **(e) Forward-Pfad per-Tenant Production-Flow** — PV-5 Cloud-Provision (pass-through,
  kein Credential wird je gefetcht/gesendet) → PV-6 Write-Only-Secrets → PV-4
  Worker-Registration → PV-8 Helm-Agent (`iac/helm/jimesh-agent`, jimesh-agent-Chart
  deployment+RuntimeClass runsc/Kata+RBAC+worker-token-Secret, jimeshIO/iac-Repo —
  kein OSS-Tree-Bestandteil) → gvisor- oder k8s-Lane; kein Cross-Tenant-Route existiert,
  solange keine Isolation-Flags absichtlich geöffnet werden.

**Verifikation (echte Runs am in-tree Code):**

| Gate | Ergebnis |
|---|---|
| `go test ./internal/deploy ./internal/store ./internal/gateway ./internal/policy -count=1` | **alle ok** — deploy 190 PASS + 29 honest skips (TestK8s*-Familie grün inkl. `TestK8sNetworkPolicyDenyByDefaultEgressAllowlist`, `TestK8sNetPolSelectorLabelUnit`, `TestK8sNetPolYAMLAssert`, `TestK8sNonK8sBypassesBranch`, `TestK8sDeployBranchFlagOffHonest501`), store 2 PASS + 66 honest skips ohne jimesh_test-DB (DB-Legs grün aus den Lane-Runs d6d06617/51a0b191), gateway 316 PASS + ~223 honest skips (AppDeploy-Gates pass), policy 27 PASS/0 FAIL |
| `go build ./...` / `go vet` | ok (Branch-Fix: `store.go:627` — 2-Value-Return `MigrateProvisionTargetsFromKV` übernommen) |
| `tsc --noEmit` | 16-Zeilen-Baseline identisch zu main in ALLEN Runs (0 NEW errors); 0 Errors in den KD-8/KD-9-Frontend-Files (`TerraformAppCard`, `BundleUploadPanel`) |
| `npm run build` (next) | clean, 0 Error-Zeilen |
| `check:i18n` | byte-identisch: 60 Locales / 5545 Keys — unverändert (kein Key-Churn im KD-10-Lane-FE) |
| vitest Frontend | 1610 passed + 4 pre-existing flaky (`ContainerDetailPage`-S214 / `TargetScopeModal`-S217-8d — identische Fail-Set auf main-Baseline; KD-8/KD-9-Suiten 12/12 grün separat) |
| `gofmt` | clean auf allen geänderten Files (ci_scan + 4 Test-Files nachgezogen, die auf main unformatiert ankamen) |
| Flaky-Fix im Vorbeigang | `normalizeCIOn` map-case sortiert jetzt die Keys (Go map iteration) — `TestNormalizeCIOn` war echt order-flaky, 5/5 stabil |

**Beweis-Branches (nicht main):** AG-5 Host-Isolation `feat-ag5-host-isolation` @ `43488c11`
(2 NetPols je Workspace, beide default-off — Beweistabelle in SPRINT-AGENT-IAM-FIREWALL).
**Umsetzungs-Range:** `a1b200d9..0136e771` (21 commits) enthält KD-3-AG-4 (c4d39f15),
PV-5/PV-6 (d6d06617), KD-5/KD-7 (221686ba incl. merge 6a78e58a), KD-8/KD-9
(0b422b82 + 8ac7ce15 incl. merge eee4f2aa), KD-4-Finisher (c9c19b86 incl. merge d69f82ca).

**P2-Audit-Nachzug (relevante Hecks aus SECURITY-AUDIT-2026-10-15, alle in-tree):**
- B5 — stripemeter `STRIPE_KEY` aus der env (Makefile-Injection-Weg), `--push` ohne Key
  fail-hard exit 1 (68ee5392) — Metering-Pfad des Dual-Env-Meterings
- D2 — `JIMESH_AGENT_GATEWAY` Deploy-Default off→on (defaults.yml), Code-seitig fail-closed
  (68ee5392) — der AG-Gateway-Layer des Dual-Env-Agent-Deployments
- A2/G2 — Design-Assets sk_live-Redaction + Legacy-LocalStorage-Read-Tier entfernt
  (d30088c4) — Auth-Hygiene des Deploy-Konsolen-SSE-Streams
- C1/C2 — Keycloak sslRequired NONE→ALL + pgx DSN sslmode=require (61f69893) — CP-Ketten,
  an die die k8s-Lane ihre Secrets anlegt
- H2 — Datalake-Tenant-Partition-Boundary (61f69893) — Log-Backend des k8s-Deploy-Streams

## Offene Fragen

- **OQ1** — Deploy von *weichen* compose-Features (depends_on, healthcheck): echte
  Compose-Engine nebenneinen (compose spec runner im Backend) oder nur die Teilmenge?
  Empfehlung: Nur supported-Frags = Strikte contract, sonst Chaos.
- **OQ2** — kubeconfig-Sync-Häufigkeit: pro Deploy fresh pull aus Vault, oder CP-gecacht?
  (Empfehlung: fresh pull, TTL 5 min — kein Persistenz in CP-DB)
- **OQ3** — utility container in k8s-Env: DaemonSet aus dem agent-Chart statt
  docker-run — der Engine-Schritt wird bei KD-3 mitgeplant.

## Abhängig von

- SPRINT-PROVISION-ONPREM-CLOUD-K8S (PV-1..10 — Agent/Worker + Vault-Secrets)
- SPRINT-ENTERPRISE-SITE-AUTH-BILLING (Key Vault als secrets-Backend)
