# AUTH-CONTRACT — Wie Authentifizierung in JiMesh funktioniert

> **Status:** Verbindlicher Vertrag, geschrieben gegen den Code (Sprint 27 WP6,
> TASK-026). Quelle ist der Code, nicht die Absicht: `internal/auth/auth.go`,
> `internal/auth/keycloak_oidc.go`, `internal/store/vault.go`,
> `internal/gateway/gateway.go`, `internal/ai/proxy.go`,
> `internal/provisioning/bridge.go`, `internal/security/freeze.go`.
> Jede Behauptung trägt eine `Datei:Zeile`-Fundstelle (Stand main `6c5776c`,
> 8.9.2026). Live-Gegenprobe per curl gegen `localhost:19091` — Ergebnisse in
> §6. Was (noch) nicht implementiert ist, steht in §5 — bewusst nicht als
> vorhanden beschrieben.

---

## 1. Identitäten — wer präsentiert was, wo

| Identität | Präsentiert | Wo akzeptiert | Fundstelle |
|---|---|---|---|
| Single-Operator (Mensch) | Passwort → 64-hex Dashboard-Session-Token als `Authorization: Bearer` | `/api/*` | `internal/auth/auth.go:518-547` (Login), `:383-390` (Gate) |
| Keycloak-Human (Mensch) | Keycloak-JWT (RS256, realm `jimesh`) als Bearer | `/api/*` | `internal/auth/auth.go:649-719` (Verify), `:386` (Gate-Reihenfolge) |
| Agent (M2M, provisioniert) | Session-Token aus `vault_tokens` als Bearer — vom Agent **injiziert bekommen** als `OPENAI_API_KEY`, nie selbst gewählt | `/v1/*` | `internal/store/vault.go:263-265` (Mint), `internal/provisioning/bridge.go:235-243` (Mint + Injektion), `internal/auth/auth.go:403-411` (Gate-Fallback) |
| Gateway-Admin-Key | `jimesh-sk-…` als Bearer | `/v1/*` | `internal/auth/auth.go:348-360` (Lesen), `:396` (Constant-Time-Vergleich) |

Regeln, die der Code erzwingt:

- **Ein Agent wählt seine Identität nie selbst.** `X-Session-Id`-Header und
  OpenAI-`user`-Body-Feld sind nur *unverifizierte* Hinweise; `ResolveSessionID`
  präfixt Fallbacks mit `unverified:` (internal/auth/auth.go:223-233). Verifiziert
  ist nur, was `store.MintSessionToken` gemintet hat und `ValidateSessionToken`
  auflösen kann (internal/auth/auth.go:224-228).
- **Kein Default-Admin mehr.** `BootstrapDashboardAuth` richtet beim Start aus
  `JIMESH_ADMIN_PASSWORD` (≥ 8 Zeichen) ein; ohne env zeigt der erste Besuch den
  Setup-Screen, Remote-Setup braucht einen einmaligen Code aus den Server-Logs
  (internal/auth/auth.go:111-138; Setup-Code-Gate :478-498, Constant-Time-Vergleich
  :487, einmaliges Verbrennen :498).
- **Die Identitätskette für Provisionierung:** Budget-Check → Session-ID generieren
  → Token minten (`vault_tokens`, TTL 24 h) → **vor** dem Spawn → Injektion als
  `OPENAI_API_KEY` in den Container → `CreateSession` mit
  `trust_class="provisioned"` (internal/provisioning/bridge.go:235-259;
  TTL-Konstante :67). Schlägt der Spawn fehl, wird das ungenutzte Token sofort
  widerrufen (internal/provisioning/bridge.go:246-248).

## 2. Flows

### 2.1 Passwort-Login (Dashboard)

1. `POST /api/auth/login` mit `{email, password}` — email ist informativ, das
   Passwort entscheidet (internal/auth/auth.go:523-525).
2. bcrypt-Vergleich gegen `dashboard_password_hash` (internal/auth/auth.go:531-539;
   Hash wird im Setup/Bootstrap erzeugt, :127/:500).
3. Erfolg: `issueSession()` — 32 zufällige Bytes als Hex, abgelegt in der
   Settings-KV `dashboard_sessions` als JSON-Map `token → expiry (unix ms)`,
   TTL **24 h** (`dashboardLoginTTL`, internal/auth/auth.go:56, :180-190).
   Abgelaufene Einträge werden bei jedem Lesen verworfen (:152-162).
4. Antwort `{token, email}` (:546). Das Frontend sendet ihn als Bearer.

Verwandte Routen (registriert in internal/auth/auth.go:86-97, verdrahtet in
internal/gateway/gateway.go:125): `/api/auth/status` (:442-452, antwortet
fail-closed mit `authenticated:false` für ungültige Tokens), `/api/auth/logout`
(:549-561, löscht den Token aus der KV), `/api/auth/change-password` (:563-596,
widerruft via `revokeOthers` alle **anderen** Sessions :594/:193-202),
`/api/auth/change-email` (:598-621), `/api/auth/forgot-password` +
`/api/auth/reset-password` (:625-633, **ehrlich 501** — kein Mail-Provider auf
Self-Hosted).

### 2.2 Keycloak-Login (Authorization Code + PKCE)

1. `GET /api/auth/oidc/login` — reiner Redirect (kein JSON): erzeugt Verifier +
   State, speichert sie **in-memory** mit 5-min-TTL und einmaliger Verwendung
   (internal/auth/keycloak_oidc.go:24-27, :38-65), und leitet 302 auf Keycloaks
   `/realms/jimesh/protocol/openid-connect/auth` mit `response_type=code`,
   `scope=openid`, `code_challenge_method=S256` (:111-127). Public-URL default
   `http://localhost:8081` (:81-86), Callback-URL default
   `http://localhost:19091/api/auth/callback` (:97-102).
2. `GET /api/auth/callback?code=…&state=…` — State wird verbrannt (:145-149),
   Code gegen das interne Token-Endpoint getauscht
   (`http://jimesh-keycloak:8080/realms/jimesh/protocol/openid-connect/token`,
   :151-172), Access-Token gegen JWKS verifiziert (RS256-only, :181-185 bzw.
   internal/auth/auth.go:649-719).
3. Es wird **kein Keycloak-Token an den Browser gegeben**, sondern ein ganz
   normales JiMesh-Dashboard-Session-Token gemintet (`issueSession`, gleicher
   Mechanismus wie 2.1) und per Redirect `frontendOrigin/?auth_token=…`
   übergeben (internal/auth/keycloak_oidc.go:192-201; Frontend-Origin default
   `http://localhost:19090`, :204-209). Leere `dashboard_email` wird aus dem
   `email`-Claim befüllt (:186-190).
4. Danach ist der Keycloak-User für `/api/*` auf zwei Wegen sichtbar: der
   frische Session-Token **oder** der rohe Keycloak-JWT — das `/api/*`-Gate
   prüft Keycloak zuerst, WP0-Session als Fallback
   (internal/auth/auth.go:385-389).
5. `BootstrapKeycloak` (Goroutine beim Start, internal/gateway/gateway.go:113)
   reconciliert idempotent Client-Secret und Realm-Admin-Passwort gegen die env
   via Keycloak-Admin-REST-API — weil `--import-realm` `${env.VAR}` nicht
   zuverlässig substituiert (internal/auth/keycloak_oidc.go:228-271;
   Secret-Reconcile :314-340, Passwort-Reconcile :342-364).

### 2.3 Session-Minting bei Provisionierung (M2M)

Siehe §1, dritte Zeile: `MintSessionToken` legt einen 32-Byte-Hex-Token in
`vault_tokens` mit `secret_name='session-auth'` (Sentinel) und
`agent_id=<session_id>` an (internal/store/vault.go:257, :182-200, :263-265);
TTL 24 h (internal/provisioning/bridge.go:67). Der Token landet als
`OPENAI_API_KEY` im Container (internal/provisioning/bridge.go:242-243) — der
Agent benutzt ihn also wie einen OpenAI-Key gegen `/v1/*`, was genau der
Fallback im `/v1`-Gate erkennt (internal/auth/auth.go:397-411).

## 3. Gates

Die Kette ist `corsMiddleware(s.auth.Middleware(s.mux))`
(internal/gateway/gateway.go:208). Alles gating läuft durch
`auth.Middleware` (internal/auth/auth.go:373-430).

### 3.1 Was offen bleibt

`/health`, `/frontend-dist`, **das gesamte `/api/auth/*`** und `/v1/models`
durchlaufen ohne jeden Check (internal/auth/auth.go:376-378). Begründung: man
muss sich einloggen können, bevor man eine Session hat; `/v1/models` bleibt aus
OpenAI-Kompatibilität offen. Alles andere ist fail-closed.

### 3.2 `/api/*` — Dashboard-Gate

Gültig ist **Keycloak-JWT (geprüft zuerst) ODER WP0-Dashboard-Session**
(internal/auth/auth.go:383-390). Die JWT-Prüfung ist RS256-only
(`WithValidMethods`, internal/auth/auth.go:670-702), verlangt Issuer
`…/realms/jimesh` (:713-716) und löst `kid` gegen das (einmalig gecachte)
JWKS von `JIMESH_KEYCLOAK_JWKS` auf (default
`http://jimesh-keycloak:8080/realms/jimesh/protocol/openid-connect/certs`,
:639-644, Cache :654-667). Scheitert beides → `401 authentication required`
(:387, :432-438).

**Wichtig:** Ein Keycloak-JWT allein genügt nur für das Gate; die
Policy-Ebene (§3.4) kennt Keycloak-Claims nicht — sie arbeitet ausschließlich
mit Session-IDs aus `vault_tokens`.

### 3.3 `/v1/*` — Proxy-Gate

- `gateway_auth_enabled` entscheidet (Settings-KV). Unset/`"false"` = offen;
  `BootstrapGatewayAuth` setzt es beim ersten Start ohne Wert auf `"true"` und
  generiert notfalls einen `jimesh-sk-`-Key, der **laut geloggt** wird
  (internal/auth/auth.go:306-344; Generierung :324-339, Ablage als JSON
  `{"apiKey": …}` :330-331). Live-Stand im Teststack: `true` (§6).
- Gültig ist der Admin-Key (Constant-Time-Vergleich, :394-396) **oder** ein
  nicht-widerrufenes, nicht-abgelaufenes Session-Token aus `vault_tokens`
  (:403-411 → internal/store/vault.go:272-295). `ValidateSessionToken`
  fehlschlägt grundsätzlich für Nicht-Session-Tokens (`secret_name`-Mismatch,
  internal/store/vault.go:281-283) — nie fail-open.
- Fehlbefund: `401 invalid or missing gateway key …` (:422). **Ausnahme:** wenn
  der Bearer ein ehemaliges Session-Token ist und
  `ValidateSessionToken` `ErrTokenRevoked` liefert → `403` mit
  `FrozenSessionMessage` (:418-421; Text :66-67). Das ist die „kontrollierte
  Sicherheitsmeldung statt Modellantwort" aus K-LAF WP3 — hier, weil
  `ResolvePolicy` für ein bereits invalides Token nie erreicht wird.

### 3.4 Proxy-Pfad-Enforcement (nach dem Gate)

Erst im Chat-Handler: `ResolveSessionID(r, sessionHint)` → `ResolvePolicy`
(internal/ai/proxy.go:143-152 für `/v1/chat/completions`, :557-558 für
`/v1/embeddings`). `ResolvePolicy` (internal/auth/auth.go:260-295):

- kein/`unverified:`-Session → erlaubt (:261-263, bewusster Backward-compat-Default);
- Session-Status `frozen` → verweigert, **vor** jedem Budget-Lookup (:278-280);
- Budget-Row disabled → `account_disabled`, erschöpft → `quota_exceeded`
  (:287-293); keine Row = Projekt hat Enforcement nicht optiert → erlaubt (:281-286).
- Die Deny-Antwort mappt `frozen` auf `403` + `FrozenSessionMessage`
  (internal/ai/scanner_hook.go:51-56).

### 3.5 Übersicht

```
Request ──► cors ──► auth.Middleware ──► mux ──► Handler
                      │
                      ├─ offen: /health, /frontend-dist, /api/auth/*, /v1/models
                      ├─ /api/*:  Keycloak-JWT (JWKS, RS256)  ODER  Dashboard-Session (dashboard_sessions-KV, 24h)
                      └─ /v1/*:   wenn gateway_auth_enabled=true:
                                     jimesh-sk-Admin-Key  ODER  vault_tokens-Session-Token
                                     (ErrTokenRevoked → 403 FrozenSessionMessage)
                                  danach im Proxy-Handler: ResolvePolicy (frozen/budget)
```

## 3b. RBAC-Enforcement auf `/api/*` Admin-Mutationen (Sprint 22 WP4, 8.9.2026)

Seit WP4 gibt es eine echte Autorisierungs-Schicht über der Authentifizierung:

- **Engine:** OPA/Rego embedded, `data.jimesh.rbac.allow`
  (internal/policy/policy.go; Default-Policy: internal/policy/policies/default.rego).
  Override per `JIMESH_RBAC_POLICY` (Pfad zu .rego-Datei); ein kaputtes
  Operator-Policy-File verweigert den Start (fail loud, kein stiller Fallback).
  Bundle-Server-Verteilung (sdk-Package) folgt mit dem ersten B2B-Deployment
  (E-Policy-Entscheidung).
- **Was bewertet wird:** nur MUTATIONEN (POST/PUT/PATCH/DELETE) auf
  Admin-Flächen (`/api/users`, `/api/consumer-keys`, `/api/budgets`,
  `/api/teams`, `/api/team-members`, `/api/app-categories`,
  `/api/security/freeze|release`, `/api/vault/*`, `/api/backups`,
  `/api/settings`). GETs bleiben für jede authentifizierte Identität lesbar.
  `/api/vault/access` (Agent-JIT-Endpoint, Vault-Token statt Session) ist
  explizit ausgenommen.
- **Rollen-Quelle:** Passwort-Operator = `source:"password"`, Rollen
  `["admin"]` (Instanz-Eigentümer). Keycloak = `source:"keycloak"` mit
  `realm_access.roles` aus dem verifizierten JWT — der Claim arrive erst
  durch den `realm roles`-Mapper, den `BootstrapKeycloak` idempotent auf
  den `jimesh-dashboard`-Client setzt, samt `jimesh-admin`-Realm-Rolle,
  die dem Realm-Admin-User zugewiesen wird (keycloak_oidc.go).
- **Entscheidung:** `allow if source == "password"`; `allow if source ==
  "keycloak" ∧ "jimesh-admin" ∈ roles`. Alles andere (default) denied.
  Engine-Load-Fehler = Admin-Mutationen abgelehnt (fail-closed, 500).
- **Ablehnung ist lesbar:** `403 admin permission required — denied by
  policy (source: …, roles: …)`.
- **Live verifiziert (8.9.2026, echte Keycloak-Direct-Grant-Tokens über
  einen temporären Test-Client, danach gelöscht):** Token ohne
  `jimesh-admin` → 403 (Mutation) / 200 (GET); Token mit `jimesh-admin`
  → 200; Passwort-Session → 200. Bootstrap-Logs: alle vier Reconcile-
  Schritte grün.

## 4. Token-Lifetimes + Revocation

| Token | Ablage | TTL | Widerruf | Fundstelle |
|---|---|---|---|---|
| Dashboard-Session | Settings-KV `dashboard_sessions` (JSON) | 24 h | Logout (einzelner Token), change-password (`revokeOthers`), Ablauf beim Lesen | internal/auth/auth.go:56, :152-162, :193-202, :549-561, :594 |
| Agent-Session-Token (`session-auth` in `vault_tokens`) | PostgreSQL, AES-loser Bearer | 24 h (`agentSessionTokenTTL`) | Freeze (`RevokeSessionTokens` — **alle** Tokens der Session), Release (`UnrevokeSessionTokens`), Spawn-Failure, `CleanupExpiredTokens` | internal/provisioning/bridge.go:67; internal/store/vault.go:235-239, :246-250, :298-301; internal/provisioning/bridge.go:246-248 |
| Vault-Access-Token (`vault_tokens`, anderer `secret_name`) | PostgreSQL | default 300 s | `RevokeVaultToken` | internal/store/vault.go:182-200, :226-229 |
| Gateway-Admin-Key (`jimesh-sk-…`) | Settings-KV `api-key` (Klartext-JSON) | unbegrenzt | Rotierbar via `/api/settings/api-key/regenerate` (internal/gateway/gateway.go:150) | internal/auth/auth.go:348-360 |

**Freeze → Revoke → Release (K-LAF WP3, internal/security/freeze.go):**

1. `POST /api/security/freeze` (internal/security/security.go:45) — nur
   `trust_class="provisioned"`-Sessions werden eingefroren; fremde erzeugen nur
   eine Warnung (freeze.go:88-95). Reihenfolge: **zuerst**
   `RevokeSessionTokens` (in-flight Requests sterben sofort, freeze.go:97-99),
   dann `docker pause` (Best-Effort, :101-108), dann Status `frozen` (:110-112),
   dann `security_events`-Eintrag (:118-121).
2. Wirkung auf den Agenten: das widerrufene Token liefert an `/v1/*` sofort
   `403 FrozenSessionMessage` (internal/auth/auth.go:418-421); der
   docker-pause-lose Weg über `ResolvePolicy` liefert dieselbe Message via
   `policyDenyResponse` (internal/ai/scanner_hook.go:51-56).
3. `POST /api/security/release` (internal/security/security.go:46) —
   `UnrevokeSessionTokens` stellt nicht-abgelaufene Tokens wieder her
   (internal/store/vault.go:241-250), `docker unpause` (Best-Effort,
   freeze.go:136-149), Status zurück auf `active` (:150-152). Während des
   Freeze abgelaufene Tokens bleiben tot (:243-245).

## 5. Noch nicht implementiert — ehrlich

Diese Punkte existieren **nicht** im Code; der Kontrakt verspricht sie nicht:

- **DPoP:** null Treffer im Backend (`grep -ri dpop src/backend` → 0). Bearer
  ist reiner Bearer; Proof-of-Possession ist reine R22/Zukunft.
- **`tenant_id`-Claim:** wird aus dem JWT nicht gelesen — die einzigen
  Vorkommen sind ein Doc-Kommentar (internal/auth/auth.go:647). Multi-Tenancy
  gibt es im Auth-Pfad nicht; `ResolvePolicy` kennt nur Project/Agent aus
  `sessions` + `project_user_budgets` (internal/auth/auth.go:241-247).
- **Role-Mapping aus JWT — seit Sprint 22 WP4 (8.9.2026) IMPLEMENTIERT,
  siehe §3b; hier nur der Rest:** die Rollen-Lesung ist da
  (`requestIdentity` liest `realm_access.roles`, internal/auth/auth.go),
  und Admin-Mutationen auf `/api/*` laufen durch die OPA/Rego-Policy
  (internal/policy). Noch offen: granulare Rollen jenseits von
  `jimesh-admin` (viewer/operator/team-lead), Project-Scoping pro Rolle
  und die Egress-Kopplung (Rolle → Dienst+Port, L4-only).
- **User-Sync (TASK-025, läuft):** aus einem Keycloak-Login wird kein
  JiMesh-User-Entity erzeugt; es fließt nur `email` → `dashboard_email`, und
  auch nur, wenn die Settings-KV noch leer ist
  (internal/auth/keycloak_oidc.go:186-190).
- **Keycloak-JWT an `/v1/*`:** abgelehnt — dort sind nur Admin-Key und
  Session-Token gültig (internal/auth/auth.go:392-426).
- **Bekannte harte Kanten (bewusst so gebaut, hier dokumentiert):**
  JWKS wird einmalig gecacht und nie refreshed (internal/auth/auth.go:654-667)
  — ein Keycloak-Key-Rollover braucht einen Backend-Restart. Der PKCE-State-Store
  ist In-Memory, single-instance (internal/auth/keycloak_oidc.go:38-41). Der
  Gateway-Admin-Key liegt als Klartext-JSON in der Settings-KV
  (internal/auth/auth.go:329-331). Dashboard-Sessions haben kein
  Refresh/Rotation und keinen List-Endpoint.
  - Live beobachtet (§6): ein gefälschtes RS256-JWT mit realm-jimesh-Issuer
    wurde korrekt mit 401 abgewiesen — fail-closed funktioniert.

## 6. Live-Gegenprobe (8.9.2026, Stack `localhost:19091`)

Alle Ergebnisse durch curl gegen den laufenden Stack, Passwörter/Tokens nicht
in Log/Output geschrieben:

| Schritt | Ergebnis | Deckung mit dem Vertrag |
|---|---|---|
| `GET /health` | 200 | offen (§3.1) |
| `GET /api/keys` ohne Bearer | 401 `authentication required…` | §3.2 fail-closed |
| `GET /api/keys` mit gefälschtem RS256-JWT (realm-jimesh-Issuer, Müll-Signatur) | 401 | §3.2 — JWKS-Verify schlägt zu, kein fail-open |
| `GET /api/auth/status` ohne Token | 200 `{authenticated:false, needsSetup:false}` | §2.1 fail-closed Status |
| `POST /api/auth/login` falsches Passwort | 401 `wrong password` | §2.1 |
| `POST /api/auth/login` mit `JIMESH_ADMIN_PASSWORD` | 200, 64-hex-Token | §2.1 (`issueSession`, 32 Bytes hex) |
| `GET /api/auth/status` + Bearer | 200 `{authenticated:true}` | §2.1 |
| `GET /api/keys` + Bearer | 200 | §3.2 |
| `GET /api/settings/gateway_auth_enabled` | `true` | §3.3 Bootstrap gesetzt |
| `GET /v1/models` (mit und ohne Müll-Bearer) | 200 | §3.1 offen |
| `GET /v1/chains` ohne/gültiger Key | 401 → **200** mit `jimesh-sk-…`-Key | §3.3 Admin-Key-Pfad positiv verifiziert |
| `POST /v1/chat/completions` falscher Key / leerer Bearer / gefälschter Key | 401 `invalid or missing gateway key…` | §3.3 |
| `GET /api/auth/oidc/login` | 302 → `http://localhost:8081/realms/jimesh/protocol/openid-connect/auth?…&code_challenge_method=S256&state=…` | §2.2 exakt der gebaute Flow |
| `GET /api/auth/callback` ohne Parameter | 400 `missing code or state` | §2.2 |

**Nicht live getestet:** der `403 FrozenSessionMessage`-Pfad (bräuchte eine
echte provisionierte Session + Freeze — laut Code-Review abgedeckt in
internal/auth/auth.go:418-421 bzw. scanner_hook.go:56, live nicht ausgeführt,
um den laufenden Stack nicht anzutasten); der volle OIDC-Browser-Login
(Keycloak-Login-Seite + Code-Tausch) — bereits Sprint-27-end-to-end verifiziert
laut `SPRINT-27-IDENTITY-BROKER-KEYCLOAK.md:87-91`, hier nur Redirect + 400-Pfad
nachgeprüft.

## 7. Verweise

- Sprint-Kontext: `docs/sprints/SPRINT-27-IDENTITY-BROKER-KEYCLOAK.md` (WP3/WP4/WP6)
- Architektur-Hintergrund: `docs/reference/AUTH-ARCHITECTURE.md`,
  `docs/K-LAF-ARCHITECTURE.md` §2 (Identitäts-Brücke), §3 (Freeze-Stufen)
- Routen-Doku: `API_DOCS.md`
