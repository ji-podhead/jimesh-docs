# MASTER SPRINT PLAN — Alle Tasks (Jules-Coding + Jules-Audit + GLM)

**Datum:** 15.9.2026 (23:59) | **Autor:** GLM (dsd-Session)
**Referenz:** TASK-PLAN-ALL-v2, R44-Post-Audit, R43-PUBLICATION-PLAN, R40-Feedback-Blitz, Sprint-D-E1-E5
**Status:** Konsolidiert nach dem kompletten Session-Durchlauf (alle Merges, alle Subagent-Reports, alle Operator-Fragen)

---

## ✅ ABGESCHLOSSEN + GEMERGT (kein weiterer Code nötig)

| Task | Commit | Sprint | Was |
|---|---|---|---|
| **TASK-030** | Sprint-30 | Zero-Port | Framework-Container binden ÜBERHAUPT keinen Host-Port |
| **TASK-032** | Sprint-32 | SIEM-Foundation | Wazuh + Falco + siem-bridge, alle 5 Services healthy |
| **TASK-033** | Sprint-33 | Router-Node | Edge-Node :3100, HTTP-Demux, JSONL, CDC-Forwarder, edgeNode-Checkbox |
| **TASK-034** | Sprint-33 | CDC pglogrepl | StartReplication → Channel, Slot-Manager, Integration-Test |
| **TASK-036** | Sprint-36 | Logger-SDK/Router/CDC | NetworksPage + AgentsPage live (ee7055b) |
| **TASK-037** | Sprint-37 | Workspaces-Hierarchy | workspaces-Tabelle, HIERARCHIE, 037-Formular |
| **TASK-053** | Sprint-40 | Frontend-IA | gVisor am Node, SSH-Endpoint getrennt, /projects → /workspaces Redirect |
| **TASK-054** | Sprint-32 | eBPF/K-LAF | Falco + Wazuh-Bridge + siem-bridge + ISM-30d-Retention |
| **TASK-055** | Sprint-32 | Vault-Isolation | project_id-scoped Vault, Service-Key-Read-Scope |
| **TASK-056** | Sprint-32 | RBAC-Rollen-UI | Role-Picker admin/developer/viewer, AdminUsers+Budgets |
| **TASK-057** | Sprint-31 | WAF Coraza-Sidecar | SQLi/XSS live geblockt (403), Portumkehr §4, OWASP-CRS einkompiliert |
| **TASK-058** | Sprint-36 | Edge-Node | Ingest :3100, CDC-Forward, WAN-Puffer, edgeNode-Checkbox, 3 Bugs gefixt |
| **TASK-060** | Sprint-38 | Control-Plane-Registry | SSH-Provider + 501-Stubs, Router-Direktleitung |
| **TASK-062** | Sprint-38 | Control-Planes-UI | CRUD+Provision+Deploy-Dialoge |
| **TASK-066** | Sprint-40 | Vault-Konsolidierung | Platform-Tab, VaultDashboardPage, ProjectSecretsPage, Redirect |
| **TASK-067** | Sprint-40 | Wazuh-Dashboard new-tab | iframe → new-tab (self-signed cert fix) |
| **TASK-069** | Sprint-40 | Security-Overview Picker | Target-Combobox + Popover-Fix + /security/events/:id Route |
| **TASK-070** | Sprint-41 | Capability-RBAC | 6 Domänen × 4 Aktionen, Live-403-Kette |
| **TASK-071** | Sprint-40 | Ghost-Delete + RBAC-Bypass-Fix | DELETE /api/users+projects, kcSessionMarker |
| **TASK-072** | Sprint-40 | RBAC-at-Create | Access-Sektion in Create-Dialogen, existing-row-Schutz |
| **TASK-073** | Sprint-27 | OAuth Google+GitHub | Realm-JSON IdPs, Fall-B-POST-Rezept, nicht E2E getestet |
| **TASK-074** | Sprint-40 | MiniSidebar→SectionRail | WP1-4: Rail links, Hierarchie-Dropdowns, Scope-Selector, Landing |
| **TASK-076** | Sprint-38 | Agent-Feedback-Loop | SIEM-Criticals→Session-SSE-Injektion |
| **TASK-078** | Sprint-40 | NetworksPage headplane-Port | Machines/PreAuthKeys/User-Rows + ACL-Topology |
| **TASK-079** | Sprint-41 | Identity-Routing | Routing-Tabelle+Ownership-Gate, 403 bewiesen |
| **TASK-080** | Sprint-41 | VLAN-Isolation | macvlan/ipvlan + gVisor, Network-Editing-Page, Ownership |
| **TASK-106** | TASK-PLAN-PLUGIN-SYSTEM | Plugin-Manifest v1 | plugin.yaml spec + JSON schema + JS validator + Go domain schema |
| **TASK-R41** | Jules | Dead-Code | DiscoveryStatus+entropy_cascade+3 Komponenten gelöscht |
| **TASK-R42** | Jules | ProjectsPage-Refactor | 2257→1300, fake Logs raus, Sub-Komponenten, gVisor auf Node |
| **TASK-R43** | Jules | Firewall-UI | FirewallRulesSection, NetworksPage-Proxy |

---

## 🔄 GEPLANT + PRIORITÄTEN (Jules-Coding Tasks)

| Task | Priorität | Sprint | Was | Status |
|---|---|---|---|---|
| **TASK-081** | P0 | Sprint-42 | LLM-Security-Tab + per-Project Guard-Policies | geplant |
| **TASK-082** | P1 | Sprint-42 | Exposed-Ports WAF Matrix + Network Surface | geplant |
| **TASK-083** | P1 | Sprint-42 | Tailscale Magic-Certs + App SSL | geplant |
| **TASK-087** | P0 | Sprint-43 | Domain-Model: SSH→Workspace→Project→App (4 Ebenen) + no_parent + Schema-Design + Code-Audit | geplant |
| **TASK-088** | P0 | Sprint-43 | Firebase-Auth: Dual-Auth-Modus (Keycloak + Firebase GitHub/Google) + Provider-Credentials | geplant |
| **TASK-089** | P1 | Sprint-43 | Utility-Dependencies + WAF/Firewall/Networks/Security Sections im Workspace-Sidebar | geplant |
| **TASK-090** | P1 | Sprint-43 | Onboarding-Flow: Welcome→Node→Firewall→Deploy (4 Steps, Sprint-D1) | geplant |
| **TASK-091** | P2 | Sprint-43 | jimesh_services Overlay + Utility-Apps (Sprint-D2) + ausblendbar | geplant |
| **TASK-092** | P2 | Sprint-43 | Docker-Network-Discovery + App-Discovery + React-Icons + Graph-View (Sprint-D3) | geplant |
| **TASK-093** | P2 | Sprint-43 | App-Discovery: Docker Hub API + Code-Scan + Compose-File-Discovery | geplant |
| **TASK-094** | P2 | Sprint-43 | Aikido Zen als Third-Party-Firewall-Interface | geplant |
| **TASK-095** | P1 | Sprint-43 | Workspace-Sidebar-Struktur final: WAF + Firewall + Networks + Security Sections (WP5 Sprint-D) | geplant |
| **TASK-096** | P1 | Sprint-43 | Security-Page-Integration: Workspace→App→selected section, direkte React-Integration (kein iframe) | geplant |
| **TASK-097** | P2 | Sprint-43 | OpenAPI-Pipeline: huma → /openapi.json → Scalar-Render → GH-Pages-Workflow → Blog-Integration (ji-podhead/articles) | geplant |

---

## 🔴 OPERATOR-BLOCKER (warte auf deine Entscheidung)

| Decision | Worauf wartet | Impact wenn nicht entschieden |
|---|---|---|
| E-SIEM-1..5 bestätigen | Defaults implementiert, unbestätigt seit 14.9. | SIEM-Tasks 032-Rest blockiert |
| SSH-Creds rotieren | R39-Referenz in History, CRITISCH | Alle Deployments nutzen das kompromittierte Passwort |
| OAuth E2E | echte Google/GitHub-Client-Credentials | TASK-073 E2E nicht testbar |
| Keycloak-Admin-PW | Live-Verifikation 068/070-Slots | Keycloak-Admin-Flows nicht verifiziert |
| 070 §6 Toggles | welche Domänen /api-Enforcement | Capability-RBAC Enforcement fehlt |
| 076-Design | Multi-Agent-Investigation ja/nein | Feedback-Loop Rest-Feature fehlt |
| O1–O5 (Sprint-33) | AWS-Strategie | 048-Rest (4 Provider) + Sprint-33 blockiert |
| de.json Gemini-Output | 1184 Keys übersetzen | Sprache-Switcher funktioniert nicht korrekt |
| jimesch-public Repo | GO-PUBLIC Phase 2 | Export blockiert |
| Firebase-Admin-SDK Key | Firebase Service-Account-Key (JSON) herunterladen | TASK-088 Backend-Token-Verifikation blockiert |

---

## 🟢 FERTIG + GEPUSHT (12-Tasks-Welle + Jules-Welle + alle Merges)

**Branch-Status:** alle Jules-Branches gemerged, origin/main = HEAD, keine offenen Branches mit ungemergtem Content (außer den geplanten Tasks oben).

- 12-Tasks-Welle: 066/067/069/071/073/078-P1/080
- R40-Fixes: 053/055/056/057
- Claude-Lieferungen: 032–037
- Erweiterung: 058/060/062
- Frontend: 074-WP1–4/076
- R41/42/43 (Jules): Dead-Code/ProjectsPage-Refactor/Firewall-UI
- R44-Tasks: 084/085/086 (SubagentsPanel, OpenAPI, Query-Key-Registry, Slop-Gate)
- M5: /projects → /workspaces Redirect
- Brand/Nav: JimeshMark, LLM-Proxy letzter Tab, brand-wordmark
- R43: PUBLICATION-PLAN, GO-PUBLIC.md, Articles-Removal, agentic-knowledge-Repo
- R44: Post-Audit-Tasks (084/085/086-Scope)
- SPRINT-43: SSOT/OpenAPI/Slop-File
- Sprint-D: Onboarding/Utility/Docker-Networks
- R44-Appendix: C — Gitpod-Salvage-Bewertung

---

## JULES-INSTANZEN

| Instanz | Status | Letzter Task |
|---|---|---|
| **jules-1648647822100541056-44c4731e** (Coding-Jules) | AKTIV, +6 Commits | R41/R42/R43 + 084/085/086 |
| **jules-audit-tasks-update** (Analysis-Jules) | AKTIV, +10 Commits | Audit + M5 + 084/085/086-Registrierung |
| **Neue Instanz** | Geplant | Kompletter-Audit + Tasks-Update (Prompt-2 von oben) |
| **jules-p** (Operator-Mention) | Status unklar | Audit-Forward (Operator-Report) |
