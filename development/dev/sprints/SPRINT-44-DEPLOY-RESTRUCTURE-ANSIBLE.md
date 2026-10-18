# SPRINT-44 — TASK-117: Deploy-Restructure — docker-compose komplett durch Ansible ersetzen

**Quelle:** Operator-Direktive, 15./16.9.2026 (Chat, dieser Sprint dokumentiert
sie wörtlich, damit keine Session sie neu interpretieren muss):

> "config wird komplett aufgelöst und in deploy reinepackt. docker compose
> wird überall komplett rausgenommen. docker files in den deploy folder
> [...] warum definierst du nicht einfach die haupt configs in einem
> config file, machst für jeden service ein Ordner in deploy rein, da das
> Dockerfile (falls du es brauchst), eine Overrides-Datei falls der User
> die default configs überschreiben will, ersetz die compose files
> komplett mit ansible, dann make targets für redeploy von den services
> wo der User mit args den service und target node angeben kann."

**Vorgeschichte (SPRINT-40 Part 4, heute):** Ansible-Provisioning
(`deploy/ansible/`, `make provision-node`/`make deploy-all`) wurde bereits
gebaut und live gegen einen echten Worker-Node (`trading`, 100.107.15.10)
verifiziert — das deckt aber nur Docker+Netzwerk+gVisor auf dem Host ab,
NICHT das Deployment der eigentlichen JiMesh-Services. Dieser Sprint ist
die Fortsetzung: die Services selbst (aktuell in `deploy/docker-compose.yml`)
komplett auf denselben Ansible-Mechanismus umziehen.

**Nicht verwechseln mit:** SPRINT-41 (VLAN-Isolation für Workspace-
Container — andere Ebene, User-Deployments via SSH-Pipeline
`internal/deploy/projects_ssh.go`, bleibt unberührt). Dieser Sprint
betrifft NUR JiMeshs eigene Plattform-Services (Postgres, Redis, Vault,
Keycloak, Backend, Frontend + SIEM-Stack).

## ✅ Scope-Konflikt GELÖST (16.9., Operator-Entscheidung) — Node-Registry neu gebaut

Der ursprüngliche Ansatz (ein `podhead-main`-Eintrag mit
`ansible_connection: local`, dieser Dev-Host "targetet sich selbst") wurde
vom Operator explizit verworfen — verwirrend, unklar woher "Nodes" kommen
("ich weiß nicht wo du jetzt die nodes hernimmst"). Neuer, vom Operator
vorgegebener Mechanismus, komplett umgesetzt:

- **`config.yml`** (Repo-Root, getrackt): Liste der Nodes — `name`, `role`
  (`control_plane`/`worker`), plus `host`/`user` als `${VAR}`-Referenzen
  (Korrektur 16.9., zweiter Anlauf: erst Namenskonvention geraten
  `<NAME_UPPER>_HOST`, dann auf Operator-Wunsch auf explizite
  `${VAR}`-Syntax umgestellt — sichtbar im File, welche Env-Var gemeint
  ist, gleiche Interpolations-Syntax wie `deploy/docker-compose.yml`).
  KEINE echten IPs/User hier.
- **`.env`** (gitignored): die echten Werte hinter den `${VAR}`-Namen aus
  `config.yml` — z.B. `host: ${JIMESH_MAIN_HOST}` → `.env`:
  `JIMESH_MAIN_HOST=...`.
- **`scripts/render-inventory.py`**: baut daraus zur Laufzeit ein echtes
  Ansible-Inventory (`deploy/ansible/inventory/.rendered.ini`, gitignored,
  Wegwerf-Artefakt) — Nodes mit unauflösbarer `${VAR}` (kein Wert, kein
  `:-default`) werden mit Warnung übersprungen, nie mit leerem Host
  deployt.
- Dieser Rechner (wo `make redeploy`/`make deploy-all` läuft) ist NIE
  selbst ein Node — nur der Ansible-Controller, der über echtes SSH nach
  außen greift. `provision-node.yml` läuft jetzt gegen `hosts: all` (vorher
  `hosts: workers` — nebenbei einen Bug gefixt: das schloss auch den
  Ad-hoc-Einzelknoten-Pfad `make provision-node HOST=/USER=` aus, dessen
  generiertes Inventory eine `[target]`-Gruppe nutzt, nie `[workers]`).
- Zusätzlicher Fund beim Bauen: `community.docker`-Module (postgres/redis/
  vault/keycloak/backend/frontend-Tasks) laufen bei einem echten SSH-Ziel
  AUF DEM ZIEL-NODE, nicht im Controller — brauchen dort den `docker`
  Python-SDK. `provision-node.yml` installiert jetzt `python3-docker`
  zusätzlich zu Docker Engine selbst (gleiches Idempotenz-Muster).
- `deploy/ansible/inventory/topology.local.yml` + `topology.example.yml`
  sind komplett entfernt (Werte von `trading` nach `.env` migriert).

**Damit ist die Entscheidung "Compose überall raus" jetzt eine reine
Config-Frage, kein Code-Zweig mehr:** der Operator trägt seine Haupt-Node
in `config.yml` (`role: control_plane`) + `.env` ein, sobald er das tut,
funktioniert `make redeploy` dagegen genau wie gegen `trading`. Ob/wann
`docker-compose.yml` dann wirklich weg kann (WP5), hängt nur noch davon
ab, ob der Operator eine solche Node tatsächlich einträgt und den vollen
Stack dort verifiziert — kein architektonischer Widerspruch mehr offen.

## Ziel

Kein `docker-compose.yml` mehr für JiMeshs eigene Services. Jeder Service
lebt in einem eigenen `deploy/<service>/`-Ordner (Dockerfile falls
gebraucht, Default-Config, Ansible-Task/Rolle). Ein `make redeploy
SERVICE=<name> NODE=<name>` deployed/redeployed genau einen Service auf
genau einem in `config.yml`/`.env` registrierten Node (Registry-Design
16.9., siehe "✅ Scope-Konflikt GELÖST" oben).

## Architektur-Entscheidungen (nicht abweichen)

1. **Ansible ersetzt Compose vollständig für diese Services** — nicht
   parallel betreiben, nicht schrittweise migrieren mit Compose-Rest.
   `community.docker.docker_container`-Modul pro Service (nicht
   `docker_compose_v2` — das würde nur Compose wieder durch die Hintertür
   einführen, widerspricht der Direktive).
2. **`config/` wird aufgelöst** — Korrektur nach Code-Verifikation 16.9.:
   die ursprüngliche Annahme "`config/topology.yml` ist live in `main.go`+
   `vite.config.ts` verdrahtet" war **falsch**. Beide Stellen lesen
   tatsächlich `config/topology.json` (nicht `.yml`) — diese Datei hat es
   in diesem Repo nie gegeben, `getTopologyPath()`/der Vite-Read schlagen
   also immer fehl und fallen auf Hardcoded-Defaults zurück (toter Pfad,
   kein echter Verbrauch). Der tatsächliche Verbraucher von
   `config/topology.yml` ist `scripts/sync-env.sh` (liest die YAML, schreibt
   Port-Envs nach `.env`). Migration war dadurch trivial: nur
   `sync-env.sh`s `TOPOLOGY=`-Pfad anpassen, kein Go-/TS-Code-Umzug nötig.
   `config/deployments/*.yml` (Profile, verlinkt über `topology.yml`s
   `profile:`-Feld, aber von KEINEM Code tatsächlich geladen — reines
   Referenzmaterial) sind mit umgezogen nach `deploy/deployments/`.
   `config/opencode/terminal.desktop` war ein weiteres totes Duplikat
   (echter Inhalt liegt inline im Go-Code, `internal/deploy/projects_ssh.go:1737`)
   — gelöscht statt umgezogen.
3. **Pro Service ein Ordner unter `deploy/`:**
   ```
   deploy/
     postgres/    (kein Dockerfile — offizielles Image; default-config.yml, ansible-task.yml)
     redis/       (kein Dockerfile — offizielles Image)
     vault/       (kein Dockerfile — offizielles Image)
     keycloak/    (kein Dockerfile — offizielles Image; realm.json, pg-init/)
     backend/     (Korrektur 16.9.: das Root-`Dockerfile` + `docker-entrypoint.sh`
                   + `.github/workflows/docker.yml` waren KEINE echte JiMesh-
                   Pipeline — totes FreeLLMAPI-Legacy von vor der Umbenennung,
                   COPY von `server/`/`client/`/`cli/`/`desktop/`/`shared/`,
                   die alle laut CLAUDE.md "Removed legacy tiers" nicht mehr
                   existieren. Der Workflow lief auf jeden Push nach main/Tag
                   und schlug garantiert fehl (COPY eines nicht-existenten
                   Pfads). Alle drei Dateien gelöscht statt migriert. Der
                   ECHTE Go-Backend-Dockerfile ist bereits `src/backend/Dockerfile`
                   (Multi-Stage protoc-Codegen → CGO_ENABLED=0-Build →
                   distroless) — der bleibt wo er ist, ist aber an KEINE CI
                   angeschlossen. Ob ein Ansible-Deploy diesen Dockerfile baut
                   oder weiter `golang:latest` + Bind-Mount (heutiger Dev-Modus,
                   `deploy/docker-compose.yml`) nutzt, ist eine offene
                   Entscheidung für WP3, keine für WP1/WP2.)
     frontend/    (kein eigenes Dockerfile — node:20-alpine + bind-mount, wie heute)
     ansible-runner/  (bleibt wie es ist, SPRINT-40 Part 4)
   ```
   Jeder Ordner: `defaults.yml` (Standard-Config) + optional
   `overrides.local.yml` (User-Overrides, gitignored — gleiches Muster wie
   `.env`).
4. **`make redeploy SERVICE=<name> NODE=<name>`** — liest die Node aus
   `config.yml`/`.env` (per `render-inventory.py`), ruft ein neues Ansible-Playbook
   (`deploy/ansible/playbooks/deploy-service.yml`) mit
   `-e service=<name>` auf, das service-spezifische Task-Datei
   (`deploy/<name>/ansible-task.yml`, per `include_tasks` dynamisch
   geladen) ausführt. EIN generisches Playbook, keine 8 Kopien.
5. **SIEM-Stack (`deploy/siem/docker-compose.yml`)** bleibt vorerst
   Compose — separates, bereits opt-in funktionierendes System (Sprint 32).
   Nur explizit erwähnen, NICHT stillschweigend mit-migrieren (Scope-Kontrolle).

## Zusatzbefund (Claude, 16.9.): `scripts/` gehört zu drei verschiedenen Orten, nicht einem

Operator-Frage, während WP1-WP4 schon liefen: `scripts/` nach `src/`
verschieben? Antwort nach Durchsicht: **nicht 1:1**, der Ordner mischt drei
verschiedene Zuständigkeiten, die zu drei verschiedenen Zielen gehören —
absichtlich hier nur dokumentiert, NICHT parallel zur laufenden WP1-WP4-
Arbeit umgesetzt (Kollisionsgefahr mit den `deploy/<service>/`-Ordnern,
die diese Session gerade baut):

| Ziel | Dateien | Begründung |
|---|---|---|
| `src/frontend/scripts/` (existiert bereits: `check-i18n.mjs`, `backfill-i18n.mjs`, `add-task-053-i18n.py`) | `add-j4-i18n-keys.mjs`, `add-j5-i18n-keys.mjs`, `add-subagents-panel-i18n.mjs`, `task078-i18n-insert.py`, `check-frontend-slop.mjs` | Reine Frontend-i18n/Lint-Einmal-Tools, doppeln den bereits etablierten Ort |
| `deploy/backend/`, `deploy/frontend/` (diese Sprint, WP3) | `backend-entry.sh`, `frontend-entry.sh` | Container-Entrypoints — gehören zu genau den Service-Ordnern, die WP3 gerade anlegt. **Sollte in WP3 mit-erledigt werden, wenn die Backend/Frontend-`ansible-task.yml` diese Scripts referenzieren.** |
| Bleibt wo es ist (kein `src/`-Konzept für Repo-Ops-Tooling) | `dev-bootstrap.{sh,ps1,test.mjs}`, `sync-env.sh`, `verify-stack.sh`, `setup-ssh.sh`, `init-gvisor.sh`, `install-gvisor.sh`, `export-tiers.py` | Repo-weite Ops-/Dev-Tools, kein Anwendungscode |

**Unabhängiger Befund dabei:** Root-`package.json` (`@freellmapi/monorepo`,
`devDependencies: concurrently, jsdom`) erzeugt ein reales Root-
`node_modules/` — widerspricht `CLAUDE.md`s eigenem Mandat *"No Root
node_modules: All Node.js dependencies live strictly within
src/frontend/."* Sauber gitignored, kein Duplikat, aber das Mandat wird
faktisch nicht eingehalten. Nicht in diesem Sprint behoben (anderer Scope),
nur festgehalten.

## Work Packages

- **WP1 Ordnerstruktur + Config-Migration — ✅ erledigt 16.9.:**
  `deploy/{postgres/pg-init,keycloak,deployments,redis,vault,frontend}/`
  angelegt; `config/pg-init/`, `config/keycloak/`, `config/topology.yml`,
  `config/deployments/*.yml` per `git mv` umgezogen; `config/opencode/`
  (totes Duplikat) gelöscht; `config/` existiert nicht mehr.
  `scripts/sync-env.sh`s `TOPOLOGY=`-Pfad, `deploy/docker-compose.yml`s
  zwei Volume-Mounts, sowie alle "lebenden" Doku-Referenzen
  (`API_DOCS.md`, `docs/reference/AUTH-ARCHITECTURE.md`, `UTILITY-FLOW.md`,
  `networking-and-deployment-strategy.md`, `GO-PUBLIC.md`,
  `internal/auth/keycloak_oidc.go`-Kommentar) aktualisiert. `main.go` +
  `vite.config.ts` NICHT angefasst — Korrektur siehe oben, die lesen einen
  nie existierenden `config/topology.json`, kein echter Verbrauch. Archivierte
  Sprint-/Knowledge-Docs mit alten `config/`-Pfaden bewusst NICHT
  nachträglich umgeschrieben (Doku-Mandat: Historie bleibt Historie).
  Verifikation von `make go-build`/`npm run dev` gegen den Live-Stack steht
  noch aus (Sandbox blockierte Docker-/Go-Build-Ausführung) — siehe
  Reihenfolge-Empfehlung im Handoff-Doc.
- **WP2 Backend-Image-Pipeline — ✅ Korrektur + Cleanup erledigt 16.9.,
  keine Migration nötig:** Root-`Dockerfile` + `docker-entrypoint.sh` +
  `.github/workflows/docker.yml` waren totes FreeLLMAPI-Legacy (siehe
  Architektur-Entscheidung 3 oben) und wurden gelöscht statt migriert. Der
  echte Backend-Dockerfile (`src/backend/Dockerfile`) bleibt unverändert an
  seinem Platz; ob/wie er in WP3 von Ansible gebaut wird, ist dort zu
  entscheiden.
- **WP3 Ansible-Service-Deployment — ✅ erste Fassung erledigt 16.9.,
  ungetestet:** `deploy/ansible/playbooks/deploy-service.yml` (generisches
  Playbook, `-e service=<name> -e target_node=<host>`) +
  `deploy/<service>/{defaults.yml,ansible-task.yml}` für alle 6 Services.
  Zwei Korrekturen unterwegs gefunden und eingearbeitet, nicht nur
  Compose 1:1 übersetzt:
  - **Backend:** baut den ECHTEN `src/backend/Dockerfile` (Multi-Stage,
    CGO_ENABLED=0, distroless) statt den Dev-Bind-Mount-Modus zu
    replizieren — dieser Dockerfile existierte bereits, war aber an keine
    CI/Deploy angeschlossen.
  - **Frontend:** ist real Next.js 15 (`next.config.mjs`, nicht Vite —
    `src/frontend/vite.config.ts` ist totes, nirgends importiertes
    Legacy aus einer Vor-Next.js-Iteration, hier nur geflaggt, nicht
    gelöscht, da außerhalb des `config/`-Scopes dieses Sprints). Task
    fährt `next build` + `next start` statt `next dev`.
  `--syntax-check` gegen alle 6 Services lief bereits grün (Docker-Image-
  Build + `docker run` waren in dieser Sandbox erlaubt, ein echter Deploy-
  Lauf via `make redeploy` wurde vom Auto-Mode-Classifier geblockt). Ein
  echter Lauf gegen `trading` oder eine frisch registrierte Node steht
  noch aus, bevor WP5 angegangen wird.
- **WP4 `make redeploy` — ✅ erledigt + Node-Registry neu gebaut 16.9.:**
  Makefile-Target, gleiche Container-Runner-Pattern wie
  `provision-node`/`deploy-all` (kein Ansible-Install beim Operator).
  Zusätzlich zur ursprünglichen Fassung (siehe "✅ Scope-Konflikt GELÖST"
  oben): `config.yml` + `.env` + `scripts/render-inventory.py` ersetzen
  komplett die alte `deploy/ansible/inventory/topology.local.yml`/
  `topology.example.yml` (beide entfernt). Nebenfund dabei + gefixt:
  `deploy-all` mountete vorher `topology.yml` — diese Datei gab es nie,
  nur die beiden jetzt entfernten Dateien.
- **WP5 `docker-compose.yml` entfernen — kein architektonischer Konflikt
  mehr, aber praktisch noch nicht scharf:** braucht (a) mindestens eine
  echte `control_plane`-Node in `config.yml`/`.env` (die Haupt-Node muss
  der Operator selbst eintragen), (b) einen echten Testlauf aller 6
  Services dagegen, (c) den vollen Funktionstest (Health-Endpoints,
  Traefik-Routing, Keycloak-Login, Vault-Zugriff) — erst dann entfernen.
- **WP6 Doku — laufend:** dieses Sprint-File + `API_DOCS.md` +
  `docs/reference/*` + `docs/backlog/BACKLOG.md` + `.env.example` liefen
  bereits mit. `architecture-overview.md` + Retrospektive stehen noch aus
  (nach WP5).

## Abnahme-Kriterien

1. `docker-compose.yml` existiert nicht mehr, `make redeploy SERVICE=backend
   NODE=<echte, in config.yml/.env registrierte Node>` bringt den
   Backend-Container hoch, `/health` antwortet.
2. Alle 6 Services (Postgres/Redis/Vault/Keycloak/Backend/Frontend) einzeln
   redeploybar, ohne die anderen anzufassen.
3. `deploy/topology.yml`-Verschiebung (WP1, bereits erledigt) bricht weder
   `make go-build` noch den Frontend-Dev-Server — trivial erfüllt, da
   `main.go`/`vite.config.ts` nie den echten Pfad gelesen haben (siehe
   Architektur-Entscheidung 2).
4. ~~CI (.github/workflows/docker.yml)~~ entfällt — diese Datei war totes
   Legacy und wurde gelöscht (WP2), keine echte CI-Pipeline betroffen.
5. Traefik-Routing (heute gebaut, SPRINT-40 Part 4) funktioniert
   unverändert nach der Migration.

## Was das NICHT ist

- Keine Änderung an `internal/deploy/projects_ssh.go` (User-Projekt-Deploy
  bleibt wie es ist — andere Ebene, SPRINT-41).
- Kein Anfassen von `deploy/siem/`, `deploy/scan/`, `deploy/datalake/`
  (separate, bereits funktionierende Compose-Stacks).
- Keine Host-Firewall-/iptables-/SSH-Config-Änderungen — Ansible-Tasks
  bleiben auf Docker-Ebene, wie in `provision-node.yml` etabliert.

## Status

- [x] WP1 Ordnerstruktur + Config-Migration (16.9., go-build/npm-Verifikation offen)
- [x] WP2 Backend-Image-Pipeline (Korrektur: Legacy gelöscht statt migriert, 16.9.)
- [~] WP3 Ansible-Service-Deployment (Playbook + 6 Services geschrieben + `--syntax-check` grün, 16.9.; echter Deploy-Lauf noch offen)
- [x] WP4 make redeploy + Node-Registry neu gebaut (`config.yml`+`.env`+`render-inventory.py`, 16.9.)
- [ ] WP5 docker-compose.yml entfernen — kein Scope-Konflikt mehr, wartet auf echten Testlauf + registrierte control_plane-Node
- [~] WP6 Doku (laufend aktualisiert; architecture-overview.md-Retrospektive steht noch aus)
