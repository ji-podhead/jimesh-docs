# SPRINT-179 — conn=local (zweiter Control-Node) + die Deploy-Blocker, die das Superleo-Urzug-Deployment angehalten haben

**Datum:** 1.10.2026 (nachts)
**Anlass / Operator-Orders (verbatim):**
- „super leo ist das neue total control plane mit allen serivces"
- „KÖNNEN WIR DIE CONTROL PLANe NOdE AUF SUPERLEO ENDLCIH STARTEN??"
- „also ale suser müssen chaos machen von jimesh und es geht nciht deploy?"
- „können wir nicht die beden hauptfamilien supporten auch mit if else?"
- „wieso geht nicht deploy?"

---

## Plan (vor dem Code notiert — Mandat 4)

**Ziel:** `make deploy-all` muss die komplette Plattform nach `superleo` bringen, und
`SUPERLEO_CONN=local` (deployen vom Ziel-Rechner selbst, ohne SSH) muss tatsächlich
funktionieren — nicht nur rendern.

**Work-Packages:**

| WP | Inhalt | Dateien |
|---|---|---|
| WP1 | Vier echte Deploy-Blocker, die `deploy-all` vor `frontend` stoppten | `deploy/{postgres,keycloak,grafana}/ansible-task.yml`, `deploy/{keycloak,traefik,backend}/defaults.yml` |
| WP2 | OS-Familien-Support (Debian + Alpine) mit if/else statt Fail-closed | `deploy/ansible/playbooks/provision-node.yml` |
| WP3 | `conn=local` real machen: Runner muss das Zielrechner sein | `deploy/ansible-runner/Dockerfile`, `Makefile` |

**Acceptance-Kriterien:**

1. `deploy-all` läuft über alle 6 Plattform-Services **und** die 7 Node-Services, ohne bei einem
   bekannten Bug abzubrechen.
2. `ansible_connection=local` erzeugt `Docker <version> (was already present, no install tasks ran)`
   statt `Unsupported OS family Alpine`.
3. Beim SSH-Pfad (`SUPERLEO_CONN=ssh`, der podhead-Standard) ändert sich **nichts**: keine neuen
   Mounts, gleiche Render-Ausgabe.
4. Jede Änderung ist mit dem Live-Fehler begründet, der sie erzwang — kein „für den Fall dass".

---

## Was tatsächlich geschiffert wurde (gegen den Code verifizert)

### WP1 — die vier Blocker

**1. `lineinfile` gegen Single-File-Bind-Mount (`EBUSY`)**

`-v $(CURDIR)/.env:/ansible/env-file:rw` mountet eine **Datei**. `lineinfile` schreibt per
`rename(2)` über das Ziel — auf einem Mount-Punkt verweigert der Kernel das
(`OSError: [Errno 16] Resource busy`).

→ `unsafe_writes: true` an denselben Task, an **3** Stellen (identischer latenter Bug überall,
wo `.env` als Datei-Mount geschrieben wird):
- `deploy/postgres/ansible-task.yml` (Controller-Sync)
- `deploy/keycloak/ansible-task.yml` (Controller-Sync)
- `deploy/router-bootstrap/ansible-task.yml` (ROUTER_PLATFORM_SERVICE_KEY)

> **Ehrlicher Fehler dabei:** beim ersten keycloak-Versuch landete `unsafe_writes` auf
> **Task-Ebene** statt in den Modul-Args → `ERROR! conflicting action statements:
> ansible.builtin.lineinfile, unsafe_writes`. Gefixt durch Einrückung in den
> `ansible.builtin.lineinfile:`-Block. Belegt, dass YAML-Validität **nicht** reicht —
> der Ansible-Syntaxcheck muss laufen (siehe Verifikation unten).

**2. awk schrieb in eine leere Datei — der Node bekam nie das Passwort**

`deploy/postgres/ansible-task.yml`:

```awk
BEGIN { OFS = "=" }
$1 == ENVIRON["K"] { $0 = K "=" V }
{ print }
```

Die Shell macht davor `touch "$ENVFILE"` → die Datei ist **leer** → es gibt **keine
Input-Zeilen** → `{ print }` läuft nie → die tmp-Datei bleibt leer → `mv` schreibt
0 Bytes. Der Task-`rc` ist trotzdem 0, und `echo VAL|…` liefert den Wert an den
**Controller**. Resultat, live gesehen:

```
fatal: [superleo]: "msg": "/bin/bash: Zeile 3: JIMESH_POSTGRES_PASSWORD ist nicht gesetzt."
ls -l /opt/jimesh/deploy/postgres/.env   →  0 bytes
```

→ `END { if (!found) print ENVIRON["K"] "=" ENVIRON["V"] }` (idempotent, kein Doppel-Eintrag
beim zweiten Lauf). **3 Stellen** mit demselben Muster:
`deploy/postgres/ansible-task.yml`, `deploy/keycloak/ansible-task.yml`, `deploy/grafana/ansible-task.yml`.

Verifiziert mit dem Original-Code (0 Bytes) **und** dem gefixten (42 Bytes, 2. Lauf → 1 Zeile).

**3. `default('127.0.0.1')` greift bei leerem String nicht → iptables-Crash**

```yaml
jimesh_vpn_ip: "{{ hostvars[target_node].vpn_ip | default('') }}"      # deploy-service.yml:117
keycloak_host_bind: "{{ jimesh_vpn_ip | default('127.0.0.1') }}"        # ← '' ist DEFINIERT
when: keycloak_host_bind != '127.0.0.1'                                 # ← '' != '127.0.0.1' → wahr
→ destination: "" → append_param iteriert ""[0]
→ IndexError: string index out of range
```

Jinjas `default()` ersetzt nur bei **undefined**, nicht bei `''`. superleo hat kein `vpn_ip:` in
`config.yml` (trading hatte `vpn_ip: ${TRADING_VPN_IP}`).

→ `default('127.0.0.1', true)` bzw. `default('', true)` an 3 Stellen:
`deploy/keycloak/defaults.yml`, `deploy/traefik/defaults.yml`, `deploy/backend/defaults.yml`.

**4. `services:`-Liste von trading → superleo**

`config.yml` superleo-Node trägt **byte-identisch** die ehemalige trading-Liste
(`diff` gegen `fe09f88c:config.yml` → nur der Node-Name unterscheidet sich):

```
[grafana, siem, tetragon, falco-gvisor-integration, ozone, suricata-network-ids, datalake]
```

Zwei dokumentierte Ehrlichkeits-Ausschlüsse, unverändert: WAF (per-deploy Sidecar, kein
`deploy/waf`), OPNsense (Provider-Stub).

### WP2 — beide Hauptfamilien mit if/else (`provision-node.yml`)

Die Fail-closed-Guard lief **vor** dem Docker-Precheck und brach bei jeder nicht-Debian-Ziel-OS ab.
Umsortiert:

1. Precheck (`docker version`) → `docker_already_present`
2. Guard **erst danach** und nur noch bei tatsächlichem Install-Bedarf:
   ```yaml
   when:
     - not docker_already_present
     - ansible_os_family not in ['Debian', 'Alpine']
   ```
3. Installer if/else: `Debian` → `geerlingguy.docker`-Role, `Alpine` → `apk add docker docker-cli-compose` + OpenRC start
4. `ForceIPv4`-Task nur noch `ansible_os_family == 'Debian'` (schreibt `/etc/apt/apt.conf.d`)
5. gVisor: neue Fail-closed-Guard, weil `grababyte.ansible-role-gvisor` **nur APT** kann — sonst
   würde der Abschluss-Report „gVisor installed" behaupten, obwohl nichts passierte
6. Abschluss-Report sagt jetzt ehrlich `installed via apk` vs. `installed via apt`

> Auf einem Knoten, auf dem Docker schon läuft (superleo: 29.8.2), ist die Family
> **irrelevant** — die Guard ist gated, alles Paketbasierte ist bereits geskippt.

### WP3 — `conn=local` real machen

`ansible_connection=local` führt Aufgaben **im Runner-Container** aus, nicht auf dem Zielrechner.
Ohne Gegenmaßnahmen wären Deployments still falsch (Container im `--rm`-Runner, Dateien im Container).

| Fund | Fix |
|---|---|
| `/var/run/docker.sock` nie gemountet | `LOCAL_MOUNTS` in `Makefile` |
| kein `docker`-CLI im Alpine-Image | `docker-cli docker-cli-compose` in `Dockerfile` |
| kein `sudo` → `become: true` scheitert | `sudo` in `Dockerfile` (live gefeilt: „sudo FEHLT") |
| Staged-Files landen im Container | `-v /opt/jimesh:/opt/jimesh` (gleicher Pfad beidseitig) |

`LOCAL_TARGETS` ist bewusst **`=`** (rekursiv), nicht `:=`: `.rendered.ini` existiert erst nach
dem `render-inventory`-Prerequisit. `client` ist ausgeschlossen (von
`provision-node.yml`'s `hosts: all:!clients` ohnehin nie Ziel).

Mount ist gesetzt auf das Vorhandensein von `/opt/jimesh`:
**live gefeilt**, dass Docker bei fehlendem Host-Pfad `mkdir` versucht und auf einem
read-only Root-FS scheitert (`podhead` — das ohnehin nie `LOCAL_TARGETS` rendert).

---

## Verifikation (echte Befehle, keine Behauptung)

```bash
# YAML + Ansible-Syntaxcheck über ALLE Deploy-Services
for s in postgres redis vault keycloak backend frontend grafana; do
  docker run --rm --entrypoint ansible-playbook \
    -v "$PWD/deploy:/ansible/deploy:ro" \
    -v "$PWD/deploy/ansible/inventory/.rendered.ini:/ansible/inventory.ini:ro" \
    jimesh-ansible-runner:local -i /ansible/inventory.ini \
    --syntax-check /ansible/deploy/ansible/playbooks/deploy-service.yml \
    -e service=$s -e target_node=superleo
done
# → postgres OK redis OK vault OK keycloak OK backend OK frontend OK grafana OK

# SSH-Pfad unverändert? (Mount darf NICHT erscheinen)
make -n deploy-all | grep -- '-v /var/run/docker.sock'   # → kein Treffer

# conn=local: Mounts erscheinen korrekt (nur mit gerendertem local-Target)
make -n redeploy SERVICE=postgres NODE=superleo           # mit local-Inventory
# → -v /var/run/docker.sock:/var/run/docker.sock  -v /opt/jimesh:/opt/jimesh

# ECHTER conn=local-Lauf (Runner = Ziel) — vorher: Unsupported OS family Alpine
# → "Node ready: Docker 29.8.0 (was already present, no install tasks ran),
#    network 'jimesh-net' present, gVisor not requested."
# → PLAY RECAP: ok=6 changed=0 failed=0 skipped=10

# SSH-Pfad gegen superleo (Regression) — unverändert grün
# → "Node ready: Docker 29.8.2 (was already present, no install tasks ran) …"
# → PLAY RECAP: ok=6 changed=0 unreachable=0 failed=0 skipped=10
```

**Deploy-Fortschritt auf superleo:** headscale → postgres ✓ redis ✓ vault ✓ keycloak ✓ →
backend (brach an SSH-Timeout ab, als podheads Tailscale `Logged out` meldete — **kein**
Code-Fehler, Verbindungsweg). Container `jimesh-headscale|postgres|redis|vault|keycloak`
auf superleo vorhanden; **trading wurde nie adressiert** (`.rendered.ini` = 0 Treffer,
`.control-planes` = nur `superleo`).

---

## Offen

- `make deploy-all` von podhead zu Ende bringen (backend → frontend → die 7 Node-Services);
  der Lauf brach nur an der weggefallenen Tailscale-Verbindung ab.
- `SUPERLEO_CONN=local` gegen den **echten** superleo-Host durchziehen (bisher nur im
  Runner-selbst-als-Ziel-Test bewiesen).
- `record-deploy` auto-mint schlägt fehl, solange kein Keycloak `localhost:8081`/Backend
  `:19091` lokal laufen — nicht deploy-blockierend, aber der Deploy-Record fehlt.
- Runner-Image ist nach `Dockerfile`-Änderung gebaut worden; `make ansible-runner-build`
  baut ohnehin bei jedem Lauf neu (Cache greift).
