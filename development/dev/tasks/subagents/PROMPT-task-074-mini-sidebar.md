# TASK-074 — Mini-Sidebar pro Haupt-Route + Overview/Landing-Tab (nach E-IA: 5 Tabs)

**Status:** ✅ erledigt (14.9.2026, SPRINT-40-SECTION-NAVIGATION.md, Worktree
`../jimesh-worktrees/task-074-mini-sidebar`, Branch `task/074-mini-sidebar`)
— Pilot Security komplett:

1. **MiniSidebar** gebaut (`src/frontend/src/components/layout/mini-sidebar.tsx`,
   neues Verzeichnis): Requisiten = Sektions-Routen (`to`/`labelKey`/`icon`,
   `divider?`, `isActive?`-Prädikat) + `ariaLabelKey`; Labels via
   `t(labelKey)` in der Komponente; **aktive Route bewusst über NavLink statt
   als Prop** (Router-Kontext statt zweiter Wahrheit — Begründung im
   Sprint-Bauplan), `isActive`-Prädikat deckt URL-Cluster (Scans → iac/sast/
   dast). Sticky, `hidden` < `md` (Mobile deckt das Gruppen-Hamburger-Menü).
2. **Security-Pilot:** `views/SecurityLayout.tsx` (MiniSidebar + Outlet) am
   `<Route path="/security">` (AdminLayout-Outlet-Präzedenzfall), alle
   Sub-Routen relativ — **keine URL geändert**, `/security` neu mit
   Index-Redirect auf Overview (zuvor NotFound). **Landing-Upgrade**
   additiv (`components/security-landing-strip.tsx`, SecurityOverviewPage
   +2 Zeilen): Criticals 24h, Scanner-Status (ehrlich: letzte Fundmeldung,
   kein Up/Down-Claim), aktive Quarantänen, Stunden-Trend — echte
   `/api/sdk/logs?type=audit` + `/api/security/events` +
   `/api/security/quarantine`-Daten, ehrliche Leer-/Fehlerzustände,
   KEIN neuer Backend-Route (API_DOCS unverändert). 24h-Fenster
   fetch-anchored (`dataUpdatedAt`) statt `Date.now()` im Render —
   react-hooks/purity-konform, Query-Keys mit der Overview geteilt.
3. **App.tsx minimal + hunk-isoliert** (3 Hunks): Import + Security-Route-
   Nesting + Events-Routen-Move; navGroups/Platform (TASK-066, war in der
   Base schon gemerged) unangetastet.
4. **Pattern-Report** (Details + Empfehlungen im Sprint-File): Sidebar-
   Replication mechanisch; Landing je Sektion eigene Inhaltsentscheidung
   (DBs hat heute keinen echten Feed — Mandat 2 verbietet Fake-Kacheln);
   Route-Move = konfliktträchtigste Fläche → pro Sektion eigener
   Verschiebe-Commit; WIDE_ROUTES braucht Präfix-Match vor Proxy-Replication.
   Reihenfolge: DBs → Platform → Workspaces → Proxy.
5. **Verify:** tsc 205=205-Baseline (0 neue), check:i18n grün (60 Locales /
   2001 Keys, en/de handübersetzt + 58 backfilled), ESLint clean,
   Vitest 225 passed (5 pre-existing chart-axis-Fehler, von 069
   dokumentiert — 074-Dateien unberührt), Live aus dem Worktree: `curl
   /security` = 200, alle 6 betroffenen Module vom Dev-Server sauber
   transformiert. Grenze ehrlich: :19090 mounted den Haupt-Checkout, nicht
   den Worktree (gleiche Einschränkung wie TASK-066-Bericht).
6. **GIT:** ein Commit auf `task/074-mini-sidebar` (explizite Pfade,
   NICHT gepusht).

**Follow-up WP2 (Operator 14.9., gleicher Tag — Globaler Scope-Selector):**
✅ erledigt (zweiter Commit auf demselben Branch): globaler Scope
(Workspace/SSH-Target/Session/App) als Store + Hook
(`lib/global-scope.ts` — Toast-Store-Idiom, `useSyncExternalStore`,
localStorage-Persistenz ehrlich beschriftet, Store-Tests 3/3 grün),
hierarchisches Dropdown (`components/layout/scope-selector.tsx` — echte
Registries: `/api/workspaces`, `/api/sessions`, `/api/settings/ssh_endpoints`;
Workspace-Submenü zeigt die echte Session/App/SSH-Hierarchie) im neuen
`header`-Slot der MiniSidebar, Pilot-Verbraucher = Landing-Strip (Scope-Chip
+ Funde-Filter, Quarantäne bewusst ungefiltert), `UnifiedFinding.sessionId`
additiv, i18n 17 Keys in 60 Locales, **Verwendungsstellen-Inventar (12
Anschlußpunkte mit Datei-Ref + Andock-Muster) im Sprint-File**. Verify:
tsc 205=205-Baseline, check:i18n grün (2018 Keys), Vitest 228 passed,
Live-Module sauber transformiert. Kein Backend-Route, keine Dependency.

**Follow-up WP3 (Operator 14.9. — Selector ausblenden, wo unbenutzt):**
✅ erledigt (neuer Worktree `../jimesh-worktrees/task-074-scope-usage`,
Branch `task/074-wp3-scope-usage`, auf main 56b29ad — WP1/WP2 gemerged):
**Schema-File** `lib/scope-usage-schema.ts`: `ScopeUsageEntry {route,
exact?, consumesScope, consumer?, planned?}` je Route — `consumer:
Datei:Zeile` als Ehrlichkeits-Anker bei verbrauchenden Seiten,
`planned:`-Inventarpunkt bei noch nicht verdrahteten; Matcher
`scopeSelectorVisibleFor(pathname)` (pathIn-Segment-Grenzen, longest-match,
`exact` Section-Root, **unlisted = hidden**). SecurityLayout mountet
`<ScopeSelector />` nur bei Freigabe: **sichtbar heute NUR
/security/overview** (+ Bare-Pfad im Index-Redirect), Exposure/Secrets/
Scans/Events/Testing blenden aus — eine Fläche darf den Selector erst
zeigen, wenn ihr Code ihn liest UND ihr Schema-Eintrag `consumer:` nennt.
5 Matcher-Tests grün (Overview sichtbar, Schwestern versteckt auch bei
tiefen Pfaden, Segment-Grenzen, unlisted versteckt). Verify: tsc
205=205-Baseline (diff leer), ESLint sauber, Vitest 245 passed (5
pre-existing chart-axis), Live aus dem Worktree: 4 Routen = 200, 4 Module
sauber transformiert. Kein Backend-Route, keine i18n-Änderung nötig.

**Follow-up WP4 (Operator 14.9. — Crash + „warum nur Security?" + Rail
rechts als Canvas-Overlay):** ✅ erledigt (2 Commits auf Branch
`task/074-wp4-section-rail`, Worktree `task-074-scope-usage` auf main):
**WP4a:** MenuGroupContext-Crash gefixt (DropdownMenuLabel braucht
<DropdownMenuGroup> — Base UI GroupLabel liest useMenuGroupRootContext;
Regressionstest öffnet das echte Menü in jsdom, 2/2). NEBENFUND mit
Nachwirkung: die 5 „pre-existing" chart-axis-Failures = NODE_ENV=production
aus der Harness-Shell → React-Prod-Build → act undefined; vitest.config
erzwingt jetzt NODE_ENV=test + '@'-Alias → **Suite erstmals 100% grün
(256/256)**. **WP4b:** Globale **SectionRail** statt Pilot-nur-Security:
Nav-Modell extrahiert nach `lib/section-nav.ts` (EINE Quelle für Top-Nav +
Rail, Items mit Icons, `activeSectionFor`), Rail EINMAL in der App-Shell
gemountet (kein Route-Nesting für die anderen Sektionen!), `fixed` rechts
unter der Navbar, **Overlay über dem Canvas**, kollabiert icon-only w-12,
Hover/focus-within → w-44 mit Labels (pure CSS-Transition), Scope-Selector
schema-gegart (WP3) oben in der Rail, SecurityLayout → Outlet-Pass-
Through, mini-sidebar.tsx gelöscht. 4 Modell-Tests (Sektions-Matcher,
null außerhalb, en.json-Label-Guard, Icon-Pflicht). Verify: tsc 205=205,
Vitest 256/256, Live 6 Routen + 5 Module sauber. Offen dokumentiert:
3rem-Overlay am rechten Rand (gewünscht; pr-12-Follow-up möglich),
Touch-Pin-Toggle als Mini-WP, 12 📋-Scope-Anschlüsse bleiben Inventar.

**Ursprünglicher Auftrag (Status war 🔲 offen — aktualisiert nach E-IA,
DECISIONS.md 14.9.):** Die
Zielstruktur ist jetzt ENTSCHEIDEN — 5 Haupt-Tabs (Proxy, Workspaces, Platform
NEU, Security, DBs) + separates Admin. Der Platform-Tab (Control-Planes, Vault,
Networks) wird parallel durch TASK-066 gebaut — koordiniert euch über die
E-IA-Tabelle in DECISIONS.md, nicht über Annahmen.

## Aufgabe

1. **Bauplan zuerst** (kurzer Plan-Abschnitt im Sprint-File, Dokumentations-Mandat):
   - Geteilte MiniSidebar-Komponente (src/frontend/src/components/layout/mini-sidebar.tsx)
   - Pro-Sektion Overview-Page (Pilot: Security — hat die meisten Sub-Pages:
     Overview/Events/Scans/Testing/Exposure/Project-Secrets)
   - App.tsx: navGroups erweitern um Platform-Gruppe (E-IA-Tabelle) — ROUTE_PLAT =
     ['/control-planes', '/vault-dashboard', '/networks']
2. **Pilot-Sektion Security bauen:** MiniSidebar mit den Security-Sub-Routen +
     Overview-Landing-Page (wichtigste Infos zusammengefasst: Criticals der letzten
     24h, Scanner-Status, Quarantänen, Events-Trend — die Daten kommen aus
     /api/security/* + /api/sdk/logs?type=audit, alle existieren)
3. **Pattern-Report:** Replication auf die anderen 4 Sektionen straightforward oder
     Friction? (Nicht alle halbfertig bauen — das Muster muss erst gut sein)
4. **Recent commits auf App.tsx prüfen** (066 baut parallel am Platform-Tab!) —
     Hunk-isoliert arbeiten, E-IA-Tabelle ist die gemeinsame Wahrheit

## Regeln
- Scope: src/frontend/** (Layout-Komponenten + Security-Pilot + App.tsx navGroups),
  Task-File, Sprint-File. NICHT die Security-Sub-Pages selbst umbauen (das sind
  andere Tasks) — nur die Navigation + Overview-Page
- No-Mock: Overview-Page zeigt echte API-Daten mit ehrlichen Empty-States
- tsc --noEmit clean, check:i18n grün (backfill-i18n.mjs bei neuen Keys)
- GIT: explizite Pfade, kein -A, NICHT pushen
