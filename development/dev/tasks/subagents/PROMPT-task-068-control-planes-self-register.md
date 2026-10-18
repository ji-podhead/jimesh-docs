# TASK-068 — Control-Planes-Registry: Self-Register des lokalen JiMesh-Hosts

**Status:** ✅ abgeschlossen (13.9.2026, Branch `task/068-control-planes-self-register`, Worktree `../jimesh-worktrees/task-068-control-planes-self-register` — Bericht unten) | **Quelle:** Operator-Findung (die control_planes-Tabelle zeigt nur was der Operator manuell eingibt — sie erkennt sich selbst nicht)

## Fundstellen
- src/backend/internal/provision/ (TASK-060: Provider-Interface, SSH implementiert)
- src/backend/internal/store/control_planes.go (Tabelle + CRUD)
- internal/gateway/control_planes.go (Routen)

## Aufgabe
- Bei Backend-Startup (oder lazy beim ersten GET /api/control-planes): stelle sicher dass GENAU EINE row existiert die den lokalen JiMesh-Host repräsentiert
- NEUER TYPE "local" oder "self" (als echter, eigener Typ im type-enum, kein Fake-SSH)
- Status-Probe (kernel/docker/container) gegen den lokalen Host (gleiche Sonden wie TASK-060 für SSH, nur ohne SSH — direkt local)
- PROTECTED: DELETE dieses self-Eintrags verweigern („du kannst nicht deinen eigenen Control-Plane löschen")
- Frontend ControlPlanesPage zeigt ihn als „local" badge (deutlich distinkt zu manuell hinzugefügten)

- API_DOCS + SPRINT-38-CONTROL-PLANE-REGISTRY.md updaten
- GIT: explizite Pfade, kein -A, NICHT pushen

## Ergebnis

## Geändert
- `src/backend/internal/provision/provider.go:40` — `TypeLocal = "local"` als echter Typ im type-enum (kein Fake-SSH)
- `src/backend/internal/provision/local.go` (NEU, 142 Z.) — `LocalProvider`: echte lokale Sonden ohne SSH (`:54` Status: uname/docker-Version/Container-Zahl; `:63/109` Provision-PreFlight: docker-daemon/runsc/df — prüft, installiert nie), Deploy/Undeploy ehrlich `ErrNotImplemented` → 501 mit Verweis auf den ssh-Provider
- `src/backend/internal/store/control_planes.go` — `:62` `ControlPlaneTypeLocal` (Store-Spiegel, Importrichtung begründet), `:93` partieller Unique-Index `idx_control_planes_local` = DB-erzwungenes „GENAU EINE", `:185` `GetLocalControlPlane` (Typ-Suche, nil/nil-Sonde)
- `src/backend/internal/gateway/control_planes.go` — `:65` LocalProvider in der Registry, `:119/173` lazy Self-Register beim ersten GET (`ensureLocalControlPlane`, Wahl lazy>boot im Kommentar begründet: Typ-Vokabular, Selbstheilung, keine Boot-Kopplung; race-fest via Index), `:232` Create type local → 400 reserved, `:290` Edit der Self-Row → 409 system-owned, `:336` DELETE der Self-Row → 409 „the registry must keep knowing itself", `:655` Alias auf `cp:<self>` → 400 ohne „edit it first"-Deadend
- `src/frontend/src/views/ControlPlanesPage.tsx` — `:131/133` LOCAL_PLANE_TYPE/isLocalPlane, `:527-535` „local"-Badge (cyan, HardDrive-Icon — deutlich distinkt zum Stub-Badge), `:602/613` Edit/Delete disabled mit Grund im Title, `:398` `local` aus dem Create-Picker gefiltert (Backend-reserviert)
- i18n: `controlPlanes.localBadge` + `localProtectedTitle` in en+de per Hand, 59 Locales backgefüllt (Backfill-Script), `check:i18n` grün (60 Locales / 1906 Keys)
- Tests: `provision/local_test.go` (NEU, 4 Tests — echte Sonden, beide Provision-Verdikte vertraglich geprüft), `store/control_planes_test.go:134` `TestControlPlaneLocalSingleton` (zweiter type-local-Insert scheitert am Singleton-Index)
- Docs: `API_DOCS.md` (alle berührten Routen-Zeilen + TASK-068-Absatz zur Self-Row), `docs/sprints/SPRINT-38-CONTROL-PLANE-REGISTRY.md` (TASK-068-Sektion mit Plan+Verifikation)

## Build/Test-Status (ehrlich)
- `CGO_ENABLED=0 go build ./...` im golang:latest-Container (Worktree-Mount) → ✓
- `go vet ./...` → ✓ (kompletter Baum; der alte Deploy-Vet-Bug ist seit TASK-071-Commit 90b2c71 weg)
- `gofmt -l` über die 4 Scope-Dateien → leer (2 Fundstellen gefixt)
- `go test ./internal/provision/... ./internal/store/...` gegen Throwaway-DB → `ok` × 2; alle 6 neuen/berührten Tests mit `-v -count=1` einzeln gesehen, kein SKIP
- Live-Curl gegen die Worktree-Binary (docker:27-cli + Socket-Mount, `-p 127.0.0.1:39999:3010` — Mandat 12, Throwaway-DB `jimesh_live068`, danach gedroppt): Self-Register beim ersten GET ✓, kein Double-Create ✓, Status-Sonde ECHT (kernel `Linux 6.14.0-37-generic`, docker `29.6.1`, 17 Container) ✓, Provision `docker-daemon-ok`/`runsc-missing`/df ✓, DELETE 409 ✓, Create type local 400 ✓, Edit 409 ✓, Deploy 501 ✓, Alias 400 ✓
- Frontend: `eslint` 0 Befunde; `tsc --noEmit` 205 Fehler = exakt der vorbefundene Bestand (vgl. SPRINT-38 WP5), keiner in ControlPlanesPage; `npm run check:i18n` ✓
- NICHT gelaufen: Live-Test gegen den Operator-Stack 127.0.0.1:19091 (Compose mountet den Hauptcheckout, nicht den Worktree) — nach dem Merge: `make restart-backend`, dann ersten GET /api/control-planes machen

## Abweichungen von der Task-Vorgabe
- Der Typ heißt `local` (Task erlaubte „local" ODER „self") — `local` gewinnt, weil die Tabelle ein Typ-Vokabular ist und `self` ein Pronomen wäre.
- „UPDATE-Status nur vom Lifecycle": unverändert bereits garantiert (POST schreibt status nie — TASK-060-Design); zusätzlich verweigert der Edit-Pfad die Self-Row GANZ (409), weil auch Endpoint/Typ system-gehören.
- Eine Vorlauf-Phase dieser Aufgabe hatte uncommitted im Hauptcheckout begonnen (Backend-Teil). Adoption per Patch in den Worktree — saubere Trennung nach WORKTREE-PROTOCOL, kein Konflikt mit Parallel-Sessions (users/vault/security-Locale-Diffs blieben unberührt).

## Offene Fragen für den Reviewer
1. Deploy auf die lokale Maschine bleibt bewusst beim ssh-Provider (Loopback-ssh-Zeile fährt dieselbe Pipeline) — soll `local` jemals selbst deployen können? (Kostet eine Injektions-Schnittstelle im Provider-Interface, da provision nicht deploy importieren darf.)
2. Der Live-Proof lief im docker:27-cli-Container (echter Socket, echte Fakten); auf dem Operator-Stack ist dasselbe Binary nach `make restart-backend` aktiv — einmal gegensehen?
3. Locale-Merge: 60 i18n-Dateien haben je 2 neue Keys; TASK-066-Parallel-Arbeit ändert dieselben Dateien (vault/security-Keys) — JSON-Merge-Konflikte sind möglich, aber key-disjunkt.

## Branch
`task/068-control-planes-self-register`, Commits: 1 (explizite Pfade, kein -A, nicht gepusht)
