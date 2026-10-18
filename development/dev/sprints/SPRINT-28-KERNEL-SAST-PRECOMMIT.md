# SPRINT-28 — Kernel-Level SAST/Pre-Commit Guard (eBPF LSM)

> **Quelle:** `docs/research/R24:SAST:PRECOMMIT_KERNEL.md` (8.9.2026).
> **Status:** Sprint-Plan, nicht begonnen. Entstand als Ergänzung zur K-LAF-Front:
> Nach Gateway-Inspektion (WP2, Sprint 20) und Egress-Allowlist (WP5) schließt
> dieser Sprint die dritte Leckstelle — **der Commit selbst**.
> Verwandt: `K-LAF-ARCHITECTURE.md` §8b (Jailer/Tetragon-Einordnung),
> SPRINT-20 WP8 (eBPF-Grundsatz), R19 (Landschaft), **R25**
> (`R25-tetragon-gvisor-kata.md` — Tetragon/gVisor/Kata verifiziert,
> Enforcement-Matrix pro Isolationstier), `docs/articles/README.md`
> (Artikel-Pipeline).

---

## 1. Die Idee

**Pre-Commit-Hooks sind Userspace und damit für Agenten wertlos.** Ein LLM-Agent
kennt `git commit --no-verify`, kann `core.hooksPath` überschreiben oder den
Hook löschen. Git-Hooks schützen vor Menschen mit gutem Willen — nicht vor
Agenten.

Der Ansatz aus R24: das Pre-Commit-Prinzip **in den Kernel** verlagern —
repo-unabhängig, konfigurationsfrei und für den Prozess im Workspace
nicht umgehbar:

1. **eBPF-LSM-Hook** (`BPF_PROG_TYPE_LSM`) auf `file_open`/`file_truncate`
   fängt Schreibzugriffe auf commit-kritische Pfade ab:
   `.git/index`, `.git/COMMIT_EDITMSG`, `.git/objects/`,
   `.git/worktrees/*` (Git-Worktrees!).
2. Operation wird **angehalten** (deny-by-default-Fenster bzw. sleepable Hook),
   Pfade gehen über den **Ring Buffer** in den Userspace-Daemon.
3. Daemon scannt sofort: **Secrets** (Gitleaks/TruffleHog) + **SAST**
   (Semgrep) auf den betroffenen Dateien.
4. Verdict zurück: **frei geben** (Commit läuft normal) oder **blockieren**
   (`-EPERM` → Commit schlägt fehl, egal was der Agent konfiguriert hat).

R24-Querverweis: fertig kaufbar gibt es das nicht („keine Out-of-the-Box-
Software, die eBPF + Secret Scanning vor dem Commit verkauft"). Die
praktischen Alternativen (globale Git-Hooks via `core.hooksPath`/MDM, EDR)
sind Userspace und agenten-umgehbar — als **Fallback** trotzdem nutzbar (WP4).

## 2. Warum JiMesh das kann (und andere nicht)

Das ist exakt die Argumentationslinie aus dem eBPF-Artikel und K-LAF §9:
**Enforcement braucht die Identitätskette, und die entsteht durch
Provisionierung.**

* JiMesh provisioniert die Workspaces selbst und kennt Container, Session und
  Project — ein Kernel-Block ist also nicht nur `-EPERM` im Dunkeln, sondern
  erzeugt ein **Security-Event mit Identity** (Reuse der Freeze-Leiter aus WP3).
* Scanner-Strategie wie in K-LAF §8: keine eigene ML — Gitleaks/Semgrep sind
  Commodity, und der Modell-Scanner-Pfad läuft ohnehin später über das eigene
  Mesh (Chain mit Bandit/Failover/Budget).
* Der Guard ist eine **Host-/VM-Komponente** (nicht im Agent-Container):
  eBPF braucht den echten Kernel. Das ist konsistent mit der bekannten Grenze
  „eBPF läuft nicht in gVisor" (K-LAF §5, eBPF-Artikel) — Degradation nach
  unten ist eingeplant (WP4).

**Sicherheitslücke, die damit geschlossen wird:** Die bisherige K-LAF-Front
fängt geleakte Secrets in **Responses** (Regex-Scanner) und blockiert
**Egress**. Ein Secret, das der Agent in den Code schreibt und committed,
geht an Git-Remotes vorbei an beidem. Der Pre-Commit-Guard ist die letzte
Verteidigungslinie vor dem Repo.

## 3. Work Packages

### WP0 — Feasibility-Spike (blockiert alles)

* **BPF-LSM-Verfügbarkeit** auf den realen Deploy-Zielen prüfen: `lsm=bpf`
  bzw. `bpf` in der Kernel-LSM-Liste (`/sys/kernel/security/lsm`), Kernel-Version
  (sleepable LSM-Programme ≥ 5.10 ernsthaft prüfen), Root/Capabilities des
  Backend-Hosts. Ergebnis dokumentieren — wenn der Host-Kernel kein
  BPF-LSM kann, fällt der Sprint auf WP4-Fallback zurück.
* **Sensor-Stack entscheiden (E-S2):** rohes `cilium/ebpf` (pure Go — passt zu
  Mandat 7 `CGO_ENABLED=0`, Sidecar-Muster wie E1-Option A) vs. Tetragon als
  Abhängigkeit (YAML-Policies, aber zweiter Daemon im Deployment) vs. ebpfguard
  (Rust, wie im eBPF-Artikel). Tendenz: `cilium/ebpf`-Sidecar — kein CGO,
  volle Kontrolle über die Hook-Punkte, kein zweites Fremdsystem.
* **Sync-Enforcement-Mechanismus klären (E-S1)** — der kritischste Punkt:
  ein LSM-Hook kann nicht einfach Sekunden auf einen Gitleaks-Lauf warten.
  Kandidaten:
  * **(a) Deny-by-default + Verdict-Map:** commit-kritische Schreibzugriffe
    werden abgelehnt, bis der Daemon das Verdict (allow/clean) in eine
    eBPF-Map schreibt; kurzzeitiges Fenster, danach normaler Ablauf.
    Einfach, aber Fehlerpfade (Daemon tot) müssen E-S3 folgen.
  * **(b) Sleepable LSM-Programm** (`BPF_F_SLEEPABLE`): Hook wartet
    synchron — echtes „Pause bis Verdict", aber Kernel-/Versions-Abhängigkeit
    und Deadlock-Risiken.
  * **(c) Async Remediation:** nicht blockieren, scannen, bei Treffer
    Worktree zurücksetzen + Session einfrieren. Schwächste Garantie (Secret
    war kurz im Objekt-Store und kann in Reflog/Remote-Push landen) —
    nur als Fallback.
* **gVisor-Degradation dokumentieren (R25, korrigiert):** In `runsc`-Workspaces
  gibt es kein echtes Kernel-eBPF — und gVisors seccheck-Trace-Points (UDS-Sink,
  wie von Falco/Upwind genutzt) sind **nur Beobachtung**, kein
  Block-until-Verdict. Konsequenz pro Tier (R25-Matrix): T1+ = WP1
  (Kernel-Blocking), T2 gVisor = Trace-Point-Sink + async Remediation
  (Freeze-Leiter), T3 KVM/Kata = eBPF im Gast-Kernel (AntCWPP-Muster, Enterprise-Pfad).
* **Enforcement-Matrix als Ausgabedokument:** Der Spike endet mit einer
  verifizierten Tabelle pro Tier (enforced / observe+remediate / hooks-only) —
  sie wird zugleich Doku- und Artikelmaterial.

### WP1 — Kernel-Sensor (Sidecar)

* eBPF-LSM-Programme auf `file_open`/`file_truncate` mit Pfad-Filter auf die
  Git-Interna (`.git/index`, `.git/COMMIT_EDITMSG`, `.git/objects/`,
  `.git/worktrees/*` — Worktrees sind der Standardarbeitsbereich der Agenten,
  Sprint-2-Erbe).
* **Container-Attribution:** cgroup → Container-ID (Muster aus K-LAF §2), damit
  das Verdict weiß, wessen Commit es ist.
* Ring Buffer → Userspace, Verdict-Map zurück. Fail-closed nur für den
  commit-kritischen Pfad, nichts anderes wird angefasst.

### WP2 — Verdict-Daemon + Scanner-Kette

* Daemon (Go, pure `cilium/ebpf`) nimmt Ereignisse, läuft
  **Gitleaks/TruffleHog** (Secrets) und **Semgrep** (SAST: gefährliche Patterns,
  bekannte Vuln-Muster) über die geänderten Dateien — nicht über das Repo
  (Latenz, False Positives), sondern gezielt über die Paths aus dem Event.
* Scanner sind **externe Binaries**, nicht gelinkt (Mandat 7 bleibt intakt).
* Konfiguration: Patterns, Schweregrade, Allowlist —-Allowlist-Einträge
  kommen aus dem Vault (vom Operator freigegebene Test-Fixtures etc.).
* Später (nicht WP2): Modell-Scanner als zusätzliche Kette über das Mesh
  (K-LAF §8-Muster), wenn die Latenz-Budgets das erlauben.

### WP3 — Enforcement + K-LAF-Integration

* Block (`-EPERM` bzw. abgelehntes Verdict) erzeugt
  `security_events`-Eintrag (`pre_commit_block`) mit vollständiger Identity
  (Container, Session, Project) — Report/Forensik-Pfad aus WP4 (Sprint 20)
  greift unverändert.
* **Eskalation optional an die Freeze-Leiter** (Token-Revoke → kontrollierter
  Fehler → docker pause): ein wiederholter Blockversuch ist selbst ein
  Threat-Signal (Nested-Injection-Lektion aus Sprint 19).
* Kein neuer Auth-Pfad, keine neue Route nötig — Anbindung an bestehende
  Security-Events und Report-Struktur.

### WP3b — Agent-Advisory: der Guard, der zurückpricht

> **Notification-Anbindung:** jeder Block publishet zusätzlich
> `secret.commit_blocked` (critical), jedes SAST-Finding `sast.finding` (warn)
> — via `notify.Publisher` (Sprint 30 WP2). Schema/Vertrag:
> `docs/SCHEMA-notifications.md` §2/§6 (inert: Regel-ID + Datei:Zeile,
> keine rohen Payloads).

> Operator-Anforderung 8.9.2026: Ein Block darf nicht in einem stillen
> `-EPERM` enden — **der Agent, der committed hat, muss den Incident
> mitgeteilt bekommen**, inkl. Weg zur Behebung. Passt zur Freeze-Leiter
> Stufe 2 (kontrollierte Meldung statt Abbruch) und macht aus dem Guard
> eine Lehrinstanz statt nur eine Wand.

* **Advisory-Datensatz** pro Block: Regel-ID, Datei:Zeile, Schweregrad,
  remediation-Hinweis — **nie der rohe Secret-/Payload-Inhalt**. Das Advisory
  geht zurück ins Modell-Context-Fenster; rohe Inhalte wären der
  Nested-Injection-Wiedereintrittspunkt aus Sprint 19. Inhalte sind strukturiert
  und inert (Referenz statt Zitat, festes Schema, keine freien Textblöcke).
* **Kanal (E-S5):**
  * Neue authentifizierte Route `GET /api/security/advisories`
    (Session-Token — WP3 Sprint 20 hat Session-Auth auf `/v1/*`/API ohnehin
    gefixt; dieselbe Middleware). Agent polled nach fehlgeschlagenem Commit.
  * Workspace-Image liefert einen **Informer-Hook** (dünner Git-Hook bzw.
    `jimeshctl security advisories`-Aufruf): auf Commit-Fehler holt er das
    Advisory und schreibt es lesbar auf stderr — inkl. Remediation-Pfad
    („Secret nach Vault: `jimesh vault set …`, JIT-Injektion übernimmt
    Injektion" statt hardcoded `.env`).
  * **Wichtig — Rollentrennung:** der Hook ist *nur* Informer. Das Blocking
    passiert kernel-seitig (WP1) und bleibt umgehbar-frei; entfernt der Agent
    den Hook, verliert er nur die Erklärung, nicht die Enforcement-Grenze.
    Dashboard-Kennzeichnung bleibt ehrlich („enforced + advisory" /
    „hooks-only").
* **Loop-Schließung:** nach Remediation läuft der Commit durch — der
  Advisory-Verlauf (block → advisory → clean commit) landet in
  `security_events` und damit im Forensik-Report (Nachweis: der Agent hat
  gelernt, nicht nur verloren).

### WP4 — Fallback-Pfad (ohne BPF-LSM, ehrlich)

* Workspace-Images bekommen **globale Git-Hooks** via
  `git config --system core.hooksPath /usr/local/share/jimesh-git-hooks`
  (R24-Variante A), Hook-Verzeichnis **read-only** gemountet, Scanner wie WP2.
* ⚠️ **Ehrliche Einordnung (Mandat: kein Mock):** das ist best effort, kein
  Enforcement. Ein Agent kann `GIT_CONFIG_GLOBAL`/`--no-verify`-Umwege
  versuchen — der Fallback ist für Tier-1-Laptops (kein Host-Kernel-Zugriff)
  und als Degradationsstufe dokumentiert, nicht als Sicherheitsgarantie
  vermarktet. Unterschied WP1/WP4 muss in der UI sichtbar sein
  („enforced (kernel)" vs. „best effort (hooks)").

### WP5 — Dashboard & Doku

* Security-Page: Pre-Commit-Events einblenden (Komponente aus der
  Hierarchie, Operator-Anforderung aus der Artikel-/Security-Page-Diskussion).
* Deployment-Status: Guard-Modus pro Workspace sichtbar
  (kernel-enforced / hooks-fallback / none).
* `USER_GUIDE.md` (Security-Kapitel), `API_DOCS.md` nur falls neue Routen
  entstehen (WP3 vermeidet sie), Sprint-Backlog-Spiegel.

## 4. Entscheidungen (neue E-Serie, analog Sprint 20)

| # | Entscheidung | Blockiert | Status |
|---|---|---|---|
| E-S1 | Sync-Enforcement: (a) deny-by-default+Map / (b) sleepable LSM / (c) async remediation | WP1, WP2 | OFFEN — Tendenz (a), (b) nur wenn Spike es sauber zeigt |
| E-S2 | Sensor-Stack: cilium/ebpf-Sidecar (pure Go) vs. Tetragon vs. ebpfguard | WP1 | OFFEN — Tendenz cilium/ebpf; R25: Tetragon ist non-K8s nutzbar (`--tracing-policy`), hat aber kein BPF-LSM-Enforcement à la AntCWPP |
| E-S3 | Verhalten bei Daemon-Ausfall/Timeout: fail-open + lautes Event vs. fail-closed (Commit bleibt blockiert) | WP2 | OFFEN — verknüpft mit Sprint-20 E2; der Incident-Schaden ging über Responses, hier ist fail-closed billiger als dort |
| E-S4 | Scope: SAST + Secrets pre-commit; **DAST gehört in die Deployment-Gate-Stufe** (laufende App nötig) — verplant als **SPRINT-29-DEPLOYMENT-SECURITY-GATES.md** | Sprint | Default gesetzt |
| E-S5 | Advisory-Kanal: Poll-Route (`GET /api/security/advisories`, Session-Token) + Informer-Hook vs. Push-Mechanismus; Advisory-Schema (regel-ID + Datei:Zeile, keine rohen Payloads) | WP3b | Default gesetzt: Poll-Route + Informer-Hook, roh-Inhalt verboten |

## 5. Akzeptanzkriterien (Mandat 2 — verifiziert, nicht behauptet)

* Agent committed eine Datei mit `sk-…`/PEM-Secret → Commit schlägt mit
  `Permission denied` fehl, `security_events` zeigt den Block mit Identity,
  **auch** mit `git commit --no-verify` und mit überschriebenem `core.hooksPath`.
* Sauberer Commit läuft ohne spürbare Latenz durch (Ziel: < 1 s Verdict-Fenster
  bei Variante (a), gemessen).
* Worktree-Commits (`.git/worktrees/`) sind abgedeckt.
* `--no-verify`-/Hook-Bypass-Versuche landen als Events (und optional in der
  Eskalationsleiter).
* **Advisory-Loop (WP3b):** geblockter Commit → Agent sieht auf stderr ein
  lesbares Advisory (Regel-ID, Datei:Zeile, Remediation-Hinweis) — ohne dass
  der rohe Secret-Inhalt im Advisory steht. Nach Vault-Remediation läuft der
  identische Commit durch; der block→advisory→clean-Verlauf ist im
  Forensik-Report nachvollziehbar.
* Fallback-Betrieb (WP4) verifiziert auf einem Ziel ohne BPF-LSM — inklusive
  ehrlicher Kennzeichnung im Dashboard.

## 6. Artikel-/Doc-Integration

* **Neuer Artikel (Pipeline-Position nach K-LAF Teil 2, vor/neben Sandbox-Artikel):**
  „Kernel-Level Pre-Commit: Stopping Secrets Before They Land" — der Hook des
  Stücks: *git hooks protect against polite humans; agents read the docs and
  pass `--no-verify`.* Kein fertiges Produkt auf dem Markt (R24) → starke
  Position. Foundation eBPF-Artikel verlinken (kein zweites eBPF-Tutorial),
  Querverweis auf SocketGuard/Sandbox-Artikel → „komplette Security-Front":
  Gateway-Inspektion → Egress-Allowlist → **Pre-Commit-Guard** →
  Identitätskette/Freeze. Eintrag in `docs/articles/README.md` ist gesetzt.
* **Knowledge-Base:** WP4-Fallback und E-S-Entscheidungen werden
  Doku-Material (USER_GUIDE Security-Kapitel), nicht nur Marketing.

- **WP2b — Checkov (IaC-SAST, Operator-Zusatz 9.9.2026):** die Kernel-Scan-
  Pipeline deckt CODE ab, nicht INFRASTRUKTUR-ALS-CODE. Checkov (Bridgecrew/
  Prisma OSS, Apache-2.0) scannt Terraform/CloudFormation/docker-compose/
  Dockerfiles/K8s-Manifeste auf Misconfigurations-Policies (BCS-Templates,
  CIS). Integration im selben Daemon-Verdict-Pfad (Checkov als externes
  Binary, nicht gelinkt — Mandat 7/CGO=0 bleibt), Events landen als
  `security_events` (`event_type='iac_finding'`, rule-ID + severity, nie
  Roh-Payloads). Sprint 29 Deployment-Gate (WP1) zieht Checkov zusätzlich als
  Quarantäne-Stufe über das JEWEILIGE Deployment-Manifest.
  - **Skill-Contract-Pattern (Referenz: AgentSecOps/SecOpsAgentKit,
    skills/devsecops/iac-checkov/SKILL.md, 12.9.2026):** Checkov wird NICHT
    als unscoped CLI für Agenten freigegeben, sondern als Agent-Skill mit
    festem Tool-Vertrag: erlaubte Befehle (scan mit -o json/sarif),
    Severity-Gates (`--hard-fail-on CRITICAL`), Suppress-Governance
    (CRITICAL/HIGH-Suppressions brauchen Security-Review, Inline-Skip mit
    Begründung), Baseline/Drift-Modus (`--create-baseline` → nur NEW
    Findings failen — Progressiver Enforcement für Bestands-Projekte),
    Custom-Policies versioniert. Das ist die konkrete Umsetzung des
    „read-mostly Tool-Katalog"-Musters aus der Agentic-SOC-Diskussion —
    und als JiMesh-Skill (Skills-Hub, Sprint 23) kapselbar.

## 7. Umsetzungsstand WP2b (TASK-059, 13.9.2026 — tatsächlich gebaut und live verifiziert)

Der IaC-Teil dieses Sprints ist als **containerbasierte Deploy-Pipeline-
Stage** geliefert (TASK-059), NICHT als eBPF-Verdict-Daemon: WP1
(Kernel-Sensor) und WP2 (Daemon + sync-Enforcement) bleiben offen — der
Task-Owner hat bewusst auf die Kernel-Abhängigkeit verzichtet („SAST-Stage
v1 statt eBPF-LSM; kernel-abhängig, v2"). Geliefert:

- **Checkov containerisiert + digest-gepinnt:** `deploy/scan/docker-compose.yml`
  (opt-in Profile `scan`, `bridgecrew/checkov:3.2.421@sha256:0545d15f…` —
  Pin by Digest wie E-D1 verlangt) + dieselben Pins als Go-Konstanten
  (`src/backend/internal/scanner/iac.go`). Der Scanner läuft als Container —
  Python wird zur Go-Abhängigkeits-Null (Mandat 7 bleibt intakt).
- **Custom-Policies versioniert (der Skill-Contract, konkret):**
  `deploy/scan/checks/CKV_JIMESH_COMPOSE_1..4` — privileged,
  docker.sock-Mount, Port-Bind ohne Loopback-Host (MANDATES §12 als Code),
  host-Namespaces. Live-Befunde (13.9., gepinnte Images): checkov 3.x hat
  KEIN docker-compose-Framework mehr (3.2.421-Frameworkliste verifiziert) —
  compose läuft über das generische yaml-Framework mit versionierten
  Custom-Checks. OSS-checkov liefert KEINE severity-Metadaten — die
  JiMesh-Policies setzen `severity="CRITICAL"` selbst, dazu die kuratierte
  Stock-Klasse `JiMeshCriticalCheckIDs` (internal/scanner/iac.go). Agenten
  wählen keine Severities — das Repo tut es.
- **Events:** `iac_finding`, `quarantine`, `iac_scan_failed`,
  `sast_finding`, `quarantine_release` in `security_events` — rule-ID +
  severity + Datei:Zeile, nie Roh-Payloads (K-LAF E3, direction="none" für
  Deploy-Stage-Aktionen dokumentiert in store/security_events.go).
- **SAST v1 statt eBPF (bewusster WP1-Ersatz):** gosec (Go-Workspace-Source)
  bzw. trivy (Runtime-Image-CVEs), dieselben Pins in derselben Compose —
  warn-first; der Quarantine-Stop gehört allein den CRITICAL-IaC-Regeln
  (progressive Adoption).
- Offen (v2, ehrlich): WP1 Kernel-Sensor (BPF-LSM), WP2 Verdict-Daemon,
  WP3b Pre-Commit-Advisory, Baseline/Drift-Modus (`--create-baseline`),
  staticcheck (kein gepinntes offizielles Container-Image — kein unpinned
  Netz-Fetch in einer Security-Stage, dokumentiert in
  deploy/scan/README.md).
