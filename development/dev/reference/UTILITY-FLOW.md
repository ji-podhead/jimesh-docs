# JiMesh Utility-Layer: Der integrierte Flow

> **Zweck:** Die Vision „JiMesh als selbst-gehostetes PaaS mit eingebautem
> Auth + DB-Management" als EIN zusammenhängender Flow modellieren.
> Referenziert: SPRINT-22 (Dashboard-IA), SPRINT-26 (DB/CDC),
> SPRINT-27 (Keycloak), DECISIONS.md (E1–E5, E-IdP, E-Policy).
>
> **Status:** Architektur-Bild, kein Sprint — implementiert über 3 bestehende
> Sprints, nicht über einen neuen.

---

## Der End-to-End-Flow (was passiert, wenn ein Team ein Projekt erstellt)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ KEYCLOAK (Sprint 27)                                                    │
│ Login via Keycloak → JWT mit roles + tenant_id                          │
│ ├── User erstellt → Realm-Rolle "member" (nicht "admin")                │
│ ├── Team-Lead → Realm-Rolle "admin" für sein Team/Projekt               │
│ └── External IdP (GitHub/Okta/AWS-IAM-IC) → Zitadel-Föderation → JWT    │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ JWT (RS256, roles + tenant_id im Claim)
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ JiMesh GATEWAY (Sprint 20 WP1 + TASK-011)                               │
│ 1. JWT-Signatur verifizieren (RS256, JWKS von Keycloak)                 │
│ 2. tenant_id + roles aus Claim extrahieren (NIE vom Client)             │
│ 3. OPA-Policy prüfen (E-Policy): darf dieser User dieses Projekt?       │
│ 4. Session-Identität: AgentSessionRow + Vault-Token                     │
│ 5. Budget-Cascade: Team → Projekt → User (Intersektion)                 │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ Session-Token (Vault-minted, Container-gebunden)
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PROJEKT ERSTELLEN (Sprint 22 Dashboard)                                 │
│ Team-Member: „Ich will ein Projekt"                                     │
│ 1. Frontend: Projekt-Deklaration (Name, LLM-Settings, DB-Typ)           │
│ 2. Backend: Projekt-Row in DB (owner = Keycloak-User)                   │
│ 3. OPA: Rollen-Check („member darf Projekte erstellen" → ja)            │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ Projekt existiert, owner hat Master-Admin auf DAS Projekt
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ DEPLOY (Sprint 15/18 + TASK-019)                                        │
│ 1. Container-Spawn: docker run → Container-ID                           │
│ 2. Session-Token minten (TASK-011: Session + Container-ID + trust)      │
│ 3. Egress-Allowlist + Socket-Guard anwenden (TASK-019)                  │
│ 4. codeServerPassword generiert + in API-Response                       │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ Container läuft, Session identifiziert
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ DB PROVISIONIEREN (Sprint 26 WP4 — Provisioning-Kopplung)               │
│ Projekt deklariert „Postgres" → JiMesh:                                 │
│ 1. DB anlegen: CREATE DATABASE proj_<id> ON postgres                    │
│ 2. User anlegen: CREATE USER proj_<id>_app WITH PASSWORD ...            │
│ 3. Rechte: GRANT ALL ON DATABASE proj_<id> TO proj_<id>_app             │
│ 4. Credential in Vault: secret/jimesh/projects/<id>/db                  │
│ 5. Injektion zur Laufzeit: DATABASE_URL als Env in den Container        │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ DB läuft, Credential in Vault, Container hat Zugriff
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ CDC / DB-SYNC (Sprint 26 WP3)                                           │
│ 1. pglogrepl überwacht die Projekt-DB (WAL-Replication)                 │
│ 2. Änderungen → JiMesh-Events (Redis Streams)                           │
│ 3. Operator sieht alle DBs im Dashboard (Master-DB-Zugriff)             │
│ 4. Enterprise-Kunden: Debezium-Addon für bestehende Kafka-Infra         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ OPERATOR-SICHT (Sprint 22 WP2 — Admin/RBAC-Seite)                       │
│ Der Operator („Master Admin") sieht und verwaltet:                      │
│ • ALLE Projekte (auch von Teams)                                        │
│ • ALLE Deployments (Container, Ports, Status, Exposures)                │
│ • ALLE Datenbanken (Postgres-Tabellen, Redis-Keys, Schemas)             │
│ • ALLE User + ihre Rollen + Budgets                                     │
│ • ALLE Security-Events (Freeze/Release, Scanner-Verdicts)               │
│ • OPA-Policies (wer darf was)                                           │
│ → Über die Admin/RBAC-Seite (Sprint 22 WP2), NICHT über Keycloak        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TEAM-MEMBER-SICHT (Sprint 22 WP3 — Scopes+Quotas im Proxy-Tab)          │
│ Ein Team-Member sieht und verwaltet:                                    │
│ • SEINE Projekte (nur die, denen er zugewiesen ist)                     │
│ • SEINE Deployments (nur seine Container)                               │
│ • SEINE Budgets (kaskadiert: Team-Limit → Projekt-Limit → User-Limit)   │
│ • KEINE anderen Projekte, KEINE anderen User, KEINE Secrets             │
│ → Über den Proxy-Tab (Hauptseite), nicht über die Admin-Seite           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Die Verbindung zwischen den Sprints

| Sprint | Liefert | Benötigt von | Blockiert |
|---|---|---|---|
| **27 (Keycloak)** | Identität: User, Rollen, tenant_id im JWT | — | 22 (Dashboard braucht Auth) |
| **22 (Dashboard-IA)** | Admin/RBAC-UI: Projekte, Budgets, OPA-Policies | 27 (Keycloak-JWT) | 26 (DB-UI braucht die Projekt-Registrierung) |
| **26 (DB/CDC)** | DB-Discovery, -Management, Provisioning-Kopplung, CDC | 22 (UI für DB-Verwaltung) | — |
| **15/18 (Deploy)** | Container-Spawn, SSH-Tunnel, Egress | 27 (Session-Token), 26 (DB-Credential) | — |

**Implementierungs-Reihenfolge:**
1. **27 WP1–WP3** (Keycloak live, Ingress-Verify) → Identität da
2. **22 WP1–WP3** (Hauptseite + Admin/RBAC-UI + Proxy-Scopes) → UI da
3. **26 WP1–WP2** (DB-Discovery + Management) → DB-Verwaltung da
4. **26 WP4** (Provisioning-Kopplung) → DB ↔ Deploy-Engine verdrahtet
5. **26 WP3** (CDC/pglogrepl) → DB-Sync da
6. **22 WP4–WP5** (RBAC-Kette + Components-Sharing) → feingranular

---

## Was bereits gebaut ist

| Baustein | Sprint | Status |
|---|---|---|
| Session-Token beim Provisioning | TASK-011 | ✅ auf main (cbd5b5b, de17845) |
| Egress-Allowlist + Socket-Guard | TASK-019 | ✅ auf main (cce05f6) |
| Exposure-Dashboard | TASK-013 | ✅ Backend+Frontend auf main (3c68faf) |
| Budget-Cascade (Team→Projekt→User) | TASK-016 | ✅ Entwurf, Wire-in nach Freigabe |
| Keycloak-Container + Realm-Config | SPRINT-27 WP1 | ✅ deploy/keycloak/ + docker-compose |
| Keycloak-Admin-Console | SPRINT-27 WP2 | ✅ läuft (localhost:8081) — Realm-Setup pending |
| DB-Discovery + Management | SPRINT-26 WP1–2 | ❌ nicht begonnen |
| Provisioning-Kopplung (DB + Deploy) | SPRINT-26 WP4 | ❌ nicht begonnen |
| CDC (pglogrepl) | SPRINT-26 WP3 | ❌ nicht begonnen (Entscheidung: pglogrepl für v1) |
| Dashboard-Hauptseite (Tabs) | SPRINT-22 WP1 | ❌ nicht begonnen |
| Admin/RBAC-Seite | SPRINT-22 WP2 | ❌ nicht begonnen |
| OPA-Integration | SPRINT-22 WP4 | ❌ nicht begonnen (Entscheidung: OPA) |

---

## Zusammenfassung für den Operator

Die Vision („JiMesh als PaaS mit eingebautem Auth + DB-Management") ist
**komplett geplant** über Sprint 22 + 26 + 27. Die Einzelteile existieren
als Sprint-Files mit Work-Packages.

**Was fehlt:** die Implementierung der 3 Sprints in der richtigen
Reihenfolge (27 → 22 → 26). Kein neues Sprint-File nötig — die
Integration entsteht durch die Reihenfolge und die shared interfaces
(Sprint 26 WP4 nutzt das TASK-011-Injektions-Muster, Sprint 22 nutzt die
Keycloak-JWT aus Sprint 27, Sprint 26 WP3 nutzt die Redis-Streams aus
R11).

**Kürzester Weg zum „ordentliche PaaS":**
1. Keycloak-Realm konfigurieren (in der Admin-Console, 15 min)
2. Sprint 22 WP1–WP3 (Dashboard-Hauptseite + Admin-UI + Proxy-Scopes)
3. Sprint 26 WP1 + WP4 (DB-Discovery + Provisioning-Kopplung)
→ Damit läuft der End-to-End-Flow oben im Diagramm.
