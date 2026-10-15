# Architecture

## The gateway at a glance

The JiMesh gateway is a single Go service with two transports:

- **HTTP `:19091`** — the OpenAI-compatible surface (`/v1/*`), the
  dashboard's REST API (`/api/*`, session-gated) and the live
  OpenAPI document outlet.
- **gRPC `:19092`** — the internal node transport.

Routing uses Go 1.22 pattern registration (`HandleFunc` with method and
`{id}` segments). The gateway **generates its own OpenAPI 3.0.3 document
from the registered routes at runtime** and serves it unauthenticated
(GET only):

```
GET http://<host>:19091/openapi.json
```

There is no bundled fallback spec in this docs repo by design — the
live endpoint is the source, so the Scalar playground can always be
pointed at a running gateway.

## Documentation flow (import path)

```
backend repo (source of truth)          this repo (publisher)
─────────────────────────────           ─────────────────────
jimesh2/docs/API_DOCS.md        ──copy──▶ content/api/API_DOCS.md
enterprise/api-spec/auth.openapi.json ──▶ spec/api/auth.openapi.json
enterprise/api-spec/admin.openapi.json─▶ spec/api/admin.openapi.json
gateway/openapi.go  (live only; never bundled)
```

The copies here are **1:1 snapshots**; edits land in the source repos
first, then get re-copied. The build (`scripts/build.mjs`) renders
`content/**/*.md` and `docs/**/*.md` to HTML, copies `spec/` 1:1, and
assembles the Scalar site into `dist/`.

## The drift audit (keeping docs honest)

Documentation drift is treated as a defect class of its own, with a
recurring audit process modeled on two task templates:

- **Route drift audit** — a script path counts every
  `HandleFunc` pattern registered across the backend repo, normalizes
  it (`{id}` → wildcard, method stripping, query stripping, leading
  slash — get the normalization right, a sloppy regex silently hides
  drift), and diffs it against the routes extracted from the copied
  `API_DOCS.md` in three classes:

  1. **registered in code, missing in docs** → a worklist; every route
     must be appended to the reference with a description *read from the
     handler, not invented*, in the same PR that adds the route;
  2. **documented but not registered** (dead docs) → removed after live
     verification (a 404 from curl alone is not proof — the middleware
     gates `/api/*` before routing, so the repo-wide grep is the
     evidence);
  3. **method-pattern drift** → method-specific Go patterns must be
     documented per-method.

- **Docs-site rollout audit** (per another task template) governs the
  publishing half: a clean, decoupled public content directory with
  internal developer paths, worktree anecdotes and confidential notes
  stripped; a lightweight static renderer (Scalar /
  Stoplight Elements from CDN — explicitly **no Docusaurus, no
  MkDocs**); and a Pages build workflow that compiles the
  markdown + specs to static HTML in one job.

The recurring loop: re-run the drift audit, close the route worklist in
the backend repo, re-copy the refreshed snapshots here, rebuild, and the
Pages workflow re-publishes.

## Contract-CI recommendation

Machine consumers should read `spec/*.openapi.json` directly and gate
changes with `redocly lint` + `openapi-diff --fail-on-incompatible`, so
incompatible route changes fail CI instead of silently diverging from
the published reference.
