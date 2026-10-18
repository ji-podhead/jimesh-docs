# HANDOFF — TASK-051: Frontend-Finalisierung (SDK-Logs-UI + Network-Presets)

**Für:** den Agenten, der TASK-051 übernimmt.
**Von:** Discovery-Session (Recherche abgeschlossen, **0 Dateiänderungen am Code**, kein Implementierungs-Commit).
**Status:** 13.9.2026, Sprint-36-Kontext. Alle Fakten unten sind gegen den Live-Stand verifiziert.

---

## 0. TL;DR

1. **Alles ist recherchiert, nichts ist gebaut.** Dieses Dokument enthält Backend-Response-Shapes,
   Feld-Semantiken und file:line-Fundstellen, sodass die Implementierung direkt starten kann.
2. **Größte Falle:** `src/frontend/src/views/ProjectsPage.tsx` trägt bereits **+829 Zeilen
   uncommittede Parallel-Arbeit** (Network-Feld-Wiring ist schon drin!). Wer diese Datei
   committet, nimmt jene Arbeit mit — siehe §4.1.
3. Backend-Endpunkte sind **live**: `GET /api/sdk/logs` (seit TASK-032, d36c62e) und
   `GET /api/analytics/by-workspace`. Live-Curls **ohne** Dashboard-Session liefern erwartbar
   403/401; über `apiFetch` (Bearer-Session) ist `/api/sdk/logs` die Operator-Surface.
4. i18n: Der Paritäts-Checker (`npm run check:i18n`) ist **bereits jetzt rot** (58 Errors,
   `network.*` fehlt in 58 Locales — Präzedenzfall NetworksPage: nur en+de gepflegt). Siehe §6.2.

---

## 1. Auftrag (Kurzfassung aus `docs/tasks/subagents/PROMPT-task-051-frontend-finalize.md`)

1. **SDK-Logs-Ansicht**: `GET /api/sdk/logs` mit Filter-Dropdowns (type, level, workspace,
   session, agent), type-Tabs `audit|agent|app`, Polling-Refresh v1 (SSE später), daneben
   Per-App-Kosten aus `GET /api/analytics/by-workspace`.
2. **Network-Presets im Project-Create** (ProjectsPage): gVisor-NAT (default) | Airgap |
   Host-Passthrough (rotes Warning-Badge) — Wire zum Deploy-Request analog zum
   bestehenden `runtime`-Feld.
3. Route registrieren in `App.tsx`, i18n de/en, lucide-Icons, bestehende shadcn-Komponenten.

**Regeln:** nur `src/frontend/**`; No-Mock (echte Calls, ehrliche Fehler/Empty-States);
**NIEMALS** `next build` / `npm run build` im laufenden Frontend-Container (localhost:19090,
Dev-Mode, `.next` geteilt — 13.9.-Lesson); Verifikation via live-curl + `npx tsc --noEmit`
(nur wenn keine fremden tsc-Störungen); GIT: nur eigene Files mit expliziten Pfaden,
niemals `git add -A`, **nicht pushen**, ein Commit am Ende; Task-File-Status aktualisieren.

---

## 2. Verifizierte Backend-Fakten

### 2.1 `GET /api/sdk/logs`

| Was | Fundstelle |
|---|---|
| Route registriert | `src/backend/internal/sdklogs/sdklogs.go:67` (`mux.HandleFunc`) |
| Gateway-Mount | `src/backend/internal/gateway/gateway.go:187` (`s.sdklogs.Register(mux)`), Feld `:57` |
| Query-Handler | `sdklogs.go:253-288` |
| API-DOCS | `API_DOCS.md:1223` (GET), `:1212` (POST ingest) |

**Filter (Query-Params):** `type`, `level`, `workspace`, `session`, `agent`, `range`, `limit`
(sdklogs.go:255-270). Leere Felder = keine Einschränkung.

**Response:** `{"logs": SDKLogRow[], "count": N}` (sdklogs.go:287); bei 0 Treffern ehrliches
`[]`, nie `null` (:284-286).

**SDKLogRow** (`src/backend/internal/store/sdk_logs.go:23-36`):

```ts
interface SDKLogRow {
  id: number            // int64
  ts_unix_ms: number    // int64, Unix-Millisekunden
  type: string          // "audit" | "agent" | "app"
  level: string         // "INFO" | "WARN" | "ERROR" | "DEBUG" | … (freier String)
  alias?: string
  message: string
  payload?: string      // JSON als String, roh gespeichert — ggf. per JSON.parse im UI darstellen
  session_id?: string
  workspace_id?: string // serverseitig aus dem Service-Key, nie aus dem Body
  project_id?: string
  agent?: string        // caller-deklariertes App/Agent-Label
  source_key_id?: string
}
```

**range** (`store/sdk_logs.go:97-114`): `""`/`all` = unbegrenzt; `15m|1h|24h|1d|7d|30d`;
ungültiger Wert → **400** (laut, kein silent widening).
**limit** (`store/sdk_logs.go:117-126,159`): `<=0` → 200; `>1000` → Clamp auf 1000;
`ORDER BY id DESC` (neueste zuerst).

**Auth** (sdklogs.go:249-252, 271-274): Dashboard-Session (Bearer via `apiFetch`) sieht
**alle** Workspaces (Operator-Surface); `kind=service`-Consumer-Keys werden per
`ScopeWorkspace` auf die eigene Workspace festgenagelt. Frontend ruft einfach via
`apiFetch('/api/sdk/logs?…')` auf.

### 2.2 `GET /api/analytics/by-workspace` (Per-App-Kosten)

| Was | Fundstelle |
|---|---|
| Route registriert | `src/backend/internal/analytics/analytics.go:47` |
| Handler | `src/backend/internal/analytics/analytics_derived.go:203-245` |

**Query-Params:** `?range=24h` (Zeitfenster), `?workspace=<id>` (leer = alle).

**Nur Service-Key-Traffic ist App-attribuiert** (`WorkspaceID != ""`); User-Keys und
Admin-Traffic werden übersprungen (analytics_derived.go:213-216) → ohne laufende
Container-Keys ist ein ehrliches `{"byWorkspace": [], "count": 0}` korrekt.

**Response** (analytics_derived.go:229-244):

```ts
{
  byWorkspace: Array<{
    workspaceId: string
    requests: number
    successRate: number     // 0..1
    avgLatencyMs: number
    inputTokens: number
    outputTokens: number    // intern heißt das Feld "outputTokes" (sic, Backend-Kommentar :238)
    costUSD: number
    errorRate: number       // 1 - successRate
  }>
  count: number
}
```

**Lücke (nicht Frontend-Scope):** `API_DOCS.md` hat **keinen** Eintrag für
`/api/analytics/by-workspace` (grep = 0 Treffer) — Backend-Doc-Bug laut Mandat 1.
Operator/Backend-Agent informieren; **nicht selbst in `API_DOCS.md` schreiben** (Scope!).

### 2.3 Deploy-Request: Network-Felder (Basis für die Presets)

**Struct** (`src/backend/internal/deploy/projects_ssh.go:61-63`):

```go
NetworkMode string `json:"networkMode"` // "isolated", "jimesh-net", "host", "none"
EnableNAT   bool   `json:"enableNat"`
UseGVisor   bool   `json:"useGVisor"`
```

**Semantik** (projects_ssh.go:1118-1131):
- `isolated` (default) → projekt-eigenes Bridge-Netz `egressNetName(projId)`; mit
  `enableNat=false` wird das Netz `--internal` (kein outbound)
- `jimesh-net` → geteiltes Gateway-Netz
- `host` → `--network host`
- `none` → `--network none`

**gVisor** (projects_ssh.go:1154-1158): `--runtime=runsc`, wenn `runsc` auf dem Host
existiert, sonst ehrlicher runc-Fallback mit stderr-Log.

**Persistiert** über `UpsertProject` (projects_ssh.go:1460-1462): `NetworkMode`, `EnableNAT`,
`UseGVisor`.

**Preset-Mapping nach R33-Blueprint** (`docs/research/R33-projects-to-workspaces-network-tab-handoff.md:60-63`) — empfohlene Verdrahtung:

| Preset | networkMode | enableNat | useGVisor | R33-Begründung |
|---|---|---|---|---|
| **gVisor-NAT** (default, „Highly Recommended") | `isolated` | `true` | `true` | isolierte User-Space-Netzschicht, volles Outbound-NAT, keine exponierten Host-Ports |
| **Airgap** | `none` | `false` | `true` | totale Netz-Isolation, kein In/Outbound |
| **Host-Passthrough** ⚠️ | `host` | `true` (irrelevant unter host) | `false` | hohe Performance, **bypasses kernel isolation** → rotes Warning-Badge |

### 2.4 Live-Checks (heute, 13.9.2026)

```
curl http://localhost:19090/            → 200   (Dev-Container läuft)
curl .../api/sdk/logs?type=audit&limit=2 (ohne Session)
  → 403 {"error":{"message":"/api/sdk/* requires a kind=service consumer key
       (bound to a workspace) — user consumer keys authenticate /v1 only"}}
curl .../api/analytics/by-workspace      (ohne Session) → 401
```

Beide Non-2xx sind **ohne** Dashboard-Token erwartbar (Auth-Gate) — das ist KEIN
Backend-Fehler. **Verifikationsrezept:** im Browser am Dashboard anmelden (AuthGate), den
Token aus `localStorage['jimesh_dashboard_token']` nehmen und
`curl -H "Authorization: Bearer <token>" http://localhost:19090/api/sdk/logs?type=audit`
usw. — dann muss echtes JSON (`{"logs":[…],"count":N}`) kommen.

---

## 3. Frontend-Ausgangslage (alles gelesen, Zeilennummern gegen Working Tree)

### 3.1 ⚠️ KRITISCH — ProjectsPage.tsx trägt uncommittete Parallel-Arbeit

`git status`: `M src/frontend/src/views/ProjectsPage.tsx` (**+829 Zeilen, nicht von dieser
Session**). Enthält bereits:

- `networkMode` / `enableNat` / `useGVisor` als States (Create ~`:330-332`, Edit `:226-230`)
  und `Project`-Interface-Felder (`:45-47`)
- Selects/Checkboxen in **beiden** Dialogen (Create ~`:2071-2120` „Network Mode (gVisor
  runsc)"/„Enable Outbound NAT"/„gVisor Sandbox Isolation"; Edit ~`:2407-2457`)
- **Wire zu Deploy-Request** (`triggerBootstrap` ~`:728-731`) **und** Redeploy
  (`triggerRedeploy` ~`:817-820`): `networkMode`, `enableNat`, `useGVisor`, `installGVisor`
- außerdem: gotty-Framework, vncType/deployType, Node-Provisioning
  (`POST /api/nodes/provision`), Deployments-Dialog (TASK-029 C), Onboarding-Wizard

**Was FEHLT (= Baustein 2 des Tasks):** die **3 geführten Presets** als Picker im
Runtime-Bereich (gVisor-NAT default | Airgap | Host-Passthrough mit rotem Warning-Badge),
die die drei Underlying-States setzen.

**Konsequenz:** Ein Commit von ProjectsPage.tsx nimmt die +829 Zeilen mit. Empfehlung:
akzeptieren und im Commit-Text ausdrücklich benennen (die Presets bauen direkt auf diesem
Wiring auf; hunk-weises Staging ist nicht-interaktiv zu fehleranfällig). Alternativ vorher
den Operator fragen.

**Weitere fremde, uncommittete Frontend-Dateien — NICHT anfassen, NICHT reverten, NICHT
committen:** `src/frontend/vite.config.ts` (Next→Vite-Migrations-WIP), gelöschte
`next-env.d.ts` + `src/vite-env.d.ts`. (Dazu Makefile, `scripts/frontend-entry.sh`,
backend-Dateien, docs/ — alles Parallel-Arbeit.)

### 3.2 App.tsx Routing (`src/frontend/src/App.tsx`)

- Route-Block `:497-549`; `/logs` → LogsPage `:525`
- Nav: `PROXY_BASES` `:90` (enthält `/logs`), `proxyItems` `:97-104`
  (Eintrag `{ to: '/logs', labelKey: 'nav.logs' }` in `:102`)
- **Vorschlag neue Route:** `/sdk-logs` → `SDKLogsPage`; Import in die Reihe `:30-61`,
  Route bei `:525`, `'/sdk-logs'` in `PROXY_BASES` + `proxyItems`-Eintrag
  (`labelKey: 'nav.sdkLogs'`)
- MANDATE 7: nur `src/views/` wird geroutet — `src/pages/` ist ein stale Duplicate, **nicht
  darauf bauen**
- `FULL_BLEED_ROUTES` (`:450`) enthält nur `/projects`; normale Views bekommen automatisch
  die zentrierte `max-w-6xl`-Spalte (`PageContainer` `:467-480`)

### 3.3 LogsPage.tsx ist minimal (16 Zeilen)

`src/frontend/src/views/LogsPage.tsx` = PageHeader + `<RealtimeLogs />` (Server-/Proxy-Logs,
SSE + react-query, `components/realtime-logs.tsx` — gutes Pattern-Beispiel für
Filter-Dropdowns). SDK-Logs ist ein **anderes** Backend (`/api/sdk/logs` ≠ Server-Log).
Task erlaubt beides: neue View SDKLogsPage.tsx ODER LogsPage-Erweiterung. **Empfehlung:**
neue View + eigener Nav-Eintrag, `/logs` unangetastet.

### 3.4 i18n

- Struktur: verschachtelte JSON pro Locale in `src/frontend/src/i18n/locales/`,
  Keys als Dot-Paths (`'nav.logs'`); `en.json` ist Fallback-Bundle; `t()` fällt bei
  fehlendem Key auf `en` zurück, dann auf den Key selbst
  (`src/frontend/src/i18n/I18nProvider.tsx:207-213`)
- `en.json`: `nav` `:2-36` (`"logs": :18`), `logs`-Sektion `:774+`, `network`-Sektion `:1524`;
  `de.json`: `nav` `:2`, `logs` `:817`, `network` `:1524`
- ⚠️ `npm run check:i18n` (`scripts/check-i18n.mjs`, Teil von `npm run test`) erzwingt
  Key-Parität über **alle 60** Locale-Dateien — und ist **schon jetzt rot**: 58 Errors, weil
  die `network.*`-Keys (NetworksPage, Sprint 35) nur in en+de existieren
  (`node scripts/check-i18n.mjs` → "i18n validation failed with 58 error(s)")
- **Entscheidung:** (a) wie NetworksPage nur **en+de** pflegen (Task-Text sagt „i18n de/en"),
  Checker bleibt rot (pre-existing + neue Keys) — oder (b) per Mini-Node-Skript die en-Strings
  in alle 58 anderen Locales kopieren → Checker grün, aber Commit über 60 Dateien.
  **Empfehlung: (a)**, Operator über (b) informieren.

### 3.5 apiFetch (`src/frontend/src/lib/api.ts:70-118`)

- setzt `Authorization: Bearer` aus `localStorage['jimesh_dashboard_token']` (`:77-79`)
- 401 → Token cleared + `UNAUTHORIZED_EVENT` (AuthGate) (`:87-91`)
- non-2xx → `throw new Error(body.error.message)` (`:92-101`) → Basis für ehrliche
  Fehleranzeigen
- ALLE Calls über `apiFetch` (nicht raw fetch, auch wenn NetworksPage das anders macht)

### 3.6 Bausteine

- shadcn (fertig vorhanden): `ui/select.tsx`, `ui/segmented-control.tsx` (Tabs),
  `ui/table.tsx`, `ui/badge.tsx`, `ui/card.tsx`, `ui/button.tsx`, `ui/input.tsx`,
  `ui/skeleton.tsx`, `ui/popover.tsx`, `ui/dropdown-menu.tsx`
- `PageHeader` (`components/page-header.tsx`): title, description, actions, divider
- React Query: QueryClient `App.tsx:66-73` (Mutations toasten Fehler automatisch);
  **Polling = `useQuery({ queryKey: […alle Filter], refetchInterval: 5000 })`**
- lucide-react überall verfügbar
- Es gibt bereits ein SSE für *Agent*-Logs (`/api/agents/logs/stream`, analytics.go:41) —
  das ist NICHT `/api/sdk/logs`; Task sagt explizit: Polling v1, SSE später.

### 3.7 Container/Dev-Setup (Verifikationskontext)

- Container läuft `next dev -p 5173` (`scripts/frontend-entry.sh`: `exec npm run dev`;
  package.json: `"dev": "next dev -p 5173 -H 0.0.0.0"`), Port-Bind `127.0.0.1:19090:5173`
  (`docker-compose.yml:121-141`, Mandat-12-konform)
- **NIEMALS** `next build` / `npm run build` im laufenden Container (13.9.-Lesson)
- tsc: Mandat 6 → `npx tsc --noEmit -p tsconfig.app.json` (tsconfig.app.json existiert;
  `next-env.d.ts`/`vite-env.d.ts` sind im Working Tree bereits gelöscht — falls tsc
  daran stolpert, ist das der im Task gemeinte „stale .d.ts"-Fall)
- `npm run test` = vitest + check:i18n (package.json:10) — siehe §6.2

---

## 4. Implementierungsplan (Empfehlung, konkret)

### Baustein A — `src/views/SDKLogsPage.tsx` (neu)

- `PageHeader` (Title/Desc via `'sdkLogs.*'`)
- type-Tabs `audit | agent | app` (segmented-control; `type` als Query-Param)
- Filter: level (all/INFO/WARN/ERROR/DEBUG), workspace (Input; keine Backend-Liste —
  Vorschlag: `<datalist>` aus den `workspace_id`s der geladenen Rows), session (Input),
  agent (Input), limit (50/100/200/500/1000), range (15m/1h/24h/7d/30d/all)
- `GET /api/sdk/logs` via `apiFetch` + `useQuery`, queryKey mit allen Filtern,
  `refetchInterval: 5000`, Pause/Resume-Button + „Live"-Indikator (lucide RefreshCw/Pause)
- Tabelle (`ui/table`): Zeit (`ts_unix_ms` → lokal formatiert), type, level (farbige Badges),
  workspace_id, agent, session_id, message; `payload` per Popover/Expand (raw JSON anzeigen)
- Ehrliche States (Mandat 2): isLoading → Skeleton; isError → `error.message` prominent;
  leer → „No logs recorded yet"; count anzeigen
- Neben-Panel (lg-Breakpoint): Per-App-Kosten aus `/api/analytics/by-workspace`
  (`useQuery`, `refetchInterval: 30000`): pro `workspaceId` → requests, costUSD, tokens,
  successRate; leer → ehrlicher Empty-State („No workspace traffic yet")
- Optional: Workspace-Filter der Logs spiegelt die Auswahl im Kosten-Panel

### Baustein B — Route + Nav in `App.tsx`

Siehe §3.2 (Import, Route `/sdk-logs`, `PROXY_BASES`, `proxyItems`, `nav.sdkLogs`).

### Baustein C — Network-Presets in `ProjectsPage.tsx`

- In **Create- und Edit-Dialog**, Abschnitt „Runtime & Agent Tools" (Create ~`:1930-1997`):
  3 wählbare Preset-Karten (Grid aus Buttons/divs) gemäß Mapping-Tabelle §2.3
- Auswahl setzt `newNetworkMode/newEnableNat/newUseGVisor` (bzw. `edit*`) — das Wire zum
  Deploy-/Redeploy-Request **existiert bereits** (§3.1), nicht doppelt erfinden
- Host-Passthrough: **rotes Warning-Badge** (`ui/badge`, destructive-Variante +
  lucide `AlertTriangle`) + Hinweistext „bypasses kernel isolation"
- gVisor-NAT als Default mit „Recommended"-Kennzeichnung
- Bestehende rohe Felder (Network-Mode-Select, NAT-Checkbox, gVisor-Checkbox) sichtbar
  lassen und synchron halten (Transparenz), oder durch die Preset-Anzeige ersetzen —
  aber die gesendeten Felder bleiben `networkMode`/`enableNat`/`useGVisor`
- Edit-Dialog: aktuelles Preset aus den vorhandenen Feldwerten rekonstruieren
  (exakte Treffer der 3 Mappings, sonst „custom" anzeigen)

### Baustein D — i18n de/en

- `en.json` + `de.json`: `'nav.sdkLogs'`, Sektion `"sdkLogs"` (title, description, tabs,
  Filter-Labels, empty, error, Kosten-Panel-Texte), Sektion `"networkPresets"`
  (gvisorNat, airgap, hostPassthrough, Beschreibungen, warningBadge, recommended)
- Andere Locales bewusst nicht (§3.4-Entscheidung, Präzedenz `network.*`)

### Reihenfolge

1. SDKLogsPage + Route (unabhängig von der Parallel-Arbeit) → 2. Presets in ProjectsPage →
3. i18n → 4. Verifikation → 5. Commit.

---

## 5. Offene Entscheidungen & Risiken

1. **ProjectsPage-Commit-Kollision** (§3.1): Empfehlung akzeptieren + im Commit-Text
   benennen; sonst Operator fragen.
2. **i18n-Parität rot** (§3.4): pre-existing 58 Errors (`network.*`). Neue Keys erhöhen die
   Fehlerzahl, wenn man dem NetworksPage-Muster folgt. Operator-Info / optionaler
   Aufräum-Task (Skript-Lösung).
3. **API_DOCS.md-Lücke** `/api/analytics/by-workspace` (§2.2): Backend-Doc-Bug (Mandat 1),
   NICHT im Frontend-Scope fixen — Operator/Backend-Agent informieren.
4. **Task-File-Status:** `docs/tasks/subagents/PROMPT-task-051-frontend-finalize.md:3`
   (`Status: 🔲 in-flight`) nach Fertigstellung auf ✅ setzen — die eigene Statuszeile im
   eigenen Task-File ist ok und kollidiert nicht mit dem docs-Parallel-Agent. Der
   Sprint-36-WP1-Checkoff in `docs/sprints/` gehört laut Aufgabenlage zum
   Doku-/Parallel-Agent (im Zweifel Operator fragen).
5. **vite.config.ts** ist fremde Migrations-WIP (§3.7) — exakt festlegen, welche Pfade
   `git add` bekommt.

---

## 6. Verifikationsrezept (nach Implementierung)

1. **Live:** Browser-Anmeldung am Dashboard, dann
   `curl -H "Authorization: Bearer <token>" "http://localhost:19090/api/sdk/logs?type=audit&limit=5"`
   und `.../api/analytics/by-workspace` → echtes JSON. UI-Route
   `http://localhost:19090/sdk-logs` lädt (200), Filterwechsel + Polling sichtbar;
   `docker compose logs frontend` auf Compile-Fehler prüfen.
2. **tsc:** `npx tsc --noEmit -p tsconfig.app.json` — nur auswerten, wenn keine fremden
   Störungen; echte Fehler in den eigenen Dateien müssen weg sein.
3. **Verboten:** `next build` / `npm run build` im laufenden Container.
4. `npm run lint` (optional, aus `src/frontend/`).

## 7. Git-Rezept (Abschluss)

```bash
git add src/frontend/src/views/SDKLogsPage.tsx \
        src/frontend/src/App.tsx \
        src/frontend/src/views/ProjectsPage.tsx \
        src/frontend/src/i18n/locales/en.json \
        src/frontend/src/i18n/locales/de.json \
        docs/tasks/subagents/PROMPT-task-051-frontend-finalize.md
git commit -m "feat(frontend): TASK-051 — SDK-Logs-UI (/api/sdk/logs + Per-App-Kosten) + Network-Presets (gVisor-NAT/Airgap/Host-Passthrough)"
# NIEMALS git add -A; NICHT pushen
```

Im Commit-Text erwähnen: ProjectsPage enthält bereits uncommittete Netzwerk-Wiring aus
vorangehender Parallel-Arbeit (siehe §3.1).

## 8. Fundstellen-Index

| Fundstelle | Was |
|---|---|
| `src/backend/internal/sdklogs/sdklogs.go:67, 253-288` | Route + GET-Handler `/api/sdk/logs` |
| `src/backend/internal/store/sdk_logs.go:23-36, 97-114, 117-126` | SDKLogRow, range, limit |
| `src/backend/internal/gateway/gateway.go:57, 187` | sdklogs-Mount |
| `src/backend/internal/analytics/analytics.go:47` | Route by-workspace |
| `src/backend/internal/analytics/analytics_derived.go:203-245` | Handler + Response-Shape |
| `src/backend/internal/deploy/projects_ssh.go:61-63, 1118-1131, 1154-1158, 1460-1462` | Network-Felder + Semantik + Persistenz |
| `docs/research/R33-...-handoff.md:60-63` | Preset-Definitionen (Blueprint) |
| `src/frontend/src/App.tsx:90, 97-104, 497-549` | Nav + Routing |
| `src/frontend/src/views/LogsPage.tsx` (16 Z.) | bestehende Logs-View |
| `src/frontend/src/views/ProjectsPage.tsx:2071-2120, 2407-2457, 728-731, 817-820` | Network-UI + Deploy-Wire (uncommittet) |
| `src/frontend/src/lib/api.ts:70-118` | apiFetch (Auth + Fehler) |
| `src/frontend/src/i18n/I18nProvider.tsx:207-213` | t()-en-Fallback |
| `src/frontend/scripts/check-i18n.mjs` | Paritäts-Checker (60 Locales) |
| `docker-compose.yml:121-141` | Frontend-Container (127.0.0.1:19090:5173) |
| `API_DOCS.md:1212, 1223` | sdk/logs-Doku; **by-workspace fehlt** |

---

*Dieses Handoff wurde von der Discovery-Session erstellt und ist selbst committet, damit es
im gemeinsamen Working Tree nicht verloren geht. Kein Push. Der Implementierungs-Commit des
TASK-051-Agenten bleibt dadurch frei von Handoff-Anteilen.*
