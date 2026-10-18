# MASTER-PLAN — JiMesh Master-Implementierungsplan

**Status:** Plan (aus allen Research-Docs konsolidiert, am echten Code verifiziert) — kein Code in dieser Änderung.
**Basis-Docs:** docs/FE-IA-SPEC.md, docs/FE-PLUGINS-CONCEPT.md, docs/FE-OVERVIEW-SPEC.md, docs/FE-IAC-DISCOVERY-SPEC.md, docs/COMPONENT-SCHEMA.md, docs/RESEARCH-SAM-ONTOLOGY.md, docs/DESIGN-ASSET-MANAGEMENT-SPEC.md, docs/RESEARCH-UPDATE-SESSION-INPUT.md, docs_dev/research/reports/01–04.
**Verifikation:** Kern-Assertions wurden per grep/read gegen den echten Code geprüft (Abschnitt 2.6). Was nicht am Code prüfbar war, ist als **[unverifiziert]** markiert.
**Mandate:** Umsetzung folgt MANDATES.md + Agents.md-Doku-Pflicht (API_DOCS.md, Sprint-File, Backlog-Mirror — `docs/sprints/` und `docs/backlog/BACKLOG.md` existieren inzwischen [geprüft 3.10.2026]; der frühere Hinweis, diese Orte fehlten, ist gegenstandslos).

---

## 1. Executive Summary

### 1.1 JiMesh heute (3 Sätze)

JiMesh ist ein Betriebssystem für Agenten-Infrastruktur: ein reines Go-Backend (PostgreSQL via pgx, OPA-Engine, Redis-Feedback-Loop) plus React/Next-SPA, das über eine 4-Tier-Hierarchie (SSH-Target → Workspace → Project → App) Container-Deploys auf fremden SSH-Nodes orchestriert, einen LLM-Proxy mit Chains/Budgets betreibt und einen Security-Stack (Vault, Firewall, SIEM-Feeds, IaC-Quarantine-Gate, OPA-Capability-Gates für Subagent-Tool-Calls) mitbringt. Das Frontend hat ein ausgebautes Nav-System (Workspaces/Security/Admin/LLM-Proxy, 60 Locale-Dateien), aber sein globales Scope-System ist halb tot: nur 3 Seiten konsumieren es, der hierarchische ScopeSelector ist unmontiert, und „App“ bedeutet drei verschiedene Dinge (SSOT-Row aus GET /api/deployments, Discovery-Container, deploytes Projekt). Access ist fragmentiert — Keycloak-Realm-Rollen sind global, Budgets wirken nur agent-seitig (Proxy/Spawn), Teams sind reine Registry ohne Wirkung, project_roles ist WIP ohne Frontend — und die Persistenz ist in 30+ einzelne Tabellen zersplittert, ohne einheitliches Component-Schema im Store.

### 1.2 Die 5 wichtigsten Erkenntnisse aus allen Specs zusammen

1. **Das Domänenmodell „App/Deployment/Interface“ ist die größte Wahrheitslücke.** Der Deploy-Pfad persistiert **keine** Deployment-Rows und keine Interfaces — Ports landen in der projects-Row, Interfaces existieren nur als Frontend-Heuristik (framework.includes('opencode')), und „Plugins“ (TASK-103) sind tatsächlich Auth-Integrationen, die zusätzlich **nicht persistiert werden** (gateway/plugins.go:51–63 [verifiziert]). FE-PLUGINS-CONCEPT löst das mit App → Deployment → Interface → Plugin-Badge; COMPONENT-SCHEMA konsolidiert es kanonisch.
2. **Alle FE-Specs konvergieren in EIN kanonisches Component-Schema** (23+ Typen, OverviewComponent mit Parent/Child-ScopeRef, Badge-/Widget-Katalog, serialisierbar) als Fundament für Overview-Grid, Multiauswahl, Dashboard-Builder und späteres SAM. Das Schema ist heute nur Frontend-Ableitung; RESEARCH-SAM-ONTOLOGY bestätigt per Open-Source-Vergleich (Ralph/NetBox/GLPI): relational nachbauen (CI-Tabelle + Edge-Tabelle), kein RDF/Graph-DBMS.
3. **Scope & Navigation sind der Grundbaustein für alles FE.** Fünf koexistierende Selektions-Mechaniken, unmounteter Selector, fehlende Breadcrumbs — erst das Pfad-Scope-Modell (all ⊃ target ⊃ workspace ⊃ project ⊃ app, Override nach unten) macht Overview-Seiten, Team-Bindings-Sicht und Interfaces-Tabs überhaupt kohärent. [Verifiziert: das 'all'-Kind existiert inzwischen bereits, global-scope.ts:25; die FE-IA-SPEC ist hier leicht veraltet — der Rest des Befunds hält.]
4. **Access braucht ein Vererbungsmodell, nicht mehr Einzelmechanismen.** Teams wirken nicht, Budgets sind personengebunden, project_roles strikt pro Project — der vorgeschlagene Fix (team_resource_bindings mit resource_type/resource_id/role/inherit, „spezifischster Binding gewinnt“) ist zugleich der Baustein, den die SAM-Ontologie als „Ownership“ benennt.
5. **Die Security-Reports benennen reale Lücken mit fertigen Bauplänen:** (a) Vault-ACL wird nicht enforced (allowed_agents/agent_id werden geschrieben, nie geprüft — Report 03, reale Schwachstelle); (b) Tool-Call-Responses laufen ungeskannt in den Modell-Kontext (Report 02, DLP); (c) es gibt keinen statischen Scan der Agent-Konfigurationen (Report 01); (d) kein OTel-Tracing, Ledger bleibt Ground-Truth (Report 04). Alle vier sind Phasenpläne mit Go-only-Umsetzung auf bestehender Infrastruktur.

---

## 2. Alle offenen Items — priorisierte Liste

Legende: **BE** = Backend-Änderung nötig, **FE** = Frontend-Änderung nötig. Aufwand = 1 erfahrener Entwickler. Quellen in Klammern (Spec §).

### P0 — blockiert alles andere

| ID | Konkretes Was-zu-tun | Aufwand | Abhängigkeiten | BE | FE |
|---|---|---|---|---|---|
| **P0-1** | **Scope-System auf Pfad-Modell bringen und den ScopeSelector montieren:** ScopeKind auf all/target/workspace/project/app/session erweitern (ssh→target umbenennen, appId statt containerId), localStorage-Parser migrieren, lib/scope-match.ts (isInScope über die 4-Tier-Kette inkl. nodeHost/nodeUser-Fallback als wiederverwendbare Funktion) bauen und den unmontierten scope-selector.tsx in Sidebar/Navbar mounten. (FE-IA §2.1) — *Hinweis: 'all' existiert bereits [verifiziert], der Umbenennungs-/Match-Teil bleibt.* | 2–3 Tage | — | nein | **ja** |
| **P0-2** | **Kanonisches Component-Schema als FE-Typen anlegen:** types/overview/component.ts (Basis OverviewComponent, ScopeRef, Badge-/Widget-Typen, OVERVIEW_SCHEMA_VERSION = 1) + types/domain/interfaces.ts (Deployment, InterfaceSpec, FrameworkId) exakt nach COMPONENT-SCHEMA §1 — ohne Adapter, nur Typen. (COMPONENT-SCHEMA §1) | 1 Tag | — | nein | **ja** |
| **P0-3** | **Deploy-Pfad persistiert Deployment-Rows + Interfaces:** DDL deployments um workspace_id, framework, interfaces JSONB erweitern (idempotent, columnExists-Muster), executeDeploy schreibt nach Port-Allokation eine DeploymentRow + InterfaceRecords aus allocatedPort/allocatedVncPort/allocatedVSCodePort/shellAccess, Deploy-Response + GET /api/deployments + GET /api/projects/{id}/deployments um interfaces erweitert, POST /api/projects/{id}/deployments als Admin/jimeshctl-Pfad dokumentieren. (PLUGINS §7.3, §8.2-P1) | 2–3 Tage | — | **ja** | nein |

### P1 — hoher Wert

| ID | Konkretes Was-zu-tun | Aufwand | Abhängigkeiten | BE | FE |
|---|---|---|---|---|---|
| **P1-1** | **Alle 6 scope-blinden Pages auf den globalen Scope umstellen** (WorkspacesPage, WorkspaceAppsPage, WorkspaceSettingsPage, NetworkEditingPage, SecurityExposurePage, ProjectSecretsPage inkl. ws:/prj:-Mapping): All-Option (Wert 'all', nicht ''), Initialwert aus Scope, Auswahl schreibt zurück (Both-Way-Sync), Pflicht-UI Scope-Chip + Clear nach FirewallRulesPage-Muster; scope-usage-schema.ts bekommt einen echten Verbraucher (schema-gesteuertes Rendering). (FE-IA §2.5, §4) | 3–4 Tage | P0-1 | nein | **ja** |
| **P1-2** | **Overview-Page /overview bauen:** react-grid-layout (MIT) installieren (npm-Fakten der Spec [unverifiziert], beim Bau neu prüfen), OverviewGrid/ComponentCard, Adapter-Registry lib/overview/build.ts zuerst für die 4 Kern-Typen (ssh-target, workspace, project, app) + abgeleitete container, grouped/flat-Umschalter, Layout-Persistenz über Settings-KV-Key overview_layouts (Route existiert bereits), Navbar-Gruppe an erster Stelle, i18n-Keys in allen 60 Locale-Dateien. (OVERVIEW §3–§6) | 4–5 Tage | P0-1, P0-2 | nein | **ja** |
| **P1-3** | **Multiauswahl (SelectionSet) implementieren:** paralleler Store jimesh.global-selection mit Anker-Bridge (setScope leitet Selection ab, setSelection setzt Anker-Scope), Cmd/Ctrl+Klick in der Sidebar ohne Navigation, Chip-Leiste, Union-Filter componentMatchesSelection in der Overview; ids.length===1 ⇒ byte-identisch als Non-Breaking-Test. (OVERVIEW §5) | 2 Tage | P1-2 | nein | **ja** |
| **P1-4** | **Team→Server-Zugriff über Ressourcen-Bindings:** Tabelle team_resource_bindings (Ensure-Pattern), Routen GET/POST /api/team-bindings, DELETE /api/team-bindings/{id}, GET /api/team-access, OPA-Modul team-bindings.rego (fail-closed), Go-Gate TeamBindingGate + Middleware-Zweitchance im Admin-Mutation-Branch, TeamsPage-Sektion „Ressourcen-Bindings“, Access-Section in Target-/Project-Overview. (FE-IA §2.6) | 3–4 Tage | P0-1 (für Overview-Sicht); Teams-Registry existiert | **ja** | **ja** |
| **P1-5** | **Interfaces-UI wahr machen:** lib/interfaces.ts (zentraler URL-Builder, ersetzt iframeUrl-Heuristik), AppOverviewPanel mit deklarativen Tabs aus deployment.interfaces, Einbau in ProjectsPage + neue Route /workspaces/apps/:appId, Interfaces-Tab (Primary) mit Run-Historie zugeklappt, Apps-Tab-Spalte „Interfaces“, HierarchySidebar-Badges, Nav-Label workspaceDeployments → workspaceInterfaces (section-nav.ts), DeploymentsDialog → InterfacesDialog. (PLUGINS §5, §6, §8.2-P0/P2) | 3–4 Tage | P0-3, P0-2 | nein | **ja** |
| **P1-6** | **TASK-103-Rename zu „Integrations“ + Persistenz:** Routen /api/plugins → /api/integrations, /api/plugin-installations → /api/integration-installations (Handler + Register + FE-Typen + i18n), NEU Tabelle plugin_installations und echte Persistenz statt hartkodiert []/Echo; API_DOCS im selben Change. (PLUGINS §2.2, §7.2; COMPONENT §9-5) | 1–2 Tage | P0-2 | **ja** | **ja** |
| **P1-7** | **IaC-/Deployment-Code-Discovery:** Tabelle iac_files (Ensure), Routen GET /api/projects/{id}/iac-files, POST …/scan, GET …/{fileId} (+ optional /raw), Scan via gepoolte SSH (find Primär + git ls-tree Ergänzung, Worktree-Scopes), Klassifikation + Container-Links per Namenskonvention, UI /workspaces/iac (Liste nach kind gruppiert + File-Detail mit Findings-/Container-Bezug). (IAC §3–§6) | 5 Tage (BE 3, FE 2) | P0-1 (Scope-Follow); SSH-Infra existiert | **ja** | **ja** |
| **P1-8** | **Vault-ACL-Enforcement-Fix (reale Schwachstelle):** ValidateVaultToken prüft agent_id gegen die verifizierte Anrufer-Identität, GetVaultSecret prüft allowed_agents; handleVaultAccess/handleVaultSecrets reichen die verifizierte Identität durch statt des Body-Labels; Legacy-Entscheid für allowed_agents='[]' im Sprint-File dokumentieren. (Report 03 Phase 2) | 1 Tag | — | **ja** | nein |
| **P1-9** | **Outbound-DLP Phase 1:** internal/subagents/dlp_hook.go (scanner.Chain), Hook an toolcalls.go Submit- + Guarded-Pfad VOR Ledger/Response/SSE, Verdict-Mapping pass/redact/block, security_events.direction='tool_response', Settings-Gate dlp_scanner.enabled (default off, byte-identisches Verhalten unkonfiguriert) + Tests mit gepflanzten Secrets. (Report 02 Phase 1) | 1–1,5 Tage | — | **ja** | nein |
| **P1-10** | **Statischer Agent-Konfig-Scanner Phase 1+2:** internal/agentconfig (Checks: Hidden-Unicode W021, Secrets W008, URLs E005, Manifest W014, Grant-Breite/ToxFlow aus capabilities.rego-Katalog), Tabelle agent_scan_findings, Routen POST /api/security/agent-scan + GET /api/security/agent-scan/report, jimeshctl scan (Exit ≠ 0 bei CRITICAL). (Report 01 Phase 1+2) | 3–4 Tage | — | **ja** | nein |
| **P1-11** | **Red-Team-Suite Phase 0+1:** internal/policy/redteam_test.go + internal/auth/redteam_headers_test.go (db-frei, Job redteam-policy), Mock-Agent + cmd/jimesh-redteam + 25–40 YAML-Cases (Header-Spoofing, Vault-ACL-Cross-Check, caller-declared-Gap als documented_gap) + Job redteam-http mit Wegwerf-Postgres, Guardrails-Artifact-Upload; Job bleibt rot, bis P1-8 grün macht (bewusst). (Report 03 Phase 0+1) | 3–4 Tage | P1-8 (für grün); Suite selbst unabhängig | **ja** | nein |
| **P1-12** | **OTel-Spine Phase 1+2:** internal/oteltrace (opentelemetry-go + OTLP/HTTP, JIMESH_OTEL_ENABLED default off), Spans create_agent/invoke_agent/execute_tool um toolcalls/spawn (Export NACH Ledger-Write, fire-and-forget), Spalten trace_id/span_id auf subagent_tool_calls + subagents, Route GET /api/traces/{trace_id}, jimeshctl traces. (Report 04 Phase 1+2) | 2–3 Tage | — | **ja** | nein |
| **P1-13** | **Auto-Project bei Deploy ohne Project:** executeDeploy generiert bei ProjID='' eine prj--Id nach dem newSecretsEngineID-Muster, UpsertProject legt die Row an, Response trägt autoProject:true (ehrliches Badge). (COMPONENT §6.2) | 1 Tag | P0-3 | **ja** | nein |
| **P1-14** | **Breadcrumb/Back-Kette:** components/layout/hierarchy-breadcrumb.tsx (App → Workspace → Project → Target → All, jedes Segment = Scope + Navigate, ausgegraute Segmente ehrlich) + useScopeFromQuery() für Deep-Link-Seeds; Back-Button mit History-Fallback. (FE-IA §2.4) | 1–2 Tage | P0-1 | nein | **ja** |
| **P1-15** | **project_roles-Frontend-UI:** Grants-Anzeige/Verwaltung (wer ist Developer auf Project X) in Project-Overview/Access-Section; jimesh-dev-Ensuring + API_DOCS-Eintrag sind **bereits erledigt** [verifiziert — auth.go:326–358, API_DOCS.md:727–742], nur die FE-Sicht fehlt (0 Treffer [verifiziert]). (FE-IA §4-Sprint-47-Rest) | 1 Tag | P1-2 (Overview-Ort) | nein | **ja** |

### P2 — schön zu haben

| ID | Konkretes Was-zu-tun | Aufwand | Abhängigkeiten | BE | FE |
|---|---|---|---|---|---|
| **P2-1** | Sidebar-Restrukturierung: [All]-Wurzel, Querschnitts-Einstiege je Scope (Netzwerke/Secrets/Security/Settings), Inline-Add-Project am Target + Inline-Add-App am Project (Dialog mit Access-Sektion). (FE-IA §2.3) | 2 Tage | P0-1, P1-2 | nein | ja |
| **P2-2** | DLP Phase 2: pro-Projekt-Config (dlp <project> enabled/verdict mit globalem Fallback), jimeshctl dlp-get/dlp-set, optional GET /api/security/dlp-View, Security-Tab zeigt tool_response-Rows. (Report 02 Phase 2) | 1–2 Tage | P1-9 | ja | (optional) |
| **P2-3** | OTel Phase 3: POST /api/otel/v1/traces (OTLP-Ingest am Gateway, INGRESS-DERIVED-ONLY-Disziplin), Container-ENV OTEL_* opt-in je Deploy. (Report 04 Phase 3) | 3–5 Tage | P1-12 | ja | nein |
| **P2-4** | Container-/Deployment-/Audit-Logs: SSE-Route für Container-Logs, deployment_logs-Tabelle (persistiert statt nur Ledger-Text), Audit-Log-Tab im Project-Kontext. (DESIGN §1.2/§3) | 3–4 Tage | P0-3 | ja | ja |
| **P2-5** | File-Browser-Backend POST /api/ssh/explore (SFTP-Listing; die 3 FE-Komponenten in components/files/ existieren bereits [verifiziert]). (RESEARCH-UPDATE §1a) | 2–3 Tage | — | ja | nein |
| **P2-6** | AppType auf 7 Werte erweitern (agent/ide/shell/frontend/backend/database/tool) + Legacy-Mapping (website→frontend, api/service→backend) beim Schreiben, verbatim + Legacy-Badge beim Lesen. (COMPONENT §5) | 1 Tag | P0-2 | ja | ja |
| **P2-7** | Integrations-Kinds (shell/iframe/dsh-session/code-server/vnc) + Install-Button auf der Overview (nur installableFromOverview-Katalogeinträge, Doppel-Install = ehrlicher Fehler). (COMPONENT §4) | 1–2 Tage | P1-6, P1-2 | ja | ja |
| **P2-8** | Secrets-Scope-OPA: Modul secrets.rego (fail-closed), serverseitiger Filter in GET /api/vault/secrets, Overview-Chip „Secrets nach Scope gefiltert (OPA)“. (COMPONENT §3.3) | 2 Tage | — | ja | (Chip) |
| **P2-9** | MCP-DSH-Routen-Fix: tools_dsh.go ruft GET /api/plugins/dsh/profiles + POST …/turns, die nicht registriert sind [verifiziert: 0 HandleFunc] — Routen implementieren oder Tools entfernen. (COMPONENT §9-11) | 0,5–1 Tag | — | ja | nein |
| **P2-10** | KasmWeb-Chrome/Desktop-Container als Deploy-Option (iframe-Ersetzung) **[unverifiziert — Operator-Wunsch aus RESEARCH-UPDATE]**. | 3–5 Tage | P1-5 | ja | ja |
| **P2-11** | Agent-Scan Phase 3: CI-Verkabelung (repo-checks-Schritt) + Rego-Katalog-Sync + optionale semantische Stufe (Mesh-Guard, fail-open). (Report 01 Phase 3) | 2–5 Tage | P1-10 | ja | nein |
| **P2-12** | URL-Rename /workspaces/deployments → /workspaces/interfaces + Redirect. (PLUGINS §8.2-P4) | 0,5 Tag | P1-5 | nein | ja |
| **P2-13** | IaC v1.1: docker inspect-Pass (Compose-Labels + Mounts) für Container-Links (source: compose-label/mount). (IAC §4.1-2) | 1–2 Tage | P1-7 | ja | nein |

### P3 — Research / später

| ID | Konkretes Was-zu-tun | Aufwand | Abhängigkeiten | BE | FE |
|---|---|---|---|---|---|
| **P3-1** | Dashboards Phase 2: Tabelle dashboards (Owner, definition JSONB), CRUD-Routen /api/dashboards, Editor-Routen /overview/dashboards, Query-basierte Widget-Instanzen. (OVERVIEW §7) | 5–8 Tage | P1-2, P1-3 | ja | ja |
| **P3-2** | SAM-Schema-Hebung: assets (polymorphe CI-Basis), component_types (Widget-/Badge-Katalog persistiert), asset_edges (typisierte Kanten, rekursive CTEs), bestehende Feld-Parents bleiben Quelle (kein Big-Bang). (SAM §5.4) | 8–15 Tage | P1-2, P1-4 | ja | (Adapter) |
| **P3-3** | Design-Asset-Management: design/design-folder/design-session-Components, Stitch/Figma/DrawIO-Integrationen als Integration-Plugins, Custom-Categories plugin-gated. (DESIGN-Spec) **[unverifiziert: Stitch-MCP-Endpunkt]** | 10+ Tage | P1-6 | ja | ja |
| **P3-4** | Docker-Hub-Metadaten-Client (Feld DockerImageMeta ist als Typ definiert; Abgleich = eigener Sprint wegen Egress/Rate-Limits). (COMPONENT §7) | 3–5 Tage | P1-5 | ja | (Badges) |
| **P3-5** | Snyk-/Agent-Deep-Scan-Stage nach TASK-059-Muster oder lokale Alternative; .snyk-File-Matching ist bereits Teil des IaC-Scans. (IAC §7.2, RESEARCH-UPDATE R1) | 3–5 Tage | P1-7, P1-10 | ja | nein |
| **P3-6** | ttyd-Terminal-Interface (Port-Publishing als §12-Port-Binding-Entscheid). (PLUGINS §8.2-P4) | 1–2 Tage | P1-5 | ja | nein |
| **P3-7** | Interface-CRUD (PUT /api/deployments/{depId}/interfaces/{ifaceId} für pluginEnabled/uiOrder). (PLUGINS §7.2) | 1–2 Tage | P0-3 | ja | ja |
| **P3-8** | 10 Gemini-Research-Fragen (RESEARCH-SAM §6) als Design-Workshop klären (Kosten-Ebene, Lifecycle-Historie, Service-Ebene, Import/Export). | 1 Tag Workshop | P3-2 | — | — |
| **P3-9** | Red-Team Phase 3 (AgentDojo-Corpus-Adapter oder Humanbound air-gap, nur nachtlich) + DLP Phase 3 (Deep-Scan via Mesh-Chain). (Reports 02/03 Phase 3) | je 2–5 Tage | P1-11, P1-9 | ja | nein |
| **P3-10** | Mixed-Kind-Selektion + Selection-URL-State; JSON-LD/Thing-Description-Export; Playwright-Automations-Integration **[unverifiziert]**; App-Reassignment-Routen. (OVERVIEW §9, SAM §4.3, COMPONENT §6.3) | je 2–5 Tage | P1-3 | ja | ja |

---

## 3. Sprint-Vorschlag (3 × 1 Woche)

Voraussetzung vor Sprint 1: Sprint-Infrastruktur anlegen (docs/sprints/SPRINT-48-MASTER-IA.md, Backlog-Mirror in docs/backlog/BACKLOG.md) — beides existiert nicht [verifiziert].

### Sprint 1 — „IA, Scope & Overview-Fundament“

**Ziel:** Der Operator navigiert über einen funktionierenden globalen Scope, sieht die erste Overview-Aggregationsfläche, und project_roles wird sichtbar.
**Enthalten:** P0-1 (Scope-System), P0-2 (Component-Typen), P1-1 (6 Pages auf Scope), P1-2 (/overview mit 4 Kern-Adaptern + Settings-KV-Persistenz), P1-15 (project_roles-UI), P1-14 (Breadcrumb) — P1-3 (Multiauswahl) als Stretch.
**Abnahmekriterien:** Target-Klick filtert die Workspaces-Seite; jede konsumierende Page zeigt Chip+Clear; /overview rendert Karten aus echten Registry-Daten mit ehrlichen Empty-States, Drag/Resize persistiert via PUT /api/settings/overview_layouts; npm run test (vitest + check-i18n über 60 Locales) grün; API_DOCS für alle getouchten Routen aktuell.

### Sprint 2 — „App/Deployment/Interface-Wahrheit + IaC + Access“

**Ziel:** Deployments sind persistierte Wahrheit mit deklarativen Interfaces, IaC-Files sind auffindbar, Teams wirken erstmals auf Ressourcen.
**Enthalten:** P0-3 (Deploy-Persistenz + DDL), P1-6 (Integration-Rename + Persistenz), P1-5 (Interfaces-Tab/AppOverview/Badges), P1-7 (IaC-Discovery BE+FE), P1-4 (Team-Bindings BE + TeamsPage-Sektion), P1-13 (Auto-Project) — P2-6 (AppType) falls Zeit.
**Abnahmekriterien:** Nach jedem Deploy existiert eine DeploymentRow, deren Interface-Ports exakt allocated* entsprechen (kein vnc-Interface ohne lauschenden Port); Interfaces-Tab zeigt Backend-Daten (keine includes('opencode')-Heuristik mehr); IaC-Liste zeigt echte Workspace-Files mit Container-Refs; ein Team-Binding auf ein Target vererbt sichtbar auf Projects (Access-Section); Legacy-Deployments sind klassifiziert oder ehrlich interfaces: [].

### Sprint 3 — „Security- & Observability-Härtung“

**Ziel:** Die vier Security-Baupläne der Reports leben in Phase 1/2; die reale Vault-ACL-Lücke ist geschlossen und von CI bewacht.
**Enthalten:** P1-8 (Vault-ACL-Fix), P1-9 (DLP Phase 1), P1-10 (Agent-Scan Phase 1+2), P1-11 (Red-Team Phase 0+1), P1-12 (OTel Phase 1+2) — P2-2 (DLP Phase 2) und P2-5 (File-Browser-Backend) als Stretch.
**Abnahmekriterien:** printenv OPENAI_API_KEY als Tool-Call liefert geredactetes Resultat + security_events-Row (direction tool_response); jimeshctl scan findet Bestand sauber und schlägt bei admin:*-Fixture an; redteam-http läuft nach ACL-Fix grün mit Canary-Nachweis (gelockerte Policy ⇒ ASR > 0); OTel-Spans erscheinen in Langfuse v4 mit Korrelations-Ids und ändern das Verhalten ungesetzt byte-identisch; alle neuen Routen in API_DOCS.md.

---

## 4. API-Design — neue Backend-Routen (alphabetisch)

Alle Routen folgen dem Register-Muster (gateway.go/deploy.go), brauchen API_DOCS-Einträge im selben Change und die Policy-Prüfung (Admin-Mutation-Präfixe). Bestehende Routen, die nur Felder erweitern, sind am Ende gesondert gelistet.

| Method | Path | Response-Shape (Kurzform) | Prio |
|---|---|---|---|
| DELETE | /api/dashboards/{id} | {success} · 404 unbekannt · Admin-Mutation | P3-1 |
| GET | /api/dashboards | {dashboards: [{id, name, ownerId, layoutMode, itemCount, createdAt, updatedAt}]} | P3-1 |
| GET | /api/dashboards/{id} | {dashboard: {id, name, ownerId, layoutMode, items: [{id, query, layout, titleOverride}], createdAt, updatedAt}} | P3-1 |
| POST | /api/dashboards | {dashboard} (wie GET-Shape) · 400 Schema-Verstoß | P3-1 |
| PUT | /api/dashboards/{id} | {dashboard} | P3-1 |
| GET | /api/design-sessions/{id} | {session: {id, provider, artifactIds, status, updatedAt}} | P3-3 |
| GET | /api/designs/{id} | {design: {id, kind, name, storageRef, parentId, updatedAt}} | P3-3 |
| GET | /api/projects/{id}/audit-logs | {logs: [{ts, actor, action, scope, success}]} (aus vault_audit_log/sdk_logs gefiltert) | P2-4 |
| GET | /api/projects/{id}/containers/{cid}/logs | SSE-Stream data: {ts, line}, Heartbeat; 416 ohne laufenden Container | P2-4 |
| GET | /api/projects/{id}/deployment-logs | {logs: [{deploymentId, ts, stage, output}]} (neue deployment_logs-Tabelle) | P2-4 |
| GET | /api/projects/{id}/iac-files | {projectId, workspacePath, scannedAt, files: [{id, kind, path, sizeBytes, mtimeUnix, gitTracked, branch, contentSha256, discoveredAt, mode, workspaceId, containerRefs, findingCount}], kinds, errors} | P1-7 |
| GET | /api/projects/{id}/iac-files/{fileId} | {file…, content, contentTruncated, findings: [{checkId, checkName, severity, lineStart, lineEnd}], deployments: [{id, name, status, linkConfirmed}], agentHints: {serverNames}} (env-Werte nie) | P1-7 |
| GET | /api/projects/{id}/iac-files/{fileId}/raw | text/plain (Viewer/Download), Größen-Cap | P1-7 (optional) |
| POST | /api/projects/{id}/iac-files/scan | wie GET + scan: {mode, workspacePath, durationMs, commands, notice} · 400/404/409/502 · fehlgeschlagener Scan überschreibt Index nicht | P1-7 |
| GET | /api/projects/{id}/interfaces | {projectId, interfaces: [InterfaceSpec], derivedFrom: 'deployment-rows' | 'project-ports'} (Read-Modell bis Persistenz greift) | P1-5 |
| POST | /api/otel/v1/traces | 202 OTLP/HTTP-Protobuf-Ingest (Observability-only, kein Ledger-Write), Auth über bestehende Middleware-Kette | P2-3 |
| POST | /api/security/agent-scan | {verdict, score, findings: [{rule, severity, snippet, location}], scope, createdAt} · Admin-Mutation | P1-10 |
| GET | /api/security/agent-scan/report | {reports: [neuester Scan je Scope], verdict} · Session lesbar | P1-10 |
| GET | /api/security/dlp | {global: {enabled, verdictDefault}, projects: [{projectId, enabled, verdict}]} · optional | P2-2 |
| POST | /api/ssh/explore | {path, entries: [{name, type, size, mtime}], error?} (SFTP-Listing, read-only) | P2-5 |
| GET | /api/team-access?resource_type=&resource_id= | {bindings: [{id, teamId, teamName, role, inherit, inheritedFrom, effective}]} (eigene + geerbte, Override-Markierung) | P1-4 |
| GET | /api/team-bindings[?team_id=&resource_type=&resource_id=] | {bindings: [{id, teamId, resourceType, resourceId, role, inherit, grantedBy, createdAt}]} | P1-4 |
| POST | /api/team-bindings | {binding} · 404 Team/Ressource existiert nicht (kein Orphan) · 400 role geschlossen · Admin-Mutation | P1-4 |
| DELETE | /api/team-bindings/{id} | {success, revoked} · 404 unbekannte id · Admin-Mutation | P1-4 |
| GET | /api/traces/{trace_id} | {traceId, toolCalls: [{id, status, decision}], deepLink} (Lesebrücke zu Langfuse v4) | P1-12 |
| PUT | /api/apps/{appId} | {app: {id, projectId}} (Parent-Reassignment für Drag&Drop; no_parent als Ziel erlaubt) | P3-10 |

**Renames (keine neuen Objekte, aber Vertragsänderung):** GET /api/plugins → GET /api/integrations; GET/POST /api/plugin-installations → /api/integration-installations (mit echter Persistenz) — P1-6.

**Erweiterte bestehende Routen (keine neuen Paths):** GET /api/deployments + GET /api/projects/{id}/deployments + GET /api/projects/{id}/deployments/{depId} um workspaceId, framework, interfaces[]; POST /api/projects/deploy Response um interfaces[] + autoProject; GET /api/subagents/{id}/tool-calls um trace_id; PUT /api/projects/{id}/deployments/{depId} um projectId-Schreibverhalten (Reassignment).

**Neue Settings-Keys (bestehende GET/PUT /api/settings/{key}-Route):** overview_layouts, dlp_scanner.enabled, dlp_scanner.verdict_default, dlp_scanner.deep_scan.*, JIMESH_OTEL_ENABLED (ENV, kein Settings-Key).

**Neue CLI-Subcommands (examples/jimeshctl bzw. cmd/):** jimeshctl scan [ziel] (P1-10), jimeshctl dlp-get/dlp-set project verdict (P2-2), jimeshctl traces <tc-id|subagent-id> (P1-12), cmd/jimesh-redteam run/report/export-rules (P1-11).

---

## 5. Was noch fehlt (in KEINER Spec beschrieben, aber gebraucht)

1. **Serverseitiges GET-Enforcement über Scopes.** Alle Specs modellieren Scope/Bindings als Dashboard-Filter; die Policy trennt nur Admin-Mutationen (IsAdminMutation) — GETs bleiben für jede authentifizierte Identität offen (FE-IA §1.4b). Sobald die Overview Budgets/Teams/Users aggregiert und Team-Bindings einführen, braucht es eine Entscheidung, welche GETs scope-gebunden sind; sonst ist die Access-Section eine Anzeige ohne Wirkung. *Warum nicht abgedeckt: Alle FE-Specs denken Single-Operator; erst die SAM-Ontologie benennt „Ownership je CI“ als Standard-Anforderung, ohne den GET-Pfad zu spezifizieren.*
2. **Datenqualitäts-Migration der weichen Kette.** Projects ohne Workspace-Zeile werden per nodeHost/nodeUser-Match zugeordnet — kein Spec plant, diese Heuristik in echte FKs zu überführen (workspace_id-Backfill oder explizite Ableitungstabelle). Jede Vererbung (Bindings, Secrets-Scope, Overview-Gruppierung) baut auf „meistens korrekt“. *Warum nicht abgedeckt: Die Specs dokumentieren die weiche Kette als Realität und bauen Fallbacks, aber niemand schreibt die Sanierung als Arbeitspaket.*
3. **Pagination-/Performance-Kontrakte für Aggregations-Flächen.** Overview/Adapter laden volle Listen (/api/deployments, /api/workspaces, …) mit 15s-Polling auf Live-Feeds; keine Spec definiert Caps, Paginierung oder „zu viele Rows“-Verhalten für wachsende Instanzen. *Warum nicht abgedeckt: Specs starten vom heutigen Bestand (kleine Instanz) und modellieren den Wachstumsfall nicht.*
4. **Retention/GC für die neuen Persistenzen.** agent_scan_findings, deployment_logs, Red-Team-Reports, iac_files-Veraltung: Es gibt Write-Pfade, aber keine Aufbewahrungs-/Aufräum-Policy (einziges In-Repo-Muster: security_finding_dismissals mit 90-Tage-GC). *Warum nicht abgedeckt: Die Reports/Specs definieren jeweils nur die eigene Tabelle, kein übergreifendes Retention-Mandat.*
5. **SSE-Lifecycle-Verträge.** Container-Log-SSE (P2-4) und Discovery-Events (existierend) brauchen Reconnect-, Heartbeat- und Verbindungs-Caps-pro-Projekt-Regeln; keine Spec beschreibt das Verhalten bei Container-Stopp oder Backend-Restart aus Client-Sicht. *Warum nicht abgedeckt: DESIGN-Spec fordert Logs als Backend-Lücke, ohne Streaming-Details.*
6. **E2E-/Smoke-Journeys für die neuen FE-Flows.** Testplan der Overview-Spec ist Unit (vitest) + i18n + manueller Smoke; kein automatisierter Flow-Test (Scope setzen → Overview → Interface öffnen). Playwright taucht nur als Agent-Integrations-Idee auf. *Warum nicht abgedeckt: Specs verifizieren einzelne Komponenten, nicht Journeys.*
7. **Backup/Restore-Vertrag für PostgreSQL.** Das Persistence-Mandat deckt Restart-Sicherheit; Backups/Restore-Prozedur stehen in keiner Research-Spec. *Warum nicht abgedeckt: Kein Spec-Auftrag berührt Betriebs-DR.*
8. **Onboarding/Erstrun-Flow.** Bei leerer Instanz zeigen alle Flächen ehrliche Empty-States, aber es gibt keinen geführten Erst-Setup-Pfad (Target anlegen → ersten Deploy → erstes Budget); DESIGN-Spec erwähnt Onboarding nur für Plugin-Konfiguration. *Warum nicht abgedeckt: Specs optimieren Bestands-Operationen, nicht Erstnutzung.*
9. **Deprecation/Compat-Policy bei Renames.** plugins → integrations betrifft externe Consumer (MCP-Tools, jimeshctl, Skripte); keine Spec definiert ein Deprecation-Fenster, Redirects oder Changelog-Pflicht über API_DOCS hinaus. *Warum nicht abgedeckt: PLUGINS-Spec plant den Rename als Label-Änderung an der canonical table — externe Verträge fehlen in der Betrachtung.*
10. **Scan-Konkurrenz/Throttling pro Node.** IaC-Scan, Exposure-Scan, Discovery-Scan und Monitoring nutzen dieselbe SSH-Session; es gibt keine Querschnitts-Begrenzung (max. 1 Scan pro Node/Project, Queue-Regeln). IAC-Spec hat einen 409-Guard nur für den eigenen Scan. *Warum nicht abgedeckt: Jede Spec budgetiert nur ihren eigenen Pfad (timeouts), nicht das Zusammenspiel.*
11. **Sprint-/Backlog-Infrastruktur fehlt im Repo.** — **erledigt [geprüft 3.10.2026]:** Agents.md mandatiert docs/sprints/ + docs/backlog/BACKLOG.md, beide existieren, das Doku-Mandat ist erfüllbar. *Damals nicht abgedeckt: Keine Spec prüft die Metadokumentation selbst.*

---

## 6. Risiken (Top 3 + Mitigation)

1. **Die weiche Hierarchie-Kette als Fundament aller Vererbung (höchstes Risiko).** Team-Bindings, Secrets-Scope, Overview-Gruppierung und Scope-Match lösen Parents über die nodeHost/nodeUser-Heuristik auf; „meistens korrekt“ heißt bei Access-Entscheidungen: falscher Ancestor ⇒ falscher Zugriff (fail-closed rettet nur, wenn die Auflösung fehlschlägt — nicht, wenn sie das falsche Parent findet). **Mitigation:** scope-match.ts liefert pro Ableitung den Typ (fk vs host-match) mit; OPA-Module (team-bindings.rego, secrets.rego) erhalten die Ancestor-Kette serverseitig aufgelöst und fail-closed; Test-Fixtures mit no_parent/doppelten Host-Matches sind Pflicht (Sprint 1/2); UI kennzeichnet host-match-ableitete Zuordnungen sichtbar (Mandat 2); langfristig P3/SAM-Frage: echte workspace_id-Backfill-Migration (Abschnitt 5.2).
2. **Eingriff in executeDeploy (P0-3, P1-13) — kritischster Codepfad.** Deploy-Orchestrierung (SSH, Port-Allokation, Volume-Vertrag, Quarantine-Gate) ist der am wenigsten iterative Pfad; eine Regression in Interface-Persistenz oder Auto-Project bricht jeden Deploy überall. **Mitigation:** strikt additiv umsetzen — bestehende projects-Row-Ports bleiben SSOT, neue Row/Interfaces werden **zusätzlich** geschrieben; goldene Response-Tests gegen den heutigen Deploy-Contract vor dem Umbau; Feature-Gate per Settings-Key; erst Read-Modell (GET /interfaces als Ableitung), Persistenz erst nach Abnahmekriterium „Ports exakt allocated*“; P1-13 (Auto-Project) erst nach Absicherung von P0-3.
3. **Security-Toggle-Dschungel + Verhaltensänderung durch den ACL-Fix.** Es entstehen mehrere default-off-Schalter (dlp_scanner.*, JIMESH_OTEL_ENABLED, Agent-Scan-Konfig, bestehend guard_scanner.*) — Risiko: Toggles rotten, vermitteln falsche Sicherheit oder werden inkonsistent enabled; zugleich ändert der Vault-ACL-Fix (P1-8) das Agent-Auth-Verhalten real (Agenten mit Legacy allowed_agents='[]'-Secrets könnten Read-Access verlieren). **Mitigation:** „byte-identisch unkonfiguriert“ als CI-Pflicht-Test je Toggle (Reports 02/04 verlangen es bereits); Canary-/Positive-Control-Test für die Red-Team-Suite (gelockerte Policy ⇒ ASR > 0, sonst ist grün wertlos); ACL-Fix mit dokumentierter Legacy-Entscheidung ('[]' = Operator-Fall) im Sprint-File + Migrations-Hinweis in OPERATOR_GUIDE; eine Tabelle aller Security-Toggles in API_DOCS/OPERATOR_GUIDE mit Default und Wirkung.

---

## 7. Offene Fragen an den Operator (aus den Specs, ungeklärt)

1. Namens-Option A bestätigen: UI „Plugin“ als Badge über Interfaces, TASK-103 → „Integrations“? (PLUGINS §9-1)
2. Shell-only-Apps mit oder ohne Badge (docker-exec-Hinweis statt iframe)? (PLUGINS §9-2)
3. Run-Historie im Interfaces-Tab behalten oder auslagern? (PLUGINS §9-3)
4. Deployment-Verknüpfung: Scan-Vorschlag + manuelle Bestätigung (v1) oder Deploy-Pipeline schreibt DeploymentRows direkt (Verhaltensänderung — im Master-Plan als P0-3 angenommen)? (IAC §9)
5. Auto-Rescan-Policy der IaC-Discovery + Heuristik-Kandidaten .claude.json/.cursor/mcp.json verifizieren oder streichen. (IAC §9)
6. Priorisiert der Operator P2-10 (KasmWeb) und P3-3 (Design/Stitch) höher als die Security-Sprints? [unverifiziert — RESEARCH-UPDATE nennt beide, ohne Priorität]
