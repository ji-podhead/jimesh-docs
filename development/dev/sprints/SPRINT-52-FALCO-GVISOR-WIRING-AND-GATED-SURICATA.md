# SPRINT-52 — Falco↔gVisor Runtime-Monitoring Wiring (ready-to-run) + Gated Suricata XDP Capability-Check (NOT ready-to-run)

**Datum:** 27.9.2026 · **Status:** File authoring only — no SSH, no deployment execution, no
real node touched. Both new `deploy/<service>/` folders were built following this repo's own
existing IaC conventions (`deploy/ssh-allowlist/`, `deploy/siem/`, `deploy/ansible/playbooks/deploy-service.yml`).

## Summary

| | Part 1 — Falco↔gVisor | Part 2 — Suricata XDP |
|---|---|---|
| Folder | `deploy/falco-gvisor-integration/` | `deploy/suricata-network-ids/` |
| Registered for `make redeploy`? | Yes — dispatchable via `-e service=falco-gvisor-integration` (see comment in `deploy-service.yml`) | **No** — deliberately unregistered, gated, manual-only |
| Ready to run for real? | Yes, on a node already running `deploy/siem`'s `falco` container | **No** — must be run once by hand and its capability report reviewed by a human first |
| Default behavior | Wires the existing Falco 0.41.3 container to gVisor's official UDS trace-point stream, additively | Installs Suricata via apt in the always-safe plain af-packet mode; XDP stays off by default |
| Destructive to anything existing? | No — zero writes to `deploy/siem/*`; new Docker runtime name, live-reload only | No — new host package install only |

---

## Part 1 — Falco↔gVisor Runtime Monitoring wiring

**Files:**
- `deploy/falco-gvisor-integration/defaults.yml`
- `deploy/falco-gvisor-integration/ansible-task.yml`
- `deploy/falco-gvisor-integration/falco-gvisor.override.yml.j2`
- Comment block added to `deploy/ansible/playbooks/deploy-service.yml` (no other edits there)

### What it does

1. **Hard prerequisite checks, fail loudly (Mandat 2) if unmet** — does not silently proceed:
   - `deploy/siem`'s `jimesh-siem-falco` container is running, and `docker exec ... falco --version`
     reports ≥ 0.33.1.
   - `runsc --version` succeeds on the target node and its `release-YYYYMMDD.N` tag parses to
     ≥ `20221122.0` (best-effort parse; if it can't be parsed, the task **warns but does not
     hard-fail**, since `src/scripts/install-gvisor.sh` always pulls `release/latest` on nodes this
     repo provisions itself — documented as an assumption, not re-verified per-node).
   - `docker exec ... falco --help` actually exposes `--gvisor-config` /
     `--gvisor-generate-config` / `--gvisor-root` on **this specific binary** — hard-fails
     otherwise, because the tutorial page used as the source is not version-pinned and flag names
     can drift between Falco releases.
2. **Additive wiring**, zero writes to `deploy/siem/`:
   - Generates Falco's own required `pod-init.json` via `falco --gvisor-generate-config` (staged
     under `{{ jimesh_deploy_root }}/deploy/falco-gvisor-integration/`).
   - Registers a **new**, separately-named Docker OCI runtime `runsc-falco` via
     `runsc install --runtime=runsc-falco -- --pod-init-config=<pod-init.json>` — the existing
     `runsc` runtime (registered by `provision-node.yml` / `install-gvisor.sh`) is never touched.
   - Live-reloads the Docker daemon (`systemctl reload docker`, SIGHUP) to pick up the new runtime
     — **not** a restart, no disruption to already-running containers.
   - Discovers `deploy/siem`'s live compose project directory **dynamically**, from the running
     `falco` container's own `com.docker.compose.project.working_dir` label (a real Docker Compose
     v2 label, not a guessed/hardcoded path) — then applies a separate compose **override** file
     (`docker compose -f <siem>/docker-compose.yml -f falco-gvisor.override.yml --profile siem up
     -d falco`) that only recreates the `falco` container, with the K-LAF rule-scoping flag
     (`-r .../jimesh_rules.yaml`) preserved verbatim plus the two new `--gvisor-*` flags appended.

### Important, explicitly flagged limitation

This task wires the **receiving side only**. gVisor sandboxes only stream trace points to Falco
if the sandboxed container itself was started with `--runtime=runsc-falco` (the new runtime this
task registers) instead of the default `runsc`. Flipping that for `jimesh-framework-*` workspace
containers is a separate change in `internal/deploy`'s container-launch code and is **out of
scope** for this ansible task — the closing debug message in `ansible-task.yml` says this
explicitly so nobody reads "wired" as "already streaming events."

### Teil 1 — abgeschlossen (27.9.2026, Follow-up-Session: runsc-falco Runtime-Auswahl)

The limitation flagged above is resolved — the emitting side is wired now:

- `src/backend/internal/deploy/projects_ssh.go` (executeDeploy, useGVisor branch):
  runtime selection reads `docker info` Runtimes (what the daemon actually accepts,
  not just the runsc binary) and PREFERS `--runtime=runsc-falco` when registered;
  honest fallback chain runsc (Falco receives NO gVisor events then) → runc. Every
  branch echoes its choice to STDOUT so the reason lands in the deploy output
  (`runSSHCommand` drops stderr on success — the previous ">&2" note was invisible
  on remote deploys). New consts `runscRuntime`/`runscFalcoRuntime` stay in sync with
  `falco_gvisor_runtime_name` in defaults.yml.
- The VLAN securityNote gvisorLayer now distinguishes runsc-falco (ON + Falco
  streaming), runsc (ON, no Falco events) and DEGRADED; `containerRuntime` reports
  the measured runtime.
- `deploy/falco-gvisor-integration/ansible-task.yml`: after `runsc install` + daemon
  reload the task VERIFIES via `docker info` that the daemon really serves the
  runtime and hard-fails otherwise (Mandat 2); header, closing debug message and
  defaults.yml comments no longer claim the follow-up is missing.
- `docs/API_DOCS.md`: /api/workspaces/deploy documents `installGVisor?`/`useGVisor?`
  in the body and the runsc-falco preference including the honest fallback chain.

Verified (27.9., second session): CGO_ENABLED=0 `go build ./...` AND `go vet ./...`
green in an isolated `git worktree` at HEAD (224be9a) with ONLY this diff applied.
The shared checkout's `make go-build` is currently broken by UNRELATED parallel-agent
WIP (uncommitted `cmd/datalaked/main.go` + `go.mod` rework: kgo API mismatch — not
touched by this change); building the shared tree minus `cmd/datalaked` is green too,
including the modified `internal/deploy`. The emitted shell cascade was smoke-tested
locally against the real Docker daemon (all 4 branches, exact-match so a hypothetical
"runsc-falco2" runtime cannot false-positive). NOT done (deliberately, operator-node
territory): running the ansible task against the live node and a real useGVisor
deploy end-to-end — needs the operator node with the siem stack up. NOTE: the
API_DOCS.md part of this change already landed on main via 224be9a (the parallel
workspace-terminal session swept the whole modified docs/API_DOCS.md into its
commit); the Go/ansible part lands on branch `feat-runsc-falco`.

### Sources verified this session (WebFetch, 27.9.2026)

| Claim | Source | Result |
|---|---|---|
| Falco needs `--gvisor-config=<path> --gvisor-root=<path>` at startup | https://gvisor.dev/docs/tutorials/falco/ | Confirmed (quoted verbatim in defaults.yml/ansible-task.yml comments) |
| Falco generates its own config via `falco --gvisor-generate-config` | https://gvisor.dev/docs/tutorials/falco/ | Confirmed |
| runsc registered via `runsc install --runtime=<name> -- --pod-init-config=<path>` | https://gvisor.dev/docs/tutorials/falco/ | Confirmed |
| Min versions: Falco ≥ 0.33.1, runsc ≥ release-20220704.0 | https://gvisor.dev/docs/tutorials/falco/ | Confirmed (task brief's own `20221122.0` bound, stricter, kept as-is) |
| pod-init.json schema (`trace_session.points[]`, `trace_session.sinks[]`) | `pkg/sentry/seccheck/README.md` (raw GitHub) | Confirmed, quoted |
| Remote sink's registered name is literally `"remote"` | `pkg/sentry/seccheck/sinks/remote/remote.go` (raw GitHub, `const name = "remote"`) | Confirmed |
| Remote sink wire format: `SOCK_SEQPACKET` UDS, protobuf-framed | `pkg/sentry/seccheck/sinks/remote/README.md` (raw GitHub) | Confirmed |
| Docker's `runtimes` daemon.json key is SIGHUP/`reload`-safe, no restart, no container disruption | https://docs.docker.com/reference/cli/dockerd/ | Confirmed |
| `com.docker.compose.project.working_dir` is a real Compose v2 container label | `docker/compose` `pkg/api/labels.go` (via search, corroborated by multiple independent sources) | Confirmed |
| Compose multi-file merge: `command` replaced, `volumes` merged by target | https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/ (via search excerpt) | Confirmed |

**Not independently re-verified:** the exact `falco --help` flag spelling against the live
0.41.3 binary already in `deploy/siem` — the ansible task itself re-checks this at run time
(`falco --help` grep) and hard-fails rather than assuming the tutorial's flags still match
byte-for-byte on this exact build. This is intentional defense, not a gap left unaddressed.

---

## Part 2 — Suricata network-IDS, gated capability-check-first (NOT ready-to-run)

**Files:**
- `deploy/suricata-network-ids/defaults.yml`
- `deploy/suricata-network-ids/ansible-task.yml`
- Explicit "deliberately NOT registered" comment in `deploy/ansible/playbooks/deploy-service.yml`
  (no other edits there); also absent from `Makefile`'s `PLATFORM_SERVICES` / `deploy-all` loop.

### What it does, in order

1. **Capability detection (read-only, always runs):**
   - Kernel major version ≥ 5 (`uname -r`).
   - NIC driver name via `ethtool -i <iface>`, compared against a **best-effort, explicitly
     non-exhaustive** allowlist of known native/driver-mode-XDP-capable drivers
     (`i40e, ixgbe, ice, igb, igc, ena, nfp, mlx4_en, mlx5_core, bnxt_en, thunder-nic, nicvf,
     dpaa2-eth, qede, netsec, sfc, virtio_net, veth, tun`).
   - Prints a **CAPABILITY REPORT** debug block with every input and the heuristic verdict —
     this is the thing a human is meant to read before ever touching `suricata_enable_xdp`.
2. **Installs Suricata via apt in the always-safe default mode** — plain `af-packet`, **no
   `xdp-mode` key at all** — regardless of what the capability check found. This matches
   `deploy/siem/README.md`'s own documented honest fallback and always works.
3. **Re-checks capability against the actually-installed binary** via `suricata --build-info`,
   parsing `XDP support: yes|no`.
4. **Only if ALL of** — heuristic kernel+driver check passed, **and** the installed binary's own
   `--build-info` confirms real XDP support, **and** the operator has explicitly set
   `suricata_enable_xdp: true` (default `false`, changed only via `overrides.local.yml`) — does it
   add `xdp-mode: driver` to the af-packet block. **`xdp-mode: hw` is never configured by this
   task under any combination of variables** — the AI-pasted snippet's hardware-offload mode
   (the most demanding one) was rejected on purpose.

### Honesty check on the operator's own pasted-snippet claim (task requirement #4)

**Claim to verify:** "standard distro packages of Suricata sometimes ship without eBPF/XDP
support compiled in."

**Verified TRUE**, against two independent real sources (WebFetch/WebSearch, 27.9.2026):
- https://docs.suricata.io (`capture-hardware/ebpf-xdp.html`, current + several pinned versions):
  building eBPF/XDP support requires explicit configure flags
  `--enable-ebpf --enable-ebpf-build` (plus a Clang toolchain) — i.e. it is **opt-in at build
  time**, not on by default.
- A real Suricata community forum thread (forum.suricata.io) reporting the exact symptom on
  **Ubuntu 22 apt-installed Suricata 7.0.6**: `suricata --build-info` printed
  `"eBPF support: no, XDP support: no"`, and setting `xdp-mode` anyway produced the log line
  `"af-packet: <iface>: XDP filter set but XDP support is not built-in"` — a config claiming a
  capability the binary silently doesn't have. This is precisely the "sensor pretending to work"
  failure mode Mandate 2 forbids, and precisely why step 3 above re-checks the real installed
  binary rather than trusting the pre-install heuristic alone.

**Does jimesh's planned package-manager path hit this?** Very likely yes. jimesh's own
`src/scripts/install-gvisor.sh` documents Ubuntu 22.04/24.04 as the target distro family, and the
verified forum report is against that exact distro's apt package. This is flagged as "very likely"
rather than "confirmed for every node," since it was not re-tested against jimesh's actual target
host(s) — which is exactly why step 3's runtime re-check exists as a hard technical gate rather
than relying on this session's research alone.

### The `driver` vs `hw` XDP-mode distinction (task requirement #3), verified

Per docs.suricata.io's own eBPF/XDP chapter (WebFetched 27.9.2026):
- **`xdp-mode: driver`** — runs in the NIC driver context in-kernel; needs an in-tree kernel NIC
  driver with XDP support (out-of-tree vendor drivers, e.g. Intel's out-of-tree ones, explicitly
  called out as lacking it). Broadly compatible with any qualifying driver/kernel combination.
- **`xdp-mode: hw`** — offloads the eBPF program onto the NIC's own hardware/firmware; needs a
  specific offload-capable chipset (Netronome is the example given in the docs) and has additional
  documented limitations (e.g. CPU/interface redirect maps unsupported as of Linux 4.19 in hw
  mode). Far narrower hardware compatibility than driver mode.
- This confirms the task brief's premise: `driver` is the correct, broadly-compatible choice; the
  AI-pasted snippet's blind `xdp-mode: hw` default would have been the least portable, most
  failure-prone choice available, with zero capability check — exactly what this task avoids.

### Honest limitation on the driver-detection method itself (task requirement #1)

There is **no single authoritative, generically-reliable way** to detect true AF_XDP/zero-copy
driver support from the outside without attempting a real XDP program load on the exact
kernel+driver+NIC combination. Verified against the kernel's own AF_XDP documentation
(`kernel.org/doc/html/latest/networking/af_xdp.html`, WebFetched 27.9.2026): it **explicitly
declines to publish a canonical driver list** and instead points to a netlink feature-query
mechanism (`NETDEV_XDP_ACT_XSK_ZEROCOPY` via `XDP_FEATURES`) as the only fully authoritative
runtime check.

Two honest options existed per the task brief: (a) `ethtool -i` driver name vs. a known-list, or
(b) a dry-run XDP program load. This implementation uses **(a)**, explicitly documented in
`defaults.yml` as a heuristic, non-exhaustive, non-authoritative signal — "worth investigating
further," never a green light on its own. Option (b) was deliberately **not** implemented: doing
it honestly would require shipping a prebuilt eBPF object file into the repo (a binary blob this
task has no way to independently verify or keep honest), and would false-negative on any host
without a local clang/llvm toolchain to build one on the spot. Declining to fabricate that check
was judged more honest than pretending to offer one.

### Why this stays fully gated (task requirement #5)

- **Not** added to `deploy/ansible/playbooks/deploy-service.yml`'s registration comment block
  (that comment explicitly calls this out) and **not** added to `Makefile`'s `PLATFORM_SERVICES`
  / `deploy-all` loop — so nothing in this repo's automation will ever reach this service on its
  own.
- `suricata_enable_xdp` defaults to `false` and can only be flipped via the operator's own
  gitignored `overrides.local.yml` (same pattern as every other service's operator overrides) —
  never a repo-tracked change.
- The task's own header banner and closing debug message both restate, in the same file a future
  operator will actually run, that this needs to be executed once by hand against the real target
  node and its capability report read before `suricata_enable_xdp` is ever considered — mirroring
  `deploy/siem/README.md`'s existing "None of that is decided for this host" caveat for the exact
  same v2 Suricata XDP path.

---

## Everything independently verified vs. flagged as unconfirmed (consolidated)

**Verified this session (WebFetch/WebSearch, 27.9.2026), with sources inline in the files
themselves:**
- gVisor Falco tutorial's exact flags/steps, pod-init.json schema, remote sink name/wire format
  (raw GitHub sources + gvisor.dev tutorial page).
- Docker daemon `runtimes` key is live-reloadable without restart/disruption (docs.docker.com).
- Compose v2's `com.docker.compose.project.working_dir` label and its multi-file merge semantics
  for `command` vs `volumes` (docker/compose source + docs.docker.com).
- Suricata distro packages commonly lacking eBPF/XDP (docs.suricata.io + a real forum report
  showing the exact `--build-info` output and warning line).
- The `driver` vs `hw` XDP-mode compatibility distinction (docs.suricata.io).

**Explicitly flagged as NOT independently verified / best-effort only:**
- Exact `falco --help` flag spelling on the live 0.41.3 binary in `deploy/siem` — the ansible task
  re-checks this itself at run time rather than assuming it from the (non-version-pinned) tutorial.
- Whether jimesh's actual target node(s) hit the Suricata apt eBPF/XDP gap — very likely per the
  forum evidence, but not re-tested against a real jimesh host; gated behind the runtime
  `--build-info` re-check rather than assumed.
- Completeness of the NIC-driver XDP-capability allowlist — the kernel's own docs state no
  canonical list exists; this list is explicitly non-exhaustive and non-authoritative.

## Constraints honored

- No `ansible-playbook`/`make redeploy` was executed. No SSH connection was made. No remote server
  was touched. Pure file authoring in this local checkout.
- `docs_dev/` is gitignored in this repo (confirmed via `git status` / `.gitignore` before writing
  this file) — nothing here was committed, per the task's own instruction not to force-add it.
