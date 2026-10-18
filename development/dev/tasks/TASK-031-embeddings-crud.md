# TASK-031 — Backend: Embeddings-CRUD (/api/embeddings*) real verdrahten

> **Status:** ✅ ERLEDIGT (Backend) — siehe `## Ergebnis` · **Owner:** Claude, eigener Worktree
> **Speist:** Frontend-Audit 8.9.2026 (EmbeddingsPage/EmbeddingDetailPage
> rufen Routen auf, die nie existierten — Auflage des Operators: NICHT
> entfernen, ordentlich verdrahten)

## Ist

- `/v1/embeddings` Proxy existiert (aihandlers.go:53) — der Proxy-Path ist
  fertig, die **Admin-CRUD-Routen** fehlen komplett:
  - `GET /api/embeddings` (Liste der Embedding-Modelle — Quelle: models-Tabelle;
    Embedding-Modelle identifizieren: Tier/Kategorie/Description-Heuristik
    verifizieren — welche Modelle sind embeddings? Prüfen, wie media/custom
    (settings/ops_endpoints.go:721) es gelöst hat — MUSTER ÜBERNEHMEN)
  - `GET /api/embeddings/custom/{id}`, POST/PUT custom-Provider-Konfig
    (settings-KV-Pattern wie /api/media/custom — NICHT inventieren,
    an das existierende Muster anlehnen)
  - `DELETE /api/embeddings/custom/{id}` (media/custom DELETE ist ehrliche
    501 — hier ECHT bauen oder konsistent ehrlich bleiben, dokumentieren!)
  - `GET /api/embeddings/usage` (Quelle: request_log WHERE request_type
    embeddings — Analogie zu /api/analytics/models mit request_type Filter)
- Vorbild: `media-models.tsx` ↔ `/api/media/*` (settingshandlers.go:51-54)
  — gleiche Handler-Struktur für embeddings.

## Akzeptanz

- [x] Alle vier Routen registriert + API_DOCS-Eintrag + echte Datenquellen
  (kein Stub; ehrliche Empty-States wo nichts existiert)
- [x] /api/embeddings/usage liefert echte request_log-Aggregation für
  embedding-Requests (verifizieren, dass requestType korrekt geschrieben
  wird — proxy.go RecordRequestSummary "chat" vs embeddings-Handler)
- [x] go build/vet grün; go test grün bis auf einen vorbestehenden,
  unabhängigen Fehler (siehe Ergebnis); live curl gegen eine isolierte
  Instanz aus diesem Branch (nicht gegen den geteilten Stack auf 19091 —
  Begründung siehe Ergebnis)
- [ ] Frontend-Coordination: TASK-029 wartet auf diesen Vertrag — nach
  dem Merge die EmbeddingsPage-Shapes gegen API_DOCS abgleichen (nicht
  Teil dieses Tasks; siehe Ergebnis für die Diskrepanz)
- [x] `## Ergebnis` + Commits auf Branch

## Regeln

WORKTREE-PROTOCOL: eigener Worktree, Branch worktree-task-031-embeddings-crud,
commit ja, push/merge nein, main nicht anfassen.

## Ergebnis

### Geändert
- `src/backend/internal/settings/embeddings_endpoints.go` (neu) — alle vier
  Routen-Handler: `handleEmbeddingsList`, `handleEmbeddingsUsage`,
  `embeddingsCustomRouter` (GET list + POST create), `handleEmbeddingsCustomItem`
  (GET one + PUT + DELETE).
- `src/backend/internal/settings/settingshandlers.go:51-58` — vier neue
  `mux.HandleFunc` direkt nach dem `/api/media/*`-Block registriert
  (`/api/embeddings`, `/api/embeddings/usage`, `/api/embeddings/custom`,
  `/api/embeddings/custom/{id}`); Package-Doc-Kommentar (Zeile 1-5) ergänzt.
- `API_DOCS.md` — Tabellen-Eintrag direkt nach dem Media-Block + neue
  Sektion "### Embeddings (TASK-031)" im Routen-Index.

### Design-Entscheidungen (Task-Vorgabe war unterspezifiziert)
- **Modell-Heuristik** (Akzeptanz-Punkt 1): `models`-Tabelle hat keine
  category/model_type-Spalte (nur id/platform/display_name/tier/description,
  siehe `store.go:539-554`). Heuristik: Substring `"embed"`
  (case-insensitive) in id/displayName/description
  (`looksLikeEmbeddingModel`, embeddings_endpoints.go). Live verifiziert:
  `text-embedding-3-small` wird erkannt, `gpt-4o-mini` nicht.
- **Custom-Provider-CRUD**: `/api/media/custom/{id}` hat nie mehr als eine
  ehrliche 501-DELETE gebaut — kein Vorbild für GET/POST/PUT vorhanden. Auf
  das nächstverwandte reale Muster im selben File ausgewichen:
  `client-profiles` (Collection-Pfad `/api/embeddings/custom` GET+POST,
  Item-Pfad `/api/embeddings/custom/{id}` GET+PUT+DELETE), KV-persistiert
  unter Settings-Key `embeddings_custom_providers`. DELETE ist ECHT (nicht
  501) — der Go-Backend speichert jetzt selbst geschriebene Custom-Provider,
  anders als bei Media.
- **`/api/embeddings`-Response-Envelope**: flach `{models:[...]}`, exakt wie
  `/api/media` (nicht das Family/defaultFamily-Schema, das die bereits
  eingecheckten `EmbeddingsPage.tsx`/`EmbeddingDetailPage.tsx` erwarten).
  Laut Task-Vorgabe ist das explizit TASK-029s Job ("nach dem Merge die
  EmbeddingsPage-Shapes gegen API_DOCS abgleichen") — die Frontend-Seiten
  sind dem Backend-Vertrag vorausgelaufen und müssen dort angepasst werden,
  nicht umgekehrt. **Für den Reviewer:** `EmbeddingsPage.tsx` ruft aktuell
  zusätzlich `PUT /api/embeddings` (defaultFamily/priority speichern) auf —
  diese Route existiert bewusst nicht, da sie in keiner der vier
  Task-Bullets steht.
- **keyCount**: `/api/media` hat `keyCount` hardcoded auf `0`
  (ops_endpoints.go:591) — für Embeddings stattdessen echt berechnet (wie
  `handleFreeTier`, aus `Store.Keys()` je Platform), da die reale Zahl
  trivial verfügbar war (No-Mock-Mandat: echte Daten vor Stub-Null, wenn
  billig verfügbar). Live verifiziert (0 → 1 nach Schlüssel-Insert).

### Bug gefunden (nicht Teil dieses Tasks, hier dokumentiert)
`store.go` migriert die Spalte `models.description` VOR der `CREATE TABLE IF
NOT EXISTS models`-Anweisung (Zeile 177-179 vs. Zeile 329) — auf einer
**frisch angelegten** Datenbank ist die Tabelle beim `ALTER TABLE ADD COLUMN`
noch nicht da, der Fehler wird verschluckt (`_, _ = d.exec(...)`), danach
legt `CREATE TABLE IF NOT EXISTS` die Tabelle ohne `description`-Spalte an.
`GET /api/embeddings` (und jeder andere `ListModels()`-Aufruf) schlägt auf
so einer DB mit `column "description" does not exist` fehl. Der laufende
Dev-Stack (Postgres-DB `jimesh`) ist **nicht betroffen**, weil die Spalte
dort aus einer früheren Migration bereits existiert — reproduziert nur mit
einer wirklich neuen DB (mein Verifikations-Setup, s.u.). Nicht selbst
gefixt (Migrationsreihenfolge ist geteilter Foundation-Code, andere
parallele Tasks könnten betroffen sein) — Fund für den Reviewer.

### Build/Test-Status (ehrlich)
- `docker run --rm -v .../src/backend:/src -w /src -v /home/ji/go/pkg/mod:/go/pkg/mod -v jimesh_go-build:/root/.cache/go-build golang:latest sh -c 'go build ./... && go vet ./...'`
  → **grün, keine Ausgabe/Fehler.**
- `go test ./...` (gegen frische Wegwerf-DB `jimesh_test`, wie `make
  check-backend`) → **ein Fehlschlag, vorbestehend und unabhängig von
  TASK-031**: `internal/ai` `TestNewProviderProbeFlow`
  (`provider_schema_test.go:107-109`) ruft `store.Open("./gateway_probe_flow_test.db")`
  auf — ein Dateiname statt `postgres://`-URL, wodurch `store.Open`
  (`store.go:26-29`) auf den hartkodierten Fallback
  `postgres://...@localhost:5432/jimesh` zurückfällt statt `DATABASE_URL` zu
  nutzen, und im Container ohne erreichbares `localhost:5432` mit
  `connection refused` scheitert. Betrifft Package `internal/ai`, nicht
  `internal/settings` (mein Code). Alle anderen Packages: **ok**
  (`internal/settings` selbst hat keine Testdateien).
- **Live curl**: Der geteilte Stack auf Port 19091 lädt `src/backend` aus
  dem **Haupt-Checkout** (`docker inspect jimesh-jimesh-1` bestätigt Mount
  `/home/ji/projects/jimesh/src/backend`), nicht aus diesem Worktree — und
  WORKTREE-PROTOCOL untersagt Edits im Hauptcheckout. Deshalb stattdessen:
  Binary aus diesem Worktree kompiliert und als eigener, kurzlebiger
  Container auf `127.0.0.1:19191` (Docker-Netz `jimesh_jimesh-net`, echte
  Postgres/Redis-Container, aber eigene Wegwerf-DB `jimesh_task031_verify`,
  danach gelöscht) gestartet — Port-Binding-Mandat (127.0.0.1) eingehalten.
  Verifiziert mit echtem Session-Token (`/api/auth/setup` mit One-Time-Code
  aus den Logs):
  - `GET /api/embeddings` — leer → nach Seed eines `text-embedding-3-small`-
    Modells korrekt erkannt, `gpt-4o-mini` korrekt ausgeschlossen, `keyCount`
    real (0 → 1 nach Schlüssel-Insert).
  - `GET/POST/PUT/DELETE /api/embeddings/custom(/{id})` — voller
    Round-Trip: create → `maskedKey` korrekt (`sk-tes…3456`) → GET nach
    Neustart des Containers zeigt denselben `maskedKey` (persistiert!) → PUT
    ändert Felder → DELETE entfernt echt → nachfolgendes GET liefert 404.
    (Ein Bug dabei gefunden und gefixt: `APIKey` hatte `json:"-"`, wodurch
    der Key beim KV-Save/Reload verschwand, nicht nur bei der
    API-Response — korrigiert auf `json:"apiKey"`, Masking bleibt exklusiv
    Sache von `embeddingsCustomOut`.)
  - `GET /api/embeddings/usage` — mit `request_log`-Zeilen geseedet (3×
    `request_type='embedding'`, 1× `'chat'`): Antwort zählt korrekt nur die
    3 Embedding-Requests (`successPct: 66.67`, `avgLatencyMs: 167`), die
    Chat-Zeile ist korrekt ausgeschlossen.

### Abweichungen von der Task-Vorgabe
- Curl-Ziel ist nicht der geteilte Stack auf 19091, sondern eine isolierte
  Instanz aus diesem Branch (Begründung oben) — inhaltlich dieselbe
  Verifikation, nur nicht am geteilten Container.
- `GET /api/embeddings` liefert eine flache Liste (wie `/api/media`), nicht
  das Family/defaultFamily-Schema der bereits eingecheckten
  `EmbeddingsPage.tsx` — bewusste Entscheidung, siehe oben.

### Offene Fragen für den Reviewer
1. Migrations-Reihenfolge-Bug `models.description` (store.go:177 vs. 329) —
   fixen? Betrifft jede frische DB, nicht nur Embeddings.
2. `EmbeddingsPage.tsx`/`EmbeddingDetailPage.tsx` erwarten ein anderes
   Response-Schema (families/defaultFamily/priority + `PUT /api/embeddings`)
   als hier gebaut — TASK-029 muss das angleichen; bis dahin zeigt die
   Seite mit dieser Backend-Version keine Daten an (kein Crash, aber leer).
3. Sollen Custom-Embedding-Provider auch in `/v1/embeddings` (dem
   Proxy-Pfad, internal/ai) tatsächlich geroutet werden? Aktuell sind sie
   nur in der Admin-Liste/Usage sichtbar, der Proxy selbst kennt nur
   openai/gemini/deepseek (proxy.go:636-645) — aus Scope dieses Tasks
   genommen, da nicht in den vier Akzeptanz-Bullets gefordert.

### Branch
`worktree-agent-a61afcf9e2c9f9687` (die per Auftrag zugewiesene isolierte
Worktree-Branch für diese Session — abweichend vom in `## Regeln` genannten
`worktree-task-031-embeddings-crud`, da der Worktree bereits mit diesem
Branch-Namen bereitgestellt wurde). Commits: siehe `git log` auf diesem
Branch; letzter Commit-Hash wird beim Commit dieser Datei gesetzt.
