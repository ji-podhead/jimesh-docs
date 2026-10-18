# SPRINT-AGENT-IAM-FIREWALL — Agent-Service-Accounts + Gateway-Wrapper (Deny-by-Default)

**Status:** 📋 GEPLANT (verbindliche Architektur; Implementierung offen)
**Datum:** 2026-10-14
**Operator-Input (wörtlich):**
> „das größte problem sehe ich mit access controll für agents und berechtigungen und wir müssen für alles ja nen wrapper schreiben ich hoffe das haben wir schon gemacht das alles durch unsere agent firewall geht usw und man dann nicht einfach alle services zugreifen kann usw"

## Ziel

Jeder **Agent** (KI-Agent / Geräte-Service / externer Bot) authentifiziert sich gegen die CP
mit **scoped identity + capability claims** — und der **Agent-Firewall-Layer (Gateway)** erlegt
per Rolle durch **Deny-by-Default** seine Erlaubnislisten durch. Kein Agent kann „einfach alle
Services" erreichen; RM35-Audit schreibt jeden Agent-Call.

## Schon da (auf eingesetzt, mit Beweis)

| Statement | Status |
|---|---|
| One-shot worker-tokens + refresh (PV-4, `packages/go/workerregistry`) | `bda64d2` ✓ |
| Internal OPA (policy) + RM35 audit | (RM35 committed `8ee85e43`/`feat-admin-audit-log`) ✓ |
| Cookie-Cookie + CSRF + Step-up (H1, H3) | `c8d8826c`/`768ddd9b` ✓ |
| Container egress-gates (nftables) + gVisor | KD-3 ✓ |
| MCP-server (mark3labs/mcp-go) | library ✓ (external collab-model gefixt in JiMesh-Code) |

## Missing (in dieser Lane umgebaut wird)

| Code-Name | Was |
|---|---|
| **AG-1** | **Agent-Service-Accounts** im Keycloak: realm-roles per Agent-Typ, Jargon-Claims ins JWT sub: tenant_id, agent_role, allowlist scopes. Keycloak-Client (confidential) pro Agent-Klasse; Token-TTL 15 min Refresh 24 h; **kein** Legacy-Flow-Punchthrough |
| **AG-2** | **Agent-Gateway-Wrapper** in CP: `internal/gateway/agents.go` — *Deny-by-default Route table* pro agent_role (`observer`/`deployer`/`operator-buddy`…), scoped-seam: per-Role-Erlaubnislisten (HARDCODED im Code-Comment als Tabelle), role-claims aus dem Agent-JWT; falsche claims → 403 + RM35-Audit-Row |
| **AG-3** | **Agent-Rate-Limits + Anomaly-Watch**: per-Agent-Tokencap (requests/min/max-fail-escape), per-agent service gate (Suspicious-Muster → Token-Revoke via status) — RM35-Audit rows |
| **AG-4 / PR-4** | **Fleet-Netzwerk-Isolation**: NetworkPolicy per workspace-Namespace: default-deny in/out, egress **whitelist** (nur `egress-capable` Schnittstellen, clusters DNS + key vault URL), Fleet-Policy-Publishing via FL-2 |

## Work Packages

| Nr | Task | Status |
|---|---|---|
| AG-1 | Keycloak-Realm-Domain (agent realm roles + claims pipeline) + Config-Datei (deploy/keycloak) | [ ] |
| AG-2 | Gateway `internal/gateway/agents.go` — Agent-Role Token-Validation from within CP + per-role allowlist Route routing (denied paths list per Role); RM35-Audit | [ ] |
| AG-3 | Token-cap / rate-limit / Anomaly cuts (KV-Standards + status monitor mock), RM35-Audit logs — Flag `JIMESH_AGENT_GATEWAY=on|off` | [ ] |
| AG-4 | NetworkPolicy-Enforcement in KD-3-Deploy-Pfad + Fleet-Policy-Bridge (NetworkPolicy CRs pro Namespace don't per deploy) | [ ] |
| AG-5 | Agent-Firewall — **cluster**-weit also **Host-Isolation auf Fleet nodes**: Net-Polity die gleiche und pods-level lockdown / upstream DNS | [x] — Branch `feat-ag5-host-isolation`, Beweis-Commit `43488c11` (JiMesh2): 2 zusätzliche NetworkPolicies je Workspace in `src/backend/internal/deploy/k8s_deploy.go`, je Flag (beide default off): `JIMESH_HOST_ISOLATION=on` → `jimesh-ws-node-egress` (Egress-Lockdown: DNS nur cluster-intern per bare NamespaceSelector ohne IPBlock — kein externes Internet/Host-Ping, AzureCloud-Hop 443/TCP→egress-office bleibt), `JIMESH_FLEET_HOST_ISOLATION=on` → `jimesh-ws-fleet-host` (Tenant-only Ingress: deny-by-default alle Cross-Namespace, nur eigener Service-Port für eigene Pods, Selektor `jimesh.io/workspace-id` — Clusterwide-Tenant-Intersection, FL-2-Annotation). Operator-Zitat (dokumentiert im Doc-String): der Agent-Gateway schützt die API-Ebene per Rolle, die beiden Policies schützen die Netzebene darunter — "no agent/host talks cross-tenant or past the cluster edge". |

## Verbindliche Constraints

- Deny-by-Default: unbekannte Agent-Claim-Shape → 403 + RM35-Alert (kein fallback-Auto-Upgrade)
- Agent-Token **keine Redirect-to-Sticky-Session**: Per-Request-Verifizierung, 15-min TTL
- Per-role allowlist HARDCODet in gateway/agents.go (Code Legitimate), NOT data-driven remotely
- rm35-Audit für jede Agent-Aktion schreibt eine Log-row kein Bodies
- RM35-Alert-Route kann von INCIDENT-Handler manuell gestroggen werden (kein auto)

## Abhängig von

- PV-4 (worker token Muster = fast-agent token)
- Keycloak realm-template (agent roles)
- Fleet-Cluster (FL-1)
- SPRINT-PROVISION-ONPREM-CLOUD-K8S (KD-3 deploy path + NetworkPolicy)

## Cross-Refs

- Budget: `jimeshOps/docs/budgets/BUDGET-MATRIX-2026-10-14.md` (Databricks/Sentinel/Defender-Add-on-Kalkulation)
- Defender-Übersicht-Doc: `jimeshOps/docs/architecture/AGENT-IAM-SECURITY-MAPPING.md` (`8210eea`)
- Fleet-Research: `jimeshIO/docs/research/FLEET-N8N-TENANT-ISOLATION.md`
