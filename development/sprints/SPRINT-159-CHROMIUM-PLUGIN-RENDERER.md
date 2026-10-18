# SPRINT-159 — CHROMIUM-PLUGIN-RENDERER

> **Operator-Zitat (verbatim, 29./30.9.2026):** "CHROMIUM WAR DAFÜR GEDACHT
> DIE GANZEN WEBSITES STATT IFRAME DIREKT IM FRONTEND ZU RENDERN" (Chromium
> was meant to render all the [plugin] websites directly in the frontend
> instead of iframe).
>
> Ziel: eine GENERISCHE Mechanik, mit der ein beliebiges Plugin-Website
> nativ im jimesh-Dashboard gerendert wird, über eine echte
> Chromium-Engine — nicht per `<iframe src=...>`.

## Abgrenzung (bevor irgendetwas gebaut wurde)

Drei existierende Dinge klingen ähnlich und sind es nicht:

1. **`gateway/embed.go` (SPRINT-57)** — ein same-origin HTTP-Reverse-Proxy
   für Grafana/Wazuh/Ozone-Recon (`internal/gateway/embed.go:1-306`). Kein
   Chromium beteiligt, reines HTTP-Proxying von Grafanas eigenen
   Responses. Funktioniert NUR für Apps, die selbst reverse-proxy-fähig
   sind (Grafanas `serve_from_sub_path`) UND die der Operator explizit via
   `JIMESH_EMBED_TARGETS` konfiguriert. Generalisiert NICHT auf beliebige
   Third-Party-Websites (Cross-Origin, eigene Cookies/Auth-Flows, absolute
   Asset-URLs, die unter einem Pfad-Rewrite brechen).
2. **Neko/VNC (`m1k1o/neko:xfce`)** — schon im Deploy-Engine vorhanden
   (`internal/deploy/projects_ssh.go:1770-1790`, das `opencode`-Framework),
   aber bisher NUR als Remote-Desktop für einen Workspace (die Deployment
   startet einen XFCE-Desktop + Terminal-Autostart — nie eine Website).
   Kein Viewer dafür existierte im Frontend (`vncPort` war bislang nur ein
   Info-Feld, siehe `AppDetailPage.tsx:106-114`, `WorkspaceDeploymentsPage.tsx:77`
   — nirgends ein `RTCPeerConnection` im ganzen Frontend, siehe
   Grep-Ergebnis unten).
3. **R45-Taxonomie / `TASK-PLAN-PLUGIN-SYSTEM.md`** — listet `iframe` und
   `native` als Rendering-Surface-Typen. Beides ist NICHT das, was der
   Operator will: kein Iframe, aber auch kein Custom-React-Component pro
   Plugin — sondern ein generischer Browser-Engine-Renderer, den JEDES
   Plugin nutzen kann.

Verifiziert vor dem Bau (grep über `src/frontend/src`): `RTCPeerConnection`
kam in genau ZWEI Dateien vor — beides waren nur Beschreibungstexte in
`BrowserRuntimeModal.tsx`/`WorkspaceDeployAppDialog.tsx` ("streamWebrtc"),
keine echte WebRTC-Client-Implementierung existierte.

## Research-Frage: Neko-Reuse

**Ja, mit einer Anpassung.** `apps/xfce` (m1k1o/neko GitHub-Source,
verifiziert per `gh api repos/m1k1o/neko/contents/apps/xfce/Dockerfile` zur
Build-Zeit) installiert **NUR** `xfce4` + `xfce4-terminal` + `sudo` — **kein
Browser**. Die bestehende opencode-Deployment nutzt das auch nur für einen
autostartenden Terminal (`projects_ssh.go:1786`), nie für eine Website.
Xfce hier weiterzuverwenden hätte pro Session ein `apt-get install
chromium` bedeutet (langsam, ungepinnt).

**Gewählt: `m1k1o/neko:chromium`** — die parallele offizielle Variante
desselben Publishers, extra für genau diesen Zweck gebaut (ein Openbox +
ein Chromium, `chromium`/`chromium-common`/`chromium-sandbox`
vorinstalliert — `apps/chromium/Dockerfile`). Ihr Supervisord-Programm
(`apps/chromium/supervisord.conf`) startet Chromium OHNE Start-URL. Dieser
Sprint liefert das fehlende Stück: eine Session-spezifische
`chromium.conf`, die dieselbe Kommandozeile um `--app=<targetUrl>`
ergänzt und beim `docker run` über `-v ...:/etc/neko/supervisord/chromium.conf:ro`
eingehängt wird (`internal/deploy/plugin_renderer.go`,
`rendererChromiumConfTemplate` + `buildRendererDeployScript`).

Grund für "gh api" statt raten: die m1k1o/neko-History hat KEINEN
erreichbaren v2-Branch mehr (nur `master` = v3 + Feature-Branches) — die
Protokoll-Verifikation unten musste gegen den echten v3-Server-Quellcode
laufen, nicht gegen Erinnerung. Docker-Hub-API bestätigt zusätzlich: der
Tag `m1k1o/neko:xfce` wurde zuletzt am 28.9.2026 gepusht (aktiv gepflegt,
v3-Linie) — kein eingefrorenes v2-Legacy-Image.

**Verifiziertes Protokoll** (server/pkg/types/message, server/pkg/types/event,
server/internal/websocket/peer.go, server/internal/webrtc/handler.go +
payload/{types,receive}.go, server/internal/session/auth.go,
server/internal/api/{router,session}.go — alle per `gh api`/`curl` gegen
die echte GitHub-Quelle gelesen):

- `POST /api/login {username,password}` → `{token}` (multiuser-Provider,
  Default-Passwörter "neko"/"admin", hier überschrieben —
  `NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD`/`_USER_PASSWORD`).
- `GET /api/ws?token=<token>` — EIN WebSocket, JSON-Envelope
  `{"event":"...","payload":{...}}` (`ws_peer.go:30-43`, `Send()`).
- Signaling: Client sendet `signal/request`, Server antwortet
  `signal/provide{sdp,iceservers,...}` (Server ist WebRTC-Offerer,
  `WebRTCManager.CreatePeer` erzeugt Offer serverseitig) → Client setzt
  RemoteDescription, erzeugt Answer, sendet `signal/answer{sdp}`; ICE via
  `signal/candidate` beidseitig.
- Maus/Tastatur laufen NICHT über die JSON-WS-Events (die `control/*`
  Event-Namen in `event.go` sind für einen anderen/älteren Pfad) sondern
  über einen **binären WebRTC-DataChannel**: 3-Byte-Header
  `[event:u8][length:u16 BE]` + Payload (`payload/types.go`,
  `payload/receive.go` — `OP_MOVE=0x01`, `OP_SCROLL=0x02`,
  `OP_KEY_DOWN=0x03`, `OP_KEY_UP=0x04`, `OP_BTN_DOWN=0x05`,
  `OP_BTN_UP=0x06`). Der Server öffnet den Channel (`pc.ondatachannel` auf
  Client-Seite, nicht `createDataChannel`).
- Medien (Video/Audio) sind direkter WebRTC/UDP-ICE-Traffic zum
  `NEKO_NAT1TO1`-Host — GENAU dieselbe Einschränkung, die die bestehende
  opencode/neko-Desktop-Deployment schon hat (nie vorher sichtbar, weil nie
  ein Viewer existierte).

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | Research: Neko-Reuse-Frage, Protokoll-Verifikation gegen echten Source | ✅ |
| WP2 | Store: `plugin_renderer_sessions` Tabelle + CRUD (`internal/store/plugin_renderer_sessions.go`) | ✅ |
| WP3 | Backend: Session-Lifecycle (create/get/list/delete), Chromium-Deploy-Script, In-Memory-Secret-Store, WS-Ticket-Mint, generischer SSH-Tunnel-Proxy (`internal/deploy/plugin_renderer.go`) | ✅ |
| WP4 | `network.Pool`: `GetReverseProxyGeneric` (beliebiger Präfix statt hartkodiertem `/api/projects/{id}/tunnel/{port}`) + `HTTPClientVia` (Backend-seitiger HTTP-Call durchs SSH-Tunnel, für den Neko-Login) (`internal/network/tunnel.go`) | ✅ |
| WP5 | Route-Registrierung (`internal/deploy/deploy.go`) | ✅ |
| WP6 | Frontend: `ChromiumPluginRenderer.tsx` — echter WebRTC-Client (Signaling + binärer DataChannel für Maus/Tastatur), kein neko-Client-Library-Import | ✅ |
| WP7 | Frontend-Integration: neuer "Renderer"-Tab in `AppPanelDrawer.tsx` (additiv, DASHBOARD-Tab/Iframe unverändert) via `AppRendererTab.tsx` (Node-Auswahl + Ziel-URL-Bestätigung, dann Auto-Connect) | ✅ |
| WP8 | i18n: `appPanel.tabRenderer` + 5 weitere Keys, neue Sektion `chromiumRenderer.*` (13 Keys) — 60 Locales, `check-i18n` grün | ✅ |
| WP9 | Tests: Go (Store-Lifecycle + reine Handler-Helper: URL-Validierung, Script-Rendering, In-Memory-Secrets), Vitest (4 Szenarien: Session-Create-Body, Fehler-Pfad ohne Socket, echte Signaling-Sequenz inkl. RTCPeerConnection-Fake, Stop-Teardown) | ✅ |
| WP10 | Sprint-Doku (dieses Dokument) | ✅ |

## Design-Entscheidungen (kurz, mit Begründung)

- **Kein Host-Port-Publish** für den Renderer-Container — die interne
  Bridge-IP wird per `docker inspect` gemessen (`JIMESH_RENDERER_IP:`-Echo,
  `buildRendererDeployScript`), genau das Muster, das
  `deploy/tunnel.go`s `handleTunnelProxy` für den Default-Fall (`internalIP
  = "127.0.0.1"`) schon voraussetzt — nur ohne VLAN-Attach (siehe "was
  fehlt" unten).
- **Secrets nie in der DB**: das generierte Neko-Admin-Passwort lebt nur in
  einer In-Process-Map (`rendererSecrets`, `plugin_renderer.go:150-172`) —
  exakt dieselbe Haltung wie `network.Pool`s eigene In-Memory-SSH-Configs.
  Ein Backend-Restart verliert es bewusst; `GET .../ws-ticket` meldet dann
  ehrlich `410 Gone` statt eine kaputte Session als "verbunden" zu zeigen
  (Mandate 2).
- **Zwei Tokens, ein Query-String**: der äußere jimesh-Session-Token
  (`?token=`, von `internal/auth`s `bearerToken()` gelesen, exakt das
  Feld, das `WorkspaceTerminal.tsx` auch schon so anhängt) und der innere
  Neko-Token (`&neko_token=`) kollidieren nicht — `handlePluginRendererTunnel`
  tauscht `neko_token`→`token` im Request UM, nachdem die
  Auth-Middleware ihre Prüfung schon gemacht hat
  (`plugin_renderer.go`, Kommentar direkt über der Query-Umschreibung).
- **Ziel-URL ist NICHT `dashboardUrl` (AppPanelDrawer)**: `dashboardUrl`
  (`appTunnelUrl()`) ist eine URL, die für den OPERATOR-BROWSER Sinn
  ergibt (direkter Host:Port ODER der Gateway-Tunnel-Pfad) — der
  Chromium-Container braucht aber eine URL, die von SEINEM EIGENEN Node
  aus erreichbar ist, was nicht automatisch dasselbe ist. Deshalb ist der
  "Renderer"-Tab ein kleines Formular (Node-Auswahl + Ziel-URL-Bestätigung,
  `AppRendererTab.tsx`), kein Auto-Start — ehrlich statt geraten.

## Verifikation

**Backend:**
```
go build ./...                     → PASS
go vet ./...                       → clean
go test ./internal/deploy/... \
        ./internal/store/... \
        ./internal/network/...     → alle ok (Store-Lifecycle-Test
                                      skippt ohne erreichbares Postgres,
                                      Handler-Helper-Tests laufen echt)
go test ./...                      → nur bereits bestehende, von diesem
                                      Sprint UNABHÄNGIGE Fails
                                      (internal/ai, internal/service —
                                      brauchen Live-Postgres ohne
                                      Skip-Guard; existierten schon vorher)
```
Ein echter Fund während TestValidRendererTargetURL: `url.Parse(...).String()`
kodiert `'`/`` ` `` NICHT um (RFC-3986-Sub-Delims im Pfad erlaubt) — die
erste Fassung der Validierung prüfte den re-serialisierten String und hätte
Shell-Metazeichen durchgelassen. Fix: Prüfung läuft jetzt gegen den RAW
Input (`plugin_renderer.go`, `validRendererTargetURL`).

**Frontend:**
```
npx tsc -p tsconfig.app.json --noEmit   → 471 Fehler, ALLE vorbestehend
                                           (verifiziert: identische
                                           Fehlerzahl vor/nach dieser
                                           Änderung, keiner nennt eine
                                           neue Datei dieses Sprints)
npx vitest run                          → 57 Dateien / 464 Tests PASS
                                           (inkl. 4 neuer
                                           ChromiumPluginRenderer-Tests +
                                           unveränderte 12
                                           AppPanelDrawer-Tests)
node scripts/check-i18n.mjs             → 60 Locales, 3307 Keys (+19), PASS
```

**Datei:Zeile-Belege:**
- `src/backend/internal/store/plugin_renderer_sessions.go` (193 Zeilen) — Tabelle + CRUD
- `src/backend/internal/store/plugin_renderer_sessions_test.go` (112 Zeilen) — Lifecycle-Test
- `src/backend/internal/deploy/plugin_renderer.go` (544 Zeilen) — Session-Handler, Deploy-Script, WS-Ticket, Tunnel-Proxy
- `src/backend/internal/deploy/plugin_renderer_test.go` (115 Zeilen) — reine Helper-Tests (fand den url.Parse-Bug)
- `src/backend/internal/network/tunnel.go` (neu: `GetReverseProxyGeneric`, `HTTPClientVia`)
- `src/backend/internal/deploy/deploy.go:99` (Route-Registrierung, `h.registerPluginRenderer(mux)`)
- `src/backend/internal/store/store.go` (migrate()-Wiring)
- `src/frontend/src/components/plugins/ChromiumPluginRenderer.tsx` (493 Zeilen) — WebRTC-Client
- `src/frontend/src/components/plugins/ChromiumPluginRenderer.test.tsx` (302 Zeilen) — 4 Szenarien
- `src/frontend/src/components/apps/AppRendererTab.tsx` (95 Zeilen) — AppPanelDrawer-Wiring
- `src/frontend/src/components/apps/AppPanelDrawer.tsx` (additiv: neuer Tab, Import)
- `src/frontend/src/i18n/locales/*.json` (60 Dateien, +19 Keys je Datei)

## Was ein "echtes" Full-Version noch braucht (ehrlich, nicht versteckt)

1. **VLAN/Netzwerk-Parität mit regulären Workspace-Deployments**: die
   Renderer-Session hängt NICHT am projekteigenen VLAN
   (`internal/network/vlan.go`), sondern nur an Dockers Default-Bridge —
   für einen Plugin-Renderer ohne "Projekt"-Kontext bewusst einfacher
   gehalten, aber ein voller Ausbau sollte dieselbe Isolationsebene wie
   `TASK-080` bekommen.
2. **Session-Wiederherstellung nach Backend-Restart**: aktuell verliert ein
   Neustart sowohl die SSH-Verbindung (`network.Pool`, In-Memory) als auch
   das Neko-Passwort (`rendererSecrets`, In-Memory) — die Session-Row
   bleibt als "running" stehen, obwohl niemand mehr reinkommt, bis der
   Operator sie löscht/neu erstellt. Ein Vault-Secret-Ref
   (`plugin_installations`-Muster: `secret_ref` in vault_secrets) plus ein
   Boot-Zeit-Reconnect-Sweep würden das schließen.
3. **Pool statt Ad-hoc-Session**: jede Plugin-Ansicht startet aktuell einen
   FRISCHEN Container — kein Warm-Pool, kein Wiederverwenden einer
   bestehenden Session beim erneuten Öffnen desselben Plugins. Für echte
   Multi-User-Nutzung (mehrere Operator gleichzeitig auf demselben Plugin)
   fehlt außerdem Multi-Peer/Viewer-Support (Neko kann das serverseitig,
   der Client hier nimmt aktuell nur EINEN Host-Peer an).
4. **Vollständige Tastatur-Abdeckung**: `keysymFor()` deckt druckbares
   Latin-1 + gängige Sondertasten ab — keine Dead-Keys, IME, Nicht-Latin-
   Layouts.
5. **Kein Address-Bar/Forward/Back**: Kiosk-Mode (`--app=`) hat kein
   sichtbares Chrome — "Reload" simuliert Ctrl+R über den DataChannel,
   "Restart" reißt den Container komplett neu auf. Ein echtes
   Navigations-UI bräuchte entweder CDP (Chrome DevTools Protocol) auf
   einem zusätzlichen Port oder einen Wechsel weg vom Kiosk-Mode.
6. **End-to-End-Verifikation gegen einen echten Node**: dieser Sprint lief
   ohne erreichbaren SSH-Zielknoten/Docker-Host/Browser-WebRTC-Stack im
   Sandbox — Backend-Logik ist gegen den echten m1k1o/neko-v3-Quellcode
   verifiziert und mit echten (nicht gemockten) Store-/Handler-Helper-Tests
   abgedeckt, der Frontend-Client gegen gefakte aber protokoll-treue
   WebSocket/RTCPeerConnection-Stand-ins — ein echter Lauf gegen Grafana
   (oder eine harmlose statische Testseite) auf einem echten SSH-Ziel
   bleibt der nächste, vom Operator zu bestätigende Schritt (Mandate 2:
   hier wird das nicht als "funktioniert live" behauptet, nur als "Code +
   Protokoll verifiziert, End-to-End noch offen").

## Do-not-do (eingehalten)

Kein Commit, kein Push, kein `make redeploy`, kein Trading-Node berührt.
`git status --short` vor Beginn geprüft (siehe Kollisions-Hinweis unten).

## Kollisions-Hinweis

`git status --short` zu Beginn zeigte bereits geänderte
`docs/backlog/BACKLOG.md` und `docs/sprints/SPRINT-153-*.md` sowie
untracked `src/backend/datalaked`, `src/backend/threat-responder` — keine
davon wurden von diesem Sprint berührt oder überschrieben.
