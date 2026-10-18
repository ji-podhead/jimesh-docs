# PROMPTS-VS-DELIVERY-AUDIT — 2026-09-28

**What this is:** Every concrete, actionable demand from Leo's 304 verbatim prompts
(`claude_session_prompts_FULL_2026-09-28.md` #1–168 + `claude_session_prompts_PART2_2026-09-28.md` #169–304,
Sept 24–27, 2026) verified against the **actual code** in `/home/ji/projects/jimesh` and
`/home/ji/projects/meshsquad-public`. No conclusion from docs or commit messages alone — every
status below is backed by grep/read evidence taken during this audit. Predecessor audit agent
crashed before writing this; this is the redo.

---

## 1. Methodology

- **Sources:** both prompt files read in full (all 304 prompts, including the 5 lines that the
  read tool truncates at 2000 chars — extracted via sed). Tracking docs read first:
  `OPEN-ITEMS-2026-09-28.md` (items #1–30) and `HANDOFF-2026-09-28-FINAL.md`.
- **Also checked (operator-named): `claude_session_prompts.md`** — the earlier partial export of the
  same session (d847e251), 140 prompts. Verified **fully subsumed by FULL, zero unique content**:
  all 140 timestamps exist in FULL∪PART2 (set-diff empty); it ends at prompt #140
  (2026-09-26T10:05:18Z — the very "DU LIEST JETZT DIE KOMPLETTE SESSION AUS UND SPEICHERST ALLE
  MEINE PROMPTS" export demand), timestamp- and content-identical to FULL's #140; its copy of the
  long prompt #34 carries the same 2000-char truncation (line length 2148 in BOTH files), so it
  holds no fuller text either. FULL's own header already states it "includ[es] the period already
  covered by the earlier partial extraction claude_session_prompts.md". No new prompts → no new
  demands extracted from it; the 304-prompt set remains complete.
- **Verification:** grep/read/git-log (read-only) against `jimesh` (Go backend `src/backend`,
  React frontend `src/frontend`, IaC `deploy/`, `config.yml`, `Makefile`) and `meshsquad-public`
  (`server.py` team-assembly API, `frontend/`). Cross-checks in `/home/ji/projects/jimesh-crew`
  (guardrails concept), `/home/ji/projects/ihc24` (docs/scripts). **No tests were run** (pytest/vitest
  would write `__pycache__`/node artifacts into the read-only repos) — test claims are cited from
  commit messages and the Sprint-Delivery-Review, with code structure verified by inspection.
- **⚠️ Mid-audit state changes (parallel GLM session committed WHILE this audit ran):**
  - jimesh `main` moved `97848b6` → **`b642993`** ("SPRINT-59": project deletion reachable via
    `ProjectDetailPage`, browser integration moved to `/plugins?browser=1`, ozone IaC, services-CLI,
    `SURICATA_INTERFACE` documented, suricata README). The 9 modified + untracked files listed in
    HANDOFF are now committed.
  - meshsquad-public `main` moved `f0cf5d1` → **`5f3de4c`**: the Team-Creator frontend is now
    **committed** (27/27 tests per commit msg) — closes OPEN-ITEMS #22.
  - Both branches `feat-app-panel` and `feat-workspace-lifecycle` have **zero commits not in main**
    (`git log main..feat-app-panel` empty) — the "SPRINT-139 Kollision" (OPEN-ITEMS #1) has no
    unmerged code left; what remains is the UI/IA overlap itself, not branch state.
  - jimesh `main` then moved once more to **`26b675b`** (ozone Datanode volume-ownership live-fix,
    28.9. night), and — mid-audit, **still uncommitted** — a parallel session is reworking the
    sidebar nav: `/onboarding` is being moved OUT of `NAVIGATION_ITEMS` into the servers section
    (`SERVERS_SECTION_ITEMS` in HierarchySidebar.tsx; next to `/workspaces/endpoints` in
    section-nav.ts), citing the operator demand verbatim. If committed+deployed, that answers the
    *onboarding* half of §2.4; the *deployments* half (`/workspaces/deployments` still in both nav
    registrations) remains open at audit close. All findings below describe the COMMITTED state
    unless marked otherwise.
- Status vocabulary: **DELIVERED** (code evidence) · **PARTIAL** (what exists + what's missing) ·
  **NEVER BUILT** (greps showing absence) · **BUILT, NEVER DEPLOYED** (code exists, not on the node) ·
  **ALREADY-IN-OPEN-ITEMS #N** (tracked, pointer only) · **OPS** (operational, outside code).

---

## 2. TOP REPEATED DEMANDS (3+ times) — what Leo is angriest about

### 2.1 Message bus / agent chat / conference room (~10 prompts: #34, #35, #42, #157, #158, #161, #164, #167, #168, #302)
> #161: "was ist jetzt mit dem message bus das nicht jeder agent immer im conference room sein muss ich hab das gefühl ich quatsch gegen ne wand und es wird nie was fertig"

**Verdict: core DELIVERED in meshsquad-public; Redis backend stubbed; jimesh-side UI embed still missing (OPEN-ITEMS #8).**
- Busy/idle-aware stream bus, exactly per the ask: `meshsquad-public/message_bus.py` header quotes
  prompts #34/#43 verbatim; append-only log + per-consumer cursor ("a 'busy' agent simply doesn't
  advance its own cursor. Nothing floods it", message_bus.py:14-18); catch-up = raw replay short gap /
  summary long gap (message_bus.py:5-8, tested). Multiple chatrooms on demand
  (`test_multiple_rooms_dont_leak`, message_bus.py:50-52). Pagination/lazyload via
  `read_since/read_before/latest_id` (message_bus.py:53-56).
- Inbox notices for agents not in the room (#167): `message_bus.py:136-143` (`InboxNotice`, `Inbox`).
- Checkpoint summaries via lightweight model (#34): `agents.py:742-745, 883-886` — RM29 injectable
  catch-up summarizer, explicitly **no model call in the routing path**.
- Chat for humans via an existing Go chat engine (#168: "warum können wir nicht eine von den chat go
  dingen benutzen"): `chat-gateway/` (gateway.py, redis_bus.py, tinode protos) + `tinode-compose.yml`
  — backend built and live-tested (21/21 chat-gateway per SPRINT-DELIVERY-REVIEW). RabbitMQ was Leo's
  fallback suggestion; tinode supersedes it.
- **Missing:** `RedisStreamsBackend` is an honest stub ("Not implemented here yet (no live Redis to
  test against…)", message_bus.py:20-22) — in-memory backend carries the tested logic.
- **Missing:** the chat panel embedded in the jimesh dashboard — 0 grep hits for
  `meshsquad|tinode` in `jimesh/src/frontend/src` (jimesh's own `/chat` route is the LLM playground,
  `components/ChatInterface.tsx`). = **ALREADY-IN-OPEN-ITEMS #8.**

### 2.2 Agent/Team builder — user assembles teams, NOT hardcoded (~7 prompts: #43, #118, #162, #164, #165, #301, #302)
> #162: "WARUM HAST DU JETZT MARKETING AGENTS HARDGECODET ICH HABE GESAGT DER USER SOLL SICH EIN TEAM ZUSAMMENSTELLEN KÖNNEN NUR DER ORCHESTRATOR IST IMMER DA … ICH WILL EIN AGENT BUILDER MAN"

**Verdict: DELIVERED (as of commit 5f3de4c, which landed during this audit).**
- Team assembly API: `server.py:42-51, 420-510` — `GET/POST /teams`, `GET /teams/{name}`,
  `POST /teams/{name}/activate` (switch team without restart), `DELETE /teams/{name}`.
- Orchestrator always present + custom instructions (#162): `orchestrator.py:135-146` uses
  `TeamConfig.orchestrator_instructions`; roles carry per-role instructions.
- Presets as data, not code (#165 "presets für social media team; marketing und coding"):
  `presets/{social-media,marketing,coding,outreach}.json` — all four exist.
- Team-Creator frontend (React-Flow: RoleNode/RolePanel/TeamForm/TeamsList + 4 test files,
  `frontend/src/`) — real, 27/27 tests, **committed 5f3de4c** (was uncommitted when HANDOFF was
  written → OPEN-ITEMS #22 now closed).
- Sub-agent spawning with a role for a task (#43): `agents.py:379` `spawn_sub_agent`, mandate
  inheritance, `max_sub_agents` budget (default 5), recursion guard — comments cite "Prompt #43".
- Harness/environments per role (the agent505 classes idea, #44/#45): `harnesses.py`
  (OpenCodeHarness:73, GenAiAgentHarness:87, DeepAgentsHarness:193) + `environments.py`.
- Note: the *old* hardcoded marketing crew lives on in `jimesh-crew` (`crew.config.json`) — the
  public repo is the fix.

### 2.3 eBPF / Suricata / Falco / network monitoring / threat detection (~13 prompts: #216, #217, #218, #220, #221, #222, #224, #225, #289, #292, #294, #295, #296, #297)
> #295: "ICH WILL ENDLICH DAS FUCKING NETWORK MONITORING UND THREAD SCHEISSE DIGGER WAS IST JIMESH????"
> #224: "können wir das dann bitte bitte bitte endlich mit ebpf machen und das scheiss prompt injection schiess wurde ja auch nie gebaut"

**Verdict: IaC largely BUILT at code level — but almost none of it DEPLOYED, no packet/IDS page in the UI, DAST missing, and the live status was never checked (OPEN-ITEMS #13/#28).**
- **Suricata** — `deploy/suricata-network-ids/{ansible-task.yml,defaults.yml}` (SPRINT-52, 27.9.)
  is real, capability-check-first, safe af-packet default, XDP gated behind explicit override.
  Its own header: "This file was never executed against a real node while authoring it".
  `defaults.yml`: "DELIBERATELY left out of Makefile's PLATFORM_SERVICES / deploy-all loop" — a
  human must run `make redeploy SERVICE=suricata-network-ids NODE=trading` (agent execution is
  classifier-blocked; HANDOFF records this). `SURICATA_INTERFACE` now documented
  (.env.example, b642993; trading=eth0 SSH-verified per commit msg). The suricata service in
  `deploy/siem/docker-compose.yml:286` stays **commented out**. → **BUILT, NEVER DEPLOYED.**
- **eBPF enforcement** (#224, answered verbatim) — `deploy/tetragon/jimesh-guard-kill.yaml`
  (commit ee84341, "RM32 eBPF-Nachtrag"): first real Tetragon TracingPolicy; guard-hook marks an
  injection-suspect container via docker-exec marker, policy SIGKILLs that exec before it runs
  ("bitte bitte bitte endlich mit ebpf machen" quoted in the file header). Honest caveat in-file:
  under gVisor/runsc, host eBPF sees no execs inside the sandbox (r25-tetragon-gvisor-kata note).
  Live run on trading: unverified. → **BUILT, NEVER DEPLOYED.**
- **Falco + gVisor runtime monitoring** (#220 "wieso haben wir falco nicht?") —
  `deploy/falco-gvisor-integration/{ansible-task.yml,defaults.yml,falco-gvisor.override.yml.j2}`
  wires gVisor's runtime monitoring into the running `deploy/siem` falco container (fail-loud
  prereqs, verified docker runtime registration); registered IaC service (deploy-service.yml:40-49).
  Plus commit 8482547 (SPRINT-52 Teil 1): workspace containers start with runsc-falco. → **BUILT;
  deployment on trading unverified.**
- **SIEM stack** — `deploy/siem/` (wazuh-manager/indexer/dashboard 4.14.7, falco 0.41.3, siem-bridge)
  + backend bridge `internal/siem/{bridge,shipper,transform,falco,wazuh}.go`: wazuh-indexer alerts +
  falco events → `POST /api/sdk/logs` (type=audit, alias=wazuh|falco). Frontend shows them:
  `store.tsx:95-97` fetches `/api/sdk/logs?type=audit` → SIEMEventsPage (sidebar EVENTS_ITEMS,
  HierarchySidebar.tsx:255) + SecurityOverviewPage ("real falco (xmrig/dpkg-lock drift rules)",
  SecurityOverviewPage.tsx:48 — closes R41's "beide Systeme LIEFERN Daten, aber das Frontend zeigt
  sie nicht").
- **Still missing:** packet/IDS-specific UI (no suricata/EVE page in frontend — grep for
  suricata|falco|tetragon|ebpf hits only labels/overview text); **DAST has no backend at all**
  (SecurityScansPage.tsx:34, honest placeholder tab → **ALREADY-IN-OPEN-ITEMS #14**); anomaly
  detection not built; `make siem` target does not exist (Makefile PLATFORM_SERVICES = 6 platform
  services only, line 210) and `deploy/siem` has **no ansible-task.yml/defaults.yml** — the SIEM
  stack is outside the standard IaC dispatch; jimesh→wazuh shipper direction + JiMesh-specific
  wazuh ruleset not found. Live status of the whole stack on trading was never re-checked since
  14.9. → **ALREADY-IN-OPEN-ITEMS #13/#28 (HÖCHSTE PRIO).**

### 2.4 Sidebar / navigation IA (~8 prompts: #195, #196, #210, #211, #212, #286, #287, #288)
> #286: "deploments und onboarding soll nicht in die sidebar onboarding soll bei servers rein als switch oben oder button … deployments kannst du in die overview seite von projects oder workspaces machen"

**Verdict: NOT DONE (as committed) — and commit e348871 that claimed it is a fake fix (the exact "done but isn't" pattern Leo complains about).**
- *In-flight at audit close (uncommitted working tree, parallel session):* Onboarding IS being moved
  into the servers section (see Methodology mid-audit note) — the onboarding half of the demand is
  being implemented; the deployments half is not. Deployments+visibility for Leo still requires
  commit + deploy.
- Current working tree at HEAD b642993: `HierarchySidebar.tsx:240-248` NAVIGATION_ITEMS still
  contains `/onboarding` (line 241) AND `/workspaces/deployments` (line 245); top-nav
  `section-nav.ts:120` still has the workspaceDeployments entry. Onboarding *does* have
  empty-state entry buttons in the servers section (register-server → /onboarding, lines 1317-1324)
  and projects section (line 1354-1361), but no per-server switch as demanded.
- `git show --stat e348871`: commit message says "Onboarding+Deployments aus Navigation" — the diff
  touches **only** 2 sprint docs + a test-probe file. It did NOT touch `section-nav.ts` or
  `HierarchySidebar.tsx`. This validates OPEN-ITEMS #24 and is a fresh, confirmed instance of
  claimed-vs-actual delivery.
- What WAS delivered on the IA: SPRINT-139 unified App Panel (AppPanelDrawer + ActiveAppsDropdown,
  commit 094e886), quick-deploy `[+ App]` on workspace rows (HierarchySidebar.tsx:1099-1101 + test),
  workspace-lifecycle model (see 2.6), and the case study Leo asked for (#288) exists at
  `jimesh/docs_dev/CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md` (plus
  `AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md`, same dir). → the consolidation decision +
  dead-component cleanup remain **ALREADY-IN-OPEN-ITEMS #1/#12/#17/#24**.

### 2.5 Guardrails / Llama-Guard dashboard with user-defined extra rules (~5 prompts: #34, #53, #190, #224, #237)
> #53: "da müssen wir nur ne llama guard setting im dashboard bauen wo der user seine extra rules definieren kann … über den session header wo die agent id und session drinne steht"

**Verdict: PARTIAL — real guard machinery exists end-to-end; the user-rules dashboard and streaming coverage do NOT.**
- DELIVERED: guard hook is real — `internal/ai/guard_hook.go` (493 lines) with bandit/failover/cost
  on its own mesh chain; settings `guard_scanner.enabled` + `guard_scanner.chain_id`
  (guard_hook.go:49-50), enforcement gate `guard_scanner.enforcement == "ebpf"` (line 67);
  request scan before upstream dispatch (proxy.go:196) and response scan (proxy.go:484).
  SecurityGuardDemoPage (`/security/testing`) drives the REAL hook with a synthetic injection
  prompt and is honestly unconfigured-aware (SecurityGuardDemoPage.tsx header).
  Crew traffic now goes through the jimesh router (rm32-C1): `meshsquad-public/environments.py`
  — "REFUSES to run without the router — fail-loud", JIMESH_API_KEY, opencode pointed at the
  router, "LIVE-VERIFIED" (environments.py:10-51; wiring doc rm32_c1_router_wiring.md in
  jimesh-crew). Identity is session-token-derived (per rm32 finding, superseding the X-Header idea).
- NEVER BUILT: (a) a dashboard where the **user defines extra guard rules** — 0 grep hits for
  custom categories / per-project guard rules in guard_hook.go/guard_enforce.go or the frontend;
  (b) **streaming-response guard scan** — proxy.go scans responses only in the non-streaming
  branch (proxy.go:478-489); the SSE branch (line 490+) passes tokens through live, unscanned
  (audit P0 confirmed in current code); (c) guard is **off by default** (safe default, but means
  nothing is protected until the operator wires a chain).
- Fail-open is a documented, decided default (guard_hook.go:58-62, E2/SPRINT-20).

### 2.6 gVisor sandboxing for the crew (runsc not runc) (~4 prompts: #43, #152, #198, #237)
**Verdict: PARTIAL — jimesh side real, crew containers still default runtime.**
- jimesh: runsc in `deploy/ansible/playbooks/provision-node.yml`, falco-gvisor-integration role,
  8482547 "Workspace-Container mit runsc-falco starten", tetragon policy documents the runsc/eBPF
  boundary honestly. "GVISOR IST IM IAC CODE" (#198) — confirmed.
- meshsquad-public: `docker-compose.yml` has **0 hits** for `runtime`/`runsc` → crew containers
  (crew1-7) still run under default runc. Migration outstanding → **ALREADY-IN-OPEN-ITEMS** (GLM P1).

### 2.7 "Schreib auf was ich will" — sprints / memory / prompt export (~11 prompts: #116, #140, #141, #160, #172, #174, #212, #235, #298, #300, #303, #304)
**Verdict: DELIVERED as process.** 29 sprint files in `jimesh/docs/sprints/` (incl. SPRINT-139,
RM35-SOC2, SPRINT-59); rm-series in jimesh-crew (rm32_guardrails_concept.md 726 lines per #190,
rm32_c1_router_wiring.md, rm11 doc); 4 memory files + MEMORY.md in
`~/.claude/projects/-home-ji-projects-ihc24/memory/` (user_leo_jimesh, feedback_verify_before_claim,
feedback_jimesh_deploy_conventions, reference_jimesh_sprint_docs); **both prompt-export files exist
and contain all 304 prompts verbatim** (#140/#304) — this audit consumes them. The mid-session
complaints were true then; the system now exists.

### 2.8 Dashboard login on trading (~14 prompts: #175–#187, #199–#208)
**Verdict: OPS — resolved** (not code). HANDOFF/GLM: all 12 containers up, backend+frontend
deployed, runsc registered; the operator's own pastes (#148/#201) show the socat route works.
**One concrete step still open:** Headscale API key created but not yet inserted into the env
(HANDOFF §2).

### 2.9 Chromium / browser integration, no iframes (#118, #236, #241, #242 "beides")
**Verdict: PARTIAL.**
- DELIVERED: native third-party dashboard embedding via the gateway — `/embed/{name}`
  reverse-proxy on the dashboard's own origin, session-gated, "NO IFRAME, NO AGENT-BROWSER"
  (`embed.go:19`, commit 20c5fb3 SPRINT-57); Grafana 11.5 stack provisioned
  (`deploy/grafana/`, postgres/redis dashboards; Wazuh/Ozone dashboards "follow" per commit msg);
  launcher DashboardsPage + nav.dashboards; `JIMESH_EMBED_TARGETS` documented (.env.example:220,
  deploy/backend/defaults.yml:90-95, default OFF).
- The "Browser-Integration" nav entry (moved to `/plugins?browser=1`, b642993) opens
  `BrowserRuntimeModal` — which is a **deployment runtime-selection dialog** (dsh | opencode |
  claude-code | gemini-cli | jimesh + _code_server variants + python/go/node/docker/base presets),
  explicitly NOT KasmWeb/Chromium (modal header: backend supports neither, no-mock).
- NEVER BUILT: a real Chromium/agent-browser rendering pages inside the dashboard. Leo's
  distinction (#241: agent browser vs chromium website integration) is reflected in code comments,
  but the "beides" demand is only half-met (embed yes, browser no).

### 2.10 Failover / HA for control plane, secrets, OPA, databases (~4 prompts: #226, #227, #228, #229)
**Verdict: NEVER BUILT.** 0 grep hits for `failover_for`/failover-role across jimesh
(Go/YAML); `config.yml:46` still says "There is exactly one main control plane"; no control-plane
migration; Debezium is a commented dead scaffold ("totes Scaffold, nie deployed, 0 Connector je",
deploy/datalake/docker-compose.yml:15) — replaced by the real datalaked Kafka→Ozone path (a4e4ce8).
→ **ALREADY-IN-OPEN-ITEMS #11.**

### 2.11 Ozone + datalake (#225, #234, #235, #291)
**Verdict: DELIVERED at deploy level; platform integration missing.**
- `deploy/ozone/{ansible-task.yml,defaults.yml,docker-compose.yml}` registered as IaC service
  (deploy-service.yml:53-61), committed b642993; HANDOFF: really deployed on trading (5 containers,
  OM/S3-Gateway/Recon answered HTTP on 28.9.). Datalake: cmd/datalaked + deploy/datalake +
  DatalakePage (/dbs/datalake) + /api/datalake/{status,pipelines} (gateway.go:332-333).
- Missing: jimesh platform integration (env wiring), the S3/Ozone file browser frontend —
  `src/frontend/src/components/workspaces/FileBrowser.tsx` is untracked AND unwired (0 imports),
  backend parked as `files.go.s138wip`/`files_test.go.s138wip`; storage-tier model undecided.
  → **ALREADY-IN-OPEN-ITEMS #7/#10/#29.**

---

## 3. Full demand table (all other concrete demands)

| # | Demand (prompt refs) | Status | Evidence |
|---|---|---|---|
| 3.1 | Public repo, strip ownhealth/trading contamination, secure (#34, #173, #218 "sprints nicht ins public repo") | DELIVERED | meshsquad-public exists; grep ownhealth/trading → only an unrelated node_modules/tldts file; contamination (CLAUDE.ownhealth.md, docker-compose.trading.yml) stays in jimesh-crew; secrets/CI gates per a9354ae/f0cf5d1; sprints not in public repo |
| 3.2 | meshsquad as jimesh plugin + standalone (#34, #173, #118) | PARTIAL | plugin.yaml (jimesh manifest spec v1, honest Tier-1 declaration) exists; BUT jimesh-side plugin installation has NO persistence: `gateway/plugins.go:62-80` — GET returns hardcoded `[]`, POST echoes `success:true` and stores nothing (no-mock violation risk; audit P0 confirmed in current code) |
| 3.3 | Discord compatibility / choose messaging at deploy (#35, #42) | PARTIAL | discord_reporting.py + tests exist (injection path Leo praised); internal chat = tinode; an either/or deploy-time switch is not evidenced |
| 3.4 | AutoGen/MetaGPT research, steal patterns (#36, #164, #165, #166) | DELIVERED | agents.py:13-47 documents real source reading of microsoft/autogen (_swarm/_selector/_round_robin group chat) + FoundationAgents/MetaGPT; swarm speaker selection, react modes, per-role message subscriptions, max_react_loop implemented |
| 3.5 | Eventbus (#158) | DELIVERED | Redis Stream `jimesh:events` (store/sdk_logs.go, streams/streams.go, sdklogs/sdklogs.go) — event-driven feedback loop |
| 3.6 | Which models are used / chains (#157) | DELIVERED | /v1/models, /api/models, ProxyChainsPage, LlmProxyOverviewPage, providers/keys pages |
| 3.7 | Workspace terminal ("Terminals deployen", #286; OPEN-ITEMS #16/#18) | DELIVERED (code), live test open | SPRINT-138 WorkspaceTerminal: WS `/api/workspaces/{id}/terminal` docker-exec (terminal.go), wired in sidebar (T badge :942, openWorkspaceTerminal :1013/1112, rendered :1491). Never live-tested |
| 3.8 | Deploy-type selection like before (dsh/shell, #286) | DELIVERED | BrowserRuntimeModal offers the real framework/runtime matrix; /api/projects/deploy + interfaces; quick-deploy [+ App] on rows |
| 3.9 | §8 workspace lifecycle (Create=row, provisioning flow, workspace_kind, auto-provision at onboarding, §8.3b names) (#286 paste) | DELIVERED | Commits bbf6b4e/14d1012/97848b6; POST /api/workspaces/{id}/provision (gateway.go:249), workspace_kind (store/workspaces.go, gateway.go), user_provisioning.go:14/58/110 §8 auto-provision, §8.3b in HierarchySidebar |
| 3.10 | Project deletion reachable (OPEN-ITEMS #2; live delete demands 28.9.) | DELIVERED | DELETE /api/projects/{id} registered (deploy.go:70 → store.go:1896 DeleteProject); frontend wiring committed in b642993 (ProjectDetailPage → DeleteProjectDialog, best-effort node sweep, honest leftover note) |
| 3.11 | Workspace deletion UI (HANDOFF NACHTRAG; OPEN-ITEMS #26) | DELIVERED — HANDOFF claim is STALE | WorkspacesPage.tsx:408-418 real mutation → DELETE /api/workspaces/{id} (handleWorkspaceDelete, workspaces.go:267-272) + separate remove-worktree dialog (:420ff). The HANDOFF's "no button/handler found" was wrong |
| 3.12 | Server/node deletion (OPEN-ITEMS #27) | NEVER BUILT | nodes are config.yml entries; no node-delete API/store row (consistent with HANDOFF) |
| 3.13 | Team/user access selection on workspaces (OPEN-ITEMS #25) | NEVER BUILT | 0 hits member/access/invite in store/workspaces.go |
| 3.14 | Per-node services list, deployable (OPEN-ITEMS #4) | PARTIAL | CLI way delivered: config.yml `services:` → render-inventory.py:131-133,165-174 → gitignored .node-services → Makefile:233-241; ozone registered. Dashboard way consciously blocked + documented (distroless, no SSH identity bridge) |
| 3.15 | Deploy other servers from control plane via dashboard/SSH (#226) | PARTIAL | Control-plane registry real for ssh (ControlPlanesPage, /api/nodes/provision deploy.go:91; aws/gcp/ipam/k8s honest stubs); services-awareness/failover missing (see 2.10) |
| 3.16 | Widgets with own frontend components (#118) | NEVER BUILT | No widget system in frontend (grep hits are incidental); plugin manifest schema mentions widget surface only |
| 3.17 | SOC2 audit logs (#248, #250) | DELIVERED (foundation) | 8ee85e4 RM35: admin_audit_log table + policy-gate hook, GET /api/admin/audit-log (admin_audit.go:32), /security/audit-log page (AdminAuditLogPage.tsx) + two nav registrations. Full SOC2 cert-readiness beyond this remains open |
| 3.18 | SAST static analysis UI (#289) | DELIVERED (v1) | SecurityScansSastPage (SecurityScansPage.tsx:294-299) fed by real rows from runSASTStage — gosec (go workspaces) + trivy (images), quarantine.go:425-431 |
| 3.19 | DAST | NEVER BUILT | "DAST has no backend at all yet" (SecurityScansPage.tsx:34) → ALREADY-IN-OPEN-ITEMS #14 |
| 3.20 | Dangerous-IP blocking / null-routing on danger (#216) | NEVER BUILT | 0 hits for null-route/block-ip automation in backend (firewall rules UI + nftables exist, but no SIEM-driven auto-block) |
| 3.21 | SIEM rest (jimesh→wazuh shipper, wazuh ruleset, make siem) (#237) | PARTIAL | sensor→jimesh bridge done (internal/siem/bridge.go); no jimesh→wazuh shipper, no make siem (Makefile:210 six platform services only), deploy/siem has no ansible-task.yml (outside IaC dispatch); wazuh config dirs exist |
| 3.22 | Grafana dashboards for network monitoring/SIEM (#225) | DELIVERED (stack) | deploy/grafana (Grafana 11.5+Prometheus v3.1+exporters, provisioned dashboards) + native /embed/grafana; live-check outstanding (GLM P2) |
| 3.23 | Streaming-response guard scan (#237 P0) | NEVER BUILT | proxy.go: SSE branch passes through unscanned (only usage extracted); scan+guard only in non-streaming branch |
| 3.24 | Multi-select endpoint-audit table BEFORE multi-select UI (#237 P0) | NEVER BUILT | multi-select UI exists (ScopeSelectorModal, HierarchySidebar tree multi-select, BreadcrumbBar) but no endpoint-audit table anywhere — operator condition violated |
| 3.25 | Secrets rotate from Vault UI (#237 P0) | NEVER BUILT | 0 hits rotate in VaultDashboardPage.tsx / internal/secretsengine / secrets_engines.go |
| 3.26 | Firebase/Gmail/GDrive integrations (#237 P0) | NEVER BUILT | 0 hits in jimesh backend |
| 3.27 | Phantom MCP routes /api/plugins/{linear,github,dsh} (#237 P0) | RESOLVED since audit | 0 hits in gateway AND frontend — cleaned in the meantime |
| 3.28 | GO-PUBLIC phase 0-2 credential rotation (#237 P0) | NEVER EXECUTED | no rotation evidence; secrets remain in .env (not read, per no-secrets rule); tracked in audit.md P0 + GLM P0 |
| 3.29 | Deploy-time integrations/plugin picker at project/workspace creation (#247) | NEVER BUILT | 0 hits plugin picker in NewProjectDialog/OnboardingPage → ALREADY-IN-OPEN-ITEMS #5 |
| 3.30 | Prompt export (#140, #303, #304) | DELIVERED | both files, 304 prompts — verified by this audit |
| 3.31 | Bybit trades script + investigation (#257-#283) | DELIVERED | bybit_check.sh + results.txt in ihc24; operator ran it (#278/#279 paste shows real output, LIVE_2 cumRealisedPnl −3301.80); #285 "bybit ist geklärt"; LIVE_1 empty response accepted open (OPEN-ITEMS #23) |
| 3.32 | Sep-6 grid-bot/trade investigation on sys_ex (#177, #189) | OPS — clarified | folded into the Bybit clarification (#285) |
| 3.33 | Local-deploy ban / Headscale overlay (#120-#137, #155) | DELIVERED (mandate) | standing mandate #1 in HANDOFF; memory feedback_jimesh_deploy_conventions.md; no local-deploy path in code (deploy-all is inventory-driven) |
| 3.34 | Onboarding reachable at servers (#286) | PARTIAL | empty-state buttons in servers/projects sections navigate to /onboarding; but /onboarding remains a sidebar nav item (against demand) — see 2.4 |
| 3.35 | Never-local-deploy: control plane node in tailnet (#145) | OPS — resolved via socat route | operator pastes #148/#201 show working access; headscale API key env step open (2.8) |
| 3.36 | Stitch designs for homepage/app (#20, #24, #26, #27) | DELIVERED | design-assets/stitch = 112 files (56 screens claimed in CLAUDE.md, since grown) |
| 3.37 | Marketing team/research for Tutario (ontology, taxonomy, awesome-repos, skills) (#29, #30, #31, #33, #47, #49) | DELIVERED (docs + crew) | ihc24: marketing_agents_spec.md, skills.md, gemini_at_glance.md, marketing_databroker_master_doc.md; crew: marketing agents (123/4 tests per Sprint-Delivery-Review) → extracted as meshsquad presets/marketing.json |
| 3.38 | Confluence docs (OKRs, GTM, email outreach, skills) (#9, #18, #23, #40, #171) | PARTIAL / unverifiable | local sources exist (pm_plan.md, skills.md, marketing docs); Confluence itself not verifiable from the repos |
| 3.39 | Tutario website features (BM25/hybrid/semantic search, tariff notifications, user preferences page, encryption) (#21, #22) | NEVER BUILT (in these repos) | 0 code in jimesh/meshsquad — belongs to a website project that does not exist here; designs only (stitch assets) |
| 3.40 | Data-broker atlas / FOFA / dorks research (#82, #109-#113) | DELIVERED (research docs only) | ihc24: whitepaper_databroker_infrastructure.md, broker_endpoint_schema.json, 3day_databroker_learning_plan.md, marketing_databroker_master_doc.md; no app/tooling code (and none demanded for these repos) |
| 3.41 | 5-agent marketing/security system + JSON schema (#70) | DELIVERED (doc level) | broker_endpoint_schema.json + marketing_agents_spec.md; agents materialized in crew/meshsquad presets |
| 3.42 | LinkedIn article + SVG (#60-#68) | DELIVERED (content) | ihc24/article.md, title.svg |
| 3.43 | Anti-bias instructions into CLAUDE.md (#59) | UNVERIFIED / likely never built | no CLAUDE.md found in ihc24 folder |
| 3.44 | Guardrails: don't rebuild, integrate jimesh's (#190) | DELIVERED | rm32 concept took inventory of jimesh's guard_hook (the #53 hook) and rm32-C1 wired the crew through the jimesh router — no duplicate guard stack was built |
| 3.45 | "Case study how to merge tabs/sections/navbar" (#288) | DELIVERED | docs_dev/CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md (+ AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md: 9 dead components + 5 orphan routes — e.g. playground nav entry /projects whose route redirects to /workspaces, App.tsx:571) |
| 3.46 | Dead-code review "code der nie benutzt wird" (#293) | DELIVERED (audit) | same AUDIT-2026-09-27 files in jimesh/docs_dev/ (note: OPEN-ITEMS cites ihc24 paths — the files actually live in jimesh/docs_dev/, they were never in ihc24) |
| 3.47 | "Analysiere was gebaut wurde und was fehlt" (#289, #243) | DELIVERED | SPRINT-DELIVERY-REVIEW-2026-09-28.md (46 sprints, ~215/230 claims held) + MASTER-WANT-VS-HAVE + this audit |

---

## 4. NEVER BUILT despite being explicitly demanded (the hard list)

1. **Sidebar IA per demand** — onboarding + deployments still sidebar items; e348871 claimed it,
   didn't do it (2.4). Open: #1/#17/#24.
2. **Streaming-response guard scan** — proxy.go SSE branch unscanned (2.5).
3. **User-defined guard rules dashboard (Llama-Guard custom categories)** (#53).
4. **SIEM→ full loop**: jimesh→wazuh shipper, JiMesh wazuh ruleset, make siem (2.3/3.21).
5. **DAST** — no backend at all (3.19).
6. **Automated dangerous-IP blocking / null-routing** (#216).
7. **Failover/HA in every variant** — failover_for role, secrets/ozone failover, control-plane
   migration, OPA/„opda" failover, Debezium/database HA (2.10).
8. **Plugin-installation persistence** — handler is an echo (3.2).
9. **Multi-select endpoint-audit table** (3.24).
10. **Secrets rotation from the Vault UI** (3.25).
11. **Firebase/Gmail/GDrive** (3.26).
12. **Real Chromium/agent-browser inside the dashboard** (2.9) — embed exists, browser doesn't.
13. **Widget system for imported frontend components** (#118).
14. **Team/user access selection on workspaces; server/node deletion** (3.12/3.13).
15. **Deploy-time integrations/plugin picker** (3.29).
16. **gVisor (runsc) for crew containers** — jimesh yes, crew still runc (2.6).
17. **Redis Streams backend for the crew message bus** — logic tested, backend stubbed (2.1).

**BUILT but NEVER DEPLOYED / NEVER LIVE-VERIFIED (the visibility trap):** suricata-network-ids
(operator must run make redeploy), tetragon guard-kill policy, falco-gvisor-integration role,
SIEM live status on trading (untouched since 14.9. → OPEN-ITEMS #13/#28, highest leverage),
workspace terminal live-smoke-test (OPEN-ITEMS #16/#18). Everything built on 28.9. was invisible
to Leo until the b642993/5f3de4c commits landed during this audit — the root cause of "wieder
nichts gebaut" (OPEN-ITEMS #30).

---

## 5. Counts & integrity findings

- **304 prompts** read; **~55 distinct concrete demands** extracted (pure venting excluded unless
  it contained a demand).
- Rough status split: **DELIVERED ~24** (incl. 2 built-never-deployed groups counted separately),
  **PARTIAL ~13**, **NEVER BUILT ~15**, **OPS-resolved ~4**, remainder doc-level/unverifiable.
- **The anger is justified in 3 places and outdated in 2:**
  1. Sidebar IA + the e348871 fake fix — real, current, confirmed.
  2. Streaming/custom-rules guard gaps + DAST + failover — real, current, confirmed.
  3. Suricata/eBPF: code exists but was never deployed → Leo's "ALSO HAST DU NUR GELOGEN???" is
     *functionally* true from his seat (nothing he can click), even though the IaC is real.
  4. Outdated: team-creator "never built/hardcoded" — now delivered+committed (5f3de4c); message
     bus — delivered and tested in meshsquad.
  5. Stale-tracking: workspace-delete UI actually exists (HANDOFF NACHTRAG #26 was wrong);
     AUDIT/CASE-STUDY docs exist but in jimesh/docs_dev/, not ihc24 as OPEN-ITEMS claims.
- **New integrity findings of this audit:** (a) e348871 message ≠ diff (fake fix); (b)
  plugins.go POST /api/plugin-installations returns success without persisting (no-mock risk);
  (c) OPEN-ITEMS/HANDOFF point to docs at ihc24 that actually live in jimesh/docs_dev/;
  (d) mid-audit commits (b642993, 5f3de4c) closed OPEN-ITEMS #2/#3/#6/#22 while the audit ran —
  indexes must be updated.

*Audited read-only. No file in jimesh or meshsquad-public was modified; the only file written is
this report. No secrets included. Prompts quoted verbatim (sic).*
