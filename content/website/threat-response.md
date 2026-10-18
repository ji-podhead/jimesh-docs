# Threat Response & Absicherung — Cloud, On-Prem, eBPF, gVisor & Kubernetes

> Status: Recherche-Dokument (Research, Stand 2026-10)
> Zugehörige Visuals: `assets/website/slideshow/threat_response.svg` (eBPF-Jailer + Threat-Response-Matrix),
> `assets/website/slideshow/observability.svg`, `assets/website/slideshow/secure_cloud.svg`

---

## 1. Ausgangslage

Unsere Infrastruktur läuft in drei Umgebungen:

| Umgebung | Netz-IPS / „Suricata-Rolle“ | Runtime-Security | Response/SOAR |
|---|---|---|---|
| **AWS** | **AWS Network Firewall** (stateful Engine ist *wörtlich* Suricata-kompatibel) | GuardDuty (inkl. EKS Runtime Monitoring, eBPF-Agent), Falco/Tetragon | EventBridge → Lambda/Step Functions → SG/NACL/WAF/Firewall-Regeln |
| **Azure** | **Azure Firewall Premium IDPS** (verwaltete Suricata-Engine + 67k+ Signaturen, TLS-Inspect) | Defender for Servers/Containers, Falco/Tetragon in AKS (Azure CNI powered by Cilium) | Sentinel (SOAR) → Logic-App-Playbooks → NSG/Azure-Firewall/MDE-Isolation |
| **On-Prem** | **Suricata klassisch** am Gateway (Bare-Metal), Mikro-Segmentierung über Firewall | Wazuh-Agent, Falco/Tetragon auf Nodes | Wazuh-SIAM-Regeln → Firewall-Drop, Host-Isolation |
| **gVisor-Sandboxes** | n/a — Sandbox fängt Syscalls auf User-Space-Ebene | **gVisor Sentry** (eigenes User-Space-Kernel) + Runtime Monitoring → Falco | Worker drainen = Quarantäne |
| **K8s (allen Umgebungen)** | Cilium/eBPF-Dataplane (NetworkPolicy, L3–L7) | **Falco** (Observability), **Tetragon** (Enforcement) | Falcosidekick/Argo → NetworkPolicy, Freeze, Kill |

**Kernfrage:** „Suricata ersetzen“ heißt in der Cloud nicht *weniger* IPS, sondern
*verwaltetes* IPS — beide Clouds betreiben intern tatsächlich Suricata:

- AWS Network Firewall: stateful Rules-Engine ist **Suricata-kompatibel** (inkl.
  verwalteter Threat-Signature-Rule-Groups: Malware, C2, Exploit-Kits, Botnets,
  Phishing, „Attack Response“-Signaturen, die sogar erfolgreiche Kompromittierungen
  wie `id=root`-Antworten erkennen).
- Azure Firewall Premium IDPS: „abstrahierte Suricata-Engine“ dahinter, 67.000+
  Signaturen in 50+ Kategorien, 20–40 neue Regeln/Tag, anpassbar bis 10.000 Regeln
  (Disabled / Alert / Alert+Deny), CVE-Suche in Signaturen, optionale TLS-Inspection.

---

## 2. Wie unsere Infrastruktur abgesichert ist (Layer-Modell)

```
L7   AI Gateway (JiMesh)        — single TLS termination, <1ms Verdicts, SIEM-Log
L3-7 Cloud-IPS                — AWS Network Firewall / Azure Firewall Premium / On-Prem Suricata
L3-4 Cloud-Native-Control     — Security Groups / NSG / WAF (Rate-Limit) / Threat-Intel-Filter
L7   WAF                      — AWS WAF / Azure Front Door+WAF (OWASP, Bots, Rate-Limits)
L2-4 Mikro-Segmentierung      — VPC/Subnet-Design, NetworkPolicy/Cilium, NACL
Runtime  eBPF-Schicht         — Falco (Detect), Tetragon (Enforce), Cilium (Net-Policy)
Sandbox  gVisor               — User-Space-Kernel fängt ALLE Syscalls, entkoppelt vom Host-Kernel
Response SOAR                 — EventBridge/Lambda (AWS), Sentinel/Logic Apps (Azure), Wazuh-Regeln (On-Prem)
```

### 2.1 On-Prem
- **Suricata** als klassisches IDS/IPS am Gateway-Edge (Inline-Mode, AF-Packeting,
  Eve-JSON → Wazuh/Graylog/Observability-Stack).
- **Wazuh** als SIEM/XDR: File-Integrity, Rootkit-Detection, aktive Response-Regeln
  (Firewall-Drop, Account-Disable).
- **Mikro-Segmentierung**: DMZ/App/Data-Zonen, Ost-West-Traffic nur über Firewall-Hops.
- Runtime auf Bare-Metal-Nodes: **Falco** (Syscall-Events) + **Tetragon** (Enforcement),
  da wir hier den vollen Kernel kontrollieren.

### 2.2 AWS
- **AWS Network Firewall** (VPC-Perimeter, source-preservation mode): stateless
  Engine (NACL-artig, schnell) + stateful Engine (**Suricata-kompatibel**, DPI).
  Verwaltete Rule Groups: `ThreatSignatures*` (Malware, C2, Exploits, Botnets,
  Phishing, IOC/„Attack Response“).
- **GuardDuty**: Threat Detection über CloudTrail, VPC-Flow-Logs, DNS-Logs;
  Protection-Pläne für EKS-Audit-Logs, EKS/ECS/EC2 **Runtime Monitoring**
  (eBPF-Sensor), S3-Malware-Scans, RDS/Lambda. „Extended Threat Detection“ korreliert
  Multi-Stage-Attacken (Credential Theft → Exfiltration) zu einem Finding inkl.
  Remediation-Empfehlungen.
- **AWS WAF**: OWASP-Managed-Rules, Bot Control, **Rate-Based Rules**
  (Standard: X Requests / 5 min pro Client-IP → Block bis unter Schwelle).
- **Containment-Automatisierung** (AWS-Referenzarchitekturen, die wir nachbauen):
  1. GuardDuty-Finding → Security Hub → **EventBridge**-Rule.
  2. **Step Functions/Lambda** trägt Angreifer-IP in DynamoDB (mit TTL) ein.
  3. Lambda schreibt **stateless Drop-Regel in die Network-Firewall-Rule-Group**
     und/oder **DENY-Eintrag in NACL** und/oder **WAF-IPSet-Block** (CloudFront + ALB).
  4. SNS-Notification; Pruning-State-Machine räumt Blocklists nach Retention ab.

### 2.3 Azure
- **Azure Firewall Premium**: IDPS (Alert / Alert+Deny pro Signatur, Private-IP-Ranges
  definieren Inbound/Outbound/East-West), **TLS-Inspection** (CA in Key Vault),
  Threat-Intel-Filtering (Alert+Deny), URL/Web-Category-Filtering.
- **Defender for Cloud** + **Defender for Servers/Containers**: Bruteforce-, DNS- und
  Runtime-Alerts; **Defender for Endpoint** kann Hosts isolieren (EDR-Isolation).
- **Microsoft Sentinel (SOAR)**: Automation Rules → **Logic-App-Playbooks**:
  - `AzureFirewall-BlockIP-addNewRule` / `-addToIPGroup` (Deny-Rule-Collection)
  - `Block-AADUser` / `Reset-AADUserPassword`
  - `Isolate-MDEMachine` (EDR-Host-Isolation)
  - NSG-Playbooks: Deny-Regel mit niedrigster freier Priority auf der VM-NSG
    (Bruteforce-/DNS-Alert-Response), inkl. VirusTotal-Enrichment + Teams-Card
    mit „Block / Ignore“-Buttons für den Analysten.

### 2.4 Kubernetes (gilt über allen Umgebungen)
- **Cilium** als eBPF-Dataplane: Kubernetes/CiliumNetworkPolicy (L3/L4, mit ACNS
  auch FQDN- und L7-Policies), Clusterwide-Deny-Policies für Quarantäne.
- **Falco**: Syscall-Events („unexpected process in container“, reverse shell,
  crypto-miner, kubectl-exec-Verhalten) → Alerts → **Falcosidekick** → Webhook/Argo.
- **Tetragon**: Enforcement *im Kernel* (s. u.).
- **GuardDuty EKS Protection** (AWS) bzw. **Defender for Containers** (Azure)
  liefern Audit-Log- und Runtime-Findings mit Pod/Container-Kontext.

### 2.5 gVisor
- Jeder Agent-Worker läuft in einer **gVisor-Sandbox**: der **Sentry** ist ein
  komplettes User-Space-Kernel (Go) — der Container sieht *nie* den Host-Kernel.
  Angriffsfläche auf den Host-Kernel reduziert auf eine Mini-Menge erlaubter
  Syscalls (execve/open/socket sind dem Sentry verboten, seccomp + nobody +
  leere Namespaces drumherum).
- **Runtime Monitoring**: gVisor streamt Trace-Points (alle Syscalls + Container-Start)
  an einen isolierten Monitor-Prozess → **Falco-Regeln funktionieren direkt auf
  gVisor** (FD-Auflösung zu Pfaden, Container-ID im Event).
- Response: gVisor-Worker-Pool **drainen** („gVisor workers drained“ in unserem
  SIEM-Log) = sauberste Quarantäne-Form, weil Sandbox-Evidence nicht mit dem
  Host-Namespace kollidiert.

---

## 3. „Suricata ersetzen“ — wer übernimmt was in der Cloud?

| Fähigkeit (Suricata on-prem) | AWS-Äquivalent | Azure-Äquivalent |
|---|---|---|
| Signatur-basiertes IPS am Perimeter | **AWS Network Firewall** (Suricata-kompatible stateful Rules + verwaltete Threat-Signature-Groups) | **Azure Firewall Premium IDPS** (verwaltete Suricata-Engine, 67k+ Regeln) |
| TLS-Traffic inspizieren | Network Firewall TLS-Inspection-Konfiguration (oder eigene Proxy-Route) | **Premium TLS-Inspection** (Key-Vault-CA) |
| Known-Bad-IP-Drop | Threat-Intel-Filter in Network Firewall, NACL-Deny | Threat-Intel-Filtering (Alert+Deny) |
| Regel-Feintuning | Eigene Suricata-Strings, Strict-Order | 10.000 Signaturen pro Policy umschaltbar (Disabled/Alert/Deny) |
| Eve-JSON → SIEM | Firewall-Logs → CloudWatch/S3 → Security Hub/SIEM | IDPS-Logs → Log Analytics (`AzureFirewallNetworkRule`) → Sentinel |
| Alert&Deny-Inline-Block | Drop/Reject-Actions in Rule Groups | Mode „Alert and Deny“ |

**Fazit:** Wir betreiben **kein eigenes Suricata mehr in der Cloud** — die Cloud-IPS
*ist* (Sentry-kompatibel) Suricata, nur verwaltet, autoskalierend und an die
Control-Plane-APIs der Cloud angeschlossen, sodass Response-Automation direkt
Firewall-Regeln schreiben kann.

---

## 4. Angreifer blocken / aussperren / rate-limitten (Netz-Ebene)

### 4.1 Block & Lockout (IP-Aussperren)
- **AWS**: EventBridge → Lambda schreibt in Sekunden
  - Security-Group-Deny (Instance/Node abschotten),
  - NACL-Deny (Subnet-Ebene, stateless, Reihenfolge beachten),
  - **Network-Firewall-Rule-Group** (stateless Drop, VPC-weit, TTL via Pruning),
  - **WAF-IPSet** (CloudFront/ALB-Ebene, global am Edge).
- **Azure**: Sentinel-Playbook →
  - **NSG-Deny-Regel** (niedrigste freie Priority, alle Angreifer-IPs des Alerts),
  - **Azure-Firewall-Deny** (neue Network-Rule in Deny-Collection oder IP-Group),
  - MDE-Host-Isolation, Entra-User-Disable.
- **On-Prem**: Wazuh-Active-Response → firewall-cmd/iptables-Drop am Gateway;
  Fail2ban-artiges Lockout nach N Fehlversuchen.

### 4.2 Rate-Limiting statt hartem Block (erste Eskalationsstufe)
- **AWS WAF Rate-Based Rules**: X Requests/5 min pro IP → blockiert, bis Rate
  unter Schwelle (permanente Blöcke nur nach GuardDuty/Reputation-Befund).
- **AWS Shield Advanced**: DDoS + Shield-Response-Team.
- **Azure Front Door/WAF**: Custom Rate-Limit-Regeln pro IP/Header.
- **Cilium** (K8s): L7-Rate-Limit-Policies pro Service/Endpoint.
- **On-Prem**: Suricata `threshold:/ track by_src, count X, seconds Y` + Firewall.

### 4.3 Eskalationsleiter (Observation → Freeze → Kill)
Empfohlene Reihenfolge (least destructive first, Evidence-Erhalt!):

```
1. DETECT        Falco/GuardDuty/Defender-Alert, SIEM-Korrelation
2. CAPTURE       File-Acquire, Logs, Volume-Snapshot, CRIU-Checkpoint (Evidence!)
3. NETWORK-ISOLATE   Deny-All-NetworkPolicy (Pod), SG/NSG/Firewall (Node), TTL-Blocklists (Perimeter)
4. FREEZE        Container pausieren ohne Zustandsverlust (s. Abschnitt 5)
5. KILL PROCESS  Tetragon-SIGKILL / kill -9 des bösen Prozesses (Container bleibt)
6. KILL CONTAINER/POD   crictl stop+rm / kubectl delete (Evidence weg!)
7. NODE-QUARANTÄNE    kubectl cordon + drain (nur Quarantäne-Pod bleibt), Node aus LB nehmen
8. NODE-TAUSCH       Node terminieren/reimagen, Credentials rotieren
```

**Wichtig:** Ein Pod unter einem Controller wird nach Delete sofort ersetzt
(same compromised image!). Deshalb: erst NetworkPolicy-Isolation + Credential-Rotation,
dann Patch einspielen, dann Replacement-Pods, dann alte Pods löschen.

---

## 5. Notfall-Container-Freeze („Container einfrieren“ bei CVE-Ausbruch)

Ziel: Ausführung anhalten, **In-Memory-Evidence erhalten**, bevor jemand `kubectl delete`
drückt (was Prozess, Sockets, Writable-Layer und Logs vernichtet).

### 5.1 Freeze-Optionen
| Methode | Ebene | Evidence-Erhalt | Hinweis |
|---|---|---|---|
| `kubectl cordon` + `drain --pod-selector='!quarantine=true'` | Node | Pod bleibt laufen | kein neuer Scheduler-Traffic auf verdächtigen Node; LoadBalancer entfernt Node |
| Deny-All-NetworkPolicy (mit Incident-Label-Selector) | Pod-Netz | Ja | stoppt Exfil/C2, Prozess läuft weiter |
| **Cgroup-Freezer / `docker pause` / `crictl` freeze** | Prozess | **Voll (SIGSTOP-artig)** | proxied unter dem Prozess — kein Signal, das Malware abfangen könnte; `docker exec` wird verweigert |
| **CRIU-Checkpoint** (`docker checkpoint`, K8s-Checkpoint-API, runc) | Prozess+FS | **Komplett** (RAM, Prozess-Baum, Sockets) | Checkpoint-Archiv wegkopieren (S3/Bucket), in Labor-Cluster restoren und dynamisch analysieren (Sysdig/Wireshark-Trace) |
| Tetragon `Sigkill`/`Override` | Syscall | nein | sofortige Inline-Blockierung einzelner Syscalls (z. B. `open` auf Secret, egress `connect`) |
| Scale-to-0 / Node-Delete | alles | nein | letzte Eskalationsstufe — danach nur noch Forensik über Snapshots (EBS/ Disk) |

Praxis-Beispiel (Falco → Checkpoint → Forensik): Falco-Regel feuert →
**Falcosidekick** triggert **Argo-Workflow** → K8s-Checkpoint (CRIU) des Pods →
Archiv in Bucket → Restore im isolierten Analyse-Cluster → Prozess-Baum, Syscall-Trace
und C2-Verbindungen mit `sysdig`/Wireshark rekonstruieren.

### 5.2 Darauf achten
- **Restart-Policy/Controller neutralisieren** bevor Freeze: `safe-to-evict=false`
  annotieren, Node cordonen — sonst ersetzt der Controller den Pod unter dem Freeze.
- Liveness-Probes können während Freeze den Pod „heilen“ → Probes für den
  Incident-Pod deaktivieren (oder Freeze kurz halten).
- EBS-/Disk-Snapshot des Nodes parallel ziehen (GuardDuty-Malware-Scan kann
  Replica-Volumes scannen).

---

## 6. Wie eBPF funktioniert — in der Cloud und in K8s

### 6.1 Grundprinzip
eBPF-Programme werden **verifiziert** (Verifier prüft Speicher-/Schleifensicherheit)
und **JIT-kompiliert** in den Linux-Kernel geladen. Sie hängen an **Hooks**:

- **kprobes/fentry** — an fast jedem Kernel-/Syscall-Einstieg (Prozess-, Datei-,
  Netz-Events ohne Instrumentierung)
- **LSM-Hooks** (`security_file_open`, `security_bprm_check` …) — Enforcement-Punkt:
  Rückgabewert **überschreiben** (`Override` → Operation passiert nie, TOCTOU-frei)
- **tc/XDP & cgroup hooks** — Netz-Policy und LB auf Paket-Ebene (Cilium)
- **cgroup-basierte Identity**: ein cgroup-Verzeichnis pro Container/Pod —
  so weiß das eBPF-Programm, zu welchem Pod/Container ein Prozess gehört

Kosten: kein Packen von Agents in Container, keine Code-Änderung,微-Overhead,
Filterung und Enforcement passieren **synchron im Kernel** (der Angreifer kann
nicht „dazwischen“ kommen).

### 6.2 Rollen in unserem Stack
| Tool | Rolle | Enforcement-Mechanismus |
|---|---|---|
| **Cilium** | Netz-Dataplane + Policy | eBPF an tc/cgroup-Sockets; NetworkPolicy/L7-Policy, FQDN-Filter, Rate-Limits |
| **Falco** | Runtime-Detection (Observability) | Syscall-Events → Regeln → Alert (kein Inline-Block); via gVisor-Trace-Points auch Sandbox-Events |
| **Tetragon** | Runtime-**Enforcement** | `TracingPolicy`-CRDs: `Sigkill` (Prozess wird im Syscall terminiert) und `Override` (Syscall-Rückgabewert = Fehler, Operation findet nie statt); Kubernetes-Filter (Namespace/Label/Pod-Selector) propagiert per cgroup-Map in den Kernel |
| GuardDuty EKS Runtime Monitoring (AWS) | Managed Detection | von AWS betriebener eBPF-Sensor auf den Nodes |
| Azure ACNS / Azure CNI powered by Cilium (AKS) | Managed eBPF-Dataplane | Cilium-Programme von Azure verwaltet (default auf AKS Automatic), optional FQDN-Filter + L7-Policies |

Beispiel-Tetragon-Policy (Secret-Zugriff blocken, Prozess killen):

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: block-secret-access
spec:
  kprobes:
    - call: security_file_open     # LSM-Hook
      selectors:
        - matchArgs:
            - index: 0
              operator: Equal
              values: ["/etc/jimesh/secrets/*"]
          matchActions:
            - action: Override     # Syscall liefert EPERM -> Zugriff findet nie statt
              argError: -1
            - action: Sigkill
```

### 6.3 eBPF in der Cloud vs. On-Prem — Unterschiede
- **Funktionell identisch**: eBPF lebt im Host-Kernel des Nodes — egal ob EC2,
  Azure-VM oder Bare-Metal.
- **On-Prem**: volle Kontrolle — wir laden Cilium/Tetragon/Falco selbst und
  dürfen auch Kernel-Version und BTF forcieren.
- **AWS**: EKS-Nodes sind unsere EC2-Instanzen → eigener eBPF-Stack (Cilium/
  Tetragon/Falco) problemlos; zusätzlich bietet AWS mit GuardDuty Runtime
  Monitoring einen **managed eBPF-Sensor** (Betrieb durch AWS).
- **Azure**: AKS bietet **Azure CNI powered by Cilium** (managed eBPF-Dataplane,
  Standard bei AKS Automatic) + **Advanced Container Networking Services**
  (FQDN-Filter, L7-Policies, Observability). Defender for Containers sammelt
  Runtime-Signale eigenständig.
- **gVisor-Ausnahme**: In einer gVisor-Sandbox läuft der Container gegen den
  **Sentry**, nicht gegen den Host-Kernel → **host-seitiges eBPF sieht die
  Syscalls der Workload nicht**. Deshalb: gVisor bringt sein eigenes
  Runtime-Monitoring mit (Trace-Points → externer Monitor → Falco), und
  Enforcement geschieht in der Sandbox-Policy (Syscall-Filter, `--net-raw=off`,
  capabilities strippen) — nicht per Tetragon.
- **Grenzen/Limits von eBPF** (wichtig fürs Threat-Model):
  - Wer **root/CAP_BPF/CAP_SYS_ADMIN** auf dem Node hat, kann eBPF-Programme
    laden/entladen — Falco/Tetragon-Daten sind auf kompromittierten Nodes
    nicht mehr vertrauenswürdig (deshalb Node-Quarantäne statt „weitersurfen“).
  - eBPF-Verifier-Bypasses (Kernel-Exploits) liegen **unterhalb** von Tetragon →
    zweite Verteidigungslinie nötig: **gVisor** für Agent-Workloads.
  - RBAC auf die Policy-CRDs (TracingPolicy!) hart sichern — wer Policies
    schreiben kann, löscht unsere Enforcement.

### 6.4 Wie das Zusammenspiel im Incident aussieht (JiMesh-Flow)
1. Agent versucht Prompt-Injection/Exfiltration am AI-Gateway → **eBPF-Guard-Hook
   am Gateway** entscheidet <1 ms → Block („BLOCKED“-Wall in attack.svg).
2. Verdicts → SIEM-Request-Log (jede Zeile auditierbar).
3. Burst-Erkennung → `SIEM-CRIT` → **human review** + automatische Quarantäne:
   - gVisor-Worker-Pool wird **gedrained** (Sandbox-Evidence bleibt,
     Agent bekommt keine neuen Task-Executions mehr),
   - Perimeter-Blocklist-Eintrag (SG/NACL/NSG/Firewall) mit TTL gegen die C2-IP,
   - Tetragon-Policy für den Namespace scharf (Egress-Deny + Secret-Override),
   - CRIU-Checkpoint des verdächtigen Pods für die Forensik,
   - Credentials rotieren, Replacement-Workloads erst nach Patch.

---

## 7. Wie wir Threat Response **lokal** machen (JiMesh-Referenzstack)

Basierend auf: *ebpf-llm-guards*, *ebpf-threat-response-enforcement*,
*agent-identity-firewalls* (Quellartikel in `source/jimesh-docs/articles/`).

### 7.1 Die Semantic Gap: kein einzelnes Tool sieht alles

- **Netz-Firewalls** (Suricata, Palo Alto, Fortinet) sehen Pakete, Ports, SNI,
  Volumen — aber nie den Prompt (LLM-Traffic ist TLS zum Provider).
- **AI-Guardrails** (Llama Guard / Prompt Guard, NeMo, LLM Guard) sehen Prompt-
  und Response-Text — aber nicht, ob der Agent gleichzeitig `/etc/shadow`
  öffnet oder einen Reverse-Spawn macht.
- **Syscall-Sandboxes** (gVisor, Tetragon, Falco) sehen Syscalls, Prozesse,
  Sockets — aber nicht das *Warum*. Unsere reale Incident-Erfahrung: die
  `open()`/`read()` auf `.env` waren aus Kernel-Sicht vollkommen legale Calls.

Deshalb: **Korrelation von semantischem Inhalt mit Systemzustand** ist der
eigentliche Schutz — aufgeteilt auf zwei Sensorfamilien, die wir bewusst
getrennt halten, bis eine echte Fusion existiert (Join-Regel: Container-Name-
Gleichheit innerhalb eines Zeitfensters, Closed-Enum-Korrelationszustände,
keine fabrizierten Attributionen).

### 7.2 Lokaler Angriffsschutz: eBPF-Jailer + automatischer Llama Guard

Unsere Wall (in `attack.svg` abgebildet) ist eine 3-Stufen-Pipeline:

1. **Abfangen — eBPF-Uprobes an `SSL_write`/`SSL_read`:** dort existiert der
   Prompt als Klartext im Prozess-Memory, *bevor* TLS verschlüsselt. Zero
   Instrumentation — der Kernel tippt, die App wird nicht angefasst. Transport
   per eBPF-Ring-Buffer in den Userspace-Daemon.
   Grenzen (ehrlich): Uprobes binden an Library-Symbole — Node/OpenSSL-Stacks
   sind tappbar, Go `crypto/tls` (Inlining, kein C-Symbol) nicht; Streaming
   muss im Userspace reassembled werden; **in gVisor läuft kein host-eBPF**.
2. **Automatischer Llama Guard — kleiner Classifier, kein 8B-Judge:** ein
   22M–86M-Parameter Prompt-Guard (Llama Prompt Guard 2) im Rust/C++-Sidecar,
   oder günstiger Embeddings + XGBoost — Verdict in **Sub-Millisekunden**.
   Das Verdict geht **zurück via eBPF-Map** → Drop, TCP-RST, Freeze oder Kill.
   (LlamaFirewall-Lektion: PromptGuard/CodeShield sind *Content*-Layer — sie
   autorisieren keine Tool-Calls; die Ask-Entscheidung läuft separat, fail-closed.)
3. **Kernel-Enforcement — Tetragon `TracingPolicy`:** `SIGKILL` an
   `security_bprm_check`/`security_file_open` — der Prozess stirbt **bevor**
   die Binary überhaupt ausführt (TOCTOU-frei). `Override` überschreibt den
   Syscall-Rückgabewert (die Operation findet nie statt).
   Implementierungs-Ehrlichkeit: TracingPolicies sind **stateless pro Event** —
   es gibt kein „Datei existiert“-Prädikat im Selector-API. Workaround: der
   Userspace-Hook schreibt *und executed* einen einzigartigen Marker-Pfad —
   der Exec selbst ist das Trigger-Event (Pfad-Präfix + Namespace-Guard).

**Exit-Code-Protokoll (Enforcement ohne Honesty-Checks ist Theater):**
`137` = Kernel-Kill gefeuert · `42` = Prozess lief unbeobachtet (kein Tetragon,
kein BTF) — Event heißt „enforcement missed“, wird **nie** als Kill deklariert.
Die Deploy-Pipeline erzwingt das mit einem Live-Kill-Probe gegen einen
Wegwerf-Container (Exit 137 ist Pflicht, sonst schlägt der Run laut fehl).
Betriebslehre: Sensor-Versionen pinnen (z. B. 0.41.x vs. 1M-Instruktions-Limit
des BPF-Verifiers seit Kernel 5.2) + Relaunch-Budgets.

### 7.3 Netz-Sensor lokal: Suricata mit Response-Leiter

- **Nur private SID-Ranges** (eigene Regel-IDs) dürfen Automation triggern —
  Upstream-/Community-Regeln lösen nie eine Response aus.
- **TLS-Realität:** Content-Regeln fangen nur Klartext; Exfil über TLS ist für
  sie unsichtbar (dokumentiert im Postmortem). Content-Matching ist
  Defense-in-Depth — wirklich inspizierbar ist nur dort, wo TLS terminiert
  (unsere Stelle: die eBPF-Uprobe-/Gateway-Schicht).
- **Capture-Placement:** Container-Traffic ist vor `eth0` NAT-ed — **Bridge-Capture**
  (mit Cluster-ID-Attribution) macht Container-Attribution überhaupt erst möglich.
- **Response-Leiter (nie Hair-Trigger):**
  - **DETECT (Default):** jede Detection wird ehrlich geloggt (Quell-IP →
    Container via Runtime-API, Flow-Dedup), **keine Aktion**.
  - **ENFORCE (nur Operator-Flip, Config außerhalb des Repos):** Container von
    *jedem* Netz trennen (Zero Routes zuerst), **dann** freezen (`docker pause`
    / cgroup-Freezer) — Reihenfolge wichtig: Forensik braucht das Prozess-Image
    intakt, und nach dem Freeze redet nichts mehr.
- **Isolationsprinzip:** immer **container-scoped, nie Host-Firewall**
  (ufw/iptables anfassen = Blast-Radius-Gefahr). XDP-Drop am Container-veth
  bleibt v2-Optimierung, keine v1-Abhängigkeit.
- **Noise-Gate vor der Response-Entscheidung:** in unserem gemessenen Stack
  waren > 99 % der Falco-Output-Zeilen interne Metrik-Snapshots (alle 15 s) —
  Response-Automation auf rohen Falco-Output würde minütlich auf nichts reagieren.
- **Status-Surface ≠ Attack-Surface:** der Responder läuft absichtlich ohne
  eigenen Netz-Stack; sein Output-Stream wird über SSH gelesen.

### 7.4 Identity Chain + graduierte Response (aus *agent-identity-firewalls*)

Ein Verdict ist wertlos, wenn man nicht weiß, **wen** man freezt. Kein
kommerzieller LLM-Firewall kann den Container pausieren — weil keiner ihn
provisioniert hat. Unsere Kette:

```
HOST/VM:   PID + socket  →  eBPF-Kontext
CONTAINER: container ID  →  Docker/Runtime-API
SESSION:   session ID    →  Gateway (minted at provisioning)
```

- **Provisioning-basierte Identität:** wir spawnen den Container und minten das
  Token — der Agent *präsentiert* es, er wählt es nicht. Self-declared Identity
  ist für Observability okay, für Enforcement wertlos. Divergiert Netz-Binding
  und Token, ist die Divergenz selbst ein Threat-Signal.
- Vier Isolationsmuster (schwach → stark): Per-Agent-Server-Credentials (minted
  at spawn) → OAuth Token-Exchange (RFC 8693) → Workload-Identity (SPIFFE SVIDs,
  K8s bound tokens) → Use-Time-Injection (Sidecar injiziert Secret nur in den
  Outbound-Call — Vault Dynamic Secrets).
- **Graduierte Response-Leiter:** 1) Session-Token revoken → 2) Controlled
  Error Response (verrät nicht, dass Detection gegriffen hat) → 3) Container
  `SIGSTOP`/Freeze (Memory intakt für Forensik) → 4) Egress-Blackhole.
- **Four-Layer-Agent-Firewall** als Rahmen: Ingress-Identity (wer), Tool-Call-
  Policy (was, fail-closed außerhalb des Modells), Egress & Data (Default-Deny-
  Egress-Tabelle + Taint-Tracking + Response-Scanning für Secret-/PII-Redaction),
  Audit & Receipts (HMAC-signierte Logs **außerhalb** des kompromittierbaren
  Systems — das Modell-Eigen-Narrativ ist kein Beweis).
- Wichtigste/architektonische Lektion aus den Messdaten: LLM-Detektoren reduzieren
  (Attack-Erfolg ~25 % → ~8 %), **Planner/Executor-Isolation eliminiert** (0 %) —
  der Entscheider darf nie sehen, was der Angreifer kontrolliert.

### 7.5 Angriffs-Schutz im attack.svg

Die Wall im Slide ist bewusst **kein AI-Gateway und kein SIEM-Mock** mehr, sondern
der reale lokale Schutz: *eBPF-Uprobes → automatischer Llama Guard (Prompt Guard
22M/86M) → Tetragon-Kernel-Enforcement*, daneben die graduierte Response-Ladder
mit Identity-Chain und Honesty-Check — plus die Threat-Response-Matrix
(AWS/Azure/On-Prem/gVisor/K8s) als Übersicht, wer in welcher Umgebung welchen
Anteil der Pipeline managed.

## 8. Mini-Zusammenfassung pro Umgebung (auch in attack.svg verankert)

**AWS**
- AWS Network Firewall = **managed Suricata-IPS** (stateful Suricata-Regeln,
  verwaltete Threat-Signature-Groups)
- GuardDuty (+ EKS Runtime Monitoring, eBPF-Sensor) → EventBridge → Lambda/Step Functions
- Block: Security Groups, NACL, Network-Firewall-Rule-Group, **WAF Rate-Based Rules**
- Freeze: Cordon/Drain, CRIU-Checkpoint, EBS-Snapshot-Forensik

**Azure**
- **Azure Firewall Premium IDPS** (Suricata-Engine, 67k+ Signaturen, TLS-Inspect,
  Alert&Deny pro Signatur)
- Defender for Cloud/Servers/Containers + **Sentinel-SOAR-Playbooks**
- Block: NSG-Deny-Regel (niedrigste Priority), Azure-Firewall-Deny/IP-Group,
  MDE-Host-Isolation, Entra-User-Disable
- K8s: Azure CNI powered by Cilium (eBPF-Dataplane), FQDN-/L7-Policies via ACNS

**On-Prem**
- Klassisches **Suricata** IDS/IPS am Gateway (Inline) + **Wazuh** SIEM/Active-Response
- Mikro-Segmentierung (Zonen-Firewall), Falco/Tetragon auf den Nodes
- Freeze: cgroup-freezer / `docker pause`, CRIU-Checkpoint, Host-Isolation

**gVisor**
- **User-Space-Kernel (Sentry)** fängt jeden Syscall — Host-Kernel bleibt außen vor
- Runtime-Monitoring-Trace-Points → Falco; Raw-Sockets/Exec default-unsafe-off
- Quarantäne = **Worker-Pool drainen** (Evidence-freundlichste Isolation)

**Kubernetes**
- **Falco** = Augen (Syscall-Detection), **Tetragon** = Hände (Syscall-Override/Sigkill),
  **Cilium** = Netz-Policy (Deny-All, FQDN, L7)
- Freeze: Incident-Label-Deny-All-NetworkPolicy + `safe-to-evict=false` + CRIU-Checkpoint
- Node-Quarantäne: `kubectl cordon && drain --pod-selector='!quarantine'`

---

## 9. Quellen (Auswahl)
- AWS Network Firewall — Rules Engines & Threat Signature Rule Groups
  (docs.aws.amazon.com/network-firewall)
- AWS Security Blog: „Automatically block suspicious traffic with AWS Network Firewall
  and Amazon GuardDuty“; „GuardDuty + WAF v2 auto-block“
- GuardDuty — Remediating Kubernetes findings / EKS Best Practices: Incident Response
- Microsoft Learn: Azure Firewall Premium (IDPS, TLS-Inspection), Azure Networking Design Guide
- Microsoft Sentinel — Playbook-Templates (Block IP, Isolate MDE), Azure Firewall Logic-App-Connector
- Tetragon — Enforcement-Doku (Override/Sigkill, Threat Model)
- gVisor — Runtime Monitoring, „Threat Detection in gVisor“, „Containing a Real Vulnerability“
- Azure Learn — Azure CNI powered by Cilium (eBPF-Dataplane, ACNS)
