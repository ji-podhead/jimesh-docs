# SPRINT-26 — Utility-Layer: DB-Discovery, -Management & CDC (Epic 14)

**Mandat vom 6.9.2026:** Datenbanken gehören direkt zur Utility-Ebene.
Roadmap §8, Vorläufer Sprint 8, Referenz `docs/reference/debezium/`,
Forschung P8. Bisher nur Backlog, nie als Sprint begonnen.

## Ziel

JiMesh erkennt und verwaltet Datenbanken, die es selbst provisioniert hat
(oder discovered hat), als Teil der Utility-Ebene — konsistent mit dem
bestehenden Deploy-/Discovery-Muster (SSH-Exec, kein Daemon-Port, kein
Docker-SDK, Mandat 7).

## Blockierende Entscheidung — CDC-Mechanismus (P8, bisher offen)

| Option | Aufwand | Bemerkung |
|---|---|---|
| Debezium Server (Redis/HTTP-Sink) | M, opt-in Compose-Addon | Vorlage: `docs/reference/debezium/` |
| Kafka-Stack (Sprint 8) | L | Nur Enterprise-Tier, nicht Default |
| **pglogrepl (direkte WAL-Replikation)** | S–M | Kein zusätzlicher Service, passt zu Mandat 7 |

**Vorläufige Empfehlung:** pglogrepl für v1 (kein neuer Service), Debezium
als opt-in-Addon für Enterprise-Kunden mit bestehender Kafka/Redis-Infra.
Operator-Entscheidung noch ausständig.

## Work Packages

- **WP1 — DB-Discovery:** DB-Container/Instanzen über die bestehende
  Docker-Discovery + Port-Detection erkennen (Version, `wal_level`/
  `logbin`, Replication-Slots, Größe) — via SSH-Exec, **keine** Daemon-
  Ports (Mandat 12).
- **WP2 — DB-Management:** DB/User anlegen, Migrationen, Backups über
  SSH-Exec; Credentials ausschließlich via Vault (Mandat 9), nie als
  CLI-Klartext-Argumente (gleiche Lektion wie der 5.9.-Incident).
- **WP3 — CDC** (blockiert durch die Entscheidung oben).
- **WP4 — Provisioning-Kopplung:** „Projekt deklariert Postgres" → JiMesh
  legt DB an, Credential landet in Vault, Injektion zur Laufzeit
  (IaC-Detection-Muster, ähnlich TASK-011 Session-Token-Injektion).

## Akzeptanzkriterien

- [ ] CDC-Mechanismus vom Operator entschieden (P8), in `DECISIONS.md`
- [ ] WP1/WP2 nutzen ausschließlich SSH-Exec, keine offenen Admin-Ports
- [ ] WP2: kein Credential jemals als Kommandozeilen-Argument sichtbar (verifiziert per `ps aux`/History-Check)
- [ ] WP4 wiederverwendet das TASK-011-Injektions-Muster statt einer neuen Lösung

## Referenz

`docs/backlog/BACKLOG.md` Epic 14, `docs/reference/debezium/README.md`.
