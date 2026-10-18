# SPRINT-BETA-ACCESS-GATE — Join-Waiting-List vor Login (Startup-Phase)

**Status:** 📋 GEPLANT (Design verbindlich, Implementierung offen)
**Datum:** 2026-10-14
**Operator-Vorgaben:** siehe „Operator-Vorgaben (wörtlich)" unten

## Ziel

Bis Stripe-Live-Account existiert (Startup-Phase), ersetzt ein **Beta-Access-Gate**
(joins/waiting-list-Modal) den offenen App-Zugang: nur registrierte Emails +
echte Access-Codes (max 2–3 Test-User + Superadmin) kommen durch. Wenn Stripe
live geht, wird das Modal abgeschaltet (Settings-Flag).

## Operator-Vorgaben (wörtlich, 2026-10-14)

> „solange wir noch in startup phase sind, bzw bis wir nen stripe live account haben muss login
mit einem join waiting list modal quasi ersetzt werden und wenn man den code und email eingibt wo
wir erstmal nur 2-3 test user registrieren und den superadmin — das muss ein richtiger hash sein
nicht so ein 6 digits scheiß"

## Verbindliche Regeln

| Punkt | Umsetzung |
|---|---|
| **Kein 6-Digit-Code** | Access-Code = 32+ Bytes random, gespeichert **nur als Hash** (bcrypt/argon2 — bestehender Hash-Pfad im Store) |
| **Invite-Tabelle** | `beta_invites` (email, code_hash, used_by, max_uses=1, created_at, expires_at) — Seeds: Superadmin + 2–3 Test-User |
| **Seat-Limit** | Settings-KV `beta_max_users` (default 3); voll → Modal zeigt „Join waiting list" ohne Registrierungspfad |
| **Abschaltung** | Settings-Flag `beta_gate_active` — sobald Stripe-Live (`stripe_live_active`), Modal off → normaler jimesh.io-Signup-Flow |
| **Legacy-Login bleibt OFF** | `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN` bleibt false |
| **Constant-time compare** | Gate-API vergleicht Hashes mit konstanter Zeit (kein timing leak) |
| **Rate-Limit** | 5 Versuche/h/IP, Audit-Row pro Versuch (RM35-Pattern) |
| **Code-Provinienz** | Codes aus `.env`/Vault (operator-generiert), NICHT im Repo; Rotation per Admin-Route; Klartext nie geloggt |

## Flow

```
App-Load → BetaGateModal (vor auth-gate)
  Email + Access-Code → POST /api/beta/gate
  ├─ Error: Ratelimit/p4 Lockout, ehrliche Meldung (kein Account-Leak)
  └─ valid → normale Auth-UI (Keycloak-Flow unverändert)
```

## Work Packages

| Nr | Task | Status |
|---|---|---|
| BG-1 | Store `beta_invites` + `POST /api/beta/gate` (constant-time compare, rate-limit, audit) | [x] — Beweis: 78687b6a | 
| BG-2 | Frontend `BetaGateModal` vor `auth-gate.tsx` (i18n en/de + 58-Fallback-Sweep) | [x] — Beweis: 78687b6a | 
| BG-3 | Operator-Tooling: `make beta-invite EMAIL=x CODE=y` (one-command, hashed persist) + Removal-Doc für den Stripe-Live-Tag (Flag-Appointment) | [x] (feat-cloud-stack commit pending) |
| BG-4 | Verifikation: Go-Tests (constant-time, rate-limit, expired, max-uses), vitest modal suite, check:i18n | [x] — Beweis: 78687b6a | 

## Offene Frage

- Gilt das Beta-Modal auch auf jimesh.io (Enterprise-Site) oder erst nur App/CP? Vermutung: App-Gate reicht — die Site-Kommunikation eh hinter dem Signup-Payment-Flow.

## BG-3 — Operator-Tooling (implementiert, feat-cloud-stack commit pending)

Ein eigener Admin-CLI-Binary (`src/backend/cmd/jimesh-admin/`) komponiert die
BG-1-Store-Surface (Upsert = Rotation mit Seat-Reset, Settings-KV-Flags).
Hash = **derselbe bcrypt-Pfad**, mit dem das Gate vergleicht
(`store.HashBetaCode` → `CompareBetaCode`); der Klartext wird nie gespeichert,
nie ausgegeben, nie geloggt — der Summary-Print zeigt nur Salt-Präfix.

```bash
# Invite anlegen/rotieren (Upsert per lower(email) → EINE Row, Seat-Reset)
make beta-invite EMAIL=ops@jimesh.io CODE=<32+ Bytes random> [MAX_USES=n] [EXPIRES_AT=RFC3339|never]

# Gate global abschalten (Settings-KV beta_gate_active=false — normaler Signup-Flow)
make beta-gate-off [EMAIL=x]
```

Default: `MAX_USES=1` (Sprint-Tabelle), `EXPIRES_AT = +30d`. Codes kommen aus
`.env`/Vault (operator-generiert, nie im Repo); der DSN kommt wie bei
`cmd/server` aus `DATABASE_URL` (+ optional `ENTERPRISE_DB_SCHEMA` als
`search_path`-Runtime-Parameter, kein zweiter Store-Contract).

### Removal-Doc — Stripe-Live-Tag (BG-3 Flag-Appointment)

1. **Kein Auto-Shutoff im Backend:** der Sprint-Contract (Abschaltung, sobald
   `stripe_live_active`) ist dokumentiert, aber NICHT automatisch verdrahtet —
   der Operator läuft am Stripe-Live-Tag:
   ```bash
   make beta-gate-off   # → "beta gate is now off — normal signup flow applies"
   ```
   Der CLI-Help und der Summary-Print verweisen genau hierauf (honest: der
   Flag-Flip wird von der CLI zurückgelesen und bewiesen, nicht behauptet).
2. Danach gilt der **normale jimesh.io-Signup-Flow** (Keycloak); bestehende
   `beta_invites`-Rows bleiben unverändert liegen (Historie), das Modal ist
   inaktiv, solange der Flag auf `false` steht.
3. Wiedereinschalten (nur falls je nötig): der Flag ist ein Settings-KV-Wert —
   Restore via `settings`-Tabelle/Store-API auf `beta_gate_active=true` (kein
   eigenes Make-Target — die Abschaltung ist der One-Way-Path für den
   Stripe-Live-Tag).
4. `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN` bleibt davon UNBERÜHRT (bleibt false —
   eigene Regel).

