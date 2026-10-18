# JiMesh Architektur- & Struktur-Design (6.9.2026)

> **Status:** Entwurf — zum Abgleich mit Claudes laufender Refactoring
> **Worktree:** `task/architecture-docs` · **Ziel:** saubere Klassen, API-Gruppen, Schemas, Doku-Struktur
> **Operator-Wunsch:** „nicht so slop llm scheiße sondern richtige Bilder SVGs, flow charts, ordentliche READMEs, self-explanatory Struktur"

---

## 1. Go-Package-Struktur (Zielbild)

### Ist (12 Packages, gateway ist ein Monolith mit 38 Dateien)

```
src/backend/internal/
├── gateway/          ← 38 Dateien, 4000+ Zeilen, ALLES drin
├── keypool/
├── metadata/
├── network/
├── quota/
├── router/
├── service/
├── store/
├── streams/
└── tracing/
```

### Soll (Claude hat schon angefangen — canvas/, meshedge/, httpx/ sind unterwegs)

```
src/backend/internal/
├── gateway/              # Nur noch: Routing-Setup + Server-Lifecycle
│   ├── canvas/           # Chain-Graph, Nodes, Edges (Claude: läuft)
│   ├── meshedge/         # Mesh-Kanten-Verwaltung (Claude: läuft)
│   ├── auth/             # Dashboard-Auth (Login, Setup, Sessions)
│   ├── identity/         # K-LAF Identitätskette (WP1: AgentSession, Tokens)
│   ├── deploy/           # Deploy-Engine (executeDeploy, Provisioning, Egress)
│   ├── security/         # K-LAF Scanner, Freeze, Exposure, Firewall
│   ├── analytics/        # Cost, Traffic, Model-Perf, Analytics
│   ├── keys/             # KeyPool-CRUD, Custom-Provider, Cooldowns
│   ├── projects/         # Project-Registry, Ports, SSH-Config, Monitoring
│   ├── backups/          # Backup-Schedule, Restore, Tables
│   └── ...               # Weitere nach Bedarf
├── httpx/                # HTTP-Utilities (Claude: läuft)
├── keypool/
├── metadata/             # Ontology, IANA, App-Categories
├── network/             # Port-Detection, Hostkey, Egress, Tunnel
├── quota/
├── router/
├── service/
├── store/               # SQL-Layer (nur CRUD, keine Business-Logik)
├── streams/             # SSE, Redis-Streams, Log-Streaming
└── tracing/
```

**Regel:** Jedes Sub-Package im `gateway/` hat:
- Eigene `handler.go` (HTTP-Handler)
- Eigene `types.go` (Request/Response-Structs mit JSON-Tags + Doc-Comments)
- Eigene `routes.go` (registriert nur SEINE Routen)
- Kein Import von anderen gateway-Sub-Packages (flache Hierarchie)

---

## 2. Base-Klassen & Vererbung (Go-Interfaces)

### 2.1 Handler-Interface-Hierarchie

```go
// internal/httpx/handler.go — Basis für ALLE Handler
type Handler interface {
    Routes() []Route           // Welche Pfade registriert dieser Handler?
}

type Route struct {
    Method  string             // "GET", "POST", ...
    Pattern string             // "/api/projects/{id}/ports"
    Handler http.HandlerFunc
    Group   string             // "projects", "security", ...
    Desc    string             // Für API-Doc-Generierung
    Auth    AuthLevel          // AuthNone, AuthSession, AuthOperator
}
```

### 2.2 Service-Interface (Business-Logik)

```go
// internal/service/service.go — Basis für alle Services
type Service interface {
    Name() string              // Für DI-Registry und Doku
    Dependencies() []string   // Für Dependency-Graph
}

// Beispiel-Projektion:
type ProjectService interface {
    Service
    List(ctx context.Context) ([]store.ProjectRow, error)
    Get(ctx context.Context, id string) (*store.ProjectRow, error)
    Deploy(ctx context.Context, id string, opts DeployOptions) (*DeploymentResult, error)
    ...
}
```

### 2.3 Store-Interface (Persistenz)

```go
// internal/store/store.go — Basis für alle Store-Methoden
type Store interface {
    // ... bestehende Methoden (schon vorhanden)
    // NEU: Jede Methode bekommt einen Doc-Comment für die Doku-Generierung
    // NEU: Jede Query-Antwort ist ein typisiertes Row-Struct mit JSON-Tags
}
```

---

## 3. SQL-Schemas (aktualisiert, mit Beziehungen)

```sql
-- ═══════════════════════════════════════════════════════════════
-- SCHEMA: JiMesh (PostgreSQL, pgx v5)
-- ═══════════════════════════════════════════════════════════════

-- ── Identitätskette (WP1 / K-LAF) ──────────────────────────────
CREATE TABLE agent_sessions (
    id                 TEXT PRIMARY KEY,        -- ULID
    container_id       TEXT DEFAULT '',          -- Docker-Container-ID
    parent_session_id  TEXT DEFAULT '',          -- Sub-Agent-Baum
    project_id         TEXT DEFAULT '',          -- Zugehöriges Projekt
    status             TEXT DEFAULT 'active',    -- active|frozen|released|expired
    trust_class        TEXT DEFAULT 'provisioned', -- provisioned|discovered
    created_at         TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE vault_tokens (
    id          TEXT PRIMARY KEY,
    secret_name TEXT NOT NULL,
    agent_id    TEXT NOT NULL,                    -- = agent_sessions.id
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);

-- ── Security (K-LAF) ───────────────────────────────────────────
CREATE TABLE security_events (
    id          TEXT PRIMARY KEY,
    session_id  TEXT,                              -- FK agent_sessions
    container_id TEXT,
    classification TEXT NOT NULL,                 -- injection|exfiltration|...
    verdict     TEXT NOT NULL,                     -- allow|warn|block
    status      TEXT DEFAULT 'active',            -- active|frozen|released
    frozen_by   TEXT,                             -- E4: Mehrbenutzer
    released_by TEXT,                             -- E4: Mehrbenutzer
    payload_ref TEXT,                             -- E3: redigierter Payload
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE SET NULL
);

-- ── Projekte & Deployments ─────────────────────────────────────
-- (projects, deployments: bestehende Tabellen, unverändert)

-- ── Teams & RBAC (E4: Mehrbenutzer ab Sprint 20) ─────────────
CREATE TABLE teams (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL UNIQUE,
    max_monthly_budget_usd REAL DEFAULT 0,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
    team_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    role       TEXT DEFAULT 'member',             -- admin|member|viewer
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE project_user_budgets (
    project_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    max_budget_usd  REAL DEFAULT 0,
    spent_budget_usd REAL DEFAULT 0,
    enabled         BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## 4. API-Gruppen & Endpoint-Struktur

### 4.1 Ziel-Gruppen (aus der aktuellen Verteilung abgeleitet)

| Gruppe | Beschreibung | Route-Präfix | Auth-Level | Beispiel-Endpoints |
|---|---|---|---|---|
| **Proxy (v1)** | LLM-Proxy (OpenAI-kompatibel) | `/v1/*` | API-Key (opt-in) | `/v1/chat/completions`, `/v1/models`, `/v1/embeddings` |
| **Projects** | Projekt-Verwaltung + Deploy | `/api/projects/*` | Session | `deploy`, `ports`, `monitoring`, `tunnel` |
| **Security** | K-LAF: Exposure, Freeze, Scanner | `/api/security/*` | Session | `exposure`, `audit`, `freeze`, `release` |
| **Keys** | Provider-Key-Verwaltung | `/api/keys/*` | Session | CRUD, cooldowns, custom, reveal |
| **Models** | Modell-Katalog + Enrichment | `/api/models/*` | Session | CRUD, enrich, enrichment, roles |
| **Analytics** | Kosten, Traffic, Performance | `/api/analytics/*` | Session | `by-key`, `by-model`, `cost/*`, `traffic/*` |
| **Vault** | Secret-Verwaltung | `/api/vault/*` | Session | `secrets`, `tokens`, `audit` |
| **Backups** | Backup & Restore | `/api/backups/*` | Session | CRUD, schedule, restore |
| **Bridge** | Agent-Bridge (Sprint 17/18) | `/api/bridge/*` | Session | `provision`, `stream`, `tools` |
| **Discovery** | Auto-Discovery | `/api/discovery/*` | Session | `scan`, `events`, `status` |
| **Auth** | Dashboard-Login | `/api/auth/*` | None | `login`, `setup`, `status` |
| **Health** | Probes | `/api/health/*`, `/health`, `/ready` | None | `check`, `providers`, `uptime` |
| **Settings** | Konfiguration | `/api/settings/*` | Session | `api-key`, `proxy/test`, `url-tokens` |
| **Misc** | Ontology, IANA, Profiles, etc. | `/api/*` | Session | `ontology`, `iana`, `dedup`, `export` |

### 4.2 API-Doku-Generierung

**Prinzip:** Doc-Comments im Go-Code → OpenAPI-Spec → HTML (Redoc/Swagger) + Markdown

```go
// handleProjectsDeploy deployt ein Projekt per SSH auf den Zielhost.
//
//   POST /api/projects/deploy
//   Auth: Session
//   Body:  {"projectId": "string", "host": "string", "port": int, ...}
//   Response: 200 {"success": true, "deploymentId": "string", ...}
//            | 400 {"error": "missing host"}
//            | 500 {"error": "SSH connection failed"}
//   Description: Erstellt einen Docker-Container auf dem Zielhost,
//                injiziert Vault-Credentials und richtet Egress-Allowlist ein.
func (s *Server) handleProjectsDeploy(w http.ResponseWriter, r *http.Request) {
```

→ Generator (z.B. `swaggo/swag` oder eigenes Tool) parst die Comments und generiert:
1. `docs/api/openapi.yaml` — maschinenlesbare Spec
2. `docs/api/index.html` — Redoc-UI (GitHub Pages tauglich)
3. `API_DOCS.md` — aus der Spec generiert (immer synchron)

---

## 5. Doku-Struktur

```
docs/
├── api/                    # API-Dokumentation
│   ├── openapi.yaml       # Generierte Spec
│   ├── index.html         # Redoc-UI (GitHub Pages)
│   └── postman_collection.json
├── user/                  # User-Guide (step-by-step)
│   ├── getting-started/
│   │   ├── 01-installation.md       # Docker Compose Setup
│   │   ├── 02-first-login.md        # Setup-Wall, erster Login
│   │   ├── 03-first-project.md      # Projekt anlegen + deployen
│   │   └── 04-first-key.md          # Provider-Key hinzufügen
│   ├── guides/
│   │   ├── proxy-routing.md         # Wie Routing funktioniert
│   │   ├── security.md              # K-LAF, Freeze, Exposure
│   │   ├── deployments.md           # SSH-Deploy-Engine
│   │   └── agent-bridge.md          # Agent-Integration
│   └── flows/                       # HTML-Flow-Charts (Mermaid)
│       ├── request-flow.html        # Wie ein LLM-Request fließt
│       ├── deploy-flow.html         # Deploy von Klick bis Container
│       └── security-flow.html       # Threat-Detection-Pipeline
├── reference/              # Tiefen-Referenz
│   ├── ARCHITECTURE.md
│   ├── K-LAF-ARCHITECTURE.md
│   ├── DATA-SCHEMA.md
│   └── PACKAGES.md
├── assets/
│   ├── diagrams/          # SVG-Quellen (draw.io, excalidraw)
│   │   ├── architecture.svg
│   │   ├── connectors.svg # Provider-Logos
│   │   └── stack.svg      # Tech-Stack-Visualisierung
│   └── screenshots/
└── legal/                  # (bestehend, unverändert)
```

---

## 6. README-Konzept

```markdown
# JiMesh
<div align="center">
  <!-- Badges: CI, License, Go Version, Docker Pulls, Discord -->
  <img src="docs/assets/diagrams/logo.svg" width="200"/>
</div>

## Was ist JiMesh?
[2-Satz-Pitch + 30-Sek-Video-GIF]

## Quick Start
```bash
git clone ... && cd jimesh
docker compose up -d
# → http://localhost:19090
```

## Supported Providers
[Grid mit SVG-Logos: OpenAI, Anthropic, Google, Groq, ...]

## Architecture
[Embedded SVG: architecture.svg]

## Features
[Feature-Grid mit Icons, je 1 Zeile + Link zur Doku]

## Documentation
- [Getting Started](docs/user/getting-started/01-installation.md)
- [API Reference](docs/api/index.html)
- [Architecture](docs/reference/ARCHITECTURE.md)
```

---

## 7. Abgleich mit Claudes laufender Arbeit

| Claudes Refactoring | Mein Design | Abgleich |
|---|---|---|
| `canvas/` (chain_graph.go → canvas) | `gateway/canvas/` | ✅ identisch |
| `meshedge/` | `gateway/meshedge/` | ✅ identisch |
| `httpx/` | `internal/httpx/` | ✅ identisch |
| Session-Disambiguierung (AgentSession) | `gateway/identity/` | ⚠️ Claude: im store; ich: eigenes Package — klären |
| TASK-011 Wiring (mintSession) | `gateway/identity/` | ✅ gleiche Funktionalität |
| auth.go Änderungen | `gateway/auth/` | ⚠️ Claude: noch in gateway/; ich: eigenes Package |

**Konsens-Punkte (Claude hat schon gemacht, ich übernehme):**
- canvas/, meshedge/, httpx/ — Package-Aufteilung
- AgentSession-Disambiguierung
- Session-Token beim Provisioning minten

**Review-Korrektur (Claude, nach dem Merge dieses Docs):** Zwei Stellen in
§3 sind Design, nicht Ist-Zustand — bitte beim Bauen von WP3/`security_events`
beachten:

1. **Tabellenname bleibt `sessions`, nicht `agent_sessions`.** Was tatsächlich
   auf `main` gelandet ist: nur der Go-Typ heißt `AgentSessionRow`
   (`store.go`), die SQL-Tabelle selbst wurde bewusst NICHT umbenannt — ein
   `ALTER TABLE ... RENAME` plus Anpassung jeder rohen SQL-Query, die
   `FROM sessions`/`INSERT INTO sessions` nutzt, ist ein deutlich größerer,
   risikoreicherer Schnitt als eine reine Go-Typ-Umbenennung, für den
   gleichen Entwirrungs-Nutzen. Wenn `security_events.session_id` eine FK
   auf die echte Tabelle braucht: `REFERENCES sessions(id)`, nicht
   `agent_sessions(id)`. Umbenennen ist nachholbar, falls gewünscht — aber
   als eigene, bewusste Migration, nicht nebenbei beim WP3-Bau.
2. **`vault_tokens.agent_id → agent_sessions(id)` als echte FK ist so nicht
   korrekt.** Der SQL-Audit (6.9.2026) hat verifiziert, dass `agent_id` in
   `vault_tokens` semantisch überladen ist: nur für `secret_name =
   "session-auth"` trägt es eine Session-ID (`MintSessionToken`,
   `vault.go`); für jeden anderen `secret_name` trägt es eine andere
   Agenten-Identität, die NICHT in `sessions` steht. Eine FK-Constraint auf
   dieser Spalte würde für jeden Nicht-Session-Token fehlschlagen (oder
   müsste nullable + unenforced bleiben, was den Sinn einer FK entwertet).
   Wenn das WP3-Schema wirklich referenzielle Integrität hier will: eigene
   Spalte statt Wiederverwendung von `agent_id`.

**Meine Vorschläge (über Claudes Arbeit hinaus):**
- Weitere Package-Aufteilung (identity/, deploy/, security/, analytics/)
- Route-Registry mit Doc-Comments für API-Generierung
- Doku-Folder-Struktur (api/, user/, reference/, assets/)
- README mit SVG-Logos und Badges
- HTML-Flow-Charts (Mermaid → HTML via GitHub Pages)

---

## 8. Offene Fragen

1. **Go-Templating:** Für SQL-Migrations und Code-Generierung — `text/template` reicht, oder `go:generate` + `stringer`?
2. **API-Doc-Generator:** `swaggo/swag` (etabliert, aber Swagger-2-Fokus) vs. eigenes Tool (OpenAPI-3-native, kein Dependency)?
3. **GitHub Pages:** Für die API-Doku-UI? Oder self-hosted im JiMesh-Container?
4. **Mermaid → HTML:** GitHub rendert Mermaid inline in Markdown — für echte HTML-Seiten braucht's ein Build-Tool (mermaid-cli). Machbar?
5. **SVG-Logos:** Selber zeichnen (Excalidraw) oder fertige Provider-Logos verwenden (Lizenz beachten)?
