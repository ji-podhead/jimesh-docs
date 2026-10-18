# JiMesh — Networking & Routing, wie es WIRKLICH läuft

Internes Dokument (reale IPs, reale Hostnamen — deshalb `docs_dev/`,
gitignored, nie im öffentlichen Repo, siehe `docs/ARCHITECTURE.md` §7).
Zweck: die Kette Browser → Dashboard/Keycloak → Control-Plane-Node EINMAL
vollständig aufschreiben, damit sie nicht bei jedem Incident neu aus
Commit-Nachrichten rekonstruiert werden muss. Snapshot vom 20.9.2026,
verifiziert gegen laufende Container, nicht nur gegen Doku.

## 1. Die reale Kette, Ende zu Ende

```
Browser (Operator, auf podhead)
    |
    | http://localhost:8090   (Dashboard, Website)
    | http://localhost:8081   (Keycloak-Login-Seite)
    | ssh -p 2222             (Operator-SSH)
    v
podhead:  Container "jimesh-client-tailscaled"
    - EINZIGER lokaler JiMesh-Prozess auf podhead
    - tailscaled im Container (eigener Netzwerk-Namespace,
      NICHT --network host — siehe deploy/client/headscale-client-container/
      defaults.yml für den historischen Grund: ein --network-host-Versuch
      hat einmal live die primäre Tailscale-Verbindung des Operators fast
      zerschossen)
    - registriert im Headscale-Tailnet als "jimesh-client" / Zusatz-Peers
      (client-1 etc.)
    - Port-Publishes: 127.0.0.1:8090, 127.0.0.1:8081, 127.0.0.1:2222
    - Drei socat-Forwards NACH INNEN in den Tailnet:
        :8090 -> 100.64.0.6:8090   (Traefik auf trading)
        :8081 -> 100.64.0.6:8081   (Keycloak auf trading)
        :2222 -> 100.64.0.6:22     (SSH auf trading)
    v
Headscale-Tailnet (100.64.0.0/10, self-hosted, JiMesh-eigen —
NICHT die separate, echte Firmen-Tailscale, die dieser Desktop evtl.
zusätzlich hat, siehe ARCHITECTURE.md §7.2)
    v
trading (Control-Plane-Node, role: control_plane in config.yml)
    - echte IP: 187.124.2.174 (TRADING_HOST, .env)
    - Tailnet-IP: 100.64.0.6 (TRADING_VPN_IP, .env)
    - Traefik (:8090) — Ingress für /api, /v1, /health, /website, Dashboard
    - Keycloak (:8081, keycloak_host_bind = jimesh_vpn_ip) — NICHT hinter
      Traefik, direkt gebunden, weil der Browser die Login-Seite selbst
      erreichen muss (ein Backend-Proxy kann den OIDC-Redirect nicht
      ersetzen)
    - jimesh-backend (intern: Port 3010 HTTP / 3009 gRPC, gRPC zusätzlich
      auf 127.0.0.1:19092 published — NUR node-lokal, kein Tailnet-Zugriff)
    - Postgres/Redis/Vault — nur auf jimesh-net (Docker-Bridge), nie
      published
```

## 2. Warum es so viele Sprungstellen gibt (bewusste Entscheidungen)

- **Kein `--network host` für den Tailscale-Client-Container.** Ein
  gemeinsamer Netzwerk-Namespace mit dem Host hätte tailscaled erlaubt,
  Host-Routing-Regeln zu überschreiben — real passiert, hat fast die
  primäre Firmen-Tailscale-Verbindung des Operators zerstört. Deshalb:
  eigener Namespace + explizite `-p`-Port-Publishes + socat als Brücke.
- **Keycloak ist NICHT hinter Traefik.** Der OIDC-Redirect-Flow braucht
  einen Browser, der die Identity-Provider-Seite DIREKT ansprechen kann;
  ein Backend-seitiger Proxy kann diesen Redirect-Schritt nicht
  transparent ersetzen (siehe SPRINT-27).
- **`jimesh_vpn_ip` ist NICHT dasselbe wie "die Browser-URL".** Es ist die
  Adresse, an die Traefik/Keycloak auf dem Node selbst binden (VPN-only,
  nie öffentlich). Ob ein Client diese IP direkt anspricht (ein echter
  Tailnet-Peer) oder über einen lokalen socat-Tunnel auf `localhost`
  umgeleitet wird (podhead), ist eine reine Frage, WO der Client sitzt —
  beides ist gültig, aber die falsche Wahl (VPN-IP in einer
  Browser-Redirect-URL für einen Socat-Client) erzeugt einen Timeout,
  keinen Fehler mit klarer Meldung (echter Incident, 20.9., siehe §4).

## 3. Wo Konfiguration WIRKLICH herkommt (Quelle der Wahrheit je Wert)

| Wert | Quelle | Genutzt von |
|---|---|---|
| `TRADING_HOST` (187.124.2.174) | `.env` | Ansible `ansible_host` für SSH-Deploy |
| `TRADING_VPN_IP` (100.64.0.6) | `.env` → `config.yml` `vpn_ip:` → Ansible `jimesh_vpn_ip` | Traefik-Bind, Keycloak-Bind, Realm-Redirect-URI |
| `JIMESH_KEYCLOAK_PUBLIC_URL` | `.env` (Browser-Adresse, i.d.R. `http://localhost:8081`) | Backend, für den `/api/auth/oidc/login`-Redirect |
| `JIMESH_DASHBOARD_CALLBACK_URL` | `.env` (i.d.R. `http://localhost:8090/api/auth/callback`) | Backend + Keycloak-Client `redirectUris` |
| `JIMESH_FRONTEND_ORIGIN` | `.env` (i.d.R. `http://localhost:8090`) | Backend, wohin nach Login redirected wird |
| `DASHBOARD_CLIENT_SECRET` | `.env`, EIN Wert, ZWEI separate Konsumenten | Keycloak-Realm-Import (`deploy/keycloak/defaults.yml`) UND Backend-Container (`deploy/backend/defaults.yml`) — siehe §4, das war lange nur auf einer Seite verdrahtet |

**Faustregel:** alles, was der BROWSER direkt ansteuert (Login-Redirects,
Callback-URLs, Frontend-Origin), muss die Adresse sein, unter der DER
JEWEILIGE OPERATOR tatsächlich sitzt (bei podhead: `localhost:*` über
Socat) — niemals `jimesh_vpn_ip` roh. Alles, was ein SERVICE auf dem
Control-Plane-Node an ein ANDERES Service auf demselben Node bindet, darf
`jimesh_vpn_ip` sein (das ist die VPN-only-Sicherheitsgrenze).

## 4. Reale Incidents auf dieser Kette (chronologisch, nicht aspirational)

1. **16.9.** `--network host` für den Tailscale-Client testweise probiert
   → hat die primäre Host-Tailscale-Verbindung fast zerschossen. Auf
   eigenen Netzwerk-Namespace umgestellt.
2. **~18.9.** `jimesh-client-tailscaled` stirbt nach Headscale-Control-
   Timeout (Exit 255) und reißt alle podhead-URLs mit sich — die
   Socat-Prozesse liefen als `docker exec -d`-Kinder IM Container und
   sind mit ihm gestorben, kommen nicht automatisch zurück.
   `scripts/restore-jimesh-client.sh` geschrieben als Rescue-Script.
3. **17.9.** Backend-OIDC-Bugs: `keycloak_bootstrap_admin_password`/
   `keycloak_dashboard_client_secret` nie ins `.env` verdrahtet,
   `keycloak_host_bind` hardcoded auf Loopback, `sslRequired` blockte
   HTTP hinter der VPN-Grenze. Auf Keycloak-Seite gefixt.
4. **20.9., Teil 1.** Login-Loop: derselbe `DASHBOARD_CLIENT_SECRET`-Fix
   von 17.9. galt nur für Keycloaks EIGENE Realm-Config — der
   Backend-Container selbst bekam den Secret (und die drei URL-Vars) nie
   als eigenes Env, `deploy/backend/ansible-task.yml` reichte nur
   DB/Redis/Vault durch. Fix: die vier Vars ergänzt.
5. **20.9., Teil 2.** Erster Versuch der Vars aus `jimesh_vpn_ip`
   konstruiert → Login-TIMEOUT statt Loop, weil der Browser (via
   Podhead-Socat) die rohe VPN-IP nicht direkt routen kann. Korrigiert:
   Werte per `lookup` direkt aus `.env` gelesen (§3-Faustregel).
6. **20.9., Teil 3.** Nach Redeploy zeigte sich, dass Port 8081/2222 auf
   podhead selbst NIE published waren (`docker inspect`: nur
   `-p 127.0.0.1:8090:8090` beim ursprünglichen `docker run`) — das
   Rescue-Script (Punkt 2) prüft nur, ob socat INNERHALB des Containers
   läuft, nicht ob der Port überhaupt vom Host aus erreichbar ist. Und:
   `socat` war nie Teil des `tailscale/tailscale:latest`-Images, sondern
   irgendwann manuell in eine jetzt verschwundene Container-Instanz
   installiert — bei jeder Neuerstellung des Containers war es weg, ohne
   dass irgendein Script das bemerkt oder gemeldet hätte.

**Der rote Faden:** jeder dieser sechs Incidents ist derselbe
Grundfehler in unterschiedlicher Verkleidung — ein Wert oder ein Zustand
existierte an EINER Stelle korrekt (im `.env`, in einem laufenden
Container), wurde aber nie in die Stelle repliziert, die ihn tatsächlich
braucht (den Ansible-Task, den neu erstellten Container, das Docker-Image
selbst). Kein einzelner Layer hat gelogen, es fehlte jedes Mal die
Verbindung zwischen zwei echten, korrekten Zuständen.

## 5. Der strukturelle Fix (20.9., nicht nur eine Doku)

`jimesh-client-tailscaled` lief bis heute als reiner, von Hand getippter
`docker run` — von KEINEM Ansible-Task verwaltet, mit Socat als
nachträglichem, nirgends persistiertem `docker exec`. Das ist jetzt
ersetzt durch ein echtes Image:

- **`deploy/podhead-client/Dockerfile`** — `FROM tailscale/tailscale:latest`
  + `socat` fest im Image (nicht nachträglich reingepatcht).
- **`deploy/podhead-client/entrypoint.sh`** — startet beim Container-Start
  automatisch alle drei socat-Forwards (mit eigener Restart-Schleife pro
  Forward) UND tailscaled — kein manueller `docker exec` mehr nötig, ein
  `docker start` (oder `--restart unless-stopped` nach einem Crash) reicht.
- Neu erstellt mit ALLEN drei Port-Publishes (`-p 8090 -p 8081 -p 2222`),
  nicht nur einem.
- Tailscale-Identität bleibt erhalten (State liegt im Bind-Mount
  `.ansible-run/client-tailscale-state`, überlebt jedes `docker rm`).

**Noch offen (bewusst nicht heute gemacht):** dieser Container hat noch
KEINEN Ansible-Task (`deploy/podhead-client/ansible-task.yml` existiert
nicht) — er wird weiterhin von Hand mit `docker run` erstellt, jetzt nur
aus einem robusteren Image. Ein echter Ansible-Task dafür ist der
nächste, noch nicht gemachte Schritt (siehe Backlog).

## 6. Health-Check, den JEDER vor "Login geht nicht" zuerst laufen lassen sollte

```
docker ps --filter name=jimesh-client-tailscaled          # laeuft der Container ueberhaupt
docker exec jimesh-client-tailscaled tailscale status      # ist trading "active", nicht "offline"
curl -o /dev/null -w '%{http_code}\n' http://localhost:8090/   # 200 erwartet
curl -o /dev/null -w '%{http_code}\n' http://localhost:8081/   # 302 erwartet (Keycloak-Root)
```

Alle vier grün → das Networking ist nicht das Problem, der Fehler liegt
wo anders (Backend-Config, Keycloak-Realm, etc.).
