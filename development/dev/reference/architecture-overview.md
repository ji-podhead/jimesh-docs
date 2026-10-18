# JiMesh-Architektur — Node-Klassen & Networking-Topologie

> Stand 15.9.2026. Verbindliches Referenzdokument — ersetzt die verstreute
> Chat-Diskussion. Alle Komponenten hier sind entweder heute verifiziert real
> (Traefik, Headscale, SIEM-Stack, Control-Plane-Registry) oder als
> ausdrücklich noch offen markiert. Nichts hier wird durch manuelle
> iptables-/SSH-Config-Änderungen umgesetzt — Provisionierung läuft über
> Ansible im containerisierten Runner (`make provision-node`, siehe
> `deploy/ansible/`), Deployment über die bestehende
> Control-Plane-Registry (`/api/control-planes`).

---

## 1. Die vier Node-Klassen (allgemeines Bild)

```mermaid
flowchart TB
    subgraph UserClient["User Client"]
        Browser["Browser / CLI\nkein Tailscale nötig für App-Zugriff"]
    end

    subgraph MainCP["Haupt-Control-Plane-Node (genau EINE, hostet Headscale)"]
        direction TB
        Traefik1["Traefik (der eine Gateway hier)"]
        Backend["jimesh Backend/API"]
        PG[("Postgres")]
        RD[("Redis")]
        VT[("Vault")]
        KC["Keycloak"]
        HS["Headscale — SINGLETON, nur hier"]
    end

    subgraph UtilCP["Weitere Control-Plane-Node (optional, HA für Utility-Dienste)"]
        direction TB
        Traefik2["Traefik (eigener Gateway dieser Node)"]
        SIEM["SIEM-Stack: Wazuh Manager+Indexer+Dashboard, Falco"]
        Note1["Kein zweites Headscale — Singleton bleibt Singleton"]
    end

    subgraph Worker["Worker-Node (ohne Utility-Nodes)"]
        direction TB
        Router["jimesh-router — Gateway DIESER Node"]
        App1["User-App-Container 1"]
        App2["User-App-Container 2"]
    end

    Browser -->|"https://haupt-control-plane/"| Traefik1
    Browser -->|"https://worker-node/ws/{id}/app/{port}/"| Router
    Backend -.->|"Control-Plane-Registry (TASK-060): kennt beide Node-Typen"| Router
    Backend -.->|"Registry-Eintrag, optional"| Traefik2
    Router --> App1
    Router --> App2

    style MainCP fill:#1e3a5f,color:#fff
    style UtilCP fill:#3a4a1e,color:#fff
    style Worker fill:#5f3a1e,color:#fff
    style HS fill:#2d6cdf,color:#fff
    style Router fill:#2d6cdf,color:#fff
    style Traefik1 fill:#2d6cdf,color:#fff
    style Traefik2 fill:#2d6cdf,color:#fff
```

### Die vier Klassen im Klartext

| Klasse | Zweck | Anzahl | Hat eigenen Gateway? |
|---|---|---|---|
| **Haupt-Control-Plane** | Plattform-Hirn: Backend, DB, Vault, Keycloak, **Headscale** | genau 1 | Ja (Traefik) |
| **Weitere Control-Plane** (optional) | HA/Isolation für Utility-Dienste (z.B. SIEM), NICHT für Headscale | 0..n | Ja, eigener Traefik |
| **Worker-Node** | Läuft User-Apps, kein Utility-Kram | 0..n | Ja (jimesh-router) |
| **User Client** | Browser/CLI des Operators oder Endnutzers | beliebig viele | Braucht keinen — ist der Zugreifende |

**Wichtige Regel, die heute mehrfach unklar war:** Jede Node (egal welche
Klasse) hat **genau einen** öffentlichen Eingang (Traefik oder
jimesh-router). Alles dahinter redet nur über das interne Docker-Netz
dieser einen Node. Zwei Nodes = zwei getrennte Eingänge, niemals einer für
alle.

---

## 2. Netzwerk-Topologie im Detail — ein Zugriff, Schritt für Schritt

```mermaid
flowchart TB
    subgraph Client["User Client"]
        U["Browser"]
    end

    subgraph CPNode["Control-Plane-Node — internes Docker-Netz 'jimesh-net'"]
        direction TB
        T["Traefik\n:9080 einziger Public Port"]
        BE["jimesh Backend"]
        KCn["Keycloak"]
        PGn[("Postgres")]
        RDn[("Redis")]
        VTn[("Vault")]
        HSn["Headscale"]

        T -->|"PathPrefix /api,/v1,/health"| BE
        T -->|"PathPrefix /auth (Pfad, kein 2. Port)"| KCn
        T -->|"PathPrefix / (catch-all)"| FE["Frontend"]
        BE --> PGn
        BE --> RDn
        BE --> VTn
        BE -.->|"internes Docker-DNS: http://headscale:8082"| HSn
    end

    subgraph WNode["Worker-Node — eigenes internes Docker-Netz"]
        direction TB
        R["jimesh-router\neinziger Public Port dieser Node"]
        FW["Firewall-Reporting (read-only Probe)\nEnforcement opt-in, NIE Host-iptables per Hand"]
        WAF["WAF-Sidecar (Coraza/OWASP-CRS)"]
        App["User-App-Container"]

        R -->|"JWT-Check gegen Keycloak-JWKS"| Auth["Ownership-Check"]
        Auth -->|"erlaubt"| WAF
        WAF --> App
        R -.->|"read-only Report"| FW
    end

    U -->|"1: HTTPS zur Control-Plane"| T
    U -->|"2: HTTPS zum Worker-Node\n/ws/{workspaceId}/app/{port}/"| R
    BE <-->|"3: config pull (Router zieht per Long-Poll)"| R
    R -->|"4: JWKS-Fetch (machine-to-machine)"| KCn

    style T fill:#2d6cdf,color:#fff
    style R fill:#2d6cdf,color:#fff
    style CPNode fill:#1e3a5f,color:#fff
    style WNode fill:#5f3a1e,color:#fff
```

### Was an jedem nummerierten Pfeil oben passiert

1. **User → Control-Plane:** normaler HTTPS-Request an Traefik. Traefik
   entscheidet per Pfad, wohin (`/api` → Backend, `/auth` → Keycloak,
   Rest → Frontend). Kein Tailscale-Client nötig.
2. **User → Worker-Node:** direkter HTTPS-Request an den Router dieser
   Node, URL-Form `/ws/{workspaceId}/app/{port}/...` — auch hier kein
   Tailscale-Client nötig, das ist der normale End-User-Pfad (TASK-079,
   real gebaut, siehe `cmd/jimesh-router/wsproxy.go`).
3. **Backend ↔ Router:** der Router PULLT seine Konfiguration vom Backend
   (Long-Poll gegen `/api/router/config`) — das Backend drückt nichts an
   den Worker-Node, der Worker-Node muss also nicht von der Control-Plane
   aus erreichbar sein, nur umgekehrt.
4. **Router → Keycloak:** maschinelle JWKS-Abfrage zur JWT-Prüfung — braucht
   nur eine ausgehende Verbindung vom Worker-Node zur Control-Plane, keinen
   eingehenden Port.

### Firewall — was real ist, was nicht

- **Read-only Reporting** (`jimesh-router --firewall` ohne Enforcement)
  ist Code-Realität: der Router meldet den Ist-Zustand seiner eigenen
  nftables-Regeln an die Control-Plane.
- **Enforcement** (Regeln tatsächlich durchsetzen) ist opt-in im selben
  Binary (`--firewall=true`), lief aber heute noch nie live — bewusst
  nicht mehr über Ad-hoc-Chat-Kommandos, sondern nur noch über den
  Ansible-Runner-Container oder echten Code-Pfad.
- **Was NIE passiert:** manuelle `iptables`-Kommandos auf dem Host, egal
  ob Control-Plane oder Worker-Node. Diese Regel ist nach dem heutigen
  Vorfall endgültig.

### SIEM — wo es hinpasst

Der Wazuh/Falco-Stack (`deploy/siem/`, Sprint 32, real, opt-in) beobachtet
**Worker-Node-Container** (Falco: eBPF-Tripwires speziell für
`jimesh-framework-*` Workspace-Container) und läuft selbst typischerweise
auf einer **Control-Plane-Node** (Manager+Indexer+Dashboard, aktuell
Loopback-only auf dem Haupt-Control-Plane-Host). Bei mehreren
Control-Plane-Nodes kann der SIEM-Stack auf die "weitere Control-Plane"
(Abschnitt 1) ausgelagert werden, um die Haupt-Control-Plane zu entlasten
— das ist der praktische Sinn dieser zweiten Klasse.

---

## 3. Was davon heute schon steht vs. noch offen

| Baustein | Status |
|---|---|
| Traefik auf der Haupt-Control-Plane | ✅ gebaut, live verifiziert |
| Headscale (Singleton) + Gateway-Node im Tailnet | ✅ gebaut, live verifiziert (`100.64.0.1`) |
| Control-Plane-Registry (`/api/control-planes`) | ✅ bereits vorhanden (TASK-060), ungenutzt für einen 2. echten Eintrag |
| `jimesh-router` Workspace-Proxy (TASK-079) | ✅ Code real, nie live deployed |
| Ansible-Runner + `make provision-node` | ✅ gerade gebaut, noch nicht gegen einen echten Server gelaufen (fehlende Zugangsdaten) |
| Keycloak über Traefik-Pfad `/auth` | ❌ noch nicht verdrahtet (aktuell eigener Port `127.0.0.1:8081`) |
| Zweite Control-Plane-Node (SIEM-HA) | ❌ Konzept, 0 Code |
| Firewall-Enforcement (nicht nur Reporting) | ❌ nie live getestet |
| Headscale-OIDC-Device-Flow | ❌ nicht konfiguriert |
