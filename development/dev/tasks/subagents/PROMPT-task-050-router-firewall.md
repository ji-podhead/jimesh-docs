# TASK-050-WP1 — Router-Node als Security-Node: Firewall-Integration (⚡PRIORITY)

**Status:** ✅ umgesetzt + live verifiziert (13.9.2026 — SPRINT-36 WP6b,
SPRINT-36-LOGGER-SDK-ROUTER-CDC.md „WP6b"; Bericht mit Fundstellen im Commit)
| **Quelle:** Operator 13.9. („die Router-Node ist unsere Security-Node —
unsere sicheren Deployments werden IMMER durch sie geroutet: Firewall dort
integrieren. Was ist mit User-eigener Firewall?") + E-Priority
(Managed-Ports-First, BYOF später) + E-Firewall (Container/NAT-Node).

## Fundstellen (was existiert)

- **cmd/jimesh-router/**: Edge-Node (1670 Z., gemerged 9445fa1) — protocol/
  postgres/redis/resp/pull/registry/audit — läuft auf SSH-Targets,
  localhost:3100
- **internal/security/firewall_provider.go**: 380 Z., Capabilities/EffectiveRule
  — läuft aber LOKAL (Fehler: „nft: executable not found") → Ziel-Fix nötig
- **internal/deploy/projects_ssh.go:366**: Egress-Muster existiert
  (nftables-Tabelle im Container-Namespace, `jimesh_egress_eth0`)
- **internal/gateway/router_config.go** (TASK-033): Config-Pull-Pipeline
  Gateway→Router

## Aufgabe

1. **Firewall-Target-Fix (firewall_provider.go):** Capabilities/EffectiveRule
   liefern den Zustand VOM ROUTER-NODE (per Config-Pull-Pipeline fragen oder
   SSH-Target-Exec), NICHT lokal auf dem Backend-Host. Neue Route
   GET /api/firewall/status im Gateway (Registry in gateway.go) — das
   Frontend-Tile (SecurityExposurePage:78-95) spiegelt bereits die Payload-
   Shapes (backend/available/version/tables/nat_supported/error).
2. **Inbound-Enforcement im Router-Node:** pro Workspace-Alias ein
   nftables-Regelwerk IM ROUTER-PROZESS (oder per Docker-Net-NS beim
   Container-Spawn, Egress-Muster 1:1 für Inbound): Default-DROP inbound,
   erlaubt nur (a) Gateway/Control-Plane-IP, (b) explizit vergebene Ports.
   Regeln pro Alias via bestehende Registry (cmd/jimesh-router/registry.go)
   + Config-Pull (gateway/router_config.go) verwaltet.
3. **Managed-Model-API:** POST /api/firewall/rules (Gateway) — der OPERATOR
   (nicht der Workspace-User) vergibt Port-Freigaben; User-Sicht read-only
   (E-Priority: BYOF später — dafür nur ein Interface-Stub dokumentieren,
   NICHT bauen).
4. **Live-Verifikation:** wenn Docker-Netz kooperiert: Container-Spawn mit
   Alias → nft-Regel im NS prüfen (docker exec nft list) — sonst Unit-Tests
   mit Fixture-Regelwerk + ehrliche Doku.

## Regeln

- CGO_ENABLED=0, pure Go; nft via exec (wie Egress-Muster)
- Scope: cmd/jimesh-router/**, internal/security/firewall_provider.go,
  internal/gateway/ (nur die Firewall-Route + Registry-Zeile) — NICHT
  internal/store (Parallel-Agent 037 baut dort!), NICHT src/frontend
- API_DOCS.md: NUR DU darfst es anfassen (037-Respawn verzichtet)
- Build: make go-build && make go-vet, gofmt, make go-test (scoped)
- GIT: explizite Pfade, kein -A, NICHT pushen
- Doku: BACKLOG TASK-050-Status + Sprint-36-File (falls WP-Referenz) + Task-File

## Akzeptanz

- [x] GET /api/firewall/status liefert Router-Zustand (nicht Backend-Host)
      — Report-Push vom Router (POST /api/firewall/report, outbound-only);
      ehrlicher Leerzustand + stale-Flag davor/danach; live verifiziert
- [x] Alias-Anlage erzeugt Inbound-Default-DROP + erlaubte Ports — Engine
      (cmd/jimesh-router/firewall.go) rendert+appliziert `jimesh_inbound`
      im Alias-Ziel-Netns (Egress-Muster 1:1, Helper+Read-Back);
      live: `docker exec nft list` zeigt policy drop + Grant-Port
- [x] Port-Freigabe via POST /api/firewall/rules (Operator-only, OPA-gated
      über die bestehende policy.Engine; Gate bewusst in auth-Middleware —
      policy.go trägt fremde uncommitted Hunks, siehe Sprint-File)
- [x] Frontend-Tile zeigt echten Status (live-curl: routerSeen=true,
      capabilities vom Router-Knoten gemessen, enforcement states)
