# @jimesh/docs

JiMesh development-docs home. This repo is **no longer a documentation
website** — the former Scalar/Pages site was retired on 2026-10-19.

## What lives here

| Path | Purpose |
|---|---|
| `development/` | **Dev-docs home** (moved in 2026-10-16 from `jimeshIO/docs/`) — master plan, FE specs, sprints, backlog, research. New sprint/task docs get written directly here; policy + inventory in `development/README-intake.md`. `apps/site/scripts/gen-docs.mjs` (jimeshOps) reads curated public docs from here as a fallback home. |
| `articles/` (git submodule → [`ji-podhead/articles`](https://github.com/ji-podhead/articles)) | **Canonical content source for the jimesh2 blog.** Pass-through: `jimesh2/src/frontend/scripts/import-blog.mjs` scans this submodule (relative path `../../../jimesh-docs/articles`) and exports into `jimesh2/src/content/blog` + `public/blog` for Next.js SSG. |

## Where the API documentation went

The HTTP API reference (structured browser, OpenAPI try-it explorer, endpoint
index, prose docs) is generated **directly from the backend repo**
(`jimesh2`): `make openapi-spec` exports golden OpenAPI 3.1 specs from the
gateway's recorded route registry + `openapi/overlay.yaml` and fails CI on
drift; the jimeshOps website (`apps/site`, route `/docs`) bundles them at
build time. There is no separate docs site and no synced copies in this
repository anymore.

The retired site's history (Scalar CDN reference, Pages workflow, spec
snapshots) is in the git history up to commit `0b27d9b`.

## Credential policy

This repo contains **no keys and no internal hostnames**. Keep it that way.
