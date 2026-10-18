# Report 01: Statischer Agent-Konfig-Scanner fuer JiMesh (jimeshctl scan)

**Kernfrage.** Wie baut JiMesh einen aequivalenten STATIC-ANALYSIS-Scanner fuer eigene Agent-Konfigurationen? Konkret vorgestellt: ein `jimeshctl scan`-CLI-Subcommand, das System-Prompts, Spawn-Capability-Grants, MCP-/Tool-Definitionen und Policy-Bindings offline scannt (Injection-Muster, gefaehrliche Tool-Kombinationen, zu breite Grants, fehlende Scopes) und als CI-Gate vor Deploy laeuft. Der Operator findet agent-scan gut; dieser Report liest agent-scan deshalb besonders genau und trennt, welche Checks JiMesh 1:1 uebernehmen kann und welche nicht.

**Regeln.** Report only, kein Code-Change, keine Git-Operationen. Keine Em-Dashes im Text.

**Interne Basis.** `docs_dev/research/agent_firewalls_article.md` (Sektionen 3, 4, 7 und die Follow-ups ab Zeile 1335).

**Referenz-Klon.** `/home/ji/projects/jimesh/docs_dev/research/research-forks/agent-scan/` (Shallow-Clone, HEAD `57fdd46e53ee833c63007c486477f17df4f65625`, 2026-09-18, "docs: updated CHANGELOG.md for release 0.6.4 (#481)").

## Was das externe Tool macht

**Identitaet und Meta (verifiziert aus README, pyproject, LICENSE und GitHub-API im Klon).**

* Produkt: Snyk Agent Scan, CLI-Kommando `snyk-agent-scan` (`README.md:3,8-9`).
* Herkunft: MCP-Scan von Invariant Labs ("Introducing MCP-Scan", Tool-Poisoning, Toxic Flow Analysis; `README.md:425-429`, `CHANGELOG.md` 0.1.4.0 "initial public release").
* Version: 0.6.4 (`pyproject.toml`, `version = "0.6.4"`).
* Lizenz: Apache-2.0 (`LICENSE`-Datei im Klon, Apache License 2.0; `pyproject.toml`, `license = {text = "Apache-2.0"}`).
* Verbreitung: 3062 Stars, 276 Forks (GitHub-API, abgefragt 2026-09-18).
* Plattform: Python >= 3.10 (`requires-python`); Install via `uvx` (`README.md:81-120`) oder standalone GPG-signierte Binaries (`README.md:126-128, 209-234`); ausdruecklich KEIN npm-Paket mehr (`README.md:12`).
* Wartung: Release 0.6.4 am 2026-09-18 (`CHANGELOG.md`, commit `57fdd46`).

**Was es tut (`README.md:1-10, 51, 238-258`).**

1. Entdecken: findet lokal installierte Agent-Komponenten, Konfigurationen von 13 Agenten (Claude Code, Claude Desktop, Cursor, VS Code, GitHub Copilot, Windsurf, Gemini CLI, OpenClaw, Amp, Kiro, OpenCode, Antigravity, Codex, Amazon Q) in vier Scopes (System, User, Project/Workspace, Extension/Plugin; `README.md:147-207`).
2. Verbinden: startet gefundene stdio-MCP-Server und zieht deren Tool-Descriptions, Prompts und Resources (`README.md:256-258`). Kritische Randbedingung, im README als Security Warning vorangestellt: das Scannen eines MCP-Configs EXECUTIERT die definierten Befehle; interaktiver Consent je Server, in CI zwingend das `dangerously-run-mcp-servers`-Flag, nur in vertrauenswuerdiger Umgebung (`README.md:53-64, 260-276`).
3. Scannen: prueft MCP-Server (Tools, Prompts, Resources) und Agent-Skills (SKILL.md-Inhalte; `README.md:51`).
4. Analysieren: lokale Checks plus die Agent-Scan-API von Snyk (`README.md:278-282`); der Analyse-Endpoint ist `https://api.snyk.io/hidden/mcp-scan/analysis-machine?version=2026-07-10` (`src/agent_scan/cli.py:479`). Secrets werden vor der Uebertragung redigiert (`README.md:280`; `src/agent_scan/redact.py`, 856 Zeilen).
5. Berichten: zwei CLI-Linien. v0.5.x mit Issue-Codes E/W/X (Analyse-API 2025-09-02, geplant deprecatet; `README.md:16-18,104`), v0.6+ mit Risiko-Indikatoren, Score 0 bis 1000 und Evidence-Feldern (Analyse-API 2026-07-10; `README.md:20-24,106-122`).

**Die Checks im Einzelnen.** MCP-Server-Checks (v0.5.x: `docs/issue-codes.md`; v0.6: `docs/risks.md`):

1. E001 / `prompt_injection_tool_desc`: Prompt-Injection in der Tool-Description, Tool-Poisoning (critical; `issue-codes.md:14-20`, `risks.md:29-33`).
2. E002 / Tool Shadowing: ein Server-Tool referenziert ein Tool eines ANDEREN Servers (high; `issue-codes.md:22-28`).
3. Toxic Flows: W015/W016 untrusted content (medium/low), W017/W018 sensitive bzw. Workspace-Daten (medium/low), W019/W020 destructive capabilities (medium/low); v0.6 fasst das als `untrusted_content`, `private_data`, `destructive_capabilities` zusammen (`issue-codes.md:32-86`, `risks.md:35-51`). Grundlage ist das Lethal-Trifecta-Argument (untrusted content + private data + Internet; `issue-codes.md:36`).

Skill-Checks:

1. E004 / `prompt_injection_skill_instructions`: Injection in Skill-Instruktionen (critical; `issue-codes.md:94-98`, `risks.md:57-61`).
2. E005 / `suspicious_download_url`: verdachtige Download-URLs, Resultat mit `malicious_urls` (critical; `issue-codes.md:100-106`, `risks.md:63-67`).
3. E006 / `malicious_code`: Malware-Patterns im Skill-Text (critical; `issue-codes.md:108-112`, `risks.md:69-73`).
4. W007 / `insecure_credential_handling`: Credentials verbatim im Prompt/Output (high; `issue-codes.md:120-124`, `risks.md:75-79`).
5. W008 / `secret_detection`: harte Secrets im Skill-Text (high; `issue-codes.md:126-130`, `risks.md:81-85`).
6. W009 / `direct_money_access`: direkte Finanz-Execution (medium; `issue-codes.md:132-136`, `risks.md:87-91`).
7. W011 / `third_party_content_exposure`: untrusted Fremdinhalte (medium; `issue-codes.md:138-142`, `risks.md:93-97`).
8. W012 / `unverifiable_dependencies`: laufzeitbezogener Fetch von Instruktionen/Code, Resultat mit `unverifiable_urls` (high; `issue-codes.md:144-150`, `risks.md:99-103`).
9. W013 / `modifying_system_services`: Systemdienst-Manipulation (medium; `issue-codes.md:152-156`, `risks.md:105-109`).
10. W014 / `missing_skill_md`: fehlendes SKILL.md-Manifest (low; `issue-codes.md:158-162`, `risks.md:111-115`).
11. W021 / Hidden Unicode: unsichtbare Unicode-Zeichen (Kategorien Format/Cf und Control/Cc; medium, Hochstufung auf high bei 3+ Typen oder dekodierter Tag-Sequenz U+E0000 bis U+E007F; `issue-codes.md:165-177`).

**Operationsmodus und CI.** Kommandos `scan` (Standard), `inspect` (ohne Analyse), `help` (`README.md:290-296`); CI-Flag mit Exit ungleich 0 bei Findings (`README.md:315`), JSON-Output (`:310`), Ignore-Listen (`:331-345`). Governance: Ergebnisse landen optional bei Snyk Evo (Background/MDM-Modus, `README.md:248-252`); Registernutzung nur nach Kontaktaufnahme (`README.md:409-411`); keine Contributions (`README.md:394-398`).

**Was JiMesh 1:1 uebernehmen kann (die lokale, deterministische Teilmenge).**

1. W021 Hidden Unicode: ja, voll. Reine Zeichenklassen- und Sequenz-Pruefung, kein Modell, keine API.
2. W008 Secret-Detection: ja, voll. Regex-Regeln; JiMesh haelt dieselbe Klasse bereits fuer Live-Traffic (`internal/scanner`).
3. E005 Download-URL-Heuristiken: ja, voll. Deterministische URL- und Domain-Regelmenge (Typosquatting, Shortener, Personal-Hosting).
4. W014 Fehlendes Manifest: ja, voll. Strukturelle Pflichtfeld-Pruefung.
5. E002 Tool Shadowing: ja, voll. Name-Kollisions- und Referenz-Analyse zwischen Tool-Namespaces, deterministisch.
6. W007 Credential-Handling: teilweise. Keyword- und Regex-Teil deterministisch, Rest semantisch.
7. E001 Prompt-Injection in Descriptions und W015-W020 Toxic-Flow-Klassifikation: nein, bei agent-scan serverseitig semantisch (Snyk-API). JiMesh hat dafuer ein staerkeres Substitut: die Capability-Risikotabelle im eigenen Rego-Katalog (`capabilities.rego:263-284`) klassifiziert GRANTS deterministisch, maschinenlesbar deklariert statt Modell-geschaetzter Prosa.

## Was JiMesh heute dafuer hat

**Laufzeitschutz (real, fail-closed).**

1. OPA-Gate pro Toolaufruf: `internal/policy/capabilities.go:82-121` (`EvaluateCapability`); jede Auswertung landet bei Fehler, fehlender Entscheidung oder allow plus guard gleichzeitig auf deny (`:93-119`). Entscheidungsregeln: `internal/policy/policies/capabilities.rego:317-370`; Wohlgeformtheit `capabilities.rego:292-297`; Grant-Matching exakt plus Namespace-Wildcard `capabilities.rego:305-311`.
2. Katalog als Rego-Dokument: `capabilities.rego:113-254`, sechs Domains (registry, workspaces, deployments, security, vault, gateway) je 4 Actions plus Tool-Namespaces (db, fs, shell, net, admin); Risikomodell low/medium/critical (`capabilities.rego:64-76`); `admin:*` als Prefix-Regel critical (`:281-284`). Katalog und Risiko-Tabelle sind gegeneinander abgeleitet, Drift wird vom Test gezwungen (`internal/policy/capabilities.go:156-160` Kommentar zu `capabilities_test.go`).
3. Spawn-Grant-Validierung: `internal/subagents/spawn.go:96-102`, Grants werden beim Spawn gegen denselben Rego-Katalog validiert, fail closed; `spawn.go:424-435` (`validateGrantableCapabilities`), eine Capability ohne Risikoklassifikation ist ungrantable.
4. Tool-Call-Pipeline mit Ledger: `internal/subagents/toolcalls.go:107-123`, Gate vor jeder Ausfuehrung; Guarded Queue `:128-151` (`status='guarded'`, JIT-Freigabe via approve/deny); Deny-Ledger `:153-167` (403 plus Ledger-Zeile); Allow-Pfad `:169-188` mit `docker exec` im Subagent-Container (`:283-300`). Store: `internal/store/subagents.go:59,99,315,414`.
5. Identitaet: drei consumer-key-Stufen (Mensch, Workspace-Service, Subagent, je eigene Chain- und Budget-Zeilen); INGRESS-DERIVED-ONLY Header-Stamping: `internal/auth/auth.go:618-621` (Loeschen), `:691-699` und `:764-772` (Re-Stamp); identische Disziplin am Edge-Router `cmd/jimesh-router/wsproxy.go:149-157`. RBAC-Admin-Gate: `internal/policy/policy.go:26` (`IsAdminMutation`), `/api/vault/` Prefix (`:48-56`), `/api/subagents` Familie (`:122-142`).

**Scanner-Infra (Praezedenz-Muster, alle real).**

1. Live-Traffic Regex-Scanner: `internal/scanner/scanner.go:1-22` (Stage 1, Antwortseite priorisiert), Verdict/Finding/Chain `:30-97`; Einsatz im Chat-Pfad `internal/ai/scanner_hook.go:20-44` (`secret_leak`-Events in `security_events`).
2. Modell-Scanner: `internal/ai/guard_hook.go:1-63`, Llama Guard via Mesh, konfig-gated (`guard_scanner.enabled`, `guard_scanner.chain_id`), default OFF, fail-open pro E2 mit lautem Log (`:48-63`).
3. IaC/SAST-Gate mit Deploy-Verkabelung: `internal/scanner/iac.go:1-27` (Checkov, Gosec, Trivy), gepinnte Images mit Digest (`:40-57`), JiMesh-eigene Compose-Policies `CKV_JIMESH_COMPOSE_1..4` in `internal/scanner/policies/`, gespiegelt nach `deploy/scan/checks/`; das Gate ist `internal/deploy/quarantine.go:1-26` mit den Verdicts off/passed/quarantined/failed und HITL-Release via `POST /api/security/quarantine/release` (`internal/security/security.go:66-67`).
4. Findings-Store-Muster: `internal/store/security_events.go:27` (Tabelle `security_events`), `:46` (`RecordSecurityEvent`); `internal/store/security_findings.go:21` (Tabelle `security_finding_dismissals`, Dismiss-Flag); `internal/security/findings.go` (GET/POST `/api/security/findings/dismissed` und `/dismiss`, Routen `security.go:59-60`).
5. Vault-Datenmodell: `internal/store/vault.go:65` (`allowed_agents`), `:95` (`agent_id`), geschrieben `:191-207`, `:214-218`, `:309-321`; NICHT enforced: `GetVaultSecret` `:172-185` (nur Projektfilter), `ValidateVaultToken` `:330-350` (nur `secret_name`, `revoked`, `expires_at`). Das ist Artikel-Sektion 4, unverändert real.
6. CLI: `examples/jimeshctl` (Bearer via `JIMESH_TOKEN`, `:25-47`; Help-Liste `:57-74`) ohne scan-Subcommand.

**Die Luecke in einem Satz.** JiMesh prueft Grants und Tool-Aufrufe LAUFZEIT pro Aufruf (OPA-Gate) und Artefakte im Deploy-Gate (IaC/SAST), aber es gibt keinen Offline-Scan, der die Agent-Konfiguration selbst (Prompts, Grant-Saetze, Tool-Definitionen, Policy-Bindings) PRUEFT, BEVOR irgendein Agent laeuft, und keinen Report und kein CI-Gate dafuer.

## Was fehlt (konkrete Luecken)

1. Kein statischer Konfig-Scan. System-Prompts, Spawn-Grant-Saetze, MCP-Tool-Definitionen und Policy-Bindings werden nur laufzeit geprueft (OPA-Gate pro Aufruf, `toolcalls.go:107-123`). Kein Offline-Check, kein Report, kein CI-Gate prueft einen Grant oder Prompt, bevor irgendein Agent laeuft.
2. Keine Hidden-Unicode-Regel (W021-Klasse) ueber JiMesh-eigene Freitextflaechen. Seeded Agent-Typen (`gateway.go:2660-2662`: Label, Description, DefaultTags als JSON-Strings), MCP ServerInstructions und Tool-Descriptions (`mcpserver/server.go:21-24`, `tools_sessions.go:23-28`), Vault-Notizen. Unsichtbare Unicode in Prompt oder Tool-Description ist heute weder detektiert noch geblockt.
3. Keine Secret-Regeln ueber Agent-Konfig-Texte. Der Regex-Scanner deckt Traffic und Workspace-Artefakte ab (`scanner.go:1-22`, `iac.go:1-27`), aber NICHT die Agent-Definitionen selbst (Spawn-Grants, Agent-Typ-Defaults, Tool-Descriptions).
4. Keine Grant-Breiten-Pruefung. `admin:*` Wildcard-Grants und unklassifizierte Capability-Strings in Bestandszeilen landen ungeprueft: `spawn.go:122-125` persistiert die Grants als JSON-Zeile (`capsJSON`), der Laufzeit-Gate prueft pro Aufruf, aber nie die BREITE des Gesamtsatzes (ToxFlow-Abstand: `fs:read` plus `net:http` plus Vault-Lese in EINEM Grant-Satz).
5. Kein Vault-ACL-Enforcement (Artikel-Sektion 4) und kein Finding dafuer. Ein statischer Scan koennte eine "ACL geschrieben, nie gelesen"-Diagnose als Finding melden (`GetVaultSecret` `store/vault.go:172-185`, `ValidateVaultToken` `:330-350` gegen die geschriebenen Zeilen `:65`, `:95`, `:191-207`, `:309-321`). Heute existiert weder Enforcement noch Check.
6. Keine Verkabelung. Kein `scan`-Subcommand in `examples/jimeshctl:57-74`, kein Endpunkt in `internal/security/security.go:42-117`, kein CI-Schritt in `.github/workflows/ci.yml`.

## Implementierungsplan fuer JiMesh

**Zielbild.** `jimeshctl scan [ziel]` als CLI-Subcommand plus `POST /api/security/agent-scan` (Operator-Scan, admin-gated) und `GET /api/security/agent-scan/report` (Report-Lese, session-lesbar) als Gateway-Endpunkte; ein deterministischer Offline-Scanner prueft JiMesh-eigene Agent-Konfigurationen gegen einen versionierten Regelsatz und liefert Findings mit Severity; das CI-Gate bricht bei CRITICAL.

**Phase 1 (klein, 2-3 Tage): Scanner-Kern plus Regelsatz.**

1. NEU `src/backend/internal/agentconfig/agentconfig.go`: Eingabetypen `AgentConfig` (PromptText, Grants `[]string`, MCPTools `[]ToolDef`, PolicyBindings), `ToolDef` (Name, Description), `Finding` analog `internal/scanner/scanner.go:64-78` (Rule, Severity, redigierter Snippet, Location) und Verdict-Aggregation analog `:30-49`.
2. NEU `src/backend/internal/agentconfig/checks_unicode.go`: W021-Port, Unicode-Format/Cf- und Control/Cc-Zeichenklassen, Tag-Sequenz-Decoder U+E0000 bis U+E007F, Hochstufung bei 3+ Typen oder dekodierter Sequenz.
3. NEU `src/backend/internal/agentconfig/checks_secrets.go`: W008-Port, harte Secrets in Prompt- und Tool-Text; Regex-Regeln wiederverwendet aus `internal/scanner`.
4. NEU `src/backend/internal/agentconfig/checks_urls.go`: E005-Port, Download-URL-Heuristiken (Typosquatting, Shortener, Personal-Hosting).
5. NEU `src/backend/internal/agentconfig/checks_manifest.go`: W014-Port, Pflichtfeld-Pruefung der Agent-Typ-Definition (Label, Description, Tags).
6. NEU `src/backend/internal/agentconfig/checks_grants.go`: JiMesh-eigen, Grant-Breite (`admin:*` Wildcard), unklassifizierte Grants via `policy.LoadCapabilityCatalog()` (`internal/policy/capabilities.go:203-251`), ToxFlow-Abstand aus Grant-Saetzen (`fs:read` plus `net:http` plus Vault-Lese).
7. NEU `src/backend/internal/agentconfig/agentconfig_test.go`: Positive- und Negative-Fixtures je Regel, Version-Pin-Test des Regelsatzes.

**Phase 2 (mittel, 5-8 Tage): Store plus Gateway plus CLI.**

1. NEU `src/backend/internal/store/agent_scan.go`: Tabelle `agent_scan_findings` (id, project_id, scope, rule, severity, snippet, location, created_at); Muster analog `internal/store/security_events.go:27` und `internal/store/subagents.go:99`.
2. NEU `src/backend/internal/gateway/agent_scan.go`: Routen `POST /api/security/agent-scan` (admin-gated via `policy.IsAdminMutation` Prefix `/api/security/agent-scan`, analog `/api/vault/` `policy.go:48-56`) und `GET /api/security/agent-scan/report` (session-lesbar, analog `/api/security/findings/dismissed` `security.go:59-60`).
3. GEANDERT `src/backend/internal/gateway/gateway.go`: Registrierungszeile analog der Quarantine-Register-Zeile.
4. GEANDERT `examples/jimeshctl`: Subcommand `scan [ziel]` (`:57-74` analog help-Liste), Exit ungleich 0 bei CRITICAL, JSON-Output.
5. GEANDERT `docs/API_DOCS.md`: beide Routen dokumentieren (Doku-Mandat).

**Phase 3 (gross, 2 Wochen ohne Semantik-Stufe, sonst mittel): CI-Verkabelung plus Policy-Sync plus Semantik-Stufe.**

1. NEU `.github/workflows/ci.yml`: CI-Schritt im `repo-checks`-Job, `jimeshctl scan` ueber die eigenen Agent-Definitionen (seeded agent-types `gateway.go:2660-2662`, MCP-Tools `mcpserver/server.go:36-53`, Vault-Zeilen), Exit ungleich 0 bei CRITICAL.
2. GEANDERT `internal/policy/policies/capabilities.rego`: der Grant-Check des Scanners leitet sich aus demselben Katalog ab (`capabilities.rego:113-254`), damit Katalog und Scanner nicht drift-koennen, analog der Risiko-Tabellen-Ableitung (`:263-284`).
3. Optional, separater Task, Muster `internal/ai/guard_hook.go`: semantische Stufe, Prompt-Injection-Klassifikation ueber die Mesh-Guard-Kette, konfig-gated, default OFF, fail-open mit lautem Log (`guard_hook.go:48-63`).

**Reihenfolge-Bedingungen.** Phase 2 braucht Phase 1; die CI-Verkabelung braucht Phase 2; die Vault-Findings brauchen den Artikel-Sektion-4-Enforcement-Fix (Follow-up `agent_firewalls_article.md:1336-1337`), nicht aber Phase 1 und 2.

## Verifikationskriterien

1. Positive-Controls-Feuer. Je Regel ein Fixture: zero-width U+200B und Unicode-Tag-Sequenz in einem Prompt (`checks_unicode.go`), ein `sk`-Style-Key in einer Tool-Description (`checks_secrets.go`), eine `curl | sh`-Download-URL (`checks_urls.go`), ein fehlender Label-Pflichtfeld-Eintrag (`checks_manifest.go`), ein `admin:*` Grant (`checks_grants.go`). Jeder Treffer liefert Rule, Severity, redigierten Snippet und Location; `jimeshctl scan` im CI-Modus exitet ungleich 0.
2. Negative-Controls sauber. Die seeded Agent-Typen (`gateway.go:2660-2662`) und die MCP-Tool-Definitionen (`mcpserver/server.go:36-53`) scannen ohne Finding, Exit 0.
3. Katalog-Drift-Test. Ein unklassifizierter Grant-String im Fixture erzeugt zwei Findings (laufzeit: ungrantable per `spawn.go:424-435`; statisch: unclassified-grant per `checks_grants.go`), und der Katalog- und Entscheidungs-Drift-Test in `capabilities_test.go` bleibt gruen.
4. ToxFlow-Test. Ein Fixture-Grant-Satz `fs:read` plus `net:http` plus Vault-Lese erzeugt ein medium-Finding (WARN, kein CRITICAL); ein `admin:*` Grant ein CRITICAL-Finding.
5. CI-Evidenz. Der Workflow-Run zeigt den Scan-Schritt gruen bei Bestand und rot bei einer absichtlich kaputten Fixture (Chaos-Test-Muster, analog dem tsc-Bestands-Muster `ci.yml:63-66`).
6. Latenz-Budget. Der Voll-Scan der Agent-Definitionen laeuft in Sekunden (reines Parsen, kein Container, kein Modell-Aufruf in v1), nicht Minuten (Kontrast zum IaC-Gate `quarantine.go:54-72`).

## Grenzen

1. Deterministische Regeln fangen nur, was sie kodieren. Versteckter Unicode, harte Secrets, verdachtige URLs, Grant-Breite, fehlende Manifeste: ja. Semantische Prompt-Injection in einem Systemprompt: per Regex NICHT fangbar; sie landet nur in der optionalen Modell-Stufe (fail-open) oder gar nicht.
2. Der Scanner sieht nur, was JiMesh kennt. Seeded Agent-Typen, Spawn-Request-Grants, im Binary eingebaute MCP-Tool-Definitionen, Vault-Zeilen. Prompts, die ausserhalb JiMesh leben (Harness-Konfig, Provider-Portal), bleiben ausser Sichtweite.
3. Remote-MCP-Tool-Descriptions werden in v1 NICHT gezogen. Das Ziehen macht den Scanner zur Laufzeitflaeche (SSRF- und Consent-Semantik, exakt agent-scan's eigene Security Warning, `README.md:53-64`). v1 parst nur lokal eingebaute Definitionen.
4. Der ToxFlow-Check aus Grants ist eine Ueberapproximation. `fs:read` plus `net:http` ist normaler Tagesgeschaeft (`workspaces:write = medium` per Rego-Katalog `capabilities.rego:133-141`); die Trifecta-Regel muss daher WARN bleiben, sonst schreit das Gate bei JEDEM legitimen Spawn.
5. Der Scan ist ein Schnappschuss, keine Laufzeit-Garantie. Ein nachtraeglich geaenderter Prompt (`settings`-Tabelle, mutabel) entwertet das Verdict, bis der Scan neu laeuft; ein Settings-Aenderungs-Trigger ist ein Follow-up, nicht Phase 1 bis 3.
6. Der Vault-Sektion-4-Enforcement-Fix ist Voraussetzung dafuer, dass die Vault-Findings Enforcement meinen. Bis dahin melden sie nur die Datenmodell-Luecke, nicht einen geschlossenen Zustand.
