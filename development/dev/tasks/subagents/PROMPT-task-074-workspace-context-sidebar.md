# TASK-074 (REVISED) — Persistent Workspace/App-Context-Sidebar, geteilt über alle Tabs

**Status:** 🔲 offen — SUPERSEDES die frühere vage „Mini-Sidebar"-Version (nicht die alte senden!)

**Operator-UX-Anforderung:** Workspace/App-Kontext wird fast überall als geteilter State
gebraucht (Security-Findings per-Workspace, RBAC per-Workspace, Secrets per-Workspace) —
aber heute baut jede Page ihren eigenen Ad-hoc-Picker (z.B. Security Overview's
Freitext-Target-Filter, TASK-069). Gewollt: eine PERSISTENTE Sidebar (Leobot-Style —
Session-Liste immer sichtbar, kein Dropdown das man jedes Mal wieder öffnen muss) mit
dem Workspace/App-Baum, sichtbar in jedem Tab, backed by EINEM geteilten globalen State.

## Aufgabe

1. **Globaler „current workspace/app"-Context** (React Context, nicht per-Page-State),
   der Routen-Navigation überlebt (URL-Query-Param ODER Top-Level-Provider — wähle,
   dokumentiere warum)
2. **Persistente Sidebar-Komponente** (src/frontend/src/components/layout/workspace-context-sidebar.tsx):
   Workspace/App-Baum, IMMER sichtbar, Selektion updatet den globalen Context
3. **Retrofit (der eigentliche Payoff!):** mindestens Security Overview's Target-Filter
   (TASK-069) + RBAC/Permission-Views lesen aus dem GETEILTEN Context statt eigene
   Picker — nicht nur die Sidebar bauen und alle Pages weiter eigenbröteln lassen
4. **App.tsx:** navGroups um Platform-Gruppe erweitern (E-IA: ROUTE_PLAT) + die
   Sidebar ins Layout einhängen — MINIMAL, HUNK-ISOLIERT (066/069/072 ändern parallel!)
5. **Pattern-Report:** Retrofit auf Workspaces/Vault/DBs straightforward oder Friction?
6. tsc --noEmit, check:i18n (backfill-i18n.mjs), Live-Curl :19090

## Regeln
- Scope: components/layout/**, App.tsx (minimal), Security-Overview-Target-Filter-Block,
  ggf. Admin-RBAC-Views, i18n, Task-File. Kein next build, kein Push, kein -A
- Task-File-Status am Ende
