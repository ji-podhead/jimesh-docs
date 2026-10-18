# SPRINT-56 — ONBOARDING-REACH (fix-onboarding-reach)

> Anlass: Design-Audit `docs_dev/AUDIT-DESIGN-GAP-LIST.md` (27.9.2026),
> P0-Befund #11/#12 (Status PARTIAL): `/onboarding` hat eine Route
> (App.tsx) und eine View (`OnboardingPage.tsx`, TASK-090 — Welcome →
> Worker-Node → Firewall → Deploy, echter SSH-Probe über
> POST /api/nodes/provision), ist aber von KEINEM UI erreichbar:
> 0 `navigate('/onboarding')`-Call-Sites, kein Top-Nav-Eintrag, kein
> Sidebar-Eintrag, kein Palette-Eintrag, kein First-Run-Trigger.
> Branch: `fix-onboarding-reach` · Datum: 27.9.2026

## Ziel

Der First-Start-Onboarding-Flow wird mit dem billigsten vollständigen
P0-Fix UI-erreichbar: **ein** neuer Link an **zwei** immer sichtbaren
Stellen, **ein** neuer i18n-Key in allen 60 Locales:

1. **Sidebar-Navigation-Section** (`HierarchySidebar.tsx`,
   `NAVIGATION_ITEMS`) — an erster Stelle der Section, vor Integrations/
   Apps/Plugins/Deployments/Servers/Settings. Die Sidebar ist auf jedem
   md+-Screen sichtbar → der Wizard ist damit von jeder Page aus
   erreichbar.
2. **Command-Palette** (`command-palette.tsx`, ⌘K/Ctrl+K, Pages-Gruppe)
   — der Audit listet /onboarding explizit unter den fehlenden
   Palette-Routen (Befund #22).

Nicht-Änderungen (bewusst): kein Top-Nav-Dropdown-Eintrag
(E-IA-Regel aus section-nav.ts: neue Routen landen nicht „by
convenience in the nearest group" — die Sidebar-Navigation-Section ist
die designierte Heimat für cross-cutting Flächen), kein First-Run-
Redirect auf der Overview-Page (Operator-Option c; kann später
nachgerüstet werden), keine URL-Änderungen.

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `HierarchySidebar.tsx`: `/onboarding`-Eintrag (ListChecks-Icon) an erster Stelle der Navigation-Section; Kommentar dokumentiert den Audit-Befund. Icon-Import erweitert | [x] erledigt |
| WP2 | `command-palette.tsx`: `p-onboarding`-Page-Command (Label `nav.onboarding`, Keywords: onboarding/setup/first start/wizard/worker node/provision/firewall/deploy), Icon-Import erweitert | [x] erledigt |
| WP3 | i18n: `nav.onboarding` in allen 60 Locales (en: „Onboarding"; echte Übersetzungen für die Sprachen mit etabliertem Begriff — de: Onboarding, es: Primeros pasos, fr: Prise en main, ru: Первые шаги, ja: オンボーディング, zh-CN: 初始设置 u. a.; Rest English-Fallback wie repo-üblich). Textueller Insert nach `nav.firewallOpnsense` (letzter nav-Key, in allen 60 Dateien verifiziert) — KEIN JSON-Roundtrip, weil en.json einen vorbestehenden doppelten `projects.newProject`-Key enthält, den ein Roundtrip stillschweigend entfernen würde | [x] erledigt — git diff: 60 Dateien, je 1 Zeile Komma + 1 neue Zeile, alles sonst unverändert |
| WP4 | Tests: `HierarchySidebar.test.tsx` — Navigation-Section-Label-Liste um „Onboarding" erweitert + neuer Reachability-Test (Klick auf den Eintrag landet den Router wirklich auf `/onboarding`; Label kommt aus `nav.onboarding`, ein roher Key würde den Test failen lassen) | [x] erledigt |
| WP5 | Docs: dieses Sprint-File + Backlog-Spiegel. API_DOCS.md unverändert (kein HTTP-Route betroffen — reine Frontend-Navigation; /api/nodes/provision und /api/settings/onboarding_complete sind bereits dokumentiert) | [x] erledigt |

## Akzeptanzkriterien (vor Implementation festgelegt)

- `grep -rn "navigate('/onboarding')" src/frontend/src` liefert ≥ 1
  Produktions-Call-Site (Sidebar) + Palette-Entry (go('/onboarding')).
- `npx tsc --noEmit -p tsconfig.app.json`: 0 NEUE Fehler (A/B gegen
  main: 479 vor == 479 nach).
- `npm run check:i18n`: grün, alle 60 Locales paritätisch (1 neuer Key).
- `npx vitest run`: Voll-Suite grün inkl. erweitertem Sidebar-Test.
- ESLint auf den angefassten Dateien: 0 neue Findings.
- Der Link ist ohne direkte URL-Eingabe erreichbar (Sidebar sichtbar auf
  jedem md+-Screen; Palette via ⌘K).

## Verifikation (am Code verifiziert, 27.9.2026)

- **tsc A/B**: `npx tsc --noEmit -p tsconfig.app.json` — **479 Fehler
  vor == 479 nach, Fehlerliste byte-identisch (diff leer) → 0 neue**.
- **`npm run check:i18n`**: grün — „i18n validation passed for 60
  locales and 2846 keys" (2845 + `nav.onboarding`).
- **Vitest Voll-Suite**: **281/281 in 27 Dateien** grün, inkl.
  `HierarchySidebar.test.tsx` mit dem NEUEN Reachability-Test (Suite
  13 → 14 Tests).
- **ESLint** (Angefasst-Dateien: HierarchySidebar.tsx +
  HierarchySidebar.test.tsx + command-palette.tsx): rc 0, 0 Findings.
- **Erreichbarkeit**: Palette-Eintrag wörtlich `go('/onboarding')`
  (command-palette.tsx:138); der Sidebar-Link ist DATENGETRIEBEN
  (`NAVIGATION_ITEMS` `{ to: '/onboarding', labelKey:
  'nav.onboarding' }` → renderSectionLinks → `navigate(entry.to)`),
  d. h. das Literal `navigate('/onboarding')` existiert weiter nicht —
  der Klick-Pfad ist stattdessen durch den neuen Test bewiesen: Klick auf
  die „Onboarding"-Row landet den Router auf `/onboarding`
  (MemoryRouter + useLocation-Probe).

## Live-Smoke

- [ ] offen — Operator (Stack in dieser Umgebung down; wie S55-5/S54-WS-3
  per Voll-Suite + Tests kompensiert, kein fake Live-Befund).
