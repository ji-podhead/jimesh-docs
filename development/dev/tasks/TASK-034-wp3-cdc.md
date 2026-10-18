# TASK-034 — WP3 CDC in-process pglogrepl (Sprint 36, R38 Stufe 3a) — RESULT

**Datum:** 12.9.2026
**Sprint:** SPRINT-36 WP3 (in-process CDC) — `docs/sprints/SPRINT-36-LOGGER-SDK-ROUTER-CDC.md` §WP3
**R38-Fundament:** `docs/research/R38-cdc-final-layered-synthesis.md` §1 (Stufe 3a = pglogrepl in-process, v1 optional; Debezium-Hub = Enterprise, NIEMALS v1-Ersatz) und §4 (wal_level=logical ist die Anfrage an den Kunden; Verweigerung → L7-Router Stufe 2 deckt 100 % inkl. SELECTs).
**Status:** GEBUEN + VERIFIZIERT an der ECHTEN Replikationsverbindung. STANDALONE — Router-Integration (WP6 CDC-Forwarder) kommt in der Merge-Runde.

---

## Geliefert (Datei:Zeile für die geforderten Fundstellen)

`src/backend/internal/cdc/` — 6 Dateien, ~1850 Zeilen, CGO_ENABLED=0, pure Go
(Dependency: `github.com/jackc/pglogrepl v0.0.0-20260824121319-4ae5c490f7ce`
gepinnt in go.mod/go.sum).

| Forderung | Fundstelle |
|---|---|
| **StartReplication** (Aufgabe 1) | `internal/cdc/cdc.go:213` `func StartReplication(ctx context.Context, connString, slotName, publicationName string) (*Replication, error)` — ergibt `(*Replication, error)`; der geforderte Channel ist `Replication.Events() <-chan CDCEvent` (cdc.go:176). Setup-Fehler sofort als error; Streaming-Fehler ehrlich über `Err()` nach Channel-Close. |
| **CDCEvent mit op-Typen** (Aufgabe 3) | `internal/cdc/cdc.go:115` `type CDCEvent struct` (op/lsn/ts/xid/table/before/after, JSON-Tags für den späteren Forwarder); op-Typen cdc.go:86–93 (`OpInsert/OpUpdate/OpDelete/OpBegin/OpCommit` + `OpTruncate` als Superset — das Ausschweigen wäre Audit-Verlust). Message→Event-Mapping pure: `eventFromMessage` cdc.go:426. |
| **Slot-Manager** (Aufgabe 2) | `internal/cdc/slot.go` — `EnsureReplicationSlot` slot.go:120 (IF-NOT-EXISTS-Semantik: pre-check auf pg_replication_slots + create + Race-Toleranz `isDuplicateObject` preflight.go:99), `EnsurePublication` slot.go:165 (FOR ALL TABLES), `EnsurePublicationForTables` slot.go:185 (add-table ohne Entfernen), Drops idempotent. Replication-Protokoll-Seite: `pglogrepl.CreateReplicationSlot` in StartReplication cdc.go:296 — diese pglogrepl-Version hat kein IfNotExists-Feld, deshalb ist die Semantik check-then-create mit Race-Toleranz (File-Kommentar slot.go:1–13, ehrlich). |
| **Voraussetzungen** (Aufgabe 5) | Package-Kommentar cdc.go:1–38 (wal_level, max_replication_slots/max_wal_senders, REPLICATION-Attribut, pgoutput, Publication, REPLICA IDENTITY, ehrliche Completeness-Subsemantik). Laufzeit: `CheckPrerequisites` preflight.go:67 mit typisierten Fehlern (ErrWALLevel cdc.go:72, ErrNoReplicationRole cdc.go:75, ErrSlotPluginMismatch cdc.go:78, ErrSlotsExhausted cdc.go:81). |

## Tests (Aufgaben 4 + No-Mock)

* **Unit (`cdc_test.go`, 15 Tests):** Message-Fixtures aus pglogrepl-Strukturen — tupleToMap (text/null/toast/binary/truncation), eventFromMessage (insert/update('K'/'O')/delete/begin/commit/relation-cache/truncate/unknown-relation), LSN-Format, Namens-Validierung, Duplikat-Erkennung. LAUFEN IMMER (go test ./internal/cdc/).
* **Integration (`integration_test.go`, 3 Tests) — ECHTE Replikationsverbindung:** env-guarded `CDC_TEST_DSN`; `make go-test` setzt ihn bewusst NICHT (skip ehrlich, kein Slot-Leak auf Dev-Infra). Header-Kommentar dokumentiert die exakten Kommandos. Ergebnis (12.9.2026, Postgres 16 Container, wal_level=logical):
  - `TestIntegrationPrerequisites` PASS — Status: wal_level=logical slots=0/10 wal_senders=0/10 db=jimesh role=jimesh(superuser).
  - `TestIntegrationSlotManager` PASS — Slot cdc_it_slot plugin=pgoutput, idempotentes Ensure (restart_lsn unverändert), Publication FOR TABLE mit Add-Table-Toleranz, saubere Drops.
  - `TestIntegrationStartReplicationEndToEnd` PASS (8s) — BEGIN/INSERT/UPDATE/DELETE/COMMIT als Events, xid geteilt, ts = Commit-Zeit, before/after mit REPLICA IDENTITY FULL (update before=alice/after=bob, delete before=bob), LSN-Reihenfolge WAL-getreu; **Zweitverbindung hat die unbestätigte Transaktion REPLAYiert (at-least-once, by design)**.
* **Env-Restore:** wal_level nach der Runde exakt zurückgesetzt (ALTER SYSTEM RESET + restart → replica); Artefakte (Slot/Publication/Tabelle) von den Tests selbst entfernt (0 rows verifiziert).

## Build/Checks (Mandate §6, ehrlich)

* `go build ./internal/cdc/ && go vet ./internal/cdc/` — PASS. gofmt clean.
* `go test ./internal/cdc/ -count=1` — 15/15 PASS (Unit).
* Alle Binaries kompilieren (server, jimesh-logger, jimesh-mcp, kafkabridge, socket-guard). **Der Tree-Build-Blocker ist `cmd/jimesh-router` — WIP des verstorbenen TASK-033-Agents** (SPRINT-36 §WP6: „wird als Fundament übernommen, nicht neu gebaut"; postgres.go/redis.go sind unfertig) — **nicht WP3**.
* **Check für den Operator:** `cd src/backend && go build ./cmd/server && go test ./internal/cdc/`. `make restart-backend` kompiliert nur `cmd/server` (scripts/backend-entry.sh:38) — der Router-WIP-Blocker blockiert es nicht.

## Abgabe an die Merge-Runde

* API: `StartReplication(ctx, connString, slotName, publicationName)` → `(*Replication, error)` mit `.Events() <-chan CDCEvent`, `.Err()`, `.Wait()`; `CheckPrerequisites(ctx, connString)` → Report + typisierte Fehler (WP6-Forwarder kann Stufe-3a vs. L7-Stufe-2 ehrlich als Status rendern).
* API_DOCS.md bewusst unberührt (CDC hat keine HTTP-Routes in v1 — wie abgesprochen).
* Offen: Router-Merge (WP6 CDC-Forwarder), Debezium-Enterprise-Seite (R38 Stufe 3b).
