# SPRINT-186 — Dogfooding: Workspace-Trilogie + Linear-Proxy

**Status:** 📋 Plan, Code noch nicht angefasst (Mandat 4: Ausführungsplan VOR dem Code)
**Start:** 2026-10-04
**Operator-Entscheidung (diese Session):**
1. **PM-Weg = A: Linear-Proxy** gegen `api.linear.app/graphql` + Issues-View — der `installable=false`-Eintrag dreht über `plugins.go:135` von selbst auf `true`, sobald echte Routen existieren.
2. Sprint-Nummer **186** (185 ist mit Fabric/gVisor belegt).
3. Reihenfolge wie unten, **Workspace-Trilogie zuerst** (Abhängigkeit), dann Linear.
4. W1→W9 bleiben gestoppt bis Operator Sprint-Nummer/Wellenreihenfolge/gh-Weg bestätigt.

---

## §0 Warum — Dogfooding-Bestand (Stand 4.10., verifiziert)

Ziel „JiMesh im ersten eigenen Projekt entwickeln". Inventar:

| Bereich | Ist | Lücke |
|---|---|---|
| PM (Linear-artig) | Katalogeintrag `plugins.go:62` `"linear": {}`, `installable=false` | **alles** — 0 Routen, 0 Tabellen, 0 Views. 2 tote MCP-Tools (`mcpserver/tools_linear.go:24/:53`) rufen Routen, die nie registriert sind |
| Project Workspace: Shared | `workspaces`-Tabelle + partieller Unique Index, `POST /api/workspaces` legt Row an | **Projekt-Create legt KEINEN Workspace an** (`projects_ssh.go:3118` nur `INSERT projects`) → „Projekt ohne Workspace"-Zwischenzustand, Nutzer klickt sich den manuell an |
| Workspace: Files | 3 Routen `files.go:103-105`, Ozone-S3, AES-DEK in Vault | **kein Schreiben vorhandener Dateien** (`MethodPut` in `files.go` = 0) |
| Markdown-Editing | nur Lese-Renderer `components/markdown.tsx`, 1 Kunde | **kein Editor**, keine Datei-Inhalts-Save |
| Git | Deploy-Engine: Clone + Worktrees; Utility-Container: Git Graph | kein Repo im Shared-Workspace, kein Provider/Webhook |

**Fund 4.10. (behoben, `43919af4`):** Update-UI zeigte auf `github.com/tashfeenahmed/freellmapi` — inkl. einer Update-Anleitung, die `git merge` aus dem **fremden** Repo befahl.

---

## WP1 — Shared-Workspace bei jedem Projekt-Create

**Quelle:** `SPRINT-170-S3-…md:28-34` (Item 4) und WP4 `:144-165`. Backlog-Zeile `BACKLOG.md:290` bleibt offen, bis dieses WP steht.

### Was
Neue Store-Funktion **`CreateProjectWithSharedWorkspace(...)`** in `internal/store` — **EINE Transaktion**: Projekt-INSERT + Workspace-INSERT, Rollback bei Fehlschlag.

### Konkret
- `deploy/projects_ssh.go:3114-3119` → neue Funktion aufrufen statt `CreateProject(id, name, "stopped")`.
- Response um **`sharedWorkspace`** ergänzen (`projectRowJSON` bleibt unberührt; `NewProjectDialog.tsx:61-65` ignoriert zusätzliche Keys → kompatibel).
- Workspace: `workspace_kind='shared'`, `owner_user_id NULL`, `status='created'` — bestehendes Muster `store/workspaces.go:172-196`.
- **Idempotenz:** vorher `GetWorkspaceByOwner(id, "")` (`store/workspaces.go:242-262`) prüfen — der partielle Unique Index `idx_workspaces_project_shared` (`store/workspaces.go:86-89`) macht eine zweite Shared-Row zum Fehler.
- **Mandat 7:** keine neue Tabelle. `workspace_kind='shared'` + Index existieren bereits.

### Bewusst NICHT (Recherche-Ergebnis, je belegt)
- ❌ **`provisionWorkspace` nicht aufrufen** — frisches Projekt hat `workspace_path=''` → 400 (`workspaces_provision.go:183-190`); Remote-Node ohne Credentials → 400 (`:229-251`); `EnsureUserWorktree` verlangt Repo mit ≥1 Commit → 422 (`deploy/workspaces.go:150-156`). Die SPRINT-170-Pläne legen Wert auf **Row-only**, weil „kein SSH, kein git, kein Node-Kontakt".
- ❌ **`workspaceFilesStore` nicht anrufen** — Bucket-Ensure ist lazy pro Server (`files.go:308-323`); Triggerung erbt einen Netzwerk-Roundtrip + 503-Pfad wenn Ozone fehlt (`files.go:328-333`).
- ❌ **kein Container-Start** — passiert nur in `executeDeploy` (`deploy/projects_ssh.go:1058`).
- ✅ **kein neuer Purge-Code** beim Startup.
- ⚠️ **Tx-Regel:** `tx.Exec` muss `toPostgresSQL` selbst anwenden (`store.go:82-106` schreibt `?`→`$n` nur im `exec/query`-Wrapper). `CreateWorkspace` ruft intern `EnsureWorkspacesTable` auf (`workspaces.go:163`) — ob das in der Tx erlaubt ist, ist eine **Entscheidung im Code** (meist: Tabelle vorher außerhalb der Tx sicherstellen).

### Acceptance
- Antwort enthält `sharedWorkspace.workspaceKind == "shared"`.
- DB-Test beweist: Projekt + Workspace in **einer** Tx, Rollback hinterlässt beides nicht.
- Bestehende `CreateProject`/`CreateProjectOnNode` unverändert; `projects_create_test.go:40/:96/:195` grün.
- Löschen eines Projekts räumt Workspace-Rows ab — existiert bereits (`projects_ssh.go:3234-3248`).

---

## WP2 — Datei-Save (PUT)

### Was
`PUT /api/workspaces/{id}/files/{filename}` — Inhalt einer bestehenden Datei überschreiben.

### Konkret
- **Switch erweitern** in `handleWorkspaceFileGetOrDelete`, `files.go:734-741` (heute `case GET` / `case DELETE`) → `case http.MethodPut:` → neue `putWorkspaceFile`. Das ist die vorhandene Konvention (bare Pattern + Handler-seitige Methodprüfung).
- ⚠️ **Pflicht-Änderung, sonst 403 vor dem Handler:** `policy.isWorkspaceFilesMutation` (`policy.go:233-244`) erkennt heute nur `POST …/upload` und `DELETE …/{name}`. Ein `PUT` fällt durch auf `"/api/workspaces"` (`policy.go:120`) → Admin-Gate (`src/backend/internal/auth/auth.go:984`) → Owner bekommt 403. Ergänzen: `method == "PUT" && len(parts) == 3`.
- **Ende-zu-Ende verschlüsselt bleiben** (Mandat, jedes Objekt ist `.jenc`, `files.go:94`): `filecrypto.GenerateDEK()` → `backend.NewWriter(ctx, workspaceFileKey(ws,name))` → `filecrypto.NewEncryptWriter` → `io.Copy` + `Close`. Ein Plaintext-PUT würde `serveWorkspaceFile` (`files.go:791-796`) brechen.
- **Vault-Rollback:** `CreateVaultSecret` → Fallback `UpdateVaultSecret` → bei Fehlschlag `backend.Delete(ctx,key)` (`files.go:597-608`). Regel dort: *nothing stored beats stored-but-unreadable*. Danach `VaultAudit`.
- Body-Cap: `http.MaxBytesReader` (Muster `files.go:501`), 413 bei Überschreitung.
- `sanitizeWorkspaceFileName` (`files.go:388-414`) + `vaultFileKeyName` (`:365-376`) → 400.
- Fehler-Shape: `httpx.ErrorJSON` (`{"error":{"message":…}}`), Erfolg via `httpx.WriteJSON`.
- **Dokumentation:** `docs/API_DOCS.md:959` + Routentabelle `:963-966` sagen „Four routes" — mitputzen.

### Acceptance
- Owner darf PUT, Fremder 403 (Access-Matrix `files.go:422-448` unverändert).
- Roundtrip: Upload → PUT → GET liefert den neuen Inhalt; Objekt ist `.jenc`.
- Vault-Fehlschlag → Objekt weg (Rollback greift).
- Tests am vorhandenen Harness: `files_test.go` `newWorkspaceFilesTestServer` / `memFileBackend` / `filesTestRequest`.
- Policy-Split-Test im Stil von `workspaces_lifecycle_test.go:318-340`.

---

## WP3 — Markdown-Editor (Frontend)

### Was
In `FileBrowser` (heute nur Download + Delete, `FileBrowser.tsx:517-544`) eine Bearbeiten-Aktion für Text-/Markdown-Dateien: **Editor + Live-Vorschau**.

### Konkret
- **Keine neue Dependency.** `react-markdown` + `remark-gfm` sind da, Renderer `components/markdown.tsx` auch. Ein `<textarea>` + bestehende `Markdown`-Vorschau reicht.
- **Lesen:** vorhandene `GET …/files/{filename}` nutzen — `serveWorkspaceFile` liefert bereits entschlüsselte Bytes. ⚠️ `apiFetch` (`api.ts:196-204`) wirft bei Nicht-JSON-200 einen Fehler → **Plain `fetch`** wie `downloadWorkspaceFile` (`FileBrowser.tsx:182-209`), dann `.text()`.
- **Schreiben:** `apiFetch(path, {method:'PUT'})` → WP2.
- Speicher-Button mit Lade-/Fehler-Zustand; `['workspace-files', id]` invalidieren.
- ⚠️ **i18n:** neue Keys müssen in **60 Locale-Dateien** (`src/frontend/src/i18n/locales/*.json`) — `check-i18n.mjs:52-58` erzwingt Parität, sonst fällt `npm test`.
- Test-Vorbild: `FileBrowser.test.tsx` (per-URL `fetch`-Stub `:51-74`, echte Komponente mit `QueryClientProvider`+`I18nProvider` `:83-99`, `waitForText`-Helper `:101-108`).

### Acceptance
- `.md` öffnen → bearbeiten → speichern → Vorschau aktualisiert; Download zeigt neuen Inhalt.
- Nicht-Textdateien bekommen keine Edit-Aktion.
- `npm run lint` + `npm run test` grün (inkl. `check:i18n`).

---

## WP4 — Linear-Proxy

### Minimaler Flip-Pfad
1. **`gateway/linear.go` neu**, Modell `gateway/jules.go`.
   - `mux.HandleFunc("GET /api/plugins/linear/issues", …)` + `mux.HandleFunc("POST /api/plugins/linear/issues", …)` in `gateway/gateway.go:365-384`.
   - `plugins.go:62` → `"linear": {die zwei Routen}`, Kommentar `:58-61` umschreiben. **`Installable` dreht automatisch** über `plugins.go:135`.
   - ⚠️ `plugins_test.go:91` erwartet `"linear": false` → muss auf `true`.
2. **Key:** `julesInstalledKey`-Muster kopieren (`jules.go:70-97`) — Plugin-Id `"linear"`, Config-Key `apiKey`, Team-Key `teamKey` (`plugins.go:107`). Gateway liest den Secret, Wert kreuzt nie eine Response (`jules.go:48-54`).
3. **Honeste Leerantwort:** kein Key → **200 + `notice`**, keine erfundene Reihe (`jules.go:138-144`).
4. **Outbound-Muster:** `context.WithTimeout` + Fehlermapping `networks.go:72-88` (nicht konfiguriert → 503, unreachable → 502), Body-Cap `io.LimitReader`, **Response sanitisiert neu mappen** wie `ops_endpoints.go:198-212` (Upstream-Body nie durchreichen).

### MCP — werden die 2 toten Tools funktional?
Nur **teilweise**, zwei Hürden (beide adressiert):
- **Auth:** `GatewayClient` sendet `Authorization: Bearer jimesh-ck-…` (`mcpserver/client.go:128`). Der Service-Key-Accept-List für `/api/*` ist eine **explizite Pfadliste** (`src/backend/internal/auth/auth.go:886-892`); `/api/plugins/*` fehlt → 401 (`src/backend/internal/auth/auth.go:915`). 🔴 **Zuerst verifizieren, ob das die existierenden jules-MCP-Tools auch schon trifft** — wenn ja, ist das ein separater, allgemeinerer Fix.
- **Shape:** `GET …/issues` sendet **keine Query-Parameter** (`tools_linear.go:24` — `team_id` wird verworfen) und Linear hat keinen REST-GET → Handler muss die GraphQL-Query **selbst bauen**. `POST` sendet `{"title","description"}` (`tools_linear.go:53-56`) → muss zu `issueCreate`-Mutation übersetzt werden (`teamId` aus Install-Config). Kein transparentes Byte-Passthrough.

### Frontend-Issues-View
- Route `App.tsx:624-625` (neben `/plugins`), Nav `lib/section-nav.ts:422-423`.
- Daten `useQuery` + `apiFetch` (Muster `PluginCatalogPage.tsx:60-79`). **Kein GraphQL-Client im Frontend** (in `package.json` 0 Treffer) — GraphQL bleibt serverseitig, Frontend macht POST.
- Panel-Vorbild: `JulesSessionsWidget` (`:26-47`) neben `PluginActivationCard` in `WorkspaceSettingsPage.tsx:246-283`.
- ⚠️ **i18n in 60 Locales** (s.o.).
- ⚠️ Werdend-veraltete Frontend-Fixtures: `PluginCatalogPage.test.tsx:49-55`, `PluginActivationCard.test.tsx:30-37` haben `linear: installable:false`.

### Acceptance
- `/api/plugins` meldet `installable:true`; Install-Button erscheint, `POST /api/plugin-installations` akzeptiert (Gate `plugins.go:244-250`).
- Ohne Key: Issues-View zeigt ehrlichen Leerzustand, kein Fake.
- Mit Key: Liste + Anlegen laufen gegen Linear; kein Secret in irgendeiner Response.
- `plugins_test.go` grün.

---

## WP5 — Git-in-Workspace (Defer)

Shared-Workspace klonen (Deploy-Engine kann Clone/Worktrees schon, `projects_ssh.go:1848`), Git Graph läuft im Utility-Container (S170-3 `[x]`). **Kommt nach WP1-4** — braucht WP1, sonst gibt es keinen Shared-Workspace zum Klonen. Eigenes Backlog-Item, eigene Acceptance.

**Auto-Git-Repo beim Projekt-Create bleibt explizit NICHT gebaut** (`SPRINT-170-S3:189`).

---

## §6 — Zugriffsmodell Shared-Workspace (Operator-Entscheidung 6.10.2026)

**Anlass:** zu WP1 — wer darf in den gerade gebauten Shared-Workspace, und bräuchten die
Workspace-Container dafür eigene OS-User.

**Operator (6.10., verbatim):**

> „user zu erstellen in den container ist bullshit für jetzt. lass uns das wirklich so machen:
> entweder hat der halt write, dann hat er ne shell und kann da sachen direkt deployen und
> direkt auf die project settings zugreifen in dem workspace, oder er hat es halt nicht, dann
> hat er halt seinen eigenen workspace der separiert ist"

### Das Modell ist BINÄR — es gibt (für jetzt) keinen Read-Only-Zustand

| | Zugang zum Shared-Workspace | Konsequenz |
|---|---|---|
| **hat er** | voller Write-Zugang | Shell + Deploy direkt im Workspace + Project Settings |
| **hat er nicht** | gar keinen | nutzt seinen **eigenen, separierten Workspace** |

**Verworfen für jetzt:** ❌ eigene OS-User im Container · ❌ Read-Only-Terminal / `:ro`-Mount ·
❌ „Hauptworkspace default read-only für alle bis auf Admins" — **diese Idee setzt OS-User voraus**
und ist deshalb zusammen damit **vertagt, nicht vergessen** (s. u. „Warum").

### Warum Read-Only ohne OS-User nicht geht (Belege, Stand 6.10.)

Es gibt schlicht kein Primitive auf **User**-Ebene — alles hängt eine Stufe höher:

| Primitive | Scope | Fundstelle |
|---|---|---|
| VLAN / macvlan | **Projekt** | `project_vlans.vlan_id UNIQUE`; `vlanEnabled requires networkMode isolated` + `single-workspace framework deploy` (`deploy/projects_ssh.go:1600-1604`) |
| Workspace-Routen | **Workspace** | `store/workspace_routes.go` (`workspace_id → ownerSub`) |
| Container-Mounts | **Container** | ein Mount-Strom pro Container, nicht pro Nutzer |
| Exec-User | **Image** | `createWorkspaceExec` setzt **kein** `User:` → läuft als Image-Default-User (`gateway/terminal.go:356-364`) |

Zwei User im selben Workspace teilen sich Segment, Mount und UID → nur die **UID selbst** kann
Schreibrechte verweigern. Ohne eigene User gibt es nur die Binär-Schwelle „Shell oder keine".

### ⚠️ Das Modell ist noch NICHT überall so gebaut — drei Gates, zwei Membership-Wahrheiten

| Surface | Gate heute | Fundstelle |
|---|---|---|
| Workspace-Terminal · Members-API · Provision | owner **OR `workspace_members`** OR admin (fail closed) | `gateway/terminal.go workspaceAccessAllowed` |
| Workspace-Files **GET/List** | operator \| admin \| owner **OR `project_roles`-Grant** — `workspace_members` wird **nicht** gefragt | `gateway/files.go:45-63` |
| Workspace-Files **upload/DELETE** | via OPA **admin-only** (`policy.IsAdminMutation`) — Owner-Exemption in `policy.go` noch offen | `files.go:55-61` |
| Projekt-Terminal · Utility-IDE · Vault · Secrets · Plugins · MeshSquad | `security.VaultProjectDenial` = operator \| admin \| (`jimesh-dev` + **`project_roles`**) | `security/vault.go:199`, `project_terminal.go:162` |

**Das ist der Widerspruch, den das Binärmodell auflösen muss:**

- ein `workspace_members`-Grant reicht heute **für die Shell, aber nicht für die Dateien**;
- ein `project_roles`-Grant reicht **für die Dateien, aber nicht für die Shell**;
- Upload/DELETE sind sogar **striker als die Shell** (admin-only, obwohl ein Member eine Shell kriegt);
- `workspace_members.role ∈ {viewer, collaborator}` ist persistiert (CHECK), wird aber **nie
  ausgewertet** — `IsWorkspaceMemberByIdentity` liefert `bool`, `WorkspaceMemberCollaborator`
  kommt außerhalb seiner Definitionsdatei **nullmal** vor. „viewer" ist also heute nur eine
  tote Spalte.
- Dazu vier unverdrahtete Rollensysteme: Keycloak `admin|operator|viewer` · `workspace_members`
  `viewer|collaborator` · `project_roles` `admin|manager|developer|sub_agent` · Realm `jimesh-dev`.

### Konsequenz für WP1–WP3 (Acceptance-Erweiterung)

- **Ein Gate statt drei:** Vorschlag `sharedWorkspaceWriteAllowed()` (owner OR member OR admin,
  fail closed), das **WP2 PUT**, **WP3 Editor** und die Write-Flächen (upload/DELETE) durchlaufen
  lassen. Niemals niedrigere Schwelle als die benachbarte Read-Fläche.
- **WP2/WP3 dürfen keinen eigenen Zugangsrahmen erfinden** — die Datei, die ein Member schreibt,
  muss dieselbe Schwelle haben wie die Shell, aus der er sie deployt.
- Solange `workspace_members` und `project_roles` nicht zusammengeführt sind: **eine der beiden
  Quellen muss zur Wahrheit erklärt werden**, sonst bleibt „hat Zugang" surfaces-abhängig.
- OS-User im Container: **eigenes, späteres WP** — erst dann wird Read-Only überhaupt definierbar
  (und dann auch für Terminals/Shells, nicht nur für Container und Daten).

---

## §7 Reihenfolge & Abhängigkeiten

```
WP1 Shared-Workspace ──┬──> WP2 PUT ──> WP3 Editor
                       └──> WP5 Git (defer)
WP4 Linear-Proxy (unabhängig, parallel möglich)
```
**WP1 zuerst** — ohne Shared-Workspace gibt es keinen Ort, an dem Speichern/Editor überhaupt greifen. WP4 ist inhaltlich unabhängig und darf parallel laufen.

## §8 Bewusst NICHT im Scope
- W1→W9 Wellen (gestoppt, Operator-Entscheidung offen)
- `checkov-preflight.sh` anfassen; `gateway.go:456-458` DNS-Routen drehen
- `squadmesh/`, `.env`, `config.yml`, `deploy/headscale/image.tar`
- Lock-Files (`package-lock.json`) einchecken
- Neue i18n-Keys „nur in en.json" (60-Locales-Parität ist Pflicht)
- Renamen der `freellmapi.*`-localStorage-Keys — würde gespeicherte Nutzereinstellungen löschen (`layout.tsx:42` liest denselben Key, den `I18nProvider.tsx:57/174` schreibt; Drift aus SPRINT-181 ist behoben)
- `docs/clients.md` CLI-Name `npx freellmapi` — Produktentscheidung, ob JiMesh ein eigenes CLI publiziert

## §9 Offene Fragen an den Operator
1. **MCP/Service-Key:** trifft `src/backend/internal/auth/auth.go:886-892` auch die jules-MCP-Tools (also allgemeines Problem) oder nur Linear? → bestimmt, ob wir eine generelle Allowlist bauen.
2. **Linear-Token-Prüfung:** braucht es vor WP4 einen freigegebenen Test-Token für die Verifikation, oder reicht der ehrliche Leerzustand?
3. **WP5 Git:** jetzt oder später?
