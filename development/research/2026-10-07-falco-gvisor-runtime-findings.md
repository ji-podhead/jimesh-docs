# Forschung: Falco & gVisor — gemessene Befunde (Stand 7.10.2026)

> Ergänzt `docs/research/networks_gvisor.md` (dort: Netzwerk-Thema). Hier: **alles, was in den
> Sprints rund um Falco + gVisor gemessen wurde** — jeweils mit Quelle.
> Grundregel (Mandat 2): nur Belegtes. Was nicht nachgemessen werden kann, steht als
> „nicht verifiziert" da und nirgends sonst.

## 0. Statuslegende — was „belegt" hier bedeutet

| Marker | Bedeutung |
|---|---|
| ✅ **BELEGT** | Messung mit Quelle, die ein Dritter nachmachen kann: Repo-Datei mit `Pfad:Zeile`, Git-Commit, **oder** eigene Nachmessung am 7.10.2026 (Befehl steht dabei) |
| 🟡 **SESSION-BELEGT** | In der Eltern-Session (S186/S187-Auslauf) gemessen, aber **nicht** im Repo dokumentiert — Beleg existiert nur im Session-Transkript (`~/.local/share/opencode/opencode.db`), hier nicht unabhängig reproduziert |
| ⛔ **THEORETISCH** | keine Messung vorhanden: Hypothese, Interpretation oder offene Frage |

---

## 1. Executive-Zusammenfassung

1. **Belegt:** `falcosecurity/falco:0.41.3` startet auf Kernel `7.0.0-34-generic` nicht
   (`BPF program is too large. Processed 1000001 insn (limit 1000000)`, `prog 'sendmmsg_x': failed to load: -7`,
   Restart-Loop) → Pin auf `0.42.0` (Commit `386454f8`, 3.10.2026). Heute: `0.42.0`, **0 Restarts**.
2. **Belegt (Repo + Nachmessung):** Die gVisor-Engine **ersetzt** die Basis-Engine, sie ergänzt
   sie nicht — mit `engine.kind=gvisor` sensort Falco *nur* gVisor-Sandbox-Tracepoints „INSTEAD of
   host-wide syscalls"; „Beides gleichzeitig braucht eine ZWEITE falco-Instanz". Laufend (7.10.
   10:0x): **28 Container = 27 `runc` + 1 `runsc`** (Workspace `utility-proj-…`, Runtime `runsc`,
   nicht `runsc-falco`); der gVisor-Override ist **nicht** aktiv (kein `gvisor.sock`) → die
   27 runc-Container sieht definitionsgemäß nur die Basis-Engine.
3. **Belegt:** Betriebszustand ist deshalb **Basis-Falco**: `jimesh-siem-falco` = `0.42.0`,
   `restarts=0`, `runtime=runc`, `falcosecurity_scap_engine_name_info{engine_name="modern_bpf"}`,
   Webserver-Metrik
   `falcosecurity_scap_n_evts_total = 171 256 006` (7.10. 10:07; Logs-Wert 169 709 931 →
   169 836 395), `falcosecurity_falco_rules_matches_total` summiert auf **7**;
   SIEM-Stack = Wazuh 4.14.7 (manager/indexer/dashboard, alle healthy) + Falco + siem-bridge
   (liefert live Events an, `[siem][falco] shipped 1 event(s)` zuletzt 08:09 UTC).
4. **Belegt:** **Defekt 2** (Ursache bewiesen, nicht behoben): `engine.gvisor.root` zeigt auf
   `/var/run/docker/runtime-runsc-falco/moby` — dieses Verzeichnis hat **0 Einträge**, während
   Docker sämtliche Container unter `/var/run/docker/runtime-runc/moby` anlegt (**32** Einträge =
   28 Verzeichnisse + 3 Dateien + 1 Socket, nachgemessen 7.10. 10:0x). Falco liest den Sandbox-Anschluss
   nie (`Send-Q=2116`, CPU `00:00:00`, 0 neue Events — `BACKLOG.md:1807-1816`).
5. **Belegt:** runsc-Metric-Server **läuft als Testcontainer** `gvm-test` (seit 7.10. 06:39 UTC,
   eigene Messung): antwortet auf `jimesh-net:9797` mit den Metriken
   `runsc_meta_num_sandboxes_{running,total,broken_metrics,checkpointed,restored}` — **alle 0,
   obwohl `runsc --root=… list` 1 laufende Sandbox meldet**. `--metric-server` fehlt weiterhin in
   `daemon.json` (eigene Messung) und in jeder Repo-Datei (`grep` ohne diese Datei = 0); Prometheus scrapt keinen
   runsc-Target (0 Treffer). Die sandbox-seitige Flag-Lücke ist die doku-gestützte Erklärung (E2/E12),
   nicht durch Logs der Sandbox bestätigt.
6. **Offen:** Engine-Wechsel-/Zweite-Instanz-Frage, der Override-Konflikt (jeder
   `siem`-Redeploy nimmt den gVisor-Override ab), der Metric-Server-Rollout — **und** der
   Zeithorizont: Falco **0.43 deprecat** und **0.44 entfernt** die gVisor-Engine.
7. **Nicht verifiziert:** Das A/B-Experiment-Protokoll selbst, die Zahl „26 Container damals"
   und die These „Pfadumstellung kostet runc-Sicht" existieren **nicht im Repo**
   (Details Abschnitt 6). Der Metrik-Name `runsc_meta_num_sandboxes_*` ist dagegen inzwischen
   **eigenständig nachgemessen** (B25) und damit belegt.

---

## 2. Beweistabelle

### 2.1 ✅ BELEGT (Repo-Beleg und/oder Nachmessung 7.10.2026)

| # | Befund | Methode / Messung | Ergebnis | Quelle |
|---|---|---|---|---|
| B1 | Falco 0.41.3 startet auf Kernel 7.0.0-34-generic nicht | `docker logs`, Restart-Zähler, Live-Vergleich (3.10.2026) | `BPF program is too large. Processed 1000001 insn (limit 1000000)` + `prog 'sendmmsg_x': failed to load: -7`, **37 Restarts**, Gate konnte nichts aufzeichnen | `docs/sprints/SPRINT-181-SLOP-AUDIT-KRITISCH.md:440` |
| B2 | Fix = 0.42.0, inkl. `/sys`-Mount (Tracepoint-IDs) | Redeploy + Live-Vergleich | `0.42.0` läuft sauber (0 Restarts), 10 → 0 Attach-Fehler | `deploy/siem/docker-compose.yml:189-200`, Commit `386454f8` („Kernel 7.0 sprengte die eBPF-Instruktionsgrenze"), `deploy/siem/defaults.yml:10`, `SPRINT-181:444` |
| B3 | eBPF-Instruktionsgrenze ist hart (Ursache von B1) | externe Doku | Grenze 1.000.000 Instruktionen (seit Kernel 5.2; davor 4.096/128k) | `docs.ebpf.io/linux/concepts/verifier` (Zugriff 7.10.2026) |
| B4 | Zweiter Falco-Defekt: runsc-Mount-Quelle war ein Verzeichnis | `stat`, `docker inspect`, `docker logs` | `/usr/local/bin/runsc` = Verzeichnis 4096 B → `Error: Cannot find runsc binary` + `Restarting (1)`; Pre-Check (`runsc --version` über PATH) lief fälschlich grün | `docs/backlog/BACKLOG.md:1788-1805`, **Commit `8e384586`** („runsc-Mount-Quelle aus dem PATH statt eines Pfads, den Docker auto-anlegt") |
| B5 | Mount-Quelle auflösen reicht | Redeploy nach Fix | `bind /usr/bin/runsc -> /usr/local/bin/runsc`, Falco 0.42.0 läuft, Engine offen, `gvisor.sock` entsteht | `BACKLOG.md:1800-1805` |
| B6 | **Defekt 2:** Falco liest den Sandbox-Anschluss nie | `ss -xap`, `ps -o time`, Events-Datei, Task-Probe | Socket `ESTAB`, aber **`Send-Q = 2116`**; CPU **`00:00:00`** vor und nach 40 s Sandbox mit 3000 Datei-Writes; 0 neue Events (Baseline demo=5 → 5); `Error: vector` + Restart (**3 Instanzen in 8 min**) | `BACKLOG.md:1807-1816` |
| B7 | Ursache von Defekt 2: Docker nutzt EINEN State-Root für alle runsc-Varianten | Gegenprobe `--runtime=runsc` **und** `--runtime=runsc-falco` | `runsc-sandbox --root=/var/run/docker/runtime-runc/moby` in beiden Fällen; `/var/run/docker/runtime-runsc-falco/moby/` bleibt leer → jede `runsc --root <falcon-root> list`-Diagnose sagt „keine Sandboxes" | `BACKLOG.md:1822-1828` |
| B7a | dasselbe heute nachgemessen | `ls … \| wc -l`, `docker inspect`, `runsc --root=… list`, 7.10.2026 10:0x | `runtime-runc/moby` = **32** Einträge (28 Verzeichnisse + 3 Dateien + 1 Socket), `runtime-runsc-falco/moby` = **0**; kein `gvisor.sock` vorhanden; `runsc --root=/var/run/docker/runtime-runc/moby list` meldet die laufende Sandbox `73ec438a…`; `daemon.json` enthält bei `runsc-falco` **nur** `--pod-init-config` (kein `--root`, kein `--metric-server`) | eigene Messung (Befehle in §5.3) |
| B8 | `engine.gvisor.root` zeigt auf genau dieses leere Verzeichnis | Datei gelesen | `falco_gvisor_docker_runtime_root: "/var/run/docker/runtime-{{ falco_gvisor_runtime_name }}/moby"` → `…/runtime-runsc-falco/moby` | `deploy/falco-gvisor-integration/defaults.yml:107` (Erklärung `:94-107`), Diagnose im Task `ansible-task.yml:566,606` |
| B9 | **gVisor-Engine ≠ Alternative, sondern Ersatz** | Template- und Sprint-Beleg | „`engine.kind=gvisor` Falco senses gVisor sandbox trace points **INSTEAD of** host-wide syscalls; the SIEM tripwire probe for plain runc containers is again the base config's job"; „mit `engine.kind=gvisor` sensort Falco NUR gVisor-Sandbox-Tracepoints, nicht mehr host-weite Syscalls (modern_ebpf). **Beides gleichzeitig braucht eine ZWEITE falco-Instanz**" | `deploy/falco-gvisor-integration/falco-gvisor.override.yml.j2:43-47`, `docs/sprints/SPRINT-162-SIEM-DEPLOY-BLOCKERS.md:394-397` |
| B10 | Sandbox braucht den eigenen Runtime, sonst gar keine Tracepoints | Repo-Vorgabe | „A workspace container must be started with `--runtime=runsc-falco` to actually stream trace points"; Präferenz im Deploy-Code (`runscFalcoRuntime`) | `defaults.yml:65-75`, `SPRINT-185-GATEWAY-FABRIC-GVISOR.md:80,111,186` |
| B11 | Host-eBPF und gVisor-Seite sind komplementär (andere Sensorfamilie) | Sprint-/README-Dokumentation | „gVisor/runsc-Container sind für Host-eBPF unsichtbar … deren Seite deckt `deploy/falco-gvisor-integration`" | `deploy/tetragon/README.md:162-166`, `deploy/tetragon/ansible-task.yml:18-19` |
| B12 | Laufende Container und ihre Runtimes (A/B-Grundlage) | `docker ps` → `docker inspect -f '{{.HostConfig.Runtime}}'` | 7.10. 10:0x: **28 Container = 27 `runc` + 1 `runsc`** (der `runsc`-Container = Workspace `utility-proj-4dc2a06d…`, gestartet 07:57 UTC mit Runtime `runsc` — **nicht** `runsc-falco`); dazu 1 beendeter `runsc-falco`-Container (`jimesh-framework-gvmtest-1`); historisch: „kein `runsc` registriert, kein `/usr/bin/runsc`, kein `daemon.json`" | eigene Messung (§5.3), `BACKLOG.md:177` |
| B13 | Falco-Flag-Fläche: ab 0.38 sind `--gvisor-config/--gvisor-root` Config-Keys | am echten Image `falcosecurity/falco:0.41.3` verifiziert (`falco --help`, `--dry-run`) | 0.41.3 zeigt nur `--gvisor-generate-config`; `falco -o engine.kind=gvisor --dry-run` → „no engine.gvisor.config specified"; alter 3-Flag-Assert = **False Negative** | `SPRINT-162:167-186`, `defaults.yml:10-30`, `ansible-task.yml:170-176`, extern: `falco.org/blog/falco-0-38-0` (Zugriff 7.10.2026) |
| B14 | Falcos gVisor-Engine exec’t BARES `runsc` aus dem PATH | libs-Quellcode gelesen + Probe | ohne `runsc` im Container: `Cannot find runsc binary` (auch so in der gVisor-Falco-Tutorial-Doku) | `defaults.yml:38-44`, `ansible-task.yml:293,335`, `SPRINT-162:182-186`, extern: `gvisor.dev/docs/tutorials/falco/` |
| B15 | `--metric-server` ist standardmäßig AUS und muss in `daemon.json` | externe Doku + eigene Config-Messung | „Sandbox metrics are disabled by default. To enable, add the flag `--metric-server={ADDRESS}:{PORT}` to the runtime configuration"; Flag-Wert muss **exakt** mit `runsc metric-server` übereinstimmen; gemessen: weder in `/etc/docker/daemon.json` noch in irgendeiner Repo-Datei vorhanden (ein laufender Test-Container umgeht das konfigurativ — B25) | `gvisor.dev/docs/user_guide/observability/` (Zugriff 7.10.2026), eigene `daemon.json`-Messung, `grep -rn "metric-server\|9797" deploy/ docs/` → **0 Treffer außer dieser Datei selbst** (Selbstbezug, s. §5.3) |
| B16 | Sidecar-Binaries sind vorhanden | `ls /usr/bin/gvisor-bin`, `runsc --version` | `runsc-metric-server` (53 MB), `gvisor_sentry`, `checkpointgofer`; `runsc version release-20260928.0`; Doku: `gvisor-bin/` liegt neben `runsc` | eigene Messung (§5.3), `defaults.yml:87-91`, `gvisor.dev/docs/user_guide/install/` |
| B17 | `runsc install` überschreibt bestehende Runtime-Definitionen | Quellcode gelesen | `fs.BoolVar(&i.Clobber, "clobber", true, "clobber existing runtime configuration")` → **Default TRUE** | `github.com/google/gvisor` → `runsc/cmd/install.go` (Zugriff 7.10.2026) |
| B18 | `runtimes` in `daemon.json` ist reload-fähig | externe Doku | „After changing the runtimes configuration in the configuration file, you must **reload or restart** the daemon"; Reload = SIGHUP/`systemctl reload docker`; Repo-Task nutzt das (`falco_gvisor_reload_docker: true`) | `docs.docker.com/reference/cli/dockerd/`, `docs.docker.com/engine/daemon/alternative-runtimes/`, `defaults.yml:141-149` (Zugriff 7.10.2026) |
| B19 | Betriebszustand 7.10.: Basis-Falco liefert Events | `docker inspect`, `docker logs`, Falco-Webserver `http://<container-ip>:8765/metrics` | `0.42.0`, `restarts=0` (gestartet 6.10. 13:11 UTC), `runtime=runc`, Compose-Label = **nur** `/opt/jimesh/deploy/siem/docker-compose.yml` (kein gVisor-Override), `falcosecurity_scap_engine_name_info{engine_name="modern_bpf"}`, `falcosecurity_scap_n_evts_total` = 171 256 006 (Log-Gegenprobe 169 709 931 → 169 836 395), `falcosecurity_falco_rules_matches_total` Summe = **7** (5× „chmod in dropper directory", 2× „write outside workspace") | eigene Messung (§5.3) |
| B20 | SIEM-Stack vollständig | `docker ps`, `docker logs`, `docker exec … wc -l` | `jimesh-siem-manager/indexer/dashboard` = `wazuh/*:4.14.7` (alle healthy), `jimesh-siem-falco` Up 19 h, `jimesh-siem-bridge` Up 20 h, liefert live `[siem][falco] shipped 1 event(s)` (letzte Zeile 08:09 UTC); Events-Datei `/var/log/falco/jimesh-events.json` = 4573 Zeilen | eigene Messung (§5.3), `deploy/siem/ansible-task.yml:3,678`, `BACKLOG.md:1734-1735` |
| B21 | Operator-Entscheidung S186: Basis-Falco wiederherstellen | Session-Dokumentation + Nachmessung | Override abgenommen, verifiziert `scap.engine_name: "modern_bpf"`, 0 runsc-Mounts, `scap.n_evts` 24 → 160 473 in 15 s (11 934/s) | `BACKLOG.md:1830-1838` |
| B22 | Basis-Falco ist NICHT dauerhaft: jeder gVisor-Redeploy setzt den Override wieder auf | Task-/Compose-Dokumentation | siem-Task warnt LAUT vor dem Reset, `deploy-all` läuft `siem` VOR `falco-gvisor-integration` | `deploy/siem/ansible-task.yml:289-322`, `deploy/siem/README.md:107-112`, `BACKLOG.md:1834-1836` |
| B23 | Falco-Webserver wird von Prometheus gescrappt, runsc-Metriken NICHT | `grep job_name` in der Scrape-Config | Jobs: prometheus/postgresql/redis_exporter/**falco** (`jimesh-siem-falco:8765`)/suricata/jimesh-backend; `grep -c "runsc\|gvisor\|9797"` → **0** | `deploy/grafana/prometheus/prometheus.yml:41-44` (eigene Messung) |
| B24 | Historischer Ausgangspunkt: Falco-gVisor-Integration deployte gar nicht | Handoff/Audit-Notizen | „die laufende Falco-Version (0.41.3) exponiert die erwarteten `--gvisor-*`-Flags nicht" — in S162 als False Negative aufgelöst | `docs/sprints/HANDOFF-2026-09-29-FINAL.md:68`, `docs/sprints/SECURITY-STACK-REALITY-CHECK-2026-09-29.md:117`, `BACKLOG.md:343` |
| B25 | **Metric-Server-Test v2 läuft und antwortet — Zähler bleiben aber 0** (ehemals S3, nachgestellt 7.10. 10:0x) | `docker inspect gvm-test`, `curl http://172.18.0.26:9797/metrics`, Gegenprobe `runsc --root=… list` | Testcontainer `gvm-test` (alpine, `runtime=runc`, Netz `jimesh-net`, seit 7.10. 06:39 UTC) mit Cmd `runsc --root=/var/run/docker/runtime-runc/moby --metric-server=0.0.0.0:9797 metric-server` und Mounts `/usr/bin/runsc → /usr/local/bin/runsc`, `/usr/bin/gvisor-bin`, State-Root; antwortet mit **`runsc_meta_metric_server_presence`, `runsc_meta_num_sandboxes_{running,total,broken_metrics,checkpointed,restored}`** — **alle Werte 0**, obwohl `runsc list` die laufende Sandbox `73ec438a…` meldet. Container taucht **nicht** im Repo auf (`grep gvm-test` = 0 Treffer) | eigene Messung (§5.3), Doku-Einordnung E2/E12 |

### 2.2 🟡 SESSION-BELEGT — gemessen, aber **nicht im Repo dokumentiert**

| # | Befund | Status des Belegs |
|---|---|---|
| S1 | **A/B-Experiment:** Falco muss `--runtime=runsc`/`runsc-falco` nutzen, um in gVisor-Sandboxes (Sentry/Userspace-Kernel) hineinzusehen; modern_bpf und gVisor-Engine sind komplementär | Die **Aussage** ist Repo-belegt (B9, B10, B11), das **Experiment-Protokoll selbst nirgends im Repo**: `grep -rn "gVisor-Sichtbarkeit" docs/` → **0 Treffer** (ohne diese Datei); die übrigen `A/B`-Treffer im Repo beziehen sich auf Builds/Skripte (`tsc A/B`, `A/B am echten Skript`), nicht auf eine Falco-Sichtbarkeitsmessung. Beleg nur im Session-Transkript (Eltern-Session: „A/B gVisor-visibility experiment conclusive"). |
| S2 | „Alle damals 26 Container liefen auf runc" | Zahl „26 Container" nur im Session-Transkript (Operator-Aussage vom S186-Deploy); **heute nachgemessen: 27 `runc` + 1 `runsc`** (B12) — der `runsc`-Lauf startete 07:57 UTC, ist also ein **neuer** Zustand gegenüber der früheren Messung. Die Richtung (dominant runc) bleibt bestätigt, die damalige Zahl nicht. |
| S3 | ~~Metric-Server-Test v2~~ → **inzwischen eigenständig nachgestellt** | Die frühere 🟡-Aussage ist jetzt ✅ **B25**: Mounts, Cmd und Metrik-Namen `runsc_meta_num_sandboxes_*` wurden am 7.10. unabhängig reproduziert; `num_sandboxes_running = 0` trotz laufender Sandbox ebenfalls (B25). Nicht Teil der Session-Aussage und daher noch offen: **warum** die Sandbox nichts exportiert (doku-gestützt: fehlendes sandbox-seitiges Flag, E2/E12). |
| S4 | `Error: Cannot find runsc binary` auch noch nach dem Mount-Fix „gelegentlich" | Ursprungsfall Repo-belegt (B4), der Fehler gilt als behoben (`BACKLOG.md:1800-1805`). Ein **Wiederauftreten** nach dem Fix ist nicht dokumentiert → für aktuellen Stand offen. |

### 2.3 ⛔ THEORETISCH / NICHT VERIFIZIERT

| # | Aussage | Warum nicht belegt |
|---|---|---|
| T1 | „Der Grund, warum Falco den Socket-Block nie liest, ist der falsche Pfad in `defaults.yml:107`" | Der Pfad-Fehler ist belegt (B7/B8), die **Kausalität zum Send-Q-Block** ist es nicht: Der Socket-Anschluss steht (ESTAB), Pfad und Engine-Init sind also offenbar korrekt — Falco liest nach dem Öffnen nicht. Repo nennt es „kein Repo-/Config-Fehler mehr … Problem sitzt in Falcos gVisor-Engine" (`BACKLOG.md:1818-1820`) — Ursache **upstream, nicht lokalisiert**. |
| T2 | „Stellt man `engine.gvisor.root` auf `/var/run/docker/runtime-runc/moby` um, verliert Falco die Sicht auf die runc-Container" | So im Repo nicht dokumentiert. Belegt ist ein **anderer** Konflikt: der **Engine-Wechsel** (`engine.kind=gvisor` statt `modern_ebpf`, B9) — der kostet die host-weite Sicht, nicht der Root-Pfad an sich. |
| T3 | „Die gVisor-Engine deckt nur runsc-Sandboxes ab" (als Messergebnis) | Logische Folge aus B9/B10 plus dem dokumentierten Engine-Wechsel, aber **kein A/B-Durchlauf im Repo**, der beide Engines parallel vergleicht. |
| T4 | „Mit gesetztem `--metric-server`-Flag in `daemon.json` werden die runsc-Zähler > 0" | Server, Metrik-Namen und der Ist-Wert 0 sind gemessen (B25) — **aber kein Durchlauf mit gesetztem Flag** (weder in `daemon.json` noch sandbox-seitig). Die Erklärung „sandbox-seitiges Flag fehlt" stützt sich nur auf die Doku (E2/E12: Flag muss auf beiden Seiten exakt übereinstimmen), nicht auf ein sandbox-seitiges Log. |
| T5 | Prometheus würde die runsc-Metriken einsammeln, sobald ein Scrape-Job existiert | Belegt ist nur das **Fehlen** des Jobs (B23) und der vorhandene Netzweg (beide Container `jimesh-prometheus` und `gvm-test` hängen an `jimesh-net`, gemessen 7.10.). Ob ein neuer Job die Metriken tatsächlich zeigt, ist **nicht getestet** — und bei Zählerstand 0 (B25) wäre ein Panel ohnehin „0 statt Daten". |
| T6 | Metric-Server löst Defekt 2 | ⛔ logisch falsch vermutet: der Metric-Server zählt Sandboxes (gVisor-intern), Falco braucht Tracepoints über den seccheck-Socket — getrennte Kausalwege. gVisor-Doku sagt das explizit: Metriken sind „mostly information about gVisor internals, and do not provide introspection capabilities into the workload". |

---

## 3. Offene Defekte

### 3.1 Defekt 2 — „Falco liest den Anschluss der Sandbox nie" (offen)

**Ursache-Kette (belegt):**

```
daemon.json  runsc-falco.runtimeArgs = [--pod-init-config=…]   ← kein --root
        ↓  Docker übergibt --root /var/run/docker/runtime-runc/moby  (Konvention)
/var/run/docker/runtime-runc/moby            32 Einträge  ← hier liegen die Sandboxes
/var/run/docker/runtime-runsc-falco/moby      0 Einträge   ← hier schaut Falco hin
        ↓  defaults.yml:107 → engine.gvisor.root = …/runtime-runsc-falco/moby
runsc --root <falcon-root> list  →  „keine Sandboxes"      (ansible-task.yml:566)
        ↓
Sandbox-Connector hängt:  ss → ESTAB, Send-Q = 2116
Falco:                    ps -o time = 00:00:00  über 40 s / 3000 Writes
Events:                   0 neue  (Baseline 5 → 5), zusätzlich „Error: vector" + Restart
```

**Warum offen (jeweils belegt):**

1. **Ursache upstream, nicht im Repo**: „kein Repo-/Config-Fehler mehr … das Problem sitzt in
   Falcos gVisor-Engine" (`BACKLOG.md:1818-1820`), Task failt hier „zu Recht ehrlich" (Mandat 2).
2. **Zwei-Konflikt-Lage**: (a) Engine-Wechsel `gvisor` vs. `modern_bpf` — Beides braucht eine
   zweite Falco-Instanz (`SPRINT-162:394-397`, `override.yml.j2:43-47`); (b) Pfad-/Root-Frage
   siehe T1/T2.
3. **Nicht dauerhaft entscheidbar, solange der Betrieb auf Basis-Falco läuft**: jeder
   `make redeploy SERVICE=falco-gvisor-integration` setzt den Override wieder auf
   (`BACKLOG.md:1834-1836`, `deploy/siem/ansible-task.yml:289-322`).
4. **Bewusst nicht „am Task herumgeschraubt"**: dessen Fail-Closed-Verhalten ist korrekt
   (`BACKLOG.md:1836-1838`).

### 3.2 Metric-Server-Flag (offen, konfigurativ)

| Punkt | Befund |
|---|---|
| Was funktioniert | Sidecar `runsc-metric-server` liegt in `/usr/bin/gvisor-bin/` neben `release-20260928.0`; der Test läuft **live** als Container `gvm-test` und antwortet auf `jimesh-net:9797` mit den `runsc_meta_num_sandboxes_*`-Metriken (✅ B25, nachgestellt 7.10.) |
| Was fehlt | `--metric-server` in **`/etc/docker/daemon.json`** (gemessen 7.10.: enthalten sind nur `path` bzw. `--pod-init-config`) und in **keiner** Repo-Datei (0 Treffer ohne diese Datei) — die laufende Antwort kommt allein vom Test-Container, nicht aus der Runtime-Konfiguration |
| Warum es zwingend ist | gVisor-Doku: „Sandbox metrics are disabled by default"; Flag muss in `runtimeArgs` der jeweiligen Runtime stehen und mit dem `runsc metric-server`-Aufruf **exakt** übereinstimmen (B15). **Gemessen:** selbst bei laufendem Server stehen die Zähler auf 0, obwohl `runsc list` eine Sandbox meldet (B25) — der sandbox-seitige Teil des Flags fehlt (doku-gestützte Erklärung, T4) |
| Warum es offen ist | Kein Entscheidungs-/Umsetzungsstand im Repo; kein Prometheus-Scrape-Target (B23); Rollout-Risiko: `runsc install` clobbert vorhandene Runtime-Einträge (B17), Reload aber möglich ohne Daemon-Neustart (B18); ungeklärt ist zudem, wer den Testcontainer `gvm-test` gestartet hat und wie lange der laufen soll (nicht im Repo, kein Restart-Policy) |
| Erwartungshaltung korrigieren | Die Metriken sind **gVisor-intern** (Sandboxes, FS-Zeiten …), **keine** Workload-Telemetrie/Bedrohungssicht — Bedrohungssicht bleibt Falco/Tetragon/Suricata (gVisor-Doku, B15) |

### 3.3 Weitere offene Punkte (alle Repo-belegt)

- **Regelabdeckung unter gVisor**: das generierte `pod-init.json` traced u. a. open/write/execve
 /socket, **nicht chmod** → die K-LAF-Regel „chmod in dropper directory" kann über die
  gVisor-Engine nie feuern (`SPRINT-162:404-408`).
- **Sidecar-Warnungen**: aktuelle runsc-Builds erwarten `gvisor-bin`-Sidecars; die Engine braucht
  nur `list`/`trace` — Verhalten am Node nie unter Laufbedingung geprüft (`SPRINT-162:399-403`,
  `defaults.yml:87-91`).
- **`install_gvisor`-Präzedenz**: `Makefile:310` schickt `-e install_gvisor=$(or $(GVISOR),false)`,
  die Extra-Var schlägt den Inventory-Eintrag `install_gvisor=true` → `deploy-all` meldet
  „gVisor not requested" (bewusst nicht umgestellt) (`BACKLOG.md:1842-1845`).
- **Zeithorizont Upstream**: Falco 0.43 **deprecat** die gVisor-Engine, 0.44 **entfernt**
  `engine.kind=gvisor`, `engine.gvisor.*` und `--gvisor-generate-config` — Falco startet dann bei
  verbliebenen Keys mit Fehler (extern, §5.2 E6/E7). Der laufende Pin ist 0.42.0 (B2).
- **seccheck als zweiter Sink** ist nur **geplant** (SPRINT-185 WP3), nicht gebaut
  (`SPRINT-185-GATEWAY-FABRIC-GVISOR.md:184-190`).
- **Testcontainer `gvm-test` läuft auf dem Node** (alpine, seit 7.10. 06:39 UTC, Mounts auf
  `runsc`/`gvisor-bin`/State-Root, kein `restart=always`): er ist die Quelle der laufenden
  Metric-Server-Antwort (B25), existiert aber **nicht im Repo** (`grep gvm-test` = 0) und ist in
  keinem Entscheidungsregister vermerkt → Betriebsbeobachtung, kein Dauerzustand.

---

## 4. Entscheidungsregister

| ID | Entscheidung | Wer/wann | Beleg | Status |
|---|---|---|---|---|
| D1 | **A/B-Ergebnis: modern_bpf und gVisor-Engine sind komplementär, keine Alternative** — Betrieb braucht beide Welten (bzw. eine zweite Instanz für beides) | S186/S187-Session | Aussage Repo-belegt (B9, B10, B11); Experiment-Protokoll selbst 🟡 (S1) | gültig; Protokoll nachzutragen |
| D2 | **„Basis-Falco wiederherstellen"** — ein Sensor mit 0 Events schützt nichts → gVisor-Override abgenommen | Operator, S186 | `BACKLOG.md:1830-1833`, nachgemessen (B19) | aktiv, **nicht dauerhaft** (B22) |
| D3 | **Task nicht umbauen**: Fail-Closed-Verhalten bleibt, Fix gehört nach upstream | S186 | `BACKLOG.md:1836-1838` | aktiv |
| D4 | **Falco-Pin 0.42.0** (statt 0.41.3) inkl. Kernel-Kommentar im Compose | 3.10.2026 | Commit `386454f8`, `docker-compose.yml:189-200` | aktiv (0 Restarts, B19) |
| D5 | **Eigener Runtime-Name `runsc-falco`** (bewusst ≠ `runsc`), bestehender `runsc`-Eintrag unangetastet | S52/S162 | `defaults.yml:65-75` | aktiv (in `daemon.json`, B7a) |
| D6 | Deploy-Reihenfolge als Vertrag: `siem` → `falco-gvisor-integration` → `deploy-all` | Operator, S162 | `BACKLOG.md:343`, `deploy/siem/ansible-task.yml:313-322` | aktiv |
| D7 | **OFFEN (nicht entschieden):** zweite Falco-Instanz für die gVisor-Engine vs. Verzicht bis Falco-0.44-Horizont | — | `SPRINT-162:394-397` | offen |
| D8 | **OFFEN (nicht entschieden):** `--metric-server` in `daemon.json` aufnehmen (und in Prometheus scrapen) | — | §3.2; Testzustand B25 (läuft, Werte 0), kein Repo-Eintrag | offen |

---

## 5. Quellenverzeichnis

### 5.1 Repo-Referenzen (Pfad:Zeile, Zugriff 7.10.2026, Branch `main`)

1. `docs/backlog/BACKLOG.md:177` — Ist-Zustand „kein runsc registriert / kein daemon.json" (S170-7).
2. `docs/backlog/BACKLOG.md:1721-1735` — S186 §8: Service-RCs (`siem 0`, `falco-gvisor-integration RC=2`).
3. `docs/backlog/BACKLOG.md:1786-1805` — §8b Defekt 1 (runsc-Mount-Quelle) + Fix-Nachweis.
4. `docs/backlog/BACKLOG.md:1807-1820` — §8b Defekt 2 (Send-Q, CPU, Events, `Error: vector`).
5. `docs/backlog/BACKLOG.md:1822-1828` — Nebenbefund: ein State-Root für alle runsc-Varianten.
6. `docs/backlog/BACKLOG.md:1830-1846` — Operator-Entscheidung S186, Nicht-Dauerhaftigkeit, offene Punkte.
7. `docs/sprints/SPRINT-181-SLOP-AUDIT-KRITISCH.md:440,444` — 0.41.3/Kernel 7.0/BPF-Limit, 0.42.0.
8. `docs/sprints/SPRINT-162-SIEM-DEPLOY-BLOCKERS.md:167-186` — Flag-Fläche, libs-Engine-Mechanik.
9. `docs/sprints/SPRINT-162-SIEM-DEPLOY-BLOCKERS.md:373-410` — ehrliche Offen-Items (Engine-Wechsel, Sidecars, chmod).
10. `docs/sprints/HANDOFF-2026-09-29-FINAL.md:68` / `docs/sprints/SECURITY-STACK-REALITY-CHECK-2026-09-29.md:117` — historischer Deploy-Blocker.
11. `deploy/siem/docker-compose.yml:189-200` — Falco-Pin 0.42.0 + Kernel-Begründung.
12. `deploy/siem/defaults.yml:10` — Stack-Beschreibung (Wazuh 4.14.7 + Falco 0.42.0 + bridge).
13. `deploy/siem/ansible-task.yml:3,289-322,678` — Versionsnotiz + Interplay-Warnung (Reset des gVisor-Overrides).
14. `deploy/siem/README.md:107-112` — derselbe Interplay-Vertrag für Leser.
15. `deploy/falco-gvisor-integration/defaults.yml:7-8` — verlinkte gVisor-Doku; `:10-55` Recherche-Stand; `:65-75` Runtime-Name; `:84-92` runsc-Binary + `gvisor-bin`-Sidecars; `:94-107` State-Root (Z.107); `:109-116` Socket-Endpoint; `:141-149` SIGHUP-Reload-Notiz.
16. `deploy/falco-gvisor-integration/falco-gvisor.override.yml.j2:8-22` (Merge-Regeln), `:25-58` (Config-Keys), `:43-47` (Engine-Ersatz-Statement), `:73-94` (Legacy-Flags + Mounts).
17. `deploy/falco-gvisor-integration/ansible-task.yml:170-176` (Varianten-Detektion), `:293-340` (Mount-Quelle/PATH), `:502` (Engine-Init-Error-Scan), `:566,606` (Root-Diagnose).
18. `deploy/ansible/playbooks/provision-node.yml:160-189` — `runsc install`-Registrierung, die die APT-Rolle nicht leistet.
19. `deploy/tetragon/README.md:162-166`, `deploy/tetragon/ansible-task.yml:18-19` — Host-eBPF blind für runsc.
20. `deploy/grafana/prometheus/prometheus.yml:41-44` — Falco-Scrape, kein runsc-Target.
21. `docs/sprints/SPRINT-185-GATEWAY-FABRIC-GVISOR.md:80,111,184-190` — `runsc-falco` preferierte Runtime, seccheck geplant.
22. Commits: `386454f8` (Falco 0.42.0 + `/sys`), `8e384586` (runsc-Mount-Quelle), `97b0b73f` (BACKLOG §8b Operator-Entscheidung).

### 5.2 Externe Quellen (alle Zugriff **7.10.2026**)

- **E1** gVisor-Tutorial „Configuring Falco with gVisor" — `runsc install --runtime=runsc-falco`,
  `--pod-init-config`, `--gvisor-config`/`--gvisor-root`, Default-Root
  `/var/run/docker/runtime-runc/moby`, Hinweis „Error: Cannot find runsc binary",
  Mindestversionen (runsc ≥ release-20220704.0, Falco ≥ 0.33.1):
  <https://gvisor.dev/docs/tutorials/falco/>
- **E2** gVisor „Observability" — `runsc metric-server`, `--root=/var/run/docker/runtime-runc/moby`,
  `daemon.json`-`runtimeArgs: ["--metric-server=…"]`, exakte Flag-Übereinstimmung,
  „disabled by default", Metriken `num_sandboxes_total`/`num_sandboxes_running`,
  Gegenverweis „gVisor internals, no workload introspection":
  <https://gvisor.dev/docs/user_guide/observability/>
- **E3** gVisor „Installation" — `gvisor-bin/`-Sidecars neben `runsc`, `runsc install`,
  apt-Paket konfiguriert Docker automatisch: <https://gvisor.dev/docs/user_guide/install/>
- **E4** gVisor-Quellcode `runsc/cmd/install.go` — `-clobber` **Default true**
  („clobber existing runtime configuration"), überschreibt `runtimes[name]` in `daemon.json`:
  <https://github.com/google/gvisor/blob/master/runsc/cmd/install.go>
- **E5** Falco 0.38.0-Blog — `--gvisor-config` → `engine.gvisor.config`,
  `--gvisor-root` → `engine.gvisor.root`, `engine.kind: gvisor`, per `-o` setzbar:
  <https://falco.org/blog/falco-0-38-0>
- **E6** Falco 0.43.0-Blog — gVisor-Engine **deprecations-warned**:
  <https://falco.org/blog/falco-0-43-0>
- **E7** Falco 0.44.0-Blog — gVisor-Engine, `engine.gvisor`-Block und `--gvisor-generate-config`
  **entfernt**; Falco startet bei verbliebenen Keys nicht: <https://falco.org/blog/falco-0-44-0>
- **E8** Falco „Configuration Options" — `-o key=value`, Merge nur auf Root-Key-Ebene
  (ein `engine:`-Abschnitt in `config.d/` ersetzt den ganzen Abschnitt):
  <https://falco.org/docs/reference/daemon/config-options/>
- **E9** dockerd-Referenz — `runtimes`/`runtimeArgs` in `daemon.json`, `--add-runtime`,
  Reload nach Änderung, SIGHUP-Reload-Mechanik: <https://docs.docker.com/reference/cli/dockerd/>
- **E10** Docker „Alternative container runtimes" — `systemctl reload docker` nach
  `runtimes`-Änderung: <https://docs.docker.com/engine/daemon/alternative-runtimes/>
- **E11** eBPF-Verifier-Doku — 1-Mio.-Instruktions-Komplexitätsgrenze (seit v5.2):
  <https://docs.ebpf.io/linux/concepts/verifier>
- **E12** (nur über Websuche ziert, Datei nicht vollständig abgerufen) `runsc/config/flags.go`
  — Definition `--metric-server`: „must be specified in both `runsc metric-server` and
  `runsc create`, and their values must match": <https://github.com/google/gvisor/blob/master/runsc/config/flags.go>

### 5.3 Eigene Nachmessungen 7.10.2026 (Befehle, damit sie nachmachbar sind)

```bash
cat /etc/docker/daemon.json                     # runsc + runsc-falco, ohne --root/--metric-server
sudo ls /var/run/docker/runtime-runc/moby | wc -l        # 32 (28 dirs + 3 files + 1 socket, 10:0x)
sudo ls /var/run/docker/runtime-runsc-falco/moby | wc -l # 0 (nur . und ..)
sudo find /run /var/run -name gvisor.sock        # keine Treffer (kein gVisor-Override aktiv)
sudo docker ps -q | xargs -r -I{} sudo docker inspect -f '{{.HostConfig.Runtime}}' {} | sort | uniq -c
                                    # 27 runc, 1 runsc (Workspace utility-proj-…, Runtime `runsc`)
sudo docker inspect jimesh-siem-falco -f 'status={{.State.Status}} restarts={{.RestartCount}} image={{.Config.Image}} runtime={{.HostConfig.Runtime}}'
                                    # running, restarts=0, 0.42.0, runc
sudo docker inspect jimesh-siem-falco -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
                                    # nur /opt/jimesh/deploy/siem/docker-compose.yml (kein gVisor-Override)
sudo docker logs jimesh-siem-falco | grep -o '"scap.engine_name":"[^"]*"' | tail -1   # modern_bpf
/usr/bin/runsc --version                    # release-20260928.0
sudo /usr/bin/runsc --root=/var/run/docker/runtime-runc/moby list   # 1 laufende Sandbox 73ec438a…
ls -la /usr/bin/gvisor-bin                  # runsc-metric-server (53 MB), gvisor_sentry, …
grep -rn "metric-server\|9797" deploy/ docs/ | grep -v '2026-10-07-falco'   # 0 Treffer (ohne diese Datei selbst)
grep -n job_name deploy/grafana/prometheus/prometheus.yml    # kein runsc-/9797-Target
grep -rni 'ttrpc' deploy/ docs/ | grep -v '2026-10-07-falco'  # 0 Treffer: kein ttrpc-Befund im Repo

# B25 — laufender Metric-Server-Test:
sudo docker inspect gvm-test -f '{{.Config.Cmd}} net={{.HostConfig.NetworkMode}} started={{.State.StartedAt}}'
                                    # runsc --root=… --metric-server=0.0.0.0:9797 metric-server | jimesh-net | 06:39 UTC
curl -s http://172.18.0.26:9797/metrics | grep -E '^runsc_meta_num_sandboxes_(running|total)'
                                    # …running 0, …total 0 (trotz laufender Sandbox)

# B19 — Falco-Webserver (Port im Container, nicht nach host publiziert):
curl -s http://172.18.0.25:8765/metrics | grep -E 'scap_n_evts_total|scap_engine_name_info|rules_matches_total'
                                    # 171256006 | engine_name="modern_bpf" | matches_summe 7
sudo docker exec jimesh-siem-falco wc -l /var/log/falco/jimesh-events.json   # 4573
sudo docker logs --since 10m jimesh-siem-bridge | tail -1                    # shipped 1 event(s)
```

---

## 6. Abgrenzung — was NICHT gemessen wurde / als Nächstes zu prüfen ist

### 6.1 Nicht gemessen / nicht verifiziert (gehört nicht in die Beweistabelle)

1. **Das A/B-Experiment selbst** existiert nicht als Protokoll im Repo (S1). Wer es nachmachen
   will: beide Engines nacheinander an derselben Sandbox laufen lassen und `scap.n_evts`
   bzw. Rule-Matches vergleichen — das ist der fehlende Beleg für T3.
2. **Die Zahl „26 Container damals"** (S2) — heute 27 `runc` + 1 `runsc` (B12), damaliger Stand
   nur Transkript; der einzelne `runsc`-Lauf (seit 07:57 UTC) ist ein **neuer** Zustand und kein
   Beleg für die alte Zahl.
3. **Warum Falco den Socket-Block nicht liest** (T1) — kein Strace/Upstream-Issue im Repo.
   **Nächster Schritt:** Falco mit `--log-level=debug` unter der gVisor-Engine laufen lassen und
   den Zeitpunkt nach „Trying to open the right engine!" festhalten (ggf. Upstream-Issue).
4. **Ob `engine.gvisor.root` auf `runtime-runc/moby` umgestellt werden darf, ohne die
   runc-Abdeckung zu verlieren** (T2) — die Repo-Belege sprechen für einen **Engine**-Konflikt,
   nicht für einen Pfad-Konflikt. **Nächster Schritt:** EXAKT diese eine Variable in
   `overrides.local.yml` setzen und die Task-LIVE-Probe laufen lassen (fail-closed, kein
   Repo-Edit nötig).
5. **Metric-Server-Rollout** (B25, T4, T5): Server-Test läuft und Metrik-Namen sind verifiziert —
   aber die Werte stehen auf 0, `daemon.json` hat das Flag weiterhin nicht, Prometheus scrappt
   nichts, und ungeklärt ist, wie der Testcontainer `gvm-test` dauerhaft betrieben/beseitigt
   werden soll. **Nächster Schritt:** Flag in `daemon.json` auf *beiden* Seiten (Runtime-Args =
   `runsc metric-server`-Aufruf, exakter Wertabgleich — E2/E12), Reload statt Restart beachten
   (`-clobber`-Risiko, B17), einmal `curl /metrics` gegen die Sandbox-Werte prüfen, dann
   Scrape-Job entscheiden.
6. **Nicht geprüft:** Verhalten, wenn `runsc install` (z. B. bei `provision-node`) erneut läuft —
   `-clobber=true` überschreibt den `runsc-falco`-Eintrag inklusive `--pod-init-config`
   (B17 + B7a). Das ist eine **Risiko-Hypothese**, kein beobachteter Vorfall.
7. **Nicht geprüft:** Seccheck-Route (SPRINT-185 WP3) und Falco ≥ 0.43 (Deprecation, E6/E7).

### 6.2 Abweichungen zwischen Auftragstext und Repo-Befund (Korrektur)

Damit niemand später die falsche Variante zitiert:

| Auftragstext | Repo-Befund |
|---|---|
| „Falco-Defekt 1 (behoben, Commit `8e384586`): 0.41.3 startet auf Kernel 7.0.0-34 nicht → 0.42.0" | **Zwei verschiedene Defekte.** 0.41.3 → 0.42.0 ist Commit **`386454f8`** (`SPRINT-181:440`, `docker-compose.yml:190`); Commit **`8e384586`** behebt den *runsc-Mount-Quellen*-Defekt (`BACKLOG.md:1788-1805`). Beide sind hier einzeln als B1/B2 und B4/B5 geführt. |
| „Quelle-Problem: Umstellung auf den richtigen Pfad kostet Falco die Sicht auf die runc-Container" | So nirgends dokumentiert. Belegt ist der **Engine-Wechsel**-Konflikt (`engine.kind=gvisor` statt `modern_ebpf`, B9). Der Root-Pfad allein ändert die Engine nicht (T2). |
| „gVisor-Socket entsteht" (Betriebszustand heute) | **Aktuell nicht**: kein `gvisor.sock` vorhanden, Compose-Label zeigt nur die Basis-Compose (B19, §5.3). Der Socket entsteht **nur mit aktivem Override** (`BACKLOG.md:1805`). |
| „Zählwerte 0 / 31 Einträge" | Richtung bestätigt, Zahlen **veraltet**: 7.10. 10:0x = **0 / 32** (`runtime-runsc-falco` / `runtime-runc`, B7a). Die Zahl schwankt mit dem Container-Churn; maßgeblich ist die Zeitmarke der Messung. |
