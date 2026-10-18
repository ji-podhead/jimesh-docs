# TASK-059 — Checkov IaC-Scan + Quarantine-Stage (Sprint-28/29)

**Status:** ✅ umgesetzt 13.9.2026, live verifiziert (E2E unten) | **Quelle:**
SPRINT-28-KERNEL-SAST-PRECOMMIT.md + SPRINT-29-DEPLOYMENT-SECURITY-GATES.md
(Vollpläne 8.9., nie begonnen).

## Fundstellen

- SPRINT-28: Kernel-SAST/Pre-Commit — Commit-Stufe, eBPF-LSM-Ansatz
- SPRINT-29: DAST-Stage + HITL-Exposure — Deployment-Gates
- Beide haben Checkov als IaC-Scanner-Stage eingeplant (BACKLOG:479)
- Claude's Agent starb beim Image-Pull, nie wieder gestartet
- Scanner-Infra existiert: internal/scanner/ (Regex-Secret-Scan, live)

## Aufgabe

1. **Checkov-Container in deploy/scan/:** docker-compose (opt-in Profile
   scan), Checkov-Image gepinnt; Scans auf Workspace-Compose-Files
2. **Quarantine-Stage:** Deploy-Pipeline bekommt eine Gate-Stufe — nach
   Deploy wird Checkov auf die Workspace-Konfiguration losgelassen;
   CRITICAL-Funde → Container wird gestoppt (quarantined) + Operator-Alert
   via /api/sdk/logs (type=audit, alias=checkov)
3. **SAST-Stage (v1 vereinfacht):** statt eBPF-LSM (Kernel-abhängig, v2):
   Gosec/Staticcheck auf den Workspace-Source (falls Go) oder Trivy auf
   das Image — der BESTEHende Regex-Scanner läuft bereits, das ist die
   Erweiterung um IaC
4. **HITL-Exposure:** Quarantine-Release nur durch Operator-Confirm (das
   Freeze/Release-Muster aus K-LAF WP3 wiederverwenden!)

## Regeln

- CGO_ENABLED=0; Checkov = Container (Python, kein Go-Dependency)
- Scope: deploy/scan/**, internal/scanner/ (Erweiterung), Task-File.
  NICHT src/frontend, NICHT internal/siem, NICHT cmd/jimesh-router
- No-Mock: echte Checkov-Scans gegen echte Test-Compose
- GIT: explizite Pfade, kein -A, NICHT pushen

## Akzeptanz — ✅ alle vier live verifiziert (13.9.)

- [x] **docker compose --profile scan up → Checkov läuft** —
      `deploy/scan/docker-compose.yml`, Profile `scan` (checkov+gosec+trivy,
      alle digest-gepinnt); Checkov-Scans gegen die Fixtures live gelaufen.
- [x] **Test-Compose mit absichtlicher Critical-Regel → Quarantine greift** —
      LIVE E2E gegen einen echten Workspace-Deploy:
      `deploy/scan/testdata/vulnerable/docker-compose.yml` → 6× CRITICAL
      (CKV_JIMESH_COMPOSE_1..4, alle vier Regeln gefeuert, Datei:Zeile in
      jedem Fund) → `docker stop` des Workspace-Containers,
      `securityGate.status="quarantined"` in der Deploy-Response. Die
      Clean-Fixture deployed → `passed`, 0 Befunde — der ehrige Null-Fall
      ist ebenfalls verifiziert (Redeploy mit gehärteter Compose, Container
      blieb Up).
- [x] **Alert in /api/sdk/logs sichtbar (alias=checkov)** —
      LIVE: `GET /api/sdk/logs?type=audit` zeigt die ERROR-Row alias=checkov
      (agent=iac-gate) mit strukturiertem Payload: Funde mit
      check_id/severity/wo, quarantined=true, Container, scan_ms.
- [x] **Release nur mit Operator-Confirm** —
      LIVE: `POST /api/security/quarantine/release` ohne `confirm:true` →
      400 mit Begründung; mit `confirm:true` → Container wieder Up
      (`docker ps`: Up), Session `active`, Workspace `deployed`, Release-
      Audit-Row (alias=checkov, INFO). Route ist OPA-admin-gated wie
      freeze/release (`policy.IsAdminMutation`); Worklist:
      `GET /api/security/quarantine`.

## Umsetzung — wo es liegt

- **`deploy/scan/`** — Compose (Profile `scan`: checkov/gosec/trivy,
  digest-gepinnt), README (Betrieb + ehrliche Grenzen + Fail-open-Rationale),
  `checks/` (JiMesh-Compose-Policies CKV_JIMESH_COMPOSE_1..4:
  privileged, docker.sock, Port-Bind ohne Loopback = MANDATES §12 als Code,
  host-Namespaces), `testdata/{vulnerable,clean}/`. Live-Befunde, eingearbeitet:
  checkov 3.x hat KEIN docker-compose-Framework mehr (3.2.421-Liste
  verifiziert) → Policies laufen auf dem generischen yaml-Framework;
  OSS-checkov liefert KEINE severity-Metadaten → die Policies setzen
  `severity="CRITICAL"` selbst (+ kuratierte Stock-Klasse in Go).
  Loader-Falle: `__init__.py` im Checks-Dir ist Pflicht, sonst scannt
  checkov stumm 0 Ressourcen (verifiziert).
- **`src/backend/internal/scanner/iac.go`** (+ `iac_test.go` gegen echte
  Tool-Output-Shapes, + `policies/` embed-Spiegel mit Sync-Test) — Parser
  (Checkov Liste+Objekt, gosec inkl. Compile-Error-Zähler, trivy
  HIGH/CRITICAL-Filter), argv-Verträge, digest-gepinnte Image-Konstanten,
  `JiMeshCriticalCheckIDs` (kuratierte Stock-Critical-Klasse).
- **`src/backend/internal/deploy/quarantine.go`** — die Gate-Stage nach
  Deploy: baut `jimesh-iac-checks:<rev>` aus den embedded Policies
  (tar-Build-Context über stdin — keine Host-Pfade nötig), lokal oder
  remote (`docker save | ssh docker load`, Socket-Guard-Modell), Scan mit
  `timeout`-Budget, CRITICAL → `docker stop` + Session/Workspace-Status
  `quarantined` + `iac_finding`/`quarantine`-Events + Audit-Alert;
  fail-open mit LAUTEM `iac_scan_failed` wenn der SCANNER bricht (nichts
  gefunden ≠ gescannt — Mandate 2); `scanOnly` für Framework `jimesh`
  (kein einzelner Workspace-Container — dokumentierte v1-Grenze).
  `DeployRequest.iacGate`: on (default) | warn | off.
- **`src/backend/internal/security/quarantine.go`** — HITL-Fläche:
  Worklist (`GET /api/security/quarantine`), Release (confirm-Pflicht,
  `docker start`, Statusheilung Session+Workspace, Events + Audit-Row);
  Muster 1:1 aus freeze.go (K-LAF WP3).
- **Wire-ups** — `policy.go` (adminPrefixes `/api/security/quarantine`),
  `security.go` (Register), `store` (`ListSessionsByStatus`,
  `ListWorkspacesByStatus`, `GetWorkspaceBySession`, Status-Vokabular
  `quarantined`, direction `none`), `API_DOCS.md` (2 neue Routen +
  iacGate/securityGate-Felder + Backend-Audit-Writer-Note),
  SPRINT-28/29-Checkoffs, BACKLOG-Spiegel.

## Ehrliche Grenzen (v2, dokumentiert)

- eBPF-LSM (Sprint-28 WP1/WP2) bleibt v2 — das Gate ist die
  containerbasierte SAST/IaC-Stufe, kein Kernel-Sensor.
- DAST (Katana/nuclei gegen das laufende Target), volles
  Promotion-Zustandsmodell, Baseline/Drift-Modus, staticcheck (kein
  gepinntes offizielles Image — kein unpinned Netz-Fetch in einer
  Security-Stage), Jenkins-Executor-Bundle: offen, dokumentiert.
- SAST v1 ist warn-first (gosec/trivy-Funde erzeugen Events + Audit-Rows,
  aber keinen Stop) — der Quarantine-Stop gehört allein den
  IaC-CRITICAL-Regeln (progressive Adoption).
- Remote-SSH-Pfad des Gates ist gebaut (save|load-Vertrieb wie
  socket-guard), aber nur der LOKALE Pfad ist live verifiziert (kein
  Remote-Node in der Testumgebung) — gleicher ehrliche Grenzstand wie
  beim WAF (TASK-057).
