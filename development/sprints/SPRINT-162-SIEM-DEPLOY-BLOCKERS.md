# SPRINT-162 — SIEM/Falco Deploy-Blocker (root-ca.pem + gVisor-Flags)

**Status:** ✅ gebaut + lokal validiert. **Live-Befund 30.9. (Operator):**
der Operator ließ `make redeploy SERVICE=siem NODE=trading` selbst laufen —
**der SIEM-Kern läuft LIVE auf trading** (Indexer antwortet auf
https://127.0.0.1:19200/, Manager + Dashboard healthy, Falco hat die
Tripwire-Probe erkannt, ISM-Policy jimesh-siem-retention-30d stored+attached,
ok=32 changed=5). Der Lauf endet nur noch an JIMESH_SIEM_SERVICE_KEY
(siem-bridge, fehlt in /opt/jimesh/deploy/siem/.env auf dem Node) und
JIMESH_DEPLOY_RECORD_KEY — beides Operator-only, ehrliches Fail by design.
Meine eigene Verifikation blieben die LOKALEN Tests unten; der Deploy selbst
wurde von MIR nie ausgeführt (Mandat 6), der Live-Lauf ist der des Operators.

**Auslöser:** HANDOFF-2026-09-29-FINAL.md Punkte 3+4 — "SIEM-Indexer
(=OpenSearch) deployt nicht — fehlendes root-ca.pem, gen-certs.sh-Schritt
scheitert. Blockiert deploy-all komplett" und "Falco-gVisor-Integration
deployt nicht — die laufende Falco-Version (0.41.3) exponiert die
erwarteten --gvisor-*-Flags nicht". deploy-all bricht bei siem ab
(Makefile: `$(MAKE) redeploy SERVICE=$$svc NODE=$$node || exit 1`), alles
danach in `config.yml services: [grafana, siem, tetragon,
falco-gvisor-integration, ozone, suricata-network-ids, datalake]` lief nie
mit.

## Live-Befund-Re-Assessment (30.9., nach dem Operator-Run — die Prüfung BEVOR weiter gebaut wurde)

Der Live-Lauf zeigt: der alte Handoff-Blocker „fehlendes root-ca.pem /
gen-certs.sh scheitert" existiert auf trading aktuell NICHT mehr. Deshalb
wurde BEVOR irgendetwas Neues gebaut wurde, gegen den ORIGINAL-Code
(Commit 65d047c1, der Stand unmittelbar vor dem SPRINT-162-Fix)
reproduziert, ob die Defekte real waren — Ergebnis: **real,
aber BEDINGT (nicht deterministisch)**. Kein Doppel-Fix, kein Dummy-Bau;
die gebaute Härtung schließt genau die nachgewiesenen Löcher:

**Frage 1 — ist der gen-certs/root-ca.pem-Defekt noch real reproduzierbar?**
Alle Repros liefen lokal mit dem EXAKTEN ORIGINAL-Stand des Skripts
(`git show 65d047c1:deploy/siem/gen-certs.sh` — der letzte Commit VOR dem
SPRINT-162-Fix; sha 6c60e96a47b0, 51 Zeilen. Hinweis für spätere Leser:
das geHEAD nach dem Parent-Commit 42908476 enthält bereits die gefixte
Version — Reproduktionen gegen das Original brauchen explizit 65d047c1):

| Repro (OLD script, Original-Stand 65d047c1) | Ergebnis |
|---|---|
| **A: Partial-PKI** (die 4 geprüften Dateien da, wazuh.indexer-key.pem FEHLT) | „✓ Wazuh certificates already present — skipping generation", **rc=0** — der Defekt: der Task läuft weiter, der Stack fällt SPÄTER über das fehlende Zertifikat. Das passt exakt zur Handoff-Formulierung „fehlendes root-ca.pem" (der Indexer, nicht der PKI-Schritt, wurde als Fehlerquelle sichtbar). Nebenbefund, ehrlich: dieser Docker (29.8) toleriert fehlende Single-File-Bind-Quellen noch beim Start (lokal getestet, `docker run -v /nonexistent/x.pem:/x:ro` rc=0) — der Absturz landet dann INNEN im Container (Indexer-TLS-Init), noch weiter weg vom eigentlichen Verursacher. |
| **C: HTTP-Fehlerseite an der pinned URL** (404-Test-URL, gleicher Code-Pfad: `curl -sSL` ohne `-f`) | curl speichert die XML-Fehlerseite **rc=0**, bash stirbt kryptisch: „Syntaxfehler beim unerwarteten Wort »newline« / `<?xml version="1.0"…?>`". Sehr plausibel der ECHTE 29.9.-Pfad: packages.wazuh.com antwortet Fehlerseiten (die 5.x-URLs sind laut Skript-Kommentar seit 8.9. S3-blocked). |
| **D: openssl fehlt auf dem Node** (PATH ohne openssl) | **rc=1 ohne jede Diagnose-Ausgabe**: das ORIGINAL hat keinen Prereq-Check; die Tool-Meldung („OpenSSL not installed.", cert_checkOpenSSL) fließt ins \"> /dev/null" des Skripts (gen-certs.sh:30 ALT); der damals-current Task-Fail-Text nannte als Remediation nur EGRESS — die falsche Spur. Vergleichsprobe gegen die gefixte Version: LAUTES "missing prerequisite 'openssl'" + Remediation, rc=1. |
| **Frischer Node mit voller Umgebung** (dieser Host: openssl 3.4.1, Egress ok) | OLD-Skript läuft DURCH (rc=0, 9/9) — der 29.9.-Blocker war kein deterministischer Bug, sondern einer der drei Zustände A/C/D. Der Live-Lauf heute ist konsistent damit, dass die PKI auf dem Node KOMPLETT vorlag (Staging kopiert den config/-Baum inkl. der 9 lokal vorhandenen, gitignored Certs vom Controller) → 9-File-Check → Skip → Skript lief nie. Welche der Bedingungen 29.9. wirklich zutraf, ist von hier NICHT feststellbar (kein SSH) — ehrlich offen. |

**Frage 2 — ist die Falco-Flag-Frage noch relevant, wo der Live-Falco doch läuft und detektiert?**
Ja, unverändert relevant — der Live-Beweis ist ORTHOGONAL zur Flag-Frage:
- Der Live-falco läuft mit dem BASE-Command (docker-compose.yml:207-222:
  `-r jimesh_rules.yaml` + json/file_output-Optionen, modern_ebpf als
  Image-Default) — **null gvisor-Flags beteiligt** (grep: 0 Treffer). Seine
  Detektion beweist die eBPF-Kette, nichts über die gVisor-Flag-Fläche.
- Re-verify am exakten Live-Binary (falcosecurity/falco:0.41.3, Throwaway):
  `--gvisor-generate-config` ist der EINZIGE gVisor-CLI-Flag;
  `--gvisor-config`/`--gvisor-root` existieren NICHT als Flags (Config-Keys
  `engine.gvisor.config/root`), aber die Engine IST drin (`-o
  engine.kind=gvisor --dry-run` → „…no engine.gvisor.config specified").
- D.h.: DER ALTE Task-Assert (`--gvisor-config`+`--gvisor-root`+`--gvisor-generate-config`
  als Substrings in --help) false-negatived 29.9. auf einer Binary, die
  gVisor KANN — und würde es TODAY wieder tun. Der variant-aware Fix ist
  für `make redeploy SERVICE=falco-gvisor-integration NODE=trading`
  weiterhin ERFORDERLICH; nichts davon ist durch den Live-Lauf erledigt.

**Was der Live-Lauf von MEINEM Code exercised hat (ehrlich):** der Runner
mountet `$(CURDIR)/deploy` = dieser Working Tree; falls der Lauf nach den
Edits heute morgen startete, liefen meine neue ansible-task.yml + gen-certs.sh.
Auf dem gegangenen Pfad („PKI komplett → skip") verhalten sich ALT und NEU
IDENTISCH; die neuen Pfade (Re-Verify bei fehlender PKI, Interplay-Warnung,
loud-Fail-Messages) blieben No-Ops, weil ihre Triggerbedingungen nicht
eintrafen. Ob der Lauf vor oder nach meinen Edits startete, ist von hier
nicht feststellbar — der Live-Lauf ist kein Beweis für die NEUEN Pfade,
nur für den unzerstörten Bestandspfad.

**Zweiter Live-Abbruchpunkt: JIMESH_DEPLOY_RECORD_KEY** — das ist der
Controller-seitige `bash src/scripts/record-deploy.sh`-Aufruf aus der
Makefile-redeploy-Recipe (nach dem Ansible-Lauf). src/scripts/ = FREMD
für diesen Sprint → Handoff-Note an den Parent, kein Fix von mir.

## Plan (vor Code — Documentation Mandate)

**Ziel:** beide Blocker auf Root-Cause-Ebene verstehen und so reparieren,
dass der Operator sie durch `make redeploy` WEGdeployen kann — mit
deterministischer, idempotenter Cert-Generierung (nie ein halb-generierter
Zustand), version-/flag-aware gVisor-Wiring (nie wieder ein False-Negative
auf einer Fähigkeit, die die Binary tatsächlich hat), und LIVE-Verifikation
im Task (Mandat 2: "Container läuft" ist kein Ergebnis).

**Work Packages:**
- **WP1** gen-certs.sh + siem-Ansible-Task: PKI-Schritt lautes Failen bei
  fehlenden Prerequisites (curl, openssl, egress) mit exakter Remediation;
  Vollständigkeits-Check über ALLE 9 gemounteten Cert-Dateien; All-or-
  nothing-Install (kein Halb-PKI, das deploy-all später still bricht);
  Re-Verifikation im Ansible-Task NACH dem Skript-Lauf.
- **WP2** falco-gvisor-integration: 29.9.-Fehlschlag als FALSE NEGATIVE
  aufklären (Falco ≥ 0.38 hat die Flags in Config-Keys verschoben), Task
  variant-aware machen (deploy-time `falco --help`-Probe → legacy_flags /
  config_keys / none, inkl. Substring-Falle), die von SPRINT-52
  nicht-live-verifizierten Engine-Voraussetzungen (runsc-Binary im
  Container, geteilter Socket-Endpoint, RW-Mount, /moby-Root) fixen und
  dokumentieren, LIVE-Verifikation (Socket + Zähl-Probe durch eine echte
  runsc-falco-Sandbox).
- **WP3** Exakte Operator-Befehle (unten) — der Operator deployt.
- **WP4** Lokal laufbare Validierung: bash -n, shellcheck, yaml.safe_load,
  ansible --syntax-check, echte Template-Renders + compose-Config-Merge,
  Logik-Tests der Jinja-Ausdrücke mit echtem Ansible, Cert-Generierungs-
  Matrix in Temp-Dirs. Was nicht lief, ehrlich als nicht gelaufen.

**Acceptance Criteria:**
1. gen-certs.sh: frisch → 9/9 Dateien rc=0; komplett vorhanden → skip;
   partial → VOLLE Regeneration (auch über 0400-Dateien hinweg, CA-konsistent);
   Prereq fehlt → lautes Fail mit Remediation; Install bricht mittendrin →
   Rollback, kein Halb-PKI.
2. siem-Task: gen-certs.rc==0 wird nicht geglaubt — 9-File-Re-Stat und
   Hard-Fail mit exakt fehlenden Pfaden.
3. falco-gvisor-Task: 0.41.3 → variant config_keys (trotz Prosa-Erwähnung
   von --gvisor-config im Help-Text), 0.35.1-Format → legacy_flags,
   gVisor-lose Binary → lautes Fail mit Build-Remediation; pod-init.json
   mit SHARED Endpoint (Equals-Form, validiert); runsc-Binary + RW-Root-
   Mount im Override; LIVE-Nachweis Socket + Zähl-Probe.
4. Keine Verifikations-Baseline verschlechtert (go-build/vet grün, kein
   Frontend-Touch, kein Commit/Deploy/SSH).

## Arbeitslog (Datei:Zeile)

### WP1 — OpenSearch/SIEM-Cert-Defekt

**Root-Cause-Analyse (Skript+Task Zeile für Zeile):**
- `deploy/siem/gen-certs.sh:17-22` (ALT): Idempotenz-Check nur über 4
  Dateien (root-ca.pem, admin.pem, wazuh.manager.pem, wazuh.dashboard.pem)
  — die Compose mountet NEUN (`docker-compose.yml:86-88,125-129,155-157`,
  `.gitignore:2-5` verwirft die Cert-Dirs, sie kommen also NIE aus git).
  Ein Halb-PKI mit den 4 geprüften .pems aber fehlenden -key-Dateien →
  Script "skipping generation" rc=0 → Compose stirbt SPÄTER am
  Bind-Mount ("fehlendes root-ca.pem"-Klasse). Genau der "halb-generierte
  Zustand, der deploy-all später still bricht".
- `gen-certs.sh:15` (ALT): `NEEDED`-Variable definiert und NIE benutzt
  (toter Code, 4 statt 9 Dateien).
- `gen-certs.sh:27` (ALT): `curl -sSL` ohne `-f` — eine HTTP-404/Error-
  Page wird rc=0 als "Tool" gespeichert; `bash wazuh-certs-tool.sh` stirbt
  dann mit kryptischem Syntaxfehler mitten im Lauf.
- Kein Prereq-Check: openssl fehlt auf dem Node? Der wazuh-certs-tool
  scheitert MID-FLIGHT mit "OpenSSL not installed." (`tool: cert_checkOpenSSL,
  Zeilen 26-30`), Ausgabe teils nach /dev/null (`gen-certs.sh:30` ALT),
  statt lautes Failen mit Remediation VOR irgendwas passiert.
- `deploy/siem/ansible-task.yml:101-123` (ALT): Task prüft vor dem Lauf
  alle 9 (`siem_cert_files`), läuft dann gen-certs.sh — und glaubt rc==0.
  Keine Re-Verifikation: das oben beschriebene rc=0-Halb-PKI wäre
  durchgerutscht. Der Fail-Text nennt nur Egress, nicht openssl/curl.

**Fix:**
- `deploy/siem/gen-certs.sh` (REWRITE, 176 Zeilen → jetzt mit 9-File-Check,
  Prereq-Fails, curl -fsSL + Shebang-Sanity, Temp-Dir-Validierung vor
  Install, Rollback-Install, Post-Install-Verifikation — Zeilen-Belege:
  CERT_FILES-Liste :26-39, need() :49-63, Idempotenz :65-77, Warnung
  bei partial :79-88, cleanup/Rollback :90-112, Download -fsSL :113-125,
  Temp-Validierung :135-157, install_file mit rm-f (0400-Overwrite-Fix,
  beim lokalen Test gefunden) :159-170, Post-Install-Check :185-189).
- `deploy/siem/ansible-task.yml:84-101` (NEU): Kommentar-Block + Re-Stat
  der 9 Files NACH gen-certs.sh; `:102-106` sammelt noch-fehlende Pfade;
  `:107-127` Hard-Fail mit exakt fehlenden Dateien + Remediation; im
  gen-certs-Fail (`:86-96`) jetzt curl/openssl/Egress mit Remediation.

### WP2 — Falco-gVisor

**Root-Cause (recherchiert + am echten Binary verifiziert, s. Transkript):**
- FALCO 0.41.3 HAT gVisor-Support — der 29.9.-Fehlschlag war ein FALSE
  NEGATIVE des alten Asserts (`falco-gvisor-integration/ansible-task.yml:110-130`
  ALT: verlangt --gvisor-config + --gvisor-generate-config + --gvisor-root
  als Substrings in `falco --help`). Realität: Falco ≥ 0.38 hat
  --gvisor-config/--gvisor-root in die Config-Datei verschoben
  (`engine.kind: gvisor`, `engine.gvisor.config`, `engine.gvisor.root`);
  als CLI-Flag existiert nur noch --gvisor-generate-config. Beweis lokal:
  `falco -o engine.kind=gvisor --dry-run` erreicht die Engine-Config-
  Validierung ("engine.kind is 'gvisor' but no engine.gvisor.config
  specified"). gVisor-Support ist compile-time optional (falco CMakeLists:
  BUILD_FALCO_GVISOR, default ON auf Linux x86_64, ausgenommen
  MINIMAL_BUILD → -DHAS_GVISOR).
- Substring-Falle: die --gvisor-generate-config-BESCHREIBUNG im 0.41.3-Help
  erwähnt "--gvisor-config" im Fließtext — ein Substring-Check
  false-positived; der alte Assert scheiterte dann am --gvisor-root-Test.
- Engine-Mechanik (libs 0.21.0, die in falco 0.41.3 steckt — aus
  `userspace/libscap/engine/gvisor/{scap_gvisor.cpp,runsc.cpp,gvisor.h}`
  gelesen): die Engine exec'd das BARE `runsc` aus dem PATH (version/list/
  trace create/delete/procfs) — OHNE runsc-Binary im Falco-Container:
  "Cannot find runsc binary". Die Engine BINDet einen SOCK_SEQPACKET-
  Listener am pod-init-Endpoint; runsc (Host) CONNECTet (gVisor
  pkg/sentry/seccheck READMEs) → der Endpoint muss in BEIDEN Namespaces
  dieselbe Datei sein und falco braucht SCHREIBRECHT zum Binden.
- Zwei weitere SPRINT-52-Designfehler, die 29.9. nie live wurden:
  runtime-root Mount `:ro` (bind brächte EROFS) und unter abweichendem
  Pfad (`/host/gvisor-runtime-root`), Root ohne `:moby`-Suffix (Docker
  legt den Per-Runtime-Root unter <docker-root>/runtime-<name>/moby an —
  libs default_root_path, gVisor-seccheck-Beispiel, lokal am
  /var/run/docker/runtime-runc/moby verifiziert).
- Flag-Argument-Falle (verifiziert): `--gvisor-generate-config <pfad>`
  (Leerzeichen) wird als positional geparst → es wird STILL der Default-
  Endpoint /run/falco/gvisor.sock generiert (falco-container-lokal, runsc
  sieht ihn nie). Equals-Form nötig.

**Fix:**
- `deploy/falco-gvisor-integration/ansible-task.yml` (REWRITE): deploy-time
  Variablen-Detektion aus `falco --help` OPTION LINES (anker + optionaler
  Short-Flag-Prefix, nie Substrings) :150-175 → `legacy_flags` /
  `config_keys` / `none`; Hard-Fails: keine gVisor-Flags :177-200 (mit
  BUILD_FALCO_GVISOR-Remediation), legacy ohne generate-Flag :202-217;
  runtime-root mkdir :231-235; pod-init-Generierung IMMER in Equals-Form
  :245-248 + Endpoint-Validierung :250-277; variant-aware Override-Template
  :279-283; LIVE-Verifikation: Running :368-386, Socket-Existenz auf dem
  Host (engine-open proof) :393-411, Log-Scan auf die 6 bekannten
  Engine-Init-Errors :413-435, Baseline + LIVE-PROBE durch eine echte
  runsc-falco-Sandbox (jimesh-framework-demo-1 schreibt /etc/jimesh-demo,
  Event muss NEU in der geteilten Events-Volume landen, Zähl-Verfahren wie
  im siem-Task) :445-503+; ehrliches Ergebnis-Debug inkl. Engine-Wechsel-
  Semantik :520+.
- `deploy/falco-gvisor-integration/falco-gvisor.override.yml.j2` (REWRITE):
  Base-Command byte-genau wiederholt + variantsabhängige Engine-Wiring-
  Zeilen ({% if _falco_gvisor_wiring == 'config_keys' %} … -o engine.*,
  sonst --gvisor-*-Flags) :20-58; NEW mounts :59-84: pod-init :ro,
  host-runsc-Binary → /usr/local/bin/runsc :ro, runtime-root RW am
  IDENTISCHEN Host-Pfad (der eine für falco-Bind UND runsc-Connect gültige
  String).
- `deploy/falco-gvisor-integration/defaults.yml` (REWRITE): komplette
  Recherchier-Sektion (alle Befunde mit Quelle, incl. der beiden
  Fehlschlagstraps) :14-44; `falco_gvisor_docker_runtime_root` KORRIGIERT
  auf `:89-100` → /var/run/docker/runtime-runsc-falco/**moby** (mit
  Begründung); NEU `falco_gvisor_socket_endpoint` :102-110,
  `falco_gvisor_runsc_bin` :73-82 (install-gvisor.sh-Pfad), Probe-Image +
  Budgets :112-129, Events-Volume-Var :104-108.
- `deploy/siem/ansible-task.yml:266-296` (NEU): Interplay-Warnung — ein
  siem-Redeploy setzt die gVisor-Wiring zurück (up -d aus der Basis-Compose
  = modern_ebpf); der Task sagt das LAUT, bevor er den Container anfasst,
  mit Re-Apply-Kommando. deploy-all läuft siem VOR falco-gvisor-integration
  (config.yml services) und wendet sie damit automatisch wieder an.

### WP-Doku
- `deploy/siem/README.md`: Quick-Start-Schritt 1 (gen-certs-Verhalten) :34-37;
  IaC-Schritt 2 (PKI all-or-nothing + Re-Verifikation + 29.9.-Bezug) :64-80;
  Interplay-Abschnitt vor "What the task does NOT do" :103-111.
- `docs/sprints/SPRINT-162-SIEM-DEPLOY-BLOCKERS.md` (dieses Doc).

## Verifikations-Transkript (alles ECHT gelaufen, diese Session)

**Zusätzlich nach dem Live-Befund (30.9.):** Repro-Matrix gegen den
ORIGINAL-Stand des Skripts (Commit 65d047c1, pre-SPRINT-162: A:
partial-PKI-Skip rc=0, C: 404→XML-Fehlerseite→kryptischer bash-Tod, D:
openssl fehlt→stummes rc=1; Frisch-Node mit voller Umgebung: OLD läuft
durch) — Details und Tabelle in der Re-Assessment-Sektion oben. Die
dortigen Repros sind Teil dieses Transkripts. Nachprüfung desselben
Szenarios D gegen die COMMITTETE (gefixte) Version (heute HEAD, Commit
42908476): failt LAUT mit "missing prerequisite 'openssl'" + Remediation,
rc=1 — das Preflight-Verhalten aus dem Fix bestätigt sich im Vergleich.

**Cert-Generierung (WP1) — lokal in Temp-Dirs (ausdrücklich erlaubt):**

| # | Test | Befehl (sinngemäß) | echtes Ergebnis |
|---|---|---|---|
| 1 | Syntax | `bash -n deploy/siem/gen-certs.sh` | rc=0 |
| 2 | Frisch | Temp-Dir ohne certs, `bash gen-certs.sh` | rc=0, exakt 9 .pem-Dateien |
| 3 | Idempotenz | Re-Run | "skipping generation", rc=0 |
| 4 | Partial (1 key gelöscht) | Re-Run | VOLLE Regen (auch über 0400-Dateien), rc=0, 9/9; `openssl verify` gegen das neue root-ca: indexer/manager/dashboard/admin alle OK (kein CA-Mix) |
| 5 | Prereq openssl fehlt (PATH ohne openssl) | Run | lautes Fail "missing prerequisite 'openssl'" + Remediation, rc=1 |
| 6 | Prereq curl fehlt | Run | lautes Fail + Remediation, rc=1 |
| 7 | Install-Abbruch mittendrin (dashboard-certs-Dir 0555) | Run | rc=1, Rollback-Meldung, 0 pem-Dateien übrig ("back to its pre-run state") |
| 8 | Recovery nach 7 | Run | rc=0, 9/9 |
| 9 | shellcheck | `docker run --rm -v …/gen-certs.sh:/s.sh:ro koalaman/shellcheck:stable /s.sh` | rc=0, NULL Findings |

(4 wurde zuerst als BUG gebaut: `cp` in existierende 0400-Datei → EACCES,
Rollback griff korrekt; gefixt via `install_file` mit `rm -f` — der
Fehler ist im Transkript dokumentiert, nicht verschwiegen.)

**Falco-Flag-Fläche (WP2) — recherchiert per WebFetch/curl auf gvisor.dev +
GitHub (falco/libs/plugins-Quellen), verifiziert am ECHTEN Binary über die
LOKAL VORHANDENE Image `falcosecurity/falco:0.41.3` (Throwaway
`docker run --rm`, KEIN Stack, KEIN fremder Container, KEIN exec in
laufende Container):**

| Probe (echt gelaufen) | Ergebnis |
|---|---|
| `falco --help` (0.41.3) | Option-Lines: --gvisor-generate-config DA; --gvisor-config/--gvisor-root NICHT (nur Prosa-Erwähnung) |
| `falco --version` | "Falco version: 0.41.3 / Libs version: 0.21.0" |
| `falco -o engine.kind=gvisor --dry-run` | "engine.kind is 'gvisor' but no engine.gvisor.config specified" → Engine+Config-Keys existieren |
| `falco --gvisor-generate-config=<pfad>` (Equals) | pod-init.json auf stdout, remote-sink endpoint = <pfad> |
| `falco --gvisor-generate-config /x` (Leerzeichen!) | STILL Default-Endpoint /run/falco/gvisor.sock (die Falle) |
| Image-config `/etc/falco/falco.yaml` | engine.kind-Liste enthält gvisor; engine.gvisor.config/root-Keys vorhanden |
| Quellen | gvisor.dev/docs/tutorials/falco/ (alt, zeigt noch Legacy-Flags), falco CHANGELOG (gVisor added 0.32.1, last flag-touch 0.34), options.cpp 0.35.1 vs 0.38-0.41.3, falco CMakeLists (BUILD_FALCO_GVISOR), libs 0.21.0 engine/gvisor/{scap_gvisor,runsc}.cpp, gVisor seccheck-READMEs, plugins-Repo (KEIN gvisor-Plugin) |

**Task/Template-Validierung (WP4) — lokal, mit dem Repo-eigenen
`jimesh-ansible-runner:local` (ansible-core 2.17.6):**

| Check | Befehl (sinngemäß) | echtes Ergebnis |
|---|---|---|
| YAML-Parse aller 4 angefassten YAML | `python3 -c "import yaml; yaml.safe_load(…)"` | 4× OK (meine eigenen Escape-Fehler in YAML/Jinja-Layern wurden dabei gefunden+gefixt, s.u.) |
| ansible --syntax-check siem-Task | Wrapper-Playbook (include_vars defaults.yml + import_tasks ansible-task.yml) im Runner, `--syntax-check` | rc=0 |
| ansible --syntax-check falco-gvisor-Task | dito | rc=0 |
| Template-Render BEIDER Varianten | echtes Playbook mit include_vars defaults.yml + template-Modul | rc=0; beide Renders valides YAML; diff = NUR der Command-Wiring-Block |
| compose-Merge BEIDER Varianten | `docker compose --profile siem -f docker-compose.yml -f <render> config` | je rc=0; merged: engine.gvisor.*/--gvisor-*-Wiring DA, Base-Command (Regeln+json+file_output) ERHALTEN, Base-Mounts (docker.sock, /host/proc, rules, container_plugin, events) ERHALTEN, neue Mounts (pod-init, runsc-Binary, Root am selben Pfad) DA |
| Variant-Detektion | echtes Playbook, echte Help-Fixtures (0.41.3 wortwörtlich aus dem Image; 0.35.1-Format; gVisor-los) + assert | rc=0: 0.41.3 → config_keys (Prosa-Erwähnung zählt NICHT), 0.35.1 → legacy_flags, minimal → none — "All assertions passed" |
| Version-Regex-Ausdrücke | echtes Playbook, byte-identische Ausdrücke aus dem Task | 0.41.3 / 20250820.0 korrekt geparst, asserts grün |
| docker-inspect-Format-Escapes | echte command-Task, byte-identischer Folded-Scalar | rendert exakt `docker inspect -f {{ index .Config.Labels "com.docker.compose.project.config_files" }} jimesh-siem-falco` in eine Datei (grep-verifiziert) |
| go-Baseline (kein Go-File angefasst) | `make go-build`, `make go-vet` | je rc=0 (golang:latest-Container) |

**Während der Validisierung gefundene+gefixte eigene Fehler (ehrlich):**
1. JS→File→YAML→Jinja-Escaping: `\s`/`\b`/`\.` in doppelt-quoted
   YAML-Scalaren sind ungültige YAML-Escapes → doppelt escapen; ein echter
   Zeilenumbruch zerbrach einen Scalar. Alle von der yaml.safe_load-Prüfung
   gefangen und korrigiert; Endzustand: 4× YAML OK + syntax-check grün.
2. Test-Play-Bug (`'legacy_flags''`) + Debug-Re-Templating-Falle — Fehler
   in MEINEN Test-Harnees, nicht in den Task-Dateien; behoben, Tests grün.
3. Der Verdacht "Original hat tr ' '\\n' Bug" hat sich per `git diff`
   als FALSCH erwiesen (Display-Escaping des read-Tools) — NICHT als Fix
   beansprucht, kein Eintrag oben.

**NICHT gelaufen (bewusst, Mandat 6):**
- Der Deploy gegen trading oder irgendein Remote (SSH: kein einziger
   Versuch; Compose-Stack lokal: bleibt down; kein docker-exec in
   laufende/fremde Container — die falco-0.41.3-Befehle liefen in
   Throwaway-`docker run --rm`-Containern des lokal VORHANDENEN Images).
- `make go-test` (braucht den downen Stack — verboten), tsc/vitest/
  check-i18n (kein Frontend-File angefasst — nicht anwendbar; die
  Baseline 471/57/464/60-3307 bleibt unberührt, weil src/** unberührt).
- Alles Live-Spezifische auf dem Node: runsc-Funktion unter runsc-falco,
  Socket-Bind in echt, Container-Enrichment für gVisor-Events, K-LAF-Regel-
  Match auf gVisor-Events — der Task verifiziert genau das beim Deploy
  LIVE (oder failt laut). "SIEM/falco-gvisor läuft auf trading" wird
  NIRGENDWO behauptet.

## Exakte Operator-Verifikation (WP3 — der OPERATOR deployt)

**Schritt 1 wurde vom OPERATOR am 30.9. LIVE ausgeführt** (Ergebnis im
Header + Re-Assessment oben): SIEM-Kern läuft und ist live-verifiziert
(Indexer antwortet, Manager/Dashboard healthy, Falco-Tripwire erkannt,
ISM-Policy stored+attached, ok=32 changed=5). Übrig blieben bewusst:
JIMESH_SIEM_SERVICE_KEY (Mint-Runbook: deploy/siem/README.md
"Service-Key" → curl POST /api/consumer-keys → `echo … | sudo -n tee -a
/opt/jimesh/deploy/siem/.env` → Re-Run) und JIMESH_DEPLOY_RECORD_KEY
(controller-seitig, src/scripts/record-deploy.sh — fremde Datei,
Handoff-Note unten).

```bash
# 1) ERLEDIGT (live, Operator 30.9.) — für künftige Re-Deploys gilt:
make redeploy SERVICE=siem NODE=trading
#    PKI wird geskippt (falls 9/9 auf dem Node) ODER komplett
#    neu gebaut + RE-VERIFIZIERT; danach Indexer/Manager/Dashboard/
#    Falco-LIVE-Checks wie in deploy/siem/README.md.

# 2) Dann die Integration:
make redeploy SERVICE=falco-gvisor-integration NODE=trading
#    Erwartet (falco 0.41.3): Debug "Detected … wiring variant:
#    'config_keys'", runsc-falco in docker info, falco recreated, Socket
#    auf dem Node sichtbar, LIVE-PROBE-Event gezählt. Voraussetzung:
#    runsc auf trading installiert — wenn nicht, failt der Task LAUT mit
#    'make provision-node NODE=trading … install_gvisor: true'-Runbook
#    (config.yml von trading install_gvisor: false — prüfen!).

# 3) Auf dem Node nachsehen (SSH durch den Operator):
docker exec jimesh-siem-falco falco --help | grep -- --gvisor
#    → nur --gvisor-generate-config (und die -pcg/-pkg-Prosa)
ls -la /var/run/docker/runtime-runsc-falco/moby/gvisor.sock
#    → SOCK_SEQPACKET-Socket: Engine offen, Listener aktiv
docker logs jimesh-siem-falco --tail 50
#    → KEINE der bekannten Engine-Init-Errors
runsc --root /var/run/docker/runtime-runsc-falco/moby list
#    → die gesehenen Sandboxes (inkl. jimesh-framework-* mit
#    --runtime=runsc-falco gestartete)

# 4) Optional ganz oben: ein kompletter Rundenlauf
make deploy-all
#    (siem läuft in der services-Liste VOR falco-gvisor-integration —
#    die Reihenfolge ist jetzt Teil des Vertrags, s. Interplay-Warnung)
```

## Ehrliche Offen-Items

1. **Der siem-Deploy ist seit dem 30.9. LIVE bis auf die Keys erledigt**
   (Operator-Lauf, s. Header); offen bleiben die Operator-only-Schritte:
   Service-Key minten + in die Node-.env schreiben + Re-Run (Runbook in
   deploy/siem/README.md "Service-Key"), danach
   `make redeploy SERVICE=falco-gvisor-integration NODE=trading` (Schritt 2
   oben — noch NIE gelaufen, braucht die variant-aware Task-Version aus
   diesem Sprint). Für DEN Lauf gilt weiterhin: kein einziger Node-Zustand
   wurde VON MIR verifiziert; die Root-Pfad-Annahme
   `/var/run/docker/runtime-runsc-falco/moby` beruht auf
   Konventions-Belegen (moby/daemon/oci, libs default_root_path,
   gVisor-README-Beispiel, lokal existierendes
   /var/run/docker/runtime-runc/moby) — NICHT auf einem echten
   runsc-falco-Lauf. Override-Var existiert (`falco_gvisor_docker_runtime_root`
   via overrides.local.yml); wenn der Pfad falsch ist, failt der Task an
   der Socket-Prüfung bzw. der LIVE-Probe mit exakter Diagnose.
   Auch offen: WELCHE der drei Repro-Bedingungen (A/C/D) den 29.9.-Blocker
   real auslöste, ist von hier nicht feststellbar — der Live-Lauf heute
   beweist nur, dass die PKI JETZT komplett ist und der Skip-Pfad sauber
   läuft.
2. **Engine-Wechsel-Semantik:** mit `engine.kind=gvisor` sensort Falco
   NUR gVisor-Sandbox-Tracepoints, nicht mehr host-weite Syscalls
   (modern_ebpf). Beides gleichzeitig braucht eine ZWEITE falco-Instanz
   — Design-Entscheidung für den Parent (aus meiner Ownership-Perspektive
   bewusst NICHT gebaut; der Task + README sagen es laut).
3. **runsc-Sidecars:** aktuelle runsc-Release-Builds können gvisor-bin-
   Sidecars neben dem Binary erwarten (transitionaler Upstream-Mechanismus).
   Die Engine braucht nur list/trace-Subcommands; falls ein Node-Runsc dort
   trotzdem meckert, zeigt es sich in der LIVE-Probe — dokumentiert in
   defaults.yml.
4. **Regel-Abdeckung unter gVisor:** das generierte pod-init.json traced
   u.a. open/openat/write/execve/socket — NICHT chmod. Die K-LAF-chmod-
   Regel (jimesh_rules.yaml "chmod in dropper directory") kann über den
   gVisor-Engine mit der Default-Session also nie feuern (die anderen
   Regeln können es). Erweiterbar über ein eigenes pod-init.json; dem
   Parent als bewusste Randnotiz überlassen.
5. **config.yml trading `install_gvisor: false`** — runsc könnte auf
   trading fehlen; der Task failt dann laut mit provision-Runbook. Der
   Operator entscheidet (live gVisor aktivieren oder den Service aus der
   services-Liste streichen).
6. **Handoff-Notes an den Parent:** BACKLOG-Spiegel S162 ist ERLEDIGT —
   der Parent hat committet (1c227e19 „S162 abgehakt") und diesen Sprint
   mit 42908476 gesichert. Keine Änderung in
   deploy/ansible/playbooks/deploy-service.yml nötig (Registrierungs-
   Kommentare für siem + falco-gvisor-integration existieren bereits).
   API_DOCS.md: keine Route angefasst — N/A. **NEU (Live-Befund):**
   `JIMESH_DEPLOY_RECORD_KEY` blockt den redeploy-Abschluss auf dem
   CONTROLLER (Makefile-redeploy-Recipe ruft
   `bash src/scripts/record-deploy.sh` auf, das den Key braucht) —
   src/scripts/ ist fremd für diesen Sprint, bitte vom Parent zuordnen
   (Key minten ODER record-deploy harmlos machen, wenn der Key fehlt).
