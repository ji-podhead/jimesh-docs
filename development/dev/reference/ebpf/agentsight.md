# AgentSight — eBPF Agent-Observability

> **Quelle:** https://github.com/eunomia-bpf/agentsight (Branch `master`)
> **Lizenz:** MIT · **Sprache:** Rust · **Paper:** arXiv:2508.02736, DOI 10.1145/3766882.3767169
> **Abgerufen:** 6. September 2026. Upstream ändert sich — vor Nutzung gegenprüfen.

## Was es ist

Lokales `top`/`strace`-artiges Observability-Werkzeug für KI-Agenten. Verbindet Prompts
und Modell-Calls mit ihren tatsächlichen Effekten auf der Maschine (Prozesse, Dateien,
Netzwerk). **Kein SDK, kein Proxy, keine Vendor-Integration** — funktioniert auch bei
Closed-Source-CLIs.

Der Kernmechanismus ist genau der, den unsere K-LAF-Spec als Identitäts-Brücke
beschreibt: eBPF-Hooks an den SSL/TLS-Aufrufgrenzen greifen den Klartext ab, bevor er
verschlüsselt wird, und korrelieren ihn mit Syscalls desselben Prozesses.

## Relevante Fähigkeiten

| Fähigkeit | Bedeutung für JiMesh |
|---|---|
| Klartext-Erfassung an SSL/TLS-Aufrufen | Sieht LLM-Traffic, der **an JiMesh vorbeigeht** |
| Korrelation LLM-Call ↔ Prozess ↔ Datei ↔ Netzwerk | Die Semantic-Gap-Brücke, fertig implementiert |
| `report audit --json` | Process spawns, file opens, API calls als strukturiertes JSON |
| **OpenTelemetry GenAI-Export (`gen_ai.*`) über OTLP/HTTP** | **Der Integrationspunkt** — JiMesh konsumiert OTLP statt eigenem eBPF |
| SQLite pro Session (`agentsight-*.db`) | Forensik-Datenquelle für WP4 |
| Rust-Library-Crate `agentsight-capture` | Einbettbar, falls Sidecar statt Fremdprozess gewünscht |
| Container-Unterstützung (`--binary-path docker://<name>`) | Passt zum Workspace-Modell |

Unterstützt out of the box: Claude Code, Gemini CLI, Kimi, Grok, Python-Agents (aider,
open-interpreter), Docker-Container, beliebige Kommandos.

## Anforderungen

- Linux-Kernel 4.1+ mit eBPF (5.0+ empfohlen) für `record`
- **root/sudo für die eBPF-Probes**
- `top`, `vis`, `report` laufen auch ohne eBPF auf Session-Dateien
- Installation: `cargo install agentsight`, Homebrew-Tap, oder Release-Binary (x86_64/aarch64)

## Einordnung für JiMesh

**Passt auf die Beobachtungsseite, nicht auf die Durchsetzungsseite.** AgentSight
beobachtet und berichtet — es blockiert nicht und friert nichts ein. Es füllt damit die
eBPF-Sensor-Rolle aus `K-LAF-ARCHITECTURE.md` §2, nicht den Freeze-Lifecycle aus §3.

**Wichtig zur Priorisierung:** Der Hauptwert von AgentSight ist Zero-Instrumentation für
Pfade, die man *nicht* kontrolliert. JiMesh kontrolliert den eigenen Proxy-Pfad und hat
dort bereits Klartext. Der Gewinn liegt also nicht beim Traffic *durch* JiMesh, sondern
bei Traffic *an JiMesh vorbei* — und den schliesst die Egress-Allowlist (Sprint 20 WP5)
billiger und endgültiger.

Wo AgentSight trotzdem klar gewinnt: die Korrelation von LLM-Call zu Prozess und Datei,
also WP8. Das selbst zu bauen wäre Monate Arbeit.

**Empfehlung:** Nicht neu bauen. Als optionalen Sensor einbinden, bevorzugt über den
OTLP-Export — das hält die Kopplung lose und passt zum vorhandenen Tracing-Layer.
