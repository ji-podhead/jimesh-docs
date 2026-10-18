# Architektur-Decision: Vault Azure Secrets Engine + Wrapper

**Status:** Accepted (Operator, 2026-10-12)
**Bezug:** SECRETS-NETWORK-CP.md

---

## Entscheidung

Wir nutzen den **Vault Azure Secrets Engine** — nicht statische Secrets, sondern
**dynamisch generierte, scoped Azure-Credentials pro Tenant/Workspace**.

## Warum Azure Secrets Engine?

- **Keine lang-lebenden Secrets** — Vault generiert Service Principals mit TTL
- **Automatische Rotation** — Credentials expirieren, werden neu ausgestellt
- **Scoped Zugriff** — jeder Tenant bekommt nur Berechtigungen für seine Ressourcen
- **Audit-Log** — Vault trackt jede Secret-Ausgabe

## Wrapper-Architektur

```
Workspace/User braucht Azure-Zugriff
        ↓
Gateway/CP → Wrapper (Go-Service)
        ↓
Vault Azure Secrets Engine
        ↓
Dynamischer Service Principal (scoped, TTL)
        ↓
Nur die Ressourcen des Tenants
```

## Wrapper-Implementation (jimeshIO/secrets-wrapper/)

Go-Service der:
1. **Authentifiziert** via Keycloak-OIDC → Vault-Token
2. **Generiert** Azure-Credentials via `azure/creds/<role>` (TTL-basiert)
3. **Scoped** pro Tenant-Role nur die nötigen Ressourcen
4. **Leases** managed (Renewal, Revocation)
5. **Proxyt** Zugriff — User bekommen nie die vollen Azure-Creds

### Vault Azure Secrets Engine Setup (einmalig)

```hcl
# Vault konfigurieren (Premium-separat, NICHT auf VM)
vault secrets enable azure

vault write azure/config \
  subscription_id=<ARM_SUBSCRIPTION_ID> \
  tenant_id=<ARM_TENANT_ID> \
  client_id=<ARM_CLIENT_ID> \
  client_secret=<ARM_CLIENT_SECRET>

# Pro Tenant eine Role
vault write azure/roles/tenant-acme \
  application_object_id=<acme-app-object-id> \
  permissions_member="['Microsoft.Resources/subscriptions/resourceGroups/read']" \
  ttl=1h \
  max_ttl=24h

# Credentials holen
vault read azure/creds/tenant-acme
# → { client_id, client_secret } mit TTL
```

### API-Endpoint (Wrapper)

```
GET  /api/v1/tenants/{tenant}/azure-credentials
POST /api/v1/tenants/{tenant}/azure-credentials/renew
POST /api/v1/tenants/{tenant}/azure-credentials/revoke
```

## Integration mit Workspace-Streams

- Jedes Workspace → eigene Azure Role → eigene Event Hubs/Redis/Postgres
- Wrapper gibt nur Creds die zum Workspace passen
- Kein Cross-Tenant-Zugriff möglich

## Deployment

- Wrapper läuft **Premium-separat** (gleiche Ebene wie Vault)
- **Nicht** auf der Core-VM
- Eigener Deploy-Pfad in jimeshIO
