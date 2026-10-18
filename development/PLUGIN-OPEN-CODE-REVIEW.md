# PLUGIN-RESEARCH: open-code-review (Alibaba)

> **Repo:** https://github.com/alibaba/open-code-review
> **Stars:** 37.151 · **Language:** Go · **License:** Apache-2.0 · **Last push:** 2026-09-19
> **Logo:** assets/icons/integrations/open-code-review.svg

## Was es ist
Hybrid-Architecture Code-Review-Tool: **deterministische Pipelines + LLM Agent**.
Battle-tested bei Alibaba. Präzise Line-Level-Kommentare, Multi-Language-Ruleset
(NPE, Thread-Safety, XSS, SQL-Injection). OpenAI & Anthropic kompatibel.

## Warum PERFEKT für JiMesh
| Eigenschaft | Nutzen |
|---|---|
| **Go** | Selbe Sprache wie JiMesh-Backend — als Container oder Library integrierbar |
| **Apache-2.0** | Uneingeschränkt als Plugin nutzbar |
| **OpenAI/Anthropic kompatibel** | Nutzt unseren LLM-Proxy (/v1) — keine externe API nötig |
| **Hybrid: Regeln + LLM** | Exakt unser Compile-Time-Observability-Konzept (RESEARCH-COMPILE-TIME-OBSERVABILITY.md) |
| **Multi-Language** | Ergänzt Semgrep (YAML-Regeln) um deterministische Go-Pipelines |

## Integration als JiMesh-Plugin

### Deployment-Typ
- **Container-Plugin**: open-code-review als Container auf dem SSH-Target
- Wird über den JiMesh Deploy-Pfad installiert (framework: "code-review")
- Ports: API-Port für Webhook-Empfang

### Was es in JiMesh macht
1. **Pre-Deploy-Review**: Wenn ein Deployment stattfindet, reviewt open-code-review
   den Code im workspacePath VOR dem Container-Deploy
2. **Pull-Request-Review**: Webhook auf GitHub/GitLab → Review mit Line-Level-Kommentaren
3. **CI-Integration**: In den Deploy-Gate eingebaut (nach go build + go vet + gosec,
   vor dem Docker-Build)
4. **LLM-Part**: Nutzt den JiMesh LLM-Proxy (/v1) — die Review-Chain entscheidet
   welches Modell die Kommentare generiert

### API-Design für JiMesh-Integration
```
POST /api/projects/{id}/code-review          — Review auf workspacePath starten
GET  /api/projects/{id}/code-review/{reviewId} — Review-Status + Findings
GET  /api/projects/{id}/code-review/history    — Alle Reviews für das Project
POST /api/plugins/code-review/webhook           — GitHub/GitLab Webhook-Empfang
```

### Plugin-Catalog-Eintrag
- Kategorie: Security (oder DevOps)
- Berechtigungen: SSH read (workspacePath), LLM Proxy write (Review-Request)
- Config: LLM-Chain-Auswahl, Language-Regeln aktiv/deaktiv, Severity-Schwelle
- Install-Wizard: Chain auswählen → Regeln aktivieren → Webhook-URL generieren

### Verhältnis zu bestehenden Scannern
| Scanner | Was | Ebenfalls integriert |
|---|---|---|
| **gosec** | Go-Security (besteht) | ja |
| **Checkov** | IaC-Security (besteht) | ja |
| **Semgrep** | YAML-Regeln (geplant) | P2 |
| **Agent-Scan (R1)** | Agent-Config-Scan | Sprint A |
| **open-code-review** | Source-Code-Review + LLM | NEUES PLUGIN |

## Nächste Schritte
1. Plugin-Catalog um open-code-review erweitern
2. Deploy-Framework "code-review" hinzufügen
3. Stitch-Screen für Code-Review-Results (Findings im Project-Detail-Tab)
4. Backend: POST /api/projects/{id}/code-review implementieren
