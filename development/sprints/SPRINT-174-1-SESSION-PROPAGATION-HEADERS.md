# SPRINT-174-1 — Session Propagation (X-JiMesh-Header)

**Stand:** 4.10.2026 (diese Session) · **BACKLOG:** `S174-1` · **Vorgänger-Sprint:**
`SPRINT-174-SESSIONS-REPLAY-TRACE-TAGGING.md` §2 (Header-Katalog, S. 49-60)

## 1. Warum

Der SPRINT-174-Entwurf führt 8 Propagations-Header. Im Code war **genau einer** davon real:

| Header | Quelle im Code (vorher) | Status |
|---|---|---|
| `X-JiMesh-Session-Id` | `auth/auth.go:843,921,1133` (Consumer-Key-Branch) | vorhanden |
| `X-JiMesh-Trace-ID` | nur als **Response**-Header der AI-Proxy-Entscheidung `ai/proxy.go:445,773` | fehlte als Request-Kontext |
| `X-JiMesh-Scope` | 0 Treffer (nur `X-JiMesh-Scope-Workspace-Id`, ein anderer Header) | fehlte |
| `X-JiMesh-VLAN` | 0 Treffer (Daten existieren: `store/project_vlans.go:60`) | fehlte |
| `X-JiMesh-Network` | 0 Treffer (Ableitung existiert: `network/vlan.go:91`) | fehlte |
| `X-JiMesh-Agent-ID` | 0 Treffer | **kein Quellfeld** (siehe §4) |
| `X-JiMesh-Git-Repo` | 0 Treffer | **kein Quellfeld** (siehe §4) |
| `X-JiMesh-Git-Commit` | 0 Treffer | **kein Quellfeld** (siehe §4) |

**Sicherheitsbefund (mitgeliefert):** Der Strip-Ingress-Block in `auth/auth.go:718-738`
kannte nur Key-Kind/Workspace/Session/Project + Identity-* + Scope-Workspace. Die 7 neuen
Propagations-Header **konnten vom Client gesetzt** und ungeprüft weitergegeben werden —
beim ersten Konsumenten, der sie liest (Network-Events, S174-4), wäre das Spoofing.
`StripIngress` ersetzt die 10 Einzel-`Del`-Aufrufe: eine Liste, eine Implementierung.

## 2. Design

### 2.1 Ingress (Sicherheit)

Neu: `src/backend/internal/auth/propagation.go`

* `Header*`-Konstanten für den kompletten Satz (eine Schreibweise für Strip-Liste AND Leser).
* `StripIngress(http.Header)` — löscht **alle** INGRESS-DERIVED-ONLY-Header, inklusive der
  7 neuen. Aufgerufen an erster Stelle in `Handlers.Middleware`, ersetzt die 10 `r.Header.Del`.
* `NewTraceID()` — 16 Bytes `crypto/rand` → 32 Hex-Chars (W3C `trace-id`-Form), nie All-Zero.
* `SetDerived(h, key, value)` — setzt nur, wenn leer: der Handler, der den echten Wert weiß,
  wird nie von einer späteren generischen Stempelung überschrieben.

### 2.2 Stempelung (server-seitig, pro Request)

In `Handlers.Middleware`, **vor** den Auth-Branches:

```go
StripIngress(r.Header)
traceID := NewTraceID()
r.Header.Set(HeaderTraceID, traceID)   // Anfrage + Handler + Egress sehen denselben
w.Header().Set(HeaderTraceID, traceID) // Antwort: Fehlerreport ↔ Gateway-Log ohne Session-Dump
```

`X-JiMesh-Scope` nur, wo der Scope **bekannt** ist (nie geraten):

| Fall | Wert | Stelle |
|---|---|---|
| Workspace-Scope umgestellt (SPRINT-138) | `workspace` | `auth.go` nach `X-JiMesh-Scope-Workspace-Id` |
| Consumer-Key mit Workspace-Bindung | `workspace` | Key-Branch |
| Consumer-Key mit Projekt-Bindung | `project` | Key-Branch |
| sonst | *nicht gesetzt* | — |

Leeres Feld ist die ehrliche Antwort; „global" würde eine Berechtigung behaupten, die der
Request-Router nicht kennt.

### 2.3 Egress (wo die Header wirklich ankommen)

`deploy/tunnel.go → handleTunnelProxy` ist der einzige Weg, auf dem ein Dashboard-Request
in das Workspace-Netz (Containers/Apps) hineinläuft — `network/tunnel.go` baut dazu den
SSH-Reverse-Proxy. Vor `proxy.ServeHTTP(w, r)`:

* `X-JiMesh-Project-Id` = `{id}` aus dem Pfad (Pfad-Wert, kein Trust-Statement),
* `X-JiMesh-VLAN` = `store.GetProjectVLAN(projectID)` → `vlan_id`,
* `X-JiMesh-Network` = `network.VLANDockerNetworkName(projectID)` — **nur bei vorhandener
  VLAN-Row**: ohne Row existiert dieses Docker-Netz nicht, also kein Header statt erdachtem Namen.

Session/Trace/Scope sind bereits auf `r` (Middleware) und laufen mit.

## 3. Akzeptanz (echte Befehle)

```bash
# 1) Spoofing tot: Client-Header überleben den Middleware nicht
curl -si -H 'X-JiMesh-Trace-ID: 11111111111111111111111111111111' \
     -H 'X-JiMesh-VLAN: 666' -H 'X-JiMesh-Git-Repo: https://evil' \
     -H "Cookie: jimesh_session=$SESSION" http://127.0.0.1:8099/api/health
#   → Antwort trägt EINEN Server-Trace (anders als 1111…), kein 666-VLAN im Handler
# 2) Antwort echo
curl -si -H "Cookie: jimesh_session=$SESSION" http://127.0.0.1:8099/api/health \
  | grep -i x-jimesh-trace-id          # 32 Hex-Chars
# 3) Downstream erreicht
curl -si -H "Cookie: jimesh_session=$SESSION" \
  "http://127.0.0.1:8099/api/projects/$PROJ/tunnel/8080/" \
  | grep -i 'x-jimesh-\(project\|vlan\|network\)'
# 4) Tests
make go-vet && make go-test            # 27 Pakete, 0 FAIL
```

## 4. Bewusst NICHT gebaut (ehrliche Grenze)

| Header | Grund |
|---|---|
| `X-JiMesh-Agent-ID` | kein Agent-Feld im Code: `store.ConsumerKeyRow` (Sprint-35-Binding) trägt Kind/Workspace/Session, kein Agent; `SubagentRow` existiert, ist aber nie Egress-Quelle (kein Agent-Proxy) |
| `X-JiMesh-Git-Repo` / `-Git-Commit` | **0 Treffer** für `git_repo`/`GitRepo`/`git_commit` im gesamten `internal/store`; `store.go:1867` kennt nur den Git-**Token** (vault, kein Repo-Pfad) |

Beide Namen sind als Konstanten angelegt und von `SetDerived`/`StripIngress` abgedeckt —
sobald ein Feld existiert (S170-6 Onboarding-Anbindung), ist das Setzen eine Zeile.
**Kein Wert wird erfunden** (Mandate 2).

## 5. Mitgefundener, hier NICHT entschiedener Befund

`deploy/deploy.go:83` registriert `/api/projects/{id}/tunnel/{port}` **ohne
Membership-Gate** — `handleTunnelProxy` prüft nur die Session (Middleware), nicht, ob der
Caller dem Projekt gehört. `security.VaultProjectDenial` ist dafür **falsch**
(Vault-spezifisch: `jimesh-dev`-Rolle + Developer-Grant, `security/vault.go:199-230`) und
würde legitime App-Aufrufe brechen. Welche Regel für „Projekt ansehen" gilt, ist eine
Operator-Entscheidung → eigene Zeile `S181-24`, hier nur dokumentiert (Mandate 6: kein
Still-Schweigen über einen Fund).

## 6. Verifikation (diese Sitzung, echter Output)

### 6.1 Formatierung (nur eigene Dateien)

```
$ docker run ... golang:latest sh -c "gofmt -l internal/auth/propagation.go \
    internal/auth/propagation_test.go internal/deploy/tunnel_propagation_test.go internal/deploy/tunnel.go"
RC=0   (leere Ausgabe = alle vier formatiert)
```

`internal/auth/auth.go` war bereits bei `HEAD` nicht gofmt-sauber (vorhandener
Zustand, bewusst nicht angerührt — die geänderten Zeilen selbst sind
gofmt-konform; ein Formatieren der ganzen Datei würde fremden Diff erzeugen).

### 6.2 `go vet` + vollständige Testsuite (echte Exit-Codes, kein Pipeline-Status)

```
$ make go-vet > /tmp/vet2.log 2>&1; echo "VET_RC=$?"
VET_RC=0
$ make go-test > /tmp/gotest2.log 2>&1; echo "GOTEST_RC=$?"
GOTEST_RC=0
$ grep -c '^FAIL' /tmp/gotest2.log
0
$ grep -E 'internal/(auth|deploy|gateway|store)' /tmp/gotest2.log
ok  	github.com/ji-podhead/jimesh/backend/internal/auth	2.669s
ok  	github.com/ji-podhead/jimesh/backend/internal/deploy	0.491s
ok  	github.com/ji-podhead/jimesh/backend/internal/gateway	3.127s
ok  	github.com/ji-podhead/jimesh/backend/internal/store	2.398s
```

`make go-test` läuft gegen die Einweg-Datenbank `jimesh_test` (Makefile-Ziel
`go-test`, danach `DROP DATABASE`) — 27 Pakete, 0 FAIL. Die Exit-Codes stehen
hier bewusst als Variablen-Zuweisung vor einem Separator: ein `make … | tail`
würde den Status von `tail` liefern, nicht den von `make` (in dieser Sitzung
einmal so verwechselt, deshalb hier und in §6.3 bewusst abgesichert).

### 6.3 Neue Tests einzeln, `-v` (was wirklich lief, nicht „ok"-allein)

```
$ go test ./internal/auth/ -run 'Propagation|TraceID|StampConsumer|StripIngress' -v
=== RUN   TestNewTraceIDIsW3CShapedAndUnique
--- PASS: TestNewTraceIDIsW3CShapedAndUnique (0.00s)
=== RUN   TestStripIngressRemovesEveryServerDerivedHeader
--- PASS: TestStripIngressRemovesEveryServerDerivedHeader (0.00s)
=== RUN   TestStampConsumerKeyIdentityBindingScope
    ... 4 Subtests (project-bound key / workspace-bound service key /
        bound to both reports the wider workspace / unbound key claims no scope)
--- PASS: TestStampConsumerKeyIdentityBindingScope (0.00s)
=== RUN   TestMiddlewareStampsTraceIDAndDropsClientSpoof
--- PASS: TestMiddlewareStampsTraceIDAndDropsClientSpoof (0.00s)
=== RUN   TestMiddlewareEchoesTraceIDOnDenial
--- PASS: TestMiddlewareEchoesTraceIDOnDenial (0.00s)

$ go test ./internal/auth/ -run 'WorkspaceSwitchStampsScope' -v   # mit echter DB
=== RUN   TestMiddlewareWorkspaceSwitchStampsScope
--- PASS: TestMiddlewareWorkspaceSwitchStampsScope (0.15s)

$ go test ./internal/deploy/ -run 'StampProjectPropagation' -v
--- PASS: TestStampProjectPropagationWithVLANRow (0.00s)
--- PASS: TestStampProjectPropagationWithoutVLANRowSaysNothing/no_row (0.00s)
--- PASS: TestStampProjectPropagationWithoutVLANRowSaysNothing/lookup_failed (0.00s)
--- PASS: TestStampProjectPropagationNeverOverwritesMiddlewareValues (0.00s)
--- PASS: TestStampProjectPropagationEmptyProjectIDStampsNothing (0.00s)
```

Ohne erreichbares Postgres meldet `TestMiddlewareWorkspaceSwitchStampsScope`
ehrlich `SKIP` statt `PASS` (Mandate 6); der gezeigte `PASS`-Lauf lief mit
`--network jimesh-net` und `DATABASE_URL=…@jimesh-postgres:5432/jimesh_test`.

### 6.4 Red-first an der VERKABELUNG (nicht nur am Helper)

Die Helper-Tests prüfen `stampProjectPropagation` selbst — ob der Handler ihn
**aufruft**, beweisen sie nicht. Das wurde nicht behauptet, sondern gemessen:

```
$ # Aufrufzeile in handleTunnelProxy gelöscht, dann:
$ go test ./internal/deploy/ -run "StampProjectPropagation"
ok  	github.com/ji-podhead/jimesh/backend/internal/deploy	0.004s
```

Suite grün, ohne dass gestempelt wird → die Call-Site war ungedeckt. Zwei
Konsequenzen, beide umgesetzt:

1. **Der Stempel wanderte vor den SSH-Dial.** Er lag zuletzt nach
   `network.TunnelPool.GetOrCreate`, das SSH *eager* dialt
   (`network/tunnel.go:145`) — ein toter Dial hätte die Header schlicht
   nie gesetzt. Jetzt steht er direkt nach der Pfad-Auflösung (nach der
   400-Sperre für leere ids).
2. **Ein Test durch die ECHTE Routen-Registrierung**
   (`TestTunnelProxyStampsProjectContextBeforeTheDial`, baut den Mux über
   `Handlers.Register`, denselben Aufruf, den `gateway.New` macht):

```
$ go test ./internal/deploy/ -run "TestTunnelProxyStamps..." -v   # Stempel da
--- PASS: TestTunnelProxyStampsProjectContextBeforeTheDial (0.13s)

$ # … Aufruf wieder entfernt (simulierter Regress):
    tunnel_propagation_test.go:143: X-JiMesh-Project-Id = "" after the handler
    ran, want the path's "prj-tunnel-stamp-1791099694297553180" — the stamp
    never reached the request
--- FAIL: TestTunnelProxyStampsProjectContextBeforeTheDial (0.03s)

$ # … wiederhergestellt:
--- PASS: TestTunnelProxyStampsProjectContextBeforeTheDial (0.03s)
```

Der Test zeigt 502 (Dial gegen 127.0.0.1:1, nichts lauscht), prüft aber die
Header am **vom Test besessenen Request** — dort bleiben sie lesbar, auch wenn
das Proxy nie zustande kommt. Ausdrücklich mitgeprüft: ohne VLAN-Row kein
`X-JiMesh-VLAN`/`X-JiMesh-Network` (erfundene Tags fallen sofort auf), und
ohne Middleware keinen Session-Header (der Strip gehört ins Middleware, nicht
hier — sonst wäre ein Client-Spoof nicht mehr vom Server-Stempel zu
unterscheiden).

### 6.5 Was NICHT verifiziert ist (ehrliche Grenze)

* **Echtzeit-Trace-ID im laufenden Stack**: die Header-Auslieferung am
  Gateway ist Unit-Test (Middleware/Handler), kein End-to-End-Lauf gegen einen
  laufenden Container — dafür bräuchte man einen Deploy mit aktivem Tunnel und
  einen Gegenspieler, der die Header abfängt.
* **Verbraucher-Seite**: was `sshd`/`sshd_config` mit `X-JiMesh-Trace-ID`
  anfängt, ist bewusst nicht belegt (Abschnitt 4: keine SSHD-Präfixweitergabe
  gebaut).
* **Sichtbarkeit in Loki/OTel** ist in Abschnitt 4 als späterer Schritt
  notiert, hier nicht behauptet.
