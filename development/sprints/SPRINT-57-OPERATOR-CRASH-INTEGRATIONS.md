# SPRINT-57 — OPERATOR-CRASH-REPORT + INTEGRATIONS-UPDATE (fix-crashes-integrations)

> Anlass: Live-Meldung des Operators (27.9.2026), drei Punkte:
> 1. /workspaces/deployments → "c.find is not a function"
> 2. /workspaces/settings → "c.map is not a function"
> 3. Die Integrations-Page (/agents, nav „Integrations") zeigt noch das
>    alte „Connect coding tools"-Setup (Claude Code, Codex CLI, BASE_URL,
>    API_KEY, `npx jimesh setup-claude`) — „das wollen wir eigentlich
>    nicht mehr".
> Branch: `fix-crashes-integrations` · Datum: 27.9.2026

## Root-Cause-Analyse (vor Implementation am Code verifiziert)

Die beiden Crash-Pages selbst extrahieren KORREKT:
WorkspaceDeploymentsPage.tsx (Query `['projects']`, queryFn
`(await apiFetch<{projects:…}>('/api/projects')).projects ?? []`) und
WorkspaceSettingsPage.tsx (identisch). GET /api/projects liefert
`{projects:[…]}` (API_DOCS §projects) — beide Pages holen das Array also
sauber. Der Fehler ist ein **Shared-Cache-Shape-Konflikt**:

- `['projects']` ist EIN geteilter React-Query-Cache-Key mit ZWÖLF
  Consumern (WorkspacesPage, WorkspaceDeploymentsPage,
  WorkspaceSettingsPage, NetworkEditingPage, SecurityOverviewPage,
  VaultDashboardPage, ControlPlanesPage, WorkspaceDetailPage,
  WorkspaceAppsPage, ActiveDeploymentsSection, BrowserRuntimeModal,
  PluginInstallWizardDialog).
- Elf davon speichern das extrahierte ARRAY unter dem Key. DREI schrieben
  das ROHE Response-Objekt `{projects:[…]}` in denselben Cache:
  ActiveDeploymentsSection.tsx (gemountet auf /plugins — die häufigste
  Poison-Quelle: jeder Besuch von /plugins legte das Objekt ab),
  BrowserRuntimeModal.tsx (geöffnet ohne Projekt-Prop) und
  PluginInstallWizardDialog.tsx (Install-Wizard).
- React Query liefert beim Mount den gecachten Wert SOFORT aus. War der
  Cache von einem Raw-Writer gefüllt, rendert die Crash-Page
  `projects.find(...)` (WorkspaceDeploymentsPage:100) bzw.
  `projects.map(...)` (WorkspaceSettingsPage:74) auf dem Objekt →
  „c.find is not a function" / „c.map is not a function" (minifiziert: c).
- `['projects']` vs `['projects-list']` (SSOT-Store, lib/query-keys.ts)
  sind zwei GETRENNTE Caches — das ist das dort dokumentierte, etablierte
  Muster (query-keys.ts:26-32, „same route under two keys"); beide Keys
  werden von den Schreib-Stellen invalidiert (NewProjectDialog,
  ActiveDeploymentsSection). KEIN Konflikt, kein Fix nötig — der Crash
  kam ausschließlich aus der Shape-Divergenz INNERHALB von `['projects']`.
- Bonus-Befund im selben Zug: PluginInstallWizardDialog schrieb auch unter
  `['workspaces']` (queryKeys.workspaces, SSOT-Store) das rohe Objekt —
  der Store degradierte dadurch still auf `[]` (Array.isArray-Guard in
  lib/store.tsx:113). Mitgefixt.

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | Drei Raw-Writer auf `['projects']` (ActiveDeploymentsSection, BrowserRuntimeModal, PluginInstallWizardDialog) auf die kanonische Array-Extraktion umgestellt (`.projects ?? []` — exakt wie alle anderen Writer desselben Keys); Wizard zusätzlich `['workspaces']` | [x] erledigt |
| WP2 | Integrations-Page (AgentsPage.tsx, /agents): altes „Connect coding tools"-Setup KOMPLETT entfernt (Quickstart-Command, API-Key-Reveal, 12-Tool-Katalog mit BASE_URL/API_KEY-Snippets); neuer Inhalt: ActiveDeploymentsSection + SubagentsPanel (beides bestehende echte Komponenten — nichts erfunden, Mandat 2); `data/agent-tools.json` + `components/agent-icons.tsx` gelöscht (keine anderen Importer, grep-verifiziert; der Plugin-Katalog bleibt bewusst auf /plugins) | [x] erledigt |
| WP3 | i18n: 12 verwaiste agents.*-Scalar-Keys + descriptions-Block (15 Leaf-Keys) = 27 tote Keys aus ALLEN 60 Locales entfernt; agents.title → „Integrations", agents.description → neue ehrliche Beschreibung (de echt übersetzt, Rest English-Fallback wie repo-üblich). en.json chirurgisch editiert (JSON-Roundtrip würde den vorbestehenden doppelten projects.newProject-Key still entfernen); die anderen 59 Locales per JSON-Roundtrip (alle 59 verifiziert byte-identisch zu stringify(obj,null,2)+'\n') | [x] erledigt |
| WP4 | Docs: dieses Sprint-File + Backlog-Spiegel. API_DOCS.md unverändert — keine HTTP-Route berührt (rein frontendseitiges Data-Handling + Page-Austausch) | [x] erledigt |

## Akzeptanz & Verifikation (am Code verifiziert, 27.9.2026)

- `npx tsc --noEmit -p tsconfig.app.json` (Worktree): **479 Fehler vor ==
  479 nach, Fehlermenge identisch modulo Zeilennummern** (diff der
  positions-bereinigten sortierten Listen leer) — **0 neue Fehler**. Die
  4 BrowserRuntimeModal-Befunde (358/378/404/656 → 363/383/409/661) sind
  pre-existing und liegen in Zeilen, die dieser Sprint nicht berührt.
- `npm run check:i18n`: **grün — 60 Locales, 2818 Keys** (2845 − 27
  entfernte Leaf-Keys; Parität intakt).
- `npx vitest run` (Voll-Suite im Worktree): **27 Dateien / 280 Tests,
  alle grün** — identisch zum S55-Endstand (1ac9bda).
- ESLint A/B (die 4 angefassten Dateien, 1ac9bda vs. Branch-Worktree):
  **13 → 11 Befunde, 0 NEU** — weg sind nur zwei alte Befunde (AgentsPage
  Date.now-Purity-Error — Code ist mit dem Setup entfernt; eine
  exhaustive-deps-Warnung in ActiveDeploymentsSection — projects kommt
  jetzt unverändert aus useQuery statt `?? []` im Render).
- Crash analytisch ausgeschlossen: alle ZWÖLF `['projects']`-Writer
  liefern jetzt das Array; ein nicht-Array kann den Key nicht mehr
  erreichen (Grep-Audit aller queryKey: ['projects']-Stellen).

## Retrospektive / Parallel-Session-Protokoll

- Dieser Sprint lief parallel zu fremden Strömen im selben Working Tree
  (Onboarding-Reach → fix-onboarding-reach@66065a0; Project-Server-Select-
  Backend-WIP; Post-Mortem-Agent). Der Post-Mortem-Agent hat den
  Code-Teil dieses Sprints (WP1+WP2 — unverändert, byte-ident per diff
  gegen 907dde6 verifiziert) in seinen Sammel-Commit 907dde6 auf
  fix-onboarding-reach übernommen, der über 3c44204 in main gemergt
  wurde. WP3 (i18n-Cleanup) fehlt dort: main@3c44204 trägt NUR die
  en.json-Bereinigung — **check:i18n auf main ist ROT (59× „extra keys",
  die 27 toten agents.*-Keys)**. **Nächster Operator-Schritt:
  fix-crashes-integrations nach main mergen (heilt die Parität)** — oder
  mindestens den Locale-Teil dieses Branches übernehmen.
- Committet aus dem Worktree /tmp/jimesh-fix-crashes (Branch dort
  ausgecheckt); der Haupt-Tree wurde für diesen Commit nicht berührt.

## Live-Smoke

- [ ] offen — Operator (Stack down in dieser Umgebung; wie S55-5 per
  Voll-Suite + analytischem Ausschluss kompensiert, kein fake
  Live-Befund).
