# R44 — Post-Audit Tasks: Redundanzen, Frontend-Backend-Ausrichtung, API-Docs/OpenAPI

**Datum:** 2026-09-15 · **Quelle:** Operator 15.9. (Jules-Review + eigene
Prioritäten: 1. redundante Implementierungen ixen + Backend→Frontend ohne
Dead Ends, 2. docs_temp + API-Docs/OpenAPI, 3. Jules-Slop-Audit + Store/GC)

## 1. AUDIT-ERGEBNISSE (gemessen, nicht geraten)

### 1a. SSOT-Kette (keine echte Redundanz — Doku fehlt)
`workspace_routes.go (Store-Read) → router_config.go (Gateway-Serve)
→ routes.go (Router-Consume)` — die 080/079-Architektur-Kette. Doku:
SSOT-Kette als Diagramm in ARCHITECTURE.md ergänzen.

### 1b. localStorage-Rests (Mandat-3-Verstöße)
- AnalyticsPage.tsx
- OnboardingPage.tsx
- ProjectsPage.tsx (6 Reefs nach Jules-R42-Rest)
- SecurityGuardDemoPage.tsx
→ TASK-084-WP1

### 1c. Dead Ends (Backend→Frontend)
- /api/llm/policies: backend=0, frontend=0 → TASK-081 (geplant, ok)
- /api/subagents: Frontend-Verbraucher fehlt (SSE-Panel = 074-WP2-Inventar
  Punkt 11) → TASK-084-WP2
- /api/capabilities: frontend=2 (AdminCapabilitiesPage) ✓
- /api/control-planes: frontend=1 (ControlPlanesPage) ✓
- /api/secrets-engines: frontend=1 (VaultDashboardPage) ✓

### 1d. OpenAPI-Infra: KEINE (go.mod: 0 Treffer huma/swaggo/openapi)
Die 078-"huma"-Referenz = Headscale's eigene API-Surface, nicht unsere.
→ TASK-085 (OpenAPI aus der API generieren + Static-Render im Build)

---

## 2. TASK-PLAN (die 3 Operator-Prioritäten)

### TASK-084 — Redundanzen ixen + Frontend-Backend-Ausrichtung (P0)
- **WP1 localStorage-Rests:** AnalyticsPage/OnboardingPage/ProjectsPage/
  SecurityGuardDemoPage — jede localStorage-Nutzung klassifizieren:
  UI-Präferenz (ok) vs. Persistenz-Täuschung (Mandat-3-Verstoß → echte
  Backend-Route oder Feature entfernen)
- **WP2 Dead Ends:** /api/subagents Frontend-Verbraucher (SSE-Panel + Injektion
  security-critical = 076-Feature sichtbar machen); /api/llm/policies folgt
  mit TASK-081
- **WP3 SSOT-Doku:** Router-Config-Kette (Store→Gateway→Router) als Diagramm
  in ARCHITECTURE.md; MiniSidebar/SectionRail SSOT (section-nav.ts) dokumentieren
- **WP4 Redundanz-Sweep:** grep-Verifikation — keine zweite Implementierung
  einer Backend-Fläche im Frontend (jede Route hat GENAU EINEN Verbraucher)

### TASK-085 — docs_temp + OpenAPI-Pipeline (P1)
- **WP1 docs_temp:** öffentliche Doc-Kandidaten migrieren (API_DOCS.md,
  ARCHITECTURE.md, USER_GUIDE.md, K-LAF-ARCHITECTURE.md, PACKAGES.md,
  DATA-SCHEMA.md, PROVIDER-TOS.md, FEATURE_ROADMAP.md, PRODUCT_ROADMAP.md,
  i18n/) — internal-Referenzen scrubben, GO-PUBLIC §2-Liste als Filter
- **WP2 OpenAPI-Generierung:** huma-Framework (leichteste Go-OpenAPI-Lösung,
  net/http-nativ, kein Codegen-Zwang) an den gateway-mux — jede Route
  annotiert → /openapi.json Endpoint im Backend
- **WP3 Static-Render im Build-Workflow:** openapi.json → Static-HTML-Renderer
  (Scalar/Stoplight-Elements als dist-Asset, KEIN Docusaurus/MkDocs-Framework)
  — GitHub-Pages-Workflow (gh-pages oder /docs im main-Branch, Frontend-Build
  + API-Docs im selben Workflow)
- **WP4 Blog-Integration:** ji-podhead/articles-Repo-Inhalt als Blog-Sektion
  der Static-Site (Build-Workflow rendert die Artikel-Markdown-Files zu HTML)
- **Operator-Entscheidung:** eigene Website vs. GitHub-Pages — GitHub-Pages
  empfohlen (Workflow läuft im Repo, kein extra Hosting)

### TASK-086 — Jules-Slop-Audit + Store/GC (P2, nach 084/085)
- **WP1 Slop-Audit:** Jules läuft den R39-Muster-Scan über alle Views
  (Fake-Success, localStorage-Persistenz, stiller Fail, Mock-Daten)
- **WP2 SSOT-Verletzung-Scan:** jede Backend-Fläche hat GENAU EINEN
  Frontend-Verbraucher (Dead-End-Verifikation wie §1c, automatisiert als
  Skript-Check im CI)
- **WP3 Store/GC:** React-Query-Subscriptions auditieren — stale Cache-GC
  (garbageCollection-Zeit konfigurieren), Query-Keys mit dem SSOT-Schema
  (globale Registry statt verstreuter Literal-Keys), ungenutzte Subscriptions
  unsubscriben
- **WP4 Redundanz-Gate:** ein CI-Check der TASK-084-WP4-Verifikation
  automatisiert (Route↔Consumer-Matrix als Test)

---

## 3. JULES-REVIEW (der +6-1-Diff)

| Claim | Bewertung |
|---|---|
| R41 [x] Dead-Code | ✅ konsistent (DiscoveryStatus etc. gelöscht — im Jules-Branch verifiziert; auf main kommt es mit diesem Merge) |
| R42 [x] ProjectsPage 2257→1299 | ⚠ optimistisch — die 6 localStorage-Rests sind laut Audit §1b noch da (Jules' R42-Teil, mein Rest-Audit) |
| R43 [x] Headscale-Proxy + Firewall-UI | ✅ konsistent mit 078-Merge + FirewallRulesSection |
| 049/080 [ABGESCHLOSSEN] | ⚠ optimistisch — 049-Rest (Project-Model + Discovery) offen |
| 081/082/083 [geplant] | ✅ konsistent mit R43-Register |
| Doku-Sync-Report | ✅ berechtigt — API_DOCS hat die neuen Routen-Sektionen (070/078/080/066-Merges) NICHT vollständig (Jules' Claim war teilweise richtig, meine Widerlegung teilweise) — TASK-085-WP2 schließt die Lücke strukturell (OpenAPI statt manuelles Sync) |

**Fazit:** Jules-Diff mergen (die +6 Zeilen sind konsistent), die optimistischen
Claims im Register korrigieren (049-Rest offen, R42-Rest offen).
