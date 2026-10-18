# JiMesh — Master Sprint Plan (Comprehensive)

**Datum:** 7.10.2026  
**Status:** 📋 PLANNED — Based on full codebase audit, sprint docs, and operator requirements  
**Goal:** Address ALL open issues in logical, sequential sprints

---

## Executive Summary

| Priority | Area | Sprint Count | Key Themes |
|----------|------|--------------|------------|
| **P0** | OpenReplay + OpenSearch | 3 | Session replay, traces, network events, semantic search |
| **P1** | Critical Bugs | 4 | Keycloak roles, utility auth, DNS, deploy blockers |
| **P2** | UI/UX Fixes | 3 | Sidebar dropdowns, navbar→tab-strip, file editor |
| **P3** | Feature Gaps | 5 | SilverBullet, Cloudflare Workers, Email, Vault, Agents |
| **P4** | Platform Hardening | 2 | gVisor, Vault hardening, RBAC audit |

**Total: 17 sprints** — sequential execution, each verifiable independently

---

## Sprint Table

| # | Sprint Name | Objective | Duration | Dependencies |
|---|-------------|-----------|----------|--------------|
| **S1** | **OpenReplay Deployment + ClickHouse/Kafka** | Deploy self-hosted OpenReplay, ClickHouse, Kafka for traces pipeline | 1 week | — |
| **S2** | **Traces API + OTel Instrumentation** | Backend trace ingestion, OTel spans in gateway handlers, ClickHouse storage | 1 week | S1 |
| **S3** | **OpenReplay Frontend + Network Events UI** | TracesPage, TraceWaterfall, NetworkEventsTable, OpenReplayEmbed, SessionSelector | 1 week | S2 |
| **S4** | **Keycloak Role Lookup Fix + Auth Hardening** | Fix lightweight token issue, ensure realm roles in JWT, audit all auth paths | 3 days | — |
| **S5** | **Utility Container Auth + gVisor** | Complete utility proxy auth, deploy gVisor (runsc), verify isolation | 1 week | S4 |
| **S6** | **DNS Overhaul Completion + Traefik File-Provider** | Wildcard DNS record, Traefik dynamic config, Keycloak redirect URI fixup | 3 days | S4 |
| **S7** | **Deploy Blocker Resolution** | Fix conn=local, lineinfile EBUSY, awk empty file, OS family support | 3 days | S6 |
| **S8** | **Sidebar Dropdowns + Navigation Reachability** | Fix all dropdowns, wire ghost routes, ensure every page reachable | 1 week | — |
| **S9** | **Navbar → Tab Strip Replacement** | Replace top navbar with browser-style tab strip, pinned tabs, routing integration | 1 week | S8 |
| **S10** | **File Editor + Container Filebrowser** | VS Code sidebar integration, container files tab, S3 rename API | 1 week | S5 |
| **S11** | **SilverBullet Notes + n8n Workflows** | Complete SilverBullet integration, n8n persistence, onboarding trigger | 1 week | S5, S10 |
| **S12** | **Cloudflare Workers / Serverless Workers** | Generic worker provider abstraction, Cloudflare/AWS/GCP, WorkersDashboard | 1 week | S11 |
| **S13** | **Email Notifications System** | SMTP channel, threat-correlation trigger, sidebar tab, generic dispatcher | 3 days | S4 |
| **S14** | **Vault Secret Hardening + Access Matrix** | Project-scoped secrets, membership checks, audit log, vault access matrix UI | 1 week | S4 |
| **S15** | **Agent Integration + SquadMesh** | Team Builder → SquadMesh Go wiring, agent sessions, chat, Stitch designs | 2 weeks | S3, S8 |
| **S16** | **RBAC Audit Log + SOC2 Admin Trail** | Generic admin_audit_log, all admin mutations logged, sidebar nav entry | 1 week | S14 |
| **S17** | **Platform Hardening: gVisor + Shared Volumes** | runsc runtime, daemon.json, GPU stack, Ozone datanode permissions | 1 week | S5, S7 |

---

## Detailed Sprint Specifications

---

### S1: OpenReplay Deployment + ClickHouse/Kafka

**Objective:** Deploy self-hosted OpenReplay stack with ClickHouse and Kafka for session replay and traces pipeline.

**Tasks:**
1. [ ] Deploy ClickHouse cluster (`deploy/clickhouse/`) with schema for spans + network events
2. [ ] Deploy Kafka (`deploy/kafka/`) with topics: `jimesh.traces.spans`, `jimesh.traces.events`, `jimesh.network.events`
3. [ ] Deploy OpenReplay (`deploy/openreplay/`) with PostgreSQL, Redis, MinIO/RustFS, Caddy
4. [ ] Configure ClickHouse client in Go (`internal/gateway/clickhouse.go`)
5. [ ] Create Kafka producer for spans (`internal/gateway/kafka_traces.go`)
6. [ ] Verify: `dig replay.jimesh.internal` resolves, OpenReplay UI accessible via VPN

**Files to Create/Modify:**
- `deploy/clickhouse/{docker-compose.yml,schema.sql,config.xml}`
- `deploy/kafka/docker-compose.yml`
- `deploy/openreplay/{docker-compose.yml,Caddyfile}`
- `src/backend/internal/gateway/clickhouse.go` (new)
- `src/backend/internal/gateway/kafka_traces.go` (new)
- `src/backend/internal/store/network_events.go` (new)
- `src/backend/internal/store/sessions.go` (new)

**Acceptance Criteria:**
- [ ] ClickHouse accepts span inserts via Go client
- [ ] Kafka topics created with correct partitions/retention
- [ ] OpenReplay backend/frontend healthy, accessible at `replay.jimesh.internal`
- [ ] Caddy terminates TLS on VPN IP only (Mandate 12)

---

### S2: Traces API + OTel Instrumentation

**Objective:** Build trace ingestion API, OTel span export, and instrument gateway handlers.

**Tasks:**
1. [ ] Implement `traces_api.go` with endpoints: `GET /api/traces`, `GET /api/traces/:traceId`, `GET /api/traces/:sessionId/network-events`
2. [ ] Add OTLP exporter to `internal/oteltrace/oteltrace.go`
3. [ ] Add call-sites in gateway handlers: Utility Proxy, Deploy, AI Proxy, Tunnel
4. [ ] Add call-sites in siem-bridge (Falco/Wazuh → spans)
5. [ ] Create network events consumer (`internal/gateway/network_events.go`)
6. [ ] Wire session propagation headers (S174-1 already done — verify integration)

**Files to Create/Modify:**
- `src/backend/internal/gateway/traces_api.go` (new)
- `src/backend/internal/gateway/network_events.go` (new)
- `src/backend/internal/gateway/openreplay.go` (new)
- `src/backend/internal/oteltrace/oteltrace.go` (extend)
- `src/backend/internal/gateway/project_utility.go` (add spans)
- `src/backend/internal/deploy/projects_ssh.go` (add spans)
- `src/backend/internal/ai/proxy.go` (add spans)
- `src/backend/cmd/siem-bridge/main.go` (add spans)

**Acceptance Criteria:**
- [ ] `GET /api/traces` returns sessions with spans from ClickHouse
- [ ] OTel spans exported to ClickHouse via OTLP
- [ ] All gateway handlers create spans with `X-JiMesh-*` headers
- [ ] Network events queryable via API
- [ ] `make go-test` passes (0 FAIL)

---

### S3: OpenReplay Frontend + Network Events UI

**Objective:** Build TracesPage with session selector, trace waterfall, network events table, and OpenReplay embed.

**Tasks:**
1. [ ] Create `TracesPage.tsx` at `/projects/:id/traces`
2. [ ] Build `TraceWaterfall.tsx` (recharts/d3 flamegraph)
3. [ ] Build `NetworkEventsTable.tsx` (Datadog-style: src/dst IP, ports, bytes, HTTP, latency, tags)
4. [ ] Build `OpenReplayEmbed.tsx` (iframe to `replay.jimesh.internal/session/:id`)
5. [ ] Build `SessionSelector.tsx` (global session picker with time range)
6. [ ] Inject OpenReplay snippet in `App.tsx` (reads `meta[name="jiMesh-session-id"]`)
7. [ ] Add i18n keys for 60 locales (traces.*, waterfall.*, network.*, replay.*)
8. [ ] Register route in `App.tsx` and sidebar nav (`section-nav.ts` + `HierarchySidebar.tsx`)

**Files to Create/Modify:**
- `src/frontend/src/views/TracesPage.tsx` (new)
- `src/frontend/src/components/traces/TraceWaterfall.tsx` (new)
- `src/frontend/src/components/traces/NetworkEventsTable.tsx` (new)
- `src/frontend/src/components/traces/OpenReplayEmbed.tsx` (new)
- `src/frontend/src/components/traces/SessionSelector.tsx` (new)
- `src/frontend/src/components/traces/TraceDetail.tsx` (new)
- `src/frontend/src/App.tsx` (route + OpenReplay snippet injection)
- `src/frontend/src/lib/section-nav.ts` (nav entry)
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (sidebar entry)
- `src/frontend/src/i18n/locales/*.json` (60 files)

**Acceptance Criteria:**
- [ ] TracesPage loads, session selector shows all project sessions
- [ ] Selecting session shows trace waterfall with spans
- [ ] Network Events tab shows events with header tags (session, agent, git, vlan, scope)
- [ ] Replay tab loads OpenReplay iframe with session replay
- [ ] `npm run check:i18n` passes (60 locales)
- [ ] `vitest` passes for all new components

---

### S4: Keycloak Role Lookup Fix + Auth Hardening

**Objective:** Fix Keycloak lightweight access token issue preventing realm roles in JWT, audit all auth paths.

**Tasks:**
1. [ ] Fix `ensureFullAccessTokenClaims()` in `BootstrapKeycloak` (already implemented — verify deployed)
2. [ ] Disable `client.use.lightweight.access.token.enabled` on `admin-cli` client
3. [ ] Verify `realm_access.roles` present in access tokens (includes `jimesh-admin`)
4. [ ] Audit all auth middleware paths for role-based access:
   - `/api/*` (Bearer + Keycloak)
   - `/utility/*` (Bearer + Keycloak + Session cookie fallback)
   - `/embed/*` (same chain)
   - WebSocket upgrades (tunnel, terminal)
5. [ ] Add tests: `TestKeycloakTokenHasRealmRoles`, `TestUtilityAuthWithKeycloakToken`
6. [ ] Document in `API_DOCS.md` auth flow for each endpoint group

**Files to Modify:**
- `src/backend/internal/auth/keycloak_oidc.go` (BootstrapKeycloak)
- `src/backend/internal/auth/auth.go` (validKeycloakToken, middleware)
- `src/backend/internal/auth/propagation.go` (verify StripIngress)
- `deploy/keycloak/ansible-task.yml` (kcadm realm fixup)
- `docs/API_DOCS.md` (auth documentation)

**Acceptance Criteria:**
- [ ] Keycloak access token contains `sub` + `realm_access.roles`
- [ ] `jimesh-admin` role grants admin access in all middleware paths
- [ ] `/utility/*` accepts same Keycloak token as `/api/*` (401 only for invalid)
- [ ] No client-spoofed headers pass StripIngress
- [ ] All auth tests pass

---

### S5: Utility Container Auth + gVisor

**Objective:** Complete utility container proxy authentication and deploy gVisor runtime.

**Tasks:**
1. [ ] Verify utility proxy auth fix (S170-E2) — Keycloak token validation for `/utility/*`
2. [ ] Install gVisor on target nodes: `runsc` binary, `/etc/docker/daemon.json` with `runsc` runtime
3. [ ] Update utility container deploy to use `--runtime=runsc`
4. [ ] Verify isolation: `docker inspect utility-<id> | grep Runtime` → `runsc`
5. [ ] Verify NStgid depth > 1 (nested namespace)
6. [ ] Fix Ozone datanode permissions (uid 1000 in container vs root:root on volume)
7. [ ] Complete S170-E3: Frontend Utility tab (Status, Start/Stop, 3 proxy links)

**Files to Create/Modify:**
- `deploy/utility-container/ansible-task.yml` (add `--runtime=runsc`)
- `src/scripts/install-gvisor.sh` (new — install runsc, configure daemon.json)
- `deploy/ozone/docker-compose.yml` (fix volume permissions: init container or user:)
- `src/frontend/src/views/ProjectDetailPage.tsx` (Utility tab)
- `src/frontend/src/components/projects/UtilityTab.tsx` (new)
- `src/frontend/src/i18n/locales/*.json` (utility.* keys)

**Acceptance Criteria:**
- [ ] `docker info` on node shows `runsc` runtime
- [ ] Utility container starts with `--runtime=runsc`
- [ ] `docker exec utility-<id> cat /proc/self/status` shows nested NStgid
- [ ] Utility proxy `/utility/<id>/` works with Keycloak auth (302 → code-server)
- [ ] Frontend Utility tab shows status, start/stop, proxy links to code-server/SilverBullet/n8n
- [ ] Ozone datanode volume writable by uid 1000

---

### S6: DNS Overhaul Completion + Traefik File-Provider

**Objective:** Complete DNS wildcard, Traefik file provider, and Keycloak redirect URI fixup.

**Tasks:**
1. [ ] Add wildcard record `* IN CNAME jimesh-traefik.jimesh-net.` to `deploy/cp/dns/zone.j2`
2. [ ] Configure Traefik file provider: `--providers.file.directory=/etc/traefik/dynamic`, watch=true
3. [ ] Share dynamic config volume between backend and Traefik
4. [ ] Verify Keycloak realm fixup runs on EVERY redeploy (full REPLACE of redirectUris/webOrigins)
5. [ ] Remove hardcoded `http://:8090/*` entries permanently
6. [ ] Test: `dig wildcard-test.jimesh.internal` → VPN IP, project DNS resolves via Traefik

**Files to Modify:**
- `deploy/cp/dns/zone.j2` (add wildcard)
- `deploy/traefik/ansible-task.yml` (file provider config)
- `deploy/traefik/defaults.yml` (dynamic directory path)
- `deploy/keycloak/ansible-task.yml` (verify kcadm REPLACE logic)
- `deploy/backend/ansible-task.yml` (shared volume mount)

**Acceptance Criteria:**
- [ ] `dig *.jimesh.internal` resolves to VPN IP
- [ ] Project DNS label creates Traefik route in dynamic file
- [ ] Keycloak redirect URIs contain `dashboard.jimesh.internal`, VPN IP, localhost
- [ ] No `http://:8090/*` in Keycloak config
- [ ] `make redeploy SERVICE=cp/dns` and `traefik` succeed

---

### S7: Deploy Blocker Resolution

**Objective:** Fix all deploy blockers preventing `make deploy-all` on superleo.

**Tasks:**
1. [ ] Fix `lineinfile` EBUSY: add `unsafe_writes: true` to postgres, keycloak, router-bootstrap tasks
2. [ ] Fix awk empty file bug: add `END { if (!found) print K "=" V }` to postgres, keycloak, grafana
3. [ ] Fix `default('127.0.0.1')` on empty string: use `default('127.0.0.1', true)` in keycloak, traefik, backend defaults
4. [ ] Update superleo `config.yml` services list (remove trading-only services)
5. [ ] Implement OS family support (Debian + Alpine) in `provision-node.yml`
6. [ ] Make `conn=local` work: mount docker.sock, /opt/jimesh, install docker-cli in runner
7. [ ] Fix `record-deploy` service name validation (allow single slash: `cp/dns`)

**Files to Modify:**
- `deploy/postgres/ansible-task.yml`
- `deploy/keycloak/ansible-task.yml`
- `deploy/grafana/ansible-task.yml`
- `deploy/router-bootstrap/ansible-task.yml`
- `deploy/keycloak/defaults.yml`
- `deploy/traefik/defaults.yml`
- `deploy/backend/defaults.yml`
- `deploy/ansible/playbooks/provision-node.yml`
- `deploy/ansible-runner/Dockerfile`
- `Makefile` (LOCAL_TARGETS, LOCAL_MOUNTS, record-deploy validation)
- `src/scripts/record-deploy.sh` (allow one slash in service name)

**Acceptance Criteria:**
- [ ] `make deploy-all` completes all 6 platform + 7 node services on superleo
- [ ] `SUPERLEO_CONN=local` works (no SSH, runs ansible-playbook directly)
- [ ] No EBUSY, no awk empty file, no iptables crash
- [ ] `record-deploy` records `cp/dns`, `client/dns` services
- [ ] SSH path (`SUPERLEO_CONN=ssh`) unchanged

---

### S8: Sidebar Dropdowns + Navigation Reachability

**Objective:** Fix all sidebar dropdowns, wire ghost routes, ensure every page reachable (Mandate 14).

**Tasks:**
1. [ ] Audit all sidebar dropdowns: `WORKSPACES_MORE_ITEMS`, `PLATFORM_ITEMS`, `AI_MODEL_ITEMS`, `SERVERS_SECTION_ITEMS`
2. [ ] Fix missing routes: `/workspaces/networks`, `/workspaces/files`, `/workspaces/deployments`, `/projects/discover`, `/plugins/settings`, `/subagents/approvals`, `/subagents/tool-calls`, `/chat`
3. [ ] Fix Platform section: `/control-planes`, `/api-docs`, `/vault-dashboard`, `/builder`, `/dashboards`
4. [ ] Ensure dual registration: `section-nav.ts` AND `HierarchySidebar.tsx` (RM35 pattern)
5. [ ] Fix Command Palette entries for all routes
6. [ ] Add reachability tests: every sidebar link clickable and loads page
7. [ ] Remove ghost components: `ScopeSelectorModal.tsx`, `ProjectsPage.tsx`, `ProjectExplorerSidebar.tsx`

**Files to Modify:**
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx`
- `src/frontend/src/lib/section-nav.ts`
- `src/frontend/src/components/command-palette.tsx`
- `src/frontend/src/App.tsx` (verify all routes registered)
- `src/frontend/src/views/*.tsx` (verify all referenced views exist)

**Acceptance Criteria:**
- [ ] Every sidebar item clickable and navigates to working page
- [ ] All dropdowns expand/collapse correctly
- [ ] Dual registration present for all nav items (section-nav + HierarchySidebar)
- [ ] Command Palette finds all routes
- [ ] No 404s from sidebar navigation
- [ ] `vitest` passes for sidebar tests

---

### S9: Navbar → Tab Strip Replacement

**Objective:** Replace top navbar with browser-style tab strip (pinned tabs, close, routing integration).

**Tasks:**
1. [ ] Design tab state model: open tabs, active tab, pinned tabs (persist in localStorage)
2. [ ] Build `TabStrip.tsx` component (UI: tabs, pin/unpin, close, drag reorder)
3. [ ] Integrate routing: sidebar click → open/focus tab, URL sync
4. [ ] Remove `Navbar()` from `App.tsx`, keep slim global bar (user menu, command palette, notifications)
5. [ ] Handle deep links/bookmarks: restore tabs from URL on load
6. [ ] Migrate existing navbar-only routes to tab strip
7. [ ] Tests + i18n + operator live review

**Files to Create/Modify:**
- `src/frontend/src/components/tab-strip/TabStrip.tsx` (new)
- `src/frontend/src/components/tab-strip/TabItem.tsx` (new)
- `src/frontend/src/hooks/useTabStrip.ts` (new)
- `src/frontend/src/App.tsx` (replace Navbar, add TabStrip)
- `src/frontend/src/lib/section-nav.ts` (remove navbar-specific logic)
- `src/frontend/src/i18n/locales/*.json` (tab.* keys)

**Acceptance Criteria:**
- [ ] Tab strip shows open tabs, pinned tabs persist across reload
- [ ] Sidebar navigation opens new tab or focuses existing
- [ ] Pin/unpin/close work correctly
- [ ] Global bar shows user menu, command palette, notifications
- [ ] Deep links restore correct tab state
- [ ] `npm run lint` clean on new files

---

### S10: File Editor + Container Filebrowser

**Objective:** VS Code sidebar integration for container files, S3 rename API, container filebrowser tab.

**Tasks:**
1. [ ] Build `GET /api/projects/{id}/container/files` → list `/workspace` via container exec or S3
2. [ ] Build `POST /api/s3/rename` → Copy + Delete (S3/MinIO/Ozone)
3. [ ] Create `ContainerFilesTab.tsx` in sidebar (new ViewContainer in `section-nav.ts`)
4. [ ] Actions: New File, Rename, Delete, Download, Upload
5. [ ] Click file → opens in code-server (utility container proxy)
6. [ ] Wire Git Graph extension (already in utility image)
7. [ ] Shared workspace mount (S3 FUSE or host bind — operator decision)

**Files to Create/Modify:**
- `src/backend/internal/gateway/s3_explore.go` (new — container files API)
- `src/backend/internal/gateway/s3_rename.go` (new — rename API)
- `src/backend/internal/deploy/container_files.go` (new — exec ls/read/write)
- `src/frontend/src/components/sidebar/ContainerFilesTab.tsx` (new)
- `src/frontend/src/lib/section-nav.ts` (Container Files entry)
- `src/frontend/src/views/ProjectDetailPage.tsx` (integrate tab)

**Acceptance Criteria:**
- [ ] Sidebar "Container Files" tab shows `/workspace` tree
- [ ] Rename uses `POST /api/s3/rename` (Copy+Delete atomic)
- [ ] Click file opens in code-server via utility proxy
- [ ] Git Graph extension visible in code-server
- [ ] S3/MinIO/Ozone backend works for file ops

---

### S11: SilverBullet Notes + n8n Workflows

**Objective:** Complete SilverBullet and n8n integration in utility container, trigger on project create.

**Tasks:**
1. [ ] Verify SilverBullet persists notes to `/workspace/notes` (survives container restart)
2. [ ] Verify n8n persists workflows to `/home/coder/.n8n` (survives restart)
3. [ ] Generate n8n encryption key per container (persisted in volume)
4. [ ] Onboarding integration: Project Create → Utility Container Deploy (Ansible)
5. [ ] Optional Git repo init at project create (operator choice)
6. [ ] Optional n8n enable at project create
6. [ ] Frontend: Notes link in Utility tab → opens SilverBullet via proxy
7. [ ] Frontend: Workflows link in Utility tab → opens n8n via proxy

**Files to Modify:**
- `deploy/utility-container/ansible-task.yml` (project create hook)
- `src/backend/internal/gateway/project_utility.go` (launch utility container)
- `src/frontend/src/components/projects/UtilityTab.tsx` (add SilverBullet/n8n links)
- `src/frontend/src/i18n/locales/*.json` (silverbullet.*, n8n.* keys)

**Acceptance Criteria:**
- [ ] Create project → utility container deployed automatically
- [ ] SilverBullet: create note → restart container → note persists
- [ ] n8n: create workflow → restart container → workflow persists
- [ ] n8n encryption key generated per container, persisted in volume
- [ ] Utility tab links open SilverBullet (port 3000) and n8n (port 5678) via proxy

---

### S12: Cloudflare Workers / Serverless Workers

**Objective:** Generic serverless worker provider abstraction (Cloudflare Workers, AWS Lambda, GCP Cloud Run).

**Tasks:**
1. [ ] Create worker provider abstraction (not Cloudflare-exclusive)
2. [ ] Implement Cloudflare Workers provider: credentials, quotas, defaults
3. [ ] Implement AWS Lambda provider (stub)
4. [ ] Implement GCP Cloud Run provider (stub)
5. [ ] Build `WorkersDashboardPage.tsx` (already exists — enhance)
6. [ ] Build `CloudProviderConfigPage.tsx` (credentials, quotas, defaults config)
7. [ ] Wire into AI section sidebar (Workers/Serverless honest empty state → real when configured)
8. [ ] Research doc: `docs/research-cloudflare-workers.md` (reference)

**Files to Create/Modify:**
- `src/backend/internal/workers/provider.go` (new — interface)
- `src/backend/internal/workers/cloudflare.go` (new)
- `src/backend/internal/workers/aws_lambda.go` (new)
- `src/backend/internal/workers/gcp_cloudrun.go` (new)
- `src/backend/internal/gateway/workers.go` (new — API routes)
- `src/frontend/src/views/WorkersDashboardPage.tsx` (enhance)
- `src/frontend/src/views/CloudProviderConfigPage.tsx` (enhance)
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (wire Workers section)
- `src/frontend/src/i18n/locales/*.json` (workers.* keys)

**Acceptance Criteria:**
- [ ] Workers Dashboard shows configured providers (Cloudflare/AWS/GCP)
- [ ] CloudProviderConfigPage manages credentials, quotas, defaults
- [ ] AI section sidebar shows real providers when configured (not empty state)
- [ ] Credentials stored in Vault (never plaintext)
- [ ] `make go-test` passes for worker providers

---

### S13: Email Notifications System

**Objective:** Complete email notification system with SMTP channel and threat-correlation trigger.

**Tasks:**
1. [ ] Verify notification abstraction (`internal/notify/notify.go`) — Channel interface, Dispatcher
2. [ ] Verify SMTP channel (`internal/notify/smtp.go`) — stdlib net/smtp, env config
3. [ ] Verify threat-correlation trigger (`threat_correlation.go` → `notifyThreatCorrelations`)
4. [ ] Add 30-min dedup cache per correlation pair
5. [ ] Add `GET /api/notifications/email/status` endpoint
6. [ ] Complete `EmailNotificationsPage.tsx` (/security/email) — read-only status
7. [ ] Add sidebar nav entry (next to Secrets) — DONE in S152, verify reachable
8. [ ] Add `.env.example` SMTP_* variables
9. [ ] Add section-nav.ts + command-palette.tsx entries (RM35 dual pattern)

**Files to Modify:**
- `src/backend/internal/notify/notify.go` (verify)
- `src/backend/internal/notify/smtp.go` (verify)
- `src/backend/internal/gateway/notifications.go` (verify)
- `src/backend/internal/gateway/threat_correlation.go` (verify trigger)
- `src/frontend/src/views/EmailNotificationsPage.tsx` (verify)
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (verify nav entry)
- `src/frontend/src/lib/section-nav.ts` (add entry)
- `src/frontend/src/components/command-palette.tsx` (add entry)
- `.env.example` (add SMTP_* vars)

**Acceptance Criteria:**
- [ ] SMTP channel sends email when configured
- [ ] Threat correlation triggers email (deduped 30 min)
- [ ] Email page shows config status (host/port/from/to, no password)
- [ ] Sidebar + Command Palette + Top Nav (if applicable) reachable
- [ ] `check:i18n` passes for email keys

---

### S14: Vault Secret Hardening + Access Matrix

**Objective:** Project-scoped secrets, membership checks, audit log, vault access matrix UI.

**Tasks:**
1. [ ] Verify `requireVaultScopeFor` with `VaultProjectDenial` gate (S181-10 done)
2. [ ] Enforce project membership for all vault operations (no cross-project read)
3. [ ] Build Vault Access Matrix UI: 3-panel (Subjects | Resources | Policies)
4. [ ] CEL condition editor for policies
5. [ ] Violation highlighting (pulse animation)
6. [ ] Audit trail per binding
7. [ ] Sidebar nav entry: `/vault/access-matrix` (Platform section)
8. [ ] API: `GET/POST/PUT/DELETE /api/vault/access-matrix/*`

**Files to Create/Modify:**
- `src/backend/internal/security/vault.go` (verify project scope enforcement)
- `src/backend/internal/gateway/vault_access_matrix.go` (new — API)
- `src/frontend/src/views/VaultAccessMatrixPage.tsx` (new — `/vault/access-matrix`)
- `src/frontend/src/components/vault/AccessMatrixPanel.tsx` (new — 3-panel)
- `src/frontend/src/components/vault/CELEditor.tsx` (new)
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (add entry)
- `src/frontend/src/lib/section-nav.ts` (add entry)

**Acceptance Criteria:**
- [ ] Cross-project secret read returns 403 (not 200 with stripped config)
- [ ] Vault Access Matrix shows Subjects/Resources/Policies
- [ ] CEL editor validates conditions
- [ ] Violations highlighted with pulse animation
- [ ] Audit trail visible per binding
- [ ] Page reachable via sidebar + section-nav

---

### S15: Agent Integration + SquadMesh

**Objective:** Wire Team Builder → SquadMesh Go → meshsquad-public, implement Stitch designs for agent pages.

**Tasks:**
1. [ ] Build SquadMesh Go binary (`squadmesh/` — make tidy/build/docker-build)
2. [ ] Deploy SquadMesh Go to target node (ports 8080, 8115, 18060)
3. [ ] Add chat + team endpoints to SquadMesh Go `gateway.go`:
   - `GET/POST /chat/channels`
   - `GET/POST /teams`, `POST /teams/{name}/activate`, `DELETE /teams/{name}`
4. [ ] Add CORS to SquadMesh Go for dashboard origin
5. [ ] Update frontend clients: `meshquad-chat.ts`, `meshsquad/api.ts` → point to SquadMesh Go
6. [ ] Implement Stitch designs (priority order):
   - AgentSessionDetailPage (`/sessions/:sessionId`)
   - ToolCallInspectorPage (`/subagents/tool-calls`)
   - TracesPage (from S3)
   - SecurityFindingsPage (`/security/findings`)
   - SubagentApprovalQueuePage (`/subagents/approvals`)
   - ContainerLogsPage (`/containers/:id/logs`)
   - TeamsResourceMatrix (`/teams` matrix tab)
   - VaultAccessMatrix (from S14)
7. [ ] Create meshcore components: MeshCoreConsoleSidebar, TopNavBar, TelemetryChips, ThinkingPill, CodeBlock, LiveToolCallCard, FilterPills, ContextChips, DockedInput
8. [ ] Verify full integration: Team Builder → meshsquad-public → SquadMesh Go → agents

**Files to Create/Modify:**
- `squadmesh/gateway/gateway.go` (add chat/team endpoints + CORS)
- `src/frontend/src/lib/meshsquad-chat.ts` (point to SquadMesh Go)
- `src/frontend/src/lib/meshsquad/api.ts` (point to SquadMesh Go)
- `src/frontend/src/components/meshcore/*.tsx` (9 new components)
- `src/frontend/src/views/AgentSessionDetailPage.tsx` (rewrite)
- `src/frontend/src/views/ToolCallInspectorPage.tsx` (enhance)
- `src/frontend/src/views/SecurityFindingsPage.tsx` (enhance)
- `src/frontend/src/views/SubagentApprovalQueuePage.tsx` (enhance)
- `src/frontend/src/views/ContainerLogsPage.tsx` (new)
- `src/frontend/src/views/TeamsPage.tsx` (add matrix tab)
- `src/frontend/src/views/VaultDashboardPage.tsx` (add access matrix tab)

**Acceptance Criteria:**
- [ ] SquadMesh Go runs, health endpoints respond
- [ ] Team Builder creates team → saves to meshsquad-public
- [ ] Activate team → agents deploy and connect to SquadMesh Go Redis Streams
- [ ] Chat Space shows sub-channels via `/chat/channels`
- [ ] Agent Session Detail shows full Stitch UI (console, telemetry, conversation, tool calls)
- [ ] Tool calls stream live in right panel
- [ ] All Stitch design pages implemented and reachable

---

### S16: RBAC Audit Log + SOC2 Admin Trail

**Objective:** Generic admin_audit_log for all admin mutations, sidebar nav entry.

**Tasks:**
1. [ ] Create `admin_audit_log` table (action, entity, entity_id, actor, timestamp, metadata)
2. [ ] Instrument all `policy.IsAdminMutation` gates to log
3. [ ] Actions: user_create, rbac_grant, deploy, undeploy, provision, vault_write, settings_change
4. [ ] Build AdminAuditLogPage (`/admin/audit-log`)
5. [ ] Sidebar nav entry (Platform section, dual registration)
6. [ ] API: `GET /api/admin/audit-log` with filters

**Files to Create/Modify:**
- `src/backend/internal/policy/admin_audit.go` (new — ClassifyAdminMutation + Log)
- `src/backend/internal/store/admin_audit.go` (new — table + CRUD)
- `src/backend/internal/gateway/admin_audit.go` (new — API)
- `src/frontend/src/views/AdminAuditLogPage.tsx` (new)
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (add entry)
- `src/frontend/src/lib/section-nav.ts` (add entry)

**Acceptance Criteria:**
- [ ] Every admin mutation creates audit log entry
- [ ] Admin Audit Log page shows filterable, paginated entries
- [ ] Page reachable via sidebar + section-nav
- [ ] No plaintext secrets in audit log

---

### S17: Platform Hardening: gVisor + Shared Volumes

**Objective:** Complete gVisor deployment, GPU stack, Ozone permissions, shared volume fixes.

**Tasks:**
1. [ ] Complete gVisor installation on all nodes (`install-gvisor.sh`)
2. [ ] Configure `daemon.json` with `runsc` runtime
3. [ ] Verify all utility containers use `--runtime=runsc`
4. [ ] Fix Ozone datanode volume permissions (init container chown to uid 1000)
5. [ ] GPU stack: NVIDIA container toolkit, GPU-aware scheduling
6. [ ] Shared volume: verify S3 FUSE mount works for utility container workspace
7. [ ] Document all hardening measures in `SECURITY.md`

**Files to Create/Modify:**
- `src/scripts/install-gvisor.sh` (complete)
- `deploy/ozone/docker-compose.yml` (init container for permissions)
- `deploy/utility-container/ansible-task.yml` (verify runsc)
- `docs/SECURITY.md` (hardening documentation)

**Acceptance Criteria:**
- [ ] All nodes have `runsc` runtime configured
- [ ] Utility containers run with `--runtime=runsc`
- [ ] Ozone datanode volumes writable by uid 1000
- [ ] GPU workloads can be scheduled (if GPU nodes exist)
- [ ] Security documentation complete

---

## Execution Order & Critical Path

```
S1 → S2 → S3 (OpenReplay Pipeline)
    ↓
S4 (Auth Foundation) → S5 (Utility + gVisor) → S6 (DNS) → S7 (Deploy)
    ↓
S8 (Sidebar/Reachability) → S9 (Tab Strip) → S10 (File Editor)
    ↓
S11 (SilverBullet/n8n) → S12 (Cloudflare Workers)
    ↓
S13 (Email) → S14 (Vault Matrix) → S15 (Agents/SquadMesh) → S16 (Audit) → S17 (Hardening)
```

**Parallelizable:** S13, S14 can run parallel after S4. S10, S11 can run parallel after S5,S8.

---

## Verification Checklist (Per Sprint)

Every sprint must deliver:
- [ ] `make go-build` / `go build ./...` → RC=0
- [ ] `make go-test` → 0 FAIL
- [ ] `go vet ./...` → RC=0
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → 0 new errors
- [ ] `npx vitest run` → all tests pass
- [ ] `npm run check:i18n` → 60 locales, no new missing keys
- [ ] `npm run lint` → 0 new errors in modified files
- [ ] `API_DOCS.md` updated for all new/changed routes
- [ ] Sprint doc updated with verification commands and actual output
- [ ] Backlog mirror updated (`[x]` done)

---

## Operator Decisions Required

| # | Decision | Sprint | Status |
|---|----------|--------|--------|
| 1 | Workspace mount: S3-FUSE vs Host-Bind | S5/S10 | ⏳ Pending |
| 2 | Claude Code Key injection source | S5 | ⏳ Pending |
| 3 | n8n encryption key: auto-gen (S167 pattern) | S11 | ✅ Decided |
| 4 | Git repo init: always vs on-demand | S11 | ⏳ Pending |
| 5 | Utility container image: local build vs GitHub Actions | S5 | ⏳ Pending |
| 6 | Session retention: 7d/30d/90d | S1 | ⏳ Pending |
| 7 | Sampling rate: 100% errors + 10% normal | S1 | ⏳ Pending |
| 8 | Cross-project sessions: allowed? | S1 | ⏳ Pending (recommend: strict隔离) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OpenReplay resource heavy (4G RAM) | Deploy on dedicated node, monitor |
| gVisor not available on node | S180 WP2 tracks this; fallback to runc with warning |
| Keycloak lightweight token re-enables | `ensureFullAccessTokenClaims()` runs on EVERY redeploy |
| DNS wildcard breaks BIND zone | Guarded template: `if dns_vpn_bind not empty and != 127.0.0.1` |
| Tab strip breaks deep links | Migrate with URL-state restore on load |
| i18n 341 missing keys blocks lint | S181-7: translate in batches, strict gate in CI |

---

## Definition of Done (Global)

A sprint is DONE only when:
1. All acceptance criteria verified with **actual command output** (not "ran and hoped")
2. All tests pass (Go + Frontend)
3. No new lint/TS/i18n errors
4. Documentation synced (`API_DOCS.md`, sprint doc, backlog)
5. Reachable from UI (Mandate 14) — named click path
6. No ghost code — every endpoint has consumer
7. Honest empty states — no fake data (Mandate 2)
8. Secrets never in logs/argv (Mandate 9, 12)

---

*Generated from comprehensive codebase audit. Each sprint references existing sprint docs for implementation details. Execute sequentially, verify each before proceeding.*