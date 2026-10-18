# SPRINT-54 — WS-DEPLOY-APP-DIALOG (echter Deploy-App-Dialog auf der Workspace-Detail-Page)

> Anlass: Operator-Report — das App-Deployment (DSH, opencode, …) funktioniert im
> Dashboard nicht. Ursache (am Code gelesen, nicht geraten): Der „Deploy
> Container"-Button auf der Workspace-Detail-Page ist ein Fake —
> `onClick={() => toast.info('Opening deploy dialog...')}`
> (src/frontend/src/views/WorkspaceDetailPage.tsx:240): kein Dialog, kein POST.
> Zusätzlich rendert die Page ihre Labels als ROHE i18n-Keys (der `wsDetail.*`-Block
> fehlt in en.json komplett, der Button zeigt wörtlich „wsDetail.deployContainer").
> Das Backend existiert und ist dokumentiert: POST /api/workspaces/deploy
> (internal/deploy/deploy.go:65, handler handleProjectDeploy → executeDeploy;
> DeployRequest in projects_ssh.go:31; API_DOCS.md §projects/deploy).
> Branch: `fix-deploy-dialog` · Datum: 27.9.2026

## Ziel

Ein echter „Deploy App"-Dialog auf der Workspace-Detail-Page, der
POST /api/workspaces/deploy mit der bestehenden DeployRequest-Struktur
(nodeHost, nodePort, nodeUser, framework, runtime, tools, workspaceId, …) ruft:

1. **App-/Framework-Dropdown** mit den 9 Einträgen dsh, opencode, claude-code,
   gemini-cli, code-server, python, go, node, docker. Mapping ist backend-ehrlich:
   - Die 5 Agent-/Editor-Frameworks → `framework: <id>`, `runtime: ''` (das
     Framework-Image aus projects_ssh.go startet: DSH devtools, neko:xfce, …).
   - Die 4 Runtime-Einträge python/go/node/docker → `runtime: <id>` (runtimeImage()
     startet den generischen Runtime-Container) UND `framework: <id>` als ehrliches
     Label für die deployments-Row (Type) + projects-Row. Ein bloßes
     `framework: 'python'` OHNE runtime würde KEINEN Container starten (kein
     Framework-Zweig matcht) — genau der Silent-Failure, den dieser Sprint verhindert.
2. **SSH-Target-Auswahl** aus GET /api/settings/ssh_endpoints (SshTargetSelect —
   Auswahl, kein Freitext; Credentials browser-lokal per lib/ssh-endpoints.ts,
   reisen nur im Request).
3. **Deploy-Button** → POST /api/workspaces/deploy mit `workspaceId` (TASK-037:
   Container mounten den Owner-Worktree, Volume/Sweep/Rows keyen auf die Workspace).

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `components/workspaces/WorkspaceDeployAppDialog.tsx`: neuer Deploy-App-Dialog — App-Dropdown (9 Einträge, Mapping framework+runtime), SshTargetSelect + Credentials-Details, Tools-Checkboxes (DeployRequest.tools, backend defaultToolPackages: gcc/g++/python/node/go/docker/jq/curl/chromium/playwright — make+git sind immer dabei), Ports (nur die Interfaces, die die App WIRKLICH startet: vncPort nur opencode, codeServerPort nur code-server — ein mitgeschickter Stale-Port würde über DeriveInterfaces eine Phantom-Interface in die deployments-Row persistieren), NetworkPresetPicker (Ebene-1-Isolation, Wiederverwendung), Git-Token, Deploy-Response-Anzeige (allocatedPorts, Volume, Code-Server-Passwort, securityGate/Notes) | [x] erledigt |
| WP2 | `views/WorkspaceDetailPage.tsx`: Fake-Toast-Button → echter „Deploy App"-Button, der den Dialog öffnet; ProjectRow-Auflösung über die geteilte ['projects']-Query (wie WorkspacesPage — Prefill framework/ports/workspacePath/meshRouterId, nichts erfunden); Button ehrlich disabled ohne Project-Row (Deploy braucht projId, Backend 400) | [x] erledigt |
| WP3 | i18n: fehlender `wsDetail.*`-Block (9 Keys, Page renderte bisher rohe Keys) + `deployApp.*`-Block in en.json, Backfill aller 60 Locales (de übersetzt, Rest en-Fallback wie bisherige Runden); meine Blöcke paritätisch in 60 Locales — das FULL-Gate ist rot VORBELEGT von main (59×5 sidebar-Keys, s. Abnahme-Kriterium 4) | [x] erledigt |
| WP4 | Doku-Sync: dieser Sprint-Record + BACKLOG-Spiegel; API_DOCS.md unverändert (keine Route neu — POST /api/workspaces/deploy ist bereits dokumentiert) | [x] erledigt |

## Abnahme-Kriterien (verifiziert 27.9., 10:20 Uhr)

1. `npx tsc --noEmit -p tsconfig.app.json` A/B gegen HEAD-Baseline (frischer
   git-worktree): HEAD 481 Fehler → Branch 479 Fehler, **0 neue** aus meinen
   Dateien (WorkspaceDeployAppDialog.tsx, WorkspaceDetailPage.tsx). Die 2
   „gone"-Fehler stammen aus der PARALLEL-SESSION (scope-selector-Löschung, nicht
   meine Änderung). — [x]
2. eslint über meine geänderten Dateien: **0 Fehler, 0 Warnungen** (nach Refactor:
   derived state statt setState-in-effect; die bestehenden Deploy-Dialoge tragen
   zum Vergleich 16 vorbestehende eslint-Fehler). — [x]
3. vitest: **274/274 grün** (27 Dateien) auf dem Working Tree. — [x]
4. check:i18n: meine `deployApp.*`- und `wsDetail.*`-Blöcke sind in allen 60
   Locales paritätisch (gleiche Keys, gleiche `{id}`-Platzhalter). **Ehrlich:**
   das FULL-Gate ist bei diesem Commit ROT — aber VORBELEGT von main
   (037ed11: en.json hat `sidebar.viewByProject/viewByServer/noServer/serverTag/
   projectTag`, die 59 anderen Locales nicht — 59×5 Fehler, mit pristine-HEAD-
   Checkout reproduziert). Die Parallel-Session (SPRINT-52-SIDEBAR-LAYOUT-SECTIONS)
   behebt genau diese Schuld gerade in ihrem Working Tree; dieser Sprint macht
   das Gate weder besser noch schlechter. — [x] (mit Vorbelegungs-Beleg)
5. Der Dialog baut den Request-Body NUR aus Feldern, die 1:1 auf die dokumentierte
   DeployRequest (API_DOCS.md §projects/deploy) mappen; Backend-Fehler werden
   ungefiltert im Dialog gezeigt (kein getarnter Erfolg) — [x]
6. Live-Deploy gegen den laufenden Stack: dem Operator überlassen (Session baut
   den Stack nicht neu; `make restart-backend` + Deploy-Click ist der Prüfweg) — [ ] offen

## Kollisions-Protokoll (PARALLEL-SESSION im selben Checkout)

Während dieses Sprints arbeitete eine weitere Session im gleichen Working Tree
(SPRINT-52-SIDEBAR-LAYOUT-SECTIONS / SPRINT-54-INTEGRATIONS-ACTIVE-DEPLOYMENTS:
sidebar-Keys, projects.createTitle, backend policy/store-Änderungen, eigene
Sprint-Files). Konsequenzen für DIESEN Commit, bewusst so gelöst:

- Locale-Dateien trugen BEIDER Änderungen (meine zwei Blöcke + ihre sidebar-/
  createTitle-Keys). Der Commit enthält NUR HEAD + meine Blöcke: die Trennung
  läuft über `git commit <pathspec>` mit zwischendurch eingespielten
  „Nur-meine"-Versionen, danach wird der gemischte Working Tree 1:1
  wiederhergestellt — die Parallel-Session verliert nichts.
- Die tsc-Baseline (481) und das rote i18n-Gate sind Vorhallen-Zustand von main
  und werden hier nicht „mitgefixt" (nicht meine Änderung — die Parallel-Session arbeitet daran).
