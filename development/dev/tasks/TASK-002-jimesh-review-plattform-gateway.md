# TASK-002 — jimesh-Review: Plattform & Gateway

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Speist:** `docs/research/R20-jimesh-reuse-review.md` §Ergebnisse, Epic 15
> **Repos:** `/home/ji/projects/jimesh-mirror/` → `jimesh-cloud` (52), `sc-gateway` (25), `sc-api` (34), `jimesh-api` (8), `sc-appconfigs` (115), `sc-control-plane` (13), `sc-sdk-ts` (28), `sc-data` (18), `sc-chat` (18), `examples-nestjs` (24), `jimesh-bucket-sdk` (12, archiviert)
> **Ziel-Mapping:** Roadmap §2 (Access Policy), §4 (Credits), E8 (Multi-Tenant) · API_DOCS-Drift (Sprint 20 WP0) · Epic 14 (DB/CDC)

## Auftrag

- [x] Per-Tenant-Provisioning aus `sc-control-plane` analysiert (idempotente Schritte, Reconciler-Reihenfolge, Render-for-Review-Muster)
- [x] Per-Tenant-Routing + Policy-Gates aus `sc-gateway` sichtiert (3-Stufen-Filterkette, DPoP-Verify, Tenant-Binding)
- [x] Tier-Budget-Seed `sc-default` geprüft: **leer (0 Dateien)** — Roadmap §4 hat keine Vorlage
- [x] `jimesh-api` Contract-CI gelesen (redocly lint + openapi-diff Breaking-Change-Gate, CI-Datei vorhanden)
- [x] GitOps ohne Secrets aus `sc-appconfigs` analysiert (Config/Secret-Trennung, Context-Guard, Promotion-Flow)
- [x] `jimesh-cloud` PLAN.md/ROADMAP.md vs. Realität (Bootstrap-Skripte) — Drift notiert
- [x] DB-Discovery/CDC gesucht: **Negativbefund** — nichts in diesen Repos
- [x] Leere Repos erwähnt: `sc-frontend`, `sc-billing`, `st-1`, `skill-docs` (+ `sc-default`) — jeweils 0 Dateien
- [x] „Nicht portieren"-Liste geführt

## Regeln

Globale Regeln + Ergebnis-Format: `docs/tasks/README.md`.
Lesebudget ~30 Dateien/Repo (README → Struktur → Config-/CI-Dateien → Kernmodule).

## Ergebnis

## Reusable für JiMesh

| Fund | Fundstelle (Repo/Pfad) | JiMesh-Problem (WP/Roadmap) | Aufwand | Warum wertvoll |
|---|---|---|---|---|
| 3-Stufen-Gateway-Kette: jwt-authn (`claim_to_headers` → `x-tenant-id-verified`/`x-actor-id`/`x-tenant-tier`/`x-env`) → DPoP-Verify → Tenant-Binding | `sc-gateway/envoy/filters/jwt-authn.yaml`, `dpop-verify.lua`, `tenant-routing.yaml` | WP1, §2 Access Policy | M | Semantik (nicht Config) übertragbar: Go-Gateway validiert Token, streift Client-Hints, stempelt verifizierte Identität — „Agent wählt seine Identität nie selbst" |
| DPoP-Verify-Details: `cnf.jkt` = JWK-Thumbprint muss zum Proof-JWK passen; htm/htu-Binding (Query-Strip per RFC 9449 §4.3); iat ±30s; 401 mit `WWW-Authenticate: DPoP error=...` | `sc-gateway/envoy/filters/dpop-verify.lua` | WP1 | S | Fertige Prüf-Reihenfolge + Fehlercode-Konvention |
| M2M-Bindung: Bearer-over-mTLS mit `cnf.x5t#S256` = TLS-Leaf-Cert-Thumbprint (RFC 8705) | `sc-gateway/envoy/filters/jwt-authn.yaml` (Header-Kommentar) | WP1 | S | Token-an-Zertifikat-Bindung für JiMesh' M2M-Pfad |
| JTI-Dedup als kanonisches Primitiv: ein Lua-Script (`SET NX EX`, fail-closed TTL 1..600), alle Consumer via EVALSHA, SHA liegt in Vault; eigene Doku gegen Drift | `jimesh-cloud/bootstrap/redis-scripts/dpop-jti-dedup.lua`, `docs/dpop-jti.md`, `load-redis-scripts.sh` | WP1 Replay-Guard, §4 Budget-Deduct | S | „Ein Primitiv, alle Consumer" verhindert Drift — gilt genauso für Budget-Abbuchung (TASK-001-Fund `billing-deduct.lua`) |
| OpenAPI-Contract-CI: redocly lint (`security-defined: error`, `operationId: error`, …) + `openapi-diff --fail-on-incompatible` pro Domain-File gegen Base-Ref auf PRs | `jimesh-api/.github/workflows/lint.yml` + `.redocly.yaml` | API_DOCS-Drift (WP0-Erbe) | S | Direkt auf JiMesh' 170-Routen übertragbar — PRs brechen bei Breaking Changes, bevor API_DOCS wegläuft |
| TenantGuard: liest NUR den Gateway-Header (Name via `GATEWAY_TENANT_HEADER` konfigurierbar), Regex-Validierung, `@Public()` nur für Health | `sc-api/src/tenant/tenant.guard.ts` | WP1, §2 | S | Serverseitiges Gegenstück zur Gateway-Kette; nie Tenant vom Client |
| RFC 7807 `application/problem+json` als Fehlervertrag (type-URI-Namespace, `upstream`-Extension, `instance` = Pfad) | `sc-api/src/common/problem-details.filter.ts` | API-Konsistenz | S–M | Einheitliches Fehlerformat statt Ad-hoc-JSON im JiMesh-Gateway |
| Admission-Regeln als Scanner-Vorlage: `allowPrivilegeEscalation=false`, `runAsNonRoot`, Resource-Limits, Role-Label-Pflicht, **Hardcoded-Secret-Deny in env** („use Vault injection") | `sc-appconfigs/kyverno/cluster-policy-saitscloud.yaml`, `constraints/templates/*.yaml`, `sc-data/policy/base.rego` | WP8 Scanner | S | Übersetzungstabelle nach Compose: `security_opt: no-new-privileges`, `user:`, `deploy.resources`, env-Secret-Verbot |
| Role-driven Egress-Allowlist: SSO-Rolle → Dienst+Port (trader → trading 8080, order-manager 9090, analytics 8006 GET/HEAD-only per L7) | `sc-appconfigs/tenants/_template/network-policies/sso-roles/05–07` | WP5 Egress, §2 | M | Modell „Rolle bestimmt Ziel-Allowlist"; L7-Methodenfilter geht in nftables nicht — ehrlich L4-only für v1 |
| Clusterwide-Cross-Tenant-Deny „Membran" (ingressDeny/egressDeny auf Label-Mismatch + same-ns-only-Ergänzung) | `sc-appconfigs/tenants/_template/network-policies/04-clusterwide-cross-tenant-deny.yaml` | E8 (nur falls Multi-Tenant) | M | Isolations-Membran-Konzept für später |
| OPNsense per API: VLANs, DHCP-Scopes, statische Leases, Unbound split-horizon, WireGuard, Regeln — deklarativ | `sc-appconfigs/terraform/opnsense.tf` (Provider `browningluke/opnsense`) | WP6 optionaler FirewallProvider | M | Arbeitsreferenz für die im WP6 genannte OPNsense/pfSense-Implementierung |
| Fehlziel-Schutz in Deploy-Skripten: Lauf wird verweigert, wenn aktiver Context ≠ erwarteter Context (Env-Pflicht) | `sc-appconfigs/scripts/bootstrap-tenants.sh` (B3-Fix) | Deploy-Engine, Sprint-19-Lektion | S | Gegenstück: `JIMESH_TARGET_HOST`-Pflicht-Abgleich vor jedem SSH-Deploy |
| Render-for-review-then-apply + idempotente, geordnete Provisioning-Schritte (Namespace→Policies→Vault→Registry zuletzt) | `sc-control-plane/src/sc_control_plane/reconciler.py` | Deploy-Engine, WP3 HITL | S | Plan/Manifeste erst zur Operator-Review ablegen (`/tmp/sc-cp-render/`), `APPLY=true` danach |
| Vault-Operator-Bootstrap: probe → init 5/3 → chmod 600 → unseal → Bootstrap-Token revoken; Key-Verteilung out-of-band („No secrets via Discord") | `jimesh-cloud/bootstrap/init-vault.sh` + `revoke-bootstrap-token.sh` | Mandat 9, Deployment | S | Direkt auf JiMesh' Einzel-Vault-Container übertragbar |
| Bucket-per-Tenant, erstellt NUR von der Provisioning-Schicht (Service erzeugt nie selbst, `NoSuchBucket` → 500); Isolation über Bucket-Grenze, nicht Key-Präfix | `sc-data/README.md` | Epic 14 Provisioning-Kopplung | S | „Projekt deklariert Ressource → Deploy-Engine legt an" hat hier einen laufenden Präzedenzfall |

## Nicht portieren

| Was | Warum nicht |
|---|---|
| Envoy-Config + Lua-Filter als Artefakte | JiMesh-Gateway ist Go — Semantik und Reihenfolge übernehmen, Config neu bauen |
| ArgoCD/ApplicationSet/vCluster-GitOps-Maschinerie | K8s-only; JiMesh = Compose+SSH. Nützliche Reste: Context-Guard, Promotion-Idee (für Single-Host überdimensioniert) |
| Clerk-JWKS-Abhängigkeit im jwt-authn (`iss: clerk.saits.cloud`) | JiMesh issued eigene Session-Tokens |
| OPA Gatekeeper/Kyverno als k8s-Admission | JiMesh hat kein Admission — Regeln wandern als WP8-Compose-Scanner-Regeln |
| Ozone/MongoDB/Storage-Terraform | Betriebslast ohne JiMesh-Bedarf (Volumes + geplanter DB-Layer reichen) |
| NestJS-BFF (`sc-api`) als Code | Muster ja (TenantGuard, problem+json), Stack nein (JiMesh = Go-Gateway) |
| `{tenant}`-Subdomain-vHost-Routing (`api.{tenant}.saits.cloud`) | JiMesh hat kein Subdomain-per-Tenant-Modell (E8 offen) |

## Drift/Überraschungen

* **Korrektur zu TASK-001:** Kyverno/OPA-Policies existieren doch — aber im GitOps-Repo `sc-appconfigs`, nicht in den Security-Repos. Split-Brain: die Security-Repos dokumentieren Scope, den sie nicht besitzen.
* **`sc-control-plane` ist Phase-0:** Reconciler-Schritte 2–4 sind Stubs, die Manifeste rendern und loggen (README + Code sagen das ehrlich). Einen laufenden Provisioner kann JiMesh nicht kopieren — nur das Design (Reihenfolge, Idempotenz, Review-Gate).
* **Filter hinkt der Doku hinterher:** `dpop-verify.lua` nutzt das „Sidecar schreibt jti"-Muster, während `docs/dpop-jti.md` das kanonische EVALSHA-Primitiv als Follow-up-PR für alle drei Consumer ausweist.
* **Spec-Realitäts-Lücke:** `PLAN.md` (614 Zeilen) + `ROADMAP.md` beschreiben die Vollplattform (vCluster, Ozone, MongoDB, Kafka-Observability); realisiert sind v. a. Bootstrap-Skripte + Gateway-Config + Microk8s-Install. Die Lücke ist groß und ehrlich benannt (Phase-0-Status in den READMEs).
* **Leere Repos bestätigt:** `sc-default`, `sc-frontend`, `sc-billing`, `st-1`, `skill-docs` — 0 Dateien. Damit hat Roadmap §4 (Credits/Tier-Seed) keine Vorlage im Bestand.
* Der OPNsense-Provider referenziert `ji-podhead/opnsense-helper` (Operator-eigenes Projekt); echte Infra-IPs (rescue/engine, Tailscale-CGNAT-Bereich) stehen im Repo.
* `jimesh-bucket-sdk` (als archiviert geführt) hat trotzdem funktionierenden Client + Tests (ETag/`If-None-Match`) — SDK-Muster ggf. für einen späteren JiMesh-Storage-Layer.

## Offene Fragen

1. WP1: Implementiert der JiMesh-Gateway die Kette in genau dieser Reihenfolge (Token-Verifikation → Proof/Binding → Identitäts-Binding + Audit) als Middleware-Pipeline — und wohin gehört der jti-Replay-Guard (Redis EVALSHA im Gateway selbst)?
2. API_DOCS-Migration: eine OpenAPI-Spec für alle 170 Routen oder per-Domain-Files (wie `jimesh-api`)? Wer zieht API_DOCS.md → `openapi/` durch (S-Aufwand mit CI-Gate)?
3. WP5: Reicht L4-Egress (IP/Port-Allowlists pro Agent-Rolle) für v1, oder braucht JiMesh L7-Methodenfilter (nur über Proxy — welche Betriebslast auf der VM)?
4. Epic 14: Wird „nur die Provisioning-Schicht erstellt Ressourcen" (sc-data-Präzedenzfall) als festes Muster übernommen — auch für DBs (Projekt deklariert Postgres → Deploy-Engine legt an, Credential via Vault)?
5. WP6: Ist die OPNsense-Appliance des Operators für den optionalen FirewallProvider erreichbar (API-Keys, Netzpfad), oder bleibt es nftables-only in v1?
