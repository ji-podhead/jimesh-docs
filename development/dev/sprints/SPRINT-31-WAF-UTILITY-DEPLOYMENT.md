# SPRINT-31 — WAF als Utility-Container pro Deployment

> **Quelle:** Operator-Anfrage 8.9.2026 (Coraza/BunkerWeb/SafeLine als Kandidaten genannt).
> **Status:** ✅ UMGESETZT 14.9.2026 (TASK-057, WP0–WP2 + WP4-Doku; WP3 als
> TODO-Kommentar im Wiring hinterlegt). Live-Verifikation siehe §5.
> **Beantwortet:** die in R23 offen gelassene Frage "Utility-Deployment bei neuem SSH-Endpoint"
> (`docs/research/R23-terminal-tmux-vnc-opencode-deploy.md` — dort: "nichts gefunden").
> **Verwandt:** Sprint 20 WP5 (Egress-Allowlist, L3/L4), Sprint 20 WP6 (Exposure-Dashboard/
> FirewallProvider), Sprint 28 (Kernel-SAST — Commit-Stufe), Sprint 29 (Deployment Security
> Gates — DAST-Stufe). Dieser Sprint ist eine **vierte, orthogonale Schicht**: L7-HTTP-
> Inspektion zur Laufzeit, dauerhaft im Request-Pfad — kein Scan-Gate, kein Commit-Hook.

---

## 1. Die Idee

Wenn ein neues SSH-Deployment-Ziel für ein Projekt aufgesetzt wird, deployt JiMesh
bereits einen Security-Sidecar automatisch mit: `jimesh-socket-guard-<projID>`
(TASK-015/019, `internal/deploy/projects_ssh.go`). Dieser Sprint fügt einen zweiten
Utility-Container nach demselben Muster hinzu: eine **Web Application Firewall**,
die vor dem eigentlichen App-Port des Projekts sitzt und jede eingehende HTTP-Anfrage
gegen OWASP-CRS-Regeln prüft, bevor sie die Anwendung erreicht.

**Wichtige Prämisse, verifiziert im Code (nicht angenommen):** Jeder Projekt-Port wird
bereits ausschließlich auf `127.0.0.1` gebunden (`dockerBindLoopback`,
`projects_ssh.go:461`, an vier Docker-run-Stellen verwendet) — es gibt aktuell **keinen**
direkt öffentlich erreichbaren `0.0.0.0`-Port (Mandat 12, Sprint 19/20-Härtung). Die
WAF ersetzt also nicht "eine offene Tür", sondern setzt sich in den bestehenden
Zugriffspfad **zwischen** dem Weg, über den ein Operator/Tunnel den Loopback-Port
erreicht, und der eigentlichen App — siehe §4.

> **Korrektur 14.9. (TASK-057-Umsetzung):** Diese Prämisse galt am 8.9. — sie wurde
> durch TASK-030 (Sprint 30, „Zero-Port architecture") überholt: Framework-Container
> binden inzwischen ÜBERHAUPT keinen Host-Port mehr; `dockerBindLoopback` ist nur noch
> eine Konstante ohne Docker-run-Verwendung (projects_ssh.go:578, die alte Zeilennummer
> :461 ist verschoben). Der verifizierte Ist-Zustand und die adaptierte Portumkehr
> stehen in §4 („Umsetzungs-Realität"); die Formulierung oben bleibt als Plan-Historie
> unangetastet.

## 2. WAF-Wahl: Coraza (als Caddy-Modul), nicht BunkerWeb oder SafeLine

| Kriterium | **Coraza** (empfohlen) | BunkerWeb | SafeLine |
|---|---|---|---|
| Lizenz | **Apache-2.0** (OWASP-Projekt) [[coraza.io](https://www.coraza.io/docs/tutorials/introduction/)] | **AGPLv3** [[bunkerweb.io](https://www.bunkerweb.io/)] | **GPL-3.0** für die Engine, **Konsole proprietär/nicht quelloffen** [[Help Net Security, 12/2024](https://www.helpnetsecurity.com/2024/12/04/safeline-open-source-web-application-firewall-waf/)] |
| Sprache/Stack | Go, ModSecurity-SecLang-kompatibel, 100% OWASP-CRS-kompatibel [[OWASP Dev Guide](https://devguide.owasp.org/en/09-operations/02-coraza/)] | NGINX/C-Kern + ModSecurity+CRS [[dev.co](https://dev.co/devops/open-source/bunkerweb)] | Go-Management-Plane + eigene PostgreSQL, Detection-Engine separat |
| Deployment-Form | Modul für **Caddy** (offizielles Plugin, `corazawaf/coraza-caddy`), alternativ Traefik/HAProxy, oder als eigenständige Go-Library | Eigenständiger Reverse-Proxy (ersetzt NGINX komplett) | Eigenständige Appliance mit eigener Management-Konsole |
| Ressourcenbedarf | Caddy selbst ist ein einzelnes, kleines statisches Go-Binary — kein separates DB-/Konsolen-Backend nötig | Kein belastbarer Wert öffentlich dokumentiert; NGINX-Basis typischerweise deutlich schwerer als ein Caddy-Static-Binary | **Dokumentiertes Minimum: 2 vCPU / 4 GB RAM / 10 GB Disk** [[DreamServer-Blog](https://dreamserver.ro/en/blog/safeline-waf-open-source-self-hosted/)] |
| Eigene Persistenz nötig? | Nein — Regeln sind Konfigurationsdateien | Nein (Reverse-Proxy-Config) | **Ja** — eigene PostgreSQL-Instanz pro Deployment |
| Reife/Pflege | Aktives OWASP-Projekt, 2026 laufende Entwicklung, WAFPlanet-Review 2026 vorhanden [[WAFPlanet](https://wafplanet.com/waf/coraza/)] | Aktiv gepflegt, breite Docker/K8s-Nutzung | Aktiv, aber Community-Edition ist von der Enterprise-Version abgeleitet — Feature-Split möglich |

**Entscheidung (E-W0 — ENTSCHIEDEN):** Coraza als Caddy-Modul. Operator-
Freigabe 14.9.2026 (TASK-057-Spawn-Mandat = Freigabe der Empfehlung).
Begründung, stärkstes Argument zuerst:

1. **Lizenz-Risiko vermieden.** JiMesh selbst läuft unter PolyForm-Noncommercial mit
   separatem `LICENSE-COMMERCIAL.md`-Pfad für zahlende Kunden. Ein AGPLv3-Bestandteil
   (BunkerWeb) im ausgelieferten Produkt ist ein *Copyleft-Netzwerk-Klausel*-Risiko für
   genau dieses kommerzielle Lizenzmodell — Coraza (Apache-2.0) hat dieses Problem nicht.
2. **Passt zum "minimal extra infra"-Ethos.** SafeLine verlangt pro Instanz eine eigene
   PostgreSQL + 4 GB RAM Minimum — bei einem **Sidecar-pro-Projekt**-Modell (potenziell
   viele gleichzeitig laufende Projekte) ist das nicht tragbar. Coraza/Caddy braucht
   weder eigene Datenbank noch eigene Management-Konsole — die Regeln sind
   Konfigurationsdateien, exakt wie der bestehende Egress-Ruleset-Mechanismus.
3. **Gleicher Sprach-/Tooling-Kontext.** Coraza ist Go — passt zur bestehenden
   CGO-freien Go-Backend-Kultur dieses Repos (kein neuer Sprach-Stack im
   Deployment-Footprint, auch wenn es als eigener Container läuft, nicht gelinkt).

**E-W0 (entschieden 14.9.):** Coraza als Caddy-Modul ist umgesetzt
(`coraza-caddy/v2` v2.6.1 → Coraza v3.7.0 + **CRS v4.25.0 als einkompiliertes
Go-Modul** — besser als geplant: kein CRS-Download, keine Dateien, kein
Volume, `load_owasp_crs` + `@`-Includes im Binary). Ein BunkerWeb-Spike
entfällt; die AGPL-Rechtsfrage (§6) ist damit gegenstandslos.

## 3. Work Packages

### WP0 — Recon + Bild bauen ✅ (blockiert auf E-W0 — freigegeben)

* [x] `cmd/waf-sidecar/` angelegt (Analog zu `cmd/socket-guard/`): kein
  eigener Go-Code nötig — nur ein **Dockerfile**, das per
  `xcaddy build v2.11.4 --with github.com/corazawaf/coraza-caddy/v2@v2.6.1`
  (CGO_ENABLED=0) ein Caddy-Binary mit dem Coraza-Plugin baut, plus
  **Caddyfile** (Regel-Load) und README. OWASP CRS ist **im Binary
  eingebettet** (coraza-coreruleset v4.25.0 als Go-Modul-Dependency von
  coraza-caddy — kein CRS-Klon im Dockerfile nötig, kein Download zur
  Laufzeit).
  Fundstellen: `src/backend/cmd/waf-sidecar/Dockerfile` (xcaddy-Build +
  distroless/nonroot-Runtime, WORKDIR-Fix fürs Parent-Dir-x-Bit),
  `Caddyfile` (`order coraza_waf first`, `load_owasp_crs`,
  `Include @coraza.conf-recommended`, `Include @crs-setup.conf.example`,
  `Include @owasp_crs/*.conf`, `SecRuleEngine On` — die kanonische Syntax
  aus dem coraza-caddy-v2.6.1-README, gegen den Quellcode des Moduls
  verifiziert, nicht geraten).
* [x] `ensureWAFImageLocal`/`ensureWAFImageRemote` in
  `internal/deploy/projects_ssh.go` — 1:1 Kopie des
  `ensureSocketGuardImage*`-Musters: lokal bauen, `docker save | ssh
  docker load` aufs Ziel streamen, kein Registry, keine Credentials.
  Fundstellen: `ensureWAFImageLocal` (projects_ssh.go:502),
  `ensureWAFImageRemote` (projects_ssh.go:520).
* [x] `wafContainerName(nameKey) = "jimesh-waf-" + nameKey` (Analog
  `socketGuardName`); keyed auf nameKey wie alle Container (TASK-037:
  Workspace-Deploy keyt auf die Workspace-ID).
  Fundstelle: projects_ssh.go:228.

### WP1 — Wiring in `executeDeploy` (das Portproblem, siehe §4) ✅

* [x] Der WAF-Sidecar joint dasselbe Projekt-Netz (`egressNetName` /
  `dockerNetFlag`) wie Workspace-Container und Socket-Guard.
  Fundstelle: `wafRunCommand` (projects_ssh.go:584) — `--name
  jimesh-waf-<nameKey> --network <dockerNetFlag>`.
* [x] **Portumkehr (§4, an die Zero-Port-Architektur von TASK-030
  adaptiert — der Plan von 8.9. ging noch von `-p 127.0.0.1` am
  App-Container aus, das es seit TASK-030 nicht mehr gibt):** Der
  App-Container publiziert weiterhin GAR KEINEN Host-Port. Der
  WAF-Container bindet `127.0.0.1:<port>:<port>` (dockerBindLoopback,
  Mandat 12 exakt erfüllt — es ist die EINZIGE -p-Bindung, die dieser
  Deployer überhaupt erzeugt) und proxied intern per Docker-DNS
  (`WAF_UPSTREAM_HOST=jimesh-framework-<nameKey>-<runID>`) auf den
  App-Container. Der Tunnel-Pfad (JIMESH_INTERNAL_IP-Echo) meldet mit
  WAF die **WAF-Container-IP** statt der App-IP — `/api/projects/{id}/
  tunnel/{port}` landet also auf der WAF. Fundstellen:
  `wafRunCommand` (projects_ssh.go:584), INTERNAL_IP-Umschaltung
  (projects_ssh.go:1613), Wiring-Block (projects_ssh.go:1552).
* [x] Opt-in pro Projekt: `DeployRequest.WAF` (`waf: true`, JSON).
  Ohne Flag: byte-identisches Verhalten (nur zwei no-op-Sweeps mehr in
  der Chain, `xargs -r`-garantiert). **Laut abgelehnt (400)** statt
  heimlich übersprungen: `jimesh`-Compose-Framework (kein Workspace-
  Container), `port <= 0`, networkMode `host`/`none` (kein Docker-DNS).
  Fundstelle: Validierungs-Block (projects_ssh.go:1359).
* [x] Undeploy-Sweep räumt `jimesh-waf-<nameKey>` mit auf (Analog
  Socket-Guard-Zeilen); zusätzlich WAF-Sweep in JEDEM executeDeploy, damit
  ein Redeploy mit `waf: false` einen alten Sidecar beseitigt statt ihn
  als Zombie auf dem Loopback-Port zu hinterlassen.
  Fundstellen: `wafSweepCommands` (projects_ssh.go:563), Undeploy-Wiring
  (projects_ssh.go:2006).
* [x] Image-Bereitstellung in beiden Ausführungspfaden laut gescheitert
  (kein Image → kein scheinbar WAF-gesichertes Deploy): lokal
  `ensureWAFImageLocal`, remote `ensureWAFImageRemote`
  (projects_ssh.go:1642/1688).

### WP2 — Regel-Management (v1: Datei-Rendering, kein Dashboard-Editor) ✅

* [x] OWASP-CRS-Standardregeln werden **mit dem Image ausgeliefert**
  (einkompiliert) und sind default-an: `SecRuleEngine On` (Blocking, nicht
  Detection-Only), CRS-Setup mit Paranoia-Level-1-Defaults. Kein
  Custom-Rendering in v1 — genau wie geplant (E-W1).
  Fundstelle: `cmd/waf-sidecar/Caddyfile` + `@`-Includes.
* [ ] Projekt-spezifische Overrides (Snippet-Datei per SSH) — wie geplant
  NICHT in v1; E-W1 bleibt: v1 datei-/image-basiert, `waf_rules`-Tabelle
  + Dashboard-Editor ist eine v2-Entscheidung des Operators nach echtem
  Bedarf.

### WP3 — Exposure-Scanner-Anschluss (NICHT in diesem Task — als TODO im Wiring markiert)

* [ ] `internal/security/exposure.go`: ein WAF-gefronteter Port darf
  nicht als "App direkt exponiert" gemeldet werden. Geplantes Feld
  `fronted_by_waf: bool` (erkannt am Container-Namen `jimesh-waf-
  <projID>`), Risiko-Einstufung `risk: ok` / `risk_reason: "WAF-fronted"`.
  Als `TODO(WP3, TASK-057 follow-up)` an der Wiring-Stelle hinterlegt
  (projects_ssh.go:1552) — exposure.go gehört nicht zu TASK-057s Scope
  (läuft in anderen Tasks). Frontend-Badge entsprechend später.

### WP4 — Doku ✅

* [x] `API_DOCS.md`: keine neue Route (WAF läuft rein über das
  `waf`-Opt-in-Flag im `DeployRequest` von `POST /api/projects/deploy`);
  Payload + Response (`waf: bool`) dort dokumentiert.
* [x] `USER_GUIDE.md`: neues Kapitel „9. WAF pro Deployment" — Opt-in,
  Port-Umkehr, was geschützt wird (CRS-Kategorien) und was nicht.
* [x] `cmd/waf-sidecar/README.md`: Modus, manuelle Test-Anleitung.

## 4. Das Portproblem im Detail (warum WP1 kein triviales "davorschalten" ist)

Anders als beim klassischen "WAF vor einer öffentlichen NGINX" gibt es hier
keinen direkt-öffentlichen Port, den die WAF ersetzt — der Zugriffspfad läuft
über JiMeshs eigenen Tunnel-/Reverse-Proxy-Mechanismus (SSH-Tunnel-Pool) zum
Loopback-Port. Die WAF muss sich also **zwischen den Tunnel-Endpunkt und den
App-Container** schieben, nicht zwischen "Internet und Loopback". Konkret:
vorher `127.0.0.1:<port>` → App-Container direkt; nachher
`127.0.0.1:<port>` → WAF-Container → (Docker-Netz-intern) → App-Container auf
seinem ursprünglichen Port, jetzt ohne Host-Bind. Der Tunnel-Mechanismus selbst
ändert sich nicht — er zeigt weiterhin auf denselben Loopback-Port, der jetzt
nur von einem anderen Prozess beantwortet wird.

**Umsetzungs-Realität (14.9., TASK-057):** Der Plan von 8.9. ging von
`-p 127.0.0.1:<port>` am App-Container aus — dieses Bind wurde mit TASK-030
(Sprint 30, „Zero-Port architecture") KOMPLETT entfernt: kein Framework-
Container publiziert mehr irgendeinen Host-Port, der Tunnel wählt seitdem
die Container-IP direkt (`JIMESH_INTERNAL_IP` + `/api/projects/{id}/tunnel/
{port}`). Die Portumkehr wurde deshalb so umgesetzt, dass BEIDE heute
existierenden Zugriffswege durch die WAF fließen: (a) der WAF-Container
bindet `127.0.0.1:<port>` am Host — die einzige -p-Bindung, die dieser
Deployer heute erzeugt, Mandat 12 unverletzt; (b) das INTERNAL_IP-Echo
meldet mit WAF-Opt-in die WAF-Container-IP, sodass die Tunnel-Route auf der
WAF landet. Der App-Container bleibt, wie seit TASK-030, ganz ohne
Host-Bind. Beide Pfade sind live verifiziert (§5).

## 5. Akzeptanzkriterien (Mandat 2 — verifiziert, nicht behauptet)

Live verifiziert am 14.9.2026 gegen das REAL gebaute Image `jimesh-waf`
(Caddy v2.11.4 + coraza-caddy v2.6.1 + CRS 4.25.0) und einen realen
laufenden Test-App-Container im selben Docker-Netz — lokales Docker-
Äquivalent des Deploy-Pfads, weil diese Umgebung keinen SSH-Deploy-Target-
Node hat (Remote-Seite: ehrliches Test-TODO, siehe letzter Punkt):

* [x] Ein testweise deployter Projekt-Container mit einem einfachen
  HTTP-Endpoint wurde mit WAF-Opt-in deployt (WAF-Run-Command exakt in der
  Form von `wafRunCommand`, gleiches Netz `jimesh-net-<key>`). Ein
  **echter SQLi-Testpayload** (`' OR '1'='1`, query-Parameter) und ein
  **echter XSS-Testpayload** (`<script>alert(1)</script>`) gegen den
  Loopback-Port wurden **beide vom WAF-Layer geblockt** (HTTP 403).
  Log-Beweis, dass der 403 von Coraza kommt, nicht vom App-Code:
  `941100 XSS Attack Detected via libinjection`, `941110 Script Tag
  Vector`, `941160`, `941390` + `949110 Access denied (phase 2). Inbound
  Anomaly Score Exceeded (Total Score: 23)`, jeweils
  `ver "OWASP_CRS/4.25.0"`, `file "@owasp_crs/REQUEST-941-…"`;
  für den SQLi-Payload griff die 942er-Serie („SQL Injection"-Match im
  WAF-Log).
* [x] Derselbe Test **ohne** WAF im Pfad (Kontrollgruppe: App-Port direkt,
  `-p 127.0.0.1:13080:3080` ohne Sidecar) erreichte die App **ungeblockt**
  (SQLi und XSS: HTTP 200) — beweist, dass die WAF tatsächlich im Pfad
  liegt und nicht nur danebensteht.
* [x] Ein legitimer, harmloser Request (`GET /`) erreichte die App
  weiterhin normal: HTTP 200 mit dem App-Antwortkörper (`ok`) DURCH die
  WAF hindurch — kein False-Positive-Blocker.
* [x] `docker ps` zeigte `jimesh-waf-waftest` im selben Netz
  (`jimesh-net-waftest`) wie der App-Container (hier: Workspace-Äquivalent;
  Socket-Guard nicht im Test, aber das Join-Muster ist das identische
  `dockerNetFlag`).
* [x] Sweep-Test (exakte `wafSweepCommands`-Zeilen wie im Undeploy):
  Container gestoppt + entfernt, `docker ps -a --filter name=jimesh-waf-…`
  danach leer; ein zweiter Sweep-Lauf ohne existierenden Container
  exitierte sauber mit 0 (No-Op-Garantie, kein verwaistes Sidecar-Zombie).
* [x] **Ende-zu-Ende-Kettentest (14.9., nach dem ersten Commit ergänzt):**
  Die Deploy-Kette lief in exakt der von `executeDeploy` emittierten
  Reihenfolge (`set -e` + Framework-Sweep → Framework-Run → WAF-Sweep →
  WAF-Run → INTERNAL_IP-Echo) mit den Produktions-Strings aus dem
  committeten Code (per Throwaway-Print-Test ausgelesen, danach gelöscht):
  das Echo meldete **die WAF-Container-IP** (172.21.0.3; Framework-IP:
  172.21.0.2) im `JIMESH_INTERNAL_IP: <ip>`-ParsFormat — der Tunnel-Pfad
  landet auf der WAF. Durch den Loopback-Publish: SQLi 403, XSS 403,
  legitim 200. Ein Redeploy MIT `waf: false` (Kette ohne WAF-Run-Zeile)
  entfernte den Sidecar (0 Container danach), gab `127.0.0.1:38080` frei
  und ließ den neu gestarteten Framework-Container laufen — kein Zombie,
  das Zero-Port-Verhalten ohne Opt-in bleibt intakt.
* [ ] Exposure-Scan zeigt den gefronteten Port mit `fronted_by_waf: true` —
  **WP3, bewusst NICHT umgesetzt** (exposure.go gehört zu TASK-057s Scope-
  Ausschluss; TODO-Kommentar an der Wiring-Stelle hinterlegt). Kriterium
  bleibt offen bis WP3.
* [ ] **Ehrliches Test-TODO (Remote):** Der SSH-Remote-Pfad
  (`ensureWAFImageRemote` per `docker save | ssh docker load` + die
  Deploy-Chain auf einem entfernten Node + Umschaltung der Tunnel-IP auf
  die WAF) ist in dieser Umgebung nicht testbar — hier existiert kein
  SSH-Ziel-Node. Der Code folgt 1:1 dem seit TASK-019 live funktionierenden
  Socket-Guard-Streaming-Muster (ensureSocketGuardImageRemote, unverändert
  in Produktion). Operator-Smoke-Test aussteht: ein Remote-Deploy mit
  `waf: true` und ein curl gegen den Loopback-Port auf dem Node.

## 6. Nicht Teil dieses Sprints (v1-Scope-Grenze)

* **Kein Dashboard-Regel-Editor** — siehe E-W1, v1 ist datei-basiert.
* **Keine WAF vor den JiMesh-Dashboard-/Gateway-eigenen Ports** — nur vor
  Ports von *deployten Projekten*. JiMeshs eigener `/api`/`/v1`-Traffic hat
  bereits eigene Auth-/RBAC-Gates (Sprint 20, OPA/WP4) — eine zusätzliche WAF
  davor ist ein separater, eigener Entscheid, nicht dieser Sprint.
* **Kein Multi-Vendor-Support** — nur Coraza/Caddy in v1, kein
  Plugin-Mechanismus für andere WAF-Engines.
* **Keine rechtliche Prüfung der AGPL-Frage für BunkerWeb** — falls der
  Operator BunkerWeb trotz §2 bevorzugt, braucht das eine eigene
  Rechtsberatung, kein technisches WP.
* **Kein automatisches Fronten bestehender, bereits laufender Deployments** —
  v1 gilt nur für neue Deployments nach diesem Sprint; ein Migrations-Pfad für
  laufende Projekte ist ein eigener, späterer Task.

## 7. Entscheidungen (E-W-Serie)

| # | Entscheidung | Blockiert | Status |
|---|---|---|---|
| E-W0 | WAF-Wahl: Coraza/Caddy (empfohlen) vs. BunkerWeb (AGPL-Risiko) vs. SafeLine (zu schwer/proprietäre Konsole) | WP0 | **ENTSCHIEDEN 14.9. (Operator-Mandat = Freigabe): Coraza als Caddy-Modul — umgesetzt in TASK-057** |
| E-W1 | Regel-Verwaltung v1 datei-basiert vs. `waf_rules`-Tabelle mit Dashboard-Editor | WP2 | **ENTSCHIEDEN (wie geplant): v1 image-basiert (CRS einkompiliert, default-an, kein Custom-Rendering); v2-Tabelle = spätere Operator-Entscheidung** |
| E-W2 | Opt-in-Default: pro Projekt explizit aktivieren vs. für alle HTTP-exponierenden Frameworks standardmäßig an | WP1 | **ENTSCHIEDEN: explizites Opt-in (`waf: true` im DeployRequest), ohne Flag byte-identisches Verhalten; Default-an bleibt ein späterer Reifegrad-Schritt — so umgesetzt** |

Sources:
- [Introduction | OWASP Coraza](https://www.coraza.io/docs/tutorials/introduction/)
- [Coraza WAF - OWASP Developer Guide](https://devguide.owasp.org/en/09-operations/02-coraza/)
- [Coraza Web Application Firewall Review (2026) | WAFPlanet](https://wafplanet.com/waf/coraza/)
- [GitHub - corazawaf/coraza-caddy](https://github.com/corazawaf/coraza-caddy)
- [BunkerWeb - the open-source Web Application Firewall (WAF)](https://www.bunkerweb.io/)
- [BunkerWeb: Open-Source WAF for NGINX & Kubernetes | DEV.co](https://dev.co/devops/open-source/bunkerweb)
- [SafeLine: Open-source web application firewall (WAF) - Help Net Security](https://www.helpnetsecurity.com/2024/12/04/safeline-open-source-web-application-firewall-waf/)
- [SafeLine WAF: a serious open-source firewall for your web apps | DreamServer](https://dreamserver.ro/en/blog/safeline-waf-open-source-self-hosted/)
