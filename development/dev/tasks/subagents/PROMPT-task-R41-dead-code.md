# TASK-R41 — Dead Code Eliminierung (Frontend + Backend)

Rolle: Du arbeitest im JiMesh-Repo unter den Operator-Mandaten:
- M1 Domänenmodell respektieren (Project → SSH Node → Workspace → Apps).
- M2 No Mock — niemals Erfolg vortäuschen; Fakes werden entfernt, nicht behoben.
- M3 Ehrlichkeit — UI zeigt nur servergestreamte Zustände; nichts clientseitig Erfundenes.
- M4 Doku — API_DOCS, Sprint-File, Task-File im selben Commit aktualisieren.
- M6 Live-Verify — Done heißt verifiziert: echte Requests gegen den laufenden Stack.

## KONTEXT (R39/R40-Audit-Befunde)
- `src/frontend/src/components/DiscoveryStatus.tsx` (460 Zeilen): nicht importiert, ruft 5 Routen auf, die alle 404 liefern (`/api/discovery/new`, `/auto-add`, `/scheduler/start` etc.).
- Weitere nicht verlinkte Komponenten: `getting-started.tsx`, `peak-hours-controls.tsx`, `custom-weights-popover.tsx`.
- `src/backend/internal/ai/entropy_cascade.go` (`EntropyCascadeRouter`): zweiter Router-Entwurf (Sliding-Window Logprobs-Entropy), im gesamten Backend nirgends aufgerufen.

## AUFGABE
1. Lösche `DiscoveryStatus.tsx`, `getting-started.tsx`, `peak-hours-controls.tsx`, `custom-weights-popover.tsx` — prüfe VOR jedem Löschen per `grep`, dass die Komponente wirklich nirgends importiert wird (Import-Graf dokumentieren).
2. `EntropyCascadeRouter`: lösche ihn, wenn wirklich kein Call-Site existiert (grep über das gesamte Backend dokumentieren). Falls er als Design-Reserve gelten soll: stattdessen als ehrlichen Deprecated-Kommentar markieren + in API_DOCS als "nicht verdrahtet" dokumentieren — entscheide dich für EINE Variante und begründe im Task-File.
3. Prüfe nach dem Löschen: Build/Typecheck des Frontends ohne tote Imports, `go build` ohne Referenzen auf `entropy_cascade`.
4. Keine funktionalen Änderungen — reine Dead-Code-Entfernung, kein Refactoring angrenzender Dateien.

## ACCEPTANCE
- Alle 4 Frontend-Komponenten entfernt, grep-Import-Nachweise im Task-File.
- EntropyCascadeRouter: gelöscht ODER als Deprecated dokumentiert (Begründung).
- `make go-build` ✓ · `go-vet` ✓ · `gofmt` ✓ · Frontend-Typecheck ✓.
- `grep "DiscoveryStatus|getting-started|peak-hours-controls|custom-weights"` → leer.
- Keine Routing-Änderungen, keine UI-Änderungen außer der Löschungen.

## LIVE-VERIFY (Mandat 6)
- Frontend bootet im Container ohne Console-Fehler durch fehlende Komponenten.
- `GET /` (App-Shell) 200 + Tabs laden (es gab zuvor versteckte Import-Ketten).

## DOKU
- API_DOCS (falls EntropyCascade-Doku entfernt/angepasst wird), Sprint-File-Eintrag, Task-File mit Import-Graf + grep-Evidence.
- ABSCHLUSSBERICHT: Commit-Hash, gelöschte Dateien + Zeilen, grep-Evidence, Build-Checks, Live-Verify-Ergebnis.
