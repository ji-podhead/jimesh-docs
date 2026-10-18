# SPRINT-190 — Threat-Action: vom gemeldeten Ereignis zur Handlung (Falco → Response)

**Datum:** 7.10.2026 · **Status:** dokumentiert, nicht umgesetzt
**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"
**Freigabe (verbatim, pauschal):** „ alles" — u. a. falco-talon, Mandat-12-Pfade
**Recherche:** Subagent-Lauf, Belege `Pfad:Zeile`, Stand `main` = `21cee130`

---

## §0 Warum — die Kette bricht zwischen Meldung und Handlung

Der Stack **meldet** zuverlässig und **handelt** praktisch nie. Die Lücke ist an drei Stellen
gleichzeitig messbar:

1. **Null Response-Werkzeuge im Repo.** Suche `falco-talon`, `falco-actions`, `falcosidekick`
   über das gesamte Repository → **0 Treffer**. Es ist also nicht „konfiguriert und aus",
   es ist nie eingebaut.
2. **Wazuh Active-Response ist auskommentiert.** `deploy/siem/config/wazuh_cluster/wazuh_manager.conf:224-228`
   enthält den Block `<!-- active-response -->` mit Platzhaltertext („active response options here").
   Die **Befehle** darunter sind vollständig definiert (`:183-222`: `disable-account` `:184`,
   `restart-wazuh` `:190`, `firewall-drop` `:195`, `host-deny` `:201`, `route-null` `:207`,
   `win_route-null` `:213`, `netsh` `:219`) — es fehlt nur der Aktivierungsschalter.
   Dass Wazuh die eigenen Aktionen protokolliert, ist ebenfalls gesetzt:
   `:305-309` liest `/var/ossec/logs/active-responses.log` (log_format=syslog).
3. **Der Responder sieht nur Suricata.** `cmd/threat-responder` (S144) verarbeitet
   **ausschließlich** `eve.json`-Events mit dem harten SID-Fenster 8000000-99
   (`deploy/threat-responder/`) — **kein Falco-Tag, kein Falco-Pfad**. Falco-Ereignisse erreichen
   ihn physisch nicht.

Dazu: die sechs Falco-Regeln tragen **keine Response-Aktion**
(`deploy/siem/config/falco/jimesh_rules.yaml:71,100,133,153,175,194`; Prioritäten
`:92,123,146,164,190` = WARNING, `:207` = CRITICAL) und dank `-r` (`docker-compose.yml:215-216`)
sind sie das **einzige** Ruleset.

**Zwei Doku-Fehler, die dieser Sprint korrigiert:**

- `docs/backlog/BACKLOG.md:1964` führt in der Spalte *Implemented & Merged* u. a.
  „Threat Responder" — Code ja, **Betrieb nein**: `BACKLOG.md:485` (S144-5) steht weiterhin auf
  „[ ] offen — Operator: `make redeploy SERVICE=threat-responder NODE=trading`".
- Die Behauptung „Paranoia Alerting (S177)" als geplant ist korrekt, aber die **Handlungsseite**
  fehlt in der Tabelle komplett — sie wird mit diesem Sprint als eigene Zeile sichtbar.

## WP1 — Wazuh `<active-response>` scharf schalten

### Was

Der auskommentierte Block wird echte Konfiguration — mit dem kleinstmöglichen Schritt.

### Konkret

- `wazuh_manager.conf:224-228` entkommentieren und mit **einer** ausgewählten Regel verdrahten
  (Empfehlung: `firewall-drop` `:195`, weil der Befehl definiert und localfile-ausgewertet ist).
- Config-Änderung **nur** über den SIEM-Deploy-Pfad, damit der Mount greift
  (`docker-compose.yml:89` mountet `ossec.conf`, die einzige Konfigurations-Datei im Stack).
- Wirkungsprobe: Aktion muss in `/var/ossec/logs/active-responses.log` auftauchen
  (`wazuh_manager.conf:305-309`) — **das ist der Nachweis**, nicht „der Block steht drin".
- Start-Reihenfolge unbedingt respektieren: `<global>` `<logall>no` / `<logall_json>no`
  (`:5-6`) bleibt unangetastet (kein JSON-Dump nach `archive.json`).

### Acceptance

- [ ] `docker exec jimesh-siem-manager … grep -c '<active-response>' /var/ossec/etc/ossec.conf` ≥ 1 (auskommentiert = 0).
- [ ] Ein erzeugter Test-Alert erzeugt einen Eintrag in `active-responses.log` (gemessen).
- [ ] Manager startet fehlerfrei (`docker ps` healthy), keine Regel-XML-Neuerfindung —
      es gibt **kein einziges eigenes Decoder-/Rule-XML im Repo** (Glob-Negativbefund).

---

## WP2 — Falco → Response-Weg (falco-talon / falcosidekick, freigegeben)

### Was

Falco bekommt einen Ausgang für Aktionen, ohne dass dafür die laufende Bridge beschädigt wird.

### Konkret

- **Freigegeben** sind falco-talon / falcosidekick; im Repo ist **nichts davon vorhanden**
  (0 Treffer) → Neubau im Stack, nicht „umschalten".
- Integration so, dass der bestehende `file_output`-Pfad unberührt bleibt:
  `docker-compose.yml:224-228` (`file_output.enabled=true`, `keep_alive=false`,
  `filename=/var/log/falco/jimesh-events.json`) ist die Quelle des **laufenden**
  Tailers (`internal/siem/falco.go:13-15`, `bridge.go:170` `JIMESH_FALCO_EVENTS_FILE`,
  `:211-213` Start-Refuse ohne Quelle). Ein zweites Output neben `file_output` darf diesen
  Pfad nicht leeren — das wäre ein Regressionsrisiko für die gesamte `sdk_logs`-Ingest.
- Antwortmodus **zwei Stufen**, analog zum bestehenden Responder-Design
  (S144-2: `DETECT=logged_only` / `ENFORCE=disconnect-all-then-pause`):
  1. `logged_only` — Aktion wird protokolliert, nichts ausgeführt.
  2. `enforce` — erst nach Operator-Flip, Flip im Runbook dokumentiert.
- Rauschen-Gate aus S188 **vor** dem Response-Pfad: 99,7 % der Falco-Zeilen sind
  `metrics-snapshot` (`metrics.interval=15s`, `docker-compose.yml:249`). Wer darauf reagiert,
  würde sonst alle 15 s „reagieren".

### Acceptance

- [ ] ≥1 Falco-Regel-Treffer erzeugt einen **sichtbaren** Response-Eintrag (Modus 1, `logged_only`).
- [ ] `sdk_logs`-Ingest unverändert: Bridgestart ohne `JIMESH_FALCO_EVENTS_FILE`-Refuse,
      Zähler vor/nach identisch (Regression).
- [ ] `metrics-snapshot`-Zeilen lösen **keinen** Response aus (Negativprobe).
- [ ] Enforce-Modus ohne Operator-Flip nicht erreichbar.

---

## WP3 — `threat-responder` deployen + Falco-Signal dorthin (Mandat 12)

### Was

Der fertige Responder (S144-1..4) geht in Betrieb und bekommt einen Falco-Pfad.

### Konkret

- **Offener Deploy** (`BACKLOG.md:485`): `make redeploy SERVICE=threat-responder NODE=trading`,
  IaC liegt fertig unter `deploy/threat-responder/` (gated, `fail-closed` prereqs,
  `suricata -T` vor jedem Reload, LIVE-PROBE am Ende — S144-3).
- **Mandat 12** ist im Runbook bereits als Anforderung formuliert
  (`deploy/threat-responder/README.md:20-21`) und vom Stack her vorgegeben: alle
  published ports binden `127.0.0.1` (`deploy/siem/docker-compose.yml:40-41`,
  `:60-63` Manager, `:119-122` Indexer, `:162-163` Dashboard). **Die Freigabe „Mandat-12-Pfade"**
  bedeutet hier: der Deploy darf diese Loopback-Pfade nutzen, ohne dass jede Freigabe neu
  abgefragt wird.
- **Falco→Responder:** Sidebar-Kanal statt `eve.json`-Mischung — der Responder arbeitet mit
  hartem SID-Fenster 8000000-99, Falco-SIDs sind strukturell etwas anderes. Sauberer Weg:
  eigener Eingang im Responder (Neues Fenster, klare Herkunftsmarkierung), **nicht** das
  Suricata-Fenster aufweiten — sonst kippt die zentrale Sicherheitsannahme von S144-2
  („hartes SID-Fenster").
- ENFORCE-Flip erst nach WP3-Durchlauf im `logged_only`-Zustand.

### Acceptance

- [ ] `record-deploy`-Eintrag für `threat-responder` mit `ansibleRc=0`.
- [ ] LIVE-PROBE des IaC-Endes dokumentiert (Antwort bzw. Log-Auszug im Sprint-Dok).
- [ ] ≥1 Falco-Ereignis erreicht den Responder (eigener Eingang), ≥1 Suricata-Ereignis weiterhin (Regression).
- [ ] Kein extern erreichbarer Port (Loopback-Check gemessen, nicht angenommen).

---

## WP4 — Doku-Korrektur im BACKLOG

### Was

`BACKLOG.md:1964` und `:485` sagen die Wahrheit über Betrieb vs. Code.

### Konkret

- `:1964` Security-Zeile: „Threat Responder" als *Implemented & Merged* bleibt nur mit
  Zusatz „Code/IaC gemergt, **Betrieb offen — S190**" stehen.
- `:485` (S144-5) bekommt den Verweis auf diesen Sprint, statt als lose Zeile zu stehen.
- Neuer `## Sprint-Spiegel S190` an der Spitze der Datei (neuester zuerst).

### Acceptance

- [ ] Keine Zeile behauptet Betrieb ohne `record-deploy`-Eintrag.

---

## §7 Reihenfolge

S188-WP1 (Rauschen) → WP2 (Wazuh AR, kleinster Hebel) → WP3 (Responder-Betrieb + Falco-Pfad)
→ WP2-Falco (Response-Kanal) → WP4.

## §8 Bewusst NICHT im Scope

- **Keine neuen Falco-Regeln** über die sechs bestehenden hinaus (eigenes Ruleset, `-r`-Effekt beachten).
- **Keine Erweiterung des SID-Fensters** 8000000-99 im Suricata-Zweig.
- **SquadMesh** unberührt.
- **Threat-Responder-Regeln liegen nicht im Suricata-Tab** (S189-WP2, Trennung der Rollen).

## §9 Offene Fragen an den Operator

1. WP1: `firewall-drop` (Empfehlung) oder `disable-account` als erste Active-Response-Regel?
2. WP3: NODE für den Deploy = `trading` (so in `BACKLOG.md:485` notiert) — bestätigen?
3. Enforce-Flip: erst nach wie vielen Tagen `logged_only`-Betrieb?
