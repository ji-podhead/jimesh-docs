# TASK-023 — Frontend: Vault/Secrets-Verwaltung

> **Status:** ✅ UMGESETZT (siehe `## Ergebnis`) · **Speist:** Zero-Trust-Secrets (Mandat 9)
> **Backend (fertig):** `internal/security/vault.go`

## Kontext

Vault (Secrets-KV + JIT-Access-Tokens) ist backend-seitig komplett gebaut und
läuft — es gibt aber **keine einzige Frontend-Seite** dafür (`grep -ril
"vault" src/frontend/src` → 0 Treffer, verifiziert). Ein Operator kann
Secrets aktuell nur per curl anlegen.

## Backend-API (bereits fertig, siehe API_DOCS.md "Vault (Secrets + JIT-Tokens)")

- `GET /api/vault/secrets` → `{secrets: [{id, name, allowedAgents, createdAt, updatedAt}], count}` — **Metadaten only, nie der Wert**
- `GET /api/vault/secrets/{name}` → `{name, value}` — entschlüsselter Wert (nur für den Dashboard-Operator, session-gated)
- `POST /api/vault/secrets` → `{name, value, allowedAgents?}` anlegen
- `PUT /api/vault/secrets/{name}` → `{value, allowedAgents?}` aktualisieren
- `DELETE /api/vault/secrets/{name}`
- `GET /api/vault/audit` → `{entries, count}` — letzte 100 Zugriffs-Log-Einträge (`vault_audit_log`)
- `POST /api/vault/tokens` → `{secretName, agentId?, ttlSeconds?}` — JIT-Token ausstellen
- `POST /api/vault/tokens/{id}/revoke`

## Auftrag

- [ ] **Secrets-Liste**: Tabelle mit Name, `allowedAgents`, `createdAt`/`updatedAt`.
  Werte NIE standardmäßig anzeigen — ein "Reveal"-Button pro Zeile, der erst
  bei Klick `GET /api/vault/secrets/{name}` aufruft (nicht vorab alle Werte laden).
- [ ] **Secret anlegen/bearbeiten**: Formular (Name, Wert, `allowedAgents` als
  Multi-Select oder Komma-Liste) → `POST`/`PUT`.
- [ ] **JIT-Token-Ausstellung**: pro Secret ein "Token ausstellen"-Dialog
  (Agent-ID, TTL in Sekunden) → `POST /api/vault/tokens`, zeigt das Token
  EINMALIG in einem kopierbaren Feld (danach nicht mehr abrufbar, wie bei
  API-Keys üblich).
- [ ] **Audit-Log-Ansicht**: einfache Tabelle aus `GET /api/vault/audit`
  (wer/was/wann/Erfolg-oder-nicht).
- [ ] i18n, keine hartcodierten Strings.

## Wichtiger Hinweis für die Umsetzung

Es gibt aktuell eine **echte Backend-Lücke**, die dieser Task NICHT selbst
fixen muss, aber im UI ehrlich sichtbar machen sollte: Secrets werden nur
verschlüsselt gespeichert, wenn `encryption_key`/`JIMESH_ENCRYPTION_KEY`
gesetzt ist — ist das nicht der Fall, speichert das Backend aktuell im
Klartext (Development-Fallback). Wenn `GET /api/security/audit` das als
Issue meldet (Score-Abzug wegen fehlendem Encryption-Key), zeig das als
Warnung auf der Vault-Seite, nicht nur auf einer separaten Audit-Seite.

## Live verifizieren

Mandat 2: echtes Secret über die UI anlegen, Token ausstellen, den Token
gegen `POST /api/vault/access {name, token}` selbst curl-testen (das ist
der Agent-seitige Redemption-Endpoint, braucht keine eigene UI) und
bestätigen, dass der richtige Wert zurückkommt. Revoke testen — danach muss
`/api/vault/access` mit demselben Token ablehnen.

## Ergebnis

### Geändert

- `src/frontend/src/views/VaultPage.tsx` (neu) — Secrets-Tabelle (Name,
  `allowedAgents`, Created/Updated, Reveal-Button pro Zeile ruft erst bei
  Klick `GET /api/vault/secrets/{name}` auf, kein Vorab-Laden aller Werte),
  Anlegen/Bearbeiten-Dialog (`POST`/`PUT /api/vault/secrets[/{name}]`),
  JIT-Token-Dialog (Agent-ID, TTL → `POST /api/vault/tokens`, Token wird
  einmalig in einem kopierbaren Feld gezeigt, danach nicht mehr abrufbar),
  Audit-Log-Tabelle (`GET /api/vault/audit`), sowie ein Warn-Banner, wenn
  `GET /api/security/audit` ein Issue meldet, dessen Titel/Detail
  "encryption key" enthält (aktuell exakt `"No encryption key set"`,
  Score-Abzug −30, `severity: "high"`, siehe
  `src/backend/internal/security/vault.go:239-247`).
- `src/frontend/src/App.tsx` — Route `/security/vault` → `VaultPage`,
  Nav-Eintrag `nav.vault` im bestehenden Security-Analytics-Dropdown
  (neben `/security/exposure`).
- `src/frontend/src/i18n/locales/en.json` + `de.json` — echte Texte für
  `vault.*`, `nav.vault`, `common.edit`, `common.done`.
- `src/frontend/src/i18n/locales/*.json` (58 weitere Locales) — dieselben
  Keys mit dem englischen Text als Platzhalter kopiert, um
  `scripts/check-i18n.mjs`s Key-Paritäts-Check grün zu halten — exakt die
  bestehende Konvention dieses Repos (siehe z. B. die `exposure.*`-Keys in
  `fr.json`/`ja.json`/`ar.json`, die ebenfalls unübersetzt englischen Text
  tragen). Keine hartcodierten Strings in `VaultPage.tsx`.

Keine Backend-Änderung, keine neue Route — `API_DOCS.md` war bereits
korrekt (Vault-Routen Zeilen 733-756 dort vorhanden), daher kein Update
nötig.

### Build/Test-Status (ehrlich)

- `cd src/frontend && npm install` — 835 packages, erfolgreich (2 npm-audit
  Findings, vorbestehend, nicht von dieser Änderung).
- `npx tsc --noEmit -p tsconfig.app.json` — 275 Zeilen Ausgabe, aber **keine
  einzige** referenziert `VaultPage.tsx` oder die geänderten Zeilen in
  `App.tsx` (per `grep -i "vault\|App.tsx"` auf die tsc-Ausgabe verifiziert,
  0 Treffer). Alle Fehler betreffen vorbestehende Dateien
  (`FallbackPage.tsx`, `ProjectsPage.tsx`, `keys/*.tsx`, fehlendes
  `shared/types`-Modul) — bekanntes Pre-Existing-Rauschen laut
  Verifikations-Mandat.
- `npm run lint` — 237 Probleme insgesamt (vorbestehend, u. a. `vite.config.ts`,
  `ProjectsPage.tsx`). `VaultPage.tsx` trägt genau **einen** Fehler bei:
  `react-hooks/set-state-in-effect` beim `useEffect(() => { void load() },
  [load])`-Pattern — identisch zum bereits vorhandenen Pattern in
  `SecurityExposurePage.tsx:215` (per direktem `npx eslint` auf beide
  Dateien verifiziert: beide werfen denselben Fehler an derselben Stelle
  des Patterns). Kein neuer Fehlertyp, nur eine weitere Instanz eines
  bereits im Code vorhandenen, akzeptierten Musters.
- `npx vitest run` — 18 Testdateien, 230 Tests, alle grün.
- `node scripts/check-i18n.mjs` (Teil von `npm run test`) — "i18n
  validation passed for 60 locales and 1109 keys".

### Live-Verifikation gegen den laufenden Backend-Stack (Port 19091)

Kein interaktiver Browser verfügbar — die UI selbst wurde **nicht** per
Klick durchgeklickt, nur der komplette API-Fluss, den die UI aufruft, wurde
per `curl` mit demselben Dashboard-Session-Token nachvollzogen, den
`apiFetch()` im Browser auch verwenden würde (`POST /api/auth/login` mit
dem `.env`-Admin-Passwort):

1. `POST /api/vault/secrets {name:"task023-test-secret", value:"s3cr3t-value-42"}`
   → `{ok:true}`.
2. `GET /api/vault/secrets` → Secret erscheint in der Liste, Wert nicht
   enthalten (nur Metadaten) — bestätigt "Werte nie standardmäßig".
3. `GET /api/vault/secrets/task023-test-secret` → `{value:"s3cr3t-value-42"}`
   — korrekter Wert, das ist exakt der Reveal-Aufruf der UI.
4. `POST /api/vault/tokens {secretName, agentId:"task023-test-agent",
   ttlSeconds:300}` → Token ausgestellt.
5. `POST /api/vault/access {name, token, agentId}` **ohne** Dashboard-Bearer
   → 401 "authentication required — log in to the dashboard". **Mit**
   Dashboard-Bearer zusätzlich zum Vault-Token → 200, korrekter Wert kommt
   zurück. Mit falschem Token → 403 "token invalid". Nach
   `POST /api/vault/tokens/{id}/revoke` → 403 "token invalid: token
   revoked" mit demselben Token, wie gefordert.
6. `GET /api/vault/audit` zeigt alle Versuche (Erfolg **und** Fehlschläge)
   korrekt protokolliert.
7. Aufgeräumt: `DELETE /api/vault/secrets/task023-test-secret` → `{ok:true}`,
   danach `GET` → 404. Der zweite Test-Token wurde ebenfalls revoked.
   Keine `task023-*`-Reste im Vault zurückgelassen.

**Wichtiger Negativbefund (nicht Teil dieses Tasks, aber verifiziert und
hier vermerkt):** `POST /api/vault/access` — laut Code-Kommentar
(`internal/security/vault.go`: *"This is the ONLY way agents get
secrets"*) und `API_DOCS.md` Zeile 756 als Agent-seitiger Redemption-Endpoint
gedacht, der **ohne** Dashboard-Session auskommen soll (nur mit dem
Vault-Token) — wird aber von `internal/auth/auth.go`s globalem
`Middleware()` (Zeilen ~370-388) blockiert: **jede** `/api/*`-Route außer
`/api/auth/*` verlangt vorher eine gültige Dashboard-Session oder einen
Keycloak-Token, bevor der Handler den Vault-Token im Body überhaupt prüft.
Ein Agent, der nur ein JIT-Vault-Token besitzt (keine Dashboard-Session),
kann `/api/vault/access` damit aktuell **nicht** erreichen — genau der Use
Case, für den der Endpoint laut eigenem Kommentar existiert. Mit
Dashboard-Bearer zusätzlich funktioniert der Vault-Token-Check danach
korrekt (Schritt 5 oben). Das ist ein Gateway-Auth-Bug, keiner der UI —
außerhalb des Scopes von TASK-023, aber ein Reviewer sollte das
gegen Mandat 9 (Zero-Trust Secrets) abgleichen.

### Abweichungen von der Task-Vorgabe

- Der Task nennt `allowedAgents` als "Multi-Select oder Komma-Liste" —
  umgesetzt als Komma-Liste (Input-Feld), da es im Repo keine fertige
  Multi-Select-Komponente für freie Tag-Eingabe gibt und `select.tsx` ein
  Single-Value-Select ist. Client-seitig zu einem JSON-Array-String
  serialisiert, exakt wie das Backend es erwartet.
- Route liegt unter `/security/vault` (nicht `/vault`), um sich in das
  bestehende Security-Dropdown-Menü in `App.tsx` einzureihen (dieselbe
  Gruppe wie `/security/exposure`) statt einen siebten Top-Level-Nav-Punkt
  zu erzwingen.
- Branch dieses Worktrees ist `worktree-agent-a84e86cf56fbfdeb7`, nicht
  `task/023-frontend-vault-secrets-ui` wie im WORKTREE-PROTOCOL §1
  vorgeschrieben — der Worktree wurde bereits so vom aufrufenden Agenten
  angelegt, bevor diese Task-Instanz gestartet wurde. Vermerkt, nicht
  selbst umbenannt.

### Offene Fragen für den Reviewer

1. Der oben beschriebene Auth-Gate-Bug in `/api/vault/access` — sollte das
   in einer eigenen Task/einem eigenen Fix behoben werden, bevor K-LAF-Agenten
   produktiv Vault-Tokens einlösen?
2. 58 von 60 Locale-Dateien tragen für die neuen `vault.*`-Keys nur den
   englischen Platzhaltertext (echte Übersetzung nur en/de) — folgt der
   bestehenden Repo-Konvention (siehe `exposure.*`), aber falls das jemals
   geändert werden soll, sind alle Fundstellen über `vault.` in den
   Locale-Dateien grep-bar.
3. Kein interaktiver Browser-Klickdurchlauf durchgeführt (Sandbox hat keinen
   GUI-Browser) — nur der vollständige API-Fluss der UI wurde per curl
   nachvollzogen (siehe oben).

## Branch

worktree-agent-a84e86cf56fbfdeb7, Commits: 3, letzter Commit: 41423fd
