# Website-Copy — Source of Truth (`content/website/`)

**Zweck:** Ein Ordner, in dem die komplette Marketing-Copy von JiMesh lebt — Landing, About,
(künftig Pricing/Tour) — als Markdown-Quelle. Rendering-Ziele seit dem Apps-Umbau
(`apps/console`, `apps/site`, `apps/admin` — vierter Port 3000/3100/3200, Submodule bleiben
unberührt als Copy-Konsum-Quellen):

| App | Rolle | Copy-Verbraucher |
|---|---|---|
| `apps/site` (:3000) | **Die eine Public-Site (jimesh.io)**: Landing mit GLSL-Shader-Hero (`@jimesh/site-ui/components/demo/gradient-mesh`, CSS-Fallback + Error-Boundary), `/docs`, `/tour`, `/blog` (Quelle `apps/site/src/app/*`, UI aus `@jimesh/site-ui`-Package, Blog-Content via `npm run site:blog-import` aus dem articles-Submodul, Docs-Content via `npm run site:gen-docs`) + Enterprise-Funnel (`/pricing`, `/signup`, `/signin`, re-exportiert `jimeshIO/enterprise/site`) | `landing.md` komplett, `about.md`, Tour-Slides, Blog-Artikel |
| `apps/console` (:3100) | jimesh2-Dashboard (SPA-Mount) + SPA-eigene Public-Views (`/landing`, `/docs`, `/tour`, `/website/*` client-mounted aus dem Frontend-Baum) | SPA-interne Texte (aus jimesh2, nicht diese Copy-Quelle) |
| `apps/admin` (:3200) | Billing-Test-Website (bewusst separiert bis RBAC-safe; später Merge als geschützte SSR-Route in apps/site: CF x-auth + Stripe-verified + OPA) — UI aus `@jimesh/billing-ui` | Pricing-Preview (`@jimesh/billing-ui/tier-grid`) |

Der Build-Script nimmt `content/**/*.md` automatisch auf — diese Dateien erscheinen
damit zusätzlich gerendert unter `/docs/website/*.html` auf der Docs-Site.

## Dateien

| Datei | Inhalt | Status |
|---|---|---|
| `landing.md` | Landing-Copy: Hero, Demo-Sektion, Feature-Cards, Stack-Strip, Enterprise-Hero, Footer-Links | konsolidiert 2026-10-16 |
| `about.md` | About-Copy: Elevator Pitch, Principles, Story (WIP), Realitätslage, Lizenz, Guardrails | konsolidiert 2026-10-16 |
| `marketing-pricing.md` | *(geplant)* Pricing-Page-Copy — Zahlen erst, wenn SPRINT-PRICING OQ1/OQ2 geclosed sind | nicht angelegt |

## Konsolidierungs-Historie (was woher kam)

Vor dem 2026-10-16 war der Copy-State verstreut über 5+ Speicherorte und von mehreren
Subagenten unabhängig weitergeschrieben worden. Die Inhalte in `landing.md`/`about.md`
wurden aus folgenden Quellen konsolidiert und zurückgespiegelt:

- `jimesh2/website/src/app/page.tsx` — Hero/Features/Stack (echtes-Produkt-Rewrite, WP9)
- `jimesh2/website/src/components/tour/slides-data.ts` — Feature-Narration (§4b)
- `jimesh2/website/src/components/landing/install-snippet.tsx` — Quickstart-Snippet
- `jimeshIO/enterprise/site/app/page.tsx` — 3-Zeilen-Enterprise-Landingstub (§1.2)
- `jimeshIO/docs/MASTER-PLAN.md` §1.1 — Produkt-Kernsatz, zu Pitch destilliert
- `jimeshIO/docs/sprints/SPRINT-ENTERPRISE-SITE-AUTH-BILLING.md` — Dual-Surface-Regeln
- `jimeshIO/docs/sprints/SPRINT-PRICING-STARTER-TIER.md` — Pricing-Realitätslage (nicht auf die Seite!)
- `jimeshOps/source/jimesh2/README.md` — Tagline/Box-Tabelle/Providers
- `jimeshOps/README.md` — Namenshistorie (About-Story-Rohmaterial)

## Arbeitsregeln (Anti-Subagent-Drift)

1. **Copy-Edits landen zuerst hier**, danach als Spiegel-Edit in die TSX-Komponente.
   Umgekehrt veraltet die Quelle im selben Sprint.
2. **No-Mock auch im Marketing** (Operator-Mandat): keine erfundenen Zahlen, Screenshots
   oder Logos; GitHub-Stars-Fakes, die alte eBPF-Hero-Story und der
   Launch-Dashboard-Button bleiben verboten (`SPRINT-5-MARKETING-WEBSITE.md`).
3. **Trans-Surface-Trennung:** Public-Surface-Copy darf keine internen Repo-Namen,
   Infrastruktur-Details (Azure-SKUs, Ports 19091/19092) oder Strategie-Sprints
   (Startup-Programs) zitieren. Was auf beide Surfaces darf, steht pro § in der Datei.
4. **Deutsch/Englisch:** Landing/About sind **EN** (Operator-Entscheid 2026-10-16);
   deutsche Varianten erst, wenn i18n tatsächlich gebraucht wird.
5. **Legacy/Drift-Kandidaten** (Session-Fund 2026-10-16): `jimesh2/src/frontend/src/website/landing.tsx`
   (ältere „Next-Gen Agentic Mesh"-Variante, Konkurrenz-Hero) ist veraltet und beim
   nächsten Cleanup zu löschen; `jimesh2/website/src/components/demo/{gradient-mesh,logo-extrude}.tsx`
   sind unbenutzt (keine Imports); Docker-Hero-Verwandtschaft der Landing bleibt in
   `jimesh2/src/frontend/src/components/security-landing-strip.tsx` prüfen.

## Pricing-Copy-Drift-Baustelle (bewusst offen)

| Ort | Daten | Problem |
|---|---|---|
| `jimeshIO/enterprise/site/config/tiers.json` | Starter **9 CHF** / Team 29 / Enterprise 99 | JSON-getriebene Tiers ohne Copy-Layer, Währung CHF |
| `SPRINT-PRICING-STARTER-TIER.md` (OQ1) | Starter 9–12 **€/Monat**, Team/Enterprise existieren dort nicht | Währung + „final under review"-Status ungeklärt |

Regel bis zur OQ1-Entscheidung: **keine Preiszahl auf einer public Surface** —
`marketing-pricing.md` bleibt unangelegt, `landing.md` verlinkt keinen beliebigen Tier-Text.
