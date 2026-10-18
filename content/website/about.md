# About Page — JiMesh (Copy Source of Truth)

**Status:** Konsolidiert 2026-10-16. Erste vollständige About-Page — es gab vorher keine.
Diese Datei ist die Copy-Quelle für beide Surfaces (OSS-Site `/about` und jimesh.io `/about`).
Quellen: `jimesh2/README.md`, `jimeshOps/README.md` (Namenshistorie), MASTER-PLAN §1.1,
Tour-Slides. Alle Claims sind codeverifizierbar; nichts ist erfunden (No-Mock-Mandat
gilt hier doppelt: über uns lügen ist die schlechteste Marketing-Währung).

---

## §1 Was JiMesh ist (Elevator Pitch)

**Kurz (2 Sätze):**

> JiMesh is agent infrastructure you actually own — a Go control plane that runs your
> agents, containerized dev environments and LLM routing on the servers you choose,
> behind one private mesh. One OpenAI-compatible endpoint with real failover on top;
> gVisor sandboxing, OPA policy gates and a zero-trust vault underneath.

**Lang (1 Absatz, für Media/Partner):**

> JiMesh is an open infrastructure platform for teams shipping with AI agents. A pure
> Go gateway orchestrates container deployments across your own servers over an
> encrypted WireGuard mesh, routes every LLM request through quota-aware chains with
> automatic failover, and wraps the whole thing in a security stack — Keycloak OIDC,
> OPA-capability gates, Vault-backed secrets, gVisor workspace isolation and a SIEM
> events stream. Self-hosted as open source, or managed in our cloud.

### Variante Enterprise (jimesh.io, kürzer)

> JiMesh is a managed control plane for your AI infrastructure: agent sessions,
> containerized workspaces and LLM routing with real failover — on Kubernetes, in your
> region, with quotas you can see and a signup that respects your data.

---

## §2 Wofür wir stehen (Principles — je ein Satz plus Beweisverweis)

### Nothing in it pretends.

Every number on our website, every screenshot, every benchmark is real. The dashboard
screenshot on our landing page is a screenshot of the running product; the logos in our
stack strip are the components we actually run. If we don't ship a feature, we don't
draw it. *(no-mock mandate, `Agents.md` / SPRINT-5)*

### Your keys, your data, your servers.

Self-host everything: the OSS project runs on machines you control, agents work inside
gVisor-isolated sandboxes, and secrets leave the vault only at runtime — never into a
`.env` file. The managed tier applies the same rule to your workspace: encrypted, meshed,
yours.

### Real failover, not marketing failover.

Exhausted LLM keys bench themselves until the provider-reported reset, then return on
their own; the bandit router picks per request from live statistics. Failover happens at
the proxy layer — your agent just sees the next token stream.

### Infrastructure you can read.

Topology, VLANs and firewall rules are provisioned through versioned, reviewable
files — not a black box. The gateway's HTTP routes live in a single auditable file, and
our API reference is kept honest against it by a mechanical drift audit.

### Cloud-agnostic by design.

Terraform modules, Traefik ingress, standard CSI storage, no proprietary lock-in —
moving JiMesh between clouds is a parameter change, not a migration project.

### Security is the floor, not a plugin.

OPA policy gates before every sensitive action, zero-trust egress default-deny,
audit events into a SIEM timeline, and automated static analysis of agent
configurations.

---

## §3 Wie JiMesh gebaut ist (Fakten-Box)

| Layer | Was konkret drinsteckt |
|---|---|
| **Control plane** | Pure Go daemon (CGO_ENABLED=0), PostgreSQL via pgx, Redis Streams |
| **Dashboard** | Next.js 15 SPA — everything from node linking to app deploys on one canvas |
| **Agent runtime** | gVisor (`runsc`) sandbox isolation for untrusted agent code |
| **Networking** | Headscale/WireGuard overlay mesh across on-prem, cloud and VPS nodes |
| **Identity & secrets** | Keycloak OIDC, HashiCorp Vault-backed zero-trust secret delivery |
| **LLM layer** | One OpenAI-compatible `/v1` endpoint, chains/pools, bandit routing, governance |

---

## §4 Die Story (WIP — Operator-Review nötig)

Draft, ehrlich und unsentimental — Public-Release erst nach Operator-Freigabe:
> JiMesh started as an internal tool for running AI agents across a fleet of small
> servers without turning every deploy into a networking headache: encrypted mesh
> instead of exposed ports, a vault instead of `.env` files, one LLM endpoint with real
> failover instead of a dashboard full of fragile keys. When the tool kept solving our
> own problems, we opened the source and started building the managed layer on top of
> it — same code, same stack, no fork.

Namenshistorie (aus `jimeshOps/README.md`, „Namenshistorie"): das Deploy-Umbrella-Repo
hieß ursprünglich `jimeshCloud`; die heutige Aufteilung ist

| Repo | Role |
|---|---|
| `JiMesh2` | the open-source product (gateway, dashboard, deploy templates) |
| `jimeshIO` | the premium/managed codebase (multi-tenant gateway, billing, cloud adapters) |
| `jimeshOps` | the thin deploy umbrella (Terraform entry, environments, onboarding) |

→ Auf der About-Page **nicht** die interne Repo-Aufteilung nennen, sondern das Ganze in
einem Satz als „open-source core, managed cloud on top" erklären — die Repo-Details
sind operations-intern.

---

## §5 Was heute lebt / was auf der Roadmap steht (ehrliche Version)

**Shipping today (OSS, self-hosted):**

- Go gateway with OpenAI-compatible `/v1`, chains/pools, bandit routing, quota-aware failover
- Next.js dashboard: agents, sessions, tool calls, networks, vault matrix, SIEM timeline
- gVisor sandbox isolation, Keycloak OIDC, Vault-backed secrets, WireGuard mesh
- Containerized deploys of agent/dev workloads over reviewable Ansible files

**On the roadmap (managed cloud):**

- Managed Starter tier — pay-as-you-go with transparent quotas (3 containers +
  utility container, managed Grafana/Postgres/Redis included); pricing final under
  review *(Sprint PR-1..6 — numbers nicht versprechen, bis PR-5 lebt)*
- Enterprise signup with Stripe-verified identity, workspace at `<name>.jimesh.io`
- Premium render/buffer add-on (GPU-backed browser sessions) — later, explicitly not
  promised *(Operator-Entscheid 2026-10-14: out of scope fürs Startup-Programm)*

---

## §6 Lizenz

> JiMesh is **source-available** under
> [PolyForm Noncommercial 1.0.0](https://github.com/ji-podhead/JiMesh2/blob/main/LICENSE) — free to
> run for noncommercial use. Commercial licenses are available on request; the managed
> cloud variant is our commercial offering.

---

## §7 Kontakt / Community

| Kanal | Copy |
|---|---|
| GitHub | `https://github.com/ji-podhead/JiMesh2` — stars on GitHub, issues welcome |
| Community | LinkedIn group *(URL pending — `LINKEDIN_GROUP_URL` placeholder im README, vor Launch fixieren)* |
| Contributing | `CONTRIBUTING.md` im OSS-Repo |
| Security | `SECURITY.md` — vulnerability reports, gVisor sandbox model |
| Email | *(TODO Operator: hello@jimesh.io? — placeholder, nicht ohne Bestätigung ausspielen)* |

---

## §8 Was die About-Page NICHT behauptet (Guardrails)

- Keine User-/Kunden‑Zahlen, keine „X companies run JiMesh"-Claims (existieren nicht).
- Keine fake Stars, kein „backed by"-Logo-Wall (Inkubator-/Programm-Affiliationen
  höchstens nach einer Founders-Hub-Zusage nennen — `SPRINT-STARTUP-PROGRAMS.md` ist
  **strategie-intern**, nicht public).
- Kein „enterprise-ready" ohne beweisbaren SOC2-/Compliance-Bezug — Security-Claims
  bleiben feature-fundiert, keine Zertifizierungs-Andeutung täuschen.
- Pricing-Standing-Zahlen überall mit „final under review"-Eskalation oder weglassen.
