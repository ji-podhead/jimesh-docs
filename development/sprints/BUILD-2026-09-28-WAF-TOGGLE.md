# BUILD-2026-09-28 — WAF-Toggle im kanonischen Deploy-Dialog (SPRINT-146 / TASK-057-Reacheability)

**Agent:** WAF-Toggle build agent (jimesh) · **Status: ✅ VERIFIZIERT GEBAUT** (28.9. ~05:26)
**Sprint-Doc:** `docs/sprints/SPRINT-146-WAF-TOGGLE.md` (jimesh)

## Befund (Operator, 28.9.)

POST /api/workspaces/deploy akzeptiert seit Sprint 31 (TASK-057) ein `waf`-Flag: ein
Coraza/Caddy-Sidecar `jimesh-waf-<nameKey>` joint das Projekt-Docker-Netz und frontet den
App-Port (embedded OWASP-CRS v4 blockt SQLi/XSS → 403 vom WAF, nicht von der App; die
Loopback-Port-Freigabe liegt beim WAF, der App-Container published nichts). Dokumentiert in
`API_DOCS.md`, read-only sichtbar in der WAF-Matrix — aber der Deploy-Dialog hatte KEINEN
Toggle: die Capability war aus der UI unerreichbar (Mandat-14-Fall: Endpoint existiert,
Operator findet ihn nicht).

## Was shipped

1. **`src/frontend/src/components/workspaces/workspace-deploy-dialogs.tsx`** (NUR der
   kanonische Dialog — zweiter/dritter Trigger bewusst nicht angefasst, s. Out of scope):
   - `useState(false)` → Checkbox **default OFF** (= Backend-DeployRequest-Zero-Value,
     explizites Opt-in), Idiomatik 1:1 vom VLAN-Toggle (TASK-080) gespiegelt: dashed-border-Box,
     label-gewrappte native Checkbox, `pl-6`-Hint.
   - Request-Body: `waf: true|false` bei deploy UND redeploy (wie `iacGate` persisted das
     Backend die Wahl nicht — jeder Deploy re-state sie); Stop-/Undeploy-Sweep exkludiert
     `waf` wie vlan/runtime/tools.
   - Ehrlicher einzeiliger Hint: WAF-Sidecar (Coraza/Caddy) im Projekt-Docker-Netz, OWASP CRS v4
     blockt SQLi/XSS mit **403 vom WAF, nicht von der App**, Loopback-Port-Freigabe wechselt zum
     WAF (App-Container published nichts), jeder Deploy wiederholt die Wahl, braucht einen
     einzelnen Workspace-Container mit App-Port.
   - **Kein neues Response-Rendering:** Der Dialog rendert `securityNotes` bereits (bestehende
     Idiomatik) — die TASK-057-WAF-Note aus `internal/deploy/projects_ssh.go` erscheint
     unverändert in der Result-View.
2. **i18n:** 2 neue Keys `workspaces.wafToggle` / `workspaces.wafHint` — en+de handgefasst,
   58 weitere Locales über den Repo-Standard-Backfill (`src/frontend/scripts/backfill-i18n.mjs`,
   English-Fallback; bestehende Übersetzungen unangetastet; 116 Keys über 58 Dateien).
3. **Tests:** Für den Dialog existierte kein Testfile → neues fokussiertes
   `src/frontend/src/components/workspaces/workspace-deploy-dialogs.test.tsx` (jsdom, echte
   Provider I18nProvider + react-query + MemoryRouter, fetch-Stub mit echten Wire-Shapes):
   (1) Toggle rendert mit ehrlicher Beschreibung, default OFF · (2) unangetasteter Deploy
   sendet `waf:false` · (3) Toggle an → `waf:true` im Body · (4) WAF-securityNote der Antwort
   erscheint in der bestehenden Result-View · (5) Stop/Undeploy sendet `waf` nie.
4. **Docs:** `docs/sprints/SPRINT-146-WAF-TOGGLE.md` (shipped + Verifikation + Out of scope).

## Verifikation (alle Befehle aus `src/frontend/` ausgeführt, 28.9. ~05:26)

| Check | Befehl | Ergebnis |
|---|---|---|
| Fokussierter Test | `npx vitest run src/components/workspaces/workspace-deploy-dialogs.test.tsx` | **5/5 grün** |
| Consumer-Suite | `npx vitest run src/views/WorkspacesPage.test.tsx src/views/WorkspaceDeploymentsPage.test.tsx src/views/WafMatrixPage.test.tsx src/components/workspaces/` | **33/33 grün (6 Files)** — WorkspacesPage 10/10, WorkspaceDeploymentsPage 3/3, WafMatrixPage 5/5, WorkspaceTerminal 9/9, PluginActivationCard, neuer Dialog-Test 5/5 |
| tsc-Baseline | `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c 'error TS'` | **474 = Baseline** (Vorher-Messung im selben Tree vor den Edits: 474 → 0 neue) |
| i18n-Parität | `npm run check:i18n` | **PASS — 60 Locales, 3060 Keys** (3058 + 2) |
| Full-Suite (Nachtrag ~05:45) | `npx vitest run` (alles) | **394/395 grün, 43 Files** — der EINE Fehler ist PRE-EXISTING und nachweislich nicht von diesem Change: `create-access-section.test.ts:118` (TASK-072, 13.9.) pinned den Quelltext-String `pendingAccessRef.current = {` in `WorkspacesPage.tsx`, der Code (Zeile ~299) ist aber mehrzeilig formatiert → matcht schon am HEAD nicht (grep auf HEAD-Blob: 0 Treffer; Test-File md5-identisch mit HEAD; `WorkspacesPage.tsx` git-clean; passt zur bekannten „Full-Suite 365/366"-Lücke aus SPRINT-141). Datei ist außerhalb meines Scopes → nicht angefasst, hier nur klassifiziert. |
| Backend | — | **kein .go angefasst** — die API unterstützt `waf` seit Sprint 31; keine Backend-Änderung nötig/geplant |

## Reachability-Beweis (Mandat 14)

Klick-Pfad: WorkspacesPage → Workspace-Zeile **[Deploy]** (Mount: `WorkspacesPage.tsx:1130`;
WorkspaceSettingsPage öffnet denselben Dialog im Redeploy-Modus) → Checkbox „WAF Sidecar
(Coraza + OWASP CRS v4, opt-in)" aktivieren → **[Deploy]** → `POST /api/workspaces/deploy`
mit `waf:true` → Result-View listet die WAF-securityNote; Laufend-Zustand read-only in
`/security/waf-matrix` (WAF-Spalte aktiv per Sidecar-Container-Name `jimesh-waf-*`).

## Out of scope (bewusst)

- **Deploy-Trigger-Konsolidierung bleibt SSOT Phase B4** (`WorkspaceDeployAppDialog.tsx`,
  `BrowserRuntimeModal.tsx` bekammen den Toggle NICHT — der Auftrag nennt nur den kanonischen
  Dialog).
- Kein Backend-Touch, keine `API_DOCS.md`-Änderung (Route + `waf`-Contract + securityNotes-Echo
  waren bereits dokumentiert — gefehlt hat nur der UI-Zugang).
- Kein git commit (Standing rule).

## Geänderte Dateien (komplett)

| Datei | Änderung |
|---|---|
| `src/frontend/src/components/workspaces/workspace-deploy-dialogs.tsx` | waf-State, Body-Feld, Sweep-Exklusion, Toggle-UI (4 Edits) |
| `src/frontend/src/components/workspaces/workspace-deploy-dialogs.test.tsx` | NEU — 5 fokussierte Tests |
| `src/frontend/src/i18n/locales/en.json`, `de.json` | +2 Keys (handgefasst) |
| weitere 58 `src/frontend/src/i18n/locales/*.json` | +2 Keys je (Standard-Backfill, English-Fallback) |
| `docs/sprints/SPRINT-146-WAF-TOGGLE.md` | NEU — Sprint-Doc |
