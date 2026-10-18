# SPRINT-27 — Keycloak als Identity Broker (Epic 17-Ergänzung)

**Quelle:** `docs/research/R22-identity-broker-external-idp.md` (7.9.2026,
Gemini-Recherche + eigene Prüfung), Operator-Entscheidung 7.9.2026 (siehe
`DECISIONS.md`, "E-IdP — Identity Broker: Keycloak"). Bisher nur
Backlog-Zeile unter Epic 17, nie in einen Sprint überführt.

## Ziel

**Entscheidung getroffen: Keycloak jetzt deployen, nicht nur den Kontrakt
vormerken.** Grund (Operator, 7.9.2026): Es geht nicht nur um einen
hypothetischen künftigen B2B-Kunden — der Operator selbst will jetzt schon
ordentliches Auth (nicht die bisherige einfache Dashboard-Passwort-Anmeldung
aus WP0), unter anderem damit JiMesh irgendwann öffentlich gemacht werden
kann, und ein Package, das wirklich skaliert, statt später neu gebaut werden
zu müssen. Keycloak wurde Zitadel vorgezogen — bewusst gegen die
Go-Stack-Reinheit (Mandat 7), für Reife/Skalennachweis/Enterprise-
Wiedererkennungswert (siehe R22 + DECISIONS.md für die volle Abwägung).

**Ausdrücklich getrennt von E-Policy (SPRINT-22, jetzt OPA):** dieser Sprint
ist Authentifizierung/Identität (wer ist die Identität, wie meldet sie sich
an), nicht Autorisierung (was darf sie). Keycloak liefert das JWT (Rollen
als Claim möglich), OPA entscheidet anhand dessen über Zugriff.

**Wichtig — Keycloaks eigene "Authorization Services" (UMA 2.0,
Resources/Scopes/Policies) werden NICHT genutzt.** Keycloak kann das
technisch, aber das wäre wieder eine zweite Autorisierungs-Engine neben
OPA — genau das, was die E-Policy-Entscheidung ("eine Engine, nicht zwei")
verhindern sollte. Keycloaks Rolle bleibt strikt: Identität + Login +
Rollen-Claim im JWT. Jede Zugriffsentscheidung läuft über OPA.

**Keycloaks Admin Console deckt WP2/WP5 UI-seitig ab — kein eigenes
Identity-Management-UI bauen.** Realm/Client/User/Rollen/IdP-Föderation
sind über die mitgelieferte React-Admin-Console konfigurierbar. Das ist
etwas ANDERES als JiMeshs eigene Admin/RBAC-Seite (SPRINT-22 WP2) — die
verwaltet JiMesh-Ressourcen (Chains/Keys/Projects/Budgets/OPA-Policies),
nicht Identitäten. Beide UIs bleiben getrennt, keine Überschneidung.

**Scope-Abgrenzung — was Keycloak ersetzt und was nicht:**
- **Ersetzt:** die menschliche Dashboard-Anmeldung (`internal/auth`s
  Passwort-Login aus WP0/Sprint 20) — Keycloak übernimmt Login, MFA/OTP,
  Passkeys, künftige externe IdP-Föderation (Google/GitHub für eine
  öffentliche Version, später AWS IAM Identity Center/Okta/Azure AD für
  B2B-Kunden).
- **Ersetzt NICHT:** die bestehenden Agent-/M2M-Session-Tokens
  (`store.MintSessionToken`/`CreateSession` aus Sprint 20 WP1) — das sind
  kurzlebige, intern ausgestellte Tokens für spawnte Agent-Container, kein
  Login-Fall. Bleiben unverändert, eigener Mechanismus.

## Work Packages

- **WP1 — Keycloak-Service:** neuer Container in `docker-compose.yml`
  (offizielles Image), eigene Postgres-**Datenbank** `keycloak` auf dem
  bestehenden Postgres-Server (ein Server, zwei Datenbanken — JiMeshs
  eigener `pgx`-Layer fasst die `keycloak`-DB nie an, bleibt Keycloaks
  eigener, intern verwalteter Datenbestand). Admin-Bootstrap
  (Erstpasswort/Realm-Erstellung) analog zum bestehenden Vault-Bootstrap
  (WP0-Muster: idempotent, Pre-Checks, kein Klartext-Secret im Repo).
- **WP2 — Realm + Client:** `jimesh`-Realm, ein OIDC-Client für das
  Dashboard (Authorization Code + PKCE), Rollen (`admin`/`operator` fürs
  Erste), Claim-Mapping `tenant_id` (auch wenn Single-Operator: Feld von
  Anfang an vorsehen, leer/`default` für jetzt — vermeidet späteren
  Schema-Bruch). Konfiguration über Keycloaks eigene Admin Console — kein
  eigenes UI dafür bauen.
- **WP3 — Ingress-Validierung (`internal/auth`):** RS256-Verify gegen
  Keycloaks JWKS-Endpoint, DPoP optional zunächst (Kontrakt aus R22/TASK-002
  vorbereiten, Erzwingung kann folgen). Ersetzt `BootstrapDashboardAuth`s
  Passwort-Pfad; Session-Cookie-Handling bleibt (Keycloak-Token dahinter
  statt Klartext-Passwort-Hash).
- **WP4 — Migration bestehender Logins:** einmaliger, dokumentierter
  Übergang (kein stiller Cutover) — bestehender Operator-Account wird beim
  ersten Start in Keycloak angelegt, alte Passwort-Spalte bleibt als
  Fallback bis Migration bestätigt.
- **WP5 — Externe IdP-Föderation (Grundgerüst, nicht alle Provider sofort):**
  Keycloaks mitgelieferte Identity-Brokering-UI (Admin Console) nutzen, um
  mindestens einen echten externen IdP (z. B. GitHub, fürs spätere
  Public-Repo-Login) anzubinden — beweist den Föderations-Pfad, den R22/B2B
  später für AWS IAM Identity Center/Okta/Azure AD braucht, ohne alle
  Provider vorab zu bauen oder eine eigene Föderations-UI zu schreiben.
- **WP6 — Doku:** `docs/reference/AUTH-CONTRACT.md` (RS256/DPoP/tenant_id,
  jetzt mit Keycloak als lebendem Beispiel statt nur Kontrakt-auf-Papier),
  `docs/USER_GUIDE.md`-Abschnitt "Login" aktualisieren, `API_DOCS.md` für
  geänderte `/api/auth/*`-Routen.

## Akzeptanzkriterien

- [x] Keycloak live, Dashboard-Login läuft über Keycloak (Authorization Code
  + PKCE) — 7.9.2026 Ende-zu-Ende verifiziert: echter Login über die echte
  Keycloak-Seite → echter Code-Tausch → echtes JiMesh-Session-Token →
  echter Zugriff auf `/api/keys` (200). Backend-seitig fertig
  (`internal/auth/keycloak_oidc.go`); Frontend-Anbindung siehe TASK-020.
- [x] Bestehender Operator-Account migriert (gleiche Email+Passwort wie
  `JIMESH_ADMIN_PASSWORD` funktioniert in Keycloak) — alter Passwort-Login
  bleibt unverändert als Fallback (kein Cutover, beide Pfade aktiv)
- [ ] Mindestens ein externer IdP (GitHub) erfolgreich als Föderations-Test
  angebunden — Konfiguration für Google + GitHub jetzt vollständig verdrahtet
  und bis zur Provider-Grenze live verifiziert (TASK-073, s.u.); der echte
  Föderations-Login braucht echte OAuth-App-Credentials
  (Operator-Test-Schritte: TASK-073-Abschnitt unten), `"enabled": false"`
  bleibt bis dahin gesetzt (keine toten Login-Buttons)
- [x] Agent-/M2M-Session-Tokens unverändert (kein Cross-Wire mit Keycloak) —
  `store.MintSessionToken` nicht angefasst
- [x] **User-Entität + First-Login-Provisioning (TASK-025, speist WP3/WP4):**
  echter `users`-Row pro Keycloak-Identität (`keycloak_sub` UNIQUE) beim
  ersten OIDC-Login (`store/users.go`, `UpsertUserByKeycloakSub`), Disabled-
  User wird am Login mit lesbarer Meldung abgelehnt, `/api/users` +
  `/api/users/{id}/enabled` (session-gated), `/api/auth/status` meldet
  `source: "keycloak"` + User-Row bzw. ehrlich `source: "password"` für den
  Single-Operator. Live verifiziert gegen den laufenden Stack
  (jimesh-keycloak, Realm `jimesh`); Details + Commit: Task-Datei TASK-025.
  FK-Umbau an `project_user_budgets`/`team_members` bewusst NICHT in diesem
  Task — echte User-IDs dort erst mit Sprint 22 WP7.
- [x] `go build`/`go vet` clean, live-Verifikation des neuen Login-Flows
  (kein Mock, Mandat 2) — siehe `docs/reference/AUTH-ARCHITECTURE.md` Status-Tabelle
- [x] `docs/reference/AUTH-CONTRACT.md` — geschrieben gegen den Code (TASK-026,
  Worktree `worktree-task-026-auth-contract`): jeder Kontraktpunkt mit file:line,
  Live-Gegenprobe per curl gegen localhost:19091 (8.9.2026) im Dokument §6;
  ehrliche „noch nicht implementiert“-Sektion (§5: DPoP, tenant_id, Role-Mapping,
  User-Sync) — RS256 + PKCE als der tatsächliche Stand
- [x] **Zusätzlich, über den ursprünglichen Scope hinaus:** Vault-OIDC-
  Auth-Method konfiguriert (Issuer/Discovery/Redirect-URIs verifiziert
  korrekt), voller Token-Round-Trip noch nicht mit einem echten Browser
  bestätigt (Konfigurationsstand: `AUTH-ARCHITECTURE.md`)

**Vier reale Bugs gefunden und gefixt, nicht nur dokumentiert** (Details:
`AUTH-ARCHITECTURE.md`): (1) Realm-Import war nie tatsächlich verdrahtet
(Volume-Mount fehlte), (2) `${env.VAR}`-Substitution funktioniert nicht
für Client-Secret/Admin-Passwort → `BootstrapKeycloak()` als echter Fix,
(3) Secure-Cookie-über-Plain-HTTP blockierte jeden Login → `KC_HOSTNAME_STRICT`-
Fix, (4) `VERIFY_PROFILE`-Required-Action blockierte Login ohne
`firstName`/`lastName` im Realm-User.

## TASK-073 — OAuth-Federation: Google + GitHub als Identity-Provider (WP5, 13.9.2026)

**Ziel:** Google + GitHub reproduzierbar (Realm-Import, nicht Hand-Konfiguration
in der Admin-Console) als IdPs im `jimesh`-Realm registrieren, Credentials aus
Env-Variablen, Claims-Kette so, dass der bestehende JWT-Flow in
`internal/auth` unverändert funktioniert. **Ehrlichkeit vorweg:** ohne echte
OAuth-App-Credentials ist kein echter End-to-End-Login möglich — alles bis
zur Provider-Grenze ist verifiziert, der Rest braucht den Operator.

### Was geliefert wurde

| Datei | Änderung |
|---|---|
| `config/keycloak/jimesh-realm.json` | identityProviders: **google** (alias/providerId `google`, Scope `openid profile email`, `trustEmail: true`) + **github** (Scope `read:user user:email`); je clientId/clientSecret als `${VAR}`-Platzhalter, `"enabled": false` als ehrlicher Default. `identityProviderMappers`: google-email (`oidc-user-attribute-idp-mapper`, claim=email → user.attribute=email), github-tenant_id auf die korrekten Registry-Keys `jsonField`/`userAttribute` gefixt (vorher `claim`/`user.attribute` = nachweisliches No-op). |
| `docker-compose.yml` | `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET` in den keycloak-Service (Zeilen 170-171) — folgt dem dort bestehenden GITHUB_*-Muster, sonst kämen die Env-Werte nie im Import an. |
| `.env.example` | GOOGLE_*-Platzhalter + ehrliche Aktivierungs-Doku + Korrektur der Sprint-27-Substitutions-Annahme (s.u.) |
| `config/keycloak/README.md` | Provider-Aktivierung, Redirect-URIs beim Provider, Claims-Flow-Kette |
| Frontend | **bewusst keine Änderung**: Das Dashboard-Login delegiert an Keycloaks gehostete Login-Page (`auth-gate.tsx:49` → `/api/auth/oidc/login` → `handleOIDCLogin`), und diese rendert die Provider-Buttons selbst (live verifiziert: Broker-Buttons erscheinen im Keycloak-Theme, sobald der IdP enabled ist). Eigene „Mit Google"-Buttons im Dashboard bräuchten eine kc_idp_hint-Durchreichung durch `handleOIDCLogin` (internal/auth) plus State/PKCE — durch die Scope-Regel des Tasks (JWT-Flow bleibt unverändert) bewusst nicht gemacht. |

Claims-Kette (bestehender Flow, `internal/auth` unangetastet): Backend liest
`sub`, `email`, `name` (Fallback `preferred_username`), `realm_access.roles`
(`keycloak_oidc.go:186-203`, `auth.go:107-122`). Provider holt Profil (Google:
OIDC userinfo; GitHub: `/user` + `/user/emails` — Keycloak 26 holt private
Emails selbst nach, im Provider-Bytecode verifiziert, deshalb Scope
`user:email` statt des bislang unzureichenden `read:user`) → Broker importiert
Email+Username in den lokalen User → die Default-Client-Scopes `profile`+`email`
auf `jimesh-dashboard` (live gegen den laufenden Stack verifiziert) mints
`email`/`preferred_username`/`name` in den JWT. Bewusst KEIN
Username-Template-Mapper: eine kaputte `${CLAIM...}`-Substitution würde
Logins brechen und ist ohne echte Creds nicht testbar; `preferred_username`
kommt ohnehin aus dem lokalen Username (Broker-Default).

### Was live verifiziert wurde (Throwaway-Keycloak 26.0.8, committete Realm-JSON, curl)

1. **Realm-Import fehlerfrei:** „Realm 'jimesh' imported … Import finished
   successfully", keine WARN/ERROR zu IdPs oder Mappern.
2. **Platzhalter-Syntax (Korrektur des Sprint-27-Befunds):** `--import-realm`
   löst die **Raw-Form `${VAR}`** auf (github clientId landete nachweislich als
   `test-github-client-id-073` im IdP-Config), die alte **`${env.VAR}`-Form
   bleibt literal**. Der Sprint-27-Befund „Substitution funktioniert nicht"
   war also die Syntax, nicht der Mechanismus — dasselbe gilt nachweislich
   (Password-Grant-Roundtrip gegen eine Probe-Realm) auch für
   `clients[].secret` und `users[].credentials[].value`. BootstrapKeycloak
   bleibt trotzdem der Reconcile-Pfad für laufende Deployments (Import läuft
   nur bei nicht-existierendem Realm).
3. **Leere Env-Var** (compose-Default ohne Credentials — compose setzt
   `${GOOGLE_CLIENT_ID:-}` etc., die Vars stehen also als LEERER STRING im
   Environment): clientId/clientSecret fallen beim Import komplett weg —
   in Kombination mit `enabled: false` keine toten Login-Buttons,
   Aktivierung erfordert bewusst Creds UND enabled. **Präzisierung
   (nachverifiziert):** „völlig unset" (nur bei Bare-`docker run` ohne `-e`
   möglich, unter compose nie der Fall) lässt den Literal-Platzhalter
   stehen — live gemessen: `clientId: "${GITHUB_CLIENT_ID}"`,
   clientSecret maskiert = literal `${GITHUB_CLIENT_SECRET}`. Wer Keycloak
   ohne compose startet, muss die Vars also explizit leer übergeben,
   nicht weglassen.
4. **Import-Strategie:** Realm vorhanden → `IGNORE_EXISTING` („Import
   skipped"), Realm neu → `OVERWRITE_EXISTING` + Import — per Restart-Test
   mit derselben Binary (26.0.8) nachgemessen: erster Boot auf leerer DB
   loggt „Strategy: OVERWRITE_EXISTING … Realm 'jimesh' imported", zweiter
   Boot mit existierendem Realm loggt „Strategy: IGNORE_EXISTING … Import
   skipped". JSON-Änderungen greifen also nur auf frischen Deployments
   (leere keycloak-DB), nicht auf laufende.
5. **kc_idp_hint-Redirects** (nach Aktivierung via Admin-REST):
   `…/auth?…&kc_idp_hint=google` → 303 → `broker/google/login` →
   **`https://accounts.google.com/…client_id=test-google-client-id-073…`**
   (Google antwortet für die Dummy-ID ehrlich „The OAuth client was not
   found" — echte Anfrage, kein Mock); `kc_idp_hint=github` →
   **`https://github.com/login?client_id=test-github-client-id-073&return_to=
   /login/oauth/authorize?…scope=read:user+user:email…redirect_uri=…/broker/
   github/endpoint`** — Client-ID, Scope und Keycloak-Callback-URI stimmen.
6. **Deaktivierte Provider** (committeter Default): kc_idp_hint fällt auf die
   Login-Form zurück (HTTP 200, kein Redirect) — verhält sich ehrlich.
7. **Google-Mapper:** `oidc-user-attribute-idp-mapper` importiert sauber und
   läuft zur Login-Zeit nach Alias ohne Provider-Compat-Check
   (IdentityBrokerService-Bytecode: `getMappersByAliasStream`); die
   `user.attribute: "email"`-Zuordnung setzt nachweislich die Email-Property
   (`setEmail`-Sonderfall im Mapper-Bytecode — die UI-Registrierung für google
   bietet zwar nur `google-user-attribute-mapper` an, der aber nur ein
   Attribut statt der Property setzt; deshalb bewusst der OIDC-Mapper).

**Nachverifikation (13.9., zweite Session, eigener Throwaway-Stack, gleiche
committete Realm-JSON):** die Last-Mile-Aussagen 1–6 unabhängig wiederholt —
Import sauber („Realm 'jimesh' imported … Import finished successfully",
0 identity-bezogene WARN/ERROR), Substitution byte-genau (clientId =
`test-google-client-id-073` / `test-github-client-id-073`, clientSecret in
der Admin-REST-Antwort maskiert = nicht-leer), Mapper exakt wie committet,
Aktivierungs-PUT 204×2, kc_idp_hint-Kette hop-genau: `auth?…&kc_idp_hint=
google` → 302 `broker/google/login` → 303 → `https://accounts.google.com/
o/oauth2/v2/auth?scope=openid+profile+email&…&client_id=test-google-client-id-073
&redirect_uri=…/broker/google/endpoint`; `kc_idp_hint=github` → 303 →
`https://github.com/login/oauth/authorize?scope=read%3Auser+user%3Aemail&…&
client_id=test-github-client-id-073&redirect_uri=…/broker/github/endpoint`.
Neu dabei: (a) die Login-Form rendert die Broker-Buttons selbst — im
HTML stehen `href="/realms/jimesh/broker/google/login?…"` und
`…/broker/github/login?…`, sobald der IdP enabled ist (bestätigt die
„Frontend braucht keine Änderung"-Entscheidung); (b) **Lücke gefunden und
geschlossen:** auf einem laufenden Realm, dessen Import VOR dem
Google-IdP-Eintrag lief (der reale Stack: google-Instanz fehlt, github-
Instanz ohne Cred-Keys), schlägt der GET→PUT-Loop aus Schritt 3 mit 404
fehl — das verifizierte POST-Rezept für fehlende Instanzen steht jetzt
als Schritt 3-Fall B unten. Nicht wiederholt: die Probe-Realm-Experimente
zu `clients[].secret` (Punkt 2) und die Bytecode-Lektüre (Punkt 7) — dort
gilt der Erstnachweis; die IdP-Kette selbst ist komplett nachgemessen.

### End-to-End braucht echte Client-Credentials — Test-Schritte für den Operator

1. **OAuth-Apps anlegen** (Redirect-URIs exakt):
   - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App;
     **Authorization callback URL:**
     `http://localhost:8081/realms/jimesh/broker/github/endpoint`
   - Google Cloud Console → APIs & Services → Credentials → OAuth client ID
     (Web application); **Authorized redirect URI:**
     `http://localhost:8081/realms/jimesh/broker/google/endpoint`
     (Google-Konsolen-Grenzen für http://localhost beachten: Test-User
     hinzufügen oder App auf „In production" bringen.)
2. **Werte setzen:** `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`
   in `.env` (siehe `.env.example`).
3. **Aktivieren:**
   - frisches Deployment: zusätzlich `"enabled": true` für den Provider in
     `config/keycloak/jimesh-realm.json` — der Import übernimmt Creds +
     enabled in einem Schritt;
   - laufendes Deployment (Realm existiert → Import wird geskipped).
     Zuerst prüfen, welcher Fall vorliegt:
     `GET …/admin/realms/jimesh/identity-provider/instances/<alias>` →
     200 = Fall A, 404 = Fall B.
     **Fall A — IdP-Instanz existiert schon** (der Realm-Import lief
     bereits mit dem IdP-Eintrag): Admin-REST mit vollständiger
     Repräsentation (partieller PUT mit nur `{"enabled":true}` → 400
     „Invalid identity provider id [null]"):
     ```bash
     TOKEN=$(curl -s http://localhost:8081/realms/master/protocol/openid-connect/token \
       -d grant_type=password -d client_id=admin-cli \
       -d username="$KC_BOOTSTRAP_ADMIN_USERNAME" \
       -d password="$KC_BOOTSTRAP_ADMIN_PASSWORD" \
       | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
     for alias in google github; do
       curl -s -H "Authorization: Bearer $TOKEN" \
         "http://localhost:8081/admin/realms/jimesh/identity-provider/instances/$alias" \
         > /tmp/$alias.json
       python3 -c "import json; d=json.load(open('/tmp/$alias.json')); d['enabled']=True; \
         json.dump(d, open('/tmp/$alias.json','w'))"
       curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         "http://localhost:8081/admin/realms/jimesh/identity-provider/instances/$alias" \
         -d @/tmp/$alias.json -o /dev/null -w "$alias PUT http=%{http_code}\n"
     done
     ```
     (Für den laufenden Stack außerdem Creds setzen, wenn sie nicht im
     Realm-Import landen konnten: im selben PUT `config.clientId`/
     `config.clientSecret` mitgeben.) Alternativ Admin Console:
     Identity Providers → Google/GitHub → Enabled.
     **Fall B — IdP-Instanz fehlt** (Import lief VOR dem IdP-Eintrag —
     genau der Zustand des Stacks am 13.9.: google → 404, github aus dem
     Alteimport ohne Cred-Keys). Dann die Instanz NEU per POST anlegen —
     die Mappers kommen beim POST nicht automatisch mit (verifiziert am
     Throwaway: POST 201/201, danach kc_idp_hint-Redirect bis
     accounts.google.com):
     ```bash
     # Creds aus .env: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (github analog)
     curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
       "http://localhost:8081/admin/realms/jimesh/identity-provider/instances" \
       -d '{"alias":"google","providerId":"google","enabled":true,"trustEmail":true,
            "config":{"clientId":"'"$GOOGLE_CLIENT_ID"'",
                      "clientSecret":"'"$GOOGLE_CLIENT_SECRET"'",
                      "defaultScope":"openid profile email"}}' \
       -o /dev/null -w "google POST http=%{http_code}\n"
     curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
       "http://localhost:8081/admin/realms/jimesh/identity-provider/instances/google/mappers" \
       -d '{"name":"google-email","identityProviderAlias":"google",
            "identityProviderMapper":"oidc-user-attribute-idp-mapper",
            "config":{"claim":"email","user.attribute":"email","syncMode":"INHERIT"}}' \
       -o /dev/null -w "google-email mapper POST http=%{http_code}\n"
     # github analog: alias/providerId "github", "trustEmail":false,
     #   "defaultScope":"read:user user:email", Creds GITHUB_CLIENT_ID/SECRET;
     #   Mapper: {"name":"github-tenant_id","identityProviderAlias":"github",
     #   "identityProviderMapper":"github-user-attribute-mapper",
     #   "config":{"jsonField":"tenant_id","userAttribute":"tenant_id"}}
     ```
4. **End-to-End-Prüfung:** Dashboard öffnen → „Sign in with Keycloak" →
   die Keycloak-Login-Page zeigt jetzt die Google-/GitHub-Buttons (direkter
   Einstieg ohne Umweg: `http://localhost:8081/realms/jimesh/protocol/
   openid-connect/auth?client_id=jimesh-dashboard&redirect_uri=http://
   localhost:19091/api/auth/callback&response_type=code&scope=openid&
   kc_idp_hint=google` — die vollständige Parametrisierung inkl. State/PKCE
   macht normalerweise der Backend-Login-Button) → realer Provider-Login →
   Rückkehr ins Dashboard → prüfen: neuer `users`-Row (keycloak_sub, email,
   display_name) in PostgreSQL, `realm_access.roles` im JWT, und der
   Backend-Log zeigt den OIDC-Callback.

## Live-Bug-Fix 20.9.2026 — Backend-Container bekam nie die eigenen OIDC-Env-Vars

**Symptom (Operator-Report):** Login bei Keycloak klappt, aber man landet
danach immer wieder auf der Login-Seite, nie eingeloggt im Dashboard.

**Root Cause (verifiziert gegen Code, nicht vermutet):**
`deploy/backend/ansible-task.yml` (der echte Produktions-Rollout auf den
Control-Plane-Node) setzte beim `docker run` für den Backend-Container
NUR `DATABASE_URL`/`REDIS_URL`/`REDIS_ENABLED`/`VAULT_ADDR`/`VAULT_TOKEN`.
Die vier OIDC-Variablen, die lokal in `.env` korrekt auf `:8090` zeigen
(`JIMESH_KEYCLOAK_PUBLIC_URL`, `JIMESH_DASHBOARD_CALLBACK_URL`,
`JIMESH_FRONTEND_ORIGIN`, `DASHBOARD_CLIENT_SECRET`), wurden nie an den
Produktions-Container weitergereicht. `internal/auth/keycloak_oidc.go`
fiel deshalb auf seine hartcodierten Dev-Defaults zurück
(`localhost:8081`/`localhost:19091`/`localhost:19090`, leerer Secret) —
Ports, die der Browser hinter der VPN/Traefik-Grenze nie erreicht, und ein
leerer `DASHBOARD_CLIENT_SECRET`, den Keycloak als Confidential Client
beim Token-Exchange ablehnt. Der 17.9.-Fix (`keycloak_dashboard_client_secret`
in `deploy/keycloak/defaults.yml`) hatte nur die Keycloak-Seite des
Secrets korrigiert, nicht die Backend-Seite, die denselben Wert separat
als eigenes Env braucht, um sich beim Token-Exchange damit auszuweisen.

**Fix:** `deploy/backend/defaults.yml` bekommt vier neue Variablen
(`backend_keycloak_public_url`, `backend_dashboard_callback_url`,
`backend_frontend_origin`, `backend_dashboard_client_secret`), gebaut aus
`jimesh_vpn_ip` (derselbe Wert, den Keycloaks `keycloak_host_bind` und die
`http://{{ jimesh_vpn_ip }}:8090/*`-Redirect-URI in `jimesh-realm.json`
schon nutzen) und demselben `DASHBOARD_CLIENT_SECRET`-Env-Lookup wie
Keycloaks eigener Task. `deploy/backend/ansible-task.yml` reicht sie jetzt
als `-e` an `docker run` durch.

**Redeploy 1 (20.9., `make redeploy SERVICE=backend NODE=trading`):** lief
fehlerfrei durch (`changed=4, failed=0`), aber führte einen NEUEN Bug ein:
**Login timed out** statt zu loopen. Ursache: die drei URLs wurden aus
`jimesh_vpn_ip` (der rohen Tailnet-IP, `100.64.0.6`) zusammengebaut. Der
Operator-Browser spricht die VPN-IP aber nie direkt an, er geht über
einen LOKALEN Socat-Tunnel auf seiner eigenen Client-Maschine
(`localhost:8090`/`8081` → weitergeleitet → die VPN-IP des Control-Plane-
Nodes, siehe `scripts/restore-jimesh-client.sh`). Ein Redirect auf
`http://100.64.0.6:8081/...` ist vom Browser aus schlicht nicht routbar,
daher der Timeout (dieselbe Ursache, aus der auch ein `curl` auf die
VPN-IP von einer Nicht-Tailnet-Maschine aus hängen bleibt).

**Korrektur, selber Tag:** alle drei Browser-URLs werden jetzt per
`lookup('ansible.builtin.env', ...)` direkt aus `.env` gelesen (dort
standen die korrekten `localhost:*`-Werte schon die ganze Zeit), nicht
mehr aus `jimesh_vpn_ip` konstruiert. `jimesh_vpn_ip` bleibt korrekt für
das, was es tatsächlich steuert: Keycloaks eigenen Bind
(`keycloak_host_bind`) und die ZUSÄTZLICHE Redirect-URI in
`jimesh-realm.json` für einen Client, der selbst direkt im Headscale-
Tailnet hängt (kein lokaler Socat-Client wie der Operator).

**Redeploy 2 (20.9.):** siehe Backlog-Zeile 119 für den finalen Stand.

## Referenzen

`docs/research/R22-identity-broker-external-idp.md` (volle Analyse,
Zitadel/Keycloak/Ory-Vergleich), `docs/research/DECISIONS.md` (E-IdP,
finale Begründung), `docs/tasks/TASK-001-jimesh-review-security-identity.md`
(jimesh-auth Kontrakt vs. Code), `docs/tasks/TASK-002-jimesh-review-plattform-gateway.md`
(`sc-gateway` 3-Stufen-Kette), `docs/sprints/SPRINT-22-DASHBOARD-IA-ADMIN-RBAC.md`
(E-Policy/OPA, die andere Achse).
