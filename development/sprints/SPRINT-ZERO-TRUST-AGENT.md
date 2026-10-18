# SPRINT-ZERO-TRUST-AGENT — Agent-Identität ohne Keys (IMDS / Entra-WIF / SPIFFE-Bridge)

**Datum:** 2026-10-15
**Operator-Research:** /home/ji/projects/jimesh/docs/zero_trust_research.md (der Copy lebt auch in jimeshIO docs/research/zero-trust.md); Verbatim-Kerne:
- „Niemals vertrauen, immer überprüfen" — jede Anfrage, kein einmaliges Boot-Token
- **Weg A (Azure-native)**: Managed Identity + IMDS + DefaultAzureCredential-Bibliothek, kein Key-Code
- **Weg B (SPIFFE)**: On-Prem-Agent über SPIRE-SVID (JWT-SVID) → Entra-Workload-Identity-Federation → Azure-Token → Managed-Resource
- **Hetero-Fall (On-Prem ↔ Headscale ↔ AWS-EKS)**: Headscale-Tunnel (Netzwerk) + OIDC/SPIFFE (Identität) + K8s-RBAC (Autorisierung) — EKS API Private-Only, IAM-frei, Key-Sprawl-frei

## Schon implemented (auf Basis-Bracht, mit Beweisen)

| Primitiva | Status |
|---|---|
| **IMDS-Pattern (Weg A)**: 3-Orte bereits in-tree — secrets-wrapper keyvault (bda64d2), datalaked adls-Sink (434ee640), ES-Payment-handoff card-verify-attestation (1c4e553) | ✅ |
| **Per-Ressource Claims**: AG-1 (roles tenant_id/agent_role/allowlist_scope + confidential-Clients) | ✅ a1b200d9 |
| **Deny-by-Default Gateway + RM35-Audit**: AG-2/AG-3 | ✅ a1b200d9 |
| **Netzwerk-Enforcement**: AG-4/AG-5 NetPol deny-all-ingress + egress-office-AzureCloud-Whitelist | ✅ e8724b87/43488c11 |
| **One-shot Tokens/Rotation**: PV-4 workerregistry (KV-Hash + sha256-constant-time) | ✅ bda64d2 |

## Lücken (implementieren diese Waves)

| Nr | Task | Status |
|---|---|---|
<<<<<<< HEAD
| **ZTA-1** | **Spiiffe-Brücke (WEg B)**: SPIRE-Agent-Deployment im unsere Fleet + Entra-Workload-Identity-Federation-Credential (SPIFFE-ID ⟷ Federated-Credential) via Terraform — azurerm-federated-identity-credential (orb Azure Arc-K8s-Exit-Hook per SPRINT-STARTUP-PROGRAMS cloud-agnostic pattern) | [ ] |
| **ZTA-2** | **Keycloak-↔-EKS-OIDC-Bridge** (Weg A auf Headscale↔AWS-Fall): EKS API-Server erhält OIDC-Issuer-URL auf Keycloak realm (jimesh-realm — agents-realm-type resources) + per-tenant RoleBindings (AG-1 claims via sub) — mapping doc column (EKS akan mit spiffe://ihre-firma.de/ns/agent-zero/ns/<agent- adecu>") wie im Research-Doc-Example | [ ] |
| **ZTA-3** | **Headscale-ACL-Egress-Pin** — nur der EKS-API-Endpoint-Port außerhalb der On-Prem-Agenten: headscale-<tenant>-D ACL-Route (port-Whitelist 443 TCP on don DNS-pinned IP), via jimeshCmd headscale-subject (Journal) | [ ] |
| **ZTA-4** | **JIT-/Risk-Score** — Anomaly-Watch (AG-3) erweitern um Risk-Score-Feed (SM8-Anomaly 10-fails-escapes) → trigger auf Istio/AuthzPolicy (held komplett OSS-Faio w/ OPA) parallel Töö-Soft | [x] feat-zta456-risk-siem — `internal/gateway/agent_risk.go`: pure `riskScore(agentRoleClaim, routeId)` 0..10, hartcodierte Content-basierte Route-Tabelle (⑥1 list-reads / ⑥3–4 deploy-redeploy-undeploy / ⑥5 admin-reads / ⑥8 admin-tamper / ⑥10 cross-tenant-reach-Spike), RM35-Zeilen (action `agent_risk`) mit per-request Role-Claim + 900s AG-1-Token-TTL; OPA-ready (annotiert, blockiert nie). Tests: `internal/gateway/agent_risk_test.go` |
| **ZTA-5** | **Audit-to-SIEM wiring** — RM35-Audit-Zeilen automatisiert in SIEM verzichten (via OpenSearch-SIEM empreit: sink.go per-topic już), per-operator-Sequence linked (Sentinel nur Enterprise-Opt-in via budget budget doc) | [x] feat-zta456-risk-siem — `internal/audit_siemsink/`: `JIMESH_AUDIT_SIEM=sink|none` (nur „sink" armt, fail-closed), Feed via store-ObserveAdminAudit-Hook (composition root gateway.New), `_bulk`-ndjson byte-exact datalaked-Opensearch-Grammar zur jimesh-siem-indexer-Loopback-Route `https://127.0.0.1:19200` (SPRINT-229), Daily-Indices `jimesh-audit-rm35-*`, deterministische Content-Hash-`_id`s (idempotent), NO-PLAINTEXT-Contract (before/after_diff verlassen nie die Trail-Tabelle). Creds EXPLIZIT via `JIMESH_AUDIT_SIEM_*` (.env.example + deploy/backend pass-throughs). Tests: `internal/audit_siemsink/sink_test.go` |
| **ZTA-6** | **SPIFFE-LEAK-Protect** — bei mTLS-S监局 der Agent-environment-and-Resource-reliability: per-Ressource Alert wenn Anfragen fireopen in cross-tenant 403-Deny-Zone ist — firmwareBUMs oder der Operator-Docs-Hinweis | [x] feat-zta456-risk-siem — `internal/audit_siemalert/`: Mock-only In-Memory-Sliding-Window (per-Actor), hartcodierte Konstanten ≥5 Denies/60s → RM35-Annotation (action `agent_risk_alert`, Outcome `annotation: jimesh.io/alert=cross-tenant-spike`) + Operator-Loglinie, KEIN Auto-Blocking (403 bleibt 403), Window/Cooldown-Expiry re-annotiert laufende Bursts. Fed aus allen 403-Deny-Quellen des AG-Gateways (Firewall-Deny-Branches + Handler-403). Tests: `internal/audit_siemalert/alert_test.go` |
=======
| **ZTA-1** | **Spiiffe-Brücke (WEg B)**: SPIRE-Agent-Deployment im unsere Fleet + Entra-Workload-Identity-Federation-Credential (SPIFFE-ID ⟷ Federated-Credential) via Terraform — azurerm-federated-identity-credential (orb Azure Arc-K8s-Exit-Hook per SPRINT-STARTUP-PROGRAMS cloud-agnostic pattern) | [x] |
| **ZTA-2** | **Keycloak-↔-EKS-OIDC-Bridge** (Weg A auf Headscale↔AWS-Fall): EKS API-Server erhält OIDC-Issuer-URL auf Keycloak realm (jimesh-realm — agents-realm-type resources) + per-tenant RoleBindings (AG-1 claims via sub) — mapping doc column (EKS akan mit spiffe://ihre-firma.de/ns/agent-zero/ns/<agent- adecu>") wie im Research-Doc-Example | [x] |
| **ZTA-3** | **Headscale-ACL-Egress-Pin** — nur der EKS-API-Endpoint-Port außerhalb der On-Prem-Agenten: headscale-<tenant>-D ACL-Route (port-Whitelist 443 TCP on don DNS-pinned IP), via jimeshCmd headscale-subject (Journal) | [x] |
| **ZTA-4** | **JIT-/Risk-Score** — Anomaly-Watch (AG-3) erweitern um Risk-Score-Feed (SM8-Anomaly 10-fails-escapes) → trigger auf Istio/AuthzPolicy (held komplett OSS-Faio w/ OPA) parallel Töö-Soft | [ ] |
| **ZTA-5** | **Audit-to-SIEM wiring** — RM35-Audit-Zeilen automatisiert in SIEM verzichten (via OpenSearch-SIEM empreit: sink.go per-topic już), per-operator-Sequence linked (Sentinel nur Enterprise-Opt-in via budget budget doc) | [ ] |
| **ZTA-6** | **SPIFFE-LEAK-Protect** — bei mTLS-S监局 der Agent-environment-and-Resource-reliability: per-Ressource Alert wenn Anfragen fireopen in cross-tenant 403-Deny-Zone ist — firmwareBUMs oder der Operator-Docs-Hinweis | [ ] |
>>>>>>> origin/main
NEVER design verification-doc (per operator doc's claim "Real-Live-Sfälle"), wrong only im Doc-docs, anything live/deb8-мед needed ist EF-1.-4 und ef-4.3-с-с.

## Verbindliche Constraints

- **Keine Keys im Code** — alle Claims via IMDS-fedork Joint-Route patterns (A7 pattern), alle tokens kurzlebig ≤15min
- **JIT∤Risk-Score alerts** — per-Operator/AG-3-Stream mit hash-flying rolle Table (hard-coded pattern in-f-tree)
- **Cross-Tenant-Isolation**: kein Agent erreicht verwandte Tenant-Scope Resources ohne specifikten AG-Role-Claim — zł管理系统 den AG-Lanes-Pfetch (deny-by-default)
- **CI-Integration**: ZTA-1/2 Nur via Terraform-Modules — no ClickOps (Operator-Direktive) — Module in /iac/terraform/azure/fleet (bundles from research doc FLEET-N8N).
- Niemand sieht je klartext-Credential in Repo-Source (audit-zeilenThey readnesday Jest), wild или Transit-Log-Rote — tests only.

## Cross-Refs

- AGENT-IAM-SECURITY-MAPPING (jimeshOps 8210eea), SECURITY-AUDIT-DOC (ead7882), BUDGET-MATRIX (jimeshOps ab236a5), FLEET-N8N-TENANT-ISOLATION (25a9846), SPRINT-STARTUP-PROGRAMS (1495e00 cloud-agnostic quit-hook to Arc)

## ZTA-1..3-Flips (Beweis-hashes, research-doc-Session-Audit-Stil)

Branch `feat-zta123`, Validate-only (keine Secrets, keine apply):

| Artefakt | Beweis (sha256) |
|---|---|
| iac/terraform/azure/federation/main.tf | 7b3e00725dc23712ed77a4e1ba312024265d4b8dc7b9472004659309d4daa114 |
| iac/terraform/azure/federation/variables.tf | 4c8102bf3df4cf56c9d5a7b4ffe259fe90b7946c2c1972c1224fb4facf5a515d |
| iac/terraform/azure/federation/outputs.tf | 3836ac53209007fb0196b328e98d5c6b04be3cec8f047f2b78674dd90e705831 |
| iac/terraform/azure/federation/versions.tf | 59e5302c873432a247271cd35ea684900f667203be2322c25aeaae2bc098130e |
| iac/terraform/azure/federation/README.md | 52ed30eadcd26b9455c912e39bc586d71f1a97504442709d40238f65c6397b64 |
| iac/ansible/roles/keycloak-eks-oidc (defaults+tasks+README) | 01f852eb…, 1300117a…, 84f17788… (siehe git show --stat) |
| iac/ansible/roles/headscale-acl (defaults+README) | cbfb3a99…, 97ecba95… |

Schema-Verifikation: `terraform providers schema -json` am Plugin-Cache
azurerm 4.81.0 — REQUIRED: name/audience(list)/issuer/subject; optional+
computed: parent_id/resource_group_name/user_assigned_identity_id(id); KEIN
tags-Attribut (deshalb aus dem Modul gefallen). Tests: terraform fmt -check
recursive OK, terraform init -backend=false + validate OK, YAML
python3-safe_load 3/3 OK.
