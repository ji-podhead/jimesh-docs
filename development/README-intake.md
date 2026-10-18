# Development Docs — konsolidierter Bestand (`development/`)

**Status:** Echter Umzug (Operator-Entscheid 2026-10-16): der Inhalt von
`jimeshIO/docs/` lebt jetzt **hier** — `jimeshIO/docs/` ist ein Pointer-Stump nur
mit README (Regeln für Agenten). `jimesh-docs/development/` ist die einzig wahre
Schreibadresse für Sprint-Files, Backlog, Research und Handoffs rund um jimeshIO.

**Wichtig (Build):** `development/` liegt **außerhalb** von `content/`/`docs/` und wird
vom Docs-Site-Build **nicht** gerendert. Gründe: (a) der Renderer schreibt flat nach
`dist/docs/<basename>.html` — 678 Dateien mit wiederkehrenden Namen
(`README.md`, `index.md`, `HANDOFF-*.md`) würden sich massenhaft gegenseitig
überschreiben; (b) die Broken-Link-Prüfung schlägt bei Asset-Relativen-Links fehl
(Bilder aus Abschnitten werden nicht kopiert). Wenn einzelne Development-Docs
öffentlich gerendert werden sollen: explizit kuratieren und nach `content/` spiegeln —
nicht der Ordner umstellen.

## Bestand

| Bereich | Was drin ist | Anlass zum Nachschlagen |
|---|---|---|
| `MASTER-PLAN.md`, `ARCHITECTURE*.md`, `CONFIGURATION.md` | Produkt-/Machbarkeits-Kernplan über Specs | Master-Plan für IA/Scope/Security-Sprints (P0–P3, Risiken, offene Operator-Fragen) |
| `FE-*.md`, `COMPONENT-SCHEMA.md`, `DESIGN-ASSET-MANAGEMENT-SPEC.md` | Frontend-Specs (IA, Plugins, Overview, IaC-Discovery) | Feature-Specs, Priorisierung am echten Code verifiziert |
| `sprints/`, `backlog/` | Sprint-Files + Backlog-Mirror (Operations-Mandate) | Referenziert von `jimeshIO/Agents.md`-Doku-Pflicht |
| `dev/` (knowledge, research, tasks, prompts, legacy, …) | Arbeits-/Research-/Prompt-Ablage der Dev-Session | Großteils historisch; `dev/articles` wurde **nicht** kopiert |
| `research/`, `references/`, `llm_providers/` | Tech-Research (DLP, OTel, SAM-Ontologie, Provider-Notes) | Grundlage der Security-Reihe in MASTER-PLAN §2 |
| `security/`, `diagrams/`, `schemas/`, `plugins/`, `roadmap/`, `i18n/` | Anhangs-Materialien | Verweise aus den anderen Docs |

## Konsolidierungs-Regeln

1. **Schreibadresse:** Neue Docs (Sprint-Files `SPRINT-<N>-<NAME>.md`, Backlog-Mirror,
   Research, Handoffs) landen **direkt hier** in den passenden Unterordnern — nicht
   mehr nach `jimeshIO/docs/` (dort nur noch der README-Pointer). Die Agents-Regeln
   stehen im Stump-README `jimeshIO/docs/README.md`.
2. **Asset-Doppelstelle (?):** `dev/articles/` (108 Dateien, u. a. brand-logos + Artikel-
   SVG/PNG) wurde beim ersten Intake ausgespart (Duplikat-Vermutung) und durch den
   Umzug aus jimeshIO gelöscht — seit dem 2026-10-16 **aus jimeshIO/Git-HEAD restauriert**
   und hier komplett wieder vorrätig (`dev/articles/`, 20 MB). Abgleich gegen das
   `articles/`-Submodul: ~20 Dateien byte-identisch, ~80 ähnlich (andere Export-/SVG-
   Serialisierung, teils gleichnamige Dateien quer über Artikel hinweg), **8
   vermutlich einzigartig** (7× `siem/*.svg`-Diagrammset, `agent-identity-firewalls/
   vault_gap.svg`). Dedupe-Entscheidung: offen — bis dahin bleibt dieser verbatim-
   Bestand die ehrliche Aufnahme.
3. **User-Docs-Ausschluss:** `jimesh2/docs` User-Docs (USER_GUIDE, Agents.md) bleiben an der
   Produkt-Quelle — ausdrücklicher Operator-Ausschluss von der Konsolidierung.
   `development/USER_GUIDE.md`/`development/ONBOARDING.md` stammen hier aus jimeshIO
   (Operator-/Onboarding-Sicht), nicht aus jimesh2.
4. **Secure-by-default:** Ordner wie `internal/` und `security/` können Operator-
   Details enthalten — die Docs-Site-Policy („no keys, no internal hostnames") gilt
   hier genauso; vor jedem Public-Rendering-Weg prüfen.
