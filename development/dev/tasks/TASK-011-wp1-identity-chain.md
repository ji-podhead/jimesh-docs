# TASK-011 — WP1: Identitätskette (Session ↔ Container ↔ Prozess)

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen,
> `docs/K-LAF-ARCHITECTURE.md` §2 gelesen
> **Branch:** `task/011-identity-chain` · **Speist:** Sprint 20 WP1

## Kontext — warum das die wichtigste Task im Katalog ist

Ohne verlässliche Identität ist jeder spätere Threat-Scanner (WP2) und jeder Freeze
(WP3) ein Alarm ohne Adressat. Diese Task legt die Grundlage: JiMesh mintet die
Session-Identität selbst, der Agent präsentiert sie nur — er wählt sie nie.

**Aktuelles Schema** (verifiziert, `src/backend/internal/store/store.go:385`):
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    agent_type_id TEXT,
    metadata TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```
Kein `container_id`, kein `parent_session_id`, kein `project_id`, kein `status`.

**`vault_tokens`** existiert bereits (`internal/store/vault.go:75`) mit
`id, secret_name, agent_id, expires_at, revoked, created_at` — das ist die
TTL-Infrastruktur, die WP1 braucht. `agent_id` ist heute lose; für Session-Tokens
sollte die Session-ID hinein.

**Provisioning-Einstiegspunkt:** `AgentBridge.ExecuteSelfProvisioning`
(`internal/gateway/agent_bridge.go:63`) — hier kennt JiMesh die Container-ID, bevor
der Container läuft. Das ist der einzig richtige Ort, ein Session-Token zu minten.

## Auftrag

### 1. Migration `sessions`

Ergänzen (idempotent, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — Migrations-Mandat
in `MANDATES.md` §8 beachten):
- `container_id TEXT DEFAULT ''`
- `parent_session_id TEXT DEFAULT ''` (Baum statt flacher Liste — ein Agent startet
  Sub-Agents, ein Task-Run spannt mehrere Calls)
- `project_id TEXT DEFAULT ''`
- `status TEXT DEFAULT 'active'` (`active` | `frozen` | `released` | `expired` —
  wird für WP3 gebraucht, hier nur das Feld anlegen)
- `trust_class TEXT DEFAULT 'provisioned'` (`provisioned` | `discovered` — siehe
  §2 unten)

### 2. Zwei Vertrauensklassen (K-LAF-ARCHITECTURE.md §2)

- **`provisioned`**: JiMesh hat den Container selbst erstellt (via
  `ExecuteSelfProvisioning` oder den Deploy-Pfad in `projects_ssh.go`). Identität ist
  sicher bekannt.
- **`discovered`**: Container wurde per Auto-Discovery gefunden, nicht von JiMesh
  erstellt. Identität ist geraten. **Nur `discovered`-Container dürfen NICHT
  eingefroren werden** (das ist WP3-Vorarbeit, hier nur das Feld korrekt setzen).

### 3. Session-Token beim Provisioning minten

In `ExecuteSelfProvisioning`:
1. Nach dem Docker-Spawn (Container-ID bekannt), vor dem Rückgabewert: Token minten
   über die bestehende Vault-Token-Infrastruktur (`store.CreateVaultToken` o. ä. —
   prüfe die exakte Funktionssignatur in `vault.go`).
2. `agent_id` im Token = die neue `session_id` (nicht die alte lose Semantik).
3. Token als Env-Variable in den Container injizieren (Docker-Run-Aufruf ergänzen —
   `OPENAI_API_KEY` oder eine JiMesh-eigene Variable, je nachdem was der Container
   erwartet; siehe `docs/PRODUCT-ROADMAP.md` §1 „Das Token-Detail" für die
   SDK-kompatible Variante).
4. Neue Session-Row mit `container_id`, `trust_class='provisioned'` anlegen.

### 4. Gateway: Token auflösen

Im Proxy-Pfad (`gateway.go`, dort wo `/v1/chat/completions` das eingehende
Bearer-Token liest — finde die Stelle mit `grep -n "Authorization" gateway.go`):
1. Token gegen `vault_tokens` auflösen → `session_id`.
2. Falls kein gültiges Token: Request wie heute behandeln (Rückwärtskompatibilität
   — kein Bruch für bestehende Clients ohne Session-Token). Das ist der
   „externer Client"-Fall aus der Roadmap, kein Fehler.
3. Falls Token vorhanden aber ungültig/expired: 401.

### 5. Zweite Bindung — Source-IP-Gegenprobe

1. Request-Source-IP aus dem Docker-Netz lesen.
2. Docker-API abfragen (`docker/docker/client` — **das ist eine neue Dependency,
   in `go.mod` bislang nicht vorhanden**. Prüfe zuerst, ob ein leichterer Weg reicht:
   z. B. `docker network inspect` als Shellout, wie es `projects_ssh.go` an anderen
   Stellen schon tut, statt die volle Docker-SDK-Client-Library zu importieren —
   Mandat 7 sagt „keine Dependency ohne Not"). Entscheide und begründe im Report.
3. Wenn die über die IP ermittelte Container-ID nicht mit der im Token
   hinterlegten übereinstimmt: als eigenes Ereignis loggen (Tabelle oder
   strukturiertes Log — WP2/WP3 bauen später darauf auf, hier reicht ein klarer
   Log-Eintrag mit beiden IDs).

## Nicht tun

- **Kein Freeze, kein Scanner** — das ist WP2/WP3, andere Tasks.
- Keine Docker-SDK-Abhängigkeit ohne vorherige Abwägung (siehe Punkt 5).
- Keine Änderung an bestehenden, funktionierenden Auth-Pfaden (Dashboard-Login aus
  WP0 bleibt unangetastet — das ist eine andere Session-Art als Agent-Sessions).

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Ein frisch provisionierter Container hat eine `sessions`-Row mit `container_id`
  gefüllt und `trust_class='provisioned'`.
- Ein Request mit gültigem Session-Token löst zur richtigen `session_id` auf
  (Test: curl mit dem gemünzten Token gegen `/v1/chat/completions`, falls im
  Worktree ein Stack hochfahrbar ist — sonst den Auflösungscode isoliert testen).
- Ein Request ohne Token verhält sich wie vorher (keine Regression).

## Ergebnis (Claude, 6.9.2026 — nicht GLM, siehe Ownership-Entscheidung)

**Branch:** `task/011-identity-chain`, Worktree `../jimesh-worktrees/task-011-identity-chain`,
Commit `96e2f90`.

**Fertig, gebaut, verifiziert** (`make go-build`/`go-vet` im Container, exit 0 nach
jeder Änderung):

1. **Migration** in `store.go`: `sessions` bekommt `container_id`,
   `parent_session_id`, `project_id`, `status`, `trust_class`. **Abweichung von der
   Vorgabe:** `trust_class` defaultet auf `'discovered'`, nicht `'provisioned'` wie
   ursprünglich in dieser Datei spezifiziert — ein Default von `'provisioned'` hätte
   jede Alt-Session (vor dieser Migration, oder über einen nicht-auditierten Pfad
   angelegt) fälschlich als einfrierbar/identitätssicher eingestuft. Sicherer Default
   ist die pessimistische Annahme.
2. **`store.MintSessionToken`/`ValidateSessionToken`** in `vault.go`: nutzen die
   bestehende `vault_tokens`-Tabelle mit Sentinel `secret_name="session-auth"`,
   `agent_id` trägt die `session_id`. Kein neues Schema nötig.
3. **`gateway.resolveSessionID`** in `auth.go`, verdrahtet an beiden Stellen, die
   vorher blind `r.Header.Get("X-Session-Id")` (bzw. den OpenAI-`user`-Body-Feld)
   vertraut haben (`handleChatCompletionsProxy`, Embeddings-Handler). Verifiziertes
   Token gewinnt immer; ohne gültiges Token bleibt der alte Wert als
   `"unverified:"`-präfixierter Hinweis erhalten — Forensik/Analytics können beide
   Fälle unterscheiden, ohne dass ein selbstdeklarierter Wert je als durchsetzbare
   Identität behandelt wird.

**Bewusst nicht gebaut — mit Begründung, kein Vergessen:**

4. **Wiring in den echten Provisioning-Pfad.** Die Task nannte
   `agent_bridge.ExecuteSelfProvisioning` (`agent_bridge.go:63`) als Ansatzpunkt.
   **Das ist falsch — der Code dort spawnt gar keinen echten Container.**
   `containerID := fmt.Sprintf("jimesh-%s-%d", ...)` ist eine erfundene Zeichenkette,
   kein `docker.Client`, kein `exec.Command`, und die Funktion gibt unbedingt
   `Status: "deployed"` zurück — ein Mandat-2-Verstoß (No-Mock) in einer Route, die
   Sprint 18 als „✅ built & compiled" führt. Der ECHTE Provisioning-Pfad für
   Agent-Workspaces ist der Deploy-Handler in `projects_ssh.go` (`docker run -d ...`
   über SSH) — aber das ist gerade das Territorium des 009/010/012-Sequenzblocks.
   Das Wiring (Token minten direkt nach dem `docker run`, vor der Antwort) kommt,
   sobald 012 gemerged ist — mechanisch, keine neue Logik, nur ein Funktionsaufruf
   an der richtigen Stelle.
5. **Source-IP-Gegenprobe — Architekturannahme der Task war falsch für den
   Hauptfall.** Deployte Workspaces laufen ohne `--network`-Flag auf dem
   Default-Bridge-Netz des jeweiligen (oft entfernten) SSH-Zielhosts, nicht auf
   `jimesh-net`. Das Gateway und der Workspace teilen sich in der Praxis **kein**
   Docker-Netz — ein Docker-API-Lookup „welcher Container hat IP X" funktioniert nur
   im lokalen Sonderfall (Gateway und Workspace auf derselben Maschine), nicht für
   den dokumentierten Hauptweg (Remote-Deploy via SSH, `docs/PRODUCT-ROADMAP.md` §6).
   Ich habe deshalb **keine** Zweitbindung gebaut, die im Hauptfall so aussähe, als
   würde sie greifen, es aber nicht täte — genau das stille-Fallback-Muster, das
   MANDATES.md mehrfach als Bug-Ursache nennt.

## Offene Frage für den Operator (neu, nicht in E1–E8)

**E9 — Was ist die zweite Bindung bei Remote-Deployments?** Der Token allein (kurze
TTL, einmalig pro Container injiziert) ist im Remote-Fall die einzig verfügbare
Bindung. Optionen für eine echte Zweitprüfung: (a) Quell-IP gegen die für das
Projekt hinterlegte `NodeHost`-IP prüfen (schwächer als Docker-API, aber
netzwerkübergreifend machbar), (b) keine Zweitbindung, Token-Kompromittierung wird
stattdessen über TTL + Revoke-bei-Threat abgefangen, (c) SSH-Tunnel erzwingen (der
Traffic kommt dann tatsächlich vom Gateway-Host selbst, IP-Check würde wieder
funktionieren) — das würde aber voraussetzen, dass Agent-Workspaces nie direkt
routbar sind, eine größere Architekturentscheidung. Kein Default gesetzt — bewusst,
weil (c) eine Deployment-Policy-Frage ist, keine Implementierungsdetail-Frage.
