# SPRINT-184 — DNS Overhaul: Host + Tailnet + URLs

**Datum:** 3.10.2026
**Status:** ✅ COMPLETED & DEPLOYED (main: `3dec40a1`)

---

## Ziel
**Kein `localhost` mehr in URLs.** Alle Services erreichbar via `*.jimesh.internal` Namen.
VPN-only Binding (niemals `0.0.0.0` / öffentlich) — Mandat 12.

---

## Was geliefert wurde

### 1. Bind9 DNS Resolver (`deploy/cp/dns/`)
- **Dual-Bind**: `127.0.0.1:53` (Host-resolver) + `100.127.129.65:53` (VPN/Tailscale)
- **Zone `jimesh.internal`**:
  - Explicit CNAMEs → Docker Container-Namen (`dashboard → jimesh-traefik`, `keycloak → jimesh-keycloak`, etc.)
  - Forward-Zone `jimesh-net` → Docker DNS (`127.0.0.11`) für Container-Namen-Auflösung
  - **Wildcard `* IN A {{ dns_vpn_bind }}`** (C2): Projekt-Hostnames dynamisch via Traefik file-provider
  - VPN-flagged Records (`vpn: true`) → A-Record auf VPN-IP (`100.127.129.65`)
- **DNSSEC Validation AUS** (Docker DNS unsigniert)
- **Static IP** auf `jimesh-net` (`172.18.255.253` = broadcast-2 auf /16)
- **Verification**: Wildcard + Forward-Zone + External Forwarder via `dig` gegen published Ports

### 2. Client Split-DNS (`deploy/client/dns-client/`)
- **`make deploy-client`** — Commercial Tailscale (läuft schon) + systemd-resolved drop-in
- **`make deploy-client2`** — Internal Headscale (`jimesh2.internal`, `10.80.0.0/16`) + DNS via `10.80.0.1`
- Ansible Task auf `ansible_connection=local` (Client-Maschine)
- Schreibt `/etc/systemd/resolved.conf.d/jimesh.conf` mit `DNS=100.127.129.65`, `Domains=~jimesh.internal`, `DNSSEC=no`

### 3. Traefik (`deploy/traefik/`)
- **Port 80** (statt 8090) mit `CAP_NET_BIND_SERVICE`
- **VPN-only Bind**: `100.127.129.65:80`
- **File-Provider** (`/opt/jimesh/deploy/traefik/dynamic` ↔ `/etc/traefik/dynamic`) für dynamische Projekt-Host-Regeln (C3)
- Atomic Write via Temp+Rename (Backend schreibt `dnsroute.WriteAtomic`)
- Probe-Verifikation: `s184-c3-probe.jimesh.internal` → 200 via shared volume

### 4. Keycloak (`deploy/keycloak/`)
- **VPN-only Bind**: `100.127.129.65:8081`
- **Realm Fixup bei JEDEM Redeploy** (kcadm, Credentials aus Container-Env):
  - **Vollständiger REPLACE** von `redirectUris` + `webOrigins` (kein Append!)
  - Enthält: DNS-Namen (`dashboard.jimesh.internal`), VPN-IP (`100.127.129.65`), localhost (für Dev)
  - Killt kaputte Einträge wie `http://:8090/*` dauerhaft

### 5. Backend (`deploy/backend/`)
- Shared Traefik Dynamic Volume Mount
- Env: `JIMESH_TRAEFIK_DYNAMIC_FILE=/etc/traefik/dynamic`
- Defaults: DNS-basierte Callback/Origin URLs

### 6. Frontend
- **ProjectDNSCard** in Project-Overview-Panel (PR #11)
- Query Keys: `projectDNS`, `dnsRecords`, `dnsSettings`
- 22 neue i18n Keys (`projectDetail.dns*`) in `en.json`

### 7. Make Targets
- **`make deploy-client`** — Commercial Tailscale Join + DNS Split (ein Befehl)
- **`make deploy-client2`** — Internal Headscale Join + DNS Split + **Auto-SSH-Key-Registrierung in Headscale** (via Ansible auf superleo, da API nur im internen Mesh)

---

## Config Änderungen

### `config.yml`
```yaml
nodes:
  - name: superleo
    vpn_ip: ${SUPERLEO_VPN_IP}  # 100.127.129.65 — treibt Traefik/Keycloak/DNS Binds
```

### `.env` / `.env.example`
```bash
SUPERLEO_VPN_IP=100.127.129.65
JIMESH_FRONTEND_ORIGIN=http://dashboard.jimesh.internal
JIMESH_DASHBOARD_CALLBACK_URL=http://dashboard.jimesh.internal/api/auth/callback
JIMESH_KEYCLOAK_PUBLIC_URL=http://keycloak.jimesh.internal:8081
JIMESH_TRAEFIK_DYNAMIC_FILE=/etc/traefik/dynamic
# Internal Headscale (für deploy-client2):
HEADSCALE2_URL=http://10.80.0.1:8080
HEADSCALE2_PREAUTH_KEY=tskey-xxx...
HEADSCALE2_CA=/home/.../jimesh-superleo.crt
HEADSCALE_API_KEY=hskey-api-xxx...  # für SSH-Key-Registrierung
```

---

## Verifikation (Mandat 6)

```bash
# Host Split-DNS
dig @127.0.0.53 dashboard.jimesh.internal A +short
# → 100.127.129.65

# Bind9 Wildcard
dig @100.127.129.65 wildcard-test.jimesh.internal A +short
# → 100.127.129.65

# Login Flow
curl -I http://dashboard.jimesh.internal/api/auth/oidc/login
# → 302 Location: http://keycloak.jimesh.internal:8081/realms/jimesh/protocol/openid-connect/auth?...
# → redirect_uri=http://dashboard.jimesh.internal/api/auth/callback (KEIN :8090!)

# Client deploy (neue Maschine)
git clone ... && cd JiMesh2 && make deploy-client
# → dashboard.jimesh.internal auflösbar, SSH ohne Web-Link
```

---

## Files Changed

| File | Change |
|------|--------|
| `deploy/cp/dns/{defaults.yml,ansible-task.yml,zone.j2,named.conf.options.j2,named.conf.local.j2}` | Dual-bind, vpn-flagged records, wildcard, Docker DNS forwarder |
| `deploy/client/dns-client/{ansible-task.yml,defaults.yml}` | Client split-DNS via systemd-resolved |
| `deploy/traefik/{defaults.yml,ansible-task.yml}` | Port 80, CAP_NET_BIND_SERVICE, file-provider |
| `deploy/keycloak/{defaults.yml,ansible-task.yml,jimesh-realm.json}` | VPN-bind, kcadm full REPLACE fixups |
| `deploy/backend/{defaults.yml,ansible-task.yml}` | Shared Traefik dynamic volume, DNS URLs |
| `deploy/ansible/playbooks/deploy-service.yml` | `dns-client`, `headscale-ssh-key` in no-docker list |
| `deploy/cp/headscale-ssh-key/{ansible-task.yml,defaults.yml}` | SSH-Key Registrierung in Headscale (Auto) |
| `Makefile` | `deploy-client`, `deploy-client2` Targets |
| `src/frontend/src/components/projects/ProjectDNSCard.tsx` | Project DNS Card (Overview Tab) |
| `src/frontend/src/views/ProjectDetailPage.tsx` | Integration in Overview Tab |
| `src/frontend/src/lib/query-keys.ts` | `projectDNS`, `dnsRecords`, `dnsSettings` Keys |
| `src/frontend/src/i18n/locales/en.json` | 22 neue `projectDetail.dns*` Keys |

---

## Nächste Steps (S181 Sprints)

- **S181-8**: Restliche ~234 TypeScript Errors fixen (vor allem `chain-mesh-graph.tsx`)
- **S181-7**: 341 i18n Keys + 22 DNS Keys × 59 Locales übersetzen
- **S181-11/12/15**: Per Sprint-Plan

---

## Verwandte PRs
- **PR #11** — S184 DNS Settings (merged)
- **PR #10** — S183 Render Cache (merged)
- **PR #12** — S183 Tasks 11, 13, 14 (open)
---

## NACHTRAG 4.10. — Apex-Record `jimesh.internal` (S184-9) + `record-deploy`-Befund (S184-10)

### Anlass (verbatim, Operator 4.10.)

> „nslookup jimesh.internal → EINE Adresse (erwartet 100.127.129.65), nicht 'No answer'"

> „hast du jetzt wie er das iwll neudeployed?"

> „aber warum hast du da unsere ip hardgecodet geht das nicht mit den make targets und iac?"

Die erste Meldung kam über die Laptop-Session, die die drei Abfragen vom Laptop
aus machte (Rückmeldung wörtlich: „Beide Korrekturen bestätigt, main aktualisiert",
inkl. der beiden von ihr nachgemessenen Korrekturen an ihrer eigenen Analyse).

### Befund

`dig +short @127.0.0.1 jimesh.internal` → **leer (NODATA)**. Ein Wildcard-Record
`* IN A` deckt den Apex laut **RFC 4592** nicht ab (leerer linker Label) — alle
realen Namen der Zone sind Subdomains, der Apex selbst hatte nie einen Record.
Die anderen beiden Abfragen der Laptop-Session waren korrekt und blieben es:
`dashboard.jimesh.internal → 100.127.129.65` (ok), `jimesh.internal.dashboard →
NXDOMAIN` (Name umgedreht getippt).

### Zwei Korrekturen an der bisherigen Analyse (nachgemessen, nicht behauptet)

| Behauptung | Messung |
|---|---|
| „`dns_vpn_bind` ist leer" | **Falsch.** `dig dashboard.jimesh.internal → 300 IN A 100.127.129.65` direkt (kein CNAME) — der `vpn:true`-Zweig greift live. Der `vpn_ip`-Grep der Laptop-Session betraf deren lokales `config.yml`; die Zone wird auf superleo gerendert. |
| „`@ IN A {{ _dns_ip }}` reicht" | **Falsch.** `ns1.jimesh.internal → 172.18.255.253` (docker-intern, `ansible-task.yml:43`), Ping vom Laptop: 100 % Verlust. Der Apex hätte auf eine unerreichbare Adresse aufgelöst — also weiter tot. |

### Lösung (`deploy/cp/dns/zone.j2`, hinter der NS-Zeile)

```jinja
{% if (dns_vpn_bind | trim | length > 0) and (dns_vpn_bind != '127.0.0.1') %}
@	IN	A	{{ dns_vpn_bind }}
{% else %}
@	IN	A	{{ _dns_ip }}
{% endif %}
```

**Zwei Zweige, beide nie leer** — genau derselbe Guard, den schon die übrigen
Records laufen haben: ein unbedingter `@ IN A {{ dns_vpn_bind }}` würde bei
leerem `vpn_bind` eine **leere Ziela rendern, BIND lehnt die GESAMTE Zone ab →
alle Namen tot**. `{{ _dns_ip }}` allein (ohne else) wäre docker-intern.

### Antwort auf die Hardcoding-Frage (drittes Zitat oben)

**In den Records steht keine unserer IPs.** Der komplette Wertepfad läuft über
IaC und die Make-Targets:

```
.env  SUPERLEO_VPN_IP  →  config.yml  vpn_ip  →  Jinja dns_vpn_bind   (alle vpn-Records)
ansible-task.yml:43                     →  _dns_ip (dns_ip bzw. Container-Subnetz)
make redeploy SERVICE=cp/dns NODE=superleo  →  ansible-runner → render-inventory → Render
```

Was tatsächlich hardcodiert war: **zwei gemessene IPs in den Kommentaren** dieser
Datei („Nachweis"-Notizen). Sie sind knotenspezifisch und würden bei anderem
Inventory lügen — formuliert um auf reine Herleitung, dann erneut deployed,
damit deployed == Repo. Die `127.0.0.1` im Guard sind die vorher schon
bestehende Schreibweise (Loopback-Konstante, kein Knotenwert).

### Verifikation (superleo, 4.10., zwei Deploy-Läufe)

```
make redeploy SERVICE=cp/dns NODE=superleo   REDEPLOY_RC=0
  ok=20  changed=3  unreachable=0  failed=0   (beide Läufe)

1. dig +short @127.0.0.1 jimesh.internal             -> 100.127.129.65   (vorher leer)
2. dig +short @127.0.0.1 dashboard.jimesh.internal   -> 100.127.129.65   (unverändert)
3. dig +short @127.0.0.1 irgendein-xyz.jimesh.internal -> 100.127.129.65 (Wildcard ok)
4. docker ps --filter name=jimesh-dns  -> Up; Logs ohne Zone-/Syntaxfehler
   deployed Zone == Repo (Kommentarblock Z.16, @-Record Z.33 = if-Zweig)
```

Commit `706f28e1` (gepusht). Danach Auftrag an die Laptop-Session zur
Verifikation **vom Laptop aus** (`nslookup jimesh.internal` muss EINE Adresse
liefern); sie wartete laut ihrer Rückmeldung genau auf „neu deployed".

### Nebenbefund aus denselben Deploy-Läufen → S184-10

```
record-deploy: refusing service name 'cp/dns' — must be 1..64 chars of
[A-Za-z0-9._-] starting alnum (the health probe interpolates it into a remote command)
```

`REDEPLOY_RC=0` trotzdem (Ansible ok) — aber **seit PR #13 wird jeder Deploy
mit `cp/`- oder `client/`-Präfix nicht mehr protokolliert**, weil `Makefile:386`
`$(SERVICE)` (jetzt ein Pfad) an ein Skript übergibt, das Slash nicht erlaubt.
Fix-Variante (a) Slashes erlauben oder (b) `$(notdir $(SERVICE))` — Zuweisung
steht aus, weil PR #13 der Laptop-Session gehört. Steht als **S184-10** im
Backlog, mit dem Zitat begründet, unter dem der Befund ans Licht kam.
