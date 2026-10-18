# Landing Page — JiMesh (Copy Source of Truth)

**Status:** Konsolidiert 2026-10-16. Diese Datei ist die **einzige Copy-Quelle** für die
Landing-Page. Alle Block-Copy wird von hier in die Implementierungen transportiert:

| Surface | Implementierung | Übernimmt |
|---|---|---|
| **apps/site** (jimesh.io, voll SSR) | `apps/site/src/app/*` — re-exportiert aus `jimeshIO/enterprise/site` | §1.2, §6, §8, §9 |
| **apps/console** public-zone | `apps/console/src/app/{landing,docs,tour}` — jimesh2-Frontend via `@jimesh/source/*`_alias eingespiegelt | §1–§5, §7 |
| Legacy OSS-Site (standalone) | `jimesh2/website/src/app/page.tsx` — bleibt parallel laufend, bis apps/console die public zone endgültig übernimmt | §1–§5, §7 |
| Legacy Dashboard-Landing | `jimesh2/src/frontend/src/views/LandingPage.tsx` (SPA-root) | §1–§5 |
| **veraltet, nicht editieren** | `jimesh2/src/frontend/src/website/landing.tsx` — ältere „Next-Gen Agentic Mesh"-Partikel-Canvas-Variante, Konkurrenz-Hero-Text; Kandidat für Löschung beim nächsten Cleanup | — |

Regel gegen Subagent-Drift: wer Copy ändert, ändert sie **hier** und spiegelt den Edit
in die TSX-Komponenten — nie umgekehrt, kein Copy-Rewrite ohne Spiegel-Edit hier.

**No-Mock-Mandat gilt auch im Marketing:** jede Zahl, jedes Logo, jeder Screenshot auf der
Seite muss real sein. Erfundene Telemetrie, fake Stars und die alte eBPF-Story sind entfernt
und dürfen nicht zurückkommen (`SPRINT-5-MARKETING-WEBSITE.md`, Operator-Verbot
„Launch-Dashboard-Button").

---

## §1 Hero

**Eyebrow-Badge (klein, vor der H1):**

> MULTI-PROVIDER LLM GATEWAY · ONE OPENAI-COMPATIBLE ENDPOINT · SELF-HOSTED

**H1:**

> Every provider. One endpoint. Failover that actually fails over.

**Subline:**

> JiMesh aggregates any number of LLM provider keys behind a single /v1 API, picks the
> best available model for each request, and falls over to the next provider when one is
> rate-limited or unhealthy. Pure Go (CGO_ENABLED=0), PostgreSQL via pgx, Redis Streams —
> self-hosted, no lock-in.

**CTA (Header-Button):** `Get Started` — verlinkt auf den Install-Snippet-Anker (`#install`).
**Verbot:** „Launch Dashboard"-Button (Operator-Mandat).

**Install-Snippet (echter Quickstart aus dem README, mit Clipboard-Copy):**

```sh
git clone https://github.com/ji-podhead/JiMesh2.git && cd JiMesh2 && make up
```

### §1.2 Enterprise-Variante (jimesh.io, Surface A — pre-login)

Kurze, zahlungsfirst-ehrliche Variante. Kein Feature-Overload vor dem Stripe-Signup
(Kontext: `SPRINT-ENTERPRISE-SITE-AUTH-BILLING.md` ES-11, Dual-Surface):

**H1:** Secure workspaces. Payment-first signup. Your keys, your data.
**Subline:** Managed JiMesh workspaces on Kubernetes — no exposed ports, quota-transparent,
pay-as-you-go. Sign up, verify with Stripe, then your workspace goes live at
`<workspace>.jimesh.io`.
**CTA:** `Sign up` → `/signup` (Stripe-Verification first; kein echter Login davor).

---

## §2 Trust/Stat-Strip (optional, nur echte Claims)

> PURE GO · CGO_ENABLED=0 &nbsp;|&nbsp; POLYFORM NONCOMMERCIAL SOURCE-AVAILABLE &nbsp;|&nbsp; NO-MOCK MANDATE &nbsp;|&nbsp; NO INVENTED NUMBERS ON THIS PAGE

---

## §3 Demo-Sektion (echter Screenshot)

**Fenster-Titel:** `JiMesh Dashboard · /overview`
**Badge:** `REAL SCREENSHOT`
**Video/Copy unter dem Screenshot** (Pill-Badges):

- `Pure Go · CGO_ENABLED=0`
- `PostgreSQL pgx v5`
- `Redis Streams`
- `Bandit routing + failover`
**Link-Zeile:** `Live tour with 8 real screens` → `/tour`

Verwende das echte `/overview`-Dashboard-Asset (`public/screens/dashboard-overview.png`),
keinen Mock-Frame mit erfundener Runtime.

---

## §4 Feature-Cards (3 Karten)

### Card 1 — One OpenAI-Compatible Endpoint
Icon: `network`

> Point anything that speaks the OpenAI protocol at your JiMesh /v1 — chat completions,
> embeddings, model listing, and streaming. Claude Code, Cursor, and Aider work with a
> base_url switch.

Kicker: `OPENAI PROTOCOL · /V1`

### Card 2 — Chains, Pools & Real Failover
Icon: `database`

> Wire providers into chains on the canvas: fixed models, smart pools, and links between
> chains. The bandit router picks per request from live statistics and quota knowledge —
> exhausted keys bench until the provider-reported reset, then come back on their own.

Kicker: `BANDIT ROUTING · QUOTA-AWARE`

### Card 3 — Real Infrastructure — No Mocks
Icon: `shield`

> Pure Go daemon (CGO_ENABLED=0), PostgreSQL persistence via pgx, Redis Streams for live
> events, Keycloak OIDC, Vault-backed secrets, gVisor-isolated agent containers. JiMesh
> has a standing no-mock mandate — nothing in it pretends.

Kicker: `NO-MOCK MANDATE`

## §4b Erweiterbare Feature-Claims (aus Tour, optional als zusätzliche Cards)

Nur bei Bedarf montieren — jede Zeile ist ein realer Panel-Nachweis aus der Tour
(`jimesh2/website/src/components/tour/slides-data.ts`):

- **Auditable agent runs** — Session-Detail mit Conversation- und Tool-Calls-Panes,
  jede Session 1:1 auf einen isolierten Workspace gemappt.
- **Vault access matrix** — OPA-Policy-Regeln vor jedem Secret-Read, Database-Engine-Gate,
  Default-Zero-Trust-Egress (deny).
- **SIEM events timeline** — Firewall-Hits, Policy-Denials und Routing-Failures laufen in
  einen filterbaren Events-Timeline-Stream.
- **Encrypted mesh networking** — VLAN-Segmente plus Headscale/WireGuard-Overlay,
  jedes Segment am Firewall-Ruleset sichtbar.

---

## §5 Stack-Strip

**Überschrift:**

> THE ACTUAL STACK — NOTHING ON THIS PAGE IS INVENTED

**Logos (echter, im Produkt laufender Stack — genau diese 10):**

| Logo | Name |
|---|---|
| Go | Pure Go gateway, CGO_ENABLED=0 |
| PostgreSQL | Authoritative store via pgx |
| Redis | Streams pub/sub (Events + Logs) |
| Keycloak | OIDC identity |
| Vault | Secrets engine |
| Docker | Container runtime |
| gVisor | runsc sandbox isolation |
| Headscale | WireGuard overlay mesh control |
| Traefik | Single public entrypoint |
| Next.js 15 | Dashboard SPA |

---

## §6 Enterprise-Surface-Begrenzung

Was **nur** auf der Enterprise-Site (`jimesh.io`, pre-login Surface A) montiert werden darf:

- §1.2 Hero + `Sign up`-CTA
- Pricing-Link (`/pricing`) — Preise in `marketing-pricing.md`
- Stripe-Verification-Hinweis: „First sign up, then pay — the purchase flow runs on a
  separate, secured surface."

Was dort **nicht** mountbar ist: Dashboard-Launch-Button, fake-Metrik-Hero, GitHub-Stars.

---

## §7 Security-Anchor (Footer-Links)

| Label | Ziel |
|---|---|
| Docs | `/docs` |
| Tour | `/tour` |
| Architecture | `/docs#d-architecture` |
| Security | `/docs#d-security` |
| GitHub | `https://github.com/ji-podhead/JiMesh2` |

---

## §8 Enterprise-Footer (jimesh.io)

> JiMesh · PolyForm Noncommercial 1.0.0 · source-available

Rechts: `Pricing` · `Security` · `Sign in` · `GitHub`.

---

## §9 Version-Metadaten

| Feld | Wert | Quelle |
|---|---|---|
| Badge „self-hosted" (AppBar) | `self-hosted` | page.tsx AppBar |
| Version-Pill (optional) | echte Release-Version, kein erfundener Tag | package.json / release |
| GitHub-Repo-Link | `https://github.com/ji-podhead/JiMesh2` | konstant |

---

# Landing v2 — FX-Neubau (`apps/site/src/app/page.tsx`, 2026-10-18)

Neubau der Public-Landing nach Operator-Rücklauf („schmale Spalte, Demo zu spät,
unsichtbare Animationen"): full-bleed Layout, FX-Engine 1:1 aus der Portfolio-Referenz
(portiert nach `packages/site-ui/src/components/fx/*` + `packages/site-ui/src/lib/{kooljs,particles}/*`),
Demo-Tour direkt nach dem Hero. Section-Order fix: Hero → Demo-Tour → Feature-Grid
(6 SVG-Panels) → Rack-vs-Rogue → Stack-Strip → Get-Started → Footer.
Alle Blöcke dieser Sektion sind die Copy-Quelle für Landing v2.

## §v2-A Hero (full-bleed FX-Stack)

FX-Layer: GLSL-Ribbon (`glsl-background`, Shader aus der Referenz) + Matrix-Rain
(Canvas-2D-Port, ~13% Opacity) + kooljs-Partikel-Wolke (62vh-Strip unter der Copy,
Wörter zyklisch alle 4s, explode bei erstem Scroll/Klick).

**Eyebrow-Badge:**

> SELF-HOSTED AGENT INFRASTRUCTURE · ON-PREM · HYBRID · MULTI-CLOUD

**H1:**

> Your agents. Your servers. One private mesh.

**Subline:**

> JiMesh runs AI-agent infrastructure on the hardware you choose — on-prem, hybrid, or
> multi-cloud. Containerized agent workspaces in gVisor sandboxes, one OpenAI-compatible
> LLM endpoint with real failover, and a security stack with OPA policy gates, SIEM
> events and eBPF threat response underneath. Open source first; managed cloud later.

**CTAs:** `SEE IT RUN — THE TOUR ROLLS ON SCROLL` (→ `#demo`) · `SOURCE` (→ GitHub-Repo).

**Partikel-Wörter (kooljs/Timeline):** `self-hosted` · `multi-cloud` · `zero-trust` · `on-prem`.

## §v2-B Demo-Tour (sticky, scroll-getrieben — sofort nach dem Hero)

Header: Label `DEMO TOUR — IT STARTS RIGHT NOW`; H2 `Keep scrolling. You are already
inside the product.`; Body: `The real jimesh2 frontend — same DOM, same CSS, a demo
dataset. The camera rolls through the pages while the side captions brief you. No scripts
inside the frames; they are mounted into a WebGL corridor as live DOM.`
Die echten Mocks (`assets/website/demo/*.html`) laufen unverändert unter `/demo/*` als
`<Html transform>`-Frames im fiber-Canvas; Kamera-Dolly mit Dwell pro Frame, Captions
auf der Gegenschiene, Step-Dots + Frame-Counter. Frames 01→09:

| # | Label | H3 | Body | Bullets |
|---|---|---|---|---|
| 01 | 01 · CONTROL PLANE | Everything lands on one screen. | The /overview page is mission control: deployed projects, running apps, security posture, mesh networks and secrets — all live, all yours. Provisioning runs from here, not from a vendor console. | deployed projects · running apps · security + networks |
| 02 | 02 · LLM PROXY | Fallback chains that actually fail over. | Every key you bring works from one OpenAI-compatible /v1 endpoint. Chains route gpt-4o through claude to deepseek when providers rate-limit — key cooldowns are real, quota knowledge is tracked per provider. | one /v1 endpoint · quota-aware failover · key cooldowns |
| 03 | 03 · NETWORKS | Your mesh, end to end. | VLAN segments plus a Headscale/WireGuard overlay — every segment is pinned to its firewall ruleset. Multi-cloud nodes join the same encrypted mesh; nothing is exposed through open ports. | VLAN segments · WireGuard overlay · firewall zones |
| 04 | 04 · VAULT | Secrets that never leave the runtime. | Vault-backed secret delivery: registry, policy rules and the database engine gate. An access matrix rides in front of every read — default-deny egress until a rule says otherwise. | engine registry · policy rules · database engine gate |
| 05 | 05 · SIEM | Every event lands in the timeline. | Wazuh, Falco and Checkov findings flow into one filterable event stream. The console side carries Wazuh embedded — findings, not vibes. | wazuh · falco · checkov |
| 06 | 06 · WORKSPACES | Isolated workspaces with live apps. | Each workspace gets its own firewall rules and per-workspace quotas. A session maps one-to-one onto an isolated workspace — audit trails included. | firewall rules · app switcher · per-workspace quotas |
| 07 | 07 · PROJECT | Apps you can actually touch. | Web terminal, DSH web and a WebRTC live view — real runtime access earned through OPA capability gates, not a shared admin password. | web terminal · DSH web · WebRTC live view |
| 08 | 08 · EMAIL | Mail in, workflow out. | Gmail arrives via IMAP, attachments land per-mail, and uploads stream straight into Ozone (S3). Connectors run under the same zero-trust rules as everything else in the mesh. | gmail via imap · attachments per mail · direct to s3 |
| 09 | 09 · AGENT CHAT | Agents that provision their own infra. | Coding, browser and ops agents orchestrate workspaces and deployments. Every tool call is capability-gated, budget-gated and auditable — session detail shows conversation and tool calls side by side. | tool calls · budget-gated · auditable |

## §v2-C Feature-Grid-Header + Gateway-Banner

Label: `WHAT YOU ARE ACTUALLY RUNNING` · H2: `Six layers, one mesh. Every infographic
below is wired to move.` Darunter full-bleed `ai_gateway.svg`-Panel (marching-dash
Shader-Bewegung, keine Text-Copy nötig).

## §v2-D Sechs SVG-Feature-Panels (animierte Infografiken)

| # | Asset | Kicker | H3 | Body | Chips |
|---|---|---|---|---|---|
| 1 | secure_cloud.svg | GVISOR · ZERO-TRUST MESH | Agent workspaces, isolated by default. | Register on-prem racks, VPS nodes and cloud instances — JiMesh joins them into one encrypted WireGuard mesh with VLAN segmentation. Every agent runs in a gVisor-isolated workspace with zero-trust egress that denies before it allows. Untrusted code never crosses the boundary. | gVisor sandboxes · zero-trust egress · OPA capability gates |
| 2 | jimesh_managed_services.svg | K8S + ON-PREM | Kubernetes-native workspaces. | JiMesh runs in Kubernetes or on bare metal you own. Every workspace is a namespace with real ResourceQuota and LimitRange enforcement — the control plane enforces caps, not promises. Managed services (Grafana, Postgres, Redis and friends) are included as shared mesh services, not bolted-on extras. | workspaces as namespaces · resource quotas · managed shared services |
| 3 | attack.svg | SIEM | SIEM timeline built in. | Firewall hits, policy denials and routing failures land in one filterable events stream. Wazuh, Falco and Tetragon findings escalate to enforcement at the kernel edge — kills, blocks and persisted receipts, written where auditors can find them. | one event timeline · wazuh + falco · audit receipts |
| 4 | observability.svg | EBPF THREAT RESPONSE · LOGS | eBPF at the edge, Kafka in the core. | eBPF probes watch syscalls and network flows on live nodes: session identity, egress allowlists and a freeze ladder when an agent misbehaves. Machine workloads stream logs through Redis Streams and Kafka into the dashboard and your own sinks — your stack, your data trail. | kernel-level enforcement · kafka log streams · loki / opensearch |
| 5 | ozone_vault_local.svg | SECURE FILE STORAGE | Files and secrets without .env hoarding. | Ozone (S3-compatible) storage per workspace, encrypted at rest with AES-256-GCM; secrets come from Vault with an OPA policy gate in front of every read — secrets leave the vault only at runtime. The API-keys story ends here. | AES-256-GCM · vault-backed secrets · per-workspace buckets |
| 6 | connectors.svg | MULTI-CLOUD | Plug in what you already use. | Databases, mail, storage, CI — connectors land as integrations inside the same zero-trust rules as everything else. Move workloads between clouds without losing the mesh, the policies, or your audit trail. | db / mail / ci connectors · cloud-to-cloud mesh · one policy layer |

## §v2-E Rack-vs-Rogue (zweisprachig geteilter Band)

Links: Label `RUNS ON HARDWARE YOU OWN` — Body: `On-prem, hybrid, or spread across
clouds — register a node and it joins the encrypted WireGuard mesh. No exposed ports, no
vendor account required.` (server1.svg mit Rack-Glow).
Rechts: Label `HOSTILE AGENTS STAY OUTSIDE` — Body: `gVisor sandboxing, OPA capability
gates and default-deny egress keep untrusted agent code inside its workspace boundary —
prompt-bombs bounce off the gateway wall.` (bad_agent.svg mit Rogue-Puls).

## §v2-F Get-Started (v2)

Label `GET STARTED` · H2: `Clone it. Run it. Own the whole surface.`

- Spalte 1 — `SELF-HOST THE OSS CORE`: Install-Snippet (§1-Snippet, unverändert) +
  Body: `Run the whole stack on your own servers. Free for noncommercial use.`
- Spalte 2 — `PREFER MANAGED?`: `Sign up, verify with Stripe, and your workspace goes
  live at <name>.jimesh.io — no exposed ports, quota-transparent.` CTAs: `SIGN UP`
  (→ /signup), `SEE THE TIERS` (→ /pricing) + Hinweis aus §6 („First sign up, then pay —
  the purchase flow runs on a separate, secured surface.").

---

# Landing v3 — Operator-Revision (`apps/site/src/app/page.tsx`, 2026-10-18)

v2 wurde vom Operator abgelehnt. Verbindliche Deltas von v2 auf v3, alle in dieser
Sektion gespiegelt (Animation-Spec: `development/dev/research/R46-frontend-animation-live-graphics-research.md`,
Komponentenbasis: jimesh2 `a50e0115` → `packages/site-ui/src/components/blogdemo/*`):

1. **Partikel komplett entfernt** — ParticleText + Partikel-Engine rendern nirgends mehr
   (`fx/particle-text.tsx` gelöscht; `lib/{kooljs,particles}` bleiben unbenutzt liegen).
   Grund: Partikel spawnen unendlich weiter.
2. **Shader-Hintergrund entfernt** — der GLSL-Ribbon ist raus. Ersatz: animierter CSS-Gradient
   `.jmh-gradient-bg` (marketing.css): `#0d0e15`-Basis mit grün `#3fb950` / cyan `#00d2ff` /
   lila `#c084fc`-Tönen, `background-size: 200%`, 28s-Keyframe-Pan, nur `background-position`
   animiert, `prefers-reduced-motion` → statisch.
3. **Slideshow-SVG-Hintergründe neutralisiert** — die dunklen Vollflächig-`<rect>`s /
   radialGradient-Cards in `apps/site/public/brand/slideshow/*.svg` sind auf `fill="none"`
   gesetzt; die Panels sitzen jetzt auf der Seiten-Hintergrundfarbe. Nur Hintergrund-Elemente,
   Content (Cube/Icons/Agenten) unangetastet.
4. **connectors-hero Section (neu, nach dem Feature-Grid)** — SVG `connectors_hero.svg`
   (Kopie von connectors.svg: linke Seite — Cube mit Connector-Orbit, Gateway-Laser-Links —
   unverändert; rechte Agent-/Sandbox-Workload-Karten entfernt; der Orchestrator-Agent sitzt
   skaliert in der rechten oberen Ecke). SVG vollbreit im Panel; der H2 als 3-Chunk-Lerp-Block
   (`Thousands of connectors.` / `One managed environment.` / `Your agents — safely connected.`
   — kompaktes eigenes Chunk-Muster nach hero-lerp-headline, useScroll/useTransform/useSpring,
   kein Snapping) liegt im Panel rechts oben unter dem Eck-Agenten, rechtsbündig, darunter der
   Body-Text: `JiMesh ships with connectors for everything you already run — and gives you a
   managed environment where your agents get safe access to your resources. JiMesh takes care of
   your deployments, secrets, secure file access, storage and network access.` Auf kleinen
   Screens steht derselbe Copy-Block statisch über dem Panel (`connectors-hero-copy.tsx`).
5. **Hero: 3-Chunk-Lerp-Headline** — `Your agents.` / `Your servers.` / `One private mesh.`
   (dritter Chunk als GradientText) lerppen beim Scroll mit useSpring/useTransform gegeneinander
   (kein Snapping), dazu Eyebrow + Subline + Quickstart-Snippet (§v2-A-Copy unverändert) und
   der Brand-Cube (logo-extrude-Pattern: SVGLoader → ExtrudeGeometry → Distort-Shader) oben rechts.
6. **Layout full-bleed** — wie v2 beibehalten (max-w-none-Hero, große Typo, volle Breite).
7. **Section-Order:** Hero (animierter Gradient-bg + 3-Chunk-Lerp + Quickstart) → Demo-Tour
   (§v2-B unverändert) → Portfolio-Feature-Grid mit neutralisierten Slideshow-SVGs, animiert
   über die blogdemo-Motion-Patterns (Paket-Hops, Route-Stroke-Draw, Pulse-Rings via
   motion/react, `slideshow-flow.tsx`) → connectors-hero (Delta 4) → Rack-vs-Rogue (§v2-E) →
   Stack-Strip (§5) → Get-Started (§v2-F) → Footer.
8. **FX-Aufräumen** — aus der Landing raus: ParticleText (gelöscht), GLSLBackground,
   MatrixRain, SvgFlowPanel (Shader-Textur-Ansatz ersetzt). Dateien bleiben in site-ui
   (unused), werden aber von keiner Seite mehr gerendert.
