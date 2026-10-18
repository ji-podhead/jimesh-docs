# SPRINT 3: SECURITY-HAERTUNG

| | |
|---|---|
| **Status** | Läuft — WP1 erledigt (19.9.2026), WP3 Scanner-Kern + Route erledigt (jimeshctl offen), WP2/WP4/WP5 offen |
| **Ziel** | Vault-ACL-Fix, Outbound-DLP, Agent-Scan, Red-Team-Suite, OTel-Spine |
| **Dauer** | 1 Woche |

## Arbeitspakete

### WP1: Vault-ACL-Fix (R2 Gap) — ✅ erledigt 19.9.2026
- [x] `allowed_agents`-Filter in `vault.go` Read-Path — `store.GetVaultSecretACL` (store/vault.go: Neuer Getter, liefert Wert + `allowed_agents`; `GetVaultSecret` delegiert) + Enforcement in `handleVaultAccess` (security/vault.go: nach dem Fetch, VOR Audit+Return)
- [x] `agent_id`-Vergleich in ACL-Check — `agentAllowedByACL` (security/vault.go): accessorType `agent` (Anrufer mit agentId) darf ein Secret mit NICHT-leerer Allowlist nur lesen, wenn die agentId auf der Liste steht; sonst **403** + `vault_audit_log` `read`/`success=false`. Format-Toleranz: gespeichertes JSON-Array (`["agent-a"]`, Dashboard-Schreibweise via `agentsToJson`) UND Legacy-Kommazeile (`agent-a,agent-b`); Fail-closed bei unbrauchbaren Listen
- [x] Byte-identische Regression-Tests — `TestAgentAllowedByACL` (17 Parser-Fälle) + `TestVaultAccessAgentACLEnforced` (echter Postgres, Skip ohne DATABASE_URL — Mandate 2): Agent A darf (JSON- UND Komma-Format), Agent B nicht (`allowed_agents='agent-a'`, der gemeldete Fall verbatim), 403 trägt nie den Wert, Auditzeilen success=true/false, **leere/`[]`-Allowlist bleibt uneingeschränkt** (Verhalten unkonfiguriert byte-identisch zum Pre-Fix)

**Legacy-Entscheidung (MASTER-PLAN P1-8 fordert die Dokumentation):** `allowed_agents` = `''` oder `[]` heißt **keine Einschränkung** — jedes vor dem Fix erzeugte Secret (Default `[]` im POST/PUT-Pfad) verhält sich exakt wie vorher; eine deny-all-Lesart hätte sämtliche Agent-Reads kapputtgeschnitten. Eine gesetzte, aber unparsebare Liste failt geschlossen.

**Residual Gap (ehrlich, kein Teil dieses WP):** die ACL prüft accessorType `agent` (agentId-Label des Anrufers). `service`-Accessoren (kind=service Key — die verifizierte Key-ID ist Accessor, nicht die agentId) und `mcp` (ohne agentId) bleiben von Projekt-Scope + Token-Checks geregelt; verifizierte Identität statt Body-Label durchreichen ist der P1-8-Follow-up. API_DOCS (POST /api/vault/access) dokumentiert das Verhalten.

### WP2: Outbound-DLP (R2)
- [ ] `dlp_hook.go` in `toolcalls.go` — Response-Scanning vor Ledger
- [ ] Pass/Redact/Block-Verdicts (quarantine.go-Verdict-Muster)
- [ ] Default OFF + Settings-Toggle

### WP3: Agent-Scan (R1, lokale Version) — Scanner-Kern + Route ✅ (jimeshctl offen)
- [x] 5 deterministische Checks (Hidden Unicode, Secrets, URL-Heuristiken, Manifest, Shadowing) — `src/backend/internal/agentconfig/scanner.go` (NEUES Package: W021 verborgener Unicode mit Tag-Sequenz-/3-Klassen-Escalation, W008 Secrets via dlp_hook.go-Stage-1-Regex-Set + Credential-Env-Namen mit `\${INTERPOLATION}`-Whitelist, E005 URL-Heuristiken (Credentials-in-URL FAIL, localhost/nicht-HTTPS/Shortener/Tunnel WARN), W014 Manifest-Struktur (mcpServers-Objekt, Transport XOR command/url, Feldtypen), E002 Tool-Shadowing (execute vs execute_safe, Token-Grenzen, Cross-Server-Kollisionen)); Verdicts PASS/WARN/FAIL, redacted Snippets (niemals der rohe Secret-Wert), deterministische Report-Ordnung (sortierte Keys). Tests: `scanner_test.go` — 33 Tests, Positive-/Negative-Controls je Regel, JSON-escaped-Variante, Escalations, Determinismus, ehrliches `[]`-Empty-State
- [x] `POST /api/security/agent-scan` (admin-gated) — Handler `src/backend/internal/security/agent_scan.go` (`{config}` → `{success, verdict, checks, findings}`), registriert in `internal/security/security.go` Register(); Admin-Gate via `policy.IsAdminMutation` — `/api/security/agent-scan`-Prefix in `internal/policy/policy.go`; 1 `agent_scan`-Security-Event pro Scan (Verdict-Mapping allow/warn/block). Consent-trap-frei: der Scan parst Bytes, er EXECUTIERT nie einen konfigurierten MCP-Server; keine Snyk-API, kein Modell, kein Netz. Build+Vet+Tests grün im golang-Container. Route dokumentiert in `docs/API_DOCS.md`
- [ ] `jimeshctl scan`-Befehl

### WP4: Red-Team-Suite (R3 Phase 0)
- [ ] Go-Tests gegen Policy-Gate (db-frei)
- [ ] 7 Case-Kategorien mit jimesh-Ankern
- [ ] Canary-Positivkontrolle

### WP5: OTel-Spine (R4 Phase 1)
- [ ] OpenLLMetry-Spans: `invoke_agent`, `execute_tool`, `verify`
- [ ] OTLP-Export nach Langfuse v4

## Referenzen
- R1: `docs_dev/research/reports/01_agent_scan_static_analysis.md`
- R2: `docs_dev/research/reports/02_outbound_dlp_response_scanning.md`
- R3: `docs_dev/research/reports/03_ci_redteam_regression_loop.md`
- R4: `docs_dev/research/reports/04_otel_tracing_spine.md`
- Aggregation: `jirag-planning/05_agentic_security_implementierung.md`