# SPRINT 7 — GHOST-AUDIT-Remediation: Datalake-Surface (Audit-Abschnitt D.4)

**20.9.2026 · Branch `wt-p3-datalake` · Tracking: `docs/GHOST-CODE-AUDIT-2026-09-20.md` Fund D.4**

## Ziel

Der einzige No-Mock-Verstoß des Audits wird ehrlich aufgelöst. D.4: ein Feature
existierte dreifach — Mock-Handler (`gateway/datalake.go`), Geister-Page
(`/dbs/datalake`) und eine nie erreichte "echte" Implementierung
(`cmd/datalaked` + `internal/datalake*`) — und keins der drei lebte wirklich.
Audit-Vorgabe: **Komplett-Entfernung oder echte Implementierung, kein Zustand
dazwischen.**

## Entscheidung: KOMPLETT-ENTFERNUNG

Der Mandat-2-Test "an die echte Datenquelle verdrahten" scheitert an
nachprüfbaren Fakten (alle per grep/lektorat verifiziert):

1. **Kein Deployment erreicht den Debezium-Stack.** Er liegt in
   `deploy/datalake/docker-compose.yml` (nicht in `deploy/siem` — die
   SIEM-Compose enthält Wazuh+Falco+siem-bridge, kein Debezium/Kafka/OpenSearch/
   MinIO) und wird von nirgends gestartet: 0 Referenzen in `Makefile`,
   `src/scripts/local-stack.sh`, `deploy/ansible/` und CI
   (`.github/workflows/ci.yml`). Es gibt auch keine Env-Verdrahtung
   (`DATALAKE_*`/`DEBEZIUM_*` in `.env.example`: 0 Treffer — die
   Kafka-Variablen dort gehören zu kafkabridge, Audit D.6).
2. **Die "echte" Implementierung ist selbst ein Stub.** `cmd/datalaked/main.go`
   (14 Zeilen) druckt eine Zeile und schläft — und importiert **keines** der
   `internal/datalake*`-Pakete. `sink.WriteBatch/Flush` geben `nil` zurück,
   ohne zu schreiben (hätte Daten still verworfen). Repo-weit 0 Importer,
   0 Tests, 0 sonstige Referenzen.
3. **Selbst von Hand gestartet bliebe die Anbindung leer:** keine
   Connector-Registrierung, kein Consumer, kein Lag-Messpunkt. Der Handler
   könnte nur ehrlich "nicht erreichbar / keine Pipelines" melden — eine
   Status-Page ohne Nutzer und ohne Nav-Eintrag, die nie etwas anderes zeigen
   kann, ist die Geister-Page in neu.

Deshalb fallen der Mock-Handler, die Routen, die Geister-Page UND die tote
Kette. `deploy/datalake/docker-compose.yml` **bleibt** als Rezept für die
spätere echte Integration liegen (Infra-Konfiguration ist kein Mock; die Page
kommt zurück, sobald eine echte Quelle existiert).

## Arbeitspakete & Ergebnis

| WP | Task | Status |
|---|---|---|
| WP1 | Backend-Mock entfernen: `gateway/datalake.go` löschen, Routen `/api/datalake/status\|pipelines` aus `gateway.go` streichen | [x] erledigt — Commit `14b74aa`; `go build ./…` + `go vet ./…` grün |
| WP2 | Geister-Kette entsorgen: `cmd/datalaked`, `internal/datalake{,/sink,/source,/transform}` (156 LOC) | [x] erledigt — Commit `14b74aa`; 0 Importer verbleiben |
| WP3 | `go.mod`-Aufräumung: `prometheus/client_golang` + Kette (Einzelimporter war `internal/datalake/metrics.go`, Audit E.2) | [x] erledigt — Commit `5319dd2`; build+vet erneut grün; Korrektur-Nebenprodukt: `sigs.k8s.io/yaml` indirect→direct (echter Importer: `plugin_manifest.go:10`) |
| WP4 | Frontend-Geister-Page entfernen: `DatalakePage.tsx` löschen, App.tsx-Import+Route streichen. Nav-Eintrag existierte nicht (`dbItems` kannten nur backups+discovery), i18n-Keys/Links: 0 | [x] erledigt — Commit `d22b8ea` |
| WP5 | Doku: MANDATES.md Mandat-2-Fall-Nachtrag, REQUESTS-TRACKING B3-Korrektur, Audit-D.4-Behoben-Vermerk, Backlog-Spiegel | [x] erledigt — Commit in diesem Sprint |

## Abnahme (verifiziert)

- **Backend:** `make go-build` + `make go-vet` grün — golang:latest-Container
  mit derselben Makefile-Regel; der Snap-Docker-Daemon bindet /tmp-Worktree-
  Subpfade nicht (Mount kommt leer an, gegen /home/ji funktioniert es), deshalb
  lief die Container-Invokation auf einer rsync-Kopie des Worktree-Inhalts
  (identische Dateien, gleicher Befehl).
- **Frontend:** `npx tsc --noEmit -p tsconfig.app.json` — 461 → 460 Fehler;
  der einzige Diff ist der weggefallene Pre-existing-Fehler (TS6133) der
  gelöschten Datei selbst; **keine neuen Fehler**.
- **Referenz-Freiheit:** `grep -ri datalake` über Code liefert 0 Treffer;
  verbleibende Nennungen nur in Doku (dieser Sprint, Audit, Tracking) und
  `deploy/datalake/` (bewusst behalten).
- `API_DOCS.md` brauchte keine Änderung: die Routen waren dort nie
  dokumentiert (der Dok-Bug verschwindet mit der Route).

## Bewusst NICHT angefasst

- `internal/cdc` + `cmd/kafkabridge` (Audit D.6) — eigene
  Entscheidungseinheit, hängt nicht am Datalake-Surface.
- Kein Push, kein Merge — Branch bleibt `wt-p3-datalake` bis zur Freigabe.
