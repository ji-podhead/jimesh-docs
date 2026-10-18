# TASK-027 — Frontend: Consumer-Keys-Verwaltung (Sprint 22 WP7)

> **Status:** ⏳ IN ARBEIT (Subagent, Worktree) · **Speist:** Sprint 22 WP7
> **Backend (fertig, live verifiziert 8.9.2026):** `internal/store/consumer_keys.go`,
> `internal/auth/consumer_key.go`, `internal/security/consumer_keys.go`

## Ziel

Admin-UI zum Minten/Listwiderrufen von Consumer-Keys — analog zum
TeamsPage-Muster (TASK-024, `src/frontend/src/views/TeamsPage.tsx`, Route
`/admin/teams`).

## Backend-Vertrag (API_DOCS.md „Consumer Keys", bitte exakt gegen diese Shapes bauen)

- `GET /api/consumer-keys` → `{keys: [{id, keyPrefix, userId, userName, name,
  projectId, allowedChains, rateLimitRpm, revoked, createdAt, lastUsedAt}], count}`
  — `allowedChains` ist als JSON-String gespeichert (z.B. `"[\"*\"]"`), im
  UI parsen und als Chips anzeigen.
- `POST /api/consumer-keys` Body `{name?, userId, projectId?, allowedChains?:
  string[], rateLimitRpm?: number}` → `{key: "jimesh-ck-…", consumerKey}` —
  **plaintext nur diese eine Antwort**: nach dem Minten einen Dialog zeigen,
  der den Key kopierbar anbietet (Copy-Button) mit deutlichem Hinweis
  „wird nur jetzt angezeigt". Kein Mock, kein „merken wir uns irgendwo".
- `POST /api/consumer-keys/{id}/revoke` → `{ok, revoked}` — mit dem
  bestehenden `ConfirmButton`-Zwei-Klick-Muster.
- User-Auswahl: `GET /api/users` liefert die echten User (keycloak-Provisioned).
  Leere User-Liste → ehrlicher Hinweis „noch niemand via Keycloak eingeloggt",
  kein Fake-Dropdown.

## UI-Anforderungen

- Route `/admin/consumer-keys`, Nav-Eintrag `nav.consumerKeys` neben
  `nav.teams`, Page-Komponente `ConsumerKeysPage` (Pattern: TeamsPage).
- Spalten: Prefix, Name, User, Projekt (— = unscoped), Chains, RPM, Status
  (aktiv/widerrufen), erstellt, zuletzt genutzt. Widerrufene kompakt aber
  sichtbar (nicht wegfiltern — Audit-Trail).
- i18n: `consumerKeys.*` Keys in en + de vollständig, alle übrigen Locales
  per Fallback (REPO-STANDARD: `npm run check:i18n` erzwingt Key-Parität —
  die fehlenden Keys per Skript aus en.json in ALLE 60 Locales kopieren,
  englischer Text als Fallback-Kopie, wie bei TASK-021/022).
- Budget-Hinweis am Key: wenn `projectId` gesetzt, zeigt die Kette auf die
  `project_user_budgets`-Row (project×user) — im Detail/Tooltips erwähnen,
  nicht nochmal ein Budget-Formular bauen (Quota-Komponenten werden
  wiederverwendet, Sprint-22-Vorgabe).

## Akzeptanz

- [ ] Minten → Kopierdialog → Key in Liste mit Prefix sichtbar, plaintext
  nirgends persistiert (auch nicht in localStorage)
- [ ] Revoke mit Zwei-Klick-Bestätigung; widerrufener Key zeigt Status
- [ ] `npx tsc --noEmit`-fälschlich nicht nötig — `npm run test` (vitest +
  check:i18n) grün, `npm run lint` verschlechtert sich nicht
- [ ] Live gegen den laufenden Stack geprüft: minten via UI/curl, key
  funktioniert an `/v1/chains` (200), revoke → 403
- [ ] `## Ergebnis` in dieser Datei + Commit auf dem Branch

## Regeln

WORKTREE-PROTOCOL.md: eigener Worktree (`worktree-task-027-consumer-keys-ui`),
committen ja (regelmäßig, Crash-Schutz), push/merge nein, main nicht anfassen.
i18n-Fallback-Kopie ist der etablierte Standard, kein Vorwand für halbe Arbeit.

---

## Ergebnis (Subagent, Worktree — 8.9.2026)

## Geändert

- `src/frontend/src/views/ConsumerKeysPage.tsx:1-385` (neu) — Page-Komponente nach TeamsPage-Muster: Tabelle (Prefix, Name, User, Projekt — `—` = unscoped, Chains als Chips aus dem geparsten JSON-String, RPM, Status-Badge aktiv/widerrufen, erstellt, zuletzt genutzt), Mint-Dialog (Name, User-Pflichtfeld, Projekt optional, Chains kommagetrennt, RPM), Minted-Key-Dialog mit Copy-Button (via `lib/clipboard.ts`, works on insecure origins) und „wird nur jetzt angezeigt"-Warnung, Revoke via `ConfirmButton`-Zwei-Klick-Muster (widerrufene Keys bleiben sichtbar, `opacity-60` — Audit-Trail), ehrliche Leerzustände (inkl. „noch niemand via Keycloak eingeloggt" wenn `GET /api/users` leer). Budget-Hinweis: Projektzelle und Mint-Dialog erklären die `project_user_budgets`-Verknüpfung per Tooltip/Hinweistext — kein zweites Budget-Formular. Plaintext wird nirgends persistiert (nur React-State im Dialog, kein localStorage).
- `src/frontend/src/App.tsx:49,99,469` — Import, Nav-Eintrag `/admin/consumer-keys` (`nav.consumerKeys`, im Analytics-Dropdown neben `nav.teams`) und Route.
- `src/frontend/src/i18n/locales/*.json` (60 Dateien) — `nav.consumerKeys` + kompletter `consumerKeys.*`-Block: en (Quelle) und de (vollständige Übersetzung) handgeschrieben, die übrigen 58 Locales per Skript mit englischem Fallback-Text befüllt (REPO-STANDARD wie TASK-021/022). Reine Insertions, keine Bestandteile verändert.
- `docs/tasks/TASK-027-frontend-consumer-keys-ui.md` — diese Ergebnis-Sektion (Task-Datei war auf main untracked, ins Worktree kopiert und committed).

## Build/Test-Status (ehrlich)

- `npm run test` (vitest + check:i18n) im Worktree: **grün** — 230/230 Tests bestanden, `i18n validation passed for 60 locales and 1304 keys`.
- `npm run lint` im Worktree: 229 errors / 13 warnings, alles Vorhand-Noise; `ConsumerKeysPage.tsx` und `App.tsx` tragen **0** Probleme bei. Vergleichsbasis main-Checkout: 318 errors / 13 warnings — nicht verschlechtert (worktree-baseline liegt unter main, da main-Lauf zusätzliche Dateien erfasste; meine Dateien sind in beiden Läufen fehlerfrei).
- `tsc --noEmit -p tsconfig.app.json` (via `node node_modules/typescript/bin/tsc`, `.bin/tsc` fehlt in der Installation): 247 errors — identisch zur main-Baseline (247), meine Dateien tragen **0** bei (Mandate-6-Filter gegen repo-weiten Stil-Noise).
- **Live-Verifikation eingeschränkt:** Stack läuft (Frontend `127.0.0.1:19090` → 200, Backend `127.0.0.1:19091/health` → 200). `GET /api/consumer-keys` ohne Session → **401** (Auth-Gate korrekt). **Vollständiger Mint→/v1/chains→Revoke-Durchlauf konnte von mir nicht live gefahren werden:** der Default-Admin wurde vom Operator personalisiert (`/api/auth/login` mit `admin@jimesh.local/admin` → 401 „wrong password"), mir liegen keine Dashboard-Credentials vor. Der Backend-Fluss ist laut Task-Header am 8.9.2026 live verifiziert (Backend-Autor); mein Anteil daran ist **nicht** wiederholt verifiziert.
- **Browser-Verifikation ausstehend:** der geteilte Dev-Server auf 19090 bind-mountet nur main; ich habe den geteilten Container **nicht** neugestartet. Die neue Seite ist im Browser erst nach Deploy/Restart meines Branch-Standes sichtbar.

## Abweichungen von der Task-Vorgabe

- Branch-Name `worktree-task-027-consumer-keys-ui` statt `task/027-<slug>` (WORKTREE-PROTOCOL §1) — Vorgabe aus der Operator-Anweisung, die explizit diesen Namen fordert.
- Worktree-Dir `.claude/worktrees/task-027-consumer-keys-ui` statt `../jimesh-worktrees/...` — ebenfalls Operator-Anweisung; bestehende Agent-Worktrees folgen demselben Muster.
- Kein eigener `tsc`-Lauf via `npx` möglich (typescript nicht global via npx auflösbar) — stattdessen direkter Compiler-Aufruf, Ergebnis oben.
- `API_DOCS.md`, Sprint- und Backlog-Dateien nicht angefasst: Routen waren bereits dokumentiert (API_DOCS.md „Consumer Keys", Zeile 723 ff.); laut WORKTREE-PROTOCOL §7 schreibt eine Task ausschließlich in die eigene Task-Datei — BACKLOG/Sprint-Spiegelung macht Claude beim Review.

## Offene Fragen für den Reviewer

1. Browser-Check auf main nach Merge: Mint → Kopierdialog → Liste, Revoke-Zwei-Klick, Nav-Eintrag — wer macht das?
2. Soll der Mint-Dialog `allowedChains` als freie Texteingabe behalten oder eine Chain-Multi-Select (aus `/api/chains`) bekommen? Aktuell bewusst minimal gehalten.
3. `userName`-Fallback auf `userId`, wenn der Join leer ist — ok, oder soll leer stattdessen ehrlich `—` zeigen?
4. Soll die Seite auch bei leerer User-Liste den Mint-Button deaktiviert zeigen (aktueller Stand) oder ganz ausblenden?

## Branch

`worktree-task-027-consumer-keys-ui`, 2 Commits: `50baf3f` (feat: Page, Route, Nav, i18n) + `ea725c6` (docs: dieser Report)
