# SPRINT-184 — Internes DNS + Subdomain-Verwaltung (kein localhost mehr)

> **Status: CODE-SLICE FERTIG — Backend-Schreibpfad + beide Frontend-Flächen gebaut, 10/10
> Gateway-Tests grün gegen Wegwerf-Postgres. Zwei Contract-Punkte hängen noch bei der
> anderen Session: (C2) Wildcard-Record in der Zone, (C3) Traefik-File-Provider + Volume.**
>
> Operator-Auftrag (wörtlich): *„wir sollten irgendwie dns benutzen und dann halt nicht
> localhost sondern internen dns record über das interne overlay network"*, *„jedes project
> bruacht nen dns namen den wir erstmal dynamisch ersstellen und user kann ih später
> ändern"*, *„du kannst die project dns settings im project overview panel machen und einen
> allgemeinen dns settings tab da bei den allgemeinen sachen in der sidebar"*, *„ich will
> nicht localhost benutzen und auch nicht immer mit localhost arbeiten wenn wir irgendwelche
> urls haben das ist scheisse desween halt dns container dazu"*.
>
> Zusatz: *„bei dns können wir gleich subdomains auch verwalten wa? also da können wir dann
> traefik und dns gleichzeitig verwalten"*, *„ich hab so ein bind deployment auf git —
> lilbind und dann noch irgendwelche bind management tools, schau mal nach"*,
> *„https://github.com/ji-podhead/lil_bind benutzen wir"*, *„die andere session macht das
> mit dem deployment"*.
>
> Arbeitsteilung: **anderer Slice = alles `deploy/`** (DNS-Container, Zone, Traefik-
> File-Provider-Volume, Headscale-DNS) — dieser Slice = Go-Schreibstelle + Frontend-UI.
> Basis: Branch `feat/sprint-184-dns-settings` von `origin/main` (`0e774d36`, deren
> `deploy/dns`-Commit), per `--ff-only` zusammengeführt.

## Wo wir heute stehen (im Code nachgeschlagen, kein Schätzen)

### Deploy-Hälfte (andere Session) — gebaut, aber ohne Projekt-Namen

| Befund | Fundstelle |
|---|---|
| **`deploy/dns` existiert**: `ubuntu/bind9`, statische Zone, `dns_zone` = `JIMESH_DNS_ZONE` (Default `jimesh.internal`), SOA + `NS ns1` + `ns1 A <resolver-ip>`, **eine feste Liste `dns_records` mit CNAMEs auf Docker-Containernamen** (`dashboard→jimesh-traefik` …) über die forward-Zone `jimesh-net` (127.0.0.11), `dnssec-validation` aus, Config staged + RO gemountet (Redeploy ohne Container-Neustart) | `deploy/dns/zone.j2:1-16`, `deploy/dns/defaults.yml:35-66` |
| **Kein Wildcard-Record** — Projekt-Labels wie `wetterstation.jimesh.internal` stehen nirgends in der Zone. Deren eigener Kommentar sagt, dass Projekt-Namen *„spätestens mit dem Projekt-DNS-Teil dazu"* kommen | `deploy/dns/defaults.yml:51-53` (kein `*` in `zone.j2`) |
| **Resolver läuft, Clients zeigen noch auf öffentliche DNS** — Bind bindet `jimesh_vpn_ip \| 127.0.0.1:53`, Headscale `nameservers.global` = nur `8.8.8.8/1.1.1.1` | `deploy/dns/defaults.yml:40`, `deploy/headscale/config.yaml.j2:31-32` |
| **Traefik ohne File-Provider** — nur `--providers.docker`, kein `--providers.file.directory`, kein geteiltes Volume | `deploy/traefik/ansible-task.yml:30-45` |
| **`JIMESH_DNS_ZONE` ist in `.env.example` dokumentiert** | `.env.example:107-112` |

### Code-Bestand (vor diesem Sprint)

| Befund | Fundstelle |
|---|---|
| **Kein einziger `Host(...)`-Router bei Traefik** — nur PathPrefix-Regeln, keine Domain-Konfig, kein TLS/ACME | `deploy/backend/ansible-task.yml:95-98`, `deploy/frontend/ansible-task.yml:52-55` |
| **`localhost` ist der URL-Standard** — Frontend baut `http://<window.location.hostname>:<port>` | `src/frontend/src/lib/tunnel.ts:15-23` |
| **Projekt hatte kein DNS-Feld** — kein `domain`/`hostname`/`dns` in `ProjectRow`, kein generischer PUT für Projekt-Metadaten | `store/store.go:1808-1844` |
| **Keine Utility-Gruppe mehr in der Sidebar** (S182-Nav-Reorg) — „allgemeine Sachen" heißt jetzt **Platform** (`/control-planes`, `/vault-dashboard`, `/builder`, `/dashboards`) | `lib/section-nav.ts:149,341`, `HierarchySidebar.tsx:440` |
| **Allgemeine Settings sind ein KV** (`GET/PUT /api/settings/{key}`) | `gateway/gateway.go` |

## Entscheidungen

### D1 — BIND betreibt die andere Session, nicht wir
Zone, Container, Bridge, forwarders, `dnssec-validation off` liegen in `deploy/dns`. Wir
bauen kein zweites BIND-Deployment und schreiben **nie** in die Zonendatei.

### D2 — **Korrektur nach dem Deploy der anderen Session: kein `bind9-api`**
Die anfängliche Wahl war `harutyundermenjyan/bind9-api` (FastAPI, `X-API-Key`, nsupdate +
rndc, Terraform-Provider) — recherchiert gegen `bindcar` (nur Zonen-Lifecycle, kein
Record-CRUD), `snap-dns`/`bugfishtm/bind9-web-manager`/`Twilight dnsmanager` (eigene UI,
konkurriert mit unserem Panel), PHP-Stacks (zweites Betriebssystem-Thema). **Gebaut wurde
etwas anderes:** eine statische, per Redeploy gerenderte Zone ohne jede Laufzeit-API
(`deploy/dns/zone.j2`). Konsequenz für diesen Slice:

* Unser Schreibpfad kümmert sich **nur um die Traefik-Hälfte** (Zeile + Datei).
* Namensauflösung ist ein Contract an die andere Session (C2, Wildcard) — kein nsupdate,
  kein TSIG, kein rndc in unserem Code.
* `bind9-api` bleibt dokumentiert, falls Laufzeit-Zonen je nötig werden: dann als
  ergänzender Container, Record-CRUD über `POST /api/v1/zones/{z}/records`
  (`{record_type,name,data,ttl}`), **ohne** dass unser Traefik-Schreibpfad sich ändert.

### D3 — Frei wählbarer Name mit dynamischem Default, Ziel = die Projekt-App
Jedes Projekt bekommt `<slug(project.name)>.<zone>` als Default, änderbar im
**Project-Overview-Panel**. Regel: RFC1123-Label `[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?`,
**global eindeutig** (409 bei Kollision), kein Punkt im Label (Tiefe bleibt
`<name>.<zone>`; Sub-Zonen sind BIND-Sache). **Ziel-Frage vom Operator beantwortet:
„Projekt-App proxyn"** — der Hostname führt zur App, der **Port fliegt aus der URL**;
`target` ist ein eigenes, frei änderbares Feld (`http(s)://` + Host[:Port], keine
Credentials, keine Unsafe-Chars). Ohne ansprechbaren `node_host` (localhost/127.0.0.1/::1)
wird **kein** Target vorgeschlagen — nie Traefik-auf-sich-selbst zeigen.

### D4 — Ein Schreibpfad: Datenbankzeile **und** Traefik-Host-Regel atomar
`PUT /api/projects/{id}/dns` validiert alles zuerst, schreibt dann die Zeile in
`project_dns` und generiert danach `JIMESH_TRAEFIK_DYNAMIC_FILE` komplett neu
(validieren → ein YAML-Dokument → Temp-Datei + `rename`). **Revert-on-failure**: schlägt
der Dateischritt fehl, wird die vorherige Zeile zurückgesetzt (frische Zeile → gelöscht)
und die Antwort ist ehrlich `502 … (previous state restored)`. Nie halbe Zustanden — die
Datenbank und die veröffentlichten Routen dürfen nicht auseinanderlaufen.

### D5 — Die Zone kommt von außen, wir antworten ehrlich
`GET /api/projects/{id}/dns` liefert zusätzlich `resolved` (läuft der FQDN über den
Resolver?) und `traefikConfigured` (liegt ein Traefik-Pfad unter `JIMESH_TRAEFIK_DYNAMIC_FILE`?).
Beides false ist ein **sichtbarer** Zustand in der Karte, kein stiller Erfolg.

## Contract für die andere Session (C1–C7, Realität stand 3.10.)

| # | Baustein | Status |
|---|---|---|
| C1 | **Zone + Resolver** (`jimesh.internal`, `ns1 A`, forward `jimesh-net`, Bind an `jimesh_vpn_ip \| 127.0.0.1:53`) | ✅ gebaut (`deploy/dns/*`) |
| C2 | **Wildcard-Record in der Zone** — genau eine Zeile in `zone.j2`, damit Projekt-Labels auflösbar sind: `* IN CNAME jimesh-traefik.jimesh-net.` (alle Projekt-Hostnamen zeigen auf das Gateway, das per Host-Regel unterscheidet). Alternativ: Projekt-Labels in `dns_records` nachziehen — dann bräuchten wir pro Speicherung ein Redeploy, was D4 bricht | ⬜ **offen — blockiert `resolved: true`** |
| C3 | **Traefik-File-Provider + geteiltes Volume** — `--providers.file.directory=/etc/traefik/dynamic` (und idealerweise `--providers.file.watch=true`), Mount für die Datei, die unser Backend schreibt | ⬜ **offen — blockiert `traefikConfigured: true`** |
| C4 | **Headscale/Client-Namen** — `dns.nameservers.global` muss die DNS-Container-IP als ersten Eintrag tragen (heute nur 8.8.8.8/1.1.1.1), sonst löst nur der, der seinen Resolver manuell umstellt | ⬜ offen |
| C5 | **Env für uns** — `JIMESH_DNS_ZONE` (Default `jimesh.internal`, `.env.example:107`) + `JIMESH_TRAEFIK_DYNAMIC_FILE` (neu in `.env.example`) | ✅ dokumentiert |
| C6 | **Kein bind9-api/TSIG** — die Zone ist statisch; dynamische Records brauchen später einen eigenen Container, nicht unseren Slice | ✅ entschieden (D2) |
| C7 | **Namen statt `localhost:<port>`** in Realm-Redirects/Docs/UI laufen über dieselbe Zone, sobald C2+C3 stehen | ⬜ folgt aus C2/C3 |

Ohne C2/C3 läuft unser Slice **degradiert, aber ehrlich**: Name wird gespeichert
(`persisted: true`), `resolved`/`traefikConfigured` bleiben `false`, die Karte zeigt genau
das an; ohne `JIMESH_TRAEFIK_DYNAMIC_FILE` liefert der Endpoint `traefikConfigured: false`
und veröffentlicht nichts.

## Aufgaben

| # | Aufgabe | Status |
|---|---|---|
| 1 | `lil_bind` als BIND-Basis festlegen | ✅ entschieden (D1) |
| 2 | Management-API wählen | ✅ entschieden (D2 → **kein** bind9-api, statische Zone) |
| 3 | Namensschema + Ziel | ✅ entschieden (D3 → frei + Default, Ziel = Projekt-App) |
| 4 | Traefik-Anbindung | ✅ entschieden (D4 → File-Provider, wir schreiben) |
| 5 | **Contract C1–C7** für die andere Session | ✅ steht oben (C2/C3 offen) |
| 6 | Backend: DNS-Modell + Validierung + atomarer Schreibpfad (Zeile + Traefik-Route) | ✅ gebaut |
| 7 | Backend: `GET/PUT /api/projects/{id}/dns` + `GET/PUT /api/dns/settings` + `GET /api/dns/records` | ✅ gebaut |
| 8 | Frontend: **Project DNS Settings** im Overview-Tab (`ProjectDetailPage`) | ✅ gebaut |
| 9 | Frontend: **allgemeiner DNS-Tab** (Platform-Sachen der Sidebar, RM35-Dual-Registrierung) | ✅ gebaut |
| 10 | Tests: Slug/Label, Uniqueness 409, „zweiter Schritt schlägt fehl → kein halber Zustand", kein-Config-Fall, Zugangs-Gate | ✅ 10 Gateway + 10 dnsroute + 10 Frontend |
| 11 | i18n (en+de hand, Rest Script auf 60 Locales) + Verifikation | ✅ 45 Keys × 60 Locales |

## Gebauter Backend-/Frontend-Slice

| Datei | Inhalt |
|---|---|
| `internal/store/project_dns.go` | Tabelle `project_dns(project_id PK, label UNIQUE, target, enabled, created_at, updated_at)`, `EnsureProjectDNSTable`, `GetProjectDNS`/`ListProjectDNS`/`DNSLabelTaken`/`UpsertProjectDNS`/`DeleteProjectDNS`, `ErrDNSLabelTaken` |
| `internal/store/store.go` | Migrate-Hook `_ = d.EnsureProjectDNSTable()` |
| `internal/dnsroute/names.go` | `Slugify`, `ValidateLabel` (RFC1123, lowercase), `FQDN(label, zone)` (Label nie als FQDN gespeichert) |
| `internal/dnsroute/traefik.go` | `Route`, `Render` (ein YAML-Dokument, Router/Service `jimesh-dns-<label>`, `rule: Host(\`fqdn\`)`, leerer Doc = `routers: {}`), `ValidateTarget` (nur http/https, Host, keine Credentials/Unsafe-Chars), `WriteAtomic` (Temp + rename) |
| `internal/gateway/dns.go` | Routen `GET/PUT /api/dns/settings` (Kill-Switch `dns_enabled`), `GET /api/dns/records`, `GET/PUT/DELETE /api/projects/{id}/dns`; Gate = Operator/Admin, sonst `ProjectRolesForSub` (fail closed); Revert-on-Failure; `dnsLookup` zum Umschalten in Tests; `projectDNSView` = gespeicherte Zeile **oder** berechneter Default (`persisted: false`); `defaultDNSTarget` nie bei localhost-NodeHost |
| `internal/gateway/gateway.go` | `s.registerDNS(mux)` |
| `internal/gateway/dns_test.go` | 10 Tests (Publish, 409, Validierung, Revert bei bestehender **und** frischer Zeile, Delete, Disabled, kein Traefik-Pfad, Zugangs-Gate, Default) |
| `internal/dnsroute/*_test.go` | 10 Tests (Slug, Label-Grenzen, FQDN, Render-Struktur, Target-Regeln, atomares Schreiben) |
| `frontend/src/components/projects/ProjectDNSCard.tsx` (+ `.test.tsx`) | Overview-Panel-Karte: FQDN-Vorschau + Copy, Label/Target/Enabled, gespeichert-vs-Default-Badge, ehrliche Status-Badges (`resolved`, `traefikConfigured`, pausiert), Save/Delete — Overlay-State, kein Adoption-Effect |
| `frontend/src/views/DnsSettingsPage.tsx` (+ `.test.tsx`) | Allgemeiner Tab: Zone, Traefik-Pfad (bzw. „nicht konfiguriert"), Kill-Switch, Record-Tabelle mit Projekt-Link/FQDN/Ziel/Status |
| `frontend/src/App.tsx`, `lib/section-nav.ts`, `HierarchySidebar.tsx` | Route `/dns` + Platform-Eintrag (section-nav **und** Sidebar-Mirror, RM35) |
| `frontend/src/lib/query-keys.ts` | `projectDNS(id)`, `dnsSettings`, `dnsRecords` |
| `frontend/scripts/add-sprint184-dns-i18n.mjs` | 45 Keys (`nav.dns`, `dns.*`, `projectDetail.dns*`) en+de hand → ×60 Locales |
| `.env.example` | `JIMESH_TRAEFIK_DYNAMIC_FILE` dokumentiert |

## Verifikation (3.10., ehrlich)

* **Backend:** `go build ./...` und `go vet ./...` → 0; `go test ./...` → **29 Pakete ok, 0
  FAIL** (die DB-abhängigen Baseline-Tests skippen ohne `DATABASE_URL`); `go test
  ./internal/dnsroute/` → **10/10**; die **10 Gateway-DNS-Tests gegen eine frische
  Wegwerf-Postgres** (16, Port 5433, danach `docker rm -f`) → **10/10 grün**, Container
  entfernt.
* **Frontend:** `vitest run` → **63 Dateien / 503 Tests, 0 failed** (Branch-Baseline ohne
  diese beiden neuen Dateien = 493, also +10); `tsc --noEmit` → **414 Fehler, 0 davon in
  S184-Dateien**; `eslint` auf den acht geänderten/neuen Dateien → **0 in meinen Dateien**
  (2 vorbestehende Errors in `HierarchySidebar.tsx:231` `export function tf` aus
  SPRINT-164 und `ProjectDetailPage.tsx:914` `project: any`, dazu 2 vorbestehende
  `exhaustive-deps`-Warnings).
* **i18n:** `check-i18n.mjs` → 60 Locales, **3351 Keys** (+45), **341 fehlend = die
  S181-7-Baseline, unverändert** (kein Key dieser Sprints fehlt).
* **Secret-Scan** über `git diff` + alle neuen Dateien: leer. `.env`/`config.yml` nicht
  angetastet.
* **Nicht gemacht (bewusst):** kein Deploy, kein `make up`, kein Jimesh-Stack auf diesem
  Knoten — Deploy-Seite ist die andere Session.

## Offene Fragen / Abhängigkeiten

1. **C2 (Wildcard) und C3 (File-Provider)** sind die beiden Punkte, die den Namen von
   „gespeichert" auf „auflösbar + veröffentlicht" heben — beide bei der anderen Session.
2. **Reihenfolge:** PR #10 (Sprint 183, Server-render + ACL-Cache) liegt offen; dieser
   Sprint hängt nicht daran (separater Branch von `origin/main`). Danach angesetzt:
   S183-Task 13 (Project-Dashboards auf `user_dashboards` + Projekt-Scope), Task 14,
   Task 11 (Iframe-Rückbau).
3. **Traefik-Reconciliation**: `Render` schreibt bei jeder Änderung das ganze Dokument neu
   — zusätzliche, von außen in dieselbe Datei geschriebene Routen würden überschrieben.
   Solange `JIMESH_TRAEFIK_DYNAMIC_FILE` eine *eigene* Datei im dynamic-Verzeichnis ist
   (nicht `traefik.yml` selbst), ist das kein Konflikt; C3 sollte genau das garantieren.
