# STITCH-DESIGN-PROMPTS — UI-Design-Prompts für Google Stitch

Tool: https://stitch.withgoogle.com
MCP: https://stitch.googleapis.com/mcp (X-Goog-Api-Key Header)

## Prompt 1: Sidebar + Hierarchy Navigation
```
Design a dark-mode infrastructure management sidebar for "JiMesh" — a container-native platform.
The sidebar has a hierarchical tree:
1. "ALL SSH TARGETS" at the top (bold parent, with a layers icon)
2. Under it: SSH Target nodes (server icon + hostname)
3. Under each target: Projects (folder icon)
4. Under each project: Apps with type icons:
   agent/ide/shell/frontend/backend/database/tool
Each app row shows clickable "Integration" badges: Terminal, Code, VNC, Web.
On hover: a settings gear icon. Active selection highlighted with accent.
Below: "Security" section (collapsible) with Firewall Rules + SIEM Events.
Sidebar is 256px, sticky left, dark theme #0d0e15, violet accent.
```

## Prompt 2: Overview Page with React-Grid
```
Design a dark-mode dashboard overview page using a 12-column responsive grid.
Top strip: Node health (CPU 23%, RAM 6.2/16GB 39%, Disk 45%, Load 0.84).
Grid cards for selected SSH target: Deployed Projects, Running Apps,
Security, Networks, Secrets, IaC Files.
Header: Breadcrumb "All > trading > my-project" with back buttons.
Top-right: layout toggle (grouped/flat) and multi-select "2 targets selected".
Dark theme #0d0e15, cards with subtle borders, 12px grid gap.
```

## Prompt 3: Integrations & Plugins Tab
```
Left panel: "Available Integrations" — cards for Shell, VS Code, VNC Desktop,
DSH Agent, Web Interface. Each with an Install button.
Right panel: "Active Deployments" — container list with:
name, status, app type badge, integration badges, ports,
Docker Hub metadata, actions (Open/Stop/Delete).
Bottom: "Quick Deploy" — framework dropdown + SSH target + Deploy button.
Dark theme, violet primary, destructive red.
```

## Prompt 4: Onboarding Flow (4 Steps)
```
Step 1 Welcome: Hero card "Welcome to JiMesh" with 3 bullets + Start button.
Step 2 Worker Node: SSH form (host/port/user/auth) + gVisor checkbox.
Two buttons: Register + Verify & Provision (shows live SSH log).
Step 3 Firewall: Live NftablesProvider status + 4 provider cards.
Step 4 Deploy: Summary + Open Workspaces + Finish buttons.
Progress: 1-Welcome → 2-Worker Node → 3-Firewall → 4-Deploy.
```

## Prompt 5: Browser-Deployment (KasmWeb vs VNC)
```
Two side-by-side option cards:
Option 1 KasmWeb Chrome (RECOMMENDED): Full Chrome in container,
accessible in browser tab. Image: kasmweb/chrome. 1-2 GB RAM.
Option 2 VNC Desktop: Full desktop via VNC. Image: kasmweb/desktop.
2-4 GB RAM. VNC protocol.
Checkbox: "Also install Playwright for automation".
Info note: "Both run in isolated containers on your SSH target."
Dark theme, violet for recommended option, amber for VNC.
```

## Prompt 6: Scope Selector + Multiauswahl
```
Scope selector in navbar showing hierarchical selection:
"All Targets" dropdown with tree + checkboxes for multi-select.
Selected items show as chips: [trading] [workspace-prod] [project-alpha].
Clear button resets. Indicator: "3 components hidden by scope".
Compact dark theme fitting in navbar.
```