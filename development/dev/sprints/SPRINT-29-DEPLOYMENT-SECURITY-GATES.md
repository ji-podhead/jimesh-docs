# SPRINT-29 — Deployment Security Gates (DAST-Stage + HITL-Exposure)

> **Quelle:** Operator-Diskussion 8.9.2026 (Pre-Commit/Static/Dynamic-Triade).
> **Status:** Sprint-Plan, nicht begonnen. Schließt die dritte Stufe der
> Code-Security-Triade: Sprint 28 blockt den **Commit** (eBPF-LSM + SAST),
> dieser Sprint scannt die **laufende App**, bevor sie erreichbar wird (DAST)
> und koppelt die Freigabe an ein HITL-Gate.
> **Verwandt:** SPRINT-28 E-S4 (DAST bewusst hierher ausgescope'd),
> `K-LAF-ARCHITECTURE.md` §7 (HITL-Gate ❌, Ephemere Workspaces ❌),
> WP6 Exposure-Dashboard/FirewallProvider (Sprint 20, fertig),
> Operator-Roadmap: Port-Discovery → Security-Page pro Endpoint/App,
> `docs/articles/README.md` #4b (Artikel-Dreiklang) und #5 (Sandbox-Kontext).

---

## 1. Die Idee

**Static Analysis fängt den Code-Fehler, DAST fängt den laufenden Fehler.** Ein
Deployment kann sauber committed sein (Sprint 28) und trotzdem zur Gefahr
werden: Debug-Endpoint aktiv, Auth nicht erzwungen, offene Route, falsche
Header, geleakte Secrets in Responses, angriffsreiche Crawl-Flächen. Genau das
sieht nur ein Scan gegen die **laufende App** — und zwar bevor der Endpoint
öffentlich erreichbar ist, nicht danach.

Der Gate-Flow (an die bestehende Deploy-Engine gekoppelt):

1. Deployment wird gebaut/gestartet — Zustand **`quarantine`**: nur aus dem
   Sandbox-Netz erreichbar, keine Public-Exposure (Egress-Allowlist, WP5
   Sprint 20, macht das netzwerkseitig schon zwangsweise).
2. **Scan-Container** läuft gegen das Quarantine-Target: Crawling (Katana) +
   Template-Scans (nuclei) + JiMesh-eigene Checks (Auth erzwungen? Secrets in
   Responses — Reuse des Regex-Scanners aus WP2/Sprint 20? Header-Hygiene).
3. Verdict: **clean → Promotion möglich** (Operator-Freigabe, HITL) oder
   **findings → Hold** mit Report auf der Security-Page des Deployments.

Damit bekommt K-LAF §7 (HITL-Gate) seinen ersten konkreten Einsatz: die
Exposure-Freigabe ist der natürliche Y/N-Punkt im Dashboard — und schließt an
die Operator-Roadmap an (Ports-Discovery: jeder neu entdeckte öffentlich
erreichbare Port wird als Security-Signal sichtbar und muss durch denselben
Gate, statt still live zu gehen).

## 2. Warum JiMesh das kann

* **Enforcement-Punkt vorhanden:** Deploy-Engine + Exposure-Dashboard +
  FirewallProvider existieren (Sprint 20 WP6); Quarantine ist netzwerkseitig
  kein neues Problem (Default-Deny-Egress).
* **Scanner als Container** passt ins Isolationsmodell: Scanner läuft selbst
  sandboxed (Tier-Kontext des Deployments, Artikel #5), externe Binaries statt
  gelinkter Abhängigkeiten (Mandat 7 bleibt intakt).
* **Report-Infrastruktur existiert:** `security_events`, Forensik-Report,
  Security-Page — Findings brauchen nur ein neues Event-Format, kein neues
  Backend-Konzept.
* **Identitätskette greift weiter:** Scans und Freigaben sind an Session/
  Project gebunden — wer was freigibt, ist auditiert.

## 3. Work Packages

### WP0 — Recon + Tool-Entscheidung (blockiert)

* Inventur der Hook-Punkte in der Deploy-Engine (`internal/deploy`): wo lässt
  sich ein Gate-State sauber einhängen (build → quarantine → scan → promote)?
  Wie erreichen Scanner-Container das Quarantine-Target (Docker-Netz)?
* **Tool-Stack entscheiden (E-D1):** Katana (Crawl) + nuclei (Template-Vuln-Scan)
  als Paar — beide OSS, containerisiert; Alternativen: ZAP (schwer, voll
  ausgestattet), OWASP-Scripts selbst. Tendenz: Katana+nuclei, JiMesh-eigene
  Checks (Auth/Secrets/Headers) im Go-Daemon daneben. Lizenzen + Image-Quellen
  verifizieren (kein unbetroffenes Vendor-Image blind trusten — Pin by Digest).
* **Scope entscheiden (E-D4):** nur JiMesh-deployed Apps (Deploy-Engine-Pfad)
  oder auch Discovery-gefundene Apps/Ports (Auto-Discovery-Pfad)? Tendenz:
  Deploy-Pfad zuerst (Gate greift vor Exposure), Discovery-Pfad danach —
  dort ist der Gate *nach*träglich (App läuft schon), das ist ein eigener Flow
  (Auto-Scan + Warnung statt Block).

### WP1 — Scan-Runner (containerisiert, sandboxed)

* Scan-Container mit Katana+nuclei gegen das Quarantine-Target: Timeouts,
  Rate-Limits, Resource-Caps (Scanner darf das Target nicht lahmlegen),
  Report als strukturiertes JSON (kein Log-Parsen).
* Scanner selbst unter **Egress-Allowlist des Workspaces**: Scanner darf NUR
  das Target erreichen — kein Exfiltrations-Kanal durch den Scanner selbst
  (Target-URL fest genubbt, DNS-Pinning wie in WP5/Sprint 20-Muster).
* JiMesh-eigene Checks im Go-Daemon: Auth-Enforcement-Probe (Endpoint ohne
  Token aufrufen → 200 = Finding), Secret-Muster in Responses (Reuse
  `internal/scanner`), Header-Hygiene (CSP, HSTS, Server-Banner), offene
  Ports gegenüber Deployment-Manifest (Drift = Finding).

### WP2 — Gate-Workflow + HITL-Promotion

* Deployment-Zustandsmodell erweitern: `quarantine → scanning →
  (held | ready)` → Operator-Promotion → `live`. Re-Scan-Trigger: Manifest-
  Änderung, Image-Wechsel, manuell, periodisch (E-D3).
* **HITL-Promotion (K-LAF §7, erster echter Einsatz):** `ready` wird nicht
  automatisch `live` — Dashboard-Freigabe (Y/N) mit annotiertem Verdict.
  Auto-Promote nur als explizite Opt-in-Policy pro Projekt (Clean-Record-
  Streak), nie als Default.
* **Fail-Verhalten (E-D2):** Scanner-Ausfall/Timeout → `held` mit lauter
  Markierung (fail-closed) oder weiter mit Warnung (fail-open)? Tendenz:
  **held** — ein Deployment, das ohne Scan live geht, macht den ganzen Gate
  zur Deko; anders als beim Entropy-Gate ist hier kein Traffic-Verlust zu
  befürchten, nur eine verzögerte Exposure.


**IaC-Scan-Stufe (Checkov, 9.9.2026 ergänzt):** bevor die laufende App
gescannt wird, scannt ein Checkov-Container (pinned by digest) das
Deployment-Manifest (docker-compose/terraform) im Quarantäne-Status —
Misconfiguration-Gates (offene Ports, privileged containers, docker.sock-
Mounts ohne Guard) schlagen VOR dem Start der App an. **Gate-Executor-Option Jenkins:** der Scan-Stage muss nicht im
JiMesh-Deploy-Engine-Shell-Schritt laufen — Teams mit bestehender Jenkins-
Pipeline hängen die Quarantäne-Stufe als eigenen Stage an (SKILL-Bundle
liefert `jenkins_pipeline.groovy`: `bridgecrew/checkov:latest`-Image,
`-o json -o junitxml`, JUnit-Artifact für die Jenkins-Report-UI,
`always:`-when damit Findings auch bei Failed-Scan sichtbar bleiben,
`--hard-fail-on CRITICAL` als Gate-Breaker). JiMesh-Seite reicht: der
Redeploy-Endpoint kann einen Jenkins-Webhook triggern und den Promotion-
Status (`quarantine → held`) aus dem Jenkins-Ergebnis ableiten — HITL-
Promotion bleibt unverändert im Dashboard.

Findings als
`security_events` (`iac_finding`) in die WP3-Pipeline. Gate-Modus nach
Progressive-Adoption-Muster (AgentSecOps-Skill-Referenz): Bestandsprojekte
starten mit `--soft-fail` + `--create-baseline` (nur NEW Findings blocken
den Gate), `--hard-fail-on CRITICAL` als Default für Neudeploys;
Suppressions inline mit Begründung + Security-Review für CRITICAL/HIGH. Damit deckt die
Triade: Sprint 28 (Code+SAST+IaC pre-commit) → hier (IaC-Manifest +
laufende App) → HITL-Promotion.

## 6. Umsetzungsstand IaC-Gate + HITL (TASK-059, 13.9.2026 — gebaut und live verifiziert)

Die IaC-Scan-Stufe dieses Sprints ist geliefert — als Post-Deploy-Gate in
der realen Deploy-Pipeline (NICHT als Jenkins-Executor; die bleibt eine
dokumentierte Option für Teams mit eigener Pipeline):

- **Stage:** nach jedem erfolgreichen `POST /api/projects/deploy` /
  `/api/projects/redeploy` läuft der gepinnte Checkov-Container
  (`bridgecrew/checkov:3.2.421@sha256:0545…` + JiMesh-Compose-Policies,
  gebaut als `jimesh-iac-checks`-Image aus den go-embed'ten Policies —
  `internal/deploy/quarantine.go`) über die gemountete Workspace-Konfig.
  CRITICAL → `docker stop` des Workspace-Containers, `sessions.status=
  'quarantined'` + `workspaces.status='quarantined'` (Mandat 3: Zustand
  überlebt Restarts), `iac_finding`/`quarantine`-Events, Alert via
  `/api/sdk/logs` (type=audit, alias=checkov). Der Code-Server-Sidecar
  läuft bewusst weiter — Remediation-Fenster. E-D2 (Fail-Verhalten): der
  Scanner selbst bricht → fail-open mit LAUTEM `iac_scan_failed`-Event —
  nichts wurde gefunden, der Scanner ist kaputt, nicht das Workspace;
  still wäre Mandate-2-Verstoß.
- **HITL-Release (erster echter K-LAF-§7-Einsatz):**
  `POST /api/security/quarantine/release` — OPA-admin-gated (gleiche Engine
  wie freeze/release, `internal/policy/policy.go`) PLUS explizites
  `confirm:true` im Body; `GET /api/security/quarantine` ist die
  Operator-Worklist (`internal/security/quarantine.go`). Release startet
  den Container, flippt die Stati zurück und warnt ehrlich: die Config
  wurde NICHT neu verifiziert.
- **SAST v1 im selben Gate:** gosec (Go-Source) / trivy (Runtime-Image),
  warn-first — der Quarantine-Stop gehört allein den IaC-CRITICALs.
- Offen (v2, ehrlich): DAST-Stage WP1 (Katana/nuclei gegen das laufende
  Target), volles Zustandsmodell `quarantine → scanning → held|ready →
  live` mit Promotion-Dashboard, Baseline/Drift-Modus, Port-Discovery-
  Anschluss (E-D4 Stufe 2), Jenkins-Executor-Bundle.
### WP3 — Findings-Pipeline + Security-Page

> **Notification-Anbindung:** `held` durch DAST-Findings publishet
> `deploy.dast_findings` (warn), entdeckter Port ohne Gate-Record
> `deploy.port_discovered` (warn) — via `notify.Publisher` (Sprint 30 WP2).
> Schema/Vertrag: `docs/SCHEMA-notifications.md` §2/§6.

* Findings → `security_events` (neues Format `dast_finding`: Regel-ID, URL,
  Severity, Template-ID — **keine rohen Response-Bodies**, Nested-Injection-
  Lektion Sprint 19; Referenz statt Zitat, wie WP3b/Sprint 28).
* Security-Page pro Deployment/Endpoint (Operator-Anforderung: Komponente aus
  der Hierarchie rendern): Findings, Scan-Historie, Gate-State, Promotions-
  Protokoll.
* Anbindung Port-Discovery: neu entdeckter Port/Endpoint ohne Gate-Record =
  sichtbares Warn-Event (Discovery-Pfad, E-D4).

### WP4 — Doku

* `API_DOCS.md`: neue Routen (Scan-Trigger, Verdict-Read, Promotion) — WP2
  definiert sie, Doku in derselben Änderung (Mandat).
* `USER_GUIDE.md` Security-Kapitel: Gate-Flow, HITL-Promotion, Findings.
* Backlog-Spiegel + Sprint-28-Querverweis aktualisieren (E-S4 verweist hierher).

## 4. Entscheidungen (E-D-Serie)

| # | Entscheidung | Blockiert | Status |
|---|---|---|---|
| E-D1 | Scanner-Stack: Katana+nuclei (Tendenz) vs. ZAP vs. eigener Crawler; Images by-Digest pinnen | WP1 | OFFEN — Tendenz Katana+nuclei |
| E-D2 | Gate-Verhalten bei Scanner-Ausfall: held (fail-closed, Tendenz) vs. fail-open + Warnung | WP2 | OFFEN |
| E-D3 | Scan-Tiefe/Frequenz: pro Promotion, periodisch, bei Manifest-Drift; Depth-Limits gegen Target-Erschöpfung | WP1, WP2 | Default gesetzt: pro Promotion + bei Drift, periodisch optional |
| E-D4 | Scope: Deploy-Pfad zuerst (Gate vor Exposure); Discovery-Pfad danach (nachträglicher Auto-Scan + Warnung statt Block) | WP0 | Default gesetzt |

## 5. Akzeptanzkriterien (Mandat 2 — verifiziert, nicht behauptet)

* Deployment mit absichtlich vulnerablem Demo-Endpoint (Auth fehlt, Secret in
  Response) → Scan findet beides, Deployment bleibt `held`, Findings erscheinen
  auf der Security-Page, **ohne** rohe Response-Bodies im Event.
* Sauberes Deployment → `ready`, Promotion nur über Dashboard-Freigabe,
  Protokoll mit Wer-hat-freigegeben (Session-Bindung).
* Scan-Container kann außerhalb des Targets nichts erreichen (Egress-Test:
  zweiter Host/Domain blockiert, DNS-Pinning aktiv).
* Scanner-Crash → Deployment bleibt `held` (E-D2-Verhalten verifiziert, je
  nach Entscheidung mit lauter Markierung).
* Neu entdeckter Port ohne Gate-Record erzeugt Warn-Event auf der
  Security-Page (Discovery-Pfad, sofern E-D4-Stufe 2 umgesetzt).

## 6. Artikel-/Doc-Integration

* **#4b (Pre-Commit/SAST/DAST-Dreiklang):** dieser Sprint ist die DAST-Stufe —
  Artikel verlinkt hierher, Dreiklang-Formulierung steht schon in der Pipeline.
* **#5 (Sandbox-Artikel):** Scanner-in-Sandbox ist ein Kapitel darin.
* **Knowledge-Base:** Gate-Flow + HITL-Promotion werden USER_GUIDE-Material;
  Port-Discovery-Anschluss an die Security-Page-per-App-Roadmap des
  Frontend-Tracks.
