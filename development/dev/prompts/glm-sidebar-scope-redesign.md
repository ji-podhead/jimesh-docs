# GLM-Prompt — Sidebar-Neustrukturierung: Scope-Selector + Multi-Selection (21.9.2026)

Lies zuerst `docs/ARCHITECTURE.md` §8 (verbindliches Domänenmodell) und
`docs/PROMPTS-STITCH-DESIGN.md` (Original-Design-Prompts, besonders
Prompt 1 Sidebar + Prompt 6 Scope Selector). Das hier ist eine
Operator-Präzisierung on top, ersetzt NICHT §8.

## Neue Sidebar-Struktur (4 Sections, oben nach unten)

1. **Scope Selector** (ganz oben, ersetzt den bisherigen "SSH Quick
   Connect"-Bereich aus dem Design)
   - Layout-Toggle: **By Server** / **By Project** / **All Servers**
     (Overview über alle Server+Projects gleichzeitig — dritter Modus,
     zusätzlich zum bestehenden 2er-Toggle in `HierarchySidebar.tsx`)
   - Darunter: Dropdown-Auswahl für den/die aktuellen Server ODER
     Project(s) — MIT Multi-Select (mehrere Server oder mehrere
     Projects gleichzeitig wählbar, nicht nur einer)
   - `ScopeSelectorModal.tsx` existiert schon (Prompt 6, Checkbox-Baum +
     Chips + "Apply Scope") — hier wiederverwenden/andocken, nicht neu
     bauen. Aktuell komplett verwaist (Backlog #137), das hier ist der
     Anlass, es endlich anzuschließen.
   - **Workspaces bleiben immer ein Dropdown UNTER dem gewählten
     Project** — in BEIDEN Sidebar-Modi (By Server und By Project). Der
     User kann seine Scope-Auswahl damit auf einen konkreten Workspace
     verfeinern/überschreiben, unabhängig davon ob oben nach Server oder
     Project sortiert ist.
/home/ji/projects/jimesh/assets/icons/brand/svg/jimesh-mesh-cube-mono-small-b. svg
2. **Navigation** (scope-abhängig, unterhalb des Selectors)
   - Die bisherigen Cross-Cutting-Links (Integrations, Apps, etc.)
     wandern hierher, weg aus der Baum-Struktur.
   - Muss den aktuellen Scope respektieren — bei Multi-Project-Selection
     z. B. "Plugin in mehrere Workspaces gleichzeitig pushen" als echten
     Use-Case unterstützen.

3. **Events & Observability** (umbenannt, bisher "Security")
   - Bisher: Firewall Rules, SIEM Events
   - NEU dazu: Network Monitoring, SAST, DAST (existierende Routen:
     `sast`, `dast` in App.tsx — prüfen ob eigene Seiten oder Tabs)

4. (Rest der bestehenden Sidebar-Struktur unverändert, sofern nicht
   explizit oben erwähnt)

## Multi-Selection — Auditpflicht vor UI-Arbeit

**Bevor Multi-Select in der UI gebaut wird**: vollständige Liste
erstellen, welche bestehenden Erzeug-/Mutations-Endpoints eine LISTE von
Zielen (Server/Project/Workspace) überhaupt entgegennehmen können, und
welche nur eins. Beispiele, die geprüft werden müssen:
- Network erstellen — ein Server oder mehrere?
- App/Deployment erstellen — ein Project oder mehrere?
- Plugin installieren — ein Workspace oder mehrere (Operator-Beispiel:
  "Plugin in mehrere Workspaces pushen")?
- Jede Overview-Page — filtert sie schon nach `scope`/`selection`
  (`lib/global-scope.ts`), oder zeigt sie IMMER alles?

Output dieser Prüfung: eine Tabelle "Endpoint | Multi-fähig JETZT? |
Multi-fähig NÖTIG? | Aufwand falls Backend-Änderung nötig" — bevor
irgendein Multi-Select-UI-Code geschrieben wird. Kein Multi-Select-
Widget für einen Endpoint bauen, der nur ein Ziel entgegennehmen kann,
ohne das entweder zu fixen oder ehrlich zu deaktivieren.

## Reihenfolge

1. Audit-Tabelle (oben) erstellen, Operator zur Freigabe vorlegen.
2. Scope-Selector-Section (Punkt 1) — `ScopeSelectorModal.tsx` andocken.
3. Navigation-Section (Punkt 2) umziehen.
4. Events & Observability umbenennen + erweitern (Punkt 3).
5. Multi-Select in Overview-Pages NUR für die Endpoints aus der
   Audit-Tabelle, die es tatsächlich unterstützen (oder nach Fix
   unterstützen).

Standing-Regeln: No-Mock, Doku-Pflicht, Plan-vor-Code, keine Git-Ops
ohne Freigabe.



  Read 1 file

Bestätigt, beide Sidebar-Bilder (original + refined) zeigen dasselbe: "ALL SSH TARGETS" oben, "PROJECTS" darunter, BEIDE gleichzeitig sichtbar — nicht als Umschalter zwischen zwei Modi, sondern als zwei parallel gestapelte Bereiche. Das ist ehrlich anders als was ich gebaut habe (Toggle zwischen Project-Ansicht ODER Server-Ansicht).

Mein Toggle war eine bewusste Anpassung, aber keine 1:1-Umsetzung des Original-Designs. Grund für die Anpassung: die Mockups zeigen nur 2-3 Targets und 1-2 Projects als Beispiel — bei echten Daten (potenziell viele Server, viele Projects) könnte "beides gleichzeitig immer sichtbar" schnell unübersichtlich werden. Aber das ist meine Annahme, nicht deine Entscheidung.

● User answered Claude's questions:
· Sidebar: beide Bereiche (Targets + Projects) IMMER gleichzeitig sichtbar (wie im Original-Design), oder der Toggle den ich gebaut habe (nur einer von beiden, umschaltbar)? → nein die sidebar hat obben diesen ssh quick conect button dsa ist die server dropdown auswawhl und ganz oben soll der layout button sein. mach das jetzt erstmal so mit dem dropdown und der sidebar aus dem design. aber es soll schon auch den layout button geben für die zweite ansicht wo man dann quasi uach ne übersicht über all servers hat. all projects für alle server macht noch sinn aber die sachen wie iiintegrations usw müssten wir dann in die section darunter packen. also oben ist einfach nur der scope selector und unten dann die links für die eigentlichen sachen wie integrations usw weil das ist ja wiede rproject abhängig aber man könnte da auch mutli project selection machen wenn man ein plugin in mehrere workpsaces pushen will. dann haben wir aber auch diese extra section noch wo du secruity events und so riengepackt hast, das ist irgendiwe auch etwas schwachsinnig. da würde ich eher eine events & obserability section draus amchen und auch netowrk monitoring da rein packen und sast, dast usw dafür muss man dann entweder servers, also multi server, projects, oder multi projects und wenn der user dann die projects dann aufklappt, dann kann er dsa mit den workspaces auch noch überschrieben seine auswahl. workpspaces sind immer in der hierarchie quasi ein dropdown vo projects in beiden sidebars. also was für sections bruachen wir jetzt in der sidebar? wie findest du meine idee mit dem scope selector und multi selection, das muss dann natrlich in alle overview pages auch rein und wenn man sachen erzeuugt wie networks oder aps dann auch multi selection beachten, also erstmal ne komplette liste machen wo multi selection beahctet werden muss und wo nicht. gib mir einfach den prompt dann mache ich das mit glm
