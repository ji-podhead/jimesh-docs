# R45 — Plugin-System: Konsens-Dokument für Agent-Consensus

**Status:** 🟡 PROPOSAL — kein Code, kein Merge. Dieses Dokument ist die Diskussionsgrundlage für den Agent-Konsensus (GLM, Claude, Jules). Jeder Agent: Abschnitt für Abschnitt Stellung nehmen, Lücken nennen, Alternativen schlagen. Der Operator schlichtet.
**Datum:** 16.9.2026 · **Autor:** GLM (nach Operator-Brainfart 16.9.)
**Zugehörige Tasks:** baut auf TASK-099 (Secrets-Konsolidierung), TASK-100 (Auth-Settings + Secret-Vererbung), TASK-103/104 (Plugin-Fundament) auf.

---

## 0. Ist-Zustand — was bereits existiert (verifiziert, nicht geraten)

| Baustein | Fundstelle | Status |
|---|---|---|
| Plugin-Katalog-Route | `GET /api/plugins`, `GET/POST /api/plugin-installations` (`gateway/plugins.go`, TASK-103) | Stub — PluginInstallation-Schema existiert, Catalog noch statisch |
| Jules-Plugin | `/api/plugins/jules/{sources,sessions,activities}` + SSE-Events, `JulesSessionsWidget`, `PluginActivationCard`, `jules-events.ts`, `types/domain/plugins.ts` | **das Referenz-Plugin** (echte Oberfläche, echter Event-Stream) |
| App-Types | Domain-Modell kennt AppType: `website` (Embed), `api`, `service`, `tool`, `database` (TASK-087) | Basis für Surface-Typen |
| Secrets-Vererbung | TASK-100 WP5: Workspace→Project→App-Override-Lookup-Kette + Secret-Auswahl-Dialog (vererbt/bestehendes/neues) | **das Auth-Fundament für Plugins** |
| Provider-Credentials | TASK-088: `provider_credentials`-Tabelle (user_id+provider, AES-GCM, Auto-Refresh Google) | OAuth-Token-Lagerung existiert als Konzept |
| Utility-Apps | jimesh_services-Overlay (TASK-091, Sektion ausblendbar) | Vorlage für Plugin-Deployment-Ziel |
| VLAN+gVisor-Isolation | TASK-080: macvlan/ipvlan + gVisor pro Project | **der Security-Wrapper** |
| WAF | TASK-057: Coraza-Sidecar pro Projekt | Teil des Security-Wrappers |
| Browser-Research | `browsers_and_agents.md`, `R12-agent-browser-control.md`, `R43_utlity_browser_playwright.md`, OKF: `browser-automation/agent-browser-control.md` | Rohmaterial, braucht Digest |
| ad1 (Gmail-Referenz) | `docs/login_flow.md` + `email_data_handling.md` im ad1-Repo | **Beweis: Gmail-OAuth geht OHNE GCP-Konsolen-Zwang für den Enduser** |

**ad1-Answer für die Firebase-Frage (§4.2):** ad1 macht plain Google-OAuth-Code-Exchange: Backend hält nur die Client-ID (`GET /api/oauth-config`), Frontend macht den OAuth-Dialog, Backend tauscht `auth_code → access+refresh_token`, Tokens landen per User in der DB. **Kein Firebase-SDK, kein GCP-Console-Aufwand für den User** — dieselben OAuth-Clients (Google/GitHub) kann das Firebase-Projekt `jimesh-71d25` liefern, das wir eh haben. Beide Wege (Firebase-SDK ODER ad1-Pattern) nutzen dasselbe Credential-Format am Ende: access+refresh token.

---

## 1. Plugin-Kandidaten (Eval, priorisiert)

| # | Plugin | Warum | Risiko/Aufwand | Einschätzung |
|---|---|---|---|---|
| **1** | **OpenClaw** | Flagship-Argument: JiMesh hat den Security-Layer, den OpenClaw NICHT hat — OpenClaw als App in JiMesh deployen = gVisor+VLAN+WAF+SIEM um den Agent-Gateway gewrappt. „Bring your own OpenClaw, wir machen ihn sandboxed." | OpenClaw ist schnell iterierend; Deployment-Form (Docker/Compose) muss gesichert werden | ⭐⭐⭐ Start-Plugin: zeigt die These (sicherer Agent-Host) in einem Plugin |
| **2** | **Gmail** | E-Mail-Automation (read/search/send) — ad1 hat die komplette Referenz (OAuth-Flow + Gmail-API-Processing + DB-Schema). Eigener Wert: Plugin = API-Wrapper + Widget + Chat-Surface. | Google-OAuth-Scope-Review (gmail.readonly vs gmail.send vs gmail.compose) | ⭐⭐⭐ ad1-Pattern ist 1:1 übertragbar; Auth via Firebase-Client ODER ad1-Pattern |
| **3** | **Claude Code Connector** | Agent-Ausführung in Workspaces — aber **LIZENZ-KRITISCH**: Anthropic-Commercial-Terms verbieten Bundling/White-Labeling; erlaubt: User bringt eigenen API-Key / eigenes Claude-Code-Login (OAuth). Der Connector orchestriert nur (wie DSH es tut), installiert/bundelt nichts. | Legal-Review VOR Implementierung; ToS-Änderungsrisiko | ⭐⭐ BYO-License-Modell ist machbar, aber als eigenen Task mit Research-Sprint (AGB-Zitate) |
| **4** | **Gemini CLI** | Apache-2.0 — unkritisch, BYO-API-Key | gering | ⭐⭐⭐ easy win |
| **5** | **OpenCode** | MIT, läuft mit -p (Provider-Flag) — BYO-Key | gering | ⭐⭐⭐ easy win |
| **6** | **Docker MCP Hub** | MCP-Server-Katalog (docker mcp gateway/catalog) — Plugin = managed MCP-Registry: JiMesh deployt/MCP-Server aus dem Docker-Hub-Katalog in die Workspace-Isolation; verbindet mit `mcp-server-any-openapi`-Idee aus der Research | Docker-MCP-Tooling-Youngness; API-Stabilität | ⭐⭐ Forschungs-Task nötig (wie stabil ist `docker mcp`?) |
| **7** | **DSH** | Eigenes Dashboard als native Integration (unser eigenes Produkt!) — Referenz für die `native-dashboard`-Surface | keiner | ⭐⭐⭐ gehört als Referenz-Plugin ins Set |
| **8** | **Playwright-Utility-Browser** (R43) | Browser-Automation als Plugin: VNC/Playwright-Session pro Workspace, Agent steuert Browser — gVisor-gesandboxt (Research existiert) | Aufwand mittel | ⭐�⭐ hängt am Browser-Research-Digest (§5) |

**Weitere Kandidaten (ungenannt im Brainfart, für Konsensus):** Tailscale/Headscale (bereits gebaut → als Plugin formalisieren), OpenSearch-Dashboard (iframe — Datalake TASK-105), Langfuse (iframe/api), n8n/Workflow-Automation (iframe+mcp), VS Code/code-server (bereits AppType — Widget+native), Figma-artige Website-Embeds (AppType website — iframe), Zig/Terminal (bestehende terminal-workspaces-Research).

---

## 2. Integrations-Surfaces — die Taxonomie

Jedes Plugin deklariert in seinem Manifest **eine oder mehrere Surfaces**:

| Surface | Was | Beispiel | Aufwand |
|---|---|---|---|
| `iframe` | Externe UI eingebettet (eigene Origin, eigene Auth im iframe) | OpenSearch-Dashboards, Langfuse, n8n | S |
| `native` | **Eigene Dashboard-Integration**: JiMesh-eigene React-View/Komponente, die die Plugin-API konsumiert | DSH-Dashboard (komplett eigenes Panel), JulesSessionsWidget | M–L |
| `widget` | Kleine Karte/Sektion in Workspace-Ansicht | Jules-Aktivitäts-Widget, Gmail-Inbox-Vorschau | S–M |
| `mcp` | Headless Tool-Surface für Agents (MCP-Server des Plugins) | Docker-MCP-Hub, `mcp-server-any-openapi` | M |
| `api` | Backend-Wrapper um externe API (keine UI) | Gmail-API-Wrapper | M |
| `chat` | **Chat-Interface für Agent-Plugins**: Konversations-Surface pro Plugin (bestehender Chat-Drawer im Portal verallgemeinert) | OpenClaw, Claude-Code-Connector, Gemini | M |
| `native + mcp` | Kombi: eigene UI + Agent-Tools | DSH komplett + MCP-Tools | L |

**Die Antwort auf „eigene Integration statt iframe?":** Ja — das ist genau die `native`-Surface. Der Plugin-Renderer entscheidet anhand des Manifests, was rendert wird: iframe-URL, registrierte React-Komponente (Component-Registry per Plugin-ID), Widget-Slot oder Chat. Ein Plugin kann mehrere Surfaces gleichzeitig anbieten (iframe fürs Dashboard, mcp für den Agent, widget für die Übersicht).

**Konsensus-Frage 2a:** Ist ein **Chat-Interface als generische Surface** pro Plugin richtig, oder besser EIN globales Chat-Panel mit Plugin-Kontext-Wechsel? (Ich tendiere: ein Chat-Dashboard, Kontext = ausgewähltes Plugin, analog zum Portal-Assistenten.)

---

## 3. Auth-Modell: API-Keys, Service-Accounts, Secrets, RBAC, Certs

### 3.1 Die Operator-These (ich stelle sie als Design-Entscheidung zur Abstimmung)

1. **User entscheidet pro Plugin**: `api-key` ODER `service-account` ODER `beides` (Plugin-Manifest deklariert, welche Auth-Formen es unterstützt).
2. **Workspace-Ebene default, Project-Override**: Provisionierung auf Workspace-Ebene; Projects können überschreiben (exakt die Lookup-Kette aus TASK-100 WP5).
3. **Service-Account ≠ User**: Ein Service-Account ist ein eigenes Identity-Objekt (Workspace/Project-scoped), das Container/Apps/Plugins **im Namen des** Users agieren lässt — mit eigenem Credentials-Fundus und eigener RBAC.
4. **Container-Certs**: App-Container, die auf Secrets/RBAC-geschützte APIs zugreifen dürfen, bekommen ein **kurzlebiges Cert/Token** (Workload-Identity). Nur ein Container mit Cert für Service-Account X darf Xs Secrets lesen. mTLS zwischen Container und Gateway als Transport.
5. **RBAC zusätzlich auf API-Keys**: Ein API-Key ist NICHT global — jeder Key hat Scopes (welche Secret-Kategorien, welche Plugin-Aktionen: `read|write|admin`). Nicht jeder Container darf auf jedes Secret, selbst wenn der Workspace es besitzt.

### 3.2 Wie sich das eingliedert (kein neues System — Erweiterung)

```
Plugin-Installation (neu)
  └─ auth_mode: api-key | service-account | both      (User wählt)
  └─ scope: workspace (default) → project override     (TASK-100-Kette)
  └─ secrets: referenziert secrets-Tabelle (TASK-099) via secret-scope-binding (NEU)
  └─ service_account_id? → zugehöriger SA (NEU)

Service-Account (NEU)
  └─ parent: workspace|project
  └─ credentials: tokens (Gmail-OAuth à la ad1), api-keys, certs
  └─ rbac: capability-Scopes (read:secrets:db, plugin:gmail:send, …)
  └─ workload-certs: kurzlebig, issued by JiMesh-CA, an Container bei Deploy

API-Key (Erweiterung der consumer_keys)
  └─ + scopes[] (derzeit nur kind) — welchem Secret-Subset der Key dient
```

### 3.3 Konsensus-Fragen (3a–3e)

- **3a:** Cert-Issuing: eigene Mini-CA im Backend (pure Go, stdlib crypto) + 24h-Rotation — oder reicht ein signiertes Workspace-Token statt mTLS? (Ich tendiere: Token zuerst, mTLS als späterer Hardening-Schritt — weniger Moving Parts.)
- **3b:** Darf ein Project-Override **enger** sein als der Workspace-Default, oder nur breiter? (Sicherheit: nur enger erlaubt wäre sauberer — breiter muss explicit opt-in am Workspace sein.)
- **3c:** Service-Account-Provisioning automatisch bei Plugin-Install (der SA wird angelegt, User bindet Credentials) oder explizit vom User erst angelegt?
- **3d:** Wo lebt die Plugin-eigene Security-Policy? Plugin-Manifest-Feld `security: {egress: [], capabilities: []}` das der OPA/Rego-Layer (TASK-070) enforced?
- **3e:** Refresh-Tokens (Gmail): in provider_credentials (TASK-088, AES-GCM) — bestätigen oder in die neue secrets-Tabelle (TASK-099) konsolidieren? (Ich: konsolidieren — 099 ist DIE eine Wahrheit.)

---

## 4. Die ersten drei Plugins im Detail

### 4.1 OpenClaw-Plugin (Flagship — „JiMesh secure-wraps deinen Agent-Host")

- Surfaces: `native` (Deployment-Panel + Agent-Status), `chat`, `mcp` optional
- Auth: BYO — der User bringt seinen LLM-Provider-Key (OpenClaw führt ohnehin eigene Provider-Keys); JiMesh-Auth-Modell gilt für die JiMesh-API, nicht für OpenClaws interne Keys
- Security-Wrap: Deploy als Workspace-App in VLAN+gVisor, Egress-Allowlist nur zu den LLM-Provider-Endpoints, WAF davor, SIEM-Logs (Falco/Wazuh) auf den Container
- Konsensus-Frage 4.1: OpenClaw-Deployment-Form verifizieren (offizielles Docker-Image? Compose? Config-Format?) — Research-Sprint nötig, da OpenClaw sich schnell bewegt

### 4.2 Gmail-Plugin (ad1-Referenz)

- Surfaces: `api` + `widget` (Inbox-Vorschau) + `chat` optional
- Auth: Google-OAuth — zwei legitime Wege:
  - **ad1-Pattern:** OAuth-Code-Exchange im Backend (Client-ID via Settings), `access+refresh_token` pro User in der credentials-Ablage; **kein GCP-Zwang** für den User über die Standard-OAuth-Client-Registrierung hinaus
  - **Firebase:** wir haben das Projekt `jimesh-71d25` — Firebase Auth liefert Google/GitHub-Login; die Gmail-Scopes laufen trotzdem über den klassischen OAuth-Flow (Firebase verkauft da keinen Mehrwert für die Server-Side-Token-Nutzung — Firebase Auth ist primär Session-Auth, nicht API-Token-Delegation)
  - Empfehlung: **ad1-Pattern als Standard** (schlanker, kein SDK), Firebase bleibt für den App-Login (TASK-088)
- Konsensus-Frage 4.2: Scopes-Minimum bestätigen: `gmail.readonly` + `gmail.send`? (compose/full ist zu breit?)

### 4.3 Claude-Code-Connector (Lizenz-Review VOR Code)

- Surfaces: `native` (Session-Panel — wie das Jules-Widget, verallgemeinert) + `chat`
- Lizenz-Lage: nicht kopieren/bundeln — der Connector orchestriert ein vom USER installiertes/angemeldetes Claude Code (OAuth-Session-Reuse) oder spricht mit dem Anthropic-API-Key (BYO). Muss als Research-Sprint zuerst die Commercial-Terms-Extrakte liefern (Zitate ins Task-File).
- Gemini-CLI (Apache-2.0) + OpenCode (MIT) als lizenzfreie Schwestern im selben Connector-Plugin (Agent-Connector-Family: `anthropic|gemini|opencode|jules`)

---

## 5. Browser-Automation: Research-Digest-Auftrag + Artikel

**Bestand:** R12 (agent browser control), R43 (utility browser / Playwright/VNC), browsers_and_agents.md + OKF-Version. **Fehlt:** ein sauberer Digest + der Artikel.

Research-Auftrag (TASK-115): 
1. Playwright vs CDP-direct vs browserless vs VNC+noVNC — wann was, Kosten, Isolation
2. Browser-im-gVisor-Härtung (utility browser als workspace-scoped App:已知 aus R43 — vertiefen: Network-Policy im VLAN, Filesystem-Readonly)
3. MCP-Browser-Tools-Lage (playwright-mcp, browser-use, …) — wie Agents heute Browser steuern
4. Zitations-Bestand: Links, Benchmarks, Lizenz-Tabellen (cheatsheet-artig)

**Artikel (grobes Gerüst):** „Running an Agent-Controlled Browser in a gVisor Sandbox" — Problem (Agent+Browser = Legacy-Angriffsfläche) → Solution (utility browser als isolierte Workspace-App, gesteuert via CDP/Playwright, gehärtet) → Comparison-Table → unseren R43-Proof.

---

## 6. Plugin-Development-SDK — Gap-Analyse: ist das ausreichend für Plugin-Entwickler?

**Antwort: NEIN.** Was existiert: ein Katalog-Stub, das Jules-Referenz-Plugin, das PluginInstallation-Schema, diverse Research-Konzepte (TASK-104 plante Catalog-Expansion + SSE-Standardisierung). **Es fehlt die öffentliche Definition** — ohne die niemand außerhalb JiMesh (und kein Agent konsistent) Plugins bauen kann:

1. **Plugin-Manifest-Spec** (fehlt): id, version, surfaces[], auth-supported[], required-secret-scopes, security-Policy (egress, capabilities), health-check, i18n-Keys, Icon (devicons/react-icons nach TASK-098-WP4)
2. **Lifecycle-Spec** (fehlt): install → enable → configure (Auth!) → run → update → disable → uninstall (inkl. Secret-Cleanup)
3. **Runtime-Contract** (fehlt): wie ein Plugin-Container mit JiMesh spricht — Health, Events (Jules-SSE verallgemeinert: `plugin.events.stream`), Logs → /api/sdk/logs (alias=plugin)
4. **Auth-Connector-Spec** (fehlt): Interface pro Auth-Form (api-key/service-account/oauth-code-exchange à la ad1), Token-Storage, Refresh
5. **Frontend-Surface-Registry** (fehlt): wie ein Plugin eine native Komponente registriert (lazily-imported React-Component per Plugin-ID, Widget-Slots, Chat-Kontext)
6. **Developer-Docs** (fehlt): Quickstart, Referenz-Plugin (Jules) als Template, Beispiel-Manifest, Test-Checkliste

**Konsensus-Frage 6:** Manifest-Format = **Kotlin-Script-frei**: schlicht YAML im Plugin-Repo (`plugin.yaml` à la Helm-Chart/OVS-Collection-Gewohnheit) — einverstanden?

---

## 7. Task-Zerlegung (entkoppelt, für den Konsensus priorisieren)

| Task | Was | Blockiert auf | Aufwand |
|---|---|---|---|
| **TASK-106** | Plugin-Manifest-Spec v1 + Lifecycle-Spec (Docs + Go-Schema + Validation) | — | M |
| **TASK-107** | Plugin-Registry-API: dynamischer Catalog (CRUD), Installations-Flow, Health-Checks | 106 | M |
| **TASK-108** | Auth-Connector-Framework: api-key/service-account/both + OAuth-Code-Exchange-Connector (ad1-Pattern) + Token-Storage via TASK-099-Schema | 099 | M–L |
| **TASK-109** | Secret-Scope-RBAC auf API-Keys + Service-Accounts + Workload-Tokens (3a-Entscheidung) + OPA-Regeln (TASK-070) | 108, 099 | L |
| **TASK-110** | Frontend-Surface-Renderer: iframe/native/widget/chat — Component-Registry + Plugin-Slots | 106 | M–L |
| **TASK-111** | OpenClaw-Plugin (Referenz für managed-agent-deploy) | 106, 107, 110 (+ Research) | M |
| **TASK-112** | Gmail-Plugin (Referenz für api+widget+oauth) | 106, 108 | M |
| **TASK-113** | Agent-Connector-Family: Claude-Code (Lizenz-Review zuerst!), Gemini-CLI, OpenCode | 106, 110 | M–L |
| **TASK-114** | Docker-MCP-Hub-Plugin (Research: `docker mcp`-Stabilität → dann Implementation) | 106, 107 | M |
| **TASK-115** | Browser-Automation-Digest + Artikel (§5) | — | S–M |
| **TASK-116** | Plugin-Developer-Docs + SDK + Jules-Plugin als dokumentiertes Template | 106–110 | M |

**Bewusste Reihenfolge-Empfehlung:** 106 → 108/110 parallel → 107 → 109 → dann die Plugins (111/112/113/114) auf dem Fundament — NICHT Plugin-First, sonst wieder 4 disparate Implementierungen (die Vault-Lektion: TASK-099).

---

## 8. Konsensus-Fragen (nummeriert zum Antworten)

1. **Q1** Surface-Taxonomie komplett? Fehlt eine Surface (z.B. `terminal` als eigene)?
2. **Q2a** Chat: pro Plugin oder ein globales Plugin-Chat-Panel mit Kontext-Wechsel?
3. **Q3a** Workload-Auth: Workspace-Token (simpel) vor mTLS-CA (später) — einverstanden?
4. **Q3b** Project-Override darf nur enger sein — einverstanden?
5. **Q3c** SA-Auto-Provisionierung bei Plugin-Install oder explizit?
6. **Q3d** Plugin-Security-Policy im Manifest, enforced via OPA — einverstanden?
7. **Q3e** Refresh-Tokens in die 099-secrets-Tabelle konsolidieren?
8. **Q4.1** OpenClaw: wer übernimmt den Research-Sprint (Deployment-Form + Config-Format verifizieren)?
9. **Q4.2** Gmail-Scopes: readonly+send als Default?
10. **Q5** Browser-Artikel: eigenständig oder als Teil des Plugin-Artikels?
11. **Q6** plugin.yaml als Manifest-Format?
12. **Q7** Task-Reihenfolge (§7) — wer queued was?
13. **Q8** Claude-Code-Lizenz-Review: wer macht die Terms-Recherche und mit welchem Eskalationspfad bei Unklarheit?
14. **Q9** Gibt es noch Plugin-Kandidaten aus den Repos (leobot? saits-crew?), die auf die Liste (§1) gehören?

---

*Dies ist ein Proposal. NICHTS hieraus wird ohne Konsensus implementiert. Agenten: Antworten als `R45-CONSENSUS-<agent>.md` im gleichen Ordner ablegen, je Frage Zustimmung/Widerspruch/Alternative mit Begründung. Der Operator macht die finale Call-Sheet-Entscheidung.*
