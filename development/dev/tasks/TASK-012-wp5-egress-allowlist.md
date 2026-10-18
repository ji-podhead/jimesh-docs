# TASK-012 — WP5: Egress-Allowlist für Agent-Workspaces

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md`,
> `docs/K-LAF-ARCHITECTURE.md` §6, `docs/PRODUCT-ROADMAP.md` §6 (Metadata-Service!)
> **Branch:** `task/012-egress-allowlist` · **Speist:** Sprint 20 WP5

## Kontext

Ein Workspace darf nur JiMesh, Paket-Registries und seinen Git-Remote erreichen.
Damit wird Exfiltration konstruktiv unmöglich statt heuristisch erkannt, und der
Gateway-Pfad wird unumgehbar.

**Pflichtbestandteil, nicht optional:** `169.254.169.254` und `fd00:ec2::254`
(Cloud-Metadata-Service) müssen in JEDER Allowlist auf Deny stehen — sonst kann ein
Agent auf AWS/GCP über die Instance Role echte Cloud-Credentials ziehen, komplett an
Vault vorbei (Details: `docs/PRODUCT-ROADMAP.md` §6).

## Auftrag

1. Beim Container-Deployment (`projects_ssh.go`, dieselbe Stelle wie die
   Port-Bindings aus Sprint 20 WP0) eine `iptables`/`nftables`-Regelkette pro
   Workspace-Netz aufsetzen:
   - Default DROP für Egress.
   - ALLOW zu: JiMesh-Gateway-IP (die bereits ermittelte `gatewayIPFallback()`),
     bekannten Paket-Registry-Domains/IPs (npm, PyPI, Go-Proxy, apt/Debian —
     recherchiere die tatsächlich benötigten Endpunkte, keine Vermutung),
     dem konfigurierten Git-Remote-Host des jeweiligen Projekts.
   - **DENY explizit:** `169.254.169.254`, `fd00:ec2::254`.
2. Da Domains keine festen IPs haben (CDN-Rotation bei npm/PyPI): entweder DNS-basiertes
   Allowlisting (falls die Ziel-Firewall das kann) oder ein Docker-Netzwerk mit einem
   transparenten Egress-Proxy (Squid o. ä.) — **recherchiere den pragmatischsten Weg
   für iptables/nftables auf einer Ubuntu-VM, erfinde nichts, dokumentiere die
   gewählte Methode und ihre Grenzen im Report.**
3. Konfigurierbarkeit: Die Allowlist muss pro Projekt erweiterbar sein (manche
   Projekte brauchen zusätzliche externe APIs). Feld/Mechanismus vorschlagen, an
   `container_strategies` oder `projects` andocken (Schema in `store.go` prüfen).
4. Undeploy muss die Regeln wieder entfernen (Analogie zum bestehenden
   ufw-Cleanup-Pfad, der laut Sprint 20 WP0 für Alt-Regeln bewusst erhalten blieb).

## Nicht tun

- Keine Kernel-Ebene (eBPF) — das ist WP8, andere Task, und hier nicht nötig.
- Keine Cloud-Firewall-API-Integration (Security Groups) — das ist eine offene
  Frage in `docs/PRODUCT-ROADMAP.md` §6, nicht Teil dieser Task.
- Nicht versuchen, die Allowlist rückwirkend auf bereits laufende Deployments
  anzuwenden — nur für neue.

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Neu deployter Test-Container: Verbindung zu `169.254.169.254` schlägt fehl,
  Verbindung zum JiMesh-Gateway funktioniert (falls im Worktree testbar — sonst
  die generierten Regeln im Report zeigen und manuell nachvollziehbar machen).
- Undeploy räumt die Regeln nachweislich weg.

## Ergebnis (Claude, 6.9.2026 — nicht GLM, siehe Ownership-Entscheidung)

**Branch:** `task/012-egress-allowlist`, Commit `50bb3a1`, neues Package
`internal/network/egress.go` + `egress_test.go`. `go build`/`go vet`/`go test`
sauber, 9 Tests inkl. echter DNS-Lookups (kein Mock).

**Recherche verifiziert, nicht angenommen:** `registry.npmjs.org` läuft über
Cloudflare (`2606:4700::`-Range), `pypi.org`/`files.pythonhosted.org` über
Fastly (`2a04:4e42::`-Range), `archive.ubuntu.com` liefert mehrere wechselnde
Anycast-IPs — live per `getent hosts` geprüft. Eine statische IP-Allowlist
wäre binnen Stunden falsch.

**Entscheidung:** nftables-Sets mit periodischem DNS-Refresh statt SNI-Proxy.
Begründung: nftables-nativ, kein neues TLS-Parsing-Projekt (das wäre
vergleichbar groß wie `socket-guard`, aber andere Fach-Domäne). Dokumentierte
Grenze: Race-Window zwischen Resolve und Nutzung — eine kurzzeitig veraltete
IP könnte noch erlaubt sein, eine neue noch nicht drin. Der textbook-korrekte
Fix (SNI-inspizierender transparenter Proxy, immun gegen IP-Rotation) ist
bewusst **nicht** gebaut — als Folge-Empfehlung dokumentiert, nicht
stillschweigend als gelöst behauptet.

**Zwei Bugs, die die eigenen Tests vor dem Ausliefern gefangen haben:**
1. `Render()` erzeugte eine widersprüchliche `accept`-Zeile für die
   Metadata-Service-Adresse, falls sie über `ExtraAllow` hereinkam — verließ
   sich nur auf die nftables-Regel-Reihenfolge (deny vor allow), was zwar
   praktisch funktioniert hätte, aber fragil und irreführend beim Lesen der
   generierten Regeln ist. Jetzt werden Deny-Ziele aus jeder Allow-Quelle
   explizit herausgefiltert — das gerenderte Regelwerk selbst enthält den
   Widerspruch gar nicht mehr.
2. `ResolveRegistries` teilte sich ursprünglich EIN Zeit-Budget über alle
   Domains sequenziell — eine langsame/tote Domain konnte die Auflösungszeit
   der folgenden Domains aufbrauchen (per Test entdeckt: `github.com` schlug
   fehl, wenn es nach einer nicht existierenden Domain kam, obwohl es allein
   zuverlässig auflöste). Jetzt parallel mit Einzel-Timeout pro Domain.

**Bewusst nicht gebaut, mit Begründung:**
- **Wiring in `projects_ssh.go`** — gleicher Grund wie TASK-011/015: Datei ist
  der 009/010/012-Sequenzblock, Wiring folgt nach dessen Merge.
- **Der periodische Refresh-Loop selbst** (ein laufender Goroutine-Scheduler,
  der `ResolveRegistries` alle `RefreshInterval` aufruft und das nftables-Set
  live aktualisiert) — die Bausteine (Resolve-Funktion, Intervall-Konstante)
  stehen, der Scheduler/die Server-Lifecycle-Integration nicht.
- **Pro-Projekt-Erweiterbarkeit** (`ExtraAllow` existiert im Struct, aber kein
  DB-Feld/API-Endpoint, um es pro Projekt zu setzen — Schema-Frage aus
  Auftragspunkt 3 bleibt offen).

### Offene Frage für den Operator

**E10 — SNI-Proxy jetzt oder später?** Das Race-Window der DNS-Refresh-Lösung
ist klein, aber real. Lohnt sich der SNI-Proxy (TLS-ClientHello-Inspektion,
IP-rotation-immun) als eigene Folge-Task, oder ist das Refresh-Intervall-Risiko
für v1 akzeptabel? Kein Default gesetzt — das ist eine Risikoabwägung, keine
Implementierungsdetail-Frage.
