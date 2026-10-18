# Auth-Architektur (Sprint 27)

## Stack: Keycloak (entschieden) + OPA (Autorisierung, separate Achse)

**Keycloak, nicht Zitadel** — Operator-Entscheidung 7.9.2026, siehe
`docs/research/DECISIONS.md` ("E-IdP — Identity Broker: Keycloak"). Zitadel
(Go, leichter) war die ursprüngliche Empfehlung; Keycloak wurde bewusst
gegen die Pure-Go-Stack-Reinheit gewählt, für Reife/Skalennachweis/
Enterprise-Wiedererkennungswert.

| Layer | Tool | Rolle |
|---|---|---|
| Identity Broker / Login | **Keycloak** (Java/Quarkus, eigener Container + eigene Postgres-DB `keycloak`) | OIDC-Login, Rollen-Claim im JWT, externe IdP-Föderation (später) |
| Autorisierung | **OPA** (Go SDK, embedded — siehe `DECISIONS.md` "E-Policy") | separate Achse, noch nicht an den Keycloak-Login angeschlossen |
| Ingress-Validierung + OIDC-Flow | `internal/auth` (Go) | RS256-Verify (golang-jwt v5, manuelle JWKS-Extraktion), Authorization-Code+PKCE-Flow, Session-Minting |
| Vault-Integration | Vault OIDC Auth Method | konfiguriert, Mechanismus verifiziert (siehe Status) |
| Agent-/M2M-Sessions | `store.MintSessionToken` (Sprint 20 WP1) | **unverändert** — eigener, interner Mechanismus, kein Keycloak |

## Architektur (tatsächlich gebaut, 7.9.2026)

```
[ Browser ] ── GET /api/auth/oidc/login ──► [ JiMesh Gateway ]
                                                  │ 302 Redirect (PKCE state gespeichert, in-memory)
                                                  ▼
                                        [ Keycloak Login-Seite ]
                                                  │ (echtes Login-Formular, admin/JIMESH_ADMIN_PASSWORD)
                                                  ▼
[ Browser ] ◄── 302 zu /api/auth/callback?code=...&state=... ──┘
     │
     ▼
[ JiMesh Gateway: handleOIDCCallback ]
     ├── state gegen PKCE-Store prüfen (CSRF, one-time)
     ├── Code-Exchange gegen Keycloak (intern: http://jimesh-keycloak:8080)
     ├── validKeycloakToken() — RS256 + JWKS-Verify
     └── issueSession() — normale JiMesh-Opaque-Session (wie Passwort-Login)
     ▼
302 → http://localhost:19090/?auth_token=<jimesh-session-token>
     ▼
[ Frontend ] — TASK-020 (offen): Token aus Query-Param abholen, wie Passwort-Login speichern
```

**Bewusst kein DPoP, keine mTLS-Bindung in diesem Schritt** — SPRINT-27 WP3
sah das als "später" vor (R22/TASK-002-Muster als Referenz, nicht sofort
erzwungen). Was hier steht ist Standard-OAuth2-Authorization-Code+PKCE,
kein DPoP-Replay-Guard — anders als eine frühere Version dieses Dokuments
behauptete.

## Status (live verifiziert, nicht nur konfiguriert — 7.9.2026)

| Komponente | Status | Fundstelle / Verifikationsmethode |
|---|---|---|
| Keycloak Container + eigene Postgres-DB | ✅ live | `deploy/docker-compose.yml`, `deploy/postgres/pg-init/01-keycloak-db.sql` |
| Realm-Import (deklarativ, `--import-realm`) | ✅ live | `deploy/keycloak/jimesh-realm.json` volume-gemountet — **war vorher NICHT gemountet, Realm existierte nur durch einen einmaligen Admin-API-Call** (gefunden + gefixt) |
| `${env.VAR}`-Substitution im Realm-Import | ❌ funktioniert NICHT zuverlässig | Client-Secret und Admin-Passwort blieben nach Import als literaler `${env.X}`-String stehen (live verifiziert) — **`BootstrapKeycloak()` (`internal/auth/keycloak_oidc.go`) ist der tatsächliche Fix**: reconciled beide Werte idempotent via Admin-API bei jedem Backend-Start |
| Keycloak Secure-Cookie über Plain-HTTP | ✅ gefixt | `KC_HOSTNAME_STRICT=false`, kein fixes `KC_HOSTNAME` — lässt Keycloak den Issuer pro Anfrage aus dem Host-Header ableiten (nötig, damit Browser via `localhost:8081` UND Vault/Backend via `jimesh-keycloak:8080` je einen passenden Issuer sehen) |
| `VERIFY_PROFILE`-Required-Action blockiert Login | ✅ gefixt | Admin-User braucht `firstName`/`lastName` im Realm-JSON, sonst erzwingt Keycloaks User-Profile-Feature einen zusätzlichen Schritt |
| OIDC Login+Callback (Authorization Code + PKCE) | ✅ live, Ende-zu-Ende verifiziert | `internal/auth/keycloak_oidc.go` — realer Login über die echte Keycloak-Seite, echter Code-Tausch, echtes JiMesh-Session-Token, echter Zugriff auf `/api/keys` (200) |
| Vault OIDC Auth Method | ⚠️ konfiguriert + Mechanismus verifiziert, Token-Runde nicht vollständig | `auth/oidc/config` + `auth/oidc/role/jimesh-admin` geschrieben, Issuer/Discovery/Redirect-URIs passen (verifiziert: Vault generiert gültige Auth-URLs, die bei der echten Keycloak-Login-Seite ankommen) — der volle Round-Trip (Login → Vault-Token) scheiterte am Cookie-Handling des Test-Containers, nicht erkennbar an der Konfiguration selbst. Empfehlung: einmal `vault login -method=oidc` aus einem echten Browser bestätigen. |
| Frontend-Anbindung | ❌ offen | `docs/tasks/TASK-020-frontend-keycloak-oidc-login.md` — Frontend kennt Keycloak noch nicht |
| Externe IdP-Föderation (GitHub etc.) | 📋 vorbereitet, deaktiviert | `jimesh-realm.json` IdP-Eintrag `"enabled": false`, Sprint 27 WP5 |
| Zitadel Container | ❌ verworfen | Operator-Entscheidung, Keycloak stattdessen |

## Bekannte Betriebs-Eigenheit: Realm-Änderungen brauchen eine DB-Neuanlage

Keycloaks `--import-realm` überspringt den Import, wenn der Realm in der DB
schon existiert (`Strategy: IGNORE_EXISTING` bei Restart). Änderungen an
`deploy/keycloak/jimesh-realm.json` werden also **nicht automatisch** beim
nächsten `docker compose restart keycloak` übernommen — dafür muss die
`keycloak`-Datenbank fallen gelassen und neu angelegt werden:

```bash
docker compose stop keycloak
docker compose exec -T postgres psql -U jimesh -d postgres \
  -c "DROP DATABASE IF EXISTS keycloak;" -c "CREATE DATABASE keycloak;"
docker compose up -d keycloak
```

`BootstrapKeycloak()` läuft danach automatisch beim nächsten Backend-Neustart
und stellt Client-Secret/Admin-Passwort wieder her — kein manueller Schritt
nötig außer diesem DB-Reset selbst.
