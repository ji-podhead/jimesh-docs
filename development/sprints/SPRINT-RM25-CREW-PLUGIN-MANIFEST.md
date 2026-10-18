# SPRINT-RM25 — CREW-PLUGIN-MANIFEST (jimesh-crew als jimesh-Plugin, Plugin-Manifest v1)

> Cross-Repo-Sprint: Manifest-Owner ist das jimesh-crew-Repo
> (`docs/planning/sprints/rm25_jimesh_crew_plugin_manifest.md`, Branch
> `rm25-jimesh-plugin-manifest`). Dieser Record dokumentiert die Plattform-Seite (jimesh-Repo).
> Datum: 26.9.2026 · Schema: TASK-106 (`src/backend/internal/domain/schema/plugin_manifest.go`, unverändert)

## Ziel

jimesh-crew als Plugin im JiMesh-Plugin-System sichtbar machen statt als unverbundenes
Nebensystem: (1) validiertes `plugin.yaml` im crew-Repo, (2) Registrierung im einzigen
Registry-Mechanismus, den das Backend heute hat — dem compiled-in Catalog (TASK-103).

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `plugin.yaml` im jimesh-crew-Repo-Root — alle Pflichtfelder des Go-Schemas (`id`, `name`, `version`, `surfaces`, `authSupported`, `security.egress`, `security.capabilities`) + optionale Felder; validiert mit `schema.ParsePluginManifest` (golang:latest-Container: VALID) und mit AJV gegen `docs/plugins/plugin.schema.json` (VALID); bestehende Schema-Tests grün | [x] erledigt |
| WP2 | Draft-Korrekturen (im crew-Repo dokumentiert): icon → Lucide `users` (`crew-icon.svg` existierte nicht; SPEC verlangt Lucide-Name/URL), `requiredSecretScopes` → `secrets:read:<name>`-Konvention (Vorbild jules.yaml; es gibt KEINE Scope-Taxonomie im Backend — grep-verifiziert), egress um `gateway.discord.gg` + `cdn.discordapp.com` ergänzt | [x] erledigt |
| WP3 | Catalog-Registrierung (Plattform-Stopgap): 4. Eintrag `jimesh-crew` in `gateway/plugins.go` — `GET /api/plugins` listet es; `wrapperApiBase: http://localhost:8104` (crew-api, Host-Publishing 127.0.0.1:8104), `authModes: ["service_account"]`, `configSchema: {"crewApiUrl"}` | [x] erledigt |
| WP4 | Doku-Sync: API_DOCS-Katalog-Zeile + dieser Sprint-Record + BACKLOG-Spiegel | [x] erledigt |

## Abnahme-Kriterien

1. `go build ./...` grün (golang:latest-Container, keine Host-Toolchain) — [x] (gleicher Lauf wie 2.)
2. `go test ./internal/domain/schema/` grün — [x] (bestehende TASK-106-Tests)
3. `GET /api/plugins` antwortet `jules`, `linear`, `github_app`, `jimesh-crew` — [x] als Code-Konstante; live-Verifikation nach `make restart-backend` dem Operator überlassen (in dieser Session wurde der laufende Stack NICHT neu gebaut/neu gestartet)
4. crew-seitig: `plugin.yaml` gegen Go-Schema + JSON-Schema validiert (VALID/VALID) — [x]

## Ehrliche Retro — was NICHT geliefert wurde (echte Installation bleibt offen)

- **Kein Manifest-Ingestion-Pfad:** `ParsePluginManifest` hat außer seinen eigenen Tests 0 Aufrufer
  — der Backend liest `plugin.yaml` nie; kein Registry-Endpoint, keine Datei-Discovery. Der
  SPEC-Install-State („manifest is ingested and validated against plugin.schema.json“) existiert
  nicht; der Catalog-Eintrag ist handgeschrieben, kein Manifest-Reader.
- **Keine Persistenz von Installationen:** `POST /api/plugin-installations` = Echo ohne
  PostgreSQL-Schreibzugriff; `GET` antwortet immer `[]` (offene TASK-103-Schuld, API_DOCS
  dokumentiert das ehrlich).
- **Keine `/api/plugins/jimesh-crew/*`-Wrapper-Routen** (`api`-Surface deklariert, nicht realisiert).
- **Kein Health-Probe** gegen `healthCheck.endpoint`; die Stacks teilen sich kein Docker-Netz
  (crew-api: Host-Publishing 127.0.0.1:8104).
- **Kein `service_account`-Auth-Flow**, kein Secrets-Engine-Wiring der Scopes, kein Widget-Frontend
  (`surfaces: widget` = Deklaration).
- **Nebenbefund (separater Fix nötig):** die MCP-Tools `tools_github.go`/`tools_linear.go` rufen
  `/api/plugins/github/*` bzw. `/api/plugins/linear/*` auf — diese Routen existieren nicht in
  `gateway.go` (Phantom-Calls).

## Koordinations-Notiz (crew-Repo)

Im crew-Repo lief parallel eine RM26-Session. Ihr Commit `032a688` („feat(rm26)“, 14:19:30) hat die
frisch geschriebene `plugin.yaml` (md5-identisch mit der validierten Datei) mit aufgenommen; der
RM25-Branch-Commit `a159661` (14:22:41) enthält die Sprint-Doc- und BACKLOG-Updates. Beide Commits
liegen auf dem Branch `rm25-jimesh-plugin-manifest` — der Manifest-Inhalt ist der validierte,
kein Divergenz-Stand (md5 verifiziert).

---

## Nachtrag 2026-09-27 — Rename jimesh-crew → meshsquad

Operator-Entscheidung: das Plugin heißt jetzt **`meshsquad`** (Name in RM31 gegen echte
GitHub-Namespaces auf Kollision geprüft; Gesamtplan im Crew-Repo:
`docs/planning/MESHSQUAD_INTEGRATION_PLAN.md`). Umgesetzt im selben Zug:

- Crew-Repo `plugin.yaml`: `id: "meshsquad"`, `name: "MeshSquad — Multi-Agent Team
  Orchestration"`, Version 0.1.1 → 0.2.0 (Identitäts-Wechsel; i18nKeys bleiben `crew.*`,
  Rebrand bei der Repo-Extraktion).
- `gateway/plugins.go`: Catalog-Eintrag ID/Name/Description + Kommentar aktualisiert
  (`GET /api/plugins` listet jetzt `meshsquad`).
- API_DOCS-`/api/plugins`-Zeile synchronisiert; BACKLOG-RM25-Spiegel um RM25-5 ergänzt.

RM25-4 (echte Installation: Ingestion, Persistenz, Wrapper-Routen, Health-Probe,
service_account, Widget/Chat-Surface) bleibt unverändert offen — der Rename ändert
nichts an der Lücke; alle offenen Punkte sind jetzt unter der Plugin-ID `meshsquad`
zu leisten.
