# TASK-019 — Egress-Allowlist + Socket-Guard in den Deploy-Pfad verdrahten

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/019-wire-egress-socketguard` · **Speist:** Sprint 20 WP5/TASK-015 Deferred-Wiring

## Kontext

Zwei fertige, getestete Bausteine liegen bereits in `main`, aber unverdrahtet:

1. **`internal/network/egress.go`** (TASK-012) — `EgressRuleset.Render()` erzeugt
   nftables-Regeln für Default-Deny-Egress. `ResolveRegistries()` löst die
   Registry-Domains auf. Nichts davon wird beim Deploy aufgerufen.
2. **`cmd/socket-guard/`** (TASK-015) — Reverse-Proxy vor `docker.sock`, blockt
   gefährliche Binds im `container/create`-Body. Existiert als eigenständiges
   Binary + Dockerfile, wird beim Deploy nicht gestartet.

Beide sollen jetzt in `src/backend/internal/gateway/projects_ssh.go`
(`executeDeploy`, dieselbe Funktion, in der Port-Bindings und Docker-Socket-Mount
schon passieren) angeschlossen werden.

## Auftrag

### 1. Egress-Allowlist

Nach dem Deploy-Schritt, der den Workspace-Container startet (dort wo heute
`extraVol` für den Docker-Socket-Mount gebaut wird — such nach
`if req.DockerSock`):

- Rufe `network.ResolveRegistries(ctx, network.DefaultRegistryDomains)` auf,
  um die aktuellen Registry-IPs zu bekommen.
- Baue ein `network.EgressRuleset` mit: `GatewayIP` (die vorhandene
  `gatewayIPFallback()`), `GitRemoteHost` (aus der Projekt-URL/dem
  `cloneURL`, auflösen zu einer IP), `RegistryIPs` (von oben).
- `Render()` aufrufen, das Ergebnis über SSH (lokal: über den bestehenden
  Alpine-Helper-Container-Pfad, remote: direkt) mit `nft -f -` anwenden.
- `NetworkInterface`: für lokale Deploys das Docker-Bridge-Interface des
  Workspace-Containers ermitteln (`docker network inspect` o. ä. — prüfe
  den pragmatischsten Weg, erfinde nichts). Für Remote-SSH-Deploys: prüfe,
  ob das überhaupt sauber geht (siehe E9 in `docs/tasks/TASK-011-*.md` —
  das ist möglicherweise dieselbe offene Frage). Falls nicht sauber lösbar:
  im Report als Grenze dokumentieren, nicht erzwingen.
- Undeploy muss die Regeln wieder entfernen (`nft delete table inet
  jimesh_egress_<interface>`).

### 2. Socket-Guard statt Raw-Mount

Wo heute steht:
```go
if req.DockerSock {
    extraVol += " -v /var/run/docker.sock:/var/run/docker.sock"
}
```
- Stattdessen: `socket-guard` als eigenen Sidecar-Container im selben
  Docker-Netz wie der Workspace starten (`docker run -d --name
  jimesh-socket-guard-<projID> -v /var/run/docker.sock:/var/run/docker.sock
  <image>`), der Workspace-Container bekommt `-e
  DOCKER_HOST=tcp://jimesh-socket-guard-<projID>:2376` statt des direkten
  Socket-Mounts.
- Das `socket-guard`-Image muss gebaut und irgendwo verfügbar sein — prüfe,
  ob ein lokaler Build-Schritt reicht (`docker build -f
  cmd/socket-guard/Dockerfile -t jimesh-socket-guard src/backend/`) oder ob
  das in eine Registry gehört. Für lokale Deploys reicht ein lokaler Build;
  für Remote-SSH-Deploys muss das Image auf den Zielhost (Build dort, oder
  Push in eine erreichbare Registry — recherchiere den pragmatischsten Weg
  für dieses Repo, erfinde nichts).
- Undeploy muss den `socket-guard`-Container mit stoppen/entfernen.

## Nicht tun

- Keine neuen Go-Dependencies.
- Nicht versuchen, das Egress-Refresh-Intervall (periodischer Neu-Resolve)
  als laufenden Scheduler zu bauen — einmaliges Anwenden beim Deploy reicht
  für diese Task. Der Refresh-Loop ist als eigener offener Punkt in TASK-012
  vermerkt.
- Keine Änderung an der Docker-Socket-Proxy-Logik selbst (`cmd/socket-guard/`)
  — nur die Integration in den Deploy-Pfad.

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Ein Test-Deploy mit `docker_sock=true`: Workspace-Container hat keinen
  direkten Socket-Mount mehr, `DOCKER_HOST` zeigt auf den Sidecar.
- Ein Test-Deploy: nftables-Regeln sind nach dem Deploy aktiv (`nft list
  ruleset` zeigt die `jimesh_egress_*`-Tabelle), Undeploy entfernt sie
  wieder.
- Report nennt ehrlich, was für Remote-SSH-Deploys tatsächlich funktioniert
  hat vs. was eine dokumentierte Grenze blieb.

## Ergebnis

_(noch nicht begonnen)_
