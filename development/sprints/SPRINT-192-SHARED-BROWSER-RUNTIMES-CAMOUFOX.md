# SPRINT-192 — Shared-Browser-RUNTIMES: Camoufox + nologin

Masterplan: `../SHARED-BROWSER-MASTERPLAN.md` · Research: `../dev/research/R47-shared-browser-collaboration-replay.md`

**Anlass (verbatim):**
> „also die idee ist quasi dass man sowas wie nologin mit camoufox direkt
> dazu anbietet aber nicht nur für marketing sondern einfach für alles was
> man so braucht inklusive frontend debugging und vibe coding aber auch
> einfach nur agent tasks was auch immer das ist"

| Nr | Task | Status |
|---|---|---|
| S192-1 | Runtime-Enum "camoufox" im Frontend: `BrowserRuntimeModal.tsx` dritte Card (Muster Chrome/Desktop, Prompt6), Auswahl fließt in `acquirePluginRendererSession` / `renderer-sessions.ts` | [ ] geplant |
| S192-2 | Backend `internal/deploy/plugin_renderer.go`: camoufox-Profil (neko-firefox-Base + camoufox-Binary + Fingerprint-Profil-Volume pro Scope), gleiche Adopt-don't-spawn-Semantik | [ ] geplant |
| S192-3 | nologin-Flow: KEIN Auth-Flow am Browser selbst; Sichtbarkeit/Sessions via Workspace-Scope + RBAC (Sidebar-Visibility in S193) | [ ] geplant |
| S192-4 | Presets: "Marketing/Stealth" (camoufox, L4-Aufzeichnung) vs "Debug/Agent" (chrome, L3) vorbelegt | [ ] geplant |
| S192-5 | Ehrlichkeits-Copy im Modal (R47§2: TLS-Fingerprint gesetzt, DC-IPs erkennbar) | [ ] geplant |
| S192-6 | Docs: MASTER-PLAN P2-10 + SPRINT-2-APP-DEPLOYMENT-TRUTH.md Browser-Integration-Checkbox nachziehen | [ ] geplant |

## Akzeptanzkriterien
1. Session `runtime=camoufox` startet, WebRTC-Stream läuft (S159-Pfad).
2. Zweiter Viewer adoptiert (kein zweiter Container).
3. Profil-Volume ist scope-gebunden und überlebt Session-Restarts.
4. `npm test` + `npm run check:i18n` in `src/frontend` grün.

## Nicht in diesem Sprint
Multi-User-Collab, Presence, Chat-Rail, Recording (S193/S194).
