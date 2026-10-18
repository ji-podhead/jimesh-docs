# Site-Structure v2 — Neubau der Public-Website (`apps/site`)

**Status:** Planungs-SSOT für den kompletten Rebuild · 2026-10-16
**Gültigkeit:** Diese Datei definiert Struktur, Sections, Copy-Plätze, Asset-Mapping und
Reihenfolge. Copy-Edits folgen weiterhin dem Regelwerk aus `README.md` (Copy-first hier in
`content/website/`, no-mock, keine internen Details auf Public-Surfaces).

## Positionierung (Operator-Vorgabe, wörtlich eingearbeitet)

JiMesh ist Infrastruktur für Teams, die ihre **AI-Agent-Infrastruktur selbst hosten**
wollen — OSS first, managed später. Die Positionierungsträger:

- **on-prem, hybrid, multi-cloud** — die Nodes gehören dem Team, nicht uns
- **gVisor** — Sandbox-Isolation für nicht vertrauenswürdigen Agent-Code
- **Kubernetes** — Workspaces als Namespaces, ResourceQuota/LimitRange-Enforcement
- **Sicher** — OPA-Policy-Gates, Zero-Trust-Egress, Keycloak-OIDC, Vault
- **SIEM** — filterbare Events-Timeline (Firewall-Hits, Policy-Denials, Routing-Failures)
- **eBPF Threat Response** — Kernel-Level-Enforcement, Identity-Chain, Freeze-Ladder
- **Logs (Kafka)** — Event-/Log-Transport als First-Class-Baustein
- **Secure File Storage** — verschlüsselter, vault-gated Storage für Workspace-Artefakte

Konsequenz für alle Sections: die LLM-Gateway-Story (Endpoint/Failover) bleibt der
Einstieg, aber der Seitenkörper erzählt die **Plattform-Story** (Mesh, Isolation,
Security, Logs) — nicht nur das Gateway.

---

## 1. IA & Navigation

| Route | Zweck | Quelle/Status |
|---|---|---|
| `/` | Landing: Hero (GLSL), Positionierung, Demo, Feature/Scene-Sections, Stack, Get-Started | Neubau (dieses Dokument, §2) |
| `/demo` | Animierte Mock-Demo der echten Dashboard-UI (§3) — eigenständige Seite, von der Landing verlinkt | Neu |
| `/pricing` | Tier-Struktur ohne Zahlen (§5) | Neubau; ersetzt den 1-Zeilen-Re-Export aus `jimeshIO/enterprise/site` |
| `/blog` | Blog-Index mit Kategorien-Filter (§4) | Umbau des bestehenden Index |
| `/blog/[slug]` | Artikel-Page (§4.3) | Umbau, Struktur bleibt |
| `/docs` | Docs-Entry (generiert via `site:gen-docs`) | bleibt; **alte Docs-Bundles fließen raus**, Regeneration aus aktueller Quelle |
| `/tour` | ersetzt die alte MeshCore-Slideshow: geführt zu **neuen Screenshots der echten jimesh2-UI** (§3-Screens, statisch) | Neubau |
| `/about` | About-Copy aus `about.md` (Pitch, Principles, Fakten-Box, Lizenz) | Neu (Copy existiert bereits) |
| `/login` | Sign-in für bestehende managed-User (§6.3, ES-12-Flow) | Neubau |
| `/signup` | Payment-first Signup (Stripe-Verification zuerst, ES-11) | bleibt Re-Export, Copy-Hinweis auf Landing abstimmen |

**Rausfliegt:** `public/tour-mocks/*` (8 MeshCore-Mock-PNGs mit Fake-Telemetrie), die alte
Tour-Slides-Narration mit erfundenen Panels, veraltete Docs-Bundles, `public/blogdemo/`
(Platzhalter-Mark), die veraltete „Next-Gen Agentic Mesh"-Landing-Variante im Frontend-Baum
(Startup-Drift-Kandidat aus `README.md` §5).

**AppBar-Navigation (v2):** Docs · Blog · Demo · Pricing · About — rechts GitHub +
`Get Started` (→ `#get-started` auf `/`). Kein „Launch Dashboard"-Button (Operator-Verbot).
Footer wie `landing.md` §7/§8: Docs, Tour, Architecture, Security, GitHub, Pricing, Sign in.

---

## 2. Landing-Sections-Plan (Reihenfolge fix)

Hero bleibt **GLSL-Shader (`GradientMeshSafe`, CSS-Fallback + Error-Boundary) +
Cube/Wordmark** — nicht antasten. Danach:

### §2.1 Hero
- **Zweck:** Positionierung in 5 Sekunden — self-hosted Agent-Infrastruktur, ein Endpoint, echte Security.
- **EN-Copy (H1 + Subline):**
  > Your agents. Your servers. One private mesh.
  >
  > JiMesh runs AI-agent infrastructure on the hardware you choose — on-prem, hybrid, or
  > multi-cloud. Containerized agent workspaces in gVisor sandboxes, one OpenAI-compatible
  > LLM endpoint with real failover, and a security stack with OPA policy gates, SIEM
  > events and eBPF threat response underneath. Open source first; managed cloud later.
- **Eyebrow-Badge:** `SELF-HOSTED AGENT INFRASTRUCTURE · ON-PREM · HYBRID · MULTI-CLOUD`
- **CTA:** `Get Started` → `#get-started` (+ Sekundär: `See it in action` → `/demo`).
- **Asset/Animation:** GLSL-Hero wie gehabt; Cube/Wordmark per CSS `translateY`-Float
  (6s ease-in-out infinite alternate), Glow-Stop-Opacity atmen via Keyframes.

### §2.2 Platform-Scene (secure_cloud)
- **Zweck:** Das ganze Bild in einem Frame: Workspaces + On-prem-Rack → Gateway → Cloud-Mesh mit Cube → Firewall-Schild hält den Rogue-Agent draußen.
- **EN-Copy:**
  > One control plane across every server you own.
  >
  > Register on-prem racks, VPS nodes and cloud instances — JiMesh joins them into one
  > encrypted WireGuard mesh with VLAN segmentation. Every agent runs in a gVisor-isolated
  > workspace; every sensitive action passes an OPA capability gate. Untrusted code never
  > crosses the boundary.
- **Asset:** `assets/website/secure_cloud.svg` (→ `public/brand/secure_cloud.svg`).
- **Animation (CSS-only):** die Mesh-/Verbindungslinien mit `stroke-dasharray` + animiertem
  `stroke-dashoffset` („Datenfluss", 3–4s loop, versetzt pro Linie); Glow-Filter-Gruppen
  (`v14-cyan/green/amber`-Elemente, Cube-Bloom) per `opacity`-Keyframes pulsen (2–3s);
  Laser (`v14-laser`) als einmaliger Sweep alle ~8s; Rogue-Agent-Gruppe statisch leicht
  „abgedunkelt" außerhalb der Shield-Grenze. SVG **inline** einbinden (nicht `<img>`),
  damit CSS auf die IDs zugreifen kann; `prefers-reduced-motion` → alles statisch.

### §2.3 Demo-Teaser (→ `/demo`)
- **Zweck:** Brücke zur Mock-Demo; neugierig machen ohne die Demo zu duplizieren.
- **EN-Copy:**
  > The real dashboard, walked through.
  >
  > Four screens from the running product — overview, LLM routing chains, the SIEM
  > timeline and the vault access matrix. No mockups, no invented telemetry.
- **Asset:** statischer Frame 1 der Demo (`/screens/dashboard-overview.png`, echte UI) im Fenster-Chrome; `REAL SCREENSHOT`-Badge wie bestehende Demo-Sektion.
- **Animation:** keiner (Screenshot), nur Hover-Border-Accent.

### §2.4 Feature-Grid (Positionierungsträger)
- **Zweck:** Jede Vorgabe-Zeile aus der Positionierung bekommt eine Card. 6 Karten, 2×3.
- **EN-Copy (Cards, je Headline + 1 Absatz):**
  1. **Agent workspaces, isolated by default** — gVisor sandboxes per workspace, rootless
     containers, zero-trust egress that denies before it allows. *(Asset: `agents/coding_agent.svg`)*
  2. **Kubernetes-native workspaces** — every workspace is a namespace with real resource
     quotas; the control plane enforces caps, not promises. *(Asset: `icons jimesh_cube.svg`)*
  3. **SIEM timeline built in** — firewall hits, policy denials and routing failures land
     in one filterable events stream. *(Asset: `agents/red_team_agent.svg` oder security-findings-Screen)*
  4. **eBPF threat response** — kernel-level enforcement: session identity, egress
     allowlists, and a freeze ladder when an agent misbehaves. *(Asset: `jimesh_features.svg` Ausschnitt oder eigener eBPF-Clip)*
  5. **Logs that arrive where you look** — live events and logs stream through Kafka into
     the dashboard and your own sinks. *(Asset: `agents/voice_agent.svg` als Stream-Metapher — oder Stack-Logo Kafka, sobald vorhanden)*
  6. **Secure file storage** — workspace artefacts live behind vault-backed access rules;
     secrets leave the vault only at runtime. *(Asset: `agents/fin_agent.svg` oder Vault-Screen)*
- **Animation:** nur Icon-Subtilität (Glow-Pulse beim Hover), keine Loops.

### §2.5 Your-Rack-vs-Rogue-Scene (zweispaltig)
- **Zweck:** Selbst-Hosting-Story + Threat-Story nebeneinander — Kern der Zielgruppe.
- **EN-Copy:**
  - Links: **Runs on hardware you own.** On-prem, hybrid, or spread across clouds —
    register a node and it joins the mesh. No exposed ports, no vendor account required.
  - Rechts: **Hostile agents stay outside.** gVisor sandboxing, OPA capability gates and
    default-deny egress keep untrusted agent code inside its workspace boundary.
- **Assets:** `servers/server1.svg` (links), `agents/bad_agent.svg` (rechts).
- **Animation:** links Blade-LEDs (`op_bladeGlow`) blinken per `opacity`-Keyframes;
  rechts `evilGlow`-Pulse in rot, langsamer (unruhig ≠ lebendig).

### §2.6 Stack-Strip
- **Zweck:** Beweis-Ehrlichkeit — der echte Stack. unverändert aus `landing.md` §5
  (Go, PostgreSQL, Redis, Keycloak, Vault, Docker, gVisor, Headscale, Traefik, Next.js);
  **Kafka + Kubernetes ergänzen, sobald Logos in `/logos/` liegen** (echter Einsatz vorausgesetzt).
- **Headline:** `THE ACTUAL STACK — NOTHING ON THIS PAGE IS INVENTED`

### §2.7 Get-Started (§6.1) + Footer
- Zwei Pfade (OSS-Snippet vs. managed) — Details in §6.1. Footer wie oben.

**Nicht mehr auf der Landing:** alter 3-Card-Bestand unverändert übernehmen ok, aber der
Section-Plan oben ersetzt die alte Reihenfolge; der jimesh_features-„Hub"-Block wandert in
die Feature-Card 2/4 bzw. optional auf `/docs`.

---

## 3. Demo-Sektion (`/demo`) — Mock-Demo der echten UI

**Prinzip:** Die Demo zeigt die **echte jimesh2-Dashboard-UI** (nicht die alten
MeshCore-Mocks). Keine Fake-Daten im Sinne erfundener Telemetrie — stattdessen ein
**Demo-Datensatz** („demo workspace, demo agents, demo chains"), der in der echten UI
aufgesetzt und gescreenshottet wird. Jeder Frame trägt das Badge `REAL UI · DEMO DATASET`.

**Form:** Browser-Fenster-Chrome, darunter Step-Dots (4) + Caption-Zeile. **Interaktion:**
Autoplay (jeder Frame ~6s, Crossfade 400ms), klickbare Step-Dots, Pfeiltasten-Support,
Pause bei Hover; `prefers-reduced-motion` → manueller Modus. Synchron wechseln:
Screenshot, Caption, aktiver Dot.

| Frame | Panel der echten UI | Was passiert (Narration) | EN-Caption | Visual-Quelle |
|---|---|---|---|---|
| 1 | Overview (`/overview`) | Workspace-Landschaft: laufende Agent-Container, Ressourcen-Quotas, Mesh-Nodes auf einen Blick | **Overview.** Your workspaces, quotas and mesh nodes — the whole fleet on one screen. | `screens/dashboard-overview.png` — **neu zu machen** (Demo-Datensatz, aktuelles UI) |
| 2 | LLM-Proxy Chains | Chains/Pools auf dem Canvas: Request läuft in die Kette, Key wird gequotet → Failover auf nächsten Provider (Visual: Highlight-Wechsel entlang der Kette) | **Routing with real failover.** The bandit router picks per request; exhausted keys bench until the provider reset. | **Neu bauen:** Mock-SVG im Stil der echten Chain-Canvas (Node-Stil, Farben, Typo der echten UI) ODER frischer Screenshot der Chain-View mit Demo-Chains |
| 3 | Security / SIEM | Events-Timeline: Firewall-Hit → Policy-Denial → eBPF-Verdict streamen ein; Filter-Klick zeigt Verdict-Detail | **Every event, one timeline.** Firewall hits, policy denials and routing failures — filterable, auditable. | `screens/security-findings.png` als Basis — **neu zu machen** mit Demo-Events inkl. eBPF-Verdicts |
| 4 | Vault-Matrix | Access-Matrix: Agent vs. Secret, OPA-Regeln sichtbar; ein Denied-Read wird markiert | **Secrets behind policy gates.** OPA rules decide every vault read — zero trust by default. | `screens/vault-access-matrix.png` — **neu zu machen** (Demo-Datensatz) |

**Pflicht-Neuaufnahmen (Checkliste):** alle 4 Frames mit aktuellem jimesh2-UI-Stand +
Demo-Datensatz; Fake-Daten-Altbestand aus `public/tour-mocks/` darf nicht recycelt werden.
Optionaler Frame 5 (Agent-Session-Detail mit Tool-Calls) als Erweiterung, Quelle
`screens/agent-session-detail.png` (neu machen).

Die 4 Frames ersetzen gleichzeitig die alte Tour-Slideshow: `/tour` rendert dieselben
Screens statisch mit längeren Captions (aus den Tour-Slides übernommen, ent-mockt).

---

## 4. Blog-Struktur

### 4.1 Kategorien (Taxonomie passend zur Positionierung)

| Kategorie | Slugs | Abdeckung |
|---|---|---|
| **Agents & LLM Routing** | `llm-mesh-intro` (#0, published), `entropy-cascades` (#1), `learning-router` (#2), `lora-cloudflare-vllm`, geplant: Secret-Masking-Short (#3) | Gateway/Router-Kern |
| **Security & SIEM** | `agent-identity-firewalls`, `siem-smb-guide`, `attack-surface-osint`, `hardening-the-recon-surface`, `rag-poisoning-killchain` | Identity, Firewalls, OSINT, SIEM |
| **eBPF & Runtime Isolation** | `ebpf` (Foundation), `gvisor-workspace-isolation`, geplant: K-LAF Enforcement (#4), Kernel-Level Pre-Commit (#4b), Safe LLM Deployments (#5) | eBPF + gVisor + Sandboxing |
| **Networking & Mesh** | aktuell leer — `gvisor-workspace-isolation` greifbar nahe (VLAN/WireGuard-Anteil), dort kategorienübergreifend gelistet; geplanter WireGuard/VLAN-Artikel wird erste reine Mesh-Story | Mesh/VLAN/Overlay |
| **Infra & IaC** | `mcp-docker-email-automation`, geplant: Kata-Containers-Artikel (#6-Familie) | Deploy, Container, Tooling |
| **Storage & Data** | `data-harmonization`, `ontology-driven-rag`, `from-expert-systems-to-agents` | Secure Storage, Data-Pipelines, Knowledge-Base |
| **AI Engineering** (Sammel-Rest, bewusst klein) | `google-tabfm-zero-shot`, `object-tracking-computer-vision`, `ai-planning-evolution` | generische ML-Stücke |

Jeder Artikel bekommt **genau eine Primärkategorie**; kategorienübergreifende Stücke
(z. B. gVisor) listen sich im Frontend zusätzlich unter der Sekundärkategorie.
Neue Draft-Slugs, die gerade entstehen (K-LAF Enforcement, Pre-Commit, Secret-Masking,
Safe Deployments, Kata), sind oben bereits eingeplant — Kategoriezuteilung ändern statt
Taxonomie erweitern.

### 4.2 Landing-Blog-Teaser-Regeln
- Max. **3 Teaser** unter der Demo/Feature-Sektion (kleine Karten): 1× Agents & LLM Routing,
  1× Security & SIEM oder eBPF & Runtime, 1× zuletzt Publiziertes (egal welche Kategorie).
- Nur Artikel mit Status **published** (`llm-mesh-intro` jetzt; wächst mit Veröffentlichung).
- Teaser = Titel + 1-Satz-Hook + Kategorie-Badge; keine erfundenen Lesezeiten/Daten
  (Datum = echtes Publikationsdatum).

### 4.3 Artikel-Page-Struktur
Title → Kategorie-Badge + echtes Datum → Figuren (SVG/PNG aus dem articles-Korpus,
`public/blog/<slug>/`) → Prosa mit Quellen-Disziplin aus dem articles-README (Tables als
SVG mit EN-Caption) → `## Sources` gerendert als „Sources & verification" (Datum + Links)
→ Footer-Navigation (vor/zurück in derselben Kategorie) + CTA-Stripe (`Get started
self-hosted` → `#get-started`, managed → `/pricing`). Der Blog-Artikel bleibt zugleich
Knowledge-Base-Baustein (Verlinkung aus `/docs` later) — Slugs sind stabil zu halten.

---

## 5. Pricing-Page (`/pricing`)

**Realitätslage (bindend):** OQ1 aus `SPRINT-PRICING-STARTER-TIER.md` ist offen — **keine
Preiszahlen auf der Seite.** Die Zahlen in `jimeshIO/enterprise/site/config/tiers.json`
(Starter/Team/Enterprise in CHF) und der 9–12 €-Vorschlag im Sprint bleiben intern; die
Seite zeigt **Struktur, nicht Preise**. `marketing-pricing.md` bleibt unangelegt, bis OQ1/OQ2
geschlossen sind.

**Struktur:**

1. **Headline:** `Open source, or managed. Same code, no fork.` + Subline:
   > Run JiMesh yourself — the OSS core is free to self-host for noncommercial use — or
   > let us run a managed workspace for you on Kubernetes. Final pricing is under review;
   > the tiers below show what each level includes.
2. **4 Tier-Cards** (Feature-Vergleich, keine €/CHF):
   - **OSS Self-Hosted** — unlimited nodes on your hardware, full control plane, gVisor +
     OPA + SIEM included, PolyForm Noncommercial license (commercial license on request).
     CTA: `Get started` → `#get-started` (Quickstart).
   - **Starter** — 1 managed workspace, small fixed container quota + utility container,
     managed services (monitoring, database, events) included, pay-as-you-go beyond quota.
     Badge: `Pricing final under review`. CTA: `Join the waitlist` → `/signup`.
   - **Team** — several workspaces, higher quotas, shared services, priority support.
     Badge: `Pricing final under review`. CTA: `Sign up` → `/signup`.
   - **Enterprise** — dedicated capacity, region of choice, custom quotas, security
     review, support contract. CTA: `Talk to us` → `/signup` (bis Kontakt-Kanal steht).
3. **Feature-Vergleichstabelle** (Zeilen: node count, workspace quotas, managed services,
   SIEM/eBPF retention, support, license) — Werte nur qualitativ („included / add-on / roadmap").
4. **Ehrlichkeits-Note:** „Pay-as-you-go metering with transparent per-workspace quotas is
   how the managed tiers bill — the numbers go live here the moment they are final."

**Baustein:** das Tier-Grid aus `@jimesh/billing-ui` (Pricing-Preview auf `apps/admin`)
wird als Komponente wiederverwendet — im `no-prices`-Mode (Preiszellen aus `tiers.json`
werden nicht ausgespielt, sondern durch „under review"-Badges ersetzt), bis OQ1 fällt.
Danach: Zahlen ausschließ­lich aus einem Copy-Layer in `marketing-pricing.md`, nie direkt
aus `tiers.json` auf die Public-Page.

---

## 6. Get-Started & Login

### 6.1 Get-Started-Sektion auf der Landing (`#get-started`, auch Pricing-Ziel)
Zwei gleichberechtigte Pfade, nebeneinander:

- **OSS-Pfad (links):** echtes Quickstart-Snippet mit Clipboard-Copy (wie bestehender
  `InstallSnippet`, Kommando unverändert aus dem öffentlichen README) + Zeile:
  > Self-host the whole stack on your own servers. Free for noncommercial use.
- **Managed-Pfad (rechts):**
  > Prefer managed? Sign up, verify with Stripe, and your workspace goes live at
  > `<name>.jimesh.io` — no exposed ports, quota-transparent.
  CTA: `Sign up` → `/signup`. Hinweis-Zeile: „First sign up, then pay — the purchase flow
  runs on a separate, secured surface."

### 6.2 `/signup` (bleibt Re-Export)
Payment-first nach ES-11: Email → Stripe Checkout/Setup-Intent (Radar + 3DS2) → Email-OTP →
X-Auth-Bootstrap → Workspace. Kein Feature-Overload; Copy aus `landing.md` §1.2.

### 6.3 `/login` (ES-12-Signin, Signup-first)
- **Zweck:** nur für bestehende managed-User (returning payers); **keine
  Self-Registrierung im Weg.**
- **EN-Copy:** `Sign in` — "Returning user? Sign in with your email and a one-time code.
  No account yet? Sign up first — verification starts with Stripe."
  → primärer Link auf `/signup`, nicht umgekehrt.
- **Flow:** Email → Email-OTP (3/24h, 5-Try-Lockout) → Session-Cookie-Pair → Handoff:
  aktive Subscription → Workspace; keine Subscription → Stripe-Verification-Redirect.
- Kein Passwort-Feld, kein „Create account"-Tab, Turnstile-Widget nur wenn Site-Key
  geserved wird. Logout-Zustand auf allen post-login-Routen: 404 statt Redirect-Landing
  (ES-11 A9, „garnicht erst public").

---

## 7. Assets-Cleanup-Liste

**Raus (delete):**
- `apps/site/public/tour-mocks/*` — 8 MeshCore-Mock-PNGs (Fake-Telemetrie, Session-IDs wie `sess-a8f2c`)
- `public/blogdemo/jimesh-mark.svg` (Platzhalter)
- veraltete Docs-Bundles unter `/docs` (Regeneration aus aktueller Quelle)
- Startup-Drift-Kandidaten im Frontend-Baum (alte „Next-Gen Agentic Mesh"-Landing-Variante,
  unbenutzte `gradient-mesh`/`logo-extrude`-Duplikate laut `README.md` §Arbeitsregeln)

**Bleibt, wird neu gemacht (echte jimesh2-UI, Demo-Datensatz, keine Fake-Daten):**
1. `screens/dashboard-overview.png` — Neu-Aufnahme Frame 1
2. LLM-Proxy-Chains-Visual — Screenshot der Chain-View **oder** Mock-SVG im exakten UI-Stil (Node-Formen, Palette, Mono-Typo der echten Canvas)
3. `screens/security-findings.png` → erweitert um SIEM-Timeline + eBPF-Verdicts (Demo-Events)
4. `screens/vault-access-matrix.png` — Neu-Aufnahme
5. optional `screens/agent-session-detail.png` — Neu-Aufnahme (Demo-Frame 5)
6. `/tour`-Screens = dieselben Aufnahmen mit Lang-Captions (keine separate Serie)

**Bleibt unverändert / migriert:** `public/brand/*` (secure_cloud, jimesh_features,
agents/, servers/) wird aus `assets/website/` gespiegelt — Quelle bleibt `assets/website/`,
Sync-Script statt Hand-Kopie. `assets/icons/jimesh/jimesh_cube.svg` + `jimesh_font.svg`
als Brand-Lockups in AppBar/Footer/Cube-Hero; `assets/icons/jimesh/old/*` bleibt
archiviert (Referenz, nicht verlinken — inkl. Hedgehog/Circular-Hub-Familie).
Neu zu ergänzen: `logos/kafka.svg` + `logos/kubernetes.svg` (echter Einsatz belegt),
dann Stack-Strip erweitern.

---

## 8. Umsetzungsreihenfolge

| Phase | Inhalt | Aufwand |
|---|---|---|
| **P1 — Landing-Rebuild** | Section-Chassis nach §2, Copy-Spiegel-Edits in TSX, SVG-Inline + CSS-Animationen (dash-offset, Glow-Pulse, Float), Get-Started-Sektion, `/about` montieren | ~2 d (davon Animationen ~0.5 d) |
| **P1b — Asset-Frontlauf** | Sync-Script `assets/website/ → public/brand/`, Kafka/K8s-Logos, Cleanup-Liste §7 „Raus" | ~0.5 d |
| **P2 — Screens + Demo** | Demo-Datensatz in der echten UI aufsetzen, 4–5 Screenshots machen, Chain-Visual ggf. als Mock-SVG, `/demo`-Player (Autoplay, Dots, Reduced-Motion), `/tour` aus denselben Frames | ~1.5 d (Screenshots ~0.5 d, Player ~0.5 d, Tour ~0.5 d) |
| **P3 — Blog/Pricing/Login** | Kategorien-Frontmatter + Blog-Index-Filter + Teaser-Regeln, Artikel-Page-Struktur, `/pricing`-TierGrid (no-prices-Mode), `/login`-Spec-Umsetzung (Signup-first) | ~1.5 d (Blog 0.5, Pricing 0.5, Login 0.5) |
| **P4 — Docs/Tour-Ersatz** | Docs-Regeneration statt alter Bundles, Docs↔Blog-Verlinkung (Knowledge-Base), Sitemap/robots-Säuberung (public-Pfade only), finaler No-Mock-Review gegen `about.md` §8-Guardrails | ~1 d |

**Gesamt:** ~6.5 d. Abhängigkeiten: P2 braucht Zugriff auf eine laufende jimesh2-Instanz
mit Demo-Datensatz; Pricing-Zahlen (P3) bleiben blockiert bis OQ1 — die Seite wird bewusst
ohne Zahlen gebaut, Zahlen nachziehen, wenn `marketing-pricing.md` angelegt wird.
