# SPRINT-167 — AUTO-GENERIERTE SERVICE-SECRETS STATT KNOWN-DEFAULTS (DBs u.a.)

**Status:** ✅ PHASE 1 abgeschlossen 1.10.2026 (Code + statische Verifikation,
kein Deploy — Operator-Order „nicht lokal deployen"; Live-Redeploy =
Operator-Schritt, s. Offene Items). **PHASE 2 offen** (deploy/backend,
deploy/siem, deploy/vault, local-stack/.env.example, Redis requirepass).
Ursprünglicher Start 30.9. (Operator: "KANNST DU DAS JETZT BITTE
MACHEN …"). Die ursprüngliche Startbedingung (erst nach S161-Landung) ist durch die
Ownership-Aufteilung ersetzt: Phase 1 = alles AUSSERHALB von deploy/backend +
deploy/siem + local-stack.sh/.env.example (die bleiben S161/S162/Phase 2).
S161 sitzt weiterhin in deploy/backend/** — Kollision bewusst vermieden.

**Operator-Idee 30.9., verbatim:** "eigentlich sollten die passwörter für die dbs usw erzeugt
werden mit md5 hash oder whatever wenn der user nicht explizit eins angibt wenn er schon ne
datenbank hat die wir mitbenutzen wollen"

## Ziel

Kein Service der Deploy-Chain (Postgres, Redis, Backups u.a.) darf ein bekanntes/hartkodiertes
Default-Passwort deployen. Stattdessen:

1. **User gibt Credentials explizit an** (bestehende DB, die weiterbenutzt werden soll):
   User-Werte gewinnen IMMER — nichts wird generiert, nichts wird still überschrieben.
2. **User gibt nichts an:** System generiert ein starkes Secret (z.B. `openssl rand -base64 32`).
   Zu "md5 hash oder whatever": das Hash-Format ist Postgres' eigene Auth-Interna
   (`password_encryption`, modern = scram-sha-256) — wir bauen KEIN eigenes Hash-Verfahren,
   wir erzeugen nur ein starkes Klartext-Secret und PG hasht serverseitig selbst.
3. **Idempotenz + Persistenz (Mandate 9 + Persistenz-Mandat):** einmal generierte Secrets
   werden PERSISTENT gespeichert (bevorzugt Vault secret_ref — das Muster existiert schon bei
   Plugin-Installationen; sonst node-lokale .env, gitignored) — NIEMALS bei jedem Deploy neu
   generiert (sonst bricht jede laufende DB), NIEMALS geloggt, NIEMALS im Git. Präsenz-Check
   ohne Wert-Exposition (Ozone-S3-Muster aus S62).

## Inventar-Startpunkt (30.9., schnell gescannt — der bauende Agent verifiziert vollständig)

Siehe Bau-Phase: vollständiges `| default('...')`-Inventar über deploy/** (Passwort-/Secret-Charakter), local-stack.sh und .env.example.

## Bau-Auftrag (Welle 2)

- Vollständiges Inventar aller Passwort-/Secret-Default-Fallbacks in deploy/** + local-stack.sh.
- Muster: Vault-secret_ref zuerst, Fallback node-.env; ehrliches LAUTES Failen mit klarer
  Remediation, wenn weder User-Wert noch gespeichertes Secret existieren.
- Bestehende-DB-Reuse-Pfad: explizite User-Credentials haben Vorrang, keine stille Überschreibung.
- Verification: KEINE Deploy-Läufe (Operator-only) — bash -n / shellcheck / YAML-Check +
  ehrliche Offen-Items, wie in S162 gehandhabt.

## Abgrenzung

- S161 (läuft): entfernt den VAULT-ROOT-TOKEN-Fallback. S167 = dieselbe Klasse für die
  SERVICE-Secrets (DB-/Redis-Passwörter u.a.).
- Single-Container-Bootstrap (Operator-Idee, SPRINT-160-Nachtrag): muss S167s Muster direkt
  erben — der Bootstrap-Container generiert/overnimmt beim Erststart genau so seine Secrets.

---

## PHASE 1 — Plan (vor dem Bau, 30.9.,bauender Agent: S167-Phase-1)

**Ownership Phase 1:** deploy/keycloak/**, deploy/grafana/**, deploy/postgres/**,
deploy/redis/** (nur Inventar — s. u.), Backups-Deploy-Dateien (Suche: keine
existent), dieses Sprint-Doc. ALLES andere (deploy/backend, deploy/siem,
deploy/vault, *falco*, local-stack.sh, .env.example, src/backend, src/frontend)
bleibt unangetastet.

### Ziel-Zustand pro Credential (einheitliche Matrix, aus dem Bau-Muster oben)

1. **User-Wert** (Controller-.env-Lookup ODER overrides.local.yml) → gewinnt IMMER,
   wird in die Node-.env persistiert (nichts generieren).
2. Sonst **gespeicherter Wert** in der Node-.env → wird wiederverwendet (NIEMALS neu
   generieren; Präsenz-Check per grep, Wert nie ausgeben/loggen).
3. Sonst **frisches Ziel** (Postgres-Volume uninitialisiert / Keycloak-DB ohne Tabellen
   / Grafana-Volume ohne grafana.db) → auf der NODE generieren (`openssl rand -hex 32`,
   256-bit, alphabet-sicher für .env/sed — gleiche Idiom-Familie wie
   deploy/router-bootstrap), idempotent an die Node-.env anhängen (0600).
4. Sonst **bestehende Instanz** → LAUT failen mit exakter Remediation (deklarieren /
   rotieren / wipe — s. Einzelfälle unten), nie still ein falsches Passwort schreiben.

**Live-Verifikation (Mandat 2):** der Deploy beweist, dass das deployte Passwort
wirklich authentifiziert — Postgres: `psql SELECT 1` über jimesh-net mit
PGPASSWORD aus der Node-.env; Grafana: Login-Probe `GET /api/user` mit den
deployten Admin-Creds; Keycloak: die kcadm-Schritte (config credentials) laufen
ohnehin mit dem Bootstrap-Passwort — schlägt eines fehl, failt der Deploy LAUT.

**Geheimnis-Fluss (nie loggen):** generierte Werte existieren NUR in der Node-.env
(0600) + dem Container-Env (`docker run --env-file`). Ansible-Task-Args enthalten
NUR $VAR-Referenzen bzw. Jinja-Statusvariablen — nie einen generierten Klartext.
Tasks, die User-Werte rendern, tragen `no_log: true`. Controller-.env-Sync
generierter/backend-gekoppelter Werte über das router-bootstrap-Idiom
(`/ansible/env-file`-Bind-Mount, lineinfile + delegate_to localhost + no_log).

### Work Packages

**WP1 deploy/postgres (postgresql superuser pw, bisher hart 'jimesh_secure_pass'):**
- defaults.yml: `postgres_password` → Lookup `JIMESH_POSTGRES_PASSWORD` aus der
  Controller-.env, Default `''` (leer = nicht angegeben; overrides.local.yml
  gewinnt wie überall).
- ansible-task.yml: Volume-Init-Detektion (`PG_VERSION` im Volume, read-only-Probe
  mit dem eigenen postgres-Image, `--entrypoint sh`), Matrix nach oben,
  Node-.env `<deploy_root>/deploy/postgres/.env` (Key JIMESH_POSTGRES_PASSWORD),
  docker run konsumiert sie via node-seitigem Sourcing (nie im Ansible-Log),
  Health-Wait + psql-Auth-Verifikation, LAUTE Fails mit Remediation
  (bestehendes pre-S167-Volume: aktuellen Wert deklarieren via echo-Zeile ODER
  `ALTER USER jimesh WITH PASSWORD` rotieren + deklarieren ODER Volume löschen,
  wenn Daten verzichtbar), Controller-.env-Sync bei generiertem Wert,
  ehrliche Ergebnis-Meldung (Status je Credential, nie Werte).
- Konsumenten-Kopplung: keycloak + grafana-Exporter lesen dieselbe Node-.env-Zeile
  (WP2/WP3). backend (deploy/backend, FREMD) hat `backend_database_url` noch
  hart auf jimesh_secure_pass → PHASE-2-HANDOFF (s. u.): Backend muss
  JIMESH_POSTGRES_PASSWORD (Controller-.env, wird von WP1 synchronisiert)
  konsumieren. Auf FRISCHEN Nodes bricht der Backend-Deploy daher LAUT (DB-Auth),
  bis Phase 2 gelandet ist — ehrlicher Fail statt Known-Default.

**WP2 deploy/keycloak:**
- kcadmin (KC_BOOTSTRAP_ADMIN_PASSWORD, bisher Default 'kcadmin_change_me'): Matrix
  mit Existing-Instance-Nuance (Bootstrap nur beim ersten Start; init-Detektion =
  Tabellen-Count in der keycloak-DB via docker exec psql; vor S167 deployte Instanz
  ohne gespeichertes Secret → LAUT failen: aktuellen Wert deklarieren oder — wenn
  die keycloak-DB verzichtbar ist — DB droppen + neu bootstrapen).
- jimesh-realm admin-User (JIMESH_ADMIN_PASSWORD, bisher Default ''): kcadm
  set-password ROTIERT bei jedem Deploy live → Generierung immer sicher wenn
  weder User-Wert noch gespeicherter Wert existiert; Operator liest den Wert
  einmalig aus der Node-.env (SURFACED, Mandat 12: Credential wird benannt, nie
  ausgegeben).
- Dashboard-Client-Secret (DASHBOARD_CLIENT_SECRET, bisher Default ''): reines
  Service-zu-Service-Secret (kein consumer key!) → generierbar; der kcadm-Fixup
  (läuft bei jedem Redeploy) setzt es live; jimesh-realm.json stellt auf rohe
  `${VAR}`-Syntax um (Keycloak 26 löst die beim Import aus dem Container-Env auf —
  verifiziert, README) → das gestagte Realm-JSON enthält KEINE Secrets mehr (0644
  damit unkritisch); der Fixup heilt ein evtl. nicht aufgelöstes Feld im selben
  Deploy, ein gescheitertes Fixup failt LAUT.
- keycloak_db_password (bisher hart 'jimesh_secure_pass'): User-Override gewinnt
  (External-DB-Reuse!), sonst Auflösung aus der Postgres-Node-.env, sonst LAUT fail.
- Controller-.env-Sync der drei backend-gekoppelten Werte (backend liest alle drei
  per Lookup) — router-bootstrap-Idiom.
- Ensure keycloak-DB existiert (createdb wenn fehlt — pre-pg-init-Volumes).

**WP3 deploy/grafana:**
- grafana_admin_password (bisher Default 'jimesh_grafana_change_me'): Matrix;
  Existing-Volume-Nuance: Grafana übernimmt GF_SECURITY_ADMIN_PASSWORD nur bei
  Erstinitialisierung des grafana-data-Volumes → Init-Detektion (grafana.db im
  Volume) + Login-Probe verifiziert den deployten Wert LEBEN (falsch → LAUT fail
  mit grafana-cli-Rotations-Runbook).
- PG-Exporter-DSN-Passwort (bisher hart 'jimesh_secure_pass'): Auflösung aus der
  Postgres-Node-.env wie WP2.
- .env-Renderung von copy→lineinfile umgestellt (nur nicht-geheime Zeilen;
  Operator-Zeilen + generierte Zeilen überleben Redeploys — siem-Muster).
- docker-compose.yml: die beiden Known-Default-Fallbacks (`:-jimesh_grafana_change_me`,
  `:-jimesh_secure_pass`) → `:?`-Pflicht-Interpolation (fail-closed, gleiches Muster
  wie S161s VAULT_ROOT_TOKEN-Guard). Lokal-Dev braucht dafür einmalig eine
  deploy/grafana/.env (gitignored über die root .gitignore-Regel) — README dokumentiert
  die zwei Zeilen; auf Nodes rendert der Task die .env immer vor compose up.

**WP4 Redis + Backups (nur Inventar, bewusst KEINE Änderung):**
- Redis deployt HEUTE kein Passwort (kein Known-Default, ehrlicher Empty-State;
  internes Netz + Loopback-Publish). Ein requirepass JETZT würde alle Konsumenten
  (backend-Deploy = FREMD, evtl. sogar src/backend-Code) brechen → Phase-2-Handoff
  mit konkretem Plan.
- Backup-Deploy-Dateien: FINDING — es existieren KEINE im Repo (find/grep über
  deploy/, Makefile, scripts/) → Inventar-Eintrag + Vererbungsregel für den
  künftigen Bootstrap-Container (SPRINT-160-Idee).

**WP5 Inventar + Docs:** vollständiges Known-Defaults-Inventar (unten), README-Updates
(keycloak/grafana), ehrliche Offen-Items.

### Akzeptanzkriterien Phase 1

- Kein Task-Arg enthält einen generierten Klartext (grep-Verifikation im Sprint-Doc).
- Keine der geänderten Dateien deployt noch einen Known-Default-Passwort-Default.
- bash -n auf allen eingebetteten Shell-Skripten (extrahiert), YAML-Sanity via
  PyYAML auf allen geänderten YAML-Dateien, ansible-playbook --syntax-check im
  jimesh-ansible-runner:local-Container (rein statisch, KEIN SSH, KEIN Node).
- Baseline unverändert: tsc 471 (keine neuen), vitest grün, check-i18n PASS,
  make go-build + make go-vet Exit 0. KEINE Deploy-Läufe (Operator-only).
- Bestehende Nodes (trading) brechen NICHT: alle Matrix-Pfade, die einen
  bestehenden Zustand antreffen, failen LAUT (oder nutzen den User-Wert) statt
  etwas still zu ändern.

## Arbeitslog (Phase 1 — was tatsächlich gebaut wurde, Datei:Zeilen-Belege)

**Attribution ehrlich:** Der S167-Agent lief seit dem Operator-Start 30.9.
sehr lange und starb ohne Meldung am Ende; sein kompletter Phase-1-Arbeits-
baum war im Tree. Dieser Abschnitt + Verifikation + Offene Items sind vom
Parent 1.10. am FERTIGEN Tree nachgezogen und jede Behauptung einzeln
geprüft (Befehle unten). Nichts davon ist aus dem Plan abgeschrieben.

**Matrix, einheitlich in allen drei Services** (Plan-Ziel 1–4, überall
gleich implementiert): User-Wert (Controller-.env-Lookup `JIMESH_*` ODER
`overrides.local.yml`) gewinnt IMMER → sonst gespeicheter Node-.env-Wert
(NIE neu generiert) → sonst `openssl rand -hex 32` auf der NODE bei frischem
Ziel → sonst LAUTER Fail mit exakter Remediation. Niemals still etwas
falsches schreiben (Mandat 2).

**`deploy/postgres/**` (superuser pw, war hart `jimesh_secure_pass`):**
- `defaults.yml:32` `postgres_password` → `lookup('ansible.builtin.env',
  'JIMESH_POSTGRES_PASSWORD') | default('', true)` — kein Literal mehr.
- `ansible-task.yml:70–92` Volumen-Probe (`PG_VERSION` read-only) → Fakt
  initialized|fresh, bei Probe-Fehler LAUT fail (81).
- `ansible-task.yml:101` die Matrix als EIN no_log-shell-Task (`no_log: true`
  bei 144), Exit-Codes 4/5/6 als eigene, laute Fail-Tasks (146/158/192).
- `ansible-task.yml:215` Controller-.env-Sync (`lineinfile` + `delegate_to
  localhost` + `no_log`) — `deploy/backend` liest denselben Wert (Phase-2-
  source of truth); Warnung 228 wenn das `/ansible/env-file`-Mount fehlt.
- `ansible-task.yml:253` Container läuft mit `--env-file` (Wert steht NIE in
  Task-Args/Ansible-Logs/docker-argv), 293 **LIVE-Auth-Verifikation**
  (`psql SELECT 1` mit dem aus der Node-.env gelesenen PW), 308 failt laut
  wenn der Wert nicht authentifiziert.

**`deploy/keycloak/**` (4 Credentials):**
- `defaults.yml:47` kein `jimesh_secure_pass`-Literal mehr; alle vier
  Defaults sind leere Lookup-Werte.
- `ansible-task.yml:113–129` Bootstrap-State-Detection (Tabellenzahl) —
  entscheidet zwischen "generieren erlaubt" und "LAUT fail" (Nuance 5).
- `ansible-task.yml:139` Matrix-Task (no_log, 144): KC_BOOTSTRAP_ADMIN_
  PASSWORD / DASHBOARD_CLIENT_SECRET / JIMESH_ADMIN_PASSWORD / KC_DB_
  PASSWORD — User-Wert → Node-`.env` → frische DB → generate; vorhandene
  DB ohne bekannten kcadmin-Passwort → exit 4 → Fail-Task 239 mit dem
  Keycloak-spezifischen Grund (der Bootstrap-Admin wird NUR beim ersten
  Start gesetzt).
- `ansible-task.yml:304` Sync der drei backend-gekoppelten Werte in die
  Controller-.env (`no_log`, `loop_control.label` = nur der KEY-Name, nie
  der Wert); `ansible-task.yml:323` ehrliche Warnung ohne Mount.
- `jimesh-realm.json:33,90` `${DASHBOARD_CLIENT_SECRET}` / `${JIMESH_ADMIN_
  PASSWORD}` rohe Env-Syntax (Keycloak löst beim Import aus dem Container-Env
  auf) → das gestagte Realm-JSON enthält 0 Secrets; `ansible-task.yml:80`
  rendert es per `template:` (Jinja `{{ jimesh_vpn_ip }}` bleibt erhalten).
- `ansible-task.yml:354` `docker run --env-file` → die Werte kommen aus der
  Node-.env, nicht aus Task-Args; 399/424 kcadm-Auth + Fixups (dashboard-
  secret, admin-passwort) angleichen — 443 failt LAUT wenn die Auflösung
  nicht stimmt (nie ein grüner Lüge).

**`deploy/grafana/**` (admin pw + exporter-DSN):**
- `defaults.yml:86,107` `grafana_admin_password` ohne Known-Default,
  Lookup-basiert.
- `ansible-task.yml:98–139` Volumen-Status (grafana.db vorhanden =
  initialisiert) — Existing-Volume-Nuance: Grafana übernimmt
  `GF_SECURITY_ADMIN_PASSWORD` nur bei ERSTinitialisierung.
- `ansible-task.yml:151` Matrix (no_log, 215); 229 LAUT fail bei
  initialisiertem Volume ohne bekannten Wert (mit grafana-cli-Rotations-
  Runbook), 262 LAUT falls kein Postgres-Secret auf dem Node.
- `ansible-task.yml:289` .env-Renderung per `lineinfile` (nur nicht-geheime
  Zeilen → Operator- und Generator-Zeilen überleben Redeploys), 312
  Präsenz-Assertions OHNE Werte, 328 benennt die fehlende Zeile lauthals.
- `docker-compose.yml:57,110` **beide Known-Default-Fallbacks entfernt →
  `:?`-Pflicht-Interpolation** (kein Start ohne Wert); 421 LIVE-Login-
  Probe, 459–533 echte Exporter-/Prometheus-Checks (pg_up, redis_up).

**WP4 Redis + Backups (bewusst KEINE Änderung, nur Inventar):** Redis
deployt heute kein Passwort (kein Known-Default — ehrlicher Empty-State),
ein requirepass JETZT würde fremde Konsenten brechen → Phase-2-Handoff;
Backup-Deploy-Dateien existieren im Repo NICHT (find/grep) → Inventar +
Vererbungsregel für den künftigen Bootstrap-Container.

**WP5 Docs:** `deploy/grafana/README.md` (+70) und
`deploy/keycloak/README.md` (+39) — Matrix, `:?`-Syntax, lokaler Dev ohne
Known-Defaults, Wo-lesen-ich-das-Passwort-Hinweise.

## Verifikations-Transkript (1.10., statisch/hermetisch — KEIN Deploy,
KEINE Node-Berührung, Operator-Order „nicht lokal deployen")

1. **PyYAML-Sanity** über alle 7 geänderten YAML-Dateien
   (grafana: ansible-task/defaults/docker-compose, keycloak: ansible-task/
   defaults, postgres: ansible-task/defaults) → **alle OK**.
2. **`ansible-playbook --syntax-check` im Repo-eigenen
   `jimesh-ansible-runner:local`** (rein statisch, kein SSH, kein Node),
   Wrapper = `include_vars defaults.yml` + `import_tasks ansible-task.yml`:
   grafana **rc=0**, keycloak **rc=0**, postgres **rc=0**.
3. **`bash -n` über alle eingebetteten shell-/command-Snippets** (aus den
   YAML-Blocs extrahiert, PyYAML-Walk): **32 Snippets, 0 Fehler**.
4. **Kein Known-Default mehr deployt:** grep
   `jimesh_secure_pass|jimesh_grafana_change_me|:-jimesh_` über die
   geänderten Deploy-Dateien → Treffer NUR in Kommentaren/README-Erläuterungen,
   0 in einer Wertposition; `defaults.yml`-Werte sämtlich `lookup(...) |
   default('', true)`.
5. **Kein generierter Klartext in Task-Args:** Secret-Resolution läuft
   ausschließlich in `no_log: true`-Tasks (postgres 144, keycloak 144,
   grafana 215); der Controller-.env-Sync ebenfalls `no_log` mit
   `loop_control.label` = Key-Name; Ergebnis-Debugs zeigen nur
   `STATUS|…`-Zeilen (grep `VAL|` konsumiert ausschließlich innerhalb
   no_log-Tasks). Generatoren = `openssl rand -hex 32` in der Node-Shell.
6. **Realm-JSON:** `json.load` → **gültig**; 0 Secret-Literale.
7. **Baselines unverändert (diese Session gefahren):** `make go-build` +
   `make go-vet` Exit 0 · `npx tsc -p tsconfig.app.json --noEmit` → 414
   (0 in S167-Dateien, die sind rein `deploy/**`) · `npx vitest run` →
   61 Dateien / 493 Tests grün · `node scripts/check-i18n.mjs` → PASS 60
   Locales / 3307 Keys.
8. **Nicht gelaufen (ehrlich):** `make redeploy` gegen einen echten Node,
   Live-Login/psql/kcadm-Verifikation auf trading, `ansible-lint`.

## Offene Items (ehrlich)

- **Phase 2 offen (Ownership bewusst fremd/geplant):** `deploy/backend/**`,
  `deploy/siem/**`, `deploy/vault/**`, `local-stack.sh` + `.env.example`
  (dort hängt noch der lokale `jimesh_secure_pass`-Pfad des
  postgres-exporter-DSN, README grafana:190 benennt es), Redis
  `requirepass` (Konsumenten-Risiko, s. WP4), Backups-Bootstrap.
- **Erster Live-Redeploy = Operator-Schritt.** Exakte Befehle, mit denen
  die Matrix STRENG getestet wird (bewusst kein Automatismus in diesem
  Sprint):
  `make redeploy SERVICE=postgres NODE=trading` → Task muss die LIVE-Auth
  bestehen und in der Node-`.env` `JIMESH_POSTGRES_PASSWORD` stehen haben;
  `make redeploy SERVICE=keycloak NODE=trading` → kcadm-Fixups müssen
  grün werden (beweist die Auflösung); `make redeploy SERVICE=grafana
  NODE=trading` → Login-Probe + `pg_up`/`redis_up` in Prometheus.
  ACHTUNG vorher: bestehende Nodes haben HEUTE echte Werte in ihrer
  Node-.env — die Matrix findet sie und generiert nichts (Fall 2).
- **Bestands-Risiko ohne gespeicherten Wert:** bei einem bereits
  initialisierten Ziel OHNE bekannten Wert failt der Deploy absichtlich
  (postgres 158, keycloak 239, grafana 229) — das ist Absicht, kein Bug:
  die Remediation steht im jeweiligen Fail-Text.
- **`grafana_admin_password` auf bestehendem Volume:** Grafana übernimmt
  den Wert nur bei Erstinitialisierung; deshalb die Login-Probe + das
  grafana-cli-Rotations-Runbook (grafana 229/438). Wird live geprüft.
- **Controller-.env-Sync braucht das Makefile-Bind-Mount
  `/ansible/env-file`** (der `redeploy`-Target-Mount). Außerhalb von
  `make redeploy` (losem `ansible-playbook`) warnen die Tasks laut (228/323)
  statt still zu überspringen.
