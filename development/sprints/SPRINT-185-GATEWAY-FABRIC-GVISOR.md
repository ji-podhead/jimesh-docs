# SPRINT-185 — Gateway-Fabric, gVisor-Segmentierung, Threat-Sensoren

> **Status:** PLAN — nichts davon gebaut. **Sprint-Nummer 185 ist vorgeschlagen, vom Operator
> noch nicht bestätigt.** Stand 4.10.2026.
>
> **Quellen:** `docs_dev/sprints/gvisor_goland_gateway_firewall.md` (KI-Chat-Export, Technik-Recherche)
> + die Operator-Anforderungen aus der Plan-Runde 4.10.
>
> **Dieses Dokument ist die einzige Speicherung dieser Anforderungen** — der Plan wurde vorher
> nur in der Konversation geführt, nirgends auf Platte. Deshalb steht unten bei O-1…O-11 auch
> ehrlich, was wörtlich belegt ist und was nicht.

---

## 0. Was dieses Sprint NICHT ist

| | |
|---|---|
| Kein Deploy | Ich deploye nichts. `make up`/`make redeploy` laufen ausschließlich über den superleo-Session-Pfad. |
| Kein TLS | **O-12:** der Operator hat ausdrücklich gesagt, dass fehlendes HTTPS egal ist — **keine TLS-Arbeit einplanen.** |
| Kein Rollback bestehender Sensoren | **E-2:** Falco, seccheck, Suricata und Tetragon laufen **parallel**, keiner wird entfernt. |
| Kein `gateway.go`-Umbau | Die Routen `456-458` (`/api/projects/{id}/dns`) und `registerProjectTerminal` (`:460`) bleiben unberührt. (Zeilenstand nach Rebase auf `1e9bec7c` — vorher 455-457/459, `s181-12` hat `gateway.go` um eine Zeile geschoben.) |
| Kein `src/scripts/checkov-preflight.sh` | S180-1b ist in `c72b102d` gefixt und läuft (RC=0) — nicht anfassen. |
| Kein `squadmesh/` | Andere Session, untracked, unantastbar. |

---

## 1. Operator-Anforderungen

### 1.1 Wörtlich belegt (Quelle vorhanden)

- **O-12 — HTTPS nicht relevant.** Operator wörtlich: **„https fehlt aber scheissdrauf"**
  → daraus folgt: **kein TLS-Workpackage**, kein Zertifikats-Aufwand, kein Ingress-TLS in diesem Sprint.

- **E-2-Umformulierung — keine Aussonderung, alles parallel.** Operator wörtlich:
  **„kannst doch beides benutzen"** und **„suricata haben wir auch"**
  → daraus folgt die Revision von E-2 (Abschnitt 4): statt Falco zu entfernen laufen **Falco +
  seccheck + Suricata + Tetragon gleichzeitig**; seccheck ist ein **zweiter additiver Sink**,
  nicht der Ersatz.

- **Freigabe zum Ausführen.** Operator wörtlich: **„ok go"** — auf den Plan, der die Phasen
  0.1 / S184-11 / S184-8 / Doku und die Commits auf getrennten Pfaden enthielt.

### 1.2 Sinngemäß — **Wortlaut offen (TODO Operator)**

> ⚠️ **Diese elf Punkte waren in der Plan-Runde 4.10. formuliert, aber nie auf Platte gespeichert**
> (kein Plan-Doc, keine Session-Logs davon — `docs_dev/sprints/subagents/*.jsonl` sind vom 6.9.
> und enthalten nichts davon). Unten steht daher die **Paraphrase**, kein Zitat.
> **Der Operator trägt den Wortlaut nach; bis dahin darf nichts davon als Zitat behandelt werden.**

| Nr. | Sinngemäße Anforderung | Wortlaut |
|---|---|---|
| O-1 | OPNsense wird nicht mehr benutzt — die Firewall-Aufgabe fällt ins eigene Gateway zurück. | `[Zitat-TODO]` |
| O-2 | Gateway und NAT gehören in die eigene Lösung, nicht in ein externes Produkt. | `[Zitat-TODO]` |
| O-3 | Der Host ist vom Projekt aus nicht erreichbar — das soll so bleiben (Isolation nach außen). | `[Zitat-TODO]` |
| O-4 | Wir bauen es selbst, kein Fertigprodukt. | `[Zitat-TODO]` |
| O-5 | **Schemas zuerst** — erst die Datenverträge, dann die Implementierung. | `[Zitat-TODO]` |
| O-6 | Vorhandenes darf gesalvaget werden, was brauchbar ist, wird übernommen. | `[Zitat-TODO]` |
| O-7 | Frontend im shadcn-/bestehenden Stil. | `[Zitat-TODO]` |
| O-8 | Operator-Zitate sind **verbatim** zu dokumentieren (gilt auch für dieses Dokument — daher die Trennung in 1.1/1.2). | `[Zitat-TODO]` |
| O-9 | *(Nachtrag, Inhalt offen)* | `[Zitat-TODO]` |
| O-10 | *(Nachtrag, Inhalt offen)* | `[Zitat-TODO]` |
| O-11 | *(Nachtrag, Inhalt offen)* | `[Zitat-TODO]` |

---

## 2. Befund Ist (4.10., gegen `origin/main` verifiziert)

### 2.1 Was die Isolation heute trägt

- **Mandat 12** (wörtlich, `docs/sprints/SPRINT-144-REALTIME-THREAT-PROTECTION.md:38`):
  **„JiMesh schreibt NIE Host-Firewall-Regeln (ufw/iptables) — die Isolation ist container-scoped
  via Docker; eBPF-XDP-Drop auf dem veth ist eine spätere v2-Optimierung."**
- **`ufwRule` ist komplett raus.** TASK-063 hat das Feld aus dem `DeployRequest` entfernt
  (`docs/API_DOCS.md:1255`) und `grep -rn 'ufwRule' src/backend/` = **0 Treffer**.
  Es gibt also **keinen** Pfad mehr, der Host-Firewall-Regeln schreibt — genau das ist die Lücke,
  die dieses Sprint schließt (unter neuem Mandat, siehe E-1).
- **Sensoren laufen, sind aber nicht am Fabric gekoppelt:**
  Falco/gVisor (`deploy/falco-gvisor-integration/defaults.yml:75` → `falco_gvisor_runtime_name:
  "runsc-falco"`), Suricata (`deploy/suricata-network-ids`), threat-responder
  (`deploy/threat-responder`), Tetragon (`deploy/tetragon`).

### 2.2 Was im Code schon existiert (Salvage-Basis)

| Baustein | Fundstelle | Stand |
|---|---|---|
| Firewall-Provider/Regeln (container-scoped) | `src/backend/internal/security/firewall.go` (16 KB), `firewall_provider.go` (16 KB), `firewall_rules.go` (10 KB), plus Tests | existiert |
| Router-Firewall | `src/backend/cmd/jimesh-router/firewall.go` (29 KB) | existiert |
| Egress-Regeln in Go | `src/backend/internal/network/egress.go` | existiert |
| VLAN/Scope-Netze | `src/backend/internal/network/vlan.go:123-144` (`VLANSubnetForID` — Deterministische /24 in 172.16.0.0/12) | existiert |
| Schemagrundlage | `src/backend/internal/domain/schema/{networking.go,network_ownership.go}` + `src/backend/internal/store/store.go:766-767` (`network_mode`, `enable_nat INTEGER DEFAULT 1`), `:1882` (`type ProjectRow`), `:1921` (`UpsertProject`) | existiert |
| **`google/nftables`** | `src/backend/go.mod` | **fehlt** |
| **`domain/schema/{fabric,firewall,egress}.go`** | `src/backend/internal/domain/schema/` | **fehlen** (nur networking/network_ownership/plugins vorhanden) |

### 2.3 Die zwei Lücken, die den Sprint definieren

1. **Filter-Ebene ohne Host-Regeln:** alles Isolierende läuft in Containern/Docker-Netzen;
   auf dem Host gibt es keinen einzigen Ort, an den wir eine Sperre schreiben dürfen/donnen.
2. **Fabric-Bridge blind für Suricata:** `deploy/threat-responder/ansible-task.yml` ist
   **gated** (`:8-11`: „NICHT Teil des deploy-all-Loops, nicht in deploy-service.yml registriert —
   einmal pro Node VON HAND") und leitet die Capture-Brücke aus **einem** Netz ab:
   `threat_responder_docker_network` → `_jimesh_bridge = br-<id[:12]>` (`:123`), mit **hard fail**,
   wenn das Netz fehlt (`:112-115`). Ein neu erzeugtes `jimesh-net-<scope>`-Fabric-Netz ist von
   dieser Stelle aus **unsichtbar** → P1 muss die Registrierung mitliefern (Abschnitt 8).

---

## 3. Zielarchitektur

```
Projekt-Container (runsc / runsc-falco)
        │  Scope-Netz  --internal   (kein NAT nach außen als Default)
        ▼
   [Gateway, mehrfach-homed] ── jimesh-egress ──► Host / WAN
        │
        │  schreibt (NEUES Mandat, E-1):
        ▼
   table inet jimesh_fabric   (Host, nur dieser Dienst)
        ├── Filter-Ebene:  ngrok/firewall_toolkit  (pkg/rule, pkg/set, pkg/expressions)
        └── NAT-Ebene:     google/nftables direkt  (TableTypeNAT)   ← Toolkit kann kein NAT
```

Entscheidend:

- **Scope-Netze kommen mit `--internal`** → kein Weg nach außen, solange nicht explizit erlaubt
  (E-3: Default-Flip).
- **Das Gateway ist mehrfach-homed** (Projekt-Side + `jimesh-egress`-Side) und ist damit die
  einzige Stelle, die beiden Welten kennt — genau dort gehört die Policy hin, nicht im Host-Stack
  und nicht in jedem Container.
- **`table inet jimesh_fabric`** ist eine **eigene** Tabelle, separat von den bestehenden
  Docker-/Masquerade-Tabellen — Wiederherstellung ohne Reibung mit Docker-Regeln.

---

## 4. Bestätigte Entscheidungen (E-1…E-4)

| Nr. | Entscheidung | Status |
|---|---|---|
| **E-1** | **Neues Mandat:** Der Gateway-/Fabric-Dienst darf Host-Regeln in `table inet jimesh_fabric` schreiben. **Mandat 12 bleibt** uneingeschränkt für den Projekt-Deployer (`POST /api/workspaces/deploy` etc.) — der schreibt weiterhin nie ufw/iptables. | bestätigt (Operator) |
| **E-2** *(revidiert)* | **Kein Rückbau.** Falco + seccheck + Suricata + Tetragon laufen **parallel**. seccheck wird als **zweiter additiver Sink** neben Falco eingebunden (Quelle: Operator „kannst doch beides benutzen" / „suricata haben wir auch"). Falco bleibt auch für `runsc` bestehen. | bestätigt, revidiert |
| **E-3** | `enable_nat`-Default **1 → 0** (Scope-Netze sind `--internal`). Bestehende Projekte werden **nicht** migriert — nur gewarnt. | bestätigt (Operator) |
| **E-4** | **Sprintumfang = P0 Schemas + P1 Fabric + P2 gVisor.** P3/P4/P5 werden nur angelegt/dokumentiert, nicht gebaut. | bestätigt (Operator) |

---

## 5. Umfang P0…P5

| Phase | Inhalt | In diesem Sprint? |
|---|---|---|
| **P0** | **Schemas zuerst** (O-5): `src/backend/internal/domain/schema/fabric.go`, `firewall.go`, `egress.go` mit `NetworkScope`, `FirewallRule`, `EgressPolicy`, `ThreatEvent`, `DataplaneState` — inkl. Felder, die P1 und P2 beide brauchen. | **ja** |
| **P1** | **Fabric:** `table inet jimesh_fabric` auf dem Host, Scope-Netze `--internal`, Gateway mehrfach-homed, NAT-Ebene über `google/nftables`, **Suricata-Brückenregistrierung** (Pflicht, Abschnitt 8). | **ja** |
| **P2** | **gVisor:** seccheck als zweiter additive Sink neben Falco (`E-2`), `pod-init.json`-Post-Prozess. | **ja** |
| **P3…P5** | Aus dem ursprünglichen Plan skizziert — **nur angelegt**, nicht detailliert und nicht gebaut, bis der Operator Sprint-Nummer und Wellenreihenfolge festlegt (Abschnitt 12). Jeglicher „Falco-Entfernen"-Teil aus der **vor** E-2-Skizze ist **hinfällig** (E-2 verbietet Rückbau). | nein — nur Dokumentation |

---

## 6. Workpackages

### WP1 — Schemas (P0)

Neu, ohne Nebenwirkungen auf bestehenden Code (rein additive Dateien unter `internal/domain/schema/`):

- `fabric.go` — `NetworkScope` (Name, Subnet, Driver, `Internal bool`, Parent/Scope-Herleitung analog
  `network/vlan.go:123-144`), `DataplaneState` (Tabelle, Generation, letzter Fehler).
- `firewall.go` — `FirewallRule` (Proto, Ports, CIDR/Scope, Aktion, Quelle = Fabric- oder Projekt-Ebene).
- `egress.go` — `EgressPolicy` (Ziele, NAT-Erlaubnis, Default-Deny).

**Verifikation:** `go vet ./...`, `go build ./...`, `go test ./...` — nichts vorhandenes darf sich ändern,
weil nur neue Dateien dazukommen.

### WP2 — Fabric (P1)

- `google/nftables` in `src/backend/go.mod` aufnehmen (fehlt, Abschnitt 2.2).
- Host-Tabelle `table inet jimesh_fabric` anlegen und aus `DataplaneState` speisen;
  **Filter-Ebene** über `ngrok/firewall_toolkit` (`pkg/rule`, `pkg/set`, `pkg/expressions`),
  **NAT-Ebene** direkt über `google/nftables` (`TableTypeNAT`) — das Toolkit deckt die NAT-Ebene
  nicht ab (Abschnitt 9).
- Scope-Netze `--internal`; `enable_nat`-Default `1 → 0` (E-3), Bestand nur warnen.
- Gateway mehrfach-homed (Projekt-Side + `jimesh-egress`).
- **Suricata-/threat-responder-Brückenregistrierung** für jede erzeugte `jimesh-net-*`-Brücke
  (Abschnitt 8 — ohne das ist P1 eine Blindstelle).

### WP3 — gVisor / seccheck (P2)

- seccheck als **zweiter additiver Sink** neben Falco (E-2), nachgebaut aus der Recherche in
  Abschnitt 9.2. Falco bleibt bestehen, `runsc-falco` bleibt die preferierte Runtime
  (`deploy/falco-gvisor-integration/defaults.yml:75`).
- `pod-init.json` wird von Falco erzeugt → der zweite Sink wird per **Post-Prozess** angehängt,
  nicht von Hand editiert.

---

## 7. Frontend

Im bestehenden shadcn-/Komponenten-Stil (O-7), eingebunden in die vorhandenen Netzwerk- und
Security-Flächen — kein neues Designsystem, keine neuen Abhängigkeiten ohne Absprache.
Kopiert die Wire-Shape-Sorgfalt aus `ProjectDNSCard.tsx` („`persisted=false` ist der berechnete
Default, nicht eine gespeicherte Zeile"): **nie behaupten, was nicht gemessen wurde.**

---

## 8. Suricata × Fabric — Kopplung ist P1-Pflicht (nach E-2)

E-2 verlangt, dass Suricata **mitläuft**. Damit ist die Brückenregistrierung kein Nice-to-have:

- `deploy/suricata-network-ids` und `deploy/threat-responder` sind **gated** — nicht in
  `deploy-all`, **nicht in `deploy-service.yml` registriert** (so der eigene Kommentar:
  `deploy/threat-responder/ansible-task.yml:9`; dasselbe steht in
  `deploy/suricata-network-ids/README.md:4`), nur von Hand:
  `make redeploy SERVICE=threat-responder NODE=<name>` (`ansible-task.yml:11`).
- threat-responder löst die Capture-Brücke **statisch** aus EINEM Netznamen ab
  (`ansible-task.yml:105-127`, `_jimesh_bridge = br-<id[:12]>`) und **failt hart**, wenn es fehlt.
- Suricata capturet Docker-Bridges per af-packet.

**Konsequenz für WP2:** Jedes im Fabric erzeugte `jimesh-net-<scope>`-Netz muss **automatisch**
in die Liste dessen einfließen, was Suricata/threat-responder capturet. Ohne diesen Schritt ist
jedes neue Fabric-Segment eine **stille Blindstelle** — Alerts können von dort schlicht nicht kommen,
und das „grün"-Melden eines Deploys würde eine Lücke verschweigen (Mandat 2: kein grünes Deploy
ohne echten Beweis).

---

## 9. Externe Bausteine (Recherche-Ergebnis 4.10.)

### 9.1 `ngrok/firewall_toolkit` — nur Filter-Ebene

- Enthält `pkg/rule`, `pkg/set`, `pkg/expressions`, `pkg/xtables`.
- **Kein NAT-Helfer** → NAT-Ebene wird direkt über `google/nftables` gebaut (`TableTypeNAT`).
- `pkg/xtables` brauchen wir **nicht** (es funktioniert in Docker-Containern ohnehin nicht;
  WP2 arbeitet auf dem Host, aber über die reine Filter-Abstraktion).

### 9.2 gVisor `seccheck` — Multi-Sink ist vorgesehen

- Server-Seite: `gvisor.dev/gvisor/pkg/sentry/seccheck/sinks/remote/server` →
  `CommonServer{Endpoint}` mit `Init(path, handler)` / `Start()` / `WaitForNoClients()`.
- Wire: `.../sinks/remote/wire`; Points: `pkg/sentry/seccheck/points`.
- **`SessionConfig.Sinks []SinkConfig` ist ein Slice** → mehrere Sinks sind vom Typ her vorgesehen;
  `config.go` iteriert `for _, sinkConfig := range conf.Sinks { state.AppendSink(sink, reqs) }`,
  zusätzlich `ignore_setup_error`. Es gibt nur **eine** Session (`Default`).
- `pod-init.json` entsteht per `falco --gvisor-generate-config=<endpoint>` → der seccheck-Sink
  wird danach als **zweiter Eintrag ergänzt** (Post-Prozess), Falco-Sink bleibt unverändert.

---

## 10. Mandate, die gelten

- **Mandat 2:** kein grünes Deploy ohne echten Beweis — Verifikationsbefehel laufen, Ergebnis wird
  mitgeschrieben, auch wenn es rot ist.
- **Mandat 12** (`SPRINT-144-REALTIME-THREAT-PROTECTION.md:38`): der **Projekt-Deployer** schreibt
  **nie** Host-Firewall-Regeln. **E-1 erweitert das NICHT für ihn** — nur der eigene
  Gateway-/Fabric-Dienst darf `table inet jimesh_fabric` schreiben.
- **Kein `git add -A`**, `.env`/`config.yml` nie staged, kein Lock-File, kein force/stash/revert.
- **Kein Deploy** durch diese Session.

---

## 11. Verifikation (jede Phase, gleiche Reihenfolge)

```
make go-vet          # oder: go vet ./...      → RC=0
make go-build                                  → RC=0
go test ./...                                   → 0 FAIL (braucht Postgres: siehe Hinweis)
bash -n  <alle geänderten *.sh>                 → RC=0
npm run lint            # Baseline 443/415     → nicht darüber hinaus wachsen
npx tsc --noEmit                               → 0 Fehler
npm run check:i18n                             → grün
```

**Hinweis `make go-test`:** das Target legt die Test-DB per `docker exec jimesh-postgres psql` an
(`Makefile:135` — „needs stack up"). Ohne laufenden Stack scheitert es mit RC=2 **ohne einen
einzigen `--- FAIL`** (reiner Infrastruktur-Fehler) — dann nicht als Testfehlert lesen. Für reine
Paket-Tests ohne Stack: `go test ./internal/<paket>/` (Tests, die eine DB brauchen, skippen ehrlich
mit `no reachable postgres`).

**Go-Werkzeug lokal:** `/tmp/opencode/gotoolchain/go/bin/go` = go1.27.1 (go.mod will 1.26.0),
Modul `src/backend`, `squadmesh/go.mod` unantastbar, CI testet kein Go.

---

## 12. Offene Operator-Entscheidungen (diese Sitzung nicht selbst zu treffen)

| # | Frage | Vorschlag |
|---|---|---|
| 1 | **Sprint-Nummer** | `185` (dieses Doc ist so benannt, aber **nicht bestätigt**) |
| 2 | **Wellenreihenfolge W1…W9** („Alles bauen", 183 offene Backlog-Zeilen) | offen — **gestoppt** |
| 3 | **gh-Weg A/B/C** (offizielles Binary / frisches PAT / nur git) | offen — `gh` ist doppelt blockiert: snap darf DNS nicht (`write udp 127.0.0.1:53 … permission denied`) **und** beide Tokens in `~/snap/gh/640/.config/gh/hosts.yml` (Stand 10.06.2026) sind invalid; `git fetch` funktioniert dagegen |
| 4 | `S177-8`, `S178`, `S180-9`, `S180-16`, `#6`, `RM35-10` | offen |
| 5 | O-1…O-11 **Wortlaut** nachtragen (Abschnitt 1.2) | offen |

**Zusammenarbeit:** superleo deployed und mergt (`curl` + `git credential fill`, Token nie im Argv),
eigene Commits laufen auf getrennten Pfaden direkt auf `main`.

---

## 13. Stand 4.10. — was bereits erledigt wurde

Gehört zu den Phasen, die der Operator mit „ok go" freigegeben hat:

| Phase | Ergebnis |
|---|---|
| 0.1 Sync | `main` auf `c72b102d`, PR-#14-Zweig `fix/s184-service-key-path-slash` gelöscht (Inhalt lag als Squash `4be2614e` auf main) |
| S184-11 | 5 rote Tests gefixt — an **6** Stellen in `internal/gateway/dns_test.go` fehlte `req.SetPathValue("id", …)`. **VORHER** (Datei von `origin/main`, Stand `1e9bec7c` = vor meinem Fix) exakt **5 FAIL** an `dns_test.go:51/109/232/265/289` mit `400 project id required` → **NACHHER RC=0, 0 FAIL / 11 PASS**; `go vet ./...` + `go build ./...` RC=0. Der 6. Test (`Put_InvalidLabel`) fiel vorher **zum Grund 177 falsch** durch. Commits `3d0552f6`, gepusht |
| S184-8 | `docs/API_DOCS.md:1263-1265` (GET/PUT/DELETE inkl. `persisted=false`-Default, 404-läuft-vor-405, `validDNSLabel`, idempotentes DELETE) + Backlog-Zeile auf `[x]` (SSOT: offen 184 → **183**). Commit `6b7c744d`, gepusht |

**Befund-Korrektur für S184-8:** das Frontend sendet **GET/PUT/DELETE**
(`ProjectDNSCard.tsx:47/71/86`), **nicht** POST — die Backlog-Zeile von 08:57 behauptete POST.
Es gab nie einen Methodenkonflikt.
