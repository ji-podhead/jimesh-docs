# TASK-PLAN-PLUGIN-SYSTEM — Alle Jules-Tasks (R45-Konsensus umgesetzt)

**Basis:** R45-plugin-system-consensus.md + R45-CONSENSUS-claude.md + R45-CONSENSUS-glm.md (14/15 Fragen voll-einig)
**Operator-Korrektur 16.9.:** leobot ist KEIN Plugin-Kandidat. saits-crew IST der Trading-Plugin-Kandidat, braucht aber erst einen Rebuild (public, Discord-frei, eigene Widgets, Message-Broker) — **der Rebuild liegt im BACKLOG, nicht in diesem Plan.**
**Offene Operator-Calls:** Q4.1 (OpenClaw-Research-Sprint → Jules übernimmt in TASK-111), Q8 (Claude-Code-Lizenz = Operator-Rechtsentscheid; Agenten sammeln nur Zitate), Q10 (SDK-Abnahme = unabhängiger Nachbau — als Bestätigung angenommen).

**Regeln für ALLE Tasks:** Worktree-Pattern (ein Task = ein Worktree = ein Branch) · CGO_ENABLED=0 · No-Mock · No-Silent-Fail · Live-Verify · Doku-Sync (API_DOCS + SPRINT-File + BACKLOG) · kein `git add -A` · i18n 60 Locales grün · tsc/Vitest grün.

**PFLICHT vor Start (14.9., nach 4. Wiederholung derselben 3 Regressionen — store.tsx/.ts, ci.yml-workspaces, jules.go-Fake-Daten):**
`git fetch origin && git reset --hard origin/main` (oder frischer Clone) UNMITTELBAR vor dem ersten Commit dieses Tasks. Kein Weiterarbeiten auf einem alten lokalen Branch/Checkout — jeder Diff, der bereits gemergte Dateien (z.B. `knowledge/general/articles/ai-agents-and-context-management.md`, die OKF-SVGs, `docs/research/R45-CONSENSUS-*.md`) als Löschung zeigt, ist ein Beweis für einen stale Base und wird ungeprüft verworfen.

**Bereits vorhanden (14.9., Claude-Salvage aus dem verworfenen j1-j5-Branch — als Startpunkt für TASK-106 nutzen, nicht neu erfinden):** `docs/reference/PLUGIN-SPEC.md` + `docs/reference/plugin.schema.json` — ein erster `plugin.yaml`-Entwurf (id/name/version/surfaces/authSupported/requiredSecretScopes/security). TASK-106 WP1 verschiebt/erweitert das nach `docs/plugins/SPEC.md` + `docs/plugins/plugin.schema.json` (Pfad-Konvention dieses Plans) statt komplett neu zu schreiben.

---

## EXECUTION-ORDER (Konsensus Q7: 106 → 108/110 parallel → 107 → 109 → Plugins)

```
Wave 0 (sofort, parallel):       TASK-115 (Browser-Digest)
Wave 1 (Fundament):              TASK-106 ──► TASK-108 ┬─► TASK-107 ──► TASK-109
                                              TASK-110 ┘
Wave 2 (Plugins, nach Fundament): TASK-111 (OpenClaw), TASK-112 (Gmail), TASK-113 (Connectors), TASK-114 (Docker-MCP)
Wave 3 (Abschluss):              TASK-116 (Dev-Docs + SDK + Q10-Abnahme)
BACKLOG (nicht aktiv):           saits-crew Rebuild P1–P3 (Voraussetzung für saits-Plugin)
```

---

# Wave 0 — Parallel

## TASK-115 — Browser-Automation: Research-Digest + Artikel
**Ziel:** Aus R12 + R43 + browsers_and_agents.md + OKF-browser-automation einen sauberen Digest + eigenständigen generischen Artikel bauen (Konsensus Q5: eigenständig, produkt-neutral).
**WPs:**
1. Digest-OKF-Doc: `knowledge/general/agent-systems-and-browser-automation/browser-automation/agent-browser-control.md` erweitern um (a) Playwright vs CDP-direct vs browserless vs VNC+noVNC — Vergleichstabelle mit Kosten/Isolation/Lizenz, (b) Browser-im-Sandbox-Härtungsmuster, (c) MCP-Browser-Tools-Lage (playwright-mcp, browser-use), (d) Quellen mit Links.
2. Artikel `articles/browser-automation/`: „Running an Agent-Controlled Browser in a Sandbox" — Problem → Solution (utility browser als isolierte App, CDP/Playwright gesteuert) → Comparison-Table → 2 SVGs im House-Style (dark navy, cyan/violet/green).
**Acceptance:** Digest im agentic-knowledge-Repo (OKF v0.2-Frontmatter) + Artikel im articles-Repo mit 2 SVGs, alle Links echt (kein fabrication — die Claude-Lektion).

---

# Wave 1 — Plugin-Fundament

## TASK-106 — Plugin-Manifest-Spec v1 + Lifecycle
**Ziel:** DIE Definition, wie Plugins gebaut werden. Ohne das baut jeder Agent wieder sein eigenes Format.
**WPs:**
1. `docs/plugins/SPEC.md` — Manifest-Spec: `plugin.yaml` (Konsensus Q6) mit: id, name, version, surfaces[] (iframe|native|widget|mcp|api|chat), auth-supported[] (api-key|service-account|both), required-secret-scopes[], security {egress[], capabilities[]}, health-check, i18n-keys, icon. Surface-Tabelle mit Claude's Klarstellung: `native` deckt generische Widget-Wiederverwendung UND komplett eigenes Dashboard (DSH-Muster) ab.
2. Lifecycle-Spec: install → enable → configure (Auth-Bindung!) → run → update → disable → uninstall (inkl. Secret-Cleanup-Pflicht: uninstall löscht SA-Bindungen + Referenzen, Secrets selbst NIE ohne User-Confirm).
3. JSON-Schema: `docs/plugins/plugin.schema.json` + Validator-Script `scripts/validate-plugin.mjs` (Muster: OKF-Frontmatter-Validierung aus agentic-knowledge/pages.yml übertragen — Konsensus Q6).
4. Go-Schema: `internal/domain/schema/plugin_manifest.go` (reine Typen, Tags, Validierungs-Funktionen).
5. CI: Plugin-Validator in den Workflow hängen (jede plugin.yaml im Repo wird geprüft).
**Acceptance:** Spec-Doku + Schema + Validator grün; 2 Beispiel-Manifeste (jules.yaml als reales, gmail.yaml als hypothetisches) validieren; SPRINT-File + BACKLOG-Zeile.

## TASK-108 — Auth-Connector-Framework
**Ziel:** Ein Auth-Fundament für ALLE Plugins — nicht pro Plugin improvisiert (die Vault-Lektion).
**WPs:**
1. `internal/plugins/auth/` — Connector-Interface: `AuthConnector { Init, Authorize(user) → CredentialRef, Refresh, Validate }` + Implementierungen: `APIKeyConnector`, `ServiceAccountConnector`, `OAuthCodeExchangeConnector` (ad1-Pattern: GET /api/plugins/{id}/oauth-config → Frontend-Dialog → Backend-Code-Exchange → Tokens).
2. Token-Storage: KONSOLIDIERT in die TASK-099-secrets-Tabelle (Konsensus Q3e — KEIN zweiter Token-Ort; parent_type='plugin', parent_id=plugin-id).
3. OAuth-Flow im Frontend: generischer Auth-Bindungs-Dialog (3 Optionen aus TASK-100 WP5: bestehendes Secret wählen / neues erstellen / Service-Account).
4. Service-Accounts: `service_accounts`-Tabelle (id, parent_type, parent_id, display-name, credential-refs[], rbac-scopes[]); Anlage EXPLIZIT durch User-Bestätigung (Konsensus Q3c), nie automatisch bei Plugin-Install.
**Acceptance:** E2E-Beleg mit curl: OAuth-Code-Exchange gegen eine Mock-freie Teststrecke (egal welcher Provider-Endpoint, aber echt erreichbar); Token landet encryptet in secrets; Uninstall prüft und räumt SA-Bindungen. Blockiert auf TASK-099 (Secrets-Tabelle existiert).

## TASK-110 — Frontend-Surface-Renderer
**Ziel:** Ein Rendering-System für alle Surfaces — nicht pro Plugin eine eigene UI-Logik.
**WPs:**
1. Surface-Registry: `lib/plugin-registry.tsx` — Plugin-ID → { component? (lazy import), iframeUrl?, widgetSlot?, hasChat? } aus dem geladenen Manifest.
2. `native`: Component-Registry mit lazy-loaded React-Komponenten (JulesSessionsWidget als erstes registriertes natives Plugin).
3. `iframe`: PluginFrame-Komponente (sandbox-Attribute, egress nur auf die deklarierte Origin, Loading-State, Fehler-UI bei Non-200).
4. `widget`: Widget-Slots in der Workspace-Ansicht (Docking-Positionen aus dem Manifest: sidebar|dashboard|project-detail).
5. `chat` (Konsensus Q2a): EIN globales Plugin-Chat-Panel (analog Portal-Assistent) mit Plugin-Kontext-Selector — Chat-Drawer bekommt Plugin-Session-Kontext, Nachrichten-History pro Plugin in der DB (`plugin_chat_messages`).
**Acceptance:** Jules-Plugin läuft auf die neue Registry um (Refactor ohne Funktionsverlust); ein Test-Plugin-Manifest mit allen 4 Surfaces rendert korrekt; Chat-Panel wechselt Kontext und persistiert; tsc + Vitest grün.

## TASK-107 — Plugin-Registry-API (dynamischer Katalog)
**Blockiert auf:** 106 (Manifest-Schema), 108 (Install-Flow braucht Auth-Bindung), 110 (Frontend konsumiert).
**WPs:**
1. `plugins`-Tabelle (id, version, manifest JSONB, status, health, installed_at) — Katalog-Einträge aus plugin.yaml-Dateien im Repo ERZEUGT (Registry = Source-of-Truth sind die Manifeste, DB ist Index — keine doppelte Pflege).
2. `GET /api/plugins` → dynamisch aus Manifesten + Installations-Status; `POST /api/plugins/{id}/install` → Validierung (Schema + Security-Felder) + Auth-Bindungs-Prompt-Daten; `POST /api/plugins/{id}/enable|disable`; `DELETE /api/plugins/{id}` (Lifecycle-Deletion + SA-Bindungs-Check).
3. Health-Checks: `GET /api/plugins/{id}/health` — Plugin-Prozess/Endpoint-Reachability (ehrlich: „not configured" ≠ „unhealthy").
4. Events: Jules-SSE verallgemeinern zu `GET /api/plugins/{id}/events` (SSE, alias=plugin).
**Acceptance:** CRUD live per curl belegt; API_DOCS vollständig; SPRINT + BACKLOG.

## TASK-109 — Secret-Scope-RBAC + Service-Account-Enforcement
**Blockiert auf:** 107 + 099.
**WPs:**
1. API-Keys kriegen Scopes: `consumer_keys` + `scopes[]` (Konsensus: nicht jeder Container liest jedes Secret) — Scope-Vokabular: `secrets:read:<category>`, `secrets:write:<category>`, `plugin:<id>:<action>`.
2. RBAC-Kette: App-Container → Workspace-Token (Workload-Identity, Konsensus Q3a: Token zuerst, mTLS später als Zusatzfaktor) → SA-Auflösung → Scope-Check gegen Secrets/Plugins. **Override-Regel (Konsensus Q3b):** Project-Scopes dürfen nur ENGER sein als Workspace-Default; breiter nur durch explizite Workspace-Entscheidung.
3. OPA: Regeln in `capabilities.rego` erweitern um plugin- + secret-scope-Domänen; fail-closed.
4. Service-Accounts: Provisionierung nur explizit + Audit-Zeile pro Anlage/Bindung (Konsensus Q3c).
**Acceptance:** Live-Beleg: Container ohne Scope → 403 auf Secret; mit engerem Project-Override → nur Subset lesbar; breiterer Override → abgewiesen ohne Workspace-Opt-in; OPA-Tests grün.

---

# Wave 2 — Plugins (auf dem Fundament)

## TASK-111 — OpenClaw-Plugin (Flagship: Security-Wrap)
**Research-Sprint VORHER (Q4.1 → Jules):** OpenClaw-Deployment-Form verifizieren — offizielles Docker-Image? Compose? Config-Schema? (Claude hat das Sicherheitsmodell belegt: OpenClaw-Doku fordert Sandbox-Only-Betrieb — arxiv + docs.openclaw.ai/gateway/sandboxing. Deployment-Form ist der offene Punkt.)
**WPs:** 1. Research-Digest (Fundstellen, Image, Config) 2. plugin.yaml: surfaces [native, chat], auth byo (User bringt LLM-Provider-Key) 3. Deployment als Workspace-App: VLAN+gVisor+WAF (Egress-Allowlist NUR zu LLM-Endpunkten) + SIEM-Logs 4. native-Panel (Deploy-Status, Agent-Status) + Chat-Kontext.
**Acceptance:** OpenClaw läuft als isolierte Workspace-App (Live-Screenshot/curl des Health), Egress zu Nicht-LLM-Host geblockt (Beleg), Chat funkt.

## TASK-112 — Gmail-Plugin (Referenz: api + widget + oauth)
**Basis:** ad1-Pattern (Konsensus Q4.2), Scopes `gmail.readonly` + `gmail.send`.
**WPs:** 1. OAuth-Code-Exchange über TASK-108-Connector (Client-ID via Settings, Tokens → 099-secrets) 2. api-Surface: read/search/send-Wrapper 3. widget: Inbox-Vorschau 4. BYO-Import: ad1-Doku-Referenz im Task-File.
**Q10-Abnahme:** Dieses Plugin wird als unabhängiger Nachbau-Test für TASK-116 genutzt — von einem ANDEREN Agenten nur anhand der Doku gebaut, jede Rückfrage = Doku-Bug (protokolliert).

## TASK-113 — Agent-Connector-Family (OHNE leobot — Operator-Entscheid 16.9.)
**Inhalt:** Gemini-CLI (Apache-2.0), OpenCode (MIT), Claude-Code (NUR nach Q8-Operator-Call: Agent sammelt wörtliche Terms-Zitate ohne Auslegung → Operator entscheidet rechtsverbindlich).
**WPs:** 1. Lizenz-Zitate-Doc `docs/plugins/licensing/claude-code-terms.md` (nur Zitate, keine Interpretation) 2. Family-Plugin: surfaces [native, chat], BYO-Key/BYO-Login pro Connector 3. Session-Panel verallgemeinert aus JulesSessionsWidget 4. pro Provider eine Manifest-Variante (family: ein plugin.yaml, provider-Liste).
**Acceptance:** Gemini+OpenCode live (BYO-Key, Chat funkt); Claude-Code nur wenn Operator-Call positiv.

## TASK-114 — Docker-MCP-Hub-Plugin
**Konsensus-Regel (verschärft):** Docker's Toolkit ist NUR Katalog-Datenquelle (>200 Server verifiziert) — Auth/Deployment NIEMALS über Docker's Credential-UI (zwei Auth-Systeme = TASK-099-Fehler in neuem Gewand).
**WPs:** 1. Research: `docker mcp`-API-Stabilität (Catalog-Endpoints) 2. Katalog-Browse-Surface (native: Server-Liste, Suche) 3. Deploy-Aktion: MCP-Server aus dem Katalog als Workspace-App (VLAN+gVisor) 4. Auth via TASK-108 (BYO-Keys im 099-Store), MCPP-Server-Creds NIE in Docker-Toolkit.

---

# Wave 3 — Abschluss

## TASK-116 — Plugin-Developer-Docs + SDK + Q10-Abnahme
**Blockiert auf:** 106–112.
**WPs:** 1. `docs/plugins/DEVELOPER-GUIDE.md` (Quickstart, Manifest-Referenz, Surfaces, Auth-Bindung, Security-Policy-Felder inkl. „v1 vertraut dem Manifest"-Kompromiss, Test-Checkliste) 2. Beispiel-Plugin-Template-Repo-Struktur 3. **Q10-Abnahme:** der unabhängige Gmail-Nachbau (TASK-112 durch anderen Agenten) wird ausgewertet — jede Rückfrage = Doku-Bug, gefixt bis null Rückfragen; Abnahme = Nachbau ohne Rückfragen.
**Acceptance:** Guide existiert + der Nachbau-Report mit 0 offenen Rückfragen ist der Done-Beweis (No-Mock angewandt auf Doku).

---

# BACKLOG (nicht aktiv — Operator: „für jetzt nicht relevant")

| Zeile | Was | Voraussetzung |
|---|---|---|
| saits-crew P1 | Public Repo: Discord-Decoupling (Message-Broker: Redis Streams), Core (Swarm, VisionWorker, Profit-Tier-Guard, Supervisor, Skill-Docs) — Quell-Basis vom Operator zeigen (saits-Repo ist leer, leobot3 trägt den st-2-README — Klärung nötig) | — |
| saits-crew P2 | Eigene Widgets: Web-Dashboard (Charts, Agent-Status, Positionen, Chat) als Message-Broker-Frontend | P1 |
| saits-crew P3 (Plugin) | Als JiMesh-Plugin: surfaces [native, chat, widget], SA-Auth für Bybit-Key (WAF-Whitelist nur Bybit-API, VLAN-Isolation) — der Showcase für das ganze Auth-Modell | P1+P2 + Wave 1 |

---

## Dispatch-Log (14.9.)

| Task | Jules-Session | Dispatched |
|---|---|---|
| TASK-106 | `1004778615001292163` — https://jules.google.com/session/1004778615001292163 | 14.9. via direkter Jules-API (jules.googleapis.com/v1alpha/sessions) |
| TASK-115 | `1123386847615709662` — https://jules.google.com/session/1123386847615709662 | 14.9. via direkter Jules-API |

**Operator-Regel ab jetzt:** max. 15 Jules-Sessions/Tag — keine neue `sessions.create` mehr ohne Rücksprache. Folgeanweisungen in eine laufende Session gehen über den `sendMessage`-Endpunkt der Session (kostet kein Session-Kontingent), nicht über eine neue Session.
