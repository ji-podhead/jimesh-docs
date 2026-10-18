# AUDIT-BACKEND-SECURITY — Sprint-3-Komponenten (Backend)

**Datum:** 19.09.2026 · **Scope:** NUR die neuen Sprint-3-Komponenten — Outbound-DLP-Hook
(`internal/subagents/dlp_hook.go` + Anker `toolcalls.go`), Agent-Config-Scanner
(`internal/agentconfig` + Surface `internal/security/agent_scan.go`), Vault-ACL-Fix
(`internal/security/vault.go` + `internal/store/vault.go`), Red-Team-Suite
(`internal/policy/redteam_test.go`), OTel-Tracing-Spine (`internal/oteltrace/oteltrace.go`),
soweit relevant Rego (`internal/policy/policies/*.rego`) und Quarantine-Release
(`internal/security/quarantine.go`).

**Methodik:** Volltext-Read aller genannten Dateien mit file:line-Belegen, Grep über das
gesamte `src/backend` für Verkabelung (Aufrufer, Routen, Middleware), Read der
Store-Schicht für Update-/ACL-Semantik. Kein Code verändert.

**Toolchain-Check:** `make go-vet` wurde ausgeführt — **Exit 0, keine Diagnostics.**
Ehrliche Randnotiz: Es gibt **keine Host-Go-Toolchain** in dieser Umgebung
(`command -v go` = leer), daher lief der Docker-Zweig des Makefile-Targets
(`golang:latest`-Container, Bind-Mount `src/backend`, geteilte Mod/Caches). Der
Exit-Code 0 stammt also real aus `go vet ./...` im Container — prüfbar, aber
nicht auf dem Host-Compiler reproduziert.

---

## Executive Summary

**Gesamt-Urteil: FINDING (fixierbar, Kern solide — aber zwei der fünf Sprint-Claims
sind Stubs und eine Security-Fix-Fläche hat einen umgehbaren zweiten Pfad).**

Solide und ehrlich benannt: Der Agent-Config-Scanner ist das beste Stück des Sprints —
deterministisch, offline (parst Bytes, führt nichts aus), Fail-closed bei kaputter
Config, Snippet-Kontrakt "[REDACTED:rule]" ohne Roh-Secret, und eine Test-Suite mit
positiver+negativer Kontrolle pro Check. Der Vault-ACL-Kern (Parser, Fail-closed bei
unparsebarer Liste, Projekt-Scope aus verifizierter Identität, ehrliche 404s, echte
DB-Tests mit Skip-Muster) ist korrekt gebaut. Die OPA/Rego-Engine ist durchgängig
fail-closed (Eval-Error → Deny, kein Decision → Deny, allow+guard → Deny, Load-Fehler
→ Fail-loud beim Start). Die DLP-Verdict-Logik ist an **beide** Execute-Pfade
(submit + approve) korrekt vor dem Ledger-Write angebunden, und die 403/Redact-Pfade
tragen keine Secret-Reste.

Die harten Befunde:

1. **Vault-ACL-Bypass (F-01, high):** `allowed_agents` wird nur auf
   `POST /api/vault/access` erzwungen. `GET /api/vault/secrets/{name}` liefert den
   Klartext **ohne** ACL-Prüfung an jede authentifizierte Session und jeden
   kind=service-Key (der Pfad ist explizit Teil der Read-Familie, auth.go:788).
   Der Sprint-3-ACL-Fix hat damit eine zweite, ungeschlossene Lesefläche.
2. **Guarded-Double-Exec-Race (F-02, high):** Approve/Deny prüft den Status per
   Read-then-Write ohne Compare-and-Swap (`UpdateSubagentToolCallStatus` ist ein
   unbedingtes `UPDATE ... WHERE id = ?`). Zwei gleichzeitige Approve-POSTs führen
   einen kritischen Command **doppelt** aus — der Code-Kommentar verspricht
   "idempotency by state", der Code hält es nicht.
3. **Secret-Leak ins Backend-Log vor dem DLP-Scan (F-03, high):**
   `executeInContainer` loggt den vollen (64-KiB-gekürzten) Tool-Output, **bevor**
   `dlpScan` läuft — genau die Secrets, die DLP finden/redacten soll, stehen zuerst
   im Klartext-Log.
4. **DLP ist permanent OFF (F-04, high):** `SetDLPEnabled` hat **keinen einzigen
   Aufrufer** im Backend; es gibt keinen Settings-Key, keine Route, keinen
   Startup-Load. Der Hook ist faktisch toter Code — der Claim "Default OFF mit
   echtem Settings-Toggle (kein Stub)" ist **nicht** erfüllt. Zusätzlich: keine
   einzige Zeile Test für `dlpScan` (F-07).
5. **OTel-Spine ist doppelt tot (F-05, high):** `oteltrace.Init()` und `StartSpan`
   haben keine Call-Sites im Backend, und selbst wenn — `fileTracer.EndSpan` öffnet
   die Spans-Datei und schreibt **nichts** hinein. Von "Tracing-Spine gebaut" ist
   außer Typen/Konstanten nichts funktional. Das berührt das No-Mock-Mandat
   (etwas, das Export behauptet, aber nicht exportiert).

Severity-Bilanz: **0 critical · 5 high · 8 medium · 11 info** (keine der Lücken ist
unauthentifiziert ausnutzbar; alle high-Befunde sind aber innerhalb eines
authentifizierten Kontexts real ausnutzbar bzw. verfehlen den Sprint-Zweck).

---

## Frage 1 — Verdicts: Pass/Redact/Block vollständig und korrekt? Default OFF mit echtem Settings-Toggle?

**Verdict: FINDING.**

**Was korrekt ist:**

- Alle drei Verdicts existieren und sind implementiert (dlp_hook.go:19-23,
  77-106): Default `pass`, Eskalation `redact` (7 Rules) bzw. `block`
  (private_key_header, db_connection_string — dlp_hook.go:94-95).
- Beide Execute-Pfade scannen **vor** dem Ledger-Write: Submit (toolcalls.go:181-193)
  und Approve-Pfad (toolcalls.go:279-291) — der im Hook-Kommentar behauptete Anker
  stimmt.
- Block: Ledger bekommt nur den generischen Text "DLP: response blocked by policy"
  (toolcalls.go:183, 281), die 403-Antwort ist generisch (toolcalls.go:184, 282) —
  **kein Secret-Rest** in Response oder Ledger.
- Redact: `result` wird vor dem Ledger-Write ersetzt (toolcalls.go:187-188, 285-286);
  `res.Redacted` wird nur bei verdict==redact gesetzt (dlp_hook.go:102-104).
- Snippet-Minimierung ist sauber: `m[:4] + Sterne` (dlp_hook.go:88-91) — über den
  4-Zeichen-Präfix (AKIA/ghp_/xoxb/eyJ/„Bear"/„PASS"/"----") hinaus verlässt kein
  Secret-Zeichen die Findings-Struktur.

**Was nicht stimmt:**

- **F-04 (high):** `SetDLPEnabled` (dlp_hook.go:61-65) hat keinen Aufrufer. Repo-weiter
  Grep nach `(?i)dlp` über `src/backend`: Treffer nur in dlp_hook.go, toolcalls.go
  (Kommentare/Calls), scanner.go (Regel-Kommentar) und oteltrace.go (Span-Konstante).
  Kein Settings-Key, keine Gateway-Route, kein Startup-Code liest oder setzt den
  Toggle. `dlpCfg` bleibt bei `enabled: false` (dlp_hook.go:59) — **in Produktion
  läuft ausschließlich verdict=pass**. Das ist ein Stub im Sinne der Audit-Frage.
- **F-06 (medium):** `dlpRule.Action` ist ein totes Feld — alle 9 Rules deklarieren
  `Action: DLPPass` (dlp_hook.go:42-52), während `dlpScan` das Verdict per
  hardcodiertem Namensvergleich entscheidet (dlp_hook.go:94-97). Eine künftig
  hinzugefügte Rule mit `Action: DLPBlock` würde ignoriert; das Feld lügt über das
  Verhalten und ist ein wartungs-/auditierbarkeitsrelevanter Stolperstein.
- Randfälle (info): Redaction ersetzt per `strings.Replace(content, match, …, 1)`
  das **erste Vorkommen** des Match-Literals, nicht die gematchte Position
  (dlp_hook.go:73-75 — F-13); der 64-KiB-Result-Cap (toolcalls.go:310-312) kann ein
  Secret über die Schnittkante zerschneiden, sodass beide Hälften allen Patterns
  entgehen (F-14). DLP-Tests existieren nicht (F-07, siehe Frage 4).

## Frage 2 — Fail-closed bei ungültigem Input / internem Fehler?

**Verdict: OK (mit zwei info-Randfällen).**

- **Scanner bei kaputter Config:** JSON-Fehler → W014 FAIL und Gesamtverdict FAIL
  (getestet: scanner_test.go `TestW014InvalidJSON`). Die semantischen Checks bleiben
  ehrlich "clean-by-absence" (keine erfundenen Findings — ebenfalls getestet). Leerer
  Body am Endpoint → 400 (agent_scan.go:46-49). Der Endpoint ist Admin-gated
  (policy.go:60 "/api/security/agent-scan") und schreibt eine Audit-Row ohne
  Config-Inhalt (agent_scan.go:68-77). **Fail-closed.**
- **ACL bei unparsebarer allowed_agents-Liste:** JSON-Fehler → Komma-Fallback
  (vault.go:430-433); nicht matchbar → Deny. Getestet: `[agent-a]` → Deny
  (vault_test.go:61), case-sensitives Matching (vault_test.go:56), Whitespace-Trim
  (vault_test.go:55). **Fail-closed** — mit einem info-Randfall: `null` wird als
  "keine Restriktion" gelesen (F-16).
- **DLP bei internem Fehler:** Es gibt keinen Fehlerpfad — Patterns sind zur
  Compile-Zeit fixiert (dlp_hook.go:42-52), Snippet-Slicing ist len-guarded
  (dlp_hook.go:89-91). Der einzig realistische "Fehler" ist die 64-KiB-Kante
  (F-14, info).
- **Capability-Engine:** `engine == nil` → jede Tool-Call-Ausführung verweigert
  (toolcalls.go:108-111, spawn.go:424-427); Evaluation-Error → 500 + Refuse
  (toolcalls.go:120-123). **Fail-closed.**
- **Vault:** Decrypt-Fehler → ehrliche 404 statt Wert (vault.go:386-391);
  Scope-Resolver verweigert kind=user und projektlose Service-Keys
  (vault.go:70-86, getestet in vault_scope_test.go). **Fail-closed.**

## Frage 3 — Secret-Werte in Log-/Audit-/Trace-Pfaden der neuen Komponenten?

**Verdict: FINDING.**

Jede log-/audit-/trace-nahe Zeile der auditierten Dateien geprüft:

- **F-03 (high):** toolcalls.go:315 und :318 loggen den vollen exec-Output (bis
  64 KiB, `bounded`) via `h.log.Printf` — **bevor** `dlpScan(result)` an Zeile 181/279
  läuft. DLP soll genau diese Secrets aus dem Result fischen; im Backend-Log stehen
  sie schon. Betroffen sind beide Zweige (error- und done-Log).
- dlp_hook.go: keine Log-Ausgabe; Findings-Snippets sind Präfix+Sterne — safe. Die
  Findings werden allerdings komplett verworfen (kein Aufrufer liest `res.Findings`)
  → keine Leak-Gefahr, aber auch keine Block-Nachvollziehbarkeit (info).
- vault.go: **keine** `log`-Zeile berührt einen Secret-Wert; `VaultAudit` speichert
  nur Name/Accessor/Action/Success. Audit-Write-Fehler werden still ignoriert
  (F-08, medium).
- agent_scan.go: Audit-Detail enthält nur Zählung + Verdict + Check-Zusammenfassung
  (agent_scan.go:73-74); Snippets sind redacted — der Test verifiziert explizit,
  dass der Snippet **nicht** das Roh-Secret trägt (scanner_test.go:254-271). Einziger
  Log-Call nennt nur den Persistenzfehler. **Sauber** — mit info-Randnotiz F-17
  (±40-Zeichen-Kontext kann *nicht erkannte* benachbarte Secrets tragen).
- oteltrace.go: tot (F-05); sobald live, wären freie `map[string]string`-Attribute
  ohne Redact-Hook ein potenzieller Secret-Kanal (F-23, info — Design-Hinweis).
- Quarantine (Nachbar-Fläche im Sprint-Kontext): Logs/Audits tragen Container-/
  Session-IDs und Fehlertexte, keine Secrets (quarantine.go:137-172). Sauber.
- Nachbar im Package (info, F-24): spawn.go:233-235 redactet die docker-run-
  Fehlermeldung für Log/Hub (`redactSecrets`), speichert sie aber **unredactiert**
  in die Subagent-Row (`UpdateSubagentStatus(row.ID, "error", msg)`).

## Frage 4 — Test-Abdeckung: scanner_test.go, vault_test.go, redteam_test.go

**Verdict: FINDING (Scanner stark, Vault gut mit definierten Lücken, Red-Team
vakuumgefährdet, DLP ungetestet).**

- **scanner_test.go (485 Zeilen): stark.** Pro Check positive + negative Kontrolle,
  Canary (clean Config → ALL-PASS), Determinismus per Byte-Vergleich zweier Marshals
  (scanner_test.go:101-119), JSON-Shape-Test inkl. "findings: [] statt null"
  (scanner_test.go:121-151). W021: Zero-Width, Bidi, Combining, **JSON-escape-
  Variante** (scanner_test.go:186-195), Tag-Run-Eskalation mit Decode-Nachweis
  (scanner_test.go:203-223), Grenzfall 2-vs-3-Klassen (scanner_test.go:225-250).
  W008: env-Wert, Spawn-Args, Credential-named-Variablen, Placeholder-Whitelist
  (scanner_test.go:310-321), Roh-Secret-Verbot am Snippet. E005: Credentials-in-URL,
  localhost, Loopback-IP, Shortener. W014: kaputtes JSON, fehlendes/leeres/
  wrong-typed mcpServers. **Konkrete Lücken:** Homoglyphen-Shadowing (F-20),
  169.254.169.254/RFC1918 in E005 (F-18), mehrere Tag-Runs pro Text (F-19).
- **vault_test.go + vault_scope_test.go: gut, echte DB.** Parser-Matrix deckt beide
  Formate (JSON + Komma) inkl. Spaces/Trim/Case-Sensitivity und den Fail-closed-Fall
  ab (vault_test.go:33-68). Handler-Test läuft gegen **echtes Postgres** (Skip ohne
  DATABASE_URL — dokumentiertes Muster, kein Mock) und prüft Allow, Deny ohne
  Wert-in-Response, beide ACL-Formate, Legacy-Offen-Regel und die Audit-Rows
  (vault_test.go:70-176). Scope-Tests belegen Escalation-/Broadening-Schutz des
  Service-Keys. **Konkrete Lücken:** kein Test für `GET /api/vault/secrets/{name}`
  (dort lebt F-01!), Token-Pfad handler-level ungetestet (invalid token,
  token-valid-but-name-mismatch, vault.go:369-381), `null`-ACL ungetestet (F-16),
  Service-Key-e2e über `gateSDKServiceKey` ungetestet im security-Package.
- **redteam_test.go: real, aber vakuumgefährdet.** Läuft gegen die echte embedded
  Engine (kein Mock — gut), 6 Fälle + Canary. **F-09 (medium):** `testEngine`
  **skippt** bei Load-Fehler in **jedem** Modus (redteam_test.go:11-18) — lädt die
  Engine nicht, geht die ganze Red-Team-Suite grün durch, obwohl der eigene
  Kommentar (Zeile 9) genau diesen Zustand "Suite tot" nennt. `ok, _ := eng.Allow(...)`
  verwirft die Deny-Reason — ein Deny "aus dem falschen Grund" ist vom
  regelbasierten Deny nicht unterscheidbar (F-22). Korpus-Lücken: kein Fall für den
  Tool-Call-Submit aus Agent-Sicht, kein Fall für den F-01-Bypass (nicht-admin-
  Session GET /api/vault/secrets/{name}).
- **dlpScan: null Tests.** Keine Testdatei im Package berührt DLP (Grep `(?i)dlp`
  über `*_test.go` des Packages: 0 Treffer). Verdict-Eskalation, Redaction-Output,
  Snippet-Truncation und Toggle-Race sind ungetestet (F-07, medium).

## Frage 5 — TOCTOU/Auth: Race- oder Bypass-Möglichkeiten in den Read-Paths?

**Verdict: FINDING.**

- **F-01 (high) — der "schlimmere Varianten"-Fall:** ACL-Prüfung und Wert-Rückgabe
  sind auf zwei Routen getrennt, und die zweite Route prüft die ACL gar nicht.
  `POST /api/vault/access` holt ACL+Wert atomar aus einer Query (`GetVaultSecretACL`,
  store/vault.go — das ist design-gut) und erzwingt `agentAllowedByACL`
  (vault.go:403-408). `GET /api/vault/secrets/{name}` (vault.go:113-125) ruft
  `GetVaultSecret` (ohne ACL) und liefert den Wert direkt — für **jede**
  authentifizierte Session und jeden kind=service-Key, denn auth.go:788 treatet
  `/api/vault/secrets` als Read-Familie, und GET ist nicht admin-gated
  (policy.go:26-31: nur Mutationen). Eine allowed_agents-Liste, die Agent B
  ausschließt, hält ihn nicht von dieser Route ab. Auch nicht als Ausnahme
  dokumentiert — der Code-Kommentar (vault.go:114) behauptet "requires auth — for
  gateway use only", sagt aber nichts über die ACL.
- **F-02 (high) — Guarded-Approve-Double-Exec:** `decideGuarded` liest den Status
  (toolcalls.go:221-233), schreibt dann `"approved"` (toolcalls.go:240) und führt
  aus (toolcalls.go:277). `UpdateSubagentToolCallStatus` ist ein **unbedingtes**
  `UPDATE ... SET status = ? WHERE id = ?` (store/subagents.go:502-517) — kein
  `AND status = 'guarded'`. Zwei parallele Approve-POSTs passieren beide den Check →
  **doppelter** `docker exec` eines kritischen Commands. Der Kommentar
  (toolcalls.go:213-215) verspricht genau das Gegenteil ("idempotency by state").
- **F-11 (medium):** Der Deny-Zweig persistiert transient `"approved"` (Zeile 240)
  **bevor** er auf `"denied"` flippt (Zeile 246). Schlägt der zweite Write fehl,
  bleibt ein verweigerter Critical-Call als "approved" im Ledger — Audit-Integrität.
- **F-12 (medium):** Dokumentiertes Residual bleibt: `agentId` aus dem Body ist
  unverifiziert (vault.go:355-366). Schärfer betrachtet: Service-Key-Accessors
  umgehen die ACL auf **beiden** Pfaden (access: bewusst, vault.go:360-366+403;
  GET: F-01) — da Agenten faktisch mit Service-Keys laufen (spawn.go:195 mintet
  `CreateSubagentServiceKey`), beschränkt `allowed_agents` nur Session-Caller mit
  body-agentId. Der Enforcement-Umfang des ACL-Fix ist schmaler als der Claim.
- **Was sauber ist:** Project-Scope kommt aus der verifizierten Identität, nie aus
  dem Body (vault.go:70-86; Header-Spoofing ist durch die Middleware ausgeschlossen
  — X-JiMesh-* wird gestript, Kommentar vault.go:19-29; redteam_test Fall (a) deckt
  die Engine-Seite). ACL+Wert reisen in **einer** Query (kein getrennter
  Check/Return auf dem access-Pfad). Tokens: 32-Byte crypto/rand mit TTL+Revocation;
  Deny schreibt Audit-Row mit success=false (vault.go:372-379).
- **F-15 (info):** POST /api/vault/access gibt den Klartext im Response-Body zurück
  (vault.go:411). MANDATES.md §9.2 beschreibt JIT-Injektion ("the secret never
  crosses the agent boundary") — die Umsetzung weicht vom Mandats-Text ab und sollte
  als bewusster Posture dokumentiert oder zu P1-8/JIT-Injektion weitergebaut werden.

## Frage 6 — Policy/Rego: Fail-closed bei Evaluation-Error?

**Verdict: OK.**

- `default allow := false` (default.rego:21); unbekannte Kombinationen verfehlen
  keine Allow-Regel.
- `Engine.Allow`: Eval-Error → `false, err`; keine Results → `false`; non-bool →
  `false` (policy.go:213-230). Kommentar hält, Code hält.
- `EvaluateCapability`: Error → Deny; keine Decision → Deny; non-object → Deny;
  `allow && guard` gleichzeitig → Deny (capabilities.go:82-121) — der
  Policy-Override-Missbrauch ist abgedeckt. Rego-Seite: malformed → deny, unknown
  risk → deny, not-granted → deny, critical+granted → guard
  (capabilities.rego:317-370); `admin:*` per Prefix-Regel kritisch
  (capabilities.rego:284).
- Load-Fehler → Fail-loud beim Startup (policy.go:185-208, capabilities.go:64-77) —
  kein stiller Fallback auf Default. Spawn prüft Grantability gegen dieselbe Policy
  (spawn.go:424-435) — Fail-closed an der Tür.
- Die Red-Team-Suite belegt die Engine-Seite mit echten Eval-Aufrufen (siehe aber
  F-09 zum Skip-Verhalten).

---

## FINDINGS-Tabelle

| ID | Severity | file:line | Beschreibung | Empfehlung |
|----|----------|-----------|--------------|------------|
| F-01 | high | internal/security/vault.go:113-125 (+ auth/auth.go:788) | `GET /api/vault/secrets/{name}` liefert Secret-Klartext ohne `allowed_agents`-Prüfung; ACL wird nur auf `POST /api/vault/access` erzwungen → ACL-Bypass für Sessions und kind=service-Keys | Auf allen Wertrückgabe-Pfaden `GetVaultSecretACL` + `agentAllowedByACL` erzwingen, oder GET-by-name auf Namen ohne Wert reduzieren; Route-Test ergänzen |
| F-02 | high | internal/subagents/toolcalls.go:216-256 + internal/store/subagents.go:502-517 | Guarded approve/deny ohne Compare-and-Swap (unbedingtes UPDATE) → gleichzeitige Approves führen einen kritischen Command doppelt aus | `UPDATE ... WHERE id=? AND status='guarded'`, RowsAffected==0 → 409 "bereits entschieden"; Execution nur bei erfolgreichem CAS |
| F-03 | high | internal/subagents/toolcalls.go:315-318 | Exec-Output (≤64 KiB) landet ungeprüft im Backend-Log, **bevor** dlpScan läuft → DLP-Ziele stehen zuerst im Klartext-Log | Log-Zeile redacten (Scan vor Log) oder nur Status+Länge loggen; Output nur ins (DLP-geprüfte) Ledger |
| F-04 | high | internal/subagents/dlp_hook.go:59-65 (repo-weit kein Aufrufer) | `SetDLPEnabled` wird nie gerufen; kein Settings-Key/Route/Startup-Load → DLP permanent OFF, Settings-Toggle ist ein Stub | Toggle verdrahten: Settings-Key (z.B. `dlp_enabled`) + Admin-Route + Startup-Load + Test; sonst Sprint-Claim korrigieren |
| F-05 | high | internal/oteltrace/oteltrace.go:65-79, 89-113 | Spine doppelt tot: `Init()`/`StartSpan` ohne Call-Sites im Backend; `fileTracer.EndSpan` schreibt nichts (Datei nur geöffnet/geschlossen) | Echten JSONL-Write oder OTLP-SDK implementieren, `Init()` im Gateway-Bootstrap rufen, erste Span-Call-Sites setzen — oder offen als Phase-2-Stub dokumentieren (No-Mock) |
| F-06 | medium | internal/subagents/dlp_hook.go:39, 88-98 | `dlpRule.Action` tot (alle Rules `DLPPass`), Verdict per hardcodiertem Namensvergleich → neue Rule mit `Action: DLPBlock` würde ignoriert | Verdict-Eskalation aus `rule.Action` ableiten |
| F-07 | medium | internal/subagents/ (kein dlp_hook_test.go) | dlpScan komplett ungetestet: Verdicts, Redaction-Output, Snippet-Truncation, Toggle-Race | Tabellengetriebene Unit-Tests je Rule/Verdict + Redact-Assertions + `SetDLPEnabled`-Race-Test |
| F-08 | medium | internal/security/vault.go:122,172,201,219,290,313,372,377,388,404,410 | `VaultAudit`-Rückgabewert überall ignoriert → Audit-Write-Failure = Zugriff ohne Audit-Row (Mandate §9.3 nur best-effort) | Fehler mindestens loggen/alarmieren; für access-Pfad Fail-closed (Audit-Fail → 500) erwägen |
| F-09 | medium | internal/policy/redteam_test.go:11-18 | `testEngine` skippt bei Load-Fehler in **jedem** Modus → Red-Team-Suite läuft vacuös grün; konterkariert die eigene Canary-Philosophie (Zeile 9) | Nur `testing.Short()` skippen, sonst `t.Fatal`; oder Suite-Outcome an "≥1 Test lief" koppeln |
| F-10 | medium | internal/oteltrace/oteltrace.go:136-142 | `genID` aus `time.Now().UnixNano()`: vorhersagbar, kollisionsanfällig (Gleichstand der Nanosekunde; `genID()[:16]` = Low-Bytes) | crypto/rand-Bytes + Prozesszähler für SpanID |
| F-11 | medium | internal/subagents/toolcalls.go:240-249 | Deny-Pfad persistiert transient "approved" vor "denied"; Write-Fail → denied-Call bleibt als approved im Ledger | Ziel-Status direkt schreiben (CAS), "approved" nur im Approve-Zweig |
| F-12 | medium | internal/security/vault.go:360-366,403 (+ subagents/spawn.go:195) | Service-Key-Accessors umgehen `allowed_agents` auf beiden Lesepfaden (access: bewusst; GET: F-01) — Agenten laufen praktisch mit Service-Keys, ACL trifft nur Session-Caller mit body-agentId | Entscheidung dokumentieren/breiter ziehen: agentId-Verifikation (P1-8) oder key→agent-Mapping mit ACL auch für service-Keys |
| F-13 | info | internal/subagents/dlp_hook.go:73-75 | `strings.Replace(content, match, …, 1)` ersetzt erstes Vorkommen statt der gematchten Position (Edge: gleiches Literal früher im Text) | Indexbasierte Rekonstruktion via `FindAllStringIndex` |
| F-14 | info | internal/subagents/toolcalls.go:309-312 + dlp_hook.go:77 | 64-KiB-Cap kann ein Secret über die Schnittkante zerschneiden → Patterns verfehlen beide Hälften | Überlappungsfenster am Cap oder Scan vor dem Cap |
| F-15 | info | internal/security/vault.go:411 (+ MANDATES.md §9.2) | `POST /api/vault/access` gibt Klartext im Response-Body — Abweichung vom Mandats-Text (JIT-Injektion, "secret never crosses the boundary") | Als bewusster Posture im Sprint-Dokument festschreiben oder JIT-Injektion/P1-8 nachziehen |
| F-16 | info | internal/security/vault.go:424-447 | JSON `null` als allowed_agents wird als "keine Restriktion" gelesen (Unmarshal → nil-Slice) — korrupte Row öffnet die ACL | `null` explizit als fail-closed oder als `[]` definieren + Testfall |
| F-17 | info | internal/agentconfig/scanner.go:376-393 | Snippet-Kontext (±40 Zeichen) kann *nicht erkannte* benachbarte Secrets im Klartext tragen (Schutz gilt nur fürs gematchte Muster) | Kontext nachträglich gegen alle anderen Patterns scrubben |
| F-18 | info | internal/agentconfig/scanner.go:684-694 | E005 deckt localhost/.local/127./::1/0.0.0.0 ab, aber nicht 169.254.169.254 (Cloud-Metadata) und keine RFC1918-Ranges | Host-Heuristik erweitern |
| F-19 | info | internal/agentconfig/scanner.go:434-449 | `decodeTagRun` dekodiert nur den ersten Tag-Run pro Text; mehrere Runs → nur erster sichtbar (≥2-Eskalation greift trotzdem) | Alle Runs sammeln statt erstem Break |
| F-20 | info | internal/agentconfig/scanner.go:910-933 | E002-Normalisierung: Unicode-Homoglyphen (z.B. kyrillisches "е" in "execute") entgehen Shadowing-Match; W021 flaggt nur Cf/Cc/Mn | NFKD-Casefold-Normalisierung vor dem Token-Match |
| F-21 | info | internal/security/vault.go:460-495 | `handleSecurityAudit`: toter Code (`envKey := ""`, leere "Check env"-Zeilen, "verschlüsselt?"-Schleife tut nichts) — Security-Audit behauptet eine Encryption-Prüfung, die keine ist | Check implementieren oder entfernen (No-Mock: keine Schein-Checks) |
| F-22 | info | internal/policy/redteam_test.go:24-73 | Deny-Reason wird ignoriert (`ok, _`); Korpus fehlt u.a. Tool-Call-Submit aus Agent-Sicht und F-01-Bypass-Fall | Reason loggen/beim Deny prüfen; Bypass-Fälle als Red-Team-Tests ergänzen |
| F-23 | info | internal/oteltrace/oteltrace.go:34-46 | StartSpan-Attribute sind freie `map[string]string` ohne Redact-Hook — sobald der Spine live geht, wäre Tool-Output-in-Attributen ein Secret-Kanal | Redact-Hook oder Attribut-Whitelist im Tracer verankern, bevor Call-Sites entstehen |
| F-24 | info | internal/subagents/spawn.go:233-235 | docker-run-Fehlermeldung: Log/Hub redactet (`redactSecrets`), DB-Row (`UpdateSubagentStatus`) speichert unredactiert | Row-Write ebenfalls redacten |

---

## Was ausdrücklich solide ist

- **Agent-Config-Scanner:** deterministisch (sortierte Server/Env-Keys, Byte-
  Vergleichs-Test), strikt offline (parst, führt nie aus — kein Consent-Trap),
  Fail-closed, Snippet-Kontrakt getestet, fünf Checks mit sauberer Eskalationslogik
  (2-Klassen-WARN / 3-Klassen-FAIL, Tag-Run-Decode-Nachweis). Der Endpoint
  (agent_scan.go) ist Admin-gated, audit-zeilig und config-frei im Audit-Detail.
- **Vault-Scope-Kern:** Projekt-Scope aus verifizierter Identität (Escalation und
  Broadening per `?project=` sind getestet und blockiert), ehrliche 404s, Tokens
  crypto/rand mit TTL+Revocation, echte DB-Tests mit dokumentiertem Skip-Muster.
- **OPA/Rego:** ein-Engine-Prinzip, überall fail-closed (Error/No-Decision/
  Non-Bool/allow+guard → Deny), Load-Fehler fail-loud, Capability-Grants werden
  schon beim Spawn gegen dieselbe Policy validiert.
- **DLP-Anker:** beide Execute-Pfade (submit + approve) scannen vor dem
  Ledger-Write; Block-/Redact-Ausgaben (403-Text, Ledger-Eintrag) tragen keine
  Secret-Reste; Snippet-Minimierung hält den 4-Zeichen-Präfix-Limit.
- **Quarantine-Release (Nachbar-Fläche):** doppelt HITL (OPA-Admin-Gate +
  confirm=true), ehrlicher Fehlerzustand (docker start failed → Session bleibt
  quarantined), Audit-Zeilen inkl. Warn-Variante.
- `make go-vet`: Exit 0, keine Diagnostics (Docker-Zweig, siehe Kopf).
