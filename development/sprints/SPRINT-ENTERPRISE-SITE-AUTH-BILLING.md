# SPRINT-ENTERPRISE-SITE-AUTH-BILLING — jimesh.io (NestJS, Stripe-first, Email-OTP-only)

**Status:** 📋 GEPLANT (Design verbindlich, Implementierung offen)
**Datum:** 2026-10-14
**Operator-Vorgaben:** siehe „Operator-Vorgaben (wörtlich)" unten

## Ziel

Die Enterprise-Site **jimesh.io** (eigenes Repo, eigenes **NestJS**-Backend — bewusst NICHT Go) so aufbauen, dass Signup **Payment-first** läuft, Credits nie bei uns liegen, alle metered Kanäle gegen Denial-of-Wallet geschützt sind und die JiMesh-App nur einen minimalen Cloud-Account-Status kennt.

## Operator-Vorgaben (wörtlich, 2026-10-14)

> „es muss auch ein hartes throttle geben nicht mehr also x sms authentications am tag oder der user muss irgendwie so ein secure plus oder so buchen, aber wer benutzt heute schon sms. wir können genausogut 2fa für payments und neue geräte login machen und oder email otp"

> „außerdem auch 2fa wenn jwt abgelaufen ist"

> „übrigens können wir das auch mal in keycloak implementieren" → TOTP-Policy bereits im Realm-Template (`jimeshIO/onboarding/templates/keycloak/realm-template.json:32-36`)!

> „vllt sollte billing wirklich zu jimesh.io nicht in die app seite. btw jimeshio ist unsere hauptrepo, da kommt enterprise backend + frontend auch rein"

> „die enterprise website muss auch extrem sicher sein, das haben wir doch schon alles geplant. vorallem will ich das man sich erstmal mit stripe verifizieren muss bevor man da irgendwas machen kann. das heißt erst kommt der anmelden part + landing page, sign up und stripe payment secure form falls man sich zum ersten mal anmeldet. das wird an das nestjs backend geschickt. das schreiben wir nicht in go. erst wenn wir von stripe den check zurückbekommen das die person echt ist und kein fraud, erstellen wir einen x-auth token. erst dann leiten wir ihn weiter an <client_workspace_name>.jimesh.io oder was auch immer wir da geplant hatten"

> „das war meine nächste frage, d.h. die normale jimesh repo hat auch enterprise shit und braucht nen billing section utility oder unter admin. kreditkarten speichern wir nicht, aber er kann mit den secure forms von stripe seinen scheiss da machen. invoices speichern wir auch über stripe, die kann er dann da abrufen, das alles halt über seine secure id. das ist eigentlich ziemlich einfach"

> „wir haben ne eigene user id, wir haben jwt token, aber auch noch nen secure token und oder zusätzlich noch den x-auth token im x header den wir von dem secure id token ableiten oder so bzw ja unser keycloak haben wir ja auch noch"

> „immer das mit dem dns hat uns google chrome kaputt gemacht…" (Kontext: DNS-Fix manuell durch Operator; siehe SPRINT-184)

## Architektur

### Token-Kette (verbindlich)

```
Stripe-OK (Radar clean, erster Signup)
   │
   ▼
   NestJS mintet ──►  X-Auth-Token  (Bootstrap, one-shot, 5 min TTL)
   { iss: jimesh.io, aud: jimesh-cp, sub: <jimesh.io user-id>,
     customer_id, fraud_checked, plan, jti one-shot, exp: 5min }
   │
   ▼
   Go-CP erster Kontakt <workspace>.jimesh.io (oder <t>.cp.jimesh.io)
   ├─ JWKS/Signature validieren + jti one-shot (replay-sicher)
   ├─ LINK: cloud_customer_id ⟷ users.keycloak_sub (genau EIN Mal)
   ├─ danach: normale Keycloak-JWT-Session (bestehender OIDC-Flow)
   └─ X-Auth-Token danach WEG (nur Bootstrap)
   │
   ▼
   Betrieb: Authorization: Bearer <Keycloak JWT> (wie heute)
```

- **X-Auth-Token** = beweist Zahler-Verifikation (Stripe + Fraud), one-shot bootstrap
- **Keycloak-JWT** = dauerhafte App-Session (App-Login unverändert)
- **Secure-ID** = NestJS/Stripe customer_id; Invoices/Payment-Methods NUR im Stripe Customer Portal
- **Billing-Mirror** server-to-server: Stripe-Webhook → NestJS → CP (plan, valid_until, quota-caps) — die App kennt nie Karten/Rechnungen

### Payment-first (Denial-of-Wallet-Schutz)

```
1. Signup-Form (Email) →
2. Stripe Checkout ZUERST (Karte-Verifizierung + Radar)
   → ohne gültige Karte: kein Account, keine Postmark-Mails, keine Kosten
3. NACH Stripe-OK → Email-OTP (Postmark)
4. NestJS: Webhook succeeded → X-Auth-Token
5. Redirect → <workspace>.jimesh.io → Token-Exchange → Keycloak
```

### OTP-Politik (SMS komplett gestrichen)

> Operator: „wer benutzt heute schon sms"

| Kanal | Provider | Status |
|---|---|---|
| Email-OTP | Postmark `otp@jimesh.io` | **V1-Standard** (nur Sender-Verifizierung offen) |
| SMS-OTP | — | **GESTRICHEN** (Backlog idee: falls je nötig → Twilio ~5ct, nicht ACS ~9ct) |
| TOTP | Keycloak nativ | aktiviert viarealm-template (HmacSHA1, 6 digits) |

**Hard-Throttles (unabhängig von Zahlung):**
- OTP-Versand: max 3 / 24h / Email-Adresse
- OTP-Verifikation: max 5 Versuche, dann 15-Min-Lockout
- hCaptcha/Turnstile (Cloudflare Turnstile) auf Signup
- Postmark Daily-Cap + Alert

### 2FA-Verteilung (Keycloak implementiert das meiste nativ)

| Fall | Wer | Wie |
|---|---|---|
| Payment | **Stripe** | 3DS2 + Radar (in Checkout, nicht bei uns) |
| New-device login | **Keycloak** | Conditional-Flow „new device → TOTP step-up" + remember-device-Cookie |
| JWT expired / Refresh | **Keycloak** | Session-Idle/Max-Limits; abnormaler Refresh → Session-Invalidierung + Email-Alert; Re-Auth + TOTP |
| TOTP-Enrollment | **Keycloak** | otpPolicy im Realm-Template schon definiert |
| Email-OTP (Bootstrap only) | **NestJS** | Signup-Verifizierung via Postmark |

### Keycloak

- Keycloak bleibt der Session-IdP; Entra External-ID (falls je nötig) als upstream-föderation, **50k MAU gratis**
- jimesh-Realm: TOTP + Conditional-Browser-Flow ergänzen (new-device-condition)
- Realm-JSON bleibt versioniert im Deploy (Portabilitäts-Mandat: „A Keycloak realm exports to a JSON file… you can diff, commit")

### Repo-Zuordnung (finale Klarheit)

| Was | Repo |
|---|---|
| Enterprise-Backend (NestJS) + Site-Frontend | **jimeshIO** `enterprise/` (NEU) |
| App-Billing-Section | **ENTFÄLLT** — App kennt nur `cloudLinked`-Bool + tiefen Link auf `https://jimesh.io/account/billing` |
| Invoices/Payment-Methods | 100% Stripe-Portal, jimesh.io-account/billing (NestJS minted Portal-Session) |
| Karten in unserer DB | **NEIN** |
| OSS-Core | kriegt **keinen** Stripe-Code |

### Feature-Gating in der App (Operator-Prompt wörtlich)

> „im frontend die jimesh resourcen ausgeblendet werden wenn der user noch keinen jimesh.io account hat"

- Recherche-Befund (2026-10-14): existierender Mechanismus = **kein Entitlement-System**; Premium-Licence-Skeleton unvalidiert (`licensed: true` hardcoded, Kommentar „free shit"); Nav statisch (`section-nav.ts`, `SHOW_ADMIN_NAV`); kein `cloudAccount`.
- Plan: `NavEntry`-Extension `requireCloud: true` → Consumer (section-nav + HierarchySidebar) filtern nach `useCloudAccount()` (react-query, `GET /api/cloud/account`). Ohne Account: Cloud-Ressourcen (Provisioning, Managed Services) **ausgeblendet** — same pattern wie Admin locked-panels (zero fetch, honest lock UI).

## Work Packages

| Nr | Task | Status |
|---|---|---|
| ES-1 | NestJS-Scaffold in `jimeshIO/enterprise/` (new NestJS app incl. Dockerfile, nest configs) | [x] — Beweis: f5f0221 | 
| ES-2 | Signup-Flow: Entra External-ID user flow (Email-OTP via Postmark-OPTION b oder MS-Absender) + политики-Entscheid документiert | [x] — Beweis: f5f0221 | 
| ES-3 | Stripe: Checkout-Session-Factory, Webhook-Endpoint (verify signature + Radar-Status), Webhook-Secret rotation durch Key Vault | [x] — Beweis: aa0ccda | 
| ES-4 | X-Auth-Token (Ed25519, JWKS-Endpoint), one-shot, auditierten jti-Log | [x] — Beweis: aa0ccda | 
| ES-5 | Go-CP: `POST /api/cloud/exchange` — X-Auth-Token ↔ steht Keycloak-Session说起 (linking table `cloud_customer_id` ⟷ `keycloak_sub`, ONE timeUUID) | [x] — Beweis: 78687b6a | 
| ES-6 | Feature-Gating: NavEntry.requireCloud + useCloudAccount-Hook + 4 Cloud-Views откauthpling (Provisioning, Managed Services, Workspace-Billing-Link) | [ ] |
| ES-7 | jimesh.io/workspace Subdomain: Caddy-Ingress Wildcard Zertifikat für `<workspace>.jimesh.io` **oder** `<tenant>.cp.jimesh.io` (Alte Planung: `onboard-tenant.sh` → `<tenant>.cp.jimesh.io`; Operator entscheiden) | [ ] |
| ES-8 | NestJS: Stripe-Customer-Portal-Mint-Endpoint (Server-to-Server mit key-vault-secret) | [x] — Beweis: aa0ccda | 
| ES-9 | Audit: alle ES-Stellen in RM35 `admin_audit_log` (idempotent, fail stderr) | [x] — Beweis: 78687b6a/aa0ccda | 
| ES-10 | Verifikation: NestJS e2e (Jest), Go-CP integration tests, Frontend vitest suites, check:i18n | [x] — Beweis: branch `feat-es10-e2e` (enterprise/tests/e2e two-repo co-boot: jest NestJS on :3900 + packages/go/cloudexchange/e2esidecar on E2E_CLOUDCP_PORT serving the REAL exchange handler + the ES-6 /api/cloud/status mirror; Postgres settings-KV (store.Open posture), suite skips whole without DATABASE_URL/go; 5 tests = full token chain (signup→OTP→checkout→webhook-mint→exchange-302→KV-legs→status cloudLinked:true), replay 409 one-shot, X_AUTH_TEST_TTL=1 expiry 401, ES-12 cookie-pair;caught+fixed ES-12 X-Captcha-Mode em-dash ERR_INVALID_CHAR 500 bug (unit res.setHeader mock masked it); gates: e2e-es10 5/5, enterprise 103/103, site vitest 8/8, build green, go vet/build green. check:i18n not applicable in enterprise lane — no FE i18n strings touched) |
| ES-11 | Dual-Surface + Cloudflare-Zonen (A8): public (Landing/Demo/Blog) vs. post-login (SSR, nie public) — CF Access-Policies, robots/hotlink-Härtung, Next-vs-NestJS-Layout-Note | [ ] |
| ES-12 | Secure Sign-in-Form VOR dem Card-Gate (returning users): `src/auth/signin/` (signin → Email-OTP → Session-Cookie-Pair → payment-handoff), IP-Throttle 5/h, CPS (Turnstile-Mode ON/OFF) — commit pending on `feat-es12-signin-flow` | [x] — Beweis: branch `feat-es12-signin-flow` (ES-12 suite 21 tests, build green) |

## Backlog

- ACS SMS (gestrichen im V1)
- Entra-External-ID-Federation (falls MS-Kosten vs Keycloak-vertikal unklar wird)
- Startup-Programme (Azure Foundersück)
- `enterprise/`ient Directory layout finalisierung

### ES-12 — Secure Sign-in-Form vor dem Card-Gate (2026-10-15)

> Operator verbatim (2026-10-15): „ergänzender SIGN-IN-Flow für RETURNING users, secure-form-mäßig VOR dem Card-Gate" + „returning users können IP-sessions resumen; wenn der User kein Active-Subscription hat → redirect zu checkout".

Module: `enterprise/src/auth/signin/` (NestJS, gleiche Patterns wie ES-2 Signup-Flow — in-memory State 30-min TTL, sha256-OTP constant-time, Postmark-Adapter **reuse**). Kein JWT im Cookie: H1-Style `__Host-jimesh_session` (HttpOnly, Secure, SameSite=Strict, Path=/) trägt die **opaque session-store-row id** + `jimesh_csrf` Double-Submit-Pair (FE echo `X-CSRF-Token`).

| Route | Body | Response | Errors |
|---|---|---|---|
| `POST /api/auth/signin` | `{email, cf-turnstile-response?}` | `{signin_id}` (30 min) — **idempotent 200 `{active_session:true}`** bei live H1-Session (kein Row-Overlap) | 400 email fehlt / turnstile-token fehlt (Mode ON) · **403 turnstile siteverify fail** (Mode ON) · **429 IP-Intake 5/h/IP (hard)** |
| `POST /api/auth/signin/otp/request` | `{signin_id}` | `{sent:true}` (Postmark reuse, **3/24h/E-Mail**) | 404/409 · 429 · 503 POSTMARK fehlt |
| `POST /api/auth/signin/otp/verify` | `{signin_id, code}` | `{email_verified:true}` + **Cookie-Pair-Issue** | 401 falscher Code · 429 Lockout 5 Versuche/15 min |
| `POST /api/auth/handoff/payment` | `{signin_id}` (Session-Cookie + CSRF-Echo Pflicht) | **Returning payer** (Stripe `customer_id` existiert) → `{workspace_url, x_auth_token}` (Checkout SKIPPED, X-Auth-Mint via shared `XAuthMintService`); sonst → `{checkout_url}` (Stripe SETUP-Intent, Card-Verify-First isoliert analog ES-2) | 403 verify first / kein Session-Row / `csrf_token_mismatch` · 409 consumed · 503 STRIPE fehlt |
| `GET /api/auth/signin/widget` | — | `{captcha_mode, site_key\|null}` (FE Turnstile-Widget nur wenn key served) | — |

**Anti-abuse:** IP-Intake `5/h/IP` in-memory (Trust-Proxy=1 am Bootstrap, sonst würde der shared Proxy-IP-Bucket alle sperren) + 3/24h/E-Mail + 5-Try-Lockout 15 min (wie signup, test-locked). **Captcha-Mode-Contract:** `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` beide gesetzt → **ON** (fehlt Token → 400, ungültig → 403 via siteverify); beide fehlen → **OFF** (soft fallthrough + Header `X-Captcha-Mode: off (operator) — turnstile recommended in prod`). Site-Key via `/signin/widget` an FE; Secret bleibt server-side. Site-FE: `enterprise/site/app/signin/page.tsx` (email → OTP → handoff redirect; en/de; Turnstile-Widget nur bei served site_key, explicit render).

**Bewusst deferred:** ESC-4-Persistence für Session-Store (in-memory wie Signup-State — Multi-Instance → Redis/PG 1:1), Subscription-Check gegen echten Plan (returning payer = Stripe-customer-exists als Proxy), ES-6/ES-7 workspace-DNS Hartverdrahtung (`JIMESH_WORKSPACE_URL` sufficient, Fallback-Chain).

## Deploy-Topology (Startup-Phase, Operator 2026-10-14)

> Operator: „die jimesh haupt website nicht mit k8s deployen aber mit so nem container run scheiss irgendwas billiges. also die internen jimesh dashboards können dann ruhig in k8s gehostet sein, müssen sie sogar dann" + „zumindest das backend oder man muss irgendwie hinter den egress ingress kommen"

```
                    jimesh-net / Traefik
┌────────────────────────────────────────────────────────────┐
│  jimesh-website (nginx:alpine, static)     ◄── billig      │
│  jimesh-site-api (NestJS container)        ◄── billig      │
│        │  (same docker network — kein Egress-Gate-Problem)  │
│        ▼                                                    │
│  jimesh-backend (Go-CP)  ── postgres/redis/vault/keycloak   │
│                                                            │
│  Stripe-Webhooks → Traefik → NestJS (/api/enterprise/webhooks/stripe, │
│   Stripe-Signature-Verifizierung, Secret aus Key Vault)     │
└────────────────────────────────────────────────────────────┘
```

| Komponente | Deploy-Style | Grund |
|---|---|---|
| jimesh.io Site (nginx + NestJS) | **plain `docker run`/compose** auf dem CP-Node | kein K8s-Overhead für die Startup-Phase |
| JiMesh-interne Dashboards (Grafana/SIEM/datalake/utility/agents) | **K8s ( muss)** | Operator-Verpflichtung (AKS-Sprint) |
| User-Workspace-Container | gVisor-Environment (default) | SPRINT-DEPLOY-DUAL-ENV-K8S-GVISOR |

- **Egress/Ingress-Gelöst:** NestJS sitzt im selben Docker-Netz (`jimesh-net`) wie der
  Go-CP — Kommunikation läuft intern (kein Tunnel/Ingress-Dancing); Traefik-Routen
  öffnen nur die öffentlichen Pfade (Site, Stripe-Webhook-Route mit Signatur-Check).
- Egress-nft-Gates betreffen **nur User-Workspace-Container**, nicht Infra-Container.
- → löst OQ2 des Enterprise-Sprints.

- **Noch eine Option (Operator 2026-10-14, „ooooooooooooooooooooder"):** Card-Verify-first, Kauf-Teil IM GEHEIMEN Netz:
  - Signup nur mit Email → **Karten-Verifizierung zuerst** (Stripe Setup-Intent + 3DS2, Public-Fläche besteht nur aus der Checkout-Hosted-Page — zero Fake-Data-Antwort)
  - Nach Card-OK: NestJS mintet x-auth → der **komplette Kauf-Teil** (Pricing-Buchung, Workspace-Name, alles außer Landing/Demo/Blog-Talking) läuft im **geheimen Netz** (Dashboard-2-Surface): CF-Tunnel + x-auth-Header + IP-Restriction
  - Vorteil: die sogar die Checkout-Seite für unsere Tier-Verwaltung wird nie im Post-Card-Trail (kein public-web), nur Stripe-laufende Hosted-Checkout-Seite bleibt öffentlich — einem Page-Viewer bleibt nur Marketing + "Sign up"-Button, der auf Stripe hosted Page weist
  - 2 Dashboards bleiben (public sales = marketing only + card-verify-routing, internal = kauf + verswaltung)

## Offene Punkte

- **OQ1** — Subdomain-Basis: `<workspace>.jimesh.io` (Operator-Wortlaut) oder `<tenant>.cp.jimesh.io` (alte onboard-tenant Planung)? Apex `*.jimesh.io` Wildcard-DNS/Cloudflare ok BUT marketing-apex wildcard braucht Cloudflare for SaaS oder ein Wild-Cert-Handling.
- ~~**OQ2** — NestJS-Hosting~~ → **GELÖST (Deploy-Topology oben)**: plain Container (nginx+NestJS) im CP-Node-Docker-Netz, kein K8s.
- **OQ3** — jimesh-site-Frontend: Next.js static + NestJS-Backend (Option A, empfohlen — Operator-Wunsch „das schreiben wir nicht in go") oder Next.js full-stack (Option B, 1 Deploy-Unit). **Kein zweites Enterprise-Dashboard nötig** — eine Next/Nest-Surface mit 2 Route-Klassen; App-Dashboards bleiben auf der Go-CP-Seite.

### A9 — Zona-2 stirkt NICHT-öffentliche: Robots noindex + Host-level (Operator 2026-10-14)

> Operator: „also die 2. zone soll auch ne strikte robots txt bekommen, bzw garnicht erst public sein"

- **Post-Login-Surface** (`/app/*` + `<workspace>.jimesh.io`):
  - `robots.txt`: strikte Direktive — `User-agent: *; Disallow: /app; Disallow: /account; Allow: /` (nur public-Pfade erlaubt)
  - **HTTP-Header `X-Robots-Tag: noindex, nofollow, noarchive`** auf allen post-login-Routen (Header schlägt robots.txt bei Scrapern, die die Datei ignorieren)
  - `<workspace>.jimesh.io` = **Host-Level noindex** (CF-Transform-Regel injected in den Viewer-Response-Header, gilt für alle Subpfade)
- **„garnicht erst public"** (Operator-Wunsch realisiert):
  - Cloudflare **Access-Policy** auf `/app/*` + alle workspace-Subdomains (Zero-Trust JWT-Gate — rührt vorbei, gibt nichts zu scrapen)
  - CF Gateway **Bot-Fight-Mode + WAF-Managed-Rules** einen Zone-Ebene (Blocked bei vermuteter scraping)
  - **Origin-Bindung**: Post-Login-SR-Server antwortet nur mit gültiger Access-JWT ODER Session-Cookie — ohne beide: **404** (nicht 3xx/200-Landing), damit Scrape-bots nie
  - **Keine Index-Aufnahme möglich bei DNS-Level**: recherche der Subdomain-DNS-Einträge reicht nicht, **CF-Access verlangt Login-Prefix** für alle Post-Login-Subdomains; Scraper kriegen im besten Fall 403/404, nie Content.
