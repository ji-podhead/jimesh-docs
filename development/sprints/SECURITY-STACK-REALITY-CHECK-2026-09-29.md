# SECURITY STACK REALITY CHECK — 2026-09-29

Re-verification of Leo's 6 verbatim claims against the actual source code and the most recent
real, dated evidence in the repo (git log, ansible tasks, and last night's own handoff docs —
not prior-session summaries). Repo: `/home/ji/projects/jimesh`, read-only.

---

## 1. eBPF (Tetragon) — **PARTIALLY WORKING**

**Verdict: the eBPF layer itself is real, deployed, and live-verified on trading — but the
guard-hook's actual USE of it is off by default, and nothing in this session can prove that
setting was ever flipped.**

- `deploy/tetragon/jimesh-guard-kill.yaml` — a real Tetragon v1.7.1 `TracingPolicy` CRD
  (`cilium.io/v1alpha1`), verified against upstream source, with an exec-gate kprobe on
  `security_bprm_check` that SIGKILLs a marker exec inside any non-host mount namespace
  (lines 61–90), plus exec/ptrace watch selectors (91–131). Not a mock: the file is a real
  kernel enforcement policy.
- `deploy/tetragon/ansible-task.yml` hard-fails the whole deploy unless a **live kill-probe**
  (a throwaway container executing the marker) is actually SIGKILLed (exit 137) — lines
  240–272. A deploy cannot report green without a real kill happening. This is a strong
  anti-mock design.
- **It was actually run, not just written.** `docs/sprints/OPEN-ITEMS-2026-09-28.md:120,136`:
  *"TETRAGON AUF TRADING DEPLOYED"* and *"TETRAGON LIVE-VERIFIZIERT (28.9. ~07:00): Kill-Probe
  exit 137 (SIGKILL)"*. `docs/sprints/HANDOFF-2026-09-28-FINAL.md:43`: *"Tetragon v1.7.1: läuft;
  Kill-Probe exit 137 — jimesh-guard-kill-Policy greift KERNEL-seitig."* Commit `31811757`
  ("Erstrun-Funde") independently confirms a real first run hit and fixed a genuine crash-loop
  bug (wrong `--export-rotation-*` flags) — you don't hit a flag-parsing crash loop on a mock.
- **The catch:** `src/backend/internal/ai/guard_enforce.go:68` — the setting that actually
  makes the Llama-guard-hook TRIGGER this kill switch, `guard_scanner.enforcement`, is
  **"Default AUS"** (default off) per the file's own comment at line 17. Tetragon-the-daemon is
  live on trading; whether the application-level wiring that would make it fire on a real
  prompt-injection is switched on cannot be verified without a live DB read, and nothing in any
  doc confirms the setting was ever turned on.
- Sprint doc itself (`docs/sprints/SPRINT-139-TETRAGON-EBPF-ENFORCEMENT.md:36`) originally
  marked the live-deploy work package "WP7 offen — Operator"; the ansible-task first-run fixes
  and the OPEN-ITEMS/HANDOFF confirmations from 28.9 show WP7 was subsequently completed.

**Bottom line: Leo is wrong that eBPF "doesn't exist" — this is the most solid, most honestly
built-and-proven piece of the whole list. But it is not "guard-hook enforcement is active"
either, since the trigger setting defaults off and no live confirmation exists that it's on.**

---

## 2. Threat detection (SPRINT-147 correlation) — **PARTIALLY WORKING (functionally starved right now)**

**Verdict: the correlation endpoint's own code is real and well-built — no invented findings, no
fake "all clear." But its live usefulness right now is close to zero, for a documented,
concrete reason: its Falco data source is currently starved by the broken SIEM stack (see #3),
and its Suricata data source has no confirmed live deployment.**

- `src/backend/internal/gateway/threat_correlation.go` — `GET /api/security/threat-correlation`
  reads two REAL, independent sources and fuses them:
  - Falco side: `s.svc.Store.ListSDKLogs(...)` (line 350) — a plain read of already-durable
    `security_events`/sdk_logs rows, no invented data.
  - Suricata side: a live SSH probe to the threat-responder host via
    `suricataDial`/`suricataExec` (lines 371–388) — reused from `threat_responder.go`'s own
    status handler so the two never disagree.
  - `correlate()` (206–247) does real container-name + time-window fusion — genuine logic, not
    decoration.
  - Every source failure is honestly reported via `FalcoAvailable`/`ThreatResponderAvailable`
    booleans and a closed `NoteKey` enum (271–291: `both_unavailable`, `falco_unavailable`,
    `threat_responder_unavailable`, `no_data`, `no_correlation`, `correlated`) — this handler
    is explicitly designed to never claim "no threats" when it actually means "could not check."
    That is good engineering, not slop.
- **Why it's practically useless right now:** `deploy/siem/docker-compose.yml:286–289` — the
  `siem-bridge` container (the ONLY thing that ships Falco events from the shared log volume
  into the DB rows `ListSDKLogs` reads) has `depends_on: wazuh.indexer: condition:
  service_healthy`. Per `docs/sprints/HANDOFF-2026-09-29-FINAL.md:65` (last night's own,
  most recent handoff): **"SIEM-Indexer (=OpenSearch) deployt nicht — fehlendes `root-ca.pem`,
  gen-certs.sh-Schritt scheitert. Blockiert `deploy-all` komplett."** If the indexer never
  reports healthy, docker compose never starts `siem-bridge` — meaning Falco events accumulate
  in a log file on trading but never reach the database this endpoint reads. Falco itself may
  well still be running (it has no `depends_on` gate), but its output is orphaned.
  - Net effect: `FalcoAvailable` would likely still report `true` (the DB query itself
    succeeds) but with stale or zero recent rows — the endpoint doesn't "fail," it just has
    nothing fresh to correlate.
  - Suricata/threat-responder side: no doc found confirms this was ever deployed to trading.
    `docs/sprints/OPEN-ITEMS-2026-09-28.md:36` and the threat-responder README both say the
    deploy command must be run "**einmal von Hand**" (once, by hand, by the operator) —
    last night's HANDOFF-2026-09-29-FINAL.md does not mention threat-responder/Suricata at all
    among either completed or outstanding items, so its live status on trading is unconfirmed.

**Bottom line: this is the precise "code works, upstream is dead" case the task asked to
distinguish. Leo experiencing "threat detection doesn't work at all" right now is very likely
literally true in practice — not because the correlation code is fake, but because one of its
two real inputs is currently starved by the broken Wazuh indexer, and the other has no
confirmed live deployment at all.**

---

## 3. Wazuh/SIEM — **CONFIRMED BROKEN RIGHT NOW (built once, currently non-functional)**

**Verdict: this is the one where Leo is most simply right, and no amount of good IaC excuses it.
The stack was built with real rigor and was live-verified once — but the most recent, most
authoritative note in the repo says it is broken on trading, right now, blocking automated
deploys entirely.**

- The IaC is genuinely serious: `deploy/siem/ansible-task.yml` hard-fails on indexer health
  (258–279), manager health (281–300), dashboard health (302–321), and a real Falco tripwire
  probe with before/after event counting (341–404) — this is not rubber-stamp verification.
- It clearly worked at least once: `docs/sprints/BUILD-2026-09-28-SIEM-IAC.md:25,193` and
  `docs/sprints/SPRINT-61-SIEM-IAC.md` describe this exact live verification passing.
- **But `docs/sprints/HANDOFF-2026-09-29-FINAL.md:65` — literally last night's session-end
  handoff, the newest and most authoritative status document in the repo — states, present
  tense: "SIEM-Indexer (=OpenSearch) deployt nicht — fehlendes `root-ca.pem`, gen-certs.sh-
  Schritt scheitert. Blockiert `deploy-all` komplett (bricht dort ab, alles danach in der Liste
  läuft nicht mehr automatisch mit)."** This is not "never built" and not merely "IaC has a
  bug" — it is "was working, is currently down, and takes the rest of the automated deploy
  chain down with it."
  - `deploy/siem/gen-certs.sh` (root cert generation) is idempotent and gitignored
    (`deploy/siem/.gitignore:2`) by design — certs must exist per-node. On this dev checkout a
    real 1204-byte PEM exists locally (`deploy/siem/config/root-ca/certs/root-ca.pem`), but that
    proves nothing about trading's node-local state; the HANDOFF entry is the live, current
    signal and it says trading's copy/step is broken.
  - Same handoff, point 4: **Falco-gVisor-integration also does not deploy** (falco 0.41.3
    doesn't expose the expected `--gvisor-*` flags) — a second, separate SIEM-adjacent breakage
    noted the same night.

**Bottom line: never-worked vs. worked-once-then-broke vs. currently-broken — this is squarely
"worked once (28.9, live-verified), then broke, and is confirmed broken as of the most recent
handoff (29.9)." Good code and a rigorous ansible task do not change the fact that the live
service is down right now. Leo is right here.**

---

## 4. SAST (gosec + trivy) — **WORKING NOW (automatic, not manual)**

**Verdict: Leo's specific claim ("no SAST scan that runs automatically") is factually wrong —
this one is wired into the automatic deploy path, not a manual button nobody clicks.**

- `src/backend/internal/scanner/iac.go` defines pinned, real scanners: Checkov
  (`CheckovImage`, line 42), Gosec (`GosecImage`, 44), Trivy (`TrivyImage`, 46), with real JSON
  parsers (`ParseCheckovJSON`, `ParseGosecJSON`, `ParseTrivyJSON`).
- `src/backend/internal/deploy/quarantine.go:253` `runIaCQuarantineGate` is called from
  `src/backend/internal/deploy/projects_ssh.go:2312` — **directly inside the workspace deploy
  handler itself**, right after the container comes up, with no manual trigger required.
  Default posture is `case "", "on":` (quarantine.go:255–259) — gate ON unless the caller
  explicitly passes `iacGate=off`.
  - `runIaCQuarantineGate` calls `h.runSASTStage(g)` at line 314, which runs Gosec when the
    workspace carries Go source, otherwise Trivy against the runtime image
    (`quarantine.go:425–480) — every deploy, automatically, no operator action.
  - Every finding is written to `security_events` as `sast_finding` rows (342–350).
- Frontend: `src/frontend/src/views/SecurityScansPage.tsx:294–317` (`SecurityScansSastPage`,
  route `/security/scans/sast`) reads these via `useSecurityEvents('sast')` — real, live data,
  not a mock. A fresh install would show the real `EmptyState` (line 317) only until the FIRST
  workspace deploy runs — which triggers the scan itself, automatically.

**Caveat (scope, not a flaw):** this SAST gate applies to AI-agent **workspace/project deploys**
inside jimesh (the IaC-gate/quarantine pipeline), not to jimesh's own infrastructure service
deploys (tetragon/siem/etc. via `make redeploy SERVICE=...`) — those have no SAST stage of their
own. If Leo meant "SAST on jimesh's own codebase," that specific thing does not exist
automatically; if he meant "SAST scan that nobody has to manually click," that exists and runs
by default on every workspace deploy.

**Bottom line: Leo is wrong here as literally stated. Real, automatic, wired into the actual
deploy path by default.**

---

## 5. OPNsense — **CONFIRMED STUB (unchanged)**

**Verdict: exactly as previously found — zero backend, and nothing changed tonight.**

- Backend: a repo-wide grep for `opnsense` across all Go source in `src/backend` returns **zero
  hits**. No route, no handler, no client, nothing.
- Frontend: `src/frontend/src/views/OpnsenseFirewallConfigPage.tsx:302–329` — the credentials
  tab explicitly renders an amber "not implemented" banner with the code comment *"Honest
  not-implemented banner: no route stores these credentials — a 'save' would be fake success
  (Mandate 2)"* (302–303), and *"The design's 'Verify Connection' spinner would always be a lie
  — disabled with the reason at the control itself"* (322–323). Every input on that tab is
  `disabled`.
- The single most recent commit in the entire repo (`6771f871`, HEAD) is
  *"fix(frontend): OpnsenseFirewallConfigPage crashed — Sync doesn't exist in lucide-react"* —
  i.e., as of moments before this check, this exact stub page was actually crashing the
  frontend and had to be patched just to render its own honest "not implemented" state.

**Bottom line: Leo is right, and this is the one item where he was already told this
accurately — nothing has changed.**

---

## 6. General "slop mock" spot-check on tonight's newest work

Picked: SPRINT-154 protected-projects delete-guard (the most recently touted "real" security
feature), plus the OPNsense crash fix already covered above as a second data point.

**SPRINT-154 protected-projects delete-guard — MOSTLY WORKING, but with a genuine, self-
contradicting paper trail worth flagging.**

- The code is real and in the current tree: `src/backend/internal/gateway/gateway.go:292`
  registers `mux.HandleFunc("PATCH /api/projects/{id}/internal", s.handleProjectInternalToggle)`;
  `src/backend/internal/store/store.go:317–322` adds the `is_internal` column and seeds
  `UPDATE projects SET is_internal = 1 WHERE id = 'platform-internal'`; the delete path
  (`src/backend/internal/deploy/projects_ssh.go:3187,3259`) refuses deletion of an internal
  project with an honest, actionable error message. Tests exist end-to-end
  (`project_internal_test.go`, `project_internal_delete_test.go`).
- **But the sprint doc's own paper trail contradicts its commit title.** Commit `ba45381c`
  ("docs(s154): Nachverifikations-Abschnitt — **bestätigt dass PATCH-Route + Seed bereits
  angewandt und live sind**" — "confirms PATCH route + seed are already applied AND LIVE") adds
  a section to `docs/sprints/SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md` whose actual text says
  the opposite: *"**Noch offen (nur Operator):** die gateway.go-Registrierungszeile + die
  store.go-Seed-Zeile aus dem Abschnitt oben anwenden, dann `make up` / `make restart-backend`
  ... **bis dahin ist die PATCH-Route nicht live** und platform-internal ungeschützt."* ("Still
  open (operator only): apply the gateway.go registration line + store.go seed line, then
  restart the backend... **until then the PATCH route is not live** and platform-internal is
  unprotected.")
  - The code IS in the committed tree (verified directly above) — an earlier commit
    (`fbf8e26c`) applied it. What's unverifiable from here is whether the trading backend
    container has actually been restarted since, to pick up this code (the backend
    self-compiles at container start, same pattern as siem-bridge) — the commit message
    claims "live," its own diff content says "not live until restarted," and there is no live
    SSH check available to settle which is true right now.

**This is a small but real instance of exactly the pattern Leo is angry about**: a commit
message asserting something is confirmed live, while the artifact it's committing says, in its
own words, that it isn't live yet. The underlying feature is genuine (not an invented mock), but
the "is it live" claim in tonight's own commit history cannot be taken at face value — which is
the whole reason Leo doesn't trust summaries anymore.

---

## Bottom line — plain count, no softening

Of Leo's 6 specific claims:

1. eBPF/Tetragon exists and works — **Leo is WRONG** (real, deployed, live-proven kill-switch on
   trading; only the application-level trigger's on/off state is unconfirmed).
2. Threat detection doesn't work at all — **Leo is RIGHT in practical effect right now**
   (real correlation code, but starved: Falco pipeline is currently blocked by the broken SIEM
   indexer, Suricata/threat-responder has no confirmed live deployment at all).
3. No proper Wazuh/SIEM — **Leo is RIGHT** (built and live-verified once on 28.9, confirmed
   broken again as of last night's own handoff, 29.9 — currently non-functional on trading).
4. No SAST that runs automatically — **Leo is WRONG** (real gosec/trivy stage, wired into every
   workspace deploy by default, no manual trigger required).
5. No proper OPNsense/firewall integration — **Leo is RIGHT** (0% backend, explicitly
   labeled "not implemented" in the UI itself, unchanged).
6. "There's nothing, just slop mock" (general claim) — **not true as a blanket statement**, but
   partially earned: at least one tonight-committed doc (SPRINT-154) makes a "confirmed live"
   claim its own diff contradicts, and the single newest commit in the repo was a crash-fix for
   the one feature (OPNsense) that was already known to be a total stub.

**Count: Leo is factually right on 3 of his 6 specific claims (threat detection, SIEM/Wazuh,
OPNsense), wrong on 2 (eBPF, SAST), and the 6th ("nothing, just slop") is an overgeneralization
that nonetheless correctly smells a real, ongoing problem — commit messages in this repo
overclaiming "live" status that the commit's own content, or the current infrastructure state,
does not support.**
