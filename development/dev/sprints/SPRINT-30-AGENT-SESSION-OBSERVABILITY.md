# SPRINT-30 — Agent/Session-Observability: Navbar-Notifications + Live-Übersicht

> **Quelle:** Operator-Anforderung 8.9.2026 (Navbar-Dropdown + Notifications-Tab).
> **Status:** Sprint-Plan, nicht begonnen. **Verwandt:** Sprint 22 (Dashboard-IA),
> Epic 10 (K-LAF Session-Identity), `docs/articles/` KB-Anschluss.
> **Notification-Schema (kanonisch): `docs/SCHEMA-notifications.md`** —
> Taxonomie aller Kinds (auch SAST/DAST/Threat aus Sprint 28/29), DDL,
> SSE-Protokoll. Änderungen an Kinds nur dort.
> **Code-Recherche:** verifiziert 8.9.2026, alle Referenzen unten sind real.

---

## 1. Die Idee

Der Operator soll **ohne Seitenwechsel** sehen, was sein Agent-Fleet tut — und
**aktiv benachrichtigt** werden, wenn ein Agent ihn braucht:

1. **Übersicht-Dropdown oben in der Navbar:** welche Agents/Apps arbeiten
   gerade, welche sind idle — mit Token-Verbrauch, Modell, Laufzeit
   („läuft seit …") und weiteren Analytics. Klick auf einen Eintrag →
   Projects-Seite mit genau dieser App/Agent geöffnet.
2. **Notifications-Tab (Bell) daneben:** Benachrichtigungen bei
   *User-Input benötigt*, *Session gecrashed*, *Session hängt* — auch bei
   **Compaction** (Kontext-Komprimierung, z. B. weil der Agent zu lang läuft
   oder der Kontext voll wird). Klick → `/projects?project=<id>` (Deep-Link
   auf die App), Badge zählt ungelesen.

**Warum jetzt möglich:** Alle Bausteine existieren — request_log hat
session-idexizierte Token-Zahlen, SSE-Infrastruktur ist gebaut, Redis-Streams
transportieren Agent-Logs. Was fehlt: Session-Status-Modell, Notifications-
Persistenz, der Deep-Link und die zwei Navbar-Elemente.

## 2. Bestandsaufnahme (verifiziert 8.9.2026)

**Da, kann genutzt werden:**

* `request_log` mit `session_id, agent_type_id, model_id, input_tokens,
  output_tokens, cost_usd, ts_unix_ms`, Index auf session_id —
  `src/backend/internal/store/store.go:389-412` → Token-Rollup + Laufzeit
  reine SQL-Aggregation.
* SSE-Infra: `/api/sse/analytics|models|traces` —
  `internal/analytics/realtime_sse.go:28-32` (Heartbeat, Backlog-Replay
  `sseStream` :186-224); Frontend-Gegenstück `SSEConnectionManager` in
  `src/frontend/src/hooks/useRealtimeStore.ts:50-110`.
* Agent-Log-Kanal: `AgentLog` + `PublishAgentLog` (XADD `jimesh:logs`) —
  `internal/service/agents.go:23-55`; SSE `GET /api/agents/logs/stream` —
  `internal/analytics/agentlog.go:21-175`. Ein „Input needed"-Event kann
  hierüber fahren (Level + `Data`-Map sind generisch).
* Consumer-Muster: `StartFeedbackLoop` (tailt `jimesh:events`) —
  `internal/service/service.go:1532-1555`.
* Navbar + UI-Primitives: `Navbar()` in `src/frontend/src/App.tsx:260-437`,
  Right-Cluster :337-372 (Slot für Bell + Overview); `DropdownMenu`/`Popover`
  shadcn-Wrapper in `src/frontend/src/components/ui/`; react-query + react-router
  vorhanden.

**Lücken, die dieser Sprint füllt:**

* **Kein Session-Status:** `sessions`-Tabelle nur
  `id, agent_type_id, metadata, tags` (`store.go:420-426`); K-LAF-Status
  (`active|frozen|released|expired`, `store.go:1423-1424`) ist Security-
  Lifecycle, kein Arbeits-Status. Kein `last_activity`, kein Heartbeat.
  `UpsertSession` (`store.go:1470-1476`) persistiert nur 4 Spalten.
* **Kein Notifications-Konzept:** keine Tabelle, keine API, kein SSE-Kanal
  (nur `jimesh:logs` als Vorbild).
* **Kein Compaction-Begriff** im ganzen Code.
* **Kein Deep-Link:** ProjectsPage ist reiner lokaler State — keine
  URL-Params (`src/frontend/src/views/ProjectsPage.tsx:71, 87-104`);
  Route `/projects` ohne `:id` (`App.tsx:516`).

## 3. Work Packages

### WP0 — Status-Modell + Entscheidungen

* **State-Maschine definieren (E-N1):** `working | idle | awaiting_input |
  hung | crashed` — unabhängig vom K-LAF-Security-Lifecycle (beide koexistieren;
  UI zeigt ggf. beides).
* **Persistiert vs. abgeleitet (E-N2):** Tendenz — `sessions` erweitern um
  `state, last_activity_at, started_at` (Writer aktualisiert bei jedem Request
  am Proxy), Hang-Erkennung bleibt abgeleitet (Watcher), idle = Schwelle über
  `last_activity_at`.
* **Compaction-Erkennung (E-N3):** JiMesh sieht Compaction nicht von selbst —
  Konvention im Agent-Log-Protokoll definieren: Agent-Log mit
  `data.type = "compaction"` (Level INFO/WARN) wird von JiMesh erkannt und in
  State/Notification übersetzt. Für Agent-Betreiber dokumentieren (USER_GUIDE).

### WP1 — Backend: Session-Status + Overview-Endpoint

* Migration in `ensureSchema` (`store.go:273-536`): `sessions` + `state TEXT,
  last_activity_at BIGINT, started_at BIGINT`; `UpsertSession`/
  `QuerySessions` erweitern (`store.go:1470-1528`).
* Proxy-Schreibpfad: bei `RecordRequestSummary` (`service.go:318+`) Session
  touchen (`state=working`, `last_activity_at=now`); erster Request setzt
  `started_at`.
* Idle-Ableitung: Status nicht bei jedem Poll neu schreiben — `working` wird
  persistiert, `idle`/`hung`/`crashed` berechnet der Read-Pfad aus
  `last_activity_at` + Watcher-Flags (Schwellwert E-N4, Default 5 Min).
* `GET /api/sessions/overview` — je Session/Agent: `state`, Tokens (SUM über
  `request_log`), `model_id` (letzter), `started_at`, `last_activity_at`,
  `cost_usd`, gruppiert nach Projekt/Agent-Type (Gruppierung E-N5: Tendenz
  Agent/App-Gruppen, Session-Detail aufklappbar). Route in `gateway.go:132-134`
  registrieren.

### WP2 — Backend: Notifications (Infrastruktur + Security-Producer)

Schema, Taxonomie und SSE-Protokoll stehen kanonisch in
**`docs/SCHEMA-notifications.md`** — WP2 implementiert sie:

* Tabelle `notifications` (DDL Schema §3) in `ensureSchema`
  (`store.go:273-536`); Dedup via `dedup_key` + Zeitfenster
  (Schema §3, E-N8).
* Neues Paket `internal/notify/`: `Publisher`-Interface
  (Publish → dedup → persist → `XADD jimesh:notifications`), damit Sprint
  28/29-Producer später nur `notify.Publish(...)` aufrufen (Schema §4, §6).
* **SSE-Kanal:** `GET /api/sse/notifications` — Erweiterung des bestehenden
  SSE-Dienstes nach dem Muster `realtime_sse.go` (Header :34-40, Heartbeat
  :63-74, Backlog-Replay :186-224); Events `created|updated|read`
  (Schema §5).
* **REST** (gateway.go registrieren + API_DOCS!): `GET /api/notifications`
  (Filter `unread/project`, `unread_count`), `POST /api/notifications/read`
  (Schema §5).
* **Producer (Sprint 30):**
  a. Log-Consumer (Muster `StartFeedbackLoop`, `service.go:1532-1555`): tailt
     `jimesh:logs`, mappt Agent-Log-Konventionen `input_needed` /
     `compaction` / `input_resolved` (Schema §7).
  b. Hang-Watcher (Goroutine): in-flight Request > 10 Min → `session.hung`;
     benötigt In-Flight-Tracking am Proxy (Start/Done-Events, in-memory Map).
  c. `secret.masked` aus dem **existierenden** Scanner-Hook
     (`internal/ai/scanner_hook.go`) — kleinster Producer, erster Testfall.
  d. Threat-Detections aus bestehender Infra: Guard-Chain-Verdict →
     `threat.prompt_injection`; Egress-Deny → `threat.egress_block`;
     SocketGuard-Block → `threat.socket_guard_block`; Freeze-Leiter →
     `security.freeze_action`.
  e. Zustands-Producer: Deploy → `failed` → `deploy.failed`;
     Quota/Bench → `cost.quota_exhausted`; Budget → `cost.budget_exceeded`.
* **Producer (fremde Sprints, hier nur Vertrag):** Sprint 28 →
  `secret.commit_blocked` + `sast.finding`; Sprint 29 →
  `deploy.dast_findings` + `deploy.port_discovered` (Schema §6).
* **Keine Notifications** für Cooldowns/Eskalationen/Retrys — nur Analytics
  (Schema §2, unterste Zeile).

### WP3 — Frontend: Navbar-Dropdown + Bell

* Right-Cluster (`App.tsx:337-372`): zwei neue Elemente neben ⌘K/Account:
  1. **Overview-Dropdown:** Agents/Apps mit State-Badge (`working` grün /
     `idle` grau / `awaiting_input` gelb / `hung`+`crashed` rot), Tokens,
     Modell, „läuft seit", Kosten. Live via react-query Poll + SSE-Merge.
     Klick auf Eintrag → `navigate('/projects?project=<id>')`.
  2. **Notifications-Bell** mit Unread-Badge; Popover (Muster
     `popover.tsx`, z. B. `custom-weights-popover.tsx`): Liste
     (kind-icon, Titel, Alter), Klick → mark-read + Deep-Link
     `/projects?project=<id>`; „Alle markieren".
* `useRealtimeStore` erweitern: `notifications`-Event-Listener auf
  `/api/sse/notifications` (Muster: bestehende Listener :83-108).

### WP4 — Frontend: Deep-Link in die ProjectsPage

* `/projects?project=<id>`: Query-Param initialisiert die bestehende lokale
  Selektion (`ProjectsPage.tsx:71, 87-104`) — Edit-Detail/Ansicht der App
  öffnen; Param nach Interaktion nicht zwangsweise entfernen (Refresh-stabil).
* Optional `&session=<id>`: Vorbereitung für späteren Session-Detail-View
  (existiert noch nicht — nur Param-Vertrag definieren).

### WP5 — i18n + Doku

* `en.json` nav/notification-Keys + **alle 55 Locale-Dateien** —
  `npm run check:i18n` muss grün bleiben (harte Schwelle).
* `API_DOCS.md`: `/api/sessions/overview`, `/api/notifications*`,
  `/api/sse/notifications` (Mandat: Route in gateway.go = Route in API_DOCS).
* `USER_GUIDE.md`: Fleet-Übersicht, Notification-Bedeutungen,
  **Agent-Log-Konventionen** (`input_needed`, `compaction`) für Betreiber.
* Backlog-Spiegel (Epic 19).

## 4. Entscheidungen (E-N-Serie)

| # | Entscheidung | Blockiert | Status |
|---|---|---|---|
| E-N1 | State-Maschine `working/idle/awaiting_input/hung/crashed`, getrennt vom K-LAF-Lifecycle | WP1 | Default gesetzt |
| E-N2 | Status persistiert (`state`, `last_activity_at`) + idle/hung abgeleitet | WP1 | Default gesetzt |
| E-N3 | Compaction via Agent-Log-Konvention `data.type=compaction` (JiMesh erkennt, meldet nicht) | WP2, WP5 | Default gesetzt |
| E-N4 | Idle-Schwelle: 5 Min ohne Request | WP1 | Default, konfigurierbar |
| E-N5 | Overview-Gruppierung: nach App/Agent-Type, Sessions aufklappbar | WP1, WP3 | Default gesetzt |
| E-N6 | Hung-Schwelle: in-flight Request > 10 Min | WP2 | Default, konfigurierbar |
| E-N7 | Notifications: eigene Tabelle (Restart-fest, Mandat 4) statt nur Redis-Stream | WP2 | Default gesetzt |
| E-N8 | Dedup-Fenster je Kind (10 Min Agent/Threat, 30 Min Deploy/Cost) — Schema §2/§3 | WP2 | Default gesetzt |
| E-N9 | Kind-Namespace `session.\|secret.\|threat.\|security.\|deploy.\|cost.*` — kanonisch in `docs/SCHEMA-notifications.md`, nicht hier ändern | WP2, WP3 | Default gesetzt |

## 5. Akzeptanzkriterien (Mandat 2 — verifiziert, nicht behauptet)

* Agent mit aktiven Requests erscheint als `working`, nach Idle-Schwelle als
  `idle`; Token-/Cost-Zahlen im Dropdown stimmen mit
  `GET /api/analytics/by-client` überein (Cross-Check gegen dieselbe
  request_log-Basis).
* Simulierter Crash (Deployment → `failed`) erzeugt eine `crashed`-Notification
  mit Badge; Bell-Zähler stimmt; Klick navigiert nach
  `/projects?project=<id>` und öffnet die App-Ansicht im Browser (verifiziert).
* Künstlich hängender Request (> E-N6) erzeugt `hung`; ein
  `data.type=input_needed`-Agent-Log erzeugt `awaiting_input`; ein
  `data.type=compaction`-Log erzeugt die Compaction-Notification.
* Notifications überleben Backend-Restart (Tabelle), Read-State persistiert.
* Scanner-Hook maskiert ein Test-Secret in einer Response → `secret.masked`-
  Notification erscheint, Dedup erhöht bei Wiederholung `count` statt neuer
  Zeile (Schema §3).
* Egress-Deny gegen eine geblockte Domain → `threat.egress_block`-Notification
  (Dedup-Fenster verifiziert); Freeze-Aktion → `security.freeze_action` (critical).
* Keine Notification für Retry-Walk/Cooldown (explizit negativ getestet —
  Schema §2 „bewusst KEINE").
* `npm run check:i18n` grün (alle 55 Locales), `npm run test` grün,
  `make check-backend` grün; API_DOCS enthält alle neuen Routen.

## 6. KB-/Content-Anschluss

* Fleet-Übersicht + Notifications werden KB-Material (USER_GUIDE-Kapitel);
  Artikel #6-Kandidat „Observability for Agent Fleets" — Backlog, nicht
  Pipeline-Pflicht.
