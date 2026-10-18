# SPRINT-139 — TETRAGON-EBPF-ENFORCEMENT (RM32-Nachtrag)

> **Branch:** `feat-tetragon-ebpf` · **Datum:** 27.9.2026
> **Operator-Trigger, verbatim:** "bitte bitte bitte endlich mit ebpf machen" —
> die erste echte Tetragon-TracingPolicy dieses Repos.
> **Konzept-Basis:** /home/ji/projects/jimesh-crew/docs/planning/sprints/
> rm32_guardrails_concept.md, Nachtrag "echtes eBPF-Enforcement-Tool" +
> docs_dev/knowledge/container-and-runtime-security/sandboxing/r25-tetragon-gvisor-kata.md.

## Problem

Der Llama-Guard-Hook (`internal/ai/guard_hook.go`) ERKENNT Prompt-Injections
(vor dem Upstream-Dispatch, mit 403/redact + `security_events`) — aber das
Enforcement war nur "log + event". Der Operator wollte die Kernel-Durchsetzung:
**den Prozess killen, der die Injection ausführt** (defense in depth — selbst
wenn injizierter Code an einer späteren Stelle weiterläuft).

## Plan (vor Implementation, Mandat 1 §2)

Ziel: Tetragon (Cilium, eBPF, real & sofort verfügbar — BpfJailer ist NICHT
open source, s. RM32-Konzept-Doc) als Enforcement-Layer auf dem Node; der
Guard-Hook triggert per docker exec einen Kill-Switch-Marker, die
TracingPolicy SIGKILL't den Marker-exec im Kernel (security_bprm_check, VOR
dem exec).

### Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `deploy/tetragon/jimesh-guard-kill.yaml`: TracingPolicy (cilium.io/v1alpha1), Schema gegen echten Tetragon-v1.7.1-Quelltext verifiziert — exec-Gate (matchArgs Prefix `/tmp/jimesh-guard-kill`, matchNamespaces `Mnt NotIn host_ns`, matchActions `[Post, Sigkill]`) + exec-/ptrace-Watch (Post, rateLimit 1s/process) | [x] |
| WP2 | `deploy/tetragon/{docker-compose.yml,defaults.yml,ansible-task.yml}`: Standalone-Container-Deploy (Upstream-Form: pid host, cgroup host, privileged, BTF-Mount, gRPC-Unix-Socket — kein published Port, Mandat 12), tetra-CLI aus Release-Tarball (sha256), LAUT-failende Prereqs (BTF, Kernel ≥ 4.19, compose, Image-Pull) und **Live-Kill-Probe** (Throwaway-Container exec't den Marker; exit 137 Pflicht, sonst Mandat-2-Hard-Fail) | [x] |
| WP3 | Backend-Wiring `internal/ai/guard_enforce.go`: Setting `guard_scanner.enforcement`=="ebpf" (Default AUS, Mandat 2), Session→Container-Auflösung (nur `provisioned`, K-LAF §2), Dispatch wie freeze.go (lokal docker.sock / remote SSH-Pool, ~20 Zeilen bewusst dupliziert nach freeze.go-Vorbild), Marker-exec-Kommando, Exit-Code-Protokoll 137/42/sonst → `security_events` (Scanner `tetragon-ebpf`), async mit eigenem 10s-Timeout | [x] |
| WP4 | `guard_hook.go`: beide BLOCKED-Pfade (request-403 UND unsafe-response) feuern `go enforceGuardKillEBPF` wenn das Setting an ist — ohne Setting Verhalten unverändert | [x] |
| WP5 | Tests `guard_enforce_test.go`: 4 reine Protokoll-Tests (Suffix-Sanitize, Container-ID-Validierung, Marker-Kommando-Quoting, Exit-Code-Übersetzung inkl. echtem `sh -c 'exit 137'` + ssh-`ExitStatus()`-Interface-Compile-Zusicherung) + 1 DB-Test (Gating + ehrlicher `ebpf_enforcement_skipped`-Skip) | [x] |
| WP6 | Docs: `deploy/tetragon/README.md` (Mechanismus, Deploy, Exit-Code-Tabelle, **Test-Procedure "Injection → Kill → Event-Log"**, Grenzen: gVisor-Blindheit, Marker-Pfad-Scoping, exec-Watch-Volumen, ptrace watch-only) + API_DOCS (Setting-Key, tetragon-ebpf-Events) + dieses Sprint-File + Backlog-Spiegel | [x] |
| WP7 | Live-Deploy auf einer echten Node + E2E-Durchlauf der README-Test-Procedure (Operator) | [ ] offen — Operator |

### Akzeptanzkriterien (vorab)

1. `make go-build` bzw. scoped Build der berührten Pakete: RC 0 (CGO_ENABLED=0, keine neuen go.mod-Deps — `x/crypto/ssh` war via network schon direkte Dependency).
2. yaml-lint auf die Policy: Parse + Struktur-Check gegen das verifizierte v1.7.1-CRD-Vokabular.
3. Kein Fake-Enforcement: Tetragon-Abwesenheit messbar (exit 42 → `ebpf_enforcement_missed`), nie ein vorgetäuschter Kill.
4. Deploy ohne funktionierenden Kill ist unmöglich: ansible Live-Kill-Probe failt laut, wenn die Policy nicht durchgreift.
5. Docs in demselben Change (Mandat 1): README + API_DOCS + Sprint + Backlog.

## Ergebnis (verifiziert am 27.9.2026 — Retrospektive-Honesty, Mandat 1 §4)

Alle WPs umgesetzt; Verifikation wie gefordert, mit ehrlichen Abweichungen:

- **Build:** scoped `go build ./internal/ai/ ./internal/network/ ./internal/security/`
  im golang:latest-Container: **RC 0**. Der VOLL-Repo-Build (`make go-build`)
  scheitert aktuell NUR an fremden, ungetrackten In-Flight-Dateien aus einem
  anderen Workstream (`internal/gateway/files.go`/`embed.go` referenzieren
  nicht existierende `Server.bucketOnce`-Felder) — NICHT an diesem Sprint;
  meine berührten Pakete bauen sauber. Nachmerge-Check ausstehen lassen,
  sobald jener Workstream settle.
- **Vet/Format:** `go vet ./internal/ai/` RC 0, `gofmt` clean auf beiden
  neuen Dateien.
- **Tests:** `go test ./internal/ai/ -count=1` → **ok, 12/12** (5 neue + 4
  Guard- + 3 Provider-Tests) gegen die Throwaway-DB `jimesh_test`
  (CREATE+DROP wie `make go-test`). Ehrliche Anpassung: lief über
  `--network host` + Port 127.0.0.1:5432, weil im aktuellen In-Flight-Stack-
  Zustand Container→Postgres über jimesh-net tot ist (`pg_isready`: no
  response; der dev-backend-Container selbst stirbt auf dial timeout) —
  Umgebungsproblem des fremden Workstreams, hier nur dokumentiert.
- **Fund + Fix (Mandat 8, Fresh-DB-Bootstrap-Klasse):** `models`-Tabelle
  shippte im CREATE TABLE die `description`-Spalte NICHT — der guarded ALTER
  oben in migrate() läuft auf frischer DB VOR dem CREATE, failt stumm, und
  UpsertModel (Guard-Chain-Seeding) starb bis zu einem zweiten migrate()-Pass.
  Kontrollexperiment: der BESTEHENDE TestGuardCheckResponse_… allein gegen
  frisches jimesh_test schlug VOR meinem Fix identisch fehl — meine neue
  Testdatei (alphabetisch zuerst) hat den Bug nur exponiert. Fix nach dem
  dokumentierten TASK-076/fix-project-server-select-Muster: Spalte shippt mit
  dem CREATE, der ALTER bleibt für Legacy-DBs (store.go, 3. Fall dieser
  Klasse nach projects/containers).
- **yaml-lint:** python `yaml.safe_load` auf alle 4 Deploy-Dateien OK +
  Struktur-Check des Policies gegen das v1.7.1-Vokabular (call/syscall/args/
  selectors/matchNamespaces/matchArgs Prefix/matchActions Sigkill+Post/
  rateLimit+rateLimitScope) OK + `docker compose config` OK (nach Fix:
  `cgroupns` war das docker-run-Flag, der Compose-Key heißt `cgroup` — vom
  Compose-Validator selbst erwischt).
- **Marker-Protokoll-Dry-Run (ohne Tetragon):** das exakte ansible/README-
  Probe-Kommando in alpine:3.20 → **exit 42 + `JIMESH_GUARD_EXIT=42`** — der
  ehrliche "missed"-Pfad funktioniert genau wie designed. Der 137-Pfad wird
  zur Deploy-Zeit von der ansible Live-Kill-Probe erzwungen (exit 137 Pflicht,
  sonst Hard-Fail). Auf dieser Dev-Box wurde KEIN privilegiertes eBPF-Deploy
  ausgeführt (Kernel 6.14 + BTF wären da, aber eBPF-Sicherheitstechnik mit
  echtem Blast-Radius installiert der Operator über `make redeploy
  SERVICE=tetragon NODE=<name>` auf der Ziel-Node — nicht ein Subagent auf
  dem geteilten Dev-Host).
- **Upstream-Recherche (27.9., wirklich abgerufen):** Tetragon v1.7.1-Release
  (Assets tetragon-v1.7.1-<arch>.tar.gz + tetra-linux-<arch>.tar.gz +
  sha256sums), types.go-Feldnamen, Beispiele security_bprm_check.yaml /
  killer.yaml / sys_ptrace.yaml / fd_install_ns_host.yaml, installation/
  container.md (Standalone-Form), daemon-configuration.md (unix-socket gRPC,
  --export-filename/-rotation), FAQ (Kernel ≥ 4.19, BTF). Tetragon-Knowledge
  r25 deckt die gVisor-Einschränkung (Host-eBPF sieht nur den Sentry).

### Design-Entscheidung, dokumentiert (Operator-Idee vs. eBPF-Realität)

Die Operator-Skizze: "Guard-Hook setzt Markierung-File via docker exec;
Policy killt execs, wenn das File existiert". eBPF-TracingPolicies sind pro
Event ZUSTANDSLOS — ein File-Existenz-Prädikat gibt es im Selektor-API nicht
(gegen v1.7.1-Quelltext verifiziert). Umsetzung des INTENTS mit dem, was der
Kernel wirklich sieht: das **EXEC des Marker-Pfades** ist das Trigger-
Ereignis (der Hook schreibt UND exec't `/tmp/jimesh-guard-kill.<session>`;
`security_bprm_check` + matchArgs Prefix → SIGKILL vor dem exec; der
Suffix trägt die Session-ID für die Attribution im Event-Log). Der schlichte
`/tmp/jimesh-guard-kill`-Touch bleibt als forensisches Mal im Container —
der "Markierung-File"-Teil der Operator-Idee bleibt also physisch vorhanden.
Scoping: der Marker-Pfad ist jimesh-exklusiv (kein legitimer Prozess exec't
ihn), statt Containernamen (ohne K8s-Labels nicht ausdrückbar); der Hook
docker-exec't ohnehin gezielt in den Container der geblockten Session.

## Offene Punkte (ehrlich)

1. **WP7 Operator-Live-Durchlauf:** Tetragon auf einer Node deployen
   (`make redeploy SERVICE=tetragon NODE=<name>` — die eingebaute Probe
   verifiziert den Kill live) und die README-Test-Procedure mit einem echten
   Testagent durchziehen (`ebpf_kill_enforced`-Event + Kill im
   Tetragon-Event-Log).
2. **gVisor/runsc:** für Host-eBPF unsichtbar — der Hook erkennt das ehrlich
   zur Laufzeit (exit 42 → `ebpf_enforcement_missed`). Die gVisor-Seite
   bleibt beim seccheck/Falco-Setup (Beobachtung, kein Kernel-Kill).
3. **ptrace:** heute watch-only (Post). Hochfahren auf SIGKILL ist eine
   Folge-Policy, wenn die Betriebsdaten strace/gdb-Nutzung in Agent-
   Containern als tolerierbar oder nicht belegen.
4. **exec-Watch-Volumen:** 1 Event/s/Prozess in `/var/log/tetragon/` —
   Rotation gesetzt (50 MB × 5, compressed); Selector notfalls streichen.
5. Fremdes In-Flight: gateway/files.go-Buildbruch + jimesh-net→Postgres-Tot
   störenRepo-weite Checks, bis jener Workstream settle.
