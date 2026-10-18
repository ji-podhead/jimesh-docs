# JiMesh - Unified User Prompts & Architectural Requirements Summary

This document serves as the definitive reference for the **JiMesh** (formerly FreeLLMAPI fork) project. It captures every core prompt, architectural directive, sprint goal, and feature requirement specified by the operator.

---

## 🎯 The Core Vision
**JiMesh** is a high-performance, Go-backed, self-healing LLM Mesh Router. It acts as an intelligent, cost-aware proxy that load-balances requests across multiple providers (OpenAI, Gemini, NVIDIA NIM, DeepSeek, Groq, Mistral, GitHub, Cerebras, Cohere, OpenRouter, etc.). It optimizes for cost, speed, intelligence, and reliability dynamically using Thompson Sampling bandits and custom fallback chains.

---

## 📜 Chronological Prompts & Core Demands

### 1. "ich hab da keys aber keine models das funktioniert alles nicht du solltest den port portieren"
*   **The Issue:** In a fresh installation, the models table was completely blank because the Go backend created empty chains with zero model entries on startup. Additionally, clicking "Sync" failed because `/api/premium/sync` was unimplemented in Go.
*   **The Resolution:**
    *   Pre-populated S, A, and B fallback chains with active, prioritized model entries dynamically during Go's database seeding (`SeedDefaults()`).
    *   Implemented the native `POST /api/premium/sync` endpoint in Go, routing directly to the real catalog synchronization service layer.

### 2. "ich kann imernoch keine models auswählen nachdme ich die ausgesucht habe"
*   **The Issue:** The model picker components (Comboboxes/Dropdowns) in the Playground and Keys pages returned 404 because the frontend still requested the legacy admin path `/api/models` instead of the Go programmatic path `/v1/models`.
*   **The Resolution:**
    *   Mapped and registered the `/api/models` and `/api/models/{id}` REST endpoints directly in Go, bridging them to the native model catalog.

### 3. "das findet acuh de models ncht wenn man keys added nix funktioniert alles. NIMM DIESE GEMOCKTEN SACHEN RAUS DA DIeSES emINI model. DA WERDEN KEINE MODELS GeFETCHED WENN MAN DA WAS HINZUFÜGT UND DER PLAN waR NICHT EINFAHC NUR ALLeS HARDZUCODEN UND ZU MOCKEN; ALsO WaS SOLL DeR SCHEISS"
*   **The Issue:** Adding custom keys did not populate models dynamically; everything was static/mocked.
*   **The Resolution:**
    *   Built a fully dynamic Go model crawler (`discoverAndRegisterModels`) that runs in the background immediately upon key registration, querying the provider's native `/v1/models` endpoint using the key's credentials, persisting all discovered models directly into SQLite, and linking them to active chains.

### 4. "DAS IST EINFACH NUR OPENAIAPI DU MUSST EINFAHC NUR MODELS CALLEN WENN JEMAND EIN API KEY ERZEUGT UND WIR BRUACHEN AUCH EIN EDIT BUTTON FÜR DIE MODELS EINES PROVIDERS IN keY UND nenN dsa PROVIDeR STATT KEYS"
*   **The Demands:** Rename "Keys" page to "Providers", call `/v1/models` during key addition, and add a prominent "Model Scope" edit button for each key.
*   **The Resolution:**
    *   Rebranded the entire navigation bar and localization catalogs (en, de, zh-CN) to rename the "Keys" tab to **"Providers"**.
    *   Integrated a permanently visible **"Model Scope"** button next to each provider row, making key-scoping a prominent, easily accessible first-class action.

### 5. "Something went wrong ... __SERVER_PORT__ is not defined. WARUM IST DSA HALLES HARDGECODET MIT DE MODELS WIESO IST BEI NVIDIA NUR EIN ModeL???"
*   **The Issue:** The Next.js frontend crashed because `__SERVER_PORT__` was undefined in the browser bundle. Additionally, NVIDIA keys only discovered a single model because the backend filtered model IDs with rigid keywords (like *gpt*, *gemini*, *claude*).
*   **The Resolution:**
    *   Configured the Webpack `DefinePlugin` inside Next.js (`next.config.mjs`) to dynamically inject `__SERVER_PORT__` as `"3010"` at compile-time.
    *   Removed all restrictive keyword filters from Go's background crawler, allowing **unlimited discovery** of every single model returned by any compatible provider (e.g. all 30+ NVIDIA NIM models).

### 6. "hier da kannst du für custom clients models holen, mach einfach für alles custom clients Mutual TLS with a custom HTTP client ... und dann machen wir einfach presets für die default clients aus dem originalrepo. cool wäre auch wenn unser wrapper den wir mi protobuff bilden dann direkt über websocket die calls an unseren wrapper sendet ohne direkten vollen hop via http call wenn wir zb ein model callen."
*   **The Demands:** Support Mutual TLS (mTLS) outbound requests via a custom Go HTTP client using certificate chains (`client-chain.pem`/`client.key`). Implement an ultra-low latency WebSocket completion proxy to eliminate HTTP connection overhead for high-speed clients.
*   **The Resolution:**
    *   Implemented `getHTTPClient()` in Go, automatically loading client leaf and intermediate certificate chains from `/secrets/openai/` to build secure mTLS tunnels.
    *   Built a bidirectional **WebSocket Completion Proxy** (`ws://localhost:3010/v1/chat/completions/ws`), upgrading client connections, executing real-time SQL/KeyPool routing, and streaming chunked provider tokens back over the same persistent socket.

### 7. "MAN KANN AUCH KEINE CHAINS ERSTELLEN. auSSERDEM FEHLT IMMERNOCH FrEE UND PAID ENtWEDER DER USER MUSS EIN SWITCH SETZEN IN DEN MODEL SETTIngS M PROVIDER DROPDOWN ODER WIR ERKENNEN DAS AUTOMATISCH AM API KEY ODER BEIDES UND USER KANN MANUELL AUF PAID SETZEN ODER FREE"
*   **The Demands:** Fix custom chain profile creation (it was a hardcoded static mock). Add a switch to manually tag models as Paid vs Free and persist this in SQLite.
*   **The Resolution:**
    *   Ported `/api/profiles` and `/api/profiles/active` to real Go/SQLite operations, enabling operators to dynamically create and toggle active routing profiles in the UI.
    *   Added `is_paid_model` column in SQLite, mapped it in `ModelSettingsPatch` / `ModelSettingsSource` and backend GET/PUT routers, and rendered an interactive **"Is Paid Model" Switch** directly in the model detail settings page.

### 8. "DAS FINDET DIE MODELS NICHT!!! Model scope ... nvidia/nemotron-3-super-120b-a12b ... AUSSERDEM HAB ICH GESGAT MAN SOLL DAS AUFKLAPPEN UM DIE MODELS ZU SEHEN AUE?ERDEM eIn REFRESH BUTTON um NEUE ALTE MODELS ZU FINDEN ..."
*   **The Demands:** Allow OpenRouter/NVIDIA keys to scope any model (fix platform-mismatches in suggestions). Expand provider rows in the Keys tab to list allowed or registered models. Trigger manual model refreshes.
*   **The Resolution:**
    *   Upgraded `ModelScopeDialog` to allow Multi-Provider platforms (like `openrouter` or `custom`) to list suggestions for all registered models.
    *   Refactored the provider-list expand chevron (`ChevronDown`) to be available for **all keys**, showing green badge chips for scoped models and muted chips for unscoped active platform models.
    *   Mapped the provider row **"Check Now / Refresh"** button to trigger the dynamic Go model crawler in the background, serving as an instant "Sync Models" action.

### 9. "welche api gibt mir alle informaionen zu alen openai kompatiblen models ... OpenRouter Models API ... und im models tab kannst du auch nen filter bauen für die stats zu den models. außedem fehlt mr auch ein provide rund apoi ke filter und es wäre auch geil mit nem filter für model art bzw parameter, nicht nur vision und tools filter"
*   **The Demands:** Build a live, benchmark-driven routing engine based on OpenRouter's specifications. Filter models in the Fallbacks tab by Provider, Key, and Parameter Type. Open model stats in an expandable right-sidebar instead of a separate page.
*   **The Resolution:**
    *   Implemented OpenRouter crawler: fetches full specifications from `/v1/models` (pricing, context, vision/tools) and live performance metrics from `/api/v1/benchmarks` (Elo, tokens/sec), dynamically computing intelligence and speed ranks in SQLite.
    *   Added three rich dropdown selectors (**Providers, Keys, Types**) in `FallbackPage.tsx`, allowing instant model filtering by provider platform, specific key ID (cascading!), or parameter style (Chat, Instruct/Coder, Reasoning, Embeddings).
    *   Replaced the row click navigation with a sleek, slide-out **Model Insights & Stats Sidebar Panel** from the right, executing fuzzy-matching to display live specs, prices, and descriptions in the current view.

### 10. "wenn man auf model space in keys tab klickt hat man nciht die anzeige mit select all und select none man kann ja nciht mal models entfernen ... und ist das jetzt wieder nur pro provider oder pro api key und kann man api keys jetzt als paid/free taggen???"
*   **The Demands:** Add "Select All" and "Select None" checkboxes/toggles for model scoping. Enable tagging API Keys themselves as Paid or Free.
*   **The Resolution:**
    *   Replaced the text-input scoping format with a scrollable **Checklist (Checkbox List)** of all registered models matching that key's platform, complete with **`Select All`** and **`Select None`** quick-action buttons.
    *   Upgraded the keys table with `is_paid` database columns, added JSON mapping in GET/POST/PATCH Go routes, and integrated an interactive **`Paid / Free` Toggle Badge** directly on every key row in the dashboard.

---

## 🧱 Complete Architectural Blueprint (Sprint Achievements)

```
             ┌──────────────────────────────────────────────────────────┐
             │                   React Admin Dashboard                  │
             │           (Vite/Next SPA - Port 5173 / 3010)             │
             └─────────────────────────────┬────────────────────────────┘
                                           │
                        REST / WebSockets  │ (mTLS / SSE)
                                           ▼
             ┌──────────────────────────────────────────────────────────┐
             │                     JiMesh Go Backend                    │
             │                (Port 3009 gRPC / 3010 HTTP)              │
             └─────────────────────────────┬────────────────────────────┘
                                           │
                         In-Memory Reads   │ (Dynamic Cooldown / Bandits)
                                           ▼
             ┌──────────────────────────────────────────────────────────┐
             │                SQLite (CGO-Free) & KeyPool               │
             │                    (Data Folder Volume)                  │
             └──────────────────────────────────────────────────────────┘
```

### 1. P0 — Router Core Engine
*   **User-Preference Blending:** Router merges the real-time Thompson Sampling Bandit score with the manual user-preference factor:
    $$\text{Final Score} = 0.7 \times \text{Bandit Score} + 0.3 \times \text{User Preference}$$
*   **Paid Auto-Skip & Cooldowns:** On `402 Payment Required` or `429 Too Many Requests`, Go intercepts the upstream error, places the failed key on temporary cooldown inside the KeyPool, and triggers a dynamic, 3-step automatic failover loop to route to the next best candidate.
*   **Per-Key Binding:** If a fallback entry has a linked `api_key_id`, the routing engine forces the use of that specific credential, bypassing general pool rotation.

### 2. P1 — Live Key-Based Crawler
*   **Dynamic Discovery:** Adding/refreshing keys fires background crawler goroutines that fetch real-world model catalogs.
*   **OpenRouter Benchmark Learning:** Automatically fetches Evals (Elo) and live speed metrics (tokens/sec), converting them into SQLite ranks dynamically.

### 3. P2 — Unified Operations UI
*   **No Merging:** Key/model combinations represent individual fallback chain entries, fully supporting granular drag-and-drop prioritization.
*   **Cascading Dropdowns & Stats Sidebars:** Multi-dropdown toolbar for instant catalog filtering, collapsible key details, and slide-out sidebars for live stats.
