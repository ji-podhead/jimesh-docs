# TASK-069 — Security-Overview: echter Workspace/Endpoint-Picker + Dead-Notification-Link

**Status:** ✅ abgeschlossen 13.9.2026 (GLM-Subagent) —
**Bug 1 gefixt:** `SecurityOverviewPage.tsx` — Freitext-Substring-Filter
ersetzt durch `ModelCombobox`-Picker über `GET /api/workspaces` +
`GET /api/projects` (die Loader-Muster aus WorkspacesPage/ControlPlanesPage,
keine neue Datenquelle) + alle Target-Strings der geladenen Funde (ein
Audit-Trail-Target ohne Registry-Row bleibt wählbar statt tippbar);
exakter Match statt Substring. SSH-Endpoints bewusst NICHT angeboten —
kein Fund trägt je eine Endpoint-ID als Target, anbietbar aber nie
matchbar wäre unehrlich (Mandat 2).
**Bug 2 — Prämisse widerlegt, echter Bug gefixt:** `/security/events/:id`
EXISTIERT (App.tsx `<Route path="/security/events/:id">` →
SecurityReportPage, seit TASK-021 commit `78fb1dc`; dahinter
`GET /api/security/report/{eventId}`, `internal/security/security.go:54`
+ `forensics.go`, numerische eventId) — live am laufenden Stack
verifiziert (transiente, sofort wieder gelöschte Verifikations-Row:
List-API + Report-API antworteten 200 mit echten Daten). Fix A war also
bereits zustande; es gab nie einen toten Link. Der echte fixbare
Beobachtungs-Bug: das Radix-Popover der Benachrichtigungs-Glocke blieb
bei Link-Klick offen — die Navigation lief UNSICHTBAR hinter dem Panel
(wirkte wie „Klick tut nichts Reales"). `SecurityNotificationsBell` führt
den Popover-State jetzt kontrolliert und schließt bei jedem Link-Klick.
Doku: SPRINT-32-SIEM-FOUNDATION.md (Korrektur-Absatz), BACKLOG.md Zeile 069.
**Quelle:** SecurityOverviewPage.tsx — 2 bestätigte Bugs (Bug 2 stellte
sich bei der Live-Nachprüfung als teilweise auf veralteter Prämisse
bestätigt heraus)

## Bug 1: targetFilter ist ein Freitext-Substring-Filter
- SecurityOverviewPage.tsx:136,167,275 — der Operator muss die exakte Target-Striche TYPEN
- Fix: echte Dropdown/Combobox gefüllt aus GET /api/workspaces (und/oder SSH-Endpoints — prüfe wie ControlPlanesPage oder WorkspacesPage ihre Target-Liste laden, erfinde KEINE neue)

## Bug 2: Notifications linken auf /security/events/:id — Route existiert NICHT
- security-notifications.tsx linkt auf /security/events/:id (security-overview.ts link-Feld) — App.tsx hat nur /security/events (Liste, ohne :id)
- Fix A (bevorzugt): echte Detail-Route /security/events/:id hinzufügen (checke ob GET /api/security/events/{id} existiert — falls nicht, Backend-Route ergänzen)
- Fix B (falls Detail-View out of scope): Link auf /security/events?highlight=<id> ändern (Liste scrollt/highlightet)
- Wähle was ehrlich und machbar ist — HINTERLASSE KEINEN DEAD LINK

## Regeln
- tsc --noEmit clean, check:i18n clean (backfill-i18n.mjs wenn nötig)
- GIT: explizite Pfade, kein -A, NICHT pushen
