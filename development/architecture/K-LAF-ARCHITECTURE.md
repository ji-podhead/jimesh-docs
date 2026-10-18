# K-LAF — Kernel-Level LLM Application Firewall

> **Status:** Produkt-Spezifikation. Kein Code. Entstanden aus dem Security-Incident
> vom 5. September 2026 (siehe `docs/sprints/SPRINT-19-SECURITY-INCIDENT-KLAF.md`).
> Umsetzungsplan: `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md`.

Konsolidiert aus drei getrennten Entwürfen (K-LAF-Spec, XCP-ng/Suricata-Blueprint,
Libvirt/eBPF-Konzept). Wo sich diese widersprachen, ist die getroffene Entscheidung
unter **Entschieden** vermerkt.

---

## 1. Die These

Bestehende Werkzeuge sehen jeweils nur eine Hälfte:

| Werkzeugklasse | Sieht | Sieht nicht |
|---|---|---|
| Netzwerk-Firewalls (Palo Alto, Fortinet, Suricata) | IP-Pakete, Ports, TLS-SNI, Volumen | Den Prompt — LLM-Traffic ist TLS-verschlüsselt |
| AI-Guardrails (Llama Guard, NeMo, Lakera) | Prompt- und Antworttext | Ob der Agent nebenbei Sockets öffnet oder `/etc/shadow` liest |
| Syscall-Sandboxes (gVisor, Tetragon, Falco) | Systemaufrufe, Prozesse, Sockets | Warum — der semantische Auslöser fehlt |

**K-LAF korreliert semantischen Inhalt mit Systemzustand.** Das ist der Differenzierer.
Die Detektion selbst ist Commodity und wird zugekauft bzw. eingebunden, nicht selbst
trainiert.

### Was K-LAF nicht ist

Ausdrücklich festgehalten, weil frühere Entwürfe das vermischt haben:

* **gVisor erkennt keine Prompt Injection.** Es ist eine Syscall-Sandbox und weiß
  nicht, was ein Prompt ist. Beim Incident vom 5.9. waren die Lesezugriffe auf die
  `.env`-Dateien aus Kernel-Sicht völlig legitime `open()`/`read()`-Aufrufe.
* **Suricata sieht keine Prompts.** LLM-Traffic ist TLS zu den Provider-Endpunkten.
  Suricata bekommt SNI, JA3-Fingerprint, Volumen und Timing. Wertvoll gegen
  DNS-Tunneling, C2-Beaconing und Exfiltrations-Volumina — wirkungslos gegen Injection.
* **Das Gateway ist der einzige Ort mit Klartext.** Deshalb ist es die primäre
  Inspektionsebene, nicht der Kernel.

---

## 2. Die Identitäts-Brücke (das eigentliche Problem)

Eine Bedrohung erkennen ist wenig wert, wenn unklar bleibt, *wen* man einfrieren soll.
Die Brücke hat drei Ebenen:

| Ebene | Identität | Quelle |
|---|---|---|
| Host / VM | PID, Socket | eBPF (Tetragon) |
| Container | Container-ID, Name | Docker API |
| Session | `session_id`, `trace_id` | JiMesh-Gateway |
| Request | Request-ID | `request_log` |

### Bindung — und warum Selbstauskunft nicht reicht

Ein kompromittierter Agent, der seine eigene `session_id` oder `container_id` im
Header setzt, **kann lügen**. Er behauptet, ein anderer Container zu sein, oder kapert
eine fremde Session. Selbstdeklarierte Identität taugt für Observability, ist als
Grundlage für Enforcement aber wertlos.

**Entschieden — zwei unabhängige Bindungen:**

1. **Provisionierungs-Bindung (autoritativ):** JiMesh spawnt die Container selbst
   (`ExecuteSelfProvisioning`, Sprint 18) und kennt dabei die Container-ID. Es mintet
   ein Session-Token, legt es in `vault_tokens` mit TTL ab und injiziert es als
   Env-Variable in den Container. Der Agent *präsentiert* das Token, er *wählt* seine
   Identität nie selbst.
2. **Netzwerk-Bindung (unabhängig):** Requests kommen aus dem Docker-Netz. Das Gateway
   sieht die Source-IP, die Docker-API sagt, welcher Container sie hat.

**Divergenz beider Bindungen ist selbst ein Threat-Signal** — damit ist
Session-Spoofing erkennbar, ohne dass ein Detektor dafür nötig wäre.

### Zwei Vertrauensklassen

* **Von JiMesh provisioniert** — Identität mit Sicherheit bekannt, Enforcement möglich.
* **Fremd (manuell gestartet)** — nur Discovery-Heuristik, Identität unsicher.
  Warnung statt Freeze.

### Session als Baum, nicht als flacher Key

Ein Agent startet Sub-Agents; ein Auftrag („Coin analysieren und deployen") spannt viele
Calls. `sessions` braucht `parent_session_id`, `container_id` und `project_id`.
Die heutige Tabelle hat nur `id`, `agent_type_id`, `metadata`, `tags`, `created_at`.

---

## 3. Freeze-Review-Release

Vier Eskalationsstufen statt zwei, von billig nach teuer:

| Stufe | Wirkung | Mechanismus | Voraussetzung |
|---|---|---|---|
| 1. Session-Token sperren | Agent bekommt 403, Container läuft weiter | `vault_tokens` invalidieren | ✅ Schema existiert |
| 2. Kontrollierte Fehlerantwort | Statt der Modellantwort eine Sicherheitsmeldung | `return` im Gateway-Handler | ✅ Gateway ist Chokepoint |
| 3. Container-Freeze | Prozess pausiert, Speicher bleibt für Forensik | Docker API `pause` (bzw. `SIGSTOP`) | ❌ `docker/docker` fehlt in `go.mod` |
| 4. Egress-Blackhole | Netzwerk tot, nur für Non-LLM-Traffic nötig | nftables `drop` bzw. `ip route add blackhole` | ❌ |

> **Terminologie-Korrektur:** Frühere Entwürfe sprachen von „Sockets auf `0.0.0.0`
> routen". `0.0.0.0` ist keine Null-Route. Gemeint ist ein Blackhole-Route- oder
> DROP-Eintrag.

Der Agent erhält in Stufe 2 eine kontrollierte Meldung statt eines
Verbindungsabbruchs — das verhindert unkontrollierte Abstürze und Retry-Stürme.
Freigabe erfolgt manuell im Dashboard.

---

## 4. Forensik-Report

Zu großen Teilen Zusammenbau vorhandener Daten, nicht Neuerfassung:

| Bestandteil | Quelle | Stand |
|---|---|---|
| Session-Verlauf vor dem Vorfall | `sessions` + `request_log` | ✅ |
| Latenz, Tokens, TTFB, Status | `request_log` | ✅ |
| Durchsatz, Fehlerraten | `traffic_inspector` (RAM) | ✅ |
| Traces | Langfuse-Layer, `jimesh:events` | ✅ |
| CPU/RAM pro Container | Docker Stats API | ❌ |
| PID- und Socket-Zuordnung | eBPF | ❌ |
| **Prompt/Response-Payload** | — | ❌ bewusst nicht gespeichert |

### Payload-Speicherung ist eine Compliance-Entscheidung

Payloads zu speichern heißt, Secrets zu speichern — beim Incident wären das exakt die
geleakten `.env`-Inhalte gewesen. Zusätzlich können Prompts personenbezogene Daten
enthalten. Ein forensischer Payload-Store braucht daher **von Anfang an** Löschfristen,
Zugriffskontrolle und Redaktion vor der Ablage. Nicht nachrüstbar.

### Bedrohungs-Klassifizierung

Nicht nur Prompt Injection: Data Exfiltration, Privilege Escalation
(Docker-Socket-Missbrauch), Network Scanning, Ressourcen-Missbrauch (Miner).

---

## 5. Isolationsmodell

**Entschieden:** Drei Stufen, nach Onboarding-Aufwand gestaffelt. Der Nutzer soll auf
Stufe 1 starten können, ohne etwas zu installieren.

| Stufe | Isolation | Host-Anforderung | Zielgruppe |
|---|---|---|---|
| **T1** | Rootless Docker, kein Socket-Mount, unprivilegierter User | nur Docker | Laptop, lokale Entwicklung |
| **T2** | gVisor (`runsc`, Systrap) | ein Binary + `daemon.json` | Teams, Standard-Cloud-VMs |
| **T3** | VM pro Projekt (KVM/libvirt), darin Docker + gVisor | Bare-Metal mit KVM | Enterprise, Multi-Tenant |

**Entschieden — KVM/libvirt statt XCP-ng.** Ein früherer Entwurf schlug XCP-ng mit
Open vSwitch und Inline-Suricata in Dom0 vor. Dagegen spricht: XCP-ng ist ein
Xen-Stack mit eigener Management-Ebene (Xen Orchestra), also ein zweiter zu pflegender
Infrastruktur-Stack; Suricata inline in Dom0 ist dort nicht der vorgesehene Weg (das
übliche Muster ist eine dedizierte Firewall-VM als Transit-Gateway); und XCP-ng
braucht Blech. KVM/libvirt liefert dieselbe Isolationsgrenze, ist aus Go über `virsh`
fernsteuerbar und war bereits die ursprüngliche Wahl. **Der Hypervisor ist nicht der
Differenzierer.**

### gVisor-Präzisierungen

* Systrap ist **nicht** ptrace. Die alte Ptrace-Plattform wurde wegen ihrer Latenz
  durch Systrap (seccomp + injizierter Trap-Handler) ersetzt. Systrap braucht keine
  Hardware-Virtualisierung und läuft damit in jeder gewöhnlichen Cloud-VM.
* Kata Containers braucht dagegen Nested Virtualization.
* **eBPF läuft nicht *innerhalb* von gVisor** — im Sandkasten gibt es keinen echten
  Kernel. Der eBPF-Sensor läuft auf dem Kernel der Workspace-VM und beobachtet den
  Sentry-Prozess von außen.
* Zur Sicht *in* die Sandbox hinein: gVisor hat eigene Trace-Points, die Ereignisse
  über einen Socket-Sink ausgeben. Ein früherer Entwurf beschrieb das als „Export ins
  eBPF-Subsystem des Host-Kernels" — das trifft den Mechanismus nicht. Das Ergebnis
  (Sichtbarkeit) stimmt, der Weg ist ein anderer.

---

## 6. Netzwerk: Allowlist schlägt Detektion

**Entschieden — Default-Deny-Egress vor allem anderen.**

Frühere Entwürfe setzten auf Suricata-Regeln zur *Erkennung* von DNS-Tunneling,
TOR-Verbindungen und Massen-POSTs. Der härtere und billigere Weg ist, den Traffic
konstruktiv unmöglich zu machen: Egress-Allowlist pro Workspace auf JiMesh-Gateway,
Paket-Registries und Git-Remote.

Damit gilt:

* Exfiltration an beliebige Ziele ist ausgeschlossen, nicht heuristisch erkannt.
* **Aller LLM-Traffic wird zwangsweise durch JiMesh geleitet** — die Inspektion wird
  unumgehbar statt freiwillig. Solange ein Agent direkt zu `api.anthropic.com`
  telefonieren kann, ist die gesamte Gateway-Inspektion optional, und Malware wählt
  sie nicht.
* Suricata wird zum Backstop für den Rest, nicht zur Hauptkontrolle.

---

## 7. Controller-Level-Features

| Feature | Problem | Lösung | Stand |
|---|---|---|---|
| **DLP / Key-Redaktion** | Agent druckt Keys im Klartext in den Chat | Muster (`sk-`, `gho_`, `BEGIN PRIVATE KEY`, `.env`-Zeilenform) in der **Antwort** maskieren | ❌ — hätte den Incident erwischt, ist reine Regex |
| **HITL-Gate** | Agent führt `bash`/`write_file` autonom aus | Gateway hält an, Dashboard-Freigabe per Y/N | ❌ |
| **Ephemere Workspaces** | Container laufen tagelang und bieten Angriffsfläche | VM/Container nach Task bzw. Inaktivität zerstören | ❌ |
| **Zero-Trust Credentials** | `.env` im Klartext im Projektordner | Vault, JIT-Injektion nur in den Prozessspeicher | ✅ Mandat 9, Schema existiert |

---

## 8. Detektor-Strategie

Injection-Erkennung wird **nicht selbst gebaut**. Sie ist ein bewegliches
Forschungsziel, und spezialisierte Anbieter haben auf großen Angriffskorpora
trainiert.

**Entschieden — pluggable Detektor, der durch das eigene Mesh läuft.** Modelle mit
offenen Gewichten (Prompt Guard, Llama Guard) liegen auf NVIDIA NIM, wohin JiMesh
ohnehin routet. Der Scanner wird damit einfach eine weitere Chain — mit Bandit,
Failover und Budget-Check. Kein zweites Inferenz-System.

Die billigste Stufe braucht gar kein Modell: Secret-Muster in der Antwort sind Regex,
kosten Mikrosekunden und decken den real eingetretenen Schadensfall ab.

> Versionsstände, Lizenzen und Wartungszustand der genannten Projekte sind vor einer
> Produktentscheidung zu prüfen — das Feld bewegt sich schnell.

---

## 8b. Bestehende Werkzeuge (statt selbst bauen)

Zwei Open-Source-Projekte decken die Kernel-Schicht bereits ab. Details und Einordnung:
`docs/reference/ebpf/`.

| Projekt | Rolle | Einschätzung |
|---|---|---|
| **AgentSight** (`reference/ebpf/agentsight.md`) | Beobachtung — eBPF + TLS-Klartext an SSL-Grenzen, Korrelation LLM ↔ Prozess ↔ Datei | MIT, Rust, arXiv:2508.02736. **OTLP/GenAI-Export** ist der Integrationspunkt. Nicht neu bauen. |
| **Jailer** (`reference/ebpf/jailer.md`) | Durchsetzung — BPF-LSM-MAC für file/network/exec | Upstream: *nicht produktionsreif*. Braucht Grub-Änderung + Reboot → widerspricht Tier-1-Onboarding. Beobachten. |

Beide bestätigen die Aufgabenteilung aus §1: **eBPF liefert Ereignisse und
Syscall-Durchsetzung, keine Prompt-Analyse.** Jailer kontrolliert `open`, `connect`,
`bind`, `execve` — nirgends Inhaltsverständnis.

Und beide ändern die Priorisierung nicht: Ihr Hauptwert ist Zero-Instrumentation für
Pfade, die man nicht kontrolliert. JiMesh kontrolliert den eigenen Proxy-Pfad. Der
Restbereich — Traffic *an* JiMesh vorbei — wird von der Egress-Allowlist (WP5)
billiger geschlossen als von einem eBPF-Sensor.

---

## 9. Marktposition

Kommerzielle LLM-Firewalls liefern ein Urteil zurück — und dort endet es. Keine von
ihnen kann den Container einfrieren, der den Call abgesetzt hat, weil keine von ihnen
ihn provisioniert hat.

**JiMesh provisioniert die Workspaces selbst.** Daraus folgt die Identitätskette, und
aus der folgt Enforcement. Das ist die verteidigbare Position — nicht die Detektion.
