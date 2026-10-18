# SPRINT-STEALTH-BROWSER-AGENT — Stealth-Browser-Lane (camoufox im nEko-Kiosk)

> **Operator-Verbatim (Eingabe dieses Sprints):** "nEko-WebRTC-Streaming läuft
> bereits im JiMesh-Repo als `deploy/plugin_renderer.go` (m1k1o/neko
> chromium-Kiosk). Ziel: DIESELBE WebRTC-Streaming-Infrastruktur, aber der
> in-Kiosk-Browser ist swapbar: `chromium` (default, current) oder `camoufox`
> (stealth Firefox mit C++-Level-Fingerprint-Spoofing für KI-Agents gegen
> Cloudflare/DataDome), und ein third-party adapter hook für `steel` (Method-2)
> dokumentiert ohne Implementierung."
>
> Und zur Verifikation: "Engine-Verificación: unit test (mock env, returns
> correct image+args; invalid engine test → err check; contract tested without
> building any docker image in-test)." sowie "Do NOT break existing callers:
> `buildRendererDeployScript` behaviour unchanged when env unset/`chromium`."

## Ausgangslage — zwei Methoden aus dem Operator-Input (verbatim-Würdigung)

**Method 1 — nEko + Camoufox (IMPLEMENTED, dieser Sprint):**
Die bestehende nEko-WebRTC-Infrastruktur (SPRINT-159: `m1k1o/neko`-Kiosk,
WebRTC DIRECT-UDP-Media-Leg + SSHSignal-Tunnel, siehe Header-Kommentar
`plugin_renderer.go`) bleibt exakt wie sie ist — NAT1TO1, ICELite,
per-session UDP-Mux-Publish, :8080-Signaling. Was GEWECHSELT wird, ist nur
der Browser IM Kiosk: statt Debian-Chromium läuft auf Wunsch
**camoufox** (daijro/camoufox — der anti-detect Firefox-Fork, der den
gesamten Fingerprint-Surface auf C++/Browser-Ebene kohärent spoofed:
Canvas/WebGL/Audio/Fonts/Headers/JS-Runtime — genau das, was ein
KI-Agent braucht, um Cloudflare/DataDome-Klasse Bot-Checks zu überstehen,
während ein Operator über das bestehende neko-WebRTC zusehen und live
einen Captcha-Click nachhelfen kann).

**Method 2 — steel.dev (DOCUMENTED-ONLY, SB-3, NICHT implementiert):**
steel.dev (Managed-Stealth-Browser-API) bleibt die DOKUMENTIERTE
Alternative: ein `steel_engine`-Adapter-Hook ist im Sprint-Doc verortet,
im Deployment aber bewusst NICHT gebaut — die Engine-Auswahl antwortet
auf `steel` mit dem ehrlichen 501-Refusal (kein vorgetäuschter
Chromium-Stand-in).

## Work Breakdown

### SB-1 — Camoufox-Image-Build (deliverable: `deploy/images/renderer-camoufox/`)

Neu, neben dem uBlock-Sibling `deploy/renderer/`:

- `deploy/images/renderer-camoufox/Dockerfile` — Single-Stage (Begründung
  im Dockerfile-/README-Kontext — die Fetch-Assets landen im
  venv-Eigentums-Pfad, ein Multi-Stage-Copy würde Eigentum-Zonen
  aufreißen; der Operator-Auftrags-Skizze folgt die Datei formal wieder +
  die prefetch-Klausel):
  Base `m1k1o/neko:firefox` (Firefox, weil camoufox ein Firefox-Fork ist —
  die kiosk-Layout-Pipeline supervisord → Xorg → openbox → neko-Server
  :8080 bleibt DIESELBE Port/Socket-Mapping-Abklärung wie bei chromium),
  `pip install "camoufox[geoip]"` in einem eigenen venv
  (`/opt/camoufox-venv`, PEP-668-konform, Debian 12), und
  `camoufox fetch` als Build-Schritt (Asset-ZIP real ~1.29 GB für
  v156.0.1-beta.36 — der ursprünglich angesetzte "~77 MB"-Wert ist stale
  für aktuelle camoufox-Releases; Disk-Bedarf im README notiert,
  Issue-Tracking-Kontext siehe dort).
- `entrypoint-camoufox.sh` — Wrapper mit ZWEI Launch-Modes (README-Tabelle
  "Wrapper launch modes"): headful default (löst `camoufox path` auf und
  öffnet die Target-URL direkt auf dem neko-Xorg-Display — das
  `--app=`-Äquivalent der chromium-Kiosks, WebRTC streamt das Fenster)
  und `CAMOUFOX_HEADLESS=true` → `camoufox server --port …` (der
  CLI-Spell von upstream `launch_server()`, Playwright-WS-Port gepinnt
  — die SB-3-nahe Agent-Hook-Vorbereitung, nie der Streaming-Pfad).
  Die Mount-Conf (SB-2) startet den Wrapper mit `--target-url=<url>`.
- `README.md` — Build-Runbook + docker-run-Form (Platzhalter-Volume +
  Port-Map), Env-Tabelle, Disk-Note.

**Build-Kommandos (Operator-gated, NICHT in CI gebaut — kein docker im
Agent-Sandbox; das Image ist das SB-1-Deliverable, vertraglich nicht
lokal gebaut):**

```sh
docker build -t jimesh-renderer-camoufox:latest deploy/images/renderer-camoufox/
```

Der Tag muss exakt `plugin_renderer.go`'s `rendererCamoufoxImage`
(SB-2) matchen; ein Node ohne den Tag fail-closed mit der
Runbook-Fehlerzeile (inspect → pull → runbook-error), nie ein stiller
Fallback auf chromium.

**Env-Vertrag des Images (README-Tabelle):**

| Var | Default | Bedeutung |
|---|---|---|
| `CAMOUFOX_HEADLESS` | `false` | headful auf dem neko-Xorg-Display (Operator sieht + hilft live); `true` = gepatchtes upstream-Headless |
| `CAMOUFOX_PLAYWRIGHT_PORT` | `3000` | gepinnter Playwright-WS-Port (`camoufox server --port`). NOTE: upstream bindet DEFAULT-EPHEMERAL und PRINTS nur den Endpoint — es gibt keinen upstream-Default-Port zu vererben; dieses Image kontraktiert 3000. Der neko-Server bleibt auf seinem eigenen :8080 (Tunnel/ticket contract), der Playwright-Port ist SEPARAT (für einen späteren Agent-Hook, SB-3-nah), NIE Teil des Streaming-Pfads. |

**SB-1 Build-Report (2026-10-14, Operator-Sandbox — erster realer
Build-Versuch; NICHT abgeschlossen, honest status):**

- **Status: `docker build` abgebrochen am Step `[4/6] RUN camoufox
  fetch`** (zwei Attempts: 9m59s + 15m0s, beide gegen die 10-min-Budget-
  Regel gecancelt; keine Image-Artefakte geblieben — kein
  `jimesh-renderer-camoufox:latest`, keine dangling images).
- **Root-Cause des Abbruchs: das Asset ist 1.29 GB, nicht ~77 MB.**
  `content-length: 1294875941` für
  `camoufox-156.0.1-beta.36-lin.x86_64.zip` (GitHub-Release, verifiziert
  via curl HEAD 2026-10-14). Bei ~1 MB/s Link (Ziel-Sandbox WLAN,
  ~8 Mbps) allein ~20–25 min Download — die 10-min-Budget-Regel sprengt
  das real, es ist kein Stall. Vorher laufen: pip install ~114 s +
  fpgen-Repo-Sync ~116 s (beide verifiziert OK; pip pulled
  camoufox-0.5.8 + playwright-1.62.0 u.a. sauber).
- **Zweite Blocker-Ebene (umgangen): der snap-docker Daemon-DNS-Defekt.**
  `docker pull` JEDER Registry schlägt fehl mit `lookup … on
  127.0.0.53:53: write udp … permission denied` — snap-AppArmor verweigert
  dem dockerd UDP zum systemd-resolved-Stub (Container-DNS intern
  funktioniert paradoxerweise sauber). Workaround OHNE root benutzt:
  Base-Image via Registry-API manuell geholt (auth-token → manifest →
  24 Layer, sha256-verifiziert, ~578 MB Download), als OCI-layout-Tar
  `docker load`ed → `m1k1o/neko:firefox` (Image-ID
  `f239350a9fb4`, 1.44 GB) ist SEITDEM lokal — daraus `FROM`-onwards
  braucht der Build KEIN daemon-seitiges DNS mehr. Operator-Grade-Fix:
  `sudo snap refresh docker` (oder deb docker-ce Daemon aktivieren — ist
  installiert aber nicht socket-aktiv).
- **Resume-Pfad (ein Operator-Befehl, alle Steps 1–3 sind cached):**
  `docker build -t jimesh-renderer-camoufox:latest
  deploy/images/renderer-camoufox/` mit ~30 min Budget statt 10; Smoke
  laut README verify-Sektion (`camoufox version` + venv-Präsenz-Probes +
  entrypoint-`--help`-Probe) noch offen und Teil des Resumes.
- **Gotchas für den Sprint-Master-Plan:** Asset-Größe → README
  "Build-time gotchas" + Dockerfile-Kommentar korrigiert (Disk-Bedarf
  ~2.9–3.2 GB Image gesamt); Build-Dauer ~30 min auf 1-MB/s-Link; snap
  docker DNS-Defekt dokumentiert (README §2); `docker buildx history rm`
  auf docker-Driver-Records silent-silently-not-working (metadata-only,
  harmless).

### SB-2 — Engine-Env-basierte Selection (implemented, `deploy/plugin_renderer.go`)

Minimal-Diff, bestehende Aufrufer unverändert:

- **Env:** `JIMESH_RENDERER_ENGINE` (`plugin_renderer.go:215`) — Werte
  `chromium` (default, auch unset/whitespace) | `camoufox` | `steel`;
  case-/whitespace-tolerant; JEDE andere Auswertung ist eine LAUTE
  Fehlermeldung (fail-closed — ein Typo fällt nie still auf ein
  ungewähltes Engine zurück).
- **Resolver:** `rendererEngineChoiceFor(raw)` (plugin_renderer.go:263)
  + der 1x-per-Create-Env-Wrapper `rendererEngine()`
  (plugin_renderer.go:303) — pro Session frisch gelesen, Engine-Wechsel
  ohne Backend-Restart möglich (die Freiheit, die
  `JIMESH_WEBRTC_ICE_SERVERS` schon hatte).
- **Image/args-Vertrag pro Engine:**

| Engine | Image | docker-run Änderung |
|---|---|---|
| `chromium` (default/unset) | `jimesh-renderer:ublock` | KEINE — byte-identisch zum pre-Sprint-Script (pinned gegen den ICE-Byte-Golden) |
| `camoufox` | `jimesh-renderer-camoufox:latest` | Image-Tag switched + `-e CAMOUFOX_HEADLESS=false -e CAMOUFOX_PLAYWRIGHT_PORT=3000`, UND der Kiosk-Programm-Swap: die Bind-Mount-Conf (`chromium.conf` — SAME Slot) trägt für camoufox `command=/usr/local/bin/entrypoint-camoufox.sh --target-url=<url>` (`rendererCamoufoxConfTemplate`) statt der Chromium-Flag-Zeile; neko-Streaming-Envs (NAT1TO1/UDPMUX/ICELite), UDP-Publish `$NAT_IP:$P:$P/udp`, :8080-Signaling bleiben EXAKT gleich |
| `steel` | keins | ehrliche 501 (`http.StatusNotImplemented`) mit `rendererSteelNotImplementedMessage` — Session-Kosten null (kein Secret, kein Row) |

- **Fail-closed-Guard ist jetzt engine-generic:** `buildRunbookDir(image)`
  (plugin_renderer.go:1209) mappt den Tag auf das EINE Repo-Verzeichnis,
  das ihn baut (`deploy/renderer/` bzw. `deploy/images/renderer-camoufox/`).
- **Kein breakender Aufrufer:** `buildRendererDeployScript(...)` ist
  variadic (`engine ...rendererEngineChoice`, plugin_renderer.go:1083) —
  bestehende 4-arg-Aufrufe (u.a. die byte-golden ICE-Tests) kompilieren
  unverändert und erzeugen das byte-goldene chromium-Script.
- **Handler-Einbindung (createPluginRendererSession, :590–599):** Engine
  wird VOR Credential-Generierung aufgelöst — ein steel-Request kostet
  null Side-Effects (kein Passwort, kein Session-Row geschrieben),
  ein unbekannter Wert ist ein ehrliches 400.

### SB-3 — steel.dev `steel_engine` Adapter-Hook (documented-only, NICHT implementiert)

Definiert, gebaut wird hier NICHTS:

- Die Engine-Auswahl kennt `steel` als NAMEN und verweigert ehrlich
  (501) — es gibt keinen vorgetäuschten Stand-in-Chromium, der sich als
  steel ausgeben würde.
- Der Adapter-Hook-SOLL für einen späteren Sprint (Verbatim-Vereinbarung
  mit dem Operator): ein `steel_engine`-Adapter, der hauptsächlich aus
  einem Publish-Shape-freundlichen Adapter besteht: steel-API-Endpoint
  (CDP-kompatible Schnittstelle) statt in-Kiosk-Browser, dieselbe
  tunnel/ticket-Oberfläche, derselbe GC/teardown. Die
  `CAMOUFOX_PLAYWRIGHT_PORT=3000`-Schneise in SB-1/SB-2 ist die hierfür
  freigehaltene Lücke (gleiches Muster: Engine-Image austauschen,
  Streaming-Contract unverändert).
Bis dahin bleiben die einzigen IMPLEMENTIERTEN Engines `chromium`
  und `camoufox`; alles andere fail-closed.

### SB-4 — API_DOCS + Healthcheck/Verify-Note

- **API_DOCS-Note (in diesem Sprint-Doc verortet — SEPARATE Dateien
  bleiben unberührt, sollte der Operator sie feinschliff woanders pinnen wollen):
  auf `POST /api/plugin-renderer/sessions` ändert sich NICHTS am
  Request/Response-Contract — nur die Backend-Prozess-Umgebung variiert
  `JIMESH_RENDERER_ENGINE`. Runtime-Verhalten: unbekannter Wert →
  400; `steel` → 501 `JIMESH_RENDERER_ENGINE=steel is named in the
  config but a steel engine is NOT deployed (SB-3 — …)`.**
- **Healthcheck/verify (Sprint-Niveau):** `go build ./...` clean,
  `go vet` clean auf `internal/deploy`, `go test ./internal/deploy -run
  TestRendererEngine` GREEN (drei Testfunktionen + Subtests unten),
  volle `internal/deploy`-Suite `ok` (1.9 s),
  `npm run check:i18n` unverändert GREEN (60 locales, keine Locale-Edits).
  Über die Lokal-Ökonomie hinweg: ein Deployment, das camoufox will,
  baut das SB-1-Image (Build-Kommando oben) und setzt einmal
  `JIMESH_RENDERER_ENGINE=camoufox`.

## Article-Doc-Note (Breaking-Standpunkt)

> **"default engine unchanged; op can opt-in camoufox per deployment."**
> Kein Breaking Alpha: ohne `JIMESH_RENDERER_ENGINE` verhält sich
> JiMesh byte-identisch zum Stand vor diesem Sprint (pinned gegen den
> byte-golden deploy script). camoufox ist ein Operator-Opt-in pro
> Deployment (Image bauen + eine Env); steel bleibt die dokumentierte,
> nicht-einbaute Method-2-Alternative (SB-3).

## Verifikation (gemessen in diesem Sprint)

```
go build ./...                                   → clean
go vet ./internal/deploy/                        → clean
go test ./internal/deploy/ -run 'TestRendererEngine'
                                                 → ALL PASS:
     TestRendererEngineChoiceContract (9 Subtests)
     TestRendererEngineEnvIsReadPerCreate
     TestRendererEngineCamoufoxDeployScript
     TestRendererEngineChromiumScriptByteUnchanged (vs. ICE byte-golden)
go test ./internal/deploy/                       → ok 1.9s (ganz Suite)
npm run check:i18n                               → 60 locales, 5501 keys — unchanged
```

Kein docker build im Test-Lauf (Contract-Test-Klausel des Operators):
alle Engine-Tests pin Resolution + Zusammensetzung des Scripts, kein Overlay.

## Was SB-3 deferral bedeutet (honest statement)

`steel` ist heute NUR: ein Name, der eine ehrliche 501-Antwort erzeugt.
Der Operator-Auftrag "third-party adapter hook für steel … dokumentiert
ohne Implementierung" ist exakt geliefert: dokumentiert (hier +
`rendererSteelNotImplementedMessage` im Code), nicht implementiert
(kein Adapter, kein steel-Container, kein half-steps-Fehlverhalten).

## SB-1 build FINAL (2026-10-14 evening, Azure-ACR remote path)

- Operator directive verbatim: „laass mal nicht hier große sachen runterladen, mach das mal in azure oder github".
- **ACR build → SUCCESS Run `cg1`, 3m50s**: jimeshrdr.azurecr.io/jimesh-renderer-camoufox:latest, digest sha256:743fc2c8be75f9fd3f163135c7d20a45d89132ce0acc5ae4ee44a36474da278d
- **Remote smoke → SUCCESS Run `cg3`, 57s**: BINARY-OK, site-packages present.
- GitHub-Actions mirror (.github/workflows/renderer-camoufox.yml, committed a8b7e2ab) blocked at account billing gate ("recent account payments failed / spending limit") — Operator-Aktion nötig; ACR = live Weg.
- Kosten: ACR Basic (RG rg-jimesh-infra) + 2 task-runs — Startup-Credit.
