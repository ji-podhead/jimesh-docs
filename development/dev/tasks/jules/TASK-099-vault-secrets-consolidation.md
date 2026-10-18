# TASK-099 — Vault/Secrets-Konsolidierung: Die EINE Architektur (4 Implementierungen → 1)

**Quelle:** Operator 16.9. — „das mit vault und project secrets kapiere ich irgendwie auch nicht, das muss auch endlich mal ordentlich gemacht werden, nicht 4 komplett unterschiedliche Implementierungen. Wieso hat Platform ein Vault, aber Project Secrets sind in Security und nicht in Workspace??? Das macht doch alles keinen Sinn. Man kann ja immer noch kein Workspace in der Sidebar auswählen — für welchen Workspace sind nun die Project Secrets und für welches Project??? Das muss auch noch mal genau mit Schemas und OOP geklärt werden: welche Objekte haben Secrets, zu was gehört was?"

---

## Das Problem: 4 SEPARATE Vault-Implementierungen

| # | Surface | Route | Backend | Scope-Selector | Was es tut |
|---|---|---|---|---|---|
| A | ProjectSecretsPage | /security/secrets | POST /api/vault/* (security/vault.go) | ❌ **KEINER** | K-LAF-Laufzeit-Secrets (JIT-Tokens, AllowedAgents) — aber FÜR WEN? |
| B | VaultDashboardPage | /vault-dashboard | /api/secrets-engines (secrets_engines.go) | n/a | Engine-Registry (Vault-Server, AWS-Secrets-Manager) |
| C | workspace-secrets-section | Workspace-Create-Dialog | (via Workspace-Create) | Workspace-Context | „KV Storage anlegen? Welche Engine?" |
| D | provisioning/bridge.go | (Auto-Workflow) | store/vault.go + Store | Project-Context | JIT-Credentials generieren bei Provisioning |

**Die 4 Implementierungen kennen sich gegenseitig NICHT.** Jede hat eigene Routen, eigenen Store, eigene UI, eigenen Workflow.

## Die EINE Architektur (OOP + Schema)

### Das Domain-Modell

```
SecretsEngine (Platform-Ebene)
  └─ gehört zu: dem JiMesh-Stack (Operator verwaltet Engines)
  └─ Route: /api/secrets-engines (VaultDashboardPage, Platform-Tab) ← BLEIBT
  └─ Beispiel: HashiCorp Vault auf :8200, AWS Secrets Manager, GCP Secret Manager

Secret (Domain-Objekt, das ALLES hat)
  └─ gehört zu: Workspace ODER Project ODER App (parent_id + parent_type)
  └─ Route: /api/secrets (NEU — ersetzt /api/vault/*)
  └─ Key-Value: key, value (encrypted), metadata
  └─ Scope: resolved aus dem parent (Workspace → Project → App)

JIT-Token (Access-Grant für Agents)
  └─ gehört zu: einem Secret + einer Session
  └─ Route: /api/secrets/{id}/access (ersetzt /api/vault/access)
  └─ shown exactly once, expiry, AllowedAgents
```

### Die Vererbungs-Kette (was gehört zu was):

```
SecretsEngine (Operator-Verwaltung)
  └─ hat: viele Secrets (über engine_id)

Workspace (Level 1)
  └─ hat: Secrets (scoped: alle Secrets die parent_type=workspace haben)
  └─ erbt: von der Engine (die die Secrets physisch speichert)

Project (Level 2, in einem Workspace)
  └─ hat: Secrets (parent_type=project)
  └─ erbt: vom Workspace (Workspace-Secrets sind für alle Projects sichtbar)

App (Level 3, in einem Project)
  └─ hat: Secrets (parent_type=app)
  └─ erbt: vom Project + Workspace
```

### Das Schema (Postgres):

```sql
-- Ersetzt vault_secrets + vereint alle 4 Implementierungen
CREATE TABLE IF NOT EXISTS secrets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    engine_id TEXT NOT NULL DEFAULT 'embedded', -- welche Secrets-Engine
    parent_type TEXT NOT NULL DEFAULT 'workspace', -- workspace | project | app
    parent_id TEXT NOT NULL DEFAULT '',           -- die Workspace/Project/App-ID
    key TEXT NOT NULL,                            -- der Secret-Name
    value TEXT NOT NULL,                          -- encrypted (AES-GCM-256)
    metadata JSONB DEFAULT '{}',                   -- description, tags, rotation-policy
    allowed_agents TEXT[] DEFAULT '{}',            -- welche Agent-Sessions dürfen lesen
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(engine_id, parent_type, parent_id, key) -- ein Key pro Scope
);

-- JIT-Access (ersetzt vault_tokens + vault_access)
CREATE TABLE IF NOT EXISTS secret_access_grants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,                      -- die Agent-Session die liest
    token TEXT NOT NULL,                           -- one-time token (hash)
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Die Frontend-Architektur

```
DIE EINE Secrets-Page: /secrets (ersetzt /security/secrets + /vault-dashboard als Secret-Verwaltung)
├── Scope-Selector (aus der Sidebar: Workspace → Project → App)
│   └── Zeigt NUR die Secrets des selektierten Scopes + vererbte Secrets
├── Secret-Liste (key, description, created_at, allowed_agents)
├── [Create Secret] (im aktuellen Scope)
├── [Edit Secret] (im aktuellen Scope)
└── [Delete Secret] (im aktuellen Scope)

DIE EINE Engine-Verwaltung: /platform/secrets-engines (bleibt im Platform-Tab)
├── Engine-Liste (Vault, AWS, GCP, embedded)
├── [Add Engine] / [Edit Engine] / [Test Engine]
└── Engine-Settings (connection, auth, region, etc.)
```

**Wo ist die Secrets-Page?**
- `/secrets` ist die **EINE** Secret-Verwaltung (alle Scopes)
- Der Scope kommt aus dem **Global-Scope-Selector** (Workspace → Project → App)
- Wenn KEIN Scope gewählt: Zeige ALLE Secrets (Operator-Sicht) mit Parent-Badges
- Wenn ein Scope gewählt: Zeige NUR die Secrets dieses Scopes + vererbte

**Was gelöscht/ersetzt wird:**

| Alt | Neu | Grund |
|---|---|---|
| /security/secrets (ProjectSecretsPage) | /secrets (NEU: SecretsPage) | Kein Scope-Selector → ersetzt durch die EINE Page mit Scope |
| /api/vault/secrets | /api/secrets | Die 4 Implementierungen → 1 API |
| /api/vault/access | /api/secrets/{id}/access | JIT-Token-Grant |
| /api/vault/tokens | (entfällt) | In secret_access_grants aufgegangen |
| /api/vault/audit | /api/secrets/audit | Audit bleibt, Route umbenannt |
| vault_secrets (Tabelle) | secrets (Tabelle) | Neues Schema mit parent_type/parent_id |
| security/vault.go | (in die neue secrets.go migriert) | 1 Handler-Set statt 4 |

**Was BLEIBT:**

| Was | Warum |
|---|---|
| /vault-dashboard → /platform/secrets-engines | Engine-Verwaltung ist Platform-Sache |
| /api/secrets-engines | Engine-Registry bleibt (TASK-065/066) |
| workspace-secrets-section.tsx | Workspace-Create-Dialog fragt weiterhin „KV anlegen?" |
| provisioning/bridge.go | Auto-Workflow nutzt die NEUE /api/secrets-Route |

---

## Jules-Implementierungs-Auftrag

### WP1: Backend-Konsolidierung
- `internal/store/secrets.go` (NEU — ersetzt store/vault.go): secrets + secret_access_grants Tabellen, CRUD mit parent_type/parent_id
- `internal/gateway/secrets.go` (NEU — ersetzt security/vault.go): GET/POST/PUT/DELETE /api/secrets + /api/secrets/{id}/access
- Migration: vault_secrets → secrets (parent_type/parent_id aus project_id/workspace_id ableiten)
- JIT-Token: secret_access_grants (one-time, expiry, session-bound)

### WP2: Frontend-Konsolidierung  
- `views/SecretsPage.tsx` (NEU — ersetzt ProjectSecretsPage): Scope-Selector (aus useGlobalScope), Secret-Liste, CRUD
- `ProjectSecretsPage.tsx` löschen
- `/security/secrets` → Redirect auf `/secrets`
- `/vault-dashboard` → Redirect auf `/platform/secrets-engines` (Engine-Verwaltung)

### WP3: Scope-Integration
- SecretsPage nutzt `useGlobalScope()` (TASK-074-WP2): workspace → project → app
- Vererbungs-Anzeige: wenn Project ausgewählt → zeigt Project-Secrets + Workspace-Secrets (vererbt)
- Sidebar-Eintrag: `/secrets` in der Workspace-Sektion

### WP4: Doku
- API_DOCS: /api/secrets + /api/secrets/{id}/access
- Schema-Doku: secrets + secret_access_grants
- SPRINT-File: die 4→1-Konsolidierung dokumentiert
