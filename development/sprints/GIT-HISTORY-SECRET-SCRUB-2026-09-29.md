# JiMesh — Git History Secret Scrub, 2026-09-29

Repo: `/home/ji/projects/jimesh` (GitHub: `ji-podhead/JiMesh2`, currently **private**).
Scope change from Leo mid-task: Part 2/3 switched from a surgical `git filter-repo`
scrub to a full history reset (squash `main` to a single fresh commit). That change
is reflected below; Part 1 (full inventory) and Part 4 (rotation checklist) were
executed as originally specified.

**Top-line: 1 confirmed real secret found (the Vault dev root token). It has been
fixed at HEAD and `main`'s history has been squashed to one commit in a fresh clone
— but the token's actual value is still present in that single commit's file
content (by design for 2 files, and un-touched in 6 more). See "Critical caveat"
below before treating this as closed.**

---

## Part 1 — Full history inventory

Method: `git log -p --all` dumped to a scratch file (851 commits reachable from
`main`, ~1.18M lines of diff), then layered regex sweeps for token/secret/password/
key assignment patterns, AWS key patterns, private-key headers, and known SaaS
token prefixes (`ghp_`, `gho_`, `github_pat_`, `xox*`, `npm_`, `sk-`, `sk-ant-`,
`sk-or-`, `gsk_`, `nvapi-`, `AIza...`). `gitleaks` and `trufflehog` are **not
installed** in this environment and could not be installed (no package-manager/
pip-install access confirmed) — the manual regex sweep was the fallback, run
exhaustively over the full history dump rather than sampled commits. Cross-checked
against `.env.example` (root, `deploy/ozone/.env.example`, and a vendored research
fork's example file) as the placeholder baseline.

### 1.1 Confirmed real secret

| # | Value (described, not pasted) | Files (current HEAD) | Also literal in history since |
|---|---|---|---|
| 1 | Hardcoded HashiCorp Vault **dev-mode root token** — a fixed literal string, not an env-var reference | `deploy/vault/defaults.yml:11`, `deploy/backend/defaults.yml:33` (**both now fixed**, see Part 1.1-fix below) | Introduced by commit `3c0fbbb` ("feat: RBAC budgets, teams, app categories, traffic inspector, vault docs"); touched by 7 commits total, most recently `09f351a` |

**Additional literal occurrences of the same value, current HEAD, NOT covered by
the narrow two-file fix instruction (flagging per "find every secret", not
editing without explicit sign-off since the fix instruction named exactly two
files):**

- `src/backend/internal/security/vault_client.go:40` — Go code, hardcoded fallback default (`token = "jm_master_root_token_2026"`)
- `src/scripts/local-stack.sh:51` and `:88` — shell script, passed as literal `-e VAULT_DEV_ROOT_TOKEN_ID=...` / `-e VAULT_TOKEN=...`
- `docs/API_DOCS.md:1189`, `docs/USER_GUIDE.md:151`, `SECURITY.md:168` — documentation, explicitly describing it as "the well-known root token" (i.e. documented-as-intentional, not accidental — but still a literal value an operator would need to change if it's ever meant to stop being well-known)

### 1.2 Same-class finding, lower severity — needs operator judgment

| # | Value (described) | Where | Assessment |
|---|---|---|---|
| 2 | Hardcoded local Postgres dev password | `deploy/backend/defaults.yml:29` (`backend_database_url`, literal, no env lookup), `.env.example` (documented default), various docker-compose files (47 occurrences across history) | Same hygiene pattern as the Vault token (literal instead of env-lookup) but **explicitly documented in the tracked `.env.example`** as the intended local-dev default, same as the Vault token was. **Not fixed in this session** — out of the narrow two-file scope given. Flagging as uncertain/needs-operator-judgment per instructions rather than silently fixing or ignoring. |

### 1.3 Investigated and ruled OUT (false positives — not leaked secrets)

- `AIzaSyCVeR9P1FKnFYYC61w5TYOofdJzKTAoCf8` (docs/tasks/jules/TASK-088-firebase-auth.md, 3 occurrences) — a Firebase **Web API key**, explicitly annotated in the same doc as "(public by design)". Firebase web API keys are not bearer credentials; access is governed by Firebase Security Rules + domain restriction. Standard practice to ship these client-side.
- `SecretPassword` (`siem_indexer_password`, `JIMESH_WAZUH_INDEXER_PASSWORD` mentions) — every occurrence is either a Jinja2 `{{ variable }}` reference or prose describing where the REAL value goes (a gitignored `overrides.local.yml`); no literal real value was ever committed.
- `jimesh-dev-root` (`VAULT_DEV_ROOT_TOKEN=jimesh-dev-root`) — an early template/example line sitting alongside `POSTGRES_PASSWORD=CHANGE_ME_postgres` and other `CHANGE_ME_*` placeholders; not the actual value used anywhere in code, superseded by `jm_master_root_token_2026`.
- `MESH_ROUTING_KEY=dsh-sec-token` — fake docker-compose text rendered inside a React UI mock/demo component (`src/frontend/src/views/ProjectDetailPage.tsx`), never a real deployed config.
- `ENCRYPTION_KEY=0123456789abcdef...` (sequential hex), `DB_PASSWORD=hunter2`, `sk-abcdefghijklmnopqrstuvwxyz0123456789`, `AKIAIOSFODNN7EXAMPLE`, `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` — all inside Go test fixtures or DLP-regex documentation examples (the AWS pair is literally AWS's own published example-key pair). Not real credentials.
- `jimesh-ck-secret` — a Go test fixture literal (`edge_router_test.go`-style) used to assert string formatting, not a real minted service key.
- `GITHUB_CLIENT_SECRET` / `GOOGLE_CLIENT_SECRET` — every occurrence across history is `${VAR:-}` shell interpolation or `{{ jinja }}` — never a literal value.
- No `BEGIN ... PRIVATE KEY` material was ever committed — all hits are documentation/DLP-pattern references or a truncated fake test fixture (`MIIBOgIBAAJBAK...`).
- No real AWS `AKIA...` keys, GitHub `ghp_`/`gho_`/`github_pat_` tokens, Slack `xox*` tokens, or `npm_` tokens found anywhere in the 851-commit history.
- No real `.env` file (only `.env.example` templates) was ever committed, at any point in history.

---

## Part 1.1 — HEAD fix (done, committed as a normal commit — not a history rewrite)

Commit `25009b0` on `/home/ji/projects/jimesh` `main` (now superseded at tip by an
unrelated concurrent commit `3450bb8` from another session — expected, see Leo/
jimesh memory notes on parallel GLM sessions):

```
fix(secrets): stop hardcoding the Vault dev root token in defaults.yml
```

Changed, matching the exact `ansible.builtin.env` lookup pattern already used by
`KC_BOOTSTRAP_ADMIN_PASSWORD`/`DASHBOARD_CLIENT_SECRET` in the same files:

- `deploy/vault/defaults.yml:11`
- `deploy/backend/defaults.yml:33`

Both now read:
```
"{{ lookup('ansible.builtin.env', 'VAULT_ROOT_TOKEN') | default('jm_master_root_token_2026', true) }}"
```

This was the exact pattern specified in the task — the old literal is kept only as
the **fallback default** (same shape as e.g. `backend_keycloak_public_url`'s
non-secret defaults), not removed outright. See the critical caveat below for what
this does and doesn't buy.

Only these two files were staged/committed; the rest of the working tree's
pre-existing unrelated uncommitted changes (auth.go, consumer_key.go, gateway.go,
store.go, new dashboards/threat-responder files, etc. — apparently in-flight work
from another session) were left untouched, not committed, not discarded.

---

## Part 2/3 — History reset (squash to one commit), per Leo's revised scope

Filter-repo was not available (`git-filter-repo`: not found on PATH, not installed
via pip) and the coordinator's revised instruction replaced the planned
filter-repo/filter-branch surgical scrub with a full history reset anyway, so no
further tooling check was needed.

**Work done entirely in a fresh clone, never touching the live repo destructively:**

```
rm -rf /tmp/jimesh-history-scrub
git clone /home/ji/projects/jimesh /tmp/jimesh-history-scrub
cd /tmp/jimesh-history-scrub
git checkout --orphan clean-main
git add -A
git commit -m "chore(history): squash full history into a single clean commit — pre-public-release secret cleanup ..."
```

Result: branch `clean-main` in `/tmp/jimesh-history-scrub`, root commit `fbcd9dc`,
1 commit, 1726 files, containing exactly the current (post-Part-1.1-fix) file
tree — verified via `git rev-list --count clean-main` → `1`.

The original `main` branch (851 commits) is **still present, untouched**, in both
`/tmp/jimesh-history-scrub` (as `main`) and the live repo — nothing was deleted or
force-pushed anywhere.

### Verification — and the critical caveat

Re-running the Part-1 scan against `clean-main`: as expected, there is now only
one commit to scan, so the *historical* exposure (the token appearing across 7
different prior commits, reachable via `git log -p`) is gone from this branch.

**However — this is not the same as the secret being gone.** `clean-main`'s single
commit is a snapshot of current HEAD, and current HEAD still contains the literal
token value in 8 places (the 2 intentionally-kept fallback defaults from Part 1.1,
plus the 6 additional occurrences listed in Part 1.1 that were out of this
session's fix scope). Squashing history has **zero confidentiality benefit** for a
secret that is still present in the current tree — it only removes old commits
that showed the secret being introduced/edited over time. Since this token is
still live in `defaults.yml` (as designed, as a fallback), `vault_client.go`,
`local-stack.sh`, and three docs files, it is exactly as discoverable in the
squashed repo as it is in the live repo today.

**This means the real fix for this secret is Part 4 (rotation), not the history
squash.** The squash is still worth doing for the stated reason (guarantees no
*other*, not-yet-found secret can resurface from an old diff — reasonable
defense-in-depth given the token above is not the last hardcoded value this repo
will ever gain), but it should not be reported to Leo as "the Vault token is now
scrubbed" — it isn't, by design, unless the fallback default and the 6 other
occurrences are also removed or the token itself is rotated.

### Additional caveat — branch fan-out

`main` is one of **64 local branches / 16 origin remote branches** in the live
repo (many `worktree-agent-*`, `feat/*`, `wt-*` branches from parallel agent
sessions). This squash only rewrites `main`. Every other branch still on `origin`
— including several `worktree-agent-*` and `preserve/*` branches — still carries
the full 851-commit history with the same hardcoded token, and GitHub keeps commits
reachable from *any* branch or PR ref alive even after `main` is force-pushed. If
the goal is "no leaked secret reachable anywhere in this GitHub repo before it goes
public," rewriting `main` alone is **not sufficient** — the other branches need
either deleting (if stale/merged) or the same treatment, and that decision needs
Leo, since several look like active parallel-session work
(`worktree-agent-a001e26...` etc.), not just merged-and-abandoned branches.

---

## Part 3 — Force-push: NOT run, documented only

Exact commands the operator/coordinator would run (from `/tmp/jimesh-history-scrub`,
or any clone that has `clean-main` — copy the branch over first if working from a
different clone):

```bash
# from /tmp/jimesh-history-scrub
git branch -f main clean-main        # point local main at the squashed commit
git checkout main
git push --force-with-lease origin main
```

`--force-with-lease` (not bare `--force`) so the push fails safely if anyone else
pushed to `origin/main` since this session's last fetch, rather than silently
clobbering it.

**What must happen afterward, everywhere else this repo is checked out:**

- Any other local clone of `jimesh` (**explicitly including the live
  `/home/ji/projects/jimesh` working copy this session read from, and any parallel
  GLM/DSH session's own local clone** — see the Leo/jimesh memory note on parallel
  sessions) will silently diverge: their `main` still points at the old
  851-commit history, which no longer matches `origin/main`'s new single-commit
  history. A plain `git pull` there will fail or create a confusing merge of two
  unrelated histories.
- The correct recovery in every other clone/session is either:
  - **`git fetch origin && git reset --hard origin/main`** (if no uncommitted/
    unpushed local work needs preserving — check `git status` and `git log
    main..HEAD` first in that clone), or
  - a fresh `git clone` of the repo, migrating any uncommitted work over by hand.
- This should be communicated explicitly to any other active session working in
  `jimesh` before or immediately after the force-push, not discovered by them via
  a failed `git pull`.
- Every open PR against the old `main` history will show as unmergeable/conflicting
  after this and will need to be rebased or recreated against the new single-commit
  `main`.

---

## Part 4 — Rotation checklist

A scrubbed-from-history value is still a **compromised** value — it must be
replaced with a genuinely new secret, not just hidden. This is independent of
Parts 2/3.

### Vault dev root token (the one confirmed real secret)

- **What it actually gates:** `VAULT_ROOT_TOKEN` flows into `deploy/vault/defaults.yml`
  (`vault_dev_root_token`) and `deploy/backend/defaults.yml` (`backend_vault_token`)
  via the new env lookup; `src/backend/internal/security/vault_client.go` also has
  its own hardcoded fallback of the same value (`token = "jm_master_root_token_2026"`,
  line 40) independent of the Ansible layer — that Go fallback needs the same
  treatment (read from env, no baked-in literal default) or the rotation below is
  incomplete, since the Go binary can still fall back to the old value at runtime
  even after Ansible stops passing it.
- **What "rotating" means here:** this is Vault's **dev-mode** root token
  (`vault server -dev`, in-memory, no persistence — confirmed by the comment
  already in `deploy/vault/defaults.yml`). Rotating it is not a Vault-API
  operation on a running dev server in the normal sense (dev mode's root token is
  fixed at process start via `-dev-root-token-id`); rotation means: pick a new
  random token value, set it via `VAULT_ROOT_TOKEN` in the real deploy `.env`
  (never committed), and restart/redeploy the `jimesh-vault` container so it
  starts with the new token. Any place currently reading the old literal as a
  *fallback* (the 2 Ansible files, `vault_client.go`) needs that fallback removed
  or at minimum documented as "dev-only, never used when VAULT_ROOT_TOKEN is set"
  — right now nothing forces the env var to be set, so an operator who forgets to
  set it silently gets the old, now-public value back.
- **Also update:** `docs/API_DOCS.md:1189`, `docs/USER_GUIDE.md:151`,
  `SECURITY.md:168`, `src/scripts/local-stack.sh:51,88` — all currently document
  or hardcode the old literal as *the* value; once rotated, these either need the
  new value (bad — same problem) or (better) need rewriting to say "set via
  `VAULT_ROOT_TOKEN`, no default" so the docs stop being a live secret exposure.

### Postgres dev password (flagged, not confirmed — operator judgment)

- If Leo decides `jimesh_secure_pass` also needs rotating (it's the same
  "documented dev-mode literal" pattern as the Vault token was): flows via
  `backend_database_url` in `deploy/backend/defaults.yml:29` and the `POSTGRES_*`
  vars in `.env`/compose files into the `jimesh-postgres` container's own auth.
  Rotating requires changing the Postgres container's actual user password (not
  just the connection string), i.e. an `ALTER USER jimesh WITH PASSWORD ...`
  against a running instance, or a fresh volume + re-init for a not-yet-deployed
  one — a real DB-side action, not just an env-var edit.

### Not applicable

- No other confirmed real secrets were found in Part 1, so no other rotation is
  needed. The Firebase Web API key (`AIzaSyCVeR9P1FKnFYYC61w5TYOofdJzKTAoCf8`) is
  public-by-design and does not need rotating on confidentiality grounds (though
  Leo may still want to confirm Firebase Security Rules are actually locked down
  before going public, since that's what actually protects it, not secrecy of the
  key).

---

## Summary

- **Secrets found:** 1 confirmed real secret (Vault dev root token), 1 same-class
  finding flagged for operator judgment (Postgres dev password), 10+ candidates
  investigated and ruled out as documented placeholders/test fixtures/public-by-
  design values (full list in Part 1.3).
- **Fixed at HEAD:** the 2 files the task named (`deploy/vault/defaults.yml`,
  `deploy/backend/defaults.yml`), committed cleanly as `25009b0` on the live repo.
  **6 more current-HEAD occurrences of the same literal value were found but not
  fixed** (out of the narrow two-file instruction) — see Part 1.1 and Part 4.
- **History scrubbed:** `main`'s 851-commit history was squashed to 1 commit on
  branch `clean-main` in a fresh clone (`/tmp/jimesh-history-scrub`), not yet
  applied to `origin`. **This does not remove the secret's value from the
  codebase** — it only removes old commits; the token is still present in the
  squashed commit's tree exactly as it is in the live repo today. 63 other
  branches on the live repo (local + origin) still carry the full unscrubbed
  history and are untouched by this squash.
- **Force-push:** not run. Exact command and other-session recovery steps are in
  Part 3.
- **Next command for the operator, when ready:**
  ```bash
  cd /tmp/jimesh-history-scrub
  git branch -f main clean-main
  git checkout main
  git push --force-with-lease origin main
  ```
  — but only *after* deciding what to do about the 6 remaining hardcoded
  occurrences and the actual token rotation (Part 4), and the other 63 branches
  (branch fan-out caveat above), since force-pushing `main` alone does not make
  this token confidential again.
