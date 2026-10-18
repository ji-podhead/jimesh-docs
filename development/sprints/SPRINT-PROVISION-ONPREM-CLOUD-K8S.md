# SPRINT-PROVISION-ONPREM-CLOUD-K8S — Provisioning-Redesign (On-Prem | Cloud, Agent statt 2. CP)

**Status:** 📋 GEPLANT (Design abgeschlossen, Implementierung offen)
**Datum:** 2026-10-14
**Operator-Prompt:** siehe „Operator-Vorgaben (wörtlich)" unten
**Abhängig von:** Vault-Secrets-Modell, Public-Install-Script, Helm-Chart für den Agent

## Ziel

Provisioning-UI und -Backend so umbauen, dass ein Premium-User (jimeshIO-Konto) Infrastruktur anbindet, **OHNE** dass wir SSH-Credentials hinterlegen und **OHNE** dass wir eine zweite Control Plane für ihn deployen. Es gibt genau zwei Hauptionen — **On-Prem** und **Cloud** — mit den unten spezifizierten Sub-Auswahlen. Credentials laufen durchgeht durch **Vault, write-only** (User updatet Secrets, sieht sie nie wieder).

## Operator-Vorgaben (wörtlich, 2026-10-14)

> „wir dürfen auch nicht verwechseln das wir ja die premium jimeshio deployen, aber das der user dann iac code hat um die self hosted variante dann selber nach aws oder azure zu deployen finde ich ok, nur dürfen wir das nicht verwechseln weil die premium variante braucht ihren eigenen deployment code"

> „wichtig ist auch das wir den schrott den wir da jetzt haben und nicht brauchen dann löschen"

> „ne in der premium version will ich kein ssh von unserem server aus, in dem provisioning tab. da geht nur cloud, außer der user hat den ssh client bereits auf einem server installiert und wir haben ihm schon headscale deployed. also wir hinterlegen keine ssh credentials, brauchen wir auch nicht oder? nur die ip quasi. der user muss den client auf dem server den er provisionieren will installieren. dann ist auch wichtig ob er projects oder apps auf dem server in ein cluster installieren will oder mit gvisor sandbox. kubernetes muss er selber provisionieren, das sehe ich auch als etwas zu viel, geht aber in den backlog, ansonsten halt gvisor. also bei der server provisioning brauchen wir für die hauptauswahl erstmal onprem,cloud auswahl, dann den provider bei cloud -> immer k8s. bei onprem/local dann halt den server per dropdown auswahl wo er schon den client installiert hat, darunter dann noch mal ein dropdown -> k8s, gvisor. und dann kommen erst die credentials. bitte hier auch vault benutzen und den user da gleich die spezifischen secrets updaten lassen, ohne dass er die sieht, darunter dann provisioning button. das wird viel arbeit also ordentlich durchplanen. ein client deployment script haben wir schon auch make target, aber das kommt dann zusätzlich für jimeshio auch in die public jimesh-app repo. weiß garnicht ob es die schon gibt aber Pläne müssten da sein. das ist dann das zusätzliche installation script aber das ist nicht self hosted headscale sondern für jimesh cloud."

> „für den kubernetes kram könnten wir den jimesh client quasi auch über ne k8s helm app bereitstellen oder so"

> „ja abe redirect uri haben wir nicht" → (GitHub App Manifest Flow, bereits in JiMesh2 `b9dd8e6d` umgesetzt)

> „also wie viele resourcen haben wir jetzt? ist die ganze kohle weg?" (Budget-Wachsamkeit: 175€/Monat, Free-Tier-Credit ~193€)

## Architektur-Entscheidungen (verbindlich)

### A1 — Premium: Worker/Agent, KEINE zweite Control Plane

```
Unsere CP (einmal, multi-tenant)           User's Infrastruktur
┌──────────────────────────────┐           ┌──────────────────────────┐
│ API, Frontend, Auth, Billing,│ ◄─tunnel─ │ NUR Worker/Agent         │
│ Git-Bridge, Deploy-Controller│ (outbound)│ (Docker+gVisor ODER K8s) │
└──────────────────────────────┘           └──────────────────────────┘
```

- Der Agent meldet sich **outbound** bei der CP (kein eingehender Port nötig).
- **Warum nicht 2. CP:** Operator wörtlich: „obwohl das ja dumm ist … wieso wollen wir für ihn ne 2. cp deployen, wohl eher ne worker node".
- **Self-Hosted (IaC-Paket)** bleibt die Variante, in der der User die **ganze** CP selbst deployt. Premium und Self-Hosted dürfen **nicht verwechselt** werden — getrennte Deployment-Codes.

### A2 — Keine SSH-Credentials in der CP

- Die CP speichert pro Ziel **nur die IP/URL** (plus Metadaten).
- Der **User installiert den Client selbst** auf dem Server (Install-Script, siehe P4).
- Ausnahme (documented edge): Client ist schon installiert **und** wir haben schon headscale deployed — dann reicht ebenfalls nur die IP, weil der Zugang ohnehin über den Tailnet-Pfad läuft, nicht über SSH-Credentials der CP.
- Konsequenz: alter `POST /api/nodes/provision`-Pfad mit host/user/password/ssh_key wird **entkernt** (Health-Check + Plan-Versand statt SSH).

### A3 — Secrets write-only API (Backend: siehe A7)

- Jedes Provisioning-Ziel bekommt Vault-Einträge: `provision/<target_id>/<key>`.
- API-Vertrag:
  - `PUT /api/provision/targets/{id}/secrets` — Update (value nur im Request, nie persistiert in der CP-DB)
  - `GET .../secrets/status` — liefert **nur** `{key: {exists: bool, updated_at}}`, **nie den Wert**
  - kein GET mit Value, keine Logs mit Value (RM35-Gate-Prinzip: „keine Request-Bodies persistiert")
- Die UI zeigt Eingabefelder, die nach dem Speichern als `••••••` + „zuletzt geändert: <ts>" erscheinen.

### A4 — On-Prem: gvisor sofort, k8s im Backlog

- Runtime-Dropdown: **gVisor (runsc)** (Standard, sofort) | **Kubernetes** (Backlog: „kubernetes muss er selber provisionieren … geht aber in den backlog").
- Client läuft via `client-join.sh`/Helm im Tailnet (isolated identity, `--accept-dns=false` — SPRINT-184-DNS-Fix vorausgesetzt).

### A5 — Cloud: IMMER K8s, Provider-Auswahl

- Cloud-Tab: Provider (Azure, später AWS) → **immer Kubernetes** (kein gvisor-Tab in Cloud).
- Deploy-Tiefe: siehe Offene Frage OQ2 — der entscheidet, ob wir den Worker komplett deployen oder nur den `helm install`-Befehl ausgeben.

### A6 — Client-Auslieferung an zwei Stellen

1. **Install-Script** (public): `curl -fsSL https://get.jimesh.io | sh` → Client-Install + Join zu **JiMesh Cloud** (CP-URL + Preauth-Token-Flow, **nicht** self-hosted headscale).
2. **`jimesh-agent` Helm-Chart** (jimeshIO): für K8s-Umgebungen — Deployment + RuntimeClass (gVisor/Kata), Values `cpURL`, `workerToken`.
   - Operator: „für den kubernetes kram könnten wir den jimesh client quasi auch über ne k8s helm app bereitstellen oder so".

### A7 — Secrets-Backend: Azure Key Vault statt HashiCorp Vault (auf Azure)

**Operator 2026-10-14:** „vault können wir bei azure auch mit key vault ersetzen aber ich weiß nicht was das kostet" — Kosten geprüft:

| Posten | Preis |
|---|---|
| Secret-Speicherung | **0€ (kein Preis pro Secret)** |
| Operationen (Get/Set/List) | $0.03 / 10.000 Ops |
| Unser Nutzungsmuster (<10k Ops/Monat) | **< $0.10/Monat — effektiv gratis** |
| HSM-Keys / Managed HSM | nicht nötig ($1–5/Key bzw. ~$2.300/Monat) |

**Entscheidung — pluggable Backend im `secrets-wrapper` (jimeshIO/secrets-wrapper) bekommt ein drittes Backend:**

```
SECRETS_BACKEND=keyvault → Azure Key Vault (Default für Premium auf Azure)
SECRETS_BACKEND=kv       → Vault KV (on-prem / self-hosted)
SECRETS_BACKEND=azure    → Vault Azure Secrets Engine (optional, nur wo dynamic TTL-SPs nötig)
```

- **Key Vault = Default auf Azure**: managed (0 Betrieb, kein Vault-Lebenszyklus), Zugriff via **Managed Identity** (kein Credential-Handling in der CP), ~0€.
- **Nachteil dokumentiert:** kein dynamic Secrets (TTL-SPs) — das bleibt der optionale Vault-`azure`-Pfad; Key Vault nur statisch + Managed Identities.
- **Cloud-agnostisch bleibt:** self-hosted/nicht-Azure läuft über `kv` — die CP-API (write-only, A3) ist backend-unabhängig, nur `SECRETS_BACKEND` wechselt.
- Die Sprint-Task PV-2 („Vault-Integration") liest sich damit als: **Secrets-Wrapper-Backend `keyvault` implementieren + write-only CP-API darüber**.

## Provisioning-UI (Spezifikation)

```
┌ Provisioning ────────────────────────────────────────────┐
│  [ On-Prem ]   [ Cloud ]                                 │
│                                                          │
│  On-Prem:                                                │
│   ├─ Server-Dropdown   (NUR Clients mit health=online)   │
│   ├─ Runtime           (•) gVisor   ( ) Kubernetes[BACK] │
│   ├─ Secrets (Vault)   [key] [•••••• ▾] zuletzt: <ts>    │
│   │                             (write-only, nie Value)  │
│   └─ [ Provisionieren ]                                  │
│                                                          │
│  Cloud:                                                  │
│   ├─ Provider          (•) Azure  ( ) AWS                │
│   ├─ Hinweis: „immer Kubernetes"                         │
│   ├─ Region                                             │
│   ├─ Credentials (Vault, write-only wie oben)            │
│   └─ [ Provisionieren ] → deployt WORKER, keine CP       │
└──────────────────────────────────────────────────────────┘
```

- Einordnung in der bestehenden `ServersPage.tsx` (Tabs `servers | control-planes`): der neue Provisioning-Flow **ersetzt** die bisherige provision-Sektion mit Host/User/Password-Feldern.
- Bestehende Assets (nicht neu bauen): `ServersPage.tsx` (516 L), `control_planes.go` (719 L, Routes CRUD+provision/deploy), `deploy/client/scripts/client-join.sh` + Make-Targets.

## Work Packages

| Nr | Task | Status |
|---|---|---|
| PV-1 | Datenmodell: `ProvisionTarget` (mode onprem\|cloud, provider, runtime gvisor\|k8s, endpoint=nur IP/URL, agentVersion, health) — Migration der `ControlPlaneRow`-SSH-Fields **raus** (Schrott-Lösung, Operator: „den schrott … löschen") | [ ] offen |
| PV-2 | Secrets-Integration (A7): neues `secrets-wrapper`-Backend **`keyvault`** (Azure Key Vault, Managed Identity) + write-only CP-API (PUT + status, **kein GET-Value**), Pfade `provision/<target_id>/*`, RM35-Audit an den Write-Stellen | [x] erledigt (2026-10-14) — **Beweis:** `secrets-wrapper/internal/secrets/keyvault/keyvault.go` (+ `keyvault_test.go`, 14 unittest-mocked Tests grün: IMDS-Header/Retry-3×/5min-Token-Cache/expires_in-Honorierung, PUT/GET round-trip, Revoke = `PUT attributes.enabled=false` + disabled-refused, Renew "" no-op-re-read vs leaseID → `ErrLeaseNotSupported`, 404, URI fail-closed, Name-Sanitize; `go build/vet ./...` + `go test ./internal/secrets/keyvault` ok). stdlib-only WITHOUT azidentity: Minimal-IMDS-Client (169.254.169.254, `Metadata: true`, resource=vault.azure.net, mockbar per `WithIMDS`), Token-Cache 5min TTL (ES-5-JWKS-Cache-Posture), `SECRETS_BACKEND=keyvault` im cmd/main.go-Switch (VAULT_URI Pflicht, fail-closed); Renew/Revoke-Routen-Contract im Backend-Header dokumentiert (renew = no-op 200 re-read statisch, revoke = update enabled=false — Key Vault hat kein Secret-Revocation-Feld) |
| PV-3 | Provision-API entkernen: `POST /api/nodes/provision` ohne SSH — prüft nur ob Client antwortet (Agent-Health/Headscale), dann liefert CP den Provision-Plan (Compose/gVisor-Stack) | [x] erledigt (2026-10-14, feat-pv3-deprovision-ssh) — **Beweis:** JiMesh2 commit `62eeb58f` auf `feat-pv3-deprovision-ssh` Anmerkung (final PR-merge pending). A2 verbindlich umgesetzt: `node_provision.go` rewrite — legacy Request-Shapes (nodeHost/nodeUser/password/ssh_key + bare host/user) → **400** honest `ssh-based node provisioning REMOVED (SPRINT-PROVISION A2) — use worker-agent flow (install.sh + /api/workers/register)` (keine silent-Degradation, jedes Feld einzeln getestet); NEU: body `{target_id, install_components?: ["gvisor"|"tailscale"|"dns"], agent_expected: true}` → Kein SSH-Dial mehr: (a) Target-Validierung über die drei de-facto-Registries (PV-4 worker-registry Rows settings-KV `provision/workers/row/<id>` → `control_planes` (endpoint = nur IP/URL) → ssh_endpoints-Metadaten-Registry), sonst ehrlicher 404; (b) Health-Check via Tailnet-Pfad = EIN kurzer HTTP GET `<address>/health` ("tailscale ping-Äquivalent", PV-4-Refresh trägt tailscale_ip/host auf der Row) → **425 Too Early** `agent not reachable (no tailnet path) — agent install via jimesh-app install.sh first`; (c) Erfolg-Nachweis = Agent-Heartbeat aus der PV-4-Registry last_seen < 5 min (stärker als der Inbound-Probe, A1) ODER live /health → `{status:"reachable", target_id, agent:{proof,heartbeat,last_seen_at}, install_plan:[{component,kind(compose\|yaml),content}…]}` — die 3 PRE-BUILT Plan-Chunks (gvisor/tailscale/dns, provision_plan.go, NOT executed server-side, A2 "Plan-Versand statt SSH"); control-plane-Targets buchen ready/failed wie jeder Provider-Call. RM35: `nodes_provision_attempt` + `nodes_provision_result` Rows je Call (`RecordAdminAudit`, H3-Muster; Route ist bewusst NICHT im OPA-Admin-Prefix — der Handler schreibt自己的 Trail-Zeilen, nie Request-Bodies). NO GET: `GET /api/nodes/provision` heartbeat-Status-Surface (worker rows + fresh-Flag + agent_install_command) für die FE-Heartbeat-Note. Store-Audit (Task 4): grep ssh_key/password über Node/Provision-Store → control_planes hält NUR credentials_ref (opaque), ssh_endpoints ist non-secret Metadaten — KEINE ssh_secret-Spalten vorhanden, Schema unverändert (dokumentiert im File-Header); NEU ListSettingsWithPrefix + DeleteSetting (+ Tests). FE (ServersPage.tsx + ServersSurface.tsx + Embedded WorkspaceEndpointsPage.tsx): Provisions-Panel entkernt — statt Host/User/Password-Feldern jetzt (a) Install-Befehl `curl -fsSL …jimesh-app/main/install.sh \| sh` mit Copy-Button, (b) Agent-Heartbeat-Note `< 5 min` (useQuery auf GET /api/nodes/provision, 30s-Poll), (c) Verify-Button postet die NEUE Request-Shape; Target-Dropdown NUR frische Clients (On-Prem-Spez). Tests: deploy `node_provision_test.go` 6/6 grün (legacy-400 + Validierung + Heartbeat-Happy + 425-425 + /health-Happy mit echtem httptest-Agent + RM35-Rows + GET-Surface) vs. jimesh_test, store prefix-tests 2/2, vitest ServersPage 2/2 + ServersSurface 1/1 (old fields gone / curl-command present / copy button / NEW request shape asserted), tsc 0 in geänderten Dateien, eslint clean, check:i18n grün (60 Locales, `add-pv3-provision-i18n.mjs` en/de hand + 58-Sweep); API_DOCS.md Route neu dokumentiert. |
| PV-4 | Agent-Registrierung: Agent meldet sich bei CP (`POST /api/workers/register`, Token aus Vault), CP schickt Deploy-Jobs, Status-Heartbeat | [~] teils (2026-10-14) — **premium package landed; OSS stub mounted; pro-build wiring pending after EX-1 roll-out.** Premium: `jimeshIO/packages/go/workerregistry` (eigene go.mod, stdlib-only, 12 Tests grün — happy path mint+consume, single-use reuse 401, name collision → neuer worker_id, good refresh extend +24h Rotation, expired/superseded 401, unwired store 500) nach dem EX-1-WireStore-Muster (`WireKV(get, save)`-Seams, Token als sha256-Key `provision/workers/<sha256>`, ConstantTimeCompare stale-row check). OSS-Stub: `jimesh/src/backend/internal/gateway/worker_registry.go` (`//go:build !pro`) mountet `POST /api/workers/register` + `/refresh` → ehrliche 501 `{"error":{"message":"premium package required …"}}`, verdrahtet in `gateway.go` neben registerCloudExchange; **install.sh fail-closed contract:** das Public-Bootstrap (jimesh-app install.sh) ruft die Route und liest 501/404 als "CP worker-registration not live yet (PV-4)" — nach dem Pro-Build (GOPRIVATE, `worker_registry_pro.go`-Delegation, Contract im Stub-Header dokumentiert) antwortet dasselbe Route-Label 200 |
| PV-5 | Cloud-Pfad: `POST /api/provision/cloud` (provider, region, vault-creds) → Worker-Deploy in User-Cluster (Azure zuerst) | [x] erledigt (2026-10-15) — **Beweis:** JiMesh2 commit `d6d06617` auf `feat-pv5-pv6-provision-tabs` (branch pushed, final PR-merge pending). Route `gateway/provision_cloud.go` — **PASS-THROUGH-Vertrag wörtlich umgesetzt:** die Route FETCHT KEIN Credential (kein Vault-Read, kein az login) — sie leitet NUR den Kubeconfig-Scope-Pfad `provision/<target_id>/kubeconfig` ab (`store.KubeconfigSecretName`, PV-2/KD-3-Konvention), persistiert nur NICHT-geheime Binding-Metadaten (`provision/<target_id>/cloud_binding`) und antwortet `{status:"registered", kubeconfig_key, worker_registry_linked, attach_command, credentials_contract}`. Gates: `isAdminRequest` UND jimesh.io-Link (H1-Stack-Link-Row `cloud_link/sub/<sub>` aus der ES-5-Exchange, ES-6 liest dasselbe Bein; fehlt/leer → ehrlicher **409 CONFLICT** — Route liefert nicht; Passwort-Operator läuft ohne per-sub-Link = die Plattform selbst). Per-Provider: azure `byo-cluster` SUPPORTED (AKS-Attach; Region gegen die geschlossene `azure_location`-Liste validiert, FE-Dropdown spiegelt sie); `provision-new-aks` → ehrlich **501** (Operator-Verbatim: „kubernetes muss er selber provisionieren, das sehe ich auch als etwas zu viel, geht aber in den backlog"); provider `aws` → ehrlich **501** (pending FL-5); Rest 400. RM35 attempt+result rows (`provision_cloud_attempt`/`provision_cloud_result`). **REST-API-Konformität + Worker-Registry-Glue:** `provision_cloud_test.go` FLAGSHIP-e2e im selben Workerregistry-Mock-Postur (`jimeshIO/packages/go/workerregistry/workerregistry_test.go`, In-Memory-KV-Semantik — hier über die REALEN GetSetting/SaveSetting-Accessors, exakt die WireKV-Wiring des Premium-Packages): workerregistry-PV-4-Row (exakte Row-JSON-Shape worker_id/refresh_sha256/created_at/expires_at/name/last_seen, KV `provision/workers/row/<id>`) → POST /api/provision/cloud (target_id=Worker-ID, gelinkter Sub) → 200 + kubeconfig_key=`provision/<id>/kubeconfig` + worker_registry_linked=true → A3-Secrets-PUT derselbe Test (kein Value-echo) → `store.ResolveKubeconfig` liefert byte-exakt settings-kv → Status-Route ohne Value — die Kette, die der k8s-Deploy-Pfad (KD-3) real läuft. Suite 9/9 green ((Surface-Scan 1-Label/Vergeist-404/405, 403/401/409/503-Gate-Leiter, Validierungs-Vertrag inkl. beider 501-Paths, Operator-Link-Gate-Pass, FLAGSHIP-e2e) auf fresh jimesh_test; `go build/vet ./...` ok; API_DOCS.md-Zeile dokumentiert |
| PV-6 | Frontend: Provisioning-Tabs (On-Prem/Cloud, Sub-Dropdowns, Vault-Secrets-Block write-only, Provision-Button) in `ServersPage.tsx`; alte Host/User/Password-Fields entfernen | [x] erledigt (2026-10-15) — **Beweis:** JiMesh2 commit `d6d06617` auf `feat-pv5-pv6-provision-tabs` (branch pushed, final PR-merge pending). Tab-Layout „erstmal onprem,cloud auswahl" (Operator-Verbatim): `ServersPage.tsx` + `ServersSurface.tsx` (die verwobene DEVICES-Oberfläche) fassen DEN dritten Tab `?tab=cloud` (?tab-Postur des W-SURFACES-MERGE-Präzedenz); On-Prem-Pane = PV-3 as-built (install.sh + Heartbeat-Note + Verify-Button), neue CLOUD-Pane = geteiltes `components/provision/cloud-provision-panel.tsx` (EIN Panel, beide Oberflächen): A5-Note „Cloud = IMMER Kubernetes", Provider-Dropdown (Azure | AWS disabliert mit ehrlichem „pending FL-5"-Hinweis), hartkodierte `azure_location`-Regionliste + Preis-Notiz (A7-Kostencheck: AKS Free-Tier CP 0€, Standard ≈73 USD/Monat, Key-Vault-Ops <$0.10/Monat), cluster_binding-Toggle (byo-cluster AKS-Attach | provision-new-aks mit ehrlichem 501-Backlog-Hinweis), **Write-Only-Vault-Block (A3)**: `az_subscription_id`/`az_tenant_id`/`az_client_id`/`az_client_secret`-Passwort-Inputs → Save-Button PUTt je gefülltem Key an `PUT /api/provision/targets/{id}/secrets` (Werte NUR im Request — Inputs nach dem Speichern GELEERT; die Marker `••••••` + „zuletzt geändert: <ts>" kommen aus `GET .../secrets/status` — exists + updated_at, NIE ein Value), darunter (Operator-Verbatim: „darunter dann provisioning button") der Provisioning-Button → `POST /api/provision/cloud` mit ehrlicher Fehleranzeige (409 nicht gelinkt / 501 aws+new-aks / 400 wörtlich, nie Fake-Success). **Write-only Secrets-API (A3)**: `gateway/provision_secrets.go` — `PUT /api/provision/targets/{id}/secrets` ({key, value}; geschlossener Key-Set kubeconfig + 4 az_*, sonst 400; Value nie im Response/Audit) + `GET .../secrets/status` → `[{key, exists, updated_at}]` ohne Value; Store-Half `store/provision_secret.go` (Raw-Value-Row byte-exakt für KD-3-clientcmd + parallele NICHT-geheime meta-Row `{"updated_at"}` — Settings-KV hat keinen Timestamp-Column, Schema unverändert, PV-3-Grep-Präzedenz; gleiche Accessors wie die PV-4-workerregistry-Wiring); RM35-Zeilen (`provision_secret_write`/`provision_secret_status`, Outcome-JSON only); Alte Host/User/Password-Felder: mit PV-3 entkernt (A2) und durch die ServersSurface-Suite „NO ssh fields" weiterhin abgesichert. FE-Tests: `cloud-provision-panel.test.tsx` 3/3 (AWS-disabled/azure_location-closed-list/binding-hint; PUT-Wire-Shape je gefülltem Key + leeren inputs + ·····-Marker; POST-Body exakt + ehrliche Refusals), bestehende Suites 44/44 green; Gates: tsc --noEmit 0 in geänderten Files (14 Baseline-Errors identisch zu main), check:i18n green (60 Locales — en/de-Anker 25 neue serversPage.-Keys + add-pv5-pv6-provision-i18n.mjs-Sweep auf 58 Locales, en-Fallback-Postur wie PV-3), eslint clean in geänderten Files |
| PV-7 | Public Install-Script: `install/` in JiMesh2 **ODER** neues Repo `jimesh-app` (OQ1) — Client-Install + JiMesh-Cloud-Join (unterschied zu self-hosted headscale) | [ ] offen |
| PV-7b | Azure **No-PIP-Erhärtung**: `modules/vm` ohne Public IP (PIP betriebsseitig per az CLI disassoziert + Terraform-aligned), verbatim Operator-Sektion unten | [x] erledigt (2026-10-15, branch `feat-waf-cf-owasp` f29a05a) — **Beweis:** `jimeshIO/iac/terraform/azure/modules/vm` `create_public_ip` default false (war true) + honest-null-Output + azurerm_public_ip-Kommentar; jimeshOps/terraform/main.tf `create_public_ip = false` explizit + `vm_public_ip`-Output-Note; cf/azure `terraform fmt -check -recursive` clean, `terraform init -backend=false && terraform validate` GREEN (root+dns vm-Modul), **niemals apply** |
| PV-8 | `jimesh-agent` Helm-Chart in `jimeshIO/iac/helm/` — Deployment + RuntimeClass, Values cpURL/workerToken | [x] erledigt (2026-10-15, branch `feat-pv8-agent-chart` aus main, final PR-merge pending) — **Beweis:** Chart-Scaffold `iac/helm/jimesh-agent/` (Chart.yaml name jimesh-agent/appVersion 0.1.0/version 0.1.1; values.yaml `cpUrl=https://cp.jimesh.io`, `workerToken` leer, `namespace=jimesh-ws-default`, `agent.image=ghcr.io/ji-podhead/jimesh-worker:latest` + TODO(ji-podhead) GitHub-Actions-Note (SB-1-Renderer-ACR-Muster, kein ghcr-Protected-Image-Release), imagePullPolicy IfNotPresent, `runtimeClass.runsc=true`/`kata=false`, `rbac.create=true` + `clusterScope` opt-in, serviceAccount, resources). Templates: `deployment.yaml` (container `worker`, 1 Replica Recreate — PV-4 single-process-Posture, env JIMESH_CP_URL/JIMESH_WORKER_TOKEN (Secret-keyRef `worker-token`)/JIMESH_WORKER_NAME (fieldRef pod-name)/TTL/Heartbeat/AGENT_GROUP, labels `agent-group` + jimesh.io/sprint, Foreground-PID-1, securityContext runAsNonRoot UID 1000 + capabilities drop ALL + seccompProfile RuntimeDefault + readOnlyRootFilesystem, `/tmp` als tmpfs-Memory-Volume — **kein PV, ephemeral runtime**), `runtimeclass.yaml` (RuntimeClass runsc/kata je Value-Flag, handler + nodeSelector `jimesh.io/sandbox:*`; selektiert die Shims Cluster-seitig, installiert NICHT), `serviceaccount.yaml`, `rbac.yaml` (namespace-Deployer-Contract im Header dokumentiert: deployments(+status/scale)/pods(+exec,log)/services/configmaps/secrets/jobs — KD-3-Vorbild, `ClusterScope` bewusst OPT-IN), `secrets-worker-token.yaml` (**optional**: workerToken leer → Template rendert NICHTS; README dokumentiert manuelles `kubectl create secret` oder `helm upgrade --set workerToken=`), `service.yaml` (rendert bewusst NICHTS — „no svc needed at 0 ingress", A1 outbound-only), `NOTES.txt`, `README.md` (Values-Tabelle + Deploy-How-To + Register-Ablauf). **Contract-Verifizierung** (Code-Lesung): `jimeshIO/packages/go/workerregistry/workerregistry.go` (PV-4) — Header X-Worker-Token → sha256-KV-Lookup `provision/workers/<sha256>` → single-use `__consumed__`-Mark → 200 `{worker_id, refresh_token}` (24h TTL, Rotation über `/api/workers/refresh`); Status-Matrix aus dem Code ins Chart-README getragen (400 missing token / 401 unknown/consumed/superseded/expired / 500 KV not wired / 501 OSS-Stub); `jimeshOps/apps/jimesh-app/install.sh` (PV-7) — Env-Konventionen JIMESH_CP_URL/JIMESH_WORKER_TOKEN übernommen; SPRINT-DEPLOY-DUAL-ENV A6 + KD-10-RuntimeClass-Backlog-Querverweis. **KEINE postinstall-Hooks** (verify: nicht nötig — Registration ist Agent-Code). **Verification:** helm v3.16.4 lokal vorhanden — `helm lint` → 0 failed (nur icon-INFO); 5 `helm template`-Varianter (default ohne workerToken → 6 Manifeste ohne Secret; kata+clusterScope+token+apiPort → 8 Manifeste; runsc.enabled=false → keine runtimeClassName) + python-yaml safe_load-Asserts (securityContext UID 1000/drop ALL/RuntimeDefault, tmpfs /tmp, Secret-Ns=values.namespace, RuntimeClass-Handler, Service-Port) ALL GRÜN; YAML-Fallback-Schulblende (`python3 -c 'import yaml; yaml.safe_load(...)'`) im README dokumentiert für Helm-lose-Lanes — `helm lint` via CI in `.github/workflows/helm-agent-build.yml` (lint + `helm package`-only, KEIN Image-Build/Push aus dieser Spur, Chart-artifact-Upload) für den PR-Build. Docs: `docs/CONFIGURATION.md` §4 Cloudflare — helm-chart-Zeile (documentation-only, cp.jimesh.io-Zonen-Pfad). |
| PV-9 | Aufräumen (Operator: „den schrott … löschen"): Ansible-VM-Provisioning-Rollen prüfen (firewall/tailscale/caddy/core) — bleiben NUR für Self-Hosted-VM-Variante, sonst raus; `provision-vm.sh` in jimeshOps → `provision-cluster.sh`/Agent-Variante | [ ] offen |
| PV-10 | Docs + API_DOCS + Sprint-Verifikation | [x] erledigt (2026-10-15) — **Beweis:** JiMesh2 commit `424c3413` auf `feat-pv10-final-docs` (branch pushed, final PR-merge pending; jimeshIO-Dokus im Gegenzug direkt auf main als Doc-Commits). **API_DOCS final (JiMesh2 `docs/API_DOCS.md`, Deploy → Provision-Lanes):** die PV-3/PV-5/PV-6-Rows (entkerntes `POST`/`GET /api/nodes/provision`, `POST /api/provision/cloud` PASS-THROUGH, write-only `PUT /api/provision/targets/{id}/secrets` + `GET …/secrets/status`) standen bereits post-merge; die Lücke komplettiert: `POST /api/workers/register` + `/api/workers/refresh` (PV-4 — OSS ehrlicher 501 fail-closed-Stub ↔ Premium-Package `jimeshIO/packages/go/workerregistry`: X-Worker-Token sha256-Einmal-Verifizierung `provision/workers/<sha256>`, `__consumed__@`-Mark ohne KV-Delete, 200 `{worker_id, refresh_token}`, Refresh 24h-TTL-Rotation + ConstantTime stale-row check; install.sh-Vertrag liest 501/404 als "not live yet") und die drei FL-3 Headscale-Rows (`POST /api/headscale/provision` Operator-Stage X-Headscale-Token, `GET /api/headscale/provisioning/{tenant}`, `/verify` — sha256-only Rows, NEVER Clear-Text; OSS-Build: 404, Label ist nicht gemountet) mit JSON-Bodies, Error-Codes und Audit-Trails je Lane. **Docs-Sync (jimeshIO, direkt auf main):** `docs/SSH-ACCESS-ROUTES.md` (A2-Abschnitt: Provisioning läuft NICHT mehr über SSH der CP; install.sh curl-pipe `curl -fsSL https://raw.githubusercontent.com/ji-podhead/jimesh-app/main/install.sh \| sh`; 3 SSH-Wege bleiben operator-seitige Notseite), `docs/DEPLOYMENT-URLS-2026-09-19.md` (Provision-Lanes-Route-Tabelle), `onboarding/README.md` (Provisioning-Scope-Sektion: On-Prem/Cloud-Verträge + FL-3-Scope). **Verifikation (all green):** `go build ./...` + `go vet ./...` GREEN; `go test ./internal/gateway ./internal/store -count=1` GREEN (beide Packages ok); `npm run check:i18n` GREEN (60 Locales, 5584 keys) — NACH zwei Merge-Wellen-Breakfixen im Beweis-Commit: (1) `internal/store/store.go` PV-1-Fix — `MigrateProvisionTargetsFromKV` gibt `(report, error)` zurück, Boot-Call honest zwei-wertig verworfen (Build war nach `51a0b191` gebrochen), (2) i18n: Key `wsContainers.projectsLoadFailed` fehlte in ALLEN 59 Locales (W4-L2-containers-Merge) → ergänzt. **Working-Tree-sync:** jiMesh2-main-Worktree `/tmp/pv10` (branch `feat-pv10-final-docs`), niemals direkt auf main committet |

## Backlog (explizit vom Operator)

- **K8s-Provisioning durch uns** (User-Cluster anlegen) — „das sehe ich auch als etwas zu viel, geht aber in den backlog".
- **AWS-Provider** (gleiche Struktur wie Azure).
- **Terraform-Modul `aks-agent`** für den Managed-Worker-Deploy (jimeshIO/iac/terraform/azure/modules).

## Abgrenzung: Premium vs. Self-Hosted (NICHT vermischen)

| | Premium (jimeshIO) | Self-Hosted (IaC-Paket) |
|---|---|---|
| Wer deployt | Wir (managed) | User selbst |
| Control Plane | Unsere, multi-tenant | User deployt eigene CP + Worker |
| Deployment-Code | Eigener (dieser Sprint) | `iac/terraform/{aws,azure}` + Helm + Compose |
| Provisioning-UI | On-Prem/Cloud wie spezifiziert | entfällt (User macht es selbst) |

## Offene Fragen (VOR Implementierungsstart)

- **OQ1 — `jimesh-app` Repo:** anlegen (public) oder Install-Script in JiMesh2 unter `install/`? Operator: „weiß garnicht ob es die schon gibt aber Pläne müssten da sein" → **Repo existiert NICHT** (geprüft 2026-10-14: nur JiMesh2, jimeshIO, jimeshOps + private Alt-Repos).
- **OQ2 — Cloud-Deploy-Tiefe:** (a) CP deployt den Worker komplett mit User-Creds (Azure/AKS), oder (b) CP generiert nur den `helm install`-Befehl mit Token für seinen bestehenden Cluster? (b) ist ehrlicher/self-serve, (a) mehr Komfort.
- **OQ4 — Reihenfolge:** PV-1+2 (Modell+Secrets) zuerst, oder erst UI-Skelett (PV-6) sichtbar?

## Offene Frage geschlossen

- ~~**OQ3 — Vault-Instanz**~~ → **ENTSCHEIDUNG (Operator 2026-10-14: „vault können wir bei azure auch mit key vault ersetzen"): Azure Key Vault ersetzt HashiCorp Vault für Secrets-Storage auf Azure.** Siehe A7.

## In dieser Session erledigt (Kontext)

- **GitHub App Manifest Flow**: in JiMesh2 `b9dd8e6d` implementiert (Backend `internal/gateway/github.go`, Frontend `GitHubAppConnectCard.tsx`, 14/14 Tests) — kein eigener Sprint-Block nötig.
- **azurerm ~>4.0 Upgrade**: jimeshIO `45e6933`, jimeshOps `1dfae8d` gepusht.
- **Azure-Deploy-Status**: 6 Ressourcen in `rg-jimesh-production` (northeurope); VM blockiert an Quota (`standardBsv2Family 0/0`) + Capacity Restrictions; Pay-as-you-go aktiviert; nächster Schritt = Quota-Erhöhung portal-seitig oder AKS-Test (Free Tier, Control Plane 0€, Standard 73$/Monat).
- **DNS-Lokal**: Headscale/CorpDNS-Fallback-Fix manuell durch Operator; IaC-Task für `resolved.conf.d` mit Fallbacks existiert noch nicht (Sprint-184 nur beschrieben).

---

## PV-7b — Azure No-PIP-Erhärtung (2026-10-15, branch `feat-waf-cf-owasp` f29a05a)

**Operator-Verbatim (2026-10-15):**

> „was ist mit dieser unproteted public ip address die wir jetzt noch haben und
> der ganze alte scheiss ... bitte auch die sachen ordentlich protecten mit
> azure und nicht random ips einfach auf unsere netzwerke zugreifen lassen und
> ordentliche owasp regeln in cloudflare"

Antwort in zwei Spuren (Cloudflare-Spur = SPRINT-CLOUDFLARE-IAC.md CF-2-Finish,
f29a05a — OWASP-Threshold-Strict + Custom-Deny + Rate-Limits; Azure-Spur = hier):

### Azure-Spur (Terraform-aligned, NO manual apply)

- **Ist-Zustand vor PV-7b:** `iac/terraform/azure/modules/vm/main.tf` hatte die
  NSG-Erhärtung schon (a3566eb: SSH-Port 22 entfernt, nur Cloudflare-CIDRs
  443/7844 in/out), aber `azurerm_public_ip` blieb im Modul (`create_public_ip`
  default **true**) → jede Neu-VM bekäme wieder eine Static Public IP.
- **Betriebsstand:** die real existierende PIP an `vm-jimesh-production` wurde
  **heute manuell per `az CLI` von der NIC disassoziert** (operator-managed —
  „PIP dissociated manually today via az CLI"; de facto geleistet, bevor
  Terraform sie je syncen konnte). Keine `terraform apply` zu dieser Änderung —
  siehe Absatz unten — kein blindes Hinzufügen eines Apply-Schritts.
- **Terraform-Alignment (f29a05a):**
  1. `variables.tf`: `create_public_ip` default **false** (war true) — No-PIP
     ist jetzt der Modul-Default; `bool=true` nur explicite Bootstrap-Ausnahme,
     bewusst entmutigt.
  2. `main.tf`: `azurerm_public_ip.this` bleibt als count-gated Opt-in-Resource
     (kein Delete-and-Recreate-Risiko für Fremd-Caller, die den Flag je setzen);
     NIC-`ip_configuration.public_ip_address_id` = null bei default → NIC ohne
     PIP.
  3. `outputs.tf`: `public_ip_address`-Output honest-null-Note (kein Fake-Value,
     `null` wenn default) + Az-CLI-Disassoc-Provenance im Kommentar.
  4. `README.md`: No-PIP-Nota (Tunnel outbound-initiated + Tailscale-SSH =
     kein offener Ingress — random IPs können NICHT mehr direkt auf unsere
     Netze zugreifen).
- **jimeshOps/terraform/main.tf** (Callee-Repo, uncommitted dort): VM-Modul-Block
  setzt `create_public_ip = false` explizit (funktioniert gegen beide Modul-
  Stands), `output vm_public_ip` behält Wert-Shape (`module.vm.public_ip_address`
  → ehrlich null) mit Erhärte-Note. Output-Referenz bleibt gültig (Modul-Output
  existiert gated weiter → kein plan-Fehler). **NO manual apply** — der
  jimeshOps-State reconciliert die NIC ohne PIP beim nächsten regulären
  Plan/Apply-Zyklus.

### Waf-Netz-Spur (Cloudflare, Querverweis)

OWASP-Regeln + Admin-Allowlist (default jimeshOps `.env OPERATOR_IP=176.0.58.86/32`)
+ Rate-Limits: siehe SPRINT-CLOUDFLARE-IAC.md §"Umsetzung CF-2-Finish" (waf.tf,
f29a05a) — die CF-WAF-Seite schließt den „ordentliche owasp regeln in cloudflare"-
Operator-Halbsatz ab.
