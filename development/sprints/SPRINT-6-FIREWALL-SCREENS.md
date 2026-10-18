# SPRINT-6 — FIREWALL-SCREENS (Provider-Setup-Wizard, Traffic-Log, OPNsense-Config)

> Worktree: `/tmp/wt-s2`, Branch `wt-s2-firewall` (WORK-SPLIT-2026-09-20: „OPNsense Config + Firewall Provider Setup + Traffic Log“ — Frontend, gegen ECHTE Routen, kein Mock).

## Ziel

Drei fehlende Security-Screens aus den Stitch-Designs als echte React-Seiten bauen — vollständig gegen die existierenden Backend-Routen (API_DOCS.md verifiziert), mit ehrlichen Not-implemented-Zustaenden dort, wo das Backend eine Flaeche bewusst nicht hat (Mandate 2):

| # | Route | Design | Datenquellen (echt) |
|---|---|---|---|
| 1 | `/security/firewall/provider-setup` | `design-assets/stitch/jimesh-firewall-provider-setup-wizard.html` | `GET /api/firewall/status`, `GET /api/firewall/rules` |
| 2 | `/security/firewall/traffic` | `design-assets/stitch/jimesh-firewall-traffic-log.html` | `GET /api/sdk/logs?type=audit&range=…&limit=500` (SIEM-Feed Wazuh/Falco — dieselbe Quelle wie Security-Glocke und Overview-Panel, `lib/security-overview.ts`) |
| 3 | `/security/firewall/opnsense` | `design-assets/stitch/jimesh-opnsense-firewall-config.html` | `GET /api/firewall/status`, `GET /api/firewall/rules` |

## Backend-Wahrheit (Belege, verifiziert vor Bau)

- **Provider-Modell** (`src/backend/internal/security/firewall_provider.go`): `FirewallProvider` ist die Naht; **nftables ist die EINZIGE Implementierung** (live, gemessen vom Router-Node via `POST /api/firewall/report`). OPNsense/pfSense + Cloud-Security-Groups sind dort wortwoertlich „explicitly out of scope here“ → ehrlicher UI-Zustand **INTERFACE-READY**. BYOF ist dokumentierter Stub (API_DOCS.md: „deliberately NOT built, E-Priority“) → **PLANNED**.
- **Keine Provider-Routen**: `GET /api/firewall/providers` und `POST /api/firewall/providers/opnsense/config` existieren NICHT (gateway.go kennt nur status/rules/report/config) — OPNsense-Credentials-Formulare bleiben read-only + „not implemented yet“, kein Fake-Erfolg.
- **Firewall-Routen** (API_DOCS.md, session-gated): `GET /api/firewall/status` (letzter Router-Report: capabilities/rules/enforcement/routerSeen/stale; ehrlicher Empty-State wenn noch kein Router gemeldet hat), `GET /api/firewall/rules` (Managed Grants, `{version, rules}`).
- **Traffic-Log-Quelle**: eine dedizierte Firewall-Paket-Log-Route existiert nicht; `/api/traffic` ist LLM-Proxy-Telemetrie (nicht Firewall). Ehrliche Quelle ist der SIEM-Audit-Feed (`GET /api/sdk/logs`, alias wazuh|falco) — genau was SecurityOverviewPage/SecurityFindingsPage/Glocke aggregieren.

## Work Packages

- **WP1** `lib/firewall-provider.ts` — geteilte Typen (Capabilities/EffectiveRule/FirewallEnforcementState/Status-Response, 1:1 vom Go-Modell gespiegelt) + ehrlicher Provider-Katalog mit Backend-Zitaten.
- **WP2** `views/FirewallProviderSetupPage.tsx` — 3-Schritt-Wizard: (1) Provider-Auswahl (4 Cards: nftables LIVE mit echten Fakten aus dem Router-Report, OPNsense INTERFACE-READY, Cloud-SG/BYOF PLANNED), (2) Verbindungsdaten (nftables: keine noetig — Router meldet autonom mit Service-Key, echte Report-Identitaet; OPNsense: Formular read-only + not-implemented-Banner), (3) Test-Connection gegen `GET /api/firewall/status` (echter HTTP-Test, Ergebnis 1:1). Router-Enforcement-Matrix (per-Alias applied/skipped/error) statt der Design-Mock-Node-Tabelle.
- **WP3** `views/FirewallTrafficLogPage.tsx` — Stats-Tiles (Events/Critical/Warning/Sensors, Frontend-Aggregation des echten Feeds), Range-Pills (echter `range`-Param), Level/Sensor/Search-Filter, Tabelle mit Timestamp/Level/Sensor/Netzfeldern (nur wenn Falco-Payload sie traegt: fd.sip/fd.sport)/Attribution/Message + ausklappbarem Payload-Drawer (Wazuh rule/decoder/full_log, Falco rule/priority/fields), Pause/Live-Umschaltung (Poll-Toggle), CSV-Export der angezeigten ECHTEN Zeilen, ehrliche Empty-States + Quellen-Banner (kein Paket-Log-Route — SIEM-Feed ist die Quelle).
- **WP4** `views/OpnsenseFirewallConfigPage.tsx` — OPNsense-Provider-Status (INTERFACE-READY aus dem Backend-Modell), echter Live-Zustand des nftables-Routers daneben; Credentials-/Sync-Sektionen klar als geplant markiert (read-only, noetige Route existiert nicht); Sync-Log ehrlich leer.
- **WP5** Routen in `App.tsx` (AuthGate-Splat-Baum, Security-Children) + Nav in `lib/section-nav.ts` (securityItems).
- **WP6** i18n: alle neuen Keys sprachlich korrekt in ALLE 60 Locale-Dateien (`src/frontend/src/i18n/locales/*.json`), `npm run check:i18n` gruen.
- **WP7** Verifikation: `npx tsc --noEmit -p tsconfig.app.json` — 0 Fehler in den neuen Dateien; keine neuen Fehler im Bestand.

## Abnahme-Kriterien

- Alle drei Routen rendern im AuthGate-Splat-Baum und sind ueber die Security-Section-Nav erreichbar.
- Kein erfundener Datenpunkt: jede Zahl auf den Screens stammt aus einer echten API-Antwort (Status/Regeln/SIEM-Feed) oder ist ein ehrliches „—“/Empty-State.
- OPNsense-/Cloud-/BYOF-Konfiguration luegt nie: read-only + erklaerter Grund (fehlende Route/Implementierung, mit Beleg).
- i18n-Gate gruen, tsc 0 neue Fehler, Commit auf `wt-s2-firewall` (nicht gepusht).
