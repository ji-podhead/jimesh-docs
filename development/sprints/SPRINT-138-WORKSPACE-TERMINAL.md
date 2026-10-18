# SPRINT-138 — WORKSPACE-TERMINAL (feat-workspace-terminal)

> **Operator-Entscheidung (Sicherheitsmodell, 27.9.2026):** ECHTER
> Workspace-Terminal im Browser — **KEIN SSH auf den Host, NIEMALS.**
> Der Terminal-Button macht `docker exec` in den Workspace-Container.
> Der Container läuft in gVisor (runsc) → ein kompromittierter User/Agent
> bleibt im Container gefangen; eine gehackte DSH-Instanz kommt NICHT auf
> den Host und NICHT an andere Workspaces.
> Branch: `feat-workspace-terminal` · Datum: 27.9.2026

## Plan (vor Implementation, Mandate 1 §2)

Ziel: Ein interaktiver Terminal-Modal (xterm.js) pro Workspace, der über
WebSocket (GET /api/workspaces/{id}/terminal) einen `docker exec -it
<workspace-container> /bin/bash` (Fallback /bin/sh) in den
Workspace-Container streamt — bidirektional, mit Resize, Copy-Paste,
Ctrl+C (Terminal-Signale gehen an den Shell-Prozess IM Container, nie auf
den Host).

Warum kein SSH: Die bisherigen Shell-Zugänge („docker exec über den
SSH-Tunnel", Code-Server-Terminal, noVNC-Desktop) starten alle an der
NODE-Oberfläche oder publishen Ports. Das neue Modell: der Gateway selbst
sitzt auf dem lokalen Docker-Socket (local-stack bindet
/var/run/docker.sock in den Backend-Container) und exec-t NUR in den
gVisor-Container — kein Host-Shell, kein Port, kein SSH-Hop.

### Work Packages

| WP | Inhalt |
|---|---|
| WP1 | Backend: `gateway/terminal.go` — WebSocket-Upgrade, Ownership-Gate (Owner ODER Admin; identity headers der auth-Middleware, fail closed), Container-Auflösung (Row-`containerId` = `jimesh-framework-<wsId>-<runID>`, Fallback: Prefix-Suche laufender Container), `ContainerExecCreate` + `ContainerExecAttach` (Docker Go SDK, TTY), bidirektionales Pumpen, ehrliche Fehlerframes (Container down → `workspace container not running — deploy first`) |
| WP2 | `go.mod`: `github.com/docker/docker` (Client-Paket) nachtragen — geprüft: NICHT in go.mod; gorilla/websocket v1.5.3 IST schon da (genutzt in internal/ai) |
| WP3 | Route: `GET /api/workspaces/{id}/terminal` in gateway.go (Auth: Session via Bearer/Query `?token=` — bearerToken liest Query schon; Browser-WS kann keine Header setzen) |
| WP4 | Frontend: `WorkspaceTerminal.tsx` (NEU) — xterm.js + addon-fit, `ws(s)://…?token=`, Resize-Control-Frames, Copy/Paste, Ctrl+C durchgereicht, Reconnect-Button, ehrliche Fehlerzustände |
| WP5 | Sidebar (HierarchySidebar.tsx): Workspace-Zeilen-[T] öffnet den Terminal-Modal wenn der Container läuft (`status: deployed`), sonst BrowserRuntimeModal als Deploy-Fallback |
| WP6 | WorkspaceDetailPage: Fake-„SSH Shell"-Toast-Button ersetzt durch echten „Open Terminal"-Button mit dem Modal |
| WP7 | i18n: neue Keys (en+de übersetzt, Rest via backfill-i18n Standard), toter `wsDetail.sshShell` entfernt |
| WP8 | Tests: Backend Ownership-Gate (terminal_test.go), Frontend Modal + Sidebar-[T]-Reachability (vitest) |
| WP9 | Docs: API_DOCS.md-Route, Backlog-Spiegel, dieser Sprint |

### WS-Protokoll (Vertrag, auch API_DOCS.md)

- C→S **binary**: rohe stdin-Bytes (Tastatur, Paste).
- C→S **text**: JSON-Control `{"type":"resize","cols":N,"rows":M}`.
- S→C **binary**: kombinierter stdio-Output (TTY=true, stderr gemerged).
- S→C **text**: JSON-Events `{"type":"error","message":…}` (danach Close
  4001 not-running / 4003 forbidden / 4004 unknown / 1011 internal) und
  `{"type":"exited"}` (danach Close 1000).
- Auth-Fehler VOR dem Upgrade (Middleware, 401) sind im Browser-WS opak —
  deshalb upgradet der Handler zuerst und sendet Fehler ALSDANN als Frame
  (der Client zeigt die echte Meldung); die Middleware-401 bleibt das
  undokumentierte Standardverhalten für unauthentifizierte Calls.

### Akzeptanzkriterien

1. `make go-build` kompiliert (CGO_ENABLED=0 — Docker-Client ist pure Go).
2. tsc --noEmit und vitest grün, check:i18n grün (60 Locales, Parität).
3. Ehrlichkeit: Container down/not found → exakte Meldung „workspace
   container not running — deploy first", kein Fake-Terminal (Mandate 2).
4. Ownership: Nicht-Owner ohne Admin-Rolle → 403/Close 4003 (Test).
5. Reachability (Mandate 14): Sidebar-Workspace-Zeile [T] UND
   WorkspaceDetailPage-Button öffnen den Modal — Klick-Pfade im Ergebnis
   dokumentiert.

## Ergebnis (verifiziert am 27.9.2026 — Retrospektive-Honesty, Mandate 1 §4)

**Alle WPs umgesetzt; Verifikation wie gefordert:**

- **make go-build** (golang:latest-Container, CGO_ENABLED=0): RC 0 — auch mit
  der neuen Docker-SDK-Abhängigkeit (go mod tidy; docker/docker v28.5.2
  +incompatible, reine Client-Pakete, bleibt pure Go).
- **go vet ./internal/gateway/**: clean. (Anmerkung: `go vet ./...` scheitert
  an einer UNTRACKED, in-flight Datei einer Parallel-Session,
  internal/auth/workspace_scope_test.go — nicht Teil dieses Sprints.)
- **Backend-Tests**: 2 Tests PASS (13 Ownership-Gate-Fälle: Operator, Owner,
  jimesh-admin, Nicht-Owner fail-closed, Shared-Workspace Admin-only,
  unbekannte Source fail-closed; 405 für non-GET).
- **vitest**: 326/326 PASS über die GESAMTE Suite (32 Dateien), inkl. 7 neuer
  Protokoll-Tests (WorkspaceTerminal.test.tsx: URL+Token, Resize-Frame on
  open, Binary-Stdio→xterm + Tastatur→Binary-Frame, Error-Frame verbatim +
  Reconnect, exited+Close-1000, Close-Code-Mapping 4001, Unmount-Cleanup)
  und 1 Sidebar-Reachability-Test ([T] auf deployed Workspace → Exec-Modal,
  KEIN window.open, KEIN Tunnel, KEIN SSH).
- **tsc --noEmit**: A/B 478 → 478 (0 neue Fehler; die 478 sind der
  dokumentierte pre-existing Style-Noise-Stand).
- **check:i18n**: 60 Locales / 2914 Keys Parität PASS (terminal.*-Gruppe en+de
  übersetzt, Rest Standard-Backfill; toter wsDetail.sshShell entfernt).

**Klick-Pfade (Mandate 14 — Reachability, bewiesen):**
1. Sidebar → PROJECTS → Workspace-Zeile [Terminal]-Icon (deployed) →
   WorkspaceTerminal-Modal → ws://…/api/workspaces/{id}/terminal?token=…
   (Test: 'SPRINT-138: [Terminal] on a DEPLOYED workspace opens the REAL
   exec terminal modal — no tunnel window, no host SSH').
2. /workspaces/ws/{id} (WorkspaceDetailPage) → "Open Terminal"-Button (hat
   den Fake-"Connecting to SSH Shell..."-Toast ersetzt — Mandate 2) →
   dasselbe Modal.
3. Nicht-deployter Workspace [T] → BrowserRuntimeModal-Deploy-Fallback
   (bestehender Test, unverändert grün).

**Merge-Reparaturen (Parallel-Sessions-Kollisionen, im selben Zug behoben,
  auch zu deren Gunsten):** Konfliktmarker in HierarchySidebar.test.tsx und
  BACKLOG.md (Merge aus feat-workspace-multitenancy) aufgelöst — BEIDE
  Seiten gehalten; zurückgebliebene `scopeChips`-Referenz (FIX-2 hatte die
  Chips bewusst entfernt) und der DOPPELTE Scope-Regler (alter Top-Balken
  neben dem FIX-2-Bodenbalken) entfernt; der Multitenancy-WorkspaceSwitcher
  wanderte MIT in den (einzigen, unteren) Scope-Regler. Ergebnis: deren
  31 Sidebar-Tests + meine 8 sind zusammen grün.

**Ehrliche Off-Punkte (benannt, nicht verheimlicht):**
1. Live-Smoke am laufenden Stack: Operator-Aktion — Backend dafür frisch
   bauen (`make restart-backend`), dann Sidebar [T] / Detail-Page
   "Open Terminal" klicken.
2. Remote-Node-Workspaces (SSHTarget auf anderem Host): der exec läuft gegen
   das LOKALE Docker-Socket des Backends — die Meldung nennt den Knoten und
   sagt ehrlich, dass dieser Terminal nur Container auf dem lokalen Daemon
   erreicht (kein SSH, per Operator-Entscheidung).
3. Der Scope-Balken-Layoutkonflikt (top vs. bottom) ist im Working Tree
   behoben zugunsten der bereits committeten FIX-2-Tests (Balken unten).
