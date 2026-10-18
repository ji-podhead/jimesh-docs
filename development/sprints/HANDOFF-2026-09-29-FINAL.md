# HANDOFF — 2026-09-29, Session endet bei 4% Wochenquota

Leo (Tutario GmbH, lj@saits.ai). Alle Vorgänger-Handoffs (`HANDOFF-2026-09-28-FINAL.md` im selben
Ordner) sind Vorgeschichte — DIESES Dokument ist der aktuelle Stand.

## Läuft noch (2 Agents, bei Sessionende nicht abgewartet)

1. **`a8802df2a8255fd91` — SPRINT-153 Meshsquad-Chat** (24 Min alt). Bauauftrag inkl. Nachtrag:
   echte Threads/Sub-Channels (nicht nur 1 flacher Raum pro Crew), plus ein wählbarer
   "Haupt-Channel"-Modus (Team-spezifisch ODER firmenweiter "Haupt-Tutario-Chat" mit Agents als
   Berater, nicht an eine Crew gebunden). **Prüfen ob dieser Nachtrag wirklich eingebaut wurde,
   nicht nur der ursprüngliche engere Auftrag — der Agent wurde ausdrücklich angewiesen, das
   klar zu vermerken falls es aus Zeitgründen nicht reinpasst.**
2. **`ac0c982ee9c7891dc` — SPRINT-154 Protected/Internal-Projects + Hide-Internal-Setting**
   (21 Min alt, war zwischendurch an einem API-Timeout gescheitert, wurde fortgesetzt).

Bei nächster Session: `docs/sprints/SPRINT-153-MESHSQUAD-CHAT-CHATROOMS.md` und
`docs/sprints/SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md` lesen — Build-Report-Abschnitte sollten
beim Fertigwerden dort automatisch ergänzt worden sein.

## Heute Nacht real fertiggestellt, committed, gepusht (main, Commits `6d99822` bis `2d69bc9`)

- **SPRINT-148 Auth-Hardening**: Passwort-Login standardmäßig AUS (403), nur Keycloak/OIDC
  funktioniert per Default. Rate-Limiting als Fallback (Redis, 5/IP/15min + global 20/15min).
- **SPRINT-147 Falco+Suricata-Threat-Correlation**: echte Korrelation nach Container+Zeitfenster,
  `/security/threat-response`.
- **SPRINT-151 Sidebar-Dashboards+SDK**: echte Backend-Tabelle, `jimesh.dashboards`-SDK
  (spiegelt `secrets`/`logger`), neue Sidebar-Dropdown-Sektion.
- **SPRINT-152 Email/Notifications**: SMTP-Kanal, Threat→Email-Trigger, Email-Tab in Sidebar.
  Bewusst eng gescoped — nur DIESER eine Trigger, Rest offen (S152-5).
- **Sidebar-Regressions-Fix**: die 40 Routen, die Commit `6d99822` versehentlich aus der echten
  Sidebar gelöscht hatte (SIEM/Firewall/SAST/DAST/Dashboards/8×LLM-Proxy/Control-Planes/
  Vault-Dashboard/`/overview` u.a.), sind wiederhergestellt — 5 neue Sidebar-Sektionen spiegeln
  `section-nav.ts` 1:1. Regressions-Test eingebaut, der genau dieses Bug-Muster künftig in CI fängt.
- **Deploy-Routing-Fix**: `make redeploy`/`deploy-all` gingen die ganze Nacht kaputt wegen
  rotierender öffentlicher IP-Allowlist auf trading. Jetzt fest auf den immer-verfügbaren
  Tunnel-Weg (`TRADING_CLIENT_BRIDGE_IP:2222`) umgestellt — sollte künftig NICHT mehr passieren.
- **3 echte Ansible-Bugs in `deploy/keycloak/ansible-task.yml` gefixt** (curl fehlt im Image,
  falsches `become`, Datei-nicht-im-Container-sichtbar) — Keycloak-Redeploy lief danach komplett
  durch.
- **Query-Key-Bug gefixt**: Sidebar zeigte gelöschte/neu-deployte Projekte erst nach manuellem
  Reload — `ProjectDetailPage.tsx`/`ControlPlanesPage.tsx` invalidierten `['projects']`, aber
  die Sidebar liest `queryKeys.projectsList`. Beide Stellen gefixt.
- **"Neuer Workspace zeigt 'keine Workspaces'"-Bug gefixt** — falscher i18n-Key wiederverwendet
  (`sidebar.noWorkspaces` statt eines neuen `sidebar.noAppsInWorkspace`), auf alle 60 Locales
  propagiert.
- **Vault-Root-Token als Klartext-Literal in 2 getrackten Dateien gefunden** (`deploy/vault/
  defaults.yml:11`, `deploy/backend/defaults.yml:33`) — Datei-Fix committed (`25009b0`), ABER: der
  Token bleibt als Fallback-Default im Code, plus **6 weitere Fundstellen unangetastet**
  (`internal/security/vault_client.go:40`, `local-stack.sh:51,88`, 3 Docs). **ROTATION IST NIE
  PASSIERT — steht ganz oben auf die Liste für nächste Session.**
- Alle Sprint-/Audit-Docs von heute Nacht aus dem Session-Scratch-Ordner (`ihc24`) sind jetzt echt
  im Repo unter `docs/sprints/` (waren vorher entweder in `docs_dev/` — komplett gitignored — oder
  gar nicht im Repo).

## Bekannte, unerledigte Dinge — konkret benannt

1. **Vault-Root-Token-Rotation** — höchste Priorität, s.o. Nie ausgeführt.
2. **Git-History-Secret-Scrub/Reset** — Repo ist privat (kein akutes Leck), aber Leo will vor
   jedem Public-Release keine geleakten Secrets in der Historie. Ein Agent hat einen kompletten
   History-Reset (1 Commit, keine alte Historie) vorbereitet, Details in
   `/home/ji/projects/ihc24/GIT-HISTORY-SECRET-SCRUB-2026-09-29.md` — **Force-Push wurde bewusst
   NICHT ausgeführt**, exakte Befehle stehen im Report. `main` ist nur 1 von 64 lokalen/16 Remote-
   Branches — nur `main` wurde angefasst.
3. **SIEM-Indexer (=OpenSearch) deployt nicht** — fehlendes `root-ca.pem`, gen-certs.sh-Schritt
   scheitert. Blockiert `deploy-all` komplett (bricht dort ab, alles danach in der Liste läuft
   nicht mehr automatisch mit).
4. **Falco-gVisor-Integration deployt nicht** — die laufende Falco-Version (0.41.3) exponiert die
   erwarteten `--gvisor-*`-Flags nicht in `falco --help`. Braucht manuelle Prüfung
   (`docker exec jimesh-siem-falco falco --help`) bevor der Ansible-Task angepasst werden kann.
5. **Datalake hat kein echtes IaC-Muster** — nur `docker-compose.yml`+`README.md`, kein
   `ansible-task.yml`/`defaults.yml` (gleicher Fehler wie Ozone vor dem gestrigen Fix).
6. **Ozone-S3-Credentials nie abgeholt** — `docker exec jimesh-ozone-om ozone s3 getsecret`, dann
   in `deploy/ozone/.env` eintragen. Ohne das: "storage provider not configured"-Fehler live
   bestätigt.
7. **Projekt-Navigation ist mehrschichtig kaputt** (grad erst gefunden, NICHT gefixt — Kollision
   mit den 2 noch laufenden Agents vermieden):
   - `/projects` ist nur noch ein Redirect zu `/workspaces` (`App.tsx:571`), keine echte Seite.
   - Klick auf den Projektnamen in der Sidebar navigiert NICHT — schaltet nur Scope-Auswahl um.
   - Die echte Projekt-Detailseite (`ProjectDetailPage.tsx`) ist nur über ein fast unsichtbares
     Hover-only-Zahnrad-Icon erreichbar, fälschlich "Settings" beschriftet, UND liegt unter der
     URL `/workspaces/projects/{id}` (Workspaces-Namespace, obwohl Projekt-Inhalt).
8. **Sidebar-IA-Reorg** (Security vs. Observability, Firewall&Threat-Detection als Settings-
   Unterpunkt, eigene Alarms/Events-Section) — Vorschlag von Leo, bewusst zurückgestellt bis die
   parallel laufenden Agents fertig sind, dann als eigener, sauberer Durchgang.
9. **Frisches UIUX-Case-Study/Design-Audit** — von Leo angefordert, bewusst NACH den laufenden
   Agents geplant, damit nicht doppelt gemacht werden muss.
10. **SPRINT-150 (Tab-Leiste statt Navbar) — bewusst NIE gestartet.** Größter Blast-Radius der
    ganzen Redesign-Serie, explizit nur mit Leo live, nicht unbeaufsichtigt.

## Standing Mandate, unverändert gültig

- Nie lokal deployen (lokaler Dev-Stack wurde heute Nacht 12h crash-loopend gefunden und gestoppt
  — niemand aus dieser Session hat ihn gestartet, aber es passiert offenbar trotzdem).
- Firewall-/Zertifikats-Schreibzugriffe auf dem Remote-Server sind für Claude tool-seitig
  geblockt — Operator muss diese Schritte selbst ausführen, exakte Befehle werden gegeben.
- Alles mit Subagents, nicht direkt implementieren.
- Nie aus Doku/Commit-Message schließen, dass etwas fertig ist — immer echten Code/Live-Zustand
  prüfen (heute Nacht mehrfach bestätigt: Commit-Messages waren teils falsch, z.B. `6d99822`s
  Sidebar-Löschung).
- Sicherheits-relevante Endpoints (Login etc.) brauchen von Anfang an Rate-Limiting/Schutz, nie
  als Nachtrag.

## Wo alles liegt

- Alle Sprint-Docs: `jimesh/docs/sprints/` (getrackt) — NICHT `docs_dev/sprints/` (komplett
  gitignored, ~70 alte Dateien liegen da immer noch, strukturelles Alt-Problem, nicht heute
  Nacht entstanden).
- Prompt-Exports (304+ Prompts über mehrere Tage): `/home/ji/projects/ihc24/
  claude_session_prompts_{FULL,PART2,PART3}*.md`.
- Große Audits: `SLOP-AND-UIUX-AUDIT-2026-09-29.md`, `FRONTEND-STATE-MANAGEMENT-AUDIT-2026-09-29.md`,
  `GIT-HISTORY-SECRET-SCRUB-2026-09-29.md`, `WORKTREE-AUDIT-2026-09-28.md` — alle in
  `/home/ji/projects/ihc24/`, die jimesh-relevanten Kopien liegen zusätzlich in `docs/sprints/`.

## Nachtrag 30.9. — kleiner IA-Punkt

- **`/security/exposure` sitzt unter "Firewall & Threat-Detection"** (`section-nav.ts:299`), operator
  findet das gehört eher zu "Observability & Events" (Scan-Tool, kein aktives Firewall/Response).
  Kleiner Nachtrag für die nächste Nav-Iteration, kein Bug.
- **3 Agents liefen bei Sessionende noch:** Security-Reality-Check (eBPF/Wazuh/SIEM/SAST/OPNsense
  gegen Leos konkrete "geht alles nicht"-Behauptungen), Chromium-Plugin-Renderer-Bau (SPRINT-159),
  3-Wochen-Mega-Audit (alle Prompts + echte Dev-Docs, inkl. R45-Löschung-Verlust-Frage). Alle 3
  wurden nach einem Internet-Ausfall per SendMessage fortgesetzt (nicht neu gestartet).

## Nachtrag 2 (30.9. ~07:35, Folge-Session) — S159 gesichert, 16 Doku-Lücken konsolidiert, 6er-Agent-Welle

- **SPRINT-159 gesichert:** Der Chromium-Renderer-Agent war fertig, die Quota starb 30.9. 07:12
  VOR dem Commit. Arbeit uncommitted im Tree aufgefunden, Parent-verifiziert (make go-build/vet
  grün im golang-Container, tsc 471 = exakte Baseline / 0 in S159-Dateien, vitest 57 Dateien /
  464 Tests PASS, check:i18n 60 Locales / 3307 Keys PASS) und committet+gepusht. go test
  geskippt (kein Host-Go, Stack bewusst nicht gestartet). E2E gegen echten Node bleibt offen
  (S159-6) — NICHT als live behauptet.
- **2 ELF-Binaries gelöscht** (src/backend/datalaked, src/backend/threat-responder — go-build-
  Artefakte, waren untracked).
- **16 fehlende jimesh-Doku-Dateien aus ihc24 nach docs/sprints/ konsolidiert** (Standing-Order):
  THREE-WEEK-AUDIT, SECURITY-STACK-REALITY-CHECK, GIT-HISTORY-SECRET-SCRUB, SLOP-AND-UIUX-AUDIT,
  FRONTEND-STATE-MANAGEMENT-AUDIT, POST-COMMIT-VERIFICATION, SIDEBAR-REGRESSION-FIX,
  UIUX-REDESIGN-PROPOSAL, DASHBOARD-LOGIN + 7 BUILD-Reports. GIT-HISTORY-SECRET-SCRUB enthält
  den bekannten Dev-Root-Token als Literal (Repo privat; vom geplanten History-Scrub OP-01
  abgedeckt).
- **Vault-Befund verschärft:** `jm_master_root_token_2026` steht NICHT nur in
  vault_client.go:40 — er ist immer noch Fallback-Default in deploy/vault/defaults.yml UND
  deploy/backend/defaults.yml (ansible lookup default). → S161-Subagent läuft dagegen.
- **6er-Agent-Welle gestartet** (S161 Vault-Hardening, S162 SIEM-Deploy-Blocker, S163
  meshsquad-RM25-Routen, S164 Responsive Shell, S165 AI-Sektion — startet nach S164, S166
  IaC-Tab Mock-Entfernung). Parent verifiziert+committet je Agent.
- **Offene Operator-Fragen (SPRINT-160):** (a) was genau ist mit "leobot2/st2" gemeint — kein
  Repo dieses Namens auf der Platte; (b) Agent-Builder: Deep-Link ins meshsquad-public-Frontend
  oder eigener Builder in jimesh; (c) Health-Check-Registry: node_services auf ALLE Service-
  Typen erweitern oder separate Registry. SPRINT-150 (Tab-Strip) bleibt bewusst live-mit-Operator
  reserviert.
