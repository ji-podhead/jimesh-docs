# Report 02: Outbound DLP Scan auf Tool Call Responses (vor dem Model Kontext)

**Kernfrage.** Wie baut JiMesh einen OUTBOUND DLP SCAN auf Tool Call Responses, BEVOR sie in den Model Kontext gelangen? Konkret vorgestellt: zweistufig (billiger Regex Pre Filter auf alle Responses, Deep Scan nur bei Verdacht, Latenzform nach CodeShield), Verdicts pass/redact/block, Hook Punkt in toolcalls.go, Konfigurierbarkeit pro Projekt, und das Verhaeltnis zum bestehenden guard_hook.go (Safety vs DLP, zwei Layer).

**Regeln.** Report only, kein Code Change, keine Git Operationen am jimesh Repo. Keine Em Dashes im Text. Alle JiMesh Angaben sind gegen den echten Code geprueft (Stand 2026-09-18), alle externen Angaben gegen Shallow Clones unter docs_dev/research/research-forks/ plus GitHub API Metadaten (Stars, Lizenz), abgefragt am selben Tag.

**Interne Basis.** docs_dev/research/agent_firewalls_article.md: Sektion 3 (Ist Stand, Zeilen 647 bis 762), Sektion 4 (Vault ACL Luecke, Zeilen 765 bis 812), Sektion 7 (Tabelle und Net Recommendation, Zeilen 1173 bis 1204), Open follow ups (Zeilen 1335 bis 1364; Punkt 4 ist genau dieses Thema). Alle Dateipfade auf JiMesh sind relativ zum Repo Root geschrieben (src/backend/internal/...). Alle Pfade auf die Klone sind relativ zum Klon Root geschrieben.

**Referenz Klone (Shallow, HEAD verifiziert).**

* research-forks/agent-wall__agent-wall (Agent Wall, HEAD 9401207, 2026-02-17, Merge pull request 1)
* research-forks/llm-guard__llm-guard (LLM Guard, HEAD 168c1034, 2026-07-08, Archiving Project 355)
* research-forks/purple-llama (PurpleLlama, sparse, nur CodeShield ausgecheckt, HEAD 4be64c3a, 2026-08-17)

## Was das externe Tool macht (verifiziert aus README/Doku/Klon, mit Version/Lizenz/Stars)

**Agent Wall** (github.com/agent-wall/agent-wall). Klon: docs_dev/research/research-forks/agent-wall__agent-wall.

* Metadaten: Version 0.1.1 (package.json:4, packages/core/package.json:3, packages/cli/package.json:3). Lizenz MIT (LICENSE, Copyright 2026-present Agent Wall Contributors; package.json:14). 5 Stars, 1 Fork, TypeScript, zuletzt gepusht 2026-02-17 (GitHub API, 2026-09-18). Kleines, frisches Projekt: Blaupause, keine battle tested Abhaengigkeit.
* Architektur (README): ein Stdio Proxy zwischen MCP Client und MCP Server, eigener JSON RPC Parser ohne MCP SDK Abhaengigkeit. Inbound 5 Stufen Pipeline pro tools/call: Kill Switch, Injection Detection (30+ Patterns), Egress Control, Policy Engine (first match wins, Glob, Rate Limits, Aktionen allow/deny/prompt), Chain Detection.
* Die fuer diesen Report relevante zweite Haelfte ist der Response Scanner. Der Code sagt es selbst: Policy Engine controls what goes IN (tool calls), Response Scanner controls what comes OUT (tool results) (packages/core/src/response-scanner.ts:5-7). Verkabelung: jede erlaubte tools/call Anfrage wird in pendingToolCalls getrackt (packages/core/src/proxy.ts:603-605, Map Deklaration Zeile 127), beim Response werden ERFOLGS und FEHLER Responses gescannt (proxy.ts:376-382, eigener Kommentar: Secrets koennen in error.message oder error.data leaken).
* Verdicts: pass, redact oder block als Action pro Pattern (response-scanner.ts:25); das Gesamtergebnis ist die hoechste Schwere, Prioritaet block vor redact vor pass (resolveAction, response-scanner.ts:486-496).
* Pattern Bestand aus dem Klon: 11 eingebaute Secret Muster (aws-access-key, aws-secret-key, github-token, openai-api-key, generic-api-key, bearer-token, jwt-token, private-key mit action block, certificate, database-url, password-assignment; response-scanner.ts:136-234), 2 Exfiltrations Muster (large-base64-blob mit konfigurierbarer Action, hex-dump; response-scanner.ts:226-243), 5 opt-in PII Muster (email, phone, ssn block, credit-card block, ip-address pass; response-scanner.ts:248-287; detectPII Default false, Zeilen 284-285), plus eigene Regex Muster aus der YAML Policy. Abweichung dokumentiert statt uebernommen: das README behauptet 14 built-in secret patterns (README.md:210), der Klon zaehlt 11 Secret plus 2 Exfiltrations Muster.
* Schutz Mechaniken: ReDoS Validierung user eigener Patterns (isRegexSafe, response-scanner.ts:116-130; maximale Pattern Laenge 1000, Zeile 107; maximal 100 eigene Patterns, Zeile 110); maxResponseSize mit oversizeAction block oder redact (response-scanner.ts:48-50, Durchfuehrung Zeilen 392-401); Redaction ueber einen generischen [REDACTED] Marker ohne Pattern Namen Leak (response-scanner.ts:19-20, redactText Zeilen 499-521).
* Auswirkung im Proxy: block schickt createDenyResponse an den Client statt des Ergebnisses (proxy.ts:396-412), redact ersetzt den Result Content (buildRedactedResponse, proxy.ts:414-430 und 442), pass reicht durch (proxy.ts:432-436). Zaehler scanned, responseBlocked, responseRedacted (proxy.ts:376, 396, 416). Audit Log: HMAC SHA256 signierte JSON Lines mit Hash Kette, tamper evident (packages/core/src/audit-logger.ts:9, 38-40, 59-61).
* CLI: wrap, init, test (Dry Run eines Tool Calls gegen die Policy), audit, scan, validate, doctor (README, Abschnitt CLI Commands).

**LLM Guard** (protectai/llm-guard). Klon: docs_dev/research/research-forks/llm-guard__llm-guard.

* Metadaten: Version 0.3.16 (pyproject.toml:10), MIT (LICENSE, Copyright Protect AI), rund 3.2k Stars, Python (GitHub API, 2026-09-18). Der Klon Oeffner ist die Warnung: THIS PROJECT HAS BEEN ARCHIVED (README.md:1-4), gepaart mit dem HEAD Commit Archiving Project 355. Nicht mehr maintained.
* Als Muster Geber trotzdem lesenswert: llm_guard/input_scanners/secrets.py nutzt detect-secrets (Zeilen 7 und 427-429, Secrets Scanner using the detect-secrets library), llm_guard/input_scanners/anonymize.py nutzt Presidio (Zeilen 7-8), die Output Seite hat output_scanners/sensitive.py auf Presidio Basis (Zeilen 7-8) plus Regex, Ban und Code Scanner im output_scanners Verzeichnis. Python only: nicht in die CGO_ENABLED=0 reine Go Binaer linkbar; fuer genau diese Familie schon in src/backend/internal/ai/guard_hook.go:27-34 dokumentiert (Guardrails AI und NeMo Guardrails als Python only ausgeschieden, Mesh Routing als kompatible Form).

**CodeShield** (meta-llama/PurpleLlama, Unterverzeichnis CodeShield). Sparse Klon: docs_dev/research/research-forks/purple-llama.

* Metadaten: Lizenz MIT (CodeShield/LICENSE, Copyright Meta Platforms, Inc. and affiliates), rund 4.4k Stars repo weit, Python (GitHub API, 2026-09-18).
* Die Latenzform, die dieser Report als Ziel Shape uebernimmt: zwei Schichten. CodeShield will first identify alarming code patterns in the to be scanned content, and perform a more comprehensive analysis if the content is deemed suspicious in the first step (CodeShield/README.md:25), gemessen: over 98 percent of the traffic is classified as benign, approximately 99 percent of cases within a swift 70ms window, remaining traffic p90 450ms (CodeShield/README.md:27).

**Bewertung fuer JiMesh.** Agent Wall liefert die Blaupause (Verdict Dreiklang pass/redact/block, Pattern Familien inklusive opt-in PII, ReDoS und Groessen Disziplin, Audit Kette, mitgescannte Fehler Responses). LLM Guard liefert die Scanner Familien Differenzierung, ist aber archiviert und Python. CodeShield liefert die Latenzform. Keines der drei wird als Abhaengigkeit uebernommen; JiMesh implementiert in Go auf der vorhandenen internal/scanner Basis.

## Was JiMesh heute dafuer hat (Datei:Zeile aus dem echten Code)

**Der Ausgang, um den es geht: der Tool Call Result Pfad in src/backend/internal/subagents/toolcalls.go.**

* toolcalls.go:179: status, result := h.executeInContainer(row, req.Command). Das ist die Tool Call Response im Sinne dieser Frage: der Output des docker exec im Subagent Container.
* toolcalls.go:283-300 (executeInContainer): docker exec container sh -c command (Zeile 288), Output auf 64 KiB gekappt (execResultCap, Konstanten Zeilen 36-42, Kappung Zeilen 289-293). Das ist die EINZIGE Inhalts Behandlung auf diesem Pfad: Groesse, kein Inhalt.
* Das Rohergebnis erreicht drei Empfaenger: das Postgres Ledger (UpdateSubagentToolCallStatus, toolcalls.go:180-183), die HTTP Response an den Aufrufer (toolcalls.go:188; der Agent Loop verpackt es danach selbst als Tool Message in den naechsten Model Kontext) und das SSE Event ans Dashboard (hub.Emit, toolcalls.go:185-187; Hub in internal/subagents/hub.go:52).
* Zweiter Ausfuehrungspfad nach Operator Approval: toolcalls.go:267-277 (decideGuarded), gleiche Luecke, gleicher fehlender Scan.
* Vor der Ausfuehrung steht eine echte, fail closed Capability Gate (toolcalls.go:107-123, EvaluateCapability gegen internal/policy/policies/capabilities.rego, Decision Regeln Zeilen 317 bis 365; spawn seitige Validierung internal/subagents/spawn.go:424-435). Das ist aber die Anfragerichtung. Die Responserichtung ist ungeschuetzt.
* Dokumentierte, offene Schwaeche am Gate selbst: die Capability ist caller declared (toolcalls.go:16-19 Kommentar; auch interne Basis Sektion 3.3, Zeilen 717 bis 725 des Artikels). Auch das ist ein Grund, warum der Response Filter wichtig ist: wenn die Deklaration luegt, ist der Output der letzte verbleibende Kontrollpunkt.

**Es gibt bereits Scanner Bauteile, am falschen Pfad.**

* src/backend/internal/scanner/scanner.go: RegexScanner mit sechs Regeln (NewRegexScanner, Zeilen 155-209): openai_api_key (sk Form, Zeile 157), github_token (gh oprsu Form, Zeile 158), PEM Private Key Block (Zeile 159), aws_access_key_id AKIA Form (Zeile 160), aws_secret_access_key (Zeile 161), dotenv_secret_line mit Hint Pre Filter (Zeilen 171-207). Verdicts allow, warn, block (Zeilen 33-37), Schwere Ordnung (Zeilen 40-49), kumulative Redaction in der Chain (Zeilen 87-110), Latenzbudget unter 1 ms als Akzeptanzkriterium (Kommentar Zeilen 138-143), ein Finding traegt niemals das rohe Secret (Zeilen 64-69).
* Verkabelung ausschliesslich in die Chat Completions Richtung: src/backend/internal/ai/aihandlers.go:43 baut scanner.NewChain(scanner.NewRegexScanner()); der Aufruf haengt nur an src/backend/internal/ai/proxy.go:479 (nicht streaming; Kommentar Zeilen 477-478: scan the response BEFORE it reaches the client). Der Streaming Pfad reicht ohne Scan durch (proxy.go:491-507). Befunde wandern als security_events Rows (internal/ai/scanner_hook.go:20-44, Schreiben Zeilen 31-41) mit direction response.
* scanner_hook.go:46-60 zeigt ausserdem das gewuenschte Muster fuer kontrollierte Verweigerungstexte: policyDenyResponse erzeugt eine verstaendliche Sicherheitsmeldung statt roher Maschinencodes.

**Es gibt bereits den zweiten, modellbasierten Layer, mit anderer Aufgabe und am gleichen falschen Pfad.**

* src/backend/internal/ai/guard_hook.go: K-LAF WP2 Guard, Llama Guard via Mesh. Config Gate default OFF (Kommentar Zeilen 48-56; guardScannerEnabled Zeilen 176-179 liest settings guard_scanner.enabled), Fail open per E2 Entscheid (Zeilen 58-63), Chain Zuteilung ueber settings guard_scanner.chain_id (Zeilen 181-187), guardConfigured Zeilen 189-202 verlangt Flag UND eine nicht leere Chain. Der Guard Call geht durch das eigene Mesh Routing mit Bandit und Failover (callGuardModel, Zeilen 211-322) und bucht echte Kosten (RecordRequestSummary, Zeilen 303-317).
* Request Seite: guardCheckRequest Zeilen 343-371 scannt nur die LETZTE User Message (lastUserMessageContent Zeilen 402-426; role ungleich user wird uebersprungen, Zeilen 417-419). Ein Tool Result, das als role tool Message in den naechsten Request geht, wird hier NICHT gesehen.
* Response Seite: guardCheckResponse Zeilen 373-400 ersetzt blockierte Modellantworten durch kontrollierten Text (redactModelResponseContent, Zeilen 444-473) und schreibt security_events (recordGuardFinding, Zeilen 324-341, Verdict block, Detail nur Kategoriecodes).
* Das ist die Safety Schicht (MLCommons Hazard Kategorien S1 bis S14, llamaGuardCategories Zeilen 89-104), nicht DLP: keine Secret oder PII Familien, kein Anschluss an den Tool Call Pfad.

**Projekt Kontext ist am Hook Punkt verfuegbar (wichtig fuer die Konfigurierbarkeit).**

* spawn.go:154-164 (CreateSubagent) speichert WorkspaceID und ProjectID in der Row; toolcalls.go:97 (GetSubagent) liefert genau diese Row an den Handler. Ein Hook in toolcalls.go kann also pro Projekt entscheiden.
* Globale Settings existieren (internal/store/store.go:1418-1433, GetSetting und SaveSetting, Key Value Tabelle), ein Settings Endpoint existiert (internal/gateway/gateway.go:278, /api/settings/{key}). Per Projekt Scope gibt es davon nicht, aber die Key Value Struktur ist die natuerliche Ankerflaeche (Vorbild: die VLAN Settings Keys in internal/store/project_vlans.go:242-269, die globale Keys mit Fallback Default lesen).

## Was fehlt (konkrete Luecke)

1. **Kein Scan am Ausgang.** Die Tool Call Response erreicht Ledger, HTTP Response und SSE ungefiltert; einziges Limit ist die 64 KiB Kappung (toolcalls.go:289-293). Das greifbare Beispiel liegt im eigenen System: der Subagent Container haelt seinen eigenen Service Key als OPENAI_API_KEY in der Umgebung (spawn.go:218-227, Env Injection) plus Vault geholte Secrets; ein printenv oder cat .env Resultat spielt diesen Key ungeskannt dem Modell zu, und das Modell kann ihn danach in Antworten, Titeln oder naechsten Tool Args weitergeben.
2. **Die existierenden Scanner sehen den Pfad nicht.** scanResponse haengt nur an proxy.go:479 (Chat Response Richtung Client), guardCheckRequest liest nur die letzte User Message (guard_hook.go:353 und 402-426). Tool Results (role tool) laufen an beiden vorbei. Genau das ist die in der internen Basis vermerkte Luecke (Sektion 7 Zeile 1191, Follow up Punkt 4 Zeilen 1345-1347).
3. **Kein Verdict Mapping auf Tool Results.** allow, warn und block existieren in scanner.go (Zeilen 33-37), aber niemand wendet sie auf toolcalls.go an; es gibt keinen pass/redact/block Entscheid am Ausgang.
4. **Keine Pro Projekt Konfiguration.** Settings sind global (store.go:1418-1433), Scanner Regeln sind hardcoded (scanner.go:155-209). Es gibt kein dlp project verdict, kein Projekt A block und Projekt B pass. Auch die PII Familie fehlt komplett im eigenen Regelbestand (Agent Wall hat sie opt-in, response-scanner.ts:248-287; JiMesh hat kein einziges PII Muster).
5. **Keine zweite Stufe.** Der Guard Chain Anschluss (callGuardModel, guard_hook.go:211-322) ist genau der Mechanismus fuer einen Deep Scan via Mesh, ist aber default off, am Tool Call Pfad nicht verdrahtet und safety orientiert (S1 bis S14), nicht DLP orientiert. Eine Fehler Response Heuristik (auch Fehler behalten oft Secrets, siehe Agent Wall proxy.ts:376-382) gibt es in executeInContainer nicht: dort wird der Fehler selbst in das Resultat geschrieben (toolcalls.go:294-297) und durchlaeuft denselben ungeskannten Pfad.
6. **Audit Luecke.** security_events kennt direction request, response oder none (internal/store/security_events.go:14); Tool Responses erzeugen keine Row. Ein Leak im Tool Result ist heute fuer die Security Seite unsichtbar (abgesehen von der Backend Logzeile, toolcalls.go:295-298).
7. **Kein Operator Muster Mechanismus.** Eigene Regex Muster mit Laengen und Anzahl Caps (Agent Wall response-scanner.ts:100-130) fehlen; Go Regexp ist RE2 und linear, aber der Mechanismus (Validierung, Cap, rejected Liste) existiert nicht, und es gibt keinen Weg, projekt spezifische Muster einzubringen.

## Implementierungsplan fuer JiMesh (konkret: zu erstellende/aendernde Dateien, neue Endpunkte oder CLI-Subcommands, Policy-/CI-Verkabelung, in Phasen mit Aufwand-Schaetzung klein/mittel/gross)

Vorbemerkung: Report only, keine Umsetzung in diesem Pass. Alles Folgende ist ein konkreter Bauplan mit File Ankerpunkten. Phase 1 und 2 sind Backend only, kein Frontend zwingend. Die Phasen sind unabhaengig wertschoepfend geordnet: 1 liefert den Scan, 2 die Konfigurierbarkeit, 3 die zweite Stufe.

**Phase 1 (klein): Outbound DLP Hook am Tool Call Ausgang.**

* NEU src/backend/internal/subagents/dlp_hook.go: baut scan *scanner.Chain identisch zu aihandlers.go:43 (scanner.NewChain(scanner.NewRegexScanner())) und stellt bereit: func (h *Handlers) scanToolResult(projectID, sessionID, callID, capability, result string) (finalResult string, verdict scanner.Verdict, findings []scanner.Finding).
* Mapping scanner.Verdict auf die drei DLP Aktionen (Agent Wall Form): VerdictAllow zu pass (Result unveraendert), VerdictWarn zu redact (Result durch result.Redacted ersetzen; die Chain liefert das bereits mit [REDACTED ...] Platzhaltern, scanner.go:230-231), VerdictBlock zu block (Result durch einen kontrollierten Platzhaltertext ersetzen, zum Beispiel tool result withheld by DLP scanner, ohne Pattern Namen zu leaken, analog response-scanner.ts:19-20).
* AENDERN src/backend/internal/subagents/toolcalls.go an genau zwei Stellen: Zeilen 179-183 (Submit Pfad) und Zeilen 267-277 (Guarded Pfad): nach executeInContainer, VOR UpdateSubagentToolCallStatus, scanToolResult aufrufen; das gescannte Result wird gespeichert UND in der HTTP Response (Zeilen 188 und 276) sowie im hub.Emit (Zeilen 185-187 und 273-275) verwendet. SSE Events bleiben detailfrei (nur Verdict, keine Snippets).
* security_events: neuen Direction Wert tool_response ergaenzen (security_events.go:14), event_type secret_leak, scanner regex-secrets, Verdict aus der Chain, Detail nur Snippet Platzhalter (Finding Disziplin scanner.go:64-69). Schreiben im Muster von scanner_hook.go:31-41.
* Config Gate im Muster von guard_hook.go:48-56: settings dlp_scanner.enabled (Default off; unkonfiguriert ist das Verhalten byte identisch zum Heute, Mandat 2 no mock), settings dlp_scanner.verdict_default (pass, redact oder block, Default redact). Fail open mit lautem Log (E2 Muster, scanner.go:51-62 und guard_hook.go:58-63).
* Tests: internal/subagents/subagents_test.go erweitern: gepflanzter sk Key, AKIA Key, PEM Block und Dotenv Zeile im Exec Output; assert geredactetes Result in Ledger und Response, assert security_events Row, assert byte identisches Verhalten unkonfiguriert.
* Aufwand: klein. Eine neue Datei, zwei Hook Punkte, ein Enum Wert, Tests. Kein neuer Endpoint.

**Phase 2 (mittel): pro Projekt konfigurierbar, Settings und CLI Flaeche.**

* NEU Store Methode (zum Beispiel internal/store/project_dlp.go): GetProjectDLP(projectID) liest dlp projectID enabled und dlp projectID verdict mit Fallback auf die globalen dlp_scanner Keys aus der vorhandenen Settings Tabelle (store.go:1418-1433). Stil Anker: VLANSettingInt und VLANSetting (project_vlans.go:249-269) zeigen genau dieses Muster (Key lesen, Default zurueckgeben, kein erfundenes Verhalten).
* Endpoint: fuer lesende Abfragen reicht die vorhandene Route /api/settings/{key} (gateway.go:278); fuer Schreibzugriffe kommt ein kleiner Admin Handler dazu (Muster policy.IsAdminMutation, analog der Subagent Routen Aufteilung in internal/subagents/subagents.go:9-17 und internal/policy/policy.go:127-129). Optional ein eigener GET View unter /api/security/dlp fuer das Dashboard.
* jimeshctl (src/examples/jimeshctl, Bash Script, Zeilen 30-40 curl_json, 105-116 Muster fuer Parameter Subcommands): zwei neue Subcommands dlp-get project und dlp-set project verdict als Curl GET/PUT auf die Settings Routen.
* Dashboard (optional, klein): Security Tab um die direction tool_response Rows erweitern. Nicht blockierend fuer den Nutzen von Phase 1 und 2.
* Aufwand: mittel. Store Key Schema, Handler, CLI, Tests, API_DOCS.md Eintraege, Sprint Datei Eintrag.

**Phase 3 (gross): zweistufig nach CodeShield Latenzform.**

* Stage 1 bleibt wie in Phase 1: in process Regex auf JEDER Tool Response, Latenzbudget unter 1 ms (scanner.go:138-143).
* Stage 2 nur bei Verdacht: wenn Stage 1 warn oder block liefert ODER eine Exfiltrations Heuristik zuschlaegt. Erste Heuristik aus Agent Wall uebernehmen: large-base64-blob (response-scanner.ts:226-233) als zweite scanner.Rule in scanner.go aufnehmen. Dann Deep Scan via Mesh Chain im Muster von callGuardModel (guard_hook.go:211-322): eigene Chain dlp-scanner, eigener DLP Prompt (Secret und PII Extraktion, NICHT die S1 bis S14 Safety Taxonomie), kleine max_tokens Grenze, begrenztes Retry, echte Kostenbuchen via RecordRequestSummary (Muster guard_hook.go:303-317).
* Fail open mit lautem Log, konfigurierbar settings dlp_scanner.deep_scan.enabled und settings dlp_scanner.deep_scan.chain_id.
* Das Latenz Schild ist genau die CodeShield Form (CodeShield/README.md:25-27): die billige Stufe klassifiziert die grosse Mehrheit benign, die teure Stufe zahlt nur der verdaechtige Rest (Metas Messung: rund 99 Prozent unter 70 ms, Rest p90 450 ms).
* CI Red Team: AgentDojo artige Szenarien mit gepflanzten Secrets gegen die Tool Calls API als Go Tests gegen einen Test Container (Anschluss an Report 03, Standing Adversarial Suite); assert: Leak landet redacted, security_events Row existiert, Fail open Weg ist geloggt.
* Aufwand: gross. Zweiter Prompt, Chain Routing, Budget und Latenz Tests, CI Szenarien.

**Policy und CI Verkabelung (quer durch alle Phasen).**

* make check-backend (Vet plus Tests) deckt die neuen Tests ab; kein neuer CI Workflow noetig. Red Team Szenarien aus Phase 3 laufen in dieselbe Suite.
* API_DOCS.md: neue Settings Keys und (falls Phase 2 eigene Handler bekommt) Routen dokumentieren; Dokumentations Mandat gilt im selben Change (CLAUDE.md).
* docs/sprints/: Planungsabschnitt im laufenden Sprint File vor der Umsetzung (Mandat Plan before code).
* capabilities.rego: KEINE neue Capability noetig. Der DLP Hook ist Enforcement, kein Agent rechtes Recht; er haengt an dem bereits Capability gated Pfad (toolcalls.go:107-123). Die Settings Keys sind Operator Territorium wie guard_scanner auch (guard_hook.go:48-56).
* Kein neuer Vault oder Auth Konstrukt: der Hook braucht nur die bereits verfuegbare Row (toolcalls.go:97) und die Settings Tabelle. Die Vault ACL Luecke aus Sektion 4 der internen Basis bleibt ein eigener, unabhaengiger Follow up (Artikel Zeilen 804-812).

## Verifikationskriterien (wie man nach dem Bau prueft, dass es wirkt)

Der Scan wirkt, wenn alle folgenden Pruefungen gruen sind (Nummern beziehen sich auf die Bauphase):

1. Unit (Phase 1): Exec Output enthaelt einen sk Test Key: Ledger Row (GetSubagentToolCall) zeigt [REDACTED API KEY], die HTTP Response (toolcalls.go:188) enthaelt den Key nicht mehr, security_events Row existiert mit direction tool_response, scanner regex-secrets, Verdict warn. Assert in internal/subagents/subagents_test.go.
2. Block Pfad (Phase 1): Exec Output enthaelt einen PEM Private Key Block (Regel scanner.go:159): Result komplett ersetzt, Modell Kontext bekommt den kontrollierten Platzhalter, security_events Verdict block.
3. Unkonfiguriert (Phase 1): ohne Settings Eintraege byte identisches Verhalten (Mandat 2): Result unveraendert, keine security_events Row, kein Delta in den Hub Events. Assert.
4. Pro Projekt (Phase 2): Projekt A Verdict block, Projekt B Verdict pass, identischer Output: A blockiert, B laesst durch. Zwei Subagents in zwei Projekten, ein Test.
5. Latenz (Phase 1 und 3): go test -bench auf der DLP Chain mit 64 KiB Output: unter 1 ms (Akzeptanzkriterium scanner.go:138-143). Stage 2 wird bei benignem Output NICHT aufgerufen (assert: kein Mesh Call); bei verdaechtigem Output genau einmal (assert: ein Call, gebuchte Kosten).
6. Fail open (Phase 3): Chain unerreichbar: Result geht durch, Log Zeile mit Chain Name und Ursache, security_events Row mit Verdict pass und Scanner Vermerk (kein stilles Fenster, E2 Muster).
7. Fehler Responses (Phase 1): ein executeInContainer Fehler (toolcalls.go:294-297) wird mitgescannt (der Fehler Output geht durch denselben Hook), assert an einem Fall mit gepflanztem Secret im Fehler Text.
8. Regression: bestehende Tests gruen: internal/scanner/scanner_test.go, internal/ai/guard_hook_test.go, internal/subagents/subagents_test.go, internal/policy/policy_test.go.
9. Manuell e2e: Subagent spawnen (Env haelt OPENAI_API_KEY, spawn.go:218-227), Tool Call printenv OPENAI_API_KEY: geredactetes Resultat im Ledger und in der Antwort. Ohne den Hook waere der rohe Service Key im Modell Kontext.

## Grenzen

1. **Shape basiert, kein Verstaendnis.** Regex DLP erkennt, was er kennt (sk Formen, AKIA, gh Formen, Dotenv Zeilen, PEM Bloecke). Base64 verpackte Secrets, Custom Token Formate oder verschluesselte Blobs laufen durch Stage 1; erst Stage 2 sieht die, mit Wahrscheinlichkeit, nicht Gewissheit. Agent Wall hat dasselbe Ceiling (Muster Liste, keine Semantik, response-scanner.ts:1-22).
2. **Nur exec.** Die v1 Tool Surface ist exec (toolcalls.go:15-19). Jede neue Tool Surface braucht den eigenen Hook am gleichen Punkt (nach Ausfuehrung, vor Ledger und Response). Der MCP Tool Pfad (internal/mcpserver/) ist ein separater Anschluss.
3. **Kanal Limit.** Der Hook schuetzt nur den Gateway vermittelten Kanal Tool Result zu Ledger, HTTP, SSE zu Modell Kontext. Secrets, die der Container direkt via erlaubtem Egress verschickt (Default deny Egress erlaubt git remote und Package Registries), sieht er nicht. Outbound DLP ersetzt keine Egress Policy, er ergaenzt sie.
4. **Fail open Default.** Wie guard_hook.go (Zeilen 58-63) ist der DLP Hook Fail open: ein Scanner Crash toetet den Tool Call nicht. Im Worst Case geht ein Leak durch, geloggt aber nicht blockiert. Ein Fail closed Modus waere Phase 2 Konfigurationsarbeit (dlp project fail_mode); der Default bleibt Fail open pro E2 Entscheid.
5. **False Positives im Build Kontext.** dotenv_secret_line matched auch harmlose Zeilen (Passwort Zuweisungen in Test Fixtures, Build Logs). Deshalb: warn redactet (nicht blockiert), block nur fuer hochpraezise Muster (PEM Block, Private Keys). Die Hint Pre Filter (scanner.go:112-136) helfen bei der Latenz, nicht bei der Praezision.
6. **Verhaeltnis zu guard_hook.go: zwei Layer, keine Konkurrenz.** guard_hook.go ist Safety (S1 bis S14, unsafe MEANING, modellbasiert, default off, Chat Pfad). Der neue DLP Hook ist DLP (Secret und PII SHAPES, deterministisch, Tool Call Pfad). Die interne Basis trennt das exakt so (Sektion 7 Zeile 1191: a different concern, safety not DLP; Follow up Punkt 4 Zeilen 1345-1347: distinct from guard_hook content-safety scanning). Phase 3 nutzt die Guard Infrastruktur (callGuardModel) fuer den DLP Deep Scan, ersetzt sie nicht.
7. **Phase 3 ist ein Modell Call.** Probabilistisch, Latenz (CodeShield p90 450 ms als Groessenordnung), Kosten (via RecordRequestSummary gebucht), Verfuegbarkeit (Fail open). Deterministische Enforcement Autoritaet bleibt das OPA Capability Gate (interne Basis Sektion 2, Endor Labs These Zeilen 934 bis 957); der DLP Hook ist ein zusaetzlicher Layer, kein Ersatz.
8. **Externe Tools sind Referenz, nicht Abhaengigkeit.** Agent Wall ist TypeScript und klein (5 Stars, Version 0.1.1), LLM Guard ist Python und archiviert (HEAD Commit Archiving Project). JiMesh implementiert in Go auf der vorhandenen internal/scanner Basis; die Klone liefern Muster, Verdict Formen, ReDoS Disziplin und Audit Hygiene als Blaupause.
