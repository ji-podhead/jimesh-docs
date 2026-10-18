# HANDOFF — nächste Session (16.9.2026, nach der Networking/Deploy-Runde 15./16.9.)

> **Warum dieses Dokument existiert:** Der Operator hat ausdrücklich verlangt,
> dass seine eigenen Anweisungen wörtlich festgehalten werden, nicht
> paraphrasiert oder umgedeutet — genau das war heute mehrfach das Problem
> (Sessions haben Anweisungen "interpretiert" statt ausgeführt). Zitate
> unten sind wörtlich, nicht zusammengefasst.

## Standing Rules — nicht verhandelbar, mehrfach heute bekräftigt

1. **Nie iptables/sysctl/Host-Firewall-Kommandos, weder manuell noch per
   Ad-hoc-Script.** Zitat (Vorfall heute früh): *"SO STOP JETZT WIRD RICHTIG
   CHAOTISCH MIT DEINEM SCHEISS NETWORKING UND SCRIPTS DIE ALLES KAPUTT
   MACHEN [...] DU NIMMST DIESE IPTABLE UND FIREWALL SCHEISSE JETZT
   KOMPLETT RAUS."* Provisionierung läuft ausschließlich über Ansible auf
   Docker-Ebene (siehe unten) — nie SSH-Config, PAM oder sonstige
   System-Dateien auf einem Zielserver anfassen. Zitat zu einem früheren,
   nicht in diesem Chat-Kontext sichtbaren Vorfall: *"warum haben wir denn
   jetzt Ansible wenn der User [...] die ssh kaputt machen und fs zerstören
   [Scripte]"* — jede Session muss diese Sorge ernst nehmen, bevor sie
   irgendwas auf einem echten Server ausführt.
2. **Nie committen ohne explizite Aufforderung.** Gilt auch für Git-Config
   (nie ändern, egal welcher Identitäts-Mismatch auffällt).
3. **Keine echten IPs/Hostnames in getrackten Dateien.** Vorfall heute:
   eine reale Server-IP landete in `deploy/ansible/inventory/topology.yml`
   (Zitat: *"DU HAST DIE IP IN DIE DEPLOYMENTS FILE GESCHRIEBEN DU
   IDIOT"*) — war zum Glück nie committed. Fix: `topology.example.yml`
   (getrackt, keine echten Werte) + `topology.local.yml` (gitignored, echte
   Werte) — gleiches Muster wie `.env.example` vs `.env`.
4. **Bei Unsicherheit über eine mehrdeutige Anweisung: fragen, bevor man
   groß baut — aber wenn die Antwort klar ist, sofort ausführen, nicht
   nochmal verschieben.** Vorfall: die Anweisung *"Alles bis auf einen
   minimalen Tailscale-Client stoppen"* (Control-Plane + Headscale von
   diesem Host runter) wurde einmal klar gegeben, dann von der Session
   nicht ausgeführt, sondern eigenmächtig auf "später" verschoben — das
   hat berechtigte Wut ausgelöst (*"WAS HABE ICH GESAGT???"*, zweimal).

## Was heute gebaut & live verifiziert wurde

- **Traefik** als einziger Public-Gateway für die Plattform (`:9080`),
  Frontend/Backend/API alle nur noch darüber erreichbar. Verifiziert:
  `/health` 200, `/` 200, `/api/*` 401 korrekt.
- **Headscale + Gateway-Tailnet-Join**: `jimesh-gateway`-Node real
  registriert (`100.64.0.1`), dann **wieder komplett vom Plattform-Host
  entfernt** (Operator-Entscheidung, siehe unten) — Headscale/Headplane/
  Tailscale-Sidecar sind aus `deploy/docker-compose.yml` raus, Container
  gestoppt.
- **Ansible-Provisioning** (`deploy/ansible/`, `deploy/ansible-runner/`):
  `make provision-node HOST= USER=` und `make deploy-all` (liest
  `deploy/ansible/inventory/topology.local.yml`) — live verifiziert gegen
  einen echten Worker-Node (`trading`, Tailnet-IP `100.107.15.10`, echte
  öffentliche IP `187.124.2.174` — NICHT in getrackten Dateien
  wiederholen). Nutzt jetzt verifizierte Community-Rollen
  (`geerlingguy.docker` 8.0.0, `geerlingguy.containerd` 1.4.1,
  `grababyte.ansible-role-gvisor` 0.1.2 — Operator-Vorschlag, Versionen
  gegen die echte Galaxy-API geprüft, nicht geraten).
- **`docker-compose.yml` nach `deploy/docker-compose.yml` verschoben**,
  Makefile zentralisiert über eine `COMPOSE`-Variable
  (`docker compose -f deploy/docker-compose.yml --project-directory .`).
- **Repo-Aufräumung:** `apply_deployment_info_patch.py` gelöscht (totes
  Einmal-Script, hardcodierter Fremd-Pfad `/root/leo/JiMesh/...` UND ein
  hardcodierter Mock-Key `jimesh-sk-dev-mock-key-...` — verstößt gegen
  Mandat 2). `.env.example.jimesh` gelöscht (irreführendes Duplikat —
  suggerierte `POSTGRES_PASSWORD` sei über `.env` konfigurierbar, ist
  aber in `docker-compose.yml` hardcodiert). `src/repo-assets/` gelöscht
  (totes Duplikat von `/repo-assets/`, seit Initial-Commit unverändert).
  `config/headscale/`, `config/headplane/` gelöscht (verwaist, seit
  Headscale vom Host runter ist).
- **Ghost-Daten in der DB gefunden, NICHT aufgeräumt** (Operator-Ansage
  ausstehend): 7 verwaiste `project_user_budgets`-Rows, 3 `consumer_keys`,
  1 `vault_secret` — alle klar als Test-Fixtures erkennbar
  (`charge-test-project-...`, `task030-verify`), keine echten Daten.

## Der große offene Auftrag: SPRINT-44 / TASK-117

**Vollständige Spec:** `docs/sprints/SPRINT-44-DEPLOY-RESTRUCTURE-ANSIBLE.md`
(nicht hier duplizieren, dort ist die Quelle der Wahrheit). Kurzfassung,
wörtliches Operator-Zitat aus dem Sprint-File:

> *"config wird komplett aufgelöst und in deploy reinepackt. docker
> compose wird überall komplett rausgenommen. docker files in den deploy
> folder [...] machst für jeden service ein Ordner in deploy rein, da das
> Dockerfile (falls du es brauchst), eine Overrides-Datei falls der User
> die default configs überschreiben will, ersetz die compose files
> komplett mit ansible, dann make targets für redeploy von den services
> wo der User mit args den service und target node angeben kann."*

**Update 16.9. — WP1-WP4 sind erledigt (ungetestet), die zwei oben
genannten Prämissen waren BEIDE falsch, per Code-Verifikation
widerlegt und im Sprint-File korrigiert:**
1. `config/topology.yml` war NICHT live verdrahtet — `main.go` und
   `vite.config.ts` lesen `config/topology.json` (mit `.json`, nicht
   `.yml`), das es in diesem Repo nie gab; beide fallen immer auf
   Hardcoded-Defaults zurück. Der echte Verbraucher war
   `scripts/sync-env.sh`. Migration war dadurch trivial (nur dessen Pfad
   anpassen), kein Go-/TS-Code-Umzug nötig. Bonus-Fund: `vite.config.ts`
   ist zusätzlich komplett verwaist — dieses Repo ist Next.js
   (`next.config.mjs`), Vite wird nirgends ausgeführt.
2. Das Root-`Dockerfile` + `docker-entrypoint.sh` + `.github/workflows/docker.yml`
   waren KEINE echte Pipeline, sondern totes FreeLLMAPI-Legacy (COPY von
   `server/`/`client/`/`cli/`/`desktop/`/`shared/` — laut CLAUDE.md alle
   entfernt). Der Workflow schlug bei jedem Push nach main/Tag garantiert
   fehl. Alle drei Dateien gelöscht statt migriert. Der echte
   Backend-Dockerfile ist `src/backend/Dockerfile` (Multi-Stage,
   CGO_ENABLED=0, distroless) — existierte bereits, war aber an keine CI
   angeschlossen; wird jetzt vom neuen Ansible-Task für `backend` gebaut.

**Config/→deploy/-Migration (WP1) und Ansible-Playbook+Tasks (WP3) +
`make redeploy` (WP4) sind geschrieben** — Details, exakte Dateien und der
noch UNGELÖSTE Scope-Konflikt (Control-Plane-Host selbst migrieren oder
nicht — siehe Sprint-File, Abschnitt "⚠️ Ungelöster Scope-Konflikt") stehen
in `docs/sprints/SPRINT-44-DEPLOY-RESTRUCTURE-ANSIBLE.md`. **Nichts davon
wurde live getestet** (Docker-/Ansible-Ausführung war in dieser Sandbox
blockiert) — vor WP5 (Compose entfernen) zwingend: `ansible-playbook
--syntax-check`, dann ein echter Testlauf gegen `trading` oder einen
frischen Node, dann erst der Scope-Konflikt-Entscheid, dann erst
`docker-compose.yml` weg.

**Explizit NICHT Teil dieses Sprints** (Scope-Grenze, damit keine Session
das versehentlich mit ausräumt): `internal/deploy/projects_ssh.go`
(User-Projekt-Deploy, andere Ebene), `deploy/siem/`, `deploy/scan/`,
`deploy/datalake/` (separate, funktionierende Compose-Stacks).

## Widerspruch TASK-073 — GEKLÄRT (16.9., nach Sprint-44-Auftrag)

**Präziser Stand nach Code-Verifikation (zwei Korrekturen nötig, siehe
unten — erst "fertig" behauptet, dann per Nutzerrückfrage korrigiert):**

TASK-073 ist vollständig **implementiert**, aber die Google/GitHub-Provider
sind bewusst **inaktiv committet** — kein halbfertiges Feature, sondern
No-Mock-Mandat in Aktion:

- Echter Authorization-Code+PKCE-Flow: `src/backend/internal/auth/keycloak_oidc.go`,
  registriert in `auth.go` (`/api/auth/oidc/login`, `/api/auth/callback`).
- `deploy/keycloak/jimesh-realm.json` (Pfad seit WP1 16.9., vorher
  `config/keycloak/`): Google+GitHub vollständig als `identityProviders`
  verdrahtet (Client-ID/Secret via `${GOOGLE_CLIENT_ID}`/`${GITHUB_CLIENT_ID}`
  env-Platzhalter, Mapper, Claims-Kette) — aber **`"enabled": false`**
  committet. Begründung (dokumentiert in `deploy/keycloak/README.md`): ein
  Provider ohne echte, vom Operator
  gesetzte Credentials darf keinen toten Login-Button rendern.
- Frontend-Button in `auth-gate.tsx:49` navigiert real auf `/api/auth/oidc/login`
  — der generische Keycloak-Login (Username/Passwort-Realm) funktioniert
  End-to-End; nur die Google/GitHub-Buttons erscheinen nicht, bis aktiviert.
- **Aktivierung** (bei frischem Deployment: echte Werte für
  `GOOGLE_CLIENT_ID/SECRET` bzw. `GITHUB_CLIENT_ID/SECRET` setzen +
  `"enabled": true`; bei laufendem Deployment: Admin-REST-PUT nachziehen,
  da `--import-realm` mit `IGNORE_EXISTING` läuft — exakte Schritte in
  `deploy/keycloak/README.md`).

Erster Fehler dieser Session: "nur vorbereitet, disabled, TODO" behauptet.
Zweiter Fehler (Selbstkorrektur zu schnell): "vollständig fertig" behauptet,
ohne das `"enabled": false` zu erwähnen — das ignoriert den Kern der
No-Mock-Entscheidung. Diese Fassung ist die geprüfte, mit `deploy/keycloak/README.md`
abgeglichene Wahrheit.

Zusätzlich gefixt: `/api/auth/oidc/login` und `/api/auth/callback` fehlten
in `API_DOCS.md` (Documentation-Mandate-Bug) — jetzt ergänzt (16.9.),
inklusive des enabled:false-Hinweises.

## Bekanntes Backlog-Chaos (Audit heute, nicht behoben)

Vier Task-Nummern erscheinen in `BACKLOG.md` mit widersprüchlichem Status
an zwei Stellen gleichzeitig: **084, 085, 086, 090** (090 ist am
schlimmsten — zwei komplett unterschiedliche Features teilen sich die
Nummer: die reale Prompt-Datei ist "Scanopy-Grid-UI", aber der
committete Onboarding-Flow nennt sich in der Commit-Message ebenfalls
TASK-090, ohne eigene Prompt-Datei). Gleiches Muster bei TASK-074 (zwei
Prompt-Dateien, zwei Features). Nicht selbst neu nummerieren ohne
Operator-Rücksprache — nur zur Kenntnis nehmen, bevor man sich auf eine
Backlog-Zeile verlässt.

## Reihenfolge-Empfehlung für die nächste Session

1. ~~TASK-073-OAuth-Widerspruch klären~~ — erledigt 16.9., siehe oben.
2. Ghost-Daten-Cleanup, falls Operator zustimmt (kleines, risikoarmes WP).
3. ~~SPRINT-44 WP1-WP4~~ — geschrieben 16.9. (siehe Sprint-File), aber
   **ungetestet** (Docker/Ansible-Ausführung war in dieser Sandbox
   blockiert). Nächster Schritt ist NICHT WP5, sondern:
   a. `ansible-playbook --syntax-check` gegen `deploy/ansible/playbooks/deploy-service.yml`
      für alle 6 Services.
   b. Ein echter `make redeploy SERVICE=<x> NODE=trading`-Lauf (oder ein
      frischer Test-Node), Verhalten gegen die Abnahme-Kriterien im
      Sprint-File prüfen.
   c. Den offenen Scope-Konflikt mit dem Operator klären (Sprint-File,
      Abschnitt "⚠️ Ungelöster Scope-Konflikt") — betrifft ob/wie dieser
      Dev-Host selbst migriert wird.
   d. Erst danach WP5 (`docker-compose.yml` entfernen).
4. `make go-build` + `npm run dev` gegen den Live-Stack laufen lassen, um
   die WP1-Config-Migration zu bestätigen (in dieser Sandbox nicht möglich).
