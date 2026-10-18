# SPRINT-148 - Auth-Login-Hardening: Brute-Force-Lockout + Keycloak-only per Default

Ausgelöst durch: Leo (Operator), 28.9.2026 — bestätigter echter Security-Fund:
`POST /api/auth/login` (`internal/auth/auth.go`) prüfte ein Passwort per
`bcrypt.CompareHashAndPassword` gegen EINEN globalen Admin-Hash, mit nur
einem simplen 8-req/min-Request-Throttle (`loginThrottle`, zählt JEDEN
Request, nicht nur falsche Passwörter) und ganz ohne Reaktion auf wiederholt
FALSCHE Passwörter. `VITE_AUTH_MODE` (`.env.example`) erwies sich als reines
Frontend-Feld (0 Backend-Treffer) — es blendete nur das Login-Formular in
der SPA aus, der Endpunkt blieb per curl direkt erreichbar.

Mitten in der Umsetzung kam Leos zweite, explizite Order (deutsch, wörtlich):
„ICH WILL KEIN P1 VULN LOGIN... NIMM DAS RAUS WIR SPEICHERN AUCH KEINE
PASSWÖRTER IN DER DATENBANK" — das hat den ursprünglichen Plan (Opt-in
`JIMESH_AUTH_MODE=keycloak-only`, Default = alter Hybrid-Zustand) umgedreht:
**Keycloak-only ist jetzt der DEFAULT**, Passwort-Login ist die Ausnahme.

## Ziel

1. Echtes Rate-Limiting/Lockout auf `/api/auth/login` — unabhängig vom Modus
   (defense in depth, gilt auch während der Legacy-Escape-Hatch aktiv ist).
2. Der direkte Passwort-Login-Pfad (`login`, `setup`, `forgot-password`,
   `reset-password`) ist **standardmäßig deaktiviert** — kein Opt-in mehr
   nötig, ein Opt-OUT (Legacy-Escape-Hatch) für Bootstrap/lokale Dev-Umgebungen
   ohne Keycloak.

## WP1 — Brute-Force-Lockout (`internal/auth/login_lockout.go`, neu)

Zwei Ebenen, beide Redis-backed (`internal/streams.Hub`, die bestehende
`jimesh-redis`-Verbindung — keine neue) mit In-Memory-Fallback wenn
`svc.Streams == nil` (Redis deaktiviert, `--redis-enable=false`):

- **Pro IP:** `loginFailLimit = 5` falsche Passwörter innerhalb
  `loginFailWindow = 15min` sperrt diese IP. Eskalierend: eine "Strikes"-
  Zählung pro IP verdoppelt die NÄCHSTE Sperrdauer (15min → 30min → 60min →
  … gedeckelt bei `loginLockoutMaxWindow = 24h`) — ein Bot, der eine
  15-Minuten-Sperre einfach aussitzt, wird bei jeder Wiederholung langsamer
  statt in einem flachen, vorhersagbaren 15-Minuten-Takt weiterzuraten.
- **Global (Circuit Breaker):** `loginGlobalFailLimit = 20` falsche Logins
  über EINE BELIEBIGE Mischung von IPs innerhalb `loginGlobalFailWindow =
  15min` sperrt ALLE Login-Versuche (auch den echten Operator) für
  `loginGlobalLockout = 15min`. Begründung: es gibt genau EIN Admin-Konto
  pro Instanz — ein Angreifer braucht keine vielen Quell-IPs, um es zu
  brute-forcen, ein reiner Pro-IP-Limiter reicht nicht.

**Warum diese Zahlen:** 5/15min pro IP ist enger als übliche Multi-Tenant-
Richtlinien (OWASP ASVS 2.2.1 erlaubt bis zu 10) — bewusst, weil eine Sperre
hier NUR den einen legitimen Operator treffen kann, nie einen fremden
Mandanten (kein "Lockout als DoS gegen Dritte"-Risiko). Der globale
Schwellwert (20 = 4x der Pro-IP-Grenze) greift erst, wenn ein Angriff klar
über mehrere Quellen verteilt ist — ein einzelner Operator, der sich fünfmal
vertippt, sperrt zuerst seine eigene IP, lange bevor er den globalen Zähler
relevant befüllt.

Antwort bei Sperre: `429` mit `Retry-After`-Header (Sekunden bis zur
Freischaltung) und ehrlicher Nachricht im JSON-Body (`error.type =
"login_locked_out"`) — Mandat 2, kein stiller Fehlschlag, keine vage
Meldung. Jede ausgelöste Sperre wird geloggt (`[auth] LOCKOUT ip=…` bzw.
`[auth] GLOBAL LOCKOUT …`).

Redis-Schlüssel: `jimesh:authrl:ip:fail:<ip>`, `jimesh:authrl:ip:strikes:<ip>`,
`jimesh:authrl:ip:lock:<ip>`, `jimesh:authrl:global:fail`,
`jimesh:authrl:global:lock` — über neue, generische Hub-Methoden
(`streams.go`): `CountWindow` (atomarer Fixed-Window-Zähler via INCR+EXPIRE),
`SetLock`/`TTLOf` (Sperr-Marker mit TTL), `ResetCounter` (DEL, bei
erfolgreichem Login wird der Pro-IP-Fehlerzähler gelöscht — Strikes bleiben
bewusst erhalten).

Der bestehende `loginThrottle` (8 req/min/IP, zählt ALLE Requests inkl.
erfolgreicher) bleibt unverändert als zusätzliche, günstige erste
Verteidigungslinie bestehen — dieses Sprint fügt die fehlschlags-spezifische
zweite Ebene hinzu, ersetzt sie nicht.

## WP2 — Passwort-Login standardmäßig deaktiviert (`internal/auth/keycloak_only.go`, neu)

- `passwordLoginDisabled() bool` → `true`, außer die Umgebungsvariable
  `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN=true` ist gesetzt.
- Gated Routen (403, `error.type = "password_login_disabled"`, ehrliche
  Nachricht die auf `/api/auth/oidc/login` verweist):
  `handleAuthLogin`, `handleAuthSetup`, `handleAuthForgotPassword` (und
  damit transitiv `handleAuthResetPassword`, das auf ForgotPassword
  delegiert).
- `BootstrapDashboardAuth()` (`auth.go`): seedet KEINEN Passwort-Hash mehr
  aus `JIMESH_ADMIN_PASSWORD`, solange die Escape-Hatch nicht gesetzt ist —
  "keinen Credential für einen deaktivierten Pfad anlegen". Ein bereits
  bestehender Hash (aus einer Zeit vor diesem Sprint, oder aus einem
  früheren Escape-Hatch-Lauf) wird NICHT gelöscht — ein Operator kann die
  Escape-Hatch zurückschalten, ohne sein Passwort verloren zu haben. Das
  bestehende Legacy-Wipe (admin/admin, `dashboard_default_auth=true`) bleibt
  unverändert davor bestehen.
- `handleAuthStatus`: neues Feld `passwordAuthEnabled` (Spiegel von
  `!passwordLoginDisabled()`); `needsSetup` wird zusätzlich auf `false`
  erzwungen, wenn Passwort-Login deaktiviert ist (sonst würde die SPA
  dauerhaft ein Setup-Formular zeigen, das immer 403 antwortet).
- `dashboard_password_hash`-Setting/Spalte selbst bleibt unangetastet
  (größere Migration, außerhalb des Scopes) — nur der Code-Pfad, der ihn
  liest/schreibt/vergleicht, ist gegatet.

**Der Escape-Hatch `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN=true`** ist bewusst
als LEGACY-Ausweg benannt, nicht als normaler Modus (Mandat 2 — keinen
Fallback als Standardpfad verkleiden): er existiert, weil Keycloak selbst
einen Admin-Pfad braucht, bevor irgendetwas anderes sich einloggen kann, und
eine lokale Dev-Umgebung ohne konfiguriertes Keycloak sonst gar keinen Weg
ins Dashboard hätte. Gesetzt, reaktiviert er exakt das alte Verhalten
INKLUSIVE des neuen Rate-Limiters aus WP1 (der gilt unabhängig vom Modus).
Niemals auf einer echten Deployment-Instanz mit konfiguriertem Keycloak
setzen.

## WP3 — Frontend (`components/auth-gate.tsx`)

- `AuthStatus`-Interface: neues optionales Feld `passwordAuthEnabled?:
  boolean` (fehlt = `true`, kompatibel mit einem älteren Backend-Build ohne
  dieses Feld).
- `KeycloakLoginCard`: `onUsePassword` jetzt optional — der "Use password
  instead"-Link wird nur gerendert, wenn eine Callback übergeben wurde.
- `AuthForm`: neuer Prop `passwordAuthEnabled` (Default `true`). Ist er
  `false`, wird IMMER die reine `KeycloakLoginCard` ohne Passwort-Fallback
  gerendert (auch im `setup`-Modus, defensiv — der Server meldet in diesem
  Fall aber ohnehin `needsSetup:false`, diese Stelle wird also praktisch nie
  mit `mode="setup"` UND `passwordAuthEnabled=false` gleichzeitig erreicht).
- `AuthGate`: liest `data.passwordAuthEnabled` (Default `true`) und reicht
  es an `AuthForm` durch.

Backend-Enforcement ist die Instanz, die tatsächlich zählt — das Frontend
wurde bewusst ALS ZWEITES gebaut und hängt an keiner Stelle davon ab, dass
dieser Teil funktioniert; ein direkter `curl` gegen `/api/auth/login` ist
unabhängig vom Frontend-Zustand mit 403 (Default) bzw. dem neuen Lockout
(Escape-Hatch aktiv) konfrontiert.

## `.env.example`

Dokumentiert (im bestehenden Kommentarstil, direkt unter
`JIMESH_ADMIN_EMAIL`/`JIMESH_ADMIN_PASSWORD`):
`JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN` (Default/Zweck/Warnung) sowie die
Rate-Limit-Defaults aus WP1 (nicht über ENV konfigurierbar, bewusst fest im
Code dokumentiert).

## Verifikation

- `go build ./...` — OK (via `docker run golang:1.26-bookworm`, kein lokaler
  Go-Binary in dieser Sandbox).
- `go vet ./internal/auth/... ./internal/streams/...` — OK.
- Neue Go-Tests (beide Dateien `internal/auth/`, White-Box, gegen eine
  echte Wegwerf-Postgres — gleiches Muster wie `workspace_scope_test.go`,
  `store.Open(os.Getenv("DATABASE_URL"))`, SKIP statt Fail ohne erreichbare
  DB):
  - `keycloak_only_test.go`: `TestPasswordLoginDisabledByDefault` (alle vier
    Routen → 403 `password_login_disabled`), `TestPasswordLoginEscapeHatchReenablesLogin`
    (Escape-Hatch gesetzt → Setup 200, falsches Passwort → echtes 401),
    `TestBootstrapDashboardAuth_SkipsSeedingByDefault`,
    `TestBootstrapDashboardAuth_SeedsWhenEscapeHatchSet`,
    `TestAuthStatus_ReportsPasswordAuthDisabled`.
  - `login_lockout_test.go`: `TestLoginLockout_PerIP` (trifft den Endpunkt
    `loginFailLimit+1`-mal von EINER IP, prüft 401×5 dann 429 +
    `Retry-After`, prüft dass eine ANDERE IP unbeeinflusst bleibt),
    `TestLoginLockout_GlobalCircuitBreaker` (verteilt `loginGlobalFailLimit`
    Fehlversuche über ebenso viele verschiedene IPs — je 1 Fehlversuch, weit
    unter der Pro-IP-Grenze — und prüft, dass danach selbst eine
    brandneue IP 429 mit "circuit breaker" in der Nachricht bekommt),
    `TestLoginLockout_SuccessResetsIPFailureCounter` (ein erfolgreicher
    Login setzt den Pro-IP-Fehlerzähler zurück).
- `npx tsc -p tsconfig.app.json --noEmit` — ausstehend/nachzuholen (siehe
  Report).

## Operator-Kurzfassung: was Leo konkret setzen muss

- **Nichts** — Standardzustand nach diesem Sprint ist bereits Keycloak-only:
  `/api/auth/login`, `/setup`, `/forgot-password`, `/reset-password`
  antworten 403, `BootstrapDashboardAuth` seedet kein Passwort mehr.
  Login funktioniert nur noch über `GET /api/auth/oidc/login` (Keycloak).
- Falls `trading` aktuell schon einen funktionierenden Passwort-Login nutzt
  (z. B. weil Keycloak dort noch nicht vollständig verkabelt ist): dieses
  Deployment MUSS vor dem Rollout `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN=true`
  gesetzt bekommen, sonst ist der Operator selbst ausgesperrt (kein anderer
  Weg rein außer Keycloak). Auf `trading` ist Keycloak laut Investigation
  bereits real deployt und funktionsfähig (Commits `8c42156`/`63c8435`) —
  dort ist die Escape-Hatch also NICHT nötig, der Default ist der Zielzustand.
