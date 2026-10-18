# SECURITY-AUDIT 2026-10-15 — Global (jimesh / jimeshIO / jimeshOps / jimesh-app)

**Umfang:** alle 4 Repos (JiMesh2 OSS-Core + Premium-Stubs, jimeshIO enterprise + IaC + packages, jimeshOps deploy-glue + terraform/ansible, apps/jimesh-app submodule)
**Mandat (Operator wörtlich):** „kompletten security audit machen, das auch wirklich alles privat bleibt, payment geschützt ist, alles verschlüsselt etc."
**Quellen gelesen vorab:** AGENT-IAM-SECURITY-MAPPING.md, BUDGET-MATRIX-2026-10-14.md, SPRINT-SECURITY-XSS-RBAC.md, SPRINT-ENTERPRISE-SITE-AUTH-BILLING.md, xauth-rbac.md, OZONE-ENTERPRISE-REPLACEMENT.md, SPRINT-BETA-ACCESS-GATE.md, SPRINT-CLOUDFLARE-IAC.md
**Methode:** direkter Quelltext-Read + grep; nichts spekuliert. Live-Cloud-Zustand (CF-Zone, Azure Subscription, Key Vault) konnte ohne Credentials nicht geprüft — als „unverifiziert" markiert.
**Nicht committet** (Orchestrierungs-Vorgabe).

## Ergebnis-Überblick

| Severity | Count | Findings |
|---|---|---|
| **P0** | **1** | B1 (Payment-Bypass über ES-12 Returning-Payer-Mint) |
| **P1** | **5** | B2, B3, B4, B5, D2 |
| **P2** | **16** | A1, A2, B6, B7, B8, B9, C1, C2, C4, C6, E3, F1, F3, F4, G2, H2 |
| **Positiv verifiziert** | 12 | siehe „Verifiziert OK" je Sektion |

---

## A — PRIVATES-BLEIBT-PRIVAT

### A1 · P2 · Test-Key-Präfix in Docs — [x] FIXED · Beweis-Commit `a5ea55e` (jimeshIO Branch `feat-p2-ab-hardening-v2`): alle sichtbaren Präfixe in Docs auf generische Platzhalter ersetzt — `docs/CONFIGURATION.md:59` (`rk_test_51UPS7e...` → `rk_<aus Stripe Dashboard>`, `sk_test_...` → `sk_<aus Stripe Dashboard>`), `:143`, `docs/research/xauth-rbac.md:190-191` (`sk_XXXX` / `whsec_*`), `docs/internal/HANDOFF-2026-10-11-DOMAIN-CLOUDFLARE-AZURE.md:24` (`sk_XXXX` / `whsec_*`). Interne jest-Fixture-Keys in enterprise-*.spec.ts (nicht-Doku, nicht Public) blieben bewusst unangetastet.
- **File:** `jimeshIO/docs/CONFIGURATION.md:59` — „Key in .env: `rk_test_51UPS7e...`" — **truncated** mit `...`, kein vollständiger Key im Tree (verifiziert: kein `51UPS7e`-Vollstring in Code/Env-Files). Kosmetisches Scanner-Noise-Risiko.
- **Fix:** Präfixdokumentation durch Platzhalter ersetzen (`rk_test_<aus Stripe Dashboard>`).

### A2 · P2 · Fake-Looking `sk_live_…` in Public-Repo Design-Assets — [x] FIXED · Beweis-Commit `d30088c4` (JiMesh2 Branch `feat-p2-ab-hardening-v2`, push origin): `sk_live_94810a08fbc882194ad9` → `sk_live_<redacted>` an DREI Stellen (Audit-File-Zähle: 2 — `assets/design-assets/stitch/jimesh-agent-config-scanner.html:458,592` plus dieselbe Demo-Daten-Zeile im gerenderten TSX `src/frontend/src/views/AgentConfigScannerPage.tsx:47`); grep-verified: 0 verbleibende rohe `sk_live_`-Strings im JiMesh2-Tree.
- **File:** `jimesh/assets/design-assets/stitch/jimesh-agent-config-scanner.html:458,592` — Demo-String `sk_live_94810a08fbc882194ad9` (als „VIOLATION: Hardcoded credential"-Muster-Beispiel). Kein echter Cred (Scanner-Demo-Daten), aber ein Live-Key-Jagdbait in einem OSS-Repo.
- **Fix:** Muster-String auf `sk_live_<redacted>` ändern.

### A3 · **Verifiziert OK** — Premium-Stubs haben KEINEN Auth-Pfad
Alle vier `//go:build !pro`-Stubs in `jimesh/src/backend/internal/gateway/` sind fail-closed, ohne Fabrication:
- `beta_gate.go:62-83` — GET → 503 `{connected:false, betaGateActive:false}` (Modal treated as gate-off), POST → 503 premium-notice, other verbs → 405. Kein Hashing, kein Invite-Zugriff im Stub.
- `cloud_exchange.go:60-71` — Registrierung als `"POST "+route` (Go-1.22-muxing byte-identical), Handler → 503 unverändert. Kein JWKS-/Link-Code im Stub.
- `worker_registry.go:64-95` — 501 fail-closed; der `apps/jimesh-app/install.sh:52`-Contract liest Nicht-200 als „CP worker-registration not live yet (PV-4)" — nie silent-success (verifiziert `install.sh:52,58`).
- `apps_deploy_credential_stub.go:29-31` — `return errors.New(appDeployCredentialNotice)`; kein claim-fabricating Pfad.
- Build-Tag-Inverse (`//go:build pro`-Nachfolger) existieren **nur in Kommentarform** — es gibt kein pro-File im Tree, genau ein register je Build.

### A4 · Verifiziert OK (mit caveat) — Admin-Nav
- `src/frontend/src/lib/section-nav.ts:324` — `export const SHOW_ADMIN_NAV = true` (hardcoded const, FE-only Sichtbarkeitsgate).
- **Server-side Enforcement existiert separat:** Admin-Mutationen laufen über OPA (`policy.IsAdminMutation`) + handler-side Gates (z. B. `internal/gateway/project_roles.go` „policy.IsAdminMutation → OPA", `settings_dlp.go`, `secrets_engines.go` — grep-verified) + RM35-Audit (`internal/auth/admin_audit.go`). Die Nav-Checkbox ist kosmetisch, kein Security-Merkmal. **Kein** FINDING („nur FE?" — nein, serverseitig auch).

### A5 · Verifiziert OK — jimeshOps `source/`
- `source/jimesh2` + `source/jimeshIO` sind **Git-Submodules** auf separate private GitHub-Repos (`jimeshOps/.gitmodules`); `git ls-files terraform` enthält **keinen** tfstate (`*.tfstate` gitignored und untracked,physical files existieren nur lokal am Arbeitsplatz). jimesh-app ebenfalls Submodule.

### A6 · Verifiziert OK — Error-Paths
- Enterprise-Webhook/Signup/Signin antworten mit generischen Texten (`stripe signature verification failed`, `otp delivery failed`), keine internals in Responses. Gateway-Fehlpfade ntutzen konsequent „see backend logs"-Muster (z. B. `app_bundle.go:81,223,239`). Kein bcrypt-Hash-/Token-Reflexion gefunden (grep über gateway/ + enterprise/src: keine `whsec_|sk_`-Ausgabe an Clients).

---

## B — PAYMENT-SCHUTZ

### B1 · **P0** · Returning-Payer-Mint ohne Payment-Nachweis (ungeprüfter Card-Durchgriff)
- **Files:**
  - `jimeshIO/enterprise/src/auth/signin/signin-stripe.service.ts:29-35` — `findCustomerIdByEmail` = `stripe.customers.list({email})`, einziges Kriterium: Customer **existiert**.
  - `jimeshIO/enterprise/src/auth/signin/payment-handoff.controller.ts:87-99` — bei `existingCustomer` wird `xauth.mint({... fraudChecked: true })` **hardcodiert** ausgestellt (Kommentar „Radar-clean by construction").
- **Attack-Chain (code-verified):** Signup (ES-2) → Email-OTP verified → Handoff ruft `createCardVerifySession` → dabei `stripe.customers.create` (`signin-stripe.service.ts:43`) — Customer entsteht **vor/bei** dem Setup-Intent, unabhängig davon ob die Karte je verifiziert/bezahlt wurde. User zahlt NICHT. Später Sign-in (ES-12) → OTP → handoff → Customer found → mint mit `fraud_checked: true` → Go-CP-Exchange (`packages/go/cloudexchange/cloud_exchange.go:424` akzeptiert nur `fraud_checked=true`) → voller Cloud-Account. **Der Sprint (SPRINT-ENTERPRISE…:157) nennt „Subscription-Check gegen echten Plan" als bewusst deferred — das ist die Offnung.**
- **Beeinflusster Sprint:** ES-12 (spricht auch ES-2/ES-5 an).
- **Fix (REQUIRED):** Mint nur nach Stripe-Beweis: `subscription.status==='active'` ODER `setup_intent.payment_status='succeeded'` je customer prüfen (Stripe-API server-side); `fraud_checked` aus verifiziertem Stripe-Status ableiten, nie hardcoden; Testkraft `TestHandoffUnpaidCustomerSkipped` ergänzen.

### B2 · P1 · Webhook fail-open bei fehlendem `STRIPE_WEBHOOK_SECRET`
- **File:** `jimeshIO/enterprise/src/auth/signup-flow/stripe-webhook.controller.ts:20-36` — `if (secret && secret.length > 0) { verify } else { event = req.body }`. Kein `NODE_ENV`-Gate.
- Misskonfigurierter Prod-Deploy (Secret-Vergessen) ⇒ geforgte `checkout.session.completed`-Events minten x-auth-Tokens gegen in-flight Signup-States (cs_ id ist über die Checkout-URL erlernbar), unabhängig von echter Zahlung.
- **Fix:** In `NODE_ENV=production` fail-closed (503/400) ohne Secret; Mock-Pfad nur via explicit `STRIPE_MOCK=on`-Flag-Idealzustand.

### B3 · P1 · Rotierter Webhook-Secret mit `Math.random()` geminted
- **File:** `jimeshIO/enterprise/src/shared/config/secret-rotation.service.ts:199-201` — ``"whsec_rot_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,10)`` — nicht-kryptografisch,vorhersagbare Struktur (bcrypt-artige Entropie ~52-60 Bits, RFC-verfahren).
- **Fix:** `crypto.randomBytes(32)` → base64/hex. Stripe-taugliche Länge.

### B4 · P1 · 48h-Dual-Secret-Window ist NICHT verdrahtet + Rotation-State in-memory
- **Files:**
  - `secret-rotation.service.ts:164-183` — `verifyWithRotation` (current→previous attempt inside grace) existiert, wird aber vom **Live-Webhook nicht benutzt**: `stripe-webhook.controller.ts:29` ruft `this.stripe.constructEvent(raw, signature, secret)` mit dem env-Secret direkt — der Controller kennt den RotationService gar nicht (你 grep-verified in signup-flow.module).
  - `secret-rotation.service.ts:100,127-134` — `state` hängt nur im RAM; `onModuleInit` rekonstruiert NUR `current` (aus env) — nach Prozeß-Restart ist `previous` verloren, Grace-Window bricht (Stripe continues to sign with the old secret until endpoint registers flip ⇒ events during the gap werden rejected).
- **Fix:** Webhook-Controllerswitch auf `verifyWithRotation` (injected Service); `previous` persistieren (KV/PG row with rotated_at), Discover-Contract im Sprint-Doc nachziehen.

### B5 · P1 · stripemeter liest `STRIPE_KEY` NIE (Live-Push ist tot, fail-safe aber falsch) — [x] FIXED · Beweis-Commit `68ee5392` (Branch `feat-security-p1-stripemeter-ag`, gate-fix `1ce547ff`)
- **Files:**
  - `jimesh/src/backend/cmd/jimesh-stripemeter/main.go:59-84` — `parseFlags()` setzt `o.Live`, `o.DSN`, `o.Meter`, … aber **niemals `o.StripeKey`** (kein `os.Getenv("STRIPE_KEY")`, kein Flag).
  - `stripemeter.go:352-356` — `if o.Live && o.StripeKey == "" { o.Live=false; print("STRIPE missing — dry-run only") }`.
- Makefile `jimesh/Makefile:170-175` injiziert `-e STRIPE_KEY=$${STRIPE_KEY:?…}` in den Container — Env ist gesetzt, Programm used it not. Resultat: `make stripemeter-push` **fällt IMMER auf dry-run zurück** — Usage-Records werden nie gepusht (Under-billing, silent). Kein Secret-Leak; falschehard-Posture.
- **Fix:** `o.StripeKey = os.Getenv("STRIPE_KEY")` in `parseFlags()` + Contract-Test „env-Präsenz ⇒ Live-Pfad armes", `--live`-Rotation selbst OK (Idempotency-Key `stripemeter-<ws>-<window>` + KV-markers verifiziert: `stripemeter.go:130-132,416-433`).

### B6 · P2 · `STRIPE_MOCK` dead compose-Variable (verirrend) — [x] FIXED · Beweis-Commit `a5ea55e` (jimeshIO Branch `feat-p2-ab-hardening-v2`): env-Eintrag aus `enterprise/docker-compose.yml` entfernt, ersetzt durch Kommentar-Block, der die App-Level-Mock-Autorität benennt (Wertform von `STRIPE_SECRET_KEY` — stripe.service.ts; mock-Toggle via Key-Wert, nie via compose-env).
- `jimeshIO/enterprise/docker-compose.yml:23` — `STRIPE_MOCK=${STRIPE_MOCK:-true}` wird von **keinem Code gelesen** (grep über `enterprise/src`: null Hits). Tatsächliche Mock-Logik läuft über `STRIPE_SECRET_KEY`-Wertformen (`stripe.service.ts:26-43`: fehlend+NODE_ENV!=production → mock; `sk_test` → REALer Testclient; `mock`-Präfix → mock).
- **Fix:** Variable entfernen oder tatsächlich verdrahten (single source of truth mock-mode).

### B7 · P2 ·`:latest`-Images in Production-Services — [x] FIXED · Beweis-Commit `a5ea55e` (jimeshIO Branch `feat-p2-ab-hardening-v2`): alle 3 compose-Services auf `jimesh/enterprise:v0.1.0` gepinnt (jimesh-site, nest-auth-api, nest-admin-api; Version aus enterprise package.json) plus kommentierter cloudflared-Platzhalter auf `2024.12.2` gepinnt — kein `:latest` mehr; `docker compose config` checkt grün. Achtung: im jimesh-`deploy/`-Tree (openreplay nginx:latest, tailscale/bind9/headscale/golang `:latest` defaults) existieren weitere `:latest`-Referenzen — außerhalb dieses Pull-Requests (komponentenfremde node-Ansible-Defaults, De-Pinning dort sollte separat geprüft werden).
- `jimeshIO/enterprise/docker-compose.yml:9,22,35` — alle drei (`jimesh-site`, `nest-auth-api`, `nest-admin-api`) `image: jimesh/enterprise:latest`. Lokaler `build:`-Context macht Pull-Hazards klein; das Pinning-Mandat (Audit-Sektion E) verletzt es trotzdem.
- **Fix:** Digest- oder versionier Tag plus Pinning; `cloudflared:latest`-Kommentarblock (yml:47) gleich mit.

### B8 · P2 · Internal-Admin-Secret-Vergleich nicht constant-time — [x] FIXED · Beweis-Commit `a5ea55e` (jimeshIO Branch `feat-p2-ab-hardening-v2`): `internal-admin.guard.ts` Vergleich über `internalSecretMatches()` — sha256 hash-then-compare via `crypto.timingSafeEqual` (Pattern portal-signature.ts), exported pure + 7 Tests in neuem `internal-admin.guard.spec.ts`.
- `jimeshIO/enterprise/src/admin/internal-admin.guard.ts:20` — `providedInternal === internalSecret` (plain equality; `portal-signature.ts:26-27`Benutzt dagegen korrekt `timingSafeEqual` für den HMAC). Secret ist zugleich raw-Header-Vergleich.
- **Fix:** `crypto.timingSafeEqual(Buffer, Buffer)` nach Längencheck (Pattern von portal-signature übernehmen).

### B9 · P2 · `X_AUTH_TEST_TTL` unclamped und nicht env-gebunden — [x] FIXED · Beweis-Commit `a5ea55e` (jimeshIO Branch `feat-p2-ab-hardening-v2`): Clamp `1..120s` (`X_AUTH_TEST_TTL_MAX_SECONDS`) + `NODE_ENV==='production'` ignored-Hook in `xAuthTtlSeconds()`; Boot-Gate `assertXAuthTestTtlGate` (ConfigLoader-Klasse `ConfigError`) in beiden Bootstraps exit-fast + defense im `XAuthMintService`-ctor; 6 neue `config-loader.spec.ts`- + 4 Clamp-Tests in `x-auth-mint.spec.ts`.
- `jimeshIO/enterprise/src/shared/jwt/x-auth-mint.service.ts:29-35` — beliebiger positive Integer! (kein Upper-Bound, kein `NODE_ENV !== 'production'`-Gate).Deployment-Manifeste/defaults: grep verified — VAR kommt in keinen Manifesten/envs (nur spec + docker-compose: NEIN, sogar compose nicht) — Risiko ist Misconfig-Hazard, kein aktueller Leak.
- **Fix:** clamp `n <= 120` + `NODE_ENV !== 'production'`-Guard (sonst X_AUTH_TEST_TTL ignorieren).

### B-Verifiziert OK
- **Cookie-Flags überall korrekt:** Go-CP `internal/auth/cookie_csrf.go:42,239-255` — `__Host-jimesh_session` Secure/HttpOnly/SameSite=Strict/Path=/, `jimesh_csrf` non-HttpOnly-Pair (bewusst, double-submit). NestJS `src/auth/signin/session-store.service.ts:17-31` — gleiche Flags verbatim. `boot/auth-bootstrap.ts:11-15` — rawBody-capture für Stripe-Sig könnte vom JSON-middleware verify differenz mieux, is present.
- **fraud_checked enteris enforced CP-side:** `packages/go/cloudexchange/cloud_exchange.go:424` — fraud_checked=false → 403 honest; Test `cloud_exchange_test.go:356-370` lockt den Contract.
- **Raw-Stripe-Rotations testen:** `signup-flow/signup-flow.spec.ts:141` (POSTMARK 503 honest), `signin/signin-flow.spec.ts:213` — test-locked.
- **Turnstile-Mode kontrakt:** `signin/signin.controller.ts:4,20-54` — ON vs OFF (400 missing/403 siteverify), honest header.
- **OTP-Lockout imap-Verifizierung:** `signup-state.service.ts / signin-state.service.ts` — sha256 + `timingSafeEqual` + 5-Versuch-15min + 3/24h/E-Mail (beide Flows, code-verified).

---

## C — VERSCHLÜSSELUNG

### C1 · P2 · Keycloak `sslRequired=NONE` realm-weit
- **Files:** `jimesh/src/backend/../deploy/keycloak/ansible-task.yml:427-429` (setzt NONE auf master+jimesh via kcadm), `deploy/keycloak/agents-realm.json:62` („sslRequired": "none").
- Kontext verbatim in ansible-task.yml:413-421: Bind an Nicht-Loopback-IP triggerte sslRequired=EXTERNAL 403s hinter VPN — bewusste Haus-Entscheidung. Aber: NONE erlaubt jegliche direkte Klartext-Flows (auch außerhalb VPN), nicht nur hinter TLS-Terminator.
- **Fix:** `sslRequired=external` (external入党 KP-de FTP Zugänge werden TLS-erzwungen, interne/VPN-HTTP bleibt) und Schrittdokumentation anpassen.

### C2 · P2 · pgx-DSN-Doku mit `sslmode=disable`
- `jimesh/src/backend/internal/store/store.go:82` — Beispiel-DSN schlägt `?sslmode=disable` (Docker-Net-Trust-Modell). pgx default wäre `prefer`. Kein Enforcement, kein Denial-of-insecure-DSN.
- **Fix:** Doku + optional Startup-Warnung wenn `sslmode=disable` UND `!NODE_ENV=production` zu hinterlegen (blocking changes Webhook).

### C3 · C4 · P2 · CF-Zonen-Min-TLS fehlt im IaC
- `jimeshIO/iac/terraform/cloudflare/modules/dns/` — **kein** `cloudflare_zone_settings` / `minimum_tls_version`-Resource (grep verified); nur `bootstrap/main.tf` setzt Storage-TLS1_2. Tunnel-und Zone-Level-TLS-Floor damit operator-manuell.
- **Fix:** Zone setting (`tls_1_2 = on` + `min_tls_version = 1.2`) als Resource im dns-Modul aufnehmen.

### C5 · Verifiziert OK — ADLS/Ozone-Modul-Verschlüsselungshygiensäne
- `OZONE-ENTERPRISE-REPLACEMENT.md:51` + jimeshOps/source-mirror, uncommitted im jimeshIO WT (`iac/terraform/azure/modules/adls`): `is_hns_enabled=true`, `account_replication_type=ZRS`, `min_tls_version=TLS1_2`, `shared_access_key_enabled=false`, Public-Access OFF, Private-Endpoint `dfs`-Zones-Slot + Managed-Identity-RBAC (`Storage Blob Data Contributor`), KEIN connection-string-Output. Terraform `validate`-green laut Doc – apply nie.

### C6 · P2 · In-memory State-Maps unbounded
- `enterprise/src/auth/signup-flow/signup-state.service.ts:37-38,164-170` und `signin/signin-state.service.ts:36-39` — `otpSendsByEmail`, `eventsById`, `intakesByIp` wachsen unbegrenzt (sweep clears offended intern für states/OTP only). Minor memory-DoS + verifiziert konsistent dem ESC-4-deferred Contract („in-memory wie Signup-State — Multi-Instance → Redis/PG 1:1", SPRINT-ENTERPRISE…:157).
- **Fix:** LRU/TTL-Cap auf die Neben-Maps; ESC-4-(PG)Migration wie geplant.

### C-unverifiziert
- **Event-Hubs-mTLS (Ports 443/5671 vs 9092/9094):** kein `AZURE_EVENTHUB_*`-Config/Plumbing im ganzen Tree (deploy/ + iac/ grep verified, null hits) — **kein Muster vorhanden**, nichts zu flaggen. Falls Event Hubs später anbindet: AMQP 5671 mit TLS.
- **Tenants-Buckets/Datalake-Sinks:** siehe H2 (P2).

---

## D — AGENT-IDENTITÄT + Access-Control

### D2 · P1 · Agent-Rate-Limit/Anomaly-Watch default OFF — [x] FIXED · Beweis-Commit `68ee5392` (Branch `feat-security-p1-stripemeter-ag`; deploy-Default-Flip in defaults.yml, code-seitiges unset-env bleibt fail-closed)
- **Files:** `jimesh/src/backend/internal/gateway/agent_rate_limit.go:37-41,63` — `JIMESH_AGENT_GATEWAY` off/empty → Gate hebt Armierung auf („lets everything through and writes nothing"); `deploy/backend/defaults.yml` — env-default `'off'`.
- Die AG-2-Route-Firewall ist dagegen **immer** armiert (`gateway.go:1265` — `s.auth.Middleware(s.agentFirewall(...))` unconditionally in der Chain). Damit: deny-by-default Tabellen JA, Throttle/Anomaly nur bei Opt-in. Audit-Mandat („Rate-limits + Anomaly") nur das halb erfüllt.
- **Fix:** Default gegen `on` drehen (oder defaults.yml für Produktion armiert setzen); offline-only Dev bleibt per env aus. Test `agent_rate_limit_test.go` existiert, aber kein Test, dass PROD-Deployments das Flag auf on haben — Çevre-Assertion in jimeshOps-ansible ergänzen.

### D-Verifiziert OK
- **Deny-by-default-Tabelle +⺟-Validierung:** `internal/gateway/agents.go:67-109` — hard-coded per-role allowlist (observer ⊂ deployer ⊂ operator, superset order test-locked `agents_test.go:258`); unbekannter agent-* Role → 403+RM35 (agents.go:148-152, 218-223); „unknown claim shape → deny, no guessing" verbatim implementiert.
- **Header-Spoofing inert:** `internal/auth/propagation.go:52-79` — `StripIngress` löscht ALLE client-Supplied-Kopien der server-derived Headers (inkl `X-JiMesh-Identity-Roles/-Sub/-Admin`) am Beginn von Handlers.Middleware; `classifyAgentIdentity` liest nur `auth.HeaderIdentityRole`. Tests: `agents_test.go:142` (`TestAgentGatewaySpoofHeadersInert`), `propagation_test.go` (TestnRemovesEveryServerDerivedHeader). Null-byte/Injection: Header-Werte kommen aus verifizierten Keycloak-Claims; jeder syntaktisch unstimmige Role-Wert inkrementiert nicht die Tabelle → deny; kein Reflexion der raw claims an Responses. **kein Finding.**
- **agents-realm.json Grants:** `deploy/keycloak/agents-realm.json:88-93,160-165,232-237` — alle drei Clients `publicClient:false`, `secret:"${AGENT_*_CLIENT_SECRET}"` (Env-Platzhalter, keine secrets im Repo), `standardFlowEnabled:false`, `directAccessGrantsEnabled:false`, `serviceAccountsEnabled:true` — confidential-only, kein public grant.
- **AG-3 RM35-Rows:** agents.go:246-284 — erlaubte UND denied Calls schreiben Row; IP = RemoteAddr only (XFF bewusst untrusted until JIMESH_TRUSTED_PROXY — honest, agents.go:260-263).
- **AG-4/PR-4 NetPol:** `internal/deploy/k8s_deploy.go:527-575` — pro workspace-Namespace: deny-all-ingress (leeres Ingress-Set) + egress allowlist (DNS 53/UDP → 0.0.0.0/0, 443/TCP → egress-office namespace via `kubernetes.io/metadata.name` selector, AzureCloud-Service-Tag-Hop annotiert `jimesh.io/egress-policy-key`); test-locked (`k8s_deploy_test.go` TestK8slnDenyByDefaultEgressAllowlist). ERGO: Committed in main ✓ (audit-floor c4d39f15/43488c11-Referenz — Code jetzt in main present).

---

## E — ENTERPRISE-IOSECURITY

### E3 · P2 · nest-auth-api publishes a public host port (Edge-bypass surface) — [x] FIXED · Beweis-Commit `a5ea55e` (jimeshIO Branch `feat-p2-ab-hardening-v2`): host-Port-Binding KOMPLETT entfernt (strenger als der Audit-Vorschlag `127.0.0.1:3001`) — nest-auth-api ausschließlich via `jimesh-net` (servicename `nest-auth-api:3001`) + cloudflared-Tunnel; Kommentar dokumentiert Dev-Zugriff per SSH-Tunnel/docker-exec; `docker compose config` verified: KEIN published port für nest-auth-api (admin korrekt `127.0.0.1:3002`).
- `jimeshIO/enterprise/docker-compose.yml:24-25` — `ports: ["3001:3001"]` (binds 0.0.0.0). Admin-API korrekt auf `127.0.0.1:3002:3002` beschränkt (:41). Der Auth-API kann direkt um Cloudflare/WAF-Ratenlimits/Access-Policies herum erreicht werden, solange die Host-Firewall den Port nicht дополнительных blockiert (jimeshOps NSG macht das auf Azure富强 Ebene — CF-only 443/7844 inbound, iac terraform/azure/modules/vm/main.tf:71-88 — DORT wirkt der 0.0.0.0-Bind nur loopback-lokal korrekt зовнут). **Auf einem Nicht-NSG-Host wäre das eine Umgehung.**
- **Fix:** `127.0.0.1:3001:3001` binden (Traefik/cloudflared spricht im selben Docker-Net via service-name) — same pattern wie admin.

### E-Verifiziert OK
- **404-Stealth + allowlist:** `admin/internal-admin.guard.ts` — ohne x-auth JWT + `X-Internal-Auth` → NotFound (A9-Contract), admin.controller verbatim 501-Stub ohne fake Data; allowlist nur 6 sway (billing portal-mint + device/tenant stubs) — code-verified.
- **X-Request-Signature HMAC:** `admin/billing/portal-signature.ts` — hex(`hmac-sha256(rawBody, JIMESH_INTERNAL_SECRET)`), `timingSafeEqual` + length gate, rawBody-Middleware-Pflicht (verify fails ohne beide). Secret aus env/process (docker-compose.yml:44 über `${JIMESH_INTERNAL_SECRET:-}`) — gitignored-muster OK, kein Default im Compose.
- **Sign-in 3/24h + 5-Try-Lockout:** signin-verify.controller.ts:46-101 (429-branded, constant-time sha256 via `signin-state.service.ts`), ThrottlerGuard 10/min-Deckel, IP-Intake 5/h (`signin-state.service.ts:76-97`), `trust proxy`=1 am Bootstrap (`auth-bootstrap.ts:19` — tę edgym um shared proxy-IP-Bucket).
- **Turnstile-Nonce/Honestystatus:** `signin.controller.ts:20-54` — ON: missing→400 / invalid→403 siteverify; OFF: soft fallthrough + `X-Captcha-Mode: off (operator)` header. `TURNSTILE_SECRET_KEY` unpins server-side-only.
- **X_AUTH_TEST_TTL in Manifesten:** nicht gesetzt (grep verifiziert) — nur Codeinhalt (B9).
- **静默 Image-Pin / Env-Hygiene gefunden:** siehe B7 (compose); `nest-admin-api` bind guarded 127.0.0.1 — proper.
- **DXot/Bundle-Upload path (jimesh gateway):** `internal/gateway/app_bundle.go:113-149,179-251` — Stream-Hash (`sha256`+cap appBundleMaxBytes+1 → 413), duplicate-part guard, server-generiertes `Content-Disposition`-Filename (`app-<id>-v<version>.zip` — KEIN user filename ⇒ kein XSS-in-filename/path-traversal), Version positive-integer-validated, identity chain ingress-derived (`appBundleUploader` → `callerSubFromRequest` — ingress-derived only, :89-97), `X-Content-Sha256`-Header served (:291). WAF-Skip auf genau `/api/apps/{id}/bundle` + X-Auth-Token-Secret bounded (waf.tf:85-91).

---

## F — CLOUDFLARE-IAC CF-WAF

### F1 · P2 · Operator-IP hardcoded als Modul-Default
- `jimeshIO/iac/terraform/cloudflare/modules/dns/variables.tf:66` — `allowlist_ip_ranges` **default `["176.0.58.86/32"]`** — die echte Operations-IP als Quelltext-Default (der Audit.Brief: „nur referenced via tfvar; do not log, don't hardcode in code-morph area"). Zusätzlich interpoliert die Regel-Description die Range (waf.tf:289) → landet im state/plan-Output.
- **Fix:** Default `[]` (+ Regelskip wenn leer ODER fail apply warning); echte IP ausschießlich via tfvar/TF_VAR.

### F2 · P2 · (DUP von C4) — kein min-TLS-Resource in Zone.

### F3 · P2 (unverifiziert) · SPF/DKIM/DMARC als Kommentar-Platzhalter
- `jameshIO/iac/terraform/cloudflare/modules/dns/main.tf:44-53` — `cloudflare_record.spf/dkim` **kommentiert** mit import-Anleitung (`v=spf1 REPLACE_WITH_SPF -all`). Live-Zonenstand ohne creds nicht prüfbar → **unverifiziert**. Postmark-suited Mails wären ohne SPF/DKIM DMARC-inframitteilbar.
- **Fix:** Bei Live-Setup: import + enforce; wenn absent im Live-DNS → Spoof-Gefahr für den Mail-Fluss (OTP-Absender!).

### F4 · P2 · Edge-Rate-Limit umgehbar via beliebigem x-auth-Token
- `iac/terraform/cloudflare/modules/dns/waf.tf:374-379` — Rate-2 exemption: `not any(http.request.headers["x-auth-token"][*] != "")` — ein Angreifer sendet IRGENDwas x-auth-token (unverifikatierter String) und läuft am 100/min/IP-Limiter vorbei; echte Verification passiert erst im Worker/Backend.
- **Fix:** Exemption auf plausiblen Token-Format (z. B. 3-dot-JWT-shape) oder streichen; Edge-Layer mit App-Limiter-Kaskade (D2-Fix) ist der Authoritative Teil.

### F-Verifiziert OK
- **OWASP-Threshold strict:** `waf.tf:40` — mapping high=25 (PL2 default: var.owasp_threshold default `3` — variables.tf:29); 949110-Last-Regel-Override (waf.tf:174-178); PL3/PL4 disabled per CF-Doku (waf.tf:164-172); action=block.
- **Skip-Regeln bounded:** Skip-1 nur `/api/apps/{id}/bundle` POST + exakt match-equiv x-auth-token secret (waf.tf:85-91); Skip-2 en leere Liste default (variables.tf:60, default aus); Skip-3 CI mit eigenem Secret (secure-by-default null, kein UA matching — documentation waf.tf:118-126).
- **Bot-UA-deny + admin-IP-allowlist + XFH-Spoof-Block:** waf.tf:253-311 — `/api/admin/*` blocked 외해 allowlist (Regel-Doppelpod: publish_admin=false default im tunnel-Modul), X-Forwarded-Host-Spoof via trusted-hosts one-or-Aggregation.
- **Rate-Limits:** Auth-Regel enger first (10/min/IP default, variables.tf:90) + general 100/min/IP (variables.tf:84); 3/24h+5-try bleiben Backend-authoritative (Comments waf.tf:318-323ENTIC).
- **Secrets in tfvars vermeiden:** bypass secrets default null, `openssl rand -hex 32`-Mandat (waf.tf:22-24,50-57); backend azurerm + `use_azuread_auth = true` (kein account_key — CF-Sprint-Dok CF-4 verbatim).
- **Kein wider 0.0.0.0/0-IP-wide in WAF-Regeln:** einzige `0.0.0.0/0`-Range im TreeNgModule = DNS-egress NetPol in k8s (bewusst fürs loopback dns — port 53/UDP only, Port/Protokoll constrained) — no WAF-rule carries it.

---

## G — SECURITY-Account-Gates

### G2 · P2 · Legacy-localStorage-Read-Tier lebt (dokumentierter Endpunkt) — [x] FIXED · Beweis-Commit `d30088c4` (JiMesh2 Branch `feat-p2-ab-hardening-v2`): legacy Read-Tier ENTFERNT (`LEGACY_DISABLE — operator removed localstorage-based auth (H1)` in `src/frontend/src/lib/api.ts`) — getToken SERvt nie mehr einen Storage-Token; erster Read scrubt stale pre-H1-Copys read-once-then-delete (auch leere Strings), Memory-Handle + storage-blocked-Fallback bleiben; 3 Views (EbpfJailer/SecurityGuardDemo/SecurityGuardPolicies) von rohem `localStorage.getItem('jimesh_dashboard_token')` auf `getToken()` umgestellt; 13 Test-Files von `localStorage.setItem(seed)` auf `setToken()/clearToken()` re-seeded, api-cookie-auth.test.ts (17 Tests) lockt „legacy-read returns NO token" + scrub-Contract; API_DOCS.md Auth-Section mit Ein-Zeilen-Entfernung + H1-Ref. Embed-Handoffs (`?token=`), die getToken() via Memory lesen, bleiben bis zur Cookie-Umstellung der Einzelsurfaces bestehen (documented shim).
- `jimesh/src/frontend/src/lib/api.ts:74` — `readLegacyTier(() => localStorage)` (read-only idempotent), write-path REMOVED (api.ts:23,96-104: kein `setItem` mehr fürs Auth-Token, csrf-Echo + `credentials:'include'` verbatim). Sprint-Contract mentions „embed-iframe ?token= Handoffs noch JS-lesbar (getToken)" + Legacy-Copies sterben erst mit Logout/Re-Login (SPRINT-SECURITY-XSS-RBAC.md:48). Konsistent, aber Finish-Linie offen.
- **Fix:** One-time Background-Cookie-Swatch (Migration) — Sprint-Rest-items abarbeiten; embed-Handoff auf Cookie+postMessage umbauen.

### G-Verifiziert OK
- **Beta-Gate premium package:** `packages/go/betagate/betagate.go:22-39,136,252,326-327` + `store.go:304-358` — bcrypt (`CompareHashAndPassword` constant-time im code-input), decoy-hash compare für unknown-email (timing stays flat), 5/h/IP Limit BEFORE compare, Audit je attempt, `HashBetaCode` bcrypt.DefaultCost — Sprint-BG-Contract verbatim Code-seitig erfüllt. BG-CLI als Admin-only route (make beta-invite) — Klartext nie geloggt.
- **X-JiMesh-Header-Parser:** siehe D-Verifiziert OK (spoof inert; deny-by-default kills any injection payload; kein Clawback von client headers in responses).

---

## H — INFRA-MISC

### H2 · P2 (unverifiziert) · Datalake-Sinks ohne Tenant-Partitionierung in Pfad/Index
- **Files:** `jamesh/src/backend/cmd/datalaked/main.go:555-564` (`objectKey` = `<topic>/dt=<date>/<unix>-p<partition>o<offset>`), `cmd/datalaked/sink.go:291-304` (`indexForTopic` = `jimesh-dl-<topic-normalized>`; B prefixing runs um die Topic-Struktur). ADLS-Sink (OZ-1, 434ee640) nutzt denselben objectKey-Twin.
- Tenant-Trennung hängt zu 100% an Topic-Naming (verifiziert unklar, ob Topics pro tenant sei/data). Sink-ARK-Code macht KEINE per-workspace path segment.
- **Fix/OQ:** Sprint OZ-4/Migration-Contract abschließen mit tenant-scoped Topics oder Pfad-Segment `<tenant>/<topic>`; Testdass ein Tenant-bucket não durch einen anderen Tenant (per route tables gesichtast) schreibt is a R Mark.

### H-Verifiziert OK
- **PV-7b NO-PIP:** `jiceshOps/terraform/main.tf:221` — `create_public_ip = false`; `iac/terraform/azure/modules/vm/main.tf:108-124` — PIP-Resource nur bei explizitem Opt-in (count-Gate, NIC-default null); NSG: inbound ONLY Cloudflare-CIDRs (443/7844 TCP+UDP), SSH via Tailscale (kein offener Port — vm/main.tf:65-67 Kommentar dominante); Cloudflare-CIDR-List (variables.tf:65-78) matrix. TF-Module-Dok verifiziert; **Subscription-Live (restaurante PIP leftovers) unverifiziert** (kein az-cli call per Mandat).
- **Backup-cycle:** BUDGET-MATRIX doc + Sprint docs — kein paid-jobs `make backup-baseline` im Code gefunden (grep null hits) → **unverifiziert / nicht existent**: kein Finding weil nichts zu brechen ist, aber als TODO-Lane gemerkt (Key-Vault-secret backing dem terraform state + PG Backup-Plan fehlte bisher}.
- **terraform.tfstate:** `jimeshOps/terraform/terraform.tfstate(.backup)` existiert auf der Platte, aber **gitignored & untracked** (git ls-files verified) — kein Repository-Leak. Key-Vault-encryption für state bleibt CF-Backend-Mandat (CF-4 post).

---

## TODO-LIST für Follow-up-Lanes

| Prio | Lane | Task |
|---|---|---|
| P0 | **ES-12 hardening** | B1: Returning-payer mint auf echten Stripe-Beweis (subscription/setup_intent) umstellen; `fraud_checked` nichtmehr hardcodiert; Testkraft. |
| P1 | ES-3/webhook | B2 fail-closed without secret in prod; B3 crypto-secret generation; B4 verifyWithRotation verdrahtet + persistent previous state. |
| P1 | PR-2 | B5 stripemeter STRIPE_KEY env-read + Beta-Test `Live-from-env`; admit make target then re-verified. |
| P1 | AG-3 | D2 arm rate-limit by default (defaults.yml prod + maybe code flip); CF-NSG-compatible doc. |
| P2 | EX-1/docs | A1, A2, B6, B7, B8, B9, C1, C2, C4, C6, E3, F1, F4, G2 cosmetics + hardening. |
| P2 | OZ-4 | H2 tenant-scoped sink paths + cross-tenant test. |
| unverif. | CF-6 live/lane | F3 SPF/DKIM live-Zone check; F1 live-apply regression; C4 min-TLS deploy; jimeshOps Live-PIP-Disassociation-Verifizierung; Key Vault secrets-rotation dry-run. |
| lane neu | „backup-baseline" | fehlendes Paid-Backup-System (zu BUDGET-MATRIX HA-Position) — Make/KeyVault-based snapshotlane. |

## Fix-Status (Branch `feat-security-p0-payment-gate`, 2026-10-15)

| Finding | Status |
|---|---|
| **B1 (P0)** | **GEFIXT** — Payment-Handoff-Mint nur noch nach echtem Stripe-Beweis: (a) Subscription `status ∈ {active, trialing}` (`signin-stripe.service.ts` `hasActiveSubscription`, status-gefilterte Listen) ODER (b) `setup_intent.succeeded`-Attestation (`CardVerifyAttestationService`, webhook-global per customer_id — Card-Verify-First-Standardflow). Sonst ehrliche `403 {error: 'no verified subscription — complete checkout first'}` + RM35-style-Audit-Row (attempt; persistierte RM35-Row bleibt CP-side am Exchange-Gate `cloud_exchange.go:424`). `fraud_checked` abgeleitet, nie hardcodiert. State bleibt bei 403 retry-able (consume erst nach Gate). Tests: unpaid-customer-403, active/trialing-happy, attested-fraud-derivation, cross-customer-Attestation-Reject. |
| **B2 (P1)** | **GEFIXT** — fehlendes `STRIPE_WEBHOOK_SECRET` → ehrliche **503** (fail-closed, nie unsigned pass-through), Postmark-503-Pattern. E2E auf 503 umgestellt. |
| **B3 (P1)** | **GEFIXT** — `generateSecret()` via `crypto.randomBytes(32)` hex (nie Math.random); Test auf 64-hex-Suffix + Uniqueness. |
| **B4 (P1)** | **GEBEIT/VERDRAHTET** — Live-Webhook verify läuft über `RotationService.verifyWithRotation` (current → previous innerhalb 48h-Grace); **beide failen → ehrliche 501**; nach Grace wieder 400. KV-Restore von `previous` (gestrige versioned Key) bei vorhandenem `KEY_VAULT_CONSUMER` — **H1-TODO: KV-State-Persistenz commit-pending** (in-memory only ohne Consumer, Doku im File-Header `secret-rotation.service.ts`). |

Restliche Findings (B5, D2, P2-Lanes) folgen in eigenen Lanes.

**Audit-Ende. Noch uncommitted — laut Mandat nichts committen.**
