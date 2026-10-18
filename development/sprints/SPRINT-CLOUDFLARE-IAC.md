# SPRINT-CLOUDFLARE-IAC — CF-Zonen/Access/Tunnel/Worker als Terraform (aus bestehenden Patterns)

**Status:** 📋 GEPLANT (Patterns gefunden — Implementierung kann direkt loslaufen)
**Datum:** 2026-10-14
**Operator-Prompt:> „musst mal gucken was ich bei ownhealth schon an cloudflare iac code habe und anderen projects im projects folder"**

## Befund (bestehende Codes, verifiziert 2026-10-14)

### jimesh-crew/infra/terraform/ (the best CF-Modul-Sammlung)

| Datei | Inhalt | Reuse |
|---|---|---|
| `cloudflare-access/{main,variables,outputs}.tf` | `cloudflare_access_application` + `cloudflare_access_policy` — **E-Mail-OTP-Gate mit email allowlist** (allowed_idps=[]), self_hosted, 24h session | **Komplett wiederverwendbar** für JiMesh Beta-Gate (2–3 Test-User + Superadmin) UND Zone-2-Policies |
| `cloudflare-dns/main.tf` | records (A/`proxied`), wildcard-Eintrag | Strukturvorlage für Zone `jimesh.io` + `*.jimesh.io` |
| `cloudflare-dns/waf.tf` | WAF-Regeln existieren bereits | waf.tf Pattern übernehmen |
| `cloudflare-dns/backend s3+KMS commented` | remote-state-Handling | übersetzen zu azurerm-storage + Key Vault (kein Plaintext-state, Operator-Mandat) |
| Provider | `cloudflare ~>4.0`, `required_version >= 1.5`, api_token variable | identisch übernehmen |

### burckhard/terraform/

| Ressource | Kommentar/Rolle |
|---|---|
| `cloudflare_zero_trust_tunnel_cloudflared` | Tunnel als Code (`config_src = "cloudflare"`) |
| `cloudflare_zero_trust_tunnel_cloudflared_config` | ingress map (hostname→service concat + catch-all-404-Pflicht) |
| `data "cloudflare_zero_trust_tunnel_cloudflared_token"` | Tokenausgabe für den cloudflared-Container (kein Credentials-File) — genau unser CD-Ansatz für den CP-Node |
| `cloudflare_dns_record` (CNAME `<tunnel_id>.cfargotunnel.com`, proxied) | DNS↔Tunnel-Verkabelung |
| `cloudflare_zero_trust_organization` | **Gotcha dokumentiert** — das Onboarding-Ressource muss zuerst existieren, sonst `access.api.error.not_enabled` |
| Access-Begründung | „Access erstetzt NICHT den App-Login" — genau unsere Opposition (Access = Gate, Session = App) |

## Was damit schon gecopy-paste-äußerbar ist (vs. neu)

| JiMesh-Bedarf | Quelle | Aufwand |
|---|---|---|
| Beta-Gate (email-OTP Allowlist auf App) | crew-access-Modul | copy+adjust |
| Zone-2-Access auf /app/* + workspace-subdomains | crew-access-Modul | copy+adjust (policies differieren) |
| Tunnel für public sales / cp / internal admin | burckhard-Modul | copy+adjust (3 ingress-Map-Blöcke) |
| cloudflared-connector auf CP-Node | burckhard token-data | copy+adjust |
| DNS Records + Wildcard | crew-dns | copy+adjust |
| WAF/Bot-Fight/Rinteraction-rules | crew-dns/waf.tf | extend (rate-limit rules für OTP-Throttle auf Zone-Ebene) |
| Zero-Trust-Organisation (access.api.error.not_enabled) | burckhard | copy |
| Remote-state auf Azure statt AWS | crew-dns-COMMENT | translate |
| **x-auth JWKS-Verify Worker** | — | **NEU** (kein project hat den) |
| **x-auth-Header-Injection + Route-Policy auf Post-Login** | — | **NEU** |

## IaC-Layout (final)

```
jimeshIO/iac/terraform/cloudflare/
  provider.tf          # cloudflare ~>4.0, api_token via Vault/secretsenv (CLOUDFLARE_API_TOKEN)
  modules/
    access/            # application + policies (email-OTP allowlist pattern aus crew)
    tunnel/            # zero_trust_organization + tunnel + config + token (burckhard)
    dns/               # records + wildcard + proxied flags (crew)
    waf/               # bot-fight, managed-rules, rate-limit rules (OTP-throttle, x-auth exceptions)
    transform/         # X-Robots-Tag noindex response-header rules (A9)
    worker/            # NEU: x-auth JWKS verify + header-injection workerscripts
  backend.tf           # azurerm storage + Key Vault encryption (kein plaintext state)
  main.tf / variables.tf / outputs.tf
  README.md            # zuerst `cloudflare_zero_trust_organization`穿戴 — sonst not_enabled
```

- FK-Zone wird als `data "cloudflare_zone"` (by name) referenziert — **nicht neu angelegt**
- `terraform import` für existierende Records (MX/DKIM/SPF) — kein blindes Create (Operator: kein try-and-error)
- Secrets (Tunnel-Token, Origin-Cert, API-Token) via **Azure Key Vault** (A7), managed identity — keine .env-Kleber für neue Deploy-Units

## Work Packages

| Nr | Task | Status |
|---|---|---|
| CF-1 | Module-Komprise aus crew/burckhard: access/tunnel/dns import + adjust (jimesh-Domain) | [x] — Beweis: 972e770 | 
| CF-2 | waf/transform Module (rate-limits + X-Robots-Tag) | [x] — Beweis: 972e770 (waf-empty-Skelett) + f29a05a (branch `feat-waf-cf-owasp`, waf.tf gelebt: OWASP/Managed/Custom-Deny/Rate-Limit, 3-Phasen, validate green) |
| CF-3 | worker Module (x-auth JWKS verify + header inject) — NEU | [x] — Beweis: 972e770 | 
| CF-4 | backend azurerm + Zero-Trust-Organisation-First-Gotcha-Handling | [x] |
| CF-5 | jimeshOps wiring (module cloudflare, env-fil) + cloudflared-container-Task im CP-Node-Sprint veranlassen | [x] |
| CF-6 | Verifikation: plan/apply, access-policy live regression (curl mit/ohne token), tunnel healthcheck | [~] |

## Abhängig von

- Key Vault (A7 Secrets-Backend)
- Enterprise-Deploy (NestJS JWKS-Endpoint für den Worker)
- CP-Node-Sprint (cloudflared connector aus token-data)

---

## Umsetzung CF-4..CF-6 (2026-10-14)

### CF-4 — Backend azurerm [x]

- `jimeshIO/iac/terraform/cloudflare/backend.tf` — entkommentiert/gefüllt:
  RG `rg-jimesh-infra`, Storage-Account `jimeshterraformstate` (Northeurope-
  Naming-Regeln: 3-24 lowercase alphanumerisch, global unique), Container
  `cloudflare-terraform-state`, Key `cloudflare.tfstate`,
  **`use_azuread_auth = true`** — bewusst KEIN `account_key`/account_keys.
- Henne-Ei gelöst via separatem, NICHT verdrahtetem Bootstrap-Stub:
  `jimeshIO/iac/terraform/cloudflare/bootstrap/main.tf` (RG + Storage-Account +
  Container, kein backend-Block, local-state) + First-Run-Az-CLI-Instruktionen in
  `jimeshIO/iac/terraform/cloudflare/bootstrap/README.md` (`az storage container
  create --auth-mode login` — konsistent, kein Account-Key).
- Zero-Trust-Organization-First-Gotcha: abgedeckt durch `enable_access` /
  Deployment-Order in `jimeshIO/iac/terraform/cloudflare/modules/README.md`
  (`-target` auf die Organization-Ressource beim ersten Apply).

### CF-5 — jimeshOps wiring [x]

- `jimeshOps/terraform/main.tf`: `required_providers.cloudflare ~> 4.0`,
  Provider-Block `cloudflare { api_token = var.cloudflare_api_token }`
  (Child erbt — lokaler Provider-Block im CF-Root wurde dafür entfernt,
  sonst wäre das Modul count-inkompatibel), ein `module "cloudflare"`-Block
  mit source `../../jimeshIO/iac/terraform/cloudflare/` (gleiches
  relativePath-Pattern wie die Azure-Module), Pass-through aller CF-1..3-Inputs,
  Gate via **einem Flag** `var.cloudflare_enabled` → `count` (Terraform >= 1.7),
  Beta-Allowlist `cloudflare_beta_allowed_emails` default `[]`.
- `jimeshOps/environments/production/terraform.tfvars` (+ `.example`):
  neue Platzhalter als KOMMENTIERTE Variablen (`cloudflare_enabled`,
  `cloudflare_account_id`, `cloudflare_zone_id` — Account/Zone-IDs aus
  CONFIGURATION.md §1, nicht geheim); Secrets (`cf_api_token`,
  `tunnel_secret`) via `TF_VAR_...`-Env-Override wie ARM_*-Pattern,
  Tag `CF-ENV-OVERRIDE` verhindert späteres stilles Verwirren.

### CF-6 — Verifikation [~] (static done, live operator-manuell)

Erledigt (ohne Credentials, **niemals apply**):

- `terraform fmt -check -recursive` in `jimeshIO/iac/terraform/cloudflare/`
  und `jimeshOps/terraform/`: clean.
- `terraform validate` in `jimeshIO/iac/terraform/cloudflare/` (init mit
  `-backend=false`, damit Azure nicht kontaktiert wird): **valid**, Provider
  cloudflare 4.52.5 (Plugin-Cache).
- `terraform validate` in `jimeshOps/terraform/` (init, Cloudflare-Provider
  in Lockfile): **valid** — validate instanziert Provider lazy, ARM_*/CF-Creds
  nicht nötig (Notiz auch in `jimeshIO/iac/terraform/cloudflare/README.md`).
- `terraform validate` in `bootstrap/`: **valid**.

Noch operator-manuell (war Teil der CF-6-Definition, braucht reale Creds):

1. Einmal-Bootstrap: `bootstrap/README.md` (az-CLI) → dann erst `terraform init`
   im CF-Root gegen azurerm-Backend.
2. `terraform plan`/`apply` mit Key-Vault-Token (Organization FIRST, dann voll).
3. Access-Regression live: curl mit/ohne Token; Tunnel-Healthcheck.
4. `terraform import` MX/DKIM/SPF (siehe modules/README.md Import-Sektion) — kein blindes Create.

---

## Umsetzung CF-2-Finish — WAF-OWASP gelebt (2026-10-15, branch `feat-waf-cf-owasp` f29a05a)

`modules/dns/waf-empty.tf` (972e770-Skelett) ersetzt durch **`modules/dns/waf.tf`** —
Ownhealth-Hausmuster verbatim (jimesh-crew `waf.tf` Skip-Blocks) + Burckhard-Rate-
Limit-Pragmatik (README: Edge-Rate-Limit ersetzt NICHT den App-Limiter). EINE
Entry-Point-Ruleset je Phase (CF erlaubt genau eine Zone-Entry-Point-Ruleset pro Phase):

| Phase / Resource | Regeln |
|---|---|
| `http_request_firewall_managed` → `cloudflare_ruleset.jimesh_waf_managed` | Skip-1: `/api/apps/{id}/bundle` POST + X-Auth-Token-Secret (jimesh-PathNorm der Crew `-ingest/document`-Blocks; OWASP-High-949110-File-Upload-FP-Gotcha laut CF-Doku) · Skip-2: dev/staging-Hosts dynamic (default leer = aus) · Skip-3: CI x-own-bypass-Secret (CI-Harder-Pattern, eigenes Secret, secure-by-default null) · Execute-4: **OWASP Core Ruleset** `4814384a9e5d4991b9815dcfc25d2f1f` (PL2 = paranoia-level-3/4 disabled, Anomaly-Threshold-Override beim Last-Regel `6179ae15870a4bb7b2d480d4843b323c` via `owasp_threshold` 0=off/1=low 60/2=medium 40/3=high 25, default 3 STRICT/medium-strict Haus-Level, action=block) · Execute-5: **CF Managed Ruleset** `2d4f2ad0b0d34f99a01c6b4d3dd546d3` mit sqli+xss auf **Contextual-Alert-Level** (`log` statt block — Ownhealth-Präferenz; `sensitive` = Sensitive-Data-Detection ist response-phase + Enterprise-only, bewusst ausgeklammert) |
| `http_request_firewall_custom` → `cloudflare_ruleset.jimesh_waf_custom_deny` | BLOCK Bot-User-Agents (Empty-UA, curl/, wget, Go-http-client) auf `/api/*` · BLOCK `/api/admin/*` außerhalb `allowlist_ip_ranges` (default = jimeshOps/.env `OPERATOR_IP=176.0.58.86` → `/32`) · BLOCK X-Forwarded-Host-Spoof (Header gesetzt + kein trusted Host: root wirft `jimesh.io` + sales/cp-Hostnames rein) |
| `http_ratelimit` → `cloudflare_ruleset.jimesh_waf_rate_limit` | (a) login/signup/OTP-Anon 10/min/IP (**email-only** = IP-only am Edge; 3/24h/email + 5-try/15min-Lockout bleiben ES-12-Backend-authoritative), 5min Mitigation · (b) general `/api/*` OHNE X-Auth-Token 100/min/IP, 1min Mitigation. Enger auth-Regel FIRST (first-match-wins) |

- Secrets (`waf_bypass_upload_secret`, `waf_bypass_ci_secret`) = `openssl rand
  -hex 32` via TF_VAR/Key Vault (A7), niemals tfvars; default null = Regel nicht
  erzeugt (secure-by-default).
- Ruleset-IDs gegen Cloudflare-Doku verifiziert (managed-rules reference +
  owasp-core-ruleset/configure-api); Provider-Schema (4.52.5) gegen
  `terraform providers schema -json` verifiziert (overrides.rules.score_threshold,
  rules.ratelimit existieren in v4).
- Verifikation (ohne Creds, **niemals apply**): `terraform fmt -check -recursive`
  clean; `terraform init -backend=false && terraform validate` GREEN an Root +
  dns-Modul; jimeshOps-Terraform fährt unverändert (neue WAF-Vars haben Defaults).
- Operator-manuell offen (wie CF-6): live apply + Access-Regression + Skip-
  Secrets einspielen (Key Vault) — erst dann Rulesets sichtbar.
