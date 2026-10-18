# SSOT-Kette — Route-Consumer-Matrix

**Stand:** verifiziert gegen Stack `jimesh-jimesh-1` (Gateway 127.0.0.1:19091→3010)
**Anlass:** Sprint 43 / TASK-084-WP3 — „SSOT-Kette undokumentiert"
**Mandat:** nur geprüfte Aussagen — jede Zeile unten ist gegen Quelltext (Route-Registrierung)
und/oder Live-Antwort geprüft (curl, ohne Session: 404 = keine Route, 401 = Route existiert
hinter Auth-Middleware).

## Die Kette

```
PostgreSQL (Settings/Tabellen)
   │  Store-Schicht (src/backend/internal/…)
   ▼
Gateway-Mux (src/backend/internal/gateway/gateway.go + Domain-Handler)
   │  GET /api/…   (Auth-Middleware davor)
   ▼
SSOTProvider — src/frontend/src/lib/store.tsx (6 React-Query-Feeds, staleTime 30 s)
   │  useSSOTStore()
   ▼
Views/Components (verifizierte Imports: SIEMEventsPage, ProjectSecretsPage,
HierarchySidebar — src/frontend/src/components/sidebar/HierarchySidebar.tsx)
```

## Route-Consumer-Matrix (SSOT-Feeds, store.tsx)

| # | Route (QueryFn) | Backend-Registrierung | Store-Feld | Frontend-Consumer (verifiziert) | Status |
|---|---|---|---|---|---|
| 1 | `GET /api/settings/ssh_endpoints` | Settings-Handler (via Settings-Tabelle)¹ | `targets` | HierarchySidebar (L1) | ✅ gefixt (war toter Consumer, s. u.) |
| 2 | `GET /api/workspaces` | gateway.go:227 → handleWorkspaces | `workspaces` | HierarchySidebar (L2) | ✅ |
| 3 | `GET /api/projects` | deploy.go:51 → handleProjectsList | `projects` | HierarchySidebar (L3) | ✅ |
| 4 | `GET /api/deployments` | **existiert nicht** (kein HandleFunc, 404 live) | `apps` | HierarchySidebar (L4) | ⚠️ Consumer ohne Route — Finding, s. u. |
| 5 | `GET /api/firewall/rules` | security.go:109 → handleFirewallRules | `firewallRules` | (Store-Rest; Firewall-RulesPage nutzt eigenen Feed) | ✅ |
| 6 | `GET /api/sdk/logs?type=audit` | sdklogs.go:67 → handleSDKLogs | `siemEvents` | SIEMEventsPage | ✅ |

¹ Route selbst registriert im Settings-Domain-Handler (Pattern `/api/settings/{key}`);
die Endpoints-Verwaltung (lib/ssh-endpoints.ts, `fetchEndpoints`) nutzt exakt dieselbe
Quelle — Settings-Key `ssh_endpoints`.

## Findings aus der Verifikation

1. **Toter Consumer „targets" (gefixt):** `store.tsx` fragte `GET /api/ssh-endpoints` —
   diese Route existiert im gesamten Backend nirgends (kein `HandleFunc` in
   `src/backend`; live `404 page not found` am Gateway). Folge: `targets` war im
   SSOT-Store strukturell immer `[]`. Fix: QueryFn auf `GET /api/settings/ssh_endpoints`
   umgestellt (gleiche Route wie `fetchEndpoints()`); Response-Shape `{endpoints: [... ]}`
   passt zu `listFrom(…, 'endpoints')`.
2. **Consumer ohne Route „apps" (offen):** `store.tsx` fragt `GET /api/deployments`
   (unscoped) — registriert sind nur `/api/projects/{id}/deployments*`
   (deploy.go:69-71). Folge: `apps` ist im SSOT-Store strukturell immer `[]`,
   `portLookupTable` leer. Fix-Optionen: (a) aggregierter Backend-Route
   `GET /api/deployments` (Store-Layer liefern Deployments über alle Projekte),
   (b) QueryFn auf projektweise Feeds umbauen (N-Requests — nicht gewählt).
   → gehört zur TASK-086-Abnahme (Matrix-CI-Gate „Consumer ohne Route = Fail").
3. **Auth-Maske:** unbekannte und geschützte Routen antworten am Gateway beide
   ohne Session — Existenzbeweis nur aus dem Quelltext (Route-Registrierung),
   nicht aus der Live-Antwort allein.

## Query-Key-Status (TASK-086-Vorarbeit)

Registry-Keys (lib/query-keys.ts): `workspaces`, `projectsList`, `firewallRules()`.
Inline-Keys im SSOT-Store: `['ssh-endpoints-ssot']`, `['deployments-ssot']`,
`['siem-audit-logs-ssot']` → Migration auf die Registry ist Teil von TASK-086.

## Verifikation (Befehle)

- Route-Registrierungen: `grep -rn 'HandleFunc' src/backend/internal --include='*.go'`
  (Zeilen oben wörtlich zitiert).
- Live: `curl http://127.0.0.1:19091{,/api/workspaces,/api/ssh-endpoints,/api/deployments}`
  → 200 / 401 / 404 / 404 (Gateway identifiziert via `docker ps` + `/health`).
- Consumer-Imports: `grep -rn 'useSSOTStore' src/frontend/src` → SIEMEventsPage,
  ProjectSecretsPage, HierarchySidebar.
- Suite: `npm test` 27 Dateien / 285 Tests ✅ · i18n-Gate 2218 Keys / 60 Locales ✅ ·
  `tsc --noEmit` 211 (vorher 212 — Basis verbessert, kein neuer Fehler).
