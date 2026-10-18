# SPRINT-EX-1-PREMIUM-EXTRACTION — Premium-Extraction erster Schritt

**Status:** ✅ IMPLEMENTIERT (betagate + cloudexchange packages in jimeshIO committed, JiMesh2 stubs im `feat-cloud-stack` HEAD 08a8cadf)
**Datum:** 2026-10-14 (RETRY-Run — der erste Agent-Run leer geblieben, this run verified + completed)
**Operator-Mandat (wörtlich):** „premium private, via GOPRIVATE=github.com/ji-podhead/jimeshIO + GITHUB_TOKEN oder npm @jimesh/pro-* ins OSS importiert"
**Kontext-Sprints:** SPRINT-PROVISION-ONPREM-CLOUD-K8S (A3/deployment code-state), SPRINT-ENTERPRISE-SITE-AUTH-BILLING (ES-5 Token-Kette verbindlich), SPRINT-DEPLOY-DUAL-ENV-K8S-GVISOR

## Ziel

Die drei premium-scoped Codepaths aus JiMesh2 `feat-cloud-stack` (BG-1 beta gate,
BG-1 store half, ES-5 cloud exchange) wandern als **governed packages** nach
jimeshIO (`packages/go/`). JiMesh2 hält dünne, ehrliche Stubs zurück
(`503 premium package not present in OSS`) — kein 401-Theater, kein Fake.

## Extraction-Status-Tabelle

| JiMesh2-Original (feat-cloud-stack) | jimeshIO-Paket | Umsetzung |
|---|---|---|
| `src/backend/internal/gateway/beta_gate.go` (BG-1 EP) | `packages/go/betagate/betagate.go` (465 Z.) | Port 1:1 — gleiche Route, gleiches Gate-Ladder, gleiche Response-Texte, gleicher Rate-Limit-Contract (5/h/IP, Timing-Decoy, ONE-401-Folding, Seat-Walls) |
| `src/backend/internal/store/beta_invites.go` (BG-1 Store) | `packages/go/betagate/store.go` (435 Z.) | Port 1:1 — `beta_invites`-Tabelle lazy-ensure, bcrypt-Hash-only (`HashBetaCode`/`CompareBetaCode`), Upsert-Rotation, Settings-KV-Flags |
| `src/backend/internal/gateway/cloud_exchange.go` (ES-5) | `packages/go/cloudexchange/cloud_exchange.go` (666 Z.) | Port 1:1 — Ed25519/JWKS-Verify (stdlib), Claims-Contract (iss/aud=jimesh-cp, exp≤5min, fraud_checked), One-Shot-jti, ONE-link-only Settings-KV, audit |
| `beta_gate_test.go` (mv, NICHT copy) | `packages/go/betagate/betagate_test.go` (11 Test-Funktionen) | moved |
| `beta_invites_test.go` (mv) | `packages/go/betagate/dbtests_test.go` (7 Test-Funktionen, `//go:build dbtest` — nur mit Throwaway-DB) | moved |
| `cloud_exchange_test.go` (mv) | `packages/go/cloudexchange/cloud_exchange_test.go` (18 Test-Funktionen) | moved |
| `cmd/jimesh-admin/beta_invite.go` (BG-3 CLI) | — (bleibt JiMesh2-OSS) | CLI-Stub 167 Z.: Parse-Contract bleibt (pure), Store-Hälfte → ehrliche `premium package not present in OSS`-Error für `beta-invite`/`beta-gate-off` |

**Moved-Tests gesamt: 36** (11 unit betagate + 7 dbtest betagate + 18 cloudexchange).

## Packages angelegt

| Package | Import-Path | go.mod (Umbrella `packages/go/go.mod`) |
|---|---|---|
| `packages/go/betagate` | `github.com/ji-podhead/jimeshIO/packages/go/betagate` | golang.org/x/crypto (bcrypt), ODER pgx/v5 nur für die `dbtest`-Suite |
| `packages/go/cloudexchange` | `github.com/ji-podhead/jimeshIO/packages/go/cloudexchange` | golang-jwt/jwt/v5 (Claims-Bindung), stdlib http/ed25519 |

**Entscheidung (Umbrella statt Sub-Module):** ONE go.mod für beide Packages
(`module github.com/ji-podhead/jimeshIO/packages/go`) statt je ein eigenes
Sub-Module go.mod — keine Intra-Repo-Friction, identischer Import-Path, kein
Multi-Doppel-Modul-Zwang. Store-Abhängigkeit von cloudexchange ist NICHT
eingetragen: cloudexchange trägt KEINE direkte Store-Abhängigkeit — der
Settings-KV-Zugriff erfolgt über das injizierte Funktionen-Paar `WireStore(lookup,
save)` (JiMesh2 pro build injected `GetSetting`/`SaveSetting`), pgx ist eine
dependency der `betagate` dbtest-suite (via `go mod tidy -tags dbtest` — damit
im go.mod gelistet).

## JiMesh2 Stub-Remaining-Surface

| Stub-File | Response-Contract |
|---|---|
| `internal/gateway/beta_gate.go` (102 Z., `//go:build !pro`) | `registerBetaGate(mux)` bleibt mounted; `GET /api/beta/gate` → 503 `{error, connected:false, betaGateActive:false}` (FE-Modal liest „gate off", Hände zum normalen Auth-Gate), `POST` → 503 `{"error":"premium…","message":"…"}`, sonst 405 |
| `internal/gateway/cloud_exchange.go` (107 Z., `//go:build !pro`) | `registerCloudExchange(mux)` bleibt mounted; `POST /api/cloud/exchange` → 503 `{"error":"premium"}`-Notice, sonst 405 (ServeMux-Verbs) |
| `cmd/jimesh-admin/beta_invite.go` (167 Z.) | CLI bleibt mounted, Parse-Contract bewahrt (32+ Bytes-CODE, bcrypt-Cap 72, Rotation-Semantik), Ausführung → honest premium-Error |
| Stub-Tests ersetzt (NEU, keine moved copies) | `beta_gate_stub_test.go` (107 Z.), `cloud_exchange_stub_test.go` (91 Z.), `beta_invite_stub_test.go` (64 Z.) — 503-Assertions + mounted-route-Assertions |

Wiring bleibt eingeschränkt sauber: `gateway.go` mountet beide Stubs
(L758 `s.registerBetaGate(mux)`, L775 `s.registerCloudExchange(mux)`) —
`grep -rn "BetaInvite\|CloudExchange\|betaInvite\|cloud_exchange\|cloudExchange"
src/backend/internal/gateway src/backend/internal/store` nach Abschluss:
NUR die intentionalen Wire-Lines, KEINE stale cross-refs
(HashBetaCode/CompareBetaCode/UpsertBetaInvite/beta_invites: ZERO im
JiMesh2-Backend).

## Pro-Build-Weg (GOPRIVATE-Import)

```
export GOPRIVATE=github.com/ji-podhead/jimeshIO
export GITHUB_TOKEN=<repo-PAT>
go get github.com/ji-podhead/jimeshIO/packages/go/betagate@latest
go get github.com/ji-podhead/jimeshIO/packages/go/cloudexchange@latest
```

Der `//go:build pro`-Nachfolger (`beta_gate_pro.go` / `cloud_exchange_pro.go`)
1:1 im Stub-Header dokumentiert (exactly-ONE register pro build, gegenseitige
Build-Tags). bis dahin antwortet OSS ehrlich 503.

**Memo:** `npm @jimesh/pro-*` ist ein LATER Delta (die FE-Hälfte des
pro-Imports) — hier bewusst NICHT umgesetzt; `packages/npm/README.md`
verweist nur auf die Gesamtstruktur.

## Verifikation (füllt die Verbindlich-Regeln)

| Gate | Ergebnis |
|---|---|
| `go build ./...` (packages/go) | ✅ OK |
| `go vet ./...` (packages/go) | ✅ OK |
| `go test ./betagate ./cloudexchange` | ✅ ok 0.720s / 0.013s (unit, kein DB) |
| `go test -tags dbtest ./betagate` vs Throwaway `jimesh_test` DB | ✅ ok 1.380s |
| JiMesh2 `go vet` + `go test ./internal/gateway ./internal/auth ./cmd/jimesh-admin ./internal/store` (Throwaway-DB) | ✅ alle ok |

**Extraction completeness: 100%** der EX-1-Verbindlichkeiten. Es gibt 1
Pre-existing JiMesh2-Baseline-Failure (nicht EX-1): `internal/siem`
fehlende in-repo-basierte testdata/fixtures
(`testdata/waf_audit_line.json`, `testdata/wazuh_journal_alert.json` —
waf/wazuh_alert_tail_test.go).

**Operator verified:** ☐ (finaler Human-Check GOPRIVATE-Import-Probe steht aus)
