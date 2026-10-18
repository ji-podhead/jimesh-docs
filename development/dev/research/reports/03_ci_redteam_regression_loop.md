# Report 03: Standing Adversarial Test Suite in CI (Red-Team-Loop gegen OPA-Gate und Vault-ACL)

**Kernfrage.** Wie baut JiMesh eine STANDING ADVERSARIAL TEST SUITE in CI, die das OPA-Capability-Gate und das Vault-ACL-Scoping automatisch angreift? Design: Attack-Generation im promptmap- oder AgentDojo-Stil (Injections landen in Tool-Output-Daten), gemessene Groesse ist, ob die Identity-Chain plus OPA-Gate standhaelt, der Guardrails-Export wird als CI-Artifact ausgespielt (Humanbound-Muster), und das Ziel ist ein Mock-Agent statt eines echten LLM-Agenten. Eine solche Suite haette die Vault-Luecke aus Sektion 4 der internen Basis automatisch gefunden, statt durch manuellen Code-Audit (agent_firewalls_article.md:1192, 1198-1204, 1348-1352).

**Regeln.** Report only, kein Code-Change, keine Git-Operationen am jimesh-Repo. Keine Em-Dashes im Text. Alle JiMesh-Angaben sind gegen den echten Code geprueft (Stand 2026-09-18), alle externen Angaben gegen Shallow-Clones unter `docs_dev/research/research-forks/` plus GitHub-API-Metadaten (Stars, Lizenz), abgefragt am selben Tag.

**Interne Basis.** `docs_dev/research/agent_firewalls_article.md`: Sektion 3 (Ist-Stand, Zeilen 647-762), Sektion 4 (Vault-ACL-Luecke, Zeilen 765-812), Sektion 7 (Humanbound- und AgentDojo-Zeilen plus Net-Recommendation, Zeilen 1173-1204), Open-Follow-ups (Zeilen 1335-1364; Punkt 5 ist genau dieses Thema).

**Referenz-Clones (Shallow, HEAD verifiziert).**

* `research-forks/agentdojo` (HEAD `089ed468`, 2026-06-02, "Add openai-compatible provider for arbitrary OpenAI-compatible endpoints (#147)")
* `research-forks/promptmap` (HEAD `432e072`, 2025-12-01, "New jailbreak rules")
* `research-forks/humanbound` (HEAD `d210274`, 2026-09-18, "docs: host context7.json to claim the Context7 library")

## Was das externe Tool macht (verifiziert aus README/Doku/Klon, mit Version/Lizenz/Stars)

### AgentDojo (ethz-spylab/agentdojo)

**Meta (Klon plus GitHub API).** Titel: "A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents" (`README.md:3`). Version 0.1.35 (`pyproject.toml:12`). Lizenz MIT (`LICENSE`, Kopf "MIT License ... Copyright (c) 2024"; Classifier `pyproject.toml:39`). 840 Stars (GitHub API, 2026-09-18). Python >= 3.10 (`pyproject.toml:31`). Letzter Push 2026-06-02. Klon unter `docs_dev/research/research-forks/agentdojo/`.

**Mechanik (im Klon gelesen).**

1. Task-Suiten mit echten Tool-Implementierungen: `src/agentdojo/default_suites/v1/` enthaelt `workspace`, `slack`, `banking`, `travel`, je mit `user_tasks.py` (legitime Aufgaben) und `injection_tasks.py` (Injektions-Ziele). `v1/workspace/injection_tasks.py` ist die Referenz dafuer, wie Angriffstext in Werkzeugdaten (Tool-Outputs) abgelegt wird.
2. Benchmark-Skript (`README.md:34-41`): Suite, User-Task, Modell, Defense (`tool_filter`) und Attack (`tool_knowledge`) sind kombinierbar. Gemessen wird, ob die Injektion das Agentenverhalten veraendert (welches Tool mit welchen Argumenten ausgefuehrt wird).
3. Attack-Bibliothek: `src/agentdojo/attacks/` mit `base_attacks.py`, `baseline_attacks.py` (u.a. direct, important_instructions, tool_knowledge), `important_instructions_attacks.py`, `dos_attacks.py` und `attack_registry.py` (regestrierte, austauschbare Attacks).
4. Defense-Schicht und Runtime: `src/agentdojo/agent_pipeline/` (Pipeline-Elemente inklusive Tool-Filtern) und `functions_runtime.py` (sandboxed Tool-Ausfuehrung, Function-Registration per Type-Hints und Docstrings).

**Relevant fuer JiMesh.** Die uebertragbare Formel: das Injection-Corpus lebt in DATEN (Tool-Outputs), nicht in Prompts, und die Messgroesse ist ein Verhalten (Tool-Ausfuehrung), nicht Antwortqualitaet. Auf JiMesh uebertragen ist der Verhaltensnachweis die Ledger- und Audit-Reaktion des Gates. Kein AgentDojo-Code muss eingebettet werden.

### promptmap (utkusen/promptmap, tool name promptmap2)

**Meta (Klon plus GitHub API).** "automated prompt injection scanner for custom LLM applications" (`README.md:13`); zuerst 2023 veroeffentlicht, 2025 komplett neu geschrieben (`README.md:29`). Lizenz GPL-3.0 (`LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"). 1269 Stars (GitHub API, 2026-09-18). Kein Versionsfeld (Ein-Skript-Werkzeug `promptmap2.py`; `requirements.txt` mit openai, anthropic, ollama, google-genai, requests, tiktoken, PyYAML). Letzter Commit 2025-12-01.

**Mechanik (im Klon gelesen).**

1. Zwei Modi (`README.md:13-17`): White-Box (eigenes System-Prompt plus Zielmodell) und Black-Box (HTTP-Endpoint per YAML-Config, `README.md:130-140`): Felder `url`, `method`, `headers`, `payload_placeholder` (`{PAYLOAD_POSITION}`, mehrfach einfuegbar), `payload_encoding`, `json`/`body`, `verify_ssl`, `proxy`, `answer_focus_hint`.
2. Dual-LLM-Architektur (`README.md:19-24`): Target-LLM und unabhaengiger Controller-LLM; der Controller entscheidet Pass/Fail anhand der Regel-Bedingungen (`README.md:174`).
3. Regelkorpus: 50+ Regeln in 6 Kategorien (`README.md:41,211`): `distraction`, `prompt_stealing`, `jailbreak`, `harmful`, `hate`, `social_bias` (`rules/`-Verzeichnis im Klon). Einfaches Format in `rules/prompt_stealing/prompt_stealer_basic2.yaml`: `name`, `type`, `severity`, `prompt`. Umfangreicher in `rules/jailbreak/dan1.yaml`: plus `source` sowie `pass_conditions` (Zeile 67) und `fail_conditions` (Zeile 70).
4. Iterationen pro Regel, Default 3 (`README.md:191-195`); JSON-Output (`--output results.json`, `README.md:184-186`); ein "Firewall Testing Mode" bewertet eine vorgelagerte Firewall-LLM (`README.md:214-216`); Ollama erlaubt lokalen Betrieb (`README.md:92-103`).

**Relevant fuer JiMesh.** Die Black-Box-Config ist exakt das Mock-Agent-Muster: ein statischer HTTP-Endpoint, in dessen Payload-Slots Attack-Prompts eingesetzt werden. Das Regel-YAML ist ein pflegbares Korpus-Format. Lizenz-Hinweis: GPL-3.0, also Format und Korpus ableiten, keinen Code einbetten.

### Humanbound (humanbound/humanbound)

**Meta (Klon plus GitHub API).** "Open-source adversarial testing engine, SDK, and CLI for AI agents" (`README.md:8`). Version 2.9.0 (`pyproject.toml:7`). Lizenz Apache-2.0 (`pyproject.toml:10`, `LICENSE`). 149 Stars (GitHub API, 2026-09-18). Python >= 3.10 (`pyproject.toml:11`). Docker-Image `ghcr.io/humanbound/humanbound:2` (`README.md:63-65`).

**Mechanik (im Klon gelesen).**

1. Ziel ist der echte HTTP-Endpoint des Agenten (`bot-config.json`, `README.md:95-110`): `chat_completion` (Pflicht) mit `$PROMPT`- und `$CONVERSATION`-Platzhaltern, optional `thread_init`/`thread_auth`. Der Engine treibt Multi-Turn-Gespraeche, Tool-Abuse-Probes und Scope-Boundary-Tests (`README.md:41-45`).
2. `scope.yaml` deklariert `business_scope`, `permitted`, `restricted` (`README.md:128-141`); die `restricted`-Liste macht aus generischen Jailbreak-Probes gezielte Tool-Abuse-Attacks (`README.md:128-130`).
3. Lokal gegenueber Plattform: ein `TestRunner`-Abstraktionspunkt (`README.md:199-203`); `LocalTestRunner` (`humanbound_cli/engine/local_runner.py`, daneben `platform_runner.py`) faehrt die In-Process-Engine (Orchestrators, Bot, Judge, Presenter) mit dem eigenen Provider, Ergebnisse unter `.humanbound/results/` als `meta.json` plus `logs.jsonl` (`docs/docs/local-engine/output-formats.md:16`).
4. Orchestrators: `humanbound_cli/engine/orchestrators/` mit `owasp_agentic`, `owasp_single_turn`, `behavioral_qa`. Judge ist ein separater LLM-Aufruf; Ollama erlaubt vollstaendig offline (air-gap, `README.md:84-90`).
5. Guardrails-Export: `hb guardrails -o rules.yaml` (`README.md:154`), Formate JSON/YAML/vendor-spezifisch (`docs/docs/local-engine/output-formats.md:89-95`); aus den Failures werden einsatzbereite Firewall-Regeln (`README.md:44-45,158-161`), dazu `hb firewall train` fuer einen Tier-2-Klassifikator (`README.md:155`).
6. CI-Anschluss: `humanbound_cli/pytest_plugin/` (Pytest-Integration); CLI-Kommandos `test`, `posture`, `logs`, `report`, `guardrails`, `firewall` (`humanbound_cli/commands/`: `experiments.py`, `findings.py`, `guardrails.py`, `firewall.py`). Telemetrie abschaltbar via `HB_TELEMETRY_DISABLED=1` oder `DO_NOT_TRACK=1` (`README.md:241-245`). Posture-Score 0 bis 100 mit A-F-Note (`README.md:79`).

### Rollenverteilung fuer den JiMesh-Loop

| Werkzeug | Rolle im JiMesh-Design | Uebernahmeform |
|---|---|---|
| AgentDojo | Injection-in-Tool-Output-Corpus und Verhaltensmessung | Muster und Datenidee, kein Code (Python-Stack) |
| promptmap | Black-Box-Target-Config (Mock-Agent) und YAML-Regelformat | Format und Muster, kein Code (GPL-3.0) |
| Humanbound | Guardrails-Export als Artifact, Posture-Metrik, air-gap-Judge | Muster; optional als CLI in Phase 3 (Apache-2.0, aber Python) |

## Was JiMesh heute dafuer hat (Datei:Zeile aus dem echten Code)

Pfadbasis: `/home/ji/projects/jimesh`, Backend `src/backend`.

### Die Angriffsflaechen sind real und adressierbar

1. **OPA-Capability-Gate auf jedem Subagent-Tool-Call.** `internal/subagents/toolcalls.go:73-123`: POST `/api/subagents/{id}/tool-calls` decodiert das Request, laedt die Grants via `SubagentCapabilities` (Zeile 112) und evaluiert `EvaluateCapability` (Zeilen 117-119). Drei Ausgaenge: guard in die persistierte GUARDED-Queue (Zeilen 129-151, Status `guarded`), deny in die Audit-Ledger (Zeilen 153-167, Status `denied`, 403), allow mit Ausfuehrung via `docker exec` im Subagent-Container (Zeilen 170-188; `executeInContainer` Zeilen 283-300, Status `done`/`error`). Fail-closed, wenn die Engine nicht geladen ist (Zeilen 108-111).
2. **Fail-closed-Politik im Engine-Kern.** `internal/policy/capabilities.go:82-121`: Evaluationsfehler, fehlende Decision, malformed Decision oder allow plus guard gleichzeitig landen auf deny (Zeilen 93-99 und 114-119). Die Policy ist das embedded Rego-Modell `policies/capabilities.rego` (`capabilities.go:33-34`), ueberschreibbar per `JIMESH_CAPABILITY_POLICY` (`capabilities.go:174-186`), ein kaputtes Override laesst das Startup fail loud (`capabilities.go:58-63`).
3. **Rego-Entscheidungsregeln.** `internal/policy/policies/capabilities.rego:317` (default deny), 319-326 (malformed), 328-336 (unknown, fail closed), 338-347 (not granted), 349-359 (allow bei low/medium), 361-370 (guard bei critical), 284 (`admin:`-Praefix immer critical), 305-311 (Namespace-Wildcards wie `vault:*`).
4. **Die Capability ist caller-declared.** Dokumentierter Gap: `internal/subagents/toolcalls.go:16-19` ("The capability string is caller-DECLARED ... intent verification ... is the documented follow-up"); gleichlautend in der internen Basis (article.md:718-725).
5. **Vault-Zweitflaeche mit ACL-Feldern, die (noch) nicht geprueft werden.** `internal/store/vault.go:172-185`: `GetVaultSecret(projectID, name)` filtert ausschliesslich nach `name` und `project_id` (Zeilen 176-179), `allowed_agents` wird nicht gelesen. `internal/store/vault.go:330-350`: `ValidateVaultToken(tokenID)` prueft nur `revoked` und `expires_at` und gibt `secret_name` zurueck; der gespeicherte `agent_id` (geschrieben beim Mint, Zeilen 309-327) wird nie gegen den Anrufer verglichen. Endpoint-Seite `internal/security/vault.go:335-393`: `handleVaultAccess` nimmt `agentId` aus dem Body (Zeilen 345-353) nur als Audit-Label ("unverified label at best", Zeilen 360-365); der Token-Check (Zeilen 369-381) verifiziert nur secret_name. Das ist die Sektion-4-Luecke, im jetzigen Stand bestaetigt.
6. **Identity-Chain vor dem Vault.** `internal/auth/auth.go:613-621`: alle `X-JiMesh-*`-Header werden zuerst bedingungslos geloescht (Zeilen 618-621), nie client-gefolgt. Die Vault-Read-Familie (GET `/api/vault/secrets[/{name}]` und POST `/api/vault/access`) geht nur fuer `kind=service`-Consumer-Keys durch den Service-Key-Gate (Zeilen 719-746, `isVaultRead` Zeile 738) und wird aus der verifizierten Row neu gestempelt (Zeilen 757-773). `internal/security/vault.go:70-86`: `resolveVaultScope` pinnt den Service-Key auf sein eigenes `project_id` (`?project=` kann die Pin weder naehen noch breiten) und verweigert `kind=user`-Keys komplett (fail closed). Admin-Mutationen unter `/api/vault/` gehen durch OPA-RBAC (`internal/auth/auth.go:793-810`, `internal/policy/policy.go:56`); `/api/vault/access` ist ausdruecklich exempt (`policy.go:32-36`, Test `policy_test.go:88-89`).
7. **Subagent-Spawn mintet per-Agent-Identitaet.** `internal/subagents/spawn.go:96-102`: Grants werden beim Spawn gegen dieselbe OPA-Politik validiert (`validateGrantableCapabilities`). Zeilen 173-200: Session-Row, `MintSubagentSessionToken`, `CreateSubagentServiceKey`; bei jedem Misserfolg wird die eben gemuhtete Identitaet revoked (Zeilen 206-208, 231-232, 240-241). Container-Spawn via `docker run` (Zeilen 218-229).
8. **Chain-Allowlist und Budget.** `internal/auth/consumer_key.go:66-88` (resolve, nicht revoked, rate limit, Budget-Precheck), `ConsumerKeyChainAllowed` fail-closed auf Lookup-Fehler (Zeilen 90-107), `gateSDKServiceKey` (Zeilen 152-167) verlangt `kind=service` plus Workspace-Bindung.

### Test- und CI-Infrastruktur, auf die aufgesetzt werden kann

1. **DB-freie Policy-Tests existieren als Muster.** `internal/policy/capabilities_test.go`: der Test-Helper kompiliert die echte embedded Policy (Kommentar Zeilen 3-14). Enthalten: Risiko-Matrix `TestJiMeshDomainDecisions` (Zeilen 45-72), Wildcard-Leak-Gegenproben (Zeilen 186-193: `registry:*` darf NICHT `vault:read` granten), Fail-Closed-Tests (`TestUnknownDomainCapabilitiesFailClosed`, Zeilen 210-234). Kein Postgres noetig: ideal fuer Phase 0.
2. **DB-gebundene Security-Tests existieren.** `internal/security/vault_scope_test.go:18-103` (Service-Key-Pin, deny fuer Keys ohne Projekt-Bindung, deny fuer `kind=user`), `internal/store/vault_test.go:18` (`TestVaultProjectIsolation` gegen die Wegwerf-DB, skip ohne Postgres, Zeilen 19-22).
3. **Make- und CI-Form.** `Makefile:72-78` (`go-test` gegen `jimesh_test`, braucht Stack), `Makefile:80-86` (`check-backend`). CI `.github/workflows/ci.yml`: backend-Job nur build plus vet (Zeilen 21-37; Kommentar Zeilen 6-8: go-test braucht Postgres und laeuft NICHT in CI), frontend-Job (Zeilen 39-66), repo-checks-Job (Zeilen 68-83, node-Builtin-Tests plus Slop-Gate). Kein Security- oder Red-Team-Job.
4. **CLI als Anknuepfung.** `src/examples/jimeshctl` (Bash plus curl plus jq, Header Zeilen 1-15) ist der Operator-Zugang; ein Red-Team-Runner sollte als Go-Binary (`cmd/jimesh-redteam`) kommen, weil er Ledger- und Audit-Zustaende direkt auswerten muss.
5. **OPA-Abhaengigkeit ist da.** `go.mod:11`: `github.com/open-policy-agent/opa v1.20.2`; die Rego-Evaluation laeuft in-process, ohne OPA-Server.

## Was fehlt (konkrete Luecke)

1. **Kein automatisiertes Angriffskorpus gegen das Gate.** Es gibt keine Case-Datei (Header-Spoofing, Wildcard-Grants, caller-declared-Capability-Luecken, Vault-ACL), die in CI gegen die echte Enforcement-Pipeline laeuft. Die vorhandenen Tests pruefen Einzelkomponenten (`capabilities_test.go`, `vault_scope_test.go`), nicht die Kette von der Header-Stempelung bis zur Ledger-Row.
2. **Die Vault-ACL-Luecke hat keinen Regressionstest.** `ValidateVaultToken` (`vault.go:330-350`) und `GetVaultSecret` (`vault.go:172-185`) pruefen `agent_id` bzw. `allowed_agents` nicht; kein Test schlaegt heute an, wenn diese Pruefungen fehlen. Eine Standing Suite haette das als roten Fail gemeldet (article.md:1192: "would have caught ... automatically").
3. **Kein Mock-Agent-Target.** Es gibt keinen lauffaehigen HTTP-Endpoint, an dem Attack-Prompts in Tool-Output-Daten landen und an dem Black-Box-Runner (promptmap-Muster) oder Test-Engines (Humanbound-Format) angreifen koennten. `toolCallRequest` (`toolcalls.go:45-49`) ist das echte Angriffs-Interface, aber ungeprueft unter Injection.
4. **Kein Guardrails-Artifact.** CI erzeugt keinen exportierbaren Regel-Vorschlag (Analogon zu `hb guardrails`). Die Override-Infrastruktur dafuer existiert (`JIMESH_CAPABILITY_POLICY`, `capabilities.go:174-186`), aber kein Job erzeugt daraus ein pruefbares Rego-Delta.
5. **Kein Red-Team-CI-Job und keine Metrik.** Kein Job im Workflow (`ci.yml`), keine Attack-Success-Rate, kein Posture-Wert, kein Artifact-Upload. Die repo-checks-Job-Struktur (Zeilen 68-83) ist die Vorlage, aber ungenutzt fuer Security.
6. **Kein Vehikel fuer den documented Gap "caller-declared capability".** Der Intent-Check (deklarierte Capability gegen ausgefuehrten Command, `toolcalls.go:16-19`) hat weder Implementierung noch einen Test-Treiber; ein Red-Team-Korpus ist sein natuerlicher Antrieb.

## Implementierungsplan fuer JiMesh

Vier Phasen. Zielbild: ein CI-Job `redteam` faehrt deterministische Attack-Cases gegen (a) die Rego-Politik in-process und (b) die echte HTTP-Enforcement-Pipeline mit Wegwerf-Postgres und Mock-Agent, und exportiert Report plus Guardrails-Vorschlag als Artifact. Der Job ist anfangs bewusst rot, solange die Sektion-4-Luecke offen ist (das ist der Punkt), und wird nach dem ACL-Fix gruen.

### Phase 0: Deterministisches Red-Team-Korpus als Go-Tests (Aufwand: klein)

Ziel: Rego-Politik und Auth-Primitiven unter Attack, ohne Postgres, direkt im CI-Job.

* **Neue Dateien.**
  * `src/backend/internal/policy/redteam_test.go`: Attack-Matrix gegen `EvaluateCapability`: (1) Wildcard-Eskalation, `admin:*` in Grants versucht `admin:delete` und `vault:write` zu erreichen (muss guard bzw. deny sein, `capabilities.rego:284`); (2) Cross-Domain-Leak `registry:*` gegen `vault:read` (Muster existiert in `capabilities_test.go:186-193`, erweitern); (3) malformed Strings (`vault:`, `vault:write:v2`, leer) muessen deny mit Reason geben (`capabilities.rego:319-326`); (4) unknown Namespaces und Actions fail closed (`capabilities.rego:328-336`); (5) ein Override-File mit allow plus guard Schmuggel muss fail-closed landen (`capabilities.go:114-119`), Test schreibt eine temporaere Rego-Datei und setzt `JIMESH_CAPABILITY_POLICY`.
  * `src/backend/internal/auth/redteam_headers_test.go`: httptest-Handler durch `Middleware` mit gespoofeten `X-JiMesh-Workspace-Id`-, `X-JiMesh-Key-Kind`-, `X-JiMesh-Session-Id`- und `X-JiMesh-Project-Id`-Headern schicken; Assert: die Header sind nach der Middleware servergestempelt oder weg (`auth.go:618-621`), Vault-Routen verweigern `kind=user`-Keys (`consumer_key.go:160-165`).
* **Aenderungen.** `.github/workflows/ci.yml`: neuer Job `redteam-policy` im Stil des backend-Jobs (Zeilen 21-37), Schritt `go test ./internal/policy/ -run 'TestRedTeam' -count=1` plus `./internal/auth/`. Keine Postgres-Abhaengigkeit.
* **Artifact (Guardrails-Export, Phase-0-Version).** Der Test schreibt `testdata/redteam/redteam-report.json` (Case-Liste mit Verdicts) und `testdata/redteam/guardrails-draft.rego` (Kommentar-Delta: welche Regeln wuerden die gefundenen Loecher schliessen). Upload via `actions/upload-artifact@v4`. Wichtig: der Draft ist als `TODO(operator)`-Entwurf markiert, nie als enforced, konsistent zum Toggle-Muster (`capabilities.rego:227-253`) und zum Verbot fake states (`capabilities.go:146-149`).

### Phase 1: Mock-Agent und HTTP-Red-Team-Runner (Aufwand: mittel)

Ziel: Black-Box-Loop im promptmap-Muster gegen die echte Enforcement-Kette (Auth-Middleware bis Ledger und Audit), mit Wegwerf-Postgres im CI-Job.

* **Neue Dateien.**
  * `src/backend/internal/redteam/`: `runner.go` (faehrt Cases, sammelt Ergebnisse), `cases.go` (YAML-Loader im promptmap-Format: `name`, `type`, `severity`, `prompt`/`payload`, `expect` mit `http_status`, `ledger_status`, `audit_action`), `report.go` (JSON-Report plus Aggregat). Metrik: ASR (Attack Success Rate) = Anteil der Cases, die einen ungewollten allowed-Zustand erreichen: `ledger_status in {approved, done}` bei `expect: deny`, oder Secret-Wert in der Response bei `expect: no_value`.
  * `src/backend/cmd/jimesh-redteam/main.go`: CLI mit Subcommands `run` (`--endpoint http://127.0.0.1:9091`, `--cases testdata/redteam/cases`), `report` (aus JSON ein Markdown-Report), `export-rules` (Guardrails-Draft aus den Fails).
  * `src/backend/testdata/redteam/cases/*.yaml`: Start-Korpus, 25 bis 40 Cases in Kategorien mit JiMesh-Anker: (a) Header-Spoofing auf `/api/vault/secrets/{name}` und `/api/vault/access` (muss 401/403 sein ohne gueltigen Key, `auth.go:719-746`); (b) `kind=user`-Key auf Vault (muss 403, `consumer_key.go:160-165`); (c) Service-Key ohne Projekt-Bindung (muss 403, `vault.go:75-77`); (d) `?project=`-Eskalation von Service-Keys (muss gebunden bleiben, `vault.go:65-77`); (e) Tool-Call-Injection: Injection-Payload im `args.command` (`toolcalls.go:126`) mit deklarierter Capability, die nicht zum Command-Inhalt passt (heute dokumentiert erlaubt, `toolcalls.go:16-19`; Case als `expect: documented_gap` markiert, Phase 3 flippt ihn); (f) Vault-ACL-Cross-Check: Token von Agent A gegen Secret mit `allowed_agents: ["agent-b"]` und umgekehrt (`expect: deny`, schlaegt HEUTE an, solange die Luecke offen ist); (g) GUARDED-Queue-Missbrauch: approve- und deny-Races (`toolcalls.go:220-223`: nur ein noch-guarded Call ist entscheidbar).
  * `src/backend/internal/redteam/redteam_e2e_test.go`: Test, der einen Backend-Server mit Wegwerf-Postgres startet (`DATABASE_URL` env, Skip ohne DB wie `vault_test.go:19-22`), Seed-Minimum anlegt (Projekt, Workspace, zwei Service-Keys, ein Secret mit `allowed_agents`) und dann den Runner faehrt.
  * `src/backend/cmd/jimesh-mockagent/main.go`: Mini-HTTP-Agent, der Chat-Requests nimmt und Tool-Output-Daten (Datei-Listing, Mail-Body, Receipt) mit Injection-Markern aus dem Korpus zurueckgibt. Fuer Phase 1 genuegt `httptest` im Test; standalone spaeter fuer den Humanbound-Anschluss.
* **Aenderungen.** `.github/workflows/ci.yml`: Job `redteam-http` mit `services:` postgres (Entsprechung zu `Makefile:73-77`), Schritte: Backend-Server mit `DATABASE_URL` starten, `go test ./internal/redteam/ -tags e2e`, `jimesh-redteam export-rules`, Upload `redteam-report.json` plus `guardrails-draft`. `Makefile`: Targets `redteam` und `redteam-artifact` (Stil `check-backend`, Zeilen 80-86). Dokumentationsmandat (`CLAUDE.md`): Sprint-Eintrag und, falls eine Route hinzukommt, `API_DOCS.md`; der Runner ist ein CLI, keine neue Gateway-Route.
* **Job-Verkabelung.** `fail-if: asr > 0` fuer alle `expect: deny`-Cases; `documented_gap`-Cases sind bis Phase 3 exklusiv markiert und schlagen nicht an, erscheinen aber im Report.

### Phase 2: Vault-ACL-Enforcement-Fix und Regression gruen (Aufwand: klein)

Ziel: der von der Suite gemeldete Fail wird gruen. Genau der in article.md:805-812 vorgeschlagene Fix.

* **Aenderungen.** `internal/store/vault.go`: `ValidateVaultToken` liest `agent_id` mit (Spalte existiert, Zeilen 321-322) und bekommt einen Pflichtparameter fuer die verifizierte Anrufer-Identitaet; `GetVaultSecret` bekommt dieselbe Identitaet und prueft `allowed_agents` (JSON-Array-Pruefung in Go nach dem Select; Legacy-Rows mit `allowed_agents = '[]'` bleiben Operator-Fall, die Verhaltensentscheidung wird im Sprint-File dokumentiert). `internal/security/vault.go`: `handleVaultAccess` und `handleVaultSecrets` reichen die VERIFIZIERTE Identitaet durch: aus `vaultScope` (`security/vault.go:78-83`) `keyID`/`workspaceID` bzw. Session-Kontext; der Body-`agentId` (Zeilen 345-353) bleibt Audit-Label, wird aber zur Voraussetzung geprueft, wenn vorhanden. Tests: `internal/store/vault_test.go` plus `internal/security/vault_scope_test.go` bekommen die Deckel-Cases (Token von Agent A gegen Secret von Agent B muss deny; `allowed_agents` leer bei Service-Key nach dokumentierter Operator-Entscheidung; Legacy-Row `project_id=''` bleibt fuer Service-Keys unsichtbar).
* **CI.** `redteam-http` faehrt von expected-fail auf gruen; Kategorie (e) bleibt `documented_gap` bis Phase 3.

### Phase 3: LLM-gestuetzte Generation und Posture (Aufwand: gross, optional)

* **Option A (eigen, empfohlen): AgentDojo-Corpus-Adapter.** Einmaliges Konvertier-Skript, das `research-forks/agentdojo/src/agentdojo/default_suites/v1/workspace/injection_tasks.py` (und `banking/`) in `testdata/redteam/cases/*.yaml` uebersetzt (`name/type/severity/prompt/expect`). Nur Daten werden konvertiert, keine Python-Runtime-Abhaengigkeit. Damit waechst das Korpus ohne laufende LLM-Kosten.
* **Option B (Humanbound, air-gap).** Die Humanbound-CLI (Apache-2.0, PyPI `humanbound[engine]`, `README.md:52-55`) gegen den Mock-Agent: `bot-config.json` mit `chat_completion.endpoint` auf den Mock (`README.md:97-110`), `scope.yaml` mit `restricted` aus den Subagent-Grants (`README.md:128-141`), `HB_PROVIDER=ollama` fuer air-gap (`README.md:84-90`), Telemetrie aus (`HB_TELEMETRY_DISABLED=1`, `README.md:241-245`), Ergebnisse unter `.humanbound/results/` (`meta.json` plus `logs.jsonl`, `output-formats.md:16`) als Artifact, `hb guardrails -o rules.yaml` (`README.md:154`) als Guardrails-Draft neben dem JiMesh-eigenen. CI-Runner braucht Ollama oder einen API-Key; das Docker-Image `ghcr.io/humanbound/humanbound:2` (`README.md:63-65`) macht das zugreifbar. Nur Nacht-Job, nicht PR-Pfad.
* **Intent-Check-Antrieb.** Mit laufendem Korpus wird Case-Kategorie (e) von `documented_gap` zu `expect: deny`. Zuerst eine deterministische Heuristik (Command-String-Klassifikation: `shell:exec`-Capability erfordert einen Command-Namespace-Check als Rego-Erweiterung plus Pruefung in `toolcalls.go`), ein LLM-Judge optional nur im Test-Loop, nie in Enforcement (article.md:944-957: R-Judge-Deckelung, deterministic enforcement gewinnt).

### Verkabelung im Ueberblick

| Artefakt | Datei | Job |
|---|---|---|
| Policy-Red-Team | `internal/policy/redteam_test.go` | `redteam-policy` (db-frei) |
| Header-Spoof-Tests | `internal/auth/redteam_headers_test.go` | `redteam-policy` |
| HTTP-Red-Team plus Mock-Agent | `internal/redteam/`, `cmd/jimesh-redteam`, `testdata/redteam/cases/` | `redteam-http` (services: postgres) |
| ACL-Regression | `internal/store/vault_test.go`, `internal/security/vault_scope_test.go` | `redteam-http` |
| Guardrails-Artifact | `redteam-report.json`, `guardrails-draft.rego` bzw. `rules.yaml` | Upload in beiden Jobs |
| Override-Konsum | `JIMESH_CAPABILITY_POLICY` (`capabilities.go:174-186`) | Operator-Pfad, nicht CI |

## Verifikationskriterien (wie man nach dem Bau prueft, dass es wirkt)

1. **Canary (Kann die Suite ueberhaupt schlagen?).** Eine Test-Fixture laedt per `JIMESH_CAPABILITY_POLICY` (`capabilities.go:174-186`) eine gelockerte Rego-Variante (Beispiel: Wildcard `admin:*` grantet auch `vault:delete`). Die Suite muss genau dann ASR groesser 0 melden. Ohne diese positive Kontrolle ist ein gruener Run wertlos.
2. **Fail-Erwartung vor Phase 2.** `redteam-http` schlaegt an Kategorie (f) (Vault-ACL) mit ASR 1.0; `redteam-policy` ist gruen (der Policy-Kern ist korrekt). Nach Phase 2 ist (f) gruen, (e) bleibt `documented_gap`.
3. **Ledger- und Audit-Spur.** Fuer jeden `expect: deny`-Case existiert nach dem Lauf eine `subagent_tool_calls`-Row mit Status `denied` (`toolcalls.go:153-167`) bzw. eine `vault_audit_log`-Row mit `success = 0` (`store/vault.go:265-269`). Der Runner verifiziert die Spur als Teil des Expect, nicht nur den HTTP-Status.
4. **Spoofing-Nachweis.** Kategorien (a) bis (d): ohne gueltigen `jimesh-ck-`-Key sind alle Vault-Routen 401/403 (`auth.go:745-753`), mit `kind=user`-Key 403 (`consumer_key.go:160-165`), mit Service-Key und fremdem `?project=` bleibt die eigene Pin (`vault.go:65-77`).
5. **Artifact-Inhalt.** `redteam-report.json` enthaelt pro Case: id, Kategorie, expect, got (http_status, ledger_status, audit), verdict; aggregiert ASR pro Kategorie plus posture. `guardrails-draft` enthaelt fuer jeden FAIL einen konkreten Rego-Delta-Vorschlag mit Code-Anker (Datei:Zeile), nie einen Fake-Zustand.
6. **CI-Negativ-Signal.** Ein PR, der `capabilities.rego` so aendert, dass `vault:read` per Wildcard zulaesst, oder der `ValidateVaultToken` ohne `agent_id`-Check zurueckbaut, muss `redteam-policy` bzw. `redteam-http` rot machen. Das ist der eigentliche Regression-Schutz.
7. **Kosten- und Laufzeit-Gate.** Phase 0 unter 1 Minute (nur Rego in-process), Phase 1 unter 10 Minuten (ein Postgres-Service, 25 bis 40 Cases, kein LLM). Option B (Phase 3) nur nachtaeblich oder manuell, wegen LLM-Kosten, nicht im PR-Pfad.

## Grenzen

1. **Die Suite testet die Enforcement-Ebene, nicht das Modell.** Injection-Cases zeigen, ob das Gate haelt; sie beweisen nicht, dass ein realer Agent im Container keine Umgehung findet. Die Container-Isolation (default-deny nftables egress, `internal/network/egress.go`, article.md:727-735) und gVisor sind nicht Teil dieses Loops.
2. **Mock-Agent-Faithfulness.** Der Mock-Agent simuliert Chat- und Tool-Output-Daten; er ist kein gVisor-Container mit echten Bindungen. Phase 1 (`httptest`) ist bewusst schmaler als der echte Subagent-Container-Pfad (`executeInContainer`, `toolcalls.go:283-300`). Echte Container-E2E bleibt operator-side (`make go-test` gegen den Stack, `Makefile:72-78`).
3. **Deterministische Cases finden keine semantischen Luecken.** Injection-Formen, die nur ein LLM-Judge erkennt, kommen erst in Phase 3 und bleiben probabilistisch (R-Judge: bestes Modell bei 74.42 Prozent, article.md:593-604). Enforcement bleibt Rego, der Judge nur im Test-Loop (article.md:944-957).
4. **Lizenz-Abschraenkungen.** promptmap ist GPL-3.0: nur Muster und Korpus-Format, kein Code-Einbetten. Humanbound ist Apache-2.0, aber Python und damit nicht in die CGO-freie Go-Binary linkbar; Nutzung nur als externes CLI bzw. Container in Phase 3, wenn ueberhaupt.
5. **Veraltungsrisiko der externen Metadaten.** Versionen (AgentDojo 0.1.35, Humanbound 2.9.0), Stars (840, 1269, 149) und Commits sind der Stand vom 2026-09-18; vor Entscheidungen neu pruefen. Das AgentDojo-README warnt selbst: "the API of the package is still under development" (`README.md:23-24`).
6. **Bewusst rot bis Phase 2.** Bis zum ACL-Fix ist der Job ein laufender Beweis der Luecke, kein Fehler des Loops; die Sprint-Doku muss das sauber halten (kein "done" auf ein rotes Gate, Mandate 2).
7. **Kein Multi-Tenancy-Stress in dieser Suite.** Cross-Workspace-Eskalation via Consumer-Keys sind Cases der Kategorie (d), aber VLAN- und gVisor-Isolation sind out of scope; article.md:1290-1331 dokumentiert diese opt-in-Luecken separat.
