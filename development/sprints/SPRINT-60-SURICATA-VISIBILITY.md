# SPRINT-60 — Suricata sichtbar machen (Network-IDS-Panel, ehrlicher SSH-Reader)

**Status:** 🔄 in Arbeit (28.9.2026, Suricata-Integration-Build-Agent) — Retrospektive unten wird
erst nach Verifikation ausgefüllt (Mandat: nur was gegen den Code verifiziert ist).

**Auslöser (Operator, 28.9.):** Das Dashboard zeigt NICHTS für Network Monitoring, obwohl
Suricata 7.0.3 auf dem Trading-Host läuft (apt-Host-Install, af-packet auf eth0, systemd active
+ enabled, `/var/log/suricata/eve.json` wächst). Kein jimesh-Backend liest Suricata, keine
Frontend-Fläche existiert. Gleichzeitig SSOT-Forderung: bestehende Fläche erweitern, keine
zweite bauen.

## Plan (vor Code — Dokumentations-Mandat)

**Ziel:** Der Klick auf „Network Monitoring" (`/networks`, `sidebar.networkMonitoring`) zeigt
echte Suricata-Daten des Trading-Hosts: Service-Status-Badge, echte Capture-Volumen, letzte
Alerts, ehrliche Leer-/Fehlerzustände. Kein Mock, keine erfundenen Zähler (Mandat 2).

**Flächen-Entscheidung (Schritt 1 der Aufgabe):** Die „Network Monitoring"-Fläche, die der
Operator offen hat, ist `/networks` (HierarchySidebar `sidebar.networkMonitoring` →
Events & Observability-Sektion; zweites Nav-Register: `section-nav.ts`). Diese Seite ist heute
rein Headscale (Mesh-Tabellen, Pre-Auth-Keys, ACL). Das Suricata-Panel wird als zusätzliche
Sektion **in** `/networks` eingebaut — KEINE neue Route/Seite, KEINE Nav-Änderung nötig
(`/networks` ist bereits an beiden Nav-Registern registriert), keine Duplikat-Fläche.

**Work Packages:**

- **WP1 Backend** `internal/gateway/suricata.go`: `GET /api/suricata/status` — EIN
  SSH-Roundtrip (Marker-Skript), alles read-only. Credential-Modell exakt wie
  `/api/projects/{id}/ports` (`internal/security/exposure.go`): Query-Params
  (`host`, `port`, `user`, `password`, `keyPem`, `authMethod`, `limit`) gewinnen, sonst
  globale Settings `ssh_host`/`ssh_user`/`ssh_password`/`ssh_key_pem`, sonst
  `ssh_endpoints`-Registry (erster Endpoint, nur non-secret Felder). Ohne Target → 400;
  SSH-Fehler → 502 mit echter Meldung. Route-Registration NICHT in `gateway.go` (anderer
  Agent editiert die Datei gerade) — Zeilen gehen an den Parent (Build-Report).
- **WP2 Backend-Tests** `suricata_test.go`: reine Parse-/Resolve-Tests (überall lauffähig)
  + Routen-Test nach `settings_dlp_test.go`-Muster (echter Store, Skip ohne Postgres,
  SSH via Package-Var-Seam gestubb, nie echtes SSH).
- **WP3 Frontend** `components/networks/suricata-ids-panel.tsx` + Einbau in `NetworksPage.tsx`
  (render + invalidate in `refresh()`). Status-Badge, Capture-Stats, Alert-Tabelle,
  ehrliche 0-Alert-/Fehler-/400-Zustände. Inertes Rendering der Signatur-Strings (5.9.-Präzedenz).
- **WP4 i18n**: `network.suricata.*` in en + de handgesetzt, 59 weitere Locales mit
  Englisch-Fallback (bestehende Präzedenz, z. B. `sidebar.networkMonitoring`), `check:i18n` grün.
- **WP5 Tests/Verification**: vitest fürs Panel; tsc ≤ 477 Baseline; go build + vet via
  golang-Container; go test (echter Store via Throwaway-DB-Muster).
- **WP6 Docs**: API_DOCS.md-Routeneintrag, dieser Sprint-Spiegel im Backlog.

**Abnahme-Kriterien:**

1. `/networks` zeigt das Suricata-Panel mit echten Daten vom Trading-Host (sobald die
   Route registriert + SSH-Credentials dem Backend bekannt sind).
2. Alle Zustände ehrlich: kein Target → 400-Meldung im Panel; SSH-Fehler → echte 502-Meldung;
   0 Alerts → „keine Alert-Events in der aktuellen eve.json"; 0 Signaturen → Warnhinweis
   „keine Regeln geladen — kein Alert kann feuern" (live am Trading-Host verifiziert:
   Neustart 01:48 UTC mit leerem Regelsatz).
3. Keine Nav-Änderung an `section-nav.ts` / `HierarchySidebar.tsx` (anderer Agent besitzt die Dateien).
4. tsc-Baseline (477) nicht schlechter; `check:i18n` PASS; go build/vet/test grün.

## Retrospektive — was tatsächlich gebaut & verifiziert wurde (28.9., Build-Agent)

- **WP1 [x]** `internal/gateway/suricata.go` (NEU): `GET /api/suricata/status` — EINE echte
  SSH-Session (deploy.DialSSH, TOFU), EIN read-only Marker-Probe, ehrliches Parsing
  (installiert/nicht installiert, 0 Alerts = echte Null, 0 Signaturen + echte Warnzeile,
  ungelesene Zähler = null). Credential-Kaskade exakt wie `/api/projects/{id}/ports`.
  Registration-Zeile NICHT in gateway.go (anderer Agent) — im Build-Report für den Parent.
- **WP2 [x]** `suricata_test.go` (19 Tests: Resolver-Kaskade, Probe-Parser, Route via
  echtem Store + gestubbten SSH-Seams) + `suricata_live_test.go` (opt-in Live-Smoke,
  default SKIP).
- **WP3 [x]** `components/networks/suricata-ids-panel.tsx` + NetworksPage-Wiring
  (Import, Panel unter der Machines-Tabelle, invalidate in refresh()).
- **WP4 [x]** i18n: 37 Keys `network.suricata.*` — en+de handübersetzt, 58 weitere
  Locales English-Fallback (chirurgische Einfügung, Rest byte-identisch).
  `check:i18n` PASS (60 Locales, 3058 Keys).
- **WP5 [x]** Verifikation: `go build ./...` + `go vet ./...` + volle Gateway-Tests grün
  (im Scratch-Worktree — der Shared-Tree hat eine FREMDE, in-flight kaputte Datei,
  node_services.go; nicht angefasst, Mandat: fremde Dateien unberührt); **Live-Smoke
  gegen trading PASS** (aktiv, 7.0.3, eve.json wächst, 1.089.379 kernel_packets,
  0 Signaturen + Warnung, 0 Alerts — echt); tsc 474 (Baseline 477, 0 Fehler in meinen
  Dateien); vitest Panel 6/6 + angrenzend FirewallRules 4/4 + HierarchySidebar 36/36.
- **WP6 [x]** API_DOCS-Abschnitt „Network IDS — Suricata“; BACKLOG-Spiegel im
  Build-Report (Backlog-Datei hat fremde uncommittete Änderungen — Parent trägt ein).
- **Bewusst offen:** gateway.go-Registration + curl-Smoke am laufenden Stack (Parent,
  nach Landung des anderen Agenten); Regel-Installation auf trading ist Sensor-Seite,
  keine jimesh-Lücke (0 Signaturen = kein Alert kann feuern — Warnung steht im Panel).

Vollständiger Bericht: `/home/ji/projects/ihc24/BUILD-2026-09-28-SURICATA-INTEGRATION.md`
