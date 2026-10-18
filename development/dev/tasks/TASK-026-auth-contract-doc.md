# TASK-026 — AUTH-CONTRACT.md (Sprint 27 WP6, reine Doku)

> **Status:** ⏳ IN ARBEIT (Subagent, Worktree) · **Speist:** Sprint 27 WP6
> **Grund:** Sprint 27 Akzeptanzpunkt offen: „docs/reference/AUTH-CONTRACT.md —
> noch nicht geschrieben". Der Auth-Flow ist gebaut und live verifiziert, aber
> nirgends als Vertrag dokumentiert.

## Ziel

`docs/reference/AUTH-CONTRACT.md` — der eine verbindliche Vertrag, wie
Authentifizierung in JiMesh funktioniert. Quelle ist der CODE (nicht der Kopf):
`internal/auth/auth.go`, `internal/auth/keycloak_oidc.go`, `internal/store/vault.go`
(MintSessionToken/ValidateSessionToken), `internal/gateway/gateway.go` (Routen).

## Inhalt (alles mit file:line-Referenzen)

1. **Identitäten:** Single-Operator (Passwort), Keycloak-Human-Login,
   Agent-Session-Token (M2M, `vault_tokens`), Gateway-Admin-Key — wer was
   präsentiert, wo.
2. **Flows:** Passwort-Login (`/api/auth/login`, dashboard_sessions-KV, 24h-TTL),
   OIDC Authorization Code + PKCE (`/api/auth/oidc/login` → `/api/auth/callback`),
   Session-Minting bei Provisionierung (OPENAI_API_KEY-Injektion).
3. **Gates:** `/api/*` (Keycloak-JWT via JWKS ODER Dashboard-Session) vs.
   `/v1/*` (`gateway_auth_enabled`, Admin-Key ODER Session-Token,
   ErrTokenRevoked → 403 FrozenSessionMessage).
4. **Token-Lifetimes + Revocation:** Session-TTL, Freeze→Revoke→Release-Kette
   (WP3), was wann widerrufen wird.
5. **Ehrliche „noch nicht implementiert"-Sektion:** DPoP, tenant_id-Claim,
   Role-Mapping aus JWT, User-Sync (TASK-025 läuft) — als offen markieren,
   NICHT als vorhanden beschreiben.

## Akzeptanz

- [x] Jede Behauptung gegen den Code geprüft (file:line), nichts aus Doku
  abgeschrieben, die selbst stale sein könnte
- [x] Live-Gegenprobe: Login-Flow + /v1-Gate per curl gegen den laufenden
  Stack (localhost:19091) nachvollzogen, Ergebnisse im Dokument vermerkt
- [x] Verlinkt aus SPRINT-27 (WP6-Häkchen); `docs/reference/REFERENCES.md`
  existiert **nicht** (geprüft: `ls docs/reference/`) → kein Verweis möglich

## Regeln

WORKTREE-PROTOCOL.md: eigener Worktree/Branch, commit ja, push/merge nein.
Nur diese eine Datei + Sprint-27-Häkchen + ggf. REFERENCES-Verweis — keine
Code-Änderungen.

## Ergebnis

### Geändert

- `docs/reference/AUTH-CONTRACT.md` (neu, 273 Zeilen) — der verbindliche
  Auth-Vertrag: 4 Identitäten, 3 Flows, /api vs /v1 Gates, Token-Lifetimes +
  Freeze→Revoke→Release, §5 „noch nicht implementiert", §6 Live-Gegenprobe.
- `docs/sprints/SPRINT-27-IDENTITY-BROKER-KEYCLOAK.md:102-105` —
  Akzeptanzpunkt AUTH-CONTRACT.md auf `[x]` gesetzt (genuin erfüllt:
  Dokument existiert, gegen Code geschrieben, live gegengeprüft).
- `docs/tasks/TASK-026-auth-contract-doc.md` (diese Datei) — Akzeptanz
  abgehakt + dieser Bericht (Pflicht nach WORKTREE-PROTOCOL.md §7; die Datei
  war im Haupt-Checkout untracked und existierte im Worktree daher nicht —
  sie wurde dort neu angelegt, Inhalt identisch + Ergebnis-Sektion).

### Build/Test-Status (ehrlich)

- Reine Doku — kein Go/Frontend-Code angefasst, daher kein Build nötig und
  keiner ausgeführt.
- Live-Verifikation per curl gegen localhost:19091 (8.9.2026), vollständig im
  Dokument §6: `/health` 200; `/api/keys` ohne Auth 401; gefälschtes
  RS256-JWT → 401 (fail-closed); `/api/auth/status` ohne/mit Token
  `authenticated:false/true`; falsches Passwort 401, `JIMESH_ADMIN_PASSWORD`
  → 200 mit 64-hex-Token; `/api/settings/gateway_auth_enabled` = `true`;
  `/v1/models` offen (200); `/v1/chains` ohne Key 401 → mit `jimesh-sk-…`-Key
  200 (Admin-Key-Pfad positiv); `/v1/chat/completions` mit falschem/leerem
  Bearer 401; `/api/auth/oidc/login` 302 → Keycloak-Auth-URL mit
  S256-PKCE + state; `/api/auth/callback` ohne Parameter 400.
- **Nicht live getestet:** 403 FrozenSessionMessage-Pfad (bräuchte echte
  provisionierte Session + Freeze — nicht am laufenden Stack ausgeführt, nur
  code-verifiziert, im Dokument §6 explizit markiert) und der volle
  OIDC-Browser-Login (bereits Sprint-27-E2E-verifiziert laut Sprint-Datei;
  hier Redirect + 400-Pfad nachgeprüft).

### Abweichungen von der Task-Vorgabe

- Worktree/Branch: Task-Datei nennt WORKTREE-PROTOCOL.md (Pfad
  `../jimesh-worktrees/task-0NN-*`, Branch `task/0NN-*`), die
  Operator-Anweisung override-te das explizit (Worktree unter
  `.claude/worktrees/`, Branch `worktree-task-026-auth-contract`) —
  Operator-Vorgabe befolgt. Der Branch/das Worktree existierten bereits
  leer bei `main`-Stand (`6c5776c`); statt eines Duplikats wurde das
  bestehende, saubere Worktree genutzt.
- Eine dritte Datei mehr als „nur diese eine": die eigene Task-Datei mit
  Ergebnis-Bericht — verpflichtend nach WORKTREE-PROTOCOL.md §7, Konflikt
  zugunsten des Protokolls entschieden.
- Zeilendrift: Task-Text nennt `internal/store/vault.go` — sauber; alle
  genannten Symbole gefunden (MintSessionToken vault.go:263,
  ValidateSessionToken vault.go:272). Kein Drift.

### Offene Fragen für den Reviewer

1. JWKS wird einmalig gecacht und nie refreshed (auth.go:654-667) — ist ein
   Keycloak-Key-Rollover ohne Backend-Restart akzeptiertes Risiko oder WP für
   einen Folgesprint?
2. Der Gateway-Admin-Key liegt als Klartext-JSON in der Settings-KV
   (auth.go:329-331) — Konflikt mit Mandat 9 auf Sicht; verlagern in
   `vault_secrets` (AES-GCM)?
3. Keycloak-JWTs akzeptiert das `/api/*`-Gate unabhängig von Rollen — jeder
   verifizierte Realm-User ist voll berechtigt. Reicht das bis OPA (Sprint 22)
   die Claims-Achse anbindet?

### Branch

worktree-task-026-auth-contract, Commits: 2, letzter Commit: (siehe git log)
