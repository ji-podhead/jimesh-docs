# SPRINT-189 — Network-Ansicht: Tabs, Suricata-IDS-Betrieb, Network-Anomaly (TASK-102)

**Datum:** 7.10.2026 · **Status:** dokumentiert, nicht umgesetzt
**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"
**BACKLOG-Bezug:** `docs/backlog/BACKLOG.md:917` → `| 102 | Suricata + Network-Anomaly-Tab (P1 Sicherheitslücke) | [ ] geplant | TASK-102 |`
**Recherche:** Subagent-Lauf, Belege `Pfad:Zeile`, Stand `main` = `21cee130`

> „P1 Sicherheitslücke" — Original-Begründung zu TASK-102 im BACKLOG, wörtlich übernommen

---

## §0 Warum — der Ist-Stand ist halb gebaut

Die Frontend-Seite, die TASK-102 meint, **hat keine Tabs**. Sie ist ein langer Strom von
Sektionen, an deren Ende `<SuricataIdsPanel/>` eingehängt ist
(`src/frontend/src/views/NetworksPage.tsx:693`). Damit ist der IDS-Status:

- da (das Panel rendert),
- aber nicht als eigener Tab erreichbar (kein `Tabs`-Primitive in dieser View),
- und ohne Gegenstück für **Anomalie** — die zweite Hälfte von TASK-102 existiert in keinem File.

Das `Tabs`-Primitive selbst ist da und muss nicht erfunden werden:
`src/frontend/src/components/ui/tabs.tsx:50` exportiert die Bausteine; dass es ohne
Spezial-Hooks funktioniert, zeigt `NetworkEditingPage` (S189-Nachbar, gemergt in `21cee130`).

Zum Betrieb: `/api/suricata/status` **existiert als Route** (Backend), die Compose-Datei enthält
Suricata jedoch nur als **Placeholder ohne laufenden Container** —
`deploy/siem/docker-compose.yml:339-357`. Es gibt zusätzlich eine Host-Rolle unter
`deploy/suricata-network-ids/` (XDP/eBPF-Variante, ehrlich v2-Platzhalter laut
`BACKLOG.md:920`). Das Ergebnis: **Route ohne Prozess** — der Status-Endpunkt kann aktuell
nur „down/nicht gefunden" sagen, und genau das ist der messbare Ausgangspunkt.

## WP1 — `NetworksPage` auf Tabs umbauen

### Was

Die Seite bekommt die Gliederung, die TASK-102 beschreibt: `Overview | Suricata IDS | Network Anomaly | …`

### Konkret

- Umbau nur der View-Struktur, **kein Verhalten der bestehenden Sektionen**: vorhandene
  Sektionen wandern unverändert in `TabsContent`, `<SuricataIdsPanel/>` (`NetworksPage.tsx:693`)
  wird Inhalt des Tabs „Suricata IDS".
- Primitive `src/components/ui/tabs.tsx:50` — gleiche Nutzung wie in den bereits gemergten
  Views (kein zweites Tab-System bauen, kein Radix-Nachbau).
- Default-Tab **`overview`**: ein Operator, der nur Netzzeile sehen will, bekommt sie, ohne
  den IDS-Tab zu sehen; die Anomalie-Tab-Eröffnung ist WP3.

### Acceptance

- [ ] `npx tsc --noEmit` nicht schlechter als Baseline (`main` = 455 Fehler), `npm run build` RC=0.
- [ ] Tabs erreichbar, `SuricataIdsPanel` rendert weiter (kein Regressions-Unterschied im DOM
      außerhalb des Tabs), vitest auf Baseline (23 failed / 612 passed).

---

## WP2 — Suricata-IDS wirklich laufen lassen (Placeholder → Prozess)

### Was

Der Container, den `/api/suricata/status` befragt, existiert.

### Konkret

- Ausgangspunkt ist **bewusst ein Placeholder**: `deploy/siem/docker-compose.yml:339-357`
  definiert Suricata ohne `container_name`-Betrieb — sprich: der Stack fährt ihn nicht hoch.
- Zwei Wege, **Entscheidung vor Implementierung**:
  - **(a) Compose-Service** in `deploy/siem/` — gleicher Network-Mode wie die anderen
    SIEM-Services (Mandat 12: published ports nur `127.0.0.1`, wie `:40-41`, `:119-122`).
  - **(b) Host-Rolle** `deploy/suricata-network-ids/` — die vorgesehene XDP/eBPF-Variante,
    bisher ehrlich als v2-Platzhalter geführt (`BACKLOG.md:920`).
- Empfehlung: **(a) für TASK-102**, weil der Tab auf den **Bestands-Endpunkt**
  `/api/suricata/status` zielt und ein Host-Rollen-XDP den Tab nicht schneller füllt;
  (b) bleibt der Folge-Sprint für echten Line-Rate-Betrieb.
- **Rule-Quelle:** die Secret-Exfil-Regeln (SIDs 8000001-14, S144-1) und das SID-Fenster
  8000000-99 gehören zum **threat-responder** (`deploy/threat-responder/`), nicht zur
  Suricata-Rolle des Tabs — nicht vermischen.
- Deployment läuft über dieselbe Schiene wie die anderen SIEM-Services
  (`make redeploy SERVICE=siem NODE=<node>`, `deploy/siem/ansible-task.yml`), damit der
  bestehende SIEM-Key-Pre-Step (`Makefile:redeploy`, SPRINT-169) greift.

### Acceptance

- [ ] `docker ps` zeigt einen Suricata-Container auf dem Zielknoten.
- [ ] `GET /api/suricata/status` liefert den **gemessenen** Zustand (min. `up` + Interface),
      Antwort im Tab sichtbar (nicht der Empty-State).
- [ ] Deploy mit RC=0, `record-deploy`-Eintrag vorhanden, Mandat-12-konform (kein neuer
      externer Port).

---

## WP3 — Network-Anomaly-Tab (die zweite Hälfte von TASK-102)

### Was

Ein Tab, der Abweichungen zeigt — mit Quellen, die es schon gibt, statt mit neuen Gebernern.

### Konkret

Verfügbare Datenquellen, **alle repo-belegt**:

| Quelle | Fundstelle | liefert |
|---|---|---|
| Falco-Regel-Treffer | `sdk_logs` alias `falco` (S188 reduziert das Rauschen vorher) | Prozess-/File-Ereignisse |
| Wazuh-Alerts | `wazuh.go:152` `wazuh-alerts-*` | Regel-Treffer, Level |
| Threat-Correlation | `gateway/threat_correlation.go:19-21,127-131` | gekoppelte Sicht `alias=falco, type=audit` |
| Security-Events | `security/security.go:55` (`GET /api/security/events`) | `RecordSecurityEvent`-Rows |
| Netz-/Metrik-Pfad | Prometheus `job_name: falco` (`prometheus/prometheus.yml:41-44`) | `falcosecurity_scap_n_drops_*`, Queue-Drops |

- Der Tab **liest**, er erzeugt keine eigene Anomalie-Engine — die eigentliche
  Detektion ist S188-WP4 (Indexer-AD-Detector), S177 „Paranoia Alerting" ist
  operator-entscheidungspflichtig (`BACKLOG.md:1211-1212`: „S177-1..7 | [ ] Blocked on Operator decision").
- Leerer Zustand ist Pflicht: ohne WP2-Betrieb zeigt der Tab einen **ehrlichen Grund**
  („Suricata nicht aktiv"), nicht einen leeren Ladebalken.

### Acceptance

- [ ] Tab rendert, ≥1 echte Datenquelle angebunden (Antwort im Netz-Werkzeug nachgewiesen).
- [ ] Ohne Suricata-Betrieb: ehrlicher Grundtext statt Loading-Loop.
- [ ] Frontend-Gates: `npm run build` RC=0, tsc ≤ Baseline, vitest Baseline, `npm run check:i18n`.

---

## §7 Reihenfolge

WP1 (Struktur, ohne Betriebsabhängigkeit) → WP2 (Prozess) → WP3 (Daten).

## §8 Bewusst NICHT im Scope

- **XDP/eBPF-Linerate** (`deploy/suricata-network-ids/`) — eigener Folge-Sprint, ehrlich v2.
- **threat-responder-Regeln/-Deploy** → S190 (Dort gehört auch Mandat 12).
- **SquadMesh** unberührt.
- Keine neue Frontend-Dependency (Tabs-Primitive ist vorhanden).

## §9 Offene Fragen an den Operator

1. WP2 (a) Compose-Service vs. (b) Host-Rolle XDP — Empfehlung (a).
2. Welcher Node trägt den IDS: gleicher Knoten wie der Rest des SIEM-Stacks?
