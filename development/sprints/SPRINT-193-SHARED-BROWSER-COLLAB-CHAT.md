# SPRINT-193 — Shared-Browser-COLLAB: Multi-User, Sidebar-Section, Chat-Rail

Masterplan: `../SHARED-BROWSER-MASTERPLAN.md` · Research: `../dev/research/R47-shared-browser-collaboration-replay.md` · Design: `../PROMPT-SHARED-BROWSER-DESIGN.md` (Prompt1/2/3/8)

**Anlass (verbatim):**
> „ich will eigentlich direkt in der idebar bei workspaces so wie email
> auch eine browser section und bei der browser section will ich eigentlich
> nur das machen was schon geplant war das man quasi mit seinem team
> zusammen einen browser zusammen steuern kann und am besten auch direkt
> die aus sieht aber auch den chat aufmachen kann und da die browser
> session die man zusammen betrieben will verlinken kann quasi wie google
> meet und den google chat aber halt ne browser session die man zusammen hat."

> „ich hab ja eh schon geplant dass man sehen kann was der agent macht und
> auch ne agent session die browser access hat live sehen kann und sich
> dann da einklinken kann und da ist auch wieder der chat hilfreich wenn
> man zb direkt was mit den agents debuggen will."

| Nr | Task | Status |
|---|---|---|
| S193-1 | Sidebar-Section BROWSER in `lib/section-nav.ts` (workspaceItems, Muster EMAIL) + Route `/workspaces/browser` in console `route-registry.ts` + View `BrowserSessionsPage` (Session-Karten nach Prompt1: LIVE-Punkt, Avatar-Stack Humans+Agents, Runtime-Badge, Zuschauer-Zahl, "Einklinken") | [ ] geplant |
| S193-2 | Presence-WS `/api/browser/sessions/{id}/presence`: Cursor x/y + Actor (human|agent),10Hz-Throttle; Frontend-Cursor-Overlays im Stream (Prompt2: farbige Ringe, Name-Pills, Agents violet/cyan) | [ ] geplant |
| S193-3 | Multi-User aktivieren: neko-Viewer-Default für Team-Mitglieder; Control-Handover (AdminGrant-Flow + Request-Queue-UI "Maus: leo — übernehmen") | [ ] geplant |
| S193-4 | Chat-Rail: pro Browser-Session ein S153-Raum; Chat-Rail-Panel rechts am Stream (Prompt2) mit Session-Link-Card (favicon, URL, "geöffnet von"), @-Mentions der anwesenden Agents, Typing-Indikator | [ ] geplant |
| S193-5 | AgentSessionDetailPage: Tab "BROWSER" (Prompt3) mit Live-Stream + Aktivitäts-Stream + "EINKLINKEN" (Human übernimmt, Agent pausiert) + "MITAGEN" (Chat-Rail mit Kontext) | [ ] geplant |
| S193-6 | Responsive: unter lg wird Chat-Rail zum Sheet; Cursor-Overlays skalieren mit Stream-Video | [ ] geplant |

## Akzeptanzkriterien
1.2 Humans +1 Agent sehen EINEN Browser live über das Internet (Tailscale/Proxy-Transport).
2. Maus-Übergabe mit Request-Queue funktioniert; Viewer-Liste live.
3. Session erscheint in der Sidebar-Section; "Einklinken" adoptiert.
4. Chat-Rail zeigt Session-Link-Card; Agent-Antworten im selben Rail.
5. `HierarchySidebar*.test`, `ResponsiveShell.test`, `navbar/*` grün (gepinnte KlassenStrings unverändert, additive data-attrs).
