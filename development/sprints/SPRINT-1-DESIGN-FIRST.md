# SPRINT 1: DESIGN-FIRST — JiMesh UI mit Google Stitch

| | |
|---|---|
| **Status** | Teilweise abgeschlossen — 56 Stitch-Screens generiert, P0-Fundament gebaut, Frontend-Pages live |
| **Ziel** | Die komplette JiMesh-UI erst DESIGNEN (Stitch), dann implementieren |
| **Dauer** | 1 Woche |
| **Prinzip** | "Wir bauen JiMesh mit JiMesh" — Stitch ist das Tool, JiMesh ist die Plattform |

---

## Plan (Arbeitspakete)

### WP1: Stitch-Designs erstellen (Operator macht das selbst)
- [ ] Alle 6 Stitch-Prompts aus `docs/PROMPTS-STITCH-DESIGN.md` in Stitch eingeben
- [ ] Screenshot vom aktuellen Dashboard (`jimesh-dashboard.png`) als Referenz hochladen
- [ ] Pro View ein Design exportieren (PNG + HTML)
- [ ] Feedback-Loop: Designs reviewen → anpassen → finalisieren

### WP2: Design-Assets in JiMesh importieren
- [ ] Backend: `POST /api/designs` (Design-Session aus Stitch importieren)
- [ ] Backend: `GET /api/designs/{id}` (Design-Session mit Assets + Chat-History)
- [ ] Frontend: Design-Folder unter Project (Custom Category "Stitch Designs")
- [ ] Frontend: Design-Session-Card mit Asset-Preview
- [ ] Stitch-Plugin: API-Key im Vault, MCP/REST-Verbindung

### WP3: Scope-Fundament (P0 aus Master-Plan)
- [x] Component-Schema-Typen anlegen (`types/domain/overview.ts` — 23 Typen aus COMPONENT-SCHEMA.md) — implementiert: `src/frontend/src/types/domain/overview.ts` (§1 wörtlich, OVERVIEW_SCHEMA_VERSION=1, A–F-Blöcke)
- [x] Scope-Multiauswahl in `global-scope.ts` (additives SelectionSet, non-breaking) — implementiert: `src/frontend/src/lib/global-scope.ts` (`SelectionSet { kind, ids, anchorId? }`, Persistenz `jimesh.global-selection`, `useGlobalSelection`/`toggleGlobalSelection`, Anker-Bridge nur setScope→Selection)
- [ ] Overview-Page /overview mit `react-grid-layout` + OverviewGrid — TEIL 1 erledigt: react-grid-layout **v2.2.4** installiert (npm-Fakten beim Bau neu geprüft, Master-Plan P1-2: v2 bringt eigene Typen mit; @types@1.3.6 deklariert die v1-API und wurde entfernt) + `src/frontend/src/components/overview/OverviewGrid.tsx` (12-Spalten-Grid, Cards mit title/badges/links/status, deterministisches Layout aus Widget-Specs, ehrlicher Empty-State). Noch offen: /overview-Route + Navbar-Tab + Adapter-Registry + i18n-Keys
- [ ] ScopeSelector reaktivieren oder ersetzen (der ist toter Code — IA-SPEC Fund)
- [ ] 6 scope-blinde Pages auf Scope umstellen
- [ ] Breadcrumb/Back-Button: App → Workspace → Project → Target → All

### WP6: Stitch-Security-Pages implementieren (Security-Screens → echte Pages)
Ziel: die drei Security-Stitch-Designs (SIEM-Timeline, Security Findings refined, Firewall Rules)
als echte, ehrliche Pages bauen — keine Mocks, echte API-Aufrufe via useQuery, i18n über alle Locales.

- [ ] SIEM-Events (/security/siem): Timeline-View über der bestehenden Event-Liste — horizontale
      Zeitachse, Events in 24 Bins nach Timestamp gestapelt, farbcodiert nach Severity
      (critical=rot, high=orange, medium=gelb, low=blau, sonst neutral), Severity-Chips mit
      echten Counts als Filter (design-assets/stitch/jimesh-siem-events-timeline.html §4)
      — implementiert: `src/frontend/src/lib/siem-timeline.ts` (reine Bin-Helfer, unparsebare
      Timestamps werden ehrlich ausgeschlossen + gezählt, Mandat 2) +
      `src/frontend/src/views/SIEMEventsPage.tsx` (Datenquelle bleibt SIEMEvent aus lib/store.tsx —
      dieselbe echte /api/sdk/logs?type=audit-Query wie vorher, kein neuer Fetch-Pfad)
- [ ] Security Findings (/security/findings, NEU): Findings-Liste mit Severity-Badges,
      Source-Badges (Scanner aus den echten Daten: checkov/gosec/snyk/…), Resolve-Button (grün) +
      Dismiss-Button (grau outline) — beide nutzen den existierenden
      POST /api/security/findings/dismiss (ein Read-State-Flag im Backend, Mandat 2: nichts erfunden);
      Dismissed-Sektion aus GET /api/security/findings/dismissed; Feed = dieselben echten Quellen wie
      die Bell (GET /api/sdk/logs?type=audit + GET /api/security/events via lib/security-overview.ts)
      — implementiert: `src/frontend/src/views/SecurityFindingsPage.tsx` + Route in App.tsx +
      nav.securityFindings in lib/section-nav.ts + Sidebar-Link
- [ ] Firewall Rules (/security/firewall-rules): Provider-Status-Panel über der Tabelle —
      nftables=LIVE (grün, der Managed-Engine hinter den Grants), OPNsense=INTERFACE-READY (gelb),
      Cloud Security Groups=PLANNED (grau), BYOF=PLANNED (grau) — Read-only-Badges, kein Schalter;
      nftables-Karte zeigt dazu den echten gemessenen Router-State aus GET /api/firewall/status
      (routerSeen/stale/hostname/reportedAt) — implementiert: `src/frontend/src/views/FirewallRulesPage.tsx`
      (Provider-Architektur wie in internal/security/firewall.go dokumentiert; geplante Provider sind
      als solche beschriftet, nie als live behauptet)
- [ ] i18n: neue Keys siemAudit/siemTimeline/securityFindings/firewallRules.providers +
      nav.securityFindings/sidebar.securityFindings — en/de kuratiert, 58 weitere Locales per
      scripts/backfill-i18n.mjs, npm run check:i18n grün

### WP4: Brand/Logos
- [ ] Richtiges JiMesh-Logo erstellen (aktuell: generisches favicon.svg)
- [ ] Logo in `repo-assets/brand/` ablegen + im Frontend referenzieren
- [ ] Provider-Logos aus `assets/icons/providers/` für Keys-Page
- [ ] App-Type-Icons: agent/ide/shell/frontend/backend/database/tool/browser

---

## Akzeptanz
- [ ] Stitch-Designs für alle 6 Views vorhanden (Sidebar, Overview, Integrations, Onboarding, Browser, Scope)
- [ ] Design-Assets in JiMesh unter einem Project sichtbar
- [ ] Scope-System funktioniert: Sidebar-Klick → Overview folgt
- [ ] Logos sind die echten JiMesh-Logos

## Referenzen
- Design-Prompts: `docs/PROMPTS-STITCH-DESIGN.md`
- Component-Schema: `docs/COMPONENT-SCHEMA.md` §1 (TypeScript-Typen)
- Overview-Spec: `docs/FE-OVERVIEW-SPEC.md` §4 (Grid) + §5 (Multiauswahl) + §6 (Navbar)
- IA-Spec: `docs/FE-IA-SPEC.md` §2 (Scope-Modell) + §3 (Fix-Liste P0)
- Master-Plan: `docs/MASTER-PLAN.md` §2 (P0-Items)