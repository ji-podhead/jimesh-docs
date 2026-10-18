# Issues to Fix - Next Session

## 1. Container Logs Page - 404 Not Found
**Problem:** `ContainerLogsPage` exists at `/workspaces/containers/:id/logs` but not registered in routes
**Location:** `src/frontend/src/views/ContainerLogsPage.tsx` exists but not in `App.tsx` routes
**Fix:** Add route in App.tsx:
```tsx
<Route path="/workspaces/containers/:id/logs" element={<ContainerLogsPage />} />
```

## 2. File Editor - Broken Popover Modal
**Problem:** File editing uses a popover modal that overlaps, looks bad, poor rendering
**Current:** Uses Popover/Dialog for file editing
**Required:** Proper editor framework with:
- Proper rendering, font, sizing
- Document detection (markdown, code, etc.)
- Markdown rendering
- Syntax highlighting
- Full-screen or panel-based editor (not popover)
**Location:** `src/frontend/src/components/files/FileBrowser.tsx` and related components

## 3. Wazuh Dashboard - Not Integrated via Browser Cache
**Problem:** Wazuh dashboard only opens in new tab, not embedded
**Current:** `SecurityOverviewPage.tsx` has `WazuhDashboardTile` that opens external link
**Required:** Embed via render cache (`/api/render/cache`) or WebView panel
**Options:**
- Add Wazuh as embed target in `JIMESH_EMBED_TARGETS`
- Use `WebviewPanelCard` with Chromium renderer
- Configure `allow_embedding = true` in Wazuh/Grafana config

## 4. Vault Secrets - KVs Not Readable
**Problem:** Vault secrets page exists but KV values cannot be read/managed properly
**Location:** `src/frontend/src/views/VaultDashboardPage.tsx` and `ProjectSecretsPage.tsx`
**Issues:**
- Secret values not displayed (only keys listed)
- No proper secret value viewing/editing UI
- Project overview cannot create secrets
**Required:**
- Add secret value viewing (with copy/reveal toggle)
- Add secret creation from Project Detail page
- Fix API endpoints for secret CRUD

## 4b. Project Overview - Cannot Create Secrets
**Problem:** Project Detail page has no "Create Secret" action
**Location:** `src/frontend/src/views/ProjectDetailPage.tsx`
**Required:** Add secret creation button/action in secrets tab

## 5. Utility Container - SSH Connection Refused
**Error:**
```
SSH Target 127.0.0.1:22
dial tcp 127.0.0.1:22: connect: connection refused
Connecting to workspace container…
project proj-4dc2a06d760e17fd has no running container — deploy first
```
**Problem:** Utility container deployment expects SSH on localhost but container not running
**Location:** `src/backend/internal/deploy/projects_ssh.go` and utility container logic
**Root Cause:** 
- Utility container tries to connect to `127.0.0.1:22` (host SSH) but should connect to container's SSH
- Project has no running container - need to deploy first
**Fix:** 
- Check container status before utility deploy
- Use correct SSH target (container IP, not host)
- Auto-deploy container if not running

## 6. Sidebar Dropdowns - Transparent Background Unreadable
**Problem:** Popover/DropdownMenu in sidebar have transparent/poor contrast backgrounds
**Location:** `src/frontend/src/components/ui/popover.tsx`, `dropdown-menu.tsx`
**CSS Variables:** `--popover` = `--color-surface` (too dark/transparent)
**Fix:** 
- Ensure `bg-popover` has proper opacity/contrast
- Check `text-popover-foreground` visibility
- May need explicit background color override

## 7. Navbar - Wrong Design & Logo
**Problem:** Navbar doesn't match desired design, logo issues
**Current:** `Navbar` in `App.tsx` uses `JimeshMark` (SVG mesh polygon)
**Required:** Complete redesign per user spec
**Location:** `src/frontend/src/App.tsx` (Navbar function), `src/frontend/src/components/brand/jimesh-mark.tsx`

## 8. Suricata Events / Dashboards Missing
**Problem:** No Suricata events visible, no dashboards for IDS
**Location:** `src/frontend/src/views/SecurityEventsPage.tsx`, `SecurityOverviewPage.tsx`
**Required:** 
- Suricata event ingestion/display
- Dashboard integration for IDS alerts

## 9. Missing Logs Route for Projects
**Problem:** `/workspaces/projects/:id/logs` or similar returns 404
**Fix:** Add project-scoped logs route or link to SDK logs with project filter

---

## Documentation Updates Needed

All fixes must be documented in:
- `REPO_STATE.md` - Current repo state
- `NEXT_SESSION_PROMPTS.md` - Handoff for next session
- `docs/` - Any architecture/docs updates

---

## Priority Order

1. **Container Logs 404** - Quick route fix
2. **Utility Container SSH** - Blocking deployment
3. **File Editor** - UX critical
4. **Vault Secrets KV Read/Write** - Core feature
5. **Wazuh Embed** - Security visibility
6. **Sidebar Dropdowns** - UX polish
7. **Navbar/Logo** - Brand/UX
8. **Suricata Integration** - Security feature
9. **Project Logs Route** - Navigation

---

## Files to Modify

| Issue | Files |
|-------|-------|
| Container Logs | `App.tsx`, `ContainerLogsPage.tsx` |
| File Editor | `FileBrowser.tsx`, new editor component |
| Wazuh Embed | `SecurityOverviewPage.tsx`, `WebviewPanelCard.tsx`, deploy config |
| Vault Secrets | `VaultDashboardPage.tsx`, `ProjectSecretsPage.tsx`, `ProjectDetailPage.tsx` |
| Utility Container | `projects_ssh.go`, deploy scripts |
| Sidebar Dropdowns | `popover.tsx`, `dropdown-menu.tsx`, `index.css` |
| Navbar/Logo | `App.tsx`, `jimesh-mark.tsx`, `index.css` |
| Suricata | `SecurityEventsPage.tsx`, `SecurityOverviewPage.tsx` |

---

## Commands to Test

```bash
# Test Container Logs route
curl http://localhost:3000/workspaces/containers/<id>/logs

# Test Vault API
curl http://localhost:3010/api/secrets-engines
curl http://localhost:3010/api/secrets?prefix=projects/<id>/

# Test Utility Container
# Check SSH target resolution in projects_ssh.go

# Check render cache for Wazuh
curl "http://localhost:3010/api/render/cache?url=http://wazuh:5601"
```
