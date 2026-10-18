# TASK-060 — Control-Plane-Registry (TASK-048): SSH/AWS/GCP/IPAM/K8s auswählbar

**Status:** ✅ umgesetzt & live verifiziert (14.9.2026, Sprint 38) —
Retrospektive mit Datei:Zeilen-Nachweisen und Live-Curl-Protokoll:
`docs/sprints/SPRINT-38-CONTROL-PLANE-REGISTRY.md`. **Quelle:** BACKLOG
TASK-048 (Operator 13.9.: „bei der Provision auswählen: SSH vs AWS vs GCP
vs IPAM vs K8s; Control-Planes editieren/provisionieren in Settings;
Router leitet direkt weiter, kein Hop")

**Nachtrag (14.9., Operator-Scope-Erweiterung):** der TASK-062-Kern
(Settings-Tab `/control-planes`: CRUD + Provision/Status/Deploy-Dialoge)
wurde in derselben Session nachgerüstet (WP5 im Sprint-File). Offen aus
062: CP-Picker in den Workspace-Deploy-Dialogen (TASK-053-Fläche).

## Fundament

- SSH-Deploy existiert komplett (projects_ssh.go — der erste Provider)
- Router-Node (9445fa1) + Firewall (ef7b29b) + Edge-Konzept (WP6)
- MCP-Provider (1d727c2) hat register_db_endpoint etc. als Tools
- E-Editions: Core/DB-Pro/Enterprise-Tier-Modell

## Aufgabe

1. **Provider-Interface:** internal/provision/ — Provider-Interface
   (Deploy/Undeploy/Status/Provision), SSH = erster implementierter Provider
   (bestehenden projects_ssh-Code dahinter kapseln)
2. **control_planes-Tabelle:** (id, name, type, endpoint, credentials_ref,
   status, config JSON, created_at) + CRUD-Routes
3. **Settings-UI-Anker:** GET/POST/DELETE /api/control-planes — der Frontend-
   Tab kommt in TASK-062 (nicht dein Scope!)
4. **Provider-Stubs:** AWS-EC2, GCP-CE, IPAM-Netbox, Kubernetes-API — nur
   Interface-Stubs mit ehrlichen „not implemented" Errors, STRUKTUR schafft
   späteren Anbau ohne Umbau
5. **Router-Direktleitung:** register_router_alias (MCP-Tool existiert) auf
   Control-Plane-Punkt verdrahten (direkt, kein Proxy-Hop)

## Regeln

- CGO_ENABLED=0, pure Go, keine neue Dependency
- Scope: internal/provision/** (neu), internal/store/ (control_planes-Tabelle),
  internal/gateway/ (nur deine Routes), Task-File. NICHT src/frontend,
  NICHT cmd/jimesh-router, NICHT internal/siem
- GIT: explizite Pfade, kein -A, NICHT pushen
- Build: make go-build && make go-vet, gofmt, scoped tests
