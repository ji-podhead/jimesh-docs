# BUILD STATUS — Verified Tracker

**Scope of this document:** it records *compilation*, nothing more. A clean
compile is not a working feature. Runtime/endpoint verification is tracked
separately below and is currently **open**.

## Verification ledger

Only entries with a date, a command and an observed result count as verified.

| When | What | How | Result |
|------|------|-----|--------|
| 2026-09-06 | `src/backend` module compiles | `docker run --rm -v <repo>/src/backend:/src -w /src golang:latest go build ./...` | exit 0, no diagnostics |
| 2026-09-06 | `go vet` over the whole module | same container, `go vet ./...` | exit 0, no findings |
| 2026-09-06 | `gofmt` on `internal/network` | same container, `gofmt -l internal/network/` | no files listed |
| 2026-09-06 | Route registrations counted | `grep -rhoE '(mux\|s\.mux)\.HandleFunc\("[^"]+"' src/backend/internal/gateway/*.go \| sort -u \| wc -l` | 170 distinct patterns (163 of them in `gateway.go`) |

Packages covered by that module-wide build (previously listed here as
individually "verified"):

- Sprint 12: mesh_models (`/v1/mesh/models`)
- Sprint 13: model_roles, entropy_routing, orchestration, model_enrichment
- Sprint 14: experts (MoE pipeline)
- Sprint 15: tunnel (SSH), port_detection, discovery
- Sprint 16: vault, vault_client, rbac, cost_breaker, traffic_inspector, ontology
- `internal/network`: TunnelPool, SSHConfig, port detection
- `internal/metadata`: StaticTechOntology

## Toolchain — read this before quoting a version

- `go.mod` declares `go 1.25.0`. That is a **language/module directive**, not
  proof that the code was ever built with go1.25.0.
- There is **no Go toolchain on this dev host** (`go: command not found`,
  no `/usr/local/go`). Every build above ran inside `golang:latest`, which
  today resolves to **go1.27.1 linux/amd64**.
- Earlier revisions of this file claimed `go version go1.25.0 linux/amd64`
  under a "BUILD VERIFIED" banner. That contradicted
  `docs/sprints/SPRINT-16-SECOPS-VAULT-RBAC.md:102`
  (`- [ ] Build verified on target box (go not available in this env)`),
  which is still unchecked. The claim has been removed rather than restated.

### Known defect: `make go-build` / `make build` do not work here

The container fallback in the Makefile does `cd src/backend` first and then
mounts `$PWD/src/backend`, i.e. `src/backend/src/backend`, which does not
exist:

```
[make] no host go toolchain — compiling in golang:latest container
pattern ./...: directory prefix . does not contain main module or its selected dependencies
make: *** [Makefile:38: go-build] Fehler 1
```

Until the Makefile is fixed, build with the absolute-path form used in the
ledger above. Do not read a green `make build` as evidence of anything — on a
host without Go it never reaches the compiler.

## Still open — NOT verified

- [ ] **Endpoint verification.** None of the curl checks below have been run
      against a live backend as part of this status. Compilation says nothing
      about whether these routes return real data.
- [ ] **Build on the target box** (SPRINT-16 acceptance criterion, still
      unchecked there).
- [ ] **`make verify` run** (`scripts/verify-stack.sh`) against a live stack.
      The script's default target was pointing at the pre-drift port `9091`
      and has been corrected to `19091`; it has not been re-run since.
- [ ] **Route count reconciliation.** 170 registration patterns were counted
      mechanically; they have not been diffed against `API_DOCS.md` entry by
      entry, so "documented == registered" is unproven.

## Next steps (on target box)

```bash
cd ~/leo/JiMesh && git pull
make restart-backend
make verify              # PASS/FAIL per capability, throwaway profile
# Endpoint spot-checks (host port 19091 → container 3010):
curl localhost:19091/api/ontology | jq .
curl localhost:19091/api/vault/secrets | jq .
curl localhost:19091/api/budgets | jq .
curl localhost:19091/api/security/audit | jq .
curl localhost:19091/api/discovery | jq .
curl localhost:19091/api/traffic | jq .
```

Record the outcome in the ledger above — with date, command and observed
result — instead of adding a new banner.
