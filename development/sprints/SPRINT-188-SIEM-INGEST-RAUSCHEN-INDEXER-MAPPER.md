# SPRINT-188 — SIEM-Ingest: Rauschen am Eingang, Wazuh-Indexer-Weg, `security_events`-Mapper

**Datum:** 7.10.2026 · **Status:** dokumentiert, nicht umgesetzt
**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"
**Freigabe (verbatim, pauschal):** „ alles" — u. a. Loki/Falcosidekick, ML-Runtime
**Recherche:** 4 Subagent-Läufe, Belege sind durchgängig `Pfad:Zeile`, Stand `main` = `21cee130`

> „hast du alles gemerged und gepulled?" — 7.10.2026, Operator

---

## §0 Warum — was gemessen wurde (nicht behauptet)

Drei Zahlen, die diesen Sprint begründen:

1. **99,7 % Rauschen in `sdk_logs`.** Alias `falco` enthält **4.662 Zeilen `metrics-snapshot`
   gegen 12 echte Regel-Treffer**. Jede Abfrage über die Falco-Zeilen rechnet also fast alles weg.
   Ursache ist *nicht* Falco selbst, sondern ein bewusst gesetztes Flag:
   `deploy/siem/docker-compose.yml:249` → `-o metrics.interval=15s`.
2. **Weg in den Indexer existiert nicht.** Falco-Events landen ausschließlich in Postgres
   (`sdk_logs`), nie im Wazuh-Indexer. Beleg der Negativsuche: `<localfile>`-Blöcke im
   `wazuh_manager.conf` stehen nur auf `:231, :237, :244, :306` (`df`, `netstat`, `last`,
   `active-responses.log`) — **keiner liest `jimesh-events.json`**.
3. **`security_events` bleibt leer, weil niemand aus der SIEM dorthin schreibt.** Grep
   `security_events` über `src/backend/internal/siem/` → **0 Treffer**; geschrieben wird
   ausschließlich von AI-Guard/Quarantine/Freeze (`internal/ai/guard_hook.go:343,375`,
   `internal/security/quarantine.go:189` …). Das ist genau das „WP2-Delta", das unter
   `docs/backlog/BACKLOG.md:920` seit TASK-054 als offen geführt wird.

Der OpenSearch-Pfad (`internal/opensearch`, S174-7) ist **toter Code**: Repo-weiter Grep
`jimesh/backend/internal/opensearch` → 0 Importe, `Config.Enabled` (`opensearch.go:26`)
kann damit nie gesetzt werden. Dasselbe Muster bei `internal/streams` (`TopicThreats`,
`streams.go:33` — kein Publisher/Consumer) und `logschema.go:312`
(`ConsumerGroup "opensearch-indexer"` → nur diese eine Zeile).
Dokumentiert steht das Gegenteil: `docs/backlog/BACKLOG.md:147` und `:1205` führen S174-7
als „[x] … Dual output, semantic search".

---

## WP1 — Rauschen am Eingang filtern (statt `log_level` zu drehen)

### Was

`metrics-snapshot`-Zeilen verlassen den Prozess, bevor sie `sdk_logs` füllen.

### Konkret

- **Choke-Point:** `src/backend/internal/siem/falco.go:187` ist die *einzige* Ship-Stelle
  (`b.shipper.Ship(sdkLogFromFalco(ev))`). Genau hier der Filter, nicht an mehreren Stellen.
- Prüfung am Event selbst: die heutige Drop-Logik sitzt bereits in `falco.go:114-119`
  (unparsbar **oder** `ev.Rule == ""` → `t.skipped++`). Der Rausch-Fall ist ein neuer,
  **benannter** Skip-Grund mit eigenem Zähler, damit im 100er-Log (`:206-207`) sichtbar bleibt,
  *was* verworfen wird.
- Konfiguration **nicht** über `log_level`-Absenken: `deploy/siem/docker-compose.yml:229-233`
  warnt im Kommentar selbst, dass zu wenig Output ein **leeres `/metrics`** erzeugt — genau
  die Metrics, die `deploy/grafana/prometheus/prometheus.yml:41-44` (`job_name: falco`,
  `jimesh-siem-falco:8765`) und das Dashboard `deploy/grafana/dashboards/falco.json`
  (`falcosecurity_falco_rules_matches_total`, `:301` ff.) brauchen.
- Die Metrik-Seite bleibt also unberührt: `metrics.enabled=true` / `webserver.prometheus_metrics_enabled=true`
  (`docker-compose.yml:246-247, :262-263`) laufen weiter, nur der **Datei-/Ship-Pfad** filtert.

### Acceptance

- [ ] `sdk_logs` enthält nach 15 min Laufzeit **0** `metrics-snapshot`-Zeilen (Query auf
      `alias='falco' AND message ILIKE '%metrics-snapshot%'`), echte Regel-Treffer > 0.
- [ ] `GET :8765/metrics` liefert weiterhin `falcosecurity_falco_rules_matches_total` (gemessen, nicht angenommen).
- [ ] neuer Skip-Zähler im Bridge-Log sichtbar; `go build`/`go vet`/`go test` RC=0.

### Bewusst NICHT

- Kein Falco-Rule-Flag-Rollback: `metrics.interval=15s` ist SPRINT-186-Entscheidung (`:249`).
- Kein Retention-Umbau (30d-ISM `deploy/siem/config/wazuh_indexer/ism-policy-30d.json:30-31` läuft).

---

## WP2 — Falco → Wazuh-Indexer (`wazuh-alerts-*` ist das einzige belegte Muster)

### Was

Ein belegbarer Schreibpfad in den Indexer, damit Alerting/AD auf dem laufenden Storage aufsetzen
kann, statt auf dem toten `internal/opensearch`.

### Konkret

- **Ziel-Pattern ist vorgegeben, nicht zu erfinden:** `wazuh-alerts-*` tritt an genau diesen
  Stellen auf — `src/backend/internal/siem/wazuh.go:152` (`GET /wazuh-alerts-*/_search`),
  `deploy/siem/README.md:247`, `ism-policy-30d.json:30-31`, `apply-retention.sh:62,72,85`.
  Das Hit-Schema hat **kein `_type`-Feld** (`wazuh.go:64-69`), Grep `_type|_doc` in
  `deploy/siem` → nur `wazuh_manager.conf:292 <node_type>`.
- Zwei Varianten, **Entscheidung vor Implementierung** (Belege jeweils vollständig):
  - **(a) `<localfile>` am Manager** — ein neuer Block neben `:231/:237/:244`, `log_format=json`,
    `<location>/var/log/falco/jimesh-events.json</location>` (Pfad aus
    `deploy/siem/docker-compose.yml:228`, Volume `:285`/`:331`).
    Vorteil: Manager-Decoder/Regeln greifen. Nachteil: Falco-Format braucht Decoder, und es gibt
    **kein einziges eigenes Decoder-/Rule-XML im Repo** (Glob `deploy/siem/**/*.{xml,json,yml,yaml}`
    → nur ISM/Indexer-Konfig), Mount ist ausschließlich `ossec.conf` (`docker-compose.yml:89`).
  - **(b) Direkt indizieren** — Shipper schreibt per Bulk gegen `127.0.0.1:19200`
    (`docker-compose.yml:119-122`, loopback-only nach Mandat 12, im Compose-Netz `wazuh.indexer:9200`,
    `:65`). Vorteil: kein Decoder-Baum. Nachteil: umgeht Regeln.
- Bridge-Route bleibt unangetastet (`JIMESH_SIEM_INGEST_URL` `:312`, `sdklogs.go:68`,
  `shipper.go:65-66`) — WP2 ist eine **Zusatz**-Zielsetzung, kein Ersatz für `sdk_logs`.

### Acceptance

- [ ] mind. 1 Falco-Ereignis ist per `curl` im Indexer sichtbar (`/_search` auf `wazuh-alerts-*`
      bzw. dem gewählten Pattern), `_id`/`_index` dokumentiert.
- [ ] ISM-Retention greift weiter (gleicher Policy-Pfad), `apply-retention.sh` läuft unverändert durch.
- [ ] Start-Verhalten ehrlich: ohne Indexer kein Crash der Bridge (fail-soft, Log-Begründung).

### Offene Entscheidung (Operator)

- (a) vs. (b) — Empfehlung: **(a)**, weil damit das Stock-Ruleset
  (`wazuh_manager.conf:250-265`, `rule_exclude 0215-policy_rules.xml`) ohne Neubau greift.

---

## WP3 — `security_events`-Mapper (WP2-Delta aus TASK-054)

### Was

Falco/Wazuh-Ereignisse werden gemappt in die Tabelle, die Security-Overview bereits liest.

### Konkret

- Schreib-API steht: `src/backend/internal/store/security_events.go:192-202`
  `RecordSecurityEvent`, Schema `:169-187` (`direction/event_type/scanner/verdict/detail/status`),
  angelegt aus `store/store.go:498`.
- Lese-Seite läuft: `security/security.go:55` (`GET /api/security/events`) → `security/freeze.go:299`;
  Zähler `store/store.go:2163`.
- Der Mapper kommt an denselben Choke-Point wie WP1 (`falco.go:187`) bzw. an der
  Wazuh-Zeile in `cmd/siem-bridge` — **eine** Stelle, kein zweites Ship-Interface.
- Regeln, die bereits existieren und respektiert werden müssen:
  - `subagents/feedback.go:41` — Alias-Allowlist `wazuh|falco|checkov`; `:37-38`
    „audit-ERROR rows with any other alias are left alone".
  - `store/sdk_logs.go:117-121` `fireAuditCritical` (nur `type=audit && level=ERROR`).
  - `gateway/threat_correlation.go:19-21,127-131` liest bereits `alias=falco, type=audit`
    zurück — der Mapper darf dieses Mapping nicht sprechen.
- Level-Mapping liegt in `siem/transform.go:136-145` (`falcoLevel`: Notice/Informational/Debug → INFO,
  Policy-Kommentar `:17`) — der Mapper erbt sie, erfindet keine zweite Skala.

### Acceptance

- [ ] ≥1 Falco- und ≥1 Wazuh-Ereignis als `security_events`-Row vorhanden, sichtbar unter
      `GET /api/security/events`.
- [ ] bestehende Guard/Quarantine-Schreiber unverändert (keine Schema-Änderung, kein ALTER).
- [ ] `threat_correlation`-Abfrage liefert identische Trefferzahl vor/nach dem Mapper (Regressionstest).

---

## WP4 — AD-Detector im Wazuh-Indexer (ML-Runtime freigegeben)

### Was

Der Indexer hat die Plugins, aber **0 Detektoren / 0 Monitore** — das ist die eigentliche
Lücke hinter „Network-Anomaly" und „Paranoia Alerting (S177)".

### Konkret

- Wazuh-Indexer = OpenSearch-Fork, `wazuh/wazuh-indexer:4.14.7` (`docker-compose.yml:105`),
  **17 Plugins** inkl. `opensearch-anomaly-detection` und `alerting` — beides ist installiert,
  nichts davon konfiguriert.
- `internal/opensearch` als Klient **nicht** aktivieren (toter Code, soweit kein Caller
  existiert — siehe §0). Der Detector wird **am Indexer selbst** definiert
  (Index-Sample aus WP2, `backend`-Job mit `anomaly_detection`-Feature).
- ML-Runtime ist freigegeben — Konsequenz: Modell-Lauf/Training darf lokal im Indexer erfolgen,
  kein Drittdienst, keine neue Dependency im Go-Tree (Freigabe „alles" betraf Deploy/Stack,
  nicht die Regel „keine neuen Dependencies ohne Nennung").
- Alerting-Ausgang: an `deploy/grafana/dashboards/threat-detection.json` anbinden, soweit es
  ein Prometheus-Target akzeptiert; ansonsten ehrlich als „Indexer-Alert, kein Dashboard-Pfad"
  dokumentieren (`deploy/grafana/README.md:296` führt genau diese Ehrlichkeit schon vor).

### Acceptance

- [ ] ≥1 aktiver Detector mit `LastSuccessfulRun` (gemessen, nicht „aktiv behauptet").
- [ ] ≥1 erzeugter Alert nachweisbar (Index/Zeitstempel im Sprint-Dok).
- [ ] keine neue Go-Dependency (`git diff go.mod` leer).

---

## §7 Reihenfolge

WP1 → WP3 (beide am selben Choke-Point, WP1 zuerst, weil WP3 sonst Rauschen mitschreibt)
→ WP2 → WP4 (WP4 braucht WP2-Daten).

## §8 Bewusst NICHT im Scope

- **Toter OpenSearch-Code wird nicht „fertiggebaut"** — SPRINT-33-Entscheidung „Approach D/BYOL"
  steht in `deploy/siem/README.md:278-285`. Erst wenn WP2 beweist, dass der bestehende
  Indexer reicht, wird über einen zweiten OpenSearch-Dienst geredet.
- **Kein Loki/Falcosidekick-Austausch der Bridge**, obwohl freigegeben — der laufende
  `siem-bridge`-Pfad ist live verifiziert (TASK-054) und der Sprint zielt auf Rauschen +
  Mapper, nicht auf einen Austausch der Transportebene. Loki/Falcosidekick bleibt damit
  **freigegebene Option für einen Folge-Sprint**, hier nur als Entscheidung vermerkt.
- **SquadMesh wird nicht angefasst.**

## §9 Offene Fragen an den Operator

1. WP2(a) `<localfile>` vs. WP2(b) Direkt-Index — Empfehlung (a).
2. Soll `metrics-snapshot` künftig *gar nicht* mehr in `sdk_logs` landen oder als eigener
   `type=metric`-Raum (dann bräuchte `sdklogs.go:163-166` eine Type-Erweiterung, heute nur
   `audit|agent|app` und sonst 400)?
