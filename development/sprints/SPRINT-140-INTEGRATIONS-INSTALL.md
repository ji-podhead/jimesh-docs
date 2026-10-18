# SPRINT-140 — Integrations-Install: die Echo-Route wird echt (Persistence, ehrliche Verfügbarkeit, Jules-Key-Flow)

**Status:** ✅ VERIFIZIERT GEBAUT (28.9.2026; Verifikation dieser Session unten)

## PART 2 — Overview-Fusion (Operator-Auftrag 28.9. ~05:30, wörtlich: "kannst du bitte diese overview seite von integrations und plugins bitte fusionieren?")

### Karte vor der Fusion (verifiziert am Code)

| Fläche | Route | Nav-Label (i18n) | Zeigte | Einzigartiger Inhalt |
|---|---|---|---|---|
| AgentsPage | `/agents` | `nav.agents` = "Integrations" (auch Sidebar + Command-Palette) | PageHeader + ActiveDeploymentsSection + SubagentsPanel | **nur SubagentsPanel** (Live-Subagent-Sessions + Guarded-Tool-Call-Approval-Queue, GET /api/subagents + /api/subagents/guarded) |
| PluginCatalogPage | `/plugins` | `nav.pluginCatalog` = "Plugins" | Browser-Integration-Trigger (SPRINT-59), ActiveDeploymentsSection, Installed-Shelf, Katalog+Wizard | alles Plugins-Real |
| PluginSettingsPage | `/plugins/settings` | `nav.pluginSettings` | installierte Rows verwalten | bleibt eigenständig (Management, keine Overview-Duplikation) |
| ProjectDetailPage Integrations-Tab | per Projekt | — | Katalog je Projekt | **bleibt per-Projekt (Vorgabe), nicht Teil der Fusion** |

Die Duplikation war real: ActiveDeploymentsSection lief auf BEIDEN Overview-Seiten —
der Operator sah zwei Übersichten, eine davon ("Integrations") fast ohne Eigenleben.

### Design (eine kanonische Fläche)

- **Kanonisch: `/plugins`** → relabelt zu **"Integrations & Plugins"**
  (`plugins.title`, `plugins.subtitle`, `nav.pluginCatalog` — Werte-Update in
  en+de, EN-Fallback in den übrigen 58, `scripts/update-sprint140-merged-page-i18n.cjs`).
- SubagentsPanel (der EINZIGE echte Eigeninhalt von /agents) mountet jetzt auf
  /plugins direkt nach ActiveDeploymentsSection (`PluginCatalogPage.tsx`).
- `/agents` → **Redirect auf /plugins** (`App.tsx`, dasselbe Muster wie der
  bestehende `/subagents` → `/subagents/approvals` Redirect) — jeder Nav-/
  Sidebar-/Palette-Link bleibt auflösbar, KEIN toter Link.
- `AgentsPage.tsx` **gelöscht** (nach dem Redirect unerreichbar — Mandat 14,
  keine tote Seiten-Leiche).
- Command-Palette (`command-palette.tsx`): der p-agents-Eintrag wird p-plugins
  → go('/plugins'), Label `nav.pluginCatalog` (= "Integrations & Plugins"),
  Keywords gemerged (agents claude codex … subagents install catalog) — EIN
  Eintrag statt zwei, alter Such-Intent findet die gemergte Fläche.
- `/agents/sessions/:sessionId` (Detail-Route) bleibt unangetastet.

### Bewusst NICHT von mir geändert (Section-Nav + Sidebar liegen bei einem
anderen Agent — Onboarding-Move, uncommitted). EXAKTE Zeilen-Edits für den
Parent (erst anwenden, wenn dessen Arbeit gelandet ist):

1. `src/frontend/src/lib/section-nav.ts` **Zeile 141 LÖSCHEN**:
   `  { to: '/agents', labelKey: 'nav.agents', icon: Bot },`
2. `src/frontend/src/lib/section-nav.ts` **Zeile 74** (PROJECT_BASES):
   `export const PROJECT_BASES = ['/projects', '/agents', '/chat', '/workspaces', '/subagents', '/plugins', '/onboarding']`
   → `export const PROJECT_BASES = ['/projects', '/chat', '/workspaces', '/subagents', '/plugins', '/onboarding']`
3. `src/frontend/src/components/sidebar/HierarchySidebar.tsx` **Zeile 246 LÖSCHEN**
   (NAVIGATION_ITEMS, `{ to: '/agents', labelKey: 'nav.agents', icon: Bot },`)
   und den Kommentar darüber "6 links remain" → "5 links remain".
4. `src/frontend/src/lib/section-nav.test.ts` **Zeile 34**:
   `expect(activeSectionFor('/agents')?.labelKey).toBe('nav.workspaces')` → löschen
   oder ersetzen durch `expect(activeSectionFor('/agents')).toBeNull()` —
   **KORREKTUR 28.9. nachts:** mein ursprünglicher Vorschlag `.toBeUndefined()`
   war subtil falsch (activeSectionFor liefert für Nicht-Mitglieder `null`, siehe
   den Nachbar-Test "returns null outside any section"); nach dem Anwenden der
   Edits durch den Parent habe ich die Zeile selbst auf `.toBeNull()` gerichtet
   (das Test-File stand nicht unter dem section-nav.ts-Tabu). NACHTRAG: Edits 1-4
   sind bereits live angewendet (auch der ungenutzt gewordene Bot-Import ist raus);
   die Nav-Dateien liegen uncommitted, das Test-File-Fix ist meines. Danach:
   tsc wieder 474, vitest FULL 411/411.
   mit Edit 2 ist /agents keine Projects-Mitgliederroute mehr (der Redirect
   führt ohnehin nach /plugins, das Mitglied bleibt).

Die Nav-Labels brauchen KEINE weiteren Edits: `nav.pluginCatalog` trägt bereits
"Integrations & Plugins" (Werte-Update in allen 60 Locales von mir).

**Auslöser (Operator, 28.9.):** "warum lassen sich in der integrations seite keine
integrations installieren — aber auch bei der workspace-seite bei integrations nicht?"

**Bestätigt durch Prompts-VS-Delivery-Audit (28.9.2026,
/home/ji/projects/ihc24/PROMPTS-VS-DELIVERY-AUDIT-2026-09-28.md):**
`/api/plugin-installations` ist ein **No-Persistence-Echo** (plugins.go:62-80: POST
antwortet `success:true`, speichert NICHTS) — Mandat-2-Verstoß (die Erbsünde, die
dieses Repo verbietet) und der Root Cause des Operator-Symptoms auf BEIDEN Flächen:
Install "erfolgt", GET antwortet immer `[]`, die UI zeigt nie etwas als installiert.

## Ziel

Der Install-Flow funktioniert ECHT end-to-end für Plugins mit echtem Backend (heute:
jules), und Plugins OHNE Backend-Integration sind ehrlich NICHT installierbar (kein
toter Button, der etwas vortäuscht — SPRINT-49-Präzedenz: Fake-Install-Pfade entfernen).

## Root-Cause-Analyse (verifiziert am Code)

1. **POST /api/plugin-installations** (gateway/plugins.go:62-80): decodiert den Body,
   setzt `activated=true`, echoed zurück — kein INSERT, kein Store-Aufruf.
2. **GET /api/plugin-installations** (plugins.go:65-68): hardcoded `{installations: []}`.
3. Folge auf Fläche 1 (Integrations-Tab /plugins): Wizard schließt "erfolgreich", der
   Installed-Shelf bleibt leer, `N active` bleibt 0, der Install-Button bleibt.
4. Folge auf Fläche 2 (Workspace-Settings "Workspace Plugins & Integration"):
   PluginActivationCard bekommt NIE ein `installation`-Prop → "Active" ist
   unerreichbar; zusätzlich ist der Jules-Katalogeintrag HARDCODED inline in der
   Seite (driftender Duplikat-Mock des echten Katalogs).
5. **Jules**: die 4 echten Backend-Routen lesen den Key aus `JULES_API_KEY` env oder
   `X-Goog-Api-Key`-Header — der im Wizard eingegebene Key wird von NICHTSEMANDEN
   konsumiert; der Notice-Text behauptet "in Vault or environment", aber KEIN
   Code-Pfad liest den Vault → "Aktivierung ohne Wirkung".
6. **linear / github_app / meshsquad**: KEINE Backend-Routen (gateway.go führt nur
   /api/plugins/jules/*). Der Install-Button kann nie etwas bedeuten.
7. **ProjectDetailPage Integrations-Tab**: toter "Configure"-Button ohne onClick.

## Work Packages

- **WP1** Store `internal/store/plugin_installations.go`: Tabelle
  `plugin_installations` (Ensure-Pattern, TEXT-PK, UNIQUE (plugin_id, scope_type,
  scope_id), BIGINT-ms-Timestamps wie project_roles) + CRUD (Create-Upsert mit
  Read-Back, List mit Filtern) + migrate()-Hook in store.go.
- **WP2** Gateway `plugins.go`: GET liest echte Rows (Filter pluginId/scopeType/scopeId);
  POST persistiert ECHT mit ehrlicher Validierung: 404 unbekanntes Plugin,
  409 nicht-installierbares Plugin, 400 scopeType/authMode/config-JSON, 404
  Scope-Row existiert nicht (workspaces/projects-Store-Check). Katalog erhält das
  ehrliche `installable`-Feld, abgeleitet von den REAL registrierten Backend-Routen
  (jules: 4 Routen; linear/github_app/meshsquad: keine → false).
- **WP3** Mandat 9: der Wizard-Config kann einen apiKey enthalten → der wird beim
  Install NICHT als Klartext in die Row gelegt, sondern in vault_secrets
  (AES-GCM-256, projekt-scoped) gespeichert; die Row trägt nur `secretRef`, der
  Plaintext-Key erscheint in KEINEM GET-Response (VaultAudit mitschreiben).
- **WP4** `jules.go`: Key-Resolution env → Header → vaulted Installations-Secret
  (neueste aktivierte jules-Installation mit secretRef). Damit bedeutet
  "installiert" für Jules ECHT etwas: Sources/Sessions funktionieren mit dem im
  Wizard gespeicherten Key; der "in Vault"-Behauptung im Notice wird Wahrheit.
- **WP5** Frontend: PluginCatalogPage (Browser-Integration-Trigger bleibt!):
  nicht-installierbare Plugins → ehrlicher Badge statt Install-Button;
  ProjectDetailPage Integrations-Tab: echter Zustand statt totem Configure-Button;
  WorkspaceSettingsPage + PluginActivationCard: echter Katalog-Lookup statt inline
  Hardcode, echtes `installation`-Prop (Active erreichbar), Invalidate nach POST.
- **WP6** Tests: gateway/plugins_test.go (Validierungs-Branches ohne DB + DB-gestützte
  Persistenz/Secret-Stripping-Tests gegen jimesh_test, skip ohne Postgres) +
  vitest für Verfügbarkeits-Rendering und Install-Flow (echte Wire-Shapes).
- **WP7** Docs: API_DOCS.md (Katalog + Installation + Jules-Key), Backlog-Spiegel,
  BUILD-Report /home/ji/projects/ihc24/BUILD-2026-09-28-INTEGRATIONS-INSTALL.md,
  i18n en + 60 Locales (RM35-Fallback-Präzedenz).

## Akzeptanzkriterien

- POST /api/plugin-installations schreibt in PostgreSQL; GET liefert die Row
  zurück (Neustart-überlebend, Persistenz-Mandat).
- Jules-Installation mit Key → /api/plugins/jules/sources liefert echte Daten statt
  "No JULES_API_KEY"-Notice.
- GET enthält an keiner Stelle einen Plaintext-API-Key (nur secretRef).
- linear/github_app/meshsquad sind überall ehrlich nicht-installierbar; jules
  installierbar; Wizard-Flow auf /plugins UND Workspace-Settings-Card zeigen den
  echten Zustand.
- tsc-Baseline 477 nicht schlechter; check:i18n PASS; targeted vitest grün;
  `make go-build`/`go-vet`/`go-test` (docker golang pattern) grün.

## Ergebnisse (verifiziert am Code gebaut — retrospektive Ehrlichkeit)

### Geliefert & verifiziert

- **[x] WP1 Store-Tabelle**: `internal/store/plugin_installations.go` —
  EnsurePluginInstallationsTable (idempotent, TEXT-PK, UNIQUE
  (plugin_id, scope_type, scope_id), BIGINT-ms-Timestamps),
  CreatePluginInstallation (Upsert mit Read-Back wie GrantProjectRole),
  ListPluginInstallations (Filter, updated_at DESC). migrate()-Hook in
  `store.go` (ein Ensure-Aufruf, kommentiert).
- **[x] WP2 Gateway `plugins.go` komplett real**: GET /api/plugin-installations
  liest echte Rows; POST validiert ehrlich (404 unbekanntes Plugin /
  409 installable=false mit Begründung / 400 scopeType+authMode+config-JSON /
  404 Scope-Row fehlt via GetWorkspace+GetProject) und persistiert den Upsert;
  die Antwort ist die GE SPEICHERTE Row mit Server-Timestamps. Der Katalog
  trägt `installable`, abgeleitet aus `pluginBackendRoutes` (spiegelt die
  Registrationen in gateway.go New()): jules → true (4 echte Routen);
  linear/github_app/meshsquad → false (keine Backend-Routen, je mit
  Begründungs-Kommentar).
- **[x] WP3 Mandat 9**: secret-shaped config-Werte (Regex key|token|secret|password,
  dasselbe Heuristic wie das UI-Masking) wandern vor dem INSERT in
  `vault_secrets` (AES-GCM-256, projekt-scoped: Workspace → sein project_id,
  Project → selbst); Update-then-Create-Idempotenz, VaultAudit pro Schreibvorgang
  (accessor = X-JiMesh-Identity-Sub). Row + ALLE GET-Responses tragen nur
  `secretRef` (JSON-Map configKey→vaultName), nie Klartext — Test beweist
  beides (POST-Response UND GET-Liste enthalten den Key-String nicht).
- **[x] WP4 jules.go**: `s.julesAPIKey(r)` = env → Header →
  `s.julesInstalledKey()` (neueste aktivierte jules-Installation mit
  secretRef → Vault-Lookup). Der alte Notice-Text "in Vault or environment"
  war eine Behauptung ohne Code-Pfad — jetzt wahr, inkl. Install-Hinweis.
- **[x] WP5 Frontend (3 Flächen)**:
  - PluginCatalogPage.tsx: nicht-installierbare Katalog-Einträge zeigen den
    ehrlichen Badge "Noch keine Backend-Integration" statt eines toten
    Install-Buttons (installable aus dem Katalog, kein Hardcode); Browser-
    Integration-Trigger (?browser=1 + Header-Button) UNANGETASTET.
  - ProjectDetailPage.tsx (NUR Integrations-Tab): der tote Configure-Button
    (kein onClick) ist weg; pro Karte ehrlicher Zustand: Installed-Badge bei
    realer Installation im Projekt-Scope / Install-Flow-Link auf /plugins bei
    installierbar+frei / ehrlicher Nicht-Backend-Badge sonst.
  - WorkspaceSettingsPage.tsx + PluginActivationCard.tsx (die zweite
    Operator-Fläche): inline-hardcodierter Jules-Katalog-Eintrag ersetzt durch
    echten GET /api/plugins-Lookup; echtes `installation`-Prop (Active ist
    jetzt ERREICHBAR); POST setzt jetzt Content-Type + invalidiert
    ['plugin-installations'] → Karte flippt. PluginActivationCard zeigt für
    installable=false ehrlich WHY (Badge + Hinweis) statt Activate-UI.
  - PluginInstallWizardDialog.tsx: nur der Kommentar aktualisiert (behauptete
    noch die Echo-Route).
- **[x] WP6 Tests**:
  - Backend `internal/gateway/plugins_test.go` (5 Tests): Katalog-Signal
    (jules true, andere false), alle Validierungs-Branches ohne DB, und gegen
    die throwaway jimesh_test DB: Persistenz+Vault+Secret-Stripping,
    julesInstalledKey-Resolution, Upsert (gleiche id, kein Duplikat), ehrliche
    404er für unbekannte Workspace-/Project-Scopes. Skip ohne Postgres (Mandat 2).
  - Frontend vitest `PluginCatalogPage.test.tsx` (4): ehrliche Verfügbarkeit,
    Empty-Shelf, echte Rows spiegeln sich, KOMPLETTER Install-Flow (Klick →
    Wizard → echte Body-Fields → POST). `PluginActivationCard.test.tsx` (4):
    Active/Not-Activated/ehrlicher Nicht-Backend-Zustand/Activate-Feuerung.
- **[x] WP7 Docs + i18n**: API_DOCS.md (beide Plugin-Sektionen + Jules-Key-Tier
  neu), Backlog-Spiegel S140, dieser Sprint-File, BUILD-Report
  /home/ji/projects/ihc24/BUILD-2026-09-28-INTEGRATIONS-INSTALL.md. i18n: 3 neue
  Keys (plugins.notInstallable/notInstallableHint/openInstallFlow) in en + 59
  Locales; Badge handübersetzt in 53 Sprachen (kurze Standard-UI-Phrasen),
  openInstallFlow in 33, Hint nur de+en — Rest dokumentierter EN-Fallback per
  RM35-Präzedenz (keine ungesicherte Maschinenübersetzung). Helper-Script
  scripts/add-sprint140-plugin-i18n.cjs bleibt als Nachweis.

### Verifikation (alle Befehle tatsächlich gelaufen)

| Check | Ergebnis |
|---|---|
| `make go-build` (golang:latest-Container, kein Host-Go) | PASS (exit 0) |
| `go vet ./...` (im selben Container wie go test) | PASS (exit 0) |
| `go test -p 1 ./internal/gateway ./internal/store` gegen throwaway `jimesh_test` (netns-Route, s. Einschränkung) | **PASS** (ok gateway 2.158s, ok store 1.796s — inkl. aller 5 neuen Tests) |
| `go test ./...` (volle Suite, Makefile-Pattern) | **UMGEBUNGSBEDINGT GESCHEITERT, NICHT code-bedingt**: store.Open-TCP-Dials von frischen Containern auf jimesh-net zu jimesh-postgres:5432 hängen (Probe: TCP-FAIL 5s auf jimesh-net, TCP-OPEN via `--network container:jimesh-postgres`); ai/auth/gateway/store schlagen am 10-Min-Timeout. internal/service scheitert VORBESTEHEND (tests hardcoden localhost, ignorieren DATABASE_URL). Voll-Suite beim Operator nach `make restart-backend` über `make check-backend` prüfbar. |
| vitest run (voll) | **388/389 PASS** — der eine Failer ist der VORHANDENE, in SPRINT-59 dokumentierte `create-access-section.test.ts` (asserted WorkspacesPage.tsx-Quelle; Do-not-touch für diesen Sprint) |
| `npx tsc --noEmit -p tsconfig.app.json` | **474 Fehler = Baseline 477 − 3** (per git-stash-Differenzmessung verifiziert: 0 neue, 3 Alte behoben: ExternalLink/CardContent-Imports + textOf) |
| `npm run check:i18n` | **PASS** (60 Locales, 3021 Keys) |

### Bewusst offen (eigene Tickets)

- DELETE /api/plugin-installations/{id} — Deinstallation hat noch keine Route
  (Upsert-Only); gemeldet im Backlog S140-9.
- linear / github_app / meshsquad bleiben ehrlich nicht-installierbar, bis
  echte Backend-Integration existiert (meshsquad: manifest ingestion,
  SPRINT-RM25; Backlog S140-10).
- Der Wizard fragt weiterhin einen optionalen MCP-URL + API-Key ab; der Key ist
  jetzt real verwertet (Vault → jules-Routen), die mcpUrl wird (wie bisher)
  persistiert aber noch von keinem Backend-Consumer gelesen — ehrlich
  dokumentiert, kein Fake-Feature draus gemacht.

###_OPERATOR-HINWEIS (Mandat 6)

Backend-Änderungen greifen erst nach `make restart-backend`. Danach:
`cd src/backend && go build ./... && go test ./...` (oder `make check-backend`)
— und im UI: Integrations-Tab (/plugins) → Jules → Install; die Installation
erscheint danach im Shelf, unter /plugins/settings UND auf der Workspace-
Settings-Karte als Active.

