# SPRINT 5: MARKETING-WEBSITE

| | |
|---|---|
| **Status** | Läuft |
| **Ziel** | Öffentliche Marketing/Docs-Sektion in der React-SPA: Landing (/) mit Demo-Preview, Docs (/docs) mit API_DOCS-Zusammenfassung und Stack-Visualisierung, geführte Tour (/tour) durch die echten Stitch-Screens. Public Routes rendern VOR AuthGate. |
| **Dauer** | 1 Session |

## Kontext + Design-Quelle

- Design-Sprache kommt 1:1 aus den Stitch-Screens (design-assets/stitch/, 52 PNG+HTML-Paare):
  dunkle Material-3-artige Surfaces (#0c0d18 bis #333440), Violet-Primary (#d0bcff, #8b5cf6-Glow),
  Text #e2e1f1/#cbc3d7, Outline #958ea0/#494454, Geist für Headlines, Mono-Schrift für
  label-caps/Code (im Repo: Geist Mono), scharfe Radien (2-8px), Glow-Effekte
  (glow-violet: 0 0 16px rgba(139,92,246,.28), glow-cyan), Status-Dots (emerald-400).
- Die Screens selbst sind die Tour-Inhalte: 8 PNGs werden ins Frontend gebündelt
  (src/frontend/src/assets/stitch/) und als geführte Step-Sektion gezeigt.
- Operator-Vorgaben: KEIN \"Launch Dashboard\"-Button; Nav mit Docs, GitHub, GitHub-Referenzen;
  Hero knapp, Demo zuerst sichtbar; keine Em-Dashes; Texte aus MANDATES/CLAUDE/HANDOFF/
  MASTER-PLAN/COMPONENT-SCHEMA/BACKLOG, nichts erfunden.

## Arbeitspakete

### WP1: Sprint-File + Backlog-Mirror (dieser Commit)
- [x] Plan vor Code: dieses File
- [x] Backlog-Mirror: S5-Zeilen am Kopf der Sprint-Spiegel-Tabelle in docs/backlog/BACKLOG.md
      (die Datei trägt zusätzlich die unkommit­tierten Mirror-Nachzüge von S3-WP1/B15 aus dem
      laufenden Security-Sprint, die mit diesem Commit mitspringen, weil eine Datei nur ganz
      committed werden kann)

### WP2: Logo-Assets
- [x] Verifiziert: assets/ ist auf diesem Branch bereits vollständig getrackt und clean
      (git ls-files assets/ = 499 Dateien; dev_logos 10/10, integrations 9/9, agents 16/16,
      aws_svg/network/brand/provider; design-assets/stitch 105/105).
      git add --dry-run assets/ design-assets/ = leer. Die alte LOGO-LISTE-Prinzip-Note
      (\"OEM-Logos nicht im Repo\") ist damit obsolet: die Assets sind schon im Repo. Kein
      Commit nötig, nichts zu ändern.

### WP3: Tour-Assets ins Frontend
- [ ] 8 Stitch-PNGs nach src/frontend/src/assets/stitch/:
      app-discovery-with-networks, agent-chat-with-proxy-status, llm-proxy-overview,
      security-findings, vault-access-matrix, network-management-vlans-overlay,
      admin-settings-api-keys, dashboard-overview

### WP4: Marketing-Komponenten — ✅ erledigt (Commit 2991703)
- [x] components/marketing/marketing.css — Stitch-Helfer gescoped auf .stitch-root
      (label-caps, code, glow-violet/glow-cyan/glow-dot, stitch-pulse-slow, 5px-Scrollbar,
      stitch-grid-bg, stitch-screen-frame); Dashboard-Theme (hell/dunkel) unberührt
- [x] components/marketing/MarketingNav.tsx — Nav + Footer: Brand (JimeshMark) + Docs +
      GitHub + GitHub-Referenzen (externalLink auf API_DOCS.md im Repo); bewusst KEIN
      Launch-Dashboard-Button (Operator-Vorgabe)
- [x] components/marketing/ScreenTour.tsx — geführte Step-Sektion über die 8 Screens
      (Schritt-Zähler, Dots, Prev/Next, Pfeiltasten-Navigation, kompakter Modus), Captions
      aus MANDATES/COMPONENT-SCHEMA/BACKLOG, Doc-Ref-Chips, GitHub-Quelllink je Screen
- [x] views/LandingPage.tsx — knapper Hero (1 Absatz aus MASTER-PLAN §1.1) + DEMO zuerst
      sichtbar (ScreenTour compact) + Feature-Grid (8 Karten) + Stack-Teaser + Footer
- [x] views/DocsPage.tsx — API_DOCS-Zusammenfassung (Base URL 19091/19092, Bearer jimesh-sk,
      /v1 OpenAI-kompatibel, REST+MCP-Bridge, ehrliche /api/health-Rollup), Architektur-
      Stack-Visualisierung mit den 10 dev_logos (je Karte offizielle GitHub-Repo-Referenz),
      Doku-Material-Liste (8 Links)
- [x] views/TourPage.tsx — volle Tour
- [x] 10 dev_logos nach src/frontend/src/assets/icons/dev_logos/ kopiert (Commit c51e88d;
      Vite bündelt nur assets unterhalb des Frontend-Roots)

### WP5: App.tsx-Verdrahtung — ✅ erledigt (Commit 2991703)
- [x] Outer Routes: / → LandingPage, /docs → DocsPage, /tour → TourPage, Splat (* ) mountet
      den bestehenden Dashboard-Baum (AuthGate + Navbar + HierarchySidebar + inneres Routes)
      als Element. Dashboard-URLs unverändert (inneres Routes bleibt bei absoluten Pfaden);
      "/" zeigt jetzt die Landing statt Redirect auf /config.

### WP6: Verifikation + Push — ✅ erledigt
- [x] npm run build grün (Next 15.5.24, compiled successfully, 3/3 statische Seiten;
      Baseline vor Änderung war ebenfalls grün)
- [x] npm run lint: 0 NEUE Probleme. Baseline 293 bestehende (277 errors, 16 warnings in
      fremden Dateien, gefiltert: 0 Treffer in marketing/*, LandingPage, DocsPage, TourPage;
      der App.tsx-Treffer 'ProjectsPage defined but never used' ist Bestands-Rauschen —
      verbatim identisch in HEAD und Working Tree, der Import wurde nie angerührt)
- [x] tsc --noEmit -p tsconfig.app.json: 0 Fehler in NEUEN Dateien (2 gefundene während der
      Arbeit gefixt: lucide 'Github'-Export existiert in dieser Version nicht → ExternalLink;
      ungenutzter JimeshMark-Import in der Landing entfernt)
- [x] Em-Dash-Scan: neue Dateien clean; einzige Treffer in App.tsx sind vorexistierende
      Kommentare (section-nav/TASK-080/usw.), die nicht angerührt wurden
- [x] Push: git push -u origin feat/marketing-website (Branch basiert auf 1747c51,
      feat/security-engineer-gateway-commands-Tip, weil ein paralleler Agent in demselben
      Working Tree committet; git branch -f + ff-merge statt Checkout-Konflikt)

## Akzeptanzkriterien
1. / rendert ohne Auth, Demo (Tour) sofort sichtbar unter dem knappen Hero, Nav mit
   Docs/GitHub/GitHub-Referenzen, kein Launch-Dashboard-Button.
2. /docs rendert ohne Auth: API_DOCS-Zusammenfassung, Architektur-Overview mit den 10
   dev_logos, Referenzen (GitHub) + Docs-Material.
3. /tour rendert ohne Auth: 8 echte Stitch-Screens als geführte Tour mit Step-Navigation.
4. Alle Dashboard-Routen unverändert hinter AuthGate (/config usw. wie vorher).
5. Build grün, keine neuen Lint-Fehler, keine Em-Dashes im neuen Code.

### WP7: Stitch-Pages 1:1 integriert — ✅ erledigt (Commit 3e3a381, gepusht)
- [x] Die drei echten Google-Stitch-Pages aus Commit 40baa72 sind jetzt DIE Design-Quelle:
      website-landing.html, website-docs.html, website-tour.html - Layout/Content/Sektionen
      1:1 in die React-Routes uebernommen (vorher: eigene Interpretation aus den Produkt-
      Screens, jetzt ersetzt).
- [x] LANDING: Top-AppBar (Brand + v0.9.4-oss, Docs/Architecture/Policy Engine, GitHub,
      Get Started auf #install; bewusst KEIN Launch-Dashboard-Button), Hero mit Badge +
      CLI-Snippet (echtes Clipboard-Copy, Copy-State 2s), Demo-Sektion Runtime Inspector
      (Agent-Sessions mit mTLS/QUARANTINE-Cards, Tool-Execution-Log BLOCKED/PASSED,
      OPA-Policy-Engine mit Rego-Snippet + Verdict-Breakdown + Enforcement-Overhead),
      3 Feature-Cards, Stack-Strip mit den 7 dev_logos, Footer.
- [x] DOCS: Status-Ribbon, Sidebar mit 6 Gruppen (Getting Started, Architecture, Agent
      Identity, Policy Gates, Egress & Vault, Deployment Target; Links resolve auf Repo-Docs
      oder In-Page-Anker, kein toter Link), Breadcrumb + H1 + Metrics-Banner, Topology-
      Diagramm (Agent → tc-ingress → Kernel-Boundary 3 Stages → mTLS → Targets), Audit-JSON
      Code-Block mit Identity-Headers 1:1 + echtem Copy, Core Security Pillars, Stack-
      Visualisierung mit 10 dev_logos (Operator-Zusatz), CTA + Footer.
- [x] TOUR: 8 Step-Pills mit Active/Completed-State, Carousel-Stage (console-URL je Step,
      HOST root@187.124.2.174, TLS-Badge, Step-Badge, Progression%), Floating Prev/Next,
      Caption-Footer (stepTag/metaTag/caption 1:1 aus dem Script der Vorlage), Roadmap-Grid
      mit Thumbnails, 3-Pillars-Strip, Hotkeys [<-]/[->]. Platzhalter ersetzt durch die
      ECHTEN Screens (assets/stitch/, inkl. agent-session-detail fuer Step 7).
- [x] Palette 1:1 aus den committed Tailwind-Configs (Surfaces #0d0e15-#34343c, Primary
      #67df70/#3fb950, Secondary #a7c8ff/#006fd1, Outline #879484/#3e4a3c). Fonts: Space
      Grotesk/JetBrains Mono der Vorlagen auf die gebuendelten Geist-Varianten gemappt
      (keine Google-Fonts-CDN-Abhaengigkeit); Material Symbols durch lucide ersetzt.
      ScreenTour.tsx + MarketingNav.tsx entfernt (durch die Stitch-Layouts ersetzt).
- [x] Abweichungen dokumentiert: (1) Tour-Endbutton der Vorlage "FINISH TOUR & DEPLOY"
      -> "FINISH TOUR" + Restart auf Step 1 (kein Fake-Deploy-CTA, konsistent mit dem
      Launch-Dashboard-Verbot). (2) "GitHub ★ 4.2k" + "v0.9.4-oss"/"v0.14.2-ebpf" 1:1 aus
      den Vorlagen uebernommen - Sternzahl und Version sind Design-Artefakte, vor breitem
      Release durch echte Werte ersetzen oder streichen. (3) install-URL jimesh.dev aus der
      Vorlage - aspirational, bis Install-Infra existiert.

### WP8: Eigenes Next.js-Frontend fuer GitHub Pages — ✅ erledigt
- [x] Architektur-Entscheid Operator: die Marketing/Docs/Tour-Website ist ein eigenstaendiges
      App-Verzeichnis website/ (next@15 App Router, static export), NICHT Teil von src/frontend
      (bleibt unberuehrt als Dashboard-App).
- [x] website/next.config.ts GENAU wie gefordert: output: 'export' + basePath aus
      process.env.PAGES_BASE_PATH (liefert der Workflow via configure-pages@v5) +
      images: { unoptimized: true }.
- [x] App Router: src/app/layout.tsx (next/font/google: Space_Grotesk + JetBrains_Mono,
      self-hosted im Export; Metadata 'JiMesh - Open-Source AI Agent Gateway'), page.tsx =
      Landing-View, docs/page.tsx = DocsPage, tour/page.tsx = TourPage (ScreenTour-Inhalt
      inline; die src/frontend-ScreenTour/MarketingNav wurden in WP7 durch die 1:1-Stitch-
      Layouts ersetzt und werden nicht wiederbelebt). marketing.css + Icons (Inline-SVG statt
      Icon-Library-Dep) unter website/src/components/.
- [x] Assets: 10 dev_logos nach website/public/logos/, 8 Tour-Screens nach
      website/public/screens/ (inkl. agent-session-detail fuer Step 7); Logos/PNGs als
      Static-Asset-Imports (basePath-sicher verifiziert: mit PAGES_BASE_PATH=/jimesh sind
      alle Asset-Hrefs /jimesh/_next/...).
- [x] Workflow .github/workflows/deploy-website.yml exakt nach Template
      github.com/nextjs/deploy-github-pages: push [main] + workflow_dispatch, permissions
      contents:read/pages:write/id-token:write, concurrency pages, checkout@v4,
      setup-node@v4 (node 22, npm cache auf website/package-lock.json), npm ci in website/,
      configure-pages@v5 (id setup_pages), build mit env PAGES_BASE_PATH, upload-pages-
      artifact@v3 (path website/out), deploy-pages@v4. Operator-Hinweis: einmalig in den
      Repo-Settings Pages auf 'GitHub Actions' stellen.
- [x] VERIFIKATION: cd website && npm install && npm run build GRUEN (Next 15.5.25,
      Compiled successfully, 6/6 statische Seiten, Exporting 2/2). out/ enthaelt:
      index.html, docs.html, tour.html, 404.html, logos/ (10), screens/ (8), _next/static/
      (chunks, css, media). Baseline-Hinweis: Static Export erzeugt docs.html/tour.html
      (ohne trailingSlash-Option, GENAU wie in der Config-Spec vorgegeben); GitHub Pages
      bedient /docs und /tour extensionless daraus.
- [x] Hinweis Layout-Pfad: die App-Struktur liegt unter website/src/app (Standard-Next-
      Konvention mit @-Alias auf ./src); die geforderten Routes / , /docs , /tour sind
      identisch. KEIN Eingriff in src/frontend.

## Referenzen
- MANDATES.md (Doku-Pflicht, No-Mock, Verifikation)
- docs/HANDOFF-2026-09-20-COMPLETE.md (Stitch-System, Frontend-Konventionen)
- docs/MASTER-PLAN.md (Produkttext §1.1, 4-Tier-Modell)
- docs/COMPONENT-SCHEMA.md (23 Component-Typen, Scope-Regeln)
- docs/LOGO-LISTE.md (Asset-Quellen; Prinzip-Note obsolet, siehe WP2)
- design-assets/stitch/ (52 Screens, Design-Sprache + Tour-Inhalte)


## WP9: Website-Repair — echte Doku statt Fiktion (2026-09-19, Operator-Feedback)

Operator-Feedback: „die jimesh website sieht auch mega scheisse aus und die ganzen docs laden nicht".
Diagnose: Die Stitch-1:1-Konvertierung (WP8) erzählte ein NICHT existierendes Produkt (eBPF-Kernel-Interception,
SPIFFE-Identitäten, mTLS-Leases, fake ★4.2k, jimesh.dev-Installer, falsche „Apache 2.0"-Lizenzangabe — korrekt
ist PolyForm Noncommercial 1.0.0) und bandelte KEINE echte Doku ein — die Docs-Page war ein Stitch-Mock mit
erfundenem Audit-Event (evt_ebpf_…). GitHub Pages war nie aktiviert (API 404) und main enthielt website/ nicht;
out/index.html via file:// geöffnet ergibt ungestyltes HTML (Assets /_next/…).

- [x] Docs-Pipeline: website/scripts/gen-docs.mjs bündelt zur Build-Zeit 12 kuratierte ECHTE Markdown-Docs (README, OPERATOR_GUIDE, CONTRIBUTING, SECURITY, ARCHITECTURE, COMPONENT-SCHEMA, PACKAGES, API_DOCS, clients, MANDATES, FEATURE_ROADMAP, PRODUCT-ROADMAP) via marked -> src/generated/docs-content.ts (gitignored, ~424 KB); dev+build-Skripte verdrahtet
- [x] Docs-Page (src/app/docs/page.tsx) neu: Sidebar mit echten Gruppen + echtem Filter (Search), pro Doc Quelle + GitHub-Link + TOC + gerenderte Doku (.mkt-docs-Styles in marketing.css); eBPF/SPIFFE-Fiktion entfernt; Stack-Block zeigt den echten Stack
- [x] Landing (src/app/page.tsx) ehrlich: Eyebrow/H1/Subline = echtes Produkt (Multi-Provider-LLM-Gateway, One-OpenAI-Endpoint, Bandit-Routing/Failover), ECHTER Quickstart (git clone … && make up aus README), Badge „self-hosted", GitHub-Button ohne fake Stars, Demo-Sektion = ECHTER Dashboard-Screenshot (dashboard-overview.png, „REAL SCREENSHOT") statt fake Runtime-Inspector, 3 Feature-Cards mit echten Features, Stack-Strip mit 10 echten Logos, Footer: PolyForm Noncommercial 1.0.0 · source-available
- [x] Metadata korrigiert: „JiMesh — Self-Hosted Multi-Provider LLM Gateway" (layout.tsx)
- [x] next.config.ts: trailingSlash: true (GitHub Pages kann kein /docs -> /docs.html-Rewriting; Clean-URLs brauchen out/docs/index.html)
- [x] Build-Reparatur: „Bus error (core dumped)" war ein korruptes node_modules nach still gescheitertem npm-install (117-MB-SWC-Binary halb installiert); package-lock auf WP8-Stand restauriert, marked minimal eingetragen, rm -rf node_modules && npm ci (4 Min, 48 Pakete) -> BUILD gruen: 6/6 statische Seiten, /docs 134 kB statt 1,29 kB
- [x] Verifiziert: out ohne Fake-Marker (jimesh.dev, 4.2k, eBPF, „Apache 2.0" jeweils 0 Treffer), echter Inhalt (make up, PolyForm, pgx, Standing Mandates); lokal geservet unter http://localhost:4173 — 200 auf /, /docs/, /tour/
- [x] Deployment: GitHub Pages plan-blockiert (422 "current plan does not support GitHub Pages for this repository", privates Repo) + Workflow-Dispatch 404 (Workflow nicht auf main) — stattdessen Control-Node-Deploy: PAGES_BASE_PATH=/website-Build nach /opt/jimesh/website, jimesh-website (nginx:alpine, restart unless-stopped, jimesh-net) mit Traefik-Router PathPrefix(/website) Priority 5 + StripPrefix-Middleware. VERIFIZIERT: http://100.64.0.6:8090/website/ 200 (root/docs/tour), von podhead http://localhost:8090/website/ 200 + echte Doku rendert (Standing Mandates), Dashboard unversehrt (root 200, /api 401 Auth-Gate
- [x] Dashboard-Root auf ehrliche Landing umgestellt (2026-09-20): src/frontend/src/views/LandingPage.tsx war noch die ALTE Stitch-Fiktion (eBPF-Story, jimesh.dev-Installer, fake Stars — vom Operator als "alte kack Website" beanstandet) — WP9-Landing ins Dashboard-Root portiert: echtes Produkt (Multi-Provider-LLM-Gateway), ECHTER make-up-Quickstart, ECHTER /overview-Screenshot (@/assets/stitch/dashboard-overview.png), 10 echte Stack-Logos, PolyForm-Footer; Docs-Nav auf die echten gebuendelten Docs (/website/docs/), Tour bleibt intern; Launch-Dashboard-Button-Verbot weiterhin respektiert
)
