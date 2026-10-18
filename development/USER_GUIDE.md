# JiMesh — User Guide

## Was ist JiMesh?
JiMesh ist ein Go-basierter LLM-Proxy-Gateway mit Orchestrierung, MoE-Agents,
Security (Vault, RBAC), Auto-Discovery und Dashboard. Es macht deinen LLM-Traffic
smarter, sicherer und billiger.

## Schnellstart
```bash
git clone && cd JiMesh
make up                    # Startet PostgreSQL + Redis + Vault + Backend + Frontend
# Backend: localhost:9091 | Frontend: localhost:9090 | Vault: localhost:8200
```

Das läuft komplett lokal auf deiner eigenen Maschine, ganz ohne VPN/Mesh-Networking
— das Mesh wird erst relevant, sobald mehrere **verschiedene** Server miteinander
verbunden werden sollen (siehe unten). Wer JiMesh nur auf dem eigenen Rechner
ausprobieren oder betreiben will, braucht nichts davon.

## Zugriff vom Handy oder von unterwegs — keine eigene JiMesh-App nötig

JiMesh betreibt seinen eigenen, selbstgehosteten VPN-Coordination-Server
([Headscale](https://headscale.net/)) statt des öffentlichen Tailscale-SaaS-Diensts —
Details dazu in `docs/architecture` bzw. den internen Deploy-Diagrammen. Headscale
implementiert exakt dasselbe Protokoll wie Tailscales eigener Server. Das heißt
konkret: **du brauchst KEINE eigene JiMesh-VPN-App für iOS/Android** — die ganz
normale, offizielle [Tailscale-App](https://tailscale.com/download) (iOS, Android,
macOS, Windows, Linux) funktioniert bereits als Client für unseren
selbstgehosteten Server:

1. Tailscale-App installieren (App Store / Play Store / offizielle Website).
2. In den Einstellungen den **"Custom Login Server" / "Use an alternate
   coordination server"** aktivieren.
3. Dort die URL unseres Headscale-Servers eintragen (vom Operator zu erfragen —
   entspricht `HEADSCALE_URL` im Deploy).
4. Mit dem vom Operator bereitgestellten Pre-Auth-Key anmelden.

Danach ist das Handy Teil desselben privaten Netzwerks wie die Server — das
Dashboard (`http://<mesh-ip>:<port>/`) ist dann direkt im Handy-Browser erreichbar,
exakt wie von einem Desktop aus. Es gibt keinen separaten "JiMesh Mobile"-Client,
weil keiner nötig ist: das Dashboard ist eine normale Web-App, der Netzwerkzugriff
kommt von der Standard-Tailscale-App.

## Kernfunktionen

### 1. Proxy & Routing
- `/v1/chat/completions` — OpenAI-kompatibler Proxy mit Failover-Chains
- Entropy Routing: misst Shannon-Entropie auf logprobs → eskaliert bei Unsicherheit
- `GET /v1/models` — listet Chains als Model-IDs
- `GET /v1/mesh/models` — Chain-Metadaten (nodes, members, type)

### 2. Orchestrierung & MoE
- `POST /api/orchestrate` — SSE-Stream: gating → experts parallel/sequential → synthesis
- `POST /api/experts/execute` — MoE-Pipeline: gating agent wählt experts → LLM synthesis
- `GET /api/experts` — Expert Registry (3 seeds: Coder, Reviewer, Researcher)

### 3. Security & Vault
- HashiCorp Vault (port 8200) — Zero-Trust Secret Management
- Agents NIE direkten Zugriff auf Secrets → Gateway injiziert Just-in-Time
- `POST /api/vault/access` — einziger Weg für Agents, Secrets zu erhalten
- AES-GCM-256 Fallback (PostgreSQL) wenn Vault unavailable
- `GET /api/security/audit` — Security Score + Issues

### 4. RBAC & Budgets
- `POST /api/budgets` — User/Agent Budget pro Projekt
- `POST /api/budgets/check` — Proxy prüft vor jedem LLM-Call
- 402 wenn Budget erschöpft, 403 wenn kein Zugriff
- Teams: `POST /api/teams` — Organisation mit monatlichem Budget
- Rollen: admin, manager, developer, sub_agent

### 5. Auto-Discovery & Ontology
- `POST /api/discovery/scan` — `docker ps` via SSH → auto-register
- `GET /api/ontology?port=5432` — deterministisches Port→Icon→Category Mapping (0ms)
- 40+ Technologien gemappt (PostgreSQL, Redis, DSH, Adminer, etc.)
- Smart Sidecars: PostgreSQL erkannt → "⚡ Launch Adminer" Button

### 6. Traffic & Monitoring
- `GET /api/traffic` — Live-Traffic pro Edge (rps, error rate, latency)
- `GET /api/traffic/stream` — SSE-Stream (2s Updates)
- `GET /api/projects/{id}/ports` — Port-Scan via SSH
- `GET /api/projects/{id}/monitoring` — SSE: CPU, Memory, Disk, Docker Stats

### 7. Model Enrichment
- `POST /api/models/{id}/enrich` — OpenRouter → Artificial Analysis → SearXNG
- Fuzzy Dedup: gleiche Modelle teilen Metadaten

### 8. Agent Bridge (Self-Provisioning)
- `POST /api/bridge/provision` — Agent deployt sich selbst Infrastruktur
  - Body: `{ projectId, userId, serviceType: "postgres" }`
  - Bridge: RBAC check → Docker spawn → Vault credential → MCP hot-reload
  - Returns: `{ containerId, toolName, status, costUsd, port }`
- `GET /api/bridge/stream?runId=X` — SSE Live-Progress (rbac→docker→vault→mcp)
- `GET /api/bridge/openapi.json` — OpenAPI 3.0 Spec für LLM Function Calling
- `GET /api/bridge/tools` — alle dynamisch registrierten Tools auflisten
- Agent sieht NIE Credentials — Bridge injiziert aus Vault Just-in-Time

## 9. WAF pro Deployment (Sprint 31 / TASK-057)
Ein Projekt-Deployment kann per Opt-in eine **Web Application Firewall**
bekommen: einen Coraza/Caddy-Container (`jimesh-waf-<projId>`, Apache-2.0,
CGO-frei), der sich zwischen den Zugangsweg (SSH-Tunnel /
`/api/projects/{id}/tunnel/{port}`) und den App-Container schiebt und jede
HTTP-Anfrage gegen die **OWASP Core Rule Set v4** prüft, bevor die App sie
sieht.

**Einschalten** — Feld `waf: true` im Deploy-Request
(`POST /api/projects/deploy` / `redeploy`):
```json
{ "projId": "myproj", "framework": "dsh", "port": 3080,
  "nodeHost": "...", "nodeUser": "...", "waf": true }
```

**Was dann passiert (Port-Umkehr):**
- Der App-Container publiziert weiter KEINEN Host-Port (Zero-Port seit
  Sprint 30/TASK-030) — unverändert.
- Der WAF-Container joint das Projekt-Docker-Netz, bindet
  `127.0.0.1:<port>` auf dem Host (Mandat 12 bleibt exakt erfüllt, nur eine
  Schicht weiter außen) und proxied intern per Docker-DNS zum
  App-Container.
- SSH-Tunnel und Tunnel-Route landen automatisch auf der WAF: das Deploy
  meldet die Container-IP des WAF als interne IP.
- `docker ps` zeigt `jimesh-waf-<projId>` im selben Netz wie Workspace-
  und Socket-Guard-Container; Undeploy räumt ihn mit auf.

**Was geblockt wird** (live verifiziert, CRS 4.25.0, Paranoia-Level 1,
Blocking-Mode): SQL-Injection (`' OR '1'='1` → 403, Regel 942er-Serie),
XSS (`<script>alert(1)</script>` → 403, Regeln 941100/941110/941160 +
Blocking-Evaluation 949110), RCE, LFI/RFI, Protokoll-Anomalien,
Scanner-Signaturen. Der 403 kommt von Coraza — die App sieht den Request
gar nicht. Der sidecar ist klein (distroless, nonroot, ein statisches
Binary; CRS ist ins Binary einkompiliert — keine Rule-Dateien, keine DB).

**Was die WAF NICHT ersetzt:** die Authentifizierung der App selbst, TLS
im Projektnetz, und das Fronten der vnc/code-server-Ports (v1 frontet nur
`port`). Ein legitimer Request geht ungehindert durch (verifiziert:
200-Antwort der App durch die WAF hindurch).

**Grenzen / Ehrlichkeit:** Opt-in ist absichtlich NICHT default (E-W2:
explizit zuerst). Ohne `waf` verhält sich der Deploy exakt wie vorher.
`waf: true` wird mit 400 abgelehnt für das `jimesh`-Compose-Framework
(kein einzelner Workspace-Container), ohne `port`, oder bei networkMode
`host`/`none` (kein Docker-DNS). Redeploy ohne `waf` entfernt einen alten
Sidecar; das Flag wird nicht persistiert — der laufende Container ist die
Wahrheit. Per-Deploy über SSH gestreamte Images (`docker save | ssh
docker load`) wie beim Socket-Guard.

## Environment Variables
| Variable | Default | Beschreibung |
|---|---|---|
| `JIMESH_ENCRYPTION_KEY` | (empty=dev mode) | 32-byte hex für AES-GCM-256 |
| `VAULT_ADDR` | `http://vault:8200` | HashiCorp Vault URL |
| `VAULT_TOKEN` | kein Default mehr (`<REDACTED-VAULT-ROOT-TOKEN>`) | Vault Root Token — MUSS gesetzt werden; ohne Token failt jede Vault-Op laut (SPRINT-161, fail-closed) |

## Settings (DB)
| Key | Default | Beschreibung |
|---|---|---|
| `entropy_routing.enabled` | false | Entropy Routing aktivieren |
| `entropy_routing.threshold` | 0.45 | Eskalations-Schwellenwert |
| `max_cost_per_run_usd` | 0.50 | Max Kosten pro Orchestrierung/Expert-Run |
| `ssh_host` | (empty) | SSH Host für Tunnel/Discovery |
| `ssh_user` | (empty) | SSH User |
| `ssh_password` | (empty) | SSH Password |
| `openrouter_api_key` | (empty) | OpenRouter API Key |
| `searxng_url` | http://searxng:8080 | SearXNG Instance |

## Docker Services
| Service | Port | Beschreibung |
|---|---|---|
| jimesh (backend) | 9091 (→3010) | Go Proxy Gateway |
| frontend | 9090 (→5173) | Next.js Dashboard |
| postgres | 5432 | PostgreSQL (pgx) |
| redis | 6385 (→6379) | Redis Streams |
| vault | 8200 | HashiCorp Vault (dev mode) |
