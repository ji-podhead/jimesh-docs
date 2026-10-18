# SPRINT-152 — Email/Notification-System (Phase 5 aus SPRINT-149)

**Status:** ✅ Erster Cut gebaut (Build-Agent, 28.9. Nacht) — SMTP-Kanal + Threat-Correlation-Trigger +
Sidebar-Tab, konservativ eng gescoped (siehe Build Report unten). NICHT committed/gepusht, kein Redeploy.
Design-Ansatz in `docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md`, Abschnitt 8.2.

## Auftrag, verbatim (Operator, 28.9.)

> "dazu hat so ein agent gerade ein feature register und health check für services gebaut ist aber
> noch nicht fertig [...] dann fehlt immer noch secrets als eigenes ding [...] wichtig sind auch
> notifications für alles [...] wäre es gut wenn wir auch ein email tab hätten in der sidebar auch
> einfach das wir bei threats und anomalies einfach emails senden können"

## Was zu tun ist

1. Kein SMTP/Email/Webhook-Kanal existiert im Backend — komplett neu.
2. Generisches Notification-System (nicht nur Email) für: Threat-Detection-Alerts (SPRINT-147),
   Deploy-Ergebnisse, Security-Findings.
3. Email-Tab in der Sidebar (Operator-Wunsch, explizit).
4. Verbindung zu Threat-Response (SPRINT-144/147): bei Threat/Anomaly automatisch Email senden.

## Task-Tabelle

| Nr | Task | Status |
|---|---|---|
| S152-1 | Notification-Channel-Abstraktion (Backend) | [x] gebaut — `internal/notify/notify.go` |
| S152-2 | SMTP/Email-Provider-Integration | [x] gebaut — `internal/notify/smtp.go` (stdlib `net/smtp`, keine neue Dependency) |
| S152-3 | Trigger-Wiring: Threat-Detection → Email (SPRINT-147-Anschluss) | [x] gebaut — `handleThreatCorrelation` in `threat_correlation.go`, dedupliziert pro Pair/30min |
| S152-4 | Email-Tab in der Sidebar | [x] gebaut — `HierarchySidebar.tsx` (neben Secrets), `EmailNotificationsPage.tsx` (`/security/email`) |
| S152-5 | Generisches "Notifications für alles"-Konzept — Scope mit Operator klären, was genau
  benachrichtigt werden soll | [ ] weiterhin offen — Abstraktion ist generisch gebaut (siehe Build Report), aber NUR der eine Trigger heute Nacht verdrahtet; braucht Operator-Freigabe für den Rest des Umfangs |

## Build Report (Build-Agent, 28.9. Nacht)

### Scope-Annahme (dokumentiert, NICHT Operator-abgenommen — S152-5 bleibt offen)

Der Auftrag ("notifications für alles") wurde nie exakt gescoped. Konservative Entscheidung heute Nacht:

- **Ein** Channel gebaut (SMTP), **ein** Trigger verdrahtet (SPRINT-147 Falco+Suricata Threat-Correlation
  — der stärkste/ehrlichste Signal-Punkt: Fusion zweier unabhängiger Sensoren, nicht nur eine einzelne
  Detection). Deploy-Ergebnisse, andere Security-Findings: NICHT verdrahtet, obwohl der Auftrag sie nennt.
- Die Channel-Abstraktion (`internal/notify`) ist bewusst generisch (`Channel`-Interface, `Notification`
  mit offenem `Type`-Feld) — ein zweiter Channel (Webhook/Slack) oder ein zweiter Trigger lässt sich
  anschließen, ohne diesen Code neu zu schreiben. Das ist Architektur-Vorbereitung, KEIN Vorgriff auf die
  Scope-Entscheidung — es wird heute Nacht nur der eine Trigger tatsächlich aufgerufen.
- Config ist **env-var-only** (SMTP_HOST/PORT/USER/PASSWORD/FROM/TO), wie jede andere Integration in
  diesem Repo (HEADSCALE_URL/API_KEY, JIMESH_GRAFANA_*, OZONE_S3_*) — keine DB-gestützte Override, kein
  Formular zum Speichern (das wäre Mandate-2-widrig: ein "Save"-Klick über einen Wert, den das Backend gar
  nicht zurückschreiben kann). Die Sidebar-Seite ist daher READ-ONLY: Status ja/nein + die unkritischen
  Felder (Host/Port/From/Empfänger), nie das Passwort.
- Trigger-Punkt: `handleThreatCorrelation` (GET `/api/security/threat-correlation`) statt der
  threat-responder-ENFORCE-Aktion — Begründung: die Correlation ist die Fusion BEIDER Sensoren (Falco +
  Suricata), ein stärkeres Signal als eine einzelne Detection, und exakt der Punkt, den der Operator-Kontext
  nannte ("SPRINT-147's Falco+Suricata correlation"). Der Endpoint ist ein on-demand GET, vom Frontend alle
  30s gepollt (`threat-correlation-panel.tsx`) — ohne Dedup würde ein andauernder Incident alle 30s eine
  neue Mail auslösen. Deshalb: In-Memory-Dedup-Cache pro (Container, Falco-Timestamp, Suricata-Timestamp)
  mit 30-Minuten-TTL (`correlationNotifyCache`, `threat_correlation.go`) — ein Prozess-Neustart verliert das
  Dedup-Fenster, was höchstens eine zusätzliche Mail bedeutet, nie eine verpasste (bewusste
  Fail-Safe-Richtung). Der 30-Minuten-Wert ist NICHT operator-abgenommen.

### Backend

- **`src/backend/internal/notify/notify.go`** — `Channel`-Interface (`Name()`, `Send(ctx, Notification)
  error`), `Notification`-Struct (offenes `Type`, `Severity`, `Subject`, `Body`, `Metadata`), `Dispatcher`
  (fan-out an alle konfigurierten Channels). `Dispatch()` mit 0 Channels loggt ehrlich "would have notified,
  but no channel is configured" (Mandate 2) statt einen fake Sent zu melden. `isNilChannel` per `reflect`
  fängt den Go-Typed-Nil-Interface-Fallstrick ab (ein `(*SMTPChannel)(nil)` würde sonst als "konfiguriert"
  durchgehen — per Test abgesichert, siehe unten).
- **`src/backend/internal/notify/smtp.go`** — `SMTPChannel` (stdlib `net/smtp`, KEINE neue Dependency —
  `go.mod`/`go.sum` vor dem Schreiben geprüft, kein Mail-Package vendored). `NewSMTPChannelFromEnv()` liest
  `SMTP_HOST`/`SMTP_PORT` (Default 587)/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`/`SMTP_TO`
  (komma-separierte Empfängerliste) — mirrort `internal/network.NewHeadscaleClientFromEnv`s nil-safe Muster
  1:1 (gleiches Log-Verhalten bei fehlender Config). `Status()` liefert die passwortfreie Sicht für den
  Frontend-Statusendpoint.
- **`src/backend/internal/gateway/notifications.go`** (neu) — `GET /api/notifications/email/status`,
  registriert in `gateway.go:404` (neben der threat-correlation-Route, kollisionsfrei zu SPRINT-151s
  Dashboards-Änderungen). Immer 200, `s.smtpChannel.Status()` ist nil-safe.
- **`src/backend/internal/gateway/gateway.go`** — additive Änderungen (Server-Struct-Felder `notifier`,
  `smtpChannel`, `correlationNotifyCache`; Konstruktion in `New()` direkt nach dem bestehenden
  Headscale-Gate-Block, Route-Registrierung neben der threat-correlation-Zeile). Bewusst NICHT im gleichen
  Bereich wie SPRINT-151s parallel laufende `sdkdashboards`-Änderungen (verifiziert per `git diff` vor jeder
  Edit, siehe Kollisions-Hinweis im Auftrag).
- **`src/backend/internal/gateway/threat_correlation.go`** — `notifyThreatCorrelations` (Handler-Glue),
  `newCorrelationsToNotify`/`correlatedPairSignature`/`correlationNotifyCache`/`buildCorrelationNotification`
  als reine, testbare Funktionen (gleicher Stil wie die bestehenden `correlate`/`buildCorrelationNoteKey`).
  Aufruf direkt vor dem JSON-Response in `handleThreatCorrelation`.
- **`.env.example`**: NICHT geändert in diesem Durchlauf — die SMTP_*-Variablen fehlen dort noch. Das ist
  eine offene Lücke (siehe "Was noch fehlt" unten), keine bewusste Entscheidung.

### Frontend

- **`src/frontend/src/views/EmailNotificationsPage.tsx`** (neu) — `/security/email`. Read-only:
  konfiguriert → Host/Port/From/Empfänger (nie das Passwort — es existiert nicht mal im Wire-Format);
  nicht konfiguriert → ehrlicher Empty-State mit den Env-Var-Namen als Hinweis. Zusätzlich eine Karte mit
  dem einen verdrahteten Trigger und eine Karte mit der offenen Scope-Notiz (S152-5).
- **`src/frontend/src/components/sidebar/HierarchySidebar.tsx`** — neuer `NAVIGATION_ITEMS`-Eintrag
  `{ to: '/security/email', labelKey: 'nav.email', icon: Mail }`, direkt neben Secrets (Zeile ~316), exakt
  wie SPRINT-149 §5.3/§8.2 es vorgibt ("neben 'Secrets'"). `Mail`-Icon-Import ergänzt.
- **`src/frontend/src/App.tsx`** — Route `email` unter der bestehenden `/security`-Layout-Route, neben
  `secrets`.
- **`src/frontend/src/lib/query-keys.ts`** — `emailNotificationStatus`-Key ergänzt (Registry-Konvention).
- **i18n**: `nav.email` + `emailNotifications.*` (11 Keys) in `en.json` handgeschrieben, per neuem Script
  `src/frontend/scripts/add-sprint152-email-notifications-i18n.mjs` (Muster: bestehendes
  `add-sprint147-threat-correlation-i18n.mjs`, ehrlicher Englisch-Fallback statt maschinenübersetzter
  Strings) auf alle 60 Locale-Dateien propagiert.
- Bewusst NICHT angefasst: `section-nav.ts` (Top-Navbar-Registrierung) und `command-palette.tsx` — SPRINT-149
  §5a scopt den Nav-Platz explizit auf die Sidebar; eine zweite Registrierung (RM35-Dual-Pattern, wie bei
  anderen Einträgen üblich) wäre ein sinnvoller Folgeschritt, aber nicht Teil des heutigen Auftrags.

### Trigger-Punkt — Detail

`handleThreatCorrelation` (`internal/gateway/threat_correlation.go:303`) ruft nach `rep.Correlated =
correlate(...)` `s.notifyThreatCorrelations(r.Context(), rep.Correlated)` auf. Für jedes NEUE korrelierte
Paar (Dedup über `correlationNotifyCache`) wird `notify.Notification{Type: "threat_correlation", Severity:
"critical", ...}` mit den echten Falco-/Suricata-Feldern (Container, Timestamps, Rule/Signature, Summary)
gebaut und durch `s.notifier.Dispatch()` geschickt. Ohne konfigurierten Channel: ein Log-Eintrag
`"threat correlation on container %q — a notification WOULD have fired but no channel is configured"` —
niemals eine stillschweigend "erfolgreiche" Aktion.

### Verifikation

- `go build ./...` (Docker `golang:1.26-bookworm`, mit den vorhandenen `jimesh-gomod`/`jimesh-gobuild`
  Cache-Volumes) — **grün**, gesamtes Repo.
- `go vet ./...` — **grün**, gesamtes Repo.
- `go test ./internal/notify/... ./internal/gateway/...` — **grün** (11 neue Tests in `notify_test.go` +
  `smtp_test.go`, 9 neue Tests in `threat_correlation_test.go`).
- `go test ./...` (gesamtes Repo) — 2 vorbestehende Fehlschläge (`internal/ai`, `internal/service`), beide
  wegen fehlender Postgres-Verbindung (`127.0.0.1:5432 connection refused`) in dieser Sandbox — nicht durch
  diese Änderung verursacht, nicht in berührten Paketen.
- `npx tsc -p tsconfig.app.json --noEmit` — 472 Fehler nach dieser Änderung vs. 473 Baseline (Baseline per
  `git stash` isoliert gemessen); Diff zeigt ausschließlich Zeilennummer-Verschiebungen in
  `DashboardBuilderPage.tsx` (SPRINT-151s paralleler Edit) — **0 neue Fehler durch diesen Build**.
- `npx vitest run` (gesamte Suite) — 437 von 440 Tests grün. Die 3 Fehlschläge liegen in
  `MeshSquadChatEntry.test.tsx`, einer untracked Datei von SPRINT-151s parallel laufendem Agent (nicht Teil
  dieses Builds, nicht berührt). Alle 46 eigenen/berührten Tests grün: `EmailNotificationsPage.test.tsx` (4
  neu), `HierarchySidebar.test.tsx` (42, unverändert grün).
- `node scripts/check-i18n.mjs` — **grün zum Zeitpunkt dieses Builds** ("60 locales and 3231 keys", vor
  dem Anhängen dieses Reports erneut verifiziert). Eine spätere Ad-hoc-Prüfung zeigte 58 Fehlschläge für
  einen ANDEREN, nicht von diesem Build stammenden Key (`workspaces.noAppsInWorkspace`, nur in `en.json`
  vorhanden — per `git diff` verifiziert, dass dieser Key nicht Teil dieser Änderung ist): das ist
  SPRINT-151s parallel laufender Agent, der `en.json` zeitgleich editiert (gleiche Datei, kein von diesem
  Auftrag genannter Kollisions-Kandidat) und die Locale-Propagierung noch nicht nachgezogen hat. Alle
  `nav.email`/`emailNotifications.*`-Keys dieses Builds sind in allen 60 Locale-Dateien vorhanden und
  bestehen die Prüfung (per gezieltem Grep gegen den Fehlschlag-Output verifiziert) — der Fehlschlag ist
  nicht durch diesen Build verursacht und nicht in dessen Scope zu beheben.

### Was noch fehlt (offen für einen Folge-Build oder Operator-Entscheidung)

1. ~~`.env.example` fehlt der SMTP_*-Block~~ — nachgezogen (siehe unten, `.env.example` nach
   `HEADSCALE_URL`/`HEADSCALE_API_KEY`).
2. S152-5: Scope-Entscheidung, ob/welche weiteren Trigger (Deploy-Ergebnisse, andere Security-Findings)
   und weiteren Channels (Webhook, Slack) gebaut werden sollen — die Abstraktion trägt es, aber nichts
   davon ist heute Nacht verdrahtet.
3. `section-nav.ts`/`command-palette.tsx`: zweite Registrierung des Email-Eintrags (RM35-Dual-Pattern),
   falls der Operator die Top-Navbar/Command-Palette-Erreichbarkeit auch für diesen Tab will.
4. Kein manueller Live-Test gegen einen echten SMTP-Relay (kein SMTP-Server in dieser Sandbox verfügbar) —
   `smtp_test.go` deckt die Logik über einen Test-Seam (`sendMailFunc`) ab, nicht den echten TCP-Handshake.
5. Die 30-Minuten-Dedup-TTL ist eine begründete, aber nicht operator-abgenommene Wahl.

