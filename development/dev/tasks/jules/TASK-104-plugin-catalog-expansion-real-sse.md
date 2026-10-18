# TASK-104 — Plugin-Katalog-Erweiterung + echter SSE-Aktivitäts-Stream

**Quelle:** Operator 16.9. — „weitere tasks für jules, was ist mit dem datalake,
daraus auch ein plugin machen? was für weitere plugins anbieten? dsh? gemini
cli -p steuern? gmail? agentemail? auch die browser sachen noch, und warum
gibts kein SSE?"

**Priorität:** P2 — baut auf TASK-103 (gemerged) auf, kein Blocker für
anderes.

**Kontext:** TASK-103 (Plugin-Grundlage + Jules) ist gemerged. Der einzige
SSE-Versuch dafür wurde verworfen (Branch
`jules-task-j1-j5-implementation-5039264918196805605`, Commit `1e7a161`):
`handleJulesEventsStream` sendete genau EIN hartcodiertes Fake-Event (mit den
eigenen Backend-Dateipfaden als „modifizierte Dateien" — offensichtlicher
Platzhalter) und danach nur noch Keepalives, nie einen echten Call an Jules.
Derselbe Branch hatte davor schon zweimal `handleJulesSessions`/
`handleJulesActivities` auf echte API-Calls umgestellt bekommen und beide
Male wieder auf hartcodierte Fake-Daten zurückgesetzt. Der Frontend-Hook
(`useJulesEventStream` in `lib/jules-events.ts`) wurde gerettet und ist
bereits auf `main` — er ist korrekt, hat aber noch keinen echten Backend-Endpoint.

## 0. Wichtige Abgrenzung zuerst: was ist ÜBERHAUPT ein „Plugin"?

Bevor weitere Kandidaten in den Plugin-Katalog wandern: dieses Repo hat
bereits DREI unterschiedliche Integrations-Konzepte, die nicht verwechselt
werden dürfen (das war schon vor TASK-103 so, wird hier nur explizit
gemacht, damit nichts konzeptionell vermischt wird):

| Konzept | Was es ist | Beispiele | Schema |
|---|---|---|---|
| **Framework** (Deploy) | Ein deploybarer Workspace-**Container-Typ** (voller Container, VNC/code-server) | `dsh`, `opencode`, `claude-code`, `gemini-cli`, `jimesh` | `DeployRequest.framework` in `projects_ssh.go` |
| **Utility-Dependency** | Automatisch provisionierte **Infrastruktur** pro Project/App | WAF, Firewall, Network, Vault, SIEM, CI/CD, RBAC | `utility_deps.ts` → `UtilityDependencyType` |
| **Plugin** (TASK-103, neu) | Ein externes Tool, das JiMesh vom **Backend aus anruft** (Wrapper-API), mit Auth-Modus + Scope-Aktivierung + Onboarding-State | Google Jules | `plugins.go` / `plugins.ts` |

**Datalake (TASK-087/088) ist KEIN Plugin-Kandidat** — es ist Infrastruktur
(CDC/Postgres-WAL/Columnar-Storage), kein externes Tool mit eigener API, das
man an-/abschaltet. Es gehört als 8. Eintrag in `UtilityDependencyType`
(`'datalake'`), nicht in den Plugin-Katalog. Bitte NICHT als Plugin planen —
das würde die beiden Konzepte vermischen, genau das Muster, das schon einmal
zur IA-Drift geführt hat (SPRINT-22-Disziplin).

**DSH/Gemini-CLI als Framework vs. als Plugin — beides existiert parallel,
mit unterschiedlichem Zweck:**
- Als **Framework**: ein ganzer DSH/Gemini-CLI-Workspace-Container wird deployt
  (existiert schon, unverändert).
- Als **Plugin** (neu, siehe unten): JiMesh **steuert eine einzelne
  Ausführung** (einen Prompt, eine Session) an einem BEREITS laufenden
  Prozess bzw. per One-Shot-CLI-Call — kein neuer Container, sondern eine
  Ansteuerung wie bei Jules. Das ist der Anwendungsfall, den der Operator mit
  „den bereits laufenden dsh Prozess benutzen" und „gemini cli -p steuern"
  meint.

## 1. Neue Plugin-Kandidaten (Katalog-Einträge, Schema aus TASK-103 wiederverwenden)

Jeder Kandidat braucht eine kurze Auth-Modus-Analyse, BEVOR Code geschrieben
wird — das war bei Jules die Quelle der ganzen Fake-Response-Probleme (die
echte API-Struktur war beim ersten Anlauf nicht erforscht). Nicht wiederholen.

### 1a. DSH (Session-Steuerung eines laufenden Prozesses)
- **Auth-Modus:** NEU, nicht `api_key`/`github_app` — eher `local_process`
  (Unix-Socket oder lokaler HTTP-Port, den ein laufender `dsh`-Prozess
  öffnet). Recherche nötig: hat DSH selbst eine ansteuerbare API/Socket, oder
  müsste JiMesh Tasks über eine Datei-Queue/stdin injizieren?
- **Scope:** vermutlich SSH-Target-Ebene (ein laufender DSH-Prozess hängt an
  einem Host), nicht Project/Workspace wie Jules.
- **Vor Code:** DSH-Dokumentation/Quellcode sichten (falls DSH Open-Source
  ist und lokal vorliegt) für die reale Steuerschnittstelle — NICHT annehmen.

### 1b. Gemini CLI (`-p`-Steuerung, One-Shot)
- **Auth-Modus:** `local_cli` — Subprocess-Aufruf (`gemini -p "<prompt>"`),
  kein Netzwerk-API-Key im klassischen Sinn (Gemini CLI hat eigene
  Auth/Login, die bereits im Deploy-Container läuft — prüfen, ob das
  wiederverwendet werden kann oder ein eigener Key nötig ist).
  **Wichtiges Sicherheits-Detail:** Subprocess-Aufrufe mit User-Prompt als
  Argument brauchen Shell-Injection-Guards (gleiches Muster wie
  `internal/network/vlan.go`s Command-Emission-Guards aus TASK-080 — dort
  wiederverwenden, nicht neu erfinden).
- **Scope:** Project/App-Ebene (läuft im Kontext eines Workspace-Containers).

### 1c. Gmail / Agent-E-Mail
- **Auth-Modus:** `oauth` (Google OAuth, analog zum bereits existierenden
  GitHub/Google-Login-Flow aus TASK-088 Provider-Credentials —
  **wiederverwenden**, nicht dupliziert als neues OAuth-Schema bauen)
- Bezieht sich auf die bereits bestehende Artikel-Recherche
  `mcp-docker-email-automation` (MCP-Server + Docker + GenAI für
  E-Mail-Automatisierung) — als Ausgangspunkt für die Tool-Landschaft nehmen,
  nicht neu recherchieren.
- **Scope:** Project/Workspace-Ebene.

### 1d. Browser-Automatisierung (Camoufox/Playwright-getriebener Agent)
- Bezug: MAGI-Blog-Recherche (gVisor-Artikel-Quellen) nannte Camoufox
  (Anti-Fingerprinting-Firefox-Fork) als Browser für agentisches Arbeiten.
- **Auth-Modus:** vermutlich keiner im klassischen Sinn — eher eine
  Utility-App-Deployment-Frage (ein Camoufox/Playwright-Container pro
  Workspace) ÜBERLAGERT mit einer Plugin-Steuerungsebene (Sessions starten/
  stoppen, Screenshots/Traces abrufen).
  **Klärungsbedarf, bevor gebaut wird:** ist das eher ein Utility-App-Deploy
  (Container, der immer läuft) mit einer dünnen Plugin-Steuerschicht obendrauf,
  oder komplett am Plugin-Muster orientiert? Diese Entscheidung braucht der
  Operator, nicht Jules — als offene Frage unten aufgenommen.

## 2. Echter SSE-Aktivitäts-Stream für Jules (ersetzt den verworfenen Fake-Stub)

Jules exponiert laut `docs/research/jules.md` **kein natives Push/SSE** —
nur REST (`sources`/`sessions`/`activities`). Ein echter Stream kann daher
NICHT einfach proxied werden; er muss eine Polling-Bridge sein:

- `handleJulesEventsStream` pollt `GET {JulesAPIBase}/sessions/{id}/activities`
  in einem Intervall (Vorschlag: 3–5s, konfigurierbar), vergleicht gegen die
  zuletzt gesendete Activity-ID, und emittiert NUR neue Activities als
  SSE-Frames (`data: {...}\n\n`) — kein Fake-Event, keine hartcodierten
  Pfade.
- Bei leerem Ergebnis: reines Keepalive senden (das Muster aus dem
  verworfenen Commit war hier strukturell richtig, nur der Dateninhalt war
  gefaked).
- Verbindung schließt sauber bei `r.Context().Done()` (Client-Disconnect) —
  bereits im verworfenen Code richtig gemacht, übernehmen.
- Der bereits gerettete Frontend-Hook (`lib/jules-events.ts`) braucht KEINE
  Änderung — er erwartet exakt dieses Format.

## Reihenfolge

1. Abschnitt 0 lesen und verstanden haben (Konzept-Trennung) — sonst landet
   Datalake wieder fälschlich im Plugin-Katalog
2. Abschnitt 2 (echter SSE) zuerst — kleinster, klarster Scope, macht den
   bereits geretteten Frontend-Hook nutzbar
3. Abschnitt 1 (neue Plugins) je nach Operator-Priorität einzeln, jeweils
   mit der Auth-Modus-Recherche VOR dem ersten Code

## Abnahmekriterien (No-Mock — MANDATES.md, hier besonders wichtig)

- [ ] SSE-Stream liefert nachweislich echte, neue Activities (curl-Beweis:
      eine echte Jules-Session erstellen, Activity im Stream auftauchen sehen)
      — KEIN hartcodiertes Event, KEINE erfundenen Dateipfade
- [ ] Jeder neue Plugin-Kandidat hat seinen Auth-Modus vorab recherchiert
      und dokumentiert, bevor der erste Handler geschrieben wird
- [ ] `datalake` landet in `UtilityDependencyType`, NICHT im Plugin-Katalog

## Offene Operator-Fragen

- Browser-Automatisierung: Utility-App-Deploy oder Plugin-Steuerschicht
  (oder beides, siehe 1d)?
- Priorität unter den 4 neuen Plugin-Kandidaten (DSH/Gemini-CLI/Gmail/Browser)
  — welcher zuerst?
- DSH: gibt es überhaupt eine ansteuerbare lokale API/Socket, oder ist das
  eine Vorbedingung, die erst in DSH selbst gebaut werden müsste?
