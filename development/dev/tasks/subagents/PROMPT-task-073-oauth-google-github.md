# TASK-073 — OAuth-Federation: Google + GitHub als Keycloak-Identity-Providers

**Status:** ✅ ERLEDIGT (13.9.2026) — Konfiguration komplett verdrahtet und bis zur
Provider-Grenze live verifiziert (Realm-Import, Admin-REST, kc_idp_hint-Redirects,
curl). **Echter End-to-End-Login: NICHT getestet — keine echten OAuth-App-
Credentials verfügbar.** Operator-Test-Schritte: SPRINT-27, Abschnitt TASK-073.
| **Quelle:** Operator 14.9. („OAuth zumindest Google und GitHub provider wären da nice oder halt unser eigener server")

## Fundstellen
- src/backend/internal/auth/keycloak_oidc.go (RS256-Verifier existiert)
- Realm-Import: config/keycloak/jimesh-realm.json (existiert, import-realm ist im compose: --import-realm)
- Keycloak 26 läuft auf localhost:8081

## Aufgabe
1. Google + GitHub als Identity-Providers im jimesh-Realm registrieren — via Admin-API oder Realm-Import-JSON (reproduzierbar, nicht Hand-Configure durch Keycloak-UI)
2. Real OAuth-Credentials nötig (Google-Cloud-Console/GitHub-OAuth-App) — ohne echte Credentials: KONFIGURATION komplett verdrahten + dokumentiere EXAKT welche Env-Variablen (Client-ID/Secret pro Provider) der Operator setzen muss
3. Ehrliche „not tested end-to-end, no real OAuth app credentials available" Note statt ungetestet als funktionierend behaupten
4. .env.example + docs + realm-import-config updaten

- GIT: explizite Pfade, kein -A, NICHT pushen

## Ergebnis (13.9.2026)

**Geliefert** (Details + Live-Verifikation: SPRINT-27, Abschnitt TASK-073):
`config/keycloak/jimesh-realm.json` (google+github-IdPs, `${VAR}`-Env-
Platzhalter, `enabled:false`-Default, google-email-Mapper, github-tenant_id-
Mapper auf korrekte Registry-Keys gefixt), `docker-compose.yml`
(GOOGLE_CLIENT_ID/SECRET im keycloak-Service), `.env.example` (GOOGLE_*-
Platzhalter + Substitutions-Korrektur), `config/keycloak/README.md`
(Aktivierung, Redirect-URIs, Claims-Flow), SPRINT-27 (WP5-Kriterium +
TASK-073-Abschnitt). Frontend: keine Änderung nötig — Keycloaks gehostete
Login-Page rendert die Provider-Buttons; eigene Buttons bräuchten eine
internal/auth-Änderung (kc_idp_hint-Durchreichung), die der Task-Scope
verbietet.

**Zentrale Funde (live verifiziert, Keycloak 26.0.8):**
1. `--import-realm` löst `${VAR}` (Raw-Syntax) auf — `${env.VAR}` NICHT
   (bleibt literal). Der Sprint-27-Befund „Substitution funktioniert nicht"
   war ein Syntax-Artefakt; gilt nach Password-Grant-Roundtrip auch für
   `clients[].secret` + `users[].credentials[].value`.
2. LEERE Env-Var (compose-Default `${GOOGLE_CLIENT_ID:-}` = leerer String) →
   clientId/clientSecret-Keys fallen beim Import ersatzlos weg; VÖLLIG UNSET
   (nur bei Bare-`docker run` ohne `-e` möglich) bleibt der Literal-Platzhalter
   in der IdP-Config stehen (beide live nachgemessen).
3. Import-Strategie: Realm existiert → `IGNORE_EXISTING` („Import skipped"),
   frische DB → `OVERWRITE_EXISTING` + Import (Restart-Test mit derselben
   Binary) → JSON-Änderungen greifen nur auf frischen Deployments; laufende
   brauchen Admin-REST.
4. kc_idp_hint=google/github → 303-Kette bis zur echten Provider-URL mit der
  Dummy-Client-ID (Google: „client not found"-Fehler = echte Anfrage);
    deaktivierte Provider → Login-Form (ehrlicher Default).
5. Keycloak 26 GitHub-Provider holt private Emails via `/user/emails`
   (Scope `user:email` nötig, im Bytecode verifiziert — der bisherige
   `read:user`-Scope reichte nicht).

**Nachverifikation (13.9., zweite Session, eigener Throwaway-Stack):** Funde
1–4 soweit ohne echte Creds testbar unabhängig reproduziert — Import sauber,
Substitution byte-genau, kc_idp_hint-Kette bis `accounts.google.com/o/oauth2/
v2/auth` bzw. `github.com/login/oauth/authorize` (Client-ID, Scope, Broker-
Redirect-URI stimmen), deaktivierte Provider → HTTP 200 Login-Form. NEU: (a)
die Login-Form rendert die Broker-Buttons selbst (HTML-href
`/realms/jimesh/broker/{google,github}/login`) — bestätigt die „Frontend
braucht keine Änderung"-Entscheidung; (b) Lücke im LAUFENDEN Stack gefunden:
dessen Realm-Import lief VOR dem Google-IdP-Eintrag, die google-Instanz fehlt
dadurch (GET → 404) — der dokumentierte GET→PUT-Aktivierungs-Loop greift dort
nicht; das verifizierte POST-Rezept (Instanz + Mapper neu anlegen, 201/201,
danach Redirect bis zum Provider) steht jetzt als Fall B in SPRINT-27
Schritt 3. Fund 5 (Bytecode) und der Password-Grant-Roundtrip aus Fund 1
nicht wiederholt — dort gilt der Erstnachweis.

**Offen (Operator):** echte OAuth-Apps anlegen + Creds setzen + aktivieren
(Schritt-für-Schritt in SPRINT-27), dann echter Federations-Login gegen den
laufenden Stack.
