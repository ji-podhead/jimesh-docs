# SPRINT-143 — Workspace-Delete auf den Operator-Flächen

**Status:** ✅ VERIFIZIERT GEBAUT (28.9. ~07:10, Build-Agent; Parent-Verifikation: AppPanelDrawer
12/12, tsc 474 ≤ 477, check:i18n PASS 60/3058)
**Auslöser:** Operator mehrfach: "wieso kann man keine workspaces löschen?" — WAHRER Befund: Delete
existierte seit Sprint-37 auf der WorkspacesPage; gefehlt hat er auf den Flächen, auf denen der
Operator arbeitet (Deployments-Liste, App-Panel-Drawer).

- **WP1 [x]** EINE geteilte Komponente `components/workspaces/WorkspaceDeleteButton.tsx` statt
  Duplikat: DELETE /api/workspaces/{id} (confirm:false), invalidateQueries(['workspaces']) — der
  EINE Cache-Key, der WorkspacesPage + SSOT-Store + Sidebar-Tree füttert; deletedToast + die
  Worktree-bleibt-Notice als toast.info; meta.silenceToast + lokaler onError → GENAU EIN ehrlicher
  403-Toast (workspaces.deleteDenied).
- **WP2 [x]** AppPanelDrawer: Danger-Zone im INFO-Tab (nur wenn das App ein Workspace hat); Drawer
  schließt bei Erfolg; App-Zeile überlebt bewusst (Workspace-Delete löscht KEINE deployment-Rows).
- **WP3 [x]** WorkspaceDeploymentsPage: Zeilen-[Delete workspace] neben [Redeploy] (nur Rows mit
  workspaceId, stopPropagation gegen Row-Navigation) + sichtbare ehrliche Note unter der Tabelle
  (kein FK, keine Kaskade — store.go:337 verifiziert).
- **WP4 [x]** Defect-Fixes am Bestands-Flow: (a) 0 Delete-Tests → 11 neue (WorkspacesPage +3,
  AppPanelDrawer +3, NEU WorkspaceDeploymentsPage.test.tsx ×3, konsolidiert 70/70); (b) die
  weggeworfene DELETE-Notice wird jetzt getoastet (Mandat-2-im-Geiste).
- **WP5 [x]** i18n: 4 Keys en+de, 58 Locales EN-Fallback (Standard-Backfill — durch den Parallel-
  Agent ergänzt, idempotent verifiziert).
- **Report:** /home/ji/projects/ihc24/BUILD-2026-09-28-WS-DELETE.md (168 Z.).
