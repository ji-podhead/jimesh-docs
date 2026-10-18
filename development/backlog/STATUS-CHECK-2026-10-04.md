# STATUS-CHECK 2026-10-04 — Status-Tabelle + OPEN-ITEMS gegen den Code geprüft

**Anlass:** Der Operator übergab eine Status-Tabelle („🔴 Critical / In Progress", „Welle 3",
„Anträge", „Immediate TODOs from OPEN-ITEMS-2026-09-28.md"). Diese Tabelle stammt aus
Dokumenten mit anderem Stand — sie wurde deshalb **nicht** übernommen, sondern **jede Zeile
gegen den Code geprüft** (Mandat 6). Prüfung: 3 parallele Read-Only-Prüfer + eigene Greps,
jede Aussage mit `file:line`.

**Ergebnis in einem Satz (Prüfstand 10:15, Nachträge in §6):** Von 7 roten Sprint-Zeilen sind
**3 erledigt oder saniert** (S173-Nav, S181-Zähler, S184 — inzwischen komplett, siehe §6),
**2 stimmen so** (S170/S174 damals wirklich leer — S170 ist zwischenzeitlich gebaut worden, §6),
**2 sind unvollständig** (S179 nur teils getestet; S180: das checkov-Gate war hier als „fehlend"
notiert, es existiert und hängt in der Makefile, §6); von den 8 „Immediate TODOs" sind
**3 veraltet** (#3, #4, #7), 5 bestätigt.

---

## 1. Rote Zeilen: Behauptung → Befund → Korrektur

| Sprint | Behauptung | Befund (file:line) | Verdikt |
|---|---|---|---|
| **S180** Deploy-Gate + gVisor | checkov Pre-Flight, `install_gvisor` via deploy-all, GPU unter gVisor, lokaler Controller, Secret-Rotation | **checkov Pre-Flight: im Prüfumlauf (10:15) 0 Treffer in der `Makefile` gefunden** — inzwischen nachgewiesen, dass es existiert und verdrahtet ist: `src/scripts/checkov-preflight.sh` (S180-1b), `deploy/ansible-runner/Dockerfile:83` installiert `jq` + `checkov`, zwei Helper `Makefile:297` (`CHECKOV_PREFLIGHT`) und `Makefile:362` (`CHECKOV_PREFLIGHT_REDEPLOY`), aufgerufen an `Makefile:326` (deploy-all, vor den Platform Services) und `Makefile:413` (redeploy). Zusätzlich vorhanden: Scan-Stack `deploy/scan/docker-compose.yml:35` + eigene Policies `deploy/scan/checks/ComposePrivileged.py` und ein **Post**-Deploy-IaC-Gate im Backend `src/backend/internal/deploy/quarantine.go:12`. **`install_gvisor`: damals als „Lücke bestätigt" notiert — inzwischen geschlossen** (`docs/backlog/BACKLOG.md:145` `S180-2` `[x] done`): `-e "install_gvisor=…"` steht jetzt an allen drei Stellen — `Makefile:274` (provision-node), `Makefile:310` (conn=local-Zweig von deploy-all) und `Makefile:320` (Runner-Zweig von deploy-all), der im Prüfumlauf noch als fehlend gegolten hatte. Lokaler Controller: **fertig** (`Makefile:239` `controller-setup`, `Makefile:223` S180 WP8). Secret-Rotation: offen (`S180-16`) | **teilweise — jetzt nur noch 1 offen** (`S180-16`); damals als 3 offen notiert (`S180-1`/`S180-2` sind zwischenzeitlich `[x]`) |
| **S179** conn=local + Deploy-Blocker | deploy-all finish on podhead, `SUPERLEO_CONN=local` real, deploy-record auto-mint | conn=local ist **implementiert und dokumentiert** (`Makefile:34-65`, lokaler Zweig `Makefile:298-305`); `record-deploy` **hängt** an `Makefile:386` + `src/scripts/record-deploy.sh` + `src/scripts/mint-service-key.sh` existieren. Offen: der echte Lauf von podhead (`S179-8`), der echte Host-Lauf (`S179-9`), und `record-deploy` auto-mint schlägt ohne Keycloak `:8081`/Backend `:19091` fehl (`S179-10`) | **stimmt** — 3 Zeilen offen, wie dokumentiert |
| **S173** IA/Scope-Redesign | Nav-Restruktur, Firewall global, Dashboard Builder, Terminal → Projects | **Nav-Umbau gebaut**: 6 Gruppen `AI_BASES`/`PROJECT_BASES`/`INFRA_BASES`/`UTILITY_BASES`/`FIREWALL_BASES`/`DB_BASES` (`src/frontend/src/lib/section-nav.ts:188-292`). **Dashboard Builder gebaut**: `App.tsx:625` → `DashboardBuilderPage`. **Terminal → Projects nicht gebaut**: eigener Kommentar `section-nav.ts:159` („Terminal → PROJECTS, weil es KEINE /terminal-Route gibt") | **„geplant" ist veraltet** → BACKLOG-Zeile auf `[~]` gesetzt, offen: Terminal→Projects + Firewall-global |
| **S171** Onboarding + Presets + Dynamic Sidebar | Wizard 4 Schritte, Jira-Presets, Sidebar-Context-Keys, Onboarding-API | Wizard: **nicht dieser** — `views/OnboardingPage.tsx:23` hat 4 Schritte, aber es ist das **Node-Setup**, nicht der Projekt-Wizard. Presets: **0 Treffer** für `presets.yaml`/`projectPreset` im Backend. Context-Keys: **0 Treffer** für `when`-Expressions in `section-nav.ts`/`HierarchySidebar.tsx`. Onboarding-API: **existiert** (Auto-Provision `gateway/workspaces.go:174`, Tests `workspaces_lifecycle_test.go:470`) | **stimmt (offen)** — nur die Onboarding-API ist schon da; `S171-5` damit teilweise erledigt |
| **S170** Utility Container | Base Image, S3-File-Ops, VS-Code-Sidebar, gVisor | **Damals (10:15) 0 Treffer** für `code-server`/`silverbullet`/`n8n`/`supervisord` in `deploy/` + `src/scripts/`. **Inzwischen gebaut und gepusht** (`deploy/utility-container/{Dockerfile,entrypoint.sh,supervisord.conf,defaults.yml,ansible-task.yml}`, Commits `c374abea..66901c79`, jetzt 58 Treffer auf denselben Begriffen) — Backlog `docs/backlog/BACKLOG.md:110-117`: `S170-1` `[x]`, `S170-2` `[~]`, `S170-3` `[x]`, `S170-4/5/6/8` weiter `[ ]`, `S170-7` offen und **blockiert auf S180 WP2 + S181-12-Nachmessung**. Weiterhin **0 Treffer**: `POST /api/s3/rename`, `GET /api/projects/{id}/container/files`; `--runtime=runsc` im Container-Deploy nicht vorhanden (runsc-Registrierung nur in `deploy/ansible/playbooks/provision-node.yml:160-171`, gehört zu S180) | **nicht mehr „komplett offen"** → halb gebaut, 3 von 8 Zeilen `[x]`/`[~]` |
| **S174** Sessions/Traces/Replay | Propagation-Headers, Kafka-Traces, OpenReplay, Network-Events-UI | **nur 1 von 8 Headern**: `X-JiMesh-Session-Id` wird gesetzt (`internal/auth/auth.go:720,843,921,1133`, gelöscht in `embed.go:184`) und `X-JiMesh-Trace-Id` ausschließlich als **Response**-Header der AI-Proxy-Entscheidung (`internal/ai/proxy.go:445,773`). Kafka-Topics `jimesh.*`: **0 Treffer**. OpenReplay: **0 Treffer**. Network-Events-UI in `TracesPage.tsx`: **0 Treffer**. OTel-Spine nur Phase 1, Phase 2 offen (`internal/oteltrace/oteltrace.go:78` TODO) | **stimmt (offen)** — `S174-1` ist zu 1/8 gebaut, nicht „teilweise fertig" |
| **S182** Terminal + Container Widget | Terminal in Projects (WS), Container Overview Widget | Beides **nicht gebaut**: kein `/workspaces/projects/:id/terminal` in `App.tsx`, `ContainerOverviewWidget`/`ContainerDetailPage` **0 Treffer**. ABER: WP1 (Nav-IA) und WP2 (Dashboard-Builder) sind **fertig** — nur ohne eigene BACKLOG-Zeilen | **WP3/WP4 offen** (jetzt in Arbeit), WP1/WP2 als erledigt nachgetragen |

## 2. Gelbe Zeilen (Welle 3) + Anträge

| Nr | Behauptung | Befund | Verdikt |
|---|---|---|---|
| **S167-P2** | Phase 1 done, Phase 2 open | BACKLOG `S167` (Zeile 265) listet Phase 2 **korrekt** als offen; inzwischen gelandet: Backend-DB-PW `deploy/backend/defaults.yml:38`, Vault `deploy/vault/ansible-task.yml:15`, local-stack `src/scripts/local-stack.sh:44`, SIEM-Key-Mint `Makefile:350`. **Offen: Redis `requirepass` + Backups-Bootstrap + Live-Redeploy** | **stimmt, präziser: 2 von 5 offen** |
| **S178** | Recherche/Entscheidung, 6 Punkte | Sprint-Doc vorhanden, **kein Code** (kein lokaler LLM-Stack, kein Gateway-Policy-JWT, kein `/chat`-Subpage-Build) | **stimmt** — Operator-Punkte offen |
| **S177** | „nur Recherche, kein Code" | `docs/research/PARANOIA-LEVEL-MODEL.md` **liegt vor**; BACKLOG `S177-0` stand trotzdem auf `[ ] offen` — die Recherche ist das, was erledigt ist; die **Entscheidung** ist offen | **Zeile veraltet** → `S177-0` auf `[x]` (Recherche) gesetzt, Entscheidung als `S177-8` (Operator) nachgetragen |
| **S184** | **fertig ✓** | Infra-Faktoren 1–7 stehen auf `[x]`. **Damals (10:15) bestritten:** `ProjectDNSCard.tsx:47/71/86` sollte `GET/POST/DELETE /api/projects/{id}/dns` aufrufen und „diese Route existiert nicht" (`dns.go` fehlt, kein `API_DOCS`-Eintrag). **Inzwischen nachgewiesen falsch:** die Datei `src/backend/internal/gateway/dns.go` existiert (213 Zeilen), die Route hängt in `src/backend/internal/gateway/gateway.go:456-458` als **GET/PUT/DELETE an einem Handler**, und `docs/API_DOCS.md:1263-1265` führt alle drei Methoden. **Korrektur auch am Methodensatz:** die Karte sendet GET/**PUT**/DELETE, nicht GET/POST/DELETE — es gab nie einen Methodenkonflikt. Der Kommentar `ProjectDNSCard.tsx:22` („nothing answers for it yet") bezieht sich laut seiner eigenen Vorzeile auf den **DNS-Namen** (deploy/dns zone), nicht auf die Route. Die Karte liefert nur dann 404, wenn die Projekt-ID unbekannt ist. Verifiziert: `dns_test.go` 11/11 grün, `make go-vet`/`go build` RC=0 | **erledigt** → `S184-8` abgeschlossen (API_DOCS + Backlog-Zeile, Commit `6b7c744d`); Zeile war zwischenzeitlich falsch |
| **S181** | „3 Punkte offen" | BACKLOG: `S181-7`, `S181-12`, `S181-14`, `S181-23` → **4 offene Zeilen**, davon 2 nur teilweise (Frontend-Anteil von 12 erledigt, Teile von 23 erledigt) | **Zähler falsch: 4, nicht 3** |
| **A-1** Client-Hardening | offen, braucht zuerst Headscale-ACLs | Suricata/Tetragon-Rollen existieren (`deploy/suricata-network-ids/`, `deploy/tetragon/`), `policy.mode` ist **deaktiviert** (`deploy/headscale/config.yaml.j2:115` Kommentar) | **stimmt** |
| **A-2** teleport-ersetzen | offen, Sprint-File nötig | **kein Sprint-Doc**; ACL-Routen existieren (`/api/networks/policy` inkl. Audit-Circuit-Breaker), Policy-Modus aus, kein per-User-SSH-Identity-Code | **stimmt** |

## 3. Die 8 „Immediate TODOs" aus `docs/sprints/OPEN-ITEMS-2026-09-28.md`

| # | Behauptung | Befund | Verdikt |
|---|---|---|---|
| 1 | SPRINT-139-Kollision (Branch vs. `bbf6b4e`) | `feat-app-panel` ist strenger Vorfahr von `main` — nichts zu mergen | **widerlegt** (im Dokument bereits korrigiert) |
| 2 | Deploy-Time-Plugin-Picker fehlt | `components/projects/NewProjectDialog.tsx` (256 Zeilen) hat **nur** Server/SSH-Endpoint-Auswahl (`:107,:118,:134`); **0 Treffer** für `plugin`/`service`/`preset` | **bestätigt** → an die 3. Session vergeben |
| 3 | S3/Ozone-File-Browser „komplett fehlend, 0 Treffer" | `components/files/FileBrowserModal.tsx` + `FileBrowserField.tsx` + `FilePathInput.tsx` existieren und hängen am Workspace-Files-API (Tab im `AppPanelDrawer`) | **veraltet — stimmt nicht mehr** |
| 4 | MeshSquad-Chat „nur Backend, UI fehlt" | Route `/chat/space` → `MeshSquadChatSpacePage` (`App.tsx:619`), Nav-Eintrag `section-nav.ts:336` | **veraltet — stimmt nicht mehr** |
| 5 | Playground: reaktivieren oder löschen | `/playground` ist nur noch Redirect nach `/projects` (`App.tsx:846`); `components/playground/{conversation-sidebar,settings-rail}.tsx` haben **0 Importe** | **bestätigt (Entscheidung offen)** — tatsächlich: löschen oder eigene Route bauen |
| 6 | Storage-Tier-Modell, 3 Design-Fragen | **0 Treffer** für ein Storage-Tier-Datenmodell im Backend (nur `free tier`-Quota-Rollup, `settings/ops_endpoints.go:286`) | **bestätigt (Operator)** |
| 7 | **9** tote Komponenten + **5** verwaiste Routen | Nachgezählt am 4.10. **nach** dem Aufräumen: tot = `playground/conversation-sidebar`, `playground/settings-rail`, `mesh/MeshBadge`, `files/FileBrowserField`, `ProviderStatus`, `TierOnboarding` → **6**; `ui/progress`/`ui/separator` hatten **4 bzw. 8 Importe**, der Audit-Zählfehler. Verwaiste Route: nur noch `/agents/sessions/:sessionId` (`App.tsx:642`) → **1** (die anderen 4 haben inzwischen Nav-Einträge: `/overview`:395, `/api-docs`:470, `/security/findings`:498, `/dbs/datalake`:570) | **Zahlen veraltet: 9/5 → 6/1** |
| 8 | DAST „Totalausfall, Neubau" | vorhanden: `deploy/scan/` (README, checks, docker-compose, testdata) = **IaC**-Scanner; **kein** DAST-Runner (`run-dast*` 0 Treffer, kein Makefile-Ziel) | **bestätigt** — DAST ist wirklich nicht da |

**Dokument-Hinweis:** Das Quelldokument der TODO-Liste liegt in `docs_dev/` und ist
**nicht getrackt** (`git ls-files` = 0). Verweise aus getrackten Docs auf `docs_dev/` sind
damit Brechstelle gegen „Alles in `docs/`" — die Verdikte stehen ab hier **in diesem
getrackten File** und in den BACKLOG-Zeilen.

---

## 4. Aufteilung der offenen Arbeit (Stand 4.10.)

| Wer | Sprints | Anmerkung |
|---|---|---|
| **3. Session (Nemotron 550B)** | `S182-WP4` (Container-Routen + Widget + Detail-Page + Drawer-Tab), `S140-9` (DELETE-Route), **neu:** `#2` (Plugin-Picker), optional `S167-P2`-Rest (Redis `requirepass`) | eigener Branch `feat/s182-wp4-containers`, PR ohne Selbst-Merge. ~~`S184-8`~~ **erledigt** (DNS-Backend-Route + API_DOCS, Commits `3d0552f6`/`6b7c744d`) |
| **Diese Session** | `S182-WP3` (Projekt-Terminal), `S174-1` (X-JiMesh-Header) | je eine App.tsx-Zeile; vor Push rebasen |
| **Operator** | `S177-8` (Paranoia-Modell), `S178` (6 Punkte), `#6` Storage-Tier, `A-1`/`A-2`, `S180-9` (CUDA unter gVisor), `S180-16` (Secret-Rotation) | keine Code-Arbeit ohne Entscheidung |
| **Zurückgestellt** | `S181-7` (341 i18n-Keys, Delta in `/tmp/opencode/i18n/en_delta.json`), `S181-12`-Backend-Anteil, `S181-14` (.git-History) | wie vom Operator angeordnet |

## 5. Prüfbefehle (Nachvollziehbarkeit)

```bash
# Navigations-Gruppen / Builder / Terminal-Lücke
grep -n "_BASES = \|^export const .*Items" src/frontend/src/lib/section-nav.ts
grep -n "DashboardBuilderPage\|/playground" src/frontend/src/App.tsx
# gVisor-Durchreichung — Lücke ist ZU (damals 310+ als fehlend notiert)
grep -n "install_gvisor" Makefile                 # 274 (provision-node), 310 (conn=local), 320 (Runner)
# S170 ist zwischenzeitlich gebaut; S171/S174 weiterhin 0 Treffer = ehrlich leer
grep -rIn "code-server\|silverbullet\|n8n\|supervisord" deploy/ src/scripts/ | wc -l   # 58 (deploy/utility-container/)
grep -rn "presets.yaml\|projectPreset" src/backend                                     # 0
grep -rn "jimesh.traces\|openreplay" src/backend deploy                                # 0
# S184-8: die Route EXISTIERT inzwischen (damals als „fehlt“ notiert)
wc -l src/backend/internal/gateway/dns.go                                              # 213 Zeilen
grep -n "/api/projects/{id}/dns" src/backend/internal/gateway/gateway.go               # 456 GET, 457 PUT, 458 DELETE
grep -c "projects/{id}/dns" docs/API_DOCS.md                                           # 3 (Zeilen 1263-1265)
grep -n "method: 'PUT'\|method: 'DELETE'" src/frontend/src/components/projects/ProjectDNSCard.tsx
# tote Komponenten neu gezählt
for f in conversation-sidebar settings-rail MeshBadge FileBrowserField ProviderStatus TierOnboarding; do
  grep -rl "$f" src/frontend/src --include=*.tsx --include=*.ts | wc -l
done
```

---

## 6. Nachtrag — was sich nach dem Prüfstand (10:15) geändert hat

Alle betroffenen Zeilen oben sind **an Ort und Stelle korrigiert**, hier die Änderungsliste mit
Fundstelle, damit der Prüfstand 10:15 rekonstruierbar bleibt.

| Was | Damals (10:15) | Jetzt | Beleg |
|---|---|---|---|
| **S184-8** DNS-Backend-Route | „existiert nicht" → an die 3. Session vergeben | **erledigt**: `src/backend/internal/gateway/dns.go` mit 213 Zeilen, Registrierung `gateway.go:456-458`, `docs/API_DOCS.md:1263-1265`, Tests `dns_test.go` 11/11 grün | Commits `3d0552f6`, `6b7c744d` |
| **Methodensatz** der Karte | „`GET/POST/DELETE`" | **`GET/PUT/DELETE`** — es gab nie einen Methodenkonflikt; die ursprüngliche Methodenangabe war selbst falsch | `ProjectDNSCard.tsx:47/71/86` (PUT bei `:72`) |
| **Zitat** `ProjectDNSCard.tsx:22` | als Zugeständnis „nothing answers for it yet" gewertet, als handle die Route nichts | bezieht sich laut Vorzeile (`:21`) auf den **DNS-Namen** (deploy/dns zone), nicht auf den API-Endpunkt | Vorzeile gelesen |
| **S180-1 / S180-1b** checkov Pre-Flight | „0 Treffer in der Makefile, kein `checkov`-Ziel" | **existiert und verdrahtet**: `src/scripts/checkov-preflight.sh`, `deploy/ansible-runner/Dockerfile:83`, `Makefile:297`/`:362` (Helper), `Makefile:326`/`:413` (Aufruf) | `docs/backlog/BACKLOG.md:143-144` |
| **S180-2** `install_gvisor` | „Lücke bestätigt — Runner-Zweig ab `Makefile:310` nicht" | **geschlossen**: `-e install_gvisor` an `Makefile:274`, `:310` und `:320` | `docs/backlog/BACKLOG.md:145` `[x] done` |
| **S170** Utility Container | „0 Treffer … komplett offen" | **halb gebaut und gepusht**: `deploy/utility-container/` (5 Dateien), 58 Treffer; Backlog `S170-1` `[x]`, `S170-2` `[~]`, `S170-3` `[x]`, Rest offen | Commits `c374abea..66901c79`, `docs/backlog/BACKLOG.md:110-117` |

**Nicht in dieser Tabelle, aber derselbe Befundtyp — Kreuzreferenz:**
`docs/backlog/BACKLOG.md:237` (`S176-7`) nannte weiterhin alle fünf Unterpunkte als
`[ ] offen` (Deploy nach superleo, Preauth-Key, CA-Fetch für Client2, 2. Client live,
Gleichzeitigkeitstest alt+neu). Vier davon sind nachweislich erledigt; die Zeile ist **inzwischen
nachgezogen** (bleibt `[ ] offen`, weil der Gleichzeitigkeitstest offen ist — der Statuszähler
ändert sich dadurch nicht). Nachweis und Einzelstatus stehen in
`docs/sprints/HANDOFF-2026-10-04-SUPERLEO-PROMPTS.md` §2. Der Test ist deshalb nicht
durchführbar, weil der podhead-seitige socat-Forward tot ist (`localhost:8090` ohne Antwort),
nicht weil etwas gescheitert wäre.
