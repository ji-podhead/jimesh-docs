# HANDOFF — 2026-10-01, Umzug podhead → superleo (Sitzung läuft danach dort weiter)

Leo (Tutario GmbH, lj@saits.ai). Vorgänger: `HANDOFF-2026-09-29-FINAL.md`. **Dieses Dokument ist
der aktuelle Stand.** Es wurde erzeugt, während das Repo nach superleo kopiert wird — die
fortlaufende Sitzung arbeitet ab hier in `/home/superleo/jimesh` auf superleo weiter.

---

## Operator-Orders dieser Session (verbatim, entscheidungsrelevant)

- „wir wollen eine 2. control node auf einem anderen server deployen, wir wollen nur nicht den
  access verlieren geht das können in beide tailnets rein mit unterschiedliche subnet?"
- „ja dann brauch der andere headscale server auf dem anderen server halt ne andere subnet und wir
  brauchen halt hier 2 clients, sind ja eh unterschiedliche netzwerke"
- „wie gesagt wir wollen den alten headscale nur um auf den trading zugriff zu haben, kein zugriff
  auf andere networks von uns, von dem trading server auch kein ssh auf andere server, nur von uns
  auf trading"
- „WIR WOLLEN NUR DEN CLIENT UND HEADSCALE AUF TRADING BEHALTEN, ALLES WAS WIR FÜR SSH BRAUCHEN,
  DEN REST KÖNNEN WIR LÖSCHEN" → LÖSCH-COMMAND unten, **ob er ausgeführt wurde, ist unbekannt**
  (nie vom Operator bestätigt, nie von uns ausgeführt).
- „lass uns einfach den kompletten ordner hier kopieren aber kein node modules und diese ansible
  temp files aber du kannst dein handoff machen am besten auch die session mit rüber nehmen"
- „kannst du uns nen root user erstellen ich will nicht root benutzen / oder haben wir superleo? /
  ah ja pack das alles in den superleo user folder"
- „wieso willst du da kein headscale deployen?" → JA, headscale soll auf superleo (war nur nach
  Docker sequenziert).
- „geht das jetzt mit localhost dass wir nur ein host in ansible haben der local ist?" →
  **JA, Antwort unten im Abschnitt Ansible.**
- Früher in der Session: „bitte vault und worktrees einfach excluden", „keine Daten kopieren, nur
  den Code, was ist da so groß?" (beim leo-Ordner-Rsync von trading).

---

## Zugangswege (alle heute verifiziert)

| Ziel | Befehl | Status |
|---|---|---|
| trading (Host) | `ssh -p 2222 -o UserKnownHostsFile=/tmp/opencode/kh jimesh-operator@127.0.0.1` | ✓ (Tunnel läuft über unseren Container, `sudo -n` passwordless) |
| superleo als User | `ssh superleo@100.127.129.65` (Tailscale-SSH, Key `~/.ssh/id_rsa`) | ✓ Gruppen `sudo,docker`, NOPASSWD |
| superleo als Operator-User | `ssh jimesh-operator@100.127.129.65` | ✓ Gruppen `sudo,docker`, NOPASSWD |
| superleo als root | `ssh root@100.127.129.65` | ✓ läuft, **aber Operator will root nicht nutzen** |
| trading public / Hetzner `88.198.67.200` / `100.113.144.81` / `100.108.133.111` | – | ✗ von hier UND von trading aus nicht erreichbar |

**Identitäten, die nicht angetastet werden dürfen (Aussperrungs-Risiko):**
- superleo Host-Tailscale = `100.127.129.65` im kommerziellen Net `ji-podhead@` (Zugang läuft per
  Tailscale-SSH), `systemctl is-enabled tailscaled` = enabled.
- podhead: `100.104.208.14` (kommerziell), `100.144.252.229` (WLAN 10.144.252.0/24),
  `100.64.0.4` (alter headscale, Container `jimesh-client-tailscaled`).
- trading: `100.64.0.6` (alter headscale, Host-`tailscaled` active, ControlURL
  `https://187.124.2.174:443`), Host-sshd active, User `jimesh-operator` (uid1002, sudo).

---

## Stand: S175 (Hygiene-/Slop-Runde) — **COMMITTED + GEPUSHT** (9dfeb4cd, `main`)

> Update später in der Session: die drei Commits sind raus — `9dfeb4cd` (S175),
> `fe09f88c` (S176 Deploy-Umbau), `54c7847c` (S177 + Backlog) → `a14c7e00..54c7847c main`.

78 Dateien (in `9dfeb4cd` committet), 6 Stashes unberührt (`git stash list`). Verifikation
durch uns (RC erfasst, nicht nur gemeldet):

- `make go-vet` RC=0, `make go-build` RC=0
- `go test ./internal/network/... ./internal/deploy/...` RC=0
- `npx vitest run` → **61 Dateien / 493 Tests passed**, RC=0
- `npm run check:i18n` → **60 Locales / 3305 Keys**, RC=0 (war 3307, −2 tote Keys)
- `npm run lint` → **443 problems (415 errors)** = exakt Baseline
- `npx tsc --noEmit` → 341 Fehler, **alle** tsconfig-Projektconfig (TS6305×335, TS6306/6310,
  TS5101/5107), **kein einziger in einer geänderten Datei** → Claim „0 in geänderten Dateien" hält
- Diffs gelesen und passend: SSE `json.Marshal` (+tote `escapeSSE` raus), `vlan` getrennte
  Statements + 3 Regressionssassertions, `Array.isArray`-Guard, POST/DELETE + entpackte
  `{success,bindings,count}`-Hülle, `deployed-services.ts` gelöszt (0 Referenzen), 0
  `*.test.*.bak` im Tree, Sprint-File + Backlog-Spiegel ehrlich
- **EIN Ehrlichkeitsfehler in der Meldung:** „API_DOCS-Maschinencheck 101/101" stimmt nicht —
  unabhängig nachgezählt: **101 Handler-Pfade, 100 dokumentiert**. Es fehlt
  `GET /openapi.json` (`gateway.go:235`) in `docs/API_DOCS.md`. → VOR dem Commit nachtragen.

Empfehlung: committen (nach `/openapi.json`-Nachtrag). Fragen, nicht eigenmächtig.

---

## Trading: geplanter Aufräum-Command (NICHT ausgeführt, Bestätigung offen)

Zugang braucht davon nur `jimesh-headscale` (Host-`tailscaled` + Host-`sshd` sind keine Container;
`jimesh-operator`-Auth hängt an keinem Container — verifiziert, kein Keycloak-Bezug in `/etc/ssh`):

```bash
sudo docker rm -f \
  jimesh-frontend jimesh-backend jimesh-keycloak jimesh-vault jimesh-redis jimesh-postgres \
  jimesh-traefik jimesh-website jimesh-headscale-client \
  jimesh-siem-dashboard jimesh-siem-indexer jimesh-siem-manager jimesh-siem-falco \
  jimesh-siem-bridge jimesh-tetragon jimesh-prometheus jimesh-grafana \
  jimesh-postgres-exporter jimesh-redis-exporter \
  jimesh-ozone-scm jimesh-ozone-s3g jimesh-ozone-recon jimesh-ozone-datanode jimesh-ozone-om \
  saits-live-ai saits-live-surrealdb saits-live-qdrant \
  signals-service-mainnet engine-trade-processor-mainnet engine-standby-mainnet \
  engine-bridge-mainnet engine-server-mainnet engine-redis-mainnet \
  saits-stats-mainnet saits-logs-mainnet vault
sudo docker image prune -f      # nur dangling, NICHT -a
```

`docker rm` löscht keine Volumes (Postgres/SurrealDB/Vault-Daten bleiben liegen). Nebenwirkung:
unsere lokalen socat-Forwards `8081`→keycloak und `8090`→traefik zeigen danach ins Leere,
`2222`→sshd läuft weiter.

---

## superleo: was in dieser Session angelegt wurde

- **Docker CE 29.8.2 + Compose v5.5.1** (get.docker.com), `systemctl enable --now docker`,
  Gruppe `docker` (gid 973), Rauchtest `alpine-ok`.
- **User `superleo`** (uid1000): Gruppen `sudo,docker`, NOPASSWD in
  `/etc/sudoers.d/superleo`, `~/.ssh/authorized_keys` = unsere `id_rsa.pub`.
- **User `jimesh-operator`** (uid1001): Gruppen `sudo,docker`, NOPASSWD,
  Key eingetragen (war Operator-Wunsch „wie auf trading").
- `visudo -c` = parsed OK; `docker ps` ohne sudo für beide Users geprüft.
- **kein Ansible** installiert (noch), `python3` vorhanden,850G frei, Ubuntu 26.04.1,
  24 Kerne, 30G RAM, WLAN `192.168.178.116`, KEINE 10.x-Adresse.

---

## Umzug des Repos

- Quelle `/home/ji/projects/jimesh` → Ziel **`/home/superleo/jimesh`** (Root-User bewusst nicht
  genutzt; Owner `superleo`).
- Excludes wie befohlen: **`node_modules/`**, **`.ansible-run/`** (ansible Temp + unseren
  tailscale-State NICHT mitnehmen), alles andere inkl. `.git` (330M) und `.env` (13,5K,
  gitignored, braucht das Deploy dort) — über verschlüsselte Tailscale-SSH.
- Größe ohne `node_modules`/`.git`/`.ansible-run`: **2,0G** (`src/` 971M, `docs_dev/` 763M,
  `website/` 130M, `deploy/` 76M).
- **Stand beim Schreiben: Transfer läuft** — danach zwingend ein zweiter kurzer
  `rsync`-Durchlauf für dieses Handoff-File (Datei entstand nach der Listenberechnung) und die
  Verifikation (Dateizahl/Bytes gegen `du -sb` + `rsync --dry-run --stats`).

---

## Nächste Schritte (in dieser Reihenfolge — Reihenfolge IST die Aussperrungssicherheit)

1. Kopie verifizieren, Handoff nachziehen.
2. S175 `/openapi.json` nachtragen → committen (Operator bestätigt).
3. **Prefix-Parameterisierung im Repo**: `deploy/cp/headscale/config.yaml.j2:17-19` ist hart
   `v4: 100.64.0.0/10` / `v6: fd7a:115c:a1e0::/48` → `{{ headscale_prefix_v4 }}`/`{{ headscale_prefix_v6 }}`
   mit Defaults in `deploy/cp/headscale/defaults.yml`, überschreibbar pro Node in `config.yml`;
   `base_domain` (`jimesh.internal`) für die neue Instanz ebenfalls parametrisieren.
4. `config.yml` bekommt eine Node-Zeile für superleo (`headscale: true`, `host: ${VAR}`,
   `user: ${VAR}`, `public_ip: ${VAR}`, `headscale_port: ${VAR}`) + die `VAR`s in `.env`.
5. Superleo-Provisionierung/`make redeploy SERVICE=cp/headscale NODE=<superleo>`.
6. Zweiter Client-Container hier (State getrennt, `--login-server=https://100.127.129.65:443`
   über das bestehende kommerzielle Tailnet → kein Chicken-Egg, kein öffentlicher Port).
7. Gleichzeitigkeitstest: alter Tailnet-Node UND neuer gleichzeitig pingbar.

**Drei harten Aussperrungs-Regeln:**
1. **Alten headscale nicht anfassen** (kein Config-Change, kein Restart, kein `rm`) → Regelauftrag
   „nicht aus dem headscale-tailnet vom alten aussperren" erfüllt sich dadurch von selbst.
2. **Superleos Host-Tailscale nie anfassen** (kein Host-Level-`headscale-client`-Role, kein
   `tailscale up --reset`) — die neue Identität ausschließlich als isolierter Container
   (`headscale-client-container`-Muster / `client-join.sh`), weil ein `--network host`-Versuch am
   16.9. live die Routing-Regeln der Primärverbindung zerstört hat.
3. **Neuer Adresspool `10.80.0.0/16`** — außerhalb von CGNAT `100.64.0.0/10` (damit kann weder
   der alte headscale mit `100.64.0.1–6` noch das kommerzielle `100.104.208.14`/`100.127.129.65`
   kollidieren) und außerhalb `10.144.252.0/24` (unser WLAN). Prüfung: superleo hat keine
   10.x-Adresse, wir `10.144.252.0/24` → `10.80/16` ist frei. **Nicht** den Default `/10`
   übernehmen, das wäre genau das Aussperrungs-Szenario.

---

## Ansible mit nur EINEM local-Host — JA

`config.yml` kann auf superleo genau eine Zeile haben mit `ansible_connection=local`
(exakt das Muster, das die bestehende `client`-Zeile schon dokumentiert: „this desktop
itself"). Dann ist superleo zugleich Controller und Ziel, kein SSH nötig, `make redeploy
SERVICE=… NODE=<diese Zeile>` läuft lokal. Voraussetzungen: `ansible-playbook` + `python3` auf
superleo (beides fehlt noch, nur `python3` ist da) und der `ansible-runner`-Container entfällt
bzw. läuft auch lokal. **Wichtig:** Checkout-Pfad (`/home/superleo/jimesh`) und
`jimesh_deploy_root` (Default `/opt/jimesh`) müssen VERSCHIEDENE Pfade bleiben, sonst kopiert
das Role-Staging auf sich selbst.

---

## Bewusst offen (Mandat 6 — nicht verifiziert / nicht gemacht)

- ~~S175 nicht committet~~ → **erledigt, gepusht** (`9dfeb4cd`), `/openapi.json`-Doku fehlt
  nicht mehr (Nachtrag in `docs/API_DOCS.md`, Routencheck 106/106).
- Ob der trading-Aufräum-Command ausgeführt wurde: **unbekannt**.
- Live-Bestätigung der S175-Änderungen (Bindings-POST, SSE-Stream, VLAN-Provisionierung am echten
  Node) — braucht laufenden Stack.
- S167-Phase-2, S159-Live-E2E, Git-History-Scrub, die 6 Stashes (nur gemeldet, nicht angerührt),
  oteltrace-OTLP, `capabilities.rego`.
- `/root/leo`-Löschung auf trading: Rsync **erfolgreich verifiziert** (41.920 Dateien,
  1.137.000.916 Bytes, Dry-Run „0 bytes to transfer"), **Löschung nie freigegeben** — offen.
- `grodt-v4 leo` und `/home/saits/saitstrader` wurden nur angeboten, **nicht** kopiert.
- 2. tailscaled-Container auf podhead existiert noch NICHT (kommt mit Schritt 6).

---

## Update am Ende der Sitzung (1.10.2026, später)

**Commits raus (`a14c7e00..54c7847c`, `main`, `git push` RC=0):**

| Commit | Inhalt |
|---|---|
| `9dfeb4cd` | S175 Hygiene-/Slop-Runde (77 Dateien) + `/openapi.json`-Doku-Nachtrag |
| `fe09f88c` | S176 Deploy-Umbau: `conn`-Schalter, superleo-Node, Prefix-/Domain-Overrides, `client-join.sh` |
| `54c7847c` | S177 Paranoia-Level-Recherche (`docs/research/`, SPRINT-177) + Backlog-Mirror + `.gitignore` |

**Repo-Kopie nach superleo — fertig und verifiziert:** 2.352.359.269 Bytes / 53.172 Dateien
(`node_modules/`, `.ansible-run/` ausgenommen), Delta-Lauf 152 Dateien nachgezogen,
Endverifikation per `rsync --dry-run --stats`: **0 zu übertragen** → Ziel ist byte-identisch.
Ziel: `/home/superleo/jimesh`.

**S176 WP5/WP6 nachgezogen:** `client-join.sh`-Lückenliste im Sprint-File (5 Stück), Makefile
`client2-*`-Ziele, `.env`/`.env.example` mit `SUPERLEO_*` + `HEADSCALE2_*`, `make render-inventory`
→ `3 node(s), 0 skipped` und superleo-Zeile vollständig (trading unverändert).

**VS Code → superleo:** Funktioniert nach dem Fix (s. unten), **kein Neustart nötig**:
`code --remote ssh-remote+superleo /home/superleo/jimesh`. Ursache der „Timeout"-Phase war
nicht die Extension, sondern unsere eigene 2,35-GB-Kopie, die die Leitung gesättigt hat.

**Antwort auf „kann ich deployen da?" — NOCH NICHT, drei echte Blocker:**

1. Auf superleo fehlt der Ansible-Stack (`ansible-playbook` und das runner-Image) →
   dort `make ansible-runner-build` ausführen.
2. `HEADSCALE2_PREAUTH_KEY` in `.env` ist **bewusst leer** → auf superleo erzeugen
   (`headscale preauthkeys create …`), Wert eintragen.
3. CA für Client2 existiert erst, NACHDEM der headscale auf superleo läuft →
   `make client2-ca-fetch`.

Danach, in dieser Reihenfolge: von podhead `make redeploy SERVICE=cp/headscale NODE=superleo`
(`SUPERLEO_CONN=ssh` steht) → Preauth-Key → `make client2-ca-fetch` → `make client2-join` →
Gleichzeitigkeitstest alt+neu. **Keiner dieser Schritte wurde ausgeführt** (Mandat 6).

**Neu angelegt:** `docs/sprints/SPRINT-178-SAFE-LOCAL-LLM-CHATBOT.md` — Operator-Order
verbatim (Tutario-Abmahnung → Chatbot-Neuentwurf, Local-LLM ohne offene Ports, Vercel-Subpage
mit eigener `robots.txt`, Cloudflare als einziger öffentlicher Pfad, JWT-TTL-Rate-Limit ohne
Server-Speicher, HMAC-IP im CRM-Format, Safety-Gate + algorithmischer Grauzonen-Chatbot).
Nur Plan, 6 offene Entscheidungen brauchen den Operator.
