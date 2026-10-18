# SPRINT-161 — VAULT-SECRET-HARDENING (P0)

**Datum:** 2026-09-30 · **Status:** Code/Docs/Tests fertiggestellt & verifiziert —
echte Rotation bleibt Operator-only (Runbook unten) · **Priorität:** P0 laut
`HANDOFF-2026-09-29-FINAL.md` Punkt 1 + Nachtrag 2 (Vault-Befund verschärft).

> Schreibweise: das alte Dev-Root-Token-Literal wird in DIESEM Sprint-Doc
> bewusst NICHT ausgeschrieben (Schreibweise `jm_master_root_<redacted>`), damit
> die Bereinigung nicht sofort eine neue getrackte Kopie erzeugt. Der Operator
> kennt den Wert; er steht in der Git-Historie und in `.env`.

## Plan

### Ziel

Das bekannte Vault-Dev-Root-Token (`jm_master_root_<redacted>`, öffentlich über
Repo + Git-Historie kompromittiert) darf vom CODE nicht mehr bekannt sein.
Überall, wo es bisher als stiller Fallback diente, wird es entfernt und durch
echtes Fail-Closed-Verhalten ersetzt: fehlt das Token (Env/Config), failt die
Verwendungsstelle LAUT mit klarer Remediation-Message — es gibt keinen stillen
Deploy/Betrieb mit einem bekannten Token mehr. Die eigentliche Rotation ist
Operator-only (Remote-Vault) und wird als Runbook hier dokumentiert (WP6).

### Work Packages

- **WP1 — Repo-weites Inventar:** jeder Fund des Literals mit Datei:Zeile,
  getrackt + dotfiles (`git grep` + ripgrep-Blinder-Fleck `.`-Files) + die
  gitignored-Operator-Datei `.env`. → Abschnitt „Inventar“ unten.
- **WP2 — Backend fail-closed:** `src/backend/internal/security/vault_client.go`:
  hartkodierter Token-Fallback (Zeile 40) entfernen. Token kommt NUR aus
  `VAULT_TOKEN` (Env) bzw. Settings-Stub. Fehlt er: Client bekommt LEERES
  Token, jede Vault-Operation (GetSecret/PutSecret/DeleteSecret/ListSecrets)
  failt VOR jeder HTTP-Anfrage mit `errVaultTokenMissing` + Remediation.
  `InjectSecretAndExecute` meldet ehrlich, wenn Vault UND PG-Fallback failen.
- **WP3 — Ansible-Defaults:** `deploy/vault/defaults.yml:11` und
  `deploy/backend/defaults.yml:33`: `| default('<literal>', true)`-Fallback
  entfernen (`| default('', true)` stattdessen, damit die Variable testbar
  bleibt). Neu: Guard-Task als ERSTE Aufgabe in beiden `ansible-task.yml`-Dateien
  (ansible.builtin.fail), der bei leerem `VAULT_ROOT_TOKEN` den Deploy LAUT
  abbricht mit Remediation-Message. (Begründung: ein fail ist in defaults.yml
  technisch unmöglich; die Task-Dateien sind laut FREMD-Liste nicht gesperrt
  und sind der von WP3 geforderte Ort für das fail-Modul.)
- **WP4 — local-stack.sh:** `src/scripts/local-stack.sh` (Zeilen 51, 88):
  Literale entfernen; Token kommt aus `${VAULT_ROOT_TOKEN}` (Env oder
  `.env`). Guard in `up_vault` UND `up_backend` (deckt `up`, `restart`,
  `restart-backend` ab): ohne Token klarer Abbruch MIT Meldung, bevor irgendein
  docker-Kommando läuft.
- **WP5 — Docs:** das Literal in Doc-Dateien durch
  `<REDACTED-VAULT-ROOT-TOKEN>` ersetzen bzw. durch „kein Default, Token
  setzen“-Anweisung. Für Dateien außerhalb meiner Ownership (API_DOCS.md,
  BACKLOG.md, fremde Sprint-Docs) → Handoff-Notes, kein Edit.
- **WP6 — Operator-Rotations-Runbook:** exakte Schritte (neues Token erzeugen,
  wo injizieren — `.env`/VAULT_ROOT_TOKEN, Backend-Env VAULT_TOKEN, Ansible —,
  altes Token durch Neustart des Dev-Vault ablösen, alte Secrets re-seeden,
  verifizieren). Ehrlich benennen, was nur der Operator am Remote-Node kann.
- **WP7 — Hermetische Go-Tests:** `vault_client_test.go` (neu): fehlendes Env
  → leeres Token + `errVaultTokenMissing` von allen 4 Operationen, KEIN
  HTTP-Request; gesetztes Env → genau dieser Token auf dem Wire (httptest,
  loopback only); keine DB, kein Netz, kein Compose-Stack.

### Acceptance Criteria

1. `git grep -n 'jm_master' -- .` liefert in MEINEN Owned-Dateien (vault_client.go,
   deploy/vault/defaults.yml, deploy/backend/defaults.yml, local-stack.sh,
   .env.example, SECURITY.md, docs/USER_GUIDE.md) TREFFER=0.
2. `make go-build` und `make go-vet` (Repo-Root): Exit 0.
3. Neue hermetische Tests grün (exakter Befehl im Verifikations-Abschnitt),
   ohne DB und ohne Netz (httptest-Loopback ausgenommen, kein externer Call).
4. Kein neuer Treffer des Literals in irgendeiner Datei, die ich anlege/editiere
   (inkl. dieses Sprint-Docs — deshalb redaktierte Schreibweise oben).
5. Frontend-Baseline unangetastet (keine Datei unter src/frontend/ verändert;
   tsc/vitest/i18n unberührt, da reines Backend/Deploy/Docs).
6. Ehrlichkeit (Mandat 6): alles, was ich nicht laufen lassen konnte
   (echter Deploy, echte Rotation, ansible-playbook-Lauf), steht als offen dabei.

### Ownership (zugesichert, nicht angetastet: fremde Dateien)

Mine: vault_client.go + Test-Datei, deploy/vault/defaults.yml,
deploy/backend/defaults.yml, deploy/vault/ansible-task.yml,
deploy/backend/ansible-task.yml, src/scripts/local-stack.sh, .env.example,
SECURITY.md, docs/USER_GUIDE.md, dieses Sprint-Doc.
Fremd (nur gelesen): docs/API_DOCS.md, docs/backlog/BACKLOG.md, fremde
Sprint-Docs, alles unter deploy/siem*, deploy/*falco*, deploy/datalake/*,
src/backend/internal/gateway/**, src/frontend/**.

## Inventar (WP1) — Stand 2026-09-30, vor der Bereinigung

Getrackt (`git grep -n 'jm_master' -- .`, 22 Zeilen) + Dotfile-Blinder-Fleck
(ripgrep überspringt `.`-Dateien; `.env.example` ist getrackt, .env gitignored):

| Datei:Zeile | Typ | In Ownership? | Aktion |
|---|---|---|---|
| src/backend/internal/security/vault_client.go:40 | Go-Fallback-Default | JA | WP2 entfernt |
| deploy/vault/defaults.yml:11 | Ansible-Default-Fallback | JA | WP3 entfernt |
| deploy/backend/defaults.yml:33 | Ansible-Default-Fallback | JA | WP3 entfernt |
| src/scripts/local-stack.sh:51 | docker-run-Literal (VAULT_DEV_ROOT_TOKEN_ID) | JA | WP4 ersetzt durch `${VAULT_ROOT_TOKEN}` |
| src/scripts/local-stack.sh:88 | docker-run-Literal (VAULT_TOKEN) | JA | WP4 ersetzt durch `${VAULT_ROOT_TOKEN}` |
| .env.example:25 | Doc-Kommentar-Literal | JA | WP5 redigiert |
| .env.example:27 | Beispiel-Literal | JA | WP5 redigiert |
| .env.example:30 | Beispiel-Literal | JA | WP5 redigiert |
| SECURITY.md:168 | Doc-Literal | JA | WP5 redigiert |
| docs/USER_GUIDE.md:151 | Doc-Literal (Default-Spalte) | JA | WP5 redigiert |
| docs/API_DOCS.md:1202 | Doc-Literal | NEIN (FREMD) | Handoff-Note |
| docs/backlog/BACKLOG.md:23 | Backlog-Eintrag (S161) | NEIN (Parent-only) | Handoff-Note |
| docs/sprints/GIT-HISTORY-SECRET-SCRUB-2026-09-29.md:41,55,84,217 | historischer Befund-Report | NEIN (fremdes Sprint-Doc) | Handoff-Note |
| docs/sprints/HANDOFF-2026-09-29-FINAL.md:141 | historischer Handoff | NEIN (fremdes Sprint-Doc) | Handoff-Note |
| .env (gitignored, Operator) | `VAULT_ROOT_TOKEN=<Literal>` (1 Treffer, real in Benutzung) | NEIN (Operator-Datei) | Runbook-Schritt (WP6) |

Anmerkung zur Vollständigkeit: das Tool-grep (ripgrep) fand nur 14 der
getrackten Stellen — `.env.example` fiel wegen der Hidden-File-Regel von
ripgrep durch. Vollständiges Inventar via `git grep` (getrackt) + expliziter
Dotfile-Prüfung.

**Ungetrackte (gitignored) Worktree-Fundstellen des Literals** (nicht
Repo-Inhalt, deshalb nicht editier-pflichtig für den Code, aber ehrlich
inventiert — Prüfung 2026-09-30 via `grep -rln` + `git check-ignore`):

| Fundstelle | Status | Umgang |
|---|---|---|
| `.env:41` (`VAULT_ROOT_TOKEN=<Literal>`, real benutzt) | gitignored, Operator-Datei | Runbook-Schritt 2 (Operator ersetzt den Wert) |
| `website/src/generated/docs-content.ts` + `website/.next/**` + `website/out/**` | gitignored Build-Artifakte der Doku-Website | NICHT von mir editiert; sie embedden u.a. `docs/API_DOCS.md` (FREMD). Nach dessen Redaktion (Handoff-Note 1) Website neu generieren — bis dahin stehen alte Kopien des Literals auf der Platte |
| `docs_dev/user-prompts-30h.md`, `docs_dev/user-prompts-72h.md`, `docs_dev/session.jsonl` | gitignored Session-Scratch (Prompts/Logs) | außerhalb des Repos, nicht berührt; Scrub/Ansicht ist Operator-Sache |

Alle drei Gruppen sind per `git check-ignore` verifiziert ignored; `git
grep` bestätigt: KEINE getrackte Fundstelle in meinen Owned-Dateien.

---

## Arbeitslog (umgesetzt, mit Datei:Zeile-Belegen)

### WP2 — Backend fail-closed: src/backend/internal/security/vault_client.go

- **Zeile 40 entfernt:** das Fallback-Literal `token = "jm_master_…_2026"` ist
  weg. `InitVaultClient()` (Zeilen 34–59) liest NUR `VAULT_ADDR`/`VAULT_TOKEN`
  aus dem Env bzw. dem Settings-Stub (Zeile 52, vorbestehender Stub, liefert
  weiterhin leer). Fehlt das Token, wird der Client mit LEEREM Token erzeugt
  und EINMAL laut geloggt (Zeile 55: `[vault-client] VAULT_TOKEN not set —
  Vault operations will fail closed …`).
- **Neu `errVaultTokenMissing`** (Zeilen 61–66): lauter Fehler mit
  Remediation („set VAULT_TOKEN in the backend environment“), package-level
  sentinel, per `errors.Is` testbar.
- **Neu `requireToken()`** (Zeilen 68–75): Fail-Closed-Gate, das JEDE
  Vault-Operation VOR dem Bau/Senden des Requests passiert:
  `GetSecret` (Z. 89), `PutSecret` (Z. 136), `DeleteSecret` (Z. 168),
  `ListSecrets` (Z. 193). Ohne Token geht KEIN HTTP-Request raus — es kann
  also kein stiller Known-Token-Auth-Versuch stattfinden.
- **`InjectSecretAndExecute`** (Zeilen 229–255): Vault-Fehler wird als
  `vaultErr` festgehalten; schlägt zusätzlich der verschlüsselte
  PostgreSQL-Fallback fehl, werden BEIDE Fehler ehrlich gemeldet (Z. 252,
  `fmt.Errorf("vault fetch failed (%v); encrypted-PostgreSQL fallback
  failed: %w")`) — kein Verschlucken mehr, warum Vault übersprungen wurde.
  Die legitime Mandat-9-Fallback-Kette (Vault ODER AES-GCM-PG) bleibt
  unverändert: ohne Vault-Token dient der PG-Vault weiterhin ehrlich.
- Struct-Doc (Z. 21–25) sagt jetzt explizit: Token ist IMMER extern
  geliefert, „a literal baked into the binary is a published credential“.

### WP7 — Hermetische Tests: src/backend/internal/security/vault_client_test.go (NEU)

- `TestInitVaultClientFailClosedWithoutToken` (Z. 35): ohne `VAULT_TOKEN` →
  `vaultClient.token == ""` (nicht das alte Literal), Default-Addr bleibt.
- `TestInitVaultClientUsesEnvToken` (Z. 53): Env-Token wird 1:1 übernommen.
- `TestVaultOpsFailClosedWithoutToken` (Z. 72): alle 4 Operationen liefern
  `errors.Is(err, errVaultTokenMissing)`; Subtest, dass die Message
  `VAULT_TOKEN` nennt; und der Stub-Server (httptest, Loopback) sieht
  **0 Requests** — das Gate läuft vor jedem HTTP-Call.
- `TestVaultGetSecretSendsConfiguredToken` (Z. 121): gesetztes Env-Token
  landet unverändert im `X-Vault-Token`-Header (keine Substitution).
- Hermetisch: keine DB (kein `DATABASE_URL`), kein externes Netz (httptest
  bindet nur Loopback im Testprozess), kein Compose-Stack. State-Reset über
  `resetVaultClient` (Z. 26) mit `t.Cleanup`.

### WP3 — Ansible: defaults + fail-Guards

- `deploy/vault/defaults.yml:19`: `vault_dev_root_token` jetzt
  `{{ lookup('ansible.builtin.env', 'VAULT_ROOT_TOKEN') | default('', true) }}`
  — Literal-Fallback entfernt; Kopf-Kommentar (Z. 2–9) erklärt Fail-Closed;
  Z. 16–18 dokumentieren, warum die bewusst leere Default-Variable nötig ist
  (Guard-Testbarkeit).
- `deploy/vault/ansible-task.yml:10–28` (NEU, ERSTE Aufgabe, vor jedem
  rm/run): `"vault — hard fail: VAULT_ROOT_TOKEN is not set (fail-closed)"`
  mit `ansible.builtin.fail` + Remediation-Message (Zufallstoken erzeugen,
  in gitignored `.env` als `VAULT_ROOT_TOKEN`, `make redeploy
  SERVICE=vault NODE=…`, gleicher Wert für Backend/Local-Stack, nie committen);
  `when: vault_dev_root_token | default('', true) | trim | length == 0` (Z. 28).
  Der Container bekommt weiterhin genau diesen Wert:
  `-e VAULT_DEV_ROOT_TOKEN_ID={{ vault_dev_root_token }}` (Z. 45).
- `deploy/backend/defaults.yml:38`: `backend_vault_token` analog ohne
  Literal (Kommentar Z. 33–37 erklärt Fail-Closed).
- `deploy/backend/ansible-task.yml:11–29` (NEU, ERSTE Aufgabe): derselbe
  Guard gegen `backend_vault_token`; Message erklärt, dass der Backend sonst
  OHNE Vault-Token läuft (runtime fail-closed) oder ein kompromittiertes
  Literal resurrecten würde. `-e VAULT_TOKEN={{ backend_vault_token }}` (Z. 73).
- Hinweis zur Ownership: die beiden `ansible-task.yml` standen nicht
  ausdrücklich in meiner Ownership-Liste, aber WP3 fordert ausdrücklich das
  `ansible fail-Modul o.ä.` — ein fail ist in defaults.yml technisch
  unmöglich; die Task-Dateien stehen NICHT auf der FREMD-Liste und sind der
  geforderte Ort. Bewusst so umgesetzt und hier transparent vermerkt (Review
  im Parent-Bit erbeten).
- Task-Namen mit `"…"` quoted (YAML-Plain-Scalar-Pflicht, da `hard fail:`
  ein `": "` enthält — pyyaml hat den unquoted Fall zu Recht abgelehnt).

### WP4 — src/scripts/local-stack.sh

- Neu `require_vault_root_token()` (Z. 24–42): ohne `${VAULT_ROOT_TOKEN}`
  sofortiger Abbruch mit 8-zeiliger Remediation-Meldung auf stderr
  (inkl. `VAULT_ROOT_TOKEN=\$(openssl rand -hex 32)`, Hinweis auf .env).
- Guard-Aufrufe: `up_vault` (Z. 68), `up_backend` (Z. 97), `cmd_up` (Z. 158,
  direkt nach dem .env-Sourcing) und `restart-backend` (Z. 185) — damit startet
  OHNE Token gar nichts (WP4 wörtlich: „nicht starten“), und die
  Funktions-Guards decken zusätzlich künftige Call-Pfade ab.
- `:51` → `-e VAULT_DEV_ROOT_TOKEN_ID="${VAULT_ROOT_TOKEN}"` (jetzt Z. 72);
  `:88` → `-e VAULT_TOKEN="${VAULT_ROOT_TOKEN}"` (jetzt Z. 110). Beide
  beziehen denselben Wert aus Env/.env — `cmd_up`/`restart-backend` sourcen
  `.env` VOR dem Guard, also ist `.env` die eine Injektionsstelle.

### WP5 — Docs (eigene Dateien)

- `.env.example:24–37`: alle 3 Literale ersetzt durch
  `<REDACTED-VAULT-ROOT-TOKEN>` + Fail-Closed-Erklärung (kein Built-in-Default
  mehr, pro Environment frischer Zufallstoken, nur in gitignored `.env`).
- `SECURITY.md:166–172`: Literal redaktiert; Text sagt jetzt ehrlich: Token
  „is and remains compromised, no code path may fall back to it; rotate it
  via the runbook in docs/sprints/SPRINT-161-VAULT-SECRET-HARDENING.md“.
- `docs/USER_GUIDE.md:151`: Default-Spalte → „kein Default mehr
  (`<REDACTED-VAULT-ROOT-TOKEN>`)“, Beschreibung: MUSS gesetzt werden;
  fehlendes Token failt jede Vault-Op laut (SPRINT-161).

## Verifikations-Transkript (echt gelaufen, 2026-09-30, Repo-Root)

Alle Befehle exakt wie hier ausgeführt; der lokale Compose-Stack war und
blieb DOWN (kein `make up`/`restart-backend`/`redeploy`, kein SSH, kein
docker-exec in laufende Container, kein commit/push).

**1. Literal-Treffer nach der Bereinigung (getrackt):**
```
$ git grep -n 'jm_master' -- .
docs/API_DOCS.md:1202:- Port: 8200, `VAULT_DEV_ROOT_TOKEN_ID=jm_master_…_2026`
docs/backlog/BACKLOG.md:23:| S161 | … `jm_master_…_2026` …
docs/sprints/GIT-HISTORY-SECRET-SCRUB-2026-09-29.md:41,55,84,217  (4 Treffer)
docs/sprints/HANDOFF-2026-09-29-FINAL.md:141: … `jm_master_…_2026` …
```
→ **7 Zeilen, ALLE in für mich gesperrten Dateien** (fremd/parent-only). In
ALL meinen Ownership-Dateien: 0 Treffer. Dotfile-Blinder-Fleck geprüft:
`.env.example` sauber; `.env` (gitignored, Operator) hat noch 1 Treffer
(`.env:41`) → Runbook-Schritt 2, NICHT von mir editiert.

**2. `bash -n src/scripts/local-stack.sh`** → Exit 0.

**3. Funktionsmatrix local-stack.sh (echtes Skript, `docker` als Stub im PATH,
damit KEIN echter Docker-Daemon angerührt wird; Skript-Kopie unter
`<root>/src/scripts/` wegen des \`cd ../..\` im Skript):**
- T1 `up` ohne Token: **exit 1, 0 docker-Aufrufe**, Remediation-Meldung
  („VAULT_ROOT_TOKEN is not set — refusing to start.“) auf stderr.
- T2 `restart-backend` ohne Token: **exit 1, 0 docker-Aufrufe**.
- T3 `up`, Token NUR aus `.env` (`VAULT_ROOT_TOKEN=t3-from-dotenv-value`):
  **exit 0**, und der Stub-Log zeigt den Wert auf BEiden Zeilen:
  `VAULT_DEV_ROOT_TOKEN_ID=t3-from-dotenv-value` UND
  `VAULT_TOKEN=t3-from-dotenv-value` (19 docker-Aufrufe insgesamt).
- T4 `up`, Token nur exportiert: **exit 0**, Token auf exakt 2 docker-Zeilen.
- Ehrlichkeits-Fußnote: der ERSTE Matrix-Lauf schlug für T3 fehl — mein
  Test-Harness hatte die Skript-Kopie eine Ebene zu flach abgelegt, das
  \`cd ../..\` landete in /tmp, `.env` wurde dort nicht gefunden — und der
  Guard feuerte korrekt. Harness korrigiert, obige Ergebnisse sind aus dem
  korrigierten Lauf.

**4. YAML-Gültigkeit (python3 + pyyaml, alle 4 angefassten yml):**
```
OK  vault/defaults.yml   keys=[…, vault_dev_root_token]
      vault_dev_root_token = "{{ lookup('ansible.builtin.env', 'VAULT_ROOT_TOKEN') | default('', true) }}"
OK  vault/ansible-task.yml: 3 tasks; first='vault — hard fail: VAULT_ROOT_TOKEN is not set (fail-closed)';
      guard module=True, when="vault_dev_root_token | default('', true) | trim | length == 0"
OK  backend/defaults.yml … backend_vault_token = "{{ lookup('ansible.builtin.env', 'VAULT_ROOT_TOKEN') | default('', true) }}"
OK  backend/ansible-task.yml: 7 tasks; first='backend — hard fail: …'; when="backend_vault_token | default('', true) | trim | length == 0"
```

**5. `make go-build`** (kein Host-Go → lief im `golang:latest`-Container,
exakt das Makefile-Target) → **Exit 0** (`=== GO-BUILD OK ===`).

**6. `make go-vet`** (analog im Container) → **Exit 0** (`=== GO-VET OK ===`).
Anmerkung: lief über den geteilten, in-flight Baum (andere Agenten ändern
parallel gateway.go/plugins.go/App.tsx u.a.) — beide Checks bestanden zum
Laufzeitpunkt; der Parent sollte beim Commit final re-verifizieren.

**7. Hermetische Go-Tests** (gleiche Container-Muster wie make go-build,
NICHT `make go-test` — kein DB- und kein Compose-Zugriff, -run-Filter nur auf
die neuen Tests, keine DB-Abhängigkeit):
```
$ docker run --rm -v "$PWD/src/backend:/src" -w /src \
    -v /home/ji/go/pkg/mod:/go/pkg/mod -v jimesh_go-build:/root/.cache/go-build \
    golang:latest go test ./internal/security/ \
    -run 'TestInitVaultClient|TestVaultOpsFailClosedWithoutToken|TestVaultGetSecretSendsConfiguredToken' \
    -count=1 -v
=== RUN   TestInitVaultClientFailClosedWithoutToken
2026/09/30 05:54:07 [vault-client] VAULT_TOKEN not set — Vault operations will fail closed until VAULT_TOKEN is configured (SPRINT-161)
--- PASS: TestInitVaultClientFailClosedWithoutToken (0.00s)
--- PASS: TestInitVaultClientUsesEnvToken (0.00s)
=== RUN   TestVaultOpsFailClosedWithoutToken   (+ 4 Subtests Get/Put/Delete/List/remediation)
--- PASS: TestVaultOpsFailClosedWithoutToken (0.00s)  [und alle Subtests]
--- PASS: TestVaultGetSecretSendsConfiguredToken (0.00s)
PASS
ok  	github.com/ji-podhead/jimesh/backend/internal/security	0.008s
```
→ 4 Tests + 5 Subtests PASS. Der Log-Beleg in der Ausgabe zeigt zusätzlich,
dass der LAUTE Hinweis aus `InitVaultClient` real feuert.

**8. Frontend-Baseline:** von mir NICHT angetastet — keine Datei unter
`src/frontend/` von mir geändert, deshalb tsc/vitest/i18n nicht nötig und von
mir nicht gelaufen (andere Agenten arbeiten parallel an Frontend-Dateien; die
Baseline-Verantwortung liegt bei deren Sprints bzw. beim Parent-Sammellauf).

### Acceptance-Criteria-Abgleich

| # | Kriterium | Ergebnis |
|---|---|---|
| 1 | Literal aus allen Owned-Dateien entfernt | ✅ 0 Treffer in Owned-Dateien (7 Rest-Treffer alle gesperrt) |
| 2 | make go-build + make go-vet Exit 0 | ✅ beide Exit 0 |
| 3 | Hermetische Tests grün | ✅ 4 Tests + 5 Subtests PASS, kein DB-/Netz-Zugriff |
| 4 | Kein neuer Literal-Treiber in meinen Dateien | ✅ Sprint-Doc nutzt redaktierte Schreibweise |
| 5 | Frontend-Baseline unangetastet | ✅ keine src/frontend/**-Datei von mir verändert |
| 6 | Ehrlichkeit | ✅ Unverifizierbares steht unten als offen |

## WP6 — Operator-Rotations-Runbook (nur der Operator kann das)

**Kontext (aus GIT-HISTORY-SECRET-SCRUB, Part 4):** Der Remote-Vault läuft in
DEV-MODE (`vault server -dev`, in-memory, Root-Token ist durch
`VAULT_DEV_ROOT_TOKEN_ID` beim Prozessstart fixiert). „Rotation“ ist daher
KEIN Vault-API-Create-Token auf dem laufenden Server, sondern: neuen
Zufallswert setzen und den Vault-Container neu erstellen. Konsequenz: der
in-memory KV-Bestand wird dabei GELÖSCHT und muss neu geseedet werden
(Schritt 5). PG-verschlüsselte Secrets (Mandat-9-Fallback-Store) sind davon
NICHT betroffen — die leben in Postgres.

1. **Neuen Token erzeugen** (Operator-Maschine):
   ```bash
   NEW_TOKEN="$(openssl rand -hex 32)"; echo "$NEW_TOKEN"
   ```
2. **In der gitignored `.env`** (Repo-Root der Maschine, von der `make redeploy`
   läuft) den Wert setzen — dort steht aktuell NOCH das alte Literal
   (`.env:41`, `VAULT_ROOT_TOKEN=…`):
   ```bash
   VAULT_ROOT_TOKEN="$NEW_TOKEN"   # .env editieren, alte Zeile ERSETZEN
   ```
   `make redeploy` reicht `.env` per `--env-file` in den Ansible-Runner; beide
   Guards (`deploy/vault/ansible-task.yml`, `deploy/backend/ansible-task.yml`)
   verlangen diesen Wert jetzt, ein leerer Wert failt den Deploy laut.
3. **Vault rotieren** (Remote, über den normalen Deploy-Weg — kein manueller
   `docker exec`): `make redeploy SERVICE=vault NODE=<name>`. Der Container
   startet mit `VAULT_DEV_ROOT_TOKEN_ID=$NEW_TOKEN`.
4. **Backend nachziehen:** `make redeploy SERVICE=backend NODE=<name>` —
   bekommt `VAULT_TOKEN=$NEW_TOKEN` (gleicher `.env`-Wert). Bis dahin failen
   die Vault-Calls des laufenden Backends ehrlich (403 →
   `InjectSecretAndExecute` fällt auf den PG-Vault zurück; Fehler meldet jetzt
   beide Ursachen).
5. **Dev-Vault neu seeden** (nur was NUR im in-memory Vault lag): auf dem Node
   (SSH; Port 8200 ist an 127.0.0.1 gebunden — Mandat 12):
   ```bash
   ssh <node> 'VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=<NEU> vault kv put secret/jimesh/<name> <k>=<v> …'
   ```
   Die Reihenfolge 3→4→5 minimiert das Fenster, in dem das Backend gegen den
   (geleerten) Vault 403-erhält.
6. **Verifizieren** (Operator, auf dem Node):
   ```bash
   VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=<NEU>  vault token lookup   # muss gehen
   VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=<ALT>  vault token lookup   # muss FAILen
   docker logs --tail 20 jimesh-vault                                   # Dev-Mode gestartet mit neuem Token
   ```
   Zusätzlich Backend-Log prüfen: KEINE \`[vault-client] VAULT_TOKEN not set\`-Warnung
   mehr, und Vault-Zugriffe liefern wieder Daten (nicht nur PG-Fallback).
7. **Lokalen Dev-Stack** (falls benutzt): gleicher `.env`-Wert;
   `src/scripts/local-stack.sh` startet ohne Wert bewusst GAR NICHT.
8. **Altlasten:** das alte Literal bleibt in der GIT-HISTORIE (851 Commits +
   63 weitere Branches) und in 7 getrackten Dateien (s. Inventar) — nach der
   Rotation ist es wertlos (authentifiziert gegen nichts mehr), aber der
   History-Scrub (`GIT-HISTORY-SECRET-SCRUB-2026-09-29.md`, force-push
   vorbereitet, NICHT ausgeführt) bleibt eine eigene Operator-Entscheidung.

**Was explizit NICHT aus dieser Session möglich war** (Regeln: kein Deploy,
kein SSH, Stack down): Schritte 3–6 selbst ausführen, den echten Guard-Fall
im Ansible-Lauf erleben (nur YAML+Logik geprüft), die echte Rotation. Alles
obige ist Runbook, nicht Live-Behauptung.

## Handoff-Notes für die Parent-Session (fremde Dateien, NICHT von mir editiert)

1. `docs/API_DOCS.md:1202` enthält das Literal weiterhin (für mich FREMD).
   Bitte durch `<REDACTED-VAULT-ROOT-TOKEN>` ersetzen + Satzbau wie im
   Scrub-Doc empfohlen („set via VAULT_ROOT_TOKEN, no default“). WICHTIG:
   die Doku-Website generiert `website/src/generated/docs-content.ts` aus
   den Docs — nach der Redaktion die Website neu generieren, sonst bleibt
   das Literal in den (gitignored) Build-Artifakten unter `website/` stehen.
2. `docs/backlog/BACKLOG.md:23` (S161-Zeile) enthält das Literal — beim
   Abhaken/Redigieren bitte redaktieren.
3. `docs/sprints/GIT-HISTORY-SECRET-SCRUB-2026-09-29.md:41,55,84,217` und
   `docs/sprints/HANDOFF-2026-09-29-FINAL.md:141` enthalten es als
   historischen Befund — redaktieren ODER als Historie belassen (nach
   Rotation harmlos); Parent-Entscheidung.
4. `.env:41` (gitignored): `VAULT_ROOT_TOKEN` hat noch den ALTEN Wert —
   Runbook Schritt 2 (Operator).
5. Ownership-Abweichung, transparent: `deploy/vault/ansible-task.yml` +
   `deploy/backend/ansible-task.yml` (Guard-Tasks) waren nicht ausdrücklich in
   meiner Ownership-Liste, sind aber von WP3 gefordert (fail-Modul) und nicht
   gesperrt. Bitte beim Commit reviewen.

## Ehrliche Offen-Items

- **Rotation nicht ausgeführt** (nur der Operator kann sie, Runbook oben) —
  P0-Charakter des Sprints bleibt bis dahin bestehen: das alte Literal ist
  bis zur echten Rotation weiterhin der Token, gegen den der Remote-Vault
  läuft, und steht noch in `.env` + Git-History.
- **Ansible-Guards nicht im echten Lauf erlebt:** nur YAML-Parsing + Jinja-Logik
  geprüft; kein `ansible-playbook --syntax-check` (würde den ansible-runner
  brauchen; Deploys sind in dieser Session verboten), kein echter
  `make redeploy`.
- **`make go-test` nicht ausgeführt** (per Auftrag verboten, braucht den down
  Stack). Die neuen Tests sind hermetisch und wurden im golang:latest-
  Container grün bestätigt; die DB-gated Tests der Package-Kollegen
  (`vault_test.go` etc.) wurden von mir nicht gelaufen.
- **Frontend-Baseline (tsc/vitest/i18n) von mir nicht gelaufen** — keine
  Frontend-Datei von mir verändert; 5 Parallel-Agenten arbeiten am Frontend,
  deren Sprints/der Parent-Sammellauf sind dafür verantwortlich.
- **Pre-existing, bewusst NICHT mitgeändert** (klein, außerhalb des WPs):
  `DeleteSecret` prüft weiterhin nicht den HTTP-Status der Antwort (nur das
  neue Token-Gate wurde ergänzt); `vaultClientGetSetting` bleibt ein Stub,
  der immer leer liefert (Config-Injektionspunkt für später).
- **Git-History-Scrub offen** (eigener Operator-Entscheid, Scrub-Doc Part 3):
  force-push vorbereitet, nicht ausgeführt; 63 weitere Branches tragen die
  alte Historie weiter.
