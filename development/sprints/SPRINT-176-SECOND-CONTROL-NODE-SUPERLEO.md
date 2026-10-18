# SPRINT-176 — Zweite Control-Node (superleo) + zweiter Client (podhead)

**Status:** `[~]` in Arbeit (1.10.2026) — **Code/Deploy-Umbau, kein Deploy ausgeführt**
**Operator-Orders (verbatim):**
- „wir wollen eine 2. control node auf einem anderen server deployen, wir wollen nur nicht den access verlieren geht das können in beide tailnets rein mit unterschiedliche subnet?"
- „ja dann brauch der andere headscale server auf dem anderen server halt ne andere subnet und wir brauchen halt hier 2 clients, sind ja eh unterschiedliche netzwerke"
- „wie gesagt wir wollen den alten headscale nur um auf den trading zugriff zu haben, kein zugriff auf andere networks von uns, von dem trading server auch kein ssh auf andere server, nur von uns auf trading"
- „lass uns einfach den kompletten ordner hier kopieren aber kein node modules und diese ansible temp files"
- „also haben wir quasi 2 localhost hosts aber mit nem if in ansible dann haben wir ne gemeinsame codebase und können von beiden seiten aus deployen"
- „nochmal drüben deployen wir den controlplane und hier den client also dann schreib im deployment die sachen um und kopiere es"

**Quellen:** `docs/sprints/HANDOFF-2026-10-01-UMZUG-SUPERLEO.md` (Zugangswege, Adressen, die 3 Aussperrungs-Regeln), `config.yml`, `deploy/cp/headscale/`, `deploy/client/scripts/client-join.sh`.

---

## Plan (vor dem Code festgelegt)

**Ziel:** dieselbe Codebase auf beiden Maschinen, mit einem Schalter pro Node, ob Ansible
**lokal** (`ansible_connection=local`) oder per **SSH** dorthin geht — und das neue
Headscale-Prefix so parametrisiert, dass die zwei Tailnets sich **nie** Adressen oder Routen
streitig machen können.

**Arbeitspakete:**

| WP | Inhalt |
|---|---|
| WP1 | `render-inventory.py`: neues `conn:`-Feld pro Node → `local` erzeugt `ansible_connection=local` (ohne host/user-Zwang), sonst wie bisher SSH |
| WP2 | `config.yml`: Node-Zeile `superleo` (role control_plane, `headscale: true`) inkl. `conn`, `host`, `user`, `public_ip`, `headscale_port` und den drei neuen Prefix-/Domain-Vars — alle als `${VAR}` in `.env`, nie literal |
| WP3 | Prefix-Parametrisierung: `deploy/cp/headscale/config.yaml.j2` (`prefixes.v4/v6`, `dns.base_domain`) + `defaults.yml` mit `*_override`-Muster (gleiche Ursache wie `headscale_port_override`: `include_vars` schlägt Inventory-Vars) — **Defaults = heutige Werte**, damit trading's Config byte-identisch bleibt und **nicht neu gestartet werden muss** |
| WP4 | `deploy/client/scripts/client-join.sh` parametrisierbar machen (Container-Name, State-Dir, CA-Zertifikat, Hostname, Dashboard-Port, Auto-Forward) — **Defaults unverändert**, das heutige `make client-join` verhält sich identisch |
| WP5 | Makefile: `client2-join` / `client2-status` / `client2-down` (gleiche Skript-Datei, andere Env-Werte aus `.env`), `.env.example` + `.env` ergänzen |
| WP6 | Doku-Mandat: Sprint-File (dieses), Backlog-Spiegel, Handoff-Abschnitt nachziehen, Änderungen nach superleo kopieren (Delta) |

**Acceptance Criteria:**

1. `python3 -m py_compile src/scripts/render-inventory.py` grün; Test-Lauf mit gesetzten
   `SUPERLEO_*`-Vars erzeugt Inventory mit `superleo ansible_connection=local` (wenn `conn=local`)
   bzw. `ansible_host=… ansible_user=…` (wenn `conn=ssh`), Überspringen mit Warnung bei fehlendem Var.
2. `bash -n deploy/client/scripts/client-join.sh` grün; `make client-join` (Alt-Client) **unverändert** —
   gleicher Container, gleicher State, gleiche CA, `docker ps`-Namen unangetastet.
3. Ohne Prefix-Vars rendert `config.yaml.j2` weiterhin `v4: 100.64.0.0/10` /
   `base_domain: jimesh.internal` — trading braucht keinen Headscale-Neustart.
4. Kein Literals in `config.yml` (nur `${VAR}`), keine Secrets in getrackten Dateien.
5. Kein Deploy, kein Headscale-Restart, kein Angriff auf die bestehenden Tailnets in diesem Sprint.

**Nicht Teil dieses Sprints (bewusst):** das tatsächliche Deploy nach superleo, Erzeugung des
Preauth-Keys, Fetch des neuen self-signed CA für Client2, der2. Client-Container live, der
Gleichzeitigkeitstest alt+neu.

---

## Umsetzungsstand (gegen den Code verifiziert)

| WP | Status | Nachweis |
|----|--------|----------|
| WP1 `conn`-Schalter | [x] | `src/scripts/render-inventory.py` — `conn: local` → `ansible_connection=local` ohne host/user-Zwang, `ssh_port` nur bei non-local; `python3 -m py_compile` grün |
| WP2 config.yml | [x] | `config.yml` Node `superleo`: `conn`, `host`, `user`, `ssh_port`, `public_ip`, `headscale_port`, `headscale_prefix_v4/v6`, `headscale_base_domain`, `install_gvisor: false` — alle `${VAR}` |
| WP3 Prefix/Domain | [x] | `deploy/cp/headscale/config.yaml.j2` + `defaults.yml` mit `headscale_prefix_v4/v6_override` und `headscale_base_domain_override`; Defaults = alte Werte (trading rendert unverändert, kein Neustart) |
| WP4 client-join.sh | [x] | `CLIENT_CONTAINER` / `CLIENT_STATE_DIR` / `CLIENT_CA_CERT` / `CLIENT_HOSTNAME` / `CLIENT_DASH_PORT` / `CLIENT_AUTO_FORWARD` — Defaults = Original |
| WP5 Makefile + Env | [x] | `client2-join` / `client2-status` / `client2-down` / `client2-exec` / `client2-dashboard` / `client2-ca-fetch`; `.env` + `.env.example` mit `SUPERLEO_*` und `HEADSCALE2_*` |
| WP6 Doku + Delta | [x] | dieses File, `HANDOFF-2026-10-01-UMZUG-SUPERLEO.md`, Backlog-Spiegel, Delta-rsync nach superleo (Verifikation: 0 zu übertragen) |

**Verifikation (lief, nicht behauptet):**

* `make render-inventory` → `3 node(s), 0 skipped`; gerendert:
  `superleo ansible_host=100.127.129.65 ansible_user=superleo ansible_port=22 public_ip=100.127.129.65 headscale_port_override=8082 headscale_prefix_v4_override=10.80.0.0/16 headscale_prefix_v6_override=fd7a:b1c5:4d20::/48 headscale_base_domain_override=jimesh2.internal`
  (kein `ansible_connection=local`, weil `SUPERLEO_CONN=ssh` auf podhead) — und die
  trading-Zeile unverändert (`headscale_port_override=80`, keine Prefix-Overrides).
* `bash -n deploy/client/scripts/client-join.sh`, `make -n` für alle sechs `client2-*`-Ziele, `make go-build`.

**In WP4 beim Nachziehen gefundene Lücken (alle behoben):**

1. `ensure_container` publizierte weiterhin fest `-p 127.0.0.1:8090:8090` und mountete die
   **CA des ERSTEN** Pools statt `$CA_CERT` → zweiter Client wäre an einem fremden Port/CA
   gescheitert. Jetzt `-p 127.0.0.1:$DASH_PORT:$DASH_PORT` + `$CA_CERT`.
2. `--hostname=jimesh-client` war hartkodiert → beide Clients hätten denselben
   Tailscale-Namen getragen. Jetzt `--hostname="$TS_HOSTNAME"`.
3. Der `.env`-Fallback (`HEADSCALE_URL=`) hätte einen zweiten Container **stillschweigend
   ins ERSTE Tailnet** eingebuchtet (falsche URL + falscher Key, sieht aber erfolgreich aus).
   Jetzt greift der Fallback nur noch für den Original-Container.
4. Die CA-Prüfung lag vor dem `case` → `status`/`down`/`exec` wären ohne CA-Datei gestorben.
   Jetzt nur noch in `up`.
5. Auto-Forward wäre gelaufen (`TRADING_VPN_IP`) und hätte vom zweiten Container aus
   das **erste** Dashboard angesprochen → Gate `CLIENT_AUTO_FORWARD=0`.

---

## Aussperrungs-Regeln (gilt für ALLE folgenden Sprints, verdichtet aus der Operator-Order)

1. **Alter headscale unberührt** — kein Config-Change, kein Restart, kein `rm`. (Regel 1+3
   zusammen: alter Pool `100.64.0.0/10`, neuer Pool `10.80.0.0/16`, plus eigene v6-Range und
   eigenes `base_domain` → keine Adresse, kein Name, keine Route kann kollidieren.)
2. **superleos Host-Tailscale unberührt** (`100.127.129.65`, kommerziell `ji-podhead@`, unser
   Zugang per Tailscale-SSH) — die neue Identität ausschließlich im isolierten Container.
3. **podhead's primäre Verbindungen unberührt** — `client-join.sh` bleibt bridge-Mode
   (der `--network host`-Near-Miss vom 16.9.), nie `--network host`.
