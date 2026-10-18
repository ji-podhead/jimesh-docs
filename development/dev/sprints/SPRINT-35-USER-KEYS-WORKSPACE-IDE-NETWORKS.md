# SPRINT-35 — User-Keys, Workspace-IDE & Zero-Trust-Mesh (Headscale)

**Quelle:** Operator-Diskussion 13.9.2026 (Headscale/Nebula/NetBird-Research,
xterm.js/gotty-Evaluation, Scanopy-Pläne). Sprint 34 (Mesh-Tunnels, Layer-0)
ist der Vorgänger — dieser Sprint konkretisiert die drei noch offenen Bausteine.

## Ziel

1. **Pro-User-Proxy-Keys** (E4 Mehrbenutzer): Der `/v1/*`-Proxy hat heute EINEN
   globalen Gateway-Key (`jimesh-sk-…`, `BootstrapGatewayAuth`,
   `internal/auth/auth.go:523`). Jeder Mitarbeiter nutzt denselben Key — keine
   Budget-Zuordnung, keine Rotation pro Person, kein Audit "wer hat was
   konsumiert". Ziel: per-User-Keys mit Budget-Cascade
   (Team → Projekt → User, TASK-016-Entwurf).
2. **Workspace-IDE wählbar pro Projekt**: xterm.js-Web-Terminal (Go-WebSocket)
   als gotty-Alternative, plus Auswahl pro Projekt (eigenes Terminal /
   code-server / später Coder-Fork).
3. **Zero-Trust-Mesh mit Headscale**: SSH-Targets über Host-Grenzen hinweg
   vernetzen; Tailscale-Tags ↔ Projekt-Tags; Tailscale-ACL ↔ JiMesh-RBAC
   (eine Quelle der Wahrheit, keine zwei Dashboards).
4. **Network-Übersicht**: Welche App auf welchem SSH-Target erreicht welches
   Netzwerk (Scanopy-Vision, als separates Go-Board, nicht ins JiMesh-UI
   integriert).

---

## WP1 — User API Keys für den Proxy (E4-kritisch)

**Status heute (Fundstellen):**
- `internal/auth/auth.go:523` — EIN Gateway-Key (`jimesh-sk-…`) aus dem
  `api-key`-Setting, gate für ALLE `/v1/*`-Requests.
- `internal/keypool/keypool.go` — per-**Provider**-Cooldown (Upstream-Keys),
  NICHT per-Consumer.

**Erweitert 13.9. (R35 §10.2): Service-Accounts für Deployments —
„no LLM keys in workspaces" (Coder-Muster, als Entscheidung übernommen).**
Deployments bekommen M2M-Service-Account-Keys (an `workspace_id`
gebunden), NIE Provider-Keys. Container-Env-Injektion über das
TASK-011-Muster.

**Arbeitsschritte:**
- [ ] Neue Tabelle `proxy_keys` (`id, kind` (`user`|`service`), `user_id`,
      `workspace_id` (nur service), `label, key_hash, quota_scope,
      budget_limit, created_at, revoked_at`) — Hash gespeichert, nie der
      Klartext (Mandat 9).
- [ ] Service-Account-Auth-Pfad: Key → Workspace → Projekt-Budget
      (Budget-Cascade auf Projektebene, nicht User-Ebene).
- [ ] `internal/auth`: `validateProxyKey(key)` — lookup via Hash,
      Liefert `(user, budget, scope)` statt nur bool.
- [ ] Budget-Cascade anbinden: Team-Limit → Projekt-Limit → User-Limit
      (TASK-016-Entwurf, jetzt implementieren).
- [ ] Frontend: KeysPage erweitert um "Proxy-Keys"-Tab (erstellen/rotieren/
      sperren, Budget zuweisen).
- [ ] Migration: bestehender globaler Key bleibt als "Operator-Key" erhalten
      (kein Breaking Change).

**Akzeptanz:** Zwei User-Keys → zwei getrennte Budgets → Requests über Key A
zählen auf Budget A, nicht auf B. Verifiziert per Live-curl (Mandat 2).

---

## WP2 — Workspace-IDE (xterm.js + Go-WebSocket, gotty-Alternative)

**Warum nicht gotty:** eigener Prozess pro Shell, Go-Server muss SSE/WebSocket
bridgen, kein Auth-Kontext. Warum nicht code-server als Default: hunderte MB
RAM pro Instanz (Node/Electron-Emulation).

**Architektur (Eigenbau, ~0 MB Server-RAM):**
- Frontend: `@xterm/xterm` + `@xterm/addon-fit` im Dashboard (React).
- Backend: `internal/terminal/` — WebSocket-Endpoint
  `/api/workspaces/{id}/terminal` (Auth: Session-Token ODER `?token=`, wie
  der Tunnel in Sprint 36).
- Go dialt per SSH (`internal/network` Pool) in den Ziel-Container
  (`docker exec -it <container> sh`) und streamt stdin/stdout binär durch.
- **Kein** gotty-Container nötig — SSH-Exec reicht (Zero-Port bleibt).

**Arbeitsschritte:**
- [ ] `internal/terminal/terminal.go`: WebSocket-Handler + SSH-Exec-Bridge
      (Proxy-Dial-Muster aus `internal/deploy/tunnel.go` wiederverwenden).
- [ ] Frontend: `TerminalPane.tsx` (xterm.js, reconnect, resize via SIGWINCH).
- [ ] Projekt-Create-Dialog: IDE-Auswahl pro Projekt
      (`terminal` | `code-server` | `none`) — persisted am Workspace-Row.
- [ ] Deployment-Engine: startet nur die gewählte IDE (kein code-server mehr
      als Default bei `terminal`-Wahl — RAM-Ersparnis auf Remote-Nodes).

**Akzeptanz:** Terminal öffnet im Dashboard, Shell im Container, reconnect
nach Netzwerk-Abbruch, kein Host-Port offen (Zero-Port-Mandat).

---

## WP3 — Headscale Control Plane (Mesh über SSH-Targets)

**Research-Ergebnis (Operator, 13.9.):** Headscale (BSD-3-Clause) statt
Nebula (kein Control-Server, manuelle Cert-Verteilung) oder Tailscale-Cloud
(proprietäre Control Plane). gVisor-Netstack nativ im Userspace-Modus
(`--tun=userspace-networking`) — kein TUN-Device, keine Root-Rechte auf den
Targets nötig.

**Opt-in-Mandat (Operator, 13.9.):** Hat der Kunde bestehende Infra
(Direktverbindung, eigenes VPN), wird Headscale NICHT installiert oder
forciiert — JiMesh ist kein Infratool. Mesh nur auf ausdrücklichen Wunsch
provisionieren; Deployment-Form defaults to `mesh_mode: none`.

**Arbeitsschritte:**
- [ ] Headscale-Container in `docker-compose.yml` (Control-Plane + eingebettetes
      DERP + SQLite im Volume).
- [ ] `internal/mesh/` (neu): Headscale-API-Client
      (User/Node/PreAuthKey-Verwaltung), Pre-Auth-Keys pro SSH-Target.
- [ ] Mesh-Agent-Provisionierung: Beim SSH-Target-Onboarding optional
      `tailscaled --tun=userspace-networking` auf dem Ziel installieren
      (Checkbox im Frontend, analog "Auto-Install gVisor").
- [ ] Tailscale-Tags ↔ Projekt-Tags: `tag:proj-<id>` beim Node-Registrieren
      setzen; JiMesh-UI zeigt beide identisch an.
- [ ] ACL-Sync: JiMesh-RBAC (Rollen aus Sprint 20 WP1) generiert die
      Tailscale-ACL (`acl_policy_path`) — **eine** Richtlinie, zwei Enforcer
      (Proxy-Pfad + Mesh-Pfad). Manuelle ACL-Edits in Headscale werden beim
      nächsten Sync überschrieben (dokumentiert im UI als Warnung).

**Akzeptanz:** Zwei SSH-Targets im Mesh → `tailscale ping` erfolgreich,
Traffic läuft verschlüsselt, ohne offene Host-Ports (Zero-Port).

---

## WP4 — Network-Übersicht (Scanopy-Vorhaben, separates Go-Board)

**Abgrenzung (Operator):** NICHT ins JiMesh-Dashboard integrieren — eigenes
Go-Binary/Dashboard ("Scanopy-Board"), das dieselben Datenquellen liest
(JiMesh-API + Headscale-API + Docker-Socket).

**Datenquellen:**
1. JiMesh-API: Workspaces + SSH-Targets + Deployments
2. Headscale-API: Mesh-Nodes, Tags, ACLs
3. Docker-Socket-Discovery (Sprint 8): laufende Container pro Target

**Anzeigen:**
- [ ] Graph: SSH-Target → Container → erreichbare Netzwerke (Mesh-IPs,
      Compose-Netze, Exposed Ports mit Risk-Level aus TASK-013).
- [ ] Matrix "App × Netzwerk": wer erreicht wen (aus ACL + Tunnel-Konfig
      abgeleitet, nicht geraten).
- [ ] Repo: `cmd/scanopy-board/` (Go, statisches React-Frontend via embed).

**Akzeptanz:** Board zeigt für 2 Targets + 3 Container die echte
Erreichbarkeits-Matrix; keine geratenen Einträge (Mandat 2).

---

## Priorität & Abhängigkeiten

| WP | Priorität | Blockiert | Hängt ab von |
|----|-----------|-----------|--------------|
| 1 (User-Keys) | 🔴 P0 — E4-Grundlage | WP2-Auth, Budget-Cascade | Sprint 20 WP1 (✅) |
| 3 (Headscale) | 🔴 P0 — Mesh-Grundlage | WP4-Daten | Sprint 36 (✅ Tunnel live) |
| 2 (Terminal) | 🟡 P1 — UX | — | WP1 (Key-Auth am WS) |
| 4 (Network-Board) | 🟢 P2 — Vision | — | WP3 (Mesh-Daten) |

**Bewusste Abgrenzungen:**
- Coder-Fork: später, nicht in diesem Sprint (zuerst eigenes Terminal,
  Terraform-Philosophie von Coder als Referenz dokumentiert).
- BGP (FRR/Bird): später — Headscale-Subnet-Routing reicht für v1
  (`--advertise-routes` + `headscale routes enable`).
- Nebula: verworfen (kein Control-Server → manuelle Cert-Verteilung per SSH
  wäre eigener Eiffelturm).

## Referenzen

`docs/sprints/SPRINT-34-MESH-TUNNELS-AND-ROUTING.md` (Layer-0-Vorläufer),
`docs/research/R31-…gvisor-docker-networking…` (gVisor-Netstack-Deep-Dive),
`docs/research/R34-mesh-routing-protocols-research-sprints.md`
(Octelium/OpenZiti/Cilium-Vergleich), TASK-016 (Budget-Cascade-Entwurf),
`internal/auth/auth.go` (Gateway-Key, Fundstelle WP1).

---

## Salvage-Fundstellen (R35-Review, 13.9.2026)

- **WP2-Terminal:** Coder-Agent-PTY (Reconnect/Resize) als Protokoll-Referenz; landjail (Landlock V4) als Lightweight-Confinement-Option → `docs/research/R35-code-salvage-review.md` §2.2.
- **WP3-ACL-Sync:** Coder-Rules-Syntax (`method=/domain=/path=`, Default-Deny) als Kandidat für deklarative Egress/ACL-Regeln → R35 §2.2/§9.
- **WP4-Network-Board:** headplane (MIT) `app/routes/machines|users|acls` als Musterspende für unsere React-Views → R35 §3.
- **Lizenz-Warnung:** headscale-admin ist GPL-3 — KEINE Code-Übernahme (R35 §4). Coder ist AGPL — keine Code-Übernahme, nur Muster (R35 §2).

---

## WP1c — Session-Traceability via X-Headers + Agent-ACLs (Operator, 13.9.)

**Kontext-Entscheidungen (Operator, 13.9.):**
1. **JiMesh ist kein Infratool.** Mesh/Overlay-Networks (WP3) sind
   **opt-in**: hat der Kunde eigene Infra, wird NICHTS installiert und
   nichts forciert. LLM-Security first; Networks nur auf Wunsch provisioniert
   (→ R36 Pfeiler-Reihenfolge).
2. **Sessions = Agent-Identität, überall sichtbar.** Die TASK-011-Session
   (agent_type_id, project_id, container_id, trust_class) wird über
   **X-Header in ALLE Hops** getragen und mit Projekten/Endpoints/DBs/MCPs
   verbunden → direkte **Agent-ACLs** („Agent X darf nur DB Y und MCP Z").
3. Daraus folgt die Traceability: jede Anfrage ist attribuiert auf
   Session → Agent-Typ → Projekt → Workspace („welche App verbraucht was",
   Kosten pro App, Audit).

**Bausteine, die es schon gibt:** `sessions`-Tabelle + `GetSessionIdentity`
(rbac.go:117/152), Consumer-Key-Context-Pinning (auth/consumer_key.go),
E-Policy = OPA (DECISIONS.md), Identitäts-Kontrakt: X-Header NIE vom
Client, IMMER ingress-derivebar (AUTH-CONTRACT.md, sc-gateway-Muster).

**Arbeitsschritte:**
- [ ] `consumer_keys` um `kind` (`user`|`service`), `workspace_id`,
      `session_id` erweitern (ALTER-Muster wie store.go:139–148).
- [ ] Store: `CreateServiceKey(projectID, workspaceID, name)` — Plaintext
      genau einmal beim Mint, sonst nur Hash (WP7-Muster).
- [ ] Auth-Middleware: nach Consumer-Key-/Session-Resolve die Header
      server-seitig setzen (X-JiMesh-Session/Workspace/Project) — NIE vom
      Client akzeptieren (strippen wie x-tenant-id).
- [ ] Proxy + Analytics lesen die Header → Attribution pro App
      (by-workspace-Endpunkt).
- [ ] OPA-Policy-Input: `{session, agent_type, project, resource}` →
      allow/deny — Agent-Resource-ACL (DBs, MCPs, Chains) als erste
      Policy-Datei (`config/opa/agent_resources.rego`).
- [ ] Deploy: beim Spawn Service-Key minten + als `OPENAI_API_KEY=<ck-…>`
      + `OPENAI_BASE_URL=<gateway>/v1` injizieren (Anthropic/Gemini
      analog) — ersetzt das heutige „You must supply ANTHROPIC_API_KEY
      yourself" (projects_ssh.go:1509).
