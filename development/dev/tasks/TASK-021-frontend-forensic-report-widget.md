# TASK-021 — Frontend: Forensik-Report-Widget (Sprint 20 WP4)

**Backend fertig, live verifiziert, gemerged (main).** Diese Datei ist der
Frontend-Handoff für die parallele Session — `docs/tasks/` ist gitignored,
liegt nur lokal im Working Directory.

## Was das Backend liefert

`GET /api/security/report/{eventId}` (Session-gated wie jede `/api/*`-Route,
Bearer = Dashboard-Session oder Keycloak-Token — **nicht** der Gateway-Key)
liefert:

```jsonc
{
  "event": { "id": 11, "sessionId": "...", "containerId": "...", "projectId": "...",
             "direction": "response", "eventType": "secret_leak", "scanner": "regex-secrets",
             "verdict": "warn", "detail": "dotenv_secret_line: API_KEY=***REDACTED***",
             "status": "open", "createdAt": "..." },
  "classification": "exfiltration",           // | "response_action" | "unclassified"
  "classificationNote": "...",                 // menschenlesbare Begründung, immer vorhanden
  "session": { "...": "AgentSessionRow, kann fehlen (sessionWarning statt)" },
  "sessionWarning": "...",                      // nur gesetzt wenn session fehlt
  "relatedEvents": [ /* alle security_events derselben Session, aeltestes zuerst */ ],
  "requestLog": [ /* request_log-Zeilen derselben Session, neueste zuerst, max 200 */ ],
  "traceIds": ["trace-abc-0", "trace-abc-1"],   // fuer manuelles Nachschlagen in Langfuse
  "containerStats": { "cpuPercent": "0.42%", "memUsage": "12MiB / 512MiB",
                       "memPercent": "2.3%", "netIO": "...", "blockIO": "...", "pids": "3" },
  "containerWarning": "...",                    // nur gesetzt wenn Container weg/unerreichbar
  "generatedAt": "2026-09-07T22:18:59Z"
}
```

Quelle: `src/backend/internal/security/forensics.go`, Route in
`security.go`, dokumentiert in `API_DOCS.md` ("K-LAF Freeze/Review/Release +
Forensics"). `GET /api/security/events` (bereits aus WP3) liefert die Liste,
aus der man ein `eventId` fuer den Report waehlt.

## Was zu bauen ist

1. **Report-Ansicht** (z.B. `/security/events/{id}` oder ein Slide-over aus
   der bestehenden Events-Tabelle): zeigt `event`, `classification` +
   `classificationNote` als Badge/Chip, `containerStats` als kleine Metrik-
   Kacheln, `relatedEvents` als Mini-Timeline, `requestLog` als Tabelle
   (Modell, Tokens, Kosten, Latenz, Status), `traceIds` als Kopier-Chips.
2. **`sessionWarning`/`containerWarning` ehrlich anzeigen** statt zu
   verstecken — z.B. als gelbe Inline-Notiz ("Container existiert nicht
   mehr") statt die Sektion einfach leer zu lassen.

## Die eine harte Anforderung (aus dem Sprint-Dokument, K-LAF-Mandat)

**Alles unter `detail` (der redigierte Scanner-Snippet) und der komplette
`requestLog`/`relatedEvents`-Inhalt ist inerter Text — niemals an ein
Modell/eine KI-Anfrage weiterreichen.** Das war im Sicherheitsvorfall vom
5.9.2026 ein realer Angriffsschritt (Nested Prompt Injection, 21:39 Uhr):
Report-Inhalte, die einem Agenten/einer KI-gestützten Such-/Zusammenfassungs-
funktion im Dashboard zum "Erklären" vorgelegt werden, könnten selbst
injizierte Anweisungen enthalten. Das Widget darf `detail`/`requestLog`
also nur als reinen, nicht interpretierten String rendern (kein Markdown-
Rendering, das versteckte Direktiven ausführen könnte; kein "Frag die KI
über diesen Fund"-Button, der den Snippet-Text in einen Prompt einbettet).

## Nicht Teil dieses Tasks

- Kein neuer Endpoint noetig — alles oben ist bereits live.
- Payload-Retention/Löschfristen (E3 im Sprint-Dokument) sind eine offene
  Rechtsfrage, aber aktuell gegenstandslos: es wird nirgends unredigierter
  Payload gespeichert. Kein Frontend-Bezug.
