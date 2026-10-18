# TASK-103 — Plugin-System Grundlage + Jules-Integration (erstes Plugin)

**Quelle:** Operator 16.9. — „lass uns mal ne google jules app integration schreiben,
lass uns das als task für jules planen das er erstmal plugins gestaltet und schemas
und oop dafür was gesonderte plugins sind die eine wrapper api integration haben.
das geht über api key wo wir das direkt ansteuern können oder über git apps und
einfach comments in prs oder wenn man jules tagged, aber dazu muss jules mit einer
repo verknüpft sein, das muss man im plugins tab dann auch festlegen. [...] auf
project ebene [...] workspaces können übergeordnet dann wieder child plugins haben
[...] onboarding [...] nicht noch mal machen, dafür auch nen state [...] das selbe
secrets verfahren wie bei gh tokens [...] tags oder metadaten aus vault [...] der
user die auch erstellen kann und apps oder workspaces zuweisen kann [...] direkt
filtern kann im dropdown für bestehende jules api keys."

**Priorität:** P1/P2 — Schema-Arbeit (WP1) kann sofort starten; die Vault-Tag-Filterung
hängt an TASK-099 (metadata-JSONB-Spalte). Bei Umsetzung prüfen, ob TASK-099 schon
gelandet ist, statt die Spalte doppelt zu bauen.

**Verifiziert vor Planung (16.9., Claude):**
- `JULES_API_KEY` existiert bereits in `.env` (Root) — bestätigt: direkte
  API-Key-Ansteuerung ist der naheliegende erste Auth-Modus.
- Kein „Plugin"-Konzept existiert im Code (`grep -rl "plugin\|Plugin" src/` → 0
  echte Treffer, nur Zufallstreffer in `cdc.go`/`markdown.tsx`).
- `src/frontend/src/types/domain/provider_credentials.ts` existiert, ist aber
  konzeptionell etwas anderes: Login-/Auth-Provider (github/google/keycloak/
  firebase/supabase) für User-Anmeldung, nicht Dev-Tool-Plugins mit eigener
  Wrapper-API. Nicht wiederverwenden, sondern als Vorbild für das
  Credential-Muster (Connected-Accounts-UI) nehmen.
- `src/frontend/src/types/domain/utility_deps.ts` liefert das richtige
  Vererbungs-Vorbild: `assignedFrom: 'utility_project' | 'user_created'` — genau
  dieses Muster soll die Plugin-Aktivierung für Workspace→Project übernehmen.
- Kein GitHub-App-/Webhook-Empfänger existiert (`grep -rn "webhook\|installation_id"
  src/backend/internal/` → 0 Treffer) — das ist für dieses Repo komplett neu.
- `docs/tasks/jules/TASK-099-vault-secrets-consolidation.md:70` plant bereits
  `metadata JSONB DEFAULT '{}'` mit „description, tags, rotation-policy" — die
  Tag-Grundlage für den Dropdown-Filter ist dort vorgesehen, nicht hier neu bauen.
- `docs/tasks/jules/TASK-100-workspace-settings-inheritance-unification.md:84-117`
  definiert den „Secret-Auswahl-Dialog" (3 Optionen: vererbt / bestehendes /
  neues mit PAT-Eingabe) — dieses exakte Muster für den Jules-API-Key wiederverwenden,
  nicht neu erfinden.

**Nachtrag 16.9. — reale Jules-API-Struktur (aus `docs/research/jules.md`,
Operator-Recherche), ersetzt die bisherigen Annahmen in WP1/WP2:**
- Offizielle REST-API: `https://jules.googleapis.com/v1alpha` — drei Primitives:
  **Sources** (das verknüpfte GitHub-Repo — dafür muss die *offizielle Google-
  Jules-GitHub-App* im Jules-Web-Dashboard installiert sein, das ist NICHT
  unsere eigene GitHub-App-Registrierung), **Sessions** (eine Arbeitseinheit:
  Source + Prompt, läuft asynchron in einer Cloud-VM), **Activities** (die
  einzelnen Schritte/Nachrichten innerhalb einer Session).
- Auth-Header ist `X-Goog-Api-Key: <key>` — **kein** `Authorization: Bearer`.
  Der Key wird im Jules-Dashboard erzeugt (max. 3 gleichzeitig) — das ist der
  Key, der in `SecretRef`/Vault landet.
- Workflow: `GET /v1alpha/sources` (liefert die Source-ID des Repos) →
  `POST /v1alpha/sessions` (Source-ID + Prompt) → Jules plant + arbeitet async
  → `approvePlan`-Call bestätigt den Plan → `sendMessage` schickt weitere
  Anweisungen in eine laufende Session → am Ende pusht Jules selbst einen PR.
- **Wichtige Scope-Korrektur für WP2:** das „PR-Kommentare/@jules-Tagging"
  aus der Operator-Vorgabe läuft über **Googles eigene, bereits bei Jules
  installierte GitHub App** — wenn jemand `@jules` in einem PR-Kommentar
  erwähnt, reagiert Jules dort selbstständig, OHNE dass JiMesh einen Trigger
  bauen muss. JiMesh braucht **keinen Webhook-Empfänger, der diese Mentions
  verarbeitet** — das würde Google-eigene Funktionalität duplizieren. Der
  `github_app`-Auth-Modus in JiMesh bedeutet stattdessen: *welches Repo/welche
  Source-ID ist diesem Project zugeordnet* (reine Zuordnungs-Config, kein
  Webhook nötig für den Kern-Anwendungsfall).
  - Ein Webhook-Empfänger ist NUR dann sinnvoll, falls JiMesh Jules-PR-Events
    zusätzlich in die eigene SIEM/Audit-Pipeline spiegeln will (Observability,
    passt zum K-LAF-Ethos dieses Repos) — das ist optional (WP2b, siehe unten),
    nicht der primäre Steuerweg.
- Community-Go-Client: `github.com/SamyRai/go-jules` (REST-Wrapper) — als
  Basis für `internal/plugins/jules/client.go` verwenden statt eigenen
  HTTP-Code zu schreiben.
- Jules hat bereits **eigenen, nativen Inbound-MCP-Support** (Linear, Supabase,
  Neon, Stitch, Tinybird, Context7 — konfiguriert in Jules' eigenen Settings).
  Das ist eine SEPARATE Integrationsrichtung (Jules ruft fremde MCP-Server auf)
  und für dieses Ticket nicht relevant — wir bauen keinen MCP-Server für Jules,
  wir rufen Jules' REST-API auf.

## Ziel

Ein generisches Plugin-System (Wrapper-API-Integrationsmuster für externe
Dev-Tools), erstes konkretes Plugin: **Google Jules**. Zwei Ansteuerungswege:

1. **Direkter API-Key** — JiMesh ruft die Jules-API direkt mit einem
   Vault-gespeicherten Key an.
2. **GitHub-App-Verknüpfung** — Jules ist an ein Repo gehängt, reagiert auf
   PR-Kommentare / `@jules`-Tagging. JiMesh muss wissen, welches Repo/Project
   verknüpft ist (das wird im Plugins-Tab festgelegt, nicht automatisch erraten).

## Architektur — Schema zuerst (Repo-Konvention, siehe MANDATES.md)

### WP1 — Domain-Schema (Backend Go + Frontend TS, noch KEIN Verhalten)

**Plugin-Katalog** (Platform-Ebene, ein Eintrag pro unterstütztem Tool):
```go
type Plugin struct {
    ID              string          // "jules"
    Name            string          // "Google Jules"
    WrapperAPIBase  string          // Basis-URL der Wrapper-Integration
    AuthModes       []string        // ["api_key", "github_app"]
    ConfigSchema    json.RawMessage // pluginspezifisches JSON-Schema
}
```

**Plugin-Aktivierung** (pro Scope, mit Vererbung Workspace→Project):
```go
type PluginInstallation struct {
    ID                     string
    PluginID               string
    ScopeType              string // "workspace" | "project" — genau eins gesetzt (CHECK constraint)
    ScopeID                string
    Activated              bool
    OnboardingCompletedAt  *time.Time // nil = Onboarding noch zu zeigen
    AuthMode               string     // "api_key" | "github_app"
    SecretRef              *string    // Vault-Secret-ID (bei api_key)
    GitHubAppInstallationID *string   // (bei github_app)
    Config                 json.RawMessage
    AssignedFrom            string    // "workspace" | "project" — analog utility_deps.ts
    CreatedAt, UpdatedAt    time.Time
}
```

Tabellen: `plugins` (Katalog, seed-Migration mit dem Jules-Eintrag),
`plugin_installations` (FK entweder auf `project_id` ODER `workspace_id`, CHECK
genau eins — gleiches Muster wie bei `secrets_engines`/`vault_secrets`).

**Vererbungs-Lookup:** Ein Project ohne eigene `PluginInstallation` erbt die
seines Workspace (identischer Read-Pfad wie TASK-100s Secret-Vererbungskette
Workspace→Project→App — nicht neu erfinden, denselben Lookup-Helper
wiederverwenden/erweitern, wenn TASK-100 schon gelandet ist).

**Vault-Tags** (baut auf TASK-099 auf — bei Umsetzung zuerst prüfen ob gelandet):
- `metadata.tags: string[]` je Vault-Secret, vom User frei erstellbar
- Tags sind Secrets zuweisbar UND (laut Operator-Vorgabe) Apps/Workspaces
  zuweisbar — falls TASK-099s Schema das nicht sauber abdeckt, eine eigene
  `secret_tags`-Zuordnungstabelle ergänzen (nicht in JSONB verstecken, wenn es
  eine echte n:m-Beziehung ist)
- Der Dropdown-Filter beim Auswählen eines bestehenden Jules-API-Keys filtert
  über genau diese Tags — keine hartcodierte Kategorienliste

### WP2 — Backend-Wiring

- `internal/plugins/jules/client.go` — dünner Wrapper um `github.com/SamyRai/go-jules`
  (oder direkter HTTP-Client nach demselben `v1alpha`-Vertrag, falls die
  Library nicht CGO-frei/aktuell genug ist — prüfen):
  - `api_key`-Pfad: liest `SecretRef` aus Vault, setzt `X-Goog-Api-Key`-Header,
    ruft `sources`/`sessions`/`activities` direkt an
  - `github_app`-Pfad: **kein Webhook-Empfänger für `@jules`-Mentions** (das
    übernimmt Googles eigene, bei Jules installierte GitHub App bereits) —
    dieser Modus speichert nur die Source-ID/Repo-Zuordnung des Projects
- **WP2b (optional, P2, nicht Kern-Scope):** falls gewünscht, ein schlanker
  `POST /api/plugins/jules/webhook`-Empfänger NUR zum Spiegeln von Jules-
  PR-Events in `security_events`/SIEM (Observability, K-LAF-Muster) — falls
  gebaut, **HMAC-Signaturprüfung ist Pflicht** (kein offener Endpoint, Mandat 9)
- Routes: `GET /api/plugins` (Katalog), `GET/POST/DELETE /api/plugin-installations`
  (Aktivierung je Scope, inkl. Vererbungs-Auflösung in der Response),
  `POST /api/plugin-installations/{id}/onboarding-complete`
- RBAC: Plugin-Aktivierung als eigene Capability (`plugins:write`) in
  `capabilities.rego` eintragen (TASK-070-Anschlussstelle, KEIN zweites
  Permission-System)
- API_DOCS.md + BACKLOG.md im selben Change aktualisieren (Dokumentationsmandat)

### WP3 — Frontend: Onboarding + Auswahl (reusable Components)

- **`PluginActivationCard`** (reusable): Plugin-Katalog-Eintrag, Status
  (nicht aktiviert / vom Workspace geerbt / eigene Aktivierung), Aktivieren-Button
- **`PluginSecretSelector`** (reusable, erweitert das TASK-100-Auswahl-Dialog-
  Muster 1:1): 3 Optionen —
  1. Workspace-Default verwenden (vererbt, zeigt Secret-Namen)
  2. Bestehendes Secret wählen (Dropdown MIT Tag-Filter aus WP1)
  3. Neues Secret anlegen (API-Key-Eingabe → erstellt Vault-Secret im
     richtigen Scope, wie beim PAT-Eingabefeld in TASK-100)
- **`PluginOnboardingFlow`**: einmaliger Flow — Auth-Modus wählen (API-Key vs.
  GitHub-App), bei GitHub-App: Repo-Verknüpfung festlegen. Abschluss setzt
  `onboardingCompletedAt` — bei jedem weiteren Aufruf wird der Flow
  übersprungen, direkt zur Konfiguration
- Integrationspunkte: neuer „Plugins"-Tab in den Project-Settings UND in den
  Workspace-Settings (dort als Default für Kind-Projects, analog zum
  Utility-Dependencies-Muster)
- Kleine Tag-Verwaltungs-UI (Secret-Tags erstellen/zuweisen an Apps/Workspaces)
  — ohne die hat der Dropdown-Filter aus WP1 keine Daten zum Filtern

### WP4 — Recherche-Auftrag VOR der UI-Umsetzung: iframe möglichst vermeiden

Operator-Hinweis: „das gute ist dass wir durch plugins und apps ja dann gleich
die iframes haben, aber jules soll mal gucken ob er da ne implementierung
findet ohne iframe."

Dieses Repo hat bereits zweimal gegen iframes entschieden (TASK-067: Wazuh-
Dashboard-iframe entfernt wegen Cert-Interstitial-Problem; TASK-096:
Security-Page-Integration explizit „kein iframe"). Bevor die Jules-Plugin-UI
gebaut wird:

- Recherchieren, ob Jules eine direkt ansteuerbare API bietet (Task-Status,
  Ergebnisse, Kommentar-Threads), die sich in einer JiMesh-eigenen React-
  Komponente rendern lässt, statt die komplette Jules-Web-UI in ein iframe zu
  packen
- Nur falls Jules **keine** API-Alternative zur eigenen Oberfläche anbietet:
  iframe als expliziter, im Code kommentierter Fallback — mit Begründung,
  nicht stillschweigend

## Reihenfolge

1. WP1 (Schemas) — blockiert WP2 und WP3
2. WP2 (Backend) parallel zu WP4 (Recherche)
3. WP3 (Frontend) erst nach WP2 UND WP4-Ergebnis (die Recherche entscheidet,
   ob die Aktivierungs-UI eine eigene Ansicht oder ein iframe-Panel rendert)

## Abnahmekriterien (No-Mock — MANDATES.md)

- [ ] Plugin-Aktivierung ist echt in Postgres persistiert (kein localStorage-Fake)
- [ ] Vererbung Workspace→Project live-curl-verifiziert (Kind-Project ohne
      eigene Installation zeigt die geerbte)
- [ ] `api_key`-Pfad ruft die echte Jules-API an (`X-Goog-Api-Key`-Header,
      `sources`/`sessions`/`activities`) — kein Mock-Response
- [ ] Falls WP2b (Webhook) gebaut wird: echte HMAC-Signaturprüfung, unsignierte
      Requests → 401
- [ ] Onboarding-Flow erscheint nachweislich nur beim ersten Aufruf (zweiter
      Aufruf überspringt ihn — `onboardingCompletedAt` wirklich gesetzt)
- [ ] Tag-Filter im Secret-Dropdown zeigt echte, user-erstellte Tags (keine
      hartcodierte Liste)
- [ ] API_DOCS.md + BACKLOG.md aktualisiert

## Offene Operator-Fragen (vor Umsetzung klären oder als TODO dokumentieren)

- Soll der Plugin-Katalog bewusst generisch für weitere Tools vorbereitet
  werden, oder ist v1 explizit Jules-only (Katalog-Tabelle mit nur einem Eintrag)?
- Die GitHub-App selbst (App-ID, Private-Key, Registrierung bei GitHub) ist ein
  manueller Schritt außerhalb des Codes — wer legt die an, und wo landet der
  Private-Key (Vault, nicht `.env`)?
