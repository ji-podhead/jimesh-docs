# PROMPT-task-099-vault-secrets-unification.md — Vault & Project Secrets Unification

## Goal
Unify the presentation, inheritance, and scoping of Vault Secrets across Platform settings (`/vault-dashboard`), Security (`/security/secrets`), and Workspace Sidebar context.

---

## Architectural Specification & Object-Oriented Secret Ownership

### 1. Two-Tier Vault Architecture
1. **Secrets Engine Registry (`secrets_engines`)**:
   - Location: Platform / Administration (`/vault-dashboard`).
   - Purpose: Configures WHERE secrets live (e.g. Embedded Vault vs. AWS Secrets Manager).
   - Scopes: `global`, `workspace`, `control_plane`.

2. **Secret Values (`vault_secrets`)**:
   - Location: Security (`/security/secrets`) & Workspace Sidebar.
   - Purpose: Stores actual key-value pairs (API keys, SSH credentials, tokens) encrypted via AES-GCM-256.
   - Scopes: `project_id` (Primary) -> Inherited by child `Workspace` and `App` nodes.

### 2. Unified Object Inheritance Model
```
SSH Target
  └── Workspace
        └── Project (Primary Secret Scope: vault_secrets where project_id = p.id)
              └── App (Inherits Project Secrets + JIT Access via /api/vault/access)
```

---

## Deliverables & Acceptance Criteria
1. **Workspace Sidebar Context Integration**:
   - Enable project/workspace selector in Security -> Project Secrets view.
   - Ensure secrets created at Project level are accessible to child Apps.

2. **API Alignment**:
   - `GET /api/vault/secrets` returns project-scoped secrets.
   - `POST /api/vault/access` verifies JIT token scope for child containers.

3. **Validation**:
   - Execute `node scripts/check-frontend-slop.mjs` and `go build ./...` to verify clean compilation.
