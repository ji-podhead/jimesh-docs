# HANDOFF 2026-10-04 — superleo: Stand, Regeln, Prompts

**Stand:** 4.10.2026, alles unten mit Live-Befund geprüft (Timestamps jeweils angegeben).
**Zweck:** Ersatz/Update für `docs/sprints/HANDOFF-2026-10-01-UMZUG-SUPERLEO.md` (Z.136 „Nächste Schritte",
Z.151 „Drei harten Aussperrungs-Regeln") — die Schritte und Blocker von damals sind inzwischen
größtenteils abgearbeitet, dieses File hält den Ist-Stand.

**Inhaltsregel (Operator-Order 4.10.):** Nichts wird als Zitat ausgegeben, was keines ist.
Wörtliche Operator-Aussagen sind als solche markiert und tragen ihre Fundstelle; alles andere ist
ausdrücklich sinngemäß. Wortlaute, die niemand auf Platte hatte, stehen weiterhin als
`[Zitat-TODO]` (gleiche Konvention wie `docs/sprints/SPRINT-185-GATEWAY-FABRIC-GVISOR.md`).

---

## 1. Was sich seit dem 1.10.-Handoff geändert hat

| Behauptung im 1.10.-Handoff | Ist-Stand 4.10. | Beleg |
|---|---|---|
| Blocker 1: „Auf superleo fehlt der Ansible-Stack" | **entfallen** — Podhead hat das Runner-Image `jimesh-ansible-runner:local` (210 MB, 3.10.2026), `make ansible-runner-build` existiert | `docker images`, `Makefile:220` |
| Blocker 2: „`HEADSCALE2_PREAUTH_KEY` ist bewusst leer" | **nicht mehr leer** — podhead 88 Zeichen, superleo 29 Zeichen, **aber die Werte unterscheiden sich** (nicht ausgegeben); welcher gültig ist, wurde nicht geprüft | `.env:249`, `/home/superleo/jimesh/.env` (nur Längen verglichen) |
| Blocker 3: „CA für Client2 existiert erst nach Headscale auf superleo" | **entfallen** — `deploy/cp/headscale/tls-ca/jimesh-superleo.crt` liegt da (4.10. 08:35), CN=`jimesh-headscale`, gültig bis 28.9.2036 | `openssl x509 -noout` |
| „`/home/superleo/jimesh` seit 1.10. veraltet" | **falsch geworden** — `.git` zuletzt 4.10. 14:25, HEAD=`66901c79`, **0 Commits voraus, 0 zurück** (synchron mit `origin/main`) | `ssh superleo git rev-list --left-right --count HEAD...origin/main` |
| „Keiner dieser Schritte wurde ausgeführt" (Z.229) | **nicht mehr zutreffend** — Schritt 1–6 erledigt, nur Schritt 7 offen (siehe §2) | siehe §2 |

---

## 2. Die 7 Schritte des 1.10.-Handoffs — Status

Quelle der Nummerierung: `docs/sprints/HANDOFF-2026-10-01-UMZUG-SUPERLEO.md:136-149` (Reihenfolge = die
Aussperrungssicherheit, das gilt weiterhin).

| # | Schritt | Status 4.10. |
|---|---|---|
| 1 | Kopie verifizieren, Handoff nachziehen | [x] erledigt (rsync „0 bytes to transfer", Byte-identisch) |
| 2 | S175 `/openapi.json` nachtragen → committen | [x] erledigt (`9dfeb4cd`) |
| 3 | Prefix-Parameterisierung `config.yaml.j2` | [x] erledigt — `v4: {{ headscale_prefix_v4 }}` / `v6: {{ headscale_prefix_v6 }}`, `deploy/cp/headscale/config.yaml.j2:24-26` |
| 4 | `config.yml` Node-Zeile superleo | [x] erledigt — `config.yml:71` `- name: superleo`, `:73` `headscale: true`, alle Werte `${SUPERLEO_*}`; `make render-inventory` → 3 Nodes (`Makefile:284`) |
| 5 | Provisionierung / `make redeploy SERVICE=cp/headscale NODE=superleo` | [x] erledigt — zweiter Headscale antwortet `https://100.127.129.65:443/health` → **HTTP 200** |
| 6 | Zweiter Client-Container hier (State getrennt) | [x] erledigt — `jimesh-client2` läuft seit 4.10. 04:32Z, Interface `ts-jimesh` mit **`10.80.0.1/32`** (neuer Pool) |
| 7 | **Gleichzeitigkeitstest alt+neu** | **[ ] OFFEN** — siehe unten |

**Schritt 7 im Detail (Befund 4.10., read-only):**

- NEU: `https://100.127.129.65:443/health` → 200, `jimesh-client2` mit `10.80.0.1/32` → Seite „neu" ist da.
- ALT: `http://100.64.0.6:8090/` vom podhead-Host → **keine Antwort**; `http://localhost:8090/` → **keine Antwort**.
- Das ist **kein** Beleg dafür, dass der alte Control-Node tot ist: `docs/DEPLOYMENT-URLS-2026-09-19.md`
  hält fest, dass der podhead-Host `100.64.0.0/10` bewusst nicht routet und der Zugang immer über
  die socat-Forwards im `jimesh-client-tailscaled`-Container läuft — genau der Failure-Mode, der
  dort als 20.9.-Incident beschrieben ist („Client-Container down → jede podhead-seitige URL tot").
- **Konsequenz:** Der Gleichzeitigkeitstest ist von podhead aus gerade *nicht* durchführbar, bis
  der Forward steht. Er ist damit **nicht erledigt, aber auch nicht gescheitert** — sauber als
  offen führen, nicht als Fehler.

**Wichtig für alle 7 Punkte:** Die Zeile `S176-7` in `docs/backlog/BACKLOG.md:237` ist auf
`[ ] offen` und nennt alle fünf Unterpunkte (Deploy, Preauth-Key, CA-Fetch, 2. Client live,
Gleichzeitigkeitstest). Vier davon sind nachweislich erledigt — die Zeile ist damit **veraltet**.
Nachtragen gehört in Phase 1.3b (STATUS-CHECK-Nachzug), nicht heimlich hier.

---

## 3. Die drei Aussperrungs-Regeln — unverändert gültig

Verdichtet aus `docs/sprints/SPRINT-176-SECOND-CONTROL-NODE-SUPERLEO.md:88-95` und
`docs/sprints/HANDOFF-2026-10-01-UMZUG-SUPERLEO.md:151-162`. Sie gelten für **alle** folgenden Sprints.

1. **Alten headscale unberührt** — kein Config-Change, kein Restart, kein `rm`. Alter Pool
   `100.64.0.0/10`, neuer Pool `10.80.0.0/16`, eigene v6-Range, eigenes `base_domain` → keine
   Adresse, kein Name, keine Route kann kollidieren.
2. **superleos Host-Tailscale unberührt** (`100.127.129.65`, kommerziell `ji-podhead@`, Zugang
   per Tailscale-SSH) — die neue Identität ausschließlich im isolierten Container. Kein
   Host-Level-`headscale-client`, kein `tailscale up --reset`. Begründung im Original: ein
   `--network host`-Versuch am 16.9. hat live die Routing-Regeln der Primärverbindung zerstört.
3. **podhead's primäre Verbindungen unberührt** — `client-join.sh` bleibt bridge-Mode, nie
   `--network host`. Der neue Adresspool `10.80.0.0/16` liegt außerhalb von CGNAT `100.64.0.0/10`
   und außerhalb `10.144.252.0/24` (WLAN). **Nicht** den Default `/10` übernehmen — das wäre
   genau das Aussperrungs-Szenario.

Ergänzend (aus derselben Quelle): Ansible darf mit genau **einem** local-Host laufen
(`docs/sprints/HANDOFF-2026-10-01-UMZUG-SUPERLEO.md:166`), Voraussetzung ist, dass Checkout-Pfad
(`/home/superleo/jimesh`) und `jimesh_deploy_root` (`/opt/jimesh`) **verschiedene** Pfade bleiben —
sonst stagt das Role-Staging auf sich selbst.

---

## 4. Rollen, Tabus, Zugang

**Rollen (sinngemäß, keine wörtliche Operator-Order):**

- **superleo-Sessions:** deployen, mergen, Frontend-Lint (`W6`), S170 Utility-Container,
  Dashboard-Builder. Werden über eigene Prompts angesprochen.
- **podhead (diese Session):** liest, schreibt Doku/Docs, committet auf getrennten Pfaden, pusht
  Fast-Forward direkt auf `main`. **Kein Deploy, kein `make up`, kein `nft`/`sysctl`/`docker network`
  gegen den Stack.**
- **squadmesh/** (andere Session): unantastbar — auch beim Suchen ausschließen, weil dessen
  `squadmesh/gateway/gateway.go` (473 Zeilen) sonst Fehltreffer liefert statt
  `src/backend/internal/gateway/gateway.go` (3.402 Zeilen).

**Zugang:**

- SSH: `Host superleo` → `100.127.129.65`, User `superleo`, `~/.ssh/id_rsa` (BatchMode).
- Repo auf superleo: `/home/superleo/jimesh` — **read-only angreifen**; superleo committet selbst.
- `gh` ist doppelt blockiert (Snap-DNS-Verbot + invalidierte Tokens) → Pushes laufen über
  `git`/`curl`, **nie** Token-Strings in Argumente.

**Login in den Stack (lokale Dev-Creds, keine Werte hier):**

- URL mit DNS: `http://dashboard.jimesh.internal/` → 200 (DNS zeigt auf `100.127.129.65`);
  Keycloak: `http://keycloak.jimesh.internal:8081/`.
- `http://localhost:8090/` und `:8081` sind vom podhead-Host aus **tot** (siehe §2, Schritt 7).
- Keycloak-Realm `jimesh` hat **genau einen User**: Username **`admin`**, E-Mail
  `admin@jimesh.local`, enabled. `loginWithEmailAllowed=true`, `bruteForceProtected=false`.
- Passwort = `JIMESH_ADMIN_PASSWORD` aus `.env:37`; der Backend-Bootstrap gleicht es bei jedem
  Start über die Admin-API ab (`src/backend/internal/auth/keycloak_oidc.go:287` `BootstrapKeycloak`,
  `:289` liest die Env-Var, `:762` `reconcileAdminPassword`). Keycloak-Admin heißt **`kcadmin`**
  (`.env:39`), nicht `admin`.
- **Wichtig:** `POST /api/auth/login` → **403 `password_login_disabled`**, `passwordAuthEnabled=false`
  — der Login läuft ausschließlich über Keycloak (`standardFlowEnabled=true`,
  `directAccessGrantsEnabled=false` beim Client `jimesh-dashboard`). „Sign in" nehmen.
- Passwort-Fehlerursache 4.10.: **falscher Username.** `admin.jimesh.local` existiert nicht;
  getestet und erfolgreich war `admin` + der Wert aus `.env:37`.

---

## 5. Offene Operator-Entscheidungen (nicht selbst treffen)

- **W6 / Frontend-Lint:** Auf superleo steht in `37759786` (4.10. 13:43, Autor `ji`) wörtlich
  festgehalten: **„Laptop-Session als W6"** und **„Tabu für diesen Eingriff aufheben"** — die Lint-Welle
  läuft bei der Laptop-Session, diese Session liefert nur den Report und fasst das Frontend-Lint nicht
  an; die zwei Flags in `next.config.mjs` dürfen entfernt werden, **sobald lint grün ist**, sonst
  nichts an der Datei. Diese Worte stammen aus dem Commit-Text superleos, nicht aus einem von mir
  mitgeschriebenen Prompt-Log.
- **Lint-Stand (Messung 4.10. in demselben Commit):** 336 Probleme = 308 Errors + 28 Warnings in
  ~86 Dateien (vorher 322). Größte Brocken: 130 `no-explicit-any`, 45 `set-state-in-effect`,
  37 `react-refresh`, 37 `no-unused-vars`.
- **Weiter offen:** Sprint-Nummer für die W1–W9-Wellen (185 vorgeschlagen), Wellenreihenfolge,
  gh-Weg A/B/C, sowie `S177-8`, `S178`, `S180-9`, `S180-16`, `#6`, `RM35-10`.
- **O-1..O-11** in `docs/sprints/SPRINT-185-GATEWAY-FABRIC-GVISOR.md` stehen weiterhin als Paraphrase mit
  `[Zitat-TODO]` — Wortlaut war nie auf Platte.

---

## 6. Ungesicherte Randbefunde (nicht als Tatsache behandeln)

- superleo war am 4.10. 13:57 noch **2 Commits voraus** (`bab2ee0b`, `37759786`) und hatte
  **7 ungesicherte Dateien**. Inzwischen gepusht: `b63c90bc..66901c79` = **10 Commits
  (S170 Utility-Container, Slices A+B+C + Backlog-Nachträge)** — Stand 4.10. 14:25 ist
  **0 voraus, 0 zurück**, HEAD `66901c79`, `.git` zuletzt 14:25.
- **Weiter ungesichert auf superleo (5 Dateien, Stand 4.10. 14:25):** `src/frontend/package.json`,
  `src/frontend/package-lock.json`, `src/frontend/src/views/DashboardBuilderPage.tsx`,
  neu `src/frontend/src/components/builder/Sparkline.tsx` und
  `src/frontend/src/components/builder/WidgetSettingsDrawer.tsx`.
  → laufende Arbeit am **Dashboard-Builder**; beim eigenen Commit prüfen, ob sich die Pfade
  überschneiden. **Achtung `package-lock.json`:** Lock-Files sind nach Operator-Regel nie zu
  committen (deshalb ist PR #7 ja blockiert).
- S170-Backlog nach dem Push: `S170-1` `[x]`, `S170-2` `[~]`, `S170-3` `[x]`, `S170-7` offen und
  **blockiert auf S180 WP2 + S181-12-Nachmessung** (`docs/backlog/BACKLOG.md:110-117`).
- `saits-dns` meldet seit 25 h `unhealthy` — fremder Stack (`saits-*`), **nicht anfassen**.
- Die S184-DNS-Verteilung zeigt `dashboard|jimesh|api.jimesh.internal` → `100.127.129.65`;
  `grafana.jimesh.internal` löst **nicht** auf.

---

## 7. Prompts (zum Kopieren in die superleo-Sessions)

> Alles hier drin ist **sinngemäß formuliert**, kein wörtlicher Operator-Input — sofern es um
> fremde Wortlaute geht, steht die Fundstelle dabei.

### P1 — superleo, laufende Arbeit fortschreiben (S170 + Dashboard-Builder)

```text
Du arbeitest in /home/superleo/jimesh, HEAD ist 66901c79 (0 voraus, 0 zurück gegen
origin/main — S170 Utility-Container Slices A+B+C sind bereits gepusht). Noch ungesichert sind
5 Frontend-Dateien: src/frontend/package.json, src/frontend/package-lock.json,
src/frontend/src/views/DashboardBuilderPage.tsx, neu
src/frontend/src/components/builder/Sparkline.tsx und
src/frontend/src/components/builder/WidgetSettingsDrawer.tsx.
Ziel: den Dashboard-Builder fertig machen, ohne die laufende Arbeit zu überschreiben.
Achtung: package-lock.json NIEMALS committen (Lock-Files sind tabu) — es liegt absichtlich in der
uncommitted-Liste und bleibt dort, bis der Operator es freigibt.

Harte Grenzen (drei Aussperrungs-Regeln, siehe
docs/sprints/SPRINT-176-SECOND-CONTROL-NODE-SUPERLEO.md:88): alter headscale nie anfassen (kein
Config-Change, kein Restart, kein rm); superleos Host-Tailscale (100.127.129.65) nie anfassen,
neue Identität nur als isolierter Container; nie --network host, client-join.sh bleibt bridge-Mode.

Vor dem Commit: origin/main prüfen (Kollisionen kommen von selbst vor), eigene Pfade explizit
stagen, nie git add -A, .env und config.yml nie staged, kein Lock-File einchecken. Danach
go vet / go build / go test bzw. npm run lint / npx tsc --noEmit.
```

### P2 — Gleichzeitigkeitstest (Schritt 7), erst wenn der Operator ihn freigibt

```text
Offener Punkt aus docs/sprints/HANDOFF-2026-10-01-UMZUG-SUPERLEO.md:149 und
docs/backlog/BACKLOG.md:237 (S176-7): Gleichzeitigkeitstest alt+neu.

Befund 4.10.: NEU ist da (https://100.127.129.65:443/health -> 200, jimesh-client2 hat
10.80.0.1/32 auf ts-jimesh). ALT ist von podhead aus nicht erreichbar (100.64.0.6:8090 und
localhost:8090 antworten nicht) — vermutlich die in docs/DEPLOYMENT-URLS-2026-09-19.md beschriebene
socat-Forward-Abhängigkeit, nicht zwingend ein toter Control-Node.

Erstmal NUR lesen: prüfen, ob der Forward im jimesh-client-tailscaled-Container steht und ob der
alte Node von einem anderen Pfad aus antwortet. Nichts reparieren, nichts neu deployen, keinen
Container neu starten, bevor der Operator das sagt. Ergebnis als Befund melden, nicht als Fix
ausführen.
```

### P3 — W6 Frontend-Lint (Laptop-Session, nicht superleo)

```text
Welle W6 = Frontend-Lint. Operator-Order 4.10., wörtlich übernommen aus dem Commit-Text
37759786: "Laptop-Session als W6" und "Tabu für diesen Eingriff aufheben".

Messstand: 336 Probleme = 308 Errors + 28 Warnings in ~86 Dateien (vorher 322). Größte Brocken:
130 @typescript-eslint/no-explicit-any, 45 react-hooks/set-state-in-effect,
37 react-refresh/only-export-components, 37 @typescript-eslint/no-unused-vars, 13
no-useless-escape, 6 no-empty; nur 2 Errors + 1 Warning per --fix.

Erlaubt: die zwei Flags ignoreBuildErrors/ignoreDuringBuilds in next.config.mjs entfernen,
SOBALD npm run lint grün ist — sonst nichts an dieser Datei.
Verboten: alles andere am Frontend-Lint, solange die Welle nicht zugewiesen ist (Kollisionsrisiko
mit der Laptop-Session).
```

### P4 — Login in den Stack (wenn jemand nicht reinkommt)

```text
URL: http://dashboard.jimesh.internal/  (DNS zeigt auf 100.127.129.65; localhost:8090 ist tot)
Keycloak: http://keycloak.jimesh.internal:8081/
Username: admin        (NICHT admin.jimesh.local, NICHT admin@jimesh.local)
Passwort: steht in .env:37 als JIMESH_ADMIN_PASSWORD — Wert niemals ins Repo, ins Log oder in
einen Prompt kopieren.
Keycloak-Admin-Konsole: Username kcadmin (.env:39).
Passwort-Login über die API ist bewusst deaktiviert (POST /api/auth/login -> 403
password_login_disabled), es geht nur über den Button "Sign in" (Keycloak standardFlow).
```
