# TASK-020 — Frontend: Keycloak OIDC-Login verdrahten

> **Status:** ✅ ERLEDIGT (8.9.2026, gemergt) · **Speist:** Sprint 27 (Identity Broker: Keycloak), WP3/WP4
> **Ausführung:** eigene Session (Frontend), parallel zum Backend
> **Backend-Gegenstück (bereits fertig, live verifiziert):** `internal/auth/keycloak_oidc.go`

## Kontext (must-read, 2 Minuten)

Das Backend hat jetzt einen kompletten Keycloak-OIDC-Login-Flow (Authorization
Code + PKCE), live verifiziert Ende-zu-Ende über den echten Go-Server:

- `GET /api/auth/oidc/login` — leitet den Browser zu Keycloaks echter
  Login-Seite weiter (302 Redirect, kein JSON — der Browser muss dorthin
  navigieren, nicht per `fetch` aufrufen).
- `GET /api/auth/callback` — Keycloaks Redirect-Ziel nach erfolgreichem Login.
  Das Backend tauscht den Code gegen Tokens, validiert sie, mintet eine
  normale JiMesh-Dashboard-Session (dieselbe wie beim Passwort-Login) und
  leitet den Browser weiter zu:
  **`http://localhost:19090/?auth_token=<opaque-jimesh-session-token>`**
  (Query-Param `auth_token`, kein Cookie — bewusst so gebaut, damit am
  Frontend NICHTS an der Token-Speicherung geändert werden muss).

Das Frontend kennt Keycloak aktuell gar nicht (`grep -rl keycloak
src/frontend/src/` findet nichts) — nur das alte Passwort-Formular existiert.
Diese Task schließt genau diese Lücke.

## Relevante Dateien (bereits gelesen, hier die genauen Stellen)

- `src/frontend/src/components/auth-gate.tsx` — `AuthForm`
  (Passwort-Formular) und `AuthGate` (entscheidet setup/login/authenticated
  anhand von `/api/auth/status`).
- `src/frontend/src/lib/api.ts` — `TOKEN_KEY = 'jimesh_dashboard_token'`,
  `setToken(token: string)` speichert in `localStorage`, wird bereits vom
  Passwort-Login-Pfad benutzt (`auth-gate.tsx:75`, `setToken(res.token)`).

## Auftrag

- [ ] **AuthGate/AuthForm um Keycloak-Login ergänzen:** Primärer Button
  "Sign in with Keycloak" (oder analog i18n-Key), der bei Klick
  `window.location.href = '/api/auth/oidc/login'` setzt (KEIN `apiFetch` —
  das ist ein echter Browser-Redirect, keine JSON-API). Das bestehende
  Passwort-Formular bleibt als sekundäre Option erreichbar (z. B. hinter
  einem "oder mit Passwort anmelden"-Link) — nicht ersatzlos entfernen, der
  Passwort-Pfad funktioniert weiterhin serverseitig.
- [ ] **Callback-Token abholen:** Beim App-Start (z. B. in `AuthGate` oder
  einem `useEffect` auf App-Root-Ebene, VOR dem ersten `/api/auth/status`-
  Check) prüfen, ob die URL einen `?auth_token=`-Query-Param trägt. Falls
  ja: `setToken(token)` aufrufen, den Query-Param aus der URL entfernen
  (`window.history.replaceState` — nicht per Re-Navigation, sonst Redirect-
  Loop-Risiko), dann `refetch()`/`queryClient.invalidateQueries()` wie in
  `onAuthed()` bereits gemacht.
- [ ] **Fehlerfall:** Wenn Keycloak mit einem Fehler zurückleitet oder das
  Backend den Callback ablehnt, landet der Browser NICHT bei
  `/?auth_token=...`, sondern sieht die Backend-Fehlerantwort direkt
  (JSON, kein Redirect) — kurz gegenprüfen, ob das UI-seitig einen
  brauchbaren Zustand zeigt (zumindest keinen weißen Screen), notfalls mit
  einem einfachen Error-Boundary/Fallback-Link zurück zu `/`.
- [ ] **i18n:** neue Strings über den bestehenden `useI18n()`-Mechanismus
  (siehe andere `t('auth.*')`-Keys in `auth-gate.tsx`), nicht hartcodieren.
- [ ] **Live verifizieren** (Mandat 2, kein Mock): kompletten Flow im echten
  Browser durchklicken — `npm run dev` (oder `make restart-backend` reicht,
  Frontend läuft schon via Compose), `http://localhost:19090` öffnen,
  "Sign in with Keycloak" klicken, mit `admin` / `JIMESH_ADMIN_PASSWORD`
  (aus `.env`) einloggen, prüfen dass man im Dashboard landet UND dass
  `localStorage.getItem('jimesh_dashboard_token')` einen Wert hat.

## Nicht Teil dieser Task

- Kein neuer Keycloak-Client, keine neuen Redirect-URIs — alles bereits in
  `config/keycloak/jimesh-realm.json` hinterlegt und live verifiziert.
- Kein OTP/MFA-UI — Keycloaks eigene, gehostete Login-Seite übernimmt das
  komplett; das Frontend sieht davon nichts (reiner Redirect-Flow).
- Externe IdP-Buttons (GitHub etc., Sprint 27 WP5) — der GitHub-IdP ist im
  Realm aktuell `"enabled": false`; sobald WP5 ihn aktiviert, taucht er
  automatisch als zusätzliche Option auf Keycloaks eigener Login-Seite auf
  (nicht im JiMesh-Frontend nachgebaut) — keine Frontend-Änderung nötig.

## Akzeptanzkriterien

- [ ] "Sign in with Keycloak" führt zu einer echten Keycloak-Login-Seite
- [ ] Nach erfolgreichem Login: Dashboard sichtbar, Token in localStorage,
      `?auth_token=` nicht mehr in der URL sichtbar
- [ ] Passwort-Login funktioniert weiterhin unverändert (Fallback)
- [ ] Kein Redirect-Loop bei Fehlern (z. B. abgebrochener Keycloak-Login)

## Ergebnis

## Geändert
- `src/frontend/src/components/auth-gate.tsx` — neue `KeycloakLoginCard`
  (primärer Button, `window.location.href = '/api/auth/oidc/login'`, kein
  `apiFetch`); `AuthForm` bekommt `showPasswordForm`-State (default `false`
  im `login`-Modus, `true` im `setup`-Modus — Keycloak nur auf dem
  Login-Screen, nicht auf dem Erst-Setup-Screen, da Setup das lokale
  Bootstrap-Admin-Konto selbst anlegt); Passwort-Formular bleibt über
  "Sign in with password instead" / "Back to Keycloak sign-in" in beide
  Richtungen erreichbar, funktional unverändert.
- `src/frontend/src/lib/api.ts:18-36` — neue `consumeAuthTokenFromUrl()`:
  liest `?auth_token=` per `URL`/`URLSearchParams`, ruft `setToken()`,
  entfernt den Param per `history.replaceState` (keine Re-Navigation, kein
  Loop-Risiko bei Reload).
- `AuthGate` (auth-gate.tsx:454-486) ruft das über einen lazy
  `useState(() => consumeAuthTokenFromUrl())`-Initializer auf — läuft
  synchron beim ersten Render, garantiert vor dem Fetch-Effect der
  `auth-status`-Query — plus einen defensiven
  `invalidateQueries()`+`refetch()` (gleiches Paar wie `onAuthed()`), falls
  der Query-Cache den Token doch verpasst.
- 3 neue i18n-Keys (`auth.signInWithKeycloak`, `auth.usePasswordInstead`,
  `auth.backToKeycloak`) in `en.json` und allen 59 weiteren Locale-Dateien
  unter `src/frontend/src/i18n/locales/*.json`.

## Build/Test-Status (ehrlich)
- `cd src/frontend && npm install` — lief durch (718 packages, 2
  Sicherheitswarnungen von `npm audit`, unrelated zu dieser Task).
- `npx tsc --noEmit -p tsconfig.app.json` — 247 Fehler, aber **alle
  vorbestehend**: per `git stash`/`tsc`/`git stash pop` verifiziert, dass
  exakt dieselben 247 Fehler in denselben 23 Dateien (ProjectsPage.tsx,
  CostDashboard.tsx, chain-mesh-graph.tsx, …) auch ohne meine Änderungen
  auftreten. **0 Fehler** in `auth-gate.tsx` oder `lib/api.ts`.
- `npx eslint src/components/auth-gate.tsx src/lib/api.ts` — 0 Findings.
- `npm run test` (vitest + `check:i18n` verkettet) — **grün**: 18
  Testdateien, 230 Tests bestanden; `check:i18n` meldet "passed for 60
  locales and 1054 keys".
- `curl -sI http://localhost:19091/api/auth/oidc/login` gegen den echten,
  laufenden Backend-Container (Hauptcheckout-Compose-Stack) —
  **302 Found**, `Location:` zeigt auf
  `http://localhost:8081/realms/jimesh/protocol/openid-connect/auth?...`
  mit echtem PKCE `code_challenge`/`state`. Keycloak-Realm selbst
  (`/realms/jimesh/.well-known/openid-configuration`) antwortet mit 200.
- Zusätzlicher, selbst gewählter Boot-Smoke-Test (kein Bestandteil der
  Standard-Toolchain, aber ehrlich zu vermerken): `vconfig.json`
  **temporär** (nicht committet, danach exakt zurückgesetzt — `git diff`
  zeigt keinen Unterschied) auf `127.0.0.1:19091` umgebogen und
  `npx next dev -p 5175` im Worktree gestartet. `/api/auth/status` über
  diesen Dev-Server lieferte echte Live-Daten vom Backend
  (`{"authenticated":false,"email":"admin@jimesh.local","needsSetup":false}`),
  und der kompilierte Client-Bundle (`.next/static/chunks/..._App_tsx.js`)
  enthält nachweislich `oidc/login` sowie die übersetzten Locale-Strings —
  d. h. der neue Code kompiliert, bündelt und wird tatsächlich an den
  Browser ausgeliefert.
- **Nicht ausgeführt / nicht möglich:** ein echter interaktiver
  Browser-Klick-Durchlauf (Button klicken → Keycloak-Login-Seite →
  `admin`/`JIMESH_ADMIN_PASSWORD` eingeben → Dashboard →
  `localStorage.getItem('jimesh_dashboard_token')` prüfen). Diese Session
  hat kein GUI-fähiges Browser-Werkzeug zur Verfügung — nur curl und
  Bundle-Inspektion, wie oben beschrieben. Das ist die Grenze meiner
  Verifikation, ausdrücklich hier vermerkt statt stillschweigend als
  "live verifiziert" behauptet.

## Abweichungen von der Task-Vorgabe
- Keycloak-Button nur im `login`-Modus, nicht im `setup`-Modus (Task-Text
  nennt explizit nur den Login-Kontext; Setup betrifft das lokale
  Bootstrap-Admin-Konto, das mit Keycloak nichts zu tun hat — eigene
  Interpretationsentscheidung, siehe offene Frage unten).
- **Struktureller Befund, kein Scope-Verstoß:** `docs/tasks/` ist
  repository-weit in `.gitignore` (Zeile 43) eingetragen und in keinem
  Branch getrackt (`git ls-files docs/tasks/` liefert nichts). Diese
  Task-Datei existierte deshalb nie im automatisch angelegten Worktree —
  ich musste sie dort selbst neu anlegen (Kopie des Originaltexts aus dem
  Hauptcheckout plus dieser Ergebnis-Abschnitt), weil sowohl das direkte
  Editieren der Hauptcheckout-Datei als auch ein Git-Commit einer
  ignorierten Datei vom Sandbox/Tooling verweigert werden. Ich konnte den
  Bericht also NICHT wie in WORKTREE-PROTOCOL.md §7 vorgeschrieben "im
  eigenen Branch committet" abliefern — nur als lokale Datei in diesem
  Worktree. Der eigentliche Code-Diff (auth-gate.tsx, lib/api.ts, 60
  Locale-Dateien) ist regulär auf dem Worktree-Branch committet.

## Offene Fragen für den Reviewer
1. Soll der Keycloak-Button auch auf dem `setup`-Screen erscheinen (falls
   ein frischer Server nie lokal per Passwort eingerichtet werden, sondern
   direkt per Keycloak gebootstrapt werden soll)? Aktuell: nein, siehe
   Abweichungen oben.
2. `docs/tasks/` ist `.gitignore`t und ungetrackt — das WORKTREE-PROTOCOL.md
   erwartet aber, dass Task-Dateien "committed im eigenen Branch" landen.
   Das ist strukturell unmöglich, solange der Pfad ignoriert bleibt und
   Worktrees ihn nicht mitbekommen. Sollte das Protokoll angepasst werden
   (z. B. `docs/tasks/*.md` von der `.gitignore`-Regel ausnehmen, oder
   Reports an einen anderen, getrackten Ort legen)?
3. Ein echter Browser-Klick-Durchlauf wurde nicht ausgeführt (siehe
   Build/Test-Status) — falls das für den Merge zwingend ist, bitte von
   einer Session mit GUI-Browser-Zugriff nachholen lassen.

## Branch
worktree-agent-a6eed3eb0bcb086f8 (vom automatisierten Worktree-Setup so
benannt, nicht `task/020-frontend-keycloak-oidc-login` wie im Protokoll
vorgesehen — die Orchestrator-Anweisung sagte ausdrücklich, das
vorbereitete Worktree/Branch-Setup zu übernehmen, nicht neu anzulegen),
Commits: 1, letzter Commit: f61999f21ae536944061f4019d3707cb761b030e
