# RESEARCH-SAM-ONTOLOGY — Software Asset Management: Ontologien, Standards & Open-Source-Vergleich für JiMesh

| | |
|---|---|
| **Status** | Research-Dokument — **kein Code in dieser Änderung** |
| **Auftrag** | Der Operator will ein SAM-System (alle Components in einem einheitlichen Schema mit Parent/Child + Scope-Hierarchie). Frage: Gibt es Ontologien / Open-Source-Standards dafür, die JiMesh übernehmen kann? |
| **Basis** | Repo-Belege als `datei:zeile` (jede Behauptung über den Ist-Zustand ist so belegt); externe Fakten als [W#] mit Quellenverzeichnis in §7 |
| **Verwandt** | `docs/FE-OVERVIEW-SPEC.md` (Component-Schema), `docs/FE-IA-SPEC.md` (Scope/Access), `docs/FE-PLUGINS-CONCEPT.md` (App/Deployment/Interface), `docs/FE-IAC-DISCOVERY-SPEC.md` (Discovery), `MANDATES.md` §13 (4-Tier) |
| **Methodik** | Web-Recherche per direktem HTTP-Fetch (Wikipedia, offizielle Spec-Seiten, GitHub-READMEs/-API, Produktdokumentation). Die web_search-API war in dieser Session nicht verfügbar (fehlender API-Key); DMTF.org blockt direkte Fetches (HTTP 403) — wo das relevant ist, ist es vermerkt. Nicht verifizierbares ist als solches markiert. |

---

## 0. Executive Summary

1. **JiMesh hat bereits ein implizites Asset-Modell — aber kein explizites SAM-Schema.** Die 4-Tier-Hierarchie (SSH-Target → Workspace → Project → App) ist als Mandat fixiert (`MANDATES.md` §13; `src/frontend/src/types/domain/hierarchy.ts`:5–9), und das Overview-Spec definiert ein einheitliches Ableitungsschema über 19 Component-Typen (`FE-OVERVIEW-SPEC.md` §3.1–3.2). Die Persistenz ist aber **fragmentiert**: 30+ eigene Tabellen plus Settings-KV, ohne generische CI-Registry, ohne typisierte Beziehungstabelle und ohne Vererbungssemantik im Store.
2. **Es gibt keinen einzelnen „JiMesh-Ontologie-Standard".** Die relevante Landschaft ist aufgeteilt: **ITIL** liefert die Prozess-/Begriffsebene (SAM, CMDB, CI), **DMTF CIM** die Objekt-/Beziehungsebene (herstellerneutral), **CMDBf** die Föderationsebene, **OSLC** die Linked-Data-Integrationsebene (RDF), **Schema.org** eine leichte Web-Semantik für Software-Entitäten, **ODRL** maschinenlesbare Nutzungs-/Lizenzregeln, **OpenC2** eine Aktionssprache für Security-Reaktionen. Keine davon deckt JiMesh' Kern (Agenten, Sessions, Subagents, LLM-Kosten, IaC-Files) ab — diese Klassen existieren in keinem der Standards.
3. **Die Open-Source-Praxis bestätigt JiMesh' eigene Richtung:** GLPI (Entities-Scoping + „Asset definitions"-Generalisierung ab GLPI 11), iTop (klassenbasierte CMDB mit ApplicationSolution/BusinessProcess über der Infrastruktur), Ralph (jedes Asset hängt an einem **Service+Environment**-Paar), NetBox (**Tenancy**-Modell + generische ObjectTypes für dynamische Modellbezüge), Snipe-IT (Asset-Model/Typvorlagen-Muster), OneCMDB (veränderbares CI-Modell zur Laufzeit). Alle bleiben bei relationalen Schemata mit Feld-basierten Parents — keiner braucht einen Graphen.
4. **Empfehlung (Kurzfassung): JiMesh baut keinen RDF-Graphen, sondern ein eigenes, schlankes Property-Graph-artiges Schema in PostgreSQL** — orientiert am bewährten Muster (Typ-Registry, polymorphe Basisklasse, typisierte Edge-Tabelle, generische Scope-Referenz) und leiht die Vokabeln aus CMDB/OSLC-Nomenklatur, ohne die Standards als Format zu importieren. Die 10 Gemini-Fragen (§6) zielen auf die offenen Design-Entscheidungen.

---

## 1. Was JiMesh heute hat (Ist-Aufnahme, alles belegt)

### 1.1 Die 4-Tier-Hierarchie — Domain Hierarchy Mandate

`MANDATES.md` §13 (Zeilen 223–238) fixiert: **SSH Target → Workspace → Project → App**, mit `no_parent`-Fallback und „Ports ... aggregate upwards". Das TypeScript-Modell:

| Tier | Typ | Parent-Feld | Weitere Felder | Beleg |
|---|---|---|---|---|
| 0 | `SSHTarget` | — (Root) | id, name, host, port, user, hasGvisor | `hierarchy.ts`:13–21 |
| 1 | `Workspace` | `sshTargetId` | id, name, path | `hierarchy.ts`:23–29 (Feld :25) |
| 2 | `Project` | `workspaceId` (Fallback `'no_parent'`) | id, name, path?, status | `hierarchy.ts`:31–38 (Feld :33, Konstante :9) |
| 3 | `App` | `projectId` (Fallback `'no_parent'`) | id, name, type (`website\|api\|service\|tool\|database`), path, port, status, icon?, containerId? | `hierarchy.ts`:40–51 (Feld :42, containerId :49) |
| — | `PortAggregationLookup` | trägt die volle Kette port → appId → projectId → workspaceId → sshTargetId | | `hierarchy.ts`:53–60 |

**Realitätsabweichung im Datenbestand (wichtig für jede Vererbung):** `projects`-Rows tragen den Ziel-Node direkt als `node_host`/`node_user`/`node_port` (`store/store.go`:604–606) und `workspaces`-Rows ein `ssh_target`-Textfeld (`store/workspaces.go`:61). Die Kette Project → Workspace → Target ist deshalb **weich** — die Sidebar matcht Projects ohne Workspace-Zeile per `nodeHost/nodeUser` auf Targets (`lib/store.tsx`:112–120; `HierarchySidebar.tsx`:42–46) und kollabiert die Workspace-Ebene bewusst (`FE-IA-SPEC.md` §1.1). Jedes SAM-Schema muss beide Ableitungen (FK **und** Host-Match) unterstützen, sonst verschwinden real existierende Projects aus dem Baum.

### 1.2 Tabellen-Inventar nach Domänen (Store-Belege)

`src/backend/internal/store/` — DDL-Belege sind die CREATE-TABLE-Zeilen:

**Infrastruktur & Deploy (Hierarchie-Kern)**

| Tabelle | Beleg | Rolle | Parent/Scope-Felder |
|---|---|---|---|
| `projects` | `store.go`:597–622 | Tier-2-Registry; trägt Deploy-Ports selbst | `node_host/node_user/node_port` (:604–606), `workspace_path` (:607), `mesh_router_id` (:608), `category` (:618), `network_mode/enable_nat/use_gvisor` (:619–621) |
| `containers` | `store.go`:623–631 | Container-Rows (Discovery/Attribution) | `project_id` FK (:625), `workspace_id` (:630) |
| `workspaces` | `workspaces.go`:53–65 | Tier-1 (RBAC-Tier, TASK-037) | `project_id` (:55), `owner_user_id` (:56), `container_id` (:57), `session_id` (:58), `ssh_target` (:59), `worktree_path` (:60), `status` (:61); TASK-065: `has_vault_kv`, `secrets_engine_id` (`workspaces.go`:66–75) |
| `deployments` | `store.go`:333–346 | Deployment-Rows (nur per manuellem CRUD befüllt — `CreateDeployment` hat keinen Deploy-Pfad-Consumer, `FE-PLUGINS-CONCEPT.md` §1.1/§7.3) | `project_id`, `remote_path`, `config_path`, `status`, `chain_id`, `auto_provision` |
| `ssh_host_keys` | `store.go`:503–509 | TOFU-Pins (TASK-008) | `host`, `port` |
| `project_vlans` | `project_vlans.go`:38–46 | 802.1q-Zuordnung (TASK-080), vlan_id UNIQUE | `project_id` FK |
| `router_aliases` | `router_aliases.go`:32–40 | Router-DB-Aliase | `project_id`, `alias`, `kind`, host/port/database/sslmode |
| `control_planes` | `control_planes.go`:68–77 | Plane-Registry (TASK-068: genau eine `local`-Row via Partial Unique Index) | `name`, `type`, `endpoint`, `credentials_ref`, `status`, `config` |
| SSH-Endpoints | `lib/ssh-endpoints.ts`:53, 97–115 | Tier-0-Registry als **Settings-KV** `ssh_endpoints` (GET/PUT `/api/settings/ssh_endpoints`) | — |

**Agenten, LLM-Proxy & Sessions**

| Tabelle | Beleg | Rolle | Parent/Scope-Felder |
|---|---|---|---|
| `sessions` | `store.go`:493–499 | Agent-Session | `agent_type_id`, `metadata`, `tags` |
| `agent_types` | `store.go`:486–492 | Agent-Typ-Registry | `default_tags`, `default_fallback_chain` |
| `subagents` | `subagents.go`:78–97 | Subagent-Instanzen | `workspace_id` (:80), `project_id` (:81), `expert_id` (:82), `session_id` (:88), `container_id/container_name` (:87–88), `status` (:89), `ssh_target` (:91) |
| `subagent_tool_calls` | `subagents.go`:99–111 | HITL-Toolaufrufe (guarded) | `subagent_id`, `risk`, `decided_by` |
| `experts` / `expert_runs` | `experts.go`:37 / :129 | Expert-Registry + Runs | — |
| `models`, `chains`, `chain_entries`, `chain_nodes`, `keys`, `model_roles`, `chain_model_roles`, `model_enrichment`, `container_strategies`, `container_members`, `request_log`, `quota_state`, `quota_observations` | `store.go`:402–416, :417–434, :435–448, :510–521, :449–457, :350–356, :358–363, `model_enrichment.go`:19, :522–531, :532–542, :462–483, :549–564, :565–584 | LLM-Proxy-Domäne (Kosten je Call: `cost_usd` `store.go`:481) | `chain_id`/`model_id`-Joins; `request_log.session_id` |
| `consumer_keys` | `consumer_keys.go`:45–58 | API-Keys (user/service-M2M, Sprint 35) | `user_id`, `project_id`, `workspace_id`, `session_id` |

**Security / SIEM**

| Tabelle | Beleg | Rolle | Parent/Scope-Felder |
|---|---|---|---|
| `security_events` | `security_events.go`:27–38 | Findings (Scanner/Verdict/Status; `event_type: 'iac_finding'` für Checkov-Ergebnisse, `FE-IAC-DISCOVERY-SPEC.md` §2.3) | `session_id`, `container_id`, `project_id` |
| `security_finding_dismissals` | `security_findings.go`:21–24 | Fingerprint-Dismissals (90-Tage-GC) | `fingerprint` |
| `sdk_logs` | `sdk_logs.go`:46–58 | SDK-/Audit-Log (SIEM-Feed `/api/sdk/logs?type=audit`) | `session_id`, `workspace_id`, `project_id`, `agent`, `source_key_id` |

**Secrets & Konfiguration**

| Tabelle | Beleg | Rolle | Parent/Scope-Felder |
|---|---|---|---|
| `vault_secrets` / `vault_audit_log` / `vault_tokens` | `vault.go`:61–69 / :76–84 / :92–99 | Secret-Speicher, Audit, Agent-Tokens | `project_id`, `workspace_id` (TASK-055-ALTERs, `vault.go`:100–105), `allowed_agents` |
| `secrets_engines` | `secrets_engines.go`:49–58 | Engine-Registry (Vault/Built-in-KV) mit **Scope-Spalte** | `scope_kind` (`global\|workspace\|control_plane`), `scope_id`, `is_default` |
| `settings` | `store.go`:458–461 | generische KV (SSH-Endpoints, Layouts, Provider-URLs …) | `key` (Scope steckt implizit im Key-Namensraum) |

**Organisation / RBAC / Kosten**

| Tabelle | Beleg | Rolle | Parent/Scope-Felder |
|---|---|---|---|
| `users` | `users.go`:33–40 | Keycloak-User (TASK-025) | `keycloak_sub`, `email`, `enabled` |
| `project_user_budgets` | `rbac.go`:47–55 | **einzige wirksame per-Project-Zugriffsspalte** (Budget-Enforcement, `FE-IA-SPEC.md` §1.4d) | PK (`project_id, user_id`), `role`, `max/spent_token_budget_usd`, `enabled` |
| `teams` / `team_members` | `rbac.go`:62–70 / :75–81 | Team-Registry (**wirkt nicht** — Registry-only, `FE-IA-SPEC.md` §1.4e) | `team_id`, `user_id`, `rbac_role`; Budget-Felder am Team |
| `project_roles` | `project_roles.go`:46–53 | Per-Project-Developer-Grants (Sprint 47, WIP) | `keycloak_sub`, `project_id`, `role` (geschlossen `developer`), `granted_by` |
| `app_categories` | `rbac.go`:86–95 | Kategorien (gegrundet: Infrastructure, Databases, …) | — |

### 1.3 Die 19 Component-Typen des Overview-Schemas (FE-Sicht)

`FE-OVERVIEW-SPEC.md` §3.1 definiert `OverviewComponentType` (:139–158) und ein serialisierbares Einheits-Schema `OverviewComponent` (:216–238): `schemaVersion` (:123), `id = "<type>:<sourceRowId>"` (:218), `type`, `title`, `parent: ScopeRef` (`{level, id}`, :133–136), `childScopeIds` (:226), `childTypes` (:228), `overviewWidgets` (:201–209), `badges` (9 Badge-Kinds, :164–181), `links` (nur reale Routen, :189–193), `status` verbatim, `data` (typ-spezifisch, JSON-safe).

**Die 19 Typen mit Quelle (aus §3.2, alle Zeilen belegt):** `ssh-target`, `workspace`, `project`, `app`, `container` (abgeleitet — kein eigener Endpoint), `deployment`, `session`, `subagent`, `firewall-rule`, `siem-event`, `security-finding`, `iac-finding`, `network` (`VLANNetwork` `networking.ts`:21–32 + `NetworkOwnership` `network_ownership.ts`), `secrets-engine`, `secret`, `budget`, `team`, `user`, `plugin-installation` (`plugins.ts`:15–29).

**Wichtig für die Ontologie-Frage:** dieses Schema ist **Adapter-basiert** (`FE-OVERVIEW-SPEC.md` §3.4: `COMPONENT_ADAPTERS` als Registry typ → Adapter-Funktion, die aus den Registry-Routen `OverviewComponent[]` baut). Das heißt: JiMesh' „einheitliches Component-Schema" ist heute eine **Ableitungssemantik im Frontend**, keine gespeicherte Normalform im Backend. Ein SAM-Schema würde genau das in den Store heben.

### 1.4 Scope-Modell heute (und der geplante Pfad-Scope)

- **Ist** (`lib/global-scope.ts`): `ScopeKind = 'workspace' | 'session' | 'app' | 'ssh' | 'all'` (:25); `GlobalScope` mit `workspaceId/projectId/containerId/sessionId/sshEndpointId` (:27–39); Persistenz localStorage `jimesh.global-scope` (:41). `'all'` ist `null`, kein explizites Objekt (`FE-IA-SPEC.md` §1.3).
- **Fünf koexistierende Selektions-Mechaniken** (`FE-IA-SPEC.md` §1.2): globaler Scope (nur Sidebar-Setter), lokale Project-Selects, eigenes `ws:/prj:`-Format (Project Secrets), leerer State als implizites „All", gar keine Auswahl. Nur drei Pages konsumieren den globalen Scope (§1.3).
- **Soll** (`FE-IA-SPEC.md` §2.1): Scope als **Pfad** `all ⊃ target ⊃ workspace ⊃ project ⊃ app ⊃ session` mit „Abwärts-Erweiterung" (widening) und „Override nach unten" (narrowing) — exakt die Vererbungssemantik, die ein SAM-Schema auf Backend-Seite braucht.
- **Access-Semantik heute** (`FE-IA-SPEC.md` §1.4): Keycloak-Realm-Rollen global (a), OPA-Admin-Gate binär global (b), `project_roles` strikt pro Project ohne Vererbung (c), Budgets wirken nur person-/agentbezogen (d), Teams ohne Wirkung (e), Netz-Zugriff nur über Headscale-ACL-Tags (f). Der geplante Fix ist `team_resource_bindings` (§2.6): `resource_type/resource_id/role/inherit` mit „spezifischster Binding gewinnt" und Vererbung über die Ancestor-Kette — **das ist bereits ein Binding-Ontologie-Entwurf, der direkt ins SAM-Schema gehört**.

### 1.5 Beziehungs-Landkarte (wie JiMesh heute verdrahtet ist)

| Beziehung | Mechanismus | Beleg |
|---|---|---|
| Workspace → Target | `workspaces.ssh_target` (Text) + `SSHTarget`-Registry in Settings-KV | `workspaces.go`:59; `ssh-endpoints.ts`:53 |
| Project → Workspace | `Project.workspaceId` (FE) mit `no_parent`-Fallback; Backend: `projects.node_host`-Match | `hierarchy.ts`:33; `store.tsx`:112–120 |
| App → Project | `App.projectId` mit `no_parent` | `hierarchy.ts`:42 |
| Deployment → Project | `deployments.project_id` | `store.go`:334 |
| Container → Project/Workspace | `containers.project_id` FK + `workspace_id` | `store.go`:625, :630 |
| Port → App → … → Target | `PortAggregationLookup` (FE-Lookup) | `hierarchy.ts`:53–60 |
| Netz → Project/App | `project_vlans` (1:1 Project) + `VLANNetwork.projectId` / `NetworkOwnership` | `project_vlans.go`:38; `networking.ts`:21–32; `network_ownership.ts` |
| Secret → Project/Workspace | `vault_secrets.project_id/workspace_id` | `vault.go`:65–66 |
| Subagent → Workspace/Project/Container | `subagents.workspace_id/project_id/container_id` | `subagents.go`:80–88 |
| Finding → Project/Session/Container | `security_events.project_id/session_id/container_id` | `security_events.go`:29–31 |
| Person → Project (Zugriff) | `project_user_budgets` PK, `project_roles` | `rbac.go`:47; `project_roles.go`:46 |
| Team → Ressource | **fehlt** — Vorschlag `team_resource_bindings` | `FE-IA-SPEC.md` §2.6 |
| IaC-File → Project/Container | **fehlt** — Vorschlag `iac_files`-Tabelle + Container-Refs-JSON | `FE-IAC-DISCOVERY-SPEC.md` §3.6, §4.1 |

**Muster:** alle Beziehungen sind **typisierte Eltern-Felder** (Hardwiring pro Tabelle). Es gibt keine generische Beziehungstabelle (kein `Source CI / Target CI / predicate` wie im CMDB-Modell, [W2]), n:m-Beziehungen nur als Join-Tabellen (`team_members`, `container_members`) und keine Impact-Kette über mehr als die 4 Tiers.

### 1.6 SAM-Diagnose: was JiMesh heute NICHT hat

1. **Keine generische CI-Registry:** jede Component ist eine eigene Tabelle/KV mit eigenem id-Raum (`TEXT`-UUIDs, `VARCHAR(64)`, `BIGSERIAL` gemischt). Ein einheitliches Schema (wie der Operator es will) existiert nur als Frontend-Ableitung (§1.3).
2. **Keine typisierte Beziehungstabelle:** Impact-/Dependency-Fragen („was hängt an Target X?", „welche Sessions teilen Budget Y?") sind heute Hand-Joins pro Domäne; eine generische Query-Ebene wie OSLC-Triples oder NetBox-ObjectTypes fehlt.
3. **Kein Discovery-Index:** Container-Discovery ist in-memory (`discovery.go`:37–45 — „In-Memory-Registry"); ein IaC-File-Index (`iac_files`) ist Vorschlag, nicht gebaut (`FE-IAC-DISCOVERY-SPEC.md` §8: ❌).
4. **Keine Lifecycle-/Zustandshistorie pro Asset:** Status-Felder existieren (`projects.status`, `deployments.status`, `subagents.status`), aber kein Change-Log pro Asset (nur `request_log`/`sdk_logs`/`vault_audit_log` als Events). SAM-Begriffe wie „proof of license", „reconciliation" sind **nicht** im Modell ([W1]).
5. **Keine Kosten-/Lizenz-Ebene über LLM-Budgets hinaus:** `project_user_budgets.max/spent_token_budget_usd` deckt LLM-Traffic + Spawns ab (`FE-IA-SPEC.md` §1.4d); Software-Lizenzen, Verträge, EOL/Depreciation wie in Snipe-IT/GLPI existieren nicht.
6. **Keine Service-Ebene über der Infrastruktur:** „App" ist Tier 3, aber ein **Business-Service** („der Kunde sieht Produkt X") wie iTop `ApplicationSolution` / Ralph `Service` ist nicht modelliert.
7. **Zugriffs-Vererbung fehlt:** Teams wirken nicht, kein Binding-Modell (§1.4) — die größte funktionale Lücke gegenüber jeder CMDB („Ownership" ist ein Standard-CI-Attribut, [W2]).
8. **Generisches Mehr-Ebenen-Scoping nur an zwei Stellen** real: `secrets_engines.scope_kind/scope_id` (`secrets_engines.go`:53–54) und `PluginInstallation.scopeType/scopeId` (`plugins.ts`:15–29) — beide haben die „generische Scope-Referenz"-Idee bereits korrekt vorgemacht.

---

## 2. SAM-Konzepte & Ontologien/Standards

### 2.1 Kernbegriffe (externe Belege)

- **ITSM:** „the set of activities performed by an organization to design, build, deliver, operate, and control IT services offered to customers" [W3].
- **SAM:** „business practice that involves managing and optimizing the purchase, deployment, maintenance, utilization, and disposal of software applications"; ITIL-Definition zitiert: „all of the infrastructure and processes necessary for the effective management, control, and protection of the software assets … throughout all stages of their lifecycle" [W1]. Kernpraxis: License-Abgleich („counting installations" vs. „licenses purchased"), Audit-Risiko, Compliance [W1]. SAM ist Teilfacet von **ITAM** (Software + Hardware) [W1].
- **ITIL:** Framework mit Practices für ITSM **und IT Asset Management (ITAM)**; namentlich existieren die Practices **IT Asset Management** und **Service Configuration Management** [W4].
- **Configuration Management:** Prozess zur Konsistenz von „performance, functional, and physical attributes" über den Lebenszyklus; in ITSM-Zusammenhang definiert [W5].
- **CMDB:** ITIL-Datenbank für „hardware and software assets (commonly referred to as configuration items)"; speichert **Beziehungen** zwischen Assets — „upstream sources or dependencies of assets, and the downstream targets of assets" (= Dependency-Mapping) [W2].
- **Configuration Item (CI):** Datensatz mit Attributen (Unique Identifier, Name, Description, **Ownership**, Importance) und Beziehungen „Source CI → Predicate → Target CI" (z. B. „database" ist „Component" von „Application Y") [W2].
- **CI-Typen:** Hardware, Software, Communications/Networks, Location, Documentation, **People** [W2]. Erfolgsfaktor: **auto-discovery** [W2].
- **CMDB-Federation:** Einbindung externer Datenquellen, wobei die Quelle die Kontrolle behält — abgegrenzt von ETL-Kopie [W2].
- **CMDB-Challenges:** Relevance (Aktualität), Maintenance (Datenqualität braucht Rollen), Usability („Most CMDBs are just databases") [W2].
- **Service Mapping / Dependency Mapping:** kein eigenständiger, zitierbarer Wikipedia-Artikel wurde in dieser Session verifiziert (Suche ergab keine passenden Titel). Der CMDB-Artikel deckt den Kern ab: Verstehen der Beziehungen „such as information systems, upstream sources or dependencies ... and the downstream targets" für Impact-/Root-Cause-Analyse [W2]. JiMesh-intern entspricht das der Port-Kette `PortAggregationLookup` (`hierarchy.ts`:53–60) — der dort schon beschrittene Weg (Aggregieren der Kette nach oben) ist die gleiche Idee.

### 2.2 ITIL / SACM

ITIL v3 fasste Asset- und Config-Management als **Service Asset and Configuration Management (SACM)** zusammen; ein eigener Wikipedia-Artikel dazu existiert nicht (verifiziert per API). ITIL 4 trennt die Practices **IT Asset Management** (SAM + Hardware/Cloud) und **Service Configuration Management** (CI/CMDB) [W4]. Für JiMesh relevant: die Unterscheidung **Asset-Register** (Zustand, Eigentum, Kosten) vs. **CMDB** (Beziehungen, Service-Delivery) — JiMesh' Overview-Schema (§1.3) will beides gleichzeitig.

### 2.3 DMTF CMDBf — Configuration Management Database Federation

CMDBf ist eine DMTF-Standards-Familie (in der Standards-Liste des DMTF-Artikels gelistet: „CMDBf - Configuration Management Database Federation" [W6]). Es adressiert die Föderationsfrage („Quelle behält Kontrolle", [W2]): anbieterdefinierte Web-Services, über die ein CMDB identifiziert, abfragt und registriert, statt Daten zu kopieren. **Relevanz für JiMesh:** hoch als *Konzept* (JiMesh' Scanner-/Discovery-Feeds sind bereits Föderation nach diesem Muster: Scanner schreiben `security_events`/`sdk_logs`, die Quelle bleibt beim Scanner), niedrig als *Format* (WS-*/SOAP-Plattform passt nicht zur pgx-only-Codebase). Die DMTF-Spec-Seite war in dieser Session nicht abrufbar (HTTP 403) — Details zur Operationsliste sind hier bewusst nicht behauptet.

### 2.4 DMTF CIM (Common Information Model)

„The Common Information Model (CIM) is an open standard that defines how managed elements in an IT environment are represented as a common set of objects and relationships between them"; gepflegt von der DMTF, „independent of their manufacturer or provider" [W7]; die DMTF erstellt „open manageability standards spanning diverse emerging and traditional IT infrastructures including cloud, virtualization, network, servers and storage" [W6]. **Relevanz:** die konzeptionelle Basis (Managed Element, Beziehungsmodell, herstellerneutral) ist exakt die Denkrichtung für JiMesh' Schema; als Format (MOF-Schema, hunderte Klassen) ist es zu schwer. JiMesh kann **Nomenklatur** leihen („Managed Element", „Component/Dependency"-Paare), ohne CIM zu implementieren.

### 2.5 OSLC (Open Services for Lifecycle Collaboration)

„an open community, originally proposed in 2008, to define a set of specifications that enable integration of software development … evolved to areas such as Application Lifecycle Management (ALM), Product Lifecycle Management (PLM), IT Operations and more"; Ziel: „making it easier for tools to work together" [W8]. Seit Mai 2019 ist OSLC ein OASIS Open Project [W9]; OSLC baut auf dem W3C Resource Description Framework auf ([W8], Technologies-Abschnitt). **Relevanz für JiMesh:** hoch als Architektur-Idee (globale IDs pro Ressource, typisierte Link-Prädikate, getrennte Lifecycle-Domänen mit eigenem TC, z. B. Change & Configuration Management [W8]), niedrig als Format (RDF-Triplestore wäre Neuland gegenüber PostgreSQL/pgx).

### 2.6 Schema.org (SoftwareApplication / SoftwareSourceCode)

Leichte Web-Semantik: `SoftwareApplication` trägt u. a. `applicationCategory, applicationSubCategory, operatingSystem, softwareRequirements, softwareAddOn, availableOnDevice, fileSize, installUrl, featureList, releaseNotes, permissions, processorRequirements, storageRequirements, memoryRequirements, countriesNotSupported` [W10]. **Relevanz:** niedrig-mittel. Die Feldliste ist als **Detail-Feld-Vokabular für App-Objekte** brauchbar (`featureList`, `softwareRequirements` für JiMesh-Apps), aber Schema.org hat keine Hierarchie-/Scope-Semantik und keinen CMDB-Bezug.

### 2.7 W3C ODRL (Open Digital Rights Language)

„a policy expression language that provides a flexible and interoperable information model, vocabulary, and encoding mechanisms for representing statements about the usage of content and services"; W3C Recommendation 15.02.2018; „Policies are used to represent permitted and prohibited actions over a certain asset, as well as the obligations … constraints (e.g., temporal or spatial constraints) and duties (e.g. payments)" [W11]. **Relevanz für JiMesh:** mittel, genau für einen Bereich: **Lizenz-/Budget-/Nutzungsregeln als Daten statt Code**. JiMesh hat Budget-Enforcement heute als Code-Pfad (`ResolvePolicy`, Deny-Klassen `quota_exceeded`/`account_disabled`, `FE-IA-SPEC.md` §1.4d). ODRL-artiges Denken beschreibt dieselben Fakten maschinenlesbar — ein ODRL-Parser wäre für JiMesh aber Over-Engineering; die tabellarische Budget-Semantik reicht.

### 2.8 OASIS OpenC2

„Open Command and Control (OpenC2) Language Specification Version 1.0", OASIS Committee Specification, TC-Chairs aus der NSA [W12]; Abstract: „Standardized interfaces, protocols and data models will facilitate the integration of the functional blocks within a system" — OpenC2 ist eine **Aktionssprache für Cyber-Defense-Systeme** (Command & Control) [W12]. **Relevanz für JiMesh:** mittel — die Security-Domäne ist finding-getrieben (Scanner → `security_events` → Verdict `block/warn/allow`, `lib/security-events.ts`:10–22). OpenC2 ist die Standard-Form dieser „Aktion nach Befund"-Semantik; als eigenständige Integration erst bei echter Multi-Scanner-Orchestrierung relevant.

### 2.9 Zwischenfazit: was deckt was ab

| Standard | Ebene | Objektmodell | Beziehungen | Format-Gewicht | JiMesh-Nutzen |
|---|---|---|---|---|---|
| ITIL/SACM [W1][W4] | Prozess/Begriffe | CI-Typenliste | Source→Predicate→Target | (keine Pflicht) | **Vokabular** |
| CMDB-Praxis [W2] | Datenmodell-Begriffe | CI + Attribute + Ownership | explizit, typisiert | frei | **Blaupause** |
| CMDBf [W6] | Föderation | Identifizierung/Abfrage fremder Quellen | — | WS-*/SOAP (schwer) | Konzept ja, Format nein |
| DMTF CIM [W7] | Objektmodell | Managed Elements, herstellerneutral | Dependency/Component-Klassen | MOF (schwer) | Nomenklatur leihen |
| OSLC [W8][W9] | Integration/Linked Data | RDF-Ressourcen + Shapes | typisierte Links | RDF (mittel-schwer) | Architektur-Idee |
| Schema.org [W10] | Web-Metadaten | SoftwareApplication-Felder | leicht | leicht | Feld-Vokabular für Apps |
| ODRL [W11] | Rechte-/Nutzungsregeln | Policy/Rule/Constraint | — | RDF/JSON (mittel) | Lizenz-/Budget-Begriffe |
| OpenC2 [W12] | Security-Aktionen | Action/Target/Modifiers | — | JSON-Profile (mittel) | „Verdict→Aktion"-Semantik |

---

## 3. Open-Source-SAM/CMDB-Lösungen und ihre Modellierung

### 3.1 GLPI (PHP, GPL-3.0, ca. 6.4k Stars) [W20]

- Selbstbeschreibung: „Free Asset and IT Management Software package, that provides ITIL Service Desk features, licenses tracking and software auditing"; Feature „**Service Asset and Configuration Management (SACM)**" mit „native dynamic inventory" ab v10 [W20].
- **Asset-Typen (Doku):** Computers, Monitors, Software, Network equipments, Peripherals, Printers, Cartridges, Consumables, Phones, Racks, Enclosures, PDUs, Passive devices, Unmanaged assets, Cables, SIM [W21].
- **Software-Modell:** „GLPI allows management of software and their versions as well as licenses"; **„Financial management is done at the level of licenses"**; Software gehört standardmäßig zu einer Entity; Dictionaries bereinigen Inventar-Importe [W23].
- **Generalisierung:** ab GLPI 11 sind „Asset definitions" nativ: „customised asset types to suit your needs … configured to behave like any other asset via capacities" [W24].
- **Scoping:** Entities sind „a **key concept in GLPI** … a single instance of GLPI, when composed of several entities, allows to consolidate common data and rules … isolate assets of each division in order to limit assets visibility" — eine hierarchische Mandanten-/Org-Isolation [W22].
- **Lektion für JiMesh:** (a) die Trennung Software ↔ Version ↔ Lizenz mit Kosten auf der Lizenz ist das Muster, das JiMesh für LLM-Keys/Modelle implizit schon hat (`keys`/`models`/`request_log.cost_usd`) und für „App ↔ Deployment ↔ Interface" plant (`FE-PLUGINS-CONCEPT.md` §3.2); (b) „Asset definitions" zeigt, dass GLPI selbst den Weg zur **Generalisierung** geht — das bestätigt die Richtung „eine Registry, viele Typen".

### 3.2 iTop (PHP, AGPL-3.0, ca. 1.2k Stars) [W25]

- Selbstbeschreibung: „complete open source and web-based IT service management platform, including a fully customizable CMDB"; Features: CMDB, HelpDesk, Service/Contract Management, Change, SLA, **graphical impact analysis**, Consistency-Audit, **Data synchronization** (Föderation) [W25].
- **Datenmodell (Doku):** Konfigurationsmanagement „defines all the physical devices (PCs, Servers, Printers, Network devices, Telephones, etc.) but also some logicals elements (**Groups, Application Solutions, Business Processes**), software objects (**Software Instances, Licenses, etc.**) and structuring entities (**Organizations and Locations**). Persons and Teams are also defined" [W26].
- **Modularisierung:** Pflichtmodul `itop-config-mgmt` („basic building blocks of the CMDB: Servers, Software, Application Solutions…"); optionale Module End-users Devices, Virtualization („Virtual Machines, Hypervisors, Farms"), Advanced Storage („SAN, NAS, Storage Systems…"), Data Center („racks, enclosures, power connections…") [W26].
- **Core-Klassen:** „Organizations, Contacts (Persons and Teams) as well as the usual physical devices (Servers, Network Devices…), software elements (DB Server, Database Schemas, Licences, Patches…) and the relations between all these objects" [W27].
- **Lektion für JiMesh:** iTop modelliert die **Business-Ebene über der Infrastruktur** (ApplicationSolution/BusinessProcess) — genau die „Service-Mapping"-Lücke aus §1.6-6. Sein Modulsystem (Pflichtkern + optionale Erweiterungsmodule) spiegelt JiMesh' „Registry + Adapter"-Idee (§1.3).

### 3.3 Ralph (Django, Apache-2.0, „Sources only" seit 2025) [W28]

- Selbstbeschreibung: „full-featured Asset Management, DCIM and CMDB system for data centers and back offices"; „keep track of assets purchases and their life cycle", „flexible flow system for assets life cycle" [W28].
- **Kernmuster 1 — Service+Environment statt tiefer Hierarchie:** `BaseObject` (polymorphe Basisklasse **aller** Assets) hat `service_env = models.ForeignKey("ServiceEnvironment", ...)` (`base.py`:46–88); `Service` ↔ `Environment` sind M:n über `ServiceEnvironment` (`assets.py`:46, :59, :86–88). **Jedes Asset ist einer Geschäftsfunktion (Service) in einer Umgebung (prod/staging/dev) zugeordnet** — Ralphs Antwort auf Service-Mapping.
- **Kernmuster 2 — Basisklasse + Kategorien-Baum:** `Category` als MPTT-Baum (`assets.py`:208–245, `MPTTMeta`); `AssetModel`/`Manufacturer` (`assets.py`:121–208).
- **Kernmuster 3 — physische Ortshierarchie:** `DataCenter → ServerRoom → Rack → Asset (slot_no)` (`data_center/models/physical.py`:136–189).
- **Kernmuster 4 — Konfigurations-Baum:** `ConfigurationModule` als `parent`-Baum + `ConfigurationClass`, an Hosts via `configuration path` (`docs/user/dcim.md`; `configuration.py`:17–91) — direkte Analogie zu JiMesh' `iac_files`-Vorschlag.
- **Kernmuster 5 — Workflow-„Transitions":** statusgebundene Aktionen („change-rack" nur für Status „new"), pro Modell-Typ konfiguriert (`docs/user/guide.md`).
- **Lektion für JiMesh:** Ralph zeigt, wie **eine Basisklasse (`BaseObject`) mit einem Service-Scope-FK** über Domänen hinweg funktioniert (DC-Assets, Back-Office-Assets, Virtual Server, Cloud Host) — technisch das nächste bekannte Pendant zu JiMesh' Ziel („alle Components in einem einheitlichen Schema").

### 3.4 Snipe-IT (Laravel, AGPL-3.0, ca. 15k Stars) [W31]

- Selbstbeschreibung: „A free open source IT asset/license management system"; „Knowing who has which laptop, when it was purchased in order to depreciate it correctly, handling software licenses" [W31].
- **Modell (Doku):** Asset als konkrete Instanz, **Asset Model** als Typ-Vorlage: „Asset models are important because they carry certain attributes which are inherited by the assets you create, such as depreciation type, end of life" [W32].
- **Lektion für JiMesh:** das **Model-vs-Asset-Muster** (Typvorlage mit Default-Attributen → instanzierte Assets) ist eine saubere Antwort auf „wie kommen neue Component-Typen mit Default-Widgets/Badges ins Schema" — direkt verwandt mit dem `OverviewWidgetSpec`-Katalog (`FE-OVERVIEW-SPEC.md` §3.1).

### 3.5 NetBox (Python/Django, Apache-2.0, ca. 21.6k Stars) [W33]

- Selbstbeschreibung: „The premier source of truth powering network automation"; Features: IPAM, Rack-Elevations, „Device modeling using pre-defined types", „Virtual machines & clusters", „Flexible hierarchy for sites and locations", „Tenant ownership assignment" [W33][W34].
- **Datenmodell (Docs, verifizierte Verzeichnisse):** Apps `dcim` (site, region, sitegroup, location, rack, device, devicetype, manufacturer, inventoryitem, module, cable, …), `tenancy` (**tenant, tenantgroup, contact, contactgroup, contactrole**), `virtualization`, `ipam`, `circuits`, `vpn`, `wireless`, `core`, `extras`, `users` [W34].
- **Generische Modellbezüge:** `ObjectType` „identifies a NetBox model by its app label and model name (e.g. `dcim.device`)"; benutzt für Custom Fields, Object Permissions, Export Templates, Event Rules und „generic relations such as the assignment of an IP address to either a device or VM interface" [W36].
- **Lektion für JiMesh:** (a) **Tenancy als Querschnittsmodell** (Tenant/Contact über allen Assets) ist die Open-Source-Antwort auf „wer gehört zu was / wer darf was" — JiMesh' `team_resource_bindings`-Vorschlag (`FE-IA-SPEC.md` §2.6) verfolgt dieselbe Idee; (b) **`ObjectType` als Content-Type-Registry** ist das exakte Muster für JiMesh' „ein Typsystem, viele Component-Tabellen" — die `"<type>:<id>"`-Konvention aus `FE-OVERVIEW-SPEC.md` §3.1:218 gibt es hier in produktiver Form.

### 3.6 OneCMDB (Java, GPLv2, **abandoned**)

- SourceForge-Status: „**Status: Abandoned**", GPLv2, letzte Projektaktivität 2019-11 [W35]. Selbstbeschreibung: „open source CMDB … keeps track of assets, documents, etc. and relations. **The CMDB Model can be changed on the fly** and networks can be auto-discovered. Integrated with NAGIOS. ITIL compliant" [W35]. Quell-Mirrors existieren (GitHub-Forks, Java) [W35].
- **Lektion für JiMesh:** OneCMDB validiert die Idee „Modell statt festes Schema" (JiMesh' Adapter-Registry), ist aber als Code-Basis tot — als Konzeptreferenz nützlich, als Abhängigkeit nein.

### 3.7 Muster-Vergleich: wie die Tools Hierarchie & Scoping lösen

| Tool | Einheitsobjekt | Orts-/Eltern-Hierarchie | Business-Scope | Tenancy/Access | Generalisierung |
|---|---|---|---|---|---|
| GLPI | Asset-Typen (eigene Tabellen) | Entities-Baum, Locations | — | Entities/Profiles | „Asset definitions" (ab 11) [W21][W24] |
| iTop | CI-Klassen | Organization/Location | ApplicationSolution, BusinessProcess [W26] | Teams/Persons als Contacts | Modulsystem [W26] |
| Ralph | `BaseObject` (polymorph) | DataCenter→ServerRoom→Rack→Slot | **Service+Environment-FK** [W29][W30] | Service-Visibility-Scope | Category-Baum (MPTT) |
| Snipe-IT | Asset | Location/Company | — | Users/Groups | AssetModel als Typvorlage [W32] |
| NetBox | geräte-/dienstartige Apps | Site→Location→Rack→Device | Tenant-Nutzung | **Tenancy + ObjectType** [W34][W36] | Custom Fields + ObjectTypes |
| OneCMDB | CI (generisch) | frei definierbar | — | — | **Modell zur Laufzeit änderbar** [W35] |
| **JiMesh heute** | — (fragmentiert, §1.2) | 4-Tier + `no_parent` | fehlt (§1.6-6) | Budgets/Teams (lückenhaft) | FE-Adapter-Registry (§1.3) |

**Auffällig:** keines der sechs Tools setzt auf einen RDF-Graphen. Alle modellieren Hierarchie relational (FK-Bäume, MPTT, Pfad-Patterns) und lösen Cross-Domain-Fragen über generische Referenzen (NetBox `ObjectType`) oder polymorphe Basisklassen (Ralph `BaseObject`). Das ist ein starkes Indiz für JiMesh' PostgreSQL-Realität.

---

## 4. Graph-Datenbank-Ansätze: RDF/OWL/SPARQL vs. Property-Graph vs. JSON-LD vs. W3C TD

### 4.1 RDF/OWL/SPARQL (Triplestore)

- **RDF:** „a method to describe and exchange graph data … a directed graph composed of triple statements" — (Subject, Predicate, Object), IRIs überall, Literale erlaubt [W15].
- **OWL:** „family of knowledge representation languages for authoring ontologies"; Ontologien definieren „classes of objects and the verbs representing the relations between the objects" [W17].
- **SPARQL:** „an RDF query language … able to retrieve and manipulate data stored in Resource Description Framework format"; Triple-Muster mit Konjunktion/Disjunktion/Optionals [W16].
- **Triplestore** als eigene DB-Kategorie (Subject–Predicate–Object-Optimierung, SPARQL als W3C-Standard-Query-Sprache) [W19].
- **JiMesh-Bewertung:** RDF/OWL/SPARQL bringen formale Ontologie-Power (Reasoning, föderierte Queries), kosten aber eine eigene Query-Sprache, eigene Persistenz-Ebene und eine Mapping-Schicht zu jeder Registry. Für eine Single-Operator-Instanz mit ca. 30 Tabellen ist das keine rentable Investition. **Was wertvoll bleibt:** die *Datenform* — (Subject, Predicate, Object) mit stabilen IDs — kann in PostgreSQL nachgebildet werden (Edge-Tabelle), ohne einen RDF-Stack zu importieren.

### 4.2 Property-Graph (Neo4j et al.)

- Graph-Datenbanken: „uses graph structures for semantic queries with nodes, edges, and properties"; Beziehungen sind „first-class citizens … can be labeled, directed, and given properties"; Vorteile: schnelle Traversierung, visuelle Intuition für „heavily inter-connected data" [W18].
- **JiMesh-Bewertung:** der Property-Graph ist konzeptuell die beste Passform für „Parent/Child-Beziehungen und Scope-Hierarchie" (gerichtete, gelabelte Kanten, Kanten-Eigenschaften wie `inherit` — genau die Semantik von `team_resource_bindings`, §1.4). Aber: ein zusätzliches DBMS (Neo4j) verletzt die Architektur-Mandate (PostgreSQL-only via pgx, CLAUDE.md; „no new dependencies without need", MANDATES §7). **Lösung: Property-Graph-Semantik in PostgreSQL** — Knoten = generische Asset-Zeilen, Kanten = `asset_edges`-Zeilen mit `kind` + JSONB-Props; Traversalen über rekursive CTEs (`WITH RECURSIVE`) oder eine kleine Go-Traversal-Funktion. Ein separates Graph-DBMS ist erst bei massiven n:m-Impact-Graphen (zehntausende CIs) ein Thema, das JiMesh realistisch nicht erreicht.

### 4.3 JSON-LD

- „a method of encoding linked data using JSON … a World Wide Web Consortium Recommendation" [W14].
- **JiMesh-Bewertung:** mittel-hoch als **Serialisierungs-Layer**, nicht als Persistenz. JiMesh serialisiert bereits alles als JSON (`OverviewComponent.data: Record<string, unknown>`, `FE-OVERVIEW-SPEC.md` §3.1; `deployments.interfaces` JSONB-Vorschlag, `FE-PLUGINS-CONCEPT.md` §8). Ein JSON-LD-`@context` könnte das Component-Schema einem externen Vokabular (z. B. Schema.org `SoftwareApplication`, [W10]) zuordnen, ohne den Store zu ändern. Nützlich für Export/Interoperabilität („JiMesh-Inventar als Linked Data"), nicht als Kernspeicher.

### 4.4 W3C Thing Description (WoT)

- TD 1.1 ist W3C Recommendation (05.12.2023) und beschreibt „the metadata and interfaces of Things, where a Thing is an abstraction of a physical or virtual entity that provides interactions"; standardmäßig JSON-kodiert mit JSON-LD-Processing [W13].
- **JiMesh-Bewertung:** niedrig-mittel. JiMesh' Bausteine sind tatsächlich „Things mit Affordanzen": ein Deployment mit Interfaces (http/vnc/terminal — `FE-PLUGINS-CONCEPT.md` §3.2) ist strukturell eine TD (Interaktionen/Protokoll-Bindings). TD wäre ein interessantes **Export-Format für Interfaces** (Maschinenlesbarkeit für externe Agenten), aber kein Basis-Ontologie-Fundament.

### 4.5 Fazit Graph-Frage

| Ansatz | Konzept-Fit | Format-Fit für JiMesh | Empfehlung |
|---|---|---|---|
| RDF/OWL/SPARQL | hoch (Ontologie, Föderation) | niedrig (neuer Stack) | Nomenklatur & Triple-Denken leihen |
| Property-Graph | hoch (Edges + Props + Vererbung) | mittel (Semantik in PG nachbauen) | **übernehmen (in PostgreSQL)** |
| JSON-LD | mittel | hoch (serialisierbar, `@context`) | als Export-/Annotations-Layer |
| W3C TD | mittel (Interfaces = Things) | hoch (JSON) | optional für Interface-Export |
| Neo4j o. ä. DBMS | hoch | niedrig (Mandatsbruch, Betriebslast) | nein |

---

## 5. Empfehlung: bestehende Ontologie auf JiMesh — oder eigenes Schema?

### 5.1 Kernbefund

**Kein Standard und kein Open-Source-Tool passt als Ganzes auf JiMesh — aber alle liefern zusammenpassende Bausteine.** Gründe für „nicht als Ganzes":

1. **Klassenfremde Domäne:** JiMesh' prominenteste Assets — `sessions`, `subagents`, `subagent_tool_calls`, `experts`, LLM-Chains/Keys, `iac_files` — existieren in keiner Ontologie (ITIL, CIM, OSLC, Schema.org, ODRL, OpenC2) und in keinem der sechs Tools. Dieser Teil ist nur von JiMesh selbst zu definieren.
2. **Plattform-Mandate:** pgx-only-Persistenz, „no new dependencies without need" (MANDATES §7), Single-Operator-Prämisse — RDF-Stacks, Graph-DBMS oder ITSM-Suiten sind ausgeschlossen.
3. **Die 4-Tier-Hierarchie ist Mandat** (`MANDATES.md` §13) und weicht von den Klassikern ab: Target → Workspace (Worktree/RBAC-Tier) → Project → App ist keine reine Standort-Hierarchie (NetBox/DCIM) und keine reine Org-Hierarchie (GLPI Entities), sondern eine **Agent-Arbeitsumgebung**-Hierarchie.

### 5.2 Was aus jedem Standard übernommen wird (Adoption-Matrix)

| Quelle | Übernehmen | Als |
|---|---|---|
| CMDB/ITIL [W2] | CI-Minimalattribute (id, type, name, status, **ownership**), Source→Predicate→Target-Beziehungen, Discovery-Ehrlichkeit | **Schema-Skelett** |
| Ralph [W29][W30] | polymorphe Basisklasse (`BaseObject`-Idee) + ein Business-Scope-FK (Service+Environment-Äquivalent) | **Persistenz-Muster** |
| NetBox [W34][W36] | Tenancy/Contact-Querschnitt + `ObjectType`-Registry (`app.model`-Bezeichner) | **Cross-Domain-Referenz-Muster** |
| Snipe-IT [W32] | Typvorlage (AssetModel) mit Default-Attributen | **Widget/Badge-Katalog je Component-Typ** |
| iTop [W26] | ApplicationSolution/BusinessProcess-Ebene über der Infrastruktur | **spätere Service-Ebene (Phase 2)** |
| GLPI [W21][W23] | Software↔Version↔Lizenz-Trennung, Kosten auf Lizenz | **Vorbild für Model/Key/Usage-Kosten** |
| OSLC [W8] | typisierte Link-Prädikate, konfigurierbare Konfigurationen | **Beziehungs-Vokabular** |
| Schema.org [W10] | `featureList/softwareRequirements/applicationCategory`-artige App-Felder | **Detail-Feld-Vokabular** |
| ODRL [W11] | permission/constraint-Begriffe für Budget-/Lizenzregeln | **Semantik-Referenz** (kein Format) |
| OpenC2 [W12] | Action-on-Finding-Semantik | **Security-Aktionen-Vokabular** |
| W3C TD / JSON-LD [W13][W14] | Maschinenlesbarer Export von Interfaces/Components | **Interoperabilitäts-Layer (optional)** |

### 5.3 Lücken-Karte: JiMesh ↔ Standards

| SAM-/CMDB-Erfordernis [W2] | JiMesh heute | Lücke / Hebel |
|---|---|---|
| Generische CI-Registry mit Typen | fehlt (fragmentierte Tabellen, §1.2) | `OverviewComponentType` (19 Typen) ist die Typ-Liste — nur noch ins Backend heben |
| Ownership je CI | Budget-Rollen wirken, Teams nicht (§1.4) | `team_resource_bindings`-Vorschlag (`FE-IA-SPEC.md` §2.6) direkt übernehmen |
| Typisierte Beziehungen (Predicate) | Feld-basierte Parents (§1.5) | Edge-Tabelle mit `kind` (deployed-on, uses, owns, exposes, derived-from) |
| Discovery/Auto-Update [W2] | Container-Discovery in-memory; IaC-Files fehlen (`FE-IAC-DISCOVERY-SPEC.md` §8) | `iac_files` + Container-Registry persistieren; Discovery-Trigger am Deploy-Gate (v2-Seam, §3.7 dort) |
| Lifecycle-Status/Historie | Status-Felder ja, Änderungshistorie nein | Change-Log je Asset (Muster: `objectchange` in NetBox, `vault_audit_log` lokal) |
| Lizenz-/Kosten-Verfolgung [W1][W23] | LLM-Budgets wirken; Software-Lizenzen fehlen | Budget-Enforcement bleibt tabellarisch; ggf. ODRL-Begriffe für Regeln |
| Service-Mapping | fehlt (§1.6-6) | „App aggregiert Business-Service"-Ebene (iTop/Ralph-Muster), Phase 2 |
| Föderation (Quelle behält Kontrolle) [W2][W6] | Scanner-Feeds bereits föderiert (`security_events`/`sdk_logs`) | Muster dokumentieren statt neu bauen |

### 5.4 Konkreter Weg (abgeleitet aus belegtem Material — als Vorschlag, kein Sprint-Beschluss)

1. **CI-Kern:** eine Tabelle `assets` (oder `cis`) mit `id, type (FK auf Typ-Registry), name, status, owner/party-Referenz, scope_path (target→workspace→project→app-Ids oder NULL), created_at, updated_at` — Muster: Ralph `BaseObject` [W29] + JiMesh' `"<type>:<id>"`-Konvention (`FE-OVERVIEW-SPEC.md` §3.1:218). Die 19 Component-Typen aus §1.3 sind der initiale Typkatalog.
2. **Typ-Registry statt Spalten-Wildwuchs:** Tabelle `component_types` (name, Badge-/Widget-Katalog als JSONB, Default-Layout) — Muster: NetBox `ObjectType` [W36] + Snipe-IT AssetModel [W32]; die `overviewWidgets`/`badges`-Kataloge aus `FE-OVERVIEW-SPEC.md` §3.1 werden hier persistiert.
3. **Edge-Tabelle statt Parents überall:** `asset_edges (src_id, dst_id, kind, props JSONB)` mit geschlossenem `kind` (z. B. `deployed_on, uses, exposes, owns, derived_from, scoped_by`). Bestehende Feld-Parents (§1.5) bleiben die Quelle; die Edge-Tabelle wird daraus abgeleitet/gespiegelt — kein Big-Bang (MANDATES §8-Lesart).
4. **Scope-Referenz als Pfad:** `secrets_engines.scope_kind/scope_id` (`secrets_engines.go`:53–54) und `PluginInstallation.scopeType/scopeId` (`plugins.ts`:15–29) sind die in-Repo-Präzedenzen für generische Scope-Referenzen — auf die 4-Tier-Ebenen generalisieren (Level-Enum + Id + `no_parent`-Ehrlichkeit, `hierarchy.ts`:9).
5. **Tenancy/Access:** `team_resource_bindings` aus `FE-IA-SPEC.md` §2.6 ist bereits ein Entwurf in der richtigen Form (`resource_type/resource_id/role/inherit`) — in die CI-Registry integrieren (Binding = Edge `kind: 'access'` mit `role`/`inherit`-Props).
6. **Discovery-Persistenz:** `iac_files`-Tabelle aus `FE-IAC-DISCOVERY-SPEC.md` §3.6 (inkl. `container_refs`-JSON) als Vorlage für „Discovery-Ergebnisse als Assets", plus Tabellisierung der in-memory-Container-Discovery (`discovery.go`:37–45).
7. **Export-Layer:** JSON-LD-`@context` über `OverviewComponent` (§1.3) für maschinenlesbare Inventar-Exports; optional TD-Profil für Interfaces (`FE-PLUGINS-CONCEPT.md` §3.2).

---

## 6. 10 präzise Gemini-Research-Fragen

> Ziel: mit Gemini den optimalen SAM-Schemakompromiss für JiMesh prüfen. Kontext für Gemini sollte immer mitgeliefert werden: 4-Tier `SSHTarget→Workspace→Project→App` (Mandat §13), 19 Component-Typen (`FE-OVERVIEW-SPEC.md` §3.2), PostgreSQL-only (pgx v5), ca. 30 bestehende Tabellen (§1.2), `no_parent`-Fallback, Single-Operator.

1. **Schema-Form:** Wir haben 30+ spezialisierte Tabellen (`projects`, `containers`, `subagents`, `security_events` …) mit je eigenen Parent-Feldern. Ist für diesen Bestand eine **generische CI-Tabelle** (`assets(id,type,name,status,scope_path)`) plus **Edge-Tabelle** (`asset_edges(src,dst,kind,props)`) die richtige Nachgründung, oder wäre eine „Union-View + materialisierte Beziehungstabelle" ohne physische CI-Tabelle die bessere Migration? Welche Normalform hat in CMDB-Praxis (relational, kein RDF) die besten Migrations-/Abfrage-Eigenschaften?
2. **Beziehungs-Vokabular:** Welches minimale, geschlossene Prädikat-Set (z. B. `deployed_on, uses, exposes, owns, derived_from, scoped_by, granted_to`) deckt CMDB-Erfordernisse (Impact-Analyse, Root-Cause, Service-Views) ab, ohne auf ITIL-Vollständigkeit zu bloaten? Welche Prädikate verwenden OSLC Configuration Management bzw. NetBox/iTop produktiv?
3. **Scope-Vererbung:** Wie modelliert man „Scope als Pfad" (all ⊃ target ⊃ workspace ⊃ project ⊃ app ⊃ session) mit Override-nach-unten am saubersten in PostgreSQL — `ltree`/Pfad-String, Closure-Tabelle, Adjazenz + rekursive CTE oder materialisierter Pfad je CI? Welches Muster hält bei ca. 10^4 CIs und 6 Ebenen am performantesten und wartbarsten?
4. **Weiche Kette:** Project→Workspace→Target ist im Bestand **weich** (Projects tragen `node_host/node_user` statt Workspace-FK, `store.go`:604–606). Wie behandeln CMDB-Praxen „belegte" vs. „gematchte" Parentage? Brauchen wir `parent_confidence`/`derived_from`, oder ist ein expliziter `parent_kind: 'fk' | 'host-match'`-Edge sauberer?
5. **Tenancy/Access-Binding:** Ist die `team_resource_bindings`-Form (`resource_type/resource_id/role/inherit`, „spezifischster Binding gewinnt", Union der Rollen) kompatibel mit etablierten Modellen (NetBox Tenancy/Contacts, RBAC-Vererbung, OPA-Context)? Wo bricht „großzügigste Rolle gewinnt" gegenüber deny-override — und ist das ohne explizites Deny in v1 vertretbar?
6. **Typ-Registry & Generalisierung:** GLPI („Asset definitions") und NetBox (`ObjectType` + Custom Fields) generalisieren Assets. Sollte JiMesh Custom-Fields/Feature-Flags je Typ (`features`-Set wie NetBox, `overviewWidgets`-Katalog wie unser FE-Schema) in die Typ-Registry legen? Welche Felder gehören strikt pro Typ (Spalten), welche generisch (JSONB)?
7. **Discovery-Integration:** Welche Anreicherungs-/Reconcile-Muster benutzen CMDB-Tools, um Discovery-Ergebnisse (Container, IaC-Files, Ports) mit manuellen Registry-Einträgen zu verknüpfen (Namenskonvention `jimesh-framework-<wsId>-<runID>` vs. compose-Labels vs. Mounts — `FE-IAC-DISCOVERY-SPEC.md` §4.1)? Welches Konfidenz-/Fingerprint-Muster respektiert JiMesh' „reference, not quotation"-Mandat (`iac.go`:76–80)?
8. **Kosten-/Lizenz-Ebene:** JiMesh hat echten Kostenfluss (`request_log.cost_usd`, Budget-Enforcement mit Deny-Klassen). Welches Schema verbindet Asset (Key/Model), Nutzung (Call/Session), Kosten (Budget-Row) und ggf. Lizenzbedingung (ODRL permission/constraint) sauber — ohne einen kompletten GLPI/Snipe-IT-License-Stack zu bauen?
9. **Service-Mapping-Schiene:** Braucht JiMesh in v1 eine Business-Service-Ebene (iTop `ApplicationSolution`, Ralph `Service+Environment`) über der 4-Tier-Hierarchie — oder ist „App = Service" in unserem Domänenkontext ausreichend und die Service-Ebene erst mit Multi-Tenant-Use gerechtfertigt? Welche minimalen Felder wären nötig, um die Ebene später ohne Migration anzufügen?
10. **Standard-Export ohne Import:** Welches isomorphe Mapping von JiMesh' `OverviewComponent` (type/parent/childScopeIds/badges/data) nach JSON-LD (Schema.org `SoftwareApplication`-Felder, OSLC-Shapes) oder W3C TD (für Interfaces) ist am wenigsten verlustbehaftet — und lohnt sich der Export überhaupt für einen Single-Operator, oder erst für Agenten-Interoperabilität (MCP)?

---

## 7. Quellen

**Repo-Belege** (Datei:Zeile im Fließtext): `MANDATES.md` §13 (223–238); `src/frontend/src/types/domain/hierarchy.ts` (5–60); `docs/FE-OVERVIEW-SPEC.md` (§2.1–2.4, §3.1–3.2); `docs/FE-IA-SPEC.md` (§1.1–1.5, §2.1, §2.6); `docs/FE-PLUGINS-CONCEPT.md` (§0–§4, §7, §8); `docs/FE-IAC-DISCOVERY-SPEC.md` (§2, §3.6, §8); `src/backend/internal/store/store.go` (125–644: DDL `models` :402, `chains` :417, `chain_entries` :435, `keys` :449, `settings` :458, `request_log` :462, `agent_types` :486, `sessions` :493, `ssh_host_keys` :503, `chain_nodes` :510, `container_strategies` :522, `container_members` :532, `quota_state` :549, `quota_observations` :565, `projects` :597, `containers` :623, `deployments` :333, `model_roles` :350, `chain_model_roles` :358); `store/workspaces.go` (53–75); `store/project_roles.go` (46–53); `store/secrets_engines.go` (49–58); `store/control_planes.go` (68–77); `store/project_vlans.go` (38–46); `store/sdk_logs.go` (46–58); `store/subagents.go` (78–111); `store/consumer_keys.go` (45–58); `store/security_findings.go` (21–24); `store/router_aliases.go` (32–40); `store/rbac.go` (47–95); `store/users.go` (33–40); `store/security_events.go` (27–38); `store/vault.go` (61–105); `store/experts.go` (37, 129); `store/model_enrichment.go` (19); `src/frontend/src/lib/ssh-endpoints.ts` (53–115); `src/frontend/src/lib/security-events.ts` (10–22); `src/frontend/src/types/domain/plugins.ts`, `networking.ts` (21–32), `network_ownership.ts`.

**Externe Quellen [W#]:**

- [W1] Wikipedia: Software asset management — https://en.wikipedia.org/wiki/Software_asset_management
- [W2] Wikipedia: Configuration management database — https://en.wikipedia.org/wiki/Configuration_management_database
- [W3] Wikipedia: IT service management — https://en.wikipedia.org/wiki/IT_service_management
- [W4] Wikipedia: ITIL — https://en.wikipedia.org/wiki/Information_Technology_Infrastructure_Library
- [W5] Wikipedia: Configuration management — https://en.wikipedia.org/wiki/Configuration_management
- [W6] Wikipedia: Distributed Management Task Force (Standards-Liste inkl. CIM, CMDBf) — https://en.wikipedia.org/wiki/Distributed_Management_Task_Force
- [W7] Wikipedia: Common Information Model (computing) — https://en.wikipedia.org/wiki/Common_Information_Model_(computing)
- [W8] Wikipedia: OSLC — https://en.wikipedia.org/wiki/OSLC
- [W9] OSLC Open Project: About — https://open-services.net/about/
- [W10] Schema.org: SoftwareApplication — https://schema.org/SoftwareApplication
- [W11] W3C: ODRL Information Model 2.2 (Recommendation 2018-02-15) — https://www.w3.org/TR/odrl-model/
- [W12] OASIS: Open Command and Control (OpenC2) Language Specification v1.0 — https://docs.oasis-open.org/openc2/oc2ls/v1.0/oc2ls-v1.0.html
- [W13] W3C: Web of Things (WoT) Thing Description 1.1 (Recommendation 2023-12-05) — https://www.w3.org/TR/wot-thing-description11/
- [W14] Wikipedia: JSON-LD — https://en.wikipedia.org/wiki/JSON-LD
- [W15] Wikipedia: Resource Description Framework — https://en.wikipedia.org/wiki/Resource_Description_Framework
- [W16] Wikipedia: SPARQL — https://en.wikipedia.org/wiki/SPARQL
- [W17] Wikipedia: Web Ontology Language — https://en.wikipedia.org/wiki/Web_Ontology_Language
- [W18] Wikipedia: Graph database — https://en.wikipedia.org/wiki/Graph_database
- [W19] Wikipedia: Triplestore — https://en.wikipedia.org/wiki/Triplestore
- [W20] GitHub: glpi-project/glpi (GPL-3.0; README „SACM", „licenses tracking") — https://github.com/glpi-project/glpi
- [W21] GLPI Help Center: Assets (Typenliste inkl. Asset definitions) — https://help.glpi-project.org/documentation/modules/assets.md
- [W22] GLPI Help Center: Administration/Entities — https://help.glpi-project.org/documentation/modules/administration/entities.md
- [W23] GLPI Help Center: Software (Versionen/Lizenzen, „Financial management is done at the level of licenses") — https://help.glpi-project.org/documentation/modules/assets/softwares.md
- [W24] GLPI Help Center: Asset definitions — https://help.glpi-project.org/documentation/modules/configuration/asset-definitions.md
- [W25] GitHub: Combodo/iTop (AGPL-3.0; README: CMDB, impact analysis, data synchronization) — https://github.com/Combodo/iTop
- [W26] iTop-Doku: Data Model / Configuration Management (CMDB)-Module — https://www.itophub.io/wiki/page?id=latest:datamodel:start
- [W27] iTop-Doku: Configuration Management (CMDB) Module (Organizations, Contacts, Servers, DB Server, Licences, Patches …) — https://www.itophub.io/wiki/page?id=latest:datamodel:itop-config-mgmt
- [W28] GitHub: allegro/ralph (branch `ng`; README: Asset Management/DCIM/CMDB, Apache v2.0, „Sources only") — https://github.com/allegro/ralph
- [W29] Ralph: `src/ralph/assets/models/base.py` (BaseObject + service_env FK) — https://github.com/allegro/ralph/blob/ng/src/ralph/assets/models/base.py
- [W30] Ralph: `src/ralph/assets/models/assets.py` (Service/Environment/ServiceEnvironment, Category MPTT) — https://github.com/allegro/ralph/blob/ng/src/ralph/assets/models/assets.py
- [W31] GitHub: grokability/snipe-it (AGPL-3.0; README: asset/license management, depreciation) — https://github.com/grokability/snipe-it
- [W32] Snipe-IT-Doku: Asset Models (Typvorlage, ererbte Attribute) — https://snipe-it.readme.io/docs/asset-models.md
- [W33] GitHub: netbox-community/netbox (Apache-2.0) — https://github.com/netbox-community/netbox
- [W34] NetBox-Doku: Models (App-/Modellverzeichnis dcim/tenancy/virtualization/…) — https://docs.netbox.dev/en/stable/models/
- [W35] SourceForge: OneCMDB (abandoned, GPLv2, „model can be changed on the fly", ITIL compliant) — https://sourceforge.net/projects/onecmdb/
- [W36] NetBox-Doku: Object Types (dynamische Modellbezüge) — https://github.com/netbox-community/netbox/blob/main/docs/models/core/objecttype.md

**Verifikationslücken (ehrlich vermerkt):** dmtf.org (CMDBf-/CIM-Spec-Seiten) antwortete mit HTTP 403 auf direkte Fetches — CMDBf wird nur über die DMTF-Standardsliste [W6] und die CMDB-Federations-Definition [W2] belegt; Operationsdetails des Specs sind hier nicht behauptet. Die web_search-API stand in dieser Session nicht zur Verfügung; alle externen Zitate stammen aus direkt abgerufenen Seiten (Wikipedia-API/REST, docs.oasis-open.org, w3.org, schema.org, GitHub raw/API, help.glpi-project.org, itophub.io, snipe-it.readme.io, sourceforge.net).
