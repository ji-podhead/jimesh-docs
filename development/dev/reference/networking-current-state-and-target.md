# JiMesh Dev-Stack Networking: Ist-Zustand, Problem, Ziel-Architektur

**Status:** Analyse-Dokument, keine Befehle ausgeführt. Geschrieben nach einem laufenden Incident (15.9.2026) — Dev-Stack seit Stunden ohne Postgres-Konnektivität. Bewusst gestoppt, bevor weitere `iptables`/`sysctl`-Änderungen versucht wurden, weil das Risiko bestand, SSH/Tailscale-Zugriff auf den Host zu verlieren.

---

## 1. Ist-Zustand (was gerade real existiert, verifiziert)

```
                    ┌─────────────────────────────────────────────┐
                    │                  HOST                        │
                    │                                               │
   Internet ────────┤  ts-forward Chain (Tailscale, tailscale0)    │
                    │  ├─ MARK/ACCEPT für Tailscale-eigenen Traffic│
                    │  └─ 100.64.0.0/10 Subnetz-Regeln             │
                    │                                               │
                    │  iptables FORWARD Chain: policy DROP          │
                    │  ├─ DOCKER-USER   (leer, Docker's eigene     │
                    │  │                 "füg hier eigene Regeln   │
                    │  │                 ein"-Chain)                │
                    │  ├─ DOCKER-FORWARD                            │
                    │  │   ├─ DOCKER-CT / DOCKER-INTERNAL /        │
                    │  │   │   DOCKER-BRIDGE (Docker-interne        │
                    │  │   │   Sub-Chains)                          │
                    │  │   └─ ACCEPT nur für Interface `docker0`   │
                    │  │       (der DEFAULT-Bridge — NICHT unsere  │
                    │  │       Compose-Netze!)                     │
                    │  └─ ts-forward (s.o.)                        │
                    │                                               │
                    │  iptables nat OUTPUT/DOCKER Chain:            │
                    │  ├─ nur 2 DNAT-Regeln vorhanden:              │
                    │  │   dpt:19092 → 172.20.0.13:3009 (Backend)  │
                    │  │   dpt:19091 → 172.20.0.13:3010 (Backend)  │
                    │  └─ KEINE Regel für 5432 (Postgres) —        │
                    │      trotz `docker compose up --force-       │
                    │      recreate postgres`                       │
                    │                                               │
                    │  sysctl net.ipv4.conf.*.route_localnet = 0   │
                    │  (verhindert Routing von 127.0.0.1-Zielen    │
                    │   nach NAT-Umschreibung auf andere IPs)       │
                    │                                               │
                    │  ┌─────────────────────────────────────┐    │
                    │  │  Docker Bridge-Netz jimesh_jimesh-net │    │
                    │  │  (172.20.0.0/16, Interface             │    │
                    │  │   br-4432114f55cd)                     │    │
                    │  │                                         │    │
                    │  │  ┌──────────┐  ┌──────────┐  ┌───────┐ │    │
                    │  │  │ postgres │  │  redis   │  │backend│ │    │
                    │  │  │.10:5432  │  │  :6379   │  │.13    │ │    │
                    │  │  └──────────┘  └──────────┘  └───────┘ │    │
                    │  │  + vault, keycloak, siem-*, frontend   │    │
                    │  └─────────────────────────────────────┘    │
                    └─────────────────────────────────────────────┘
```

### Bekannte, verifizierte Fakten (jeweils per Kommando bestätigt, nicht vermutet)

| Fakt | Beleg |
|---|---|
| `FORWARD`-Chain hat `policy DROP` | `sudo iptables -L FORWARD -n -v` |
| `DOCKER-USER` ist leer (0 Regeln) | `sudo iptables -L DOCKER-USER -n -v` |
| `DOCKER-FORWARD`'s einzige explizite ACCEPT gilt nur für `docker0` (Default-Bridge), nicht für unser Compose-Netz | `sudo iptables -L DOCKER-FORWARD -n -v` — 0 Pakete auf dieser Regel |
| `ts-forward` (Tailscale) hat eigene, unabhängige Regeln — nicht betroffen von unseren Docker-Fixes | `sudo iptables -L ts-forward -n -v` |
| `net.ipv4.ip_forward = 1` (IP-Forwarding grundsätzlich an) | `sysctl net.ipv4.ip_forward` |
| `net.ipv4.conf.{all,docker0,br-4432114f55cd}.route_localnet = 0` | `sysctl net.ipv4.conf.*.route_localnet` |
| `nat`-Tabelle `DOCKER`-Chain hat NUR 2 Regeln (Backend-Ports), keine für Postgres (5432) | `sudo iptables -t nat -L DOCKER -n -v --line-numbers` |
| Container-zu-Container (Backend→Postgres intern, `172.20.0.13→172.20.0.10:5432`) funktioniert wieder, NACHDEM `DOCKER-USER`-ACCEPT-Regeln für `172.20.0.0/16` eingefügt wurden | Backend-Healthcheck von innen: `{"status":"ok"}` |
| Host→published-Port (`127.0.0.1:5432`, `127.0.0.1:19092`) funktioniert weiterhin NICHT | Mehrfach mit `curl`/`/dev/tcp` getestet, durchgehend Timeout |

### Was das bedeutet

Es gibt **zwei separate, ungelöste Probleme**, keins davon vollständig gefixt:

1. **Container-zu-Container-Routing** — durch die manuell eingefügten `DOCKER-USER`-ACCEPT-Regeln für `172.20.0.0/16` (Quelle **und** Ziel) inzwischen wieder funktionsfähig. Das war der erste, erfolgreich behobene Teil.
2. **Host-zu-published-Port-Routing** (`127.0.0.1:5432`, `127.0.0.1:19092` vom Host aus erreichen) — weiterhin kaputt. Zwei Verdachtsmomente, beide nicht abschließend verifiziert:
   - `route_localnet=0` auf den relevanten Interfaces (ein Fix-Versuch auf `br-4432114f55cd` brachte keine Besserung — evtl. war das nicht das einzige betroffene Interface, oder es reicht allein nicht aus)
   - Für Postgres fehlt die DNAT-Regel in der `nat`-Tabelle komplett — unklar, ob das an der `docker-compose.yml`-Portdeklaration selbst liegt oder an einem Docker-internen Fehler beim Neuschreiben der Regeln unter der aktuellen (gehärteten) Firewall-Ausgangslage.

**Wichtig:** Keine der bisherigen Änderungen hat `ts-forward` (Tailscale) angefasst. SSH/Tailscale-Fernzugriff sollte technisch nicht betroffen sein — aber das wurde bewusst nicht durch weitere Experimente auf die Probe gestellt, nachdem die Situation unübersichtlich wurde. Das ist der richtige Punkt zum Stoppen gewesen.

---

## 2. Ziel-Architektur (Vorschlag, NICHT umgesetzt)

Die im Gespräch geäußerte Zielrichtung: **ein einziger Gateway/Reverse-Proxy als einziger Punkt mit echtem Port-Publishing**, alles andere intern, VLANs statt Docker-Default-Bridges für produktive Agent-Workspaces, gVisor-Netstack für Sandbox-internen Traffic.

```
Internet / Tailscale
        │
        ▼
┌───────────────────┐
│  Reverse Proxy     │  ← EINZIGER Container mit published Ports
│  (z.B. Traefik)    │     (z.B. 443, ggf. 80→443-Redirect)
└─────────┬──────────┘
          │  internes Docker-Netz, KEINE direkten Port-Publishes
          │  mehr bei den einzelnen Services
    ┌─────┴──────────────────────────────────────┐
    │                                              │
┌───▼────┐  ┌────────┐  ┌────────┐  ┌─────────┐ ┌▼────────┐
│Backend │  │Postgres│  │ Redis  │  │  Vault  │ │Frontend │
│(intern)│  │(intern)│  │(intern)│  │(intern) │ │(intern) │
└────────┘  └────────┘  └────────┘  └─────────┘ └─────────┘

Separat, für PRODUKTIVE Agent-Workspaces (nicht diesen Dev-Stack):
┌────────────────────────────────────────────────┐
│  Pro-Projekt-VLAN (macvlan/ipvlan)              │
│  ┌────────────────────────────────────────┐    │
│  │  gVisor-Sandbox (runsc)                  │    │
│  │  eigener Netstack (Sentry) — Traffic     │    │
│  │  wird INNERHALB der Sandbox verarbeitet, │    │
│  │  nicht über Host-iptables                │    │
│  └────────────────────────────────────────┘    │
│  Ein Gateway/Router-Node = einziges NAT für     │
│  dieses VLAN nach außen                          │
└────────────────────────────────────────────────┘
```

### Warum das die aktuellen Probleme strukturell vermeidet

- **Kein direktes Port-Publishing pro Service** → die ganze `route_localnet`/fehlende-DNAT-Regel-Klasse von Problemen entfällt, weil nur noch EIN Port (der vom Proxy) überhaupt NAT braucht.
- **VLANs statt Docker-Default-Bridge für Produktion** → dort übernimmt gVisors eigener Netstack den Sandbox-internen Traffic, der Host muss nur noch den einen Gateway-Punkt NAT'en.
- **Der Dev-Stack (dieses Repo, `docker-compose.yml`) ist davon separat** — der läuft aktuell auf einer plain Docker-Bridge, nicht auf VLANs, und wurde nie auf dieses Modell migriert. Das ist auch ok — nur muss der Dev-Stack dann als das behandelt werden, was er ist: eine lokale Entwicklungsumgebung, die die normale Docker-Bridge-Vernetzung braucht, kein Ziel für "kein iptables mehr".

### gVisor ≠ VLAN — zwei verschiedene Probleme, beide nötig

Wichtige Klärung, die im Gespräch aufkam: **gVisor und macvlan/ipvlan lösen unterschiedliche Probleme, eins ersetzt das andere nicht.**

- **gVisor** (`runsc`) ist Prozess-/Syscall-Isolation. Es schützt davor, dass Code — egal ob bösartig-generiert (Agent-Workspace) oder einfach nur ein Bug in eigenem, vertrauenswürdigem Code (Gateway/Backend) — bei Kompromittierung direkt auf den Host durchgreift. Sein eigener Netstack verarbeitet nur, was INNERHALB der Sandbox mit bereits angekommenem Traffic passiert.
- **macvlan/ipvlan** ist die eigentliche Netzwerk-Anbindung, die Host-iptables/NAT überflüssig macht — jeder Container bekommt eine echte eigene MAC/IP direkt auf dem Netzsegment statt über eine NAT'te Bridge.
- **Beide kombiniert** ist die richtige Antwort für Internet-facing Services (Gateway, Backend): gVisor begrenzt den Schaden bei einer Kompromittierung (siehe die CVE-2026-33718/CVE-2026-25253-Klasse Bugs — Command-Injection/Sandbox-Escape in an sich vertrauenswürdiger, aber fehlerhafter eigener Software), macvlan/ipvlan macht die Netzwerkanbindung unabhängig von Host-NAT.

### Netzwerk-Segmentierung ist eine dritte, separate Ebene

"Nicht direkt vom Internet erreichbar" (Postgres, Redis, Vault) heißt **nicht automatisch** "vor anderen internen Containern geschützt". Ein kompromittierter Agent-Workspace auf demselben flachen Netz könnte technisch trotzdem eine Verbindung zu Vault aufbauen — ob er damit etwas anfangen kann, hinge dann allein an Vaults eigenem Auth/Policy-System. Sich nur darauf zu verlassen ist zu dünn. Die drei Ebenen zusammen:

1. **Netzwerk-Segmentierung** — kann der Container überhaupt ein Paket an Vaults Adresse schicken? (eigenes Segment für Vault, nur vom Backend erreichbar; Agent-Workspaces haben KEINE Route dorthin)
2. **Auth/Autorisierung** — selbst wenn er hinkommt, hat er ein gültiges, gescoptes Token?
3. **Prozess-Isolation (gVisor)** — falls kompromittiert, kann der Container aus seiner eigenen Sandbox ausbrechen?

Praktisch: Agent-Workspaces sollen **nie** eine Netzwerkroute zu Vault haben. Brauchen sie ein Secret, geht das über die vom Backend vermittelte, gescopte API — nie direkter Netzwerkzugriff auf Vault.

**Nicht vergessen: Vault selbst braucht Cross-Server-Traffic für HA/Failover.** Das obige "Agent-Workspaces haben keine Route zu Vault" darf nicht so eng gefasst werden, dass es Vaults eigenen Cluster-Traffic mit-blockiert. Ein Vault-HA-Setup besteht aus mehreren Vault-Knoten auf verschiedenen Servern, die sich gegenseitig erreichen müssen:

- **Raft-Storage-Backend** (Vaults empfohlener HA-Mechanismus seit 1.4, kein externes Consul mehr nötig): die Knoten replizieren den Raft-Log untereinander über Port `8201` (Cluster-Port, getrennt vom API-Port `8200`).
- Das ist **Server-zu-Server**, nicht Client-zu-Server — eine andere Verkehrsklasse als "Backend ruft `/v1/secret/...` auf einem einzelnen Vault auf". Die Segmentierungsregel muss also lauten: *Vault-Knoten untereinander (Port 8201, nur zwischen den Vault-Servern) ja; Agent-Workspaces zu Vault (jeder Port) nein.*
- Praktisch heißt das: ein eigenes, kleines Netz-Segment nur für die Vault-Knoten selbst (die sich per 8200+8201 gegenseitig sehen dürfen), plus die eine erlaubte Route "Backend → aktiver Vault-Leader" von außerhalb dieses Segments. Wenn Vault später wirklich über mehrere physische Server verteilt wird (nicht nur mehrere Container auf einem Host), muss das über die Server-Firewalls hinweg konsistent bleiben — sonst bricht Failover, sobald ein Knoten den Leader nicht mehr erreichen kann.
- Das ist zum jetzigen Zeitpunkt **nicht dringend** (der aktuelle Dev-/Ist-Stack fährt nur eine einzelne Vault-Instanz, kein HA-Cluster) — aber es gehört in die Zielarchitektur, damit die Segmentierung nicht so eng gebaut wird, dass sie ein späteres HA-Setup blockiert.

### Secrets: nie als Env-Var im Container, immer über `jimesh.secrets.get()`

Bereits real implementiert (`internal/sdk/secrets/secrets.go`, TASK-065/R41 §C1) und der Grund, warum das oben überhaupt sauber funktioniert: ein Container bekommt beim Start nur einen gescopten `JIMESH_SERVICE_KEY` — ein Credential, um sich selbst zu authentifizieren, nicht das eigentliche Secret. Zur Laufzeit ruft er `client.Get("proj-abc", "DB_PASSWORD")` gegen `/api/sdk/secrets` auf; das Backend routet server-seitig zur richtigen SecretsEngine, serverseitig auf das Projekt des aufrufenden Keys gepinnt. Das eigentliche Secret landet nie als Klartext-Env-Var im Container-Prozess.

Das ist relevant für die RAG-Poisoning-Kill-Chain aus dem Artikel: Phase 2 dieser Kette (Secret-Harvesting aus einer `.env`-Datei nach einem Infrastruktur-Kompromiss) greift bei diesem Muster nicht — es gibt keine `.env`-Datei mit echten Secrets zum Auslesen, nur den einen gescopten Service-Key, der selbst wieder auditierbar und rotierbar ist.

### Was das NICHT ist

Kein Vorschlag, das jetzt sofort umzusetzen. Das ist eine mehrteilige Änderung (Traefik/Proxy einführen, alle `ports:`-Einträge in `docker-compose.yml` anpassen, Routing-Regeln pro Service definieren, testen) und gehört NICHT in einen laufenden Incident.

---

## 3. Empfohlener nächster Schritt (sicher, ohne weitere Firewall-Experimente)

1. **Nichts mehr an `iptables`/`sysctl` ändern**, bis jemand mit vollem Root-Zugriff (nicht per Einzel-Copy-Paste-Befehl über den Chat) die Situation in Ruhe durchgeht — idealerweise mit einer Root-Console/IPMI/Rescue-Zugriff als Absicherung gegen Aussperren.
2. Prüfen, ob es ein zentrales Firewall-Hardening-Script gibt (K-LAF-bezogen), das die `FORWARD`-Policy und `route_localnet` gesetzt hat — **das** ist die eigentliche Stelle, an der eine Docker-Ausnahme dauerhaft eingebaut werden sollte, nicht als Einzelbefehl.
3. Für den akuten Dev-Stack-Bedarf: falls schneller Zugriff nötig ist, ist `docker exec -it jimesh-postgres psql ...` (direkt in den Container, ohne Host-Netzwerk-Umweg) eine Übergangslösung, die das Netzwerkproblem komplett umgeht.
