# SPRINT-SECURITY-XSS-RBAC — Token-hardening gegen XSS→RBAC-Bypass

**Status:** 🟢 H1+H2 COMMITTED (c8d8826c); H3+H4 IMPLEMENTED in feat-cloud-stack (2026-10-14, commit pending)
**Datum:** 2026-10-14
**Operator-Vorgabe:** wörtlich unten (Medium-Analysis „Leveraging XSS to Execute CSRF Attacks")

## Befund aus Audit (2026-10-14, verifiziert)

| Fläche | Vektor | Status |
|---|---|---|
| **JiMesh-App-GO-CP frontend** | `src/frontend/src/lib/api.ts:6` — Session-Token in `localStorage` (`jimesh_dashboard_token`) → klassischer XSS→RBAC-Bypass (Token-Diebstahl + on-the-fly Admin-Forgery mit `Fetch + headers`) | ⚠️ real |
| **Enterprise-Site** (jimeshIO `enterprise/`) | kein Token im JS-Speicher — x-auth serverseitig geminted, one-shot, 302→CP; stealth-404 auf admin-api | ✅ sauber by design |

## Ziel

JiMesh-App-Session-Handling auf **HttpOnly Cookie + CSRF-Double-Submit** umstellen; CSP härten;
Re-Auth-Step-up für kritische RBAC-Mutationen. XSS-Schadcode kann dann weder Token stehlen
noch im Namen des Opfers handeln.

## Verbindliche Maßnahmen (4 Work Packages)

| Nr | Task | Umsetzung |
|---|---|---|
| H1 | Token aus localStorage → **HttpOnly Cookie** | Auth-Endpoints setzen `__Host-jimesh_session` (Secure, SameSite=Strict, HttpOnly); `lib/api.ts` liest kein Token mehr — mutating requests senden zusätzlich den CSRF-Double-Submit-Token (non-JS-readable, aus Server-seitigem non-JS set: hidden-Form oder extra Header aus HttpOnly-Cookie-Paar). Legacy `localStorage.setItem` wird **entfernt** (auch Operator-Report-Fall „Item threw silently" geht stanno). Migration: bestehende Sessions auf Cookie-Swap (one-time background refresh) — Beweis: c8d8826c | 
| H2 | **CSP strict** | `Content-Security-Policy` in Next.js headers/neste-site: `default-src 'self'`, `script-src 'self' 'nonce-…'`, `connect-src` whitelist (CP + jimesh.io), `frame-ancestors 'none'` auf admin-Surfaces, **kein `unsafe-inline`** — Beweis: c8d8826c | 
| H3 | [x] **Re-Auth-Step-up für kritische RBAC-Mutationen** *(feat-cloud-stack, 2026-10-14 — commit pending)* — Beweis: 768ddd9b (totp 501-honest) | Admin-Mutationen (Passwort-Änderung, Rollen, Delete, billing-affecting) require: frische Passwort-Eingabe ODER TOTP-Prompt (Step-up-Mask aus SPRINT-ENTERPRISE 2FA-Verteilung erweitert um admin-mutations). TOTP via Keycloak-Realm-Policy — **totp-Zweig ehrlich 501, Keycloak-TOTP-Verify ist Rest-Item** (kein In-Tree-Keycloak-TOTP-Flow, kein improvisierter lokaler Seed-Verify) |
| H4 | [x] Detect-Schicht bleibt — Beweis: 768ddd9b | RM35-Audit (jede Admin-Mutation), Rate-Limits, **Session-Invalidation bei Refresh-Reuse: 2026-10-14 implementiert** (refresh auf toter Session-Row → `refresh_reused`-Audit-Marker + 401 + In-Process Force-Logout-Pin; Cluster-Store nicht verteilten — Review-Kommentar unten) |

## Bestehende Milderungen (bleiben, halbe Abdeckung nicht falsch verkaufen)

- React auto-encoding (XSS-Wurzel gedämpft) — vermesser Sandbox für innerHTML/markdown-views ist H1-prerequisite?
- OPA-Policy-Gate (`policy.IsAdminMutation`) —匙 der Token gestohlen wird, ist es trotzdem fiat: → deswegen H3
- RM35-Audit als Breach-PCI na VR

## Offene Fragen

- **OQ1** — Enterprise-Site admin-api: benötigt ebenfalls HttpOnly-Cookie-Paar (Session) + CSRF double submit auf nest side. ES-4 erweitern.
- **OQ2** — app-Backend (Go-CP): Cookie-Swap-Contract impliziert http.Session in Set-Cookie responders — der bestehende auth middleware-code reШ type. Klären im H1-Task vorab.

## Abhängig von

- SPRINT-ENTERPRISE-SITE-AUTH-BILLING (TOTP-Policy, Session-Invalidation Flow)
- SPRINT-RM35 (Audit-Hooks — existieren, wir verwenden)
- JiMesh2 core berührungen: auth endpoints + api.ts

## Umsetzungsstand (2026-10-14)

**H1 + H2 IMPLEMENTED in feat-cloud-stack (commit c8d8826c).** Backend: `internal/auth/cookie_csrf.go` — `__Host-jimesh_session` (HttpOnly, Secure, SameSite=Strict, Path=/) gesetzt bei Login/Setup/OIDC-Callback ALONGSIDE dem bestehenden DB-Session-Token (zwei Credential-Kanäle für die Migrationsperiode; Cookie gewinnt bei Mutations); `jimesh_csrf` Double-Submit-Cookie (nicht HttpOnly) + sha256-Nonce in der Session-Row; `X-CSRF-Token`-Pflicht für cookie-authentifizierte Mutations sonst 403 `csrf_token_mismatch`; Bearer-Kanal unverändert; Cookie-Pair stirbt beim Logout. Frontend: `lib/api.ts` — Token-Write-Path removed (`localStorage.setItem` nie mehr für Auth), Read-Tier read-only-idempotent (Legacy-Copies sterben mit ihrer Session/Logout/Re-Login), `credentials:'include'` + CSRF-Echo auf Mutations; CSP: `src/middleware.ts` + `app/layout.tsx` — per-request Nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `connect-src 'self' https://jimesh.io https://cp.jimesh.io`, `img-src 'self' data:`, kein unsafe-inline für Scripts; `frame-ancestors 'none'` auf allen Dashboard-Surfaces außer /website; dokumentierte Kompromisse: style-src 'unsafe-inline' (COMPROMISE-1), dev-only 'unsafe-eval' (COMPROMISE-2)). Offene H1-Finish-Punkte: embed-iframe ?token= Handoffs noch JS-lesbar (getToken), Legacy-localStorage-Copy lebt bis Logout/Re-Login (One-time-Background-Refresh zum Cookie-Swap alter Sessions folgt).

**H3 + H4 IMPLEMENTED in feat-cloud-stack (2026-10-14, commit pending).** Backend: `internal/policy/critical_mutation.go` (`IsStepUpMutation` — SMALLE Surface: `/api/users`, `/api/users/{id}` POST/PUT/DELETE, `/api/project-roles*`, DELETE `/api/workspaces/{id}`, PUT `/api/settings/{key}`; alles andere ohne Step-up) + `internal/auth/stepup.go`: Session-Row-Feld `RecentStepUpAt` (dashboard_sessions KV-Map — **kein neues Migration-Table nötig**, die Session-Rows leben bereits im Settings-KV; Feld abwesend/0 = „nie gesteppt" = stale); Middleware-Gate nach dem OPA-Allow: kritische Mutation ohne Beweis im 5-Minuten-Fenster → **403 mit strukturierter Antwort** `{"step_up_required":true,"step_up_methods":["password"],"error":{type:"step_up_required"}}`, KEIN Hard-Deny; `POST /api/auth/step-up {type,credential}` — password-Zweig NUR bei Legacy-Password-Login (env `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN=true`, bcrypt gegen dashboard_password_hash, Rate-Limit via Login-Throttle), **totp-Zweig → ehrlich 501** `step_up_totp_unavailable` (kein Keycloak-TOTP-Integration im Tree — improvisierter lokaler Seed-Verify wäre Security-Theater; dokumentiert als Rest-Item: Keycloak-TOTP-Enrollment/Verify über die Realm-Policy + Enrollment-Status-Fetch). Jeder Attempt (auch Failures) → RM35-Audit-Row: `step_up_required` (Gate-Halt), `step_up_password`, `step_up_totp_unavailable` (admin_audit_log, Actor = dieselbe verified Identity wie der RBAC-Gate, Target = Session-HASH). **Deployment-Honesty:** Gate armiert sich nur, wenn min. EINE Methode real verfügbar ist — auf Keycloak-only Deployments (Default) bleibt das Gate dunkel statt unerfüllbare 403s zu bricken; dort gilt die bestehende OPA+RM35-Abdeckung weiter. Frontend: `src/frontend/src/components/StepUpRequired.tsx` (+Test) — Inline-Dialog für den 403, Password-Prompt, Re-Post durch den Caller, ehrlich „TOTP is not available — password required" (Plain-Text bewusst, keine 60-Locale-Sweep für Security-Text beim ersten Ship). H4: `internal/auth/session_reuse.go` — Refresh-Reuse-Detection im EINEN Refresh-Pfad (POST /api/auth/sessions/refresh): Attempt auf bereits toter Row (ausgeloggt/revoked/expired-pruned) → RM35-Audit-Row `refresh_reused` (success=false, Target=Session-Hash) + 401 + In-Process Force-Logout-Pin (Audit-Throttle 1/Row/Minute — Replay-Spam schreibt das Trail nicht voll). **H4-Grenzen ehrlich dokumentiert:** Pin/Throttle sind in-process (kein verteilten Session-Store im Tree — der 401 hält trotzdem Cluster-weit, weil die Row in der SHARED KV-Map tot ist; nur Pinning/Throttle sind node-lokal); feineren Refresh-Token-Reuse-Tracking gibt es nicht (kein rotierender Refresh-Token-Store — dokumentierter SPRINT-ENTERPRISE-SITE-AUTH-BILLING-Rest).

Tests (feat-cloud-stack, 2026-10-14): `internal/policy` 2 neue (Critical-Surface + Exclusions), `internal/auth` 5 neue — `TestStepUpCriticalMutationFlow` (403 + Marker-Write → Success nach Step-up → 200, Stale-Marker nach 6 min → 403, Falsches Credential → 401 + Fail-Audit-Row), `TestStepUpNonCriticalMutationUnaffected`, `TestStepUpTotpHonest501`, `TestStepUpPasswordBranchDisarmedWhenLegacyPasswordDisabled` (403 password_login_disabled + Gate dunkel), `TestH4RefreshReuseOnDeadSession` (401 + genau 1 `refresh_reused`-Row + Pin + Live-Refresh-Regression 200) — alle gegen die Throwaway-DB (`make go-test`-Pattern, IP-geankerte Audit-Cleanup-Rows). Store-Helfer `DeleteAdminAuditByIP` ergänzt (testeigene Cleanup-Abgrenzung). FE: vitest 4/4 StepUpRequired; tsc 0 in geänderten Dateien (globale Fehler = documented foreign-lane baseline).
