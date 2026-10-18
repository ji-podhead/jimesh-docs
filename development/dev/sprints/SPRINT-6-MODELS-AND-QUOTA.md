# Sprint 6: Models & Quota — echtes Rate-Limit-Tracking aus Upstream-Headern

**Duration:** 2026-09-02 → 2026-09-09
**Status:** 🚧 In Progress (Go-Implementierung in diesem Sprint gelandet)
**Goal:** Modelle ordentlich abfragen (`/v1/models` + Gemini `ListModels`) und **Quota live aus den HTTP-Response-Headern** der Provider tracken — weil es **keinen** `/v1/quota`-Endpoint bei OpenAI/Gemini/Anthropic gibt. Besonders kritisch für **paid Models/Keys**: dort kostet jeder Fehlversuch echtes Geld, und der Router soll Paid-Keys erst wieder anfassen, wenn der Provider selbst das Reset meldet.

---

## 🔬 Faktenlage (warum Header?)

Es gibt **keine direkte API**, um verbleibendes Kontingent abzufragen — weder OpenAI noch Gemini. Aber **jede** authentifizierte Antwort trägt Echtzeit-Quota in den Headern:

```
x-ratelimit-limit-requests:      Max Anfragen pro Fenster
x-ratelimit-limit-tokens:        Max Tokens pro Fenster
x-ratelimit-remaining-requests:  Verbleibende Anfragen
x-ratelimit-remaining-tokens:    Verbleibende Tokens
x-ratelimit-reset-requests:      Zeit bis Reset (delta-s, epoch-s/ms oder Duration)
x-ratelimit-reset-tokens:        Zeit bis Token-Reset
retry-after:                     Bei 429 — verbindliche Wartezeit
```

**Providerspezifika:**

| Provider | Header-Familie | Fenster | Besonderheit |
|----------|-----------------|---------|---------------|
| OpenAI | `x-ratelimit-*-requests/tokens` | Minute (TPM/RPM) | Paid-Tier-Limits je nach Usage Tier 1–5 |
| Groq | `x-ratelimit-*-requests/tokens` | Minute/Tag (RPD) | Pool je Account |
| Cerebras | `x-ratelimit-*-requests-day`, `x-ratelimit-*-tokens-minute` | Tag/Minute | Getrennte Namensräume |
| OpenRouter | `x-ratelimit-*-requests/tokens` | Minute | `:free`-Modelle haben separaten Pool |
| Anthropic | `x-ratelimit-requests-limit/-remaining/-reset`, `x-ratelimit-tokens-*` | Minute | Reset als Duration `20m32s` / `1s2ms` |
| Gemini (AI Studio) | Rate-Limits **pro Cloud-Projekt**, nicht pro Key | RPM/TPM/**RPD** | RPD-Reset um Mitternacht **Pacific Time**; 429 = `Resource Exhausted` |
| ModelScope | `modelscope-ratelimit-*` (unbestätigt, #581) | Tag (2000 req/day) | No-Op wenn Header fehlen |

**429/402 sind auch Beobachtungen:** `429` = Fenster erschöpft (reset aus Headern), `402` = Payment/Credit erschöpft (paid!). `Retry-After` ist ein **Floor** für die Cooldown-Dauer — der Provider kennt sein eigenes Reset.

Die TS-Referenzimplementierung existiert bereits im FreeLLMAPI-Server: `server/src/services/provider-quota.ts` (HEADER_SPECS, Pool-Inferenz, Konfidenz-Modell, Headroom-Routing-Signal). **Dieser Sprint portiert sie ins Go-Backend** (`src/backend/`), das laut CLAUDE.md die Zukunft ist.

---

## 🏗️ Architektur

```
                ┌────────────────────────────────────────────────────┐
                │  Gateway (HTTP)                                    │
                │  /v1/chat/completions   /v1/embeddings             │
                │  /api/keys/custom/discover-models                  │
                └───────┬────────────────────────────────────────────┘
                        │ nach jedem Upstream-Call (Header liegen vor)
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ quota.ParseFromResponse(resp, platform, keyID,    │
        │                          modelID, endpoint)       │
        │  · Header-Specs per Platform + generischer        │
        │    OpenAI-Style-Fallback                          │
        │  · Retry-After, 429/402 → remaining=0             │
        │  · Reset-Parsing: delta-s / epoch / Duration      │
        │  · Pool-Inferenz (groq::account, openrouter::free,│
        │    google::project, …)                            │
        └───────┬───────────────────────────────────────────┘
                │ []Observation
                ▼
        ┌───────────────────────────────────────────────────┐
        │ Service.RecordQuotaFromResponse()                 │
        │  1. Store: quota_state upsert (Merge-Semantik:     │
        │     NULL erhält alten Wert, Konfidenz = MAX)       │
        │  2. Store: quota_observations Append (Audit-Log)   │
        │  3. KeyPool.BenchUntil(keyID, resetAt) — nur wenn  │
        │     remaining=0 / 429 / 402 UND Reset in Zukunft  │
        │     → Router überspringt den Key bis zum echten    │
        │       Provider-Reset statt blinder 10-min-Cooldown│
        │  4. Streams: XADD jimesh:quota (Live-Dashboard)    │
        └───────┬───────────────────────────────────────────┘
                │
     ┌──────────┴──────────────┬──────────────────────────┐
     ▼                         ▼                          ▼
 SQLite (WAL)           Redis Streams              REST/gRPC
 quota_state            jimesh:quota               GET /v1/quota
 quota_observations     (SSE-tauglich)             GET /api/quota/headroom?platform=
                                                    GET /api/fallback/rate-limit-usage (echt!)
                                                    GET /api/fallback/token-usage (echt!)
```

### Paid-Models-Pfad 🔥

1. `keys.is_paid` + `chain_entries.is_paid_model` + `container_members.is_paid_model` existieren bereits
2. **Vor dem Call:** `auto_skip_exhausted`-Chains + Keypool-Cooldown filtert erschöpfte Paid-Keys raus (Route-Pre-Check existiert in `service.Route`)
3. **Nach dem Call:** Header-Quota bestimmt den **exakten** Bench-Zeitpunkt (`reset-requests`/`reset-tokens`), statt der pauschalen Kostentabelle aus `cooldownFor()`
4. **Verbrauch:** `usage.prompt_tokens`/`completion_tokens` aus der Antwort → Kosten = tokens × Model-Preis (`models.input_price_per_m`/`output_price_per_m`) → echte `CostReport`-Daten
5. `402 Payment Required` → Bench bis known Reset; ohne Reset-Header → 24h-Deckel (kein blindes 10-min-Poker mit Paid-Credits)

### Free/Paid-Auto-Klassifizierung 🔥 (Operator-Anforderung 2026-09-02)

**Ziel:** Analytics trennt klar **free vs. paid** — und der User muss `is_paid`/`is_paid_model` **nicht mehr von Hand setzen**. Die `x-ratelimit-*`-Header selbst tragen kein Free/Paid-Flag, aber die Evidenz um sie herum trägt es:

| Evidenz | Urteil | Stärke | Quelle |
|---------|--------|--------|--------|
| `402 Payment Required` | **paid** | definitiv | Response-Status (Free-Tier wirft nie 402) |
| `insufficient_quota` im Error-Body | **paid** | definitiv | OpenAI-Familie Prepaid-Credit-Fehler |
| `keys.is_paid` (User-Flag) | paid | Override | manuell gesetzt |
| Katalog-Preis > 0 | paid | stark | `models.input_price_per_m + output_price_per_m` |
| Katalog-Preis == 0 (Modell bekannt) | **free** | definitiv | Free-Tier-Modell |
| `::free`-Pool | **free** | definitiv | `quota.InferPoolKey` (openrouter::free, routeway::free, …) |
| `:free`/`-free`/`/free`-Modelsuffix | **free** | definitiv | OpenRouter-Konvention |
| Promo-Plattform (pollinations, opencode, bai, llm7, kilo, aihorde) | **free** | definitiv | Plattform hat keinen Paid-Tier |
| nichts davon | unknown | — | existierendes Flag bleibt stehen |

**Umsetzung (gelandet):**
- `internal/quota/classify.go` — `ClassifyPaid(ClassifyInput) Classification` (reine Funktion, Evidenz-Priorität wie Tabelle, `ModelKnown`-Flag unterscheidet „Katalog sagt 0" von „nicht im Katalog")
- `service.go` klassifiziert bei jedem Proxy-Call und schreibt automatisch zurück:
  - definitiv paid (402/insufficient_quota) → `Store.MarkModelPaid(platform, model, true)` **und** `Store.MarkKeyPaid(keyID, true)`
  - definitiv free → `Store.MarkModelPaid(platform, model, false)`
  - unknown → kein Write (User-Flag/Bestand bleibt)
- `RequestSummary` trägt `is_paid_model` + `is_paid_key` → alle Analytics-Gruppierungen (Sprint 7 `/api/agents/analytics/summary`, token-usage, rate-limit-usage) trennen danach
- Test: `internal/quota/classify_test.go`

---

## 📦 SQLite-Schema (neu, portiert aus TS-DDL)

```sql
CREATE TABLE IF NOT EXISTS quota_state (
  platform       TEXT NOT NULL,
  key_id         INTEGER NOT NULL DEFAULT 0,
  quota_pool_key TEXT NOT NULL,
  metric         TEXT NOT NULL,          -- 'requests' | 'tokens'
  limit_value    INTEGER,                -- NULL = unbekannt
  remaining_value INTEGER,
  reset_at       TEXT,                   -- ISO8601 UTC, NULL = unbekannt
  reset_strategy TEXT DEFAULT 'unknown', -- 'provider_reported' | 'token_bucket'
  source         TEXT,                   -- 'header' | 'error_body' | 'probe'
  confidence     REAL DEFAULT 0,
  notes          TEXT,
  observed_at    TEXT,
  updated_at     TEXT,
  PRIMARY KEY (platform, key_id, quota_pool_key, metric)
);

CREATE TABLE IF NOT EXISTS quota_observations (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, key_id INTEGER NOT NULL, model_id TEXT,
  quota_pool_key TEXT NOT NULL, metric TEXT NOT NULL,
  status_code INTEGER, limit_value INTEGER, remaining_value INTEGER,
  reset_at TEXT, retry_after_ms INTEGER, reset_strategy TEXT,
  source TEXT, confidence REAL, notes TEXT, endpoint TEXT,
  observed_at TEXT, created_at TEXT
);
```

**Merge-Semantik beim Upsert** (identisch zur TS-Version):
- `limit/remaining/reset_at`: neuer Wert gewinnt, außer NULL → alter bleibt
- `confidence`: MAX(alte, neue) — Vertrauen wächst, schrumpft nie
- `source`: höhere Priorität gewinnt (header=5 > error_body=4 > probe=3)

**Expiry-Normalisierung on-read:** Reset in der Vergangenheit → `remaining = limit`, `reset_at = NULL` (Fenster hat sich beim Provider aufgefüllt — verhindert „für immer erschöpft"-Anzeigen, #453-Port).

**Headroom (Routing-Signal):** pro Key das **schlechteste** Fenster über alle Metriken mit `confidence >= 0.7`: `headroom = remaining/limit` (0=leer, 1=voll). Fehlende Beobachtung = **unbekannt**, nicht 0.

---

## 🛠️ Implementierung (Status dieses Sprints)

| Baustein | Datei | Status |
|----------|-------|--------|
| Quota-Parser (Specs, Pools, Reset) | `src/backend/internal/quota/quota.go` | ✅ neu |
| Store-Schema + Methoden | `src/backend/internal/store/quota.go` (+ migrate in `store.go`) | ✅ neu |
| Keypool: BenchUntil | `src/backend/internal/keypool/keypool.go` | ✅ erweitert |
| Service: RecordQuota/Headroom/Summary | `src/backend/internal/service/service.go` | ✅ erweitert |
| Chat-Proxy-Hook (Header + usage + Cost) | `src/backend/internal/gateway/gateway.go` | ✅ eingehängt |
| Embeddings-Proxy-Hook | `gateway.go` | ✅ eingehängt |
| Custom-Discovery-Hook (`/models`-Probe) | `gateway.go` via `custom_discover.go` | ✅ eingehängt |
| Echte Handler rate-limit-usage/token-usage/stats | `gateway.go` (+ `quota_handlers.go`) | ✅ TS-Shapes gespiegelt |
| `GET /v1/quota`, `GET /api/quota/headroom` | `quota_handlers.go` | ✅ neu |
| Parser-Unit-Tests | `src/backend/internal/quota/quota_test.go` | ✅ neu |
| Proto: `QuotaState`-Message + `ListQuota`/`StreamQuota` RPCs | `jimesh.proto` | 📋 Spec unten (braucht `make proto` auf dem Host) |

### Frontend-Kompatibilität (Shapes 1:1 aus `server/src/routes/fallback.ts`)

- `/api/fallback/token-usage` → `{totalBudget, totalUsed, models:[{modelDbId, displayName, platform, modelId, budget, used, enabled, rpmLimit, rpdLimit, tpmLimit, tpdLimit}]}` — Budget = beobachtetes `limit_value` (tokens-Metrik, monatlich hochgerechnet) statt Fake-5M; `used` = echte Summe aus Request-Summaries
- `/api/fallback/rate-limit-usage` → `{generatedAtMs, rows:[{modelDbId, platform, modelId, rpm:{used,limit}|null, rpd:{…}|null, tpm:{…}|null}]}` — `used = limit − remaining` aus `quota_state`; Fenster-Zuordnung (Minute vs. Tag) über Reset-Distanz (<10min → Minute, sonst Tag); nur Modelle mit Routable-Keys liefern Fenster, sonst `null` (keine Fiction)

### Streaming-Einschränkung (bewusst, dokumentiert)

`stream:true`-Antworten (SSE) werden **durchgestreamt** (io.Copy) — Quota-Header werden trotzdem geparsed (liegen vor dem Body). Token-Verbrauch wird nur bei **nicht**-streamenden JSON-Antworten aus `usage` extrahiert. Follow-up (Task 6.4): SSE-Splitter, der das finale `usage`-Chunk (mit `stream_options.include_usage`) mitnimmt, ohne die Latenz zu verändern.

---

## 🐛 Discovery- & Naming-Fixes (Operator-Report 2026-09-02, gelanded)

**Report 1:** „Custom-Endpoint für opencode findet mehr Modelle, aber der opencode-Preset findet nur 3."
**Ursache:** `handleCustomDiscoverModels` übersprang für Promo-Plattformen (opencode, routeway, unorouter, orcarouter, bai, pollinations) die echte `/models`-Abfrage komplett und servierte eine hartcodierte Mock-Liste — opencode: exakt 3 Einträge.
**Fix:** Live-Endpoint wird **immer zuerst** gefragt; der Offline-Seed antwortet nur noch, wenn der Endpoint die Liste verweigert (non-200/unerreichbar/leer) — und loggt das laut (`fallbackSeed: true` im Response).

**Report 2:** „Man kann den Namen nicht eingeben und überall steht nur custom."
**Ursache:** `handleCustomKeys` speicherte jeden Custom-Key unter Plattform `"custom"`.
**Fix:**
- `CustomKeyRequest` nimmt jetzt `name` (oder `platform`-Alias) — sanitizt zu einer Plattform-ID (`"opencode-go"`, `"my-gateway"`). Keys, Modelle, Dashboards und das Config-Tab zeigen den Namen statt „custom"
- Frontend: „Provider name"-Feld im Custom-Provider-Formular + Durchreichung durch den Discover-Dialog
- `GET /api/keys/endpoints` (neu): pro Key — Base-URL (gespeicherte Custom-URL oder Plattform-Default), Key-Label, paid/free, Keypool-Status, Quota-Fenster. Das Config-Tab rendert daraus ein **Endpoints & Keys Panel über dem Flow-Chart** (`components/keys/endpoints-panel.tsx`)

**Nebenfunde aus dem gleichen Report (ebenfalls gefixt):**
- **Preset-Plattformen hatten keine Chat-URLs:** Der Chat-Proxy kannte nur openai/gemini/deepseek/openrouter/custom — Keys z.B. für opencode oder groq wurden still nach `api.openai.com` geroutet (→ 401). Jetzt: eine URL-Tabelle (`provider_urls.go`) für alle Preset-Plattformen, genutzt von REST-Proxy, WS-Proxy und Probe; named Custom-Provider resolven über ihre key-scoped `custom_base_url`
- **`/api/keys/custom/probe` existierte nicht** (Frontend rief ihn auf → 404): jetzt implementiert — ein minimaler echter Chat-Call gegen den Endpoint; bei Erfolg: Quota-Header aufgezeichnet, Bandit + Keypool lernen (Cooldowns heben sich), Request-Summary für Analytics. Bei Misserfolg: nichts geschrieben, Grund gemeldet
- **Discovery-Antwort verarmt:** Go lieferte nur `id/registered/vision` — Frontend rendert aber `ownedBy`, `contextWindow`, `priceNote`, `isFree`. Jetzt best-effort geparst (OpenAI-Stil `owned_by` + OpenRouter-Stil `context_length`/`pricing`/`architecture.modality`)
- **`strings.Title` deprecated** (Go 1.18+) → eigene `titleModelName`-Hilfsfunktion
- **Preis-Default 1.0 für entdeckte Modelle** erfand $1/M-Kosten für Free-Modelle und vergiftete jede Cost-Schätzung → 0.0 („unbekannt"), der Klassifizierer korrigiert bei echter Antwort
- **i18n-Parity war bereits rot** (de.json: 683 fehlende / 33 veraltete Keys aus dem Reorg): Locale-Sync — fehlende Keys mit Englisch als maschinellen Fallback befüllt, veraltete entfernt; `npm run check:i18n` grün (60 Locales, 1025 Keys). Humane Übersetzungen willkommen

---

### Task 6.1: gRPC/Proto-Erweiterung ✅ (gelandet — protoc 29.3 + protoc-gen-go v1.35.2, passend zur go.mod)

`jimesh.proto` trägt jetzt `QuotaState`, `ListQuota(…)`/`QuotaHeadroom(…)`/`StreamQuota(…)` (tailt `jimesh:quota`) — implementiert in `cmd/server/grpc_sprint67.go` gegen `svc.QuotaStates/QuotaHeadroom`. `make proto` auf dem Host regeneriert identisch (source_relative, gleiche Plugin-Versionen).

```protobuf
// ---------- Quota (Sprint 6) ----------
message QuotaState {
  string platform = 1;
  int64 key_id = 2;
  string quota_pool_key = 3;
  string metric = 4;               // "requests" | "tokens"
  int64 limit_value = 5;
  int64 remaining_value = 6;
  int64 reset_at_unix_ms = 7;
  string reset_strategy = 8;
  string source = 9;
  double confidence = 10;
  string notes = 11;
  int64 observed_at_unix_ms = 12;
}
message ListQuotaRequest { string platform = 1; int64 key_id = 2; }
message ListQuotaResponse { repeated QuotaState states = 1; }
message QuotaHeadroomRequest { string platform = 1; }
message QuotaHeadroomResponse { map<int64, double> headroom = 1; }

// in service JiMesh:
rpc ListQuota(ListQuotaRequest) returns (ListQuotaResponse);
rpc QuotaHeadroom(QuotaHeadroomRequest) returns (QuotaHeadroomResponse);
rpc StreamQuota(ListQuotaRequest) returns (stream QuotaState);  // tailt jimesh:quota
```

### Task 6.2: Headroom in Router-Blending 📋
`router.Pick` Kandidaten-Score um Headroom-Fakter ergänzen: `final = 0.6·rel + 0.4·speed` → bei bekanntem Headroom < 0.2 Kandidat deprioritisieren (nicht exkludieren — Cooldown macht das bereits). Sonst lernt der Bandit erst durch teure 429s.

### Task 6.3: Gemini-`ListModels`-Discovery 📋
`custom_discover.go` kennt OpenAI-kompatible `/models`-Endpoints (inkl. Gemini-OpenAI-Compat). Native Gemini-Discovery (`generativelanguage.googleapis.com/v1beta/models?key=…`) als zusätzlicher Pfad für Keys, die den Compat-Layer nicht freigeschaltet haben — inkl. `inputTokenLimit`-Metadaten in `models.context_window`.

### Task 6.4: SSE-Usage-Splitter 📋 (siehe Einschränkung oben)

### Task 6.5: Quota-Dashboard-Widget 📋
Frontend: `/api/fallback/rate-limit-usage`-Daten als Badges an Model-Zeilen (ModelDetailPage nutzt sie bereits) + neue Quota-Seite, die `jimesh:quota` via SSE tailt (Pattern: `useRealtimeStore`).

---

## ✅ Akzeptanzkriterien

1. Ein Chat-Call gegen einen Provider mit Rate-Limit-Headern erzeugt Zeilen in `quota_state` + `quota_observations` (per `sqlite3 /data/jimesh.db "SELECT …"` verifizierbar)
2. `GET /api/fallback/rate-limit-usage` liefert nach einem echten Call echte `{used,limit}`-Fenster (nicht `[]`)
3. Ein 429 mit `retry-after: 300` benched den Key **bis genau +5min** (Keypool-Status via `/v1/providers` sichtbar), nicht pauschal
4. Paid-Key (`is_paid=1`) mit `402`: Bench bis known Reset, sonst 24h — nie 10min
5. `CostReport` rechnet aus usage × Preisen, nicht `samples × 0.005`
6. `go test ./...` in `src/backend/` grün (Parser-Tests laufen ohne Netz)
7. Non-Goal geschützt: Provider ohne Header (z. B. Gemini-Compat) → keine Quota-Zeilen, **kein** Verhalten.Change im Routing
