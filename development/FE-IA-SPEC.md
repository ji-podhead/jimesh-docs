# FE-IA-SPEC — Information-Architektur: Hierarchie, Scope, Teams/Access

**Status:** Spezifikation (Analyse + Soll-Konzept). Kein Code umgesetzt in diesem Dokument.
**Basis:** Arbeitsstand im Repo (Sprint-47-Kontext, project_roles.go WIP). Alle Belege sind Datei:Zeile-Zitate aus dem aktuellen Code; wo etwas fehlt, steht ausdrücklich „fehlt (geprüft per grep)“.
**Leser:** Operator + Implementierung (Frontend/Backend).

---

## 1 Ist-Analyse

### 1.1 Die 4-Tier-Hierarchie — was ist Child von was

Das Domänen-Modell liegt in src/frontend/src/types/domain/hierarchy.ts:

| Ebene | Typ | Parent-Feld | Beleg |
|---|---|---|---|
| 0 — SSH-Target | SSHTarget | — (Root) | hierarchy.ts:13–21 |
| 1 — Workspace | Workspace | sshTargetId | hierarchy.ts:23–29 (Feld :25) |
| 2 — Project | Project | workspaceId (Fallback 'no_parent') | hierarchy.ts:31–38 (Feld :33, Konstante :9) |
| 3 — App | App | projectId (Fallback 'no_parent') | hierarchy.ts:40–51 (Feld :42) |

Ergänzend: PortAggregationLookup (hierarchy.ts:53–60) trägt die volle Kette
port → appId → projectId → workspaceId → sshTargetId — das Modell kann die
Kette auflösen, nur die UI tut es nicht durchgängig.

**Realitäts-Abweichung im Backend-Datenbestand** (wichtig für jede Vererbung):
Workspaces tragen den Ziel-Node direkt als sshTarget (WorkspaceRow in
components/workspaces/workspace-deploy-dialogs.tsx:63–70), und GET /api/projects-Rows
tragen nodeHost/nodeUser — die Sidebar matcht Projects deshalb direkt auf Targets,
wenn keine Workspace-Zeile verlinkt (components/sidebar/HierarchySidebar.tsx:36–47,
Fallback-Match über nodeHost/nodeUser :43–44). Die Kette Project→Workspace→Target
ist damit **weich** („meistens“, nicht „immer“) — jede Scope-Vererbung muss mit
FALLBACK_PARENT_ID (:9) und fehlender Workspace-Zeile rechnen.

Die Sidebar **kollabiert die Workspace-Ebene bewusst** in Project-Nodes
(components/sidebar/HierarchySidebar.tsx:11, 30–31: „workspace level collapses
into the project's target mapping“) — der Operator sieht Target → Project → App.

### 1.2 Views & Selectors heute (Bestandsaufnahme, grep-belegt)

Alle Frontend-Routen: src/frontend/src/App.tsx:485–618.

| View (Route) | Auswahl-Mechanik heute | Liest globalen Scope? |
|---|---|---|
| **WorkspacesPage** /workspaces | lokaler projectFilter (useState, :164) + Project-Select (:500–512), ?project=<id> im Query (:172–178); mineOnly-Checkbox (:165, Filter :186–188); Ensure-Dialog wählt Project (:358) + SSH-Target (SshTargetSelect :402–414) | **Nein** — kein useGlobalScope im File |
| **WorkspaceDeploymentsPage** /workspaces/deployments | lokaler projectId (:66), **folgt dem Scope** (useEffect :68–72), Project-Select (:116–132) | **Ja** (einzige Workspaces-Page) |
| **WorkspaceAppsPage** /workspaces/apps | flache Tabelle über **alle** Workspaces/Discovery (:70–90 Queries, :107 deployed-Filter), kein Filter | **Nein** |
| **WorkspaceEndpointsPage** /workspaces/endpoints | Endpoint-Registry-Editor (Form-State :95–105); keine Project/Target-Verzweigung | Nein (Registry) |
| **WorkspaceSettingsPage** /workspaces/settings | lokaler selectedId (:49), Workspace-Select (:98–114); Plugin-Aktivierung mit scopeType:'workspace' (:226–227) | **Nein** |
| **NetworkEditingPage** /workspaces/networks | lokale selectedProjectId (:80), Project-Select (:196–212); VLAN nur pro Project (Query :120–124) | **Nein** |
| **SecurityExposurePage** /security/exposure | **eigener** SecurityHierarchySelector (:265–291): Project (:282, Select :346–354) → Endpoint (nur Anzeige :371–377) → Deployment (:382–394) → Port (:395–412); „Only the Project level actually re-scopes“ (:266–269, Hinweis :406–411) | **Nein** (paralleler, lokaler Scope) |
| **ProjectSecretsPage** /security/secrets | lokaler selectedScope (:485), Select mit ws:<id>/prj:<id>-Werten (:528–537) | **Nein** (eigenes Scope-Format ws:/prj:) |
| **FirewallRulesPage** /security/firewall-rules | liest Scope (:425–428 scopeProjectId), filtert Tabelle clientseitig (:471–473), Scope-Chip + Clear (:506–522) | **Ja** |
| **security-landing-strip** (auf /security/overview) | liest Scope (:371), findingMatchesScope pro Scope-Kind (:326–351), gefilterte Cards (:394–396), Chip (:405–421) | **Ja** |
| **FallbackPage** /config | Mesh-Router-Select (:401–404) + SegmentedControl „Config Workspace Selection“ (:370–376); LLM-Proxy-Global-Config | Nein (hierarchiefremd) |
| **NetworksPage** /networks | Owner/Status-Filter (:213–215), Key-User-Filter (:288–289), ACL-Tags beim Key-Create (:310) | Nein |
| **TeamsPage** /admin/teams | Team-Liste (:69–72), Mitglieder (:121–129), Rollen owner/manager/developer/sub_agent (:58), BudgetsSection (:35, :409) | Nein |
| **AdminBudgetsPage** /admin/budgets | ProjectRolesSection (roles-first über **alle** project_user_budgets-Zeilen, Query :82–85) + BudgetsSection (:259–260) | Nein |

**Fazit Selector-Wildwuchs:** Es gibt heute **fünf koexistierende Selektions-Mechaniken**:
1. Globaler Scope (global-scope.ts) — gesetzt nur von der Sidebar,
2. lokale Project-Selects (Workspaces, Deployments, Network-Editing, Exposure),
3. lokales Scope-Detail-Format ws:/prj: (Project Secrets),
4. „All“-Fallback als leerer lokaler State ('' statt explizitem 'all'),
5. gar keine Auswahl (Apps flach, Networks global).

Ein „All“-Scope existiert nur in SecurityExposure ('all'-Literal :233) und
ProjectSecrets ('all' :485) — **nicht** im globalen Scope-Modell.

### 1.3 Global Scope heute

- **Store:** src/frontend/src/lib/global-scope.ts — ScopeKind = 'workspace' | 'session' | 'app' | 'ssh' (:25), GlobalScope mit workspaceId/projectId/containerId/sessionId/sshEndpointId (:27–39), Persistenz in localStorage jimesh.global-scope (:41, :60–68), Hook useGlobalScope() (:94–107). **Es gibt kein 'all'-Kind** — „all“ ist null (nicht gesetzt).
- **Setter:** ausschließlich die Sidebar — Target-Klick setGlobalScope({kind:'ssh'}) + navigate('/workspaces') (HierarchySidebar.tsx:77–83), Project-Klick {kind:'workspace', workspaceId, projectId} (:84–87), App-Klick {kind:'app'} + navigate('/workspaces/apps') (:88–96).
- **Konsumenten (komplett, grep-belegt):** security-landing-strip.tsx:371, FirewallRulesPage.tsx:425, WorkspaceDeploymentsPage.tsx:69 — mehr nicht.
- **Scope-Usage-Schema:** src/frontend/src/lib/scope-usage-schema.ts:44–90 deklariert pro Route, ob die Seite den Scope liest (consumesScope true/false + planned-Hook-Point). Es ist die Ehrlichkeits-SSOT aus Sprint-40 — aber es **liest heute niemand**: sein einziger Konsument war die entfernte SectionRail (App.tsx:481–483: „the old right-edge SectionRail is GONE“; SecurityLayout.tsx:15: „The global scope selector lives in the rail“ — Stale-Kommentar).
- **ScopeSelector unmounted:** components/layout/scope-selector.tsx:114 exportiert den hierarchischen Selector (Workspaces/Sessions/SSH-Targets als Dropdown, :114–343) — ein grep über src/frontend/src zeigt Importe **nur in dessen eigenen Tests** (scope-selector.test.tsx:25, scope-selector.render.test.tsx:27). Die im Kommentar behauptete MiniSidebar-Montage (:26–27) existiert nicht. Übersetzt: der einzige vollständig hierarchische Selector des Codes ist **toter Code**, und die Sidebar ist der einzige Scope-Setter.
- **Kein Zurück:** einen Breadcrumb/Back-Pfad (App→Workspace→Project→Target→All) gibt es nirgends (grep breadcrumb/Back-Button → keine Treffer in views/components).

### 1.4 Auth / RBAC heute — wo was WIRKT und wo nicht

**(a) Keycloak-Realm-Rollen (global, nicht ressourcenbezogen).**
Realm-Rollen admin/operator/viewer sind im Realm-Import definiert
(deploy/keycloak/jimesh-realm.json:20–22); der verifizierte JWT wird serverseitig
ausgewertet: requestIdentity() liest realm_access.roles (internal/auth/auth.go:118–132)
und liefert ("keycloak", roles) bzw. für Passwort-Sessions ("password", ["admin"]).
Die OPA-Bootstrap stellt die Realm-Rolle **jimesh-admin** sicher
(internal/auth/keycloak_oidc.go:334–355). **jimesh-dev wird noch NICHT ensured** —
grep nach jimesh-dev in internal/auth → 0 Treffer (nur policy/store-Dateien nennen es).
Der Dashboard-Zugriff ist damit **global pro Person**, nicht pro Ressource: „Wer darf
was sehen“ ist heute nur viewer/operator/admin — die Frage „Wer hat Dashboard-Zugriff
auf was?“ ist mit Realm-Rollen allein **nicht beantwortbar**.

**(b) OPA-Admin-Gate (Mutationen auf Admin-Flächen).**
IsAdminMutation(method, path) (internal/policy/policy.go:26–108) listet die
Admin-Präfixe — darunter /api/budgets, /api/teams, /api/team-members (:44–46),
/api/workspaces (:64), /api/control-planes (:75). Die Middleware wertet das aus
(auth.go:847–875): Engine.Allow über default.rego
(internal/policy/policies/default.rego:21–32 — allow nur für password-Operator und
jimesh-admin). GETs bleiben für jede authentifizierte Identität offen (policy.go:23–25).
**Wirkung:** Schreib-Zugriff auf Teams/Budgets/Workspaces/Deploy-Lifecycle ist
Admin-only — aber **binär global**, kein „Team X auf Server Y“.

**(c) Project-Roles (Sprint-47, WIP) — per-Project-Developer.**
Vollständige Kette, Stand heute:
- Tabelle project_roles + Store-API: internal/store/project_roles.go:45–64 (Ensure),
  :70–94 (Grant, Upsert), :98–114 (Revoke), :119–145 (List), :150–172
  (ProjectRolesForSub), :176–184 (ProjectRoleExists). Rolle geschlossen auf
  "developer" (:27–31).
- OPA-Modul project-roles.rego (internal/policy/policies/project-roles.rego:38–86):
  allow = password-Operator (:43–46) ∨ jimesh-admin (:50–53) ∨ jimesh-dev-Realm-Rolle
  **UND** developer-Grant **UND** Pfad zielt genau auf /api/projects/{pid}/<subpath>
  des Grants (:57–63, Pfad-Parsing :72–81). Project-ROW-Delete und Project-Create
  bleiben Admin-only (Kommentar :28–32, :66–71).
- Go-Gate: internal/policy/project_gate.go:61–80 (Load, fail-loud/fail-closed),
  :86–121 (Evaluate, fail-closed).
- Middleware-Zweitchance: auth.go:142–175 allowProjectScopedMutation (Grants vom
  **verifizierten** sub :151–153; nil-Grants/Errors = deny), eingebunden in den
  Admin-Mutation-Branch auth.go:866.
- Routen: internal/gateway/project_roles.go:34–44 — GET/POST /api/project-roles,
  DELETE /api/project-roles/{id}.
- **Lücken (WIP-Status, geprüft):**
  1. jimesh-dev wird in BootstrapKeycloak (keycloak_oidc.go:296–355) **nicht ensured** —
     es existiert weder im Realm-Import (jimesh-realm.json:20–22 kennt nur
     admin/operator/viewer) noch im Bootstrap. Ohne die Realm-Rolle schlägt die
     Rego-Regel 3 (project-roles.rego:59) immer fehl.
  2. **Kein Frontend:** grep project-roles in src/frontend/src → 0 Treffer. Grants
     kann nur der Operator per API setzen; die Sidebar/Overview-Seiten zeigen keine
     „Wer ist Developer auf diesem Project“-Sicht.
  3. /api/project-roles ist nicht in API_DOCS.md dokumentiert (grep → 0 Treffer) —
     Verstoss gegen den Docs-Mandat, sobald die Route lebt.

**(d) Budgets (project_user_budgets) — WIRKT wirklich, aber nur person-/agentbezogen.**
- Store: internal/store/rbac.go:231–273 (Get/List/Upsert/Delete), :274–278
  (ApplyBudgetCost), :281–298 (ChargeSessionBudget — Verbuchung echter LLM-Kosten).
- **Enforcement Proxy-Pfad:** ResolvePolicy(sessionID) (internal/auth/auth.go:539–587) —
  Freeze zuerst, dann Budget-Row für (projectID, agentTypeID): kein Row = Opt-out
  (allow), enabled=false = deny account_disabled, max ≤ spent = deny quota_exceeded.
  Aufgerufen im LLM-Proxy: internal/ai/proxy.go:170 und :597.
- **Enforcement Provisioning:** internal/provisioning/bridge.go:183–199
  (Container-Spawn ohne enabled Budget-Row blockiert, $0.05 Infra-Kosten), Buchung :287.
- **Verwaltung:** BudgetsSection (components/admin/budgets-section.tsx:62–341 —
  Upsert/Check/Delete gegen /api/budgets), gerendert auf /admin/budgets
  (AdminBudgetsPage.tsx:259–260) und /admin/teams (TeamsPage.tsx:409);
  roles-first-Sicht (ProjectRolesSection, AdminBudgetsPage.tsx:78–252);
  Rollen+Budget-Zuweisung im Create-Flow (components/rbac/create-access-section.tsx).
- **Bedeutung:** project_user_budgets.role (admin|developer|viewer,
  AdminUsersPage.tsx:70–78) ist heute **die einzige existierende
  per-Project-Zugriffsspalte** — aber sie wirkt nur als Budget-Enforcement-Identität
  (Proxy/Spawn), **nicht** als Dashboard- oder API-Berechtigung.

**(e) Teams + TeamMembers — WIRKEN NICHT (Registry-Only).**
Routen: /api/teams, /api/team-members (internal/security/security.go:76–77, Handler
internal/security/rbac.go:110–215), Store internal/store/rbac.go:302–365 (ListTeams/
CreateTeam/DeleteTeam/ListTeamMembers/Add/Remove). TeamRow hat Budget-Felder
(max_monthly_budget_usd, spent_monthly_budget_usd), TeamMemberRow hat rbac_role.
**Aber:** grep über den gesamten Backend-Code zeigt **keinen einzigen Konsumenten**
von ListTeams/team_members außerhalb der eigenen CRUD-Handler (auth.go requestIdentity
liest nur Realm-Rollen, policy.go kennt keine Teams, kein Join Budget↔Team). Der
users.go-Header (internal/security/users.go:7–11) bestätigt den Zwischenstand: Teams
referenzieren seit 18.9. echte Keycloak-User — mehr nicht. **Übersetzt: Ein Operator
kann Teams anlegen und Mitglieder eintragen, aber genau NICHTS steuert es — insbesondere
nicht, wer auf welchen Server darf.**

**(f) Netz-Zugriff heute (nur indirekt „Team→Server“-ähnlich).**
Der einzige existierende „wer darf welches Netz“-Mechanismus ist Headscale:
ACL-Tags auf Node-Keys (NetworksPage.tsx:310) + read-only ACL-Policy-Parser
(lib/acl-policy.ts:1–60 — „no editing“) und das OPA-Headscale-Gate
(internal/policy/headscale_gate.go). Das ist L3-Mesh-Zugriff, **kein**
JiMesh-Ressourcen-Zugriff (kein Target/Workspace/Project-Bezug).

### 1.5 Operator-Fragen → heutiger Ort (oder „nirgends“)

| Operator-Frage | Heute |
|---|---|
| „Welches Team darf auf welchen Server?“ | **Nirgends** — kein Binding-Modell; Teams wirken nicht (1.4e) |
| „Wie vererbt das nach unten?“ | **Nirgends** — keine Vererbung in irgendeinem Access-Mechanismus (project_roles ist strikt pro Project, project-roles.rego:72–81) |
| „Wo stelle ich Access für Teams/Networks ein?“ | Teams: /admin/teams (ohne Wirkung). Networks: Headscale-ACL-Tags am Node-Key (NetworksPage:310), nicht JiMesh-seitig |
| „Wer hat Dashboard-Zugriff auf was?“ | Nur global: Keycloak admin/operator/viewer (jimesh-realm.json:20–22) + password-Operator (auth.go:126–132). Pro Ressource: nichts |

---

## 2 Soll-Spezifikation

### 2.1 Scope-Modell: all → target → workspace → project → app, Override nach unten

**Neues Scope-Modell** (Erweiterung von global-scope.ts:25–39):

    export type ScopeKind = 'all' | 'target' | 'workspace' | 'project' | 'app' | 'session'
    // 'all' = ausdrücklicher Scope (explizites Objekt, NICHT mehr null):
    //         setGlobalScope({ kind: 'all' }) statt clearGlobalScope()
    export interface GlobalScope {
      kind: ScopeKind
      targetId?: string      // ssh endpoint id (ersetzt 'ssh' + sshEndpointId)
      workspaceId?: string
      projectId?: string
      appId?: string         // ersetzt 'app' + containerId (Container-ID bleibt Zusatzfeld)
      sessionId?: string
    }

**Vererbungs-Semantik (Override nach unten):**

1. **Abwärts-Erweiterung (widening):** Wählt der Operator „Target X“, gilt der
   Scope implizit für alles darunter (Workspaces/Projects/Apps auf X). Eine Page
   darf **nur enger filtern, nie weiter**: isInScope(resource, scope) (neues
   Helper-Modul, z. B. lib/scope-match.ts) beantwortet „gehört diese Ressource in
   den aktuellen Scope?“ über die Kette aus 1.1 (PortAggregationLookup-Semantik,
   hierarchy.ts:53–60) inkl. Fallback nodeHost/nodeUser-Match (Sidebar-Logik
   HierarchySidebar.tsx:43–44 als wiederverwendbare Funktion extrahieren).
2. **Override nach unten (narrowing):** Wählt der Operator innerhalb eines
   Target-Scopes ein Project, so wird projectId gesetzt und targetId beibehalten
   (abwärtskompatibler Scope: Target bleibt Teil des Pfades). Der Scope ist damit
   ein **Pfad**, keine disjunkte Auswahl: all ⊃ target ⊃ workspace ⊃ project ⊃ app.
   Jede engere Wahl ersetzt nur das unterste Segment; „All“ ist die Wurzel.
3. **Weiche Kette respektieren:** Projects ohne Workspace-Zeile
   (workspaceId='no_parent', hierarchy.ts:33) gehören zum Target über
   nodeHost/nodeUser (Sidebar-Fallback :43–44). Apps mit projectId='' fallen in
   den no_parent-Bucket (hierarchy.ts:42 + Sidebar :60).
4. **Ehrlichkeit pro Page (Mandate 2 fortgeschrieben):** eine Page, die einen
   Scope-Teil nicht umsetzen kann (z. B. Exposure hat kein per-Port-Backend-Filtering,
   SecurityExposurePage.tsx:266–269), zeigt das aktiv an statt zu schweigen —
   Muster: FirewallRulesPage-Scope-Chip (FirewallRulesPage.tsx:506–522) als
   Pflicht-UI für **jede** konsumierende Page.
5. **Persistenz:** unverändert localStorage (global-scope.ts:41, :60–68) —
   UI-Kontext, kein Operator-Datum.
6. **Registrierung der Konsumenten:** lib/scope-usage-schema.ts bleibt die SSOT,
   aber sie braucht wieder einen Verbraucher (siehe 2.3/2.4): die Sidebar rendert
   den Selector, jede Page meldet ihren consumesScope-Status über die Tabelle —
   eine Page mit consumesScope:false zeigt keinen Scope-Kontext, eine mit true
   zeigt Chip + Clear.

**Migrationspfad:** kind:'ssh'→'target', kind:'app'→'app' mit appId statt
containerId; der localStorage-Parser (global-scope.ts:46–58) migriert alte
Einträge beim Laden einmalig.

### 2.2 Overview-Seiten pro Hierarchie-Ebene

Zielbild: **jede Ebene bekommt eine Overview**, die aus dem Scope (nicht aus
eigenen Selects) ihren Kontext liest. Alle Datenquellen existieren bereits.

#### Ebene 0 — „All“-Overview (/overview, neuer Default nach Login)
- **Zweck:** „Wo läuft was?“ auf einen Blick — die Ebene, die heute fehlt.
- **Inhalt:**
  - Target-Cards (je SSH-Target): Status-Strip (Workspace-Status-Aggregat aus
    GET /api/workspaces + GET /api/discovery), Project-Count, App-Count (Ports),
    Budget-Verbrauch-Summe aus GET /api/budgets (nach Project gruppiert),
    Team-Access-Badge (Anzahl Bindings, Abschnitt 2.6).
  - Cross-Cut-Zeile: Security-Kurzstatus (kritische Findings, Muster
    security-landing-strip.tsx:405–427), letzte Deployments
    (GET /api/projects/{id}/deployments aggregiert).
- **Komponenten:** TargetCard (Klick = setGlobalScope({kind:'target'}) +
  navigate('/workspaces?target=<id>')), BudgetBar (read-only, Datensatz wie
  budgets-section.tsx), Honest-Empty-States (Mandate 2).

#### Ebene 1 — Target-Overview (Ziel von Target-Klick; URL /workspaces?target=<id> mit Scope-Seed)
- **Inhalt:**
  - Health-Strip des Nodes (Workspaces-Status auf diesem Target,
    Discovery-Container des Hosts — GET /api/discovery, gefiltert über die Kette).
  - Project-Liste dieses Targets (mit Inline-Add-Project, siehe 2.3) —
    je Project-Zeile: Name, Workspace-Status, App-Count, Budget-Summe,
    VLAN-Badge (GET /api/projects/{id}/vlan, Datenquelle NetworkEditingPage).
  - **Access-Section (NEU):** welche Teams mit welcher Rolle auf diesen Target
    zugreifen (Bindings, Abschnitt 2.6) + Link in die Verwaltung.
  - Einstiege je Scope-Querschnitt: Networks (VLANs der Projects), Secrets
    (prj:-Scopes im ProjectSecretsPage-Format), Security (Firewall-Rules dieses
    Targets), Utility (Endpoints-Editor, Settings).
- **Komponenten:** ScopeChip (Target aktiv, Clear → All), ProjectTable,
  TeamAccessList, Inline-Add-Project-Dialog (Project-Create + Access-Sektion aus
  create-access-section.tsx wiederverwenden).

#### Ebene 2 — Workspace-Overview
- **Inhalt:** Owner, Preset, Node, Worktree-Pfad, Status (Spalten der heutigen
  Tabelle WorkspacesPage.tsx:540–556 als Karten), Apps dieses Workspace
  (WorkspaceAppsDropdown-Inhalt), Jules-Plugin-Status (Datenquelle
  WorkspaceSettingsPage.tsx:222–238), Budget des Owners in diesem Project.
- **Komponenten:** ScopeChip (Workspace aktiv), AppList, PluginActivationCard
  (existiert), Lifecycle-Aktionen (deploy/redeploy/stop — heute WorkspacesPage :330
  lifecycleFor).

#### Ebene 3 — Project-Overview
- **Inhalt:** Deployments (GET /api/projects/{id}/deployments — Quelle der
  WorkspaceDeploymentsPage :85–95), Ports (GET /api/projects/{id}/ports),
  VLAN/Netz (/api/projects/{id}/vlan), Secrets (prj:<id>), Firewall-Rules des
  Projects, **Zugriff-Sektion**: project_roles-Grants (Developer-Tier, Sprint-47)
  + Budget-Zeilen (project_user_budgets) + Team-Bindings, die via Target-Vererbung
  gelten (Anzeige „geerbt von Target X“).
- **Komponenten:** ScopeChip, DeploymentList, PortsTable, AccessPanel (grants +
  budgets + geerbte Bindings mit Override-Markierung).

#### Ebene 4 — App-Overview
- **Inhalt:** Container-Status/Ports (Discovery-Registry), Parent-Project/-Workspace-Kette,
  Session-Bezug (workspaces.session_id / Session-Kind des heutigen Scope-Modells),
  Logs (Deeplink /sdk-logs?tab=…).
- **Komponenten:** ScopeChip (App aktiv), ContainerCard, Back-Kette (2.4).

### 2.3 Sidebar-Struktur (inkl. fehlender Einstiege)

Heute (HierarchySidebar.tsx): Targets → Projects → Apps, Security-Gruppe
firewall-rules + siem (:243–278), New-Buttons navigieren weg
(:146–152 App→/workspaces/apps, :158–167 Project→/workspaces, :235–241 Target→/config).

**Soll-Struktur:**

    [All]  ← Wurzel-Klick: setGlobalScope({kind:'all'}), navigate('/overview')
    ▼ <Target X>            ← Klick: Scope target, navigate Target-Overview
        · Projects …        ← unverändert
        · [+ Project]       ← NEU: Inline-Add-Project DIREKT am Target
              (Dialog: Name, Path, Framework; Access-Sektion aus
               create-access-section.tsx; Erst-Workspace optional im selben Submit)
        · Netzwerke   → /workspaces/networks  (Scope target: Projects dieses Targets vorbefiltert)
        · Secrets     → /security/secrets     (Scope target: prj:-Scopes der Target-Projects)
        · Security    → /security/firewall-rules (+ SIEM) — pro Target gefiltert
        · Einstellungen → /workspaces/endpoints (Endpoint-Editor, heute :202–213)
    ▼ <Project P>
        · Apps …            ← unverändert
        · [+ App]           ← Inline-Add-App am Project (heute nur „New App“-Link :146–152)
        · Deployments → /workspaces/deployments (Scope project)
        · Secrets     → /security/secrets?scope=prj:<id>
    ▼ <App A>
        · Logs, Sessions, Settings (App-Overview, 2.2 Ebene 4)
    ── Security (querschnittlich, unverändert :243–278)
    ── Verwaltung: Teams/Access (/admin/teams), Budgets (/admin/budgets), Users (/admin/users)

**Was heute fehlt (explizit):**
- [All]-Wurzel-Node (heute: kein „alle“-Einstieg; null-Scope ist der implizite
  All-Zustand, global-scope.ts:84–86 — soll explizit werden).
- Querschnitts-Einstiege **je Scope** (Networks/Secrets/Security/Utility) statt
  nur globaler Security-Gruppe.
- Inline-Add-Project am Target (heute: Sprung zur Workspaces-Page :161–167; dort
  hängt das Ensure an Project- UND Target-Auswahl :358 + :402 — doppelt).
- Inline-Add-App am Project (heute: Sprung zur flachen Apps-Page :146–152).
- Team/Access-Einstieg (heute nur über den /admin-Tab, kein Scope-Bezug).

### 2.4 Breadcrumb / Back-Button-Kette

**Pflicht-Kette:** App → Workspace → Project → Target → All
(dargestellt als „All / Target X / Project P / Workspace W / App A“).

- **Komponente:** components/layout/hierarchy-breadcrumb.tsx, gerendert im
  PageContainer-Kopf (App.tsx:434–446) für alle Routes unter /workspaces* und
  /security (Konsum via scope-usage-schema).
- **Verhalten:** jedes Segment ist ein Button; Klick = setGlobalScope auf diese
  Ebene + Navigate auf ihre Overview (2.2). „All“ = {kind:'all'} + /overview.
  Segmente, die der Scope nicht hergibt (z. B. Target-Scope hat kein
  Project-Segment), werden ausgegraut angezeigt (ehrlich, nicht versteckt).
- **Back-Button:** links neben dem Breadcrumb — navigate(-1) mit Fallback: bei
  leerer History (Deep-Link) eine Ebene hoch über die Kette.
- **URL-Vertrag:** Scope-Seed als Query (?target=/?project=), damit Deep-Links
  den Scope rekonstruieren; Pages übernehmen den Seed **einmalig** in den globalen
  Scope (Muster WorkspaceDeploymentsPage.tsx:68–72 — als generisches Hook
  useScopeFromQuery() ausbauen).

### 2.5 Alle Selectors auf „All“ + Scope-Derivation

Jede in 1.2 gelistete Page mit eigenem Project/Workspace-Select bekommt:

1. **All-Option** in jedem Select (Value 'all' — nicht ''),
2. **Initialwert aus dem Scope** statt useState(''),
3. **Schreibrichtung:** lokale Auswahl aktualisiert den globalen Scope (Single
   Source of Truth — die heutige Parallelwelt Exposure
   SecurityExposurePage.tsx:265–291 vs. Scope entfällt),
4. **Scope-Chip + Clear** nach FirewallRulesPage-Muster (:506–522).

Konkret: WorkspacesPage (:164/:500), NetworkEditingPage (:80/:196),
WorkspaceSettingsPage (:49/:98), ProjectSecretsPage (:485/:528 — Format ws:/prj:
auf den Scope-Pfad mappen), SecurityExposurePage (:282/:346), FallbackPage-Config
(Profile bleiben global — dokumentiert consumesScope:false).

### 2.6 Team→Server-Zugriff: Ressourcen-Bindings (konkreter Vorschlag)

**Problem:** Teams existieren ohne Wirkung (1.4e). Die Operator-Frage „Welches
Team darf auf welchen Server — und wie vererbt das nach unten?“ braucht ein
Binding-Modell zwischen der Team-Registry und der Hierarchie.

#### Datenmodell (neue Tabelle team_resource_bindings, Ensure-Pattern wie project_roles.go:45–64)

    CREATE TABLE IF NOT EXISTS team_resource_bindings (
      id            TEXT PRIMARY KEY,
      team_id       TEXT NOT NULL,            -- FK teams.id (Existenz-Check im Handler, 404 statt Orphan)
      resource_type TEXT NOT NULL,            -- 'ssh_target' | 'workspace' | 'project' | 'app' | 'network'
      resource_id   TEXT NOT NULL,            -- id der Ressource in ihrer Registry
      role          TEXT NOT NULL,            -- 'viewer' | 'developer' | 'operator' | 'admin' (geschlossen, wie ProjectRoleDeveloper project_roles.go:27–31)
      inherit       INTEGER NOT NULL DEFAULT 1,  -- 1 = gilt für die gesamte Sub-Hierarchie, 0 = nur diese Ebene
      granted_by    TEXT DEFAULT '',
      created_at    BIGINT DEFAULT 0,
      UNIQUE (team_id, resource_type, resource_id, role)
    );

#### Vererbungs-/Override-Regeln (Semantik „all → ein Server → überschreiben nach unten“)

1. **Auflösung „gilt Binding?“:** ein Binding B auf Ressource R gilt für Ressource Q,
   wenn B.resource_id ein **Ancestor** von Q in der Kette aus 1.1 ist
   (ssh_target → workspace → project → app) und B.inherit=1; oder
   B.resource_id == Q.id (gleiche Ebene, inherit egal).
2. **Spezifischster Binding gewinnt:** Bindings tiefer in der Hierarchie
   überschreiben geerbte (app > project > workspace > ssh_target). Bei mehreren
   matchenden Bindings des Nutzers gilt die union der Rollen aller Treffer
   (großzügigste Rolle, die ein Team des Nutzers verleiht); v2 optional:
   explizites deny.
3. **Kein Binding = kein Zugriff** auf resourcengebundenen Flächen (fail closed,
   wie der Project-Gate project_gate.go:86–91). Admin-Tiers (password,
   jimesh-admin) bypassen wie in project-roles.rego:43–53.
4. **„All“-Ebene:** ein Wildcard-Binding (resource_id='*') wäre Instance-weit —
   bewusst **nicht** in v1 (Global-Zugriff bleibt Realm-Rolle / Keycloak).

#### Backend-Routen (neu, internal/gateway/team_bindings.go, Register-Muster wie project_roles.go:34–44)

| Route | Methode | Verhalten |
|---|---|---|
| /api/team-bindings[?team_id=&resource_type=&resource_id=] | GET | Liste, Filter optional (Muster ListProjectRoles, project_roles.go:119–145) |
| /api/team-bindings | POST | Upsert; Validierung: Team existiert (404), Ressource existiert in ihrer Registry (404 — kein Orphan, Prinzip project_roles.go:15–17), role geschlossen (400) |
| /api/team-bindings/{id} | DELETE | Revoke, 404 bei unbekannter id (Muster RevokeProjectRole :98–114) |
| /api/team-access?resource_type=ssh_target&resource_id=X | GET | Effektive Sicht für eine Ressource: alle (geerbten + eigenen) Bindings mit inheritedFrom-Feld — Grundlage der Overview-Sektion 2.2 |

Alle vier sind **Admin-Mutationen** (GET offen wie jede Admin-Fläche):
/api/team-bindings in die IsAdminMutation-Präfixe aufnehmen (policy.go:38–83) und
in API_DOCS.md dokumentieren (Docs-Mandat).

#### OPA-Anbindung (ein Engine-Prinzip bleibt: policy.go:1–6)

- **Neues Rego-Modul team-bindings.rego** mit Vertrag
  data.jimesh.resourceaccess.allow (fail-closed default allow := false, Muster
  project-roles.rego:38–63). Input (alles serverseitig aufgelöst, wie
  ProjectAccessInput project_gate.go:43–49):

      input.method      string          — mutating HTTP method
      input.path        string          — request path
      input.source      string          — "password" | "keycloak"
      input.roles       array[string]   — verified realm roles
      input.teams       array[string]   — Team-IDs des VERIFIZIERTEN sub (team_members)
      input.bindings    array[object]   — {team_id, resource_type, resource_id, role, inherit}
                                          resolved aus team_resource_bindings für input.teams

- **Regel:** allow, wenn password-Operator ∨ jimesh-admin ∨ (eine der input.teams
  ein Binding auf die Pfad-Ziel-Ressource hält, dessen role die nötige Aktion
  deckt — Pfad-Parsing nach dem project_scoped_mutation-Muster
  (project-roles.rego:72–81) auf /api/projects/{pid}/…, /api/workspaces/{id},
  /api/control-planes/… gemappt über die Kette).
- **Go-Gate TeamBindingGate** nach ProjectGate-Bauplan (project_gate.go:61–121):
  eigene Prepared Query, Evaluate fail-closed, Env-Override
  JIMESH_TEAM_ACCESS_POLICY.
- **Middleware-Einbindung:** zweite Zweitchance im Admin-Mutation-Branch — nach
  der Project-Gate-Zweitchance (auth.go:866) die Team-Gate-Zweitchance
  allowTeamScopedMutation(claims, method, path, source, roles); Bindings come
  from team_members ⋈ team_resource_bindings, keyed by verified sub (Muster
  allowProjectScopedMutation auth.go:142–175). Reihenfolge: rbac.Allow →
  project gate → team gate → 403.
- **Zusammenspiel mit project_roles (Sprint-47):** project-roles bleibt die
  **personenbezogene** dev-Ebene (jimesh-dev + row). Team-Bindings sind die
  **teambezogene** Ebene. Beide fahren auf derselben OPA-Engine mit eigenen
  Modulen — das E-Policy-Mandat „eine Engine, mehrere Module“
  (project_gate.go:1–11) bleibt intakt. Die UI zeigt beide in der Access-Section
  getrennt („Direkt zugewiesen“ vs. „via Team“).

#### UI
- **TeamsPage:** dritte Sektion „Ressourcen-Bindings“ — pro Team: Tabelle
  resource_type/resource_id/role/inherit + Binding-Editor-Dialog; Delete mit
  Bestätigung (Ort: TeamsPage.tsx nach der BudgetsSection :409).
- **Target-Overview (2.2 Ebene 1):** Access-Section liest
  GET /api/team-access?resource_type=ssh_target&resource_id=<id> und zeigt
  Teams + Rolle + „vererbt auf N Projects/Apps“.
- **Project-Overview (2.2 Ebene 3):** AccessPanel zeigt eigene + geerbte Bindings
  (Override-Markierung) neben project_roles-Grants und Budget-Zeilen.

---

## 3 Dashboard-Infobox: Budgets / Teams / Projects in 5 Sätzen

> **Wer darf was — und wer zahlt?** Jedes Project verwaltet Zugriff und Kosten
> über dieselbe Person-Tabelle (project_user_budgets): Die Rolle
> (admin/developer/viewer) sagt, wofür der Nutzer die Project-Flächen nutzen
> darf, das Budget ($ max/spent) begrenzt real LLM-Traffic und Container-Spawns —
> erreicht das Budget 0, wird der Traffic des Agenten gestoppt (Proxy) und keine
> neuen Container mehr gestartet (Provisioning). Ab Sprint 47 kommt zusätzlich
> die per-Project-Developer-Rolle hinzu: Ein Keycloak-User mit Realm-Rolle
> jimesh-dev **und** einem Operator-Grant in project_roles darf
> deployen/redeployen — aber nur in diesem einen Project. **Teams** sind heute
> reine Gruppen-Registry (Mitglieder + Monatsbudget-Soll) und wirken noch nirgends
> — mit den geplanten Ressourcen-Bindings wird das Team zur Zugriffseinheit:
> „Team X darf auf Server Y (und per Vererbung auf alles darunter)“. Der
> Dashboard-Zugriff bleibt global über die Keycloak-Rollen admin/operator/viewer —
> pro Server/Project entscheidet die Kombination aus Budget-Zeile,
> project_roles-Grant und (künftig) Team-Binding.

---

## 4 Priorisierte Fix-Liste — Selector-Bugs (mit Datei:Zeile)

**P0 — Scope-System ist halb tot (alles andere hängt daran)**
1. **ScopeSelector ist nicht montiert:** components/layout/scope-selector.tsx:114
   wird nur von Tests importiert (scope-selector.test.tsx:25,
   scope-selector.render.test.tsx:27); der als Pilot behauptete Mount (Kommentar
   :26–27 „MiniSidebar header slot“) existiert nicht — die SectionRail wurde
   entfernt (App.tsx:481–483 „SectionRail is GONE“). Fix: Sidebar-Header oder
   Navbar bekommt den Selector wieder; SecurityLayout.tsx:15-Kommentar
   aktualisieren (behauptet fälschlich „lives in the rail“).
2. **Kein 'all'-Scope:** GlobalScope (global-scope.ts:27–39) hat kein all-Kind;
   „all“ = null (:84–86). Pages können „All“ nicht von „kein Scope gesetzt“
   unterscheiden — Fix nach 2.1 ({kind:'all'} + Migration im Parser :46–58).

**P1 — Pages ignorieren den Scope (Doppelauswahl-Erzwinger)**
3. **WorkspacesPage:** projectFilter lokale State (:164), Select (:500–512) —
   initialisiert nie aus dem Scope; ein Target-Klick in der Sidebar
   (HierarchySidebar.tsx:77–83, navigate → /workspaces) setzt {kind:'ssh'}, aber
   die Page kennt nur projectId — der ssh-Scope bleibt wirkungslos (kein
   Client-Filter auf workspace.sshTarget in :186–188). Fix: ssh-Scope → Filter
   auf Target + project-Scope → ?project=.
4. **WorkspaceAppsPage:** komplett scope-blind — flache Tabelle über alle
   Workspaces (:70–90 Queries, :107 deployed, :149–213 Tabelle); selbst der
   App-Klick der Sidebar (:88–96) landet hier ohne Wirkung. Fix: nach
   Scope-Kette filtern (workspaceId/projectId/targetId).
5. **WorkspaceSettingsPage:** selectedId (:49, Select :98–114) initiiert nie aus
   scope.workspaceId — Workspace-Kontext doppelt wählen. Fix: Scope-Seed wie
   WorkspaceDeploymentsPage.tsx:68–72.
6. **NetworkEditingPage:** selectedProjectId (:80, Select :196–212) ignoriert den
   Scope; VLAN-Aktionen sind Project-gebunden — Project-Scope sollte direkt
   vorbefiltern. Fix analog 5.
7. **SecurityExposurePage:** eigener Hierarchy-Selector mit lokalem State
   (:265–291, Project-Select :346–354) statt Scope-Konsum — laut
   scope-usage-schema.ts:66–69 ohnehin consumesScope:false, planned. Fix:
   selectedProject aus dem Scope ableiten, Eigen-Select schreibt zurück in den
   Scope (Single Source), Endpoint/App/Port-Level bleiben Kontext
   (Backend-Limitierung ehrlich: :266–269, :406–411).
8. **ProjectSecretsPage:** eigenes Scope-Detail-Format ws:/prj: (:485, Select
   :528–537) statt GlobalScope-Pfad — Fix: das Mapping Scope→?scope=-Query
   beibehalten, aber den Initialwert aus {kind:'project'}/{kind:'workspace'}
   herleiten.

**P2 — Ehrlichkeits-/Konsistenzlücken**
9. **scope-usage-schema ohne Verbraucher:** lib/scope-usage-schema.ts:44–90 ist
   SSOT, aber nach der Rail-Entfernung liest keine Komponente mehr — der
   „Selector nur wo ehrlich“-Vertrag ist unenforced. Fix: Sidebar/Navbar rendert
   den Selector schema-gesteuert (Einträge P0-1/P1-Pflicht).
10. **Deployments folgt Scope nur monodirektional:**
    WorkspaceDeploymentsPage.tsx:68–72 überschreibt die lokale Wahl bei jeder
    Scope-Änderung, aber eine lokale Project-Wahl schreibt NICHT zurück in den
    Scope — die umgekehrte Richtung fehlt (inkonsistent zum 2.5-Ziel).
11. **FirewallRulesPage ssh-Scope ohne Wirkung:** der Scope-Chip zeigt Filter nur
    bei projectId (:433–434, Chip :506–522); ein ssh-Target-Scope filtert nicht,
    obwohl Rules projectId tragen — ok, solange der Chip das sagt; aber der
    Project-Select im Grant-Dialog ist unabhängig vom Scope — Fix: vorbefüllen
    aus scopeProjectId.
12. **Sidebar-New-Buttons brechen den Kontext:** „New Project“
    (HierarchySidebar.tsx:161–167) und „New App“ (:146–152) navigieren auf
    Tabellen-Pages ohne Target-/Project-Vorbefüllung — der Ensure-Dialog
    (WorkspacesPage.tsx:358, :402) verlangt erneute Auswahl. Fix: Inline-Add nach
    2.3, mindestens aber Query-Seed übergeben.

**P3 — Nettigkeiten**
13. **i18n-Einträge** für Querschnitts-Einstiege (2.3) ergänzen (de.json/en.json,
    Muster scopeSelector-Block de.json:2299–2313).
14. **Breadcrumb fehlt** (2.4) — Back-Kette App→Workspace→Project→Target→All als
    eigene Komponente; Deep-Link-Seed via useScopeFromQuery().

**Sprint-47-Abhängigkeit (Blocker für Access-Features, kein Selector-Bug):**
- jimesh-dev-Realm-Rolle wird nicht ensured (keycloak_oidc.go:296–355 behandelt
  nur jimesh-admin; jimesh-realm.json:20–22 kennt sie nicht) —
  project-roles.rego:59 kann nie greifen.
- Keine Frontend-UI für /api/project-roles (grep → 0 Treffer in src/frontend/src)
  — Grants nur per API; die Overview-Sektionen (2.2) brauchen sie.
- /api/project-roles fehlt in API_DOCS.md (Docs-Mandat).

---

## Anhang A — Konsumenten-Vertrag (kurz)

Eine Page konsumiert den Scope genau dann, wenn scope-usage-schema.ts sie als
consumesScope:true führt (Beleg file:line im Entry, Muster :57–64) UND sie das
Pflicht-UI zeigt: Scope-Chip + Clear (Muster FirewallRulesPage.tsx:506–522) UND
ihre Auswahl-Segmente Both-Ways syncen (lesen bei Mount, schreiben bei
User-Aktion). Alles andere ist ein Fake-Control und verstösst gegen Mandate 2.
