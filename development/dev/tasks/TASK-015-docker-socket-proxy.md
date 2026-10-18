# TASK-015 — Docker-Socket-Proxy (restricted allowlist statt Raw-Mount)

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen,
> `MANDATES.md` Mandat 5 gelesen (bindend, siehe unten)
> **Branch:** `task/015-docker-socket-proxy` · **Speist:** saits-Review Top-5 #5
> (TASK-004/005), Sprint 19 Root-Cause

## Warum diese Task Priorität hat

Das ist **kein Hypothetisches** — es ist der exakte Angriffsvektor vom Incident vom
5. September 2026 (`docs/sprints/SPRINT-19-SECURITY-INCIDENT-KLAF.md`): Ein
kompromittierter Agent nutzte einen gemounteten `docker.sock`, um über die
Container-Create-API einen Container mit `Binds: ["/:/host"]` zu starten und einen
SSH-Key in `/root/.ssh/authorized_keys` zu schreiben. Der Versuch scheiterte nur,
weil das verwendete Image zufällig unter einem unprivilegierten User lief — **kein
Kontrollmechanismus hat das verhindert, nur Zufall.**

**Fundstelle im aktuellen Code** (verifiziert):
`src/backend/internal/gateway/projects_ssh.go:532`
```go
if req.DockerSock {
    extraVol += " -v /var/run/docker.sock:/var/run/docker.sock"
}
```
Voller Raw-Mount, opt-in über `req.DockerSock` / `projects.docker_sock`
(`store.go:223`). Wer immer das anfordert, bekommt uneingeschränkten Docker-Zugriff
im Container — inklusive Container-Create mit beliebigen Host-Binds.

## ⚠️ Bindende Randbedingung — Mandat 5

`MANDATES.md` §5 sagt wörtlich: „**Docker socket mount must actually work** when
requested — the container must be able to build and run containers." Diese Task
**darf die Funktion nicht kaputt machen** — ein Projekt, das Docker-in-Docker für
CI/Build-Zwecke braucht, muss das weiterhin können. Das Ziel ist **einschränken**,
nicht **entfernen**.

## Auftrag

1. **Referenzmuster (saits-Review, TASK-004/005):** ein Docker-Socket-Proxy mit
   restricted allowlist (nur `CONTAINERS`, `EXEC`, `POST`-Methoden wie im Review
   beschrieben) statt direktem Socket-Mount. Prüfe, ob ein vorhandenes,
   produktionsreifes Open-Source-Projekt das bereits leistet (z. B.
   `docker-socket-proxy`-artige Tools — **recherchiere den aktuellen Stand,
   erfinde keinen Namen/keine Version, prüfe Lizenz und Wartungsstand**), statt
   selbst einen Proxy zu schreiben. Mandat 7 („keine Dependency ohne Not") gilt
   sinngemäß auch für mitgelieferte Sidecar-Images — ein fertiges, gepflegtes
   Tool ist hier vermutlich der bessere Weg als Eigenbau.
2. **Konkrete Einschränkung, die den Incident-Vektor schließt:** Container-Create
   MUSS möglich bleiben (Build/Run), aber **`Binds`/`Mounts`, die auf den
   Host-Root oder auf sicherheitskritische Pfade zeigen (`/`, `/etc`, `/root`,
   `/var/run/docker.sock` selbst), müssen blockiert werden.** Das ist der
   entscheidende Unterschied zum reinen "alles oder nichts"-Mount.
3. **Integration in den Deploy-Pfad:** Statt `-v /var/run/docker.sock:/var/run/docker.sock`
   direkt zu mounten (Zeile 532), den Proxy als Sidecar im selben Docker-Netz
   starten und den Agent-Container auf `DOCKER_HOST=tcp://<proxy>:2375`
   (oder den vom gewählten Proxy-Tool vorgesehenen Mechanismus) verweisen statt
   auf den echten Socket.
4. **Rückwärtskompatibilität:** Bestehende Projekte mit `docker_sock=true` in der
   DB müssen beim nächsten Deploy automatisch auf den Proxy-Pfad migrieren, nicht
   manuell umgestellt werden müssen.
5. **Audit-Log:** Jede über den Proxy geblockte Anfrage (z. B. ein Bind-Versuch auf
   `/`) sollte sichtbar geloggt werden — das ist das Frühwarnsignal, das beim
   echten Incident gefehlt hat.

## Nicht tun

- Den Docker-Socket-Zugriff nicht komplett verbieten — das bricht Mandat 5 und
  legitime CI/Build-Workflows.
- Keine neue schwere Abhängigkeit im Go-Backend selbst — der Proxy läuft als
  eigener Container/Sidecar, nicht als Go-Package.
- Nicht versuchen, gVisor/Kata hier mit einzubauen — das ist eine andere, spätere
  Entscheidung (Sprint 20 Isolationsstufen-Diskussion), hier geht es nur um den
  Socket-Zugriff selbst.

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Ein Test-Container mit aktiviertem `docker_sock` kann weiterhin
  `docker build`/`docker run` für normale Zwecke ausführen (falls im Worktree
  testbar).
- Ein simulierter Angriffsversuch (Container-Create mit `Binds: ["/:/host"]`,
  analog zum Incident-Payload aus Sprint 19) wird vom Proxy abgelehnt, nicht vom
  Zufall des Image-Users.
- Report nennt explizit: welches Proxy-Tool gewählt wurde, warum, und welche
  Einschränkung genau die Host-Bind-Kategorie blockiert.

## Ergebnis (Claude, 6.9.2026 — Recherche abgeschlossen, Implementierung offen)

**Zwei reale Kandidaten geprüft, beide verworfen — mit Begründung, nicht geraten:**

1. **Tecnativa `docker-socket-proxy`** (README verifiziert,
   github.com/Tecnativa/docker-socket-proxy). HAProxy-basiert, filtert
   ausschließlich nach API-Sektion/Methode (`CONTAINERS`, `POST` an/aus als
   ganze Blöcke). **Kann den JSON-Body eines `POST /containers/create` nicht
   inspizieren** — aktiviert man `CONTAINERS`+`POST` (nötig für Mandat 5:
   "muss tatsächlich funktionieren"), geht `Binds: ["/:/host"]` unverändert
   durch. Löst das Problem nicht, das die Task adressieren soll.
2. **`opa-docker-authz`** (github.com/open-policy-agent/opa-docker-authz,
   verifiziert: nicht archiviert, letzter Push 25.6.2026, 19 offene Issues —
   Wartungsstand ok). Technisch korrekt: Docker-Authorization-Plugin, sieht
   den vollen Request inkl. `Binds`/`Mounts`, Policy in Rego. **Aber**: ist ein
   **Daemon-Plugin**, braucht TLS auf dem Docker-Daemon des Zielhosts,
   `daemon.json`-Änderung, Daemon-`HUP`/Neustart. Das ist ein
   Host-Bootstrap-Eingriff auf **jedem** Remote-Node (nicht nur lokal), und die
   Policy gilt global für den ganzen Daemon — nicht pro Workspace, wie
   `projects.docker_sock` es heute vorsieht (Opt-in pro Projekt).

**Warum keiner passt:** Das eigentliche Bedrohungsmodell (ein Agent *innerhalb*
eines Containers mit gemountetem Socket soll bauen/starten dürfen, aber keine
Host-Root-Binds setzen) ist pro Workspace scopebar, nicht global — ein
Daemon-weites Plugin ist die falsche Granularität, ein Endpoint-only-Proxy die
falsche Tiefe.

**Umgesetzt** (Branch `task/015-docker-socket-proxy`, Commit `e4920a0`,
`src/backend/cmd/socket-guard/`): Reverse-Proxy zwischen Agent-Container und
echtem `docker.sock`, lässt alles unverändert durch außer
`POST /*/containers/create` — dort wird der JSON-Body geparst und
`HostConfig.Binds`/`HostConfig.Mounts` gegen eine Deny-Liste geprüft, bei
Treffer `403` statt Passthrough. `go build`/`go vet`/`go test` sauber, 10
Unit-Tests, Dockerfile (distroless, `CGO_ENABLED=0`) liegt bei.

**Wichtige Korrektur gegenüber der ursprünglichen Deny-Liste hier im Dokument:**
Ein Test hat sofort gezeigt, dass eine pauschale Sperre von `/root` (wie oben
noch vorgeschlagen) echte Deployments brechen würde — dieses Projekt hält
Workspace-Pfade direkt unter `/root/leo/<projekt>` (verifiziert auf dem echten
Zielhost). Die tatsächliche Deny-Liste ist zweigeteilt: (a) ganze Systempfade
(`/`, `/etc`, `/boot`, `/sys`, `/proc`, `/var/run/docker.sock`) und (b)
Credential-Verzeichnisse per Pfadsegment, egal wo sie liegen (`.ssh`, `.aws`,
`.kube`) — `/root/leo/projekt` bleibt erlaubt, `/root/.ssh` bleibt blockiert.
Kein blanket-deny auf Home-/Root-Bäume.

**Nicht Teil dieser Task:** Wiring in den echten Deploy-Pfad
(`projects_ssh.go`, Docker-Socket-Mount durch Proxy + `DOCKER_HOST` ersetzen,
Zeile ~532) — wartet bewusst auf den Merge von TASK-012, da beide dieselbe
Datei/Region berühren würden.
