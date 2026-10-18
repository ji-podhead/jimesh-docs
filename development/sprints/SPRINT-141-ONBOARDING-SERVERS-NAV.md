# SPRINT-141 — Onboarding in die Servers-Sektion der Navigation

**Status:** ✅ VERIFIZIERT GEBAUT (28.9. ~06:15, Build-Agent; Verifikation: sidebar-Suite 41/41,
section-nav 5/5, tsc 477 = Baseline (0 neue), check:i18n PASS 60/3014, Full-Suite 365/366 — der
eine Failer ist der dokumentierte VORHANDENE create-access-section.test.ts, vom Agent 3-fach
bewiesen [disjunkte Input-Dateien; WorkspacesPage byte-identisch zu HEAD; Stash-Reproduktion].)
**Auslöser (Operator, mehrfach):** "was ist onboarding, wieso ist das ein eigener tab und nicht
bei servers mit drinne???"
**Wichtig:** e348871 BEHAUPTETE "Onboarding+Deployments aus Navigation" — war nie ausgeführt
(Diff: nur 2 Sprint-Docs + ein Probe-Test, kein Nav-Code). Dieser Sprint ist die WAHRE Umsetzung.
BACKLOG-Spiegel folgt mit der nächsten Commit-Welle (Fremdedit eines parallel laufenden Agents
in BACKLOG.md liegt gerade uncommittet im Tree — wird nicht mitgerissen).

- **WP1 [x]** section-nav.ts: /onboarding in die Workspaces-Gruppe DIREKT neben "Servers"
  (nav.sshEndpoints) + Aufnahme in PROJECT_BASES (Tab leuchtet im Wizard).
- **WP2 [x]** HierarchySidebar.tsx: aus dem flachen Navigation-Block entfernt (7→6 Links), als
  Link INNERHALB der "ALL SSH TARGETS"-Sektion (Server-Bereich) — in leerer UND gefüllter
  Ansicht; RM35-Dual-Registration-Pattern (beide Nav-Registries).
- **WP3 [x]** Tests: HierarchySidebar.test.tsx (Abwesenheit im Navigation-Block; Position IM
  Servers-Block per DOM-Reihenfolge; Empty-State-Link), section-nav.test.ts (activeSection +
  Adjacency |Δindex|=1).
- **Bewusst unberührt:** /onboarding-Route, Command-Palette p-onboarding, Deployments-Einträge
  (SPRINT-139-Konsolidierung separat), i18n (nav.onboarding existierte in allen 60 Locales).
- **Erreichbarkeit:** Sidebar "ALL SSH TARGETS" → Onboarding · Top-Nav Workspaces-Dropdown →
  Onboarding (direkt über Servers) · Ctrl/⌘K-Palette.
- **Report:** /home/ji/projects/ihc24/BUILD-2026-09-28-ONBOARDING-NAV.md (vorher/nachher-Tabelle).
