# WP0 — Severity-/Paranoia-Modelle: Vergleich & Entscheidungsvorlage

**Sprint:** `docs/sprints/SPRINT-177-PARANOIA-LEVEL-ALERTING.md` · Status: Recherche fertig, **Entscheidung offen (Operator)**
**Datum:** 1.10.2026 · Quellen unten gelistet · kein Code, kein Deploy

---

## 1. Das zentrale Ergebnis: drei Achsen, die man nicht vermischen darf

Der Operator nennt „verbosity level für Alarme" und „paranoia level". Recherche zeigt: die
bekannten Frameworks trennen dafür **drei orthogonalen Achsen**, die in der Praxis ständig
zusammengewürfelt werden — und genau das ist die Ursache, warum Leute „Paranoia Level" als
„wie laut bellt der Alarm" missverstehen:

| Achse | Frage | Wer das so macht |
|---|---|---|
| **A. Paranoia Level (Abdeckung)** | **Welche** Prüfungen laufen überhaupt? (mehr Regeln = mehr Detektion, mehr False Positives) | OWASP CRS `paranoia level` PL1–PL4 |
| **A2. Blocking vs. executing** | Welche Prüfungen **dürfen blockieren/alarmieren**, welche laufen nur mit und werden getuned? | OWASP CRS: `blocking PL` vs. `executing PL` |
| **B. Severity (Schweregrad)** | Wie schlimm ist **dieses eine** Event? | CRS `CRITICAL/ERROR/WARNING/NOTICE` (Score 5/4/3/2), Datadog `Info→Critical`, Suricata `severity 1–3` |
| **C. Threshold (Schwelle je Kanal)** | Ab welcher Schwere **meldet** welcher Kanal? | Wazuh `log_alert_level` (Default **3**) vs. `email_alert_level` (Default **12**) |

Dazu zwei Regelungsmechanismen, die das Ganze erst benutzbar machen:

- **Exclusions (Tuning ohne Global-Aus):** CRS `SecRuleRemoveById/Tag`, `ctl:ruleRemoveTargetById`
  — Regel bleibt erhalten, wird nur an *einer Stelle* abgeschaltet.
- **Suppression / Dynamic Severity (Kontext statt Global):** Datadog „suppression rules" (hindern
  ein Signal an der Erzeugung) und „Dynamic Severity" (Schwere **pro Asset** ±1 Stufe, bei
  Mehrfach-Regeln gewinnt die höhere — es wird nie zweimal erhöht).

**Übersetzt auf unser Problem:** Dein „Port nur über Cloudflare Tunnel erreichbar" ist exakt
*Dynamic Severity + Exclusion mit Kontext* — kein Ausschalter. Und „was gilt als kritisch" ist
*Achse C*, nicht Achse A.

---

## 2. Framework-Vergleich (nur belegte Fakten)

| Framework | Modell | Frei? | Für uns relevant |
|---|---|---|---|
| **OWASP ModSecurity CRS 3.x** | PL1–PL4 (**Welche Regeln laufen**) + Severity CRITICAL/ERROR/WARNING/NOTICE mit Anomaly-Scores 5/4/3/2 + Threshold (empfohlen 5); **blocking vs. executing PL** | ✅ MIT | **Namens- und Konzept-Vorbild** + das blocking/executing-Duplex-Modell für unser „beobachten statt stören" |
| **Wazuh 4.14** | Regel-Level **0–16** (0 = *Ignored*, explizit zum Wegdrücken von False Positives), Threshold **je Kanal** (`log_alert_level` 1–16 Default 3, `email_alert_level` Default 12), Regeln können mit `alert_by_email`/`no_log`/`noalert` ausbrechen | ✅ GPLv2, keine Agenten-/Volumen-Grenze | Genau die „Schwelle pro Kanal"-Semantik, die wir für Benachrichtigungen brauchen; Mindest-Size laut Quickstart 4 vCPU/8 GiB/50 GB (1–25 Agents) |
| **Suricata** | `severity` 1/high – 3/info + Aktion `alert/log/drop`, Regeln mit `event_type` | ✅ (Deployment bei uns schon vorhanden) | Quelle für Netz-Ereignisse, Severity-Feld direkt übernehmbar |
| **Datadog Cloud SIEM/ASM** | 5 Severity-Stufen `Info/Low/Medium/High/Critical` (intern 0–4); **Suppression Rules** gegen Noise; **Dynamic Severity** pro Asset (±1 Stufe, höhere gewinnt); Alerts via Slack/Jira/E-Mail/Webhook | ❌ ~$2–5/GB ingested (Commitments), Self-Hosted keine Option | **Nur Konzept kopieren** (Suppression + Dynamic Severity) — Volumen-/GB-Preise sind für uns kein Modell |
| **Elastic Security (Basic)** | ECS-`severity` + `risk_score`, prebuilt ATT&CK-Rules, ML/Case erst Platinum | ✅ Basic self-hosted | Schema-Referenz (ECS) für unser Log-Neuplanungs-Schema |
| **Graylog Open** | **kein Alerting, keine Korrelation, kein Sigma** — alles bezahlt (Security ab ~$18k/a) | ⚠️ SSPL, ohne Alarmierung nutzlos | Warnung: nicht als „freie SIEM" missverstehen |
| **OpenSearch Security Analytics** | ~2.200 fertige Sigma-Regeln + **freie Alerting-Engine** | ✅ Apache 2.0 | Einzige freie Kombi „Sigma-Regeln + Alarmierung out of the box" |
| **Security Onion 3** | Suricata + Zeek + Wazuh + Elastic gebündelt | ⚠️ Lizenz Elastic 2.0, Standalone **24 GB RAM** | Zu schwer für unsere Node-Größen |
| **Grafana Loki** | Label-Query, **kein** Parser/keine Korrelation/kein ATT&CK, Alerting nur über Alertmanager-PromQL | ✅ AGPLv3, monolithisch bis ~20 GB/Log-Tag | Nur als Log-Speicher — wir haben bereits Grafana |

**Datadog und Konsorten — Urteil:** Konzepte (Suppression, Dynamic Severity, Signal-Dedupe,
Playbooks) sind das Wertvolle, das Lizenzmodell nicht. Wir bauen die Mechanik, benennen die
Felder aber kompatibel (ECS/Datadog-Severity-Namen), damit ein späterer Import nichts kostet.

---

## 3. Vorschlag für JiMesh (zur Entscheidung)

**Kein neues Produkt.** Wir haben bereits: SIEM-Stack (`deploy/siem`, live auf trading),
Falco/Tetragon (eBPF), Suricata (gated), Grafana, Security-Events-API + Notifications im Frontend.
Was fehlt, ist **das Modell** — nicht die Software.

Vier-Schichten-Vorschlag:

1. **Severity-Enum** `info|low|medium|high|critical` (Datadog-Namen, ECS-`severity`-kompatibel)
   — Pflichtfeld **jedes** Events, inkl. SSH.
2. **Paranoia Level P1–P4** = *Welche Prüfungen* laufen (z.B. P1: fehlgeschlagene SSH-Logins;
   P2: + unbekannte Quell-IP/kein Tailscale-Peer; P3: + kein RBAC-Match + Datenzugriff-Volumen;
   P4: + proaktiv-sperrende Aktionen). Global default, Override pro **User/Node/Port**.
   **Daneben** `enforcing: false|true` (CRS blocking vs. executing) — auf `false` laufen höhere
   Stufen mit, fluten aber keinen Alarm.
3. **Thresholds je Kanal** — analog Wazuh: „Dashboard ab medium, E-Mail ab high, Telegram ab
   critical" — ein Regler pro Kanal, nicht ein globaler Schalter.
4. **Exception-Registry mit Kontext** — Ziel + Eigenschaft (Tunnel-only, WAF-davor, interner Peer)
   → **−1 Stufe** oder „nur loggen"; nie Global-Aus. Mehrfach-Regeln gewinnen wie bei Datadog
   die **höhere** Stufe (nicht kumuliert).

**SSH konkret:** jedes Event über unseren Pfad bekommt `user`, `auth_method`, `rbac_role`,
`source_ip`, `peer_is_tailnet`, `target_port`, `severity`; Nicht-Authentifiziert **oder** kein
RBAC-Match ⇒ mindestens `medium` (bei P≥2 `high`). Dazu Trace-Speicherung mit fester Retention.

**Log-Neuplanung (WP1):** ein einziges Event-Schema (ECS-Subset) statt N — `@timestamp`,
`source`, `event.type`, `event.severity`, `user.name`, `source.ip`, `rule.paranoia_level`,
`exception.id`. Kompatibel zu Sigma/Datadog-Import.

---

## 4. Quellen

- OWASP CRS Paranoia Levels — https://coreruleset.org/docs/2-how-crs-works/2-2-paranoia_levels/
- OWASP CRS Anomaly Scoring (Severity→Score 5/4/3/2, Threshold-Empfehlung 5) — https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/
- OWASP CRS False Positives & Tuning (Exclusion-Mechaniken) — https://coreruleset.github.io/documentation/2-how-crs-works/2-3-false-positives-and-tuning/
- Wazuh Rules Classification (Level 0–16, 0 = Ignored) — https://documentation.wazuh.com/current/user-manual/ruleset/rules/rules-classification.html
- Wazuh Alert Management (`log_alert_level`/`email_alert_level` Defaults 3/12) — https://documentation.wazuh.com/current/user-manual/manager/alert-management.html
- Datadog Security Signals (5 Severity-Stufen, Incident SEV-1–5) — https://docs.datadoghq.com/security/application_security/threat_protection/security_signals.md
- Datadog Dynamic Severity (pro Asset ±1, höhere gewinnt) — https://docs.datadoghq.com/security/cloud_siem/detect_and_monitor/dynamic_severity.md
- Datadog Suppression/Noise — https://docs.datadoghq.com/security/cloud_siem/detect_and_monitor.md
- OS-SIEM-Vergleich 2026 (Wazuh/Elastic/Security Onion/Graylog/OpenSearch, Hardware & Lizenzen) — https://threatclaw.io/en/blog/open-source-siem
- Open Source SIEM 2026 (Loki: kein SIEM; Graylog Open: kein Alerting) — https://cyber-tools.net/blog/top-5-open-source-siem-tools-2026-wazuh-security-onion-ossec-elk-loki
- SIEM Tools Compared 2026 (Preise Datadog/Elastic/Graylog pro GB) — https://defend.network/compare/siem-tools.html
