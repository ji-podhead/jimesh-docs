# SPRINT-194 — Browser-SESSION-RECORDING: Verbosity-Levels + Fake-Replay

Masterplan: `../SHARED-BROWSER-MASTERPLAN.md` · Research: `../dev/research/R47-shared-browser-collaboration-replay.md` · Design: `../PROMPT-SHARED-BROWSER-DESIGN.md` (Prompt4/5/9)

**Anlass (verbatim):**
> „ich weiß man kann browser replay oder session replay nicht für jede
> xbeliebige website machen weil man das framework auch installieren muss
> und die traces auch irgendwo hin senden muss aber man kann zumindest
> aufzeichnen was der agent in der session im browser gemacht hat und ein
> fake replay machen und einfach nur das script abspielen bzw einfach
> irgendwelche fotos speichern je nach verbosity level für warnings,
> auth/login, post/put/delete usw."

| Nr | Task | Status |
|---|---|---|
| S194-1 | CDP-Klassifizierer (R47§4): consoleAPICalled → L1, Network ≥500 → L1, auth-riechend → L2, POST/PUT/PATCH/DELETE + Form-Submit → L3, frameNavigated → L0. JSONL → `browser_session_actions` (Schema Masterplan§5) | [ ] geplant |
| S194-2 | Screenshot-Service: `Page.captureScreenshot` (jpeg q80, max1600px) nur bei Klassifizierung ≥ aktivem Level (L4); Ablage MinIO/Ozone, TTL = Session-Lifetime (S183-Muster „wenn die stirbt löschen wirs aus dem cache") | [ ] geplant |
| S194-3 | VerbosityProfile pro Session (default: Agent L3, Human L1, Marketing-Preset L4) + UI-Picker (Prompt4) + Recording-Banner (REC · Level · Action-/Screenshot-Zähler) | [ ] geplant |
| S194-4 | ReplayPlayer (Prompt5): Keyframe-Leinwand + reenactete Cursor + URL-Leiste; farbcodeierte Marker (Warn rot / Auth violett / Mutation orange); Play/Pause,0.5–2×, Scrub, Sprung-Buttons je Klasse; Aktionstabelle synchron | [ ] geplant |
| S194-5 | Anbindung: BrowserSessionsPage („Replays" je Session) + AgentSessionDetailPage-Tab; JSONL-Export | [ ] geplant |
| S194-6 | Grenze dokumentiert: OpenReplay = Console-UI-Replay (S174); External-Sites = unser Action-Script-Replay; rrweb ausgeschlossen (R47§3) | [ ] geplant |

## Akzeptanzkriterien
1. Agent-Session mit L3 geloggt: alle POST/PUT/DELETE im JSONL, KEINE Screenshots (L4 aus).
2. Replay spielt Cursorpfad + Klicks + Typings ab; Marker farbcodiert; Scrub springt.
3. Mit L4: Screenshots als Keyframes an Marken, Storage-TTL greift nach Session-Ende.
4. Replay funktioniert für beliebige externe URLs (kein Framework in Zielsite).
5. `npm test` + `check:i18n` grün.
