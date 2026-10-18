# SPRINT-146 — WAF-Toggle im kanonischen Deploy-Dialog (TASK-057-Reacheability)

**Status:** ✅ VERIFIZIERT GEBAUT (28.9. ~05:26, WAF-Toggle-Build-Agent — targeted vitest 5/5,
Consumer-Suite 33/33, tsc 474 = Baseline, check:i18n PASS 60/3060)

**Auslöser (Operator-Befund, 28.9.):** Das Backend KANN einen WAF deployen —
`POST /api/workspaces/deploy` akzeptiert `waf` (TASK-057, Sprint 31): ein Coraza/Caddy-Sidecar
`jimesh-waf-<nameKey>` joint das Projekt-Docker-Netz, die eingebetteten OWASP-CRS-v4-Regeln
blocken SQLi/XSS (403 vom WAF, nicht von der App); dokumentiert in `API_DOCS.md` (die
deploy-Route) und read-only sichtbar in der WAF-Matrix (`/security/waf-matrix`). ABER: Der
Deploy-Dialog expose KEINEN Toggle — der Operator konnte die vorhandene Capability aus der UI
nicht erreichen (grep-Proof: vor diesem Sprint erwähnte nur ein Kommentar „WAF" in der
Dialog-Datei). Mandat-14-Fall (Reachability ist Teil von Done): Endpoint existiert, Operator
findet ihn nicht.

## Shipped (Workpackages)

- **WP1 [x]** `src/frontend/src/components/workspaces/workspace-deploy-dialogs.tsx` — NUR der
  kanonische Deploy-/Redeploy-Dialog: WAF-Checkbox, default OFF (= Backend-DeployRequest-
  Zero-Value, explizites Opt-in), 1:1 nach der vorhandenen Opt-in-Idiomatik gespiegelt
  (VLAN-Toggle TASK-080: dashed-border-Box + label-gewrappte Checkbox + `pl-6`-Hint).
  Sendet `waf: true|false` im Request-Body; der Stop-/Undeploy-Sweep exkludiert `waf`
  (wie vlan/runtime/tools). Der Hint ist ehrlich und einzeilig: was der Toggle startet —
  WAF-Sidecar (Coraza/Caddy) im Projekt-Docker-Netz, OWASP CRS v4 blockt SQLi/XSS mit 403
  vom WAF (nicht von der App), die Loopback-Port-Freigabe wechselt zum WAF (der
  App-Container published nichts); wie `iacGate` persisted das Backend die Wahl NICHT —
  jeder Deploy re-state sie; Voraussetzung: ein einzelner Workspace-Container mit App-Port.
  KEIN neues Response-Rendering: der Dialog rendert `securityNotes` der Antwort bereits
  (bestehende Idiomatik) — die TASK-057-WAF-Note (`internal/deploy/projects_ssh.go`) erscheint
  unverändert in der Result-View. Deploy UND Redeploy führen den Toggle (beides re-stated die
  Wahl), Stop nicht.
- **WP2 [x]** i18n: 2 neue Keys `workspaces.wafToggle` + `workspaces.wafHint` — en + de
  handgefasst, die anderen 58 Locales via Repo-Standard-Backfill
  (`src/frontend/scripts/backfill-i18n.mjs`, English-Fallback, existing translations nie
  überschrieben).
- **WP3 [x]** Tests: Für den Dialog existierte KEIN Testfile → neues fokussiertes
  `workspace-deploy-dialogs.test.tsx` (5 Tests, jsdom, echte Provider I18nProvider +
  react-query + MemoryRouter, fetch-Stub mit echten Wire-Shapes von
  `GET /api/settings/ssh_endpoints` und `POST /api/workspaces/deploy`):
  1. Toggle rendert mit ehrlicher Beschreibung, default OFF;
  2. unangetasteter Deploy sendet `waf:false` im Body;
  3. Toggle an → `waf:true` im Body, Beschreibung bleibt sichtbar;
  4. die WAF-securityNote der Antwort erscheint in der bestehenden Result-View;
  5. Stop/Undeploy sendet `waf` nie (Sweep-Exklusion, wie vlan/runtime).
- **WP4 [x]** Dokumentation: dieser Sprint-Doc. `API_DOCS.md` unverändert — die Route und der
  `waf`-Contract (inkl. securityNotes-Echo) waren bereits dokumentiert; gefehlt hat nur der
  UI-Zugang.

## Verifikation (gegen den Code, 28.9. ~05:26, alle aus `src/frontend/`)

| Check | Befehl | Ergebnis |
|---|---|---|
| Fokussierter Test | `npx vitest run src/components/workspaces/workspace-deploy-dialogs.test.tsx` | **5/5 grün** |
| Consumer-Suite (Dialog-Imports) | `npx vitest run src/views/WorkspacesPage.test.tsx src/views/WorkspaceDeploymentsPage.test.tsx src/views/WafMatrixPage.test.tsx src/components/workspaces/` | **33/33 grün** (6 Files) |
| tsc-Baseline | `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c 'error TS'` | **474 = Baseline** (Vorher-Messung im selben Tree: 474 → 0 neue, 0 behoben) |
| Full-Suite (Nachtrag ~05:45) | `npx vitest run` (alles) | **394/395 grün, 43 Files** — der EINE Fehler ist pre-existing und nachweislich nicht von diesem Change: `rbac/create-access-section.test.ts:118` (TASK-072, 13.9.) pinned `pendingAccessRef.current = {` als Quelltext-String in `WorkspacesPage.tsx`; der Code (~Z. 299) ist mehrzeilig formatiert, matcht schon am HEAD nicht (HEAD-Blob grep: 0; Test-File md5-identisch mit HEAD; Ziel-Datei git-clean). Außerhalb des File-Scopes → nicht angefasst |
| i18n-Parität | `npm run check:i18n` | **PASS — 60 Locales, 3060 Keys** (3058 + 2 neue; Backfill: 116 Keys über 58 Locales) |
| Backend | — | **nicht angefasst** (kein .go) — die API unterstützt `waf` seit Sprint 31 (TASK-057); Änderung ist rein reachability |

## Reachability-Beweis (Mandat 14)

Klick-Pfad: WorkspacesPage → Workspace-Zeile **[Deploy]** (bzw. WorkspaceSettingsPage →
Redeploy, derselbe Dialog) → Dialog-Checkbox „WAF Sidecar (Coraza + OWASP CRS v4, opt-in)" →
**[Deploy]** sendet `waf:true` an `POST /api/workspaces/deploy` → die Result-View listet die
WAF-securityNote; der laufende Zustand ist read-only in der WAF-Matrix sichtbar
(`/security/waf-matrix`, WAF-Spalte „aktiv" per Coraza-Sidecar-Container-Name).
Mount-Stelle: `WorkspacesPage.tsx:1130` (`<WorkspaceDeployDialog …>`).

## Out of scope (bewusst)

- **Deploy-Trigger-Konsolidierung:** Der zweite/dritte Trigger
  (`WorkspaceDeployAppDialog.tsx`, `BrowserRuntimeModal.tsx`) bekam den Toggle NICHT — die
  Konsolidierung der Dialoge bleibt **SSOT Phase B4**.
- Keine Backend-Änderungen, keine API_DOCS.md-Änderung (Contract existierte bereits).

**Report:** `/home/ji/projects/ihc24/BUILD-2026-09-28-WAF-TOGGLE.md`
