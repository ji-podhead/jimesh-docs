# Open Questions — konsolidierte Entscheidungsliste

**Zweck:** eine Datei, die jede noch offene, operator-relevante Entscheidung
im Repo bündelt — statt sie über 6 Sprint-Files und 4 Research-Docs verteilt
suchen zu müssen. Diese Datei **ersetzt keine** der Quelldateien (die
enthalten die volle Begründung); sie ist ein Index mit der Kurzfassung +
Empfehlung, damit ein Scan reicht. Bei jeder Antwort: Entscheidung in die
verlinkte Quelldatei UND in `docs/research/DECISIONS.md` eintragen (wie bei
E1–E5 und Epic 17 bereits gemacht), dann hier den Punkt nach Abschnitt 3
verschieben.

Stand: 7.9.2026.

## 1. Blockierende Sprint-Entscheidungen

Jede dieser drei blockiert konkret benannte Work Packages — nichts
Abstraktes, jeweils ein Sprint wartet direkt darauf. (E-Policy und E-IdP
waren hier bis 7.9., sind jetzt entschieden — siehe Abschnitt 3.)

| # | Frage | Optionen | Empfehlung | Blockiert | Quelle |
|---|---|---|---|---|---|
| Vector-Store | Welcher Vektor-Store für Skill-/Memory-Ähnlichkeitssuche (Epic 18)? | pgvector / Redis-Stack HNSW / Qdrant | **pgvector** — kein neuer Service, pgx v5 unterstützt es nativ | SPRINT-23 WP0 (alles danach) | `SPRINT-23-SKILLS-HUB-SECURITY-MEMORY.md` |
| CDC-Mechanismus | Wie erkennt/repliziert JiMesh Änderungen aus verwalteten DBs (Epic 14)? | pglogrepl (direkte WAL-Replikation) / Debezium Server / Kafka-Stack | **pglogrepl für v1**, Debezium als opt-in-Addon für Enterprise-Kunden mit bestehender Kafka/Redis-Infra | SPRINT-26 (alle WPs ab CDC-Layer) | `SPRINT-26-DB-DISCOVERY-CDC.md` |
| Entropy-Routing | Welches Routing-Design gilt verbindlich? 4 nicht deckungsgleiche Beschreibungen im Repo (R4/R8, `DECISIONS.md` "VERIFIED LIVE", R15+R17 RouteLLM-Stil) | siehe Detail unten | Live-Code entspricht R4/R8 (Full-Response + Avg-Entropy, Threshold 0.45) — **das ist die De-facto-Wahrheit**, die anderen 3 Beschreibungen sind Doku-Drift | SPRINT-24 WP9 | `SPRINT-24-DOC-KONSOLIDIERUNG.md`, `DECISIONS.md` (R4) |

**Entropy-Routing, Detail (frischer Fund, 7.9.2026, bei der `ai`-Domain-
Extraktion entdeckt):** `internal/ai/entropy_cascade.go` definiert einen
kompletten zweiten Router (`EntropyCascadeRouter`, Sliding-Window über
mehrere Chunks statt Full-Response) — **verifiziert: `NewEntropyCascadeRouter`
wird nirgends im Repo aufgerufen**, komplett toter Code, kein Feature-Flag,
keine Route. Das ist vermutlich einer der "4 Designs" aus dem WP9-Fund,
konkret identifiziert: eine zweite Implementierung wurde geschrieben, nie
verdrahtet, nie entfernt. Entscheidung nötig: löschen (Doku-Drift auflösen)
oder als künftiges Cascade-Feature hinter einem Flag behalten?

## 2. Weitere offene Fragen (nicht blockierend, aber unbeantwortet)

Aus den saits-cloud-Reviews (TASK-001/002/003) und R21 (DAP) — niemand
wartet aktiv darauf, aber sie stehen seit dem 6.9. unbeantwortet im Raum:

- **Skill-Dimensionen + Score-Quelle** (R21 §6.2, SPRINT-23 WP0): coding/
  deploy/security/research als feste Dimensionen? Score aus WP2-Scanner-
  Verdict, PoT-Qualität oder User-Ratings — oder eine Kombination?
- **GUARDED-Approval-Queue-UI** (R21 §6.3): eigene Fläche auf der
  Admin-Seite (Epic 17) oder als Escalation-Inbox nach `jimesh-inbox`-Muster
  (TASK-003)?
- **DAP-Adoption-Tiefe** (R21 §6.5): nur Muster-Referenz, oder übernimmt
  JiMesh Teile der DAP-Spec (Tool-Discovery/Invocation-Protokoll) wörtlich?
- **API_DOCS-Migration** (TASK-002, Offene Frage 2): eine OpenAPI-Spec für
  alle ~170 Routen, oder per-Domain-Files wie `jimesh-api`? Wer zieht
  `API_DOCS.md` → `openapi/` durch (Sprint 21 Docs-Phase hängt daran)?
- **Freeze-Review-State** (TASK-003, Offene Frage 4, betrifft K-LAF WP3):
  Escalation-Zustand in Redis (kurzlebig, `jimesh-inbox`-Muster) oder in
  Postgres (Persistenzmandat, revisionssicher)?
- **Alerting-Ansatz** (TASK-003, Offene Frage 5): Prometheus+Alertmanager
  betreiben, oder Budget-/Lag-Checks als leichte Gateway-Cron-Checks ohne
  eigenen Stack?
- **Modell-Discovery-Sweep wieder verdrahten?** (gefunden bei der
  `ai`-Extraktion, SPRINT-21 Teil 2f, `BACKLOG.md` Epic 4): der periodische
  Sweep, der neue Modelle einer bereits konfigurierten Plattform automatisch
  nachzieht, läuft seit der Analytics-Extraktion nicht mehr — Operator hat
  "erst genauer prüfen" gewählt, noch keine Entscheidung getroffen.
- **OR-Benchmarks/Frontend-Architektur** (SPRINT-21 Teil 2f, `BACKLOG.md`
  Epic 4): Backend soll einzige Analytics-Quelle sein (Operator-Prinzip,
  7.9.2026) — braucht (a) den Sweep oben wieder verdrahten, (b)
  `ModelDetailPage.tsx` vom direkten OpenRouter-Call auf den Backend-
  Endpoint umstellen. Kein Zeitplan dafür festgelegt.

## 3. Bereits entschieden (zur Referenz, hier NICHT nochmal fragen)

- **E1–E5 (KLAF Foundation, WP2–4-Freigabe)** — Operator-approved
  6.9.2026, siehe `DECISIONS.md`.
- **Epic 17 Access Policy — Enforcement-Punkt + "kein Casbin/OPA für v1"**
  — Operator-approved 6.9.2026, siehe `DECISIONS.md`. (Nicht zu verwechseln
  mit E-Policy unten — das ist die spätere Admin-UI-Engine-Wahl, diese hier
  ist der bereits gebaute Proxy-Pfad-Enforcement-Punkt.)
- **E-Policy — Policy-Engine: OPA** (Operator-approved 7.9.2026, siehe
  `DECISIONS.md`). Gilt für Admin/RBAC-UI (SPRINT-22 WP4) UND die
  Agent-/Skill-Capability-ACL (R21 §6, ursprünglich Casbin vorgeschlagen —
  "eine Engine, nicht zwei"). Gründe: Rego drückt die Datenresidenz/DSGVO-
  Attribut-Constraints aus (RBAC allein reicht nicht), Bundle-API verteilt
  Policy zentral über B2B-Kunden-Deployments hinweg. OPA Go SDK embedded
  wie Casbin, kein Sidecar — die ursprüngliche "kein Sidecar"-Begründung
  für Casbin war schlicht falsch.
- **E-IdP — Identity Broker: Keycloak — entschieden UND gebaut** (Operator-
  approved 7.9.2026, siehe `DECISIONS.md`, `SPRINT-27-IDENTITY-BROKER-KEYCLOAK.md`,
  Status-Tabelle `docs/reference/AUTH-ARCHITECTURE.md`). Backend fertig,
  live Ende-zu-Ende verifiziert (echter Keycloak-Login → JiMesh-Session →
  `/api/keys` 200); Frontend-Anbindung offen, siehe
  `docs/tasks/TASK-020-frontend-keycloak-oidc-login.md`. Keycloak statt
  Zitadel gewählt: bewusst gegen die Pure-Go-Stack-Reinheit (Mandat 7 —
  Keycloak ist Java/Quarkus), für Reife/Skalennachweis/Enterprise-
  Wiedererkennungswert. Ersetzt die Dashboard-Passwort-Anmeldung (WP0,
  Fallback bleibt aktiv), nicht die Agent-/M2M-
  Session-Tokens (bleiben unverändert).
