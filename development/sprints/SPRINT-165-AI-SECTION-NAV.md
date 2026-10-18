# SPRINT-165 — AI-Section-Nav: eine "AI"-Sektion für Chat, LLM-Proxy, MeshSquad (+ Workers-Empty-State)

**Status:** ✅ Abgeschlossen 1.10.2026 (Verifikation unten, ehrlich ohne lokalen
Stack — Operator-Order: "nicht lokal deployen") · **Datum:** 1.10.2026 ·
**Parent:** SPRINT-160 (WP3) ·
**Scope:** Navigation-only (keine Route ändert sich, keine Route verschwindet —
Mandat 14; kein Backend-File, kein HTTP-Route → **API_DOCS.md unverändert**) ·
**Ownership (Welle):** `section-nav.ts`, `HierarchySidebar.tsx`,
`HierarchySidebar.test.tsx`, `i18n/locales/*.json`, dieses Doc.

## Operator-Auftrag (verbatim, SPRINT-160)

> "dann fehlt immernoch ne ai section wo proxy und meshsquad reinkommt aber wieso
> steht da nur chat"

Plus die SPRINT-160-Konkretisierungen: **kein Agent-Builder-Eintrag** (MeshSquad
bekommt eigenes Frontend — Python/Go-Thema nächste Welle; Operator-Antwort
30.9.), und die **Workers/Serverless-Kategorie** ("Agents" ODER "Workers",
Naming offen) als HONEST Empty-State mit Verweis auf
`docs/research-cloudflare-workers.md` — für ALLGEMEINE Serverless-Worker-Provider
(Cloudflare Workers, AWS Lambda, GCP Cloud Run), nicht Cloudflare-exklusiv.

## Ist-Analyse (am Tree verifiziert, 1.10.)

Die AI-Fläche ist heute über DREI Registry-Orte verstreut, ohne gemeinsame Sektion:

1. **Chat** (`/chat`, ChatInterface — der LLM-Playground): steckt als letzter
   Eintrag in `workspaceItems` (section-nav.ts) bzw. `WORKSPACES_MORE_ITEMS`
   (HierarchySidebar.tsx) — im zusammengeklappten "Workspaces"-Drawer, also
   unsichtbar, solange man ihn nicht kennt. `PROJECT_BASES` matcht `/chat` über
   den Workspaces-Tab.
2. **LLM-Proxy** (8 Seiten laut SPRINT-160-Audit, exakt enumeriert):
   - 6 nav-registrierte Seiten (`proxyItems`): `/proxy/overview`, `/config`
     (FallbackPage), `/proxy/chains`, `/keys`, `/routing-analytics`,
     `/sdk-logs` — heute eigene Sektion "LLM Proxy" (letzter Slot).
   - Die `/models`-Modality-Fläche: `/models/fusion`, `/models/embeddings`,
     `/models/image`, `/models/video`, `/models/audio` (+ je :id-Detail) —
     `PROXY_BASES`-Mitglied, also LLM-Proxy-Fläche, aber mit **KEINEM**
     section-nav/Sidebar-Eintrag** (nur Command-Palette + in-page ModelsTabs).
     Das ist genau die Mandat-14-Lücke (Seite existiert, kein Nav-Pfad).
   - `/fallback` ist ein Redirect auf `/config` (kein eigener Eintrag nötig),
     `/config/:id` (ModelDetailPage) ist Detailseite von `/config`.
   - Audit-Rechnung "8 Seiten" = Config, Proxy Overview, Chains, Providers,
     SDK-Logs, Routing-Analytics, Models (die /models-Familie), Fallback.
3. **MeshSquad**: Chat-Space `/chat/space` (workspaceItems-Registrierung;
   Sidebar-Registrierung = `MeshSquadChatEntry` — der ehrlich gegatete
   Plugin-Entry mit install/unavailable-Badge, SPRINT-153) steht als eigener
   Block zwischen Dashboards-Dropdown und den Sektionen — ohne Sektionskontext.

## Ziel

EINE "AI"-Sektion (section-nav.ts NavGroup + HierarchySidebar-Sektion, das
S157-Dual-Registration-Muster), anstelle der heutigen Verstreutheit — der
ehemalige LLM-Proxy-Tab/-Slot wird zur AI-Sektion (der Operator-Order nennt
Proxy als INHALT der AI-Sektion, nicht als Parallelstruktur):

1. **Chat** (`/chat`) — der LLM-Playground.
2. **MeshSquad** — Chat-Space `/chat/space` via den bestehenden
   `MeshSQuadChatEntry` (gegatete Registrierung, wird NICHT als Zweit-Link
   dupliziert — Mandat 14.5). KEIN Agent-Builder-Eintrag (Operator-Entscheid).
3. **LLM-Proxy** — alle 6 nav-registrierten Seiten, unverändert.
4. **Models-Playgrounds** — die 5 `/models/*`-Seiten bekommen hier ihren ERSTEN
   Nav-Eintrag (Reachability-Fix, gleiche Änderung — Mandat 14.1).
5. **Workers/Serverless** — Unterkopf mit HONEST Empty-State (Mandat 2): kein
   toter Link, keine Fake-Integration, nur der echte Stand (noch nichts gebaut)
   + der Verweis auf `docs/research-cloudflare-workers.md`. Naming "Workers"
   vorläufig — Operator-Frage "Agents vs Workers" offen (hier dokumentiert).
   Wird erst dann ein echter Link, wenn eine echte Seite existiert.

Navigation-only: jede bestehende Route bleibt erreichbar; Tab-Highlighting über
`activeSectionFor` (navGroups-Reihenfolge) — `/chat` wandert aus
`PROJECT_BASES` in die AI-Basen, damit nicht der Workspaces-Tab (erste Gruppe)
gewinnt.

## Work Packages

| WP | Inhalt | Akzeptanz |
|---|---|---|
| WP1 | `lib/section-nav.ts`: `AI_BASES` (= ex-PROXY_BASES + `/chat`), `aiItems` (13: Chat, Chat-Space, 6 Proxy, 5 Models), NavGroup "AI" (`nav.ai`, Sparkles) ersetzt die LLM-Proxy-Gruppe im letzten Slot; `proxyItems`-Export entfällt (nur intern konsumiert, S157-Präzedenz bei securityItems); `PROJECT_BASES` verliert `/chat`; workspaceItems verliert `/chat` + `/chat/space` | activeSectionFor: `/chat`, `/chat/space`, `/config`, `/models/image` → nav.ai; alle anderen Zuordnungen unverändert |
| WP2 | `HierarchySidebar.tsx`: AI-Sektion anstelle der LLM-Proxy-Sektion (gleicher Slot), gespiegelt aus aiItems: `AI_CHAT_ITEMS` → `<MeshSquadChatEntry />` → `AI_PROXY_ITEMS` (6) → `AI_MODEL_ITEMS` (5) → Workers-Empty-State; localStorage-Sektion-Key bleibt `proxy` (S157-Präzedenz: Keys sind stabile Storage-Ids, Labels sind UI); MeshSquad-Entry-Block wandert IN die Sektion (sein Always-visible-Spot war S153-IA, der Operator-Order überdeckt das) | Reachability-Guard grün (alle navGroups-Items im Sidebar-Text auflösbar); Workers-Bereich ohne Button/Link (Mandat 2) |
| WP3 | i18n (60 Locales): NEU `nav.ai` (en "AI" / de "KI"), `sidebar.aiWorkers`, `sidebar.aiWorkersEmptyState` (mit research-Doc-Pfad); NACHTRAG S164-Handoff: `sidebar.toggleDrawer` + `sidebar.closeDrawer` in alle 60 (bisher tf-Inline-Fallback); AUFRÄUMEN: 5 verifiziert ungenutzte Keys (`projectDetail.deploymentTriggered`, `triggerDeployment`, `syncGit`, `editManifest`, `dryRun` — 0 Verwendungen, S166 dokumentiert, per grep erneut verifiziert) aus allen 60 entfernen | `node scripts/check-i18n.mjs` PASS, 60 Locales; Key-Delta netto 0 (3307) |
| WP4 | Tests: `HierarchySidebar.test.tsx` (meine Ownership) — Workspaces-Sektion ohne Chat, neue AI-Sektionstests (collapsed-Default, 13 Labels, Workers-Empty-State ohne Link, Research-Pfad sichtbar), Reachability-Guard-Expand-Liste um AI. PLUS `lib/section-nav.test.ts`: 4 Pin-Assertions, die ex-LLM-Proxy-/Chat-Zuordnungen festnageln — die Datei pinnen genau das Modell, das WP1 ändert (S157-WP4-Präzedenz: der Test des Modells gehört zur Modell-Änderung); kein paralleler Agent arbeitet dort (git status verifiziert) | alle Suiten grün; S164-ResponsiveShell unangetastet grün |
| WP5 | Docs: dieses File — Plan zuerst, dann Arbeitslog/Verifikation/Offen-Items | Mandat 1 |

## Akzeptanzkriterien

1. `activeSectionFor('/chat'|'/chat/space'|'/config'|'/proxy/*'|'/keys'|'/routing-analytics'|'/sdk-logs'|'/models/*'|'/fallback')` → `nav.ai`; `/workspaces/*` weiterhin `nav.workspaces` (kein Basis-Überlapp).
2. Reachability-Guard: JEDDES section-nav.ts-Item ist über die (aufgeklappte) Sidebar erreichbar — Mandat 14.
3. Workers-Unterbereich: rendert Text + Research-Verweis, aber KEIN navigierbares Element (ehrlich, kein toter Link); "Agents vs Workers"-Naming als offene Frage im Doc.
4. `npx tsc -p tsconfig.app.json --noEmit`: ≤ Baseline 416, 0 Fehler in SPRINT-165-Dateien.
5. `npx vitest run`: alle Suiten grün (Baseline: 60 Dateien / 486 Tests — inkl. der S164-Suite, unangetastet).
6. `node scripts/check-i18n.mjs`: PASS 60 Locales / 3307 Keys (netto ±0).
7. Backend: 0 Dateien angefasst → API_DOCS.md unverändert, keine Backend-Checks nötig.

## Verifikations-Baseline (wirklich gelaufen, 1.10., VOR meinen Änderungen)

- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c 'error TS'` → **416**
  (Aufgaben-Briefing nannte 414 — die Parallels (S163-MeshSquad-Backend,
  S166-Nacharbeit) haben +2 seit S164 geliefert; dokumentiert, nicht versteckt).
- `node scripts/check-i18n.mjs` → **"i18n validation passed for 60 locales and 3307 keys"**.
- `npx vitest run` → **Test Files 60 passed (60), Tests 486 passed (486)**
  (Briefing nannte 59/482 — Parallels haben MeshSquadChatEntry-/PluginInstall-
  Wizard-Suiten ergänzt; Ist-Stand dokumentiert).

## Arbeitslog (was tatsächlich passiert ist)

**Attribution ehrlich:** Die Ist-Analyse oben und der Kern von WP1 (die
AI-Gruppe in `section-nav.ts`) entstanden vor dem ersten Absturz des
S165-Agenten (Vorgänger). Der Agent stieg ZWEI MAL ohne Meldung ab; der
Fortsetzungs-Agent (auftragsgemäß mit Skript-/Bulk-Ansatz statt 60 Einzel-
Datei-Edits) lieferte WP2–WP4. WP5 (dieser Eintrag) und die gesamte
Verifikations-Kette sind vom Parent in dieser Session nachgezogen.

**WP1 — `src/frontend/src/lib/section-nav.ts` (Navigation-only):**
- `AI_BASES` (Zeile 133) = ex-`PROXY_BASES` + `/chat`; `/chat` ist aus
  `PROJECT_BASES` (Zeile 143) raus — dadurch gewinnt der AI-Tab den
  `/chat`-Match statt der Workspaces-Gruppe (Acceptance 1).
- `aiItems` (Zeile 221, 13 Einträge): 2 Chat (`/chat`, `/chat/space`) →
  6 Proxy (die ex-`proxyItems` verbatim, Kommentar Zeile 238) → 5
  `/models/*`-Playgrounds. Die Models-Familie bekommt hier ihren **ersten**
  Nav-Eintrag überhaupt (Mandat-14-Lücke geschlossen).
- NavGroup "AI" (Zeilen 518–533): `labelKey: 'nav.ai'` (530), `isActive`
  über `AI_BASES` (532), weiterhin LETZTER Slot ("ein Tool unter vielen,
  nicht der Einstieg").
- `proxyItems`-Export entfällt (war nur intern konsumiert — S157-Präzedenz);
  Workers bekommt bewusst KEINEN NavEntry (Platzhalter-Kommentar 271–281,
  Mandat 2); `workspaceItems` verliert `/chat` + `/chat/space` (Zeile 331).

**WP2 — `src/frontend/src/components/sidebar/HierarchySidebar.tsx`:**
- Spiegelung der 13 aiItems in drei Blöcke: `AI_CHAT_ITEMS` (497) →
  `<MeshSquadChatEntry />` → `AI_PROXY_ITEMS` (508) → `AI_MODEL_ITEMS`
  (523) → Workers-Empty-State (`data-testid="ai-workers-empty-state"`, 2085).
- Der ehemals immer-sichtbare standalone MeshSquadChatEntry-Block (S153-IA)
  ist entfernt (Kommentar 1986) — der Eintrag selbst ist UNVERÄNDERT und
  landet jetzt IN der AI-Sektion (Operator-Order "…wo proxy und meshsquad
  reinkommt"); kein Zweit-Link (Mandat 14.5).
- Sektionsrender 2050–2097; **localStorage-Key bleibt `proxy`** (S157-
  Präzedenz: Keys sind stabile Storage-IDs, Labels sind UI).
- `/chat` raus aus `WORKSPACES_MORE_ITEMS` (430).

**WP3 — i18n, 60 Locales (bulk statt Einzeldatei-Edit):**
- NEU je 60/60: `nav.ai` (en "AI", de "KI"), `sidebar.aiWorkers`,
  `sidebar.aiWorkersEmptyState` (mit `docs/research-cloudflare-workers.md`).
- S164-Handoff je 60/60: `sidebar.toggleDrawer` + `sidebar.closeDrawer`
  (bisher tf-Inline-Fallback).
- ENTFERNT (5 Keys × 60 = 300 Zeilen): `projectDetail.{deploymentTriggered,
  triggerDeployment, syncGit, editManifest, dryRun}` — nach grep 0
  Verwendungen (S166-Doku, vor dem Edit erneut verifiziert).

**WP4 — Tests:**
- `src/lib/section-nav.test.ts`: die bestehenden Zuordnungs-Assertions
  umgeschrieben (`nav.llmProxy` → `nav.ai` bei 79–81, `nav.workspaces` →
  `nav.ai` bei 39) — der Test pinnt das Modell, das WP1 ändert
  (S157-WP4-Präzedenz). ZUSÄTZLICH 2 neue S165-Pins: Zeile 91 (AI-Gruppe
  besitzt Chat + Proxy + Models) und Zeile 113 (kein Basis-Überlapp mit
  Workspaces, exakte 13-To-Liste, AI bleibt letzter Slot).
- `src/components/sidebar/HierarchySidebar.test.tsx`: Workspaces-Sektion
  ohne Chat (Kommentar 1078) + neue AI-Suite: 1158 (collapsed-Default +
  alle 13 Labels), 1211 (Navigation, inkl. erstem `/models/fusion`-Pfad),
  1232 (Workers-Empty-State: Pfad sichtbar, NICHTS klickbar — Mandat 2),
  1252 (Reachability-Guard mit AI-Einträgen — Mandat 14).

**WP5 — dieses Doc.**

## Verifikations-Transkript (wirklich gefahren, 1.10., OHNE lokalen Stack)

Kein `make up`, kein Deploy — Operator-Order in dieser Session:
**"nicht lokal deployen"**. Alles hier ist statisch/hermetisch:

1. `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c 'error TS'` →
   **414** (Baseline beim S165-Start: 416 — die Differenz stammt aus der
   Parallelarbeit, NICHT aus diesem Sprint). Restriktiv derselbe Lauf mit
   `grep -E 'section-nav|HierarchySidebar'` → **0 Zeilen** (Acceptance 4).
2. `npx vitest run` → **Test Files 61 passed (61), Tests 493 passed (493)**
   (Baseline beim Start 60/486; +1 Datei/+7 Tests = laufende Parallel-
   Arbeit; `HierarchySidebar.test.tsx` 46/46 grün, S164-Suite unangetastet).
3. `node scripts/check-i18n.mjs` → **"i18n validation passed for 60 locales
   and 3307 keys"** (Acceptance 6: Key-Delta netto 0).
4. Key-Vorkommen per grep über `src/i18n/locales/*.json`:
   `toggleDrawer` 60 · `closeDrawer` 60 · `aiWorkers` 60 ·
   `deploymentTriggered`/`triggerDeployment`/`syncGit`/`editManifest`/
   `dryRun` je **0**.
5. Backend: **0 Dateien angefasst** → `API_DOCS.md` unverändert durch S165
   (Acceptance 7). Als Wellen-Check trotzdem: `make go-build` Exit 0,
   `make go-vet` Exit 0.

## Offene Items / Handoff-Notes

- **`nav.llmProxy` ist nach WP1 ungenutzt** (0 Referenzen in TS/TSX —
  `sdkLogs.sourceTabs.llmProxy` ist ein anderer Key und bleibt). Nicht
  entfernt, weil Acceptance 6 den Key-Delta netto 0 festschreibt →
  Aufräum-Kandidat für die nächste i18n-Welle (ein Key weg = 3306).
- **Workers/Serverless** rendert nur Text + Research-Verweis, kein Link
  (bewusst, Mandat 2). Naming "Agents vs Workers" bleibt OFFEN
  (SPRINT-160-Nachtrag). Wird zu echten `AI_*_ITEMS`-Einträgen in
  derselben Änderung, die eine echte Seite liefert.
- **Chat-Zuordnung** (SPRINT-173-Nachtrag 3): LLM-Playground → AI (hier
  gebaut) vs. Team-/Crew-Chat → GENERAL/UTILITY. Beide Direktiven stehen
  verbatim im S173-Doc; Auflösung = UIUX-Agent im finalen Design-Audit.
  S165s laufende Arbeit bleibt bis dahin unberührt.
- **localStorage-Key `proxy`** weiterhin Storage-ID der AI-Sektion
  (benannte Sektion = Label-Sache). Ein Rename würde den persisted
  Collapse-State aller Operator-Boxen wegwerfen — nicht getan.
- **Operator-Live-Check** (offen, ehrlich — Mandat 2): Sidebar unter
  `lg` (S164-Drawer) mit der neuen AI-Sektion live prüfen; dafür Stack
  hochfahren, was ausdrücklich NICHT in diesem Sprint passiert ist.

