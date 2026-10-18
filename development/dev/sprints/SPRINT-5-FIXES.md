# Sprint 5: Housekeeping & Fixes — Inkonsistenzen aus dem Audit 2026-09-02

**Duration:** 2026-09-02 → 2026-09-04
**Status:** 🚧 In Progress
**Goal:** Die im Full-Audit gefundenen Inkonsistenzen (Ports, Framework-Drift, Security, Fake-Handler, Repo-Hygiene) fixen bzw. mit klaren Entscheidungen dokumentieren. Keine neuen Features — nur Wahrheit in den Systemen.

---

## 🎯 Sprint Goals

1. **Eine Wahrheit für Ports** — Redis/Backend/Frontend-Ports sind in 3 Dateien unterschiedlich definiert
2. **Frontend-Framework-Klarheit** — docker-compose behauptet Next.js, injiziert aber Vite-Env-Vars
3. **Docker-Socket-Mount entschärfen** — Security-Risiko dokumentieren + Optionen
4. **Fake-Data-Stubs eliminieren** — mehrere Gateway-Handler liefern erfundene Werte (→ Sprint 6)
5. **Repo-Hygiene** — 398 uncommittete Dateien + untracked Root-Monorepo entschlacken

---

## 📋 Tasks

### Task 5.1: Redis-Port-Inkonsistenz 🔥

**Befund (3 Quellen, 3 Antworten):**

| Quelle | Sagt |
|--------|------|
| `docker-compose.yml` (L7) | Host-Mapping `6385:6379` |
| `config/topology.json` | `"external": 6380` |
| `CLAUDE.md` | „Redis Stream `jimesh:events` (`localhost:6380` on host)" |

**Fix:**
- [ ] Entscheidung treffen: **6380 ist kanonisch** (topology.json + CLAUDE.md stimmen bereits überein; 6385 ist vermutlich ein Kollisions-Workaround)
- [ ] `docker-compose.yml`: `"6380:6379"` mappen — ODER falls 6385 auf dem Host bewusst gewählt wurde (Kollision mit anderem Redis): topology.json + CLAUDE.md auf 6385 anpassen. **Nur eine der beiden Varianten, aber konsequent überall.**
- [ ] Innerhalb des Docker-Netzes ist das irrelevant (`REDIS_URL=redis://redis:6379`), betrifft nur Host-Zugriff (z. B. `redis-cli -p 6380 XLEN jimesh:events`)

**Akzeptanz:** `grep -rn "638[05]" docker-compose.yml config/topology.json CLAUDE.md` liefert eine konsistente Story.

---

### Task 5.2: Frontend ist Next.js — Vite-Env-Vars sind wirkungslose Relikte 🔥

**Befund:**

- `src/frontend/package.json`: `"dev": "next dev -p 5173 -H 0.0.0.0"` → **Next.js 15**, eindeutig
- `docker-compose.yml` (L61): `VITE_BACKEND_HOST=jimesh` — **Vite-Var, die Next.js nie liest**
- `docker-compose.yml` (L48): Kommentar „React Admin Dashboard Frontend (Next.js)" — stimmt zufällig, aber die Umgebung mischt beide Welten
- `src/frontend/` enthält **beide** Build-Artefakte: `.next/` UND `dist/`, node_modules enthält Vite-Dependencies

**Fix:**
- [ ] `docker-compose.yml`: `VITE_BACKEND_HOST` → `NEXT_PUBLIC_BACKEND_HOST=jimesh`, `BACKEND_PORT=3010` → `NEXT_PUBLIC_BACKEND_PORT=3010` (Next.js injiziert nur `NEXT_PUBLIC_*` in den Client-Bundle)
- [ ] Prüfen, ob `src/frontend` den Wert überhaupt liest: `grep -rn "NEXT_PUBLIC_BACKEND_HOST\|BACKEND_HOST" src/frontend/src` — falls die App die API-URL anders auflöst (z. B. relativ über nginx-Proxy), die toten Env-Vars ganz streichen
- [ ] `src/frontend/dist/` löschen (Vite-Relikt) + `node_modules` neu installieren (Vite-Altlasten raus), danach `npm run build` verifizieren
- [ ] CLAUDE.md-Test-Kommando verifizieren: `npm run test` in `src/frontend/` → `vitest run && node scripts/check-i18n.mjs` ✅ (stimmt bereits)

**Akzeptanz:** `grep -rn "VITE_" docker-compose.yml src/frontend/src` → leer. Frontend buildet mit Next-only-Stack.

---

### Task 5.3: Docker-Socket-Mount + docker.io im Backend-Container ⚠️

**Befund (`docker-compose.yml` L37–38):**

```yaml
- /var/run/docker.sock:/var/run/docker.sock  # Mount Host Docker Socket!
command: ["sh", "-c", "apt-get update -qq && apt-get install -y -qq docker.io && go run ..."]
```

- Der Backend-Container hat **volle Kontrolle über den Host-Docker-Daemon** (Root-äquivalent auf dem Host)
- `apt-get install docker.io` bei **jedem Start** — langsam, und die Container-Engine wird nur für `projects_ssh.go` / Project-Deploy gebraucht
- Schlägt fehl, wenn `apt` offline ist → Backend startet nicht

**Fix (abgestuft):**
1. [ ] **Minimal:** `docker.io`-Install durch statisches Binary oder dediziertes Image (`golang:1.23-bookworm` + Docker-CLI-Layer, oder `docker:cli`-Multi-stage-Copy) ersetzen; apt-get aus dem Startcommand raus
2. [ ] **Besser:** Project-Deploy auf Docker-API über den Socket mit abgesenkten Rechten (z. B. [Sysbox](https://github.com/nestybox/sysbox) oder rootless-Docker + Socket-Proxy wie `tecnativa/docker-socket-proxy` mit `POST=/containers/*`-Allowlist)
3. [ ] **Dokumentieren:** SECURITY.md-Abschnitt „Warum der Backend-Container den Docker-Socket braucht" + was ein Compromise bedeutet

**Akzeptanz:** Backend-Start dauert < 10s ohne apt-get; Socket-Zugriff ist dokumentiert und bewusst entschieden.

---

### Task 5.4: Fake-Data-Stubs im Gateway inventarisieren (→ echte Daten in Sprint 6)

**Befund — Gateway-Handler liefern erfundene/harte Werte:**

| Handler | Datei:Zeile | Liefert heute | Sprint-6-Ziel |
|---------|-------------|---------------|----------------|
| `handleFallbackTokenUsage` | gateway.go:1209 | Fake 5M-Budget/Key + 5% simulierter Verbrauch | Echte Budgets aus `quota_state` (Header-Beobachtungen) + `requests`-Verbrauch |
| `handleFallbackRateLimitUsage` | gateway.go:1280 | `{"rows": []}` — immer leer | Echte RPM/RPD/TPM-Reihen aus `quota_state` (TS-Shape aus `server/src/routes/fallback.ts:564`) |
| `handleFallbackStats` | gateway.go:1285 | Hash-„Zufallszahlen" aus modelID (142 Requests, 180ms…) | Echte Werte aus Router-Bandit (`Snapshot()`) + Keypool |
| `handleFallbackPenaltyInspector` | gateway.go:1330 | `{"rows": []}` | Echte Penalty/Cooldown-Historie (Follow-up) |
| `handleAnalyticsSummary` | gateway.go:1335 | `keysCount * 12` Requests | Aggregation aus Request-Summaries (Sprint 7) |
| `Service.CostReport` | service.go:976 | `samples * 0.005` USD | Echte Kosten aus usage × Model-Preisen (Sprint 6) |
| `Service.CheckHealth` | service.go:965 | Immer `healthy: true, 120ms` | Echter Probe mit Quota-Header-Auswertung (Sprint 6) |

**Fix:** In Sprint 6 implementiert (dort spezifiziert). Dieser Task bleibt als Verweis — die Stubs werden **nicht** einzeln gepatcht, sondern durch die echte Quota-Pipeline ersetzt.

---

### Task 5.5: Repo-Hygiene — uncommitteter Umbau 🧹

**Befund:**

- `git status`: **398 modified** (+5861/−2530) + ~30 untracked Verzeichnisse
- Der komplette FreeLLMAPI-Monorepo (root `server/`, `client/`, `cli/`, `desktop/`, `shared/`, `package.json`…) liegt **untracked** neben dem JiMesh-Code
- README.md lokal geändert: Pfadreferenzen `frontend/` → `client/` umgezogen, JiMesh-Anhang entfernt — **nicht committet**
- Neue Go-Dateien (`custom_discover.go`, `projects_ssh.go`, `service_test.go`) + Frontend-Komponenten untracked
- `src/backend/workspaces/proj-*` (7 Stück) — Laufzeit-Artefakte im Source-Tree, nicht ignoriert

**Fix:**
- [ ] `.gitignore` ergänzen: `src/backend/workspaces/proj-*/`, `src/frontend/.next/`, `src/frontend/dist/`, `src/frontend/node_modules/`, `data/*.db*`
- [ ] Commit-Plan (logische Häppchen):
  1. `chore: gitignore runtime artifacts (workspaces, .next, dist, node_modules)`
  2. `feat(gateway): custom provider discovery + SSH project deploy (untracked files)`
  3. `feat(backend): service tests + chain nodes` 
  4. `docs: reorganize — FreeLLMAPI monorepo at root, JiMesh backend under src/` (der große Umbau-Commit)
  5. Sprint 5 Fixes (5.1–5.3)
  6. Sprint 6 Quota (kommt)
- [ ] **Entscheidung dokumentieren** (README/CONTRIBUTING): JiMesh-Canonical = `src/backend` (Go) + `src/frontend` (Next.js) + `clients/` (CLI/Desktop) + `config/` + `docs/sprints`; Root-Monorepo (`server/`, `client/`, …) = Upstream-FreeLLMAPI-Referenz/TS-Fallback, wird nicht von JiMesh-Features berührt

**Akzeptanz:** `git status` nach dem Sprint zeigt nur bewusst offene Arbeit; `make restart` läuft auf einem sauberen Checkout.

---

### Task 5.6: Kleine Konsistenz-Fixes

- [ ] `custom_discover.go:99`: `strings.Title` ist deprecated seit Go 1.18 → durch eine eigene Rune-Uppercase-Hilfsfunktion ersetzen (kein neues Dep nötig)
- [ ] `custom_discover.go:104–113`: `ContextWin: 128000, InputPerM: 1.0, OutputPerM: 1.0, Tier: "A"` — hartcodierte Default-Annahmen für entdeckte Modelle. Zumindest `IsPaidModel` aus dem Key ableiten (`keys.is_paid`) und Preis `0.0` statt `1.0` setzen, damit ** unbezahlte Annahmen** (1 USD/1M für ein Free-Modell!) nicht die Cost-Schätzungen verfälschen
- [ ] `docker-compose.yml` Healthcheck nutzt `wget` — auf `golang:1.23-bookworm` vorhanden, aber prüfen; sicherer: `curl` explizit installieren oder Go-basierten `/health`-Check per `CMD go` vermeiden (wget ist OK, nur dokumentieren)
- [ ] README (root): JiMesh-Abschnitt war lokal entfernt — beim Reorg-Commit (5.5) die neue Einleitung schreiben: JiMesh = Smart LLM Mesh Router auf FreeLLMAPI-Basis, verweist auf `docs/sprints/` + `OPERATOR_GUIDE.md`

---

## ✅ Nachtrag (2026-09-02, gelandet in `10ad049` + `6542ea8`)

Zusätzliche Operator-Reports, direkt mit gefixt:

- **Route-Rename `/models/chat` → `/config`** — die Mesh/Fallback-Workbench hieß irreführend „Chat Models" (FreeLLMAPI-Relikt). Jetzt Top-Level-Nav „Config" (`nav.config`, alle 60 Locales), Legacy-Pfade (`/models/chat[/:id]`, `/fallback`) redirecten
- **Hydration-Fehler bei Reload mit aktivem Pfad** — `cz-shortcut-listen`-Attribut auf `<body>` kommt von Browser-Extensions (Sidebar-Tools), nicht von uns → `suppressHydrationWarning` auf `<body>` (das auf `<html>` existierte schon)
- **Copy-Buttons für Endpoint + API-Key im Config-Tab** (Endpoints & Keys Panel über dem Flow-Chart) + Reveal-Endpoint `GET /api/keys/{id}/value` im Backend
- **`GroupHeaderCells`-Crash** (pre-existing): `navigate` ohne `useNavigate` → ReferenceError beim Klick auf Modell-Gruppen
- **tsc-Status**: alle von Sprint 5–7 berührten Dateien sauber; **bekannt**: pre-existing tsc-Fehler in Reorg-WIP-Dateien (chain-mesh-graph.tsx ungenutzte Imports, FallbackPage shared/types-Pfad, CostDashboard/DiscoveryStatus `res: unknown`) → `next build` scheitert bis die aufgeräumt sind, `next dev` läuft. Aufräumen = Task 5.5-Folge.

---

## 🔗 Abhängigkeiten

- Task 5.4 ist ein Verweis auf **SPRINT-6-MODELS-AND-QUOTA.md** (dort Implementation)
- Task 5.5 Commit 4+5 sollten NACH Sprint 6 gemeinsam fließen, damit `main` nie einen kaputten Zwischenzustand des Umbaus hat — oder einzeln, wenn Sprint 6 länger dauert (Deploy-Blocker zuerst)

---

## 📊 Metriken

- `grep`-Konsistenz-Checks (5.1, 5.2) grün
- `git status` < 10 Dateien offen am Sprint-Ende
- `make restart` < 60s, kein apt-get im Startpfad
- Frontend `npm run build` ohne Vite-Artefakte erfolgreich
