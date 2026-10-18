# TASK-034 — CDC in-process pglogrepl (Sprint 36 WP3) — QUEUE

Nach TASK-033. Change-Events (before/after/op) pure-Go im Router via
pglogrepl; Debezium-Hub bleibt Enterprise-Add-on (R38 — NIEMALS v1-Ersatz).
wal_level=logical ist die Anfrage an den Kunden; verweigert → L7-Router
deckt trotzdem 100 %.

---

## STATUS (12.9.2026): GEBUEN + VERIFIZIERT

- Package `src/backend/internal/cdc/` (6 Dateien): StartReplication →
  CDCEvent-Channel (op/lsn/ts/xid/table/before/after), Slot-Manager
  IF-NOT-EXISTS (check-then-create + Race-Toleranz — diese pglogrepl-Version
  hat kein IfNotExists-Feld), CheckPrerequisites mit typisierten Fehlern
  (wal_level≠logical → ErrWALLevel, L7-Router-Fallback R38 §4).
- Verifiziert an der ECHTEN Replikationsverbindung gegen den lokalen
  Postgres-Container (Integrationstest env-guarded CDC_TEST_DSN — make
  go-test läuft bewusst ohne ihn): BEGIN/INSERT/UPDATE/DELETE/COMMIT,
  before/after (REPLICA IDENTITY FULL), ts = Commit-Zeit, LSN WAL-getreu,
  Replay nach Reconnect (at-least-once). Env exakt zurückgesetzt
  (wal_level=replica, 0 Slots/Publications).
- 15/15 Unit-Tests PASS, gofmt/vet/build PASS. API_DOCS.md unberührt
  (keine HTTP-Routes, wie abgesprochen).
- Router-Merge (WP6 CDC-Forwarder) kommt in der Merge-Runde — Package ist
  STANDALONE. Result: `docs/tasks/TASK-034-wp3-cdc.md`.
