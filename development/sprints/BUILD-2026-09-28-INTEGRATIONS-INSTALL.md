# BUILD-2026-09-28 — INTEGRATIONS-INSTALL + Overview-Fusion (2 Teile)

**Teil 1:** Operator-Report *"warum lassen sich in der integrations seite keine
integrations installieren — aber auch bei der workspace-seite bei integrations
nicht?"* — bestätigt durch den Prompts-vs-Delivery-Audit
(PROMPTS-VS-DELIVERY-AUDIT-2026-09-28.md): /api/plugin-installations war ein
**No-Persistence-Echo**.

**Teil 2:** Operator-Auftrag 28.9. ~05:30, wörtlich: *"kannst du bitte diese
overview seite von integrations und plugins bitte fusionieren?"* — die
Integrations- und die Plugins-Übersichtsseite zu EINER kanonischen Fläche fusioniert.

**WICHTIG für den Parent:** Teil 1 ist NICHT verloren — es lag (und liegt) vollständig
im Working Tree von /home/ji/projects/jimesh. Beweis (jederzeit reproduzierbar):
`git diff --stat src/backend/internal/gateway/plugins.go` → +333 Zeilen;
`git diff --stat src/backend/internal/store/store.go src/backend/internal/domain/schema/plugins.go src/backend/internal/gateway/jules.go` → +74 Zeilen;
`ls src/backend/internal/store/plugin_installations.go src/backend/internal/gateway/plugins_test.go` → vorhanden;
`grep -c installable src/backend/internal/gateway/plugins.go` → 9 Treffer;
`head -20 src/backend/internal/gateway/plugins.go` → SPRINT-140-Kommentar mit ECHTER Persistenz.
Nichts committed (Vorgabe). Falls dein Check zu einem anderen Zeitpunkt/Checkout lief:
der Stand ist jetzt verifiziert da.

---

## TEIL 1 — Root Cause + Per-Plugin-Tabelle

### Root Cause (verifiziert am Code, nicht geraten)

`src/backend/internal/gateway/plugins.go` (Stand vor dem Fix):

- **POST /api/plugin-installations** (Zeilen 69-77): decodierte den Body, setzte
  `req.Activated = true`, echote `{installation, success:true}` — **kein INSERT,
  kein Store-Aufruf, nichts in PostgreSQL** (Mandat-2-Erbsünde).
- **GET /api/plugin-installations** (Zeilen 65-68): hardcoded `{installations: []}`.

Folge auf BEIDEN Operator-Flächen: Wizard/Karte "erfolgreichen", nichts existiert —
Shelf leer, "N active"=0, Install-Button flippt nie, /plugins/settings ewig leer,
Workspace-Karte erreicht "Active" nie (bekam das installation-Prop zusätzlich NIE
und trug einen inline-hardcodeden Jules-Eintrag).

Sekundärfunde (mitgefixt): der Wizard-Jules-Key wurde von niemandem konsumiert
(jules.go las nur env/Header; der Notice-Text behauptete "in Vault" ohne Code-Pfad);
ProjectDetailPage-Integrations-Tab hatte einen Configure-Button ohne onClick.

### Per-Plugin Root-Cause-Tabelle (works / why not / what I did)

| Plugin | Backend-Routen real? | Vorher für den Operator | Warum (exakt) | Was ich getan habe |
|---|---|---|---|---|
| **jules** | JA — 4 (`/api/plugins/jules/sources|sessions|activities|events`, gateway.go:261-264) | Install "erging", erscheint nie; Jules-Funktionen brauchten trotzdem JULES_API_KEY env | POST war Echo → keine Row; jules.go las den Key nur aus env/Header, nie aus dem Vault | **Jetzt ECHT installierbar**: POST persistiert (Upsert pro (plugin,scope)); der Wizard-apiKey wird in vault_secrets (AES-GCM-256, projekt-scoped, audit-logged) gespeichert; julesInstalledKey() liest ihn als dritte Key-Tier (env → Header → Vault) → Sources/Sessions laufen nach der Installation OHNE env-Config; alle Flächen zeigen die echte Row (Shelf/Settings/Karte) |
| **linear** | NEIN — keine | Install-Button, der nichts bedeuten konnte | wrapperApiBase zeigt auf die echte Linear-API, aber KEIN Gateway-Code dient/proxyt/konsumiert eine "linear"-Installation — eine Row wäre unbelebter Ballast (die mcpserver-Tools, die linear/github/dsh referenzieren, sind ein SEPARATER bekannter Bug, bewusst NICHT hier angefasst) | **Ehrlich nicht installierbar**: Katalogsignal installable:false (aus pluginBackendRoutes, dem Spiegel der echten Registrationen); UI zeigt "Noch keine Backend-Integration" statt des Buttons; POST → 409 + Begründung (kein Fake-Row) |
| **github_app** | NEIN — keine | Install-Button, der nichts bedeuten konnte | kein Webhook-Receiver, kein App-Auth-Flow im Backend | dito linear — Badge statt Button, 409 auf POST (Backlog S140-10) |
| **meshsquad** | NEIN — keine in JiMesh | Install-Button, der nichts bedeuten konnte | crew-api ist ein SEPARAT deployter Stack (127.0.0.1:8104); JiMesh hat weder Manifest-Ingestion noch meshsquad-Routen (SPRINT-RM25 offen) | dito linear — ehrliches installable:false mit Begründung; wird installierbar, sobald die manifest ingestion liefert |

### Teil 1 — was genau geändert wurde

**Backend:**
- `internal/store/plugin_installations.go` (NEU): Tabelle plugin_installations
  (TEXT-PK, UNIQUE (plugin_id, scope_type, scope_id), BIGINT-ms) + Upsert (Read-Back)
  + List — Store-Idiom wie project_roles/team_bindings (MANDATES §8: Ensure-Pattern,
  idempotent in migrate() verankert, kein Purge).
- `internal/store/store.go`: ein migrate()-Hook (EnsurePluginInstallationsTable).
- `internal/domain/schema/plugins.go`: Feld `Installable` (json installable).
- `internal/gateway/plugins.go` (komplett): ehrliche Validierung (404 unbekanntes
  Plugin / 409 installable=false / 400 scopeType+authMode+config-JSON / 404
  Scope-Row fehlt via GetWorkspace+GetProject), echte Persistenz, Secret-Vaulting
  vor dem INSERT (Mandat 9: key|token|secret|password-Heuristic = dieselbe wie das
  UI-Masking; Row + ALLE GETs tragen nur secretRef, nie Klartext), Katalog mit
  installable aus pluginBackendRoutes.
- `internal/gateway/jules.go`: julesAPIKey → Server-Methode, 3 Tiers
  (env → X-Goog-Api-Key → s.julesInstalledKey(): neueste aktivierte jules-Installation
  mit secretRef → Vault-Lookup; Gateway liest selbst = JIT, Mandat 9) + ehrliche Notice-Texte.
- `internal/gateway/plugins_test.go` (NEU): 5 Tests.

**Frontend (Teil 1):**
- types/domain/plugins.ts: installable; PluginCatalogPage.tsx: ehrlicher
  Nicht-Backend-Badge statt totem Install-Button (Browser-Trigger unangetastet);
  ProjectDetailPage.tsx NUR Integrations-Tab (toter Configure-Button → echter Zustand
  aus echten Installation-Rows); WorkspaceSettingsPage.tsx + PluginActivationCard.tsx:
  echter Katalog statt inline-Hardcode, echtes installation-Prop (Active erreichbar),
  POST mit Content-Type + Invalidation; PluginInstallWizardDialog.tsx nur Kommentar.

---

## TEIL 2 — Overview-Fusion (Operator-Auftrag wörtlich)

### Karte vor der Fusion (verifiziert am Code)

| Fläche | Route | Nav-Label | Zeigte | Einzigartiger Inhalt |
|---|---|---|---|---|
| AgentsPage | /agents | nav.agents = "Integrations" (Top-Nav, Sidebar, Command-Palette) | PageHeader + ActiveDeploymentsSection + SubagentsPanel | NUR SubagentsPanel (Live-Sessions + Guarded-Approval-Queue, GET /api/subagents + /api/subagents/guarded) |
| PluginCatalogPage | /plugins | nav.pluginCatalog = "Plugins" | Browser-Trigger (SPRINT-59), ActiveDeploymentsSection, Installed-Shelf, Katalog+Wizard | alles Plugins-Real |
| PluginSettingsPage | /plugins/settings | nav.pluginSettings | installierte Rows verwalten | bleibt eigenständig (Management, keine Overview-Duplikation) |
| ProjectDetailPage Integrations-Tab | per Projekt | — | Katalog je Projekt | bleibt per-Projekt (Vorgabe, nicht Teil der Fusion) |

Die Duplikation: ActiveDeploymentsSection lief auf BEIDEN Overview-Seiten — der
Operator sah zwei Übersichten, eine davon fast ohne Eigenleben.

### Fusionsergebnis (gebaut + verifiziert)

- **Kanonisch: /plugins**, relabelt zu **"Integrations & Plugins"**
  (plugins.title/plugins.subtitle/nav.pluginCatalog — Werte-Update in en+de,
  EN-Fallback in 58 weiteren; scripts/update-sprint140-merged-page-i18n.cjs).
- SubagentsPanel (der EINZIGE echte Eigeninhalt von /agents) mountet auf /plugins
  direkt nach ActiveDeploymentsSection.
- **/agents → Redirect auf /plugins** (App.tsx — dasselbe Muster wie der
  bestehende /subagents → /subagents/approvals Redirect): jeder Nav-/Sidebar-/
  Palette-Link bleibt auflösbar, KEIN toter Link — auch bevor die Nav-Edits landen.
- **AgentsPage.tsx gelöscht** (nach dem Redirect unerreichbar — Mandat 14).
- Command-Palette (command-palette.tsx): EIN Eintrag p-plugins → go('/plugins'),
  Label nav.pluginCatalog, Keywords gemerged (agents claude codex … subagents install
  catalog) — alter Such-Intent findet die gemergte Fläche.
- /agents/sessions/:sessionId (Detail-Route) bleibt unangetastet.

### EXAKTE Zeilen-Edits für den PARENT (section-nav.ts + HierarchySidebar.tsx
liegen beim Onboarding-Agent — NICHT von mir angefasst; NACH deren Landung anwenden):

1. `src/frontend/src/lib/section-nav.ts` **Zeile 141 LÖSCHEN**:
   `  { to: '/agents', labelKey: 'nav.agents', icon: Bot },`
2. `src/frontend/src/lib/section-nav.ts` **Zeile 74**:
   ALT: `export const PROJECT_BASES = ['/projects', '/agents', '/chat', '/workspaces', '/subagents', '/plugins', '/onboarding']`
   NEU: `export const PROJECT_BASES = ['/projects', '/chat', '/workspaces', '/subagents', '/plugins', '/onboarding']`
3. `src/frontend/src/components/sidebar/HierarchySidebar.tsx` **Zeile 246 LÖSCHEN**
   (`  { to: '/agents', labelKey: 'nav.agents', icon: Bot },`) und den Kommentar
   darüber "6 links remain" → "5 links remain".
4. `src/frontend/src/lib/section-nav.test.ts` **Zeile 34**:
   ALT: `    expect(activeSectionFor('/agents')?.labelKey).toBe('nav.workspaces')`
   NEU (oder ganz löschen): `    expect(activeSectionFor('/agents')).toBeNull()`
   **KORREKTUR 28.9. nachts:** mein ursprünglicher Vorschlag `.toBeUndefined()` war
   subtil falsch — activeSectionFor liefert für Nicht-Mitglieder `null` zurück
   (der Nachbar-Test "returns null outside any section" beweist es). Der Parent
   hat die Nav-Edits 1-4 bereits live angewendet; die aufgebrochene Test-Zeile
   habe ich selbst auf `.toBeNull()` gerichtet (section-nav.test.ts stand nicht
   unter dem Tabu), und der Parent entfernte parallel den ungenutzt gewordenen
   `Bot`-Import aus section-nav.ts. Stand danach: tsc 474, vitest FULL 411/411.
   — mit Edit 2 ist /agents keine Projects-Mitgliederroute mehr (der Redirect führt
   ohnehin nach /plugins, das Mitglied bleibt).

Die Nav-Labels brauchen KEINE weiteren Edits: nav.pluginCatalog trägt bereits
"Integrations & Plugins" (Werte-Update in allen 60 Locales von mir).

---

## Verifikation — jeder Check tatsächlich gelaufen

| Check | Befehl | Ergebnis |
|---|---|---|
| Backend kompiliert | make go-build (docker golang:latest, kein Host-Go) | PASS (exit 0) |
| Backend vet | go vet ./... (Container) | PASS (exit 0) |
| Backend-Tests (geänderte Pakete) | go test -p 1 -count=1 ./internal/gateway ./internal/store gegen throwaway jimesh_test (netns-Route) | PASS (ok gateway 2.158s, ok store 1.796s) inkl. aller 5 neuen plugins-Tests (Persistenz, Vault, Secret-Stripping, Upsert, 404er, Katalog-Signal) |
| Backend-Tests (volle Suite) | go test ./... (Makefile-Pattern) | UMGEBUNGSBEDINGT gescheitert: frische Container auf jimesh-net erreichen jimesh-postgres:5432 nicht (TCP still gedroppt — Probe: 5s-Timeout auf jimesh-net; offen via --network container:jimesh-postgres, daher die netns-Route). internal/service scheitert VORBESTEHEND (hardcoded localhost, ignoriert DATABASE_URL). Operator: make restart-backend + make check-backend. |
| Frontend targeted | npx vitest run src/views/PluginCatalogPage.test.tsx src/components/workspaces/PluginActivationCard.test.tsx | 9/9 PASS (5 Katalog inkl. Merge-Anchor + Flow, 4 Karte) |
| Frontend voll (Finalstand 28.9. nachts) | npx vitest run | **411/411 PASS** (46 Dateien) — der früher dokumentierte create-access-section-Failer wurde inzwischen von einem Parallel-Agent behoben; auch mein Nav-Test-Fix (toBeNull) ist drin |
| tsc-Baseline | npx tsc --noEmit -p tsconfig.app.json → grep -c 'error TS' | 474 ≤ 477 (−3; per stash-Differenzmessung verifiziert: 0 neue) |
| i18n | npm run check:i18n | PASS (60 Locales, 3058 Keys) |

## Teil 2 geänderte Dateien (zusätzlich zu Teil 1)

- `src/frontend/src/App.tsx`: /agents → Navigate to /plugins; AgentsPage-Import weg.
- `src/frontend/src/views/PluginCatalogPage.tsx`: + SubagentsPanel (Merge-Sektion).
- `src/frontend/src/views/AgentsPage.tsx`: GELÖSCHT.
- `src/frontend/src/components/command-palette.tsx`: p-agents → p-plugins → /plugins.
- 60 Locale-Dateien (Werte: plugins.title/plugins.subtitle/nav.pluginCatalog) +
  `scripts/update-sprint140-merged-page-i18n.cjs`.
- `src/frontend/src/views/PluginCatalogPage.test.tsx`: Subagents-Wire-Stubs + Merge-Test.
- Docs: SPRINT-140-File (PART 2), BACKLOG (S140-11..13), dieser Report.

## Offen / bewusst nicht getan (ehrlich)

- Nav-Aufräumung (section-nav.ts/HierarchySidebar.tsx/section-nav.test.ts) — EXAKTE
  Edits oben, beim Parent nach Landung des Onboarding-Agents.
- DELETE /api/plugin-installations/{id} (Deinstallation) — Backlog S140-9.
- linear/github_app/meshsquad installierbar erst mit echter Backend-Integration
  (Backlog S140-10); mcpserver-Referenzen auf linear/github/dsh = separater Bug,
  bewusst NICHT angefasst.
- Kein make restart-backend + Live-curl (Live-System des Operators — Befehle sind
  im Sprint-File; Restart steht in seiner Hand, Mandat 6).

## Was der Operator jetzt sieht

1. `make restart-backend` → Backend persistiert Installationen wirklich.
2. Nav "Integrations" (alt /agents) landet auf der EINEN Fläche **Integrations &
   Plugins** (/plugins): Katalog + Install-Wizard, Installed-Shelf, Active
   Deployments UND die Subagent-Sessions/Approval-Queue — alles auf einer Seite.
3. Jules installieren (mit API-Key) → Row erscheint überall; Jules-Sources/Sessions
   laufen mit dem vaulted Key. linear/github_app/meshsquad zeigen ehrlich
   "Noch keine Backend-Integration".
