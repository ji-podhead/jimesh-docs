# SPRINT-33 — K-LAF Multi-Provider: AWS (und der OSS-Referenz-Stack)

> **Quelle:** Operator-Anforderung 9.9.2026 („Multi-Provider: erst OSS-,
> dann AWS-Deployment") + ROADMAP §6 („Cloud-Provider: SSH als gemeinsamer
> Nenner" + offene Implementierungsfragen O1–O5) + Operator-Research
> (AWS-native Security-Stack, CloudiQS-Muster).
> **Status:** Plan, nicht begonnen. **Regel:** Roadmap §6 O1–O5 müssen vor
> WP3 beantwortet sein — nichts über zwei Wege hinweg festlegen.

## 1. Ziel

JiMesh wird Multi-Provider: der Operator wählt pro Projekt den Provider —
v1: **OSS-Referenz-Deployment** (docker-compose auf eigenem Host — der
heutige Stand, live) und **AWS-Deployment** (EC2-Workspace-Node + SSM/EBS/
Security Groups + IAM-Scoping). Beide bekommen die VOLLE K-LAF-Kette
(Identität, Egress, Freeze, SIEM-Feed) — „der gleiche Sicherheitsvertrag
auf jedem Provider" ist das Produktversprechen.

## 2. Die zwei Deployment-Modelle

| | OSS-Referenz (Basis) | AWS-Deployment |
|---|---|---|
| Node | eigener Docker-Host (SSH, TOFU-Pin) | EC2 (SSM-Session oder SSH+CA), je O1/O2 |
| Steuerkanal | SSH | **O1-Entscheidung:** SSM Session-Manager (provider-nativ) vs. BYO-Transport (Operator startet `aws ssm start-session` lokal, JiMesh dialt 127.0.0.1 — ehrliche v1, Mandat 7 gegen fette SDKs) |
| Inbound-Firewall | nftables (WP7 Sprint 32) | Security Groups (IaC) + nftables auf der Box (WP5-Egress bleibt!) |
| Metadata-Service | kein Ziel (nur Cloud) | **169.254.169.254 + fd00:ec2::254 = bereits hart im WP5-Deny** (live verifiziert) |
| Persistenz | Docker-Volume | EBS-Volume (an Instance gebunden, Snapshot-Backup) |
| Preis/Quota | Operator-Ressourcen | Budgets-Extension: AWS Cost Explorer-API → JiMesh-Budgets (kostenpflichtige Keys decken die Infrastruktur-USD ab) |
| SIEM | Sprint 32 (Wazuh opt-in) | **Approach D (AWS-native, Abschnitt 4)** ODER dieselbe Wazuh-Box |

## 3. K-LAF-Pflichten, die auf AWS ANDERS sind (aus Roadmap §6 — unverändert bindend)

1. **Zwei Firewalls:** Security Group (AWs-Ebene) UND host-nftables — der
   Exposure-Scan muss BEIDE anzeigen, sonst lügt die Security-Page wieder
   (Lektion WP6: „tatsächliche Erreichbarkeit, nicht konfigurierte Absicht").
   Security-Group-Änderungen nur über IaC+Audit, nftables-Inbound (WP7
   Sprint 32) bleibt das JiMesh-Kontroll-Plane-Interface.
2. **Metadata-Deny:** bereits WP5-Pflicht (169.254.169.254/fd00:ec2::254 im
   EgressRuleset, live getestet) — auf AWS ist das derCredentials-Tresor
   der EC2-Rolle: Instance Profile bekommt MINIMAL-Policy (SSM-Session,
   S3-Objektzugriff nur auf konkreten Bucket-Pfad) — der Metadata-Deny
   verhindert trotzdem nicht, dass die JiMesh-Box selbst über ihr
   Instance Profile Cloud-Creds hält (Roadmap §6, W3): Bewusstsein + Audit.
3. **Cloud-IAM ≠ JiMesh-RBAC:** AWS-IAM ordnet Kontrollebene; JiMesh-RBAC
   (Sprint 22 WP4/OPA) bleibt die Anwendungs-Ebene. Mappung dokumentieren,
   nicht fusionieren.
4. **O5 Datenresidenz:** SSM-Steuerkanal läuft über AWS-Infrastruktur —
   Region-Pinning + Doku für EU-Kunden.

## 4. AWS-native SIEM-Variante („Approach D") — Ersatz-Map aus der Operator-Recherche

Direkte Entsprechung zu Sprint 32 Approach B (Wazuh), **CloudiQS-Muster**
(AWS Advanced Partner, ex-AWS-Engineers; Marketplace-SOC: GuardDuty +
Bedrock-Triage + Security Hub-Aggregation):

| Sprint-32-Komponente (OSS) | AWS-native Entsprechung | Was es macht (Kern) |
|---|---|---|
| Wazuh Indexer+Dashboard | **Amazon OpenSearch Service** (Security Analytics Plugin) | Volltext-Suche, Retention, Sigma-Rule-Analytics, Dashboards |
| Wazuh Manager (Threat-Rules) | **Amazon GuardDuty** | ML-basierte Threat-Detection aus VPC Flow Logs, DNS, CloudTrail, **Runtime-Monitoring für Container** (ECS/EKS/EC2) — Ersatz für Teile des socket-guards |
| Wazuh FIM | **AWS Config** + **SSM** (State Manager/FIM-Checks) | Misconfiguration-/Drift-erkennung; Config-Regeln schlagen an, bevor Fehlkonfigurationen live gehen |
| Audit-Spur | **AWS CloudTrail** | kryptografisch gesicherte API-Audit-Log (wer/wann/von wo — Container-Start/-Stop) |
| alerts.json-Tail → security_events | **EventBridge → Security Hub** | GetFindings-API liefert alle Findings in die JiMesh-Sidebar (ein Feed, kein zweites UI) |
| WP1-Shipper | **CloudWatch Agent / Kinesis Firehose** | redigierte JiMesh-Events → CloudWatch Logs → Subscription-Filter → OpenSearch |
| security_events-Retention | **Security Lake (OCSF) / S3+Athena** | langfristige, abfragbare Event-Ablage |
| WAF (Web-App-Schutz) | **AWS WAF + Shield** | L7-Regeln/DDoS an den Gateways |
| Vulnerability-Suite | **Amazon Inspector** | EC2/ECR/Lambda CVE-Scans |
| Konformitäts-Zentrum | **Security Hub** | Aggregation + CIS/GDPR-Scoring — API-GetFindings speist die JiMesh-Sidebar |

**Was davon NICHT ersetzt wird (unverändert JiMesh-eigen):** K-LAF-
Identitätskette (Sessions/OPA-RBAC), secret-leak-Scanner in App-Payloads,
Freeze-Mechanik, Egress-Ruleset auf der Box — die melden nur ihre Findings
via API an Security Hub statt an lokale Tabelle/Wazuh.

**OSS-Pendants für die AWS-Variante (Hybrid):** OpenSearch **ML Commons**
(Anomalie-Detection direkt im Cluster), **MLflow** (Modell-Tracking),
SageMaker-Pipelines (Managed MLOps) — vgl. Teil 6.

## 4b. API-Kompatibilität OSS ↔ AWS — „ein Dashboard, austauschbare Sensoren"

**Kernprinzip: JiMesh ist das System of Record. Das Dashboard redet NIE
direkt mit Wazuh, GuardDuty oder Security Hub — nur mit JiMesh-APIs. Die
Provider unterscheiden sich nur in der INGEST-SCHICKE, nicht in der
Dashboard-API.**

### Das vereinheitlichte Findings-Schema (erweiterung von security_events)

`security_events` (existiert, K-LAF WP2/3) bekommt ADDITIVE Spalten —
kein neues Modell, kein UI-Umbau:

```sql
ALTER TABLE security_events
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'builtin', -- scanner|wazuh|guardduty|securityhub|falco|suricata|firewall|siem
  ADD COLUMN IF NOT EXISTS raw_id TEXT DEFAULT '',        -- SIEM-Fingerprint (Dedup + Rückverfolgung)
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',-- critical|high|medium|low|info (ASFF-Severity)
  ADD COLUMN IF NOT EXISTS confidence REAL DEFAULT 0,     -- ML-Detektoren (Sprint 33 WP6), 0=regelbasiert
  ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT ''; -- MLOps-Linie
```

`event_type`-Namensraum bleibt JiMesh-eigen (`secret_leak`,
`siem_alert`, `firewall_rule`, `iac_finding`, `runtime_anomaly`, …) —
die Mapper übersetzen Provider-Namen (ASFF Types, Falco rule, Wazuh rule
groups) auf diesen Namensraum.

### Die zwei Interfaces (Go, beide hinter existierenden Routen)

```go
// FindingSink — WOHIN JiMesh-Findings gehen (Shipper, WP1-Variante).
// OSS-Default: die security_events-Tabelle selbst (Postgres). AWS-Variante:
// SecurityHub (ASFF/BatchImportFindings). Wazuh: Syslog-Socket.
type FindingSink interface {
    Name() string // "builtin" | "wazuh" | "securityhub"
    Ship(e store.SecurityEventRow) error
}

// FindingSource — WOVON Events kommen (Ingest, WP2-Variante). Jeder
// Provider implementiert EINEN Mapper auf security_events-Rows.
type FindingSource interface {
    Name() string
    Poll(ctx context.Context) ([]store.SecurityEventRow, error) // oder Tail
}
```

**Konsequenz:** Wazuh-Anbindung = `wazuhSource` (alerts.json-Tail) +
`wazuhSink` (syslog). AWS-Anbindung = `securityhubSource`
(GetFindings-Loop, ASFF→security_events-Mapper) + `securityhubSink`
(BatchImportFindings, ASFF Custom-Findings). OCSF als Überbrückungsformat:
ASFF ist OCSF-konform und die JiMesh-Rows sind OCSF-mappbar — Dokument-
niveau, kein Code-Zwang (Mandat 7).

### Operator-Konfiguration (nur Settings, kein UI-Zweig)

Setting `security_pipeline`: `builtin` (Default) | `wazuh` | `aws`.
Das steuert, welche Source/Sink-Paare laufen. **Die Dashboard-API bleibt
identisch:** `/api/security/events`, `/api/security/report/{id}`,
Freeze/Release, Ports-Panel — die Security-Sidebar zeigt Quellen-Badges
(`source`-Spalte) und der Deep-Link des Knotens zeigt auf Wazuh-Dashboard
ODER AWS-Console, je nach Pipeline. Genau das verhindert die „zweite,
komplett neue UI".

### Was pro Provider NICHT abstrahiert wird (ehrliche Grenzen)

- Tiefenanalyse: Wazuh-Dashboard-UI vs. AWS-Console sind Links, keine
  Widgets — JiMesh embeded keine von beiden.
- GuardDuty-ML ist ein Black-Box-Detektor (keine Confidence-Regeln lesbar);
  im `builtin`-Pfad bleibt die Regel-Schicht testbar und deterministisch.
- Kosten: der AWS-Sink kostet pro Event — Shippo-Strategie (Sampling,
  Severity-Gates) gehört zur Konfig, nicht ins Dashboard-Feature-Set.

## 5. Work Packages

- [ ] **WP0 — Provider-Interface-Klärung (O1/O4):** `CloudProvider`-Interface
  beside `NodeTransport`; BYO-Transport als v1 (O1), SSM-Plugin-Frage (O2)
  dokumentiert, CA-Bootstrap (O3), Interface-Grenze (O4) — je ein
  Spik-Commit je Frage, Operator-Review vor WP3.
- [ ] **WP1 — AWS-Provider (Deployment-Ebene):** EC2-Launch (AMI/SG/IAM-
  Instance-Profile via Terraform-Module, nicht SDK-Handarbeit), SSM-Session
  (BYO oder SDK — O1/O2), EBS-Volume-Pattern analog
  jimesh-dsh-data-<id>, docker installieren, JiMesh-Bootstrap (CA-Bootstrap,
  O3), ssh_host_keys-TOFU-Pin über SSM-Fingerprint.
- [ ] **WP2 — Security-Group + Metadata-Deny:** SG-Regeln = IaC-Output
  (port 22/SSH nur aus JiMesh-CA-Range oder SSM-only: SG mit
  `ssm` statt 22!), host-nftables + Metadata-Deny unverändert (WP5-Pflicht).
- [ ] **WP3 — Deployment-UX:** Provider-Auswahl im Add-Project-Dialog
  (Local/SSH-Node | AWS), Regions, Budget-Caps; Deployments-Row zeigt
  Provider.
- [ ] **WP4 — Billing/Budget:** AWS Cost Explorer API → Budget-Row
  (project_user_budgets: infra_cost) — der verbrauchsdichte Fix vom
  8.9. deckt LLM-Kosten; Infra-Kosten kommen hinzu (E4-Frage: wer zahlt?
  Team-Budgets).
- [ ] **WP5 — Approach D SIEM-Variante:** Optionaler „Security-Provider
  AWS": GuardDuty+SecurityHub-Anbindung statt Wazuh-Stack (Shipper-Variante
  B via SecurityHub BatchImportFindings — JiMesh-Findings als Custom
  Findings), GetFindings-Ingest in security_events. Terraform-Module.
- [ ] **WP6 — MLOps/AI-Analysen (Operator-Priorität):** behavioral
  Baseline-Anomalie (siehe Blog-Teil), Implementierung in 2 Varianten:
  (a) OSS: OpenSearch ML Commons (Anomaly-Detektoren im Indexer) oder
  MLflow-Track + Eigen-Model (Isolation Forest auf request_log-Frames),
  (b) AWS: GuardDuty-ML sofort, SageMaker-Pipeline für Custom-Modelle
  (Continuous Retrain + Model-Monitor), Bedrock für Alert-Triage-Reports
  (Agentic-SOC-Muster). **No-Mock-Regel:** ML-Detektoren ergänzen die
  Regel-Schicht, ersetzen sie nie; Findings bekommen `confidence` +
  Modellversion.
- [ ] **WP7 — Doku/Blog:** API_DOCS (Provider-Routen), Blog (siehe
  docs/articles/2026-09-09-siem-oss-vs-aws-native.md), Operator-Guide.
  Brand-Assets: offizielles AWS-Architecture-Icon-Set liegt unter
  `repo-assets/providers/aws_svg/` (GuardDuty/SecurityHub/OpenSearch/
  CloudWatch/Inspector/WAF/SecurityLake — Security-Identity-Compliance/
  bzw. Analytics/ bzw. Management-Governance/); Provider-UI-Icons +
  Dashboard-Badges greifen daraus (SVG-Credits/Hinweis: AWS-Icons sind
  trademarked — Nutzung im docs- und Marketing-Kontext ok, nicht im
  Produktnamen).

## 6. Glossar (Enterprise-/B2B-Vokabular für den Vertrieb-Dialog)

| Begriff | Was es ist (Kontext CloudiQS/Security) |
|---|---|
| **KMU / SMB** | Kleine/mittlere Unternehmen (bis ~499 MA) — Zielsegment für schlüsselfertige Security (keine eigene SecOps-Abteilung); CloudiQS' Hauptmarkt |
| **SaaS** | Software als Service (JiMesh selbst ist SaaS-fähig); SOC-2-Prüfung ist für SaaS-Käufer oft Kaufvoraussetzung |
| **Enterprise** | Multi-Account-Governance, hunderte Accounts, zentrale Policies, Security-Drift-Kontrolle |
| **SOC 2** | Prüfstandard für SaaS-Betrieb (Security/Availability/Confidentiality) — oft Investoren-Voraussetzung |
| **HIPAA** | US-Gesetz für Patientendaten (PHI) — relevant, sobald JiMesh Healthcare-Nutzung erlaubt |
| **PCI-DSS** | Kartenzahlungs-Standard — Pflicht abPayments; JiMesh Budgets/Payments (Sprint 20 §4) muss hierauf vorbereitet sein |
| **CIS Benchmarks** | Best-Practice-Kataloge (AWS-Foundations-Benchmark, Docker-Benchmark) — Security Hub/Checkov scannen dagegen |
| **Landing Zone** | vorgebauter AWS-Grundriss (Accounts, IAM-Grenzen, Logging, Guardrails) — Multi-Tenant-Muster |
| **Defense in Depth** | Schicht-Prinzip: Prävention → Detection → Response (JiMesh: gVisor/Kata → Falco/Tetragon → Suricata → SIEM) |
| **XDR** | eXtended Detection & Response — SIEM + EDR + Kontext-Korrelation (Wazuh/GuardDuty-Positionierung) |
| **Managed SOC / MDR** | von Partnern betriebenes 24/7-Bedrohungs-Monitoring (CloudiQS AgenticAI-SOC: Bedrock-Analyse + Auto-Remediation) |
| **OCSF / ASFF** | offene Findings-Formate (Open Cybersecurity Schema Framework / AWS-Finding-Format) — JiMesh-Findings können OCSF-konform geschiffen werden |
| **MLOps** | Betrieb von ML-Pipelines (Train→Registry→Deploy→Monitor→Retrain) — SageMaker (AWS) vs. MLflow (OSS) |
| **Data Drift** | Modell-Signalverfall durch geänderte Realität → Model-Monitor → Retrain (Kern der Egress-Anomalie-Pipeline) |

## Nicht-Ziele

- Kein Kubernetes/EKS in v1 (docker-compose-Mandat).
- Kein AWS-SDK im JiMesh-Binary (Mandat 7): Terraform/SSM-CLI als externe
  Prozesse; SDK nur, wenn WP0-Spike es konkret begründet (z. B.
  SecurityHub-Ingest als minimaler AWS SDK Go v2-Client).
- Keine Cross-Cloud-Orchestrierung in diesem Sprint (GCP folgt als
  nächster Provider, gleiche Struktur).
