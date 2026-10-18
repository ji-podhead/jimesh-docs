# Infrastruktur-Konfiguration — Stand 2026-10-11

Komplettdoku aller gesetzter Konfigurationen (Domain, E-Mail, Cloudflare, Stripe, Azure, Keys).
Secrets liegen in `jimeshOps/.env` (gitignored) — hier nur Struktur/Verlauf, keine vollen Keys.

---

## 1. Domain — `jimesh.io`

- **Registrar:** Namecheap (gekauft 2026-10-11, ~30€/Jahr)
- **NamenServer:** auf Cloudflare umgestellt (`darwin.ns.cloudflare.com`, `wanda.ns.cloudflare.com`)
- **Zone-ID:** `071fbedcdc643c376dd81d067fbd1643`
- **Account-ID:** `13f0d8135dadb35c7713694b29353a2f`

### DNS-Records (nach Aufräumen)
- Namecheap-Parking entfernt (5× MX eforward, A 192.64.119.105, CNAME www→parkingpage)
- Cloudflare Email Routing Records aktiv (siehe unten)

---

## 2. E-Mail — Cloudflare Email Routing + Postmark

### Problem & Lösung
- **Problem:** Postmark erlaubt keine Gmail/Yahoo-Adressen als Account-Mail → braucht "work email on a private domain", aber wir hatten keinen Mailserver.
- **Lösung:** Cloudflare Email Routing (kostenlos) — kein Mailserver nötig, nur MX-Records.

### Cloudflare Email Routing (aktiv)
- **MX-Records** (von Cloudflare Email Routing "Get started" automatisch gesetzt):
  - `route1.mx.cloudflare.net` (Prio 24)
  - `route2.mx.cloudflare.net` (Prio 98)
  - `route3.mx.cloudflare.net` (Prio 67)
- **DKIM:** `cf2024-1._domainkey.jimesh.io` (TXT, RSA 2048)
- **SPF:** `v=spf1 include:_spf.mx.cloudflare.net ~all` (TXT)
- **Routing-Regeln:**
  - Catch-all `*@jimesh.io` → `lovitsch92@gmail.com` (Active) — **WICHTIG: war zuerst auf "Drop", musste auf "Send to" geändert werden**
  - `admin@jimesh.io` → `lovitsch92@gmail.com` (Active)
- **Test-Hinweis:** Gmail dedupliziert Mails von→an dieselbe Adresse; Test mit anderem Absender (z.B. guerrillamail).

### Postmark (aktiv)
- **Account:** `admin@jimesh.io` (Bestätigungsmail via Cloudflare-Routing in Gmail gelandet)
- **Server API Token:** `050d8409-790d-471e-8b89-32ba774c71d7` (= SMTP User + Password)
- **SMTP:** `smtp.postmarkapp.com:587` (STARTTLS)
- **From:** `otp@jimesh.io` (muss noch als Sender verifiziert werden)
- **Verwendung:** Keycloak OTP, Invites, Password-Reset, Billing-Receipts
- **Free Tier:** 100 Mails/Monat (Postmark) bzw. Umstieg ggf. auf Sendgrid (100/Tag)
- **ACHTUNG:** Ein Postmark-Account wurde zuerst mit Tippfehler in der Email angelegt — falls Login-Problem, neuen Account mit `admin@jimesh.io` anlegen.

### Warum kein Mailserver?
- Azure blockt Port 25 outbound
- Postmark/Sendgrid = zuverlässiger Deliverability (SPF/DKIM/DMARC managed)
- Cloudflare Email Routing = Empfang/Forward gratis
- Echte Postfächer (Team) erst nötig wenn Mitarbeiter dazukommen

---

## 3. Stripe (Sandbox)

- **Account:** Test/Sandbox-Mode für `jimesh.io`
- **Key in .env:** `rk_<restricted-key aus Stripe Dashboard>` (**Restricted Key** — für vollen Billing-Brauch ggf. Standard Secret Key `sk_<secret-key aus Stripe Dashboard>` aus Stripe Dashboard → Developers → API Keys)
- **Webhook:** noch nicht angelegt (braucht public Endpoint → nach Deploy via `stripe listen` oder Dashboard)
- **Price IDs:** leer (small/medium/large Tiers müssen in Stripe Products angelegt werden)
- **Live-Account:** dauert länger (Aktivierungsprozess mit Mail+Passwort-Bestätigung), Sandbox reicht für Start

---

## 4. Cloudflare (Zone aktiv)

- **API Token:** `cfat_OnbYZ...` (Bereiche: Zone/DNS/Tunnel-Edit — Zone-Liste via API verifiziert)
- **R2 Object Storage Keys:** in `.env` (für späteren S3/Datalake-Use)
- **Tunnel Token:** leer (kommt beim `cloudflared tunnel` Setup nach VM-Deploy)
- **Origin Cert:** leer (kommt aus CF Dashboard → SSL/TLS → Origin Server, für Caddy TLS)

### Cloudflare-IaC (CF-1..6, 2026-10-14)

Zone/Tunnel/Access/Beta-Gate als Terraform-Code — Pointer auf die exakten Pfade:

- **TF-Root:** `jimeshIO/iac/terraform/cloudflare/` (modules/access = E-Mail-OTP-Gate,
  modules/tunnel = Zero-Trust-Tunnel, modules/dns = records+Wildcard; Deployment-Order
  + Token-Matrix in `jimeshIO/iac/terraform/cloudflare/modules/README.md`)
- **Remote-State:** `jimeshIO/iac/terraform/cloudflare/backend.tf` (azurerm,
  `rg-jimesh-infra` / Account `jimeshterraformstate` / Container
  `cloudflare-terraform-state` / Key `cloudflare.tfstate`, **AzureAD-Auth,
  keine Account-Keys**); Einmal-Bootstrap via `jimeshIO/iac/terraform/cloudflare/bootstrap/README.md` (az-CLI)
- **Ops-Verkabelung:** `jimeshOps/terraform/main.tf` → `module "cloudflare"`
  (Gate `cloudflare_enabled`, default aus); Platzhalter in
  `jimeshOps/environments/production/terraform.tfvars` (kommentiert; Token/Secrets
  nur via `TF_VAR_cloudflare_api_token` / `TF_VAR_cloudflare_tunnel_secret` env-override,
  `jimeshOps/.env`)
- Sprint-Details: `jimeshIO/docs/sprints/SPRINT-CLOUDFLARE-IAC.md` (Umsetzung CF-4..6)
- **jimesh-agent Helm-Chart (PV-8, 2026-10-15):** `jimeshIO/iac/helm/jimesh-agent/` —
  Worker-Agent für K8s-Umgebungen (A6/Dual-Env); der Chart-Default
  `cpUrl=https://cp.jimesh.io` läuft über dieselbe Cloudflare-Zone
  (outbound-only — der Agent POSTs `{cpUrl}/api/workers/register`, kein
  Ingress nötig; PV-4-Vertrag in `packages/go/workerregistry`). Values-Tabelle
  + Deploy-How-To im Chart-README.

---

## 5. Azure (CLI installiert, Login ausstehend)

- **Azure CLI:** `2.91.0` installiert via venv (`~/.azure-cli-venv`, Symlink `~/.local/bin/az`)
  - Offizieller Installer schlug fehl (Ubuntu 25.04, Python 3.13 ohne distutils, PEP 668 blockiert system-pip)
  - Workaround: `python3 -m venv ~/.azure-cli-venv && pip install azure-cli && ln -s .../az ~/.local/bin/az`
- **Login + Service Principal:** ausstehend (`az login`, dann `az ad sp create-for-rbac`)
- **ARM_* Werte:** leer in `.env`

---

## 6. SSH

- **Key:** `~/.ssh/jimesh_azure` (ed25519, generiert 2026-10-11)
- **Public Key:** `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHOxRfnT+N2wtpUKTnUz222USNJBsHZylQEw3jaWLAPa jimesh-azure-vm` (in `.env`)
- **Operator IP:** `176.0.58.86` (IPv4, für Firewall-SSH-Whitelist in `.env`)

---

## 7. Secrets-Lage

| Datei | Inhalt | Git |
|---|---|---|
| `jimeshOps/.env` | Alle Creds (Azure, CF, Postmark, Stripe, SSH) | **gitignored** |
| `jimeshIO/.env` | Kopie/Arbeitsstand (Postmark, Stripe) | **gitignored** |

Beide `.env` sind via `.gitignore` ausgeschlossen (`*.env` außer `*.env.example`).

---

## 8. Enterprise-Site Auth (ES-2/ES-12) — Env-Flags

Flags für `jimeshIO/enterprise` (auth-api, NestJS), alle optional und **fail-open dokumentiert**:

| Env | Wirkung |
|---|---|
| `POSTMARK_TOKEN` | OTP-Versand (`otp@jimesh.io`); fehlt → flows antworten **honest 503** (kein stiller Drop) |
| `STRIPE_SECRET_KEY` | Checkout Setup-Intent (Card-Verify-First); fehlt → Checkout-Endpunkte honest 503 |
| `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | **Cloudflare Turnstile** auf Sign-in-Intake (ES-12). **Beide setzen = Mode ON**: fehlender `cf-turnstile-response` → 400, ungültiger Token (siteverify) → 403. **Beide fehlen = Mode OFF** (Operator-Entscheid): softer Durchlass + Response-Header `X-Captcha-Mode: off (operator) — turnstile recommended in prod`. Site Key ist public (via `GET /api/auth/signin/widget` an die FE); **Secret Key bleibt server-side** (Key Vault-Prio: `KEYVAULT_SECRET_TURNSTILE_*` wird bevorzugt). Turnstile ist für Prod **empfohlen** (anti email-enumeration/OTP-Bombing am 5/h/IP-Intake-Gate). |
| `JIMESH_WORKSPACE_URL` / `JIMESH_CP_URL` | Deep-Link-Ziel für returning payers (Signaturen im Stripe-Brauch v7: customer existiert → kein Checkout, direkter Workspace-Redirect via X-Auth-Mint) |

Site-FR: `NEXT_PUBLIC_AUTH_API_URL` (site/.env) — Ziel der auth-api für die Sign-in-Seite.

---

## Offene Konfigurations-Schritte

1. `az login` + `az ad sp create-for-rbac` → ARM_* in `.env`
2. Postmark: Sender `otp@jimesh.io` verifizieren
3. Cloudflare: Tunnel anlegen (nach VM-Deploy) → `CLOUDFLARE_TUNNEL_TOKEN`
4. Cloudflare: Origin Cert → `CLOUDFLARE_ORIGIN_CERT/KEY` (für Caddy)
5. Stripe: ggf. Standard Secret Key `sk_<aus Stripe Dashboard>` statt Restricted Key `rk_<aus Stripe Dashboard>`; Price-IDs anlegen
6. Interne Passwörter: Keycloak/Vault/Headscale/Postgres (beim Deploy generiert)
7. Cloudflare: Turnstile-Site anlegen → `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` in `.env` (ES-12, Prod empfohlen, solange off: Operator-Note im Response-Header `X-Captcha-Mode`)
