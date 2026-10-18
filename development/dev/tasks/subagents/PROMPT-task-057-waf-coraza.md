# TASK-057 — WAF als Utility-Container: Coraza/Caddy-Sidecar (SPRINT-31, WP0–WP4)

**Status:** ✅ erledigt (14.9.2026, WP0–WP2 + WP4; live verifiziert:
SQLi/XSS 403 von Coraza gegen das echte gebaute Image, Kontrollgruppe
durch, legitimer Request durch, Sweep getestet; WP3 als TODO im Wiring,
Remote-SSH-Smoke-Test offen) | **Quelle:** SPRINT-31-WAF-UTILITY-DEPLOYMENT.md
(Vollplan 8.9., nie begonnen) + Operator 14.9. („was ist mit WAF? das fehlt
auch noch bitte den blog lesen und die sprints und research").

**E-W0 (WAF-Wahl): Coraza als Caddy-Modul — gilt als entschieden** durch
Operator-Mandat 14.9. („subagent starten" = Freigabe der Sprint-31-
Empfehlung): Apache-2.0 (AGPL-Risiko von BunkerWeb vermieden), kein
DB-Konsolen-Backend nötig (SafeLine 4GB-RAM fällt weg), Go-Stack passt.
Sprint-31 §2-Entscheidungstabelle im File nachziehen (empfohlen→entschieden).

## Fundstellen (ALLE aus SPRINT-31, dort nachlesen!)

- Muster: ensureSocketGuardImage* (projects_ssh.go:357-412), socketGuardName
  (167), egressNetName (165), dockerBindLoopback (461), Undeploy-Sweep
  (1350-1351)
- Portproblem §4: WAF schiebt sich ZWISCHEN Tunnel-Endpunkt (127.0.0.1:port)
  und App-Container — App verliert -p, WAF bindet Loopback + proxied intern
- WP0: cmd/waf-sidecar/ = Dockerfile mit xcaddy build --with coraza-caddy/v2
  + OWASP-CRS eingebettet; ensureWAFImageLocal/Remote (1:1 Socket-Guard-Muster)
- WP1: executeDeploy-Wiring, wafContainerName = jimesh-waf-<projID>, Opt-in
  per DeployRequest-Flag, Undeploy-Sweep
- WP2: CRS-Standardregeln default-an; Custom-Rules = Datei-Rendering später
- WP3: Exposure-Scan zeigt faced_by_waf:true (Feld ergänzen, Nacharbeit)
- WP4: USER_GUIDE-Kapitel; API_DOCS nur falls Toggle-Endpoint entsteht

## Aufgabe

Implementiere WP0→WP1→WP2 (WP3-Feld als TODO-Kommentar, WP4-Doku).

## Regeln

- CGO_ENABLED=0; WAF = eigener Container (kein JiMesh-Link), Caddy-Binary
  mit Coraza-Plugin im Image
- Scope: cmd/waf-sidecar/** (neu), internal/deploy/projects_ssh.go (Wiring,
  vorsichtig — dort laufen 037/055 NICHT, aber sauber diffen!), USER_GUIDE,
  SPRINT-31-Checkoffs. NICHT src/frontend, NICHT deploy/siem, NICHT
  internal/security/vault.go
- No-Mock/Mandat-2-Akzeptanz aus SPRINT-31 §5: echter SQLi-Payload (' OR
  '1'='1) + XSS-Payload gegen Test-Deployment live per curl blockiert
  (403 von Coraza), Kontrollgruppe ohne WAF erreicht App, legitimer Request
  geht durch, Undeploy entfernt Sidecar — falls Remote-Deploy hier nicht
  testbar (kein SSH-Target in dieser Umgebung): lokales Docker-Äquivalent
  bauen und die Remote-Seite als ehrlicher Test-TODO dokumentieren
- GIT: explizite Pfade, kein -A, NICHT pushen (Staging-Lesson!)
- Build: make go-build && make go-vet, gofmt

## Akzeptanz (aus SPRINT-31 §5, dort vollständig)

- [x] jimesh-waf-<nameKey> läuft im selben Netz wie der Workspace-Container
  (dockerNetFlag, live: docker ps im Test-Netz jimesh-net-waftest)
- [x] SQLi/XSS geblockt (live curl gegen echtes gebautes Image: 403,
  Coraza-Log 941100/941110/941390/949110 CRS 4.25.0 + 942er-SQLi-Match),
  legitimer Request durch (200, App-Antwort durch die WAF), Kontrollgruppe
  direkt gegen App: 200 (WAF beweisbar im Pfad)
- [x] Opt-in-Flag `waf` im DeployRequest, ohne = byte-identisches Verhalten
  (nur no-op-Sweeps; Unit-Tests: projects_ssh_waf_test.go)
- [x] Undeploy räumt WAF auf (wafSweepCommands live getestet: Container
  weg, No-Op-Rerun exit 0)
- [x] SPRINT-31-Checkoffs + E-W0-Status im File nachgezogen (§3, §5, §7)
