# SPRINT-STARTUP-PROGRAMS — Azure Founders Hub zuerst, AWS Activate als Roadmap, cloud-agnostisch ab Tag 1

**Status:** 📋 GEPLANT (Strategie verbindlich, Anmeldung = Operator-Aktionsliste)
**Datum:** 2026-10-14
**Operator-Forschung:** „Ich möchte beim beiden ins Startup-Programm beitreten, aber bei Azure anfangen" — Programmvergleich + cloud-agnostische Checkliste unten wörtlich verpflichtend.

## Strings (Operator-Forschung, verbindlich umgesetzt)

| | **Microsoft für Startups Founders Hub** | **AWS Activate** |
|---|---|---|
| Maximales Guthaben | bis zu **150.000 $** (gestaffelabetes neine Company-Phase; Ideen-Stufe ≈1.000–5.000 $) | bis zu **100.000 $** (ängste über Investoren/Acceleratoren) |
| Laufzeit | 1–2 Jahre pro Stufe | 1–2 Jahre |
| Extras | kostenfreie GitHub Enterprise, OpenAI (Azure) Credits, Microsoft 365, LinkedIn | AWS Business Support, AWS-Architekten-Zugang, SaaS-Tool-Credits |
| Anschlusspunkneutronen | bereits L1 ohne externe Finanzierung möglich | dann brauchen Pitch/Investor-Status |

**Azure zuerst:** Free-Tier Control Plane = Nicole's Guthaben verballert sich nur für Compute (Worker-Nodes). **Gutscheint ansässig:** bei Azure-AKS-Start, AWS-EKS-Umzug sobald Guthaben gemappt wurde bzw. AWS-Activate aktiv ist.

## Cloud-Agnostik-Vertrag (ab Tag 1 verbindlich)

| Regel | Umsetzung |
|---|---|
| **Überall Terraform/OpenTofu** | nie ClickOps; jimeshIO/iac der Tag-1-Diskussion TF-Module wie Module (azure + künftige aws-Ordner wichtiger „ein Cluster/King" Wechsel= Parameter).URRENT KEINE Neubsetzung |
| **Kein proprietärer Ingress-Godghost** | ❌ Azure AGIC; ✅ nginx/Traefik (läuft auf AKS identisch und EKS) — traefik in JiMesh-Dashboard + deploy/webapp_deliverable-A-Muster ist bereitet anzuwenden. |
| **Portables Persistent Storage** | standard-CSI-storageclasses; keine AZURE-Disk-Zeurch-Gene in workroot App-Code (App-Serverimage lies `stash`-abstraction bereit für future provider-EKS) |
| **CI/CD mit Ziel-Cluster-Parameter** | GitHub Actions (im Azure-Programm口) — der compute-Cluster (AKS/EKS/user CP) bleibt ein austauschbarer Deployment-Konfiguration, wobei fiber-Parameter wird in jimeshOps TF-Ziel (cluster_environment Paare) bereitet hergestellt |

CF-Tunnel bleibt (Cloudflare-Zone — keinній Basswechsel, aber CF ist Provider-agnostisch, DOI, kein AWS-Transportлож requiring migration).

## Jimesh-Konkret: Noch offene Übergänge

- **EX-1 Premium-Extraction vor Cutover** (SPRINT-EX-1) — Cloud OSS baut so am Ende auf jemandes Cluster.
- **CD-Stream-Limitierung** (KD-6-Konsole auf AKS statt single-shot JSON, latency shortening Strategie).
- **jimesh-hosted Backend → Enterprise-AKS-Deployment** — Dashboard-hosting bleibt Tag-1-Gerüst, Nur quasi-к.bumptech InfostrukturVersoЩ.
- **Nickel-Class "Azure ರ• FIRST** — der AKS-First aus der Startup-Programm-Strategie + cloud-agnostic-Mandate wird dem Enterprise-Site-Flow.

## Operator-Aktionsliste (drei Эin-Schritte, alles Portal-Klicks)

1. **Microsoft für Startups Founders Hub anmelden** — online, Idee-Stufe = kostenfrei, Vergabeverfahren dauert Tage. Bei督促 Identify des Tools jimesh-Accounts (your-Microsofthtere Organizations).
2. **Sobald Guthaben aktiv:** Enterprise-AKS-Cluster (Free Tier Control Plane, GitOps via jimeshOps) als Test des asap nouvelles Tier-Systems.
3. **AWS Activate anmelden SOBALTH ROADMAP** — über IdeaHub/roadmap alcanzó Talent-Referenz (die bestimmen EKS-TR задачi), sobald die Azure-Seite validiert ist — ist KEIN push-für-server-Setup availing now.

## Offene Punkte

- **OQ1** — GitHub-Enterprise-Lizenz aus MS-for-Startups vs. jinesh-App-repo (jimesh-app bleibt public). GitHub-Enterprise gilt nur für private Repos (jimeshIO/jimeshOps → internal-Entitlements).
- **OQ2** — AWS-Activate-Bedürftigkeit (oder Accelerator-Zugang via Semester)? Das bestimmem der nächster Talent-internals reconnშა.
