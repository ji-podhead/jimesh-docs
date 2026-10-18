# VS Code Agents × JiMesh — Integrationsrecherche

**Stand:** 5.10.2026 · **Status:** Recherche, keine Umsetzung · **Backlog:** `docs/backlog/BACKLOG.md` §S187
**Quellen (alle live gezogen, Stand 5.10.):** VS-Code-Quelle `microsoft/vscode@main`, `code.visualstudio.com/docs/agents/**`, `github.com/coder/vscode-coder`, plus Repo-Messungen in `jimesh@b0a43270`.

---

## 0. Anlass (verbatim)

**Prompt 1 (Startauftrag):**

> „hier nochmal diesen tas bitte genau dokumentieren mit research folde rund alles ins backlog und meinen prompt dazu alter wie geil guck dir mal dieses vs code agents an. die frage ist wie integrieren wir das dass wir da unsere workspaces auswählen? wir müssen das über den git/vscode account von dem user machen das unsere workspaces/ontianer direkt die remote git workspaces sind dann kann man wenn man ein github project aufmacht direkt in dieser agents ansicht via usner dashboard arbeiten und die leute können remote von vs code aus in unserem workspace arbeiten, aber dazu müssten wir uns mal fragen wie und ob das überhaupt geht und uns mal vs code server und agents mal genau ansehen oder forken und eventuell noch für unseren scheis ein plugin geschrieben das all unsere workspaces automatisch in git rmeote sind und auch zustzlich eine extra extension ansicht das ddass dann genauso wie bei uns ist aber in vs code"

**Prompt 2 (zwei VS-Code-Testdateien):**

> „https://github.com/microsoft/vscode/blob/main/src/vs/sessions/test/browser/agentsPartCard.test.ts https://github.com/microsoft/vscode/blob/main/test/smoke/src/areas/agentsWindow/agentsWindow.test.ts guck mal ob wir da was benutzen können"

**Prompt 3 (Container statt SSH):**

> „schau dir mal den rest von dieser agents geshcichte an und ob das auch statt ssh mitunseren containers gehen würde oder ob wir dann quasi den remote target überall gleich haben aber den phad von dem workspace halt unterschiedlich, die workspace pfade der contianer sind ja alle leider auf dem hsot irgendwo, statt in den contianer reinzugehen könnten wir die auch mounten aber das wäre geiler wenn das irgendiwe anders geht mit dev containers und direkt unser subnet von internal headscale.... ja eigentlich... aber dann bräuchte man ja quasi ein doppeltes ssh was ja irgendwie auch nciht geht....kp"

**Prompt 4 (Subnet-Erkenntnis):**

> „obwohl ne wenn man im subnet ist kann man diret in den contianer
> dann würde das sogar gehn :D dann könnten wir jimesh mit vs code syncen
> nice das wollte ich eh irgendwann haben"

**Prompt 5 (Agent-SDKs im Container):**

> „nur müssen wir dann unsere agent schiesse direkt da integrieren irgendweil weil agents laufn ja auch im container bei uns"

**Prompt 6 (Fork-Schluss):**

> „und squadmesh müsste da auch integriert erden also müssten wir das wohl forken"

---

## 1. Kurzurteil

1. **Die Agents-Ansicht ist kein „GitHub-Projekt-Öffner".** Sie ist ein dediziertes Fenster (eigene User-Profile `builtin/agents`, eigener Workbench) mit einer Session-Liste links, einem Workspace-Picker oben und einem Composer. Targets sind **Ordner auf einer verbundenen Maschine** — lokal, SSH, Tunnel oder WSL — nicht GitHub-Repos.
2. **„Remote-Target überall gleich, Workspace-Pfad unterschiedlich" ist exakt das Modell.** Ein Provider = eine Rechenumgebung (`ISessionsProvider.environment`), darin viele `browseActions`/Ordner. Es gibt **eine** SSH-Verbindung pro Host und beliebig viele Workspace-Pfade darauf. Kein doppeltes SSH.
3. **In den Container geht es — aber nicht ohne Mehrarbeit:** unsere Images haben **keinen sshd** (gemessen: 0 Treffer in allen `Dockerfile`/`*.yml`/`*.j2`), und nur die **Nodes** (superleo, client2) sind Headscale-Member, nicht die Container. Zwei saubere Wege: (A) sshd in den Container (supervisord-prozess, wie code-server) oder (B) SSH auf den Node + das **Dev-Container-Submenu** des Workspace-Pickers, das VS Code nativ kann.
4. **Der Haken für eine reine Extension:** `ISessionsProvider` ist **intern** (`src/vs/sessions/services/...`, `@internal`), es gibt **kein** Proposed-API dafür. Wer unsere Workspaces als *Sessions-Provider* (SquadMesh!) drin haben will, muss VS Code **forken** — oder bei einem Umweg bleiben (Extension mit Sidebar + Remote-Resolver, die Workspaces als SSH-Ordner tarnen).
5. **Empfohlen für Phase 1:** `coder/vscode-coder` (MIT) forken → eigene Remote-Extension mit Sidebar „JiMesh", URI-Handler `vscode://jimesh.open?...`, Workspace-Pfad = `/workspace` im Container. **Phase 2 (SquadMesh als Provider):** VS-Code-Fork bzw. code-server-Fork.

---

## 2. Was die „Agents"-Ansicht ist

| Eigenschaft | Quelle / Wert |
|---|---|
| Fenster | `workbench.action.openWorkspaceInAgentsWindow` (öffnet neues Electron-Fenster mit dem aktuellen Ordner vorgewählt) |
| Workbench-Klasse | `.agent-sessions-workbench` |
| Eigene Profile | `User/profiles/builtin/agents/settings.json` — wird **zusätzlich** zum `User/settings.json` befüllt |
| Architektur-Prozess | **Agent Host** (eigener Prozess, kein Extension-Host), Protokoll **AHP** (JSON-RPC, „Agent Host Protocol") |
| Docs | `code.visualstudio.com/docs/agents/concepts/sessions`, `.../agent-host`, `.../chat/chat-sessions` |
| Session-Liste | sidebar, „shows sessions from all your workspaces" |
| Workspace-Auswahl | „**Choose the workspace or repository for the session**, as the Agents window can target any of your projects" |

Kernsatz aus der Session-Spezifikation (`src/vs/sessions/SESSIONS.md`):

> „A provider represents one compute environment. A provider may advertise multiple session types, and multiple providers may advertise the same logical type."

---

## 3. Sessions-Subsystem in der VS-Code-Quelle

`src/vs/sessions/` ist ein **eigenes Subsystem oberhalb von `src/vs/workbench`** (Layer-Regeln in `src/vs/sessions/LAYERS.md`, ESLint-Regel `local/code-import-patterns`).

```
ISessionsService             -> sichtbare/aktive Session, Composer, Navigation
   |
ISessionsManagementService   -> Modell-Orchestrierung, Provider-Wahl, Drafts
   |
ISessionsProvidersService    -> Provider-Registrierung (reine Registry)
   +--> ISessionsProvider (Copilot Chat)
   +--> ISessionsProvider (Agent Host)
   +--> ISessionsProvider (Remote Agent Host)
```

Dokumente im Quelltree: `README.md`, `SESSIONS.md`, `SESSIONS_LIST.md`, `LAYOUT.md`, `LAYERS.md`, `MOBILE.md`, `AUTOMATIONS.md`, `DESKTOP.md`, `SYSTEM_WIDE_KEYBINDING.md`.
Beitragende Ordner: `contrib/{chat,sessions,changes,terminal,github,remoteSessions,tunnelHost,workspace,openAgentsWindow,providers,...}`.

**Provider-Checkliste aus `SESSIONS.md`:**

1. `ISessionsProvider` unter `contrib/providers/<provider>/browser/` implementieren
2. Backend-Zustand in `ISession`/`IChat`-Facades adaptieren
3. Session-Typen und Capabilities wahrheitsgemäß bewerben
4. Über `sessions.*.main.ts` registrieren
5. Shared Contracts provider-neutral halten
6. Lifecycle-/Failure-Tests
7. Spec nur bei Vertragsänderung anfassen

---

## 4. `ISessionsProvider` — die Integrationsstelle (und ihre Grenze)

`src/vs/sessions/services/sessions/common/sessionsProvider.ts` (851 Zeilen, **`@internal`**). Die für uns relevanten Member:

```ts
interface ISessionsProvider {
  readonly id: string;                 // eindeutige Kennung
  readonly label: string;              // Anzeige in der UI
  readonly environment: ISessionEnvironment;  // Rechenumgebung + Connectivity
  readonly sessionTypes: readonly ISessionType[];

  /** trägt Einträge zum "Open Workspace"-Picker bei */
  readonly browseActions: readonly ISessionWorkspaceBrowseAction[];
  readonly supportsWorkspaceSelection?: boolean;
  readonly supportsLocalWorkspaces?: boolean;  // fügt "Local"-Tab hinzu
  readonly supportsQuickChats?: boolean;

  /** löst eine Repository-URI in einen Workspace auf */
  resolveWorkspace(workspaceUri: URI): ISessionWorkspace | undefined;
  canonicalizeWorkspaceUri?(workspaceUri: URI): URI;
  getSessionTypes(workspaceUri: URI): ISessionType[];

  /** neuer (untitled) Draft — erst nach erstem Send in die Liste */
  createNewSession(workspaceUri, sessionTypeId, options?): ISession;
  prepareNewSession?(sessionId, token, query): Promise<IPreparedNewSession>;
  deleteNewSession(sessionId): void;

  getSessionTypes/getModelsSnapshot/setModel/setMode/...
  sendRequest(sessionId, chatResource, options): Promise<ISession>;
}
```

**Grenze:** Diese Schnittstelle existiert **nicht** als `vscode.proposed.*.d.ts`. Eine Marketplace-Extension kann sie nicht registrieren. → Abschnitt 13 (Fork).

---

## 5. Wie Targets in den Workspace-Picker kommen

Aus `test/automation/src/agentsWindow.ts` (Page-Object der VS-Code-Smoke-Suite) abgelesen — das ist der **wichtigste Befund für uns**, weil er beweist, dass der Weg real existiert:

### DOM-Selektoren (Agents-Workbench)

```ts
const AGENTS_WORKBENCH      = '.agent-sessions-workbench';
const NEW_SESSION_VIEW      = '.sessions-chat-widget .new-chat-widget-container';
const SESSION_TYPE_PICKER   = '.sessions-chat-session-type-picker .action-label';
const WORKSPACE_PICKER      = `${NEW_SESSION_VIEW} .sessions-workspace-picker-trigger > .action-label`;
const WORKSPACE_PICKER_ROW  = '.action-widget .sessions-new-chat-picker-list .monaco-list-row.action';
const WORKSPACE_PICKER_SUBMENU_ROW = '.action-list-submenu-panel .monaco-list-row.action';
const ACTIVE_SESSION        = `${AGENTS_WORKBENCH} .session-view.is-active`;
const SESSION_LIST_ROW      = `${AGENTS_WORKBENCH} .sessions-list-control .monaco-list-row`;
const SEND_BUTTON_ENABLED   = `${NEW_SESSION_VIEW} .sessions-chat-send-button .monaco-button:not(.disabled)`;
```

Der Workspace-Picker hat **Zeilen mit `aria-label="Remote"`** — d. h. Local- und Remote-Ordner sind Tabs/Categories in *einem* Picker.

### Benutzerbefehle (alle real, aus dem Smoke-Test bedient)

| Befehl | Wirkung |
|---|---|
| `workbench.action.openWorkspaceInAgentsWindow` | öffnet Agents-Fenster mit aktuellem Ordner vorgewählt |
| `workbench.action.sessions.newChat` | neuer Session-Composer (Ctrl+L, gated auf `!editorAreaFocus`) |
| `workbench.action.sessions.connectViaSSH` | Prompt **„Connect via SSH"** → `user@host:port` → **„Authentication Method"** (Password) → **„SSH Password"** → **„Name Remote"** → Host-Key-Dialog („The authenticity of host …" + **Connect**) → **„Select Folder on `<host>`"** |
| `workbench.action.sessions.connectViaTunnel` | Tunnel-Host-Picker → Ordner wählen |
| `workbench.action.sessions.connectViaWSL` | „Connect via WSL" → Distro → „Select Folder on `<distro>`" |

Ablauf `connectSSHHost` im Detail (Zeile 174 ff.):

```
runCommand('workbench.action.sessions.connectViaSSH', {keepOpen:true})
  → quick-input "Connect via SSH"        := `${username}@${host}:${port}`
  → quick-input "Authentication Method"  := Password
  → quick-input "SSH Password"           := <passwort>
  → quick-input "Name Remote"            := <anzeigename>   <- DER remote target name
  → Dialog  "The authenticity of host"   := Connect
  → quick-input "Select Folder on <name>" := tippe <pfad>/ + Enter
  → WORKSPACE_PICKER zeigt jetzt <name>
```

**Das ist die Antwort auf „remote target überall gleich, Pfad unterschiedlich":** der *Remote Name* ist einmal pro Host/Container da, die **Ordnerwahl passiert danach pro Session** — gleicher Picker, anderer Pfad.

### Selectors für den Dev-Container-Untermenüpunkt

```ts
WORKSPACE_PICKER_DEV_CONTAINER_ROW  // Zeilen mit Submenu, NICHT aria-label="Remote"/"Chat"
// Untermenü: "Use Dev Container"
```

---

## 6. Remote-Pfade: SSH / Tunnel / WSL / Dev Container (belegt)

Aus `test/smoke/src/areas/agentsWindow/agentsWindow.test.ts` (934 Zeilen):

```ts
for (const transport of ['ssh', 'tunnel', 'wsl'] as const) { ... }
   await app.workbench.agentsWindow.connectSSHHost({...}, workspacePath);
   await app.workbench.agentsWindow.selectSessionType('Copilot', { providerLabel: fixture.name });
   await app.workbench.agentsWindow.selectDevContainer(workspaceLabel);
```

Die AHP-Transkripte belegen die **Schichtung** (außen Transport, innen Container):

```
ahp/<file>.jsonl:
  "_ahpLog": { "transport": "ssh" | "tunnel" | "wsl" | "devcontainer" }
  "method": "vscode/devContainers/connect"
  "params": { "workspaceFolder": "/…/folder" }
  "method": "dispatchAction", "params.action.type": "chat/turnStarted"
  "vscode.clientConnectionKind": "remote-devcontainer__…"
renderer.log: [AgentHost] _invokeAgent called for resource: remote-devcontainer__…
```

**Architekturfolge bei „Use Dev Container":**

```
Laptop ──ssh/tunnel/wsl──> HOST (Node) ──docker exec──> CONTAINER
                            outer transport             inner transport = devcontainer
                            Agent Host läuft im Container
```

Relevante Settings (im Smoke-Test gesetzt, daher real):

| Setting | Default/Wert |
|---|---|
| `chat.remoteAgentHostsEnabled` | `true` für Remote |
| `chat.agentHost.devContainer.enabled` | `true` |
| `chat.agentHost.devContainer.worktree.enabled` | `false` (im Test) |
| `chat.agentHost.codexAgent.enabled` | `true` (off by default) |
| `chat.agentHost.ahpJsonlLoggingEnabled` | `true` → `<logsPath>/ahp/*.jsonl` |
| `chat.agent.sandbox.enabled` | `'on'` |
| `chat.allowAnonymousAccess` | `true` |
| `chat.defaultModel` | `gpt-5.3-codex` |
| `chat.agentHost.unsafeTestToken`, `chat.agentHost.copilotSdk.logLevel` | Test |

Env-Vars der Smoke-Suite: `COPILOT_API_URL`, `VSCODE_AGENT_HOST_CAPI_URL_OVERRIDE`, `GITHUB_COPILOT_API_TOKEN`, `VSCODE_SMOKE_TEST_TUNNEL_TOKEN`.
Fixture: `test/smoke/src/areas/agentsWindow/remoteDevContainerFixture.ts` (`createRemoteDevContainerFixture({transport, workspacePath, ...})`, `IRemoteDevContainerFixture`).

---

## 7. Remote Sessions — die Fernsteuerung (SquadMesh-Parallel)

`SESSIONS.md` § „Remote delegation":

> „The Remote Sessions contribution exposes `list_agent_hosts`, `create_remote_session`, `get_remote_session`, and `send_remote_message` as **client tools** in the Agents Window. The window owns connected-host selection and cross-host routing; hosts do not discover or authenticate to one another."

> „An explicit target directory must already exist and be trusted; requested worktree isolation must be supported rather than silently downgraded. **Repository cloning and transfer of the source checkout are not part of this creation contract.**"

> „The coordinating window must remain connected; persisted provenance supports restoration, not offline delivery."

**Bedeutung:** VS Code hat bereits das Konzept „vernetzte Agent-Hosts, die ich aus dem Fenster heraus befehlige" — das ist die Struktur, die SquadMesh ohnehin macht. Ordnung: Window = Coordinator, Hosts = unsere Container.

---

## 8. Externe Sessions (Copilot CLI / Claude Code / Codex)

`code.visualstudio.com/docs/agents/concepts/sessions`:

> „VS Code can also discover supported local sessions created in **Copilot CLI, the GitHub Copilot app, Claude Code, and Codex**. A discovered session is external until you send a message from VS Code. The Agent Host then adopts the session."

Funde in `extensions/copilot/src/extension/chatSessions/copilotcli/node/copilotcliSessionService.ts`:

- Ordner **`~/.copilot/session-state/<id>/`** mit `events.jsonl` + `workspace.yaml`
- `monitorSessionFiles()` legt einen `FileSystemWatcher` auf `**/*.jsonl` — **Dateien auf der Platte erzeugen Sessions in der Liste**
- Sichtbarkeitsschalter `github.copilot.advanced.showExternalSessions` (**default `false`**)
- Sichtbarkeitsfilter `shouldShowSession()`: `context.cwd`, `context.gitRoot`, `workspaceFolder`, git-worktree, `isAgentSessionsWorkspace`
- Claude/Codex analog unter `~/.claude`, `~/.codex`

**Konsequenz für uns:** der billigste „wir sind in der Session-Liste"-Trick wäre, in unseren Containern Session-Dateien zu schreiben — aber nur, wenn die Agents-Ansicht **denselben Dateisystem-Root** sieht wie der Agent Host. Das ist nur der Fall, wenn wir per SSH/Tunnel *in* diesem Container sind.

---

## 9. Proposed APIs — was eine Extension darf

Abgefragt aus `src/vs/platform/extensions/common/extensionsApiProposals.ts` + `src/vscode-dts/` (5.10., `main`):

| Proposal | Inhalt | Nützlich für uns? |
|---|---|---|
| **`agentSessionsWorkspace`** | nur `vscode.workspace.isAgentSessionsWorkspace: boolean` (read-only Flag) | nein — meldet nur, ob wir im Agents-Fenster laufen |
| **`agentsWindowConfiguration`**, **`agentsWindowActivation`** | Config / Aktivierung | nebensächlich |
| **`chatSessionsProvider`** (851 Zeilen) | `chat.registerChatSessionItemProvider` / `chat.createChatSessionItemController`, contribution `chatSessions` in `package.json` → **Session-Einträge in die Liste einbringen** (Fork, Rename, Option-Gruppen/Picker) | **JA** — der einzige reale Extension-Zugang zur Sessions-Liste |
| **`remoteCodingAgents`** | GitHub Copilot Coding Agent (Cloud-PR) | nein |
| **`tunnelFactory` / `tunnels`** | eigene Tunnel anbieten | evtl. für „JiMesh-Tunnel" |
| **`resolvers`** | `vscode.workspace.registerRemoteAuthorityResolver` — eigene `vscode-remote://<authority>`-Authorities auflösen | **JA** — Kern von „Remote-Extension ohne Remote-SSH" |
| `contribViewsRemote` | Views in Remote-Umgebungen | ja, für Sidebar |
| `chatSessionCustomizationProvider`, `chatTab`, `defaultChatParticipant` | Chat-UI-Beiträge | nein |

**Nicht vorhanden:** jede Form von `registerSessionsProvider` / `browseActions`-Beitrag. → **Fork nötig, wenn SquadMesh echter Provider werden soll.**

---

## 10. JiMesh-Ist-Stand (im Repo gemessen, `b0a43270`)

| Befund | Messung |
|---|---|
| **sshd in unseren Images** | **0 Treffer** für `openssh-server`/`sshd` in allen `Dockerfile*`/`*.yml`/`*.j2` → **die Container haben keinen SSH-Server** |
| **Wer ist im Subnet?** | Headscale-Pool `10.80.0.0/16` (nur Nodes: superleo `100.127.129.65` via Tailscale-`100.x`, client2 mit `10.80.0.1`). Container hängen am Docker-Netz `jimesh-net`, **kein Tailscale-Node im Container** |
| **SSH-Target-Route** | `GET /api/containers/{id}/ssh-target` (`gateway/containers.go`) → `host:port` des **Nodes**, auf dem der Container läuft — nicht des Containers selbst |
| **Zugangswege** | `docs/SSH-ACCESS-ROUTES.md`: iptables-INPUT-**Allowlist** + IP-Rotation = 5–7×/Tag Bruch. Nur „Weg 1" (socat über Tailscale-Container, `ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2`) ist stabil |
| **Utility-Container** | `deploy/utility-container/`: `coder/code-server` + SilverBullet + n8n + Git-Graph unter **supervisord** als PID 1, `WORKDIR /workspace`, `mkdir -p /workspace/{notes,projects}` — **ein Prozess mehr wäre also billig** (sshd als 4. supervisord-Programm) |
| **Agent-Frameworks** | `dsh`, `dsh_code_server`, `opencode`, `opencode_code_server`, `claude-code`, `claude-code_code_server`, `gemini-cli`, `gemini-cli_code_server`, `code-server`, `gotty`, `jimesh` (`deploy/projects_ssh.go:45`) |
| **Interfaces** | `DeriveInterfaces`: `http`/`code-server`/`vnc`/`terminal`; `codeServerPort > 0 → kind "code-server"` (`deployment_interfaces.go:14-45`) |
| **Git-Log über SSH** | `GET /api/projects/task/git-log?nodeHost=&nodeUser=&nodePort=` — **leerer `nodeHost` führt `git log` auf dem Backend-Host aus** (`workspace_integrity.go:174`) → Pfad+Koordinaten gehören zusammen |
| **Utility-Proxy** | `registerUtilityProxy` → `/utility/{id}/*` → `httputil.ReverseProxy` auf `utility-<id>:8080` (S170-E1) — code-server ist damit schon im Browser erreichbar |
| **Tunnel** | Tunnel-Route existiert als Konzept (Utility-Apps), aber **kein** `tunnel`-Eintrag in `gateway.go` grepbar (unbestätigt) |

---

## 11. Die Container-/Subnet-/doppeltes-SSH-Frage (Prompt 3 + 4)

### 11.1 Warum „doppeltes SSH" **nicht** entsteht

Es gibt nur **einen** Hop: Laptop → Ziel. Was man „doppelt" nennt, wäre zwei *verschachtelte* Transportschichten — und genau das macht VS Code bereits nativ (**outer `ssh` + inner `devcontainer`**), ohne dass der Nutzer zweimal autentifiziert. Der Host-Key-Dialog und das Passwort kommen **einmal**.

### 11.2 Variante A — direkt in den Container (Operator-Idee „wenn man im subnet ist")

```
Laptop ──ssh──> 10.80.x.y:22  (CONTAINER selbst, sshd läuft)
                 └── Ordner /workspace  →  Workspace-Pfad, pro Projekt verschieden
```

**Voraussetzungen (Stand heute erfüllt keine):**

1. Container ist als Headscale-Node im `10.80.0.0/16` erreichbar → **nein**, nur Nodes sind Mitglieder.
2. Container hat sshd → **nein** (gemessen, Abschnitt 10).
3. Host-Key/Allowlist-freier Weg → iptables-Allowlist trifft Nodes; VPN-Route wäre die Lösung.

**Aufwand:** `openssh-server` + supervisord-Eintrag in den Images (Utility-Container hat das Muster bereits), Tailscale/Headscale **neben** dem App-Prozess im Container (oder ein Sidecar), Key-/Policy-Handling (jeder Container = ein SSH-Target ⇒ `connectViaSSH`-Prompt `root@10.80.x.y:22`).
**Vorteil:** kleinster Modellbruch, „der Container IST der Host", kein Docker-Zugriff von außen nötig, Dev-Container-Submenu entfällt (braucht Docker auf dem Host).

### 11.3 Variante B — SSH auf den Node + Dev-Container-Submenu (VS-Code-Nativweg)

```
Laptop ──ssh──> superleo (Node)          [outer transport = ssh]
                    └── "Use Dev Container" → docker exec → CONTAINER  [inner = devcontainer]
```

**Voraussetzungen:** sshd auf dem Node (existiert, `ansible_user=superleo`), Docker-CLI/-Socket auf dem Node (existiert), Workspace-Ordner im Container (`/workspace`).
**Vorteil:** **kein neues SSH in den Containern**, keine Netz-Änderung, entspricht exakt dem im Smoke-Test bewiesenen Pfad. Die Workspace-Pfade unterscheiden sich pro Container — genau das Szenario des Operators.
**Nachteil:** der Node ist der einzige „Remote Target"; mehrere Nodes = mehrere Targets. Aber das ist kein Problem, das Modell sieht das vor.

### 11.4 Variante C — mounten (Operator-Fallstudie „könnten wir die auch mounten")

Workspace-Pfade liegen „alle auf dem Host irgendwo" → als Bind-Mount sichtbar machen und den **Node** als Target wählen, Ordner = Host-Pfad des Mounts.
**Nachteil:** dann läuft der Agent Host **auf dem Node**, nicht im Container — die im Container installierten Agent-SDKs (`claude-code_code_server` etc.) werden unsichtbar. Genau das will der Operator laut Prompt 5 nicht. → Variante B ist hier besser.

### 11.5 Entscheidungshilfe

| | A: sshd im Container | B: Node + Dev-Container | C: mounten |
|---|---|---|---|
| Doppeltes SSH | nein | nein | nein |
| Agent-SDKs im Container sichtbar | ✅ | ✅ | ❌ |
| Neues Netz/Headscale im Container | ja | nein | nein |
| Bilder ändern | ja | nein | nein |
| VS-Code-nativ | nein (eigener Weg) | **ja, belegt** | ja |
| SquadMesh-Provider nötig | ja (Fork) | ja (Fork) | ja (Fork) |

**Empfehlung: B als Phase 1** (bewiesen, null Infra-Änderung), A als Phase 3 falls pro-Container-Zugang gesucht wird.

---

## 12. Agent-SDKs + SquadMesh im Container (Prompt 5)

- Die `*_code_server`-Frameworks bedeuten: **der Agent läuft bereits im Container** (Claude Code/opencode/gemini-cli + code-server). Sobald der VS-Code-Agent-Host in diesem Container startet, sieht er dieselben SDKs — **sofern** er sie auflösen kann.
- VS Code löst die SDKs so auf (Smoke-Test-Kommentar): „`product.agentSdks.codex` … or the `VSCODE_AGENT_HOST_CODEX_SDK_ROOT` override" bzw. `node_modules` aus dem Repo. **Für unsere Images heißt das: die SDK-Pfade müssen gesetzt sein** (Env `VSCODE_AGENT_HOST_*_SDK_ROOT` oder `product.json`-Stamp im Fork).
- Customizations liest der Agent Host aus **harness-agnostischen Ordnern** `~/.copilot`, `~/.claude`, `.mcp.json` (workspace) — das sind Ordner, die in unseren Containern ohnehin angelegt werden.
- SquadMesh ist unsere eigene Session-/Chat-Schicht. Ohne Fork existiert nur `chatSessionsProvider` (Session-Einträge) — **nicht** die Provider-Schnittstelle mit `browseActions`/`sendRequest`. SquadMesh als *echter* Provider = **Fork** (Prompt 6).

---

## 13. Fork-Optionen

| | Ziel | Aufwand | Was man bekommt |
|---|---|---|---|
| **A** | **`coder/vscode-coder` forken** (MIT, 739 Commits, 48 Forks) | mittel | Fertiger Remote-Loader: URI-Handler `vscode://coder.coder-remote/open?owner=&workspace=&agent=&folder=&url=&token=`, Sidebar mit Workspace-Browse/Search/Create, Keyring-Auth, Multi-Deployment, „Workspaces start on open", `onResolveRemoteAuthority:ssh-remote` + SSH-Config-ProxyCommand. Umbenennen auf `jimesh.*`, API dagegen tauschen. **benötigt `ms-vscode-remote.remote-ssh` als Dependency** (README-Warnung) |
| **B** | **VS Code forken** (`microsoft/vscode`) | sehr hoch | SquadMesh als `ISessionsProvider`, eigene `browseActions`, eigene Session-Typen, eigene Sidebar in der Agents-Ansicht. Kosten: Agent Host + Sessions-Subsystem mitführen, Upstream-Merges, Marketplace/Open-VSX-Publish, eigener `product.json`-Stamp für `agentSdks` |
| **C** | **code-server forken** (läuft schon bei uns) | mittel–hoch | Beim Nutzer läuft eh unsere code-server-Instanz; dort unsere Ansicht einbauen. Aber: **die Agents-Ansicht ist VS-Code-Desktop-only** — code-server bringt sie derzeit nicht (beobachtet, nicht verifiziert) |

**Folgerung Operator:** „squadmesh müsste da auch integriert werden, also müssten wir das wohl forken" → **ja**, aber **Reihenfolge**: erst A (Extension, funktioniert mit VS-Code-Desktop + Remote-SSH), dann B, wenn SquadMesh tatsächlich *als Provider in der Sessions-Liste* auftauchen soll.

---

## 14. Was wir aus den beiden Testdateien wiederverwenden können (Prompt 2)

### 14.1 `test/smoke/src/areas/agentsWindow/agentsWindow.test.ts` — **sehr verwertbar**

Direkt übernehmbar:

1. **Page-Object-Muster** `test/automation/src/agentsWindow.ts` (1137 Zeilen) — unsere eigene E2E-Suite kann dieselben Selektoren/Befehle benutzen.
2. **`connectSSHHost`/`connectTunnelHost`/`connectWSLHost` + `selectRemoteFolder`** — beweist und automatisiert exakt den Weg, den wir brauchen. Als Blaupause für unseren eigenen Test, nur mit unserem Container-Ziel.
3. **AHP-JSONL-Verifikation** — `chat.agentHost.ahpJsonlLoggingEnabled: true` → `<logsPath>/ahp/*.jsonl`; Asserts auf `'"type":"chat/turnStarted"'`, `'"transport":"devcontainer"'`, `method: 'vscode/devContainers/connect'`, `params.workspaceFolder`. **Das ist unser Nachweis, dass die Session wirklich in unserem Container lief** (nicht im Renderer-Fallback).
4. **Settings-Vorbelegung** in `User/profiles/builtin/agents/settings.json` — Pfad und Reihenfolge übernehmen.
5. **Warm-up-Muster** (`warmUpAgentHostModel`, `warmUpCodexModel`) gegen den Known-Bug „first query erreicht die CLI bevor die Modell-Liste steht" (`github/copilot-agent-runtime#9876`) — sonst sieht unser erster Test wie ein Fehler aus.
6. **`dumpFailureDiagnostics`/`getRemoteConnectionDiagnostics`** — Diagnose-Dump bei Verbindungsfehlern (Elemente, Quick-Inputs, Notifications, Dialoge). Können wir 1:1 klauen.
7. **`createRemoteDevContainerFixture`** — Fixture für ssh/tunnel/wsl + Dev-Container, inkl. `extraEnv`, `settings`, `dumpConnectionDiagnostics`.
8. **Selektoren für unsere eigene Extension-UI**: `.sessions-workspace-picker-trigger > .action-label`, `aria-label="Remote"`, `.action-widget .monaco-list-row.action`.

**Nicht** wiederverwendbar: der Mock-LLM-Server-Teil (Copilot-CAPI-spezifisch).

### 14.2 `src/vs/sessions/test/browser/agentsPartCard.test.ts` — **kaum verwertbar**

487 Zeilen reines **Layout-/DOM-Vertragstest** der `.agents-part-card`:

- `getAgentsPartCardContentSize(width, height, editorPaneVisible, sidebarVisible, phone, compact)` — einziger exportierter Helfer
- Container-Klassen: `.agent-sessions-workbench`, `.nosidebar`, `.noeditorpane`, `.noauxiliarybar`, `.nosessionspart`, `.phone-layout`, `.modern-ui-compact`, `.modern-ui-tabs`, `.modern-ui-connected-editor-tabs`, `.dock-detail-panel`, `.part.sessionspart`
- CSS-Variablen: `--vscode-agents-layout-floatingPanelGap` (4px), `--vscode-cornerRadius-large` (8px), `--vscode-strokeThickness` (1px), `--vscode-spacing-size20/40/60`
- Gemessene Konstanten: leftGap 0/4 px je nach Sidebar/Editor, cornerRadius 8px (compact 0), Session-/Editor-Rahmen `1px`, session corner 7px, Panel-Padding default `4px/2px` → compact `2px/2px`, Panel-Margin 4px → 0

**Nutzung:** nur als **Design-Referenz**, wenn wir unsere eigene Ansicht „genauso wie bei uns, aber in VS Code" (Prompt 1) in der Agents-Ansicht bauen und sie **native aussehen** lassen wollen. Sonst: nichts für uns.

---

## 15. Offene Fragen an den Operator

1. **Ziel zuerst:** soll Phase 1 nur „Ordner in unserem Container öffnen" (Extension, Variante B) sein, oder muss SquadMesh **sofort** als Session-Provider in der Liste auftauchen (→ VS-Code-Fork von Anfang an)?
2. **Git/VsCode-Account (Prompt 1):** der geforderte „Account des Users" existiert für Workspace-Ordner **nicht** — die Agents-Ansicht bindet an lokale/SSH-Ordner, nicht an GitHub-Repos. GitHub-Account ⇒ nur für Copilot-/Cloud-Sessions. Sollen wir stattdessen **JiMesh-Login** (Keycloak) als Auth-Quelle für die Remote-Extension nehmen? Das wäre der ehrliche Ersatz für den Operator-Wunsch.
3. **Wer darf verbinden:** SSH in den Container (Variante A) bräuchte pro Container Keys/Policy. Genügt Variante B über den Node mit bestehender `jimesh-operator`-Policy?
4. **Which Images:** nur der Utility-Container (S170) oder auch alle `*_code_server`-Projekt-Container?
5. **CI-Ignore-Regel** greift hier: es wird kein CI/CD gewünscht — die E2E-Suite aus 14.1 wäre lokal zu laufen.

---

## 16. Verweise

- Sprint-/Backlog-Eintrag: `docs/backlog/BACKLOG.md` § **S187**
- `docs/SSH-ACCESS-ROUTES.md` — alle SSH-Zugangswege + iptables-Allowlist
- `docs/sprints/SPRINT-170-UTILITY-CONTAINER.md` — Utility-Container (supervisord, `/workspace`, code-server)
- `docs/API_DOCS.md:1312-1331` — git-log (Koordinaten-Pflicht)
- Extern: `code.visualstudio.com/docs/agents/concepts/sessions` · `.../concepts/agent-host` · `.../chat/chat-sessions` · `github.com/coder/vscode-coder` (MIT) · `code.visualstudio.com/api/advanced-topics/using-proposed-api`
