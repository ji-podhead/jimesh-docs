# TASK-001 — jimesh-Review: Security & Identity

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Speist:** `docs/research/R20-jimesh-reuse-review.md` §Ergebnisse, Epic 15
> **Repos:** `/home/ji/projects/jimesh-mirror/` → `jimesh-auth` (17 Dateien), `jimesh-security` (9), `jimesh-security-` (34), `jimesh-sync` (26)
> **Ziel-Mapping:** Sprint 20 WP1 (Identitätskette), WP5 (Egress), WP8 (Scanner) · Roadmap §1 (Agenten ohne Zugangsdaten), §2 (Access Policy) · Mandat 9 (Secrets-Injektion)

## Auftrag

- [x] M2M-Identität ohne statische Tokens dokumentieren (Vault PKI/AppRole, mTLS, DPoP, tenant_id-Ableitung)
- [x] Übertragbarkeit auf JiMesh' Docker+SSH-Welt bewerten (CA/Sidecar/Agent nötig, Clerk entfällt)
- [x] Cilium-NetworkPolicy-Muster auflisten und auf nftables-Übersetzbarkeit prüfen
- [x] Falco-Rules gesichtet; Kyverno/OPA geprüft (Negativbefund — keine Policies im Repo)
- [x] Redis-SSoT aus `jimesh-sync` analysiert (Schema + 7 Lua-Atomic-Ops)
- [x] Vault-AppRole-Bootstrap gegen Mandat 9 gehalten
- [x] DB-Discovery/CDC-Patterns gesucht (Negativbefund — nicht vorhanden)
- [x] „Nicht portieren"-Liste geführt

## Regeln

Globale Regeln + Ergebnis-Format: `docs/tasks/README.md`.
Lesebudget ~30 Dateien/Repo (README → Struktur → Config-/Policy-Dateien → Kernmodule).

## Ergebnis

## Reusable für JiMesh

| Fund | Fundstelle (Repo/Pfad) | JiMesh-Problem (WP/Roadmap) | Aufwand | Warum wertvoll |
|---|---|---|---|---|
| Vault PKI (Root 10y + Intermediate 5y, Leaf-Certs 10m–24h) + 4 AppRoles mit TTL-Whitelist; `agent-runtime`: 10m/1h, nur `tenant/+/api-keys/llm` read | `jimesh-security-/vault/templates/approle-policies.yaml`, `docs/vault-pki-approle.md` | §1 Agenten ohne Zugangsdaten, WP1, Mandat 9 | M | Agent-Identität = kurzlebige Rolle statt statischem Token; JiMesh betreibt bereits Vault (Sprint 19) — AppRole-Pattern direkt adaptierbar |
| Harte Policy-Leitplanken als Review-Gate: kein `*`, `tenant/+/`-Segment-Matcher, kein sudo/root-Issuance, TLS 1.3, Audit auf stdout | `docs/vault-pki-approle.md` („Hard guarantees") | WP1 Policy-Design | S | Copy-feste Regel für JiMesh' eigene Vault-Policies |
| Idempotenter PKI-Bootstrap: 6 Einzelschritte, jeder mit eigenem Pre-Check | `jimesh-security-/vault/templates/pki-mount-job.yaml` | Mandat 9, Deployment | S | Muster für JiMesh' Vault-Bootstrap-Skript (als Shell über SSH statt Helm-Job) |
| M2M: `tenant_id` aus mTLS-Cert-SAN, **nie** aus Body/Query („tenant-isolation bypass") | `jimesh-security-/docs/jwt-claims-schema.md` | WP1 Identitätskette | S | Exakt die zweite Bindung (Container↔Identität), die WP1 bauen will |
| DPoP-Pflicht am Ingress (htm/htu/iat/jti/ath + Redis-jti-Replay-Guard); `X-Tenant-Id` NUR vom Ingress aus verifiziertem JWT, nie client-supplied | `docs/jwt-claims-schema.md`, `jimesh-auth/README.md` (Canonical headers) | WP1, §2 Access Policy | M | JiMesh-Gateway IST der Ingress — Header-Ableitung + Replay-Guard dort direkt umsetzbar |
| JTI-Deny-Set mit TTL ≥ max. JWT-Restlaufzeit (Revocation, Safety-Net auch bei fehlender Session) | `jimesh-sync/lua/session-invalidate.lua` | WP1 Session-Sperrung, WP3 Freeze Stufe 1 | S | „Token sperren" ohne stateless-Verlust |
| Lua-Atomic-Muster: Check+Mutate+Audit in einem EVAL, kein Partial-State, strukturierte Return-Codes (`INSUFFICIENT_FUNDS` ohne State-Change) | `jimesh-sync/lua/billing-deduct.lua`, `quota-check.lua` | §4 Credits/Budgets | S | Budget-Abbuchung + Audit-Event atomar; komplementiert JiMesh' Redis-Streams (Postgres bleibt SSoT) |
| Quota-Hash `used/limit/window_seconds/resets_at` mit server-seitiger Zeit | `jimesh-sync/schema/control-plane.md` | §2/§4 Rate-Limits | S | Fertiges Fensterrollover-Design |
| Falco-Baseline-Regeln: Secret-File-Read durch unerwarteten Prozess, kubeconfig/Credential-Read, ACL-Password-Grep, Egress zu Nicht-Allowlist, Miner-Indikator — mit MITRE-Tags + Priority-Disziplin | `jimesh-security-/falco/helm/rules/saits-cloud-baseline.yaml` | WP8 Tripwire, WP4 Forensik | S–M | K8s-Felder (`k8s.pod.name`) → Docker-Felder ersetzen, dann direkte Tripwire-Regeln; Egress-Regel ist die Detektions-Ergänzung zur WP5-Enforcement |
| Privilegien-Trennung: ACL-Provisioning bewusst NICHT im Tenant-Script (per-tenant User hat kein Admin) — separater Provisioner liest Audit-Stream | `jimesh-sync/lua/tenant-create.lua` (Kommentar) | WP1, Deploy-Engine | S | Muster: kritische Ops aus dem Datenpfad rausziehen |

## Nicht portieren

| Was | Warum nicht |
|---|---|
| Clerk (OIDC-JWT-Templates, Terraform-Provider, Org-Provisioning, SAML-Referenzen) | SaaS-Abhängigkeit + Human-Multi-Tenant-Modell; JiMesh ist Single-Operator mit Agenten als Primärfall (Roadmap §1) |
| Redis als SSoT für tenants/users/billing/subscription | Widerspricht JiMesh' Persistenz-Mandat (Postgres via pgx only); Redis bleibt Streams/Cache |
| apikeys als Argon2-Hashes in Redis | JiMesh hält Keys in Vault (Mandat 9) — kein zweiter Secret-Store |
| Cilium-Label-Selektoren (`saits.cloud/vault-approle`-Pod-Label) | K8s-Identity; nftables kennt keine Labels — JiMesh mappt Container-IPs (Docker-API) → Regeln (WP6) |
| Helm-Charts inkl. Clusterwide-Policies, Bootstrap-Job, PDB, SIEM-Forwarder-Deployment | K8s-Betriebsform; nur die MUSTER (idempotente Einzelschritte) wandern |
| MongoDB-Persistenz des auth-Scaffolds | JiMesh ist pgx-only |
| Elastic-SIEM-Forwarder-Stack | Betriebslast ohne JiMesh-Äquivalent; WP4 assembliert Reports selbst |
| SPIFFE/SPIRE/Tetragon | K8s-gebunden (Cilium-Kommentar: L7-mTLS bräuchte Tetragon+SPIRE); in JiMesh-Welt mTLS über Vault-Issuance + Gateway-Terminierung |

## Drift/Überraschungen

* **`jimesh-security` und `jimesh-security-` sind überlappende Kopien:** `terraform/clerk` liegt doppelt und divergiert (`variables.tf` 74 vs. 87 Zeilen); das Repo mit trailing `-` dokumentiert im README den Namens-Kollisionstypo. Kanonisch ist klar **`jimesh-security-`** (einziges Repo mit cilium/vault/falco/siem/docs) — aber zwei Repos mit driftendem Terraform sind eine Altlast.
* **Kontrakt ≠ Code in `jimesh-auth`:** README + `jwt-claims-schema.md` mandieren RS256, `tenant_id`-Claim, DPoP — der Code nutzt HS256 mit Shared Secret (`tokenService.js`), emittiert den Legacy-Claim `saits_tenant_id`, verifiziert kein DPoP (`requireAuth.js`: nur Bearer), Logout ist ein Stub (`authController.js`: 204). README sagt selbst „scaffold, not production-ready". Der Wert liegt im Kontrakt, nicht im Code.
* **Kyverno/OPA/cosign sind Scope-Tabellen-Zeilen ohne Artifakte** — in beiden Security-Repos existiert keine einzige Policy-Datei (Negativbefund; OPA taucht nur als Header-Verweis im auth-README auf).
* **Vorbildlich:** Blast-Radius ehrlich im HCL kommentiert (`agent-runtime` liest `tenant/+/api-keys/llm` tenant-übergreifend, Issue #17, Mitigation: identitätstemplatierte Policies + 4h-secret_id-Rotation) — gutes Muster für JiMesh-Codekommentare mit Issue-Referenz.
* Vault v0-Realismus: Auto-Unseal (KMS) bewusst out-of-scope, Shamir initial — Realismuskennzeichnung statt Scheinvollständigkeit.

## Offene Fragen

1. Wer validiert DPoP am Ingress in saits-cloud tatsächlich (HAProxy/Envoy-Config liegt in keinem der vier Repos)? Für JiMesh klar: der Gateway selbst — aber der Redis-jti-Replay-Guard muss als Baustein in WP1 eingeplant werden.
2. Ist `jimesh-security-` kanonisch und `jimesh-security` einzufrieren? (Terraform-Divergenz spricht dafür — für JiMesh-Reuse irrelevant, da eh nur Muster wandern.)
3. JiMesh WP1: JWT (stateless + JTI-Deny-Set wie saits) ODER opaque Token + `sessions`-Tabelle? JiMesh hat Postgres-Sessions geplant — Deny-Set-Mustering über `sessions.status` statt zweitem Store wäre konsistenter.
4. Reicht Single-Node-Vault (bestehender Container, nach WP0 auf `127.0.0.1:8200`) für agent-runtime-AppRoles mit 10m-TTL — und wer spielt bei JiMesh den `sentinel-rotator` (Cron auf dem Host)?
5. WP8: die Falco-Regeln brauchen einen Host-Level-Falco — ergänzt das die Userspace-Scanner-Kette (WP2) trotz der Go-eBPF-Lücke (R19/E1), oder wird es zu viel Betriebslast für die VM?
