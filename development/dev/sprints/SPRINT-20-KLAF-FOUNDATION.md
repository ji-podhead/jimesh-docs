# Sprint 20 — K-LAF Foundation: Identität, Scanner, Freeze

> **Status:** PLANNED. Kein Code geschrieben.
> Spezifikation: `docs/K-LAF-ARCHITECTURE.md`
> Vorgeschichte: `docs/sprints/SPRINT-19-SECURITY-INCIDENT-KLAF.md`

## Ziel

Die tragfähige Basis für K-LAF: eine **fälschungssichere Identitätskette** vom
LLM-Request zum Container, ein **Scanner-Hook** im Gateway und die Fähigkeit, einen
Workspace **einzufrieren**. Ohne verlässliche Identität ist jede Erkennung nur eine
Warnung ohne Adressat.

Explizit **nicht** in diesem Sprint: eBPF, Suricata, VM-Isolation, gVisor. Diese
Schichten setzen auf der Identitätskette auf und beantworten die Frage „wer redet an
JiMesh vorbei?" — eine echte Frage, aber die letzte in der Reihe.

## Leitentscheidung

Die Reihenfolge im ursprünglichen Entwurf war umgekehrt: Er begann bei der
Kernel-Ebene, die am schwersten zu bauen ist und den realen Angriff **nicht gestoppt
hätte**, und behandelte die Gateway-Ebene — wo JiMesh bereits sitzt und wo der Schaden
entstand — als selbstverständlich.

---

## Work Packages

### WP0 — Hygiene (Vorbedingung, ~1 Tag)

Kleine Dinge, die heute aktiv schaden.

- [ ] `docker-compose.yml`: Vault-Port auf `127.0.0.1:8200` (Working Tree, uncommitted) committen und Container neu erstellen
- [ ] `scripts/verify-stack.sh`: Default-Port `9091` → `19091`, sonst läuft `make verify` ins Leere
- [ ] Port-Drift in `README.md`, `API_DOCS.md`, `OPERATOR_GUIDE.md`, `GEMINI.md`, `docs/BUILD-STATUS.md` (9091/9092/9090 → 19091/19092/19090)
- [ ] `make recreate-backend` existiert nicht — an 6 Doc-Stellen auf `restart-backend` korrigieren
- [ ] `projects_ssh.go`: `|| true` am Ende der Firewall-Regelketten entfernen. Eine fehlgeschlagene Regel muss das Deployment abbrechen, nicht durchwinken
- [ ] `SECURITY.md` neu schreiben — verweist derzeit auf ein fremdes Repo und eine fremde Meldeadresse
- [ ] Neues Mandat 12 in `MANDATES.md`: jede Port-Bindung explizit auf `127.0.0.1`, keine Ausnahme (Fall: Vault 8200, Sprint 19)

- [ ] **KRITISCH** `projects_ssh.go`: `-p $ALLOC_*:port` → `-p 127.0.0.1:$ALLOC_*:port` (3 Stellen). Heute binden DSH/noVNC/code-server auf `0.0.0.0`; die nachgelagerten ufw-Regeln greifen nicht, weil Docker über DNAT/FORWARD an der INPUT-Kette vorbeiläuft — exakt der Incident-Mechanismus
- [ ] **KRITISCH** code-server wird mit `PASSWORD=""`, `PUID=0`, `PGID=0`, `--restart unless-stopped` deployt: Root-Shell im Browser ohne Auth. Passwort erzwingen oder Auth-Proxy davor
- [ ] noVNC (Port 6080) hat keine erkennbare Auth — gleiche Behandlung
- [ ] `network/port_detection.go`: `PortInfo` verwirft die Bind-Adresse. Feld `BindAddr` ergänzen und Regex-Gruppe auswerten — ohne das kann JiMesh `127.0.0.1:6080` nicht von `0.0.0.0:6080` unterscheiden
- [ ] `KnownPorts` aktualisieren (9090/9091 → 19090/19091)
- [ ] Hardcodierte Gateway-IP `[REDACTED-TS-IP]` in `projects_ssh.go:424` (Zeile 431 macht es richtig via `$SSH_CLIENT`)

**Akzeptanz:** `make verify` läuft ohne gesetzte Umgebungsvariable durch. Kein Deployment publiziert auf `0.0.0.0`. Keine UI ohne Auth.

**Ersetzt:**  `docker ps`
zeigt keine `0.0.0.0`-Bindung.


### WP0 — Stand 6. September 2026

**Erledigt und verifiziert** (`make go-build` + `make go-vet`, beide exit 0, Container `golang:latest`):

- [x] Alle **vier** publizierenden `docker run`-Aufrufe in `projects_ssh.go` binden auf `127.0.0.1` (es waren vier, nicht drei)
- [x] code-server: zufälliges Passwort pro Deployment (`crypto/rand`), UID/GID 1000 statt 0, Passwort in der API-Response, Log-Redaktion für Passwort und `GIT_TOKEN`
- [x] ufw-Regelketten entfernt — sie griffen bei Docker-publizierten Ports nie (DNAT umgeht INPUT), und `|| true` machte aus dem Fehlschlag einen Erfolg. Begründung steht im Code. `undeploy` räumt Alt-Regeln weiter auf
- [x] Hardcodierte Gateway-IP raus; ohne auflösbare IP bricht das Deployment ab statt still das Falsche zu schreiben
- [x] `PortInfo.BindAddr` ergänzt; Regex erfasst jetzt auch **IPv6 (`[::]`) und Wildcard `*`** — die waren vorher komplett unsichtbar. Dedup-Schlüssel von `port` auf `bindAddr/port` geändert, sonst verdeckte `127.0.0.1:80` ein `0.0.0.0:80`
- [x] `IsExternalBind`, `IsExternallyReachable`, `IsLoopbackOnly`, `ExternallyReachable` — unparsbare Adressen gelten absichtlich als extern (Richtung Alarm ausfallen)
- [x] `KnownPorts` auf 19090/19091/19092
- [x] `scripts/verify-stack.sh` Default auf 19091
- [x] Port-Drift in README, API_DOCS, OPERATOR_GUIDE, GEMINI, BUILD-STATUS korrigiert (die historische Aussage über den gelöschten Node-Tier auf 9090 blieb stehen)
- [x] `make recreate-backend` → `restart-backend` an allen Fundstellen
- [x] `BUILD-STATUS.md` ehrlich: datiertes Verifikations-Logbuch statt pauschalem Grün, mit „Still open"-Liste
- [x] **Makefile-Bug behoben**: `go-build`/`go-vet`/`go-test` machten `cd src/backend` und mounteten dann `$PWD/src/backend` — der Pfad verdoppelte sich, der Container bekam ein leeres Verzeichnis. Jetzt `$(CURDIR)`. Der von Mandat 6 geforderte Verifikationsweg funktionierte vorher gar nicht
- [x] **Makefile-Port-Drift behoben** (6.9.2026, gleiche Bug-Klasse): `HTTP_HOST_PORT := 9091` → `19091` — der `restart-backend`-Wait-Loop schaute auf den ALTEN Gateway-Port und lief bei jedem Lauf in einen falschen Timeout (exit 2), obwohl der Backend längst healthy war (Live-Befund: Health ok auf 19091, `restart-backend` meldete trotzdem ✗)
- [x] **Wait-Loop 90 → 150 Iterationen (300 s)** (6.9.2026): der Per-Recreate-`docker.io`-apt-Install (~3 min, `[entry] installing docker.io (one-time per container)` läuft bei JEDEM force-recreate neu) frisst die alte 180-s-Budget — der Backend kam nach Ablauf der Wartezeit hoch, make meldete bereits Fehler. Offen (eigene Baustelle): apt-Install ins Image backen oder cachen, dann ist `restart-backend` wieder eine ~1-min-Schleife
- [x] `SECURITY.md` neu gegen den echten Code; Mandat 12 in `MANDATES.md`
- [x] **Vault-Healthcheck-Bug behoben** (6.9.2026): `VAULT_ADDR` fehlte in der Environment, `vault status` fiel auf den CLI-Default `https://127.0.0.1:8200` zurück — Server spricht im Dev-Mode HTTP. Healthcheck meldete dauerhaft `unhealthy`, obwohl Vault real lief (`/v1/sys/health` antwortete korrekt). `VAULT_ADDR: "http://127.0.0.1:8200"` ergänzt, recreated, jetzt `healthy`. Loopback-Bindung aus WP0 hielt über den Recreate
- [x] Legacy-Docs nach `docs/legacy/` (löst die Case-Kollision `architecture.md`/`ARCHITECTURE.md`), Provider-ToS gerettet nach `docs/PROVIDER-TOS.md`, `research/ultra.md` gelöscht (md5-identisch mit R18), `docs/README.md` als echter Index neu

**Neu gefunden, noch offen:**

- [x] **KRITISCH — Dashboard ohne Login.** ~~Seed-Account `admin@jimesh.local / admin`; solange er unangetastet ist, zeigt das Dashboard **keinen Login-Screen**.~~ **Gefixt 6.9.2026 (fail-closed, Crew-Muster aus TASK-004/005):** kein Default-Admin mehr — `seedDefaultAdmin` → `bootstrapDashboardAuth`: (1) Legacy-Offen-Zustand (`dashboard_default_auth=true`) wird beim Start gewiped → Setup-Screen beim nächsten Load, (2) `JIMESH_ADMIN_PASSWORD`/`JIMESH_ADMIN_EMAIL` seeden direkt aus der Env, (3) sonst Setup-Screen (remote weiter mit One-Time-Code). `/api/*` verlangt jetzt **immer** eine Session (`authConfigured`-Bypass entfernt), `/api/auth/*` + `/health` + statisch + `/v1/models` bleiben frei. Frontend unverändert (`AuthGate` hatte den Setup-Flow schon), i18n-Keys vorhanden. Dateien: `internal/gateway/auth.go`, `internal/gateway/gateway.go`. Migration: laufende Instanz zeigt beim nächsten Restart Setup statt offenes Dashboard — Daten unberührt, nur der Seed-Credential stirbt.
- [x] ~~`ssh.InsecureIgnoreHostKey()` in `projects_ssh.go:~264` — MITM-anfällig~~ **Gefixt 6.9.2026 (TASK-008, Nacharbeit):** `dialSSH` (jetzt Zeile 577) nutzt `network.TOFUHostKeyCallback` über denselben Store wie `tunnelPool`; `tunnelPool.SetHostKeyStore`/`sshHostKeyStore` wurden vorher nirgends aufgerufen — beide Pfade waren dark. Wiring jetzt in `gateway.New` (`internal/gateway/gateway.go`, `tunnel.go`, `projects_ssh.go`). `security-audit`-Check 4 (`vault.go`) und `API_DOCS.md` korrigiert (meldeten den Fund fälschlich weiter). `dialSSH`s `ssh.Password("")`-Fallback bleibt bestehen — separates, kleineres Thema.
- [x] ~~`chmod -R 777` auf dem Agent-Workspace (`projects_ssh.go:~490`)~~ **Gefixt 6.9.2026 (TASK-009):** statt `chmod -R 777` (jede Datei world-writable, inkl. SSH-Keys der Agenten) setzt jetzt eine gemeinsame Policy-Funktion `jimesh_ws_perms` an BEIDEN Fundstellen (lokal + remote) auf: (1) `chown -R 1000:1000` + `chmod -R u+rwX,go=rX` — Workspace gehört code-server (uid 1000), Legacy-777-Bits werden durch das `=`-Präfix aktiv entfernt, Exec-Bits bleiben erhalten; (2) Non-Root-SSH-User ohne CAP_CHOWN: `setfacl -R -m u:1000:rwX` + Default-ACLs auf Dirs + `chmod -R o-w`; (3) dokumentierter Last-Resort `a+rwX` nur wenn beides fehlt (exakt die alte Reichweite). Root-basierte Runtime-Container verlieren nichts (root umgeht Rechteprüfungen); opencode-vnc (unbekannte UID, unauditiertes Image) verliert ggf. Schreibzugriff, Lesen bleibt. Verifiziert: `make go-build`/`go-vet` exit 0 (Container, Worktree); Branch-Tests in Containern — Root-Caller: 644 bleibt 644, Exec bleibt 755, Legacy-777 → o+w weg, alles 1000:1000; ACL-Zweig (uid-999-Caller): ACL `user:1000:rwx` + Default-ACLs gesetzt, 777→775, uid 1000 schreibt+liest, uid 1234 verweigert; Last-Resort (alpine ohne setfacl): rc 0, altes Verhalten; Root-Files + Non-Root-Caller: rc 0, unverändert (gleiche Grenze wie das alte `|| true`). Datei: `src/backend/internal/gateway/projects_ssh.go`.
- [ ] `GIT_TOKEN` und das code-server-Passwort stehen in der Kommandozeile und in Container-Envs — auf dem Node per `docker inspect` lesbar
- [ ] Toter Code: der `jimesh`-Branch sedet `5173:5173` in der Remote-Compose; das Muster passt auf die aktuelle Datei nicht mehr. Griffe es auf einem alten Checkout, würde es auf `0.0.0.0` publizieren
- [ ] `.env.example` ist FreeLLMAPI-Erbe: dokumentiert `ENCRYPTION_KEY` (der Code liest `JIMESH_ENCRYPTION_KEY`), eine `.encryption-key`-Datei „neben der SQLite-Datenbank", `PORT=3001`
- [ ] `OPERATOR_GUIDE.md` L127/L129 verlinken auf die verschobenen Legacy-Docs — auf `docs/ARCHITECTURE.md` bzw. `docs/legacy/` umbiegen
- [ ] `docs/i18n/zh-CN/` verweist ~10× auf verschobene Dateien
- [x] `tunnel.go:85` konsumiert `ParsePorts`, gibt das neue `bind_addr` aber nur durch — **Erledigt 6.9.2026 (TASK-013):** Tunnel-Scan evaluated jetzt selbst (`EvaluatePortInfos(ports)` mit Exposure/Ontologie/Risk), Route `GET /api/security/exposure` registriert, `internal/gateway/exposure.go` + `firewall_provider.go` (Interface + NftablesProvider Detect/Apply/Status) auf main. Build+Vet ✅, Live-Smoke nach Deploy offen
- [ ] API_DOCS: `POST /api/projects/deploy` und `/redeploy` liefern neu `codeServerPassword` und `securityNotes`; `ufwRule` wird angenommen aber ignoriert
- [ ] Routen-Zählung: mechanisch **170** distinkte `HandleFunc`-Muster, nicht gegen API_DOCS.md abgeglichen

**Operator-Aufgaben (Code allein reicht nicht):**

1. **Jedes bestehende Projekt neu deployen.** Laufende Container behalten `0.0.0.0`-Bindings und das passwortlose Root-code-server. Prüfen: `docker ps --format '{{.Names}}\t{{.Ports}}' | grep jimesh-`
2. Zugang ist ab jetzt tunnel-only: `ssh -N -L <local>:127.0.0.1:<alloc> <user>@<node>`. Dashboard-Links auf `http://<node>:<port>` brechen
3. `JIMESH_GATEWAY_IP` setzen, falls `$SSH_CLIENT` nicht verlässlich ist — sonst bricht der Remote-Deploy jetzt ab
4. Alt-ufw-Regeln auf vorher deployten Nodes aufräumen
5. `ghcr.io/ji-podhead/opencode-vnc:latest` auditieren — weiterhin ohne Auth, die Loopback-Bindung ist die einzige Kontrolle
6. Kontaktadresse in `SECURITY.md` ausfüllen (als ⚠️ markiert)
7. Vault-Container neu erstellen, damit der Compose-Fix greift (In-Memory-Dev-Mode: Secrets gehen dabei verloren)

### WP1 — Identitätskette (der Kern)

- [ ] Migration `sessions`: `parent_session_id`, `container_id`, `project_id`, `status`
- [ ] Session-Token beim Provisioning minten (`ExecuteSelfProvisioning`), in `vault_tokens` mit TTL ablegen, als Env in den Container injizieren
- [ ] Gateway: Token aus Header auflösen → Session → Container. **Agent wählt seine Identität nie selbst**
- [ ] Zweite Bindung: Source-IP → Container über Docker-API
- [ ] Divergenz beider Bindungen als eigenes Threat-Signal loggen
- [ ] `request_log` um `session_id` erweitern
- [ ] Zwei Vertrauensklassen unterscheiden: von JiMesh provisioniert (autoritativ) vs. fremd entdeckt (Heuristik, nur Warnung)

**Akzeptanz:** Für jeden Request durch `/v1/chat/completions` aus einem
provisionierten Container ist die Container-ID über zwei unabhängige Wege bestimmbar.
Ein Agent, der eine fremde `session_id` behauptet, wird erkannt.

**Abhängigkeit:** `github.com/docker/docker/client` in `go.mod` — fehlt heute.

### WP2 — Scanner-Hook

- [x] Interface `Scanner` mit `Scan`, Verdict `{allow, warn, block}` — `internal/scanner/scanner.go`
  (`ScanRequest`/`ScanResponse` als getrennte Methoden nicht nötig — eine `Scan(content string)`
  reicht, die Aufrufstelle entscheidet über `direction` fürs Logging)
- [x] Hook in den Proxy-Pfad, **Antwortseite zuerst** — `internal/ai/scanner_hook.go`, verdrahtet
  in `handleChatCompletionsProxy`s Non-Streaming-Zweig (`internal/ai/proxy.go`)
- [x] Regex-Scanner: `sk-`, `gho_`/`ghp_`/`ghu_`/`ghs_`/`ghr_`, `BEGIN … PRIVATE KEY`,
  `.env`-Zeilenform (API_KEY/SECRET/PASSWORD/TOKEN/PRIVATE_KEY-Variablennamen, nicht jede
  `KEY=VALUE`-Zeile — sonst Fehlalarm auf normalem Modell-Output), AWS-Access-Key-ID +
  Secret-Access-Key — `internal/scanner/scanner.go` `NewRegexScanner()`
- [x] Redaktion vor Weitergabe (`[REDACTED_API_KEY]` etc.), Fund als `security_events`-Row
  (`internal/store/security_events.go`)
- [x] **Modell-Scanner als eigene Chain über das bestehende Mesh — gebaut 13.9.2026**
  (`internal/ai/guard_hook.go`): Llama Guard (nicht Prompt Guard — Begründung im
  Datei-Doc-Kommentar: Llama Guard ist ein Chat-Modell, das ohne neue Calling-Convention
  auf `/v1/chat/completions` passt; Prompt Guard ist ein Classifier mit eigener
  Request/Response-Form, halb beides zu bauen wurde verworfen). Läuft als eigene,
  konfigurierbare Chain (`settings["guard_scanner.chain_id"]`, Default `"guard-scanner"`)
  über `h.svc.Route()` — Bandit-Feedback (`EmitRouteEvent`) und Budget-Buchung
  (`RecordRequestSummary` → `ChargeSessionBudget`, Mandat 10) exakt wie der Haupt-Proxy-Pfad,
  plus ein kleiner Failover-Walk (`MarkRouteFailure`/`ClearRouteFailure`) über bis zu 3
  Chain-Einträge. Hook läuft auf BEIDEN Seiten: Request (vor dem Upstream-Call — blockt mit
  403, bevor eine Prompt-Injection/Jailbreak-Anfrage überhaupt beim Modell ankommt oder
  abgerechnet wird) und Response (nach dem Regex-Scanner, ADDS statt Replace — ersetzt
  `choices[0].message.content` bei unsafe-Verdict durch eine kontrollierte Meldung).
  Config-gated, standardmäßig AUS (`settings["guard_scanner.enabled"]`, Mandat 2): fehlt
  das Flag ODER die Chain hat keinen Eintrag, überspringt der Hook ehrlich (geloggt) statt
  ein "safe" vorzutäuschen — keine neue HTTP-Route nötig, läuft über das bestehende generische
  `GET/PUT /api/settings/{key}`. `security_events`-Row bei unsafe: `scanner="llama-guard"`,
  `event_type="unsafe_content"`, `detail` trägt NUR die Taxonomie-Kategorien (z.B. `"S1,S9"`),
  nie den geprüften Rohinhalt — exakt die gleiche Redaktionsdisziplin wie der Regex-Scanner.
  Auch `internal/security/forensics.go`s `classifyEvent` um `"unsafe_content"` →
  `"prompt_injection"` erweitert (die alte "kein Detektor existiert" Notiz wäre sonst falsch
  geworden).
- [x] Fail-open vs. fail-closed pro Scanner konfigurierbar (`Scanner.FailMode()`); Regex-Scanner
  deklariert `FailOpen` (läuft in-process, kann praktisch nicht ausfallen). Der Modell-Scanner
  (obiger Punkt) ist ebenfalls fail-open (E2-Default), aber NICHT über das `Scanner`-Interface
  gebaut (braucht Mesh/HTTP, nicht nur `Scan(content string)`) — eigene Fail-Open-Logik in
  `guardCheckRequest`/`guardCheckResponse`, mit lautem Log statt stillem Fenster

**Akzeptanz erfüllt, live verifiziert (7.9.2026):** echter `/v1/chat/completions`-Call gegen
einen Fixture-Upstream, der `.env`-Inhalt (API-Key + Passwort) in der Antwort zurückgibt —
Response kommt redigiert an (`[REDACTED_API_KEY]`/`[REDACTED_SECRET]`), bleibt valides JSON,
`security_events` bekommt Zeilen (Detail-Feld enthält nie das Rohsecret). Latenz per
Go-Benchmark: < 1ms für 100 Durchläufe über eine realistisch große Antwort
(`internal/scanner/scanner_test.go` `TestRegexScanLatency`).

**Vier reale Bugs bei der Live-Verifikation gefunden und gefixt** (Unit-Tests mit einfachem
Text hatten sie nicht gezeigt — erst ein echter, JSON-verpackter Response deckte sie auf):
1. `^`/`$`-Zeilenanker in der `.env`-Regel matchten nie, weil ein JSON-Response die echten
   Zeilenumbrüche des Modells als die zwei Zeichen `\n` kodiert, nicht als echtes Newline-Byte.
2. `\S+` als Wert-Klasse ist nicht durch das JSON-String-Ende (`"`) oder eine Escape-Backslash
   begrenzt — hat auf einer echten Response quer durchs restliche JSON bis zum nächsten echten
   Leerzeichen gematcht und dabei mehrere Felder mit einem einzigen `[REDACTED_...]` überschrieben
   (echte Response-Korruption, nicht nur unvollständige Redaktion).
3. Ein `(?i)` über das ganze Pattern machte auch `[A-Z0-9_]*` case-insensitive — hat das
   klein geschriebene "n" aus einem vorangehenden `\n`-Escape mit ins Match gezogen und einen
   nackten Backslash ohne folgendes Zeichen hinterlassen (ungültiges JSON-Escape).
4. Nachdem Fund 3 behoben war (kein pattern-weites `(?i)` mehr), verhinderte ein `\b`-Anker am
   Match-Anfang das Matchen direkt nach besagtem "n" (kein Wort/Nicht-Wort-Übergang zwischen
   zwei Buchstaben) — Anker entfernt, die case-sensitive Zeichenklasse reicht als Grenze.

Jeder Fund hat einen Regressionstest in `internal/scanner/scanner_test.go`
(`TestDotenvLeakInsideJSONPayload`, `TestRedactionPreservesJSONStructure`).

**Modell-Scanner — Akzeptanz erfüllt, live verifiziert gegen echtes Postgres
(13.9.2026, `jimesh_test`, kein Go-Toolchain-Host — via
`docker run golang:latest` + `jimesh_jimesh-net`):** vier Tests in
`internal/ai/guard_hook_test.go`, alle grün gegen eine echte
`jimesh_test`-Datenbank (kein Mock-Store):
1. `TestGuardCheckResponse_Unsafe_RedactsAndRecordsSecurityEvent` — ein
   Fixture-"Llama-Guard" antwortet `unsafe\nS9` auf eine synthetische
   Bomben-Bauanleitung im Modell-Output; die zurückgegebene Antwort trägt
   die Kontroll-Meldung statt des Rohinhalts, genau eine `security_events`-
   Row landet mit `scanner="llama-guard"`, `verdict="block"`,
   `direction="response"`, `detail` enthält `"categories=S9"` und **nicht**
   den geprüften Rohtext (per Assertion geprüft).
2. `TestGuardCheckResponse_Safe_PassesThrough` — `safe`-Verdict lässt die
   Antwort unverändert durch, keine Row.
3. `TestGuardCheckRequest_Unsafe_Blocks` — die Request-Seite (das eigentliche
   Prompt-Injection/Jailbreak-Enforcement) blockt mit 403 VOR jedem
   Upstream-Call, Row mit `direction="request"`.
4. `TestGuardConfigured_OffByDefault` — ohne `guard_scanner.enabled`/
   `guard_scanner.chain_id` ist `guardConfigured()` `false` und beide Hooks
   sind strikte No-ops (Mandat 2: kein fingiertes "safe").
Kein reales Llama-Guard/NIM-Zugangstoken vorhanden oder nötig — der
Guard-Call ist nur ein weiterer `/v1/chat/completions`-Call über die Mesh,
ein Fixture-HTTP-Server im dokumentierten Llama-Guard-Antwortformat ist ein
getreuer Stand-in. Was NICHT verifiziert ist: ein echtes Llama-Guard-Modell
auf NIM (Prompt-Format-Drift bei einem echten Modell bliebe unentdeckt) und
der volle End-to-End-Pfad durch `handleChatCompletionsProxy` selbst (die
Tests rufen `guardCheckRequest`/`guardCheckResponse` direkt, nicht über
einen echten HTTP-Request gegen den laufenden Server — der Verkabelungspunkt
in `proxy.go` wurde nur durch Code-Review + Kompilierbarkeit abgesichert,
nicht durch einen Integrationstest über den echten Handler).

### WP3 — Freeze-Review-Release ✅ (8.9.2026, live verifiziert)

- [x] Drei der vier Stufen: Token sperren (`RevokeSessionTokens`) → kontrollierte
      Fehlerantwort → `docker pause` (lokal oder remote via `network.Pool`,
      `internal/security/freeze.go`). Egress-Blackhole (4. Stufe) bewusst
      **nicht** gebaut — siehe Begründung im Code-Kommentar von `freeze.go`:
      der bestehende `internal/network/egress.go` rendert nur eine statische
      Allowlist beim Deploy, kein Live-Blackholing eines laufenden
      Containers; das ist ein eigener, größerer Task.
- [x] `POST /api/security/freeze` / `POST /api/security/release` /
      `GET /api/security/events` (`internal/security/security.go`)
- [x] Kontrollierte Sicherheitsmeldung statt Modellantwort — `auth.FrozenSessionMessage`,
      referenziert sowohl von der Gateway-Middleware (Token bereits revoked)
      als auch von `internal/ai.policyDenyResponse` (Status noch aktiv,
      `ResolvePolicy` greift), damit die Meldung unabhängig davon konsistent
      ist, welche Schicht die Anfrage tatsächlich ablehnt.
- [x] Tabelle `security_events` (bereits aus WP2), `sessions.status`/`trust_class`
      (bereits im Schema vorhanden, jetzt mit `SetSessionStatus` beschrieben)
- [x] Nur `trust_class='provisioned'` darf eingefroren werden; `discovered`
      erzeugt nur eine Warnung (`FreezeResult{Applied:false}`), kein Pause.

**Akzeptanz — live verifiziert (8.9.2026):** Test-Container `klaf-freeze-test`
+ Test-Session (`trust_class='provisioned'`), Ablauf: Request mit Session-Token
→ freeze → Container zeigt `Up ... (Paused)`, `sessions.status='frozen'`,
`vault_tokens.revoked=1`, erneuter Request liefert `auth.FrozenSessionMessage`
(HTTP 403) → release → Container unpaused, `status='active'`,
`revoked=0`, Request wieder möglich (scheitert danach nur noch am fehlenden
Test-Provider, nicht mehr an Auth). `security_events` zeigt `freeze`/`release`
Zeilen. Fixtures wieder entfernt.

**Zwei echte Bugs während der Verifikation gefunden und gefixt (nicht WP3-Logik,
sondern vorbestehende Auth-Lücken, die WP1+WP3 sonst wirkungslos gemacht
hätten):**

1. **Die Gateway-Middleware (`internal/auth/auth.go`, `Middleware`) akzeptierte
   für `/v1/*` bei `gateway_auth_enabled=true` ausschließlich den einen
   geteilten Admin-`api-key`.** Ein von `MintSessionToken` ausgestelltes
   Session-Token (WP1 — genau das, was `internal/provisioning/bridge.go` als
   `OPENAI_API_KEY` in jeden provisionierten Container injiziert) erfüllte
   diesen Check strukturell nie und wurde schon an der Middleware abgewiesen,
   bevor `ResolveSessionID`/`ResolvePolicy` überhaupt erreicht wurden. Damit
   hatte die gesamte WP1-Identitätskette bisher **keine Wirkung auf echten
   `/v1/*`-Traffic**, solange `gateway_auth_enabled=true` ist (Standard seit
   dem 6.9.2026-Audit) — und ein Freeze wäre bedeutungslos gewesen, weil der
   Agent ohnehin nie mit seinem Session-Token durchkam. Fix: Middleware
   akzeptiert jetzt zusätzlich ein gültiges Session-Token
   (`store.ValidateSessionToken`) als Alternative zum Admin-Key.
2. **Nach Fix 1 landete ein *revoked* Session-Token (frisch eingefroren) trotzdem
   nur bei der generischen „invalid or missing gateway key"-Meldung** — die
   in WP3 vorgesehene, lesbare Freeze-Meldung (`policyDenyResponse`) lag in
   `ResolvePolicy`, das aber nie erreicht wird, wenn das Token schon an der
   Middleware als revoked scheitert. Fix: `auth.FrozenSessionMessage` als
   einzige Quelle, von der Middleware direkt zurückgegeben, sobald
   `ValidateSessionToken` mit `store.ErrTokenRevoked` fehlschlägt (aktuell die
   einzige Ursache für ein revoked Session-Token).

### WP4 — Forensik-Report ✅ (7.9.2026, live verifiziert)

- [x] Report-Assembly aus `sessions`, `request_log` (neu: `RequestLogsBySession`,
      Index `idx_request_log_session`), `security_events` (neu:
      `ListSecurityEventsBySession`) — `internal/security/forensics.go`,
      `BuildForensicReport`. **Traffic Inspector nicht eingebaut:** das
      bestehende `internal/security/traffic_inspector.go` ist ein globaler
      RAM-Ring pro Edge (`source→target`), nicht pro Session — hat keine
      Historie, die sich auf ein einzelnes Event zurückführen ließe; **Tracing
      (Langfuse)** ist ein reiner Push-Client ohne lokale Query-API — der
      Report gibt stattdessen die `trace_id`s aus `request_log` zurück
      (`traceIds`), damit der Operator sie selbst in Langfuse nachschlägt.
- [x] CPU/RAM pro Container über `docker stats --no-stream --format '{{json .}}'`
      (gleicher `runOnProjectNode`-Dispatch wie WP3, kein Docker-SDK). Werte
      werden als von Docker bereits formatierte Strings durchgereicht
      (`"0.42%"`, `"12MiB / 512MiB"`) statt neu geparst.
- [x] Klassifizierung — **bewusst schmal, nicht vorgetäuscht:** einziger
      heute laufender Detektor ist WP2s Regex-Secret-Scanner, also mappt
      `classifyEvent` nur `event_type="secret_leak"` → `"exfiltration"` (ein
      Secret, das die Response verlässt, ist genau das) und
      `freeze/freeze_requested/release/release_warning` → `"response_action"`
      (das sind WP3-Lifecycle-Einträge, keine Bedrohungserkennung). Alles
      andere kommt als `"unclassified"` mit ehrlicher Begründung zurück —
      für Injection/Privilege-Escalation/Scanning/Ressourcen-Missbrauch
      existiert schlicht noch kein Detektor; das wäre je ein eigener,
      größerer Task (Prompt-Analyse, Traffic-Heuristiken).
- [x] `GET /api/security/report/{eventId}` (session-gated wie alle
      `/api/*`-Routen, nicht der Gateway-Key)
- [x] **Payloads werden redigiert gespeichert** — de facto bereits erfüllt,
      ohne neuen Code: `security_events.detail` ist schon immer nur ein
      redigierter Scanner-Snippet (`Finding.Snippet`, siehe `internal/scanner`),
      `request_log` enthält nie Prompt-/Response-Inhalt. **E3 (Löschfrist)
      bleibt rechtlich offen, ist aber aktuell gegenstandslos** — es gibt
      nichts Unredigiertes, das eine Löschfrist bräuchte.
- [ ] **Payload-Darstellung im Dashboard ist inert** — das ist eine
      Frontend-Anforderung (Report-Inhalte niemals an ein Modell
      weiterreichen), vom Backend aus nicht erzwingbar/prüfbar. Für die
      parallele Frontend-Session als eigener Task zu übergeben, sobald ein
      Report-Widget gebaut wird (analog TASK-020).

**Akzeptanz:** Ein Threat-Event erzeugt einen Report mit Session-Verlauf
(`relatedEvents`+`requestLog`), Systemmetriken (`containerStats`) und
Klassifizierung, ohne Klartext-Secrets abzulegen — live verifiziert mit
einem echten Container (`docker stats` gegen echte Werte), 2 `request_log`-
Zeilen, 1 `security_events`-Zeile: Report enthält alle vier Abschnitte
korrekt befüllt. Degradation live geprüft: entfernter Container →
`containerWarning` statt Fehlschlag; unbekannte `eventId` → 404;
nicht-numerische `eventId` → 400; ohne Session → 401.

### WP5 — Egress-Allowlist ✅ (8.9.2026, live verifiziert — Akzeptanz-Test gegen echtes Ruleset)

- [x] Default-Deny-Egress pro Workspace, Allowlist auf JiMesh-Gateway, Registries, Git-Remote
  — `network.EgressRuleset.Render()` + Apply-Mechanik aus
  `egressApplyCommand` (nft im shared netns, CAP_NET_ADMIN, /lib/modules ro).
  Per-Project-Extras existieren (TASK-012 §3), Registry-Re-Resolve inkl.
  Refresh (ResolveRegistries). **Live verifiziert** (8.9.2026, Test-Container
  im isolierten Bridge-Netz mit dem byte-identisch gerenderten Ruleset):
  npm-Registry-IPv4 → TCP-OK, github → TCP-OK, 1.1.1.1 → DROP,
  api.anthropic.com → DROP (Timeout, vorher Baseline-404 = erreichbar).
- [x] Agenten-Container erhalten Provider-Endpunkte **nicht** direkt — LLM-Traffic wird zwangsweise über JiMesh geroutet
  — bewiesen durch denselben Test: nur Gateway/Git/Registries sind im
  Allowlist-Set, Provider-Domains fallen unter policy drop. Hinweis für
  lokale Dev-Stacks: JiMesh publishes 19091 auf 127.0.0.1
  (HOST_BIND) — der Gateway-Edge gilt auf Remote-Nodes über
  $SSH_CLIENT-IP/JIMESH_GATEWAY_IP; lokal bindet der Dev-Stack bewusst
  loopback-only.
- [ ] VNC/Web-UIs strikt auf `localhost` in der VM, Zugang nur über authentifizierten Reverse Proxy — **OFFEN**: das Framework-Image
  bindet 6080 auf alle Interfaces, die Deploy-Response kennt nur die
  ehrliche securityNote (TODO(security, noVNC)); Image-Source fehlt im
  Repo — eigener Reverse-Proxy-Pfad folgt.
- [x] **Cloud-Metadata-Service sperren:** `169.254.169.254` und `fd00:ec2::254` auf Deny in jeder Agenten-Allowlist. Auf AWS/GCP liefert dieser Endpunkt Instance-Role-Credentials **ohne API-Key** — ein kompromittierter Agent umgeht damit Vault, Identitätskette und Policy vollständig. Gilt auch für VMs, die JiMesh nicht selbst angelegt hat
  — live bewiesen im selben Test (Metadata-Timeout statt Antwort);
  Deny-Ziele sind zusätzlich aus ALLEN Allow-Quellen gefiltert.
- [ ] **Cloud-Metadata-Service sperren:** `169.254.169.254` und `fd00:ec2::254` auf Deny in jeder Agenten-Allowlist. Auf AWS/GCP liefert dieser Endpunkt Instance-Role-Credentials **ohne API-Key** — ein kompromittierter Agent umgeht damit Vault, Identitätskette und Policy vollständig. Gilt auch für VMs, die JiMesh nicht selbst angelegt hat

**Akzeptanz:** Ein Container im Workspace-Netz erreicht `api.anthropic.com` nicht
direkt, JiMesh aber schon. Damit wird die Gateway-Inspektion unumgehbar.
→ 8.9.2026 bewiesen: Baseline (ohne Ruleset) anthropic HTTP-404 erreichbar,
mit Ruleset Timeout/Drop; Metadata droppt; fremde IPv4 droppt; Registry+
Git durchlassen. **Dabei echter Produktionsbug gefunden und gefixt:**
`Render()` gab IPv4-Literale auch als `ip6 daddr`-Regeln aus — nft lehnte
die GESAMTE Tabelle ab, d.h. jeder echte Deploy hätte eine **unfiltered
Workspace-Egress** gelassen (fail-open). Fix: family-korrekte Ausgabe
(`ip` vs `ip6`), Deploy-Platzhalter bleiben substituierbar, Deploy-Tests
angepasst/erweitert; Ruleset applyt jetzt sauber.


### WP6 — Exposure Dashboard & FirewallProvider

Die Ansicht muss **tatsächliche Erreichbarkeit** zeigen, nicht konfigurierte Absicht.
Die ufw-Regeln sagten "eingeschränkt", die Realität war "offen" — eine Ansicht, die nur
die Konfiguration spiegelt, hätte grün angezeigt.

- [ ] Drei Quellen zusammenführen: `ss -tlnp` (mit Bind-Adresse), `docker ps` Port-Mappings, `nft list ruleset` / `iptables -S DOCKER-USER`
- [ ] Risiko-Einstufung mit Ontologie-Kontext: Bind auf `0.0.0.0` + Web-UI + keine Auth = kritisch; über `tailscale0` erreichbar = eigene Stufe (Hotspot-NAT deckt das nicht ab); Loopback = unkritisch
- [ ] "Ist das wirklich zu?"-Test: echte Verbindung von einem anderen Interface statt Config-Analyse
- [ ] `FirewallProvider`-Interface: `Detect() Capabilities`, `Apply(RuleSet)`, `Status() []EffectiveRule`
- [ ] Implementierung `nftables` — eingebaut, immer verfügbar, Regeln aus dem JiMesh-Modell generiert
- [ ] Optionale Implementierungen: OPNsense/pfSense per API, Cloud-Security-Groups (Hetzner, AWS)
- [x] Frontend-Exposure-Tabelle (TASK-013 Frontend-Teil, Branch `task/013-frontend-exposure`): `/security/exposure` im Analytics-Menü — Spalten Port · Bind-Adresse (inkl. Docker-Container) · Kategorie · Risk-Badge (critical=rot, high=orange, elevated=gelb, ok=grün) · Risk-Reason; kritisch zuerst sortiert; ehrliche Empty-/Error-/Scan-Quellen-Zustände (No-Mock); `apiFetch` mit Session-Token; i18n über alle 60 Locales

**Begründung Enforcement selbst besitzen:** Freeze heisst "DROP-Regeln für Container X".
Das ist an die Identitätskette gekoppelt — eine Appliance, die keine Sessions kennt,
kann das nicht leisten. OPNsense ist keine Firewall, sondern eine Management-Oberfläche
für eine; JiMesh hat bereits eine Oberfläche. Daher Integrations-*Ziel*, nicht Abhängigkeit.

### WP7 — Workspace-Integrität & Execution-Sandbox

Isolationsschichten schützen den **Host vor dem Agenten**. Sie schützen **nicht das Repo
vor dem Agenten** — aus Kernel-Sicht ist `rm -rf` im gemounteten Workspace legitim.

- [x] Git-Worktree pro Task (`.jimesh/tasks/<session_id>/`) statt Arbeit im Hauptcheckout — TASK-014: `workspace_integrity.go`, Deploy-Verdrahtung `DeployRequest.TaskID` (Branch `task/014-workspace-integrity`)
- [x] Snapshot vor Task-Start; Merge zurück erst nach Review (= HITL-Gate an der sinnvollsten Stelle) — TASK-014: `POST /api/projects/task/apply` nur mit `confirm:true`; Konflikt = 409 ohne Auto-Auflösung
- [x] Execution-Sandbox für generierten Code, getrennt vom persistenten Workspace: `--network=none --read-only`, kein Repo-Mount — TASK-014: `exec_sandbox.go`; `--runtime=runsc` nur nach echter Detection, sonst runc + lautem Degradation-Grund (E6); Zusatz-Fund: Hosts, die `no-new-privileges` am Container-Start ablehnen (nested Docker), bekommen einen Retry ohne das Flag + lautem Report
- [ ] Sandbox-Zustand verifizieren und im Dashboard anzeigen, nicht nur ihre Anwesenheit — Frontend-Follow-up (Backend liefert die Daten bereits: `GET /api/projects/task/status`, `availableRuntimes`/`runtimeDegraded` im Sandbox-Response)

**WP7 — Plan (TASK-014, Branch `task/014-workspace-integrity`):**

Ziel: Der Agent bearbeitet ein Projekt nie wieder direkt im Hauptcheckout — Task-Start
isoliert per Git-Worktree, Rückkehr nur über ein manuelles Merge-Gate; generierter Code
läuft getrennt davon in einer Wegwerf-Sandbox ohne Netz und ohne Repo-Mount.

Arbeitspakete:
1. `internal/gateway/workspace_integrity.go` — Task-Lebenszyklus als Git-Mechanik
   (Ausführung lokal via `sh -c` oder remote via SSH, gleiche Befehlsketten wie der
   Deploy-Pfad): `POST /api/projects/task/start` (Repo-Check → Snapshot-Branch
   `jimesh/task-snapshot-<sid>` + nicht-destruktiver Stash-Capture für uncommittete
   Änderungen via `git stash create/store` → `git worktree add` nach
   `.jimesh/tasks/<sid>`), `GET /api/projects/task/status` (live aus
   `git worktree list --porcelain` abgeleitet), `POST /api/projects/task/apply`
   (HITL-Gate: nur mit `confirm:true`; Merge des Task-Branchs in den aktuellen
   Branch des Hauptcheckouts, Konflikt = 409 ohne Auto-Auflösung),
   `POST /api/projects/task/discard` (Worktree + Task-Branch entfernen; Snapshot
   bleibt als Audit-Spur). Nicht-Git-Projekt: bewusst KEIN Fallback — 422 mit
   Begründung (Merge-Gate ohne Git nicht implementierbar; Kopie hätte weder
   Snapshot noch Apply/Discard-Semantik).
2. Deploy-Verdrahtung: `DeployRequest.TaskID` — gesetzt ⇒ die Framework-/Editor-Container
   mounten den Task-Worktree statt des Hauptcheckouts; fehlt der Worktree, bricht das
   Deploy laut ab (E6: laut degradieren, nicht still). `git fetch/reset --hard` im
   `jimesh`-Framework entfällt bei taskId (würde den Task-Branch zerschießen).
3. `internal/gateway/exec_sandbox.go` — `POST /api/exec/sandbox`: Snippet wird in ein
   Wegwerf-Tempverzeichnis geschrieben und NUR dieses read-only gemountet
   (`--network=none` fest verdrahtet, `--read-only`, `--cap-drop=ALL`,
   `--pids-limit`, `--memory`, inneres `timeout` + outer Context-Kill + benannter
   Container für Orphan-Cleanup). Runtime-Erkennung je Aufruf über
   `docker info --format '{{json .Runtimes}}'`: `runsc` vorhanden ⇒ isoliert;
   sonst `runc` mit `degraded:true` + Grund im Response (E6-Default: degradieren und
   laut melden). Ausführung erfolgt auf dem Backend-Host (Docker-CLI-Shellout, kein
   SDK — Mandat 7); Remote-Nodes sind Folgearbeit und werden in API_DOCS so benannt.
4. Zustand lebt im Git des Projekts (Branches, Worktrees, Stash), nicht in
   PostgreSQL — `status` liest live aus Git; ein DB-Spiegel würde driftet (Mandat 2).
   Dashboard-Anbindung der Sandbox-/Task-Zustände: Frontend-Follow-up.

Akzeptanz: `make go-build`/`go-vet` sauber; Unit-Tests für Sanitizer/Parser;
Live-Smoke (Throwaway-DB-Backend): `echo hello`-Snippet über `/api/exec/sandbox`
liefert stdout zurück, `/work` zeigt nur das Snippet (kein Repo im Container),
Netz ist tot; Task start → worktree → commit → apply erzeugt den Merge im
Hauptcheckout erst nach `confirm:true`; Report nennt, ob `runsc` verfügbar war.

**WP7 — Umgesetzt (TASK-014, ehrlich):** Build (`go build ./...`), Vet
(`go vet ./...`) und die komplette Gateway-Testsuite (22 neue Tests,
end-to-end gegen echte Git-Repos: start→worktree→WIP-Carry→status→apply
incl. Konflikt-409→discard mit Verlust-Schutz) sind grün im
`golang:latest`-Container. Das HTTP-Routen-Live-Smoke (echo hello über
`/api/exec/sandbox` gegen ein laufendes Backend mit DB) lief NICHT in dieser
Task — stattdessen: der exakte `docker run`-Aufruf der degradierten
Sandbox-Route wurde auf dem Test-Host live ausgeführt (Snippet-only-Mount,
`network=none` tot, `read-only`, exit 0 mit stdout zurück) und die
Task-Lebenszyklus-Kernfunktion lief end-to-end gegen echte Repos. Test-Host:
`runsc` NICHT installiert (nur `runc`/`io.containerd.runc.v2`) ⇒
`runtimeDegraded:true` + Grund im Response; Zusatzfund: der Test-Host lehnt
`no-new-privileges` am Container-Start ab (nested Docker) ⇒ E6-Retry ohne
das Flag, laut gemeldet. Operator-Smoke-Kommandos stehen im TASK-014-Report.

**Lehre aus dem Incident:** DSH hatte bereits eine Sandbox (Landlock). Sie lief nur
teilweise (`landlock-run: partial enforcement (older Landlock ABI)`) und hat das in eine
stderr-Zeile geschrieben, die niemand las. Gleiches Muster wie ufw-vs-Docker und wie ein
stiller `runc`-Fallback. **Degradieren muss laut passieren.**

**Nicht kaufen:** E2B/Modal/Daytona lösen Multi-Tenant-SaaS ohne eigene Infrastruktur.
gVisor + `--network=none` + git worktree deckt den Fall ab.

### WP8 — Statische Analyse (eBPF als Tripwire, Userspace als Analyst)

- [ ] eBPF/Tetragon meldet **Ereignisse**: `execve` mit verdächtigen Argumenten (`curl | sh`), Schreibzugriff auf Pfade ausserhalb des Workspace, Öffnen unerwarteter Sockets, Download+chmod+exec-Sequenz
- [ ] Userspace-Analyst bewertet **Inhalte**: Semgrep-Regeln bzw. AST-Analyse auf dem geschriebenen Code
- [ ] Kopplung an die Identitätskette: Ereignis → Container → Session → Freeze
- [ ] **Klartext an der TLS-Grenze (R19):** uprobe/uretprobe an `SSL_write`/`SSL_read` + Ring Buffer + kleiner Klassifikator im Sidecar (bestätigt E1-Default A). Grenze: greift auf Node-Stacks (DSH, Claude Code, Gemini CLI), **nicht** auf Go-Binaries (`crypto/tls`). Kernel-Drop erst nach E2-Klärung (fail-closed per Definition). Alternative: OTLP-Korrelation über AgentSight statt eigener eBPF-Arbeit — siehe `docs/research/R19-llm-firewall-landscape.md`

**Warum nicht in eBPF selbst:** eBPF-Programme laufen in einer verifizierten VM mit
begrenzter Instruktionszahl, beschränktem Stack und Terminierungszwang. Ein AST parsen
oder einen Klassifikator ausführen geht dort nicht. eBPF sieht *dass* etwas passiert ist
— *was* es bedeutet, entscheidet Userspace.

---

## Reihenfolge und Begründung

```
WP0 (Hygiene)  →  WP1 (Identität)  →  WP2 (Scanner)  →  WP3 (Freeze)  →  WP4 (Report)
                        ├────────────  WP5 (Egress) parallel  ────────────┤
                        ├────────────  WP6 (Exposure) parallel  ──────────┤
                        └────────────  WP7 (Workspace) parallel  ─────────┘
                                                          WP8 (eBPF) nach WP3
```

WP1 vor WP2, weil ein Fund ohne Adressat wertlos ist. WP5 parallel, weil es
unabhängig ist und für sich genommen bereits das meiste Exfiltrationsrisiko schließt.

## Neue Abhängigkeiten

| Paket | Wofür | Status |
|---|---|---|
| `github.com/docker/docker/client` | Container-Auflösung, Stats, Pause | **nicht gebraucht** — WP3 nutzt wie `internal/provisioning/bridge.go` reines `exec.Command("sh","-c","docker …")` (lokal) bzw. `network.Pool.Exec` (remote via SSH), kein Docker-Go-SDK (Mandate: kein Docker-SDK, siehe `internal/security/freeze.go`) |

Kein eBPF, kein quic-go, kein mcp-go in diesem Sprint.

## Nicht in diesem Sprint

eBPF/Tetragon · Suricata · VM-Isolation (KVM/libvirt) · gVisor-Runtime ·
HITL-Gate · ephemere Workspaces · XCP-ng (verworfen, siehe `docs/K-LAF-ARCHITECTURE.md` §5)

---

## 🔶 Offene Entscheidungen

> **Regel:** Jede Entscheidung hat einen **Default**, damit nichts blockiert. Der Default
> gilt, bis er widersprochen wird — aber er ist ausdrücklich als ungeprüft markiert und
> muss vor dem Merge des betroffenen WP bestätigt oder überstimmt werden.
>
> Grund für diese Regel: Das Entropy-Routing (E7) liegt seit vier Research-Docs
> unentschieden herum, und deshalb weiß heute niemand, welche der vier Varianten der
> Code tatsächlich implementiert. Das soll sich hier nicht wiederholen.

| # | Entscheidung | Blockiert | Status |
|---|---|---|---|
| E1 | Scanner-Laufzeit | WP2 | OFFEN |
| E2 | Fail-open vs. fail-closed | WP2 | OFFEN |
| E3 | Payload-Aufbewahrung | WP4 | OFFEN — rechtlich, aber aktuell gegenstandslos: es wird nirgends unredigierter Payload gespeichert (siehe WP4-Abschnitt) |
| E4 | Ein-Operator vs. Mehrbenutzer | WP3, WP4 | OFFEN |
| E5 | Freeze-Reichweite | WP3 | Default gesetzt |
| E6 | Runtime-Degradation | WP0/später | Default gesetzt |
| E7 | Entropy-Routing | (Altlast) | OFFEN seit Sprint 13 |

### E1 — Wo läuft der Injection-Klassifikator?

**Konflikt:** Prompt Guard (DeBERTa, 22M/86M) braucht ONNX Runtime, ONNX Runtime braucht
cgo — **Mandat 7 schreibt `CGO_ENABLED=0` fest.**

| Option | Latenz | Kosten | Haken |
|---|---|---|---|
| **A. Rust/C++-Sidecar, Unix-Socket** | ~5–20 ms | keine | zweite Sprache im Build |
| B. Python-Sidecar | ~20–50 ms | keine | Python-Runtime im Deployment; von `DECISIONS.md` #15 bereits genehmigt |
| C. Llama Guard durchs eigene Mesh | ~200–500 ms | Tokens | Provider-Abhängigkeit im Hot Path |
| D. cgo erlauben, Mandat 7 aufweichen | ~5 ms | keine | bricht ein Mandat |

**Default: A.** Ein separater Prozess umgeht den CGO-Konflikt vollständig — es wird nichts
in die Go-Binary gelinkt. Schneller als B, ohne Provider-Abhängigkeit von C, ohne
Mandatsbruch von D. C bleibt zusätzlich als asynchrone Nachbewertung im Forensik-Report
(WP4) sinnvoll, nicht im Hot Path.

**Zu klären:** Ist eine zweite Toolchain (Rust) im Build akzeptabel?

### E2 — Was passiert, wenn der Scanner ausfällt?

**Fail-open:** Traffic läuft weiter, Vorfall wird geloggt. Kein Ausfall, aber ein Fenster
ohne Schutz.
**Fail-closed:** Requests werden abgelehnt. Kein ungeprüfter Traffic, aber der
Scanner-Ausfall legt den gesamten Proxy still.

**Default: fail-open, pro Scanner konfigurierbar, Ausfall als lautes Dashboard-Ereignis.**
Ein Sicherheitswerkzeug, das den Betrieb lahmlegt, wird abgeschaltet — und dann schützt es
gar nicht. Der Regex-Scanner (Stufe 1) läuft in-process und kann praktisch nicht ausfallen;
das Risiko betrifft nur den Sidecar.

**Zu klären:** Gilt das auch für die Antwortseite? Dort ging beim Incident der Schaden raus
— ein Argument für fail-closed genau dort.

### E3 — Payload-Aufbewahrung (DSGVO)

Der Forensik-Report braucht den Prompt und die Antwort. Beides kann Secrets **und**
personenbezogene Daten enthalten. Ohne Aufbewahrung ist der Report wertlos, mit
Aufbewahrung entsteht ein sensibler Datenbestand.

Zu entscheiden: Speichern wir überhaupt? Redigiert oder roh? Wie lange? Wer darf lesen?
Was passiert bei einem Auskunfts- oder Löschersuchen?

**Default: nur redigiert speichern** (Secret-Muster bereits beim Schreiben maskiert),
**Löschfrist 30 Tage**, Zugriff nur für Operator-Rolle, jeder Zugriff in `vault_audit_log`.

**Zu klären — das ist keine Entwicklerentscheidung.** Wenn JiMesh als Produkt an Dritte
geht, betrifft das Auftragsverarbeitung. Vor WP4 verbindlich klären.

### E4 — Ein Operator oder mehrere Benutzer?

Der Freeze-Review-Release-Zyklus setzt heute stillschweigend **einen** vertrauenswürdigen
Operator voraus: Wer den Vorfall sieht, darf freigeben. Die Tabellen `teams`,
`team_members` und `project_user_budgets` existieren aber bereits.

Bei mehreren Benutzern stellt sich sofort: Darf der Entwickler, dessen Agent eingefroren
wurde, sich selbst freigeben? Wer sieht die Payloads im Report (siehe E3)? Gibt es ein
Vier-Augen-Prinzip?

**Default: Ein-Operator-Modell für Sprint 20**, aber `security_events` bekommt von Anfang
an `frozen_by` und `released_by`. Nachträglich Mehrbenutzer einzuziehen ist teuer,
zwei Spalten sind billig.

**Zu klären:** Ist Mehrbenutzer ein Produktziel? Das entscheidet auch über E3.

### E5 — Was darf eingefroren werden?

**Default: nur von JiMesh provisionierte Container.** Fremde, per Discovery gefundene
Container erzeugen eine Warnung, keinen Freeze.

Begründung: Bei fremden Containern ist die Identität nur geraten (siehe
`K-LAF-ARCHITECTURE.md` §2, zwei Vertrauensklassen). Einen fremden Produktivdienst wegen
einer Fehlzuordnung einzufrieren ist ein schlimmerer Ausfall als der Angriff.

**Zu klären:** Soll es einen Opt-in geben („diesen fremden Container darf JiMesh einfrieren")?

### E6 — Verhalten bei fehlender Isolationsstufe

**Default: degradieren und laut melden.** Ist `runsc` nicht installiert oder `/dev/kvm`
nicht da, läuft der Workspace eine Stufe niedriger — und das Dashboard zeigt es als
Warnung an, das Deployment-Ergebnis nennt es explizit.

Begründung: Genau die stille Annahme hat beim Incident geschadet. Landlock lief nur
teilweise und schrieb es in eine stderr-Zeile; ufw-Regeln sahen gültig aus und griffen
nicht.

**Zu klären:** Oder soll ein Deployment abbrechen, wenn die angeforderte Stufe fehlt?
Strenger, aber blockiert Erstnutzer.

### E7 — Entropy-Routing (Altlast aus Sprint 13)

**Nicht Teil von Sprint 20**, hier nur festgehalten, damit es nicht wieder untergeht.

Vier zueinander inkompatible Designs existieren in den Docs:

1. **R4** — Klassifikation über ein einzelnes Token, `max_tokens:1`, ~45–90 ms
2. **R8** — volle Antwort erzeugen, Ø-Entropie bewerten, ggf. verwerfen (~500 ms)
3. **`DECISIONS.md` #12–14** — entscheidet für R8, **live gegen NVIDIA verifiziert**
   (Planner `nvidia/nemotron-nano-3-30b-a3b`, `H_norm = H/log2(5)`, Threshold 0.45)
4. **R15/R17** — kippen beide zugunsten RouteLLM (Pre-Inference-Klassifikator) oder
   Speculative Elongation

Der live verifizierte Planner aus 3 kommt nach R15 in keinem Doc mehr vor.
`gemini_distill_1.md` widerspricht sich innerhalb desselben Dokuments. Zusätzlich
ungeklärt: R6 routet per LLM-Gating, R4 per Entropie — kein Doc sagt, welcher Mechanismus
gewinnt oder wie beide zusammenspielen.

**Kein Default.** Vor der nächsten Änderung an `gateway/entropy_cascade.go` muss geklärt
werden, welche Variante gilt — und was der Code heute tatsächlich tut.

### Weitere ungeklärte Widersprüche (nicht sprint-blockierend)

* **User-Preference-Blending `0.7*bandit + 0.3*user_preference`** — in
  `GO_BACKEND_API.md` als „Planned (P0)" geführt, in `USER_REQUIREMENTS_SUMMARY.md` und
  `SCHEMA-model-evaluation.md` als erledigt beschrieben. Im Code verifizieren.
* **Python-Sidecar** — `DECISIONS.md` #15 genehmigt ihn, R17 und `gemini_distill_1.md`
  kennen ihn nicht mehr und argumentieren gegen Python. Berührt E1.

## Nebenlauf: Branding-Scrub & Lizenzfundament (6.9.2026)

Keine K-LAF-Workpackages, aber repo-weit — hier protokolliert, damit nichts
stillschweigend verloren geht:

- [x] **Branding-Scrub:** sämtliche Vorkommen des alten Org-Namens aus der Repo
  entfernt (Docs, Task-Dateien, Sprint-/Handoff-Notizen, Subagent-Logs). Der
  Review-Mirror liegt außerhalb der Repo unter `~/projects/jimesh-mirror`
  (Verzeichnisse mit `jimesh-`-Präfix, Quell-Zuordnung über `git remote`).
  Review-Aufträge: `docs/tasks/TASK-001` bis `TASK-006`, Kontext R20.
- [x] **Lizenzfundament:** `LICENSE` (Root, für die GitHub-Erkennung) von MIT
  auf PolyForm Noncommercial 1.0.0 umgestellt (nicht-kommerzielle Nutzung
  frei; Upstream-MIT-Hinweis von Tashfeen Ahmed bewahrt), kommerzielle Regeln
  + Upstream-Hinweis in `docs/legal/` (`LICENSE-COMMERCIAL.md`: kommerzielle
  Nutzung nur per Direktvertrag oder erworbene Lizenz; ohne schriftliche
  Regelung untersagt), `CONTRIBUTING.md` neu (Beitragseinräumung für
  Dual-Licensing). Alle Lizenztexte auf Englisch.
- [ ] Offen: Rechtsinhaber/Kontakt in `docs/legal/LICENSE-COMMERCIAL.md`
  eintragen (Platzhalter!), anwaltliche Prüfung des Modells (Backlog Epic 16).
