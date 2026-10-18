# TASK-033 — Router-Node L7 (Sprint 36 WP2) — QUEUE

Nach TASK-032. Go-Binary `cmd/jimesh-router/`: localhost:3100 fix,
pgproto3-Proxy (Postgres, 100 % inkl. SELECTs) + RESP-Parser (Redis),
Alias-Registry per Pull von der Control-Plane (Service-Token, langer Poll).
Referenzen: Sprint 36 §2b (pgproto3 = pgx-Dependency), R38 (3-Schichten),
Trendyol/go-pq-cdc-kafka als Logical-Replication-Muster (R38 §4).
Opt-in-Mandat: Router nur auf Wunsch deployen.
