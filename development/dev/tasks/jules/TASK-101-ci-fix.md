# TASK-101 — CI-Fix: Workflows von der entfernten Legacy-Tier entkoppeln (⚡ P0 — ERSTE PRIORITÄT)

**Quelle:** Claude-Audit 16.9. — „ci.yml/docker.yml bauen seit Tagen den entfernten Legacy-Node-Tier, jeder Push ist rot"
**Verifiziert (GLM, 16.9.):** Root package.json hat `workspaces: [shared, server, client, cli]` — aber `server/`, `clients/cli/`, `clients/desktop/` existieren NICHT mehr (Legacy-Tier entfernt laut CLAUDE.md „Removed legacy tiers"). Die CI läuft `npm install` im ROOT (Mandat-Verstoß: „No Root node_modules") + `npm test -w server` + `npm test -w cli` + `npm build -w server -w cli -w client` — jeder dieser Workspace-Selektoren schlägt fehl, weil die Targets weg sind. **JEDER PUSH SEIT DER LEGACY-ENTFERNUNG IST ROT.**

## Was zu tun ist

### 1. `.github/workflows/ci.yml` — komplett auf die echte Struktur umstellen

**Alt (kaputt):**
```yaml
- run: npm install                          # Root install — Mandat-Verstoß
- run: npm run test:migrations             # Root-Script — läuft gegen Legacy
- run: npm test                            # test -w server + test -w cli — Targets fehlen
- run: npm run build                       # build -w server -w cli -w client — Targets fehlen
```

**Neu (gegen die echte Struktur):**
```yaml
jobs:
  backend:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.24' }
      - name: Build backend
        run: cd src/backend && CGO_ENABLED=0 go build ./...
      - name: Vet
        run: cd src/backend && go vet ./...
      # go-test braucht die laufende DB — nur build+vet in CI, Tests laufen lokal via make check-backend

  frontend:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm', cache-dependency-path: 'src/frontend/package-lock.json' }
      - name: Install
        run: cd src/frontend && npm ci
      - name: Type-check
        run: cd src/frontend && npx tsc --noEmit -p tsconfig.app.json
      - name: Tests
        run: cd src/frontend && npm test
      - name: Slop-Gate
        run: node scripts/check-frontend-slop.mjs
```

### 2. `.github/workflows/docker.yml` prüfen
- Baut er Legacy-Images (server/, clients/)? → auf `src/backend/Dockerfile` + `src/frontend/Dockerfile` umstellen oder entfernen
- Backend ist bind-mounted-source (kein Image-Build nötig laut CLAUDE.md) — falls docker.yml Legacy baut: reduzieren auf Frontend-Image oder entfernen

### 3. `cli-release.yml` + `desktop-release.yml` + `pages.yml` + `static-pages.yml` prüfen
- cli-release/desktop-release: Legacy-Targets → **entfernen** (die Produkte existieren nicht)
- pages/static-pages: Falls sie die knowledge/-Pages oder docs bauen → ok, sonst fixen

### 4. Root `package.json` bereinigen
- workspaces: [shared, server, client, cli] → die 3 fehlenden entfernen (nur `shared` prüfen ob es existiert)
- Root-scripts (dev, test, build) → entfernen oder auf die echte Struktur zeigen (src/frontend/)
- **Mandat beachten:** „No Root node_modules" — Root package.json hat nichts zu suchen außer ggf. Workspace-Definitionen die REAL existieren

### 5. Lokal verifizieren bevor pushen
```bash
cd src/frontend && npx tsc --noEmit -p tsconfig.app.json   # muss 0-206 sein
cd src/frontend && npm test                                  # 279/279
node scripts/check-frontend-slop.mjs                          # green
cd src/backend && CGO_ENABLED=0 go build ./...               # grün
```

## Acceptance
- [ ] CI ist auf main GRÜN (der Push, der diesen Fix enthält)
- [ ] Kein Workflow referenziert server/, clients/cli/, clients/desktop/
- [ ] Kein npm install im Root
- [ ] backend-job: go build + go vet (CGO_ENABLED=0)
- [ ] frontend-job: tsc + vitest + slop-gate
- [ ] Legacy-Workflows (cli-release, desktop-release) entfernt oder auf echte Targets umgestellt

## Regeln
- CLAUDE.md „Removed legacy tiers" ist die Wahrheit: clients/cli, clients/desktop, server/ existieren nicht
- MANDATES: keine Root node_modules
- Der Fix-Commit ist der Beweis: wenn die CI danach grün ist, ist der Fix verifiziert (Live-Verify)
