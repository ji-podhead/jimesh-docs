# SPRINT-40 — UI-Konsolidierung nach E-IA (TASK-066 Vault)

**Quelle:** E-IA-Entscheidung (Operator 14.9.2026 „ok go go go",
`docs/research/DECISIONS.md` §E-IA): 5 Haupt-Tabs (Proxy / Workspaces /
**Platform NEU** / Security / DBs) + separates Admin. TASK-066 war als
IA-gehaltener Task freigegeben mit der Auflage: NICHT blind mergen, sondern
VaultPage's einzigartige Features inventarisieren, Secret-Listen-UX nach
Security/„Project Secrets", Redirect der alten Route.

Schwester-Sprint: `SPRINT-40-HEADSCALE-NETWORKS.md` (TASK-078, separates
Work-Package desselben Sprint-Nummernkreises).

## Ziel (Plan vor Code, Mandat 1.4)

1. **Inventar vor Merge:** Was hat `VaultPage.tsx`, das
   `VaultDashboardPage.tsx` NICHT hat? Fundstellen dokumentieren, nichts
   blind übernehmen.
2. **Platform-Tab** in `App.tsx` navGroups: Gruppe zwischen Workspaces und
   Security, ROUTE_PLAT = `['/control-planes', '/vault-dashboard',
   '/networks']` (E-IA-Spec; als `PLATFORM_BASES` nach der `*_BASES`-Konvention).
3. **VaultDashboardPage wird „Vault"** (Platform-Tab, Route `/vault-dashboard`
   unverändert), **VaultPage wird „Project Secrets"** (Security-Tab, Route
   `/security/vault` → `/security/secrets`, konsistent mit den
   Security-Siblings overview/exposure/events/scans/testing).
4. **Redirect** alter Pfade im TASK-063-Muster (`/logs` → `/sdk-logs`).
5. **Command-Palette:** beide Einträge korrekt benannt + eine neue
   Project-Secrets-Zeile.
6. **Verify:** tsc, check:i18n, Live-Curl :19090.

Akzeptanz: keine Route wird 404 (Mandat 2: ein Link der funktionierte
funktioniert weiter), Engine-Logik (TASK-065, `/api/secrets-engines`)
unangetastet, `workspace-secrets-section.tsx` unangetastet (E-IA:
creation-time choice bleibt).

## Inventar-Ergebnis (Schritt 1 — das war der Punkt „NICHT blind mergen")

**VaultPage** (623 Z., `/security/vault`, i18n `vault.*`) hatte als
EINZIGARTIGE Features — alle am eingebetteten Vault (`/api/vault/*`):

- agentenbezogene Secret-Liste: `allowedAgents` als Badges, Value-Reveal
  on demand, createdAt/updatedAt (`VaultPage.tsx` SecretRow)
- **JIT-Token-Ausstellung** pro Secret (`POST /api/vault/tokens`, Token
  „shown exactly once") — die Zero-Trust-Laufzeit-Zugriffsschicht (Mandat 9)
- **Vault-Audit-Log** (`GET /api/vault/audit`) — wer hat wann worauf
  zugegriffen (exakt der Trail des Guards)
- **Encryption-Key-Warnbanner** (`GET /api/security/audit`, dev-fallback
  plaintext caveat)
- Create/Edit/Delete am eingebetteten Vault (`POST/PUT/DELETE
  /api/vault/secrets`)

**VaultDashboardPage** (639 Z., `/vault-dashboard`, i18n `vaultDashboard.*`)
hat: Engine-Registry-CRUD (`GET/POST/DELETE /api/secrets-engines`),
per-Engine-Secret-Verwaltung (nur Key-Namen, kv-Filter), Import von Engine
zu Engine (`POST /api/secrets-engines/{id}/import`).

**Fazit: NICHTS wurde übernommen — und das ist das Ergebnis, nicht ein
Versäumnis.** Keines der VaultPage-Features hat ein Gegenstück in der
Engines-API (kein `allowedAgents`, kein JIT, kein Audit, keine Values in
Listen). Alle fünf Unique-Features sind per-Design Projekt-gebundene
Laufzeit-Secret-Features: der K-LAF-Guard liest exakt diese Secrets zur
Laufzeit über `POST /api/vault/access`. Sie BLEIBEN also auf der
Project-Secrets-Seite. Umgekehrt war VaultPage nie die „fette" Seite:
Engine-CRUD/Import/Export existierten dort nie — die „Reduktion" von
VaultPage auf die Projekt-Secret-Liste war faktisch ein Naming-/IA-Problem
(Titel, Beschreibung, Nav-Label, Route), kein Feature-Removal. Der
Merge-Schutzzweck („was geht verloren?") ist damit beantwortet: nichts.

## Was TASK-066 gebaut hat

- [x] `src/frontend/src/App.tsx`:
  - `PLATFORM_BASES = ['/control-planes', '/vault-dashboard', '/networks']`
    + `platformItems` — die drei Einträge wanderten unverändert aus
    `PROJECT_BASES`/`PROXY_BASES` (nur der Vault-Eintrag bekommt
    `labelKey: 'nav.vault'`).
  - Neue navGroups-Gruppe **Platform** zwischen Workspaces und Security
    (Icon `Server`, `nav.platform`).
  - securityItems: `/security/vault` → `/security/secrets` mit
    `labelKey: 'nav.projectSecrets'`.
  - Route `/security/secrets` (ProjectSecretsPage) + Redirect
    `/security/vault` → `/security/secrets` (TASK-063-Muster: `<Navigate
    replace>` statt 404). `/vault-dashboard` bleibt unverändert.
- [x] `src/frontend/src/views/VaultPage.tsx` → **`ProjectSecretsPage.tsx`**
  (git mv, Komponente umbenannt, Header-Kommentar dokumentiert E-IA +
  K-LAF-Guard-Kontext; Funktionsumfang unverändert — s. Inventar). Die
  `vault.*`-i18n-Sektion behält ihren Namen: sie beschreibt die
  `/api/vault/*`-Domäne, nicht die Seite.
- [x] `VaultDashboardPage.tsx`: nur Kommentar-Update des Querverweises
  („deliberately a DIFFERENT page from /security/secrets …") — Logik
  unangetastet (TASK-065-Kollisions-Schutz, GLM-SESSION-BATCH C1).
- [x] `command-palette.tsx`: `p-vault-dashboard` heißt jetzt „Vault"
  (`nav.vault`, Keywords um `platform`/`registry` erweitert) + NEU
  `p-project-secrets` (→ `/security/secrets`, Keywords guard/jit/audit).
- [x] i18n: `nav.platform` + `nav.projectSecrets` (en/de handübersetzt,
  58 Backfill-Locales), `nav.vaultDashboard` entfernt (alle 61 Locales),
  `vault.title/description/loading/error.title` → „Project Secrets"-Framing
  (en/de), `vaultDashboard.pageTitle` → „Vault" + Beschreibung mit
  Project-Secrets-Querverweis (en/de).
- [x] `workspace-secrets-section.tsx`: **unberührt** (E-IA-Punkt 3).

## Parallel-Agent-Übernahme (Transparenz, Staging-Lesson-Fall)

- Ein parallel im selben Tree laufender 066-Agent committete `28a9c00`
  („TASK-066 (in-flight)") nur den i18n-Key-Schritt — mit fehlerhaften
  Platzhalter-Werten in den 58 Backfill-Locales (`nav.platform` UND
  `nav.projectSecrets` = „Vault Dashboard") — und starb danach. Takeover
  (Operator bestätigt 13.9.): Werte auf die korrekten en-Werte
  („Platform"/„Project Secrets") korrigiert; de.json hatte der Parallel-Agent
  korrekt übersetzt („Plattform"/„Projekt-Secrets") — unverändert gelassen.
- **Rescue-Sweeps (der geteilte Index schlug dreimal zu, Fall ab99f24):**
  Teile dieser Arbeit landeten unter fremden Commit-Messages in HEAD —
  dokumentiert statt history-rewritten:
  - `286dbc8` (TASK-067): die en.json-nav-Key-Migration (nav.platform +
    nav.projectSecrets, nav.vaultDashboard entfernt) — korrekte Werte,
    falsche Message.
  - `0d8df88`/`d5a7269` (TASK-069-Rettungs-Commits): die 58 korrigierten
    Locale-Werte, die en/de-vault.*/vaultDashboard.*-Werte, App.tsx mit
    Platform-Gruppe/Routes/Redirect sowie der git-mv-Rename
    VaultPage.tsx → ProjectSecretsPage.tsx (HEAD-Stand: Datei umbenannt,
    Komponente hieß dort noch `VaultPage` — der Abschluss-Commit bringt
    Komponenten-Rename + Header-Kommentar, den VaultDashboardPage-Querverweis
    und die Palette nach).
- TASK-069 arbeitete währenddessen an denselben Locale-Dateien
  (`securityOverview.targetPicker`); seine Keys sind mit seinen Commits
  saubere Nachbarn in HEAD.
- Konsequenz des `45ab997`-Musters (DISPATCH-WORKTREE-PATTERN): künftig ein
  Task = ein Worktree = ein Branch — genau diese Keramik entfällt dann.

## Verify (Mandat 6 — ehrlich, mit Befund)

- `tsc --noEmit -p tsconfig.app.json`: **meine geänderten Dateien werfen
  null Fehler.** Der Lauf zeigt 205 Fehler — alle pre-existing am HEAD
  (alle Fehler-Dateien sind im Working Tree unmodifiziert; Stichprobe
  `FallbackEntry` fehlt `apiKeyId` am HEAD selbst). Kein neuer Fehler durch
  TASK-066.
- `npm run check:i18n`: **grün** — „i18n validation passed for 60 locales
  and 1979 keys" (inkl. der 58 korrigierten Locales, inkl. parallelem
  069-Keys-Stand im Working Tree).
- Live `:19090` (Next-dev-Shell mountet die SPA via
  `src/app/[[...slug]]/page.tsx` → `next/dynamic(import('../../App'))`):
  `/security/secrets` → **200**, `/security/vault` → **200** (liefert die
  SPA-Shell; der Redirect feuert client-seitig), `/vault-dashboard` → **200**.
- Der laufende Devserver hat nach den Edits dreimal komplett kompiliert
  („✓ Compiled (4179 modules)", keine error-Zeilen in den Logs) — App.tsx +
  ProjectSecretsPage sind fehlerfrei im laufenden Graphen.
- Offen (Operator-Blick): der visuelle Beweis „Platform-Tab erscheint
  zwischen Workspaces und Security" braucht einen Browser-Refresh von
  :19090 — curl kann den client-seitigen Nav-Render nicht sehen.

## Offen / Nachfolge

- TASK-074 (REVISED: persistente Workspace-Context-Sidebar, supersedes
  Mini-Sidebar) baut auf der Platform-Gruppe auf — App.tsx-Gruppe steht,
  Sidebar-Komponente ist deren Aufgabe (53c5bd3).
- TASK-081 (LLM-Security-Tab „Guard-Historie") kann auf den
  Project-Secrets-Audit-Trail (`vault.audit.*`) aufsetzen.
- Der 5-Tab-Zustand ist mit diesem Sprint vollständig hergestellt
  (E-IA-Tabelle: Proxy/Workspaces/Platform/Security/DBs + Admin separat).
