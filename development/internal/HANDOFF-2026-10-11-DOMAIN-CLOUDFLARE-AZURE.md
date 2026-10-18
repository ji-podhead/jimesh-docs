# Handoff / Status — 2026-10-11 (Domain + Cloudflare + Azure + Stripe Sandbox)

## Aktueller Stand (Heute)

### Repos (Parent: /home/ji/projects/)
| Repo | Pfad | Inhalt | Sichtbarkeit |
|---|---|---|---|
| **JiMesh2** | `/home/ji/projects/jimesh` | Core-Produkt: Gateway, Clients, Compose. **Nur API-Docs + README + diagrams.** Alle Sprints/Handoffs/Research migriert. | private (später public) |
| **jimeshIO** | `/home/ji/projects/jimeshIO` | Premium-Code: backend/ (gateway+app+email), iac/ (terraform azure modules + ansible roles), packages/ (go+npm), adapters/, billing/, app/, onboarding/ (deploy-tenant.sh). **Docs-Zuhause**: docs/ (sprints, dev, internal, research, etc.) | private |
| **jimeshOps** | `/home/ji/projects/jimeshOps` | Deploy-Glue: terraform/main.tf (Entry), environments/ (staging/production), scripts/ (provision-cluster.sh [ex provision-vm.sh, PV-9], onboard-tenant.sh), onboarding/ (Orchestrierung), Ops-Docs | private |

### Infrastruktur (Heute)
- **Domain**: `jimesh.io` gekauft ✅
- **Cloudflare**: Zone `jimesh.io` aktiv, Protection an ✅
- **Azure**: Account/Subscription ready ✅ (noch keine Resource erstellt)
- **Stripe**: Sandbox/Test-Account ready ✅ (Live dauert länger)
- **Sendgrid**: Noch nicht (kommt später)

### Was noch fehlt vor Deploy
1. **Azure Service Principal** (ARM_SUBSCRIPTION_ID, ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID) — via `az ad sp create-for-rbac`
2. **SSH public key** — `ssh-keygen -t ed25519 -f ~/.ssh/jimesh_azure && cat ~/.ssh/jimesh_azure.pub`
3. **Cloudflare API Token** + **Zone ID** (Dashboard → jimesh.io → Zone ID rechts)
4. **Sendgrid API Key** (kann warten, Test-Modus)
5. **Stripe Test-Keys** (`sk_XXXX` / `whsec_*` — erhältst du über die Stripe CLI oder das Dashboard)

### Deploy-Flow (nach Creds)
1. `jimeshOps/.env` ausfüllen (ARM_*, CLOUDFLARE_*, STRIPE_*)
2. `cd jimeshOps/terraform && terraform init && terraform apply -var-file=../environments/production/terraform.tfvars` → erstellt RG, VNet, VM, Private DNS
3. `jimeshOps/scripts/provision-cluster.sh` (ex `provision-vm.sh`, PV-9 — Self-Hosted-VM-Variante) → liest terraform output, ruft ansible-playbook aus jimeshIO/iac
4. `jimeshOps/scripts/onboard-tenant.sh --name test --email ... --plan small` → ruft jimeshIO/onboarding/deploy-tenant.sh

### Architektur-Entscheidungen (verbindlich)
- **Managed vs Self-Hosted**: Self-Hosted = OSS JiMesh2 (single-tenant Compose). Managed = Multi-Tenant via jimeshOps + Azure-Managed-Services + Stripe-Billing.
- **Pro Tenant**: eigener Headscale-Container, Keycloak-Realm, Vault-Mount, PG-RLS, Redis-ACL, Caddy-Route.
- **Package-Import**: Premium-Code bleibt privat in jimeshIO, wird als Go-Module (GOPRIVATE+Token) oder npm-Package (@jimesh/pro-*, GitHub Packages) ins OSS-Repo importiert — Source privat.
- **Azure-Mapping**: Kafka→Event Hubs, Redis→Azure Cache, PG→Azure DB Flexible, Grafana→Managed Grafana, SIEM→CloudWatch/Azure Monitor (Suricata bleibt).
- **Cloudflare**: Tunnel (cloudflared) schließt 80/443, WAF/DDoS Free. OTP nur für Keycloak-Admin. Kunden-OTP in Keycloak nativ.
- **E-Mail**: Postmark/Sendgrid SMTP (umgeht Azure-Port-25-Block).

### Nächste Schritte (wenn Creds da)
- Terraform apply (VM + VNet + Private DNS)
- Ansible gegen VM (Docker, Caddy, Core-Services: Keycloak+Vault+Gateway)
- Erster Test-Tenant onboarden
- Danach: Backend-Go coden (Multi-Tenant-Gateway, App-Backend, E-Mail-Service) in jimeshIO/backend/

---

## Historie (älter, migriert aus JiMesh2)
- Sprints/Handoffs: `docs/sprints/` (130+), `docs/dev/sprints/`, `docs/dev/tasks/`
- Research/Architektur: `docs/research/`, `docs/architecture/`, `docs/roadmap/`
- Operator-Intern: `docs/internal/` (REPO_STATE, MANDATES, NEXT_SESSION_PROMPTS, STITCH_*, etc. — **veraltet**, siehe oben für aktuellen Stand)
- Ops-spezifisch: `jimeshOps/docs/sprints/` (9 Deploy/DNS/VM-Sprints)

---
*Letzte Aktualisierung: 2026-10-11*
