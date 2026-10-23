# SHARED-BROWSER — MASTERPLAN (bindend)

**Doku-Regel (Operator):** „vorallem alles dokumentieren die geplante infra
in den docs und die prompts und research dazu und dann dazu die konkreten
sprints" — dieses Dok ist die verbindliche Infrastruktur-Planung.

**Anlass (verbatim,23.10.):**
> „hast du die chat animations von der anderen session gesehen wie ich mit
> humans und agent teams zusammen arbeiten will? ich will eigentlich direkt
> in der idebar bei workspaces so wie email auch eine browser section und bei
> der browser section will ich eigentlich nur das machen was schon geplant
> war das man quasi mit seinem team zusammen einen browser zusammen steuern
> kann und am besten auch direkt die aus sieht aber auch den chat aufmachen
> kann und da die browser session die man zusammen betrieben will verlinken
> kann quasi wie google meet und den google chat aber halt ne browser
> session die man zusammen hat."

> „also die idee ist quasi dass man sowas wie nologin mit camoufox direkt
> dazu anbietet aber nicht nur für marketing sondern einfach für alles was
> man so braucht inklusive frontend debugging und vibe coding aber auch
> einfach nur agent tasks was auch immer das ist und man kann zusammen mit
> dem team und agents einen browser in realtime sehen übers internet"

> „ich hab ja eh schon geplant dass man sehen kann was der agent macht und
> auch ne agent session die browser access hat live sehen kann und sich dann
> da einklinken kann und da ist auch wieder der chat hilfreich wenn man zb
> direkt was mit den agents debuggen will."

> „ich weiß man kann browser replay oder session replay nicht für jede
> xbeliebige website machen weil man das framework auch installieren muss
> und die traces auch irgendwo hin senden muss aber man kann zumindest
> aufzeichnen was der agent in der session im browser gemacht hat und ein
> fake replay machen und einfach nur das script abspielen bzw einfach
> irgendwelche fotos speichern je nach verbosity level für warnings,
> auth/login, post/put/delete usw."

---

##1 — Vision: EIN Browser-Runtime für alles

Ein geteilter, realtime-sichtbarer Browser pro Scope (Workspace/Projekt),
bedienbar von Humans UND Agents gleichzeitig, überall einsetzbar:

| Einsatz | Warum Camoufox/KasmWeb statt normalem Chrome |
|---|---|
| Marketing (Multi-Account, Scraping, Ads-Checks) | Anti-Detect-Fingerprints, keine Login-Walls („nologin") |
| Frontend-Debugging (Vibe Coding) | Live-Ansicht für Mensch+Agent gleichzeitig, Console/Network im selben Frame |
| Agent-Tasks (was auch immer) | Agent steuert browser, Human sieht live + kann einklinken |
| Shared Debugging-Sessions | Team + Agents steuern EINEN Browser, Chat-Rail daneben |

##2 — Bestandsaufnahme (existiert, Stand 23.10.)

| Baustein | Status | Fundstelle |
|---|---|---|
| Chromium-Renderer (m1k1o/neko, WebRTC + binärer DataChannel, `--app=<url>`) | gebaut, single-user | jimesh2 `src/frontend/src/components/plugins/ChromiumPluginRenderer.tsx`, Backend `internal/deploy/plugin_renderer.go`, SPRINT-159 |
| Adopt-don't-spawn Session-Logik | gebaut | `src/frontend/src/lib/plugin-renderer.ts`, `lib/renderer-sessions.ts` (zweiter Viewer adoptet laufende Session) |
| Transport-Wahl proxy vs. WebRTC | gebaut (Operator: „proxy immer default") | `src/frontend/src/lib/dash-transport.ts`, `components/renderer/TransportSettingsModal.tsx` |
| Runtime-Picker (KasmWeb Chrome vs. Full Desktop) | gebaut (2 Optionen) | `components/workspaces/BrowserRuntimeModal.tsx`, Stitch-Mock `jimesh-browser-integration-selection.html` |
| MeshSquad-Chat (Räume pro Crew, WS-Rejoin) | jimesh-UI gebaut, agent-seitig offen | SPRINT-153, `components/chat/*`, `lib/chat/socket.ts` |
| Session=Trace-Pipeline + OpenReplay | Phase1 gebaut | SPRINT-174, `/sessions`, `AgentSessionDetailPage`, `OpenReplayTracker.tsx` |
| Paranoia-Level-Modell (Alarm-Verbosity PL1–PL4) | Plan, kein Code | SPRINT-177, `research/PARANOIA-LEVEL-MODEL.md` |
| n.eko Multi-User-Research („several people can watch while one takes mouse control, hand over dynamically") | Research | `dev/research/R28_VNC_ALTERNATIVE.md` |
| Camoufox-Research (Anti-Detect-Firefox) | Research | `dev/research/browsers_and_agents.md`, jimesh2 `knowledge/general/agent-systems-and-browser-automation/` |
| Webview-Panels an Browser-Session-Lifetime gebunden | gebaut | SPRINT-183, `components/builder/WebviewPanelCard.tsx` |

##3 — Lücken (zu bauen)

1. **Camoufox als dritte Runtime** — Runtime-Enum, Container-Profil, Modal-Card, nologin-Flow.
2. **Multi-User-Collab** — neko-Multi-User aktiviert: Viewer-Liste, Cursor-Presence, Control-Handover (Floor).
3. **Browser-Section in der Sidebar (Workspaces)** — so wie Email (`/utility/email`): `/workspaces/browser` mit Session-Karten, Live-Teilnehmern, „Einklinken".
4. **Chat-Rail verknüpft mit Browser-Session** — Session = Chat-Raum (S153-Anbindung), Message-Cards linken die Session („wie Google Meet + Chat").
5. **Agent-Browser-Actions aufzeichnen + Fake-Replay** — Verbosity-Level L0–L4, Action-Script (JSONL), Screenshot-Keyframes, Replay-Player ohne Zielsite-Framework.

##4 — Zielarchitektur (5 Layer)

```
┌─5 Collab-Layer ─────────────────────────────────────┐
│ neko-Multi-User (viewer|controller), Cursor-Presence │
│ (WS,10Hz), Control-Handover (request/grant),         │
│ Chat-Rail (S153-Raum pro Session, Meeting-Link-Card) │
├─4 Agent-Layer────────────────────────────────────────┤
│ Agent-Browser-Session = gleicher Runtime-Pfad;       │
│ Agent steuert via CDP/Action-Script; Humans sehen    │
│ live + einklinken; Debug-Chat im selben Rail         │
├─3 Recording-Layer (S194) ───────────────────────────┤
│ Verbosity-Profil L0–L4; Action-Log (JSONL);          │
│ Screenshot-Keyframes; Fake-Replay-Player             │
│ (Script-Abspielung, kein Framework in Zielsite)      │
├─2 Session-Layer──────────────────────────────────────┤
│ adopt-don't-spawn;15min idle decay; Scope=Projekt;   │
│ Lifetime-Bindung für Webview-Panels (S183)           │
├─1 Runtime-Layer (S192) ─────────────────────────────┤
│ kasmweb-chrome | full-desktop | camoufox (NEU)       │
│ gVisor/runsc, WireGuard-Mesh10.240.0.0/24            │
└──────────────────────────────────────────────────────┘
```

Entscheidungen:
- **Camoufox läuft als neko-Base-Variante** (Firefox-Fork → neko firefox-image als Träger, camoufox-Binary + Fingerprint-Profil-Mount). Kein zweites Streaming-Stack.
- **Presence ist ein eigener WS-Channel**, nicht der neko-Signaling-Pfad (Cursor sind10Hz-Throttle-Nachrichten, kein Video-Overlay).
- **Recording greift am CDP des Agenten-Browsers** (Page/Network/Console + `Page.captureScreenshot`), nicht an der Zielsite → funktioniert für JEDWEDE Seite ohne deren Mitwirkung.
- **OpenReplay-Grenze:** OpenReplay bleibt UI-Replay der CONSOLE (eigene Seiten mit Tracker). Browser-Session-Replay ist der S194-Player (andere Domains, keine Framework-Injection).

##5 — Datenmodell (Vorschlag)

```
browser_sessions(id, scope_kind, scope_id, runtime, start_url, state,
                 created_by, idle_ttl_min, verbosity_profile, created_at)
browser_session_members(session_id, principal(human|agent), principal_id,
                        role(viewer|controller), joined_at, left_at)
browser_session_actions(id, session_id, ts, actor_kind, actor_id, verb,
                        url, selector, meta jsonb, verbosity int,
                        screenshot_id)
browser_session_screenshots(id, session_id, action_id, ts, object_path,
                            width, height)
```

Speicher: Screenshots in MinIO/Ozone, TTL an Session-Lifecycle gebunden
(Operator-Muster S183: „wenn die stirbt löschen wirs halt aus dem cache").

##6 — Verbosity-Modell (aufbauend S177)

| Level | Was geloggt wird | Trigger-Klassen |
|---|---|---|
| L0 | nur Metadaten (Session, URLs, Dauer) | always |
| L1 | + Warnungen/Fehler | `console.error/warn`, HTTP ≥500, pageerror |
| L2 | + Auth/Login-Schritte | Login/OTP/Passwort-Felder, `/login`,`/auth`, Cookie-Setzen, Header `authorization` |
| L3 | + State-Changes | POST/PUT/PATCH/DELETE, Form-Submits, `localStorage`-Writes auf Session-Keys |
| L4 | + Screenshots je Ereignis über L1 | `Page.captureScreenshot` bei jeder Klassifizierung ≥ aktives Level |

Default: Agent-Sessions L3 (Debug-tauglich), Human-Sessions L1, Marketing
(Live-Scraping) L4. Profil pro Session wählbar (UI-Picker, S194).

##7 — Sprints

| Sprint | Titel | Status |
|---|---|---|
| S192 | Shared-Browser-RUNTIMES: Camoufox + nologin | [ ] geplant |
| S193 | Shared-Browser-COLLAB: Multi-User, Sidebar-Section, Chat-Rail | [ ] geplant |
| S194 | Browser-SESSION-RECORDING: Verbosity + Fake-Replay | [ ] geplant |

Details: `sprints/SPRINT-192-SHARED-BROWSER-RUNTIMES-CAMOUFOX.md`,
`sprints/SPRINT-193-SHARED-BROWSER-COLLAB-CHAT.md`,
`sprints/SPRINT-194-BROWSER-SESSION-RECORDING-REPLAY.md`.
Design-Prompts: `PROMPT-SHARED-BROWSER-DESIGN.md`.
Research: `dev/research/R47-shared-browser-collaboration-replay.md`.
