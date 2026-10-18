# SPRINT-59 — Deploy-Flow-Lücken: Projekt-Löschung, Browser-Integration, Ozone-IaC, services:-Render

**Status:** ✅ VERIFIZIERT GEBAUT (28.9.2026, Subagents; Verifikation dieser Session:
`npm run check:i18n` PASS 60 Locales/3014 Keys; `tsc --noEmit` 477 Fehler = Baseline−1
(0 neue); `vitest run` 364/365 — der eine Failer ist der dokumentierte VORHANDENE
`create-access-section.test.ts`, per `git stash` gegen den unveränderten Stand bewiesen.)

**Auslöser (Operator, 28.9.):** "man kann auch nichts löschen wie projects" /
"wieso ist das so ein komischer button in der sidebar der dann das browser
integration fenster aufmacht aber im integrations tab geht das nicht" /
"wenn man ein project oder workspace deployed wieso kann man nicht gleich
integrations oder plugins dazudeployen".

## Geliefert & verifiziert

- **WP1 [x] Projekt-Löschung erreichbar** (`src/views/ProjectDetailPage.tsx`): der
  echte `DeleteProjectDialog` gegen `DELETE /api/projects/{id}` (Route + API_DOCS-Eintrag
  existierten bereits, nur der UI-Einstieg fehlte; die alte `ProjectsPage` bleibt bewusst
  tot). Best-Effort-Node-Cleanup via `POST /api/workspaces/undeploy` läuft NUR, wenn ein
  passender registrierter SSH-Endpoint mit Secrets existiert — sonst löscht die DB-Row
  ehrlich und der Node-Rest bleibt ungesweept gemeldet (Mandat 2, kein Fake-Cleanup).
  Erreichbar über HierarchySidebar [⚙] → ProjectDetailPage.
- **WP2 [x] Browser-Integration am richtigen Ort**: Modal-Trigger von
  `/workspaces/deployments?browser=1` nach `/plugins?browser=1` verschoben
  (`PluginCatalogPage.tsx` = der echte Integrations-Tab; `WorkspaceDeploymentsPage.tsx`
  verliert den Trigger).
- **WP3 [x] Ozone ins verbindliche IaC-Muster** (`deploy/ozone/`): `ansible-task.yml` +
  `defaults.yml` (Vorlage: tetragon-Compose-Ansatz), `ozone` in
  `deploy/ansible/playbooks/deploy-service.yml` registriert, `.env.example` ohne echte
  Credentials. Erster Deploy-Lauf 28.9. auf trading: scm/om/s3g/recon UP + HTTP-verifiziert;
  Folgebefund (live, 28.9. nachts): Datanode im Restart-Loop (`/data` chmod EPERM, 30+
  Restarts) — **GEFIXT in derselben Nacht**: Root-Cause war Volume-Ownership (Image läuft als
  uid 1000 `hadoop`), Chown auf 1000:1000 → Datanode live UP (Raft-Leader gewählt), Fix als
  idempotente Ansible-Task im `ansible-task.yml` verankert.
- **WP4 [x] `services:`-Render, CLI-Weg** (`src/scripts/render-inventory.py` + `Makefile`):
  emit `.node-services` für `make deploy-all`; `.gitignore` erweitert. Der DASHBOARD-Weg
  ist bewusst NICHT gehackt (Produktions-Backend-Image ist distroless — kein Shell/Docker-CLI/
  Ansible; `docker.sock` erreicht nur den lokalen Daemon; keine Identity-Bridge zwischen
  SSH-Endpoint-Registry und `config.yml`-Node-Namen; Go-Reimplementierung wäre der zweite
  driftende Deploy-Mechanismus, den Mandat 11 verbietet). Bleibt CLI-only bis zur
  Architekturscheidung (z.B. Ansible-Runner-Sidecar).
- **WP5 [x] SURICATA_INTERFACE** (`SPRINT-52`-fail-closed-Gate benutzbar machen):
  dokumentiert in `.env.example` + neuem `deploy/suricata-network-ids/README.md`
  (komplette Deploy-Anleitung); trading-Wert `eth0` (SSH-verifiziert) in `.env` gesetzt,
  Deploy 28.9. angestoßen.

## Bewusst offen (eigene Tickets)

- Deploy-Time-Integrations/Plugin-Picker beim Anlegen eines Projects/Workspace (Operator-Wunsch).
- Dashboard kennt `services:` nicht (s. WP4-Begründung — Architekturscheidung nötig).
- ~~Ozone-Datanode-Permissions-Fix~~ **ERLEDIGT 28.9. nachts**: Volume-Chown 1000:1000 (Image-User `hadoop`), Datanode live UP, Fix idempotent in `deploy/ozone/ansible-task.yml` verankert.
