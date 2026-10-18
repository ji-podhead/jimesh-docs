# SPRINT-138 — FILE-BROWSER-UPLOAD (verschlüsselte Workspace-Files)

> Anlass: Operator-Spec (28.9.2026) — File-Browser mit Upload und
> verschlüsselter Ablage. Das bestehende `POST /api/ssh/explore` (Sprint-48)
> ist NUR fürs Browsen fremder Verzeichnisse via SSH. Für Uploads fehlt ein
> komplettes Endpoint-Set, das Dateien in den WORKSPACE-CONTAINER legt (nicht
> auf den Host), mit AES-256-GCM Verschlüsselung beim Upload und einem
> per-Datei DEK im Vault.
>
> Bedrohungsmodell (Operator-Zitat): „Eine gehackte DSH-Instanz braucht BEIDES:
> die verschlüsselte Datei UND den Vault-Secret + Scope-Berechtigung." Die
> verschlüsselte Datei liegt im Workspace-Volume (`jimesh-dsh-data-<wsId>`,
> im Container unter `/root/.dsh` sichtbar) — der Angreifer im Container
> besitzt sie also. Der DEK liegt im Vault-Scope des Owners
> (`projects/{projectId}/users/{ownerUserId}/file-keys/{filename}`) und ist
> für ihn ohne explizite Freigabe nicht lesbar.
>
> Branch: `feat-file-browser-upload` · Datum: 28.9.2026

## Ziel

1. **Backend** `src/backend/internal/gateway/files.go`: vier neue Routes
   unter `/api/workspaces/{id}/files` — Upload (Multipart-Stream,
   AES-256-GCM, DEK → Vault), Liste (aus dem Volume), Download (DEK aus dem
   Vault holen, entschlüsseln, streamen), Delete (Datei + Vault-DEK).
2. **Krypto** `src/backend/internal/filecrypto`: echtes AES-256-GCM
   (crypto/aes + crypto/cipher, reine Go-Standard-Library, CGO_ENABLED=0),
   gechunkt (4 MiB pro Chunk) — GCM ist kein Stream-Cipher, ganz-Datei-Seal
   würde die Datei komplett in RAM puffern (verletzt „kein RAM-Buffering").
   Format `JIMEFS1`: Magic + 7-Byte-Salz, pro Chunk [len32][flag][ciphertext+tag],
   Nonce = salt‖BE32(chunkIndex)‖flag (12 Byte). Body-Chunks müssen exakt
   Chunkgröße haben, genau ein Final-Chunk — Kürzung/Umordnung wird beim
   Lesen ERKANNT, nicht still geschluckt.
3. **Ablage**: verschlüsseltes Artefakt in `files/<name>.jenc` auf dem
   Workspace-Volume, via Docker-Helper-Container (`docker run --rm -i -v
   jimesh-dsh-data-<wsId>:/v alpine …`) — lokal über exec, remote über
   SSH (deploy.DialSSH) — derselbe Ausführungsweg wie der Deploy-Engine
   (projects_ssh.go). Nie ein Host-Pfad (Operator-Spec: „nicht auf den Host!").
   Das Volume überlebt Re-Deploys (Mandat 5) — Uploads auch.
4. **Zugriff**: Handler-seitig owner-or-admin (Operator | jimesh-admin |
   Workspace-Owner sub | project_roles-Grant auf dem Projekt = „Admin mit
   Scope" / explizite Freigabe). Dafür bekommt die Files-Sub-Surface eine
   präzise Ausnahme vom `/api/workspaces`-Admin-Präfix (policy.go, Muster:
   `/api/vault/access`-Exemption und TASK-071-Präzisionsmatch), sonst würde
   die Middleware dem Owner sein eigenes Upload verweigern und NUR Full-Admins
   dürften hochladen.
5. **Frontend** `components/workspaces/FileBrowser.tsx` (NEU — das
   bestehende FileBrowserModal ist ein SSH-Path-Picker, kein Workspace-File-
   Manager): react-dropzone Drag&Drop, Dateiliste mit Icon/Größe/Datum,
   Upload-Progress (XHR), Download- und Delete-Button pro Datei. Erreichbarkeit
   (Mandat 14): FolderOpen-Button [`F`] auf den Workspace-Zeilen der
   HierarchySidebar (Modal) + „Files"-Tab auf der WorkspaceDetailPage.
6. **Vault-Integration**: dieselben Store-Funktionen wie die bestehende
   `POST /api/secrets/upsert` Route (vault://-Namensschema, AES-GCM-256
   im PostgreSQL-Fallback, vault_audit_log-Zeile) — keine zweite Engine.
7. **Doku-Sync**: API_DOCS.md (4 Routes), Backlog-Spiegel, dieser Sprint-Record.

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `internal/filecrypto`: JIMEFS1-Format, NewEncryptWriter/NewDecryptReader (Streaming, 4 MiB-Chunks), GenerateDEK (32 Byte random), Nonce-Ableitung, Tamper-/Truncation-Erkennung. Tests: NIST-AES-GCM-Known-Answer-Vector für die Primitive + Roundtrips (leer, <Chunk, exakt Chunk, Chunk+1, Multi-Chunk) + Fehlertamper-Tests | [ ] |
| WP2 | `internal/gateway/files.go`: 4 Handlers (upload/list/download/delete), Filename-Sanitizer (Shell-/Pfad-Injektion), Volume-Executor (lokal exec, remote SSH, testbar via Injected-Var wie sshExploreDial), Vault-DEK upsert/get/delete + VaultAudit, Access-Check owner-or-admin | [ ] |
| WP3 | `internal/policy/policy.go`: präzise Exemption der Files-Sub-Surface vom Admin-Präfix (POST `…/files/upload`, DELETE `…/files/{name}`) + policy_test.go-Fälle; `internal/deploy`: IsLocalAddress-Export (1 Zeile) | [ ] |
| WP4 | Route-Registrierung in gateway.go (`s.registerWorkspaceFiles(mux)`) — nicht in New(), nicht existent | [ ] |
| WP5 | Frontend FileBrowser.tsx + react-dropzone (npm install in src/frontend), Sidebar-[`F`]-Badge + Modal, WorkspaceDetailPage „Files"-Tab, XHR-Upload mit Progress, Blob-Download (auth-Header via fetch → objectURL), i18n-Keys (en+de echt, 58 Locales Backfill), vitest-Komponententest | [ ] |
| WP6 | Verifikation: make go-build (CGO_ENABLED=0), go-vet, go-test (Wegwerf-DB), tsc --noEmit, vitest, check:i18n, Live-Smoke (curl: upload → list → download → byte-identischer Diff → delete) am gestarteten Stack | [ ] |
| WP7 | Docs: API_DOCS.md §workspace-files, Backlog-Spiegel, Sprint-Record-Update (retrospektiv echt) | [ ] |

## Abnahme-Kriterien

1. `make go-build` (CGO_ENABLED=0, golang-Container): **RC 0**.
2. `go vet ./...`: RC 0. `go test ./...` gegen die Wegwerf-DB: filecrypto
   (KAV + Roundtrip + Tamper) und files (Auth-Matrix, Sanitizer, Vault-Roundtrip)
   grün — oder ehrlich gemeldet, was ohne Stack nicht lief.
3. `npx tsc --noEmit -p tsconfig.app.json`: **0 neue** Fehler gegen die
   HEAD-Baseline (Pre-Existing-Noise wird benannt, nicht behoben).
4. vitest: Suite grün inkl. neuer FileBrowser-Test; `check:i18n` grün
   (60 Locales, Parität).
5. Live-Smoke am Stack: curl-Upload einer echten Datei → Liste zeigt sie →
   Download ist BYTE-IDENTISCH (`cmp`) → Volume zeigt nur `.jenc`-Artefakte →
   Delete entfernt Datei + Vault-DEK → Download danach 404.
6. Mandat 14 (Reachability): Klick-Pfad bewiesen — Sidebar-Workspace-Zeile →
   [`F`]-Badge öffnet den Browser; WorkspaceDetailPage → „Files"-Tab. Jede
   neue Route hat einen Consumer (FileBrowser.tsx).
