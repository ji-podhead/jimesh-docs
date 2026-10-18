# SPRINT-153 — Meshsquad-Chat/Chatrooms (Phase 6 aus SPRINT-149)

**Status:** 🚧 Teilweise gebaut. jimesh-seitig (Phase 6a, vom Vorgänger-Agent committet in `ea45aa2`,
plus Phase 6a-2 — Chat-Space-Page + Gate-Öffnen — von DIESEM Agent gebaut, 28.9. spät, Arbeitsbaum-Diff,
kein Commit). Design in `docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md`, Abschnitt 10.
Backend-Grundlage (message_bus.py, tinode, topic_map) lebt in **meshsquad-public**, nicht jimesh.

## Auftrag, verbatim (Operator, 28.9.)

> "können wir auch in der sidebar den chat einfügen und halt ausgrauen wenn die integration nicht
> installiert ist [...] jede squadmesh crew kriegt ihre chat rooms also quasi ihr eigenes slack mit
> subchannels und humans können das auch für sich zum chatten erstellen [...] die presets können
> dann gleich die channels mit anlegen für die agents, oder man muss die halt im agent builder
> selber anlegen und welche agents in die subchannels da halt reindürfen"

> "echte Threads/Sub-Channels (nicht nur 1 flacher Raum pro Crew), plus ein wählbarer Haupt-Channel
> (Team-spezifisch ODER firmenweiter Haupt-Tutario-Chat mit Agents als Berater, nicht an eine
> Crew gebunden)"

## Plan (vor dem Code festgelegt, Mandat 1.4)

**Ziel:** Der Operator kann über die jimesh-Sidebar in die Chat-Raum-Verwaltung seiner MeshSquad-Crews:
Sub-Channels je Crew sehen, anlegen, wechseln — plus einen Firmenweiten Haupt-Chat ("Main-Tutario-Chat",
Agents als Berater, an keine Crew gebunden) als eigenen Modus. Das Gate im Deploy-Dialog öffnet denselben
Chat, sobald die Integration installiert ist.

**Arbeitspakete (jimesh, dieser Sprint):**

| WP | Inhalt | Akzeptanz |
|---|---|---|
| 6a-1 | Sidebar-Entry + Gate (bereits `ea45aa2`) | Ausgrauen via `useMeshSquadChatStatus()`, Install-Wizard inline |
| 6a-2 | `MeshSquadChatSpacePage` (`/chat/space`): Spaces = Crews + `org:main`; Sub-Channel-Liste; Channel anlegen (POST an die Crew-API); Mode-Switch Team ⇄ Firmenweit; Open-Chat-Deep-Link | 404/405 → ehrlicher nicht-deployed-State; keine Zeile ohne echte API-Antwort |
| 6a-3 | Gate-Section öffnet den Chat ("Open chat" → `/chat/space`), Entry navigiert statt `window.open` | Navigationstest |
| 6a-4 | i18n `meshsquadChat.*` (en + de handgeschrieben, 58 Locales EN-Fallback via `scripts/add-sprint153-meshsquad-chat-i18n.mjs`) | `npm run check:i18n` grün, 60 Locales |
| 6a-5 | Tests: Entry (4), Gate (3), Page (6) gegen die echten Wire-Shapes | vitest grün |
| 6a-6 | Docs: dieses Sprint-File + BACKLOG-Spiegel; API_DOCS.md unverändert (keine jimesh-HTTP-Route berührt) | — |

## Cross-Repo-Wire-Contract: Chat-Space-API (meshsquad server.py, S153-3-Anschlussstelle)

Die jimesh-Page ruft DIESE Endpunkte direkt unter der beim Install konfigurierten `crewApiUrl` auf
(`installation.config.crewApiUrl`, Fallback `wrapperApiBase` — nie ein erfundener Default-Host):

| Methode/Route | Body | Response |
|---|---|---|
| `GET {crewApiUrl}/chat/channels` | — | `{teams: [{team, channels: [{team, channel_name, is_main, tinode_topic, bus_channel, forward_kinds}]}]}` — jedes Space mit seinen Sub-Channels; `team === "org:main"` = der Firmenweite Haupt-Chat (mirror von `topic_map_store.ORG_WIDE_TEAM`) |
| `POST {crewApiUrl}/chat/channels` | `{team, channel_name, is_main?}` | `{channel: {…Mapping…}}` — Server provisioniert tinode-Topic + bus_channel (slug) |
| `GET {crewApiUrl}/teams` | — | (existiert real, server.py) Crew-Liste für den Picker; aktive Crew wird vor selektiert |

Mapping 1:1 auf meshsquad-publics Ist-Zustand (dort uncommitted in Arbeit, vorgefunden am 28.9. spät):
`topic_map.py` (`channel_name`, `is_main`, `_by_team`, `mappings_for_team`, `main_channel_for_team`),
`topic_map_store.py` (`add_channel(team, channel_name, tinode_topic, bus_channel, is_main)`,
`list_teams()`), `tinode_client.create_topic()`, `agents.py` `role.channels` + `Team.post_to_channel()`.
**CORS-Pflicht auf meshsquad-Seite:** die Endpunkte müssen für die jimesh-Dashboard-Origin freigegeben
sein (Browser-Ruf, kein Backend-Proxy — jimesh hat keinerlei meshsquad-Routen, gateway/plugins.go RM25).
**Ehrliche Lücke (Mandat 2):** meshsquad-publics server.py hat diese HTTP-Routen NOCH NICHT (Stand
Arbeitsbaum 28.9. spät) — die Page zeigt dann den ehrlichen "Chat-Space-API noch nicht deployed"-State
und erfinden KEINE Channels.

## Was gebaut wurde (jimesh-seitig, 28.9. spät — Arbeitsbaum-Diff, kein Commit)

1. **`src/frontend/src/lib/meshsquad-chat.ts`** (erweitert): `MeshSquadChannel`/`MeshSquadChatSpace`-Typen
   (TeamTopicMapping-Spiegel), `MESHSQUAD_ORG_WIDE_TEAM = 'org:main'`, `MeshSquadApiError` (mit
   `endpointMissing` für 404/405), `fetchMeshSquadChatChannels`, `createMeshSquadChatChannel`,
   `fetchMeshSquadTeams`, `useMeshSquadChatChannels`, `useMeshSquadTeams`. Direkter Browser-Fetch auf
   die crewApiUrl — bewusst NICHT apiFetch (separat deployter Stack, kein jimesh-Proxy).
2. **`src/frontend/src/views/MeshSquadChatSpacePage.tsx`** (NEU, Route `/chat/space`): Space-Picker
   (Modus-Switch Team-Channels ⇄ Firmenweiter Haupt-Chat), Crew-Select aus `GET /teams` (aktive Crew
   vor-selektiert), Sub-Channel-Liste mit Haupt-Badge (`is_main`), Channel-Anlegen (POST, Toast +
   Invalidate + Refetch), Detail-Panel mit bus_channel/tinode_topic/Space, "Open chat UI"-Deep-Link,
   ehrliche States: nicht installiert → Plugin-Katalog-Link; 404/405 → nicht-deployed-State; Fehler →
   Retry mit echter Meldung. KEIN zweiter Chat-Client — die Unterhaltungen leben im meshsquad-Chat-Stack
   (tinode für Menschen, Redis-Bus für Agents), jimesh verwaltet die Räume und verlinkt hinaus
   (SPRINT-149 §10.4).
3. **`src/frontend/src/App.tsx`**: Route `/chat/space` + Import (neben dem LLM-Playground `/chat`,
   der unangetastet bleibt).
4. **`src/frontend/src/lib/section-nav.ts`**: Eintrag `/chat/space` (labelKey `meshsquadChat.entryLabel`
   = derselbe Text, den der Sidebar-Entry rendert — Reachability-Guard-proof; Mandat 14: Route + Nav
   in derselben Änderung).
5. **`src/frontend/src/components/sidebar/MeshSquadChatEntry.tsx`**: installiert → navigiert jetzt zur
   IN-APP Chat-Space-Page (`/chat/space`) statt `window.open` (Deep-Link lebt weiter IN der Page);
   installierbar-nicht-installiert → Install-Wizard inline (klickbar, nicht disabled); sonst
   ausgegraut mit ehrlichem Tooltip.
6. **`src/frontend/src/components/workspaces/MeshSquadChatGateSection.tsx`**: "installed" rendert jetzt
   den "Open chat"-Button → Navigation zu `/chat/space` (vorher: nur ein grüner Satz, nichts klickbar).
   Install-/Not-installable- Zweige unverändert.
7. **i18n**: `meshsquadChat.*` — 45 Keys en+de handgeschrieben, 58 weitere Locales per
   `scripts/add-sprint153-meshsquad-chat-i18n.mjs` mit EN-Fallback (RM35-Präzedenz). **Behebt einen
   echten Bug des Vorgänger-Agents:** Entry + Gate referenzierten Keys, die in KEINER Locale
   existierten — die UI zeigte wörtlich `meshsquadChat.tooltipNotInstallable` als Text, und 2 der 3
   committeten Tests schlugen fehl (der dritte war flaky: react-query-Race).
8. **Tests**: `MeshSquadChatEntry.test.tsx` neu geschrieben (4: not-installable / installable→Wizard /
   installed→Navigation / kaputte Config), `MeshSquadChatGateSection.test.tsx` NEU (3: amber-Zustand /
   Install-Button→Wizard / Open-chat→Navigation), `MeshSquadChatSpacePage.test.tsx` NEU (6: Gate,
   Team-Mode mit aktiver Crew + Badges + Topic-IDs, Channel-Wechsel, Firmenweit-Mode mit
   `team: 'org:main'`-POST, Crew-Channel-POST, 404-nicht-deployed).

## Was bewusst NICHT gebaut wurde (ehrliche Abgrenzung)

- **meshsquad-public** (S153-3/4/5: HTTP-Chat-Space-Routen, ChatSpaceModal, Preset-Channels):
  OUT OF SCOPE dieses Agenten. Vorgefunden: dortiger Agent hat `topic_map.py` (channel_name/is_main),
  `topic_map_store.py` (add/remove_channel, list_teams, ORG_WIDE_TEAM), `tinode_client.create_topic()`
  und `agents.py role.channels` + `Team.post_to_channel()` UNCOMMITTED im Baum — dieser jimesh-Client
  ist kompatibel mit genau diesem Datenmodell, wartet aber auf deren server.py-Endpunkte.
- **"Make main"-Schalter pro Team**: kein Contract-Endpoint im Store (nur `add_channel(is_main)`),
  daher liest die Page `is_main` nur darstellend. Nachrüsten, sobald meshsquad einen Set-Main-Weg hat.
- **jimesh-Backend**: keine Route angefasst (gateway/plugins.go `meshsquad: {}` bleibt RM25-ehrlich
  leer → `installable` bleibt false → Entry/Gate bleiben ausgegraut, bis echte Integration existiert).

## Task-Tabelle

| Nr | Task | Status | Repo |
|---|---|---|---|
| S153-1 | Sidebar-Chat-Eintrag + Ausgrauen-Logik | [x] erledigt (`ea45aa2` + Navigation + i18n hier) | jimesh |
| S153-2 | Deploy-Zeit-Gate für Chat-Requirement | [x] erledigt (`ea45aa2` + "Open chat" hier) | jimesh |
| S153-2b | Chat-Space-Page: Sub-Channels je Crew, anlegen/wechseln, Firmenweiter Haupt-Chat (org:main) | [x] erledigt (dieser Agent) | jimesh |
| S153-2c | Wire-Contract dokumentiert + i18n 60 Locales + Tests | [x] erledigt (dieser Agent) | jimesh |
| S153-3 | Sub-Channel-Modell auf message_bus/topic_map | [~] in Arbeit (uncommitted vorgefunden; HTTP-Routen noch offen) | meshsquad-public |
| S153-3b | server.py-Chat-Space-Endpunkte (GET/POST /chat/channels, siehe Contract oben) + CORS | [ ] offen | meshsquad-public |
| S153-4 | `ChatSpaceModal` (Crew+Human gemeinsam) | [ ] geplant | meshsquad-public |
| S153-5 | Channel-Mitgliedschaft im Agent-Builder | [~] in Arbeit (`role.channels` uncommitted vorgefunden) | meshsquad-public |
| S153-6 | "Make main"-Schalter pro Team (Store hat keinen Set-Main-Weg) — Page zeigt `is_main` nur darstellend | [ ] offen (braucht meshsquad-Endpoint) | meshsquad-public |
| S153-7 | RM25: echte jimesh-Backend-Routen für meshsquad (`pluginBackendRoutes["meshsquad"]` ist leer → `installable=false` → Entry/Gate bleiben ausgegraut, Installation unmöglich — Backend-WP, NICHT Frontend) | [x] erledigt (SPRINT-163, 1.10., b3df2835) | jimesh |

## Verifikation (Mandat 6 — tatsächlich gelaufen, 28.9. spät)

- `npx tsc --noEmit -p tsconfig.app.json`: **472 Fehler** — Baseline 473, NICHT schlechter (−1;
  0 Fehler in irgendeiner berührten Datei: meshsquad-chat.ts, ChatSpacePage, Entry, Gate, Tests,
  App.tsx, section-nav.ts).
- `npm run check:i18n`: **passed for 60 locales and 3281 keys**.
- `npx vitest run`: **447/460 grün** — ALLE berührten Suiten grün (Entry 4/4, Gate 3/3, Page 6/6,
  section-nav.test.ts grün). Die 13 verbleibenden Fehler liegen ausschließlich in
  `HierarchySidebar.test.tsx` (12) + `__probe.test.tsx` (1) — Dateien eines PARALLELEN Agenten, der
  während dieser Session die Sidebar umstrukturiert (SPRINT-156/157-Welle; 0 MeshSquad-Referenzen
  dort, grep-verifiziert; der Reachability-Guard bricht bei `section header not found: Security`,
  also VOR jedem Label-Check — das "MeshSquad Chat"-Label wird vom Entry gerendert, sobald deren
  Sections stehen). Nicht von diesem Agenten fixbar (Scope-Verbot für fremde Dateien).
- Backend unverändert, trotzdem verifiziert: `docker run --rm -v …/src/backend:/app golang:latest
  go build ./internal/... ./cmd/...` → **exit 0**; `go vet` → **exit 0**.
- Kein Commit (Standing Mandate 4) — Arbeitsbaum-Diff; der Parent committet.

### Geplanter Smoke-Test für den Operator (sobald beide Seiten deployed sind)

1. `POST /api/plugin-installations` → Installation mit `config: {"crewApiUrl": "http://127.0.0.1:8113"}`
   (Voraussetzung: RM25-Routen, sonst bleibt installable ehrlich false).
2. meshsquad-seitig `GET /chat/channels` muss die topic_map-Teams liefern; dann Sidebar →
   "MeshSquad Chat" → `/chat/space`: Crews + `org:main` sichtbar, Channel anlegen → tinode-Topic
   erscheint im tinode-Web-UI (http://127.0.0.1:6060).

