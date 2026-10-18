# BUILD — SPRINT-153 Meshsquad-Chat: Chat-Space-Page + Gate-Öffnen (jimesh-seitig komplett)

**Datum:** 28./29.9.2026, späte Nacht (~00:30). **Agent:** SPRINT-153 Meshsquad-Chat COMPLETION
(**Nachfolge** des Rate-Limit-gefallenen Agenten, dessen Teilmenge — Sidebar-Entry + Gate-Section +
meshsquad-chat-Lib — als `ea45aa2` gesichert wurde).
**Commit-Kontext:** NICHT committet (Standing Mandate 4) — alles liegt als Working-Tree-Diff in
`/home/ji/projects/jimesh`, der Parent committet.

## Operator-Demand (verbatim)

> "jede squadmesh crew kriegt ihre chat rooms also quasi ihr eigenes slack mit subchannels" +
> "echte Threads/Sub-Channels (nicht nur 1 flacher Raum pro Crew), plus ein wählbarer Haupt-Channel
> (Team-spezifisch ODER firmenweiter Haupt-Tutario-Chat mit Agents als Berater, nicht an eine
> Crew gebunden)"

Der Vorgänger-Agent hatte NUR Sidebar-Entry + Gate + Lib gebaut (committet in `ea45aa2`).
**Diese Session liefert die fehlende Hälfte: die Chat-Raum-Fläche selbst, das Öffnen des Chats aus
dem Gate, i18n (inkl. Behebung eines echten Raw-Key-Bugs) und Tests.**

## Gebaut

1. **`MeshSquadChatSpacePage` (NEU, `/chat/space`)** — `src/frontend/src/views/MeshSquadChatSpacePage.tsx`:
   - **Sub-Channels je Crew** (Operator-Slack-Wunsch): listet die Channels des gewählten Crews aus
     `GET {crewApiUrl}/chat/channels` (Team-Gruppierung, `is_main`-Badge, bus_channel +
     tinode_topic in Mono).
   - **Channel anlegen**: POST `{team, channel_name}` an die Crew-API (Server provisioniert Topic +
     Bus-Channel), Toast + Invalidate + Refetch.
   - **Channel wechseln**: Klick in der Liste → Detail-Panel des Channels.
   - **Haupt-Channel-Modus** (firmenweiter Tutario-Chat): Mode-Switch Team ⇄ "Company-wide main
     chat" — Space `org:main` (exakter Spiegel von meshsquad-publics `topic_map_store.ORG_WIDE_TEAM`),
     an KEINE Crew gebunden, Agents aus allen Crews als Berater einladbar. Anlegen dort POSTet
     `team: 'org:main'`.
   - **Crew-Picker** aus dem REAL existierenden `GET {crewApiUrl}/teams` (server.py, Route existiert
     schon) — aktive Crew vor-selektiert, niemals erfunden.
   - **Open chat UI**: Deep-Link auf die konfigurierte `crewApiUrl` — die Unterhaltungen leben im
     meshsquad-Chat-Stack (tinode/Bus), jimesh baut bewusst KEINEN zweiten Chat-Client (SPRINT-149
     §10.4: ein Deep-Link statt Duplikat, wie /dashboards bei Grafana).
   - **Ehrliche States (Mandat 2):** nicht installiert → Gate + Link zum Plugin-Katalog; 404/405 der
     Chat-Space-API → "Chat-space API not deployed yet" mit der konkreten Base + Retry; Fehler →
     echte Meldung; leeres Space → "No channels yet" mit Anlege-Hinweis.
2. **Cross-Repo-Wire-Contract dokumentiert** (Sprint-File): `GET/POST {crewApiUrl}/chat/channels` +
   `GET /teams`, Shapes 1:1 auf das vorgefundene meshsquad-Modell (topic_map.py `channel_name`/`is_main`,
   topic_map_store.py `add_channel`/`list_teams`, tinode_client.create_topic, agents.py `role.channels`).
   meshsquad-public ist OUT OF SCOPE dieses Agenten — deren server.py-Endpunkte (S153-3b) fehlen noch;
   bis dahin zeigt die Page den ehrlichen nicht-deployed-State statt Fake-Daten. CORS-Pflicht für die
   jimesh-Origin ist im Sprint-File vermerkt (Browser-Ruf; jimesh hat KEINEN meshsquad-Proxy,
   gateway/plugins.go RM25).
3. **Gate öffnet jetzt wirklich den Chat:** `MeshSquadChatGateSection.tsx` rendert bei "installed"
   den "Open chat"-Button → Navigation zu `/chat/space` (vorher: nur ein grüner Satz, nichts klickbar).
4. **Sidebar-Entry navigiert zur Page:** `MeshSquadChatEntry.tsx` — installiert → `/chat/space` (statt
   `window.open`; der Deep-Link lebt weiter IN der Page), installierbar → Install-Wizard inline
   (klickbar), sonst ausgegraut mit ehrlichem Tooltip.
5. **Route + Nav (Mandat 14):** `App.tsx` Route `/chat/space` (+Import, mit Abgrenzungs-Kommentar zum
   LLM-Playground `/chat`, der unangetastet bleibt); `section-nav.ts` Eintrag mit labelKey
   `meshsquadChat.entryLabel` — derselbe Text, den der Sidebar-Entry rendert → Top-Navbar-Registrierung
   + Sidebar-Erreichbarkeit in derselben Änderung.
6. **i18n — inkl. Bugfix:** `meshsquadChat.*` 45 Keys in en + de handgeschrieben, 58 weitere Locales
   per `scripts/add-sprint153-meshsquad-chat-i18n.mjs` (EN-Fallback, RM35-Präzedenz). **Bugfix:**
   Entry + Gate referenzierten Keys, die in KEINER Locale existierten — die UI zeigte wörtlich
   `meshsquadChat.tooltipNotInstallable`; 2 der 3 committeten Tests waren deswegen rot, der 3. flaky
   (react-query-Race). Alles behoben.
7. **Lib erweitert:** `meshsquad-chat.ts` — `MeshSquadChannel`/`MeshSquadChatSpace`-Typen,
   `MESHSQUAD_ORG_WIDE_TEAM`, `MeshSquadApiError` (endpointMissing 404/405),
   `fetchMeshSquadChatChannels` / `createMeshSquadChatChannel` / `fetchMeshSquadTeams` + zwei
   react-query-Hooks. Direkter Fetch auf die crewApiUrl (bewusst NICHT apiFetch — separat
   deployter Stack).
8. **Tests (18 neu/umgeschrieben, alle grün):** Entry 4 (not-installable / installable→Wizard /
   installed→`/chat/space`-Navigation / kaputte Config), Gate 3 (amber / Install→Wizard /
   Open-chat→Navigation), Page 6 (Gate ohne Crew-Call / Team-Mode mit aktiver Crew + Badges +
   Topic-IDs / Channel-Wechsel / Firmenweit-Mode mit org:main-POST / Crew-Channel-POST /
   404-nicht-deployed).

## Von diesem Agenten geänderte Dateien (alle UNCOMMITTED im Working Tree)

| Datei | Art |
|---|---|
| `src/frontend/src/lib/meshsquad-chat.ts` | erweitert: Chat-Space-Client + Typen + ORG_WIDE_TEAM |
| `src/frontend/src/views/MeshSquadChatSpacePage.tsx` | NEU |
| `src/frontend/src/views/MeshSquadChatSpacePage.test.tsx` | NEU |
| `src/frontend/src/components/sidebar/MeshSquadChatEntry.tsx` | Navigation statt window.open |
| `src/frontend/src/components/sidebar/MeshSquadChatEntry.test.tsx` | neu geschrieben (4 Tests) |
| `src/frontend/src/components/workspaces/MeshSquadChatGateSection.tsx` | "Open chat"-Button + Navigation |
| `src/frontend/src/components/workspaces/MeshSquadChatGateSection.test.tsx` | NEU (3 Tests) |
| `src/frontend/src/App.tsx` | 1 Import + 1 Route (`/chat/space`) |
| `src/frontend/src/lib/section-nav.ts` | 1 Nav-Eintrag + MessagesSquare-Import |
| `src/frontend/src/i18n/locales/en.json` + `de.json` | meshsquadChat.* 45 Keys (handgeschrieben) |
| `src/frontend/src/i18n/locales/*.json` ×58 | meshsquadChat.* EN-Fallback (per Skript) |
| `src/frontend/scripts/add-sprint153-meshsquad-chat-i18n.mjs` | NEU (Propagation, dokumentiert) |
| `docs/sprints/SPRINT-153-MESHSQUAD-CHAT-CHATROOMS.md` | Plan + Lieferung + Wire-Contract + Verifikation |
| `docs/backlog/BACKLOG.md` | S153-Spiegel oben + S150-S153-Tabelle aktualisiert |
| `/home/ji/projects/ihc24/BUILD-2026-09-29-SPRINT-153-MESHSQUAD-CHAT-SPACE.md` | dieser Report |

**Nicht angefasst (Auftrag):** WorkspacesPage, DeploymentsPage, gateway.go, plugins.go, files.go,
suricata*, threat*, deploy/*, meshsquad-public (komplett), HierarchySidebar.tsx (fremde
Parallel-Welle SPRINT-156/157 — das Entry-Rendering dort blieb unangetastet und funktioniert,
verifiziert). **API_DOCS.md ohne Eintrag:** keine jimesh-HTTP-Route berührt (die konsumierten
Routen `/api/plugins` + `/api/plugin-installations` sind bereits dokumentiert, docs/API_DOCS.md:1547-1553;
der meshsquad-Wire-Contract lebt im Sprint-File).

## Ehrliche Lücken (bewusst, nicht versteckt)

1. **`installable` bleibt false** — `pluginBackendRoutes["meshsquad"]` ist laut gateway/plugins.go
   weiterhin leer (RM25): Entry + Gate bleiben ausgegraut, bis eine echte jimesh↔meshsquad-Backend-
   Integration existiert. Kein Fake-Coming-Soon (Mandat 2).
2. **meshsquad-public server.py hat die Chat-Space-Endpunkte noch nicht** (S153-3b offen) — die Page
   zeigt dann ehrlich "Chat-space API not deployed yet". Deren Sub-Channel-Modell
   (topic_map/topic_map_store/role.channels/post_to_channel) liegt dort UNCOMMITTED im Baum und
   passt exakt zu diesem Client.
3. **"Make main"-Schalter pro Team**: es gibt keinen Set-Main-Endpoint im Store → `is_main` wird nur
   dargestellt. Nachrüsten, sobald meshsquad einen Weg hat.
4. **13 rote Tests im Full-Suite-Snapshot** — ALLE in den 3 Sidebar-Dateien eines PARALLELEN Agenten
   (SPRINT-156/157-Umbau lief während dieser Session; grep: 0 MeshSquad-Referenzen dort; der
   Reachability-Guard bricht bei "section header not found: Security", VOR jedem Label-Check —
   mein "MeshSquad Chat"-Label wird vom Entry gerendert und ist auffindbar, sobald deren Sections
   stehen). Für diesen Agenten nicht fixbar (fremde Dateien).

## Verifikation (Mandat 6 — wirklich gelaufen)

| Check | Ergebnis |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **472 Fehler** — Baseline 473, NICHT schlechter (−1); **0** Fehler in allen berührten Dateien |
| `npm run check:i18n` | **passed for 60 locales** (3288 Keys, inkl. meiner 45; die Concurrent-Welle ergänzte parallel weitere — beide zusammen grün) |
| `npx vitest run` (volle Suite) | **447 pass / 13 fail** — alle berührten Suiten grün: Entry 4/4, Gate 3/3, Page 6/6, section-nav 5/5; die 13 Fehler sind die Concurrent-Sidebar-Welle (s. o. Lücke 4) |
| `docker run --rm -v …/src/backend:/app golang:latest go build ./internal/... ./cmd/...` | **exit 0** |
| `docker run --rm -v …/src/backend:/app golang:latest go vet ./internal/... ./cmd/...` | **exit 0** |
| Smoke-Test live | **nicht möglich** — Crew-Stack nicht erreichbar/installierbar (RM25 + S153-3b offen); ehrlich gesagt statt behauptet |

**Klick-Pfad (Mandat 14, Reachability):** Sidebar → "MeshSquad Chat"-Entry (installiert) →
`/chat/space` ⇢ alternativ Deploy-Dialog (MeshSquad-Crew) → Gate "Open chat" → `/chat/space` ⇢
Top-Navbar Workspaces-Gruppe → "MeshSquad Chat". Nicht-installiert: Entry → Tooltip/Install-Wizard,
Page → Plugin-Katalog-Link.
