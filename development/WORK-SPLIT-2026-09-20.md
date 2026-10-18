# WORK-SPLIT-2026-09-20 — Wer macht was (Claude OUT, GLM + Jules + Subagents)

> **Situation:** Claude hat Weekly-Limit erreicht. GLM 5.3 (diese Session) übernimmt
> Backend + Architecture. Jules bekommt Frontend-Mocks. Subagents für Parallelarbeit.

---

## 1. ARTICLES → INTEGRATION-MATRIX (was davon in JiMesh einfließt)

| Artikel | Integration-Typ | Status | Was zu tun ist |
|---|---|---|---|
| **agent-identity-firewalls** | NATIV | ✅ R1-R4 Reports existieren | Sprint A Security implementieren |
| **ebpf (LLM Guards)** | NATIV (Phase 2) | Research fertig | eBPF-Observer als optionaler Scanner-Hook |
| **lora-cloudflare-vllm** | PLUGIN (vLLM-Serving) | Research fertig (R5, 323Z.) | vLLM-Deploy-Option für Agent-Container |
| **mcp-servers-for-ai-agents** | NATIV | ✅ mcpserver/ existiert | MCP-Tools mit Gateway-Routen verdrahten |
| **rag-poisoning-killchain** | NATIV (Scanner) | Research only | RAG-Injection-Checks in Agent-Scan (R1) integrieren |
| **gvisor-workspace-isolation** | NATIV | ✅ bereits integriert (hasGvisor-Flag) | Nichts zu tun |
| **learning-router** | NATIV | ✅ JiMesh IST der Learning Router | Nichts zu tun |
| **llm-mesh-intro** | NATIV | ✅ Kern-Konzept | Nichts zu tun |
| **coding-agents-context-windows** | NATIV (Session-Mgmt) | Konzept relevant | Agent-Session-Detail-Page implementieren |
| **siem-oss-vs-aws-native** | PLUGIN (SIEM-Feed) | Wazuh bereits integriert | OPNsense-Plugin + Cloud-SG-Plugin |
| **ontology-driven-rag** | NATIV (Schema) | ✅ COMPONENT-SCHEMA nutzt das | Nichts zu tun |
| **okf-agentic-knowledge-porting** | PLUGIN (OKF-Fork) | Fork B fertig (1813Z.) | Knowledge-Import-Plugin |
| **adversarial-perturbation** | NATIV (Red-Team) | R3-Report | Phase 0 CI-Tests implementieren |
| **attack-surface-osint** | PLUGIN (Recon) | Research only | OSINT-Scanner als Plugin |
| **devops-network-security** | NATIV | Firewall-Designs fertig | Provider-Setup implementieren |
| **hardening-the-recon-surface** | NATIV | Konzept relevant | Security-Settings implementieren |
| **data-harmonization** | NATIV | Konzept relevant | Data-Pipeline für Analytics |
| **google-tabfm-zero-shot** | Research | Nicht direkt | Nur als LLM-Chain-Option relevant |
| **from-expert-systems-to-agents** | Vision-Doc | Konzept | Adapter in COMPONENT-SCHEMA |
| **object-tracking-computer-vision** | NICHT relevant | — | — |
| **adversarial-perturbation** | NATIV | Red-Team | In R3 integrieren |
| **rhel-foreman-guide** | NICHT relevant | — | — |
| **mcp-docker-email-automation** | PLUGIN (Email) | MCP-Container-Deploy | Email-Utility-App |
| **siem-smb-guide** | PLUGIN (SIEM) | Guide existiert | SIEM-Setup-Wizard |
| **entropy-cascades** | Research | Nicht direkt | — |
| **ai-planning-evolution** | Vision-Doc | Konzept | — |

---

## 2. WAS NOCH FEHLT (nach Sprint-Status)

### SPRINT-2: APP-DEPLOYMENT-TRUTH (OFFEN — Backend)
- [ ] Deploy-Persistenz: executeDeploy schreibt Deployment-Rows + interfaces JSONB
- [ ] team_resource_bindings-Tabelle + CRUD-Routen (Frontend wartet!)
- [ ] iac_files-Tabelle + Scan-Route
- [ ] GET /api/integrations
- [ ] POST /api/ssh/explore (File-Browser-Backend)

### SPRINT-3: SECURITY-HARDENING (OFFEN — Backend)
- [ ] R3-P0: Red-Team-Tests (db-frei, Go)
- [ ] R2-P1: dlp_hook.go (pass/redact/block, default OFF)
- [ ] R4-P1: internal/oteltrace/ (OTLP-Spine)
- [ ] R1-P1: internal/agentconfig/ + 5 Checks
- [ ] Vault-ACL-Fix (allowed_agents)
- [ ] GET /api/security/agent-scan + report
- [ ] GET /api/traces/{id}

### FRONTEND: ~50 der 56 Designs sind NICHT implementiert
Implementiert: /overview, /workspaces/apps/:appId, /security/findings, /security/siem (Timeline), Teams-Bindings, Admin-Users

NICHT implementiert (brauchen Frontend-Mocks):
- SSH Target Detail Page
- Workspace Detail Page
- Agent Session Detail (Chat + Tool-Calls)
- Project Detail (IaC-Tab)
- Deployment Detail (Pipeline + Logs)
- Plugin Catalog + Detail + Install-Wizard + Settings
- OPNsense Config + Firewall Provider Setup + Traffic Log
- Agent Config Scanner
- DLP Settings + Tool Call Inspector
- Trace Detail (Waterfall)
- Vault Access Matrix
- LLM Proxy Chain Overview (GRAPH-FIRST) + Graph Editor
- Notification Center
- Global Search (Cmd+K)
- App Discovery
- Dashboard Builder
- Container Logs (Route existiert, SSE-Backend fehlt)
- Design Assets Folder
- Browser Deployment Selection
- Onboarding (existiert teilweise)

---

## 3. ARBEITSTEILUNG

### GLM 5.3 (diese Session) — BACKEND + ARCHITECTURE:
1. **Sprint A Security** (R3-P0 → R2-P1 → R4-P1 → R1-P1 → Vault-ACL-Fix)
2. **Sprint 2 Backend** (Deploy-Persistenz → team-bindings → ssh/explore → iac-files)
3. **API-Verträge für Jules** (jede Frontend-Page braucht definierte Backend-Response-Shapes)

### JULES (Google AI) — FRONTEND-MOCKS:
1. Bekommt: API_DOCS.md + COMPONENT-SCHEMA.md + 56 Stitch-HTML-Designs
2. Baut: React-Komponenten aus den Designs (shadcn/ui + Tailwind)
3. Priorität: SSH-Target-Detail → Workspace-Detail → Agent-Session → Proxy-Graph

### SUBAGENTS (max 3-4 parallel):
1. Backend-Routen (team-bindings, ssh/explore, iac-files)
2. Security-Implementierungen (dlp_hook, oteltrace, agentconfig)
3. Frontend-Wiring wenn Backend fertig ist

### STITCH (Design-Iteration):
1. Bei Bedarf: Nachprompten von Screens die nicht passen
2. Neue Screens für Features die noch entstehen

---

## 4. SOFORT-START (GLM beginnt jetzt):

1. **R3-P0: Red-Team-Tests** — kleinste Aufgabe, startet die Security-Pipeline
2. **R2-P1: DLP-Hook** — der wichtigste Security-Gap (toolcalls.go:179)
3. **team-bindings Backend-Route** — Frontend wartet darauf (B15)
4. **Deploy-Persistenz** — die Backend-Lücke (store.go:333)

---

## 5. JULES-HANDOFF-PACKET (was Jules bekommt):

```
Dateien für Jules:
1. docs/API_DOCS.md — alle bestehenden Backend-Routen
2. docs/COMPONENT-SCHEMA.md — die 23 Typen (TypeScript)
3. docs/FRONTEND-MOCK-PLAN.md — die Baureihenfolge P0→P4
4. docs/HANDOFF-2026-09-20-COMPLETE.md — der komplette Kontext
5. design-assets/stitch/*.html — die 56 Design-Referenzen
6. docs/ICON-REGISTRY.md — alle verfügbaren Icons

Auftrag für Jules:
- Lies FRONTEND-MOCK-PLAN §4 (Baureihenfolge)
- Baue P2: Detail-Tier (SSH-Target, Workspace, Agent-Session)
- Nutze die Stitch-HTMLs als VISUELLE Referenz (nicht als Code)
- shadcn/ui + Tailwind, tsc-clean, i18n-Keys
```
