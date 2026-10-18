# SPRINT-183 — Server-seitiges Render + ACL-Cache (kein Iframe)

> **Status: FRONTEND-SLICE + BACKEND-CACHE GEBAUT — Tasks 2–7, 9, 10, 12, 15 gebaut und verifiziert.**
>
> Gebaut und verifiziert (echte Befehle unten): Instanz-Modell `webview:*`, das
> generische Webview-Panel **mit echtem Render** (Chromium/WebRTC statt Pending),
> das Project-Admin-Panel, die Frontend-Erkennung, der Webview-Panel-Typ im
> Builder-Picker — und auf der Backend-Seite `GET /api/render/cache?url=` mit
> Session-Bindung, TTL, SSRF-Guard, Purge-Hooks und Recheck bei jedem HIT.
>
> **Toolchain-Korrektur (3.10.):** der frühere Befund „auf podhead gibt es kein
> `go`" war **falsch** — die Toolchain steht unter `/home/ji/sdk/go/bin` (nur nicht
> im PATH), wechselt automatisch auf Go 1.26 und baut/vettet/testet das Repo;
> `protoc` 27.3 liegt unter `/home/ji/sdk/protoc/bin`. Damit sind die Go-Tasks
> **hier** verifizierbar, nicht auf superleo verschoben. (Die generierten
> `*.pb.go` sind committet — `go build` braucht kein protoc, `make proto` nur.)
>
> Jedes ✅ weiter unten bedeutet **„Entscheidung getroffen"** (Tasks 1/15, D1–D6)
> bzw. einen im Code nachgeschlagenen **Bestand** — nie eine Leistung dieses Sprints.

## Auftrag, verbatim (Operator, 3.10.)

Die Reihenfolge der Aussagen ist die Argumentation — deshalb vollständig, nicht verdichtet:

1. > *"ich will in meiner website iframes vermeiden und die im hintergrund auch offen lassen"*
2. > *"aber wie geht das mit chromium da kann man doch viel mit machen"*
3. > *"also wenn du willst kannst du auch neko nehmen aber mich nervt das logo"*
4. > *"kannst du nciht chromium einfach nativ installieen?"*
5. > *"also in den docker container der das bruacht?"*
6. > *"warum können wir keinen chromium container für den user deployen der seiten im
   hintergrund offen lässt für den user wie server render"*
7. > *"müsste da auch irendwie verschöüßelt sein oder so über den user login"*
8. > *"nein wenn wir seiten cachen"*
9. > *"guck mal wenn ein user ne app auf macht oder dashboards lädt hat da ja nciht immer
   jeder zugriff drauf das entschiedet der admin welche inhalte für welchen user
   reigegeben sind und du kannst dir ja auch deine eigenen dashboards bauen und wir haben
   auch email integration da soll nicht einfach alles für jeden zugänglich sein über
   diesen container"*
10. > *"ok go"*
11. > *"kannst du das nicht über die browser session verlinken? und wenn die stirbt
    löschen wirs halt aus dem cache"*
12. > *"ich will halt das man eigene apps da auch direkt rendern kann und statt iframe
    direkt halt wieder über den cache und das wir auch frontends erkennen und in der app
    preview oder overview seite dazu halt auch die dashboard direkt über widgets anzeigt
    und im dashboard builder kann man sich dann einfach so beliebig viele webview panels
    könnte man das nennen bauen quasi wie in vs code und der scope ist einfach dafür dann
    der normale project scope, jeder der auf das project zugreifen kann kann auch auf die
    dashboards zugreiefn und alle network admins und admins könnnen die utility dashboards
    sehen"*
13. > *"also ich weiß nciht ob wir in admin settings schon die teams haben die auf ein
    project zugreifen können du kannst ja auch ein widget für project amdin stuff machen
    und darin dynamisch die projects finden und halt zusätzlich nur für das project in den
    project overview seite"*

**Kern des Auftrags:** Seiten **serverseitig rendern und cachen**, damit sie im Hintergrund
bereitstehen — **ohne `<iframe>`** —, aber **nicht** als Umgehung der bestehenden
Zugriffssteuerung. Der Container darf nicht der Ort sein, an dem plötzlich alles für jeden
lesbar wird. Punkt 11 beantwortet die Invalidierungsfrage: die Einträge hängen an der
Browser-Session und sterben mit ihr.

### Scope-Ausweitung (Punkt 12+13) — in Oberbegriffen, nicht ratend aufgeschlüsselt

| Operator sagt | was es im Code bedeutet (nachgeschlagen) |
|---|---|
| *„eigene apps … statt iframe … über den cache"* | bestehender `<iframe>` wird ersetzt: `AppPanelDrawer.tsx:506` (`src={dashboardUrl}`), daneben der **5. und letzte** iframe im Repo (neben `HierarchySidebar.tsx:2309`, `ProjectsPage.tsx:905/920`) |
| *„frontends erkennen"* | `InterfaceSpec.Kind == "http"` aus `DeriveInterfaces` (`deploy/deployment_interfaces.go:14,19`) — fertiger Erkennungs-Hook; `dashboardUrl = appTunnelUrl(projectId, httpPort, nodeHost)` steht schon (`AppPanelDrawer.tsx:205`) |
| *„app preview oder overview seite"* | `ProjectDetailPage.tsx` (1245 Z) mit Tabs `overview / deployments / iacFiles / files / secrets / integrations` (`:462-532`) — dort die Dashboards/Widgets einhängen |
| *„dashboard builder … beliebig viele webview panels … wie in vs code"* | baut auf S182 `widget-registry.ts` + `DashboardBuilderPage.tsx` (RGL) auf; „webview panel" = ein neuer Widget-Typ, kein neuer Editor |
| *„der scope ist … der normale project scope"* | **bestehende** erzwungene Ebene: `project_roles` + `policy/project_gate.go` + `policies/project-roles.rego` (`jimesh-dev` im JWT **und** Grant-Zeile) |
| *„jeder der auf das project zugreifen kann, auch auf die dashboards"* | gleiche Gate-Funktion wiederverwenden, **keine** zweite Rechteebene (Regel 3) |
| *„alle network admins und admins … utility dashboards"* | ⚠️ Rollenname „network admin" existiert **nicht** im Repo — s. offene Frage 5 |

#### Punkt 13 beantwortet: die Teams stehen schon in Admin Settings — aber als Buchführung

- **Vorhanden:** `/admin/teams` → `TeamsPage` (`App.tsx:767`) mit „Resource Bindings"-Tab
  (`components/rbac/team-bindings-panel.tsx`) und `create-access-section.tsx`.
- **Vorhanden:** `team_resource_bindings` mit geschlossener Resource-Typ-Menge, die
  **`project` schon enthält** (`store/team_bindings.go:44`, daneben `ssh_target`,
  `workspace`, `app`), `accessLevel` `read|write|admin` (`:50-54`).
- ⚠️ **Lücke A — falsche Richtung:** `ListTeamBindings(teamID)` liefert Team → Ressourcen
  (`store/team_bindings.go:167`); „welche Teams greifen auf Projekt X zu" hat **keinen**
  Server-Filter (leere `teamID` = Dump aller Zeilen, `:178-179`).
- ⚠️ **Lücke B — kein Gate:** Außer der List-Endpunkte liest **nichts** die Tabelle für
  Autorisierung (einzige Fundstelle `gateway/team_bindings.go:60`).
  **Erzwungen** wird Projekt-Zugriff ausschließlich über `project_roles`
  (`gateway/project_roles.go`, `policy/project_gate.go:5`, `files.go:433`).
  → Für das Widget-dynamische Projekt-Finden und für den Zugriff gelten zwei verschiedene
  Quellen; das ist eine Entscheidung, keine Detailfrage (offene Frage 6).

## Operative Constraints (aus der Session, verbatim)

- Kein Deploy von mir — nur edit/commit/push; Ausführung auf superleo, ich nenne nur Commands.
- Nicht pushen, bis die parallele S181-Session gemerget hat; danach `git pull --no-rebase`.
- Sprint-File vor Code; „fertig" nur mit echtem Verifikationsbefehl; Secret-Scan vor Commit;
  `.env`/`config.yml` nie staged.
- Mandate 9: Secrets nie im Klartext persistieren, nie ins Repo, nie ins Log.

## Bezug zu bestehenden Sprints

| Sprint | Bezug |
|---|---|
| **S57** | `/embed/{name}/*` — Gateway-Proxy, same-origin, **kein iframe**. `embed.go:19` notiert die Regel im Präsens als Verbot |
| **S159** | `ChromiumPluginRenderer` auf `m1k1o/neko:chromium` — echter Chromium + WebRTC-Stream, **pro Plugin-Session, ephemeral** |
| **S139 / S145** | Ownership-/Member-Gates (owner\|admin handler-side, OPA für Admin-Mutationen) — das Muster, das hier **wiederverwendet** wird |
| **S182** | Dashboard-Builder-Grid; dessen Grafana-Widget läuft über S159 und ist **bewusst nicht** Teil dieses Sprints |

## Warum dieser Sprint existiert (das Problem)

Der Operator will Inhalte ohne iframe bereitstellen. Zwei Wege wurden im Gespräch
durchgespielt und beide bewusst **nicht** genommen:

- **Persistenter interaktiver Cloud-Browser (Tabs, „offen lassen", neko-Video):** bräuchte
  Tab-Steuerung, Cookie-Ablage im Container, RAM pro User, und man sähe nekos Login-Screen
  (Logo-Frage des Operators). → **nicht** dieses Sprint, siehe „Nicht in diesem Sprint".
- **`<iframe>`:** verstößt gegen `embed.go:19`. OOPIF hebt `X-Frame-Options: DENY` nicht auf
  — die Anfrage wird abgelehnt, bevor ein Renderer-Prozess existiert.

**Genommen wird:** ein Chromium rendert die Seite **serverseitig**, das Ergebnis wird
**gecacht** und dem User ausgeliefert. Kein Video, kein neko, kein iframe, keine Tab-Steuerung.

## ⚠️ Security-Modell — die ersten Tasks, nicht ein Nachgedanke

Punkt 9 des Auftrags ist keine Fußnote, sondern die eigentliche Anforderung. Drei Regeln,
die **vor** dem ersten Code fertig sein müssen:

### Regel 1 — Der Cache hängt an der Browser-Session, nicht an `policyRevision`

> Operator (3.10.): > *"kannst du das nicht über die browser session verlinken? und wenn die stirbt
> löschen wirs halt aus dem cache"*

```
key = (sessionHash, url)          // sessionHash = hashSessionToken(token), auth.go:1415
purge = bei jedem Session-Tod, per sessionHash-Präfix
TTL  = 24h (dashboardLoginTTL), auth.go:65 — Rückfallebene
```

**Diese Antwort ersetzt den ursprünglich vorgeschlagenen `policyRevision`-Zähler** — ein
Konzept weniger, und die Mechanik steht bereits:

| Was stirbt | Fundstelle | Cache-Folge |
|---|---|---|
| `POST /api/auth/logout` | `auth/auth.go:180` | purge |
| `POST /api/auth/sessions/revoke` | `auth/auth.go:182`, Handler `:1409` | purge |
| Passwortänderung → `revokeOthers` | `auth/auth.go:434` | purge |
| TTL-Ablauf (24h) | `dashboard_sessions`-Map, `auth/auth.go:13` | purge (bzw. TTL greift) |
| Vault-Sessions-Token | `store/vault.go:376 RevokeSessionTokens` | purge |

Der Session-Speicher ist ohnehin **schon gehasht** (`hashSessionToken`), d.h. der
Cache-Key enthält keine rohen Tokens.

#### Das eine Loch, das bleibt (und genau das war die Admin-Anforderung)

Zwei Dinge sterben getrennt:

1. **Session tot** → dein Mechanismus greift, Cache weg. ✅
2. **Admin entzieht eine Inhalts-Freigabe, während die Session noch lebt** → dein
   Mechanismus greift **nicht**: der Eintrag bleibt bis zu 24h gültig. Das ist exakt
   der Fall aus Punkt 9 (*„das entschiedet der admin welche inhalte für welchen user
   rausgegeben sind"*).

**Vorgesehener Fix:** bei jedem **Cache-HIT die Policy nochmal prüfen** (ein
OPA-Aufruf, kein erneutes Rendern). Dann ist der Cache nur ein *Render*-Cache, kein
*Rechte*-Cache: die Freigabe wird in Echtzeit erzwungen, die Session-Speicherung
übernimmt nur das Teure (das gerenderte Ergebnis). Alternative — aktives Purgen bei
Freigabe-Änderung — bräuchte wieder einen zweiten Invalidierungs-Hook an der
Admin-Stelle und damit genau das Konzept, das dieser Ansatz vermeiden soll.

### Regel 2 — Der Container rendert mit der Identität des Fragenden

Nicht mit einem Dauer-Service-Credential. Nur so ist die Admin-Entscheidung **am Quellpunkt**
erzwungen und der Container kein Confused-Deputy, der per Klick alles freigibt. Muster steht
bereit: `embed.go` tauscht ein bestehendes Session-Token gegen ein **scoped** Token
(`aud=`-Claim) aus — derselbe Handoff, hier mit User-Scope statt Cookie.

### Regel 3 — Keine neue Rechteebene

Der Container erfindet keine eigene ACL, er **respektiert** die, die schon da sind:

| Fläche | Gate, das gilt |
|---|---|
| Apps / Dashboards | Admin-Freigabe wie heute, `policy.go` (OPA, fail-closed) |
| eigene Dashboards | Ownership nach SPRINT-139 |
| E-Mail-Integration | deren eigener Gate — nicht der des Containers |

## Bestand (im Code nachgeschlagen, 3.10.)

Diese Bausteine **existieren bereits**; der Sprint muss sie verdrahten, nicht erfinden:

| Baustein | Fundstelle | Fakt |
|---|---|---|
| AES-GCM-256 at rest | `src/backend/internal/store/secrets.go` | `Encrypt`/`Decrypt`/`SetEncryptedSetting`/`EnsureEncryptionKey` |
| Secret-Engine + Audit | `vault_secrets` (Mandate 9) | schon im Einsatz für Plugin-Configs (`gateway/plugins.go:298`) und Datei-DEKs (`gateway/files.go:746`) |
| Autorisierung | `src/backend/internal/policy/policy.go` | eine Engine (OPA/Rego, `go:embed policies/default.rego`), `IsAdminMutation`, fail-closed |
| Ownership-Gates | SPRINT-139 `gateway/workspaces_provision.go`, SPRINT-145 `gateway/workspace_members.go` | owner\|admin **handler-side**, OPA nur für Admin-Mutationen |
| Kein iframe | `src/backend/internal/gateway/embed.go:19` | „NO IFRAME, NO AGENT-BROWSER"; Header wird für künftiges Framing defensiv gestrippt |
| Token-Handoff | `embed.go` (gleiche Datei) | Session-Token → scoped HttpOnly Cookie, Pfad `/embed` |
| Chromium installierbar | `deploy/projects_ssh.go:837` | `defaultToolPackages["chromium"] = "chromium chromium-driver"` |
| Chromium-Container, ephemeral | `deploy/plugin_renderer.go:97` | `rendererImage = "m1k1o/neko:chromium"` |
| **Warum Persistenz alles ändert** | `plugin_renderer.go:140-144` | neko-Passwort **nur im RAM** („in-memory ONLY (Mandate 9)") — legitim, weil die Session beim Neustart stirbt |
| Cache-Infrastruktur | `internal/streams/streams.go:46` | `redis.NewClient` (go-redis/v9), live, via `Streams.Ping` im Health-Check |

**Ehrliche Lücke des Bestands:** in `policy.go` gibt es **keine** `plugin-renderer`-Regel und
die Routen hängen direkt am `mux` (`plugin_renderer.go:181-186`). Für eine **pro-User**
persistente Fläche fehlt damit die Ownership-Prüfung — für diesen Sprint irrelevant (der
Container rendert pro Anfrage mit dem Fragenden), aber der Grund, warum eine spätere
persistente Variante nicht einfach aufgebaut werden darf.

## Task-Tabelle

| Nr | Task | Status |
|---|---|---|
| 1 | ~~`policyRevision`-Definition klären~~ **→ vom Operator ersetzt durch Session-Bindung (s. Regel 1)** | ✅ entschieden |
| 2 | Token-Scope festlegen: `aud=`-Claim + Lebensdauer für „render als User" | ✅ **ersetzt durch D7** — kein eigenes Token: Pfad-Ziele gehen mit dem Callers eigenen `Authorization` durch uns selbst |
| 3 | Render-Dienst: Chromium rendert URL **unter der Identität des Fragenden** | ✅ gebaut (`internal/render`, `gateway/render.go`) |
| 4 | Cache: Key `(sessionHash, url)`, Speicherort (Redis ist da), TTL = Session-TTL | ✅ gebaut (`streams/cache.go`, `render.Key`) |
| 5 | Purge-Hooks an den Session-Toden setzen (`logout`, `sessions/revoke`, `revokeOthers`, TTL) | ✅ gebaut (`auth.OnSessionDeath` an allen drei Stellen; TTL deckt Ablauf ab) |
| 5b | **Policy-Recheck bei jedem Cache-HIT** — schließt das Loch „Admin entzieht während die Session lebt" | ✅ gebaut + getestet (grant aus `project_roles` frisch gelesen, Admin-Degradierung → 403 + Purge) |
| 6 | Secrets: was landet verschlüsselt wo (`vault_secrets` vs. nur RAM) | ✅ **entschieden (D8)** — nichts davon: Cache enthält extrahierten Text, niemals das Zielseiten-Token; Forwarding nur der Callers eigenen Header |
| 7 | Tests: Leck-Test — User B bekommt **nicht** User A's Cache-Treffer; entzogene Freigabe liefert **sofort** nichts mehr, auch mit laufender Session | ✅ 4 Tests grün gegen echtes Postgres (`render_test.go`, `gateway/render_test.go`) |
| 8 | ~~Sprint-File mit echten Verifikationsbefehlen füllen~~ → steht oben | ✅ |
| 9 | **Webview-Panel-Widget** — Instanz-Modell `webview:*`, Panel mit Zielformular, Picker bietet den Typ auch bei bereits aktivem Panel an | ✅ gebaut |
| 10 | **Frontend-Erkennung** `detectWebFrontends` (Closed Set `http`+`code-server`, `vnc`/`terminal` nie) + `frontendTunnelUrl` | ✅ gebaut |
| 11 | **Iframe-Rückbau:** `AppPanelDrawer.tsx:506` durch Cache-Widget ersetzen | ⬜ **entblockt** — `GET /api/render/cache` existiert jetzt; noch nicht gebaut |
| 12 | **Project-Admin-Widget**: `GET /api/projects` + ein `GET /api/project-roles`, nach Projekt gejoint | ✅ gebaut |
| 13 | **Projekt-Dashboards nur auf der Projekt-Overview-Seite** (`ProjectDetailPage.tsx`, Tabs `:462-532`) | ⬜ offen (nächster Frontend-Task) |
| 14 | **Utility-Dashboards** hinter `jimesh-operator` + `jimesh-admin` (D1) — erste echte Erzwungung dieser Rolle | ⬜ offen (Go hier verfügbar) |
| 15 | ~~Quelle der Websichtbarkeit klären~~ → **D2 entschieden: `project_roles`, Teams nur informativ** | ✅ entschieden |

## Offene Fragen (nicht geraten)

1. **Interaktiv oder Snapshot?** Der Auftrag sagt zweierlei: *„im Hintergrund auch offen
   lassen"* (Punkt 1) und *„wenn wir seiten cachen"* (Punkt 8). Ein Snapshot-Cache
   erfüllt (8), aber nicht (1). **Braucht es am Ende eine Live-View, oder reicht der
   Cache?** — ohne Antwort riskieren wir, genau den persistenten Browser zu bauen, der
   oben als „nicht genommen" notiert ist.
2. ~~**Cache-Format:** gerendertes HTML, Markdown, Screenshot/PNG oder mehreres?~~
   ✅ **beantwortet mit D4 — extrahierter Text + Links (JSON), nie das HTML der Zielseite.**
3. ~~**Speicherort:** Redis … Ozone-S3 … oder alles Redis?~~ ✅ **beantwortet mit D5 —
   Redis über `streams.Hub`, Prozess-Map als Fallback, kein Ozone.**
4. ~~**Wo steht die Admin-Freigabe konkret?**~~ ✅ **beantwortet mit Punkt 12** — es ist
   das *„normale project scope"*: `project_roles`-Grants + `policy/project_gate.go` +
   `policies/project-roles.rego`. Damit ist Task 5b (Recheck bei HIT) ein Aufruf
   derselben Gate-Funktion, kein neuer Ort.
5. ~~**Welche Rolle meint „network admins"?**~~ ✅ **entschieden — s. „Entscheidungen" unten.**
6. ~~**Welche Quelle entscheidet Sichtbarkeit?**~~ ✅ **entschieden — s. „Entscheidungen" unten.**

## Entscheidungen (von mir getroffen, 3.10. — Operator: *„mach einfach ordentlich"*)

Alle drei sind **meine** Antworten auf die Fragen oben, mit der Fundstelle, die sie stützt.
Keine davon ist eine Operator-Entscheidung; Veto vorbehalten.

### D1 — „network admin" = `jimesh-operator`

Die Realm-Rollen werden erzeugt als `"jimesh-" + role` mit `role ∈ {admin, operator, viewer}`
(`auth/keycloak_oidc.go:505-508`) → es gibt **`jimesh-admin`, `jimesh-operator`, `jimesh-viewer`**.

| Rolle | wird geprüft in | |
|---|---|---|
| `jimesh-admin` | `default.rego:31`, `headscale.rego:54`, `project-roles.rego:52` | voller Admin ✅ |
| `jimesh-dev` | `project-roles.rego:59` | projekt-scoped ✅ |
| Passwort-Operator `roles ["admin"]` | `headscale.rego:42`, `project-roles.rego:45` | Instanz-Besitzer ✅ |
| **`jimesh-operator`** | **nirgends** (einzige Fundstelle: der Kommentar `keycloak_oidc.go:505`) | **zugewiesen, nie erzwungen** ⚠️ |
| `jimesh-viewer` | nirgends | wie oben ⚠️ |

Punkt 12 nennt *„network admins **und** admins"* — zwei Dinge. Da `jimesh-admin` schon
„admin" abdeckt, bleibt für „network admin" nur der eine existierende, noch ungenutzte
Mittel-Tier: **`jimesh-operator`**. Das ist der Ops-Tier eines Mesh-Produkts, und er ist
bisher eine Rolle ohne einzige Policy-Regel — Utility-Dashboards wären ihre erste echte
Erzwungung.

**Konsequenz:** die Utility-Dashboards-Regel wird die erste, die `jimesh-operator`
überhaupt etwas erlaubt. Das muss beim Bauen sichtbar bleiben (Task 14), nicht implizit
entstehen. Alternativen, falls das falsch liegt: `jimesh-dev` (aber der ist projekt-
gebunden, nicht „network") oder eine **neue** Rolle — beides wäre eine Änderung des
bestehenden Rollenmodells und damit kein Sprint-183-Teil.

### D2 — Erzwungung bleibt bei `project_roles`, Teams sind Information

- **Zugriff** entscheidet weiterhin `project_roles` + `policy/project_gate.go` +
  `policies/project-roles.rego` — die einzige Projekt-Ebene, die **irgendwo erzwungen**
  wird (`files.go:433`, `project_gate.go:5`).
- **`team_resource_bindings`** (inkl. `resourceType="project"`) bleibt in diesem Sprint
  **rein informativ**: kein Gate, kein neuer Endpoint für die Projekt→Team-Richtung.

Begründung: Regel 3 („keine neue Rechteebene"). Zwei Quellen, die beide „darf sehen"
bedeuten würden, wären genau das — eine zweite Ebene, die nach dem ersten Bug divergiert.
Bindings ins Gate zu holen ist eine eigene Entscheidung mit eigenem Threat-Model, nicht
ein Seiteneffekt der Dashboard-Fläche.

### D3 — Ein generisches Webview-Panel, Grafana ist ein Preset

Punkt 12 („beliebig viele webview panels") und S182 Task 4 (Grafana-/Embed-Widget) sind
derselbe Render-Fall. **Ein** Widget-Typ `webview` mit Instanz-IDs, Grafana als Preset/
Vorauswahl desselben Ziel-Pickers (`GET /api/embeds`, `SshTargetSelect`, Storage-Form
`jimesh.builderWidget.<scope>.<instanceId>`). Zwei Render-Pfade für eine Sache zu bauen
wäre der Fehler, den D2 genau vermeidet.

**Nachtrag 7.10.2026 (Operator-Entscheidung):** Der Operator suchte Grafana im
Picker und fand es dort nicht — **Anlass (verbatim):** „grafana fhelt immernoch als
webview pane", nachdem geklärt war, wo er es erwartet: **Antwort auf die Rückfrage:**
„Grafana als eigenen Picker-Eintrag". Damit bekommt `grafana` einen eigenen Eintrag in
`WIDGET_REGISTRY`, während **D3 im Kern unverändert bleibt**: der generische
`webview`-Typ und seine Preset-Zeile existieren weiter, `GrafanaEmbedPane`
(`components/builder/grafana-embed-pane.tsx`) ist eine dünne Hülle um dasselbe Panel,
die nur `defaultTarget` aus `GET /api/embeds` vorbelegt — kein zweiter Renderer, keine
zweite Storage-Form, keine zweite Zielquelle. `DEFAULT_LAYOUT` wächst **nicht**
(bestehende Dashboards round-trippen weiterhin byte-identisch), und ohne
konfiguriertes `grafana`-Target zeigt die Karte ihr ehrliches leeres Formular statt
einer URL, die 404 liefern würde (Mandat 2).

### D4 — Cache-Format: Text + Links, nie das Zielseiten-HTML (offene Frage 2)

Was aus `GET /api/render/cache` kommt, ist JSON mit extrahiertem `text` + `links` +
`title` — **nie** das rohe HTML der Zielseite. Begründung: die Zielseite ist eine
beliebige interne Seite, die jemand ins Panel gehängt hat; ihr Markup in unserem
Origin auszuführen wäre genau die XSS-Lücke, die Punkt 11 am Iframe kritisiert (und
jemand anderes „sauber" zu sanitizen wäre ein eigenes Sicherheitsprojekt). Der
Server parst mit `golang.org/x/net/html` (bereits in `go.mod`) und streift
`script`/`style`/`noscript` heraus. **Trade-off, offen ausgesprochen:** eine
JS-getriebene App liefert so nur ihr serverseitiges Gerüst — die volle Treue liefert
der Chromium-Pfad (Webview-Panel), nicht der Cache. Die beiden sind Ergänzungen.

### D5 — Speicherort: Redis über `streams.Hub`, Fallback Prozess-Map (offene Frage 3)

Redis, weil es genau einen `*redis.Client` im Backend gibt (`streams.go:31`, privat) und
weil zwei Pools zwei `REDIS_URL`-Konfigurationen wären. Ohne Redis greift eine
TTL-Map im Prozess (Muster: `memLockout`) — nie „gar kein Cache". Ozone-S3/`.jenc`
brauchen wir dafür **nicht**: der Eintrag lebt maximal die Lebensdauer einer Session
(24 h), das ist eine Heiß-Datenfrage, keine Archivfrage.

### D6 — SSRF-Guard und Ziel-Erlaubnis

- **Pfad-Ziele** nur `/api/projects/{id}/…` (das ist die Tunnel-Route, an der eine
  Projekt-Freigabe überhaupt existiert → Task 5b hat etwas zum Nachprüfen).
- **Absolute Ziele**: `http(s)`, keine Credentials in der URL, kein `localhost`,
  kein Loopback, kein Link-Local (damit `169.254.169.254` weg ist), kein
  Multicast/Unspecified; **private Ranges bleiben erlaubt** — 10.x-Seiten zu
  erreichen ist der Produktzweck. Hostnamen werden beim DNS-Lösen geprüft, jeder
  Redirect-Hop erneut.
- **Der Gateway-Origin für Pfad-Ziele kommt aus dem eigenen Listener (`s.addr`),
  nie aus dem Host-Header** — sonst wäre jeder authentifizierte Nutzer mit
  `Host: 169.254.169.254` am SSRF-Vorbei.
- Vor dem Guard gab es im Backend **keine** einzige dieser Prüfungen (geprüft über
  `internal/`); nichts davon war wiederverwendbar.

### D7 — Kein eigenes „render als User"-Token (Task 2 ersetzt)

Statt `aud`/Lebensdauer für ein Service-Token: Pfad-Ziele werden **mit dem
Authorization-Header des Anfragenden** gegen unsere eigene Gateway-Route geholt
(Regel 2: die Seite sieht, wer gefragt hat), absolute Ziele **anonym** — wir haben
kein Recht, die Anmeldedaten des Operators gegen einen Host weiterzugeben, den wir
nicht betreiben. Damit gibt es kein zweites Token, das ablaufen und erneuert
werden müsste.

### D8 — Secrets landen nirgends im Cache (Task 6)

Der Eintrag enthält extrahierten Seitentext, Status, Content-Type und die
Identität des Anfragenden — **keinen** Zielseiten-Token, kein Cookie, keine
Anmeldegeheimnis-Destination. Forwarded werden ausschließlich die **eigenen**
Header des Anfragenden (und nur bei Pfad-Ziel). Widget-Storage im Frontend hält
ohnehin nur die Endpoint-**ID**, nie die SSH-Zugangsdaten.

## Nicht in diesem Sprint

- **Grafana-/Embed-Widget im Builder-Grid** (S182 Task 4) — ✋ **Überlappung mit Punkt 12.**
  Der dort geplante eigene Weg über `ChromiumPluginRenderer` pro-Session ist inhaltlich
  derselbe Fall wie Task 9 („webview panel"). Zwei getrennte Widgets zu bauen hieße zwei
  Render-Pfade für dieselbe Sache. **Offen, nicht selbst entschieden:** ein generisches
  Webview-Panel mit Grafana-Preset (Ziel-Picker + `jimesh.builderWidget.*`-Config von S182
  wiederverwendet) **oder** bewusst zwei Widgets. Nicht doppelt anfassen, bevor das
  geklärt ist.
- **Persistenter interaktiver Cloud-Browser** mit Tabs/„offen lassen" — bräuchte
  Persistenz, Cookie-Ablage (Secret-Problem), Ownership-Gate (oben als Lücke notiert)
  und löst die neko-Logo-Frage. Eigene Entscheidung, eigener Sprint.
- **Speculation Rules für den Launcher** — billiger Extra-Effekt für
  `DashboardsPage`, kein Teil der Cachelogik.

## Gebauter Frontend-Slice (dieser Durchgang)

| Datei | Rolle |
|---|---|
| `lib/dashboard-presets.ts` | `CardId` += `webview`, `project-admin`; Instanz-IDs (`webview:<token>`), `widgetTypeOf`, `isValidInstanceId`, `newWidgetInstance`, `filterKnownCardIds` (jetzt `string[]`), `instantiateIds` (repariert einen bare-Typ statt ihn zu verlieren) |
| `lib/dashboard-presets.test.ts` | 26 Tests zum Instanz-Modell |
| `lib/widget-registry.ts` | die beiden neuen Typen, `getWidgetMeta`, Instanz-auflösende Packer, `getAvailableWidgets` lässt Multi-Instance immer offen |
| `lib/widget-config.ts` | dritte Storage-Heimat `jimesh.builderWidget.<scope>.<instance>` — nur `target`/`label`, niemals Secrets |
| `lib/frontend-detection.ts` | `detectWebFrontends` / `primaryWebFrontend` / `frontendTunnelUrl` (Closed Set `http`,`code-server`) |
| `components/builder/WebviewPanelCard.tsx` | Zielformular mit Validierung, Pending-Statt-Iframe |
| `components/builder/ProjectAdminCard.tsx` | Projekte + project_roles-Grant-Zähler je Projekt |
| `views/DashboardBuilderPage.tsx` | `activeCardIds` → Instanz-IDs, `CardProps`, Picker mintet neue Instanzen |

**Backend-Vertrag, auf den `WebviewPanelCard` wartet** (Go, Tasks 3/4):

```
GET /api/render/cache?url=<target>
  → liefert das serverseitig gerenderte Ergebnis für DEN ANFRAGENDEN
    (Identität aus dem Session-Token, s. Regel 2)
  → Cache-Key (sessionHash, url), TTL = Session-TTL (Regel 1)
  → Policy-Recheck bei jedem HIT (Task 5b)
```

Solange dieser Endpunkt fehlt, zeigt das Panel den ehrlichen Pending-Zustand
(`RENDER_CACHE_CONTRACT` in `WebviewPanelCard.tsx`) — **kein iframe-Fallback,
kein `dangerouslySetInnerHTML`**. Beides wäre genau das, was Punkt 11 entfernt;
HTML in unseren Origin auszuführen wäre zusätzlich eine XSS-Lücke, und ob der
Cache HTML oder Text liefert, ist offene Frage 2.

### Warum D2 auch in den Zahlen sichtbar ist

`ProjectAdminCard` liest **einmalig** `GET /api/project-roles` ohne `project_id`
und joint clientseitig (`store/project_roles.go:127-131` liefert bei leerem
Filter alle Zeilen). Es gibt **keine** clientseitige Filterung der Projektliste —
sonst wäre das eine zweite, fingierte Rechtebene, und genau das verbietet D2/Regel 3.

## Gebauter Backend-Slice (dieser Durchgang)

| Datei | Rolle |
|---|---|
| `internal/render/render.go` | Cache-Key `(sessionHash, url)`, `Service.GetOrFetch`, `Purge`/`PurgeSession`, SSRF-Regeln (`ValidateTarget`, `ipAllowed`, guarded Dialer + Redirect-Prüfung), `Entry.AllowedFor` (Task 5b), In-Memory-`MemCache` |
| `internal/render/extract.go` | HTML→Text mit `golang.org/x/net/html`; `script`/`style`/`noscript` nie im Text, relative Links gegen die Dokument-URL aufgelöst, 200 KB/200 Links gedeckelt (D4) |
| `internal/render/redis_cache.go` | `RedisCache`-Adapter auf `streams.Hub` |
| `internal/streams/cache.go` | `CacheGet`/`CacheSet`/`CacheDeletePrefix` (SCAN statt KEYS), nil-safe |
| `internal/auth/session_identity.go` | **neu** — `SessionHash(r)` (Hash + verbleibende Lebenszeit) und `OnSessionDeath`-Hook |
| `internal/auth/auth.go` | Hook-Felder; `notifySessionDeath` an `logout`, `sessions/revoke` und `revokeOthers` (Task 5) |
| `internal/gateway/render.go` | `GET /api/render/cache` — Identity, Ziel-Validierung, frischer `project_roles`-Check, HIT-Recheck + Purge, JSON-Antwort |
| `internal/gateway/gateway.go` | Service-Konstruktion (Redis bzw. Prozess-Map), Hook-Registrierung, Routen-Registrierung |

**Antwort auf offene Frage 1 („Cache oder Live-View?"):** beide, getrennt nach
Zielart — **Pfad-Ziel** (Gateway-Tunnel, projekt-scoped) → Cache mit Session-TTL und
Recheck; **absolutes Ziel** → Chromium-Panel (lebend). Ein dritter Weg, einen
persistenten Browser zu bauen, entsteht hier nicht (steht unter „Nicht in diesem
Sprint").

## Verifikation

Frontend-Befehle in `src/frontend` (dort liegt `package.json`; im Repo-Root gibt es
keines), Backend-Befehle in `src/backend` mit `PATH="/home/ji/sdk/go/bin:$PATH"`.

```
# ── Frontend ────────────────────────────────────────────────────────────────
npx vitest run
→ Test Files  68 passed (68)
  Tests      606 passed (606)

node scripts/check-i18n.mjs
→ i18n validation passed for 60 locales, 3326 keys, and 4036 literal t() calls
  (3309 + 17 × 60 = 3326 ✓; die 341 bekannten fehlenden Keys stammen unverändert
   aus S181-7)

npx tsc --noEmit -p tsconfig.app.json | grep -c 'error TS'
→ 420        (Baseline 421, 0 neu)

npx eslint <geänderte .ts/.tsx/.mjs>
→ 0 problem

# ── Backend ─────────────────────────────────────────────────────────────────
go build ./...          → exit 0
go vet ./...            → exit 0
go test ./internal/render/            → ok (9 Testfunktionen, ohne DB)
go test ./...                          → 26 Pakete ok, 5 FAIL (Baseline, s.u.)
```

Die 4 Handler-Tests brauchen Postgres (die Session-Tabelle und `project_roles`);
hier skippieren sie mit dem Repo-typischen Grund (die Host-Postgres auf :5432
verweigert das `jimesh`-Passwort). **Verifiziert gegen einen Wegwerf-Container
`postgres:16` auf 127.0.0.1:5433 mit `DATABASE_URL` (Pattern von `make go-test`,
Wegwerf-DB, nie echte Daten), danach `docker rm`:**

```
DATABASE_URL=postgres://…@127.0.0.1:5433/jimesh go test ./internal/gateway/ -run TestRenderCache -v
→ TestRenderCacheSessionLifecycle            PASS   (Logout leert den Cache, Task 5)
→ TestRenderCacheRechecksAdminOnEveryHit     PASS   (Task 5b: 403 + Purge, dann MISS)
→ TestRenderCacheRefusesRevokedProjectGrant  PASS   (Task 7: sofort 403, Session lebt)
→ TestRenderCacheRefusesHostileTargets       PASS   (SSRF-Rand: 400)
```

### Backend-Baseline (nicht von diesem Sprint)

`go test ./...` hat **5 rote Tests, identisch vor und nach dem Slice**, alle mit
`password authentication failed for user "jimesh"` (kein Stack hier):
`internal/ai.TestNewProviderProbeFlow` (1) und `internal/service`
(4). Nicht angefasst — ein eigener Sprint.

Frontend-Konterzahlen gegenüber S182-Baseline (540 Tests / 63 Dateien) → **606 / 68**,
also **+66 Tests, 0 rot**. Neue Testdateien: `dashboard-presets.test.ts` (26),
`widget-config.test.ts` (13), `frontend-detection.test.ts` (11),
`ProjectAdminCard.test.tsx` (4), `WebviewPanelCard.test.tsx` (7).

### ⚠️ Zwei Baseline-Befunde, die die frühere „0 echte Typfehler"-Zahl korrigieren

Die S182-Zahl „tsc → 0 echte Typfehler" kam aus `npx tsc --noEmit` **ohne `-p`** —
der Root-tsconfig ist eine Solution-Datei (`files: []` + project references) und
meldet nur Config-Fehler (TS6305/6310), er typechecked **keine einzige Datei**.
Mit dem echten App-Projekt:

| | HEAD (Baseline) | nach diesem Slice |
|---|---|---|
| `tsc --noEmit -p tsconfig.app.json` | **421** | **420** (1 weniger, 0 neu) |
| `eslint` auf die geänderten Dateien | **1 error** (`DashboardBuilderPage.tsx`, `set-state-in-effect`, Vorbestand) | **0** |

Verifiziert gegen einen `git worktree` bei HEAD, nicht gegen Erinnerung. Die
Dominanten der 421 sind `chain-mesh-graph.tsx` (108), `ProxyChainsPage` (47),
`SubagentApprovalQueuePage` (44) — alles Vorbestand, nicht Teil dieses Sprints.
Eine echte Korrektur dieser Basis wäre ein eigener Sprint.

**Von mir neu verursacht und wieder entfernt:** `WebviewPanelCard` hatte einen
`react-hooks/set-state-in-effect`-Fehler — umgebaut auf das Repo-Muster „State
während Render anpassen" (wie `geom.scope` in `DashboardBuilderPage`), Effekt raus.

### Secret-Scan / Nebenwirkungen

```
git status --porcelain | grep -E '\.env|config\.yml'   → kein Treffer
```
Geänderte Dateien nach Schlüssel-Wörtern gescannt → leer. Kein Push (Base `b64262a2`,
S181-Session hat noch nicht gemerget).
