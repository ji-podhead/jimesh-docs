# NETWORKING-MESH-DESIGN — JiMesh Mesh-Netzwerk (Stand 2026-10-20)

> Zusammenfassung der bestehenden Planung (Quellen unten) zu EINEM Dokument.
> Status: Design-Entscheidung + offene Fragen. Website-Fassung: `/networking`
> (apps/site/src/app/networking/page.tsx, Copy-SSOT `copy.yml → networking_page`).

## 1. Grundmodell

- Mesh = **WireGuard**-Datenpfad, koordiniert von **Headscale** (self-hosted,
  Tailscale-kompatibel). Headscale ist ein **Singleton pro deployment** —
  "exactly one Headscale deployment total, never one per Control Plane"
  (ARCHITECTURE.md §7).
- Nodes joinen per **Preauth-Key** (single-use default, reusable/ephemeral,
  tagging keys für user-lose Nodes). Kein Drittanbieter-OAuth.
- ACL-Policy = **Daten** (`policy.mode = database`, REST-Surface, revocable
  API-Keys). Mesh-Mutationen laufen durch denselben **OPA**-Gate wie die
  HTTP-Routen — fail-closed.

## 2. DIE ZWEI WEGE (Kern-Entscheidung)

Es gibt **genau zwei Wege**, an der Koordination teilzunehmen — ein gemischter
Modus mit geteilter Koordination über Tenant-Grenzen ist **ausgeschlossen**:

### Weg A — Komplett selbst gehostet ("bring your own coordinator")
- User hostet **seinen eigenen Headscale-Server** komplett selbst (auf seinem
  Rack / seiner Cloud).
- Seine Nodes — und NUR seine — laufen in **seinem eigenen Tailnet**.
- JiMesh Cloud ist an dieser Stelle **nicht beteiligt**; der User kann später
  trotzdem einen Cloud-Workspace in sein Tailnet bringen (Hybrid).

### Weg B — JiMesh Cloud-Koordination
- User hostet **nur das, was er selbst braucht** (Workspace-Nodes, Agents);
  die **Koordination übernimmt der zentrale Headscale-Server** von JiMesh Cloud.
- Auth via **jimesh.io**, dann Join am zentralen Headscale (Preauth-Token-Flow,
  siehe §4).

### Warum kein geteiltes Tailnet über Tenant-Grenzen
Tailscale/Headscale hat **keine Tenant-Sicht**: alle Nodes EINER Headscale-
Instanz sehen sich gegenseitig in `tailscale status` (ACLs beschränken den
*Verkehr*, nicht die *Sichtbarkeit*). Deshalb:
- Ein Headscale **pro Kunde** (Weg A) ODER
- der zentrale Headscale nur mit **strikt per-Tenant getrennten Sichten** —
  praktisch: eigener Headscale pro Tenant auch in der Cloud (§4, Weg B-strict).

**Konsequenz für die Cloud-Topologie:** Jeder Kunde bekommt eine **isolierte
Koordinations-Sicht** — entweder physisch getrennt (eigene Headscale-Instanz)
oder logisch getrennt (dedizierte Instanz pro Kunde auf unserem Kopf-Node).
Das ist der Grund, warum "einfach alle auf EINEN Headscale" keine Option ist.

## 3. Geräte anbinden (braucht einen VPN-Server)

Der Overlay braucht **einen VPN-Server** (die Koordination — Headscale — plus
optional einen Relay/Exit-Node). Ablauf:

1. **Client installieren** (`install.sh` / `get.jimesh.io`, bzw. selbst gehostet:
   clone + `make up` und eigene Headscale-URL in die Client-Config).
2. **Preauth-Key vom VPN-Server beziehen** (Operator mint, single-use).
3. **Device joinen** — Laptop/Server/Agent-Node registriert sich am
   Koordinator; WireGuard baut den P2P-Datenpfad (bei NAT via DERP-Relay).
4. **ACL-Policy authorisiert** — was dieses Device sehen/durchlassen darf,
   steht als Policy-Daten am Koordinator (OPA-gegate Mutationen).

Real-Deployment-Referenz (NETWORKING-ROUTING.md): `jimesh-client-tailscaled`
Container in eigenem netns, socat-Forwards in die tailnet (Traefik :8090,
Keycloak :8081, SSH :2222), Traefik **VPN-only**-Binding, Zero-Port-Mandat.

## 4. JiMesh Cloud Networking (Auth-Flow)

1. **Signup am öffentlichen jimesh.io-Auth-Endpoint** (NestJS, Stripe-first,
   Email-OTP). Erst nach Stripe-Check wird der **x-auth Token** geminted.
2. **Redirect auf die eigene Subdomain**: `<workspace>.jimesh.io` (Alternative
   aus alter Planung: `<tenant>.cp.jimesh.io` — ES-7, Operator-Entscheid noch
   offen, OQ1). Jeder Kunde hat **seine eigene Subdomain** — kein geteilter
   Hostname, Wildcard-DNS/ingress (Caddy/Traefik + Cloudflare-Zone).
3. **Token-Exchange am CP** → Keycloak-Session. Der CP der Cloud kennt nur den
   cloudLinked-Status (jimesh.io ist Billing/Auth-SSOT, App minimal halten).
4. **Koordination**: Kunde wird an **seine Headscale-Sicht** verwiesen —
   zentral betrieben, aber per-Tenant isoliert (siehe §2) — oder er bleibt bei
   Weg A (komplett eigener Headscale).

### Compute-Pfade in der Cloud (2 Wege, IP-Frage offen)

| Pfad | Was der Kunde bekommt | Kosten | Stand |
|---|---|---|---|
| **Sandboxed Workspace via k8s** | Namespace in geteiltem AKS (`jimesh-ws-<id>`), ResourceQuota/LimitRange, NetPol deny-first | günstig (Free-forever-tauglich) | KD-10 implementiert |
| **Komplette eigene Fleet** | Dedizierte Member-Cluster unter Azure Fleet (eigene Nodes, fleet-managed Upgrades/Policies) | teurer | FL-Referenzen, partially planned |
| **Eigene Control Plane** (Wahrscheinlich laut Operator) | Kunde bekommt seine eigene CP; teurer, aber im **Free-forever**-Angebot noch machbar | mittel | Operator-Intention, offen |

**Offene IP-Frage (bewusst ungeklärt, Operator-Verbatim „bei ip bin ich mir da
nich so sicher"):** Adressierung pro Tenant bei Cloud-Koordination.
- 100.64.0.0/10 (CGNAT-Range) hat ~4M Adressen — zentral pro Tenant zu splitten
  ist machbar, aber Trennung passiert über **isolierte Koordinations-Sichten**,
  nicht über IP-Range-Buchhaltung.
- Bei Weg A (eigener Headscale) ist die IP-Frage trivial: eigenes Tailnet,
  eigene Range.
- **ENTSCHEIDUNG NOCH OFFEN** — erst mit SPRINT-PRICING-STARTER-TIER (PR-Reihe)
  zusammen festnageln.

## 5. Sicherheitsregeln (unverändert bindend)

- Zero-Port-Mandat: Traefik VPN-only, DBs/Vault loopback-only, nur Headscale
  ist public (80/443/3478/8443).
- Preauth-Keys: CP speichert **nur SHA-256**, nie Klartext.
- Worker-Provisioning **outbound** (Client-Install + Agent-Register, 24h-TTL
  Token-Refresh) — SSH-Creds speichert der CP nicht; ssh-basiertes Provisioning
  ist REMOVED (400).
- ACL-Policy als Daten + OPA-Gate, fail-closed; Permission-Topology-View zeigt
  die echte Policy (oder sagt ehrlich "full mesh" wenn disabled).

## 5b. Netz-Isolation pro Sandbox-Lane (2026-10-20, Operator-Klarstellung)

**Azure/AKS hat KEIN managed gVisor.** Zwei Lanes, zwei Isolations-Mechanismen:

| | gVisor-Lane (Docker, default) | Kata/AKS-Lane (k8s) |
|---|---|---|
| Runtime-Isolation | Sentry/Netstack im Userspace | MicroVM (Hyper-V, `kata-vm-isolation`) — Azure-native Pod Sandboxing |
| Netz-Isolation | **Nebeneffekt der Runtime** (Netstack) + egress allowlist + VLAN overlays | **NetworkPolicies** (default-deny + Egress-Allowlist; IMDS 169.254.169.254 explizit blocken) — Runtime-Isolation isoliert hier NICHT das Netz |

- Auf AKS kann man statt Kata gVisor **selbst managen** (BYO-Nodes, eigener
  runsc-Betrieb) — voller operativer Aufwand bei uns.
- **Offene Implementierung (ehrlich):** KD-10 NetPol + Quotas sind gebaut und
  test-locked, aber die **garantierte Sandbox-Runtime (Kata/gVisor
  RuntimeClass) für jeden NEUEN Workspace auf der AKS-Lane** ist noch nicht
  end-to-end implementiert — kein managed Kata-Nodepool-Provisioning, kein
  Gate das Workspace-Pods ohne Sandbox-RuntimeClass ablehnt. Bis dahin ist
  auf AKS die Netz-Schicht (NetPol) die erzwungene Grenze, die Runtime-
  Schicht best-effort je Nodepool-Config.
- Website-Folge: „gVisor on managed AKS" ist als Claim VERBOTEN — korrekt
  ist „sandboxed runtimes (Kata) on AKS, network isolation via
  NetworkPolicies; gVisor in der self-hosted/Docker-Lane".

## 6. Quellen

- `source/jimesh-docs/development/ARCHITECTURE.md` §7 (Node-Klassen, Singleton)
- `source/jimesh-docs/development/NETWORKING-ROUTING.md` (Deployment-Kette)
- `source/jimesh-docs/articles/headscale-vlan-fabric/2026-10-16-headscale-vlan-fabric-blogpost.md`
- `source/jimesh-docs/development/sprints/SPRINT-ENTERPRISE-SITE-AUTH-BILLING.md` (ES-Reihe, OQ1)
- `source/jimesh-docs/development/sprints/SPRINT-PROVISION-ONPREM-CLOUD-K8S.md` (PV-Reihe)
- `source/jimesh-docs/development/sprints/SPRINT-DEPLOY-DUAL-ENV-K8S-GVISOR.md` (KD-10 NetPol)
- `source/jimesh-docs/development/sprints/SPRINT-MASTER-PLAN.md` (Wildcard-DNS jimesh.internal)

## 7. Verwandte Website-Assets

- Diagramme: `/brand/others/mesh_join.svg`, `/brand/others/mesh_two_paths.svg`,
  `/brand/others/mesh_cloud.svg` (Generator:
  `assets/website/others/build_networking_svgs.py`)
- Seite: `/networking` · Copy-SSOT: `assets/website/content/copy.yml → networking_page`
