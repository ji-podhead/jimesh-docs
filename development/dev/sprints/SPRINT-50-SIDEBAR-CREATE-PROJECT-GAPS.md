# SPRINT-50 — Sidebar: echte Projekt-Neuanlage, Security-Sektion, UX-Rückbau-Frage

**Status:** 📋 PLAN — nichts umgesetzt, reine Bestandsaufnahme vor dem Fix (Operator-Anweisung:
erst Sprint-File, dann Code).
**Auslöser:** Operator, 2026-09-27 — Design-vs-Realität-Vergleich der Sidebar (Prompt 1
`docs/PROMPTS-STITCH-DESIGN.md` vs. `HierarchySidebar.tsx`), dann explizit: "was habe ich überhaupt
gemacht" — nichts wurde bisher am Sidebar-Code geändert, nur untersucht.
**Betroffen:** `src/frontend/src/components/sidebar/HierarchySidebar.tsx`,
`src/backend/internal/deploy/projects_ssh.go`, `deploy.go` (Router)

---

## Fund 1 — "New Project" hat wortwörtlich keinen Backend-Endpoint, um ein leeres Projekt anzulegen

```go
// deploy.go:69
mux.HandleFunc("/api/projects", h.handleProjectsList)

// projects_ssh.go:2915
func (h *Handlers) handleProjectsList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httpx.ErrorJSON(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	...
```

`POST /api/projects` gibt es nur als **Policy-Test-Fixture** (`internal/policy/project_gate_test.go:38`,
"dev may NOT create projects") — der Test prüft eine Rollen-Regel gegen eine Route, für die es **gar
keinen Handler gibt**. Jede Methode außer GET auf `/api/projects` bekommt 405. Das erklärt exakt
BACKLOG #134: die Sidebar kann gar nicht anders, als auf den vollen `/api/projects/deploy`-Flow zu
verweisen — ein simpler "leeres Projekt anlegen"-Weg existiert serverseitig nicht.

**Zwei mögliche Fixes, Entscheidung nötig, keiner ist "einfach nur Frontend":**
1. Neuen minimalen `POST /api/projects`-Handler bauen (Name + optional Framework, kein SSH-Target,
   kein sofortiges Deploy) — echte Backend-Arbeit, kein reines Wiring.
2. Sidebar-Button bewusst umbenennen/umgestalten, um ehrlich auf den vollen Deploy-Flow zu verweisen
   (kein neuer Endpoint, nur ehrlicheres UI-Label statt eines Buttons, der einen einfachen Weg
   suggeriert, den es nicht gibt).

## Fund 2 — Die "Security"-Sektion aus Prompt 1 wurde nie in der Sidebar gebaut

Original-Design: "Below: 'Security' section (collapsible) with Firewall Rules + SIEM Events."
Backend-Daten dafür existieren teilweise schon (`FirewallRulesSection`/`/api/firewall/rules`, R43
bereits live in `SecurityExposurePage.tsx`) — sie stecken nur nicht in der Sidebar, sondern nur auf
einer separaten Seite. #095 ("Workspace-Sidebar final") ist der richtige Tracking-Punkt, weiterhin
nur geplant.

## Fund 3 — Der vermeintlich "verwaiste" Scope-Selector ist NICHT mehr verwaist

BACKLOG #137/#160 (21.9.) hatten `components/layout/scope-selector.tsx` als komplett unbenutzt
dokumentiert. **Neu verifiziert (27.9.):** die Datei wird inzwischen echt von `BreadcrumbBar.tsx`
importiert. Das heißt: dieser Teil des alten Befunds ist überholt — **kein Cleanup mehr nötig**,
BACKLOG sollte hier auf erledigt/überholt gesetzt werden, damit niemand nochmal Zeit reinsteckt.

## Fund 4 — die eigentliche UX-Frage (ScopeSelectorModal-Chips vs. einfacher Baum) ist eine
Design-Entscheidung, kein Bugfix

Wie bereits besprochen: Prompt 1 wollte einen einfachen Baum ("ALL SSH TARGETS" bold parent →
Target → Project → App). Real gebaut ist zusätzlich ein Chip-basiertes Multi-Select-Modal
(`ScopeSelectorModal`, 4 Ebenen inkl. Workspace) obendrauf. Das **nicht** einfach zurückbauen ohne
Operator-Entscheidung — beide Konzepte haben unterschiedliche Stärken (Baum = einfach navigieren,
Chips = mehrere Scopes gleichzeitig kombinieren). Frage steht noch offen.

## Nächste Schritte (Reihenfolge, jeweils nach Bestätigung)

1. Fund 1: welcher der zwei Fix-Wege (echter Endpoint vs. ehrliches Label)?
2. Fund 2: Security-Sektion in die Sidebar ziehen (Daten existieren teilweise schon, siehe R43).
3. Fund 4: Baum behalten, Chips behalten, oder beides parallel anbieten (Toggle)?
4. Fund 3: nur BACKLOG-Status korrigieren, kein Code nötig.
