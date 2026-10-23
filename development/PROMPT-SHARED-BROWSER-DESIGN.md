# PROMPTS — Shared Browser (Stitch-Design + Implementierung)

Quelle: Operator-Verbatim23.10. (`SHARED-BROWSER-MASTERPLAN.md`). Nutzen wie
`PROMPTS-STITCH-DESIGN.md`: Prompt1–6 erzeugen die Stitch-Mockups
(Tailwind-CDN, M3-Tokens, dunkel, `Material Symbols Outlined`, Geist),
Prompt7–9 sind Agent-Implementierungs-Prompts für S192–S194.

---

## Prompt1 — Browser-Section in der Workspace-Sidebar

```
Console-Sidebar (M3, dark, Stitch-Tokens, winziges radius):
Neue Section "BROWSER" in der WORKSPACE-Spalte, gleichrangig zu EMAIL.
Inhalt: Session-Karten, eine pro laufender Browser-Session:
- Zeile: Live-Punkt (grün, pulsing,2s), Session-Name ("Landing-Debug"),
  darunter Avatar-Stack der aktiven Teilnehmer (Humans + Agents gemischt,
  Agents mit violettem Ring), rechts Runtime-Badge (CHROME | CAMOUFOX |
  DESKTOP, Mono-Caps) und Zuschauer-Zahl mit Visibility-Icon.
- Hover: "Einklinken"-Button (primary), Overflow-Menü (Maus übernehmen,
  Aufzeichnung stoppen, Session beenden).
- Sektions-Footer: "+ Neue Browser-Session" ( ghost, plus-icon ) und ein
  "Aufzeichnung: L3" Chip der auf den Verbosity-Picker verweist.
Stil wie bestehende Sidebar-Sections (h-6 Rows, text-xs, rails).
```

## Prompt2 — SharedBrowserPage (Meet + Chat)

```
Vollflächige Konsolen-Seite "BROWSER SESSION":
- Linksbündig65% Video-Fläche: der Browser-Stream (dunkler Rahmen wie
  Browser-Chrome mit URL-Leiste, Tab-Title, REC-Punkt oben rechts mit
  aktivem Verbosity-Chip "L3 ·14 Screens").
- IM Video-Overlay: mehrere benannte Maus-Cursor mit Farb-Ringen
  (leo=grau, lucy=grau, sam=grau, backend-agent=violett mit Glow,
  qa-agent=cyan) — jeder mit Name-Tag-Pill.
- Unter dem Video: Control-Floor-Leiste: "Maus: leo" mit Reihe von
  "übernehmen"-Buttons (Request-Queue mit Warteschlangen-Zähler),
  daneben Teilnehmer-Liste mit Rollen (Zuschauer/Controller).
- Rechts35% Chat-Rail: Kopf = Session-Link-Card (favicon, URL, "Geöffnet
  von leo · vor12 Min"), darunter Chat-Verlauf (Nachrichten von Humans
  UND Agents, Agents mit role-badge), Composer mit @-Mentions der
  anwesenden Agents. Typing-Indikator wie Slack.
- Alles ohne Überlappung, responsive (unter lg: Chat als Sheet.
```

## Prompt3 — AgentSessionBrowserPanel (Live einklinken)

```
Agent-Session-Detail (bestehende Seite) bekommt neuen Tab "BROWSER":
- Kompakte Session-Card: Agent-Avatar + "browser-access: camoufox",
  Status-Pulsing, Live-Zähler der Aktionen ("37 Actions · zuletzt: GET
  /pricing ·vor2s").
- Darunter Live-Stream des Agenten-Browsers mit überlagertem
  Aktivitäts-Stream rechts (JSONL-Tail mit Verbosity-Farben).
- Button "EINKLINKEN" (primary): Human übernimmt die Session (Maus-
  Übergabe an den Agenten pausiert, Badge wechselt zu "leo controlling").
- Button "MITAGEN": Chat-Rail öffnet mit vorausgefülltem Kontext
  (Session-Link + letzte3 Aktionen).
```

## Prompt4 — VerbosityPicker + Recording-Banner

```
Kleines Modal (Stitch): "AUFZEICHNUNG" mit L0–L4 als Radio-Liste:
L0 "Nur Metadaten" / L1 "+ Warnungen & Fehler" / L2 "+ Auth & Logins"
L3 "+ State-Changes (POST/PUT/DELETE)" / L4 "+ Screenshots je Ereignis",
jedes mit Beispiel-Zeile (Mono,9px). Oben Toggle "Aufzeichnung aktiv"
(Pulsing-REC-Punkt). Fußzeile: "Speicher-TTL = Session-Lifetime (S183)".
Recording-Banner-Strip (im Browser-Panel): REC ·L3 ·214 Actions ·
14 Screens · "Stoppen".
```

## Prompt5 — ReplayPlayer (Fake-Replay)

```
Vollbreite-Komponente "SESSION REPLAY":
- Leinwand links (Screenshot-Keyframe des aktuellen Abschnitts,
  benannter Cursor-Overlay der die Aktion reenactet, URL-Leiste live
  mitscrollend).
- Timeline darunter: Action-Marken farbcodiert (Warnungen rot, Auth
  violett, Mutations orange, Screenshots als Mini-Thumbnails an den
  Marken), scrubbar, Play/Pause, Speed0.5×/1×/2×, Sprung-Buttons je
  Verbosity-Klasse ("nur Warnungen zeigen" etc.).
- Rechte Spalte: Legende + Aktionstabelle (ts, Actor, Verb, URL) die
  mit der Timeline synchron ist, Klick = Sprung.
- Hinweis-Strip: "Replay aus Action-Script — kein Framework in der
  Zielsite nötig (R47)".
```

## Prompt6 — Camoufox-Runtime-Card

```
BrowserRuntimeModal bekommt dritte Card "CAMOUFOX — ANTI-DETCT" zwischen
Chrome und Desktop:
- Icon: Material "masks" oder "fingerprint". Badge: "NOLOGIN".
- Copy: Anti-Detect-Firefox, Fingerprint-Profil pro Scope, kein Login-
  Flow, Einsatz: Marketing/Multi-Account, Debugging, Agent-Tasks.
- Footer-Hinweis: "TLS-Fingerprint gesetzt; Datacenter-IPs bleiben
  erkennbar (R47)" — Ehrlichkeit statt Versprechen.
```

---

## Prompt7 — Implementierung S192 (Agent-Prompt)

```
Baue Camoufox als dritte Runtime in jimesh2 (SPRINT-192):
- BrowserRuntimeModal.tsx: dritte Card (Muster der bestehenden zwei),
  Auswahl fließt in acquirePluginRendererSession().
- Backend internal/deploy: Runtime "camoufox" → neko-firefox-Base-Image
  mit camoufox-Binary + Profil-Volume (pro Scope), gleiche
  Adopt-don't-spawn-Semantik wie chromium.
- Kein Login-Flow für den Browser selbst (Scope-RBAC regelt Sichtbarkeit).
- Tests: bestehende Runtime-Tests erweitern; npm test + check:i18n grün.
Akzeptanz: Session mit runtime=camoufox startet, WebRTC-Stream läuft,
zweiter Viewer adoptiert.
```

## Prompt8 — Implementierung S193 (Agent-Prompt)

```
Baue Shared-Browser-Collab (SPRINT-193):
- Sidebar: neue Section BROWSER in workspaceItems (section-nav.ts) +
  Route /workspaces/browser in route-registry.ts + View
  BrowserSessionsPage (Session-Karten nach Prompt1).
- Presence-WS /api/browser/sessions/{id}/presence (10Hz, Cursor x/y +
  Actor), Frontend-Overlay-Cursors im Stream (Prompt2).
- Control-Handover: neko AdminGrant-Flow + Request-Queue-UI.
- Chat-Rail: pro Session ein S153-Raum; Session-Link-Card in Messages.
- Tests: HierarchySidebar*.test, ResponsiveShell, navbar — grün (gepinnte
  KlassenStrings NICHT ändern, additive data-attrs nutzen).
Akzeptanz:2 Humans +1 Agent sehen denselben Browser live, Maus-Übergabe
funktioniert, Chat-Rail zeigt Session-Link.
```

## Prompt9 — Implementierung S194 (Agent-Prompt)

```
Baue Browser-Session-Recording + Fake-Replay (SPRINT-194):
- CDP-Hooks (R47§4) klassifizieren Actions in L0–L4; JSONL nach
  browser_session_actions (Schema Masterplan§5); Screenshots bei ≥L4 in
  MinIO/Ozone mit TTL = Session-Lifetime.
- UI: VerbosityPicker (Prompt4), ReplayPlayer (Prompt5), Anbindung an
  AgentSessionDetailPage-Tab + BrowserSessionsPage.
- Grenze: OpenReplay bleibt Console-UI-Replay; unser Player rendert
  Action-Script + Keyframes (kein Framework in Zielsite).
Akzeptanz: Session mit L3 geloggt, Replay spielt Cursor+Klicks ab,
Screenshots als Keyframes, Marker farbcodiert.
```
