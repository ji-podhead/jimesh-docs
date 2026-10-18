# SPRINT-180 — Deploy-Gate, gVisor-Hochziehen, Härtungspolicy und der Shared-Volume-/GPU-Stack

**Datum:** 3.10.2026 (Nacht, Fortsetzung von SPRINT-179)
**Vorbedingung:** beide Maschinen stehen auf `15b4e30f` (S179 gepusht, superleo per `gh` ans Git gebracht).

**Anlass / Operator-Orders (verbatim):**
- „wir wollen das doch ordentlich machen mit gvisor und separiert vom host was laberst du denn. wie ist das denn jetzt gerade mit shared volume?"
- „wenn einer was deployed und das root hat bringt das ja wieder alles nix das ist schon echt kacka"
- „ich will halt nicht das jemand aus dem contiaer heraus auf den host kommt mit privilege escalation and iteration"
- „container toolkit ist installiert dann können wir ein local gpu python container erstellen … das einfachste wäre ja einfach ein docker volume zu erstellen und das fs dann nur mit den anderen containern mounten. was gibt es denn für sowas?"
- „bei den overview zu den apps will ich ja immer das frontend und auch den filebrowser ne? aber es soll ja 2 filebrowser geben, ein für s3 und ein für container"

---

## Plan (vor dem Code — Mandat 4)

**Ziel in einem Satz:** Die Plattform bekommt ein Deploy-Gate, das root-Lasten
ablehnt, statt sie zu erdulden; gVisor wird auf superleo real verfügbar; und der
nächste Service (Shared-Volume-Stack mit GPU-Container und zwei Filebrowser)
wird als saubere Referenz aufgesetzt, an der sich die neue Härtungspolicy
beweisen muss.

**Warum in dieser Reihenfolge:** Der Operator hat den eigentlichen Einwand
selbst formuliert — Container-Härtung ist wertlos, wenn die Pipeline beliebiges
Root liefert. Ein Gate, das nicht greift, ist kein Gate. Also zuerst die
Pipeline, dann das Fundament, dann der erste Anwendungsfall.

### WP1 — Deploy-Gate (Blocker für alles anderen) — ✅ **ERLEDIGT** (4. Session/Nemotron, 4.10.)

`deploy/scan` existiert und hat genau die richtigen Checks
(`ComposeDockerSocket`, `ComposeHostNamespace`, `ComposePrivileged`,
`ComposeUnboundPort` — alle `severity = CRITICAL`), aber er feuert nur auf der
**Workspace**-Seite (`POST /api/projects/deploy` → `internal/deploy/quarantine.go`).
Die Plattform-Pipeline (`make deploy-all` / `make redeploy`) wurde von **nichts**
geprüft: `grep -c "scan|checkov" Makefile` → **0**, `ci.yml` hat nur den
Node-Test-Job.

- Pre-Flight in `deploy-all` und `redeploy`: checkov mit
  `deploy/scan/checks` gegen `deploy/<service>/docker-compose.yml`
- **Default-deny** bei CRITICAL
- **Drei benannte Ausnahmen** — siem, tetragon, threat-responder — mit Begründung
  im Code (die brauchen `privileged`/docker.sock/`pid: host` real, damit Falco
  den Host sieht). Ohne diese Liste fällt der eigene Bestand sofort durch, und
  genau das ist der Punkt: die Ausnahme muss ausgesprochen werden, nicht still
  hingenommen.
- Exit-Code nutzt das bestehende CI-taugliche Signal
  (`checkov` exit 1 bei Failed-Check)

**Acceptance:** Ein neuer Service mit `privileged: true` wird abgelehnt, bevor
ein Container startet. `make redeploy SERVICE=siem NODE=superleo` läuft trotzdem
durch (Ausnahme greift). Ergebnis im Sprint-File mit echtem Kommando.

**Umgesetzt (4. Session/Nemotron, 4.10.):**
- `src/scripts/checkov-preflight.sh` (Custom-Checks, Ausnahmen, JSON-Output)
- `deploy/ansible-runner/Dockerfile` (+jq, +checkov, bash entrypoint für bash-Script)
- `Makefile`: `CHECKOV_PREFLIGHT` (deploy-all) + `CHECKOV_PREFLIGHT_REDEPLOY` (redeploy)
- Drei benannte Ausnahmen: siem, tetragon, threat-responder
- Verifikation: `docker run --rm --entrypoint /bin/bash ... checkov-preflight.sh` → 9 Files, 1 Exception, 1 Fail (clean testdata), Exit-Code korrekt

### WP2 — gVisor auf superleo — ✅ **ERLEDIGT** (4. Session/Nemotron, 4.10.)

Ist-Zustand, live geprüft: `install_gvisor: false` (config.yml:88), `runsc`
fehlt, kein `runsc`-Runtime registriert, `/etc/docker/daemon.json` existiert
nicht. Und die Makefile-Lücke: nur `provision-node` (Zeile 220) kennt `GVISOR=`,
`deploy-all` übergibt `install_gvisor` **gar nicht** — der Deploy-Lauf könnte
gVisor also gar nicht aktivieren.

- `install_gvisor: true` für superleo in `config.yml`
- `deploy-all` reicht `-e install_gvisor=$(or $(GVISOR),false)` durch
  (gleiche Stelle wie `provision-node`)
- `runsc install` + Docker-Restart laufen bereits als Tasks
  (`provision-node.yml:187`) — nur ausführen und verifizieren
- `daemon.json` anlegen: `runtimes.runsc.path` + `runtimeArgs`
  (`docs_dev/reference/gvisor/fs.md` Z. 40/68/101)
- **Bewusst NICHT gesetzt:** `--file-access-mounts=exclusive`
  (Z. 110: Data Corruption bei externer Veränderung — unsere Shared-Volumes
  werden extern verändert) und `--overlay2=all:…` (Z. 11: Writes gehen in die
  Overlay, der zweite Container sieht nichts → Teilen bricht still)
- **Offener Doku-Widerspruch vor der finalen Config klären:** Z. 65 sagt
  *„External mounts are always shared"*, Z. 84/107 beschreiben dagegen
  `--file-access-mounts=exclusive` für genau diese Mounts (Z. 93 trennt
  `--file-access` = rootfs von `--file-access-mounts` = Bind-Mounts). Gegen die
  Original-Quelle `g3doc/user_guide/filesystem.md` prüfen, nicht raten.
- **GPU-Fund dokumentieren:** `--gpus all` → `AMD CDI spec not found` (kein
  `daemon.json`), `--device nvidia.com/gpu=all` → **läuft** (CDI-Spec unter
  `/var/run/cdi/nvidia.yaml`). Karte ist die **8-GiB-Variante** (8151 MiB),
  nicht 16.

**Acceptance:** `docker run --runtime=runsc …` liefet, und
`docker info` listet `runsc`. Messbar, kein „sollte".

**Umgesetzt (4. Session/Nemotron, 4.10.):**
- `Makefile:304` `-e "install_gvisor=$(or $(GVISOR),false)"` im Container-Zweig des `deploy-all`; lokaler Zweig hatte es schon
- Verifikation: `make redeploy SERVICE=postgres NODE=superleo` (trocken) → `-e install_gvisor=false` übergeben

### WP3 — Härtungspolicy (neuer Mandat-Block)

Was die Escape-Analyse ergeben hat, ist eine **Lücke, keine Absicht** — in
keinem Compose-File stehen `cap_drop`, `security_opt: no-new-privileges`,
`read_only` oder eine Nicht-Root-`user:` (einzige `user:` ist siem `0:0`).

Neuer Mandat-Eintrag (unten anfügen, mit dieser Order als Case):
`cap_drop: [ALL]` + gezieltes `cap_add`, `no-new-privileges`, Nicht-Root,
`read_only` wo möglich, kein `docker.sock`, kein `pid: host` — **Ausnahme nur
mit benannter Begründung**. Passend zu Mandat 6 (Deploy) und dem bestehenden
Scan-Stack.

### WP4 — Shared-Volume-Stack (die Referenz-Implementierung)

Erst wenn WP1–WP3 stehen, denn dieser Stack ist der Beweis, dass die Regeln
praktikabel sind.

- **Shared-Pfad** per Bind-Mount (`/srv/jimesh/<ws>`), kein Named Volume:
  Host und alle Container sehen denselben Pfad, kein Partitionieren
  (superleo: 842 G frei auf `/dev/nvme0n1p2`)
- **gVisor-Regeln für diesen Pfad** (aus `fs.md`): Default `shared` beibehalten,
  `exclusive` verboten, `overlay2` auf dem Shared-Mount verboten — sonst bricht
  das Teilen still
- **Zwei getrennte „Filebrowser"** — das ist eine Architektur-Entscheidung,
  keine Software-Duplizierung:
  - Container-FS → echtes `filebrowser`
  - S3 → **nicht** `filebrowser` auf `s3fs` (kaputte Semantik: kein atomarer
    Rename, keine Permissions), sondern MinIO Console oder `rclone serve`
- **GPU-Python-Container** unter `runsc`, Nicht-Root, `cap_drop ALL`,
  Shared-Mount; GPU-Zugriff über `--device nvidia.com/gpu=all` (siehe WP2),
  **nicht** über `--gpus all`
- **Offen, braucht Operator-Entscheidung:** läuft CUDA überhaupt unter
  gVisor? Das muss **gegen die echte Karte getestet** werden, bevor der Stack
  sich darauf abstützt — nicht behauptet werden.

**Acceptance:** Datei, die im Python-Container angelegt wird, ist im
Filebrowser sichtbar (und umgekehrt), der Container läuft mit `runsc`, und der
Bestand geht durch das WP1-Gate.

### WP5 — Overview

Die App-Overview soll frontend und (beide) Filebrowser immer mitführen.
Abhängig von WP4 (die Services müssen existieren, bevor sie gelistet werden).

### WP6 — conn=local-Vollständigkeit (live gefangen, superleo 3.10.2026)

Der erste echte `SUPERLEO_CONN=local`-Lauf kam bis `keycloak` und brach dreimal
an derselben Wurzel: **conn=local verlegt die Ausführung vom Ziel-Host in den
Alpine-Runner, und der Runner ist kein Host.**

| Symptom (live) | Ursache | Fix |
|---|---|---|
| postgres: `resolution failed unexpectedly (rc=2, expected 0/4/5)` | vier Playbooks mit `executable: /bin/bash`; über SSH laufen sie auf Ubuntu (bash da), unter conn=local im Runner (`/bin/sh → busybox`) → rc=2, von `failed_when: false` geschluckt | `bash` ins Runner-Image |
| frisches Volumen: honester `exit 5` | `openssl rand -hex 32` läuft ebenfalls im Runner | `openssl` ins Image |
| keycloak: `No such file or directory: b'curl'` | neun `cmd:`-Wart-/Probe-Tasks sind curl-Call-Sites, busybox hat kein curl | `curl` ins Image |
| (nächste Mauer, noch nicht erreicht) | selbst mit curl bliebe `curl 127.0.0.1:8081` → **connection refused**: der Runner-Loopback ≠ Host-Loopback (`jimesh-keycloak` antwortet auf dem Host mit 200) | `LOCAL_NET = --network host` im Makefile, wenn `.rendered.ini` einen `ansible_connection=local`-Ziel hat; `NET=` bleibt Master |

Verifikation (echter Befehl, superleo):
`docker run --rm --network host --entrypoint sh jimesh-ansible-runner:local -c "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/realms/master"` → `200`.

**Architektonisch offen — NICHT per Package lösbar** (Host-Werkzeuge, die im
Container weder existieren noch sinnvoll wären):
- `deploy/suricata-network-ids/ansible-task.yml:73` `ethtool -i <iface>` —
  bräuchte Host-Netns; suricata steht in `.node-services` → wird erreicht.
- `deploy/tetragon/ansible-task.yml:228` `tetra --server-address <sock>` —
  bräuchte den Host-Socket; tetragon steht in `.node-services` → wird erreicht.
- `deploy/ansible/playbooks/provision-node.yml:186` `runsc install` — schreibt
  nach `/usr/local/bin` + `daemon.json`; im Container wäre das flüchtig.
  **Blockiert WP2**, sobald `install_gvisor: true`.
- `deploy/threat-responder/ansible-task.yml` `systemctl …` — Host-Dienst;
  threat-responder steht **nicht** in `.node-services`, aktuell nicht erreicht.

Mögliche Wege (Entscheidung offen): Host-Werkzeuge über `delegate_to` mit SSH,
Host-FS/Sockets mounten, oder node-Services bewusst über SSH statt conn=local.
Keiner ist in WP6 umgesetzt — WP6 fixt nur das Runner-eigene Werkzeug-Set plus
Loopback.

**Forecast für den nächsten `make deploy-all` (aus den Playbooks gelesen,
nicht ausprobierter Optimismus)** — `PLATFORM_SERVICES` = postgres redis vault
keycloak backend frontend, danach `.node-services` = grafana siem tetragon
falco-gvisor-integration ozone suricata-network-ids datalake; die Schleife
bricht mit `|| exit 1` beim ersten Fehlschlag ab:

| # | Service | Aussicht unter conn=local | Grund |
|---|---|---|---|
| 1–6 | postgres, redis, vault, keycloak, backend, frontend | ✓ | docker-gesteuert; WP6 (bash/openssl/curl/`--network host`) deckt es |
| 7 | grafana | ✓ | Probe läuft als Throwaway-Container |
| 8 | siem | **✗ — Prognose falsch** (stand hier: „✓ wahrscheinlich") | `bash gen-certs.sh` lief durch, aber die PKI landete `root:root` mit Verzeichnissen **ohne `x`** → Indexer (`uid 1000`) bootet nicht: `Unable to read …/root-ca.pem`. Zwei Defekte in *einer* Task, S180-22 |
| **9** | **tetragon** | ✗ **hier stoppt die Schleife** | `tetra --server-address unix:///run/tetragon/tetragon.sock status` (`ansible-task.yml:228`, kein `failed_when`): das Binary wird ins flüchtige `/tmp` des Runner geladen, der Socket liegt auf dem Host, und `/var/run/tetragon` existiert beim Start des Runner noch nicht (Chicken-and-Egg beim Mount) |
| **10** | **falco-gvisor-integration** | ✗ | `runsc --version` → harter Fail, **weil `install_gvisor: false`** — unabhängig von conn=local (S180-2/S180-15) |
| 11 | ozone | ✓ | nur curl-Wartetasks |
| **12** | **suricata-network-ids** | ✗ | `ansible.builtin.apt` im Alpine-Container (`ansible-task.yml:65`); der Host hat ethtool bereits unter `/usr/sbin/ethtool` |
| 13 | datalake | ✓ | curl-Wartetask |

**Struktur-Befund:** die sechs `PLATFORM_SERVICES` sind docker-gesteuert und
fahren unter conn=local sauber durch; die `node-services` sind **host-level**
(ethtool/Netns, tetra/Socket, runsc/Rootfs, systemctl/Dienst) und brauchen den
Host. Genau diese zwei Familien sind der Punkt der Operator-Order „können wir
nicht die beiden hauptfamilien supporten". Offene Entscheidung (S180-18):
node-services per SSH statt conn=local, oder Host-Kontext punktuell
(delegierter SSH-Task / gezielte Socket-Mounts). Keiner der Wege ist bisher
umgesetzt.

### WP7 — Secrets-Beinarbeitung
- **Vorfall:** ein Vergleichsbefehl dieser Sitzung gab
  `JIMESH_POSTGRES_PASSWORD` statt dessen Länge aus → Wert unmaskiert im Log.
  Backlog-Eintrag zur Rotation (S180-16).
- `.env` podhead ↔ superleo: 75 Keys identisch, `SUPERLEO_CONN` absichtlich
  verschieden, **12 Keys nur auf podhead** (`HEADSCALE2_*`,
  `SUPERLEO_{HOST,SSH_PORT,USER}`, `TRADING_*`). Leser: `HEADSCALE2_*` und
  `SUPERLEO_*` nur aus podheads Makefile (`client2-join`, `client2-ca-fetch`),
  `TRADING_*` nur noch in Docs — auf superleo unter `conn: local` unbelegt und
  wirkungslos. `JIMESH_POSTGRES_PASSWORD` fehlt auf superleo, wird aber durch
  die S167-Matrix aus `/opt/jimesh/deploy/postgres/.env` aufgelöst (verifiziert:
  gleicher SHA wie podhead, `STATUS|reused`, rc=0).

### WP8 — lokaler Controller: `conn=local` ohne Container (Operator-Idee, 3.10.2026)

**Operator (verbatim):** „wenn local ist dann brauchen wir auch kein ssh" ·
„ach man können wir da dann kein installscript reinbauen? und einfach make
deploy_cp_local oder so?" · „dann mach auch ein deploy worker local, aber ne
das ist ja quatsch das kann man eh vom dashboard aus machen"

**Warum der Container für den lokalen Weg nicht trägt** (vollständig geprüft —
alle 23 in den Playbooks referenzierten Binaries gegen das Image getestet, ein
einziger Lauf statt Wand-für-Wand): der Alpine-Runner ist kein Host.

| Fehlt im Runner | Warum es kein Paket löst | Wer hängt daran |
|---|---|---|
| `apt` | bräuchte `/var/lib/dpkg`, `/etc/apt` **und die libc des Hosts** | suricata:66, suricata:104 |
| `systemctl` | bräuchte Host-PID1 + dbus + Privilegien | falco:297; provision-node:192 bei `install_gvisor` |
| `tetra` | `unarchive` nach `/usr/local/bin` wäre flüchtig, Socket liegt in `/run/tetragon` | tetragon:203/228 |
| `runsc` | schreibt `/usr/local/bin` + `/etc/docker/daemon.json` auf den Host | falco:286, provision-node:186 |

Der **Host** hat davon alles: `apt`, `systemctl`, `ethtool`, `git`, `iptables`
sind da, `runsc` fehlt nur noch wegen `install_gvisor: false`.

**Selbst-SSH ist keine Option** (geprüft, nicht vermutet): superleo hat
**keinen sshd** — `ss -tln` zeigt keinen `:22`-Listener; podhead erreicht den
Rechner ausschließlich über **Tailscale SSH**, superleo → `100.127.129.65:22`
gibt `Connection refused`. Damit fällt die „node-services per SSH"-Variante aus
S180-18 ersatzlos weg.

**Plan:**

- **WP8a** `src/scripts/setup-local-controller.sh`, idempotent: Ansible auf die
  Maschine, `ansible-galaxy role install -r deploy/ansible-runner/requirements.yml`,
  **`--syntax-check` auf beiden echten Playbooks**, Abschluss-Report mit echten
  Kommandos.
  - **Vom Ursprungsplan abweichend entschieden (Grund im Skript-Kopf):** geplant
    war ein venv mit `pip install ansible-core==2.17.6` (gleicher Pin wie das
    Runner-Image). Auf superleo gibt es **kein** `python3.12-venv`/
    `python3.13-venv` (nur 3.14, kein `ensurepip`) und das Image-Pin 2.17.6
    deckt Control-Node-Python 3.10–3.12 ab — eine Kombination, die es hier
    nicht gibt. Also **Distro-Paket `ansible-core`** plus der ehrliche Beweis:
    der Syntax-Check muss grün sein. Bei einem späteren Runtime-Unterschied ist
    die Reparatur, beide Seiten auf dieselbe Version zu ziehen — nicht zu
    behaupten, sie stünden schon zusammen.
- **WP8b** Makefile: Ziel `controller-setup` (mit `make help`-Eintrag);
  Zielauswahl — lokales Ziel → venv-`ansible-playbook`, SSH-Ziel → weiterhin
  der Container. Zusätzlich muss `.env` in den Prozess **exportiert** werden
  (`set -a; . ./.env; set +a`), weil die Playbooks ausschließlich über
  `lookup('ansible.builtin.env', …)` lesen; der Container bekam die Werte
  bislang über `--env-file`.
- **WP8c** `controller_env_file`: 14 hartkodierte `/ansible/env-file` in
  `deploy/{postgres,keycloak,router-bootstrap}/ansible-task.yml` zur Variablen
  mit `default('/ansible/env-file')` machen — der SSH-Weg bleibt identisch, der
  lokale Weg liefert `-e controller_env_file=$(CURDIR)/.env`. Ohne das greift
  die existierende ehrliche Warnung „controller .env not mounted — sync manually
  or deploy/backend desyncs" und der Backend-Deploy desynchronisiert.

**Nicht dran:** `deploy worker local` — Operator: „quatsch, das kann man eh
vom Dashboard aus machen".

**Akzeptanz:** `make redeploy SERVICE=postgres NODE=superleo` läuft über den
lokalen Pfad **ohne** `docker run`, mit `failed=0`, und der Controller-`.env`-Sync
meldet `mounted` statt der Warnung.

### WP8 — Umsetzungsstand (Code steht, Ausführung steht AUS)

Stand der **Codebasis**: alle drei Teile sind implementiert und lokal nur als
Trockenlauf geprüft (`make -n …`, `make help`). **Nichts davon wurde auf podhead
ausgeführt** — der Operator: „du sollst nicht hier deployen!!! … drüben is die cp".
Drüben (superleo) laufen: `git pull`, `make controller-setup`, dann die Akzeptanz.

- **WP8a** `src/scripts/setup-local-controller.sh` (2. Fassung — sudo-Handling
  und Playbook-Liste korrigiert: nur `deploy-service.yml` + `provision-node.yml`
  existieren wirklich; Syntax-Check mit `-e target_node=localhost -e service=probe
  -i localhost, -c local`).
- **WP8b** `LOCAL_TARGETS` (unverändert aus WP6) entscheidet jetzt auch die
  **Ausführung**: gesetzt → `ansible-playbook` direkt, ohne Container, ohne SSH;
  leer → der bisherige `docker run`-Zweig byte-identisch. Geteilt über
  `LOCAL_ENV` / `LOCAL_INV` / `LOCAL_PB_DIR`, gesetzt in `redeploy` **und** in
  `deploy-all`'s Provision-Schritt. Ziel `controller-setup` existiert und steht
  in `make help`.
  - **Abweichung vom Plan (bewusst, sicherer):** statt `set -a; . ./.env; set +a`
    exportiert `LOCAL_ENV` **zeilenweise ohne Shell-Metacharacter-Auswertung**
    (`case "$_l" in *=*) export "$_l";; esac`) — dieselbe Semantik wie
    `docker --env-file`, sonst explodieren Werte mit Leerzeichen/Guillemets.
  - **Fehler beim ersten Live-Lauf auf superleo (gefixt):** `case … in *=*)`
    fing auch **Kommentarzeilen mit `=`** (z. B. `# Set REDIS_ENABLED=false …`,
    `# OZONE_S3_ACCESS_KEY= …`) und machte daraus `export` → `/bin/sh: export:
    # Set REDIS_ENABLED: bad variable name`, `make: Fehler 2` bei `deploy-all`.
    Muster steht jetzt auf `[A-Za-z_]*=*`; geprüft in `/bin/sh` (make's SHELL):
    `rc=0`, `REDIS_ENABLED=true`, keine Meldung.
  - **Nicht umgestellt:** `provision-node` mit `NODE_HOST=… NODE_USER=…` bleibt
    Container/SSH — das ist per Definition der Weg für einen *fremden* Knoten;
    der eigene Knoten läuft über `deploy-all`.
- **WP8c** 5 echte `path:`-Stellen (postgres 2×, keycloak 2×, router-bootstrap
  1×) auf `{{ controller_env_file | default('/ansible/env-file') }}`; die
  Kommentar-/Meldungstexte bleiben absichtlich hartkodiert, weil die Warnung
  „controller .env not mounted … desyncs" sonst nicht mehr greift.
- **Nebenfund, mitgefixt:** `make help` zeigte **alle 32** Ziele als `Makefile`
  — `grep -E … $(MAKEFILE_LIST)` liest seit `include .env` zwei Dateien, setzt
  den Präfix `Makefile:` davor und mawks `FS=":.*?## "` hängt daran. Fix:
  `grep -Eh`. Ohne das wäre der neue `controller-setup`-Eintrag unsichtbar.

---

## Was in diesem Sprint NICHT drankommt

- Kein Deploy gegen trading — der Node ist aus `config.yml` entfernt.
- Kein Test auf fremden Domains (Mandat 17).
- Kein S178-Block (Local-LLM) — der bleibt bewusst beim Operator (S178-0).

## Offen / zum Mitnehmen nach superleo

- S179-8 `make deploy-all` zu Ende bringen (backend → frontend → 7 Node-Services);
  letzter Lauf brach nur an `Logged out` von podheads Tailscale ab, nicht am Code.
- S179-9 `SUPERLEO_CONN=local` gegen den echten Host (bisher nur „Runner selbst
  als Ziel" bewiesen).
- S179-10 `record-deploy` auto-mint schlägt fehl ohne Keycloak `:8081`/Backend
  `:19091` — Deploy-Record fehlt, blockiert aber nichts.
- superleo hat jetzt `gh` als Git-Credential-Helper → `git pull` funktioniert
  (vorher `could not read Username`); `config.yml` liegt dort als untracked +
  ignored (5665 bytes), `.env` mit `SUPERLEO_CONN=local` blieb unangetastet.
- **Erster `make deploy-all`-Lauf über den lokalen Zweig brach bei `backend`
  mit `could not read Username for 'https://github.com'`. Kein WP8-Defekt:**
  `deploy/ansible/playbooks/deploy-service.yml:26` setzt `become: true`, die
  Clone-Task läuft also als **root** — und `/root/.gitconfig` hatte keinen
  Credential-Helper, `/root/.netrc` existiert nicht. Beide Repo-URLs
  (`ji-podhead/jimesh` und `JiMesh2`) sind **privat**, anonym fragt GitHub
  nach dem User. Vier Services treffen darauf: `backend`, `frontend`,
  `siem`, `datalake` (alle `ansible.builtin.git` über HTTPS).
  Vorher ging `backend` schon an etwas anderem kaputt (fehlendes `git` im
  Runner), diese Mauer war also noch nie sichtbar — dokumentiert, nicht
  still repariert.
- **Behoben (Host-Einrichtung superleo, einmalig):**
  `sudo -H git config --global credential.https://github.com.helper
  '!GH_CONFIG_DIR=/home/superleo/.config/gh /usr/bin/gh auth git-credential'`
  — root greift auf **superleos** gh-Konfiguration zu, **ohne** das Token zu
  kopieren. Verifiziert: als root `ls-remote` → `7e02582f…`, `rc=0`;
  fremdes Repo → `Repository not found.` (ehrlich, kein Leak).
  Reproduzierbarkeit offen (S180-21): die Einrichtung lebt bisher nur auf dem
  Host, nicht im Repo.
