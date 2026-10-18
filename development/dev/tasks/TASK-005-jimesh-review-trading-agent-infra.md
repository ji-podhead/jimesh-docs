# TASK-005 — jimesh-Review: Trading & Agent-Infrastruktur

> **Status:** ✅ erledigt (6.9.2026) · **Speist:** `docs/research/R20-jimesh-reuse-review.md` §Ergebnisse, Epic 15
> **Repos:** `/home/ji/projects/jimesh-mirror/` → `st-2` (3103 Dateien, 86 MB — SELEKTIV!), `jimesh-crew` (324)
> **Ziel-Mapping:** JiMesh Deploy-Engine (Sprint 15/18) · Epic 14 (DB/CDC) · Workspace-Stacks · K-LAF-Bedrohungsmodell (Trading-Agents als Zielsystem)

## Auftrag

- [x] Compose-Stack-Struktur (AI/engine/frontend/live): Services, Health-Checks, Restart-Policies, Volume-Strategien, Netzwerke → was sollte JiMesh' E2E-Deploy-Engine daraus übernehmen?
- [x] Crew-Agents: wie definiert/getriggert (Discord-getrieben?), Messaging-Muster, State-Handling
- [x] Multi-Node-Deployment-Mechanik in `jimesh-crew`: Verteilung, Koordinierung, Secrets-Handling in den Stacks
- [x] DB-Sync/CDC/Redis-SSoT-Patterns suchen (Epic 14), mit Pfad
- [x] Legacy-Schulden in `st-2` dokumentieren: was bewusst NICHT portieren und warum (ehrliches Bild, keine Kopierempfehlung ohne Begründung)

## Regeln

Globale Regeln + Ergebnis-Format: `docs/tasks/README.md`.
**st-2-Sonderregel:** nur `find -maxdepth 2`, READMEs, docker-compose*-Dateien,
lcore-Skelett, Crew-Definitionen — keine Modul-Tiefe, keine Einzeldatei-Analyse
in den 3103 Dateien.

## Ergebnis

### Quelle (Repo-Kopf)

* **st-2** — 3103 Dateien, 86 MB, 14 Verzeichnisse; Arbeits-Repo mit Wildwuchs im Root (s. Legacy). Gelesen per Sonderregel: Agent-Definitionen, Topology, Trigger, DATA_FLOW, Deploy-Profile, lcore-Skelett (RBAC-Zwilling bestätigt).
* **jimesh-crew** — 324 Dateien; der saits-crew-Stack (Claude-Crew-Infrastruktur) — vollständig gelesen (Kern: compose, Agent-Meta-Schema, Trigger, Dashboard-Gate, Bootstrap).

### 1. Compose-Stack-Struktur (Auftrag 1)

* **Deploy-Profile statt Einheits-Compose:** `st-2/deploy/deployment/profiles/{controller,demo,mainnet-main,mainnet-sub1}` — ein Profile-Verzeichnis pro Deployment-Form, dazu `infra/log-stream-guard`. JiMesh-Deploy-Engine (Sprint 15/18) generiert ohnehin Templates — Profile als Benennungs- und Trennkonvention übernehmen.
* **jimesh-crew: ein Stack, klar geschichtet:** Data-Layer (surrealdb 8082 rocksdb, redis 6382), Services (crew-api 8104, scheduling 8100, issue-curator 8101, roadmap 8102, **mandates 8103**, timeline 8105, trigger-engine, gateway-watchdog), Agents (crew1–7 + VNC 6090–6096), Dashboard (3010). Durchgehend Health-Checks + Restart-Policies + **localhost-Binds** (`127.0.0.1:8104`) — Mandat 12 wird hier schon praktiziert.
* **Service-Topology als YAML-Anchors:** `st-2/config/topology.yml` definiert Services einmal (host/port/**health**-Pfad) pro Umgebung (ai_mainnet 9000 / ai_demo 8000, exchange 8010/8000, stats 8006/8007, logs 8005/8003) und referenziert sie per Anker — Topology-als-Config mit Health-Endpoints, direkt auf JiMesh' Service-Discovery/Topology übertragbar.

### 2. Crew-Agents: Definition & Trigger (Auftrag 2)

* **Agent-Registry als deklaratives YAML (Single Source of Truth):** `st-2/config/agent_definitions.yml` — pro Agent: `agent_id`, `container`, `role_type` (decision_maker/monitor/coordinator), `always_on`, **`escalation_target` + `escalated_from`** (Eskalationsketten: ra→rm→supervisor), Tools-Liste, `log_tags`, `kb_knowledge_tab`, `prompt_context`. Wird in die KB ingestiert, damit Agenten per `search_engine_knowledge` antworten können, was andere Agenten tun — Sprint 17/18 Agent-Tool-Registry + Sprint 17/18 Eskalation als Vorlage.
* **Formales Meta-Schema mit Lifecycle:** `jimesh-crew/config/agents/_definitions.yml` — required (agent_id/name/description/tools/escalation/tags/log_types), optional (**version semver, status active|deprecated|planned, owner crew1–7**, emoji, depends_on, kb_collections, endpoints); Tools mit args/returns/tags. Konkretes Beispiel `trader.yml` (owner crew6, depends_on, kb_collections leer). Das Schema ist strenger als st-2s Freeform — Registry-Blupause für Sprint 17/18.
* **Trigger-Engine deklarativ:** `config/triggers/crew-automation.yaml` — `trigger` (cron) + `condition` (count auf Tabelle mit Filter + threshold) + `action` (message_agent mit Template). Aktiv per Default: stale-PR-Zuweisung (*/15 min), stale-Issue-Alerts (6 h), Critical-Issue-Watch. Das ist die deklarative Version der 8 handgepflegten Server-Crons des Operators — Aufwand S (Go-Service oder gateway-Cron-Loop + YAML-Config).
* **Discord via MCP intern:** jedes Claude-Container läuft Discord über ein MCP-Plugin selbst — keine eigenen discord-*-Container. Für JiMesh: Discord bleibt optionaler Sink (TASK-003-Muster), nicht Kern.

### 3. Multi-Node & Secrets (Auftrag 3)

* **Zwei-Server-Setup in st-2:** Trading (Engine/DuckDB/Stats) + Rescue (Frontend/AI/nginx-Routing) — Verteilung über nginx-Routen (`/live/*` → saits-live-ai:9000, `/live/analytics/*` → 8007). jimesh-crew ist bewusst single-node localhost — JiMesh-Mandat 12-konform.
* **Dashboard-Secret-Gate (WP0-Login-Muster!):** `jimesh-crew/dashboard/middleware.ts` — ohne `DASHBOARD_SECRET` ist Auth disabled (`NextResponse.next()`), mit Secret: Session-Cookie-Verifikation + `/login`-Redirect. Dazu `scripts/bootstrap.sh`: Prerequisites, Config-Kopie, Env-Validierung, Compose-Up, **Health-Wait**, Dashboard-URL. Auth-on-when-configured + Auto-Bootstrap — das minimal-invasive WP0-Login. Ehrliche Kante: Secret-Optional ist auch die Wurzel des WP0-Problems (fehlt er, ist offen) — für JiMesh: Secret-Pflicht statt Optional erwägen.
* **Docker-Socket-Proxy statt docker.sock direkt:** `docker-socket-proxy` (tecnativa) mit restriktiver Allowlist — nur `CONTAINERS/EXEC/POST`, Images/Build/Networks/Volumes/Delete aus. JiMesh-crew-api/Container-Steuerung analog über SSH + Docker-API (JiMesh-Weg); falls lokaler Zugriff nötig, ist Socket-Proxy das sichere Muster.

### 4. DB-Sync/CDC (Auftrag 4)

* **Negativbefund:** kein DB-Discovery/CDC/Redis-SSoT in st-2 oder jimesh-crew (5. Gruppe der Suche) — Epic 14 bleibt ohne saits-Vorlage.
* **Verwandtes Muster — Dual-Stack-Isolation:** `st-2/docs/DATA_FLOW.md` — Demo vs. Mainnet **vollständig getrennt** (eigene Redis 6382/mainnet-Redis, eigene DuckDBs, eigene Container/Ports, nginx-Routen); auf Mainnet `MAIN_DB_READ_ONLY=true` — Analytics liest **nie direkt DuckDB**, sondern nur über die Engine-HTTP-API (per-symbol `sym_*.duckdb` für Fills, Sessions-DuckDB für Budgets). Das ist dem Epic-14-Gedanke (SSoT, Read-Only-Analytics) am nächsten: Read-Only-Analytics über HTTP-API statt direkter DB-Zugriffe.

### 5. Legacy-Schulden st-2 (Auftrag 5) — was NICHT portieren

* **Root-Wildwuchs:** `10_days_commits.txt`, `altfins_expert_data.json`, `discordhistory copy.md`, `.claude/` eingecheckt — Arbeitsverzeichnis statt sauberem Repo; JiMesh-Doktrin: Repo bleibt Code+Docs+Deploy.
* **DASHBOARD_SECRET optional** (Auth disabled wenn fehlt) — mächtig, aber WP0-Wurzel; JiMesh: Pflicht-Secret + Bootstrap-Auto-Generierung.
* **VNC 6090–6096 ohne Auth** — Sprint-19-Erbe; JiMesh-noVNC hat dasselbe Problem (WP0-KRITISCH) — Muster nicht übernehmen, Fix läuft in Sprint 19/20.
* **Trading-Domänen-Code** (engine/exchange/screener/trading tiers) — Domänen-Code, nur Muster; K-LAF-Perspektive: Trading-Agents sind Zielsystem (Session-Store, Presets, Budgets), nicht Portierungsobjekt.
* **Echte Infra-IPs** (100.107.15.10, 88.198.67.200) in README/Docs — wie opnsense.tf (TASK-002).
* `DAP_VISION.md` im Bestand (`st-2/docs/`) — Konzept ist jetzt in R21 dokumentiert, Verweis statt Kopie.

### Cross-refs (Reusable)

| Finding | Fundstelle | JiMesh-Ort | Aufwand | Begründung |
|---|---|---|---|---|
| Agent-Registry als YAML (Rollen, Eskalationsketten, KB-Tab) | `st-2/config/agent_definitions.yml` | Sprint 17/18 WP4 | S | Deklarativ + KB-lesbar statt handgepflegter Agent-Liste |
| Agent-Meta-Schema mit Lifecycle (status/semver/owner) | `jimesh-crew/config/agents/_definitions.yml` | Sprint 17/18 WP4 | S | Strenger als st-2s Freeform — Registry-Schema |
| Trigger-Engine deklarativ (cron+condition+action) | `jimesh-crew/config/triggers/crew-automation.yaml`, `st-2/config/triggers/` | JiMesh-Automation (Server-Crons) | S | Ersetzt 8 handgepflegte Crons, message_agent-Templates |
| Dashboard-Secret-Gate + bootstrap-Auto-Secret | `jimesh-crew/dashboard/middleware.ts`, `scripts/bootstrap.sh` | **WP0-Login** | S | Auth-on-when-configured; JiMesh: Secret-Pflicht erwägen |
| Docker-Socket-Proxy (restricted allowlist) | `jimesh-crew/docker-compose.yml` | crew-api/Container-Steuerung, WP-Sicherheit | S | Sicheres Muster falls lokaler Docker-Zugriff nötig |
| Dual-Stack-Isolation + READ_ONLY-Analytics | `st-2/docs/DATA_FLOW.md` | Deploy-Engine (Demo/Live), Epic 14 | S | Getrennte Stacks + Analytics via HTTP-API statt direkter DB |
| Service-Topology als YAML-Anchors (host/port/health) | `st-2/config/topology.yml` | Topology/Service-Discovery | S | Health-Endpoints pro Umgebung |
| localhost-Binds durchgehend | `jimesh-crew/docker-compose.yml` | Mandat 12 | – | bestätigt JiMesh-Praxis (die Crew lebt sie schon) |
| Deploy-Profile pro Deployment-Form | `st-2/deploy/deployment/profiles/` | Sprint 15/18 Deploy-Engine | S | controller/demo/mainnet-main/sub1 als Trennkonvention |

### Offene Fragen

1. **WP0-Login:** übernimmt JiMesh das Gate-Muster (Session-Cookie + `/login`-Redirect) im Go-Gateway — und wird `DASHBOARD_SECRET` **Pflicht** statt Optional (mit Bootstrap-Auto-Generierung)?
2. **Trigger-Engine:** ersetzt die deklarative Trigger-Tabelle die 8 Server-Crons? Aufwand S — Go-Service oder gateway-Cron-Loop + YAML-Config;Priorisierung gegen WP0–WP5?
3. **Docker-Zugriff:** bleibt Container-Steuerung über SSH + Docker-API (JiMesh-Weg) oder kommt lokal ein Socket-Proxy dazu (crew-api-Analogie)?
4. **Agent-Registry:** übernimmt Sprint 17/18 das jimesh-crew-Meta-Schema (status/semver/owner/depends_on) für Agent-Definitionen — und wo landen die YAMLs (Repo `config/` vs. DB)?
