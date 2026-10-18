# SPRINT-177 — Paranoia-Level-Alarmierung, SSH-Traces, Exception-Registry, Log-Neuplanung

**Status:** `[ ]` Plan (kein Code, kein Deploy — 1.10.2026)

## Operator-Order (verbatim)

> „das mit dem zero trust ssh traces sollten wir aufjedenfall aufschrieben und alle ssh sachen
> extrem vorsichtig behandeln jenachdem was der user für eine sicherheits stufe eingestellt hat.
> das finde ich sowieso wichtig das wir sowas haben wie so ne art verbosity level aber für alarms,
> sowas nennt man sonst glabe ich paranoia level und bei ssh qäre dsa nice wenn man dann bei allem
> was irgendwie nicht authentifiziert ist über unseren ssh server also headscale und kein rbac hat
> im alarm oder verboity level halt einstellen können was als kritisch gillt oder einfach so stufen
> vorgeben können. gerade auch wegen so exposten ports, das heißt aber uach das man ausnahmen
> irgendwo einstellen kann für zb irgendwelch ports die dann nur übercloduflare tunnel erreichar
> sind oer da noch ne extra clodulare wav davor ist ode rso ne scheisse. das war nu ein example.
> aber wir brauchen da ein ordentliches packaes und logs müssen neu durchgeplant werden und wir
> müssen uns mal datadog und andere frameowrks angucken"

**Zerlegung (5 Anforderungen):**

1. **Zero-Trust-SSH-Traces** — jeden Zugriff über unseren SSH-/Headscale-Pfad aufzeichnen; alle
   SSH-Sachen „extrem vorsichtig behandeln", Schweregrad abhängig vom vom User gesetzten
   Sicherheitslevel.
2. **Paranoia-Level** — Stufenmodell wie ein verbosity level, aber für Alarme (Vorbilder: OWASP
   CRS `paranoia level` PL1–PL4, Wazuh Alert-Level 0–16, Suricata `severity`). global einstellbar,
   pro User/Node überschreibbar.
3. **SSH-Alarmstufen** — alles Nicht-Authentifizierte über unseren SSH-Server (headscale) und alles
   ohne RBAC-Zuordnung läuft je nach eingestelltem Level in den Alarm; konfigurierbar, was als
   *kritisch* gilt, oder fertige Stufen-Vorgaben.
4. **Exception-Registry** — Ausnahmen pro Port/Pfad mit Kontext, z.B. „nur über Cloudflare Tunnel
   erreichbar" oder „liegt hinter Cloudflare-WAF" → senkt die Stufe, statt Alarm zu fluten.
   (Der Operator nennt das ausdrücklich als *Example*, nicht als Scope-Grenze.)
5. **Log-Neuplanung + Recherche** — Logs komplett neu durchplanen; Datadog und andere Frameworks
   anschauen und aufnehmen, was wir übernehmen.

## Recherche-Frage (WP0, Doku-Ausgabe)

Welche Severity-/Level-Modelle gibt es, und was übernehmen wir davon?

| Framework | Modell | Relevanz für uns |
|---|---|---|
| OWASP ModSecurity CRS | `paranoia level` PL1–PL4 (Scope der Regeln, nicht Schweregrad) | direktes Namens-/Konzept-Vorbild |
| Wazuh | Alert Level 0–16 + granulare `rule.level`, Schwelle pro Empfänger | Stufen + „was gilt als kritisch" pro Kanal |
| Suricata | `severity` 1/high – 3/info, Rule-Aktion `alert/log/drop`, `event_type` | wir haben das Deployment schon (S162/gated) |
| Elastic Security / ECS | `severity: critical/high/medium/low/none` + `risk_score` | Mapping in unser SIEM-Schema |
| Datadog Security Signals | Severity 1–5 + Signal-Quelle + Context-Attraktion | Signal-Correlation, Noise-Reduktion, Kosten-Modell |
| Grafana/Loki + Alerting | Labels/Matchers, `for`-Dauer, Stufung je Alertmanager-Route | existierendes Grafana-Basis-Stack (S120/Alertmanager) |
| OCSF / ECS | normiertes Event-Schema | Log-Neuplanung: ein Schema statt N |

**Ergebnis-Datei:** `docs/research/PARANOIA-LEVEL-MODEL.md` (nur Recherche, keine Code-Änderung).

## Arbeitspakete

| WP | Inhalt | Abhängigkeit |
|---|---|---|
| WP0 | Recherche wie oben, Entscheidungsvorlage „Modell + was wir übernehmen" | — |
| WP1 | Log-Bestandsaufnahme: welche Quellen (headscale, sshd, traefik, falco, tetragon, suricata, backend, siem), wohin, Retention, Lücken → **Log-Neuplanung** | WP0 |
| WP2 | Paranoia-Level-Modell (P1..P4, global default, pro User/Node/Port-Override) als reine Daten-/Policy-Schicht | WP0 |
| WP3 | SSH-Trace-Pipeline: jeder Zugriff über unseren Pfad → Event mit User, Quelle, Auth-Status, RBAC-Zuordnung, Ziel; Nicht-Auth/kein-RBAC → stufenabhängige Warnung | WP1, WP2 |
| WP4 | Exception-Registry: Port/Pfad + Kontext (Cloudflare Tunnel, WAF davor, interner Peer) → Stufenabsenkung; UI + Datenmodell + Prüfung in der Policy | WP2 |
| WP5 | Alarm-Routing an die bestehenden Notification-Settings (kein zweites Kanal-System) | WP3, WP4 |
| WP6 | UI: Paranoia-Level-Regler + „was würde aktuell feuern" (Preview), Exceptions verwalten | WP2–WP5 |

## Acceptance Criteria

1. Recherche-Ausgabe existiert und begründet das Modell mit mindestens 3 genannten Quellen — keine
   erfundenen Zahlen.
2. Jede SSH-Quelle ist erfasst (Bestandsaufnahme vollständig, Lücken benannt statt gefüllt).
3. Level-Modell ohne Code: Datenmodell + Policy-Logik beschrieben, Override-Reihenfolge explizit.
4. Exceptions sind **kontextabhängig** dokumentierbar (gleicher Port, andere Stufe wenn Tunnel/WAF
   davor) — nicht als globale „Alarmaus" Schalter.
5. Alarme laufen über die bestehenden Notification-Settings, kein paralleles System.
6. Kein Deploy, keine Regel-/SSH-Ändrung an laufenden Knoten in diesem Sprint.
7. Doku-Mandat: Sprint-File hier, Backlog-Spiegel, und — sobald das Modell steht — ein
   MANDATES-Eintrag für „SSH-Stufen je nach Sicherheitslevel" mit dem hier dokumentierten Fall.

## Nicht Teil (bewusst)

- Implementierung der Pipeline/UI (kommt in eigenen Sprints nach WP-Planung)
- Wechsel/Integration eines Fremd-Produkts (Datadog-Anbindung erst nach WP0-Empfehlung + Kosten)
- Änderung an bestehenden headscale-/sshd-Konfigurationen
