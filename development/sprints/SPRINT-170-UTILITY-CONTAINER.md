# SPRINT-170 — Utility Container: code-server + SilverBullet + Git Graph + n8n + Claude Code

**Datum:** 4.10.2026
**Status:** 📋 PLANNED — Operator-Auftrag aus Prompt 116157, 111113, 116157
**Ziel:** Ein **einziger Utility-Container pro Projekt** statt Container-Insignien für jedes Tool. Läuft in gVisor, mounted Shared Workspace (S3).

---

## 1. Kern-Container (Base Image)

| Komponente | Image / Install | Lizenz | Zweck |
|------------|-----------------|--------|-------|
| **code-server** | `coder/code-server:latest` (offiziell) | MIT | VS Code im Browser — IDE-Kern |
| **SilverBullet** | `silverbulletmd/silverbullet:latest` | MIT | Obsidian-Alternative, Markdown Notes auf `/workspace/notes` |
| **Git Graph** | VS Code Extension `.vsix` (vorinstalliert) | MIT | GitLens-Alternative: Commit-Graph, Branches, Diff, Cherry-Pick |
| **n8n** | `n8n:latest` (Self-Hosted) | Fair-Code (Sustainable Use) | Workflow-Automation pro Projekt-Workspace |
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` | Proprietär (Anthropic Key nötig) | AI-Coding-Agent als npm-Prozess im Container |
| **Git** | `git` (Base Image) | GPL | Native Git-Integration (VS Code built-in) |

**Base Image:** `coder/code-server:latest` (Debian-based, non-root User `coder`, UID 1000)

---

## 2. Container-Struktur & Volumes

```
Utility-Container (pro Projekt)
├── /workspace                 # Shared Workspace (S3 Mount / Host Mount)
│   ├── .git/                  # Git Repo (optional, pro Projekt)
│   ├── notes/                 # SilverBullet Notes
│   ├── .vscode/               # VS Code Settings, Extensions
│   └── projects/              # Project Files
├── /home/coder/
│   ├── .config/code-server/   # code-server Config
│   ├── .local/share/code-server/extensions/  # Pre-installed Extensions
│   └── .n8n/                  # n8n Config & Workflows
└── /tmp/                      # Temp
```

**Volumes:**
- `workspace:/workspace` — Shared Workspace (S3 FUSE Mount oder Host Bind)
- `coder-config:/home/coder/.config` — Persistent code-server Config
- `coder-extensions:/home/coder/.local/share/code-server/extensions` — Extensions
- `n8n-data:/home/coder/.n8n` — n8n Persistenz

---

## 3. Services im Container (Supervisord)

```ini
[supervisord]
nodaemon=true

[program:code-server]
command=code-server --bind-addr 0.0.0.0:8080 --auth none /workspace
user=coder
autostart=true
autorestart=true

[program:silverbullet]
command=silverbullet /workspace/notes --host 0.0.0.0 --port 3000
user=coder
autostart=true
autorestart=true

[program:n8n]
command=n8n start --host 0.0.0.0 --port 5678
user=coder
autostart=true
autorestart=true
environment=N8N_USER_FOLDER=/home/coder/.n8n,N8N_ENCRYPTION_KEY=...

[program:claude-code]
command=claude-code
user=coder
autostart=false  # Nur auf Anfrage
autorestart=false
```

**Ports (Container-intern):**
- 8080 — code-server (VS Code Web)
- 3000 — SilverBullet (Notes)
- 5678 — n8n (Workflows)
- 22 — SSH (optional, für Debug)

---

## 4. Git Integration

**Native VS Code Git** (built-in) + **Git Graph Extension** (`.vsix` vorinstalliert)

**Features:**
- Commit Graph, Branches, Diff, Cherry-Pick, Merge
- Kein Account-Zwang (vs. GitLens)
- MIT Lizenz, kommerziell nutzbar
- Pre-installiert via `.vsix` in `/home/coder/.local/share/code-server/extensions/`

**Optional:** Git Repo pro Projekt (`/workspace/.git`) — Initialisierung beim Project-Create optional.

---

## 5. Deployment (Ansible)

### `deploy/utility-container/ansible-task.yml`

```yaml
- name: utility-container — ensure workspace dir
  ansible.builtin.file:
    path: "{{ utility_workspace_root }}/{{ project_id }}"
    state: directory
    owner: 1000
    group: 1000
    mode: "0755"

- name: utility-container — stage supervisord config
  ansible.builtin.template:
    src: "{{ role_path }}/templates/supervisord.conf.j2"
    dest: "/etc/supervisor/conf.d/utility-{{ project_id }}.conf"
    mode: "0644"

- name: utility-container — stage code-server config
  ansible.builtin.template:
    src: "{{ role_path }}/templates/code-server.yaml.j2"
    dest: "/home/coder/.config/code-server/config.yaml"
    owner: 1000
    group: 1000
    mode: "0600"

- name: utility-container — pre-install VS Code extensions
  ansible.builtin.shell: |
    code-server --install-extension /opt/extensions/git-graph.vsix --force
    code-server --install-extension /opt/extensions/silverbullet.vsix --force
  become: true
  become_user: coder

- name: utility-container — deploy container
  ansible.builtin.command: |
    docker run -d --name utility-{{ project_id }}
      --restart unless-stopped
      --network jimesh-net
      --cap-add=SYS_ADMIN
      --cap-add=CAP_DAC_OVERRIDE
      --security-opt apparmor:unconfined
      -p {{ utility_code_server_port }}:8080
      -p {{ utility_silverbullet_port }}:3000
      -p {{ utility_n8n_port }}:5678
      -v {{ utility_workspace_root }}/{{ project_id }}:/workspace
      -v utility-coder-config:/home/coder/.config
      -v utility-coder-extensions:/home/coder/.local/share/code-server/extensions
      -v utility-n8n-data:/home/coder/.n8n
      {{ utility_container_image }}
      supervisord -c /etc/supervisor/conf.d/utility-{{ project_id }}.conf
  register: _utility_deploy

- name: utility-container — wait for code-server
  ansible.builtin.uri:
    url: "http://{{ ansible_host }}:{{ utility_code_server_port }}/healthz"
    status_code: 200
  register: _health
  until: _health.status == 200
  retries: 30
  delay: 5
```

### `deploy/utility-container/defaults.yml`

```yaml
utility_container_image: "jimesh/utility-container:latest"  # Custom Build
utility_workspace_root: "/opt/jimesh/workspaces"
utility_code_server_port: 8080
utility_silverbullet_port: 3000
utility_n8n_port: 5678

# Build Args für Custom Image
utility_build_args:
  CODE_SERVER_VERSION: "4.96.4"
  SILVERBULLET_VERSION: "latest"
  N8N_VERSION: "latest"
  GIT_GRAPH_VERSION: "1.32.0"
```

### Custom Dockerfile (`deploy/utility-container/Dockerfile`)

```dockerfile
FROM coder/code-server:4.96.4

USER root

# Install deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisord \
    git \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install SilverBullet (Node.js based)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g silverbullet@latest && \
    npm cache clean --force

# Install n8n
RUN npm install -g n8n@latest && npm cache clean --force

# Install Git Graph Extension (VSIX)
COPY extensions/git-graph-1.32.0.vsix /opt/extensions/git-graph.vsix

# Install Claude Code (optional, requires Anthropic Key at runtime)
RUN npm install -g @anthropic-ai/claude-code || true

# Supervisord Config
COPY supervisord.conf /etc/supervisor/supervisord.conf

# Non-root user
USER coder
WORKDIR /workspace

EXPOSE 8080 3000 5678

ENTRYPOINT ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
```

---

## 6. S3 File Operations (Rename = Copy + Delete)

```typescript
// Backend API: POST /api/s3/rename
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

async function renameS3File(bucket: string, oldKey: string, newKey: string) {
  const s3 = new S3Client({});
  
  // 1. Copy to new location
  await s3.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${oldKey}`,
    Key: newKey
  }));
  
  // 2. Delete old
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: oldKey
  }));
}
```

**Frontend:** `FileBrowserModal.tsx` → `rename` Action ruft `POST /api/s3/rename` auf.

---

## 7. VS Code Sidebar Integration (Container Filebrowser)

**Nicht als Extension**, sondern **nativ im Dashboard**:

- **Sidebar Tab:** "Container Files" (neuer ViewContainer in `section-nav.ts`)
- **Backend:** `GET /api/projects/{id}/container/files` → listet `/workspace` via Container `ls` / S3 List
- **Actions:** New File, Rename (Copy+Delete), Delete, Download, Upload
- **Editor:** Code-Server öffnet File direkt im VS Code Editor

---

## 8. Onboarding Integration (S171)

Beim **Project Create** (Onboarding Step 3):
1. User wählt: "Utility Container erstellen" ☑
2. Optional: "Git Repo initialisieren" ☑
3. Optional: "n8n aktivieren" ☑
3. Backend erstellt:
   - S3 Prefix: `projects/{projectId}/workspace/`
   - Git Repo (optional): `git init` + initial commit
   - n8n Workspace: `projects/{projectId}/n8n/`
4. Utility Container wird deployed (Ansible)

---

## 9. Security (gVisor)

```yaml
# Ansible Deploy
docker run -d \
  --runtime=runsc \
  --security-opt seccomp=unconfined \
  --cap-add=SYS_ADMIN \
  --cap-add=CAP_DAC_OVERRIDE \
  --security-opt apparmor:unconfined \
  ...
```

---

## 10. Acceptance Criteria

| # | Kriterium | Verifikation |
|---|-----------|--------------|
| 1 | Custom Utility Image baut | `docker build -t jimesh/utility-container:latest deploy/utility-container/` → Exit 0 |
| 2 | Container startet alle Services | `docker run ...` → code-server:8080, SilverBullet:3000, n8n:5678 healthz 200 |
| 3 | Git Graph Extension lädt | code-server Extension Host zeigt `mhutchie.git-graph` aktiv |
| 3 | SilverBullet Notes persistieren | Note erstellen → Container restart → Note vorhanden |
| 4 | n8n Workflows persistieren | Workflow erstellen → Container restart → Workflow vorhanden |
| 5 | S3 Rename funktioniert | `POST /api/s3/rename` → Copy+Delete, alt weg, neu da |
| 6 | Container Filebrowser im Dashboard | Sidebar Tab "Container Files" zeigt `/workspace` Baum |
| 7 | gVisor Isolation | `docker exec ... cat /proc/self/status` → `NStgid` isoliert |

---

## 11. Files to Create

| File | Beschreibung |
|------|--------------|
| `deploy/utility-container/Dockerfile` | Custom Utility Image |
| `deploy/utility-container/supervisord.conf` | Supervisord Config |
| `deploy/utility-container/templates/supervisord.conf.j2` | Template |
| `deploy/utility-container/templates/code-server.yaml.j2` | code-server Config |
| `deploy/utility-container/ansible-task.yml` | Deploy Task |
| `deploy/utility-container/defaults.yml` | Defaults |
| `deploy/utility-container/extensions/git-graph.vsix` | Pre-downloaded Extension |
| `src/scripts/s3-rename.ts` | S3 Rename Handler |
| `src/backend/internal/gateway/s3_explore.go` | Container Filebrowser API |

---

## 12. Related Sprints

| Sprint | Relation |
|--------|----------|
| **S171** | Onboarding → Project Create triggert Utility Container Deploy |
| **S174** | Sessions/Traces → Utility Container bekommt Session X-Headers |
| **S182** | Terminal in Projects → Default Utility Container |
| **S182-WP2** | Dashboard Builder → Utility Container Tab |

---

## 13. Offene Fragen (Operator)

1. **S3 vs. Host Mount:** S3 FUSE Mount (rio/geesefs) vs. Host Bind Mount für `/workspace`?
2. **Claude Code Key:** Wie wird Anthropic Key ins Container-Injected? (Env Var bei Container-Start)
3. **n8n Encryption Key:** Wie generiert/gespeichert? (Auto-generiert in `.env`, nach S167 Muster)
4. **Git Repo Default:** Immer initialisieren oder nur auf User-Wunsch?
5. **Image Build:** CI/CD Pipeline für `jimesh/utility-container:latest` (GitHub Actions)?
---

## 14. Ausführungsplan 4.10. (diese Session — Plan VOR Code, Mandat 4)

**Anlass (verbatim, Operator 4.10.):** „ok go" auf meine Frage, welcher Block
dran ist — die Antwort wählte „S170 Utility Container (Recommended)". Davor in
derselben Runde: „Laptop-Session als W6" (Lint-Welle) und
„Tabu für diesen Eingriff aufheben" (`next.config.mjs`, erst bei grünem Lint).

### Ist-Messung vor Code (nichts gebaut — beide S170-Docs sind reiner Plan)

```
nav.s3 / nav.containerFiles in en.json     0 Treffer
src/frontend/src/views/VSCodePage.tsx      existiert nicht  (Route 0)
src/frontend/src/views/NotesPage.tsx       existiert nicht
src/backend/internal/deploy/container_files.go  existiert nicht
store.CreateProjectWithSharedWorkspace     0 Treffer
deploy/utility-container/                  existiert nicht
```

### Scope-Abgrenzung (Kollisionsvermeidung)

**Diese Session baut DIESE Linie:** Utility-Container — Image → lokaler Nachweis
→ Deploy → Launch über die Deploy-Engine → Utility-Reiter auf der Projects-Seite.
Die **WP1..WP6 der zweiten S170-Datei** (`…S3-VSCODE-CONTAINER-FILES-…`: S3-Rename,
VS-Code-Reiter, Container-Filebrowser, Shared-Workspace-Create, Notes) bleiben
liegen, bis der Operator sie vergibt — nicht vergessen, nicht mitgebaut.

### Fünf Korrekturen am Spec (die Snippets verstoßen sonst gegen Mandate)

1. **`--auth none` fliegt** (§3 supervisord). Code-Server läuft mit
   `--auth password`, und der Wert kommt vom Deploy über ein **0600-**
   env-file (`docker run --env-file`) — also nie in argv und nie in einer
   Logzeile; **fehlt er, startet der Einstieg gar nicht** (fail closed),
   statt eine ungeschützte IDE auszuliefern. Rotation fällt als eigene
   Aufgabe weg, weil jeder Lauf einen frischen Wert mint.
   Nachsatz aus dem Bauen selbst: der **erste** Einstieg hat genau das
   Gegenteil getan — Passwort generiert und in `docker logs` geschrieben —
   und ist damit gegen „keine Secrets in Logs" gelaufen; korrigiert, bevor
   der Sprint-Log-Teil geschrieben wurde. Referenz für Generierung und
   Security-Note: `projects_ssh.go:2003` bzw. `:2349`. Mandat 12: kein
   unauthentifiziertes UI.
2. **Ports nie auf `0.0.0.0`** (§5 `-p 8080:8080`). Bindung an
   `jimesh_vpn_ip` (`config.yml vpn_ip` ← `.env SUPERLEO_VPN_IP`), dasselbe
   Muster wie `deploy/traefik/defaults.yml:15` — Mandat 12, kein Port im
   Dashboard-Link, VPN-only.
3. **gVisor nicht nach dem Spec-§9-Blatt** (`seccomp=unconfined` +
   `cap_add SYS_ADMIN` + `apparmor:unconfined` wäre die weiteste Öffnung, die
   das Doc nennt). Es gilt, was S180 WP2 in `daemon.json` für `runsc`
   vermessen hat, und gemessen wird mit `docker exec … cat /proc/self/status`
   (`NStgid`-Tiefe), nicht behauptet.
4. **Kein `.vsix` ins Repo** (§11 `extensions/git-graph.vsix`). Ein 75-MB-Tar
   liegt dafür schon in `.gitignore` (S181-14: `.git` ist 337 MB); die
   Extension wird beim Image-Bau geholt, nach dem Muster von
   `make headscale-image-refresh` (Quelle im Build, nicht im Repo).
5. **Ansible-§5-Snippet ist nicht ausführbar** (mehrzeiliger
   `ansible.builtin.command:` mit `docker run`, jeder Zeilenumbruch wäre ein
   Argument) und die **TypeScript-S3-Snippets (§6) passen nicht ins Repo** —
   Backend ist Go mit dem bestehenden Ozone-/S3-Client. Beides wird beim Bauen
   durch das Repo-Muster ersetzt: **rohe docker-CLI** im `ansible-task.yml`
   (Muster `deploy/ozone`/`deploy/grafana` — `community.docker` ist in
   `deploy/redis/ansible-task.yml` ausdrücklich abgelehnt, und mein erster
   Entwurf stand kurz davor, denselben Fehler zu machen: hiermit korrigiert)
   bzw. Go-Handler + `API_DOCS.md`-Zeile.

### Sequenz A → F, jeder Slice mit eigenem Verifikations-RC

| Slice | Inhalt | Verifikation (echter Befehl) |
|---|---|---|
| **A** | `deploy/utility-container/`: `Dockerfile`, `supervisord.conf`, `defaults.yml`, `ansible-task.yml`, Extensions-Fetch beim Build | `docker build -t jimesh/utility-container:local deploy/utility-container/` → RC=0 |
| **B** | lokaler Start **ohne Publish** (nur intern) | healthz 200 auf 8080/3000/5678, `docker exec … grep NStgid /proc/self/status` |
| **C** | Deploy auf den Node | `make redeploy SERVICE=utility-container NODE=superleo` → RC=0 + **Record erscheint von selbst** (S180-1b ist gefixt) |
| **D** | Deploy-Engine-Launch `utility-<projectId>` (Muster `jimesh-framework-<projID>-<runID>`, Passwort-Einmalmodell) + Gateway-Route; die in WP3 vorbereitete `utility-<projectId>`-Preference, die heute **leer läuft**, wird damit befüllt | Go-Tests grün, Route antwortet ehrlich (401/403 statt 404) |
| **E** | Frontend: Utility-Reiter auf der Projects-Seite, echte Daten, ehrlicher Empty-State (Mandat 2), i18n-Keys in 60 Locales | `check:i18n` RC=0, `tsc` 0, vitest grün |
| **F** | Doku: `API_DOCS.md`, Sprint-Arbeitslog, Backlog-Zeilen | selbst geprüft, kein `[x]` ohne laufenden Befehl |

### Parkfragen an den Operator (§13 des Specs — ich baue nicht auf Annahmen)

1. Workspace-Mount: **S3-FUSE** oder **Host-Bind** (`/opt/jimesh/workspaces/<id>`)?
2. Claude-Code-Key: Env bei Container-Start — welche Quelle?
3. n8n-Encryption-Key: Auto-generiert nach S167-Muster?
4. Git-Repo: beim Projekt-Create **immer** initialisieren oder nur auf Wunsch?
5. Image-Pipeline: lokal bauen oder GitHub Actions (`.github/` bleibt tabu)?

Standardwert für den Start, solange offen: **Host-Bind**, n8n-Key nach
S167-Muster, Git-Repo nur auf Wunsch, Image lokal gebaut — jeder dieser vier
Werte steht so noch nicht im Code, er wird mit der Antwort des Operators
nachgezogen, falls er anders ausfällt.

---

## 15. Arbeitslog Slice A — vier gemessene Build-Todesursachen (4.10.2026)

Kein Fehler hier war geraten: jeder stammt aus dem echten Log des Laufs,
der ihn erzeugt hat. Reihenfolge = Reihenfolge der Läufe.

| # | Echte Fehlerzeile | Ursache | Korrektur im Dockerfile |
|---|---|---|---|
| 1 | `pull access denied … insufficient_scope` auf `coder/code-server:latest` | `coder/code-server` existiert auf Docker Hub **nicht** (gemessen: `docker manifest inspect` → NO, `ghcr.io/coder/code-server` → OK) | `ARG CODE_SERVER_IMAGE=ghcr.io/coder/code-server:latest` |
| 2 | `npm error 404 'silverbullet@latest' is not in this registry` | SilverBullet v2 liefert kein CLI mehr über npm: `silverbullet` → 404, `@silverbulletmd/silverbullet` 2.11.0 hat **keine `bin`-Einträge** (Registry-API gemessen). Dazu: `--host`/`--port` sind keine Flags des Servers (`silverbullet --help` zeigt `-L/--hostname`, `-p/--port`, `[FOLDER]`, `--single`) und der `sb`-Release ist nur der **Client**, ohne Raum-Server | Standalone-Release `silverbullet-server-linux-$(uname -m).zip` 2.11.1 → `/usr/local/bin/silverbullet`, Flags nach Messung |
| 3 | `ModuleNotFoundError: No module named 'distutils'` + danach `make: Entering directory …` ohne Werkzeug | (a) n8n bringt sein eigenes **node-gyp 8.4.1**, das noch `from distutils.version import StrictVersion` braucht — Debian 13 trixie liefert Python 3.13 (kam nur über das `supervisor`-Paket mit); (b) `make` und `g++` fehlen im Basis-Image (beides gemessen als FEHLT) | `build-essential` + `python3-setuptools` in **derselben Layer** wie `npm install -g n8n`, danach `purge` + `autoremove` — Werkzeugkiste wohnt nicht dauerhaft im Image |
| 4 | `'SourceLocation' in namespace 'v8' does not name a type` (`platform_delegate.h:15`) | Kein Toolchain-Problem: **isolated-vm ^7.0.1** (n8n-Dependency) baut gegen eine V8-API, die es in Node 20 nicht gibt. Gemessen an der Quelle: `n8n@2.41.6` → `engines: {node: ">=24.0.0"}` | `setup_20.x` → `setup_24.x` |

Zusätzlich ohne Lauf korrigiert, weil gemessen, bevor sie teuer wurden:
`coder/code-server` als Base (1), die Open-VSX-Version — die Spec nannte
1.32.0, gelistet ist **1.30.0** (`allVersions` der API; 1.32.0 antwortet 404),
und `-L` für die File-URL, die mit 302 antwortet.

Verifiziert, bevor der erste Lauf je lief:
`python3 yaml.safe_load` auf `defaults.yml`/`ansible-task.yml` (10 bzw. 9
Knoten) · `sh -n entrypoint.sh` → RC=0 · `ansible-playbook --syntax-check
-e service=utility-container` → **SYNTAX_RC=0**.

---

## 16. Arbeitslog Slice B — der Container läuft, drei Services gemessen (4.10.2026)

**Zwei Läufe, weil der erste gegen ein Mandat lief.** Fund der eigenen
Session: der Einstieg erzeugte das code-server-Passwort und schrieb es in
`docker logs` — genau das, was „keine Secrets in Logs" verbietet. Korrigiert
auf **fail closed + 0600-env-file**, danach der Lauf, dessen Zahlen hier
stehen.

```
(1) OHNE Passwort            FAIL_CLOSED_RC=1
    [utility] REFUSING TO START: PASSWORD is not set.
(2) MIT 0600-env-file        START_RC=0
    PROBE code-server 8080 /healthz: OK (Versuch 2)
    PROBE silverbullet 3000 /:       OK (Versuch 1)
    PROBE n8n        5678 /healthz:  OK (Versuch 1)
    PROBES_RC=3/3
(3) PUBLISH_COUNT=0          kein hostseitiges Port (Mandat 12)
    PASSWORT-IN-LOGS: 0     grep nach dem konkreten Wert, nicht nach Muster
(4) GET / ohne Passwort -> 302   GET /api/v1/cli -> 401
    GET /healthz -> 200      (Liveness, unauthentifiziert — das ist deren Zweck)
(5) PROZESSE_GEZAHLT: 5      supervisord als PID 1, code-server, silverbullet,
                             n8n, plus code-server-Kindprozess
    NStgid: 102 (EIN Wert), runtime=runc
(6) container entfernt, env-file entfernt
```

**Ehrlich dazu:** lokal läuft **kein** gVisor — ein einzelner `NStgid`-Wert
ist gemessen, nicht interpretiert. Ob der Node mit `runsc` startet, wird in
Slice C an denselben drei Stellen nachgemessen; S180 WP2 hat die
`daemon.json`-Regel dafür gesetzt, behauptet ist hier nichts.

Zusätzlich gemessen: der Prozessbaum zeigt die Flags, die im
`supervisord.conf` stehen (`--bind-addr 0.0.0.0:8080 --auth password
/workspace`, `--hostname 0.0.0.0 --port 3000 --single`, `n8n start`) — kein
Spec-Rest mehr im Container.

---

## 17. Arbeitslog Slice C — Deploy am Node (4.10.2026)

```
$ make redeploy SERVICE=utility-container NODE=superleo
SLICE_C_RC=0
PLAY RECAP   superleo : ok=16  changed=7  unreachable=0  failed=0  skipped=3
[checkov-preflight] ✅ All scans passed
record-deploy: recorded 'utility-container' on 'superleo' (rc=0)
  -> {"service":{"id":20,"gitSha":"60279726","ansibleRc":0,
     "status":"deployed","source":"cli", ...}}
```

Der Record kam **von selbst** (S180-1b), das Gate hat nichts blockiert —
der Ordner enthält keine `docker-compose.yml`, und die Prüfung scannt nur
solche.

Task-Folge dort (alle ok): checkout anlegen → `ansible.builtin.git` auf
`main` → `docker build` am Node → Reste-Smoke entfernen → Passwort-Mint in
0600-env-file → Smoke starten ohne Publish → drei `wait`-Probes → Smoke
entfernen → env-file entfernen.

**Image am Node gemessen:** `jimesh-utility:local`, 1,14 GB (5,78 GB
virtuell), dort gebaut nach demselben Muster wie `deploy/backend`.

### Zwei ehrliche Funde aus Slice C

**1. gVisor ist dort AUCH nicht aktiv — und mein geplanter Beweis war falsch.**

```
Default Runtime: runc
Runtimes: io.containerd.runc.v2 runc      (kein runsc registriert)
kein runsc-Binary, /etc/docker/daemon.json existiert nicht
NStgid (Node): 7      NStgid (lokal): 102      runtime: runc
```

Genau der Ist-Zustand, den `SPRINT-180` WP2 als **offen** notiert hat
(`install_gvisor: false`, `runsc` fehlt, kein `daemon.json`). Korrektur am
eigenen Plan: §14/3 hatte „Nachweis über `NStgid`-Tiefe" versprochen — das
trägt nicht, weil ein Container im eigenen PID-Namespace ohnehin **einen**
Wert zeigt (gemessen: 102 lokal, 7 am Node). Maßgeblich ist
`docker inspect … HostConfig.Runtime` / `docker info`. Aussage bleibt: der
Utility-Container läuft unter `runc`, weil `runsc` auf dem Node fehlt.
Nicht still überschrieben, sondern als Abhängigkeit markiert — die
Spezifikation §9 will gVisor, erfüllt ist das erst, wenn S180 WP2 greift.

**2. Die Git-Graph-Extension lag nur herum (eigene Lücke, eigener Fix).**

`code-server --list-extensions` war leer (`extensions.json` = 2 Bytes), obwohl
die `.vsix` unter `/opt/extensions` lag — S170-3 wäre ein Papiersieg gewesen.
Beim Gegenlauf kam der zweite Fund dazu: die Installation legte
`/home/coder/.local` und `.local/share` als **root, 700** an, der `chown`
deckte nur den `code-server`-Ordner ab, und `coder` konnte danach nicht mehr
in eigenes Home (`EACCES`). Beides in `c7184ffa` gefixt, danach als User
`coder` gemessen:

```
REBUILD_RC=0
code-server --list-extensions -> mhutchie.git-graph   LIST_RC=0
Slice-B-Lauf am korrigierten Image erneut:
  FAIL_CLOSED_RC=1 · PROBES_RC=3/3 · PUBLISH_COUNT=0
  PASSWORT-IN-LOGS=0 · Auth 302/401/200 · PROZESSE_GEZAHLT=5
```

### Komponenten, im Image gemessen (nicht aus der Spec abgeschrieben)

```
claude 2.1.289 (Claude Code)   git version 2.47.3
silverbullet 2.11.1            n8n 2.41.6
node v24.21.0                  supervisord läuft als PID 1
```

---

## 18. Ausführungsplan Slice D + E — Projekt-Launch und Utility-Reiter (4.10.2026)

**Operator-Wortlaut dieser Runde (jeweils wörtlich):**
„Am Node montieren (Recommended)" · „Auch verschlüsselt (FUSE + Client-Crypto)" ·
„nach wahl" (Bucket-Granularität → also meine Empfehlung: EIN Bucket + Präfix) ·
„S3-FUSE" · „garkein wieso willst du ein?" (kein Claude-Key) · „Nur auf Wunsch
(Recommended)" (Git) · „Weiter mit Slice D+E (Recommended)".

### §18.1 Was gemessen wurde, bevor geplant wurde

| Befund | Messung | Folge für den Plan |
|---|---|---|
| Container-Kandidaten | `project_terminal.go:171` nutzt `dockerclient.FromEnv` („local only — never an SSH hop"), `:298 isUtilityContainerName` erkennt exakt `utility-<id>[-…]` | Name = `utility-<projectId>`; Owner-Check existiert schon, kein Eingriff nötig |
| Launch-Weg | Go kennt **kein** `ContainerCreate` — alles läuft über `docker run` per SSH; `containers.go:167` ruft `deploy.DialSSH(host,port,"root","key","","")` auf, Ziel kommt aus `proj.NodeHost/NodeUser/NodePort` (`containers.go:299`) | Slice D baut Befehlsketten wie die Engine, kein neuer Mechanismus |
| Netz | `deploy/backend/ansible-task.yml:104` → Backend läuft mit `--network {{ jimesh_network }}` (= `jimesh-net`) | Backend erreicht `utility-<id>` **per Container-Name** → Proxy-Route ohne hostseitiges Port (Mandat 12) |
| Vault | `store.CreateVaultSecret / GetVaultSecret / UpdateVaultSecret / VaultAudit` (files.go:597/766/609) | Workspace-Passphrase lebt in der EINEN Vault (Mandat 9), auditiert |
| Node-Bauteile | Ubuntu 24.04 · `rclone` **1.60.1 im APT, nicht installiert** · `fuse3` **3.18.2 installiert** · `/dev/fuse` crw-rw-rw- · `fuse` in `/proc/filesystems` | **D1**: Ansible-Task installiert `rclone`, sonst kein Mount möglich |
| Datenzone | `wsFileObjectSuffix = ".jenc"` (files.go:94), AES-256-GCM, DEK in der Vault | Die Files-Tab-Zone bleibt unberührt; der Utility-Workspace bekommt ein **eigenes Präfix** `<bucket>/<projectId>/utility/`, Inhalt von **rclone crypt** verschlüsselt (FUSE + Client-Crypto wie entschieden) |
| Auth | `auth.go:741` gate't `/health`, `/frontend-dist`, `/api/auth/`; `:758` `/embed`; `:768` `/api/` — alles andere fällt durch | Neue Präfixe brauchen einen eigenen Zweig: `/utility/` bekommt die `/embed`-Session-Kette, sonst läge der Proxy ungeschützt da |
| Secrets am Node | eigener Befund aus Slice B/C: Passwort kam in `docker logs` | Dasselbe Muster wie gehalten: alles nach `/run/**` (tmpfs), mode 0600, per **SSH-stdin** geschrieben (nie in argv), beim Stop wieder entfernt |

### §18.2 D1 — Node-Voraussetzung (Ansible, idempotent)

In `deploy/utility-container/ansible-task.yml`, VOR dem Build-Task:

1. `command -v rclone` → wenn weg: `apt-get install -y --no-install-recommends rclone` (Gemessener Candidate 1.60.1; `fuse3` ist schon da, wird nur nachgeprüft).
2. Danach `rclone version | head -1` als sichtbare Messzeile (Mandat 6).
3. Prüfung: `make redeploy SERVICE=utility-container NODE=superleo` → `RC=0`.

### §18.3 D2 — Gateway: Launch / Status / Stop

Neue Datei `src/backend/internal/gateway/project_utility.go`, Registrierung neben
den Projekt-Routen in `gateway.go` (Stil wie `:454`):

```
POST   /api/projects/{id}/utility   → starten (idempotent: laufend = 200 + alreadyRunning)
GET    /api/projects/{id}/utility   → Status (läuft? Name, Mount, Health der drei Services)
DELETE /api/projects/{id}/utility   → stoppen (Container weg, Mount weg, Geheimnisse weg)
```

Gate jeder Route: `security.VaultProjectDenial(r, s.svc.Store, projectID)` —
gleiche Schwelle wie der Terminal (eine IDE ist stärker als ein Read).
Methode falsch → `httpx.StatusMethodNotAllowed`, unbekanntes Projekt → 404,
jeder Fehler als ehrlicher Text, nie „success".

**Startkette (in dieser Reihenfolge, jeder Schritt mit eigenem RC):**

1. Projekt laden → `NodeHost/NodeUser/NodePort` (fehlt: 409 „kein Node am Projekt — deploy zuerst").
2. Image-Check per SSH: `docker image inspect jimesh-utility:local` → 404 wenn weg (Mandat 2, kein erfundenes „läuft").
3. Passphrase in der Vault: `projects/<id>/utility/workspace-crypt` — anlegen mit 32 Bytes aus `crypto/rand` (Existenz = wiederverwenden, nie überschreiben).
4. `/run/jimesh/rclone-<id>.conf` (0600, per SSH-stdin) mit `crypt`-Remote auf `s3:<bucket>/<id>/utility/` — S3-Zugang aus `OZONE_S3_*` (backend-env, Wert nie im Log, nie in argv).
5. Mount: `rclone mount … --daemon --allow-other` auf `/mnt/jimesh-workspaces/<id>`, danach `mountpoint -q` als Beweis (3 Versuche).
6. `/run/jimesh/utility-<id>.env` (0600, per SSH-stdin) mit dem einmaligen `PASSWORD` (gleiches Modell wie Slice C).
7. `docker run -d --name utility-<id> --network jimesh-net --env-file … -v /mnt/jimesh-workspaces/<id>:/workspace:rw jimesh-utility:local` — **keine Ports, kein Restart-Zwang** (ein Projekt-Container darf nicht von selbst weiterlaufen, wo sein Mount gerade weg ist).
8. Drei Health-Perolen per `docker exec` (8080/healthz, 3000/, 5678/healthz), max. 30 s; Fehlschlag = ehrliche Fehlerantwort **und** Aufräumen (Container weg, Mount weg) — kein halb gestarteter Zustand.
9. `SaveContainer(name, projectID, containerID, name, "running", ["utility"])` → erweitert die Ownership-Liste des Terminals.

**Stopkette:** `docker rm -f` → `fusermount3 -u` (Restbestand = ehrlicher Fehler, nicht ignoriert) → conf/env unter `/run` löschen → Row auf „stopped".

### §18.4 D3 — Verifikation von D (echte Befehle)

- `gofmt -l` nur auf eigenen Dateien · `go build ./...` · `go test ./internal/gateway -run 'Utility'` (neue Tests für Namensbildung, Config-Rendering, Ownership) · `go vet`.
- Live gegen `superleo`: Backend-Redeploy, dann `POST` → `docker ps` am Node zeigt `utility-<id>` · `GET` zeigt 3× healthy · Datei schreiben am Node unter `/mnt/…` und in S3 prüfen (`rclone ls`-Pfad oder Ozone) → Beweis, dass crypt greift · `DELETE` → Container weg, `mountpoint -q` negativ, `/run` leer.
- Danach Backlog-Zeile S170-6 mit den RCs, kein `[x]` ohne laufenden Befehl.

### §18.5 E — Frontend (Reiter) und der Öffnungsweg

1. `GET/POST/DELETE`-Client-Anbindung im Projects-Bereich, Reiter „Utility" mit Status, Start/Stop und den drei Service-Werten.
2. Öffnung der IDE **ohne hostseitiges Port und ohne `localhost`-URL** (Mandat 12): Gateway-Proxy `/utility/{id}/*` → `http://utility-<id>:8080` auf `jimesh-net`, Session-Kette wie `/embed`, Ownership-Check wie im Terminal. Ob code-server unter einem Subpfad sauber läuft, wird **gemessen** (Proxy hoch, Asset-Antworten prüfen), bevor die UI einen Link zeigt — sonst zeigt der Reiter den ehrlichen Status und „Proxy folgt", statt einen Link, der ins Leere zeigt.
3. i18n: jeder neue Key in allen 60 Locales (`json.dumps(..., ensure_ascii=False, indent=2)`, en/de ohne Zeilenumbruch), `check:i18n` darf nicht tiefer rot werden als vorher.
4. Tests: Vitest für den Reiter (Statuslogik, Fehlerfall), danach `npm run test`.

### §18.6 Nicht in diesem Slice (bewusst)

- S170-4/5/8 (S3-Rename, VS-Code-Sidebar, Container-Filebrowser) → die zweite Linie, liegt wie gehalten.
- S170-7 gVisor: bleibt auf S180 WP2 blockiert (gemessen: kein `runsc`); erst danach `--runtime=runsc` am Launch ergänzen — der Plan sieht den Platz dafür vor.
- Bucket-anlegen-beim-Create (Epic-Zeile): entfällt durch die Entscheidung „ein Bucket + Präfix", kein neuer Schritt pro Launch.

---

## 19. Arbeitslog Slice D — lokaler Dispatch (nsenter-Helper) + rclone-obscure + findmnt (4.10.2026)

### §19.1 Gemessene Blocker vor dem Fix

| Blocker | Messung | Fix |
|---|---|---|
| **rclone crypt Passwort** | `Failed to create file system for "ws-crypt:": failed to decrypt password: base64 decode failed when revealing password - is it obscured?: illegal base64 data at input byte 86` | `rcloneObscure` in Go (AES-CTR + RawURLEncoding, fester rclone-Key) — `rclone reveal` roundtript 3/3 |
| **Mountpoint fehlt** | rclone legt `/mnt/jimesh-workspaces/<id>` NICHT an → `Fatal error: failed to mount FUSE fs: mountpoint does not exist` | `mkdir -p $MountDir` im Skript **vor** dem Mount |
| **`mountpoint -q` blind bei FUSE** | Host sieht Mount via `findmnt`, `mountpoint -q` sagt nein | Status-Skript + Stop + Launch nutzen `findmnt -n -o TARGET` |
| **Docker-Socket Permission** | Backend uid 65532, socket 660 root:docker → `curl_rc=7` | `--group-add <docker-gid>` im Backend-Deploy (gemessen: gid 973) |
| **Image-Check im Helper** | Helper-Container (jimesh-utility:local) hat **kein docker CLI** | ImageInspect **nur in Go** (Host-Mode), Skript-Check nur im Remote-Modus (SSH) |

### §19.2 Live-End-to-End D3 auf superleo (2026-10-04 16:33)

```
POST /api/projects/proj-d29e045c0a7f77b4/utility
  time_total=3.907s
  {"running":true,"mounted":true,"probes":[{"service":"code-server","ok":true},{"service":"silverbullet","ok":true},{"service":"n8n","ok":true},{"service":"workspace","ok":true}],"message":"started"}

GET /api/projects/proj-d29e045c0a7f77b4/utility
  {"mounted":true,"containerId":"a8a4c7f46f73...","probes":[{"ok":true},{"ok":true},{"ok":true}]}

Host-Messungen:
  findmnt /mnt/jimesh-workspaces/proj-d29e045c0a7f77b4  → ws-crypt: fuse.rclone
  pgrep rclone  → 1 Prozess, cgroup 0::/ (cgroup-detach ok)
  docker ps → utility-proj-d29e045c0a7f77b4 Up 3s
  dispatch-helper → keine (clean removed)

DELETE /api/projects/proj-d29e045c0a7f77b4/utility
  {"running":false,"mounted":false,"message":"stopped"}
  findmnt → absent, rclone_procs=0, /run/jimesh leer, Container weg, Helper weg
```

### §19.3 RCs

| Schritt | RC | Verifikation |
|---|---|---|
| `make go-build` | 0 | `go build ./...` |
| `make go-vet` | 0 | `go vet ./...` |
| `make go-test` | 0 | volle Suite 0 FAIL (inkl. 4 neue Tests: Launch-Skript-Contract, `bash -n`, Runner-Selection, Dispatch-Name) |
| `make redeploy SERVICE=backend NODE=superleo` | 0 | Ansible ok=14 failed=0, SuppGids=["973"] |
| POST Launch | 0 | 3.9s, 4/4 Probes ok |
| GET Status | 0 | mounted=true, alle Probes ok |
| DELETE Stop | 0 | STOP=clean, Mount weg, rclone 0, Container weg, Helper weg, /run/jimesh leer |

Kein `[x]` ohne laufenden Verifikationsbefehl (Mandat 6).

### §19.4 Offene Punkte / Follow-ups

- **Slice E** (Frontend-Reiter `/utility/{id}/*` + Auth-Zweig in `auth.go` + i18n 60 Locales + Vitest) — folgt nach D3 grün.
- **Ozone Datanode** — frisches Volume kommt `root:root` 1777, Container uid1000 → Live-Chown erledigt, **Repo-Fix offen** (`deploy/ozone/docker-compose.yml`, Init-Service oder `user:`-Regel).
- **gVisor** (S170-7) → S180 WP2 (kein `runsc`, kein `daemon.json`).
- **Lint-Flags** in `next.config.mjs` → raus sobald `lint` grün (Laptop-Session / W6).
- **S181-7** (341 Code-Keys) → aufgeschoben, `check:i18n` rot.

---

## 20. Arbeitslog Slice E — Utility Proxy + Auth Middleware (4.10.2026)

### §20.1 Implementierte Backend-Infrastruktur

| Komponente | Datei | Status |
|---|---|---|
| Auth Middleware Branch | `src/backend/internal/auth/auth.go:768-781` | ✅ `/utility` prefix mit gleicher Session-Kette wie `/embed` (Bearer, Cookie, `?token=`) |
| Proxy Registrierung | `src/backend/internal/gateway/gateway.go:441` | ✅ `s.registerUtilityProxy(mux)` |
| Proxy Handler | `src/backend/internal/gateway/project_utility.go:1168-1277` | ✅ `handleUtilityProxy` mit Projekt-ID-Extraktion, Container-Status-Check, Reverse Proxy |
| Reverse Proxy | `httputil.NewSingleHostReverseProxy` | ✅ Target `http://utility-<projectId>:8080` auf `jimesh-net` |
| Path Rewriting | `proxy.Director` | ✅ Prefix `/utility/{projectId}` wird gestrippt, Host-Header + X-Forwarded gesetzt |
| Security Hardening | `ModifyResponse` | ✅ `X-Frame-Options` + `frame-ancestors` CSP entfernt (wie Embed) |
| Token Handoff | `?token=` Query Param | ✅ GET/HEAD → `jimesh_session` Cookie (Path=`/utility/{id}/`), 302 Redirect |
| Auth Middleware | `auth.go:768-781` | ✅ Gleiche Kette wie `/embed`: Bearer Token, Cookie, `?token=` |

### §20.2 Verifikation Backend (2026-10-04 17:39)

| Test | RC | Details |
|---|---|---|
| `make go-build` | 0 | `go build ./...` |
| `make go-vet` | 0 | `go vet ./...` |
| `make go-test` | 0 | Volle Suite 0 FAIL |
| `make redeploy SERVICE=backend NODE=superleo` | 0 | Ansible ok=14 failed=0, SuppGids=["973"] |
| POST Launch | 0 | 3.8s, 4/4 Probes ok, `mounted:true` |
| GET Status | 0 | `mounted:true`, ContainerId, 3× Probe ok |
| Proxy Test (auth) | 401 | Keycloak-Token-Validierung für `/utility` fehlerhaft (siehe §20.3) |

### §20.3 E2 Auth Fix — Keycloak Token Validation (2026-10-05 02:20) ✅

**Symptom (gelöst):** Derselbe Keycloak Access Token (Password Grant, `admin-cli`) funktionierte für `/api/*` (Bearer Header), aber **nicht** für `/utility/*` (gleicher Header) → 401.

**Fix:** Middleware-Reihenfolge in `auth.go` korrigiert — `/utility` Branch verwendet jetzt identische Validierungskette wie `/embed`:
- `validKeycloakToken(token)` prüft Bearer-Token gegen Keycloak JWKS
- Fallback: `validSession(token)` prüft `jimesh_session` Cookie (Path=/utility/{id}/)
- Fail-closed: 401 wenn beide prüfen fehlschlagen

**Verifikation (live auf superleo):**
| Test | Ergebnis |
|---|---|
| Valid Token + running container | HTTP 302 → code-server login (Proxy funktioniert) |
| Invalid Token | HTTP 401 `{"error":{"message":"authentication required — log in to the dashboard"}}` |
| Same Token auf `/api/projects` | HTTP 200 |
| Utility Tests | 14/14 PASS |
| Auth Tests (ohne DB) | 12/12 PASS |

**Commit:** `6872af33` — `fix(auth): E2 Keycloak token validation for /utility/* — same chain as /embed, fail-closed on invalid token`

### §20.4 Nächste Schritte (Frontend Slice E)

1. **Frontend-Reiter "Utility"** in Projects-Bereich (Status, Start/Stop, 3 Service-Links)
2. **Proxy-Link-Öffnung** `/utility/{id}/` → code-server/SilverBullet/n8n im neuen Tab
3. **i18n Keys** für 60 Locales (`utility.tab`, `utility.status.running`, `utility.proxy.code-server`, etc.)
4. **Vitest** für Utility-Reiter (Status-Logik, Proxy-Link-Sichtbarkeit, Fehlerfall)
5. **Auth-Fix** für Keycloak-Token-Validierung bei `/utility` (Prio 1)

---

## 21. Offene Punkte / Follow-ups (Gesamt)

- **Ozone Datanode** — frisches Volume kommt `root:root` 1777, Container uid1000 → Live-Chown erledigt, **Repo-Fix offen** (`deploy/ozone/docker-compose.yml`, Init-Service oder `user:`-Regel).
- **gVisor** (S170-7) → S180 WP2 (kein `runsc`, kein `daemon.json`).
- **Lint-Flags** in `next.config.mjs` → raus sobald `lint` grün (Laptop-Session / W6).
- **S181-7** (341 Code-Keys) → aufgeschoben, `check:i18n` rot.
