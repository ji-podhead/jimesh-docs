# Offene Punkte — 2026-09-28, alles an einem Ort (ersetzt ältere Handoff-Stände)

## ⚡ STAND-Korrektur 28.9. ~04:00 (neue GLM/DSH-Session) — folgende alte Annahmen sind WIDERLEGT/aktualisiert
- **Punkt 1 (SPRINT-139-Kollision): WIDERLEGT.** `feat-app-panel` ist strikter Vorfahr von main — KEINE Kollision, nichts zu mergen. Deployments-Konsolidierung UNBLOCKIERT. (Beweis: VERIFY-2026-09-28-SIDEBAR-WORKSPACE-SPRINT139-STATE.md)
- **Punkt 26 (Workspace-Delete-UI fehlt): FALSCH.** Delete-UI existiert seit Sprint-37 (WorkspacesPage.tsx:408-418 + 880-888). Echte Lücke: die Deployments-/App-Panel-Oberfläche hat KEINEN Delete → Agent erweitert sie dorthin.
- **Punkt 24 (Onboarding-Nav):** e348871 hat NIEMALS Nav-Code angefasst (nur Docs+Probe-Test). Onboarding saß als flacher Nav-Block-Eintrag (HierarchySidebar.tsx:241), war nie "bei Servers" — Agent baut exakt Leos Vorgabe JETZT.
- **Terminal-Deploy:** Code-seitig ECHT (Workspace-Terminal = Docker-exec-WebSocket /api/workspaces/{id}/terminal, owner-or-admin, kein Host-SSH). Live-Klicktest auf deployedem Workspace steht noch aus.
- **Ozone:** Datanode-Root-Cause gefunden + LIVE GEFIXT (Volume-Ownership chown 1000:1000; war 30+ Restarts, jetzt UP mit Raft-Leader). Fix idempotent in deploy/ozone/ansible-task.yml verankert + committed.
- **SIEM:** Auf trading NIE deployt (0 siem-Container — die 14.9.-Verifikation war LOKAL). Agent E baut die fehlende IaC (deploy/siem hatte keine ansible-task.yml/defaults.yml — IaC-Mandatsverstoß).
- **Grafana:** Auf trading läuft KEIN Grafana, und deploy/grafana/ FEHLT die IaC-Dateien (redeploy stirbt an fehlender defaults.yml — live bewiesen). Agent F baut sie.
- **Suricata: LIVE DEPLOYT + CAPTURT auf trading** (28.9. ~04:30): nach gVisor-apt-Key-Fix (Key war am falschen Pfad gelandet) lief `make redeploy SERVICE=suricata-network-ids NODE=trading` DURCH (ok=19, failed=0). Live: Service active+enabled, Suricata 7.0.3 SYSTEM mode, eve.json füllt sich (173 KB in Minuten — echte Captures). Capability: Kernel 6.8 OK, virtio_net gelistet — ABER Stock-Binary meldet XDP:False → af-packet, KEIN XDP (nur via Source-Rebuild änderbar). OFFEN: (a) eve.json-Ingestion in JiMesh NICHT gebaut (siem-bridge für Suricata = v2-Entscheidung), (b) Operator-Entscheidung: Service in deploy-all registrieren oder weiter bewusst gegated.
- **Message-Bus/Chat/Agent-Builder:** Leben ALLE in meshsquad-public, NICHT in jimesh (jimesh hat 0 davon). (Beweis: VERIFY-2026-09-28-AGENT-BUS-CHAT-BUILDER.md)
- **Phantom-MCP-Routen:** Es sind die BACKEND-MCP-Tools (mcpserver/tools_{linear,github,dsh}.go), die nie registrierte Gateway-Routen rufen → alle 404 im Deploy-Modus. Fix queued (nach den gateway.go-Agents C/D).
- **Meshsquad-Prompts-Audit** läuft über ALLE DREI Prompt-Dateien: claude_session_prompts.md (140 Prompts, Session 24.9.) + FULL (#1-168) + PART2 (#169-304).
- **NEU 04:20 — SSOT-Dedup-Auftrag (Operator):** "ueberall doppelte Components, Alte+Neue gemischt — SSOT fuer ALLES, keine zehnfachen Ausfuehrungen." Read-only SSOT-Audit-Agent laeuft → SSOT-PLAN-2026-09-28-FRONTEND.md (Inventar, Duplikat-Cluster, Dialog-Familien-Merge, geordneter Ausfuehrungsplan). Ausfuehrung NACH den laufenden Build-Agents (WorkspacesPage/section-nav/HierarchySidebar/FileBrowser/PluginCatalog sind in-flight — Kollisionsvermeidung). Bekanntes Beispiel: SPRINT-139-Provision-Dialog (Registry-Prefill) vs. alter Quick-Deploy-Dialog (SSH-Felder) — zwei Dialog-Generationen koexistieren. Mandat 7 kennt bereits src/pages/ als stale Duplicate von src/views/.
## 🎯 PROMPTS-VS-DELIVERY-AUDIT FERTIG (28.9. ~05:00) — PROMPTS-VS-DELIVERY-AUDIT-2026-09-28.md

## 🆕 WAF-UI-GAP + Wellen-Status (~08:30)
- **WAF-Toggle fehlt in der UI (Leos Frage 08:25, bestätigt):** Das Backend KANN es (POST
  /api/workspaces/deploy mit waf:true startet Coraza/Caddy-Sidecar jimesh-waf-<name> mit
  OWASP CRS v4 im Projektnetz; WAF-Matrix-Ansicht /security/waf-matrix zeigt die Ports) — aber
  der kanonische Deploy-Dialog exponiert das Flag NICHT (grep-Beweis: nur 1 Kommentar-Treffer
  in workspace-deploy-dialogs.tsx:445). Build-Agent K dispatched (Toggle im kanonischen Dialog
  + ehrliche States; NICHT in den Zweit-Dialogen — deren Konsolidierung ist SSOT Phase B4).
- **Commits bis hierher:** b642993, 26b675b, 07b51b5, 5fd0f0a, fbb1f3b, d8d25a7, 3181175,
  b4dd808 (S143 WS-Delete-Flächen), 324ac6d (S140 Integrations-ECHT), b03e494 (S60 Suricata-
  Sichtbarkeit auf /networks — Route vom Parent registriert), 3bb26fe (S61 SIEM-IaC).
- **SIEM-DEPLOY #1 läuft** (Core ohne Key: Wazuh+Indexer+Falco live-verifiziert, Bridge stoppt
  by-design + lautes Fail mit Mint-Runbook). Danach: Key server-seitig minten (ohne Print),
  Node-.env ergänzen, Re-Deploy → Bridge grün.
- **Noch laufende Agents:** C (FileBrowser Phase-2), H (Threat-Responder), I (Deploy-Registry),
  J (Workspace-Members), K (WAF-Toggle). **Operator-Wartebefehl 09:00: KEINE neuen Agent-Dispatches,
  bis die laufenden fertig sind.**
- **THREAT-RESPONDER GELIEFERT (1819c9a, ~10:00):** SPRINT-144 WP2-4 committed — 9 Secret-Exfil-Regeln
  + Go-Responder (DETECT default/ENFORCE opt-in: disconnect-all-networks + docker pause) + gated IaC
  mit Live-Probe. Deploy: make redeploy SERVICE=threat-responder NODE=trading (einmal von Hand).
  NEBENFUND: latenter Stat_t.Ino-Bug in internal/siem/falco.go (Feld vs Methode — stiller
  Rotationserkennungs-Killer) — nicht gefixt, außerhalb aller Agent-Scopes, als Ticket notiert.
- **NACHT-WELLE KOMPLETT (~09:45):** Alle Agent-Aufträge geliefert + Parent-committed + deploying:
  S146 WAF-Toggle (8966348), S140-P2 Fusion (8de9a24), Budgets-Crashfix (0823f5b), S145 Members
  (b6609c8), S138 FileBrowser inkl. Sidebar-Files (2d2c225), S142 Deploy-Registry + config-Preset
  (22c16f6). SSH-Lockout-Fund: trading-Allowlist-IP-Rotation (SSH-ACCESS-ROUTES.md Weg 1 = socat
  2222, IMMER verfügbar — Node war nie down, 173 Tage Uptime). SIEM-Indexer-Blocker: unvollständiges
  cert-dir auf trading (gen-certs nötig). Suricata-Regeln: 52.940 aktiv geladen.
- **NÄCHSTE WELLE (Operator-Order 08:55, nach Agent-Wartebefehl):** "waf und filebrowser und den
  ganzen scheiss der da noch fehlt wie secrets usw alles in die sidebar machen" — IA-Order:
  WAF-Zugang (Matrix/Toggle-Fläche), FileBrowser (der Files-Entry aus Cs Phase-2), Secrets/Vault-
  Verwaltung und alle weiteren fehlenden Flächen KONSOLIDIERT in die Navigation. Zu bündeln mit
  G's SSOT-Plan C4 (Nav-Registries) und dem Network-Monitoring-Mislabel — EINE saubere Nav-Welle.
- **KRITISCH 09:00: trading UNERREICHBAR** (SSH public+VPN Timeout, Port 22 zu, Dashboard 000;
  letzte erfolgreiche SSH 03:13 beim Regel-Install). Kandidaten: Wazuh-Indexer-Restart-Sturm
  (3 JVMs) oder ein Falco-eBPF-Vorfall (privileged Container startete 03:10 — Kernel-Panic-Muster
  bei eBPF auf ungeeigneten Hosts bekannt). Operator muss ggf. Provider-Console/Reboot prüfen.
~55 Forderungen aus Leos Prompts: **~24 delivered, ~13 partial, ~15 NIE GEBAUT**. Komplette
47-Zeilen-Tabelle + Top-10-Wiederholte-Forderungen im Report. Neue harte Funde:
- **/api/plugin-installations = No-Persistence-ECHO** (plugins.go:62-80: POST "success", speichert
  NICHTS) — Mandat-2-Verstoß, ROOT CAUSE von "kann keine Integrations installieren". Fix läuft
  (Agent D hat den Input).
- **Guard-Streaming-Gap (P0-Kandidat, queued):** Streaming-Antworten (proxy.go SSE-Branch) passieren
  UNSCANNED; Guard default OFF; kein User-defined-Guard-Rules-Dashboard (0 Treffer).
- meshsquad Redis-Bus-Backend = ehrlicher Stub ("no live Redis to test against").
- e348871 (Sidebar-Fix) = bestätigter FAKE FIX (nur Docs+Probe-Test, nie Nav-Code angefasst).
- **NIE GEBAUT (neu in die Liste):** Deploy-Time-Plugin-Picker, Multi-Select-Endpoint-Audit-Table,
  Vault-UI-Secrets-Rotation, Firebase/Gmail/GDrive-Integration, Widgets, Team-Access-Selection
  (=Punkt 25), Node-Delete (=Punkt 27), SIEM-getriebene IP-Auto-Block, Failover/HA (0 Treffer —
  config.yml sagt weiterhin "exactly one main control plane").
- **ECHT geliefert (über Top-10 hinaus):** SAST v1 (gosec+trivy), SOC2-Admin-Audit-Log, §8-Workspace-
  Lifecycle, AutoGen/MetaGPT-Patterns in agents.py, Sub-Agent-Spawning, eventbus (jimesh:events).
- Korrekturen: AUDIT-2026-09-27-*-Docs liegen in jimesh/docs_dev/, nicht ihc24; Login ops-resolved
  bis auf Headscale-API-Key (noch nicht in der Env).
- Der Suricata-Status im Audit ("IaC built but never deployed") ist inzwischen ÜBERHOLT: Suricata
  läuft LIVE auf trading (af-packet/eth0, s.o.).
- **Audit-Supplement (fertig):** Die dritte Prompt-Datei (claude_session_prompts.md, Session
  d847e251, 24.9.–26.9.) ist VOLLSTÄNDIG von FULL abgedeckt — 3-fach verifiziert (Timestamp-
  Set-Diff leer, identischer Endpunkt #140, identische Truncations) → die 304er-Menge war
  komplett, KEINE neuen Forderungen. Report final bei 354 Zeilen.
- **Network-Monitoring-Verwirrung aufgeklärt (Live-Fund):** Der Nav-Eintrag 'Network Monitoring'
  (HierarchySidebar.tsx:274, labelKey sidebar.networkMonitoring) führt auf /networks = den
  HEADSCALE-MESH-VIEW (TASK-066) — kein IDS, kein Suricata, kein Packet-Monitoring. Die Seite
  wirkt leer, weil (a) ihr Datenmodell der Mesh ist und (b) der Headscale-API-Key nie in die Env
  eingetragen wurde (offener GLM-Punkt, Operator-Schritt). Leos Erwartung ('Netzwerk-Monitoring'
  = IDS-Daten) bedient statt dessen der W1-Agent (echte Suricata-Fläche, läuft). Das Mislabel
  ist ein konkreter Fall für den SSOT-Plan (an Agent G übermittelt).

## 🔴 SECURITY-STACK-INTEGRATION — Ist-Zustand + gequeue-Workpackages (28.9. ~05:15, Leos Nachfrage)
Ehrlicher Ist-Zustand (live geprüft):
- **Suricata:** läuft REAL auf trading (Host-Install via apt, af-packet/eth0, eve.json capturt).
  Deploy war REMOTE via IaC (make redeploy → Ansible/SSH), NICHT lokal. ABER: KEINE
  jimesh-Integration — nichts im Backend liest eve.json (v2 bewusst nie gebaut), KEINE
  Frontend-Fläche. Gleiches "deployed aber nicht integriert"-Muster wie Ozone vorher.
- **Falco:** IaC vorhanden (deploy/falco-gvisor-integration + falco-Service in deploy/siem
  compose), aber KEIN Falco-Container auf trading — nie dort ausgeführt. Live-Befund 28.9.
  ~05:20: runsc-Binary vorhanden (/usr/bin/runsc, Version 0.0~20230807 — ALT, von 2023; ein
  Update wäre vor der falco-gvisor-Integration sinnvoll), /opt/jimesh hat KEIN siem-Staging
  (data/deploy/repo/website only). Docker-Runtimes-Map: [Live-Ausgabe s. Session-Log — runc v2
  bestätigt; runsc-Registrierung präzise prüfen beim W3-Falco-Deploy]. Frontend: nichts.
- **SIEM (Wazuh+Indexer+Bridge):** nie auf trading deployt gewesen; IaC wird gebaut (Agent E).
  Frontend: nur die generische sdk-logs-Fläche + /security/audit-log (RM35) — eine echte
  SIEM-Alerts/Dashboards-Fläche fehlt KOMPLETT (Leo hat recht).
- **Grafana:** IaC wird gebaut (Agent F); die native /embed/{name}-Mechanik (SPRINT-57) ist die
  eine existierende Frontend-Integration-Art im Monitoring-Bereich.

GEQUEUEDE WORKPACKAGES (Ausführung NACH Agent C/D — gateway.go-Kollision vermeiden):
- **W1: Suricata-Integration — IN ARBEIT (Agent gestartet 05:40)** — Backend: ehrlicher SSH-basierter
  eve.json/stats-Reader über die bestehende dialSSH/runSSHCommand-Maschinerie (Muster:
  /api/projects/{id}/ports, SSH-Explore), neue Routen + API_DOCS; Frontend: Network-IDS-Fläche
  mit echten Stats + Recent-Alerts, ehrliche Empty-States wenn der Node kein Suricata hat.
  Kollisionsvermeidung: gateway.go-/Nav-Registrierung kommen als exakte Zeilen in den Report;
  Parent wendet sie nach Agent C an und deployed dann.
- **W2: SIEM-Frontend** — nach dem SIEM-Deploy: SIEM-Status-Fläche (Stack-Up-Status,
  siem-bridge-Rows via /api/sdk/logs type=audit), Wazuh-Alerts-Browsing SERVER-seitig über den
  Indexer (nie Client-zu-Indexer), Falco-Events-Fläche.
- **W3: Falco-Deploy auf trading** — Teil des SIEM-Stack-Deploys (compose --profile siem);
  danach runsc-falco-Runtime-Registrierung via deploy/falco-gvisor-integration verifizieren.
- **W4: Guard-Streaming-Gap** (aus dem Prompts-Audit) — proxy.go SSE-Branch scannt nicht;
- **W5: Realtime-Threat-Protection (Operator-Order 06:00)** — SPRINT-140-File angelegt (getrackt):
  Suricata Secret-Exfil-Regeln (nur Klartext — TLS unsichtbar, SPRINT-19-Lehre; primäre Schichten:
  Guard-Hook [Tetragon-Kill-Policy ee84341], Falco/runsc-falco, Tetragon) + cmd/threat-responder
  (DETECT default / ENFORCE opt-in: docker pause + network disconnect = container-scoped
  'auf 0 routen', Mandat-12-konform) — Bau-Agent H läuft. TETRAGON AUF TRADING DEPLOYED
  (06:15, IaC existierte als Vorlage; Live-Kill-Probe-Ergebnis im Session-Log). Wazuh-Dashboard-
  Embed: nach SIEM-Deploy als JIMESH_EMBED_TARGETS-Eintrag (jimesh-siem-dashboard:5601, iframe-frei).
  Headscale-Fix: Backend-Deploy übergibt HEADSCALE_* jetzt durch (defaults.yml+docker run -e) —
  TASK-078-Warnung auf trading VERSCHWUNDEN nach Redeploy → /networks zeigt jetzt echten Mesh.
- **Secrets-Hygiene (Leos Frage 06:10):** Headscale-Key nur in gitignored .env + Backend-Container-Env
  (Deploy-Konvention wie VAULT_TOKEN/ADMIN_PASSWORD; Vault-Mandat = Agent-FACING Secrets). Alt-
  Duplikat des Keys aus .env ENTFERNT. ECHTER Fund: deploy/backend/defaults.yml trägt den DEV-VAULT-
  ROOT-TOKEN hartcodiert in einer GETRACKTEN Datei → Rotation-Item (GO-PUBLIC-Rotation-P0).
- **W6: DEPLOYMENT-REGISTRY (Operator-Order 06:25: "wieso speichern wir Deploys nicht in der
  DB — dann brauchen wir keine Health-Checks ins Leere")** — SPRINT-142-File angelegt, Bau-Agent I
  läuft: node_services-Tabelle + POST/GET + SSH-Health-Check NUR für Recorded Services +
  CLI-Hook (record-deploy.sh) + Server-Detail-Sektion. Tetragon-Erstrund-Funde: (a) Compose nutzte
  3 --export-rotation-*-Flags, die es in v1.7.1 NICHT gibt → Crash-Loop (gefixt: nur
  --export-file-rotation-interval existiert); (b) tetra-CLI-Checksummen-Pfad-Bug (release/-Präfix,
  gefixt).
- **TETRAGON LIVE-VERIFIZIERT (28.9. ~07:00): Kill-Probe exit 137 (SIGKILL)** — TracingPolicy
  jimesh-guard-kill greift KERNEL-SEITIG auf trading (Daemon running, Kernel 6.8/BTF ok, tetra-CLI
  checksum-geprüft; Kill-Event in /var/log/tetragon/tetragon.log). Ehrliche Grenze dokumentiert:
  runsc/gVisor-Container für Host-eBPF unsichtbar (Hook loggt ebpf_enforcement_missed, lügt nicht).
- **GRAFANA KOMPLETT GRÜN auf trading (28.9. ~07:00):** pg_up=1 + redis_up=1, BEIDE im Prometheus-TSDB
  end-to-end verifiziert; Grafana antwortet auf /embed/grafana/api/health (Sub-Path-Vertrag); null
  veröffentlichte Ports (Mandat 12). Frontend-Einbindung = DashboardsPage → vollständige Navigation
  (kein iframe, SPRINT-57 WP6). Grafana-Admin-Login: JIMESH_GRAFANA_ADMIN_USER/_PASSWORD aus .env
  (Placeholder-Default ändern!).
- **W7: SSOT-PLAN FERTIG (Agent G): /home/ji/projects/ihc24/SSOT-PLAN-2026-09-28-FRONTEND.md** —
  846 Zeilen, 291 Dateien inventarisiert (233 LIVE, 11 DEAD, 3 Zombie, 4 Orphan-Routes).
  Phase A: 13 Dateien/1.356 Zeilen sofort löschbar (+19 .bak-Leichen). Funde u.a.: Fake-Button
  "Trigger Deployment" (ProjectDetailPage:350-357, toast ohne API-Call — Mandat-2-Verstoß, Fix
  B3), 4 Deploy-Trigger für denselben Endpoint, Query-Key-Doppelbuchhaltung. Phase C braucht
  Operator-Entscheidungen (C1 Playground löschen?, C2 ProjectsPage reten?, C4 Nav-Registries,
  C6 Network-Monitoring-Mislabel, C7 provision-Begriff). Ausführung: nach der aktuellen Build-Welle.
- **SPRINT-140-NUMMERNKOLLISION (28.9. 07:15):** TWO uncommittete Sprint-Files tragen Nr. 140 —
  meines (REALTIME-THREAT-PROTECTION, Threat-Responder-Spec) und D's (INTEGRATIONS-INSTALL).
  Lösung bei D's Commit-Welle: eines wird umbenannt (vermutlich meins → 144; H's Brief referenziert
  noch den alten Namen — H bei Commit-Zeit benachrichtigen). D's INTEGRATIONS-INSTALL ist laut
  seinem BACKLOG-Mirror fertig+verifiziert: echter plugin_installations-Store, Persistenz statt
  Echo, Wizard-Keys AES-GCM in vault_secrets (Mandat 9), installable von REAL registrierten Routen
  abgeleitet, jules-Key-Resolution, 388/389 vitest, tsc 474, go build/vet/test PASS.
- **t1-Live-Befund (Operator-Bug-Report 06:50): KEIN Delete passiert** — Row existiert (status
  stopped), Admin-Audit-Log LEER (kein Delete-Versuch erreichte je den Gateway; Operator lief auf
  dem VOR-03:30-Bundle, traf Stop/Undeploy statt Delete). t1 hat 0 blockierende Referenzen →
  echter Delete geht durch. Konzept-Wirrwarr stop/undeploy/delete = SSOT-Punkt C7.
  Guard default OFF; kein User-defined-Guard-Rules-Dashboard.

- **Heute real gelandet (neue Session):** jimesh `b642993` committed+gepusht+**frontend auf trading deployed** (Projekt-Löschung + Browser-Integration auf /plugins JETZT sichtbar); meshsquad `5f3de4c` (Team-Creator-Frontend, davor untracked) + `a227579` (Discord-Rebrand-Fix, 12 passed/3 skipped GRÜN verifiziert); Datanode-Fix; SURICATA-Doku (.env.example + deploy/suricata-network-ids/README.md).

Quelle für Details: die jeweils verlinkte Datei. Dies hier ist nur der Index, damit nichts mehr
verloren geht. Ab jetzt: **jede weitere Umsetzung läuft über Subagents**, nicht direkt.

## Läuft gerade (Subagent aktiv)
- (keiner mehr — die zuletzt gestarteten 3 Agents sind alle fertig, siehe unten)

## Sofort zu erledigen, konkret benannt (Reihenfolge: Master-Doc-Priorität)

> **Verifikation 4.10.** — diese Liste wurde am 4.10. gegen den Code geprüft; die Verdikte
> stehen jetzt direkt bei jedem Punkt, die vollständige Beweisführung in
> `docs/backlog/STATUS-CHECK-2026-10-04.md` (getrackt — dieses File hier liegt in
> `docs/sprints/`, die alt zitierten `docs_dev/*`-Audits sind **nicht getrackt**).

1. ~~**SPRINT-139-Kollision auflösen**~~ **WIDERLEGT (4.10.)** — `feat-app-panel` ist
   strenger Vorfahr von `main`, es gibt nichts zu mergen; Deployments-Konsolidierung unblockiert.
   Zwei Versionen ("Unified App Panel" auf Branch
   `feat-app-panel`, "Workspace-Lifecycle" jetzt committed `bbf6b4e`) — prüfen ob/wie gemergt wird.
2. ~~**Projekt-Löschung erreichbar machen**~~ **ERLEDIGT (28.9., Agent `ac8d844834a8d8822`)** —
   nicht über die tote `ProjectsPage` (bleibt bewusst tot), sondern über die echte, genutzte
   Oberfläche: `HierarchySidebar.tsx` → `[⚙]` → `ProjectDetailPage.tsx`, dort neuer
   "Delete project"-Button → echter `DeleteProjectDialog` → echtes `DELETE /api/projects/{id}`.
3. ~~**Browser-Integration an die richtige Stelle**~~ **ERLEDIGT (28.9., Agent `ac8d844834a8d8822`)**
   — von `/workspaces/deployments?browser=1` nach `/plugins?browser=1` verschoben, Button jetzt in
   `PluginCatalogPage.tsx` (dem echten Integrations-Tab).
4. **Dashboard-Node-Provisioning kennt `services:`-Liste NICHT — bewusst nicht gehackt, blockiert.**
   Agent `ac8d844834a8d8822` hat geprüft und dokumentiert warum: Production-Image ist distroless
   (kein shell/docker-CLI/ansible), `make deploy-all`/Ansible-Runner ist ein reiner
   Operator-Desktop-Flow (lokales `config.yml`/`.env`/SSH-Agent/known_hosts nötig), `docker.sock`
   im Backend-Container erreicht nur den lokalen Daemon, keine Identity-Bridge zwischen
   Dashboard-SSH-Endpoints und `config.yml`-Node-Namen. Eine Go-Reimplementierung jeder
   Ansible-Rolle wäre ein zweiter, driftender Deploy-Mechanismus. Bleibt CLI-only bis eine echte
   Architekturentscheidung fällt (z.B. Ansible-Runner-Sidecar mit SSH-Zugriff).
5. **Deploy-Time-Integrations/Plugin-Picker fehlt** beim Anlegen eines Projects/Workspace.
   **BESTÄTIGT 4.10.** — `components/projects/NewProjectDialog.tsx` (256 Z.) kennt nur
   Server/SSH-Endpoint-Auswahl (`:107/:118/:134`), 0 Treffer für `plugin`/`service`/`preset`.
   → BACKLOG `S140-14`, vergeben an die 3. Session.
6. ~~**Ozone ins richtige IaC-Muster bringen**~~ **ERLEDIGT (28.9., Agent `ac365e36d3377a8bc`)** —
   `deploy/ozone/ansible-task.yml`+`defaults.yml` neu angelegt (Vorbild: `deploy/tetragon/` für
   compose-Ansatz, Mandat-2-Result-Message-Stil von `falco-gvisor-integration`/`ssh-allowlist`),
   `ozone` in `deploy-service.yml` registriert, alle 4 YAMLs `yaml.safe_load`-geprüft. `.env`
   geprüft: **keine echten Credentials drin**, nur `JIMESH_NETWORK=jimesh-net`. Command für später:
   `make redeploy SERVICE=ozone NODE=<name>` — **NICHT ausgeführt**, nur Dateien angelegt.
7. ~~**S3/Ozone-File-Browser-Frontend fehlt komplett**~~ **VERALTET (4.10.)** — die Behauptung
   „0 Treffer für ozone/s3-browser" war ein Namens-Sucher: `components/files/FileBrowserModal.tsx`
   (+ `FileBrowserField`, `FilePathInput`) existieren, hängen am Workspace-Files-API und sind als
   Tab im `AppPanelDrawer` eingebunden. S3-/Ozone-spezifisch ist nur der Backend-Teil aus
   `S170-4/5` (`POST /api/s3/rename`, Container-Files-Route) offen — siehe `S170`.
8. **Chat-Panel für Meshsquad einbetten** — Backend (chat-gateway+tinode) fertig+live-getestet,
   nur UI-Einbettung fehlt.
   **VERALTET (4.10.)** — es gibt Route + Seite + Nav-Eintrag: `/chat/space` →
   `MeshSquadChatSpacePage` (`App.tsx:619`), `section-nav.ts:336`. Offen ist höchstens das
   Einbetten in ein Panel, nicht die UI an sich.
9. **Playground-Subsystem** — Entscheidung nötig: reaktivieren (Code+Tests existieren komplett)
   oder endgültig löschen.
   **BESTÄTIGT 4.10.** — `/playground` ist nur noch ein Redirect nach `/projects`
   (`App.tsx:846`), `components/playground/{conversation-sidebar,settings-rail}.tsx` + 3 Libs
   haben 0 Importe. Empfehlung: löschen (Mandat 14), solange kein Operator eine eigene Route will.
10. **Storage-Tier-Modell entscheiden** (`SPRINT-58`) — Workspace-isoliert/User-shared/
    Project-shared/Datalake-Ozone-Pfade — 3 offene Design-Fragen an Leo.
11. **SPRINT-53/Multi-Node**: Failover-Rolle (`failover_for:`) + Vault-Raft/HA noch nicht gebaut
    (nur das `services:`-Feld ist fertig).
12. **9 tote Frontend-Komponenten + 5 verwaiste Routen** — je einzeln entscheiden: wiring oder
    löschen (`AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md`).
    **NEU GEZÄHLT 4.10.: 6 tote + 1 verwaiste Route** (Zahlen hier sind veraltet — Details in
    `docs/backlog/STATUS-CHECK-2026-10-04.md` §3):
    - **tot (0 Importe):** `playground/conversation-sidebar`, `playground/settings-rail`,
      `mesh/MeshBadge`, `files/FileBrowserField`, `ProviderStatus`, `TierOnboarding`.
      (`ScopeSelectorModal`/`ProjectsPage`/`ProjectExplorerSidebar` sind am 4.10. gelöscht;
      `ui/progress`/`ui/separator` waren **nie** tot — 4 bzw. 8 Importe.)
    - **verwaiste Route:** nur noch `/agents/sessions/:sessionId` (`App.tsx:642`) — die anderen 4
      haben inzwischen Nav-Einträge (`/overview`:395, `/api-docs`:470, `/security/findings`:498,
      `/dbs/datalake`:570).
13. **SIEM/Firewall-Live-Status verifizieren** — läuft der Stack gerade real auf `trading`?
    (`MASTER-WANT-VS-HAVE` Punkt 2/3 — vermutlich Wurzel von "SIEM macht nichts"/"Firewall geht nicht").
14. **DAST bauen** — einziger 100%-bestätigter Totalausfall, kompletter Neubau nötig.
    **BESTÄTIGT 4.10.** — vorhanden ist nur der **IaC**-Scanner `deploy/scan/`
    (README + `checks/` + docker-compose + testdata); für DAST existiert kein Runner
    (`run-dast*` = 0 Treffer, kein Makefile-Ziel). Neubau ist damit weiterhin die Wahrheit.
15. **RM33-Nummer-Kollision** (SurrealDB vs. GLMs Email-Gateway) — noch nicht umbenannt.

## Neu aufgenommen (noch nicht abschließend geklärt, nicht weiter nachgefragt)
16. **"Man kann keine Terminals mehr deployen"** (Operator-Beschwerde) — erster Check zeigt:
    `WorkspaceTerminal`-Komponente ist real in `HierarchySidebar.tsx` importiert und verdrahtet
    (`terminalTarget`-State, `openTerminal()`-Logik, prüft terminal/vnc/code-server-Interfaces).
    Sieht auf den ersten Blick nicht offensichtlich kaputt aus — muss aber noch tatsächlich live
    getestet werden (öffnet sich wirklich ein Terminal beim Klick?), nicht nur der Code gelesen.
    Nicht abschließend geklärt.
17. **Deployments konsolidieren** — explizit vom Operator mehrfach gefordert, hängt an Punkt 1
    (SPRINT-139-Kollision muss zuerst gelöst werden, da die Konsolidierungsarbeit selbst auf dem
    unfertigen `feat-app-panel`-Branch liegt).
18. **"Man kann keine Shell deployen"** (Operator-Beschwerde, neu) — Zusammenhang mit Punkt 16
    (Terminal) unklar, ob dasselbe Problem oder was anderes. Nicht weiter nachgefragt, nur notiert.

## NEU aus dem großen Sprint-Delivery-Review (28.9., Agent `ab49e588dafa555f9`,
   46 Sprint-Dateien geprüft, 9 Testsuiten live nachgefahren, `SPRINT-DELIVERY-REVIEW-2026-09-28.md`)
19. **ECHTE REGRESSION gefunden:** `rm11_schema_metadata_enrichment.md` (jimesh-crew) war als
    "done" markiert — ein `profiles[]`-Metadata-Tag-Layer auf Config-Feldern, explizit als Fix für
    eine frühere, vom Operator selbst gemeldete Regression gebaut. **Im aktuellen `schema.yml`
    gibt es 0 Treffer für `profiles:`.** Wurde vermutlich bei einem späteren Schema-Rewrite wieder
    gelöscht, ohne dass es auffiel. Braucht Entscheidung: neu bauen oder als erledigt abhaken war
    falsch.
20. **Falsche "grün"-Behauptung gefunden:** `rm28_agent_builder...` — der Commit, dessen eigene
    Commit-Message "62 passed, 4 skipped" behauptet, schlägt beim Checkout tatsächlich schon beim
    Test-Collection-Schritt fehl (realer Bug). Das Master-Ledger zitiert zudem den falschen Commit
    für diese Behauptung. Das Feature selbst ist einen Commit später in Ordnung — aber die
    "grün"-Behauptung war zum Zeitpunkt, als sie gemacht wurde, nachweislich falsch.
21. **HANDOFF-2026-09-27 übertreibt** rm32s Router-Wiring als "live-verifiziert", obwohl der
    Sprint-Doc selbst sagt, E2E wurde nie durchlaufen. Reine Dokumentations-Drift, kein Code-Bug.
22. **Team-Creator-Frontend (meshsquad) ist real und funktioniert** — 27/27 Tests, baut sauber,
    gegen die echte Team-Assembly-API verdrahtet — **aber noch nicht in git committed.** Muss noch
    committed werden, sonst geht die Arbeit bei nächstem Neuaufsetzen verloren.
23. Ansonsten: von ~230 geprüften Einzelbehauptungen aus 46 Sprints hielten ~215+ exakt stand,
    inkl. 9 live nachgefahrener Testsuiten (chat-gateway 21/21, message-bus 9/9, bus-integration
    11/11, mandates 13/13, environments 19/19, marketing-agents 123/4, email-gateway 237/4, gateway
    embed 6/6, DashboardsPage 4/4) und einem exakten i18n-Key-Count-Match (2988). Insgesamt: dieser
    Tag war überdurchschnittlich ehrlich dokumentiert.

## Bereits erledigt heute (zur Erinnerung, damit's nicht doppelt gemacht wird)
- `config.yml` + `render-inventory.py` + `Makefile`: `services:`-Feld pro Node (CLI-Weg fertig,
  Dashboard-Weg = Punkt 4 oben, bewusst blockiert dokumentiert).
- Ozone-IaC-Muster (Punkt 6), Projekt-Löschung (Punkt 2), Browser-Integration-Platzierung (Punkt 3)
  — alle 3 heute per Subagent erledigt.
- Provider-Architektur bestätigt: schon nicht-hardcodiert (`ssh` echt, `aws-ec2`/`gcp-ce`/
  `ipam-netbox`/`kubernetes` ehrliche Stubs).
- 4 Memory-Files geschrieben (`/home/ji/.claude/projects/-home-ji-projects-ihc24/memory/`).
- 304 Prompts vollständig exportiert (`claude_session_prompts_FULL_2026-09-28.md` +
  `_PART2_2026-09-28.md`).
- `MASTER-WANT-VS-HAVE-2026-09-28.md`, `CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md`,
  `AUDIT-2026-09-27-{RESEARCH-DOCS,TASK-DOCS,FRONTEND-INTEGRATION-GAPS}-VS-CODE.md`,
  `SPRINT-DELIVERY-REVIEW-2026-09-28.md` — alle fertig.
