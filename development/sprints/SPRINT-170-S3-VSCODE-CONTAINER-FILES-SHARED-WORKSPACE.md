# SPRINT-170 — S3-RENAME, VS-CODE- & CONTAINER-FILES-REITER, PROJEKT-SHARED-WORKSPACE + NOTES/OBSIDIAN-KLÄRUNG

**Status:** 📋 Geplant, NICHT gebaut. **Startbedingung: nach S163- UND S165-Landung** — S163
sitzt auf gateway.go/store, S165 auf section-nav.ts/HierarchySidebar.tsx/locales: exakt die
Dateien, die S170 braucht. Kollision bewusst vermieden, nicht Prioritätsmangel.

**Operator-Order 30.9., verbatim:** "nenn mal files in s3 um und mal nen extra sidebar reiter
für vs code und dann mach nen neuen reiter in der sidebar für files, was dann der alte
filebrowser ist aber halt für container und wenn ein project erstellt wird muss auch immer ein
haupt shared workspace erstellt werden was shalt einfach nur die files von dem project liegen
und halt auch die ganzen utility files für das project und eventuell ne git repo, kann aber
auch einfach nur so ein obsydian deployment sein. können wir das eigentlich als plugin
integrieren oder gibt es da ne opensource alternative?"

## Items

1. **Rename "Files" → "S3"** — der bestehende Ozone/S3-Filebrowser (SPRINT-138
   FILE-BROWSER-ACTIVATION/UPLOAD) heißt ab sofort "S3": section-nav.ts + i18n (60 Locales,
   en+de handgeschrieben, Rest English-Fallback, RM35-Präzedenz) + Tests. Route unverändert.
2. **Neuer Sidebar-Reiter "VS Code"** — code-server ist bereits Deploy-Engine-Bestandteil
   (jimesh-codeserver-<id>-Container, siehe /api/projects/{id}/ports-Doku), hatte bisher keinen
   eigenen Nav-Punkt. Neuer Reiter nach S157-Muster (section-nav 1:1-Spiegel + Regressions-Test).
3. **Neuer Sidebar-Reiter "Files" = Container-Filebrowser** — UX-Muster des alten (S3-)
   Filebrowsers, aber gegen CONTAINER-Filesysteme. Backend: neue Deploy-Engine-Routen über den
   etablierten SSH+docker-exec-Pfad (list/stat/read/write/put/get mit Size-Caps; ehrliche
   Fehler-/Empty-States; Mandat 2 + 6). Deploy-Engine-Muster wie iac-files/S159 (dann kein
   API_DOCS-Konflikt); falls Gateway-Routen nötig: API_DOCS pflegen.
4. **Projekt-Create → IMMER Haupt-Shared-Workspace** — bei JEDEM POST /api/projects wird immer
   ein Haupt-Shared-Workspace fürs Projekt angelegt (Projekt-Dateien + Utility-Files), analog
   platform-internal-Seed (S154). Storage-Design vom Agenten konkretisieren: Ozone/S3-Prefix
   je Projekt (z.B. projects/{id}/shared/) ODER dedizierter Volume-Folder + OPTIONAL Auto-Git-
   Repo. Transaktional mit dem Create (kein "Projekt ohne Workspace"-Zwischenzustand),
   Persistenz-Mandat (Startup purgegt nichts). Mandat 7: keine neue Tabelle, wenn Ableitung
   (Prefix aus project-id) oder Settings reichen.
5. **Notes/Obsidian-Klärung (Antwort auf die Operator-Frage):**
   - **Obsidian selbst ist PROPRITÄR** — kostenlos für Personal Use, aber NICHT open source
     und nicht als legitimer Self-Host-Container deploybar → **nicht als jimesh-Plugin
     integrierbar**. (Wissensstand, keine Live-Recherche — die Search-API dieser Session hat
     keinen Key konfiguriert.)
   - **Open-Source-Alternativen:** **Logseq** (AGPL-3.0) ist der beste Fit — es liest denselben
     einfachen Markdown-Ordner wie Obsidian ("Vault = Folder"), damit kann ein Logseq-
     Deployment denselben Shared-Workspace öffnen. Weitere: Joplin (open source, aber eigenes
     DB-Format), Trilium Notes (AGPL, eigenes Format), Outline/Docmost (Team-Wiki-Klasse).
   - **Already-in-Platform:** code-server (VS Code) ist ohnehin deployt und öffnet denselben
     Ordner direkt — für Utility-Files das natural fit.
   - **Echtes Obsidian-UX ohne Container:** lokales Obsidian (Desktop) gegen einen synchron-
     sierten Vault-Ordner (Syncthing/WebDAV/S3-Mount) — der Vault ist nur ein Folder. Empfeh-
     lung: S170 baut Shared-Workspace + VS-Code- + Files-Reiter; Notes-Deployment als Logseq-
     Launcher (ehrlicher Empty-State, bis Operator es will).

## PHASE / WORK PACKAGES (Plan — 1.10.2026, Doku-Mandat: Plan vor Code)

**Gebaut vom S170-Agenten.** Startbedingung erfüllt: S163 (gateway/meshsquad) und
S165 (section-nav/HierarchySidebar) sind gelandet (`a14c7e00`, `f108dc00` im Log).

**Operator-Order dieser Session (verbatim, harte Grenzen):** "nicht lokal deployen" —
kein `make up`, kein `make restart-backend`, kein `make go-test` (braucht den Stack),
kein Live-Deploy. Verifikation ausschließlich statisch/hermetisch. KEIN Commit
(Standing Mandate: Parent committet). Kein Zugriff auf `deploy/**`, `src/scripts/`,
`.env.example`, `local-stack.sh` (parallel laufender S167-Phase-2-Agent).

### Baseline (VOR jeder Änderung, 1.10.2026 gemessen)

| Prüfung | Ergebnis |
|---|---|
| `make go-build` | Exit 0 |
| `npx tsc -p tsconfig.app.json --noEmit \| grep -c 'error TS'` | **414** |
| `npx vitest run` | **61 Dateien / 493 Tests**, alle grün |
| `node scripts/check-i18n.mjs` | **60 Locales / 3307 Keys** |

### WP1 — Rename "Files" → "S3" (Item 1)

Ziel: der bestehende Ozone/S3-Filebrowser (`/workspaces/files`, SPRINT-138) heißt in
der NAVIGATION "S3". Route unverändert, Seite unverändert (nur der Titel).

- i18n-Key `nav.files` wird zu **`nav.s3`** (Wert überall "S3" — Eigenname,
  sprachunabhängig; RM35-Präzedenz: en+de handgeschrieben, Rest identischer
  englischer Fallback) und `wsFiles.pageTitle` ("Files") wird "S3".
- Neu: **`nav.containerFiles`** = "Files" (de: "Dateien") für den WP3-Reiter.
- Code: `section-nav.ts` + `HierarchySidebar.tsx` (RM35-Dual-Registration).
- **NIE einzeln in 60 Dateien editieren** — EIN Skript schreibt die Keys mechanisch.

Akzeptanzkriterien:
1. `nav.s3` in allen 60 Locales vorhanden, `nav.files` in KEINER mehr.
2. `activeSectionFor('/workspaces/files')` bleibt `nav.workspaces`; Route `/workspaces/files` unverändert.
3. `HierarchySidebar.test.tsx`-Suite grün (S164/S165-Suiten dürfen nicht kaputtgehen); Label-Behauptung 'Files' → 'S3' aktualisiert.
4. `check-i18n` grün; Key-Delta wird ehrlich beziffert.

### WP2 — Sidebar-Reiter "VS Code" (Item 2)

Ziel: code-server hat endlich einen Nav-Punkt.

- Neue Route **`/workspaces/vscode`** → `views/VSCodePage.tsx` (App.tsx-Route + Import).
- Inhalt = ECHTE Daten: `GET /api/projects` → Projekte mit `codeServerPort > 0`;
  Launcher-Button öffnet `appTunnelUrl(id, codeServerPort, nodeHost)` (deploy/tunnel.go).
- Ehrlicher Empty-State (Mandat 2): kein Projekt mit code-server-Port → NUR
  Erklärung, wie es entsteht (Deploy-Dialog, `_code_server`-Framework), kein Fake-Link.
- Mandat 12-Hinweis auf der Seite: code-server-Passwort ist ein One-Time-Wert aus der
  Deploy-Antwort, nie gespeichert; kein unauthentifiziertes UI.
- Nav-Eintrag in `workspaceItems` (section-nav) + `WORKSPACES_MORE_ITEMS` (Sidebar).

Akzeptanzkriterien:
1. Route erreichbar, Nav-Eintrag in BEIDEN Registries (Mandate 14).
2. Seite rendert nur echte `codeServerPort`-Rows; leer = ehrlicher Text, 0 Buttons die ins Leere führen.
3. Reachability-Guard-Test grün.

### WP3 — Sidebar-Reiter "Files" = CONTAINER-Filebrowser (Item 3)

Ziel: der alte Filebrowser-UX-Typ, aber gegen CONTAINER-Dateisysteme über den
etablierten SSH+docker-exec-Pfad der Deploy-Engine (Muster iac-files/S159, damit
kein API_DOCS-Konflikt mit `gateway/files.go` entsteht — das bleibt die S3-Fläche).

**Backend (`internal/deploy/container_files.go`, Registrierung in `deploy.go` —
`gateway.go` wird NICHT angefasst):**

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/projects/{id}/containers` | echte Container-Liste (`ListContainersByProject`) — Target-Selector der Seite |
| GET | `/api/projects/{id}/containers/{cid}/files?path=` | `ls`-Äquivalent über `docker exec` |
| GET | `…/files/stat?path=` | ein Eintrag |
| GET | `…/files/read?path=` | Textinhalt, Cap **1 MiB** |
| POST | `…/files/write` | `{path, content}` JSON, Cap **1 MiB**, `mkdir -p` des Parents |
| POST | `…/files/put?path=` | Binär-Upload roher Body, Cap **5 MiB** |
| GET | `…/files/get?path=` | Download roher Stream, Cap **20 MiB** |

Sicherheits-/Ehrlichkeitsregeln: `cid` strikt validiert (`[A-Za-z0-9_.-]`, ≤128),
Pfade via `shellQuotePath` (gleiche Package-Helfer wie der IaC-Scan), Größen-Caps
als **413 mit ehrlicher Meldung**, nicht-UTF-8-fähige Dateien als **415 → "Download
verwenden"** statt kaputter Anzeige, JEDER Fehler kommt mit dem echten SSH/docker-
stderr, Listen immer `[]` nie `null` (Mandat 15), `entries: []` bei leerem Ordner.

**Frontend:** Route **`/workspaces/container-files`** → `views/ContainerFilesPage.tsx`
(Project- → Container-Selector, Pfad-Breadcrumb, Eintrags-Tabelle, Text-Viewer mit
Speichern, Download, Upload). Ehrliche Empty-/Error-States.

**API_DOCS:** 7 neue Zeilen in der Projects-Sektion (Doku-Mandat 1).

Akzeptanzkriterien:
1. `make go-build` + `make go-vet` Exit 0; DB-freie Unit-Tests (Validierung, Caps,
   Shell-Quoting, Parse) grün OHNE Stack; DB-/SSH-Tests skippen ehrlich.
2. Jede Route in `API_DOCS.md`.
3. Reachability + S164/S165-Suiten grün.

### WP4 — Projekt-Create → IMMER Haupt-Shared-Workspace (Item 4)

Ziel: bei JEDEM `POST /api/projects` entsteht transaktional der eine
owner-lose Shared Workspace (§8.3b) — kein "Projekt ohne Workspace"-Zwischenzustand.

- **Mandat 7:** KEINE neue Tabelle. Die `workspaces`-Tabelle hat bereits
  `workspace_kind='shared'` + den partiellen Unique Index
  `idx_workspaces_project_shared ON workspaces(project_id) WHERE owner_user_id IS NULL`.
  Das ist exakt die Ableitung (1 Shared Workspace je Projekt), keine neue Speicherform.
- Neu in `internal/store`: **`CreateProjectWithSharedWorkspace(...)`** — EINE
  Transaktion für Projekt-INSERT + Workspace-INSERT, Rollback bei Fehlschlag.
  Beide bestehenden `CreateProject`/`CreateProjectOnNode` bleiben unberührt
  (andere Caller), das neue Handle nutzt die kombinierte Funktion.
- `handleProjectCreate` liefert zusätzlich `sharedWorkspace` im Response-Objekt.
- Startup-Purge: KEIN neuer Purge-Code (Persistenz-Mandat 3).
- **Auto-Git-Repo: NICHT gebaut** (keine echte Implementierung) → Offen-Item,
  kein Fake im UI (Mandat 2).

Akzeptanzkriterien:
1. Antwort enthält `sharedWorkspace` mit `workspaceKind:"shared"`.
2. DB-Test (skippt ehrlich ohne Postgres) beweist Projekt+Workspace in EINER Tx.
3. Validierungs-Tests (kein DB nötig) bleiben grün.

### WP5 — Notes/Obsidian-Klärung (Item 5)

- NEUE Route **`/workspaces/notes`** → `views/NotesPage.tsx`, Nav-Eintrag `nav.notes`.
- Inhalt = die Klärung aus dem Sprint-Text als ehrlicher Status:
  **Obsidian ist proprietär → nicht als Self-Host-Container integrierbar**;
  **Logseq (AGPL-3.0)** bzw. SilverBullet (MIT) als Open-Source-Fit;
  code-server (MIT) öffnet denselben Ordner heute schon.
- **Ehrlicher Empty-State, KEIN "läuft"-Claim**: es existiert KEIN
  Notes-Deployment → die Seite zeigt genau das, ohne Launcher-Link, ohne Fake (Mandate 2).

Akzeptanzkriterien:
1. Seite erreichbar über Nav (Mandate 14), 0 tote Links.
2. Text nennt den echten Stand (lizenzlich + deploy-seitig).

### WP6 — Doku

`API_DOCS.md` (7 neue Routen + `sharedWorkspace` im POST-/api/projects), Sprint-File
(Plan oben + Arbeitslog + Verifikationstranskript + Offene Items), `BACKLOG.md`
(S170-Zeile von `[ ] geplant` auf den tatsächlichen Stand).

### Bewusst NICHT im Scope (ehrlich, keine Simulation)

- Auto-Git-Repo beim Projekt-Create (keine Implementierung vorhanden).
- Utility-Container-Bau (code-server + Notes + Claude/n8n als Supervisord-Prozesse,
  Git-Graph-`.vsix`) — Architektur-Direktive des Nachtrags, eigener Build.
- Logseq-/SilverBullet-Deployment und der damit verbundene Launcher-Link.
- Anfassen von `deploy/**`, `src/scripts/`, `.env.example`, `local-stack.sh`,
  `store/node_services.go`, `gateway/node_services.go`, `gateway/gateway.go`.

## Bau-Auftrag (nach Startbedingung)

- Frontend: section-nav.ts + HierarchySidebar.tsx + locales + Tests (S157/S165-Muster;
  ResponsiveShell-Suite von S164 muss grün bleiben).
- Backend: Projekt-Create-Hook (Shared-Workspace-Ensure, transaktional), Store falls nötig,
  Deploy-Engine-Container-Files-Routen, API_DOCS falls Gateway-Flächen entstehen.
- Ehrlichkeit: kein Notes-"läuft"-Claim ohne echtes Deployment; Launcher/Empty-State zuerst.

## Abgrenzung

- Startet erst nach S163 + S165 (Kollision auf gateway/section-nav).
- Single-Container-Bootstrap (SPRINT-160-Nachtrag) soll S170s Shared-Workspace-Muster übernehmen.
- Wave-2/3-Paket; S161-S169 haben Vorfahrt bis sie gelandet sind.

## Nachtrag 30.9. — Operator-Direktive: EIN Utility-Container + Git-Stack

**Operator verbatim:** "vs code server kann dann auch in den utility container installiert
werden, genauso wie die anderen sachen wie claude oder diese obsydian alternative usw, da muss
kein eigener container für jeden scheiss liegen und die git repo muss ja auch nicht überall
liegen und übrigens brauchen wir dann auch gleich ne git implementierung [...] es wäre nice
wenn wir da ein lightweight opensource option finden die auch von der lizenz sich kommerziell
nutzen lässt"

**Architektur-Direktive — EIN langlebiger Utility-Container pro Projekt (kein Tool-Container
pro Dienst):**
- code-server (Coder, MIT) ODER OpenVSCode Server (Gitpod, MIT) als IDE-Kern im Container.
- Notes-App als Prozess drin: SilverBullet (MIT) oder Logseq (AGPL) gegen /workspace/notes.
- OPTIONAL Claude-Code-CLI als globaler npm-Prozess (Anbieter-Tool, Operator bringt den
  API-Key — Lizenz-Hinweis: proprietäres Anthropic-Tool, kein Open Source).
- OPTIONAL n8n als Node-Prozess statt eigenem Container (Lizenz: Fair-Code/Sustainable Use,
  siehe SPRINT-171).
- Prozess-Supervision nach dem bereits vorhandenen Supervisord-Muster (neko/neko:chromium aus
  SPRINT-159 ist der Präzedenzfall im Repo). Shared-Workspace als Mount einmalig im Container.
- Git-Repo ZENTRAL pro Projekt (im Shared-Workspace), nicht pro Tool/überall.

**Git-UI — lightweight + kommerziell nutzbar:**
- **Pick: Git Graph (VS Code Extension, MIT)** — Commit-Graph, Branches, Diff, Cherry-Pick,
  ohne Account-Zwang. Vorinstallation als .vsix beim Container-Bau.
- **Abgelehnt: GitLens** — seit der GitKraken-Übernahme freemium/Account-lastig (Operator
  hatte recht, das zu vermeiden).
- Native VS Code Git-Basics (commit/branch/push/conflicts) sind eh drin und reichen für den
  Alltag; Git Graph liefert die visuelle Historie obendrauf.
- Aus der Parallel-Session-Paste: "Git Brain" als Alternative — **UNVERIFIZIERT** (diese
  Session hat keine Search-Api); nicht verplanen, nur notiert.

**Bewertung der Parallel-Session-Paste (VS Code package.json / Context-Keys / Onboarding-Webview
in der Extension):** wieder IDE-first — NICHT übernommen. Die Preset-/Sichtbarkeits-Steuerung
bleibt Dashboard-getrieben (SPRINT-171 + erweiterte node_services-Registry); die IDE im
Utility-Container ist Ziel, nicht Steuerzentrale. Übernommen: Utility-Container-Architektur,
Git Graph, Notes/Claude als Prozesse.
