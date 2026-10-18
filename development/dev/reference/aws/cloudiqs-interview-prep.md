# Interview-Vorbereitung — MLOps / Head of MLOps @ CloudiQS (12.9.2026)

> Kompaktes One-Pager-Set. Quellen im Artikel: siem-smb-guide (alle Links
> live verifiziert). Wirkt als Brücke zwischen JiMesh-Praxis und AWS-Services.

## 1. Der End-to-End-Flow, den du im Kopf erzählen musst

GuardDuty (ML-Detection, inkl. **AI Protection** seit 7/2026: AnomalousModelInvocation · CostHarvesting · PromptInjection.Direct via Bedrock Guardrails) → **EventBridge** (findings automatisch als Events, keine Polling) → **Step Functions** → **Bedrock Agent** (RAG über interne Runbooks; Modell-Split: Claude-Sonnet-/Nova-Pro-Klasse als „Thinker", Haiku/Nova Micro als Pre-Filter gegen Rauschen) → **Lambda-Tool** → Enforcement: eBPF-Map + XDP_DROP (Netz-Kill an der NIC) oder eBPF-LSM (execve → EACCES / SIGKILL der PID — Prozess stirbt, Container bleibt für Forensik).

**Sätze, die gewinnen:**
- „The LLM is the orchestrator, never the sensor." (Detection = klassisch/ML; Agent = Triage/Playbook)
- „An AI finding carries confidence + model_version and adds to the rule layer — never replaces it."
- „GuardDuty selbst hat inzwischen einen investigation agent (Preview 6/2026) — der Differentiator für Consultancies ist die Runbook-Schicht und Cross-Account-Ops, nicht die Raw-Detection."

## 2. Formats, die du nennen können (mit EINEM Beispiel-Shape je)

- **GuardDuty Finding JSON:** top-level `type` (z.B. `Impact:IAMUser/CostHarvesting`), `severity`, `resource`, `service.action`
- **ASFF (Security Hub):** `SchemaVersion`, `Id`, `ProductArn`, `Severity.Label` (0–100), `Resources[]`, `Types[]` — OCSF-kompatibel; `BatchImportFindings` rein, `GetFindings` raus
- **OCSF:** schema.ocsf.io, Security Lake normalisiert ALLES in OCSF
- **Sigma (YAML):** Detection-Rule-Format, das OpenSearch Security Analytics frisst
- **SageMaker Pipeline:** `ProcessingStep → TrainingStep → EvaluationStep → ConditionStep (FPR-Gate) → Registry (PendingManualApproval) → Endpoint → ModelMonitor → Retrain-Trigger`
- **CloudTrail Event vs. GuardDuty Finding:** rohes Audit-Event vs. ML-Verdict mit Kontext — den Unterschied aussprechen können

## 3. Kosten-/Budget-Soundbites

- GuardDuty: vCPU-basiertes Runtime Monitoring (~$1.50/500 vCPUs-Stufen), GB-basierte AI-Protection-Datenanalyse, 30-Tage-Trial
- Egress-Kosten beim Log-Versand (AWS/GCP separat von Vendor-Per-GB-Ingestion) — zwei Budget-Zeilen
- GCP: Ops-Agent pro VM, Cloud Monitoring-Suite kostet extra — einkalkulieren
- Datadog: Deploy-per-Service (Forwarder-Lambda pattern), Per-GB-Ingestion

## 3b. Die zweistufige Architektur (Edge-to-Core-Triage) — dein Aushängesatz

**Stage 1 (Sortierer):** kleines statistisches Modell, immer an, ~$0 — RCF
(Random Cut Forest) über Log-Streams; AWS: GuardDuty-ML nativ; OSS:
OpenSearch AD-Plugin (RCF → anomaly_grade + confidence) + 2026-Zusatz:
Embedding-Clustering (Titan/Cohere Vectors + KNN/k-Means gegen den
"Normal-Cluster") und SLM-Distills (DeepSeek-R1-Distill-Klasse, 1.5–8B)
für millisekunden-schnelles JSON-Log-Scanning. Output: mathematischer
Anomaly-Score, KEINE Semantik ("Pod B sendet 400× Baseline").

**Stage 2 (Denker):** der große Agent wird NUR bei Anomalie geweckt —
AWS: Bedrock Agent — 2026er Reasoning-Generation (DeepSeek-R1 via Bedrock/SageMaker, Claude 4-Generation), RAG über Runbooks + Kontext-Tools:
IP-Reputation, Wartungsfenster, Identity-History); OSS: OpenSearch
agents-tools / Assistant Toolkit (plan-execute-reflect, registrierte Tools —
inkl. einem Tool, das Stage-1-Detektoren ERSTELLEN kann). Nach Verifikation:
scoped Lambda → Enforcement (eBPF-Map + XDP_DROP / LSM EACCES+SIGKILL).

**Warum die Kostenstruktur zählt:** LLM-Tokens nur auf ~0,1% der Events;
ein LLM über rohen Log-Streams wäre zu langsam/teuer/halluzinationsanfällig.
False Positives fließen zurück (Threshold + Baseline-Retrain).
GuardDuty AI Protection deckt Stage-1-Fälle der AI-Klasse nativ:
AnomalousModelInvocation · CostHarvesting · PromptInjection.Direct.

## 3c. Agentic DevSecOps: Skills statt freier CLI (Checkov-Referenz)

AgentSecOps/SecOpsAgentKit (`skills/devsecops/iac-checkov/SKILL.md`) zeigt
das Muster: Security-Tools als Agent-Skills mit festem Tool-Vertrag —
erlaubte Befehle (scan -o json/sarif), Severity-Gates
(`--hard-fail-on CRITICAL`), Suppress-Governance (CRITICAL/HIGH braucht
Security-Review, Inline-Skip mit Begründung), Baseline/Drift-Modus
(nur NEW Findings failen). 750+ Policies, graph-based scanning,
Frameworks: Terraform/K8s/CloudFormation/Dockerfile/Secrets.
→ JiMesh: derselbe Skill kapselt die Sprint-28-WP2b-Checkov-Stufe als
Skills-Hub-Entry (Sprint 23) — Scope-Disziplin wie beim FortiGate-SandboxAgent.
CI-Integration out of the box: GitHub-Actions-Workflow, GitLab-CI,
**Jenkins-Pipeline** (Jenkinsfile: checkov-Container-Stage, JUnit-Artifact
für die Report-UI, hard-fail-on als Gate-Breaker), Pre-Commit-Hook —
Satz: "the scan stage is pipeline-portable; the gate decision is what
stays HITL."

## 4. JiMesh-Praxis ↔ AWS-Abbildung (dein Heimspiel)

Identitätskette (container→session→project) statt fehlender Attribution; Freeze-Leiter (revoke→error→SIGSTOP→blackhole) statt Auto-Play; payload-redigierter SIEM-Feed (DSGVO E3); security_events als System of Record mit FindingSource/FindingSink-Adaptern — „provider switch is a mapper, not a UI rewrite".

## 5. Offene Demo-Materialien

- Wazuh-Dashboard-Screenshot: `docs/articles/siem-smb-guide/wazuh-dashboard-incident-response.png` (Drittquelle, attributiert)
- AWS Console-Screenshots (GuardDuty Findings, Security Hub Score) — du loggst dich gleich ein
- Logo-Liste noch zu holen: Datadog, Cloudflare, Elastic (neues Unified-Logo), Google Cloud (+ Logging/Monitoring-Icons, ex-Stackdriver), Apache Kafka, Redis (neues Cube-Mark, 2024-Rebrand)
