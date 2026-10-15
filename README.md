# @jimesh/docs

Shared API documentation package for JiMesh. It bundles the audited operator-facing HTTP API reference, the enterprise OpenAPI specs, and a lightweight Scalar-based static docs site — no Docusaurus, no MkDocs (per TASK-085 plan).

## Purpose

- **Single consumable home** for JiMesh API documentation: any JiMesh repo or script can read the same markdown/source-of-truth docs and OpenAPI specs through npm exports.
- **Docs site** (`dist/`): a static API reference (Scalar via CDN) plus rendered HTML of the markdown docs, deployable to GitHub Pages.

## Content sources

| Artifact in this repo | Source of truth | Synced via |
|---|---|---|
| `content/api/API_DOCS.md` | `jimesh2/docs/API_DOCS.md` (~2958 lines, ~176 routes, HTTP :19091 / gRPC :19092) | Drift audit **TASK-017** (`jimeshIO/docs/dev/tasks/TASK-017-apidocs-drift-audit.md`): routes are mechanically diffed against `HandleFunc` registrations; new routes **must** be appended to API_DOCS.md in the same PR that adds them |
| `spec/api/auth.openapi.json` | `jimeshIO/enterprise/api-spec/auth.openapi.json` (public, allowlist-only) | Copied when the enterprise spec changes |
| `spec/api/admin.openapi.json` | `jimeshIO/enterprise/api-spec/admin.openapi.json` (internal only — never publish this site publicly) | Copied when the enterprise spec changes |
| Gateway OpenAPI 3.0.3 spec | **Live only:** `GET /openapi.json` on the Go gateway (HTTP port 19091, unauthenticated). Not bundled here — Scalar fetches it from the running gateway at render time. | Generated server-side by the gateway (`gateway/openapi.go`) |
| `articles/` (git submodule → [`ji-podhead/articles`](https://github.com/ji-podhead/articles)) | **This repo itself is the source of truth for the blog articles.** | Pinned by commit; update with `git submodule update --remote` + commit the new gitlink |

The copies in this repo are **1:1 snapshots**. The source repos stay the source of truth; this package only re-publishes them. Update workflow: re-run/review the TASK-017 drift audit, copy the refreshed files into `content/` / `spec/`, commit.

## Blog content pass-through (`articles/` → jimesh2)

The `articles/` submodule is the canonical content source for the jimesh2 blog. The flow is a one-way pass-through:

1. **articles (submodule)** — plain markdown articles per folder (`<slug>/<slug>-blogpost.md`, no frontmatter), operational state (draft status, hashtags) in the articles `README.md` tables. Not shipped itself.
2. **import script** — `jimesh2`'s `src/frontend/scripts/import-blog.mjs` reads from this submodule (default: the relative piggyback path `../../../jimesh-docs/articles` next to the jimesh2 checkout — no absolute paths in code; `ARTICLES_DIR` env var overrides). It scans the folders, resolves draft flags/tags from the articles README, rewrites figure links, and exports into `src/content/blog/<slug>.md` + `public/blog/<slug>/` figures.
3. **jimesh2 content (committed build artifact)** — the exported markdown/images in `src/content/blog` and `public/blog` are committed in the jimesh2 repo and consumed by Next.js SSG at build time.

So: articles (submodule here) → `import-blog.mjs` scan → `jimesh2/src/content/blog` → Next SSG. Re-running the import is idempotent; nothing in jimesh2 imports this repo's npm side (`content/api/`, `spec/api/`) — those are API-docs consumers only.

## Build & dev

```bash
npm install
npm run build   # content/**/*.md -> dist/docs/*.html, spec/ + assets -> dist/, index.html -> dist/index.html
npm run serve   # build + local static server on http://localhost:4173
```

`marked` is a devDependency used only by the build script.

## Docs site layout

- `/` — Scalar API reference with a spec selector:
  - **Gateway (live)** — fetches OpenAPI from the user-supplied gateway base URL (pattern: `http://<host>:19091/openapi.json`). If the gateway is unreachable, the loader fails gracefully; there is no bundled fallback spec by design (the gateway spec is served live, per the TASK-085 plan).
  - **Auth spec** — `/spec/auth.openapi.json`
  - **Admin spec** — `/spec/admin.openapi.json`
- `/docs/API_DOCS.html` — rendered markdown reference with a table of contents.
- `/openapi/gateway-urls.html` — plain HTML links into the three reference views.

Scalar is loaded from `https://cdn.jsdelivr.net/npm/@scalar/api-reference` at runtime (CDN, no vendor lock-in, no build step).

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` builds `dist/` on every push to `main` and deploys it via GitHub Pages (static upload + actions/deploy-pages). Set the repository's Pages source to "GitHub Actions".

## Consuming this package from other repos

The package is `private:true` and exports raw content, spec, and built-site files — no code to import. Recommended consumption mechanisms:

**1. Monorepo-adjacent local relative path (simplest, no registry):**

```jsonc
// consumer package.json
"devDependencies": {
  "@jimesh/docs": "file:../jimesh-docs"
}
```

then:

```js
import authSpec from "@jimesh/docs/spec/api/auth.openapi.json" with { type: "json" };
import apiDocsMd from "@jimesh/docs/api-docs.md" with { type: "text" };
```

**2. `npm link` for interactive development:**

```bash
cd /home/ji/projects/jimesh-docs && npm link
cd <consumer-repo> && npm link @jimesh/docs
```

**3. `npm pack` + install the tarball for regulated environments:**

```bash
cd /home/ji/projects/jimesh-docs && npm pack
cd <consumer-repo> && npm i /path/to/jimesh-docs-0.1.0.tgz
```

Machine-readable consumers (SDK generators, contract CI like the redocly/`openapi-diff` pattern recommended by TASK-017) should read `spec/*.openapi.json` directly. Because no public npm registry is used, `file:` relative paths are the lowest-friction default for JiMesh repos.

## Credential policy

This repo contains **no keys and no internal hostnames**. Only ports and paths (as published in API_DOCS.md, e.g. `http://<host>:19091`) are documented. Keep it that way.
