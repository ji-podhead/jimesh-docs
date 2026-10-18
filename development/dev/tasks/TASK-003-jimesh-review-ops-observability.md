# TASK-003 — jimesh-Review: Ops & Observability

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Speist:** `docs/research/R20-jimesh-reuse-review.md` §Ergebnisse, Epic 15
> **Repos:** `/home/ji/projects/jimesh-mirror/` → `jimesh-observability` (5), `jimesh-logs` (12), `jimesh-admin` (210), `jimesh-inbox` (20), `jimesh-sse` (14)
> **Ziel-Mapping:** Sprint 20 WP3 (Freeze-Benachrichtigung), WP4 (Forensik), WP0-Fund „Dashboard ohne Login" · OTLP-Export (WP8-Diskussion) · Epic 13 (SSE/Rendering)

## Auftrag

- [x] Tenant-aware Log-Routing geprüft: K8s-Teil (Promtail-Pod-Labels) nicht portierbar, aber das Prinzip (Tenant-Identität kommt aus verifiziertem Token, nie vom Client) ist — für Docker via OTel-Collector-Pfad
- [x] OTel-Collector-Setup gesichtet: **die gehärtete Pipeline ist direkt als JiMesh-OTLP-Vorlage verwendbar** (OIDC-Auth, strip/inject/require-tenant)
- [x] Live-Log-Streaming + SSE-Auth analysiert: Cookie-Handshake, Last-Event-ID-Resume, Heartbeat, Caps, Drain — komplett gelöst in `jimesh-sse`
- [x] RBAC/Roles geprüft: **Präzisierung nach Operator-Hinweis (6.9.)** — saits-cloud hat RBAC mehrschichtig (JWT-`roles`-Claim → `requireRole`-Middleware in saits-auth → OPA → K8s-Rollen-Labels → rollenbasierte Egress-Policies); was fehlt, ist NUR die saits-admin-Verwaltungs-UI (`packages/rbac` = `.gitkeep`). WP0-Login bleibt ungelöst (Auth = Clerk extern)
- [x] Inbox-Muster analysiert: Notifications + Escalations (ack/resolve) → WP3
- [x] Alertmanager-Regeln gesichtet (Quota/Billing/Lag) → §4/WP3/WP4
- [x] Dashboards-as-Code: **Negativbefund** in diesem Repo (nur sc-appconfigs-JSON, s. TASK-002)
- [x] DB-Discovery/CDC gesucht: **Negativbefund**
- [x] „Nicht portieren"-Liste geführt

## Regeln

Globale Regeln + Ergebnis-Format: `docs/tasks/README.md`.
Lesebudget ~30 Dateien/Repo (README → Struktur → Config-/Pipeline-Dateien → packages/).

## Ergebnis

## Reusable für JiMesh

| Fund | Fundstelle (Repo/Pfad) | JiMesh-Problem (WP/Roadmap) | Aufwand | Warum wertvoll |
|---|---|---|---|---|
| SSE-Cookie-Handshake: EventSource kann keine Header setzen → `/auth/sse-handshake` setzt `aud=saits-sse`-Cookie (60s TTL, HttpOnly/Secure/SameSite=Strict), Browser pollt alle 50s neu; `?token=` bewusst ENTFERNT (B3: leakt in Logs/Referer/History) | `jimesh-sse/README.md`, `src/middleware/requireSaitsToken.js` | Epic 13, WP0-Login-Kontext | S | Die Datenschutz-bewusste SSE-Auth für JiMesh-Widgets; lazy JWKS-Init (B1: kein Crash-Loop beim Import) |
| SSE-Mechanik: pro Verbindung EIGENER blocking-XREAD-Redis-Client (BLOCK würde Shared Client verhungern), Last-Event-ID-Resume (Regex `^\d+-\d+$` sonst `$`), Heartbeat 15s, Idle-Disconnect 5min, Cap pro Tenant → 429, Drain aller Verbindungen bei SIGTERM (B6) | `jimesh-sse/src/services/sseService.js`, `connectionRegistry.js` | Epic 13 (SSE-Widgets), WP4 | S | Alle Backpressure/Reconnect-Fragen sind hier beantwortet — JiMesh' R11-SSE-Pipeline kann diese Details direkt übernehmen |
| `useLogStream`-Hook: Ring-Buffer (500), begrenztes Dedup-Set mit Eviction, Status-Maschine (idle/connecting/open/error/closed), `withCredentials` | `jimesh-admin/packages/log-stream/src/useLogStream.ts` | Epic 13 | S | Fertiges Client-Muster für das JiMesh-Log-Widget |
| OTel-„tenant-router"-Pipeline: OTLP-Receiver mit OIDC-Auth (JWT gegen saits-auth-JWKS, `attribute: tenant_id`), Caller-Tenant-Attribute werden gestrippt, `tenant.id` aus `auth.metadata` injiziert, `filter/require_tenant` verwirft Tenant-lose Payloads, Promote → `tenant_id`-Label für Prom/Loki | `jimesh-observability/charts/otel-collector/values.yaml` | WP8 OTLP-Diskussion, WP4 | M | „Kein Pfad, über den ein Payload eine nicht signierte Tenant-Identität trägt" — exakt das Muster, wenn JiMesh-Agenten später OTLP exportieren |
| Alert-Vorlagen: QuotaSaturation (>95 % used/limit, 5m), BillingInsufficientFundsSpike (rejected-rate >1/s), AuditStreamConsumerLag (>10k), ArchiverStuck (>24h kein XTRIM) | `jimesh-observability/alerts/draft/saits-sync.yaml` | §4 Budgets, WP3/WP4 | S | PromQL-Fertigvorlagen für Budget-/Lag-Alerts; Sentinel-Regeln entfallen (Single-Redis) |
| Inbox-Doppelfläche: notifications (fire-and-forget + ack) UND escalations (Operator-actionable mit `status/resolved_by/resolved_at/note`) über denselben State; Redis-Layout LIST(HASH)+LTRIM+unread-Counter, atomar per Pipeline | `jimesh-inbox/src/sc_inbox/state.py`, `README.md` | WP3 Freeze-Review-Benachrichtigung | S–M | „Freeze ausgelöst" als Escalation mit Ack/Resolve-Pflicht = das Review-Gate, das JiMesh WP3 braucht |
| Pluggable Sinks (Base-Interface, Telegram/SSE/webhook mit Signing-Key) + per-Tenant Consumer-Groups (`xgroup_create` mit BUSYGROUP-Toleranz, mkstream) | `jimesh-inbox/src/sc_inbox/bus.py`, `sinks/*` | WP3, Notify-Widgets | S | Sink-Abstraktion ist 3 Dateien groß und direkt portierbar |
| Log-Envelope-Schema (`tenant_id` wird beim Publish injiziert — OPA-scoped, nie client; service/level/timestamp/trace_id) + Stream-Key-Konvention `logs:<tenant>:<service>` ↔ Kafka-Topic-Mapping | `jimesh-logs/schemas/log_envelope.md`, `redis_streams/producer.py` | WP4 Forensik | S | Envelope-Vertrag für JiMesh-Log-Events |
| SSE-statt-WebSocket-Entscheidung sauber begründet: HTTP/2-Multiplexing, EventSource-Retry + Last-Event-ID, stateless XREAD — vermeidet die Pub/Sub-Idle-Disconnect-Bugklasse (PR #2207/#2211) | `jimesh-logs/sse/router.py` (Docstring) | Epic 13 | – | Bestätigt JiMesh' R11-SSE-Wahl mit fremden Produktions-Bugs als Beleg |
| OPA-Decision-Cache-Client (30s TTL, Tenant-Präfix-Invalidierung) für `/iam/decide` | `jimesh-admin/packages/api/src/opa-cache.ts` | E8/RBAC (später) | S | Falls JiMesh je Rollen bekommt: Client-Muster steht |
| **RBAC-Kette über alle Layer** (Operator-Korrektur: existiert definitiv): JWT-`roles`-Claim (admin/member) → `requireRole`-Middleware + admin-only `/tenant/members` → OPA-Entscheid → K8s-Role-Label-Pflicht (Kyverno/Gatekeeper) → rollenbasierte Egress-Policies → **App-Level: statemachine `rbac.py`** (Rollen-Hierarchie, auditiertes SuperAdmin-Force-Override, Capability-Flags) | `jimesh-auth/src/app/middleware/requireRole.js`, `jimesh-sync/schema/control-plane.md` (roles-Array), `sc-appconfigs/constraints/templates/K8sRequireSaitsCloudRole.yaml`, `tenants/_template/network-policies/sso-roles/05–07`, `jimesh-ai/claude/statemachine/rbac.py` | Epic 17 Admin-Layer, §2, §4 (Quota-Scopes) | M | Ende-zu-Ende-Vorlage für JiMesh Scopes/Quotas/Rollen — nur die Verwaltungs-UI wäre neu |

## Nicht portieren

| Was | Warum nicht |
|---|---|
| Kafka-Two-Bus-Layer (`jimesh-logs/kafka/`) | Phase-1-Scaffold ohne Implementierung; JiMesh hat Redis Streams (R11) — Kafka erst bei echter Replay-/Multi-Consumer-Pflicht |
| kube-prometheus-stack / Loki / Tempo Helm-Charts | K8s-Betriebsform; falls JiMesh Loki/Prom will, als einzelne Compose-Container entscheiden — nicht diese Charts |
| Grafana multi-org pro Tenant | E8-Annahme (Human-Multi-Tenancy); JiMesh single-operator |
| WebSocket-Log-Pfad (`jimesh-logs/logs/api.py`, 746 Zeilen lcore-Erbe) | Durch die dokumentierte SSE-Entscheidung ersetzt (siehe Reusable) |
| `apps/admin` Trading-Dashboard (portfolio/board/agents-Seiten, Trading-Widgets) | Domänenspezifisch Trading, kein JiMesh-Nutzen |
| saits-admin-RBAC-Verwaltungs-UI (`packages/rbac`) | Frontend-Stub; die RBAC-Kette selbst existiert in saits-cloud (siehe Reusable-Tabelle) — nur dieses UI-Stück wäre für JiMesh neu zu bauen |
| Sentinel-/HA-Alerts | JiMesh fährt Single-Redis (kein Sentinel-Quorum) |

## Drift/Überraschungen

* **`jimesh-admin` ist Phase-0 — aber saits-cloud hat RBAC definitiv** (Operator-Korrektur 6.9.): `packages/rbac` im Frontend ist ein Stub, die RBAC-Kette lebt in den Backend-/Infra-Repos (JWT-`roles` → `requireRole` in saits-auth → OPA → K8s-Role-Labels → sso-roles-Netz-Policies; Details in TASK-002 + TASK-003-Tabelle). Dem Admin-Dashboard fehlt nur die Verwaltungs-UI. **Unverändert true: der WP0-Fund „Dashboard ohne Login" wird nicht gelöst** (Auth = Clerk extern).
* **`jimesh-logs` ist Phase-0-Scaffold:** `sse/router.py` und `producer.py` werfen `NotImplementedError`; nur Design + Docs sind real, `logs/api.py` (746 Zeilen) ist leobot2-Erbe.
* **`jimesh-observability` README verspricht mehr als das Repo hält:** „Grafana multi-org, Terraform-provisioned" — das Repo hat 5 Dateien, kein Terraform. Dashboards-as-Code existiert nur als Grafana-Provisioning-JSON in `sc-appconfigs` (TASK-002).
* **Positiv:** Die Threat-Modell-Disziplin mit Issue-Nummern in Kommentaren (crew4 B1/B3/B6, B-new1) — Fixes sind im Code begründet, nicht nur in PR-Texten. Vorbild für JiMesh.
* **Kleiner Code/Kommentar-Widerspruch in `bus.py`:** Kommentar sagt „ein xreadgroup pro Tenant", Code nutzt die Group des ersten Tenants für gemischte Streams — beim Portieren klären.
* Die Inbox löst bewusst Notification+Escalation in EINEM Service (Crew-Vote dokumentiert) statt zwei Services — Anti-Duplizierungs-Entscheidung mit Provenance-Link.

## Offene Fragen

1. WP0-Login: Diese Repos liefern keine fertige Lösung (Clerk/OPA extern, `packages/rbac` leer). Entscheidet JiMesh: simples Session-Gate im Go-Gateway (Cookie + Argon2-Hash aus Vault, ~S) oder Tailscale-only? — der WP0-Fund bleibt bis dahin offen.
2. Epic 13: SSE-Widget nach `jimesh-sse`-Muster (Handshake-Cookie, Last-Event-ID-Resume, Heartbeat, Tenant-Cap, Drain) an JiMesh' bestehende R11-SSE-Pipeline andocken — baut JiMesh einen eigenen `/sse-handshake`-Endpoint im Gateway?
3. OTLP (WP8-Diskussion): Collector-Container mit der `jimesh-observability`-Pipeline übernehmen — wer issued die Agent-Telemetrie-Tokens (Gateway-Session-Tokens mit `aud=telemetry`)?
4. WP3: Freeze-Review als Escalation-Inbox (Ack/Resolve-Pflicht) — Zustand in Redis (wie `jimesh-inbox`, kurzlebig) oder in Postgres (JiMesh-Persistenzmandat, revisionssicher)?
5. Alerts: Läuft bei JiMesh Prometheus+Alertmanager, oder werden Budget-/Lag-Checks als leichte Gateway-Cron-Checks (ohne Prometheus-Stack) gebaut?
