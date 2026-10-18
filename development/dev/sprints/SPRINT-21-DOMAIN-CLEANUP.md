# SPRINT-21 — Domain-Klarheit, API-Neugruppierung, Docstrings/Schema-Doku

**Ausgelöst durch:** Operator-Audit (6.9.2026, 6 parallele Research-Subagenten) über
`docs/research/`, `docs/sprints/`, den Go-Domänen-Code und das SQL-Schema. Ziel:
prüfen, ob das Projekt noch am Kernziel arbeitet, und danach Code/API/Docs so
umbauen, dass Domänen (Session, Agent, Task, ...) sauber getrennt sind, die API
nach Gruppen sortiert ist, und Docstrings/Schema-Doku automatisiert entstehen.

## Plan (Reihenfolge vom Operator festgelegt)

1. **Domain-Klarheit zuerst** (dieser Sprint, Teil 1) — Begriffs-Kollisionen
   auflösen (Session/Agent/Task), Basis-Structs wo sinnvoll, kleine Migrationen
   wo nötig.
2. **API-Neugruppierung** (danach) — `internal/gateway` (45 Dateien, 178 Routen,
   ein einziger Mux/Server) nach fachlichen Gruppen aufteilen; AI-Proxy-Fläche
   von Management-API trennen; `/v1/*`-Auth-Default-Lücke schließen.
3. **Docstrings + OpenAPI/HTML-Gen** (danach) — `swaggo/swag`-Stil-Annotationen,
   generierte API-Doku statt manuell gepflegtem `API_DOCS.md`.
4. **Schema-Doku** (danach) — zentrales Referenzdokument für SQL-Tabellen +
   Go-Structs, kein ORM-Wechsel (bleibt raw SQL + manuelles Scan, Mandat 7).

## Package-Struktur-Entscheidung (6.9.2026, nachträglich)

Erste 4 Domänen wurden als Unterordner von `gateway/` extrahiert
(`gateway/canvas`, `gateway/auth`, `gateway/provisioning`, `gateway/deploy`,
`gateway/meshedge`). Operator fand das inkonsistent mit der im Rest des
Repos gelebten flachen Struktur (`store`, `network`, `service`, `keypool`, ...).
Zwei Subagenten haben das geklärt (Best-Practices-Recherche +
Abhängigkeitsgraph-Analyse dieses Repos):

- **Kein Zyklusrisiko** bei flacher Struktur — verifiziert: keines der vier
  Packages importiert `gateway` zurück, `canvas → meshedge` ist die einzige
  Geschwister-Kante.
- **Etablierte Praxis uneindeutig** (Docker nested Domains unter
  `api/server/router/*`, Kubernetes ist flach), aber dieses Repo hat mit
  `store`/`network`/`service`/... bereits die flache Konvention gesetzt —
  Verschachtelung unter `gateway/` bricht diese Konsistenz.
- **"gateway unter network"** klar verworfen — `network` ist SSH-Tunnel/
  Hostkey-Transport zu Remote-Hosts, ein anderes Transport-Konzept als der
  eingehende HTTP-API-Server.

**Ergebnis:** Alle Domain-Packages sind jetzt flache Geschwister von
`internal/store` etc.: `internal/canvas`, `internal/auth`,
`internal/provisioning`, `internal/deploy`, `internal/meshedge`.
`internal/gateway` bleibt die dünne Kompositionswurzel (Server-Struct,
Mux, Middleware, Route-Registrierung) und importiert diese Packages.
Gilt auch für alle noch kommenden Extraktionen (security, ai, analytics,
discovery, orchestration) — keine weitere Verschachtelung unter `gateway/`.

## Audit-Befunde (Zusammenfassung, volle Berichte nur im Chat-Verlauf)

- Kernfeatures (Routing/Quota, Entropy-Routing, MoE-Experts, DSH-Import,
  Langfuse-Tracing) existieren und laufen, wurden aber seit Sprint 19 nicht
  mehr weiterentwickelt — 100% der letzten ~30 Commits sind Security/K-LAF.
  Diese vier Bereiche sind kommentarlos aus `PRODUCT-ROADMAP.md` verschwunden
  (Verstoß gegen Mandat 1, Retrospective Honesty) statt bewusst zurückgestellt.
- `DECISIONS.md` behauptet „react-grid-layout ✅ live verifiziert" — Paket
  existiert im Frontend-Code nicht. Dokumentierte, nie gebaute Entscheidung.
- K-LAF-Kern (Scanner WP2 + Freeze WP3) existiert im Code noch gar nicht —
  bisher nur Hardening/Sichtbarkeit, nicht die versprochene Enforcement-Fähigkeit.
- Sprint/Backlog-Ehrlichkeit: 91% der geprüften „erledigt"-Markierungen
  stimmen. Eine echte Regression gefunden und **gefixt** (siehe unten).
- API: 178 Routen, ein einziger Mux/Server/Middleware. `/v1/*` (AI-Proxy) hat
  standardmäßig **ausgeschaltete** Auth (opt-in), `/api/*` ist immer
  session-gated — im Auslieferungszustand ist der Proxy offen erreichbar.
- Go-Domänen: "Session" = 3 disjunkte Konzepte (Agent/LLM-Session,
  Dashboard-Login-Session, "Session Replay" — Letzteres existiert nicht,
  war Hypothese). "Agent" = 4 Bedeutungen, "Task" = 2 unabhängige Bedeutungen.
- SQL-Schema: sauber, keine Duplikate. Aber `sessions.container_id`/`status`/
  `trust_class` wurden geschrieben, nie zurückgelesen (WP3-Freeze-Gate lag
  im Schema, war im Code-Pfad nicht verdrahtet) — **gefixt** (siehe unten).

## Teil 1: Domain-Klarheit — erledigt (6.9.2026)

**Akutfunde mitgefixt (Operator-Wunsch):**
- `projects_ssh.go`: Task-Worktree-`chmod -R 777`-Regression (WP7/TASK-014
  hatte das TASK-009-Fix-Muster für den Haupt-Workspace-Pfad nicht auch für
  Task-Worktrees übernommen) — nutzt jetzt dieselbe `jimesh_ws_perms`-Policy.
- `quota.go`: `MarkModelPaid`/`MarkKeyPaid` übergaben rohen `bool` an eine
  `INTEGER`-Spalte statt `b2i(bool)` wie der Rest des Pakets — gefixt.

**Session-Domain entwirrt:**
- `store.SessionRow` → `store.AgentSessionRow`, jetzt mit den Feldern, die die
  Tabelle längst hat (`container_id`, `parent_session_id`, `project_id`,
  `status`, `trust_class`) — vorher schrieb `CreateSession` diese Spalten,
  aber `ListSessions`/`QuerySessions` (und damit `/api/sessions` + der gRPC
  `ListSessions`-RPC) lasen sie nie zurück. Live gegen die echte Postgres-DB
  verifiziert (SQL-String direkt per `psql` ausgeführt, liefert korrekte
  Spalten zurück).
- `store.SessionIdentity` → `store.AgentSessionIdentity` (Epic-17-Policy-Pfad).
- `auth.go`: `sessionTTL` → `dashboardLoginTTL`, Setting-Konstante
  `settingSessions` → `settingDashboardLogins` (nur Go-Bezeichner, der
  persistierte DB-Key-String `"dashboard_sessions"` bleibt unverändert —
  keine Migration nötig, keine bestehenden Logins invalidiert).
- `agent_bridge.go`: eigene `agentSessionTokenTTL`-Konstante statt
  Wiederverwendung von `sessionTTL` (hätte sonst nach der Umbenennung genau
  die Verwechslung zementiert, die dieser Sprint auflösen soll).
- Callsites angepasst: `grpc_sprint67.go`, `gateway.go`, `service/agents.go`.

**Bewusst nicht gemacht (Scope-Grenze, damit der Diff überschaubar bleibt):**
- Kein generisches `Identity{ID, CreatedAt}`-Embedding auf alle Row-Typen
  (ProjectRow, ContainerRow, ExpertRow, ...) — hätte keine Abnehmer außer
  Session und wäre eine verfrühte Abstraktion (YAGNI). Nachrüsten, sobald ein
  zweiter Row-Typ es tatsächlich braucht.
- "Agent" (4 Bedeutungen) und "Task" (2 Bedeutungen) nicht umbenannt — nur
  dokumentiert (s.o.), eigener Task-Zuschnitt falls gewünscht.
- Kein ORM-Wechsel (sqlc/GORM) — Repo bleibt bei raw SQL + manuellem `Scan()`.

**Build/Test-Status:** `go build`/`go vet` exit 0 (Container). Unit-Tests in
`gateway`/`service` skippen weiterhin an einem vorbestehenden Test-Harness-Bug
(`store.Open` in Test-Helpern ignoriert `DATABASE_URL`, verbindet zu
`localhost:5432` statt `postgres:5432`) — nicht durch diese Änderung verursacht,
gleiches Bild vor und nach dem Diff. Live-Verifikation: Backend neu gestartet,
`/health` 200, `/api/sessions` 401 (korrekt session-gated), die neue
SELECT-Query direkt per `psql` gegen die Live-DB ausgeführt — liefert korrekte
Spalten für beide vorhandenen Test-Rows zurück.

**Nicht getan:** kein authentifizierter Ende-zu-Ende-`curl` gegen
`/api/sessions` (bräuchte Dashboard-Login-Setup) — die SQL-Korrektheit ist
stattdessen direkt gegen die Live-DB verifiziert.

## Teil 2: API-Neugruppierung — gestartet (6.9.2026)

**Ziel-Package-Struktur** (in Prioritätsreihenfolge des Operators: AI →
Networking/Deploy → Security → Auth&RBAC), abgeglichen mit
`docs/reference/ARCHITECTURE-DESIGN.md` (paralleler Entwurf, gemerged):

| Package | Domäne | Status |
|---|---|---|
| `gateway/canvas` | Chains/Nodes/Edges | ✅ fertig, live verifiziert |
| `gateway/auth` | Dashboard+Gateway-Auth | ✅ fertig, live verifiziert |
| `gateway/provisioning` | Agent-Bridge/Self-Provisioning | ✅ fertig, live verifiziert |
| `network.Pool` | Tunnel-Singleton (Shared Infra, kein eigenes Domain-Package) | ✅ aus gateway rausgezogen, `internal/network` |
| `gateway/deploy` | SSH/Tunnel/Workspace (~3300 Zeilen, `executeDeploy` ~570 Zeilen) | ✅ fertig, 34 Tests grün, live verifiziert |
| `internal/ai` | AI-Proxy (Chat/Embeddings/WS), Entropy-Cascade-Routing, Quota-Probing, OR-Benchmarks/Model-Metadata, Keys-Import (~2450 Zeilen inkl. Proxy-Handler) | ✅ fertig, live verifiziert (7.9.2026) — siehe Teil 2d |
| `internal/security` | Vault/RBAC/Exposure/Firewall/Backups (~2650 Zeilen) | ✅ fertig, 20 Tests grün, live verifiziert |
| `internal/analytics` | AA-Sync/Agent-Logs/Cost/Health-Probe (~2854 Zeilen) | ✅ fertig (5233fa9, andere Session), verifiziert übernommen |
| `internal/discovery` | DSH-Import/Custom-Discovery (~1400 Zeilen) | ✅ fertig, live verifiziert |
| `internal/orchestration` | Orchestrate/Experts/Model-Enrichment/Ontology (~2400 Zeilen) | ✅ fertig, live verifiziert |
| `internal/settings` | Ops-Endpoints/Config-Export-Import/Endpoint-Info/Client-Profiles/Update-Check (~1100 Zeilen) | ✅ fertig, live verifiziert (10. und letzte Nicht-AI-Domäne) |

**Sicherheitsfix vorgezogen (gehörte eigentlich zu Teil 2, aber blockierend):**
`/v1/*`-Auth war per Default AUS (nur `gateway_auth_enabled=true` schaltete
sie ein) — Widerspruch zu `PRODUCT-ROADMAP.md` §1 ("No-Auth ist ein
ausdrücklicher Modus, nicht ein Default"). `bootstrapGatewayAuth`
(`auth.go`) dreht das jetzt sicher um: beim ersten Start ohne explizite
Einstellung wird Auth aktiviert, ein API-Key automatisch generiert + laut
geloggt, falls noch keiner existiert — kein Aussperren laufender Deploys.
Live verifiziert: `/v1/chat/completions` ohne Key 401 (vorher offen),
`/v1/models` bleibt offen wie vorgesehen.

**Canvas-Extraktion (`gateway/canvas`, `gateway/meshedge`, `internal/httpx`):**
Vollständig, `chain_graph.go` gelöscht, Handler-Empfänger von `*Server` auf
`*canvas.Handlers` umgestellt. Dabei echte Verflechtung gefunden und
sauber aufgelöst: `meshEdge`-Typ + Load/Save wurden vom Canvas-Handler UND
vom Legacy-`/api/fallback/edges`-Handler (bleibt vorerst in `gateway.go`)
geteilt — jetzt in `internal/gateway/meshedge` ausgelagert, statt Duplikat
oder Import-Zyklus. `internal/httpx` (WriteJSON/ErrorJSON/SendSSE) als
gemeinsame, zustandslose Basis für alle künftigen Domain-Packages
extrahiert. Live verifiziert: `/api/chains/{id}/graph` → 401 (Route
existiert, nicht 404).

**Wichtiger Fund — `ai`-Domäne ist NICHT wie Canvas:** Die eigentlichen
Proxy-Handler (`handleChatCompletionsProxy`, `handleEmbeddingsProxy`, je
~400+ Zeilen) liegen direkt in `gateway.go`, nicht in einer der
Hilfsdateien (`entropy_routing.go` etc. — das sind nur ~2000 Zeilen
Unterstützungslogik, die die echten Handler aufrufen). Das ist der
zentrale, geschäftskritische Proxy-Pfad des ganzen Produkts — Extraktion
verdient eine eigene fokussierte Session mit vollem Kontext, nicht eine
Fortsetzung am Ende einer bereits sehr langen Session. Bewusst hier
gestoppt statt überstürzt weitergemacht.

**Nebenbei gefixt — `scripts/backend-entry.sh` (Root Cause, nicht nur
Symptom):** Der wiederkehrende Boot-Hänger (mehrfach diese Session
beobachtet, 5-10+ Min. bei "Reading package lists...") lag NICHT nur an
Mirror-Flakiness, sondern daran, dass `docker.io` installiert wurde — ein
~60-Pakete-Metapackage mit vollem Daemon-Stack (containerd, systemd, dbus,
nftables, apparmor), obwohl der Container nur die `docker`-CLI gegen den
gemounteten Host-Socket braucht. `docker-cli` allein (nur `libc6` als
Abhängigkeit, ~20 MB) installiert in Sekunden statt Minuten. Zusätzlich:
`DEBIAN_FRONTEND=noninteractive` (Debconf-Prompt-Hang-Risiko) und
Lock-Cleanup zwischen Retries (ein von `timeout` gekillter `apt-get`
hinterlässt dpkg-Locks, die jeden weiteren Retry sofort scheitern lassen).

## Architektur-Design-Doc (parallele Session, gemerged)

`docs/reference/ARCHITECTURE-DESIGN.md` — unabhängiger Entwurf einer
anderen Session, bestätigt die Canvas/Meshedge/Httpx-Aufteilung, schlägt
zusätzlich ein `Handler`-Interface mit `Routes() []Route`
(Pattern+Group+Desc+AuthLevel) vor — sinnvolle Erweiterung ggü. dem
einfachen `Register(mux)`-Muster, da es API-Doku-Generierung direkt
mitliefert. Zwei Korrekturen eingetragen (Tabellenname `sessions` bleibt,
kein Rename zu `agent_sessions`; `vault_tokens.agent_id`-FK auf Sessions
wäre inkorrekt, da das Feld überladen ist) — siehe Doku-Abschnitt 7 für
Details.

## Teil 2b: `auth`-Domäne extrahiert (6.9.2026)

`internal/gateway/auth` — Dashboard-Login/Setup/Sessions + `/v1/*`-Gateway-
Key-Gate. Sauberer Schnitt als Canvas: nur `gateway.go` rief in `auth.go`
hinein (per grep vorab verifiziert), keine Geschwister-Datei war direkt
gekoppelt — keine zusätzliche Shared-Helper-Extraktion nötig über
`httpx` hinaus (schon von Canvas da). Exportiert für den
Package-übergreifenden Zugriff: `Middleware`, `ResolveSessionID`,
`ResolvePolicy`/`Policy`, `BootstrapDashboardAuth`, `BootstrapGatewayAuth`.

`policy_test.go` baut seinen `*Server`-Fixture direkt (nicht über
`gateway.New()`) — musste `auth.New(...)` explizit mitbekommen, sonst Nil-
Pointer. Live verifiziert: `/api/auth/status` weiterhin offen + echtes
JSON, `/api/chains/*`/`/v1/chat/completions`/`/api/sessions` unverändert
401 — die Middleware-Verschiebung hat keine Auth-Entscheidung geändert.

## Teil 2c: `discovery`, `orchestration`, `settings` extrahiert (6.–7.9.2026)

Alle drei nach demselben etablierten Muster (git mv → sed-Transform →
Composition-File → gateway.go-Wiring → Build/Vet/Fmt/Test/Restart/Curl →
Commit). Keine neuen strukturellen Überraschungen — die einzige
wiederkehrende Reibung war das schon bekannte "Known-Debt"-Muster
(kleine Provider-URL/Quota-Schema-Hilfstabellen, die eigentlich zur noch
nicht extrahierten `ai`-Domäne gehören):

- `fallbackBaseURLForPlatform`/`providerChatURL` — jetzt dupliziert in
  `analytics`, `discovery` UND `settings` (3× dieselbe ~40-Zeilen-Tabelle).
- `ProviderQuotaSchema`/`providerSchemas`/`providerQuotaSchemaFor` +
  `mUsageEndpoint`-Konstanten — dupliziert in `settings/endpoints_info.go`
  (Original bleibt vorerst in `gateway/quota_probe.go`, wird erst mit
  der `ai`-Extraktion verschoben).

Jede Duplikat-Stelle trägt einen Kommentar mit Verweis auf diesen Sprint.
**Aufräumen erst NACH der `ai`-Extraktion** — dann bekommen alle vier
Duplikate einen gemeinsamen Ort (voraussichtlich `internal/providerinfo`),
statt jetzt eine Abstraktion für ein Package zu bauen, das noch nicht
existiert.

`orchestration.go` hatte eine mit `httpx.SendSSE` bytegleiche eigene
`sendSSE`-Methode — gelöscht statt verschoben (Diff-Vergleich vorher
bestätigt Identität). `endpoints_info.go` rief `s.aaSetting(...)` auf
(jetzt in `analytics`, unexported) — ersetzt durch den direkten Store-Call
`h.svc.Store.GetSetting(...)`.

**Test-Befund (kein Regressionsfund):** `gateway/provider_schema_test.go`
(`TestProviderQuotaSchemaMatrix`) erwartet für `nvidia` andere Werte
(`chat-header-harvest`/`headersOn=chat`/`ownBench=false`) als der aktuelle
`gateway/quota_probe.go`-Source liefert (`nim-health,models-health`/
`headersOn=none`/`ownBench=true`) — Test und Source widersprechen sich
bereits vor dieser Änderung (beide Dateien von mir nicht angefasst,
`git status` bestätigt). Vorbestehender Bug, nicht durch die
`settings`-Extraktion verursacht; gehört in die `ai`-Extraktion mit
untersucht.

Live verifiziert: `/api/deployment-info`, `/api/keys/endpoints`,
`/api/client-profiles`, `/api/update/status`, `/api/free-tier`,
`/api/media`, `/api/export`, `/api/settings/url-tokens` → alle 401
(Route existiert, korrekt auth-gated, nicht 404).

**Damit sind 9 von 10 Domänen extrahiert — nur `ai` bleibt in `gateway`.**

## Teil 2d: `ai`-Domäne extrahiert — letzte Domäne, Sprint 21 abgeschlossen (7.9.2026)

**Umfang war größer als in `handoff_claude.md` geschätzt.** Der ursprüngliche
Zuschnitt (`entropy_routing.go`, `entropy_cascade.go`, `mesh_models.go`,
`provider_urls.go`, `quota_probe.go`, `quota_handlers.go`, `model_perf.go`,
`keys_import.go` + `handleChatCompletionsProxy`/`handleEmbeddingsProxy`)
hatte die WebSocket-Variante der Proxy (`handleChatCompletionsWS`) und ihre
beiden kleinen Hard-Dependencies (`resolveChainForRequest`, `getHTTPClient`)
nicht mitgezählt — per Grep vorab verifiziert: alle drei werden
ausschließlich von den drei Proxy-Handlern selbst gerufen, gehören also
zwingend zur selben Domäne. `stream_parser.go` (`StreamCostEvaluator`)
zog mit, weil es klar demselben Zweck dient (SSE-Cost-Parsing), auch wenn
es (Fund, s.u.) aktuell nirgends aufgerufen wird.

**Bewusst NICHT mitextrahiert** (per Grep verifiziert: keine Hard-
Dependency der drei Proxy-Handler dorthin): `handleKeys`+Bulk-Varianten,
`handleListModelsOAI`/`handleListModelsAdmin`/`handleApiModelsId`,
`discoverAndRegisterModels`/`linkModelToChain`, `handleRegenerateApiKey`,
`handleChains`/`handleRoute`/`handleGetScores`/`handleProviders`,
`handleFallback*`/`handlePremium*`/`handleHealthCheck*`/
`handleDiscoverySync`/`handleDiscoveryStatus`/`handleApiHealth` — alle
bleiben vorerst in `gateway.go` (mehrere weitere, hier nicht angefasste
Domänen: Provider-Key-CRUD, Modell-Listing, Fallback-Analytics,
Health-Monitoring — eigener Zuschnitt falls gewünscht, nicht Teil dieses
Auftrags). `serverlog.go` bleibt ebenfalls in `gateway` — spiegelt ALLE
Gateway-Logs (nicht nur AI-Traffic) in den Redis-Log-Stream, ist
Compositions-Root-Infra, keine Domänenlogik.

**Zwei echte Cross-Calls von `gateway.go` in die neue Domäne** (anders als
bei allen bisherigen Extraktionen, wo Cross-Deps nur in die andere
Richtung liefen): `handleKeys` (bleibt in `gateway.go`) verifiziert einen
frisch angelegten Key sofort per `s.ai.ProbeKeyWithSchema(kr)`;
`discoverAndRegisterModels`/`linkModelToChain` (bleiben ebenfalls) brauchen
den mTLS-fähigen HTTP-Client — jetzt `ai.GetHTTPClient()` (paketweite
Funktion statt Methode, da die Original-Implementierung nie auf den
Receiver zugriff). `ai.New()` bekommt zusätzlich `auth *auth.Handlers`
(für `ResolveSessionID`/`ResolvePolicy` im Proxy-Pfad) und `addr string`
(für den Entropy-Cascade-Phase-1-Rückruf auf den eigenen Prozess).

**Vier Funde, alles vorbestehend, nicht durch diese Extraktion verursacht**
(Mandat 1, Retrospective Honesty — dokumentiert statt stillschweigend
übergangen oder nebenbei mitgefixt):
1. `runQuotaProber`/`probeAllKeys` (in `quota_probe.go`) sind toter Code —
   die tatsächlich laufende Probe-Schleife ist
   `analytics.RunQuotaProber()`/`runProbesAll()` (eigene, unabhängige
   Implementierung, seit der `analytics`-Extraktion verdrahtet). Nur
   `ProbeKeyWithSchema` selbst ist noch lebendig (direkt aus `handleKeys`
   und dem Custom-Probe-Handler gerufen).
2. Als Folge davon sind `fetchOpenRouterBenchmarks`/
   `fetchOpenRouterModelMetadata` ebenfalls tot — `handleORBenchmarks`
   liest nur eine gecachte Setting, die niemand mehr befüllt.
   `/api/or/benchmarks` liefert daher aktuell immer `{}`.
3. `handleQuota`/`handleQuotaHeadroom`/`activeChain` (in
   `quota_handlers.go`) sind auf keiner Route registriert — toter Code.
4. `StreamCostEvaluator` (`stream_parser.go`) wird nirgends aufgerufen —
   die tatsächliche Stream-Cost-Auswertung läuft inline über
   `streamUsageReader`/`flushWriter` in `handleChatCompletionsProxy`.

**Ein Fund korrigiert (kleine, gut belegte Testkorrektur, kein
Verhaltenswechsel):** `provider_schema_test.go`s `TestProviderQuotaSchemaMatrix`
erwartete für `nvidia` `chat-header-harvest`/`headersOn=chat`/
`ownBench=false` — widersprach dem `quota_probe.go`-Source
(`nim-health,models-health`/`headersOn=none`/`ownBench=true`), dessen
Kommentar explizit eine spätere Live-Verifikation gegen die echte NVIDIA-
API dokumentiert. Test war seit dieser Verifikation nie nachgezogen
worden — jetzt korrigiert, Test grün.

**Build/Test/Live-Status:** `go build`/`go vet` exit 0, `gofmt` clean.
`make go-test`: `internal/gateway` jetzt komplett grün (keine Handler mehr
darin, die eine DB brauchen), `internal/ai`s
`TestProviderQuotaSchemaMatrix`/`TestUnknownProviderGetsGenericChain` grün,
nur `TestNewProviderProbeFlow` skip/fail am bekannten vorbestehenden
`localhost:5432`-Test-Harness-Bug (unverändert seit allen vorherigen
Extraktionen). Live: `make restart-backend` → `/health` 200, `/v1/models`
200 (bewusst offen), `/v1/mesh/models`+`/v1/chat/completions`+
`/v1/embeddings`+`/api/or/benchmarks`+alle Keys-Import-Routen 401 ohne
Auth. Mit dem generierten Gateway-Key: `/v1/mesh/models` liefert echte
Chain-Daten zurück; ein echter `/v1/chat/completions`-Call durchläuft
Auth → `resolveChainForRequest` → Routing-Entscheidung und scheitert
ehrlich mit "no enabled models or healthy keys available" (keine Keys in
dieser Dev-Umgebung konfiguriert) statt zu crashen — Proxy-Pfad Ende-zu-
Ende lebendig verifiziert, im Log sichtbar (`[proxy] ✗ chat routing
failed for chain="default"`).

**Damit ist Sprint 21 Teil 2 (API-Neugruppierung) abgeschlossen: alle 10
Domänen aus dem ursprünglichen `internal/gateway`-Monolithen (45 Dateien,
178 Routen) sind jetzt flache Geschwister-Packages. `internal/gateway`
ist die dünne Kompositionswurzel geblieben (aktuell noch mit einigen
weiteren, hier bewusst nicht angefassten Bereichen — Provider-Key-CRUD,
Modell-Listing, Fallback-Analytics, Health-Monitoring, Chains/Route/
Scores — die ein eigener, künftiger Zuschnitt wären, falls gewünscht).**

## Teil 2e: Known-Debt-Duplikate konsolidiert — `internal/providerinfo` (7.9.2026)

Neues Package `internal/providerinfo`: einzige Quelle für
`ProviderChatURL`/`FallbackBaseURLForPlatform`/`ProviderEmbeddingsURL`
sowie `ProviderQuotaSchema`/`ProviderQuotaSchemaFor` + die
`Method*`-Konstanten (`MethodUsageEndpoint` usw., jetzt exportiert, da
`internal/ai`s `schemaFor`/`runProbeMethod` sie ebenfalls braucht — auch
`internal/ai` importiert jetzt `providerinfo` statt eigener Kopien).
`internal/analytics`, `internal/discovery` und `internal/settings` wurden
umgestellt: ihre jeweiligen Duplikate (aus den vorherigen Extraktionen)
gelöscht, Call-Sites auf `providerinfo.X` umgestellt, Import ergänzt.
`providerEmbeddingsURL`/`schemaFor` blieben bewusst in `internal/ai` —
nirgends dupliziert, nur von der Probe/Proxy-Logik selbst gebraucht, eine
Verschiebung hätte nur Indirektion ohne Entduplizierung gebracht.

**Nebenbefund, positiv:** `analytics`s Kopie von `fallbackBaseURLForPlatform`
war unbemerkt zu einer vereinfachten Variante verkümmert (nur der
Hostname-mit-Punkt-Zweig, der `providerChatURL`-Fallback-Zweig fehlte) —
mit dem Umstieg auf die kanonische `providerinfo`-Version bekommt
`/api/analytics/by-platform`s `endpoint`-Feld jetzt auch für Plattformen
ohne Punkt im Namen (z. B. "openai") einen Wert statt eines leeren Strings.

Build/vet/gofmt clean (inkl. Nebenaufräumen: `internal/analytics`s übrige
4 Dateien waren seit der ursprünglichen Analytics-Extraktion nicht
gofmt-clean — mit erledigt, reine Formatierung, kein Verhaltenswechsel).
`make go-test` unverändert (gleiche vorbestehende Skips wie in Teil 2d).
Live: `make restart-backend` sauber, `/v1/mesh/models` weiterhin echte
Daten, `/api/keys/endpoints` (settings), `/api/analytics/by-platform`
(analytics), `/api/dsh/settings` (discovery) alle 401 (Route existiert,
gated) — kein Boot-Panic durch die neuen Cross-Package-Imports.

## Teil 2f: Die 4 Dead-Code-Funde aus Teil 2d geklärt (7.9.2026, Operator-Entscheidung)

**Korrektur zu Teil 2d:** Dort stand, `runQuotaProber`/`probeAllKeys` seien
"tot, ersetzt durch `analytics.RunQuotaProber`". Das stimmt nur zur
Hälfte und ist irreführend formuliert — genauer geprüft (Operator-Wunsch
"erst genauer prüfen"):

- `analytics.RunQuotaProber()`/`runProbesAll()` ist ein **Health/Uptime-
  Monitor** (`probePlatform` → Uptime-Historie für `/api/health/providers`)
  — inhaltlich etwas ANDERES als `ai.probeAllKeys()`, keine echte
  Ersetzung.
- `ai.probeAllKeys()` machte pro Sweep (alle 5 Min.) drei Dinge: (1)
  Key-Verifikation per `ProbeKeyWithSchema` (bleibt live, wird direkt aus
  `handleKeys`/`handleKeysCustomProbe` gerufen — unbetroffen), (2)
  **periodische Modell-Discovery pro Plattform mit aktivem Key**
  (`providerModelList`) — die einzige Stelle im ganzen Repo, die neue
  Modelle einer bereits konfigurierten Plattform automatisch nachzieht
  (der einmalige `discoverAndRegisterModels`-Trigger beim Key-Anlegen
  deckt das nicht ab), (3) OR-Benchmarks/Metadata-Anreicherung.
- Per `git log -S` verifiziert: Commit `5233fa9` (Analytics-Extraktion,
  andere Session) hat `go s.runQuotaProber()` durch
  `go s.analytics.RunQuotaProber()` ersetzt, ohne zu bemerken, dass das
  eine andere Funktion mit anderem Zweck ist. Damit ist Punkt (2) seit
  diesem Commit eine **echte, stille Regression** — keine bewusste
  Ablösung.

**Operator-Entscheidungen (3 Fragen gestellt, hier die Antworten):**

1. **Modell-Discovery-Sweep:** "Erst genauer prüfen" — Root Cause jetzt
   dokumentiert (s. o.), noch NICHT wieder verdrahtet. Siehe
   `docs/backlog/BACKLOG.md` Epic 4 für den offenen Task.
2. **OR-Benchmarks/Model-Metadata:** NICHT löschen. Operator-Einwand
   (wörtlich sinngemäß): das Backend soll die Analytics-Quelle sein, nicht
   das Frontend direkt bei OpenRouter — das Backend hat mehr Quellen/Daten
   als das Frontend. `ModelDetailPage.tsx` fragt aktuell OpenRouter direkt
   im Browser ab (Sprint-21-Fund, s. Teil 2d) — das ist laut Operator die
   eigentliche Fehlstelle, nicht das Backend-Feature. Bleibt unverändert
   im Code liegen; Konsolidierung (Sweep verdrahten + Frontend auf
   Backend-Endpoint umstellen) als eigener Task in Epic 4 der Backlog.
3. **`handleQuota`/`handleQuotaHeadroom`/`activeChain`/
   `StreamCostEvaluator`:** nicht löschen, "vielleicht brauchen wir es
   noch" — stattdessen mit `legacy`-Präfix umbenannt
   (`legacyHandleQuota`, `legacyHandleQuotaHeadroom`, `legacyActiveChain`,
   `LegacySSEUsageChunk`, `LegacyStreamCostEvaluator`) und mit Fund-Kommentar
   versehen, damit der unregistrierte/ungenutzte Zustand nicht mehr
   stillschweigend unklar bleibt.

Build/vet/gofmt clean nach den Umbenennungen; keine Call-Sites betroffen
(alle vier bestätigt ohne Aufrufer im ganzen Repo).

## Nächste Schritte (offen)

1. Route-Registry-Pattern (`Handler.Routes() []Route`) aus dem
   Architektur-Doc übernehmen, auch rückwirkend für alle bisherigen
   Domänen — noch nicht gemacht, alle nutzen bisher nur `Register(mux)`.
2. Docs-Phase (`docs/api/`, `docs/user/`, README-Überarbeitung) — jetzt
   sinnvoll, da die Domänen-Aufteilung abgeschlossen ist.
