# JiMesh — SSH-Zugangswege zum Trading-Node

**Stand:** 26.9.2026 · **Warum dieses Dokument:** Claude hatte heute einen 30-minütigen Lockout-Scare weil er den falschen SSH-Weg benutzte. Dies dokumentiert ALLE Wege.

## Die 3 Zugangswege (nur Weg 1 ist zuverlässig!)

### Weg 1: Socat über den Tailscale-Container (IMMER VERFÜGBAR) ⭐

```
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2
```

**Wie es funktioniert:**
```
Podhead-Host → Docker-Port-Mapping (127.0.0.1:2222→Container:2222)
  → jimesh-client-tailscaled Container → socat Forward
    → 100.64.0.6:22 (Tailscale VPN) → Trading-Node SSH
```

- ✅ **Funktioniert IMMER** — unabhängig von der öffentlichen IP
- ✅ Kein Allowlist-Problem
- ✅ Keine IP-Rotation-Problematik
- ⚠️ Nur von podhead aus verfügbar (der Container läuft hier)

### Weg 2: Direkt über die Public-IP (IP-ALLOWLIST) ⚠️

```
ssh jimesh-operator@187.124.2.174
```

**Wie es funktioniert:**
```
Client → 187.124.2.174:22 (Public IP) → iptables INPUT Chain
  → Policy: DROP (alles was nicht explizit erlaubt ist wird geblockt)
  → Allowlist: nur deine aktuelle IP ist drauf
```

- ✅ Funktioniert... SOLANGE deine IP auf der Allowlist steht
- ❌ **BRICHT bei IP-Rotation** ( passiert 5-7x täglich!)
- ❌ Claude hatte hier einen Lockout weil seine IP nicht auf der Liste war

**Fix bei Rotation (von podhead aus):**
```
IP=$(curl -s https://api.ipify.org)
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 \
  "sudo iptables -I INPUT 1 -s $IP/32 -i eth0 -p tcp --dport 22 -j ACCEPT; \
   sudo netfilter-persistent save"
```

### Weg 3: make redeploy (nutzt standardmaessig Weg 2) ⚠️

```
make redeploy SERVICE=backend NODE=trading
```

- Ansible verbindet sich via `TRADING_HOST` (aus .env, aktuell 187.124.2.174)
- **Bricht bei IP-Rotation** — gleiche Ursache wie Weg 2
- **Workaround bei Rotation:** erst Allowlist fixen (siehe oben), dann redeploy

## Sicherheits-Architektur (Warum nicht jeder reinkann)

### iptables auf dem Trading-Node:
```
Chain INPUT (policy: DROP) ← ALLES wird geblockt was nicht explizit erlaubt ist

# SSH: nur erlaubte IPs (Allowlist)
ACCEPT tcp -- 176.0.65.75  tcp dpt:22

# Dashboard + Keycloak: NUR über VPN-Interface, nicht Public
ACCEPT tcp -- 0.0.0.0/0  100.64.0.6  tcp dpt:8090  (Traefik)
ACCEPT tcp -- 0.0.0.0/0  100.64.0.6  tcp dpt:8081  (Keycloak)

# Headscale (muss public sein für Tailscale)
ACCEPT tcp -- 0.0.0.0/0  tcp dpt:80
ACCEPT tcp -- 0.0.0.0/0  tcp dpt:443
ACCEPT tcp -- 0.0.0.0/0  tcp dpt:8443
```

### Docker-Port-Bindings:
| Container | Port | Binding | Von aussen? |
|---|---|---|---|
| jimesh-traefik | 8090 | 100.64.0.6:8090 | ❌ Nur VPN |
| jimesh-keycloak | 8081 | 100.64.0.6:8081 | ❌ Nur VPN |
| jimesh-backend | 19092 | 127.0.0.1:19092 | ❌ Nur lokal |
| jimesh-postgres | 5432 | 127.0.0.1:5432 | ❌ Nur lokal |
| jimesh-redis | 6385 | 127.0.0.1:6385 | ❌ Nur lokal |
| jimesh-vault | 8280 | 127.0.0.1:8280 | ❌ Nur lokal |
| jimesh-headscale | 80, 443, 3478 | 0.0.0.0 (public) | ✅ Muss public sein |

### Vom Podhead-Host erreichbare Ports (Docker-Mappings):
```
127.0.0.1:2222 → Container:2222 → socat → Trading-Node:22 (SSH)
127.0.0.1:8090 → Container:8090 → socat → Trading-Node:8090 (Dashboard)
127.0.0.1:8081 → Container:8081 → socat → Trading-Node:8081 (Keycloak)
```

**WICHTIG:** `100.64.0.6` ist vom Podhead-Host NICHT direkt erreichbar (Tailscale läuft im Container, nicht auf dem Host). Immer über localhost:8090 gehen.

## Bekannte Probleme & Lösungen

### Problem 1: IP-Rotation bricht make redeploy
**Symptom:** `make redeploy` → "Failed to connect to host via ssh: Operation timed out"
**Ursache:** Deine dynamische IP hat sich geändert, die alte ist noch auf der Allowlist, die neue nicht
**Fix:** Neue IP via Weg 1 auf die Allowlist setzen, dann make redeploy erneut
**Dauerlösung (offen):** make redeploy über VPN-Route statt Public-IP

### Problem 2: "Ausgesperrt" (Claude, 26.9.2026)
**Symptom:** Claude konnte nicht SSH-en und dachte wir wären komplett ausgesperrt
**Ursache:** Er versuchte Weg 2 (Public-IP) und seine IP war nicht auf der Allowlist
**Fix:** Weg 1 (socat) benutzen — der geht IMMER
**Lesson:** IMMER zuerst Weg 1 probieren bevor man "ausgesperrt" ruft

### Problem 3: IPv6 vs IPv4
**Symptom:** Browser kann localhost:8090 nicht erreichen
**Ursache:** Docker-Port-Mappings binden nur 127.0.0.1 (IPv4), nicht ::1 (IPv6)
**Fix:** `http://127.0.0.1:8090` statt `http://localhost:8090` im Browser benutzen

## SPRINT-PROVISION-ONPREM-CLOUD-K8S (2026-10-15, PV-10-Stand): Provisioning läuft NICHT mehr über SSH der CP

Seit dem Provisioning-Redesign (A2, verbindlich) speichert die JiMesh-CP **keine
SSH-Credentials mehr** — sie stores pro Ziel nur die IP/URL (PV-1
`provision_targets`-Modell). Server-Anbindung geschieht über den Worker-Agent-Flow:

1. Der **User** installiert selbst den Client auf seinem Server:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/ji-podhead/jimesh-app/main/install.sh | sh
   ```

2. Der Agent meldet sich **outbound** bei der CP (`POST /api/workers/register` —
   im OSS-Build ehrlicher 501-Stub „premium package required"; der install.sh-
   Bootstrap liest 501/404 fail-closed als „CP worker-registration not live yet
   (PV-4)“, nach dem Pro-Build 200), Refresh-Zyklus `POST /api/workers/refresh`
   (24h-TTL-Rotation).
3. On-Prem-Verify neuerdings ohne SSH-Dial: `POST /api/nodes/provision` prüft
   nur die Agent-Heartbeat/Health-Proof (Tailnet-Pfad) und HÄNDIGT den
   Install-Plan aus (gvisor/tailscale/dns-Chunks); `GET /api/nodes/provision`
   zeigt den Heartbeat-Status. Legacy-Shapes (host/user/password/ssh_key)
   antworten ehrlich **400** „ssh-based node provisioning REMOVED“.

Die 3 Zugangswege oben bleiben **operator-seitig** (Weg 1 = socat IMMER zuerst)
— sie sind die Notseite des Operators, kein Provisioning-Vertrag der Plattform.
Cloud-Lane (Premium): `POST /api/provision/cloud` (Azure-Attach ohne
Credential-Weiterleitung, 409 ohne jimesh.io-Link) + write-only
Secrets-API `PUT /api/provision/targets/{id}/secrets` + `GET
…/secrets/status` (nie ein Value). Volle Route-Tabelle: JiMesh2
`docs/API_DOCS.md`, Abschnitt Deploy → Provision-Lanes.

## SSH-Allowlist aufräumen ( alte IPs entfernen)

```bash
# Via Weg 1 auf den Node, dann:
sudo iptables -L INPUT -n --line-numbers | grep "dpt:22"
# Alte IPs (nicht mehr aktiv) entfernen:
sudo iptables -D INPUT <line-number>
sudo netfilter-persistent save
```
