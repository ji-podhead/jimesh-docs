# Getting started

Everything below targets the JiMesh **gateway** — the Go HTTP server on
`:19091` (gRPC `:19092`) that fronts the LLM mesh. Replace
`<host>` with wherever your gateway runs.

## 1. Health check

```bash
HOST=http://<host>:19091

curl -s $HOST/ready
curl -s $HOST/health/check
```

`/ready` answers without authentication; `/api/*` routes are session-gated
by the auth middleware.

## 2. Authenticate

The gateway ships in **default mode**: the dashboard is open with a seeded
default admin account until you personalize it (change-password /
change-email flips `defaultAuth:false` and the real session gate engages).
Enterprise deployments authenticate via Keycloak (Authorization Code + PKCE).

Two bearer-key families talk to the gateway without a browser session:

```bash
# session login (what the dashboard does) — {password} (or email) → {token} (24h session)
curl -s -X POST $HOST/api/auth/login -H 'Content-Type: application/json' \
  -d '{"password":"<password>"}'

# machine access: a consumer key minted via POST /api/consumer-keys
# (shape: jimesh-ck-…) or a workspace proxy key (jimesh-pk-…)
Authorization: Bearer <jimesh-sk-...>
```

See `/api/auth/status` to inspect your session
(`{needsSetup, authenticated, email, defaultAuth, source, isAdmin}`).

## 3. First chat completion

Chains are named model lists (`smart:` / `fast:` prefixes are conventional).
List what exists, then call the OpenAI-compatible endpoint:

```bash
curl -s $HOST/v1/chains | jq .

curl -s -X POST $HOST/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"model":"<chain-id>","messages":[{"role":"user","content":"Hello"}]}'
```

Chains are OpenAI-compatible models too — `GET /v1/mesh/models` lists them
as `{id:"jimesh:<chainId>", ...}` entries.

> Note: `GET /v1/health`, `DELETE /v1/chains/{id}` and `POST /v1/completions`
> were removed from the gateway (verified dead in the drift audit) — use
> `/ready`, the redeploys path, and `/v1/chat/completions` respectively.

## 4. Next steps

- **Full route reference:** the rendered
  [`API_DOCS.html`](../docs/API_DOCS.html) (this site) — the complete,
  drift-audited list of every gateway route with request/response shapes
  and error codes.
- **OpenAPI playground:** the Scalar reference on this site, or
  `GET $HOST/openapi.json` on a running gateway.
- **Operator CLI:** the `jimeshctl` bash+jq client lives in the gateway
  repo's `examples/` directory and drives health, chains, mesh and
  firewall commands over plain curl.
