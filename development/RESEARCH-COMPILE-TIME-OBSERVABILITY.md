# RESEARCH-COMPILE-TIME-OBSERVABILITY — Auto-Instrumentation & Static Analysis für JiMesh

| | |
|---|---|
| **Status** | Research — kein Code |
| **Ziel** | Compile-Fehler, Performance-Traces und Struktur-Analyse AUTOMATISCH aus dem Code ableiten, bevor irgendetwas deployed wird |
| **Operator-Input** | "Wie kann man Compiling-Fehler direkt finden und loggen bevor deployt wird?" + "Gibt es Frameworks die den Code kompilieren und Logs ableiten?" |

---

## 1. Der Ansatz: 3 Kategorien von Auto-Instrumentation

### 1.1 Compile-Time Source Generation (statisch)
Der Compiler analysiert den AST und generiert Log/Trace-Code mit in die Binärdatei.

| Sprache | Framework/Tool | Wann | Was |
|---|---|---|---|
| **Go (JiMesh Backend!)** | **OpenTelemetry Go Compile-Time Instrumentation (otelc)** | Compile-Time (-toolexec Flag) | Analysiert Go-AST, injiziert OTel-Spans in ALLE Funktionen inkl. Drittanbieter-Libs — ohne Code-Änderung |
| TypeScript/JS | SWC-Plugins, Babel-Makros | Transpile-Time | Fangt JS/TS-AST ab, fügt Performance-Traces an Funktionsgrenzen ein |
| Rust | tracing-crate Procedural Macros | Compile-Time | #[tracing::instrument] Attribut → Makro schreibt AST um |
| C# / .NET | Fody, Roslyn Source Generators | Compile/Post-Build | IL-Weaving + [LoggerMessage] Attribut → generiert Log-Code in Binärdatei |
| C++ | Clang LibTooling, LLVM Xray | Compile-Time | Compiler-Plugin injiziert Log-Statements direkt in Source Tree |

### 1.2 Dynamic Instrumentation (zur Laufzeit)
Frameworks brechen den Code zur Laufzeit in einen AST auf oder nutzen VM-Hooks.

| Sprache | Framework | Ansatz |
|---|---|---|
| Python | Pydantic Logfire | Import-Hook → AST-Modifikation beim Laden → wrappt jede Funktion mit logfire.span() |
| Java | AspectJ, ByteBuddy | Java-Agents fangen .class-Dateien beim Laden → injizieren Log-Logik in Bytecode |
| PHP | Go! AOP, OpenTelemetry Ext | Stream-Wrapper → AST-Parsen beim Laden; oder C-Extension auf Zend-Engine |
| Ruby | TracePoint API | VM-Events (Methodenaufruf, Schleife) — kein AST-Umbau nötig |

### 1.3 Sprachübergreifend: Universal-Tools

| Tool | Was | Nutzen für JiMesh |
|---|---|---|
| **Tree-sitter** | AST-Parser für 40+ Sprachen (nutzt Neovim, GitHub) | Polyglott-Analysis: Go + TypeScript + Python in einheitlichem Format |
| **ast-grep** | CLI für sprachübergreifende Code-Muster-Suche | Regeln definieren: "Finde verschachtelte Schleifen (O(N²)) in Go und TS" |
| **eBPF** | Kernel-Level Tracing ohne Code-Änderung | Sieht jeden Syscall, jede CPU-Instruktion — für Production-Profiling |

---

## 2. Was JiMesh HEUTE hat

- **go build / go vet** in CI (ci.yml) — fängt Compile-Fehler
- **tsc --noEmit** für TypeScript — non-blocking Report (212 Alt-Fehler)
- **Checkov** (SAST) — IaC-Security-Scan nach Deploy
- **gosec** — Go-Security-Scanner
- **ESLint** — Frontend-Linting
- **quarantine.go** — Deploy-Gate mit Verdicts (off/passed/quarantined/failed)

## 3. Was FEHLT (die Lücke)

- **Keine OpenTelemetry-Spans**: Functions werden NICHT getraced — man sieht nicht WO eine Anfrage langläuft
- **Keine Compile-Time-Instrumentation**: otelc (Go) nicht installiert — jede Funktion braucht manuelle trace-Calls
- **Keine AST-Analysis für Performance**: O(N²)-Schleifen werden nicht erkannt
- **Keine sprachübergreifende Code-Quality-Gates**: ast-grep/Tree-sitter nicht genutzt
- **Deployment-Logs nicht persistiert**: executeDeploy schreibt Logs nur in den Terminal-Response

---

## 4. Konkreter Integrationsplan für JiMesh

### Phase 1: otelc (Go Compile-Time OTel) — KLEIN, 1-2 Tage
```bash
# Install:
go install go.opentelemetry.io/auto/build-tools/otelc@latest

# Build mit Auto-Instrumentation:
go build -toolexec=otelc ./...

# → Jede Funktion hat automatisch OTel-Spans
# → Verbinde mit OTLP-Export (Langfuse/Grafana/Tempo)
```

### Phase 2: Deploy-Gate mit Compile-Logs — MITTEL
```
POST /api/projects/{id}/deploy:
  1. go build -toolexec=otelc → Compile + Spans
  2. go vet → Static Analysis
  3. gosec → Security-Scan
  4. Compile-Errors + Warnings → deployment_logs-Tabelle
  5. ERST DANN: Docker-Build + Container-Deploy
  6. Deployment-Logs → Component "deployment-logs"
```

### Phase 3: ast-grep für Code-Pattern-Analysis — MITTEL
```yaml
# ast-grep rules:
  - id: nested-loop-on2
    language: go
    pattern: "for $A { for $B { $$$ } }"
    message: "Nested loop — potential O(N²)"
  - id: unchecked-error
    language: go
    pattern: "$RET = $FUNC($$$)"
    message: "Unchecked error return"
```

### Phase 4: Tree-sitter für User-Code-Analysis — GROSS
- JiMesh-Container deployen User-Code (Go, Python, TypeScript, Rust...)
- Tree-sitter kann ALLE User-Sprachen in einen einheitlichen AST parsen
- Darauf aufbauend: automatische Code-Review vor Deploy

---

## 5. Referenz-Research-Prompts für Gemini

### Prompt A: otelc Integration
```
Wir haben ein Go-Backend (CGO_ENABLED=0, PostgreSQL via pgx v5) und wollen
OpenTelemetry Compile-Time Instrumentation (otelc) integrieren.
Fragen: 1. Wie konfigurieren wir otelc mit -toolexec?
2. Welche Spans werden automatisch generiert?
3. Wie exportieren wir nach OTLP (Grafana Tempo oder Langfuse v4)?
4. Gibt es Performance-Overhead?
5. Zeige eine konkrete go build Pipeline mit otelc + OTLP-Export.
```

### Prompt B: Deploy-Gate Design
```
Wir deployen Container via SSH auf Remote-Nodes. Vor dem Deploy wollen wir:
1. Compile (go build) 2. Static Analysis (go vet + gosec)
3. Performance-Check (ast-grep für O(N²)) 4. Security-Scan (Checkov)
Alle Logs sollen in einer deployment_logs-Tabelle landen und als
"Deployment Logs" Component in der UI browsbar sein.
Zeige: API-Design + DB-Schema + die Pipeline-Reihenfolge.
```

---

## 6. Static-Analysis-Frameworks

### 6.1 Regelbasierte Engines

| Framework | Ansatz | JiMesh-Nutzen |
|---|---|---|
| Semgrep | YAML-Regeln gegen AST-Muster | CI-Gate oder Autofix injiziert Logging |
| GitHub CodeQL | Code als relationale DB, SQL-ähnliche Abfragen | Audit-Log-Enforcement |
| SonarQube / Qodana | Zyklobmatische + kognitive Komplexität | Custom-Regel: hohe Komplexität = detailliertes Error-Logging Pflicht |
| ast-grep | CLI, Tree-sitter-basiert, sprachübergreifend | Lightweight Semgrep-Alternative |

### 6.2 KI-gestützte Auto-Logging (SOTA 2026)

| Framework | Ansatz |
|---|---|
| AutoLogger (2026, ICSE) | Multi-Agenten: statische Analyse entscheidet whether-to-log + where-to-log, generiert Statements |
| PDLogger / UniLog | Backward Program Slicing + LLM für präzisen KI-Kontext |
| AnomalyGen (2025, arXiv) | Automatische semantische Log-Sequenz-Generierung für Anomaly-Detection |

### 6.3 Semgrep-Regel-Beispiele für JiMesh

```yaml
rules:
  - id: go-nested-loop-on2
    languages: [go]
    patterns:
      - pattern: "for $A { for $B { ... } }"
    message: "Nested for-loop — potential O(N²)"
    severity: WARNING

  - id: go-unchecked-error
    languages: [go]
    patterns:
      - pattern: "_ = $FUNC(...)"
    message: "Unchecked error return"
    severity: ERROR

  - id: ts-missing-catch-boundary
    languages: [typescript]
    patterns:
      - pattern: "await $EXPR"
      - pattern-not-inside: "try { ... }"
    message: "await outside try/catch"
    severity: ERROR
```

### 6.4 Empfohlene Reihenfolge

| Prio | Was | Aufwand |
|---|---|---|
| 1 | otelc in CI (go build -toolexec) | 1-2 Tage |
| 2 | Semgrep in CI + jimesh-Regeln | 2-3 Tage |
| 3 | deployment_logs-Tabelle + UI | 2-3 Tage |
| 4 | AutoLogger-Agent (KI-Pipeline) | 5-8 Tage |
| 5 | Tree-sitter für User-Code | 10+ Tage |