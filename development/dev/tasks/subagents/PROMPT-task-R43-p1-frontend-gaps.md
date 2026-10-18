# TASK-R43 — E-Priority Rule-Management-UI + Headscale-Proxy-Routen (/networks)

Rolle: Operator-Mandate M1–M7 (wie TASK-R41).

## KONTEXT (R39/R40-Audit-Befunde)
- `NetworksPage` lief ins 404-Dreigestirn (`/api/networks/users`, `/nodes`, `/preauthkeys`) — das Backend hat diese Headscale-Proxy-Routen inzwischen, aber die Seite ist nicht fest verdrahtet (Empty-States statt Daten).
- Firewall/E-Priority: die Priority-Regel-Verwaltung hat kein UI-Management — die Regeln existieren im Backend (Routing-Entscheidungen), aber es gibt keine UI, sie zu sehen/zu priorisieren.

## AUFGABE
1. `NetworksPage` fest verdrahten: die 3 Headscale-Proxy-Routen (users, nodes, preauthkeys) an die echten Backend-Endpoints koppeln — Daten anzeigen, Fehler laut (kein Empty-State-Daten-Ersatz). Lade-/Fehler-/Leer-Zustände strikt vom Server-Response ableiten.
2. E-Priority Rule-Management-UI: Liste der aktiven Priority-Regeln (Endpoint: bestehende Firewall/Egress-Rule-API), Priorität ändern (Reihenfolge = Entscheidungsreihenfolge), Regel an/aus, Änderungen persistent via Backend. Kein lokales Shadow-Model.
3. Beide Seiten folgen M3: Zustände kommen vom Server, nicht aus Client-Annahmen. Kein Mock-Datum, keine Demo-Arrays.

## ACCEPTANCE
- `NetworksPage`: 3 Routen live angebunden; bei Backend-Down sichtbarer Fehler (kein stiller Empty-State).
- E-Priority-UI: Reihenfolge-Änderung persistiert (Reload zeigt sie), ein/aus persistiert, Backend-Response ist die Quelle.
- `make go-build` ✓ · `go-vet` ✓ · `gofmt` ✓ · Frontend-Typecheck ✓.

## LIVE-VERIFY (Mandat 6)
- `curl` auf die 3 Proxy-Routen → 200 mit echtem Headscale-Datenbestand; `NetworksPage` rendert sie.
- E-Priority: Regel verschieben → Reload → Position bleibt; Routing-Verhalten ändert sich entsprechend (Smoke gegen einen Test-Endpoint).

## DOKU
- API_DOCS (Proxy-Routen + Priority-API), Sprint-File, Task-File.
- ABSCHLUSSBERICHT: Commit-Hash, Screenshots/Curl-Evidence, Live-Verify.
