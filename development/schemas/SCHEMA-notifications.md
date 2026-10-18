# SCHEMA: Notifications — Taxonomie, Persistenz, SSE-Protokoll

> Gilt für Sprint 30 (Infrastruktur + Agent/Session-Kinds) und die
> Security-Sprints 28/29 (SAST/DAST/Threat-Kinds). Kanonische Referenz —
> Änderungen an Kinds/Severity NUR hier, nicht in den Sprint-Dokumenten.
> Erstellt 8.9.2026, vor Implementierung. Namensvorbild:
> `docs/schemas/SCHEMA-model-evaluation.md`.

---

## 1. Grundsätze

1. **Inert-Pflicht:** Notifications enthalten **nie** rohe Secrets,
   Response-Bodies oder Prompt-Texte (Sprint-19-Lektion, Nested-Injection).
   Nur Referenzen: `finding_id`, `report_id`, `rule_id`, `container_id`.
2. **Dedup statt Flut:** Lautstarke Quellen (Scanner-Hook, Egress-Deny)
   aggregieren über `dedup_key` in einem Zeitfenster — bestehende Notification
   wird erhöht (`count++`), nicht neu erzeugt. Fenster default 10 Min
   (E-N8).
3. **Restart-fest:** eigene Tabelle, kein Redis-only (Mandat 4). Redis-Stream
   (`jimesh:notifications`) transportiert nur die Live-Ausspielung an SSE.
4. **Deep-Link-Vertrag:** jede Notification ist klickbar. `payload.project_id`
   → `/projects?project=<id>`; optional `payload.link` (relative Route) als
   Override; sonst UI-Fallback-Mapping nach Kind (Tabelle §2).
5. **Severity:** `info` (sichtbar, kein Alarm) · `warn` (Badge, Operator
   sollte schauen) · `critical` (Badge + hervorgehoben, Handlung nötig).

## 2. Kind-Taxonomie v1

Namespace `<domäne>.<ereignis>`. „Producer" = Komponente, die publish
`XADD jimesh:notifications` aufruft (Consumer → Tabelle + SSE).

| Kind | Auslöser | Producer / Quelle | Severity | Dedup | Deep-Link | Sprint |
|---|---|---|---|---|---|---|
| `session.input_needed` | Agent meldet: braucht User-Input | Agent-Log-Konvention `data.type=input_needed` (`jimesh:logs`-Consumer) | `warn` | nein (einmalig bis beantwortet) | Projekt-Page | 30 |
| `session.crashed` | Agent-Session gecrashed | `ERROR`-Agent-Log + Deploy-Status `failed` / Container tot | `critical` | ja | Projekt-Page | 30 |
| `session.hung` | Request in-flight > Schwelle (10 Min) | Hang-Watcher (In-Flight-Tracking am Proxy) | `warn` | ja (10 Min) | Projekt-Page | 30 |
| `session.compaction` | Agent meldet Kontext-Compaction | Agent-Log-Konvention `data.type=compaction` | `info` | ja | Projekt-Page | 30 |
| `secret.masked` | Secret in LLM-Response maskiert | Scanner-Hook (`internal/ai/scanner_hook.go`) | `warn` | ja (10 Min) | Projekt-Page | 30 |
| `secret.commit_blocked` | Pre-Commit-Guard hat Schreibzugriff auf `.git` mit Secret per `-EPERM` blockiert | eBPF-Guard-Daemon (Sprint 28) — Advisory wurde dem Agent zugestellt | `critical` | nein | Projekt-Page (Worktree) | 28 |
| `sast.finding` | Pre-Commit-/Repo-Scan-Finding (nicht-Secret) | SAST-Pipeline (Sprint 28) | `warn` | ja (30 Min) | Projekt-Page (Security-Page) | 28 |
| `threat.prompt_injection` | Guard-Chain-Verdict: Injection erkannt | Guard-Chain (`internal/ai/`, Guard-Modelle) | `warn` | ja (10 Min) | Projekt-Page | 30 |
| `threat.egress_block` | Default-Deny-Egress: verworfene Verbindung (inkl. Metadata-Service-Versuche) | Egress-Enforcement (`internal/network/egress.go`) | `warn` | ja (10 Min) | Security-Tab | 30 |
| `threat.socket_guard_block` | SocketGuard hat gefährlichen Container-Create blockiert (gefährliche Mounts) | `cmd/socket-guard` | `critical` | nein | Security-Tab | 30 |
| `security.freeze_action` | Freeze-Leiter ausgelöst (Revoke → Inject → SIGSTOP → Blackhole) | `internal/security/freeze.go` | `critical` | nein | Security-Tab (Freeze-Tile) | 30 |
| `deploy.failed` | Deployment-Übergang → `failed` | Deploy-Engine (`internal/deploy/`) | `critical` | ja (30 Min) | Projekt-Page | 30 |
| `deploy.dast_findings` | DAST-Gate: Deployment in `held`, Findings auf Security-Page | DAST-Gate (Sprint 29 WP2/WP3) | `warn` | ja (30 Min) | Projekt-Page (Security-Page) | 29 |
| `deploy.port_discovered` | Öffentlich erreichbarer Port ohne Gate-Record | Port-Discovery/Exposure-Dashboard (Sprint 29 WP3) | `warn` | ja (30 Min) | Projekt-Page | 29 |
| `cost.quota_exhausted` | Provider-Quota erschöpft (Header/Bench) | Quota-Confidence (`internal/quota/`, Topic `jimesh:quota` existiert) | `warn` | ja (30 Min) | Keys-Page | 30 |
| `cost.budget_exceeded` | Team/Projekt-Budget überschritten | Budgets (`internal/store/rbac.go`) | `warn` | ja (30 Min) | Budget-Widget (Dashboard) | 30 |

**Bewusst KEINE Notifications** (zu laut, nur Analytics): einzelne
Key-Cooldowns, Entropy-Eskalationen, Retry-Walks, Maskierungs-Statistiken im
Minutentakt. Die bleiben in den Streams/Analytics-Seiten.

## 3. Persistenz — SQL

In `ensureSchema` (`src/backend/internal/store/store.go:273-536`):

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id             TEXT PRIMARY KEY,      -- ULID
    kind           TEXT NOT NULL,         -- Taxonomie §2
    severity       TEXT NOT NULL,         -- info | warn | critical
    title          TEXT NOT NULL,         -- präzise, i18n-key-basiert im UI
    body           TEXT,                  -- inert, ohne Secret-Material
    session_id     TEXT,
    agent_type_id  TEXT,
    project_id     TEXT,                  -- Deep-Link-Anker
    payload        TEXT,                  -- JSON, nur Referenz-IDs + link
    dedup_key      TEXT,                  -- kind:session:subject; NULL = nie dedupen
    count          INTEGER NOT NULL DEFAULT 1,
    first_seen_at  BIGINT NOT NULL,       -- unix ms
    last_seen_at   BIGINT NOT NULL,
    read_at        BIGINT,                -- NULL = ungelesen
    created_at     BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications (read_at, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_project
    ON notifications (project_id, last_seen_at DESC);
```

**Dedup-Semantik:** Insert mit `ON CONFLICT (dedup_key)` — Konflikt nur, wenn
`last_seen_at` innerhalb des Fensters (10/30 Min je Kind, §2); dann
`count = count + 1`, `last_seen_at = now`, sonst neue Zeile. Ein
`count > 1`-Badge zeigt „N×" im UI.

## 4. Go-Strukturen

```go
// internal/notify/notify.go (neu; Publisher-Interface, damit Sprints 28/29
// nur notify.Publish(...) aufrufen, ohne SSE/Redis zu kennen)

type Kind string

const (
    KindSessionInputNeeded     Kind = "session.input_needed"
    KindSessionCrashed         Kind = "session.crashed"
    KindSessionHung            Kind = "session.hung"
    KindSessionCompaction      Kind = "session.compaction"
    KindSecretMasked           Kind = "secret.masked"
    KindSecretCommitBlocked    Kind = "secret.commit_blocked"
    KindSASTFinding            Kind = "sast.finding"
    KindThreatPromptInjection  Kind = "threat.prompt_injection"
    KindThreatEgressBlock      Kind = "threat.egress_block"
    KindThreatSocketGuardBlock Kind = "threat.socket_guard_block"
    KindSecurityFreezeAction   Kind = "security.freeze_action"
    KindDeployFailed           Kind = "deploy.failed"
    KindDeployDASTFindings     Kind = "deploy.dast_findings"
    KindDeployPortDiscovered   Kind = "deploy.port_discovered"
    KindCostQuotaExhausted     Kind = "cost.quota_exhausted"
    KindCostBudgetExceeded     Kind = "cost.budget_exceeded"
)

type Notification struct {
    ID          string         `json:"id"`
    Kind        Kind           `json:"kind"`
    Severity    string         `json:"severity"` // info | warn | critical
    Title       string         `json:"title"`
    Body        string         `json:"body,omitempty"`
    SessionID   string         `json:"session_id,omitempty"`
    AgentTypeID string         `json:"agent_type_id,omitempty"`
    ProjectID   string         `json:"project_id,omitempty"`
    Payload     map[string]any `json:"payload,omitempty"` // Referenz-IDs, link
    Count       int            `json:"count"`
    FirstSeenAt int64          `json:"first_seen_at"` // unix ms
    LastSeenAt  int64          `json:"last_seen_at"`
    ReadAt      *int64         `json:"read_at,omitempty"`
}

// Publish deduped (dedup_key + Fenster), persistiert, XADD jimesh:notifications.
type Publisher interface {
    Publish(ctx context.Context, n Notification) error
}
```

## 5. SSE-Protokoll — Erweiterung des SSE-Dienstes

Neuer Kanal neben `/api/sse/analytics|models|traces`
(`internal/analytics/realtime_sse.go:28-32`, exakt dessen Muster: Header
:34-40, Heartbeat :63-74, Backlog-Replay :186-224 — Replay: letzte 20 aus
`jimesh:notifications` bzw. Tabelle):

```
GET /api/sse/notifications
```

Events (SSE-Namen, Frontend-Listener in `useRealtimeStore` ergänzen):

```
event: notification
data: {"type":"created","notification":{...}}   // neue Zeile
data: {"type":"updated","notification":{...}}   // Dedup: count++ / read
data: {"type":"read","ids":["..."],"all":true}  // Read-State-Sync
```

REST (parallel, für Initial-Load + Fallback ohne SSE):

```
GET  /api/notifications?unread=true&limit=50&project=<id>
     → {"notifications":[...], "unread_count": N}
POST /api/notifications/read   {"ids":[...]} | {"all":true}
```

## 6. Producer-Anbindung (Sprint-übergreifend)

* **Sprint 30 (WP2):** Consumer für `jimesh:logs` (Agent-Log-Konventionen §7),
  Hang-Watcher, Deploy-Failed, Guard-Chain, Egress, SocketGuard, Freeze,
  Quota/Budget — plus `secret.masked` aus dem **existierenden** Scanner-Hook
  (kleinster Producer, erster Testfall).
* **Sprint 28 (WP3b/WP4):** Pre-Commit-Guard publishet
  `secret.commit_blocked` (critical) bei jedem `-EPERM` mit Advisory-Referenz;
  SAST-Pipeline publishet `sast.finding`.
* **Sprint 29 (WP2/WP3):** DAST-Gate publishet `deploy.dast_findings` bei
  `held`; Port-Discovery publishet `deploy.port_discovered`.
* Producer bekommen `notify.Publisher` injiziert (kein direkter
  Redis-Tabellen-Zugriff aus `internal/deploy` etc.).

## 7. Agent-Log-Konventionen (Vertrag für Agent-Betreiber)

Agent-Logs (`POST /api/agents/logs`, `AgentLog.Data`-Map,
`internal/service/agents.go:23-55`) mit `data.type`:

| `data.type` | Wirkung | Felder |
|---|---|---|
| `input_needed` | Notification `session.input_needed` (warn), Session-State → `awaiting_input` | `question` (kurz), `context_id?` |
| `compaction` | Notification `session.compaction` (info) | `reason` (`context_full` \| `long_running`), `tokens_before` |
| `input_resolved` | hebt `awaiting_input` auf, schließt zugehörige Notification | — |

Regeln: nur `level: INFO|WARN` akzeptiert; `question`/`reason` sind
**Metadaten**, keine Freitext-Übergabe an Guards. Konvention wird in
USER_GUIDE dokumentiert (Sprint 30 WP5).

## 8. Frontend-Verhalten

* Bell mit Unread-Badge (Critical = roter Punkt, Warn = Amber);
  Popover-Liste: Kind-Icon, Titel, `count`-Badge („N×"), relative Zeit.
* Klick: `POST read` + Navigation nach Deep-Link-Vertrag (§1.4) —
  `/projects?project=<id>` bzw. `payload.link`.
* Overview-Dropdown (Sprint 30 WP3) bleibt getrennt vom Bell, teilt aber
  denselben SSE-Kanal für Live-Updates des Session-States.
