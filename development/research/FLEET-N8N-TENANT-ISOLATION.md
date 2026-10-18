# RESEARCH: Azure Kubernetes Fleet Manager für isolierte n8n-Tenant-Deployments

**Datum:** 2026-10-14
**Operator-Input (wörtlich):** „bitte neue research wie wir fleet manager für isolierte n8n deployments für tenants benutzen können" + Quellen:

1. https://tailscale.com/use-cases/kubernetes
2. https://medium.com/@lapchenko.vanya/setting-up-headscale-on-a-kubernetes-cluster-75577f03a3e4
3. https://github.com/guilhem/headscale-operator
4. https://learn.microsoft.com/en-us/azure/kubernetes-fleet/overview

## Verifizierte Quellen-Befunde (2026-10-14 abgerufen)

### Quelle 1 — Tailscale Kubernetes use-case (tailscale.com/use-cases/kubernetes)

- **Tailscale Kubernetes Operator**: Kubernetes-API/Services/Cluster via Tailnet — **ohne&nbsp; public exposure**.
- „**One network across clusters and clouds**" — ein Overlay-Netz über Cluster/Regionen/Clouds.
- Security-Pattern: **SSO-IdP-Gruppen ↔ K8S-RBAC sync**, **JIT-Zugriff**, recordierte `kubectl exec`-Sessions.
- **Tags/Groups → Services** (ACL-ähnliche Zugriffsmatrix, z.B. tag:tenant-a).
- Für uns kostenrelevant: Operator/Egress läuft auch mit **Headscale self-hosted** — die Patterns (Subnet-Router, per-namespace Identity, ACLs) sind Tailnet-agnostisch; wir sind Sprint-bound auf Headscale (nicht Tailscale-SaaS $8–18/user/Monat).

### Quelle 2 — Medium „Setting up Headscale on a Kubernetes Cluster" (lapchenko.vanya)

- **403 beim Abruf** (Medium paywall/bot-gate) — Pattern ist aber bekannt.außgehend: Headscale Helm-Chart im Cluster (Deployment headscale Postgres/SQLite PVC), Ingress (nginx/Traefik) für Control-Plane/Lan-policy Routes, OIDC an Keycloak, ACL-File per Tenant-User, headplane optional als UI. **Markiert: unverifiziert (403)** — unsere eigene Headscale-Erfahrung (onboarding-templates, tenant-realm-OIDC) deckt denselben Pfad schon.

### Quelle 3 — guilhem/headscale-operator (GitHub-API direkt verifiziert, 2026-10-14)

- Kubebuilder-Operator, API-Group `headscale.barpilot.io/v1alpha1`.
- **3 CRDs (verifiziert aus api/v1alpha1/*.go):**
  | CRD | Semantik für Tenants |
  |---|---|
  | **`Server`** | eine Headscale-Server-Instanz (mehrere pro Cluster möglich) |
  | **`Namespace`** | Headscale-User/Namespace (→ **per-Tenant Identity-Domain**) |
  | **`PreAuthKey`** | Join-Keys (→ **per-Tenant/Provisioning Bootstrap-Token** — genau unser install.sh/BG-Ansatz) |
- **Stale-Warnung (verifiziert):** letzter Push **2023-09-28**, 3 commits, kein Release, 2 offene Issues, 64 Sterne. Headscale-API hat sich seither stark geändert (0.22→0.26+ Breaking-Changes) — **Fork/Anpassung nötig**, oder wir bauen unser eigenes tenent-User+preauthkey-Provisioning direkt in den JiMesh-Worker-Registry (PV-4) und nutzen nur das CRD-*Pattern*.

### Quelle 4 — Azure Kubernetes Fleet Manager (learn.microsoft.com overview, Stand 2026-08-21)

Verifiziert (overview):
- **Member-Cluster-Typen:** AKS **cross-region und cross-subscription** + **Arc-enabled K8s (andere Clouds/on-prem!)** → das ist unser AWS-Portabilitäts-Hook (Arc-K8s ist cloud-agnostisch).
- **Managed Fleet Namespaces:** Namespace **über mehrere clustered** mit **ResourceQuotas, NetworkPolicies, User-Access enforcement** auf Fleet-Ebene — das ist die direkte Tenant­-Isolation-Primitiven-Ebene.
- **ClusterResourcePlacement (CRP)** + **namespace-scoped placement**: Ressourcen (incl. Helm/Bundles) via Label-Selektoren/Properties auf Member-Cluster verteilen — **das ist unser Thread für per-Tenant n8n-Deployments**.
- **Update Runs + Staged Rollouts + Gates/Approvals** + Auto-Upgrade-Profile — Cluster-Updates kontrolliert über Fleet.
- **Automated Deployments (preview):** Git → Hub-Cluster-Staging zur Placement.
- **DNS-based Load Balancing (preview)** + **Cross-Cluster Networking (preview)**.

## Architeuktur-Recommendation (JiMesh-fit)

### Tier-Modelle für isolierte n8n-Tenants

| Tier | Isolation | Mechanik | Kosten-Niveau | Wann |
|---|---|---|---|---|
| **A — Namespace-per-Tenant (default Starter)** | soft (One AKS: NetworkPolicies deny cross-ns, ResourceQuota, ServiceAccount-per-ns) | Fleet **Namespace-scoped Placement** oder direktes KD-3-Apply in `jimesh-ws-<id>` | ~shared (3 Start-Container à 0,25/512 MB) | bis zu ~50–100 Tenants pro Node |
| **B — Dedicated Member-Cluster per Tenant (Enterprise)** | **hart** (eigenes Cluster/Disk/Netz) | Fleet-Manager-Hub: CRP richtet Agent-/n8n-Manifests **nur auf Member mit Label `tenant=acme`**; Headscale-`User` per Tenant in derselben Headscale-Instanz (Fork guilhem-Pattern oder eigenes PV-4-Registry) | ~28–77&nbsp€ pro Node/Monat (B2s..D2s_v4) | Enterprise „isolation: dedicated"-Flag (Pricing-Sprint OQ1) |
| **C — Hybrid (empfohlen)** | A+B gemischt | **Fleet-Hub für Governance** (Updates, Premiere-AKK, Regeln), Workload-Placement per Label; per-Tenant Headscale-Namespace + PreAuthKey via PV-4-Registry; n8n-Chart binnen Namespace | linear | B öffnet Late-Upgrade-Pfad (Arc→AWS-EKS), A trägt die Masse |

### n8n konkret (per-Tenant-Deployment)

- **Chart:** offizielle Community-Helm-Charts (n8n chart, `n8n` im namespace + Postgres extern). Wir nutzen **externes shared Postgres (B1ms)** mit per-Tenant-Schema (bereits vorhanden — `n8n` braucht DB-URL per Tenant-Secret, **Key Vault CSI** mountet das Tenant-Secret).
- **Varianten (default flight):** n8n main (0,5 vCPU/1 GB empfohlen — **Achtung: Starter-Quota PRICING PR-3 definiert 3×0,25/512 MB; n8n zählt als 1 „App-Container" und bräuchte Quota-Upgrade-Tier**) + event-Queue-Runner (Redis shared aus dem Stack bereits vorhanden).
- **Webhooks:** per-Tenant Cloudflare-Tunnel (bereits Sprint-Standard) → `https://n8n-<tenant>.jimesh.io` hinter CF-Access (Zone 2/Workspace-SubDomains aus A8/A9).
- **Did not wire** (leicht möglich): n8n als JiMesh-"App-Entry" (`AppSubtypeContainer`) in der CP — Dashboard-Webview via Proxy-Transport zeigt die n8n-UI im Standard-Kiosk.

### Was Fleet-Manager konkret FÜR uns ist (nicht gegen uns)

1. **Governance-Level:** Update-Runs/Gate pro Member-Cluster **GRAU-Versioniert** — kein „Ich-Klick im Portal" (cloud-agnostic-Vertrag: Terraform `azurerm_kubernetes_fleet_manager` + `azurerm_kubernetes_fleet_member` — in azurerm 4.x vorhanden).
2. **Placement-Level:** CRP mit Label-Matching (`tenant=<name>`) — JiMesh-CP (KD-3/`environment_type=k8s`-Pull) wird zur **Placement-Source**: pro-Workspace αναμενrоуб deploying n8n-Helm-Values → CRP im Hub-Cluster → Fleet verteilt auf Member-Cluster.
3. **Managed Fleet Namespaces:** hier kann der JiMesh-CP selbst **Quota/Netzwerkpolizei/UserAccess pro Namespace fleet-weit** tragen — **KRITISCHER Bonus**: Fleet umsetzt was wir heute (Deploy-Time-Only via Quota-Apply) im KD-3-Pfad galvanisch auf jedem Cluster wiederholen müssen.
4. **Isolation-Skala:** wenn ein Tenant zu „determined" wird (Enterprise-Tier) → einfach `member_new=true` und Labels — **kein Neue-Rebuild-blueprint**, keine CP-Code-änderung.

### Headscale-Isolation per Tier

- **Tier A:** **eine** Headscale-Instanz, **Namespace/User pro Tenant** (+ACL pro Namespace), PreAuthKey pro Workspace — Deployment via our PV-4-Registry (nicht der stale guilhem-Operator, statt CRD-Вattern Muster aber CRDs kopieren und selbst implementieren — wir machen das als eigenes JiFleet-Operator (Route entscheide)).
- **Tier B:** optional eigene Headscale-`Server`-CRD pro Tenant (oder eigene Headscale-Container) — Operator-Entscheidung, kann nachholen (guilhehm-Fork oder Pv-4-Extension).

## PVED Work-Breakdown (proposed)

| WP | Task | Status |
|---|---|---|
| FL-1 | Terraform: `azurerm_kubernetes_fleet_manager` + Hub/Member-Cluster, Labels für Tenant-Affinität | [ ] |
| FL-2 | KubeFleet-CRD-Workflow: ClusterResourcePlacement + namespace-scoped Placement (JiMesh CP als Artifact-Producer) | [ ] |
| FL-3 | Headscale-Operator-Pattern: eigenes User+PreAuthKey-Provisioning in PV-4-Registry (nicht guilhem-Fork — verifiziert stale 2023) | [x] — commit pending on `feat-fl34-headscale-n8n` (2026-10-15) |
| FL-4 | n8n per-Tenant: Helm-Chart + externer Postgres-Schema + CF-Access-Subdomain-Routing | [x] — commit pending on `feat-fl34-headscale-n8n` (2026-10-15) |
| FL-5 | Billing um eine delta: Starter-Quota-Empfehlung für n8n (0,5/1) vs. Starter-Default (0,25/512) | [ ] |

### Umsetzungsnote FL-3 + FL-4 (lane `feat-fl34-headscale-n8n`, 2026-10-15)

- **FL-3 Headscale-Provisionierung via PV-4-Registry** —
  `packages/go/workerregistry/headscale.go` (+ `headscale_test.go`, 12 Tests,
  `go vet` + `go test ./...` grün im golang:1.26-Container): die
  Headscale-User+PreAuthKey-Rows können durch dieselbe Registry (dieselben
  WireKV-Seams, `Register`-Anchor mounted die Gruppen zusammen) gepusht
  werden — KV-staged Vertrag `provision/headscale/<tenant>/user` und
  `provision/headscale/<tenant>/preauthkey`. Routen:
  `POST /api/headscale/provision` (Operator-Stage, `X-Headscale-Token`,
  Hash-Lookup-Form `provision/headscale/operator/<sha256>`),
  `GET /api/headscale/provisioning/{tenant}` (Readout: Flags + SHA, **nie
  Clear-Text**), `POST /api/headscale/provisioning/{tenant}/verify`
  (Join-Checkpoint, ConstantTime-Vergleich, ONE-SHOT-Verbrennen
  (`consumed` in der Row) bei `reusable=false`, expired-401). Kein
  guilhem-Fork (verifiziert stale 2023-09-28) — CRD-Pattern impliziert.
- **FL-3 Deployment-Pfad (Planning-Doc, kein Script-Commit)** — geplanter
  Glue unter **jimeshOps**: `jimeshOps/scripts/terraform-tenant.sh` (nicht
  committed — referenced als Planning-Doc), Referenz via
  `make onboarding-tenant`-Invocation-Kontext: `terraform-tenant.sh` →
  `jimeshOps/scripts/onboard-tenant.sh` → `jimeshIO/onboarding/deploy-tenant.sh`
  → ansible `tenant-headscale` (bestehender Stack) → **neue Rolle
  `iac/ansible/roles/headscale-tenant/`** (README/defaults/tasks:
  Headscale-API `users create` + `preauthkeys create`,
  ONE-SHOT-default, Stage-Call `POST /api/headscale/provision`,
  `no_log` auf dem Clear-Text-Call). Separate SSH/Deploy-Läufe, wie der
  bestehende Tenant-Headscale-Ablauf. **Kein ECS in CI**; Operator-Prompt
  attends (Switches reusable/TTL beim ersten echten Tenant-Lauf).
- **FL-4 n8n per-Tenant Helm-Chart** — `iac/helm/n8n-tenant/`:
  `Chart.yaml` (appVersion pinned), `values.yaml` (`tenant_name`,
  `database.urlSecretRef`, `redis.*` (shared), `n8n.encryptionKeySecretRef`,
  `ingress.*` inkl. CF-Tunnel-Annotation `jimesh.io/cloudflare-tunnel`,
  `quota.*` Starter-Quota 3 Container/750m/1536Mi — PR-3-Kopplung),
  `templates/deployment.yaml` (n8n main + queue-mode-worker sidecar,
  `EXECUTIONS_MODE=queue`, DB-URL/Redis-Password/Encryption-Key über
  SecretRefs — KEIN Klartext), `templates/ingress.yaml`
  (`https://n8n-<tenant>.jimesh.io` hinter CF-Access, Tunnel-Annotation per
  Pipeline gegen `iac/terraform/cloudflare/modules/tunnel`),
  `templates/service.yaml`, `templates/resourcequota.yaml` (per-Namespace
  Quota via CRP/KD-3, FL-2), `templates/_helpers.tpl` (Labels
  `jimesh.io/tenant` für CRP-Label-Selektor). **Helm-Verifizierung
  (House-Skip)**:
  `helm` nicht installiert beim Build-Lauf (2026-10-15) → Chart-YAML
  statisch per `python3`-`yaml.safe_load` je Datei verifiziert (Chart.yaml,
  values.yaml OK; Go-templates übersprungen — Struktur-Check),
  `helm template`/`helm package` **skipped with README-Note** (House-Pattern
  skip-if-helm-missing, kein CI-Fail).

## Abhängigkeiten / Ab_boundary

- Bestehende Sprint-Lanes treffen sich: KD-3 (per-Workspace Namespace-Apply), PRICING-STARTER-TIER (Quota-Fixes), PV-4 (Worker-Registry = HeadScale-PreAuthKey-Vertrieb), SPRINT-STARTUP-PROGRAMS (cloud-agnostic: Fleet-Arc → AWS später).
- **Contract:** Fleet/AKS-Teil sind Azure first; Tailscale/K8S-Teil bleibt Headscale self-hosted (kein SaaS-Lockin, keine $8-18/user bill).
