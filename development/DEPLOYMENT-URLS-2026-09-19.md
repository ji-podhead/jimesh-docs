# Deployment-URLs & Topologie — 2026-09-19

## Die URLs

| Wo | URL | Weg | Wofuer |
|---|---|---|---|
| podhead (Browser/Client) | http://localhost:8090/ | Client-Container socat :8090 -> 100.64.0.6:8090 | ROOT = ehrliche Marketing-Landing (echtes Produkt, echter Quickstart, echter /overview-Screenshot); Dashboard-Seiten darunter (z.B. /overview, /security/…), /api, /health |
| Im Tailnet (Client-Container, Control-Node selbst) | http://100.64.0.6:8090/ | direkt | gleiche Inhalte |
| Keycloak-Login (Dashboard) | via http://localhost:8090/ → „Sign in" | kompletter OIDC-Flow über Traefik :8090 (JIMESH_KEYCLOAK_PUBLIC_URL=http://localhost:8090; Discovery /realms/jimesh/.well-known/openid-configuration verifiziert 200) | Dashboard-Login (jimesh-Realm) |
| Operator-SSH | ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 | Client-Container socat :2222 -> 100.64.0.6:22 | Control-Node-Verwaltung (sudo passwortlos) |
| Marketing-Website (von podhead) | http://localhost:8090/website/ | Client socat -> Traefik (Router PathPrefix(/website), Priority 5, StripPrefix) -> jimesh-website (nginx:alpine, Bind /opt/jimesh/website) | Landing + ECHTE Docs + Tour |

Wichtig: Der podhead-Host routet 100.64.0.0/10 bewusst NICHT — tailscaled laeuft im Client-Container-Netns, nicht auf dem Host. Zugang von podhead fuehrt immer ueber 127.0.0.1:8090 (bzw. den Client-Container).

## Topologie (seit 2026-09-19: podhead = nur Client)

- **Control-Node (remote 'trading', Tailscale-IP 100.64.0.6, Node-Name trading-1):** kompletter JiMesh-Stack — jimesh-traefik (entrypoint web published auf 100.64.0.6:8090), jimesh-frontend (node:20-alpine, production build, next start :5173), jimesh-backend (jimesh-backend:local, http :3010, grpc :3009, hostport 127.0.0.1:19092), jimesh-postgres/redis/keycloak/vault/headscale; Docker-Netz jimesh-net; Host-Firewall INPUT DROP mit expliziten ACCEPTs (8090/8081 auf 100.64.0.6).
- **podhead (lokal):** nur der Client — Container jimesh-client-tailscaled (172.17.0.2 im Default-Bridge-Netz) mit tailscaled (Tailnet jimesh-gateway; dieser Node = 100.64.0.4 jimesh-client-1) und socat-Forwards (:8090, :8081 -> Control-Node; :2222 -> SSH).
- Der lokale dev-compose-Stack (jimesh-traefik, jimesh-frontend-1, jimesh, keycloak, vault, redis, postgres — erstellt 2026-09-18 21:21 von der Vorgaenger-Session fuer lokale Builds/Tests) wurde am 2026-09-19 auf Anweisung des Operators gestoppt (docker stop; Restart-Policies sind unless-stopped, bleiben also auch nach Reboot aus). Dev-Wiederbelebung: make up. Lokal laeuft sonst nichts von JiMesh.

## Am 2026-09-19 auf dem Control-Node deployed (verifiziert)

1. **Frontend:** voller Source-Sync (tar via SSH nach /opt/jimesh/repo/src/frontend), npm install + next build im One-Off-Container node:20-alpine mit identischem Bind-Mount (/app) — Next 15.5.24, 'Compiled successfully', 3/3 static pages. Container jimesh-frontend gestartet (war vorher im Restart-Loop, weil npm run start keinen gueltigen .next-Build fand). Verifiziert: 200 + Titel + /health ok + /api-Auth-Gate (401).
2. **Backend:** Source-Sync + docker build jimesh-backend:local (CGO_ENABLED=0, distroless/static) + Container-Recreate mit identischer Config (jimesh-net, /opt/jimesh/deploy/backend.env, Ports 127.0.0.1:19092->3009, docker.sock + /opt/jimesh/data:/data, Traefik-Labels PathPrefix(/api)||(/v1)||(/health)||(/ready)||(/openapi.json) Priority 10). Verifiziert: /health {"status":"ok"}, /api/team-bindings 401 (Route existiert), Keycloak-Bootstrap sauber, Status Up.

## Offen (siehe JULES-SESSIONS-2026-09-19.md)

- Jules A+B laufen remote (IN_PROGRESS); Jules C (Agent-Session-Detail) wartet auf einen freien Concurrent-Slot (Limit 3, belegt durch A, B und eine fremde Session) und ist nach deren Abschluss zu restarten.

## Marketing-Website (seit 2026-09-19 auf dem Control-Node)

- Container `jimesh-website` (nginx:alpine, restart unless-stopped, jimesh-net), Bind-Mount /opt/jimesh/website (ro).
- Traefik: Router PathPrefix(/website) Priority 5 + StripPrefix-Middleware — Dashboard (Priority 1, PathPrefix(/)) und API (Priority 10) unberuehrt.
- Build: website/ statischer Next-Export mit PAGES_BASE_PATH=/website + trailingSlash (out/docs/index.html fuer Clean-URLs); Doku wird zur Build-Zeit aus den Repo-Markdown-Docs gebuendelt (website/scripts/gen-docs.mjs, 12 Docs via marked).
- Neu-Deploy nach Doku-Aenderungen: cd website && PAGES_BASE_PATH=/website npm run build, dann tar website/out -> /opt/jimesh/website, kein Container-Restart noetig (nginx liest vom Bind-Mount).
- GitHub Pages Fällt raus: 422 "current plan does not support GitHub Pages for this repository" (privates Repo auf Free-Plan) + Workflow-Dispatch 404 (deploy-website.yml existiert nicht auf main). Der Workflow (.github/workflows/deploy-website.yml) bleibt fuer den Fall eines Plan-/Sichtbarkeitswechsels gepflegt.

## Failure-Mode: Client-Container down (2026-09-20 Incident)

Der Tailscale-Client-Container stirbt gelegentlich (beobachtet: 19.9. 17:40 UTC Timeouts zur Headscale-Control 187.124.2.174:443, dann Exit 255). Mit ihm sterben die socat-Forwards (Prozesse im Container!) — damit ist JEDE podhead-seitige URL tot (8090 Dashboard/Website, 8081 Keycloak, 2222 SSH) und 172.17.0.2 meldet No route to host. Der Control-Node selbst laeuft unbeeinflusst weiter.

- Restart-Policy steht jetzt auf unless-stopped (auto-start nach Crash/Reboot).
- Die socats kommen trotzdem NICHT automatisch zurueck — Wiederherstellung: scripts/restore-jimesh-client.sh (idempotent: Container-Start + Policy + alle drei Forwards + Tailnet-Status).
- Sofort-Check danach: curl http://localhost:8090/ und http://localhost:8090/website/ (je 200).

Hinweis Keycloak: localhost:8081 existiert BEWUSSST nicht als Host-Port (der Client-Container hat nur ein Docker-Mapping fuer 8090). Der rohe Keycloak-Port (Admin-Console) ist ueber die Container-Bridge-IP erreichbar: http://172.17.0.2:8081/ (socat im Client). Der Dashboard-Login-Flow braucht das alles nicht — er laeuft komplett ueber http://localhost:8090/realms/jimesh.

## Provision-Lanes (SPRINT-PROVISION-ONPREM-CLOUD-K8S, Stand PV-10 2026-10-15)

Neue CP-Routen des Provisioning-Redesigns (A2: SSH-Credentials raus, Worker-Agent statt 2. CP) — voll im JiMesh2-`docs/API_DOCS.md` (Deploy → Provision-Lanes):

| Route | Weg | Wofuer |
|---|---|---|
| `POST /api/provision/cloud` | Dashboard Cloud-Pane (Premium) | Azure-Cluster-Attach (byo-cluster); **PASS-THROUGH** ohne Credential-Fetch, 409 ohne jimesh.io-Link, 501 für provision-new-aks + AWS (Backlog) |
| `PUT /api/provision/targets/{id}/secrets` · `GET …/secrets/status` | Dashboard Cloud-Pane | Write-only Vault/KV-Scope (`provision/<target>/*`) — Value nie im Response/Audit, Status = exists + updated_at |
| `POST /api/nodes/provision` · `GET` | ServersPage On-Prem-Pane | PV-3 entkernt (kein SSH): Heartbeat-/Health-Proof + Install-Plan-Aushändigung (gvisor/tailscale/dns); Legacy-SSH-Shapes → 400 |
| `POST /api/workers/register` · `/api/workers/refresh` | jimesh-app install.sh (Agent, outbound) | PV-4 Agent-Registrierung — OSS-Build 501-Stub fail-closed, Premium-Package `jimeshIO/packages/go/workerregistry` (Einmal-Token, 24h-Rotation) |
| `POST /api/headscale/provision` (+ `GET /api/headscale/provisioning/{tenant}`, `/verify`) | Operator-Stage (Premium, FL-3) | Headscale User+PreAuthKey-Staging — CP hält NUR sha256, nie Clear-Text |
| Agent-Bootstrap | `curl -fsSL https://raw.githubusercontent.com/ji-podhead/jimesh-app/main/install.sh \| sh` | Client-Install + JiMesh-Cloud-Join (PV-7, NICHT self-hosted headscale) |