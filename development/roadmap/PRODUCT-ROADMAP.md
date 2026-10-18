# JiMesh — Produkt-Roadmap

> **Status:** Richtungsdokument, kein Umsetzungsplan. Konkrete Arbeit steht in
> `docs/sprints/`. Sicherheitsarchitektur in `docs/architecture/K-LAF-ARCHITECTURE.md`.
> Stand: 6. September 2026.

## Leitsatz für die Priorisierung

Ein Feature ist **kernnah**, wenn es auf die Identitätskette einzahlt — also darauf,
dass JiMesh weiß, *wer* etwas tut, und *eingreifen* kann. Ein Feature ist
**plattformnah**, wenn es davon unabhängig Nutzen stiftet.

Beides ist legitim. Aber die Reihenfolge entscheidet, welches Produkt entsteht, und
plattformnahe Features konkurrieren mit gut finanzierten Anbietern (Backstage, Port,
Humanitec, Coder, Gitpod), während kernnahe es nicht tun.

Faustregel an einem Beispiel: **IaC-Detection ist kernnah**, wenn sie die Provisionierung
speist — „dieses Projekt deklariert einen S3-Bucket, also braucht es diese Credentials,
also legt JiMesh sie in Vault an und der Agent sieht sie nie". Sie ist plattformnah, wenn
sie nur anzeigt, dass Terraform gefunden wurde. Der Unterschied liegt nicht im Feature,
sondern darin, ob es in die Kette einzahlt.

---

## 1. Agenten ohne Zugangsdaten (kernnah)

Der stärkste Verkaufspunkt entsteht als Nebenprodukt der Sicherheitsarbeit.

Wenn der Container nur JiMesh erreicht (Egress-Allowlist, Sprint 20 WP5) und JiMesh weiß,
welcher Container das ist (Provisioning-Token, WP1), dann **ist die Identität die
Autorisierung**. Der Agent hält nie einen Schlüssel — nicht weil man ihm keinen gibt,
sondern weil es keine Stelle gibt, an der er einen bräuchte.

Das verallgemeinert sich über LLMs hinaus: Postgres, S3, jeder provisionierte Dienst.
JiMesh legt ihn an, hinterlegt das Credential in Vault, injiziert zur Laufzeit
(Mandat 9, Agent-Bridge aus Sprint 18).

**Formulierung nach außen:** nicht „wir sichern eure Agenten ab", sondern „eure Agenten
haben nie Zugangsdaten". Strukturell wahr statt beteuert.

### Das Token-Detail

OpenAI-kompatible SDKs verlangen ein `api_key` und scheitern sonst schon beim
Konstruieren. Statt das zu umgehen, wird das erzwungene Feld zum Identitätsträger:

| Fall | `OPENAI_API_KEY` enthält | Identität aus |
|---|---|---|
| Von JiMesh provisioniert | das Session-Token aus WP1, beim Spawn injiziert | Token + Source-IP-Gegenprobe |
| Externer Client (Laptop, CI) | manuell ausgestelltes Token mit angehängtem Scope | Token |
| Ausdrücklicher No-Auth-Modus | Platzhalter (`sk-jimesh-local`) | nur Netzwerkposition |

Der Entwickler setzt `OPENAI_BASE_URL` und `OPENAI_API_KEY` wie immer — kein SDK-Patch,
kein Custom-Header, kein Wrapper. Nur ist der Key kurzlebig, gescopet und widerrufbar.

Zwei Vorbehalte, die im Design bleiben müssen:

* Die **Source-IP-Gegenprobe trägt nur im Docker-Netz.** Hinter einem Tunnel, der die
  Quelladresse umschreibt, fällt die zweite Bindung weg.
* Das Token steht als Env im Container und ist per `docker inspect` auf dem Node lesbar
  — wie schon `GIT_TOKEN` und das code-server-Passwort. Deshalb kurze TTL plus zweite
  Bindung: Ein abgegriffenes Token ist außerhalb seines Containers wertlos. Das Design
  begrenzt die Folge des Leaks, statt ihn auszuschließen.
* **No-Auth ist ein ausdrücklicher Modus**, nicht ein Default, und er erscheint in der
  Exposure-Ansicht (WP6). Sonst wiederholt sich das Muster „bequemer Default bedeutet
  still offen" — siehe Dashboard ohne Login-Screen und code-server ohne Passwort.

---

## 2. Access Policy (kernnah)

Heute ist Scoping auf drei Orte verteilt, mit drei Auflösungswegen: `model_scope` am Key,
Budgets in `project_user_budgets`, Rollen in `teams`/`team_members`, dazu der Budget-Check
aus Mandat 10.

Das driftet auseinander. Genau diese Art von Drift ist bei euch schon zweimal passiert —
`RecordQuotaFromResponse` hatte nach einem Refactor keinen Aufrufer mehr,
`RecordRequestSummary` wurde nirgends gerufen, und in beiden Fällen behauptete die
Dokumentation das Gegenteil.

**Ziel: ein Policy-Objekt, an einer Stelle aufgelöst, kaskadierend wie das Budget
(Team → Projekt → User/Agent).**

Achsen, die eine Policy tragen sollte:

- erlaubte Chains/Router, Modelle, Provider
- Budget-Obergrenze und Rate-Limit
- ob Tool-Calling erlaubt ist
- welche Vault-Secrets angefragt werden dürfen
- **Datenresidenz** — siehe unten

**Reihenfolge-Regel:** Die Policy-Auflösung läuft **vor** dem Budget-Check, nicht danach.
Sonst wird ein Call bezahlt, der gar nicht erlaubt war.

### Datenresidenz als Scope-Achse

„Diese App darf nur zu EU-gehosteten Providern routen." Ein roher Provider-Key kann das
prinzipiell nicht ausdrücken. Für den Zielmarkt (Real Estate und Construction in
Deutschland, DSGVO) ist das häufig Vertragsbedingung, nicht Komfort.

### Audit als Nebenprodukt

Mit einem Eintrittspunkt ist jeder Modell-Call einem Nutzer und einer App zurechenbar:
wer hat das Modell was gefragt, in wessen Auftrag. Mit verteilten Provider-Keys ist dieses
Artefakt grundsätzlich nicht herstellbar.

---

## 3. Secrets bei Erstnutzung statt vorab (kernnah)

**Problem:** Heute müssen Git-Token und alle Secrets konfiguriert sein, bevor überhaupt
deployt werden kann. Das ist die härteste Onboarding-Hürde.

**Lösung — Reihenfolge umdrehen.** Das erste Deployment braucht nichts. Wenn der Agent
das erste Mal pushen will, hält JiMesh an und fragt im Dashboard. Das ist dasselbe
HITL-Gate wie in Sprint 20 WP7, nur an einer zweiten Stelle — keine neue Mechanik.

**Git speziell:** Ein PAT ist die schlechteste Variante. Eine **GitHub App Installation**
ist auf einzelne Repos begrenzbar, rotiert selbst und lässt sich pro Projekt widerrufen.
Löst Onboarding und ein Sicherheitsproblem in einem Zug.

**Externe Engines** als Provider-Interface, gleiche Form wie `FirewallProvider` (WP6):

```go
type SecretProvider interface {
    Get(ctx context.Context, ref SecretRef) (Secret, error)
    Detect() Capabilities
}
```

Vault eingebaut; AWS Secrets Manager, GCP Secret Manager, 1Password, Doppler daneben.
Niemanden zwingen.

---

## 4. Credits und Abrechnung (plattformnah, mit Rechtsanteil)

Die Bausteine existieren: `project_user_budgets`, `teams`, kaskadierende Limits,
Budget-Check vor dem Call (Mandat 10). Credits sind eine Darstellungsschicht darauf plus
Aufladung — **kein neues System**.

**Aber:** Sobald echtes Geld fließt, ist das eine andere Art von Arbeit —
Zahlungsabwicklung, Rechnungsstellung, Umsatzsteuer, und als deutsches Unternehmen die
DSGVO-Seite der Abrechnungsdaten. Kein Sprint, sondern eine Produktentscheidung mit
Rechtsberatung.

---

## 5. Plattform-Features (plattformnah)

Multi-Cloud-Deployments (AWS, GCP), IaC-Detection, App-Detection, Projekt- und
Server-Verwaltung.

**Einordnung:** Diese Features sind die *Oberfläche*, die die Sicherheitsschicht
adoptierbar macht. Niemand kauft eine Firewall für seine Agenten. Man kauft einen Ort, an
dem Agenten laufen — und der zufällig sicher ist.

Solange sie dem Kern dienen, sind sie richtig. Sobald sie sich verselbständigen,
konkurriert JiMesh mit Backstage und Port, und der Unterscheidungsmerkmal geht darin unter.


---

## 6. Cloud-Provider: SSH als gemeinsamer Nenner (kernnah)

**Grundsatz:** Kein Wrapper um die Cloud-APIs. Sobald eine VM mit SSH erreichbar ist, sind
AWS, GCP, Hetzner und Blech identisch. Das Deliverable ist der Workspace — VM, Docker,
Agenten — nicht die Cloud-Ressource. Neue Provider zu unterstuetzen kostet dann fast nichts.

### Der Transport ist provider-spezifisch — SSH ist nur die Protokoll-Ebene

Der Grundsatz stimmt für alles, was JiMesh *auf* der Box tut (Exec, Dateien, Health
Checks). Die Verbindung *zu* dem SSH-Port ist je Provider anders gebaut:

| Provider | Transport zur Box | Cloud-SDK nötig | Inbound |
|---|---|---|---|
| BYO-Box, Hetzner, Root-Server | direktes TCP auf :22 | nein | Port 22 offen |
| GCP | IAP TCP Forwarding — SSH läuft als WebSocket durch die Google-API | ja | :22 nur aus `35.235.240.0/20`, keine Public IP nötig |
| AWS | SSM Session Manager / Port Forwarding — gar kein sshd nötig | ja | **keiner** — der SSM-Agent dialt selbst raus |
| Azure (später) | Bastion / AAD-SSH | ja | je nach Variante |

**Der gemeinsame Nenner ist das SSH-Protokoll, nicht der Verbindungsaufbau.** Deshalb
bekommt die Utility-Engine ein Transport-Interface, *bevor* der zweite Provider kommt:

```go
// Liefert einen net.Conn, auf dem SSH spricht.
type NodeTransport interface {
    Dial(ctx context.Context, target TargetRef) (net.Conn, error)
    Capabilities() TransportCaps // interaktive Shell, Port-Forwarding, Tunneling
}
```

`x/crypto/ssh.NewClientConn` nimmt jeden `net.Conn` — der SSH-Stack bleibt unangetastet,
ein neuer Provider ist ein neuer Transport plus ein Credential in Vault. Genau die
„fast nichts"-Erweiterbarkeit aus dem Grundsatz. Sie existiert aber nur, wenn das
Interface zuerst da ist — sonst baut jeder Provider seinen eigenen Verbindungsweg, und
die Identity-Checks driften auseinander (das bekannte Muster).

Konkret: Der Verbindungsaufbau steht heute an genau zwei Stellen fest codiert —
`internal/network/tunnel.go` und `internal/gateway/projects_ssh.go`, beide
`ssh.Dial("tcp", ...)` hinter `ssh.InsecureIgnoreHostKey()`. Das sind die Umbaustellen
für das Interface; der Host-Key-Fund aus WP0 wird dabei mit behoben.

Das Interface setzt *unter* die bestehende TunnelPool-Schicht an (Sprint 15 WP2:
eine ssh.Client pro Projekt, Reverse Proxy mit eigenem DialContext). Der Pool bleibt,
nur seine Konstruktion wandert hinter den Transport. Die Ablösung des rohen
TCP-durch-SSH ist ohnehin beschlossen: R15/R17 stufen TCP-over-TCP als Meltdown-Risiko
ein und empfehlen Chisel (Backlog Epic 5). Chisel und IAP/SSM sind danach zwei
Implementierungen derselben Schnittstelle — nicht zwei konkurrierende Architekturen.

### Zwei Betriebsmodelle mit sehr unterschiedlichen Kosten

| Modell | Cloud-API noetig | Aufwand pro Provider | Verpflichtung |
|---|---|---|---|
| **Bring-your-own-Box** | keine | null | keine |
| **JiMesh legt die VM an** | ja, mindestens ein Call | einige hundert Zeilen | **Teardown** — sonst zahlt der Kunde ewig |

BYO-Box deckt die frühen Nutzer ab und bleibt der Default. Das Anlegen bringt SSH-Key-
Injektion, Security Group, Subnet, Instance-Type, Image und Lebenszyklus mit — das ist eine
Betriebsverpflichtung, keine Funktion.

Secrets kommen dabei über den `SecretProvider` aus Abschnitt 3 — entweder JiMesh Vault oder
die bereits konfigurierte Secrets-Engine des Kunden.

### ⚠️ Auf Cloud-VMs gibt es zwei Firewalls

| Ebene | Kontrolliert durch | Für JiMesh über SSH sichtbar |
|---|---|---|
| nftables in der VM | JiMesh | ja |
| Security Group / Cloud-Firewall | Cloud-API | **nein** |

Der Incident vom 5.9. entstand, weil Docker die Host-Firewall umging. Auf Cloud-VMs kommt
eine Ebene dazu, die über SSH prinzipiell unsichtbar ist: Eine Security Group mit
`0.0.0.0/0` macht einen Docker-Port aus dem Internet erreichbar, unabhaengig von nftables
in der VM.

**Folge: Das Exposure-Dashboard (Sprint 20 WP6) zeigt auf Cloud-VMs ein falsches Gruen** —
dieselbe stille Fehlannahme wie die ufw-Regeln, die nie griffen.

**Die einzige Cloud-API, die wirklich gebraucht wird, ist die lesende Firewall-Abfrage**
(`DescribeSecurityGroups` und Aequivalente). Nicht zum Deployen — zum Sehen. Read-only, ein
Call pro Provider, zahlt direkt auf das Kernprodukt ein. Vorgesehen ist das bereits als
optionale `FirewallProvider`-Implementierung in Sprint 20 WP6 („Cloud-Security-Groups,
Hetzner/AWS") — der Punkt hier begründet nur, warum es kein Optional bleiben sollte.

### ⚠️ Der Metadata-Service umgeht die gesamte Kette

Auf AWS und GCP haengt an einer VM oft eine Instance Role. Code in der VM holt sich
Cloud-Credentials von `169.254.169.254` — **ohne jeden API-Key**. Ein kompromittierter Agent
kommt so an echte Cloud-Zugangsdaten: an Vault vorbei, an der Identitaetskette vorbei, an
der Policy vorbei.

Das untergraebt die Kernaussage „eure Agenten haben nie Zugangsdaten" genau dort, wo sie am
lautesten vorgetragen wird.

**Pflicht, nicht Option:** `169.254.169.254` (und `fd00:ec2::254` auf IPv6) gehoert in jeder
Agenten-Egress-Allowlist auf Deny. Gehoert zu Sprint 20 WP5 und gilt auch dann, wenn JiMesh
die VM nicht selbst angelegt hat.

### ⚠️ Hinter Relay-Transports prüft der Node-Kanal keine Herkunft mehr

Abgrenzung vorab: WP1s zweite Bindung (Session-Token ↔ Container, aufgelöst über die
Docker-API im Node-Netz) lebt *innerhalb* des Nodes und bleibt von IAP/SSM unberührt.
Was sich ändert, ist der Kanal Gateway → Node:

* **IAP:** Die VM sieht die Verbindung aus `35.235.240.0/20` — Googles geteiltem
  Relay-Range. Eine Herkunftsprüfung bindet dort an nichts Individuelles.
* **SSM:** Es gibt gar keinen inbound Socket; die Session kommt vom Agenten in der VM.

Heute kompensiert JiMesh das nicht — sie authentifiziert den Node schlicht nicht
(`InsecureIgnoreHostKey`, WP0-Fund). Über IAP/SSM fällt zusätzlich jede mögliche
netzwerkseitige Herkunftsprüfung weg. **Deshalb wandert die Authentizität in die
SSH-Schicht:** Host-Keys beim Bootstrap pinnen (`known_hosts` vom Provisionierer
geschrieben statt ignoriert) — oder, wenn später pro Session attestiert werden soll,
eine JiMesh-SSH-CA (`TrustedUserCAKeys` + Principals-Datei beim Bootstrap, kurze TTL,
Principal = Session-ID). Ersteres ist Pflicht für Cloud-Nodes, Zweiteres optional.

Zwei Nebeneffekte nach oben: der WP0-Fund (Host-Key-Ignore) wird für Cloud-Nodes
strukturzwangsläufig mit behoben, und IAP/SSM-Deployments haben **null inbound Ports** —
das Exposure-Argument wird auf Cloud strenger als auf den heutigen Nodes, nicht schwächer.

Die Transport-Credentials sind eng scoping-bar: IAP-Rolle pro Projekt/Folder,
`ssm:StartSession` auf Instanz-ARNs. Sie liegen in Vault und nutzt nur die Utility-Engine —
nie ein Agenten-Container. Konsistent mit Abschnitt 1. Bei SSM kommt hinzu: die Instanz
selbst hält über ihr Instance Profile Cloud-Creds — der Metadata-Deny oben wird damit
wichtiger, nicht optionaler.

### ⚠️ Cloud-IAM steht neben dem JiMesh-RBAC, nicht darunter

Der vorige Abschnitt behandelt die Authentizität des *Kanals*. Davon zu trennen ist die
Autorisierung von *Menschen*: Wer Cloud-IAM-Rechte auf die VM hat, kommt per IAP/SSM
direkt darauf — an der Access Policy vorbei, am Deployment-RBAC vorbei — und kann dort das
Session-Token des Agenten aus der Container-Env lesen (`docker inspect`).

Dieselbe Klasse wie der Metadata-Service: Das Cloud-Substrat hat einen eigenen
Autoritätspfad neben dem von JiMesh. Wegbauen lässt sich das nicht.

**Konsequenz für die Produktaussage:** „RBAC für Deployments" gilt auf Cloud-VMs nur mit
Einschränkung. Wer Cloud-IAM-Zugriff auf den Host hat, ist faktisch privilegierter als jede
JiMesh-Rolle. Das gehört in die Dokumentation und in den Vertrieb — nicht in eine Fußnote,
und nicht in eine Folie, die das Gegenteil suggeriert.

### Offene Implementierungsfragen (klären, bevor Provider #2 gebaut wird)

- **O1 — Erster Relay-Transport:** Chisel (R15/R17-Empfehlung wegen TCP-over-TCP-Meltdown,
  Backlog Epic 5) oder provider-nativ (IAP per gcloud-Subprozess bzw. eigenem
  WebSocket-Client, Auth über ADC/SA aus Vault)? Ein Spike gegen das `NodeTransport`-
  Interface entscheidet; nichts über zwei Wege hinweg festlegen.
  Als Vorstufe ohne jede Abhängigkeit: **BYO-Transport** — der Operator startet den Tunnel
  selbst (`gcloud compute start-iap-tunnel`, `aws ssm start-session`), JiMesh dialt auf
  `127.0.0.1:PORT`. Funktioniert heute, passt zu BYO-Box, und ist die ehrliche v1, solange
  Mandat 7 gegen die großen Cloud-SDKs steht.
- **O2 — SSM in Go:** Session-Manager-Plugin (Go, open source) einbetten oder als Binärdatei
  mitliefern? Lizenz und Update-Pfad prüfen.
- **O3 — CA-Bootstrap:** `TrustedUserCAKeys` gehört in das Bootstrap der JiMesh-provisionierten
  Box. Was gilt für BYO-Box? Fallback: heutiger Weg — konventionelle Keys, Host-Key manuell
  gepinnt.
- **O4 — Grenze des Interfaces:** Läuft alles (Exec, Kopien, Health Checks) über denselben
  `net.Conn`-Typ? Kurz entscheiden, bevor es zwei Implementierungen gibt.
- **O5 — Datenresidenz:** IAP- und SSM-Steuerkanäle laufen über Google- bzw. AWS-Infrastruktur.
  Für EU-Kunden klären, ob Region-Pinning der Steuerkanäle dokumentiert werden muss
  (Vertriebsfrage, betrifft Abschnitt 2).

---

## 7. LLM-Firewall-Markt (Wettbewerbslage, R19)

Vier Klassen inspizieren Text oder Pakete — keine provisioniert die Umgebung, in der
der Agent läuft:

| Klasse | Beispiele | Grenze |
|---|---|---|
| Gateway/Proxy (OSS) | LiteLLM | Key-, Budget-, Provider-Management — kennt keine Session↔Container-Zuordnung |
| In-Process-Scanner (OSS) | LLM Guard, NeMo Guardrails, Guardrails AI | laufen in der App, kein Netzwerk-Enforcement |
| Edge/Netzwerk | Cloudflare Firewall for AI, Azure AI Content Safety | sehen Endpunkte, keine Identität, kein Freeze |
| Kernel/Runtime | TigerGate (kommerziell, CNAPP + eBPF-Agent), AgentSight (Forschung) | eBPF an TLS-Grenzen — sehen den Host, nicht die Kette |

TigerGate positioniert sich als „Runtime AI Gateway powered by eBPF" — bestätigt, dass
die Nische real ist. Der strukturelle Unterschied bleibt derselbe wie in Abschnitt 1:
TigerGate/AgentSight sehen nur den Host; JiMesh provisioniert die Workspaces und besitzt
dadurch Session↔Container↔User plus Freeze-Review-Release. Wer provisioniert, hat die
Identität — alle anderen inspizieren Text.

Details, Mechanik (uprobe an der TLS-Grenze, Go-Binaries als blinder Fleck) und
Korrekturen zur Recherche: `docs/research/R19-llm-firewall-landscape.md`.

---

## 8. Database-Discovery, -Management & CDC (kernnah)

Mandat: Die Utility-Ebene verwaltet nicht nur Workspaces, sondern auch die
Datenbanken dahinter — Discovery, Management und Change Data Capture gehören
direkt zu JiMesh (Debezium, https://debezium.io; Referenz-Kopie in
`docs/reference/debezium/`).

**Warum kernnah:** Dieselbe Logik wie bei IaC-Detection — „dieses Projekt
deklariert eine Postgres-DB, also legt JiMesh sie an, schreibt das Credential
in Vault und injiziert es zur Laufzeit." Discovery speist die Provisionierung,
CDC speist Events und Audit.

**Discovery** baut auf Vorhandenem auf: Docker-Discovery und Port-Detection
(Sprint 15) erkennen DB-Container bereits. Ergänzt wird die Instanz-Ebene —
Version, `wal_level`/Logbin-Status, Replikations-Slots, Größe, aktive
Verbindungen — gelesen per SSH-Exec im Container (psql/mysql-CLI), ohne
zusätzliche Daemon-Ports.

**Management:** DB/User anlegen, Migrationen, Backups — dieselbe SSH-Exec-
Schicht. Credentials nur über Mandat 9/Vault, nie als CLI-Argumente
(WP0-Fund: GIT_TOKEN in der Kommandozeile).

**CDC:** Sprint 8 hat die Spec (wal_level=logical, Kafka Connect,
SMT-Masking der keys-Tabelle) — der Umsetzungsstand im laufenden Stack ist
ehrlich zu prüfen, bevor weitergebaut wird. Zwei Vereinfachungen für den
Default-Stack:

* **Debezium Server** statt Kafka/ZooKeeper-Zoo: Standalone-Binary, Sink
  direkt nach Redis/HTTP. Der Kafka-Stack bleibt Enterprise-opt-in.
* **Direkte WAL-Replikation aus Go** (pgx/pglogrepl) für reine Postgres-Fälle:
  kein Java-Sidecar — aber Schema-Evolution, Initial-Snapshot und Offset-Store
  selbst bauen. Entscheidung offen, Forschung P8.


## 9. App-/Port-Discovery als gemeinsame Quelle für Deployment UND Security (kernnah)

Operator-Idee (8.9.2026): Ports sind der gemeinsame Nenner. Dieselbe Discovery,
die Apps findet, speist sowohl die Deployment-Erstellung als auch die
Security-Seite — eine Quelle, zwei Konsumenten, keine doppelte Erfassung.

1. **Auto-App-Discovery erkennt auch Ports.** Nicht nur Container und Repos:
   jeder offene Port (lokal und auf SSH-Endpunkten) wird mit dem zugehörigen
   Prozess/Container erfasst. Ports sind die atomare Einheit — hinter einem Port
   steckt eine App, hinter einer App ein Angriffs- und Deployment-Ansatzpunkt.
2. **Eine Security-Seite pro Endpoint/App.** Jeder Endpoint und jede App
   bekommt seine eigene Security-Ansicht. Technisch kein neues Feature pro
   Objekt, sondern dieselbe Security-Component (Exposure, Events, Freeze,
   Report), aus der Objekt-Hierarchie heraus mit dem jeweiligen Kontext
   gerendert — App, Endpoint, Node teilen sich eine Widget-Familie.
3. **Ports-Bar im VS-Code-Stil.** Unten im Dashboard eine Leiste mit den
   aktuell offenen Ports. Daraus lassen sich direkt Deployments/Apps anlegen
   („dieser Port ist ein Frontend — mach daraus eine App“), ohne Formulare
   auszufüllen, deren Daten die Discovery längst kennt.
4. **Auto-Discovery erzeugt Deployments.** Läuft Auto-Discovery, werden neu
   gefundene Apps/Ports automatisch als Deployment/App-Entwurf erzeugt — der
   Operator bestätigt oder verwirft, tippen muss er nicht.
5. **Security-Bezug ist gratis:** ein Port, der öffentlich erreichbar ist,
   erscheint auf der Security-Seite (Exposure-Schicht existiert bereits,
   siehe `/api/security/exposure` und FirewallProvider) — dieselben Daten,
   andere Sicht.
6. **Static Analysis auf Gefundenem.** Ein Deployment startet üblicherweise
   aus einem Git-Repo, muss aber nicht. Static Analysis (Secrets, Config-Fehler,
   bekannte Schwachstellen im Repo/Code) läuft deshalb auf allem, was die
   Discovery gefunden hat — auch ohne Deployment, auch ohne Git. Die
   WP2-Regex-Scanner-Pipeline (Sprint 20) ist der erste Schritt in diese
   Richtung; Repo-/Datei-Scanner sind der nächste.

Nicht- Ziel: Discovery erfindet Deployments ohne Bestätigung des Operators
(HITL bleibt, siehe K-LAF-Backlog) — auto-erzeugt heißt Entwurf, nicht
Live-Gang.


## 🔶 Offene Entscheidung

### E8 — AI-Workspace-Plattform oder Internal Developer Platform?

**Eng:** Sichere Ausführungsumgebung für KI-Agenten. Verteidigbar, weil niemand sonst die
Workspaces provisioniert und deshalb niemand sonst die Identitätskette hat.

**Breit:** Verwaltungstool für alle Projekte und Server. Größerer Markt, aber besetzt von
gut finanzierten Anbietern, gegen die JiMesh keinen strukturellen Vorteil hat.

**Kein Default.** Die Entscheidung betrifft nicht, *ob* Plattform-Features gebaut werden,
sondern ob sie dem Kern untergeordnet bleiben. Sie bestimmt außerdem, ob Mehrbenutzer ein
Produktziel ist — und damit E4 aus Sprint 20.

**Meine Einschätzung:** eng anfangen, Plattform-Features nur aufnehmen, wenn sie in die
Kette einzahlen. Die Position „eure Agenten haben nie Zugangsdaten" ist verkaufbar und
strukturell verteidigt. „Wir verwalten auch eure Server" ist eine Feature-Liste.
