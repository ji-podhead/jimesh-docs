# SPRINT-48 — Project/Workspace-Modell wieder auf eine Wahrheit bringen

**21.9.2026, spät: die verbindliche, ausdiskutierte Definition steht jetzt
in `docs/ARCHITECTURE.md` §8 (Workspace/Project/User-Domänenmodell) — bei
Widerspruch zwischen diesem Sprint-File und §8 gilt §8, dieses File wird
noch nicht nachgezogen. §8 markiert klar BUILT vs. PLANNED.**

**Ausgelöst durch:** Operator-Report 21.9.2026 — "New Workspace"-Button in
der Sidebar tut nichts Sinnvolles, und "ich hab immer noch keine Ahnung
was Project und Workspace sind, obwohl ich das klar definiert hatte."

**Befund (verifiziert, nicht vermutet):** Es existieren aktuell ZWEI
widersprüchliche Hierarchie-Modelle im selben Repo:

1. **SPRINT-37** (13.9.2026, Operator-Entscheid, Backend real so gebaut,
   `internal/store/workspaces.go`): `Project` (Team-Ebene: Codebase/
   Chains/DB-Schema/Budget, geteilt) → `Workspace` (PRO-USER-RBAC-Space:
   `owner_user_id`, eigener Container, Service-Key, Session — ein
   Workspace pro (Projekt, User), DB-Unique-Index erzwingt das).
2. **`src/frontend/src/types/domain/hierarchy.ts`** (neuer, von der
   HierarchySidebar-Arbeit): `SSHTarget → Workspace → Project → App` —
   Project ist hier das KIND von Workspace (`Project.workspaceId`),
   genau umgekehrt zu SPRINT-37.

**Operator-Entscheidung (21.9.2026): SPRINT-37 ist die Wahrheit.**
`hierarchy.ts` + `HierarchySidebar.tsx` müssen korrigiert werden, nicht
das Backend.

## Zusätzliche, in derselben Diskussion aufgeworfene Punkte

### A — Agent-Workspace vs. User-Workspace sind nicht dasselbe

Bei Agenten ist klar: die arbeiten in Worktrees (bestehendes Muster,
Sprint 20 WP7/TASK-014, generalisiert in SPRINT-37). Bei **menschlichen
Usern** ist unklar, was ein Workspace konkret bedeutet — eigener
User-Account? Ein dupliziertes Projekt pro User? Das muss geklärt
werden, BEVOR die UI dafür gebaut wird (Operator: "bei usern ist das
nicht so klar").

**Zu klären, nicht anzunehmen:**
- Bekommt ein User-Workspace einen eigenen Datenbank-User, oder teilt er
  sich die Projekt-DB mit Row-Level-Scoping?
- Ist "dupliziertes Projekt" gemeint als: eine komplette Kopie der
  Codebase pro User (echtes Worktree, wie bei Agenten), oder nur ein
  isolierter Laufzeit-Container gegen dieselbe geteilte Codebase?

### B — Projekt-Erstellung: KEINE Git-/IaC-/Docker-Suche vor der Repo-Wahl

Operator-Klarstellung: beim Erstellen eines Projekts wird NICHT zuerst
nach Git-Repos, IaC- oder Docker-Code gesucht. Erst NACHDEM die Repos
gefunden/verknüpft wurden, kommt der Discovery-Schritt (Sprint-D,
Backlog #092/#093 — Docker-Network-Discovery, App-Discovery via Compose-
File-Scan). Reihenfolge also: **Projekt anlegen → Repo(s) verknüpfen →
danach erst Discovery (IaC/Docker/Compose scannen)**, nicht umgekehrt.

### C — "local"-Control-Plane zeigt keine absolute Adresse an

Operator-Fund (21.9.2026, live in der Control-Planes-Ansicht):
`/api/control-planes` gibt für die selbst-registrierte "local"-Zeile
`endpoint: ""` zurück (Code-Kommentar in `control_planes.go`: "die Zeile
IST hier, es gibt keine Remote-Adresse zu wählen" — intern korrekt, das
Backend braucht für seinen eigenen Host keine Adresse zum Wählen).
**Für die Anzeige ist das aber falsch**: "leer"/"lokal" ist nur relativ
zur Node selbst sinnvoll. Ein User, der das Dashboard von woanders aus
öffnet, sieht nur eine bedeutungslose Leerzeile statt einer Adresse, an
der er die Node tatsächlich identifizieren kann. Operator-Vorgabe: dort
muss die ECHTE IP stehen (die VPN-IP der Node, z. B. via
`TRADING_VPN_IP`/`jimesh_vpn_ip`), unabhängig davon ob der Typ `local`
oder `ssh` ist — der Unterschied zwischen "lokal deployed" und "über SSH
erreicht" ist ein internes Implementierungsdetail, kein Anzeige-Konzept.

**Ansatz:** `ensureLocalControlPlane()`/die List-Response bekommt einen
echten, auflösbaren Adress-Wert für die `local`-Zeile (Backend-Env, z. B.
eine neue `JIMESH_NODE_VPN_IP`-Variable, analog zum bereits bestehenden
`jimesh_vpn_ip`-Ansible-Var), NICHT nur eine Frontend-Kosmetik-Lösung —
die echte Adresse muss vom Server kommen, damit sie stimmt.

### D — Routing für Pro-User-Deployments: kein Host-Port-Modell

Bereits recherchierte, aber nirgends fest entschiedene Position
(`docs_dev/research/networks_gvisor.md`): das "zufälliger Host-Port pro
Workspace"-Modell ist bei modernen Plattformen (Codespaces, Gitpod,
Coder) verlassen worden — Sicherheits-, UX- und Skalierungs-Nachteile.
Stattdessen: **ein zentraler Ingress (Traefik, bereits im Einsatz),
Routing anhand einer `workspace_id → interne Container-IP`-Tabelle**,
jede App im Container läuft auf ihrem natürlichen Port (z. B. `:3000`),
der Ingress biegt das transparent um. Kein rohes TCP direkt ins
Internet, keine Port-Kollisionen möglich (jeder Container hat sein
eigenes Network-Namespace, Ports 0–65535 unabhängig).

**Für diesen Sprint zu entscheiden:** ob dieses Routing-Modell jetzt für
User-DSH-Deployments verbindlich übernommen wird (Empfehlung: ja, es ist
bereits recherchiert und Traefik läuft schon als Ingress) — dann ist
Punkt D hier nur noch Verdrahtung, keine neue Architektur-Frage.

## Work Packages (Plan, noch NICHT implementiert — Operator-Review vor Start)

- **WP1 — `hierarchy.ts` + `HierarchySidebar.tsx` korrigieren.**
  `Project` wird Level 1 (eigene Top-Level-Auswahl neben/statt
  `SSHTarget`, zu klären wie sie zusammenspielen — ein Projekt läuft auf
  einem SSH-Target, aber ist nicht dessen Kind), `Workspace` wird
  Level 2 (Kind von Project, `ownerId` + `ownerType: 'agent' | 'user'`),
  `App` bleibt Level 3. Sidebar-Baum, Icons, Navigation entsprechend
  umbauen.
- **WP2 — `ownerType` am Workspace-Modell ergänzen** (`agent` vs
  `user`), Backend (`workspaces`-Tabelle, Store, API) + Frontend. Ohne
  vorher A oben geklärt zu haben, nicht anfangen.
- **WP3 — Projekt-Erstellungs-Flow: Reihenfolge fixen** (Repo-Verknüpfung
  vor Discovery, nicht gleichzeitig/davor).
- **WP4 — "local"-Control-Plane bekommt eine echte, absolute Adresse**
  statt leerem `endpoint` (Punkt C oben) — Backend-Env-Var für die
  Node-VPN-IP, in `ensureLocalControlPlane`/der List-Response verwendet.
- **WP5 — Ingress-Routing für User-Workspaces verdrahten** (Traefik-
  Label pro Workspace-Container, `workspace_id → Container`-Registry im
  Backend, keine Host-Port-Allokation).
- **WP6 — Sidebar "New Project"/"New Workspace"-Buttons reparieren**,
  jeweils passend zum korrigierten Modell (aktuell: Button navigiert nur
  zu `/workspaces`, öffnet keinen Dialog — das bleibt kaputt, bis WP1
  steht).

## WP1 — Status: umgesetzt, live verifiziert (21.9.2026)

`hierarchy.ts`, `lib/store.tsx`, `HierarchySidebar.tsx`,
`lib/global-scope.ts` korrigiert (Project → Workspace → App, reale FKs
statt erfundener Heuristik). Blast-Radius war größer als geschätzt — 4
weitere Dateien (`AppDetailPage.tsx`, `team-bindings-panel.tsx`,
`OverviewPage.tsx`, `BreadcrumbBar.tsx`, `ScopeSelectorModal.tsx`)
nutzten dieselben falschen Feldnamen und wurden mitkorrigiert.

**Fund + Korrektur unterwegs:** `WorkspaceDetailPage.tsx` enthielt ein
fabriziertes Fallback-Workspace-Objekt (entfernt — maskierte die echte
"not found"-EmptyState, ein echter No-Mock-Verstoß) und sechs
hardcodierte Fake-Container + eine Secrets-Liste. Letztere zwei waren
laut Operator-Klarstellung (21.9.) bewusstes UI-Scaffolding für ein noch
nicht ans Backend angebundenes Konzept, kein Slop — auf Operator-
Entscheidung wiederhergestellt als `DEMO_CONTAINERS`, aber jetzt mit
sichtbarem "Beispieldaten"-Banner (Container-Tab + Secrets-Tab), nie
mehr stillschweigend als echte Live-Daten gerendert. Folgeaufgabe für
GLM: die echten Backend-Routen (`/api/deployments`, Secrets-API Backlog
#099) nachbauen, siehe `docs_dev/prompts/glm-session-item2-item3.md`
Item 4.

Build (`npm run build`) grün, `tsc -p tsconfig.app.json --noEmit`
zeigt 0 neue Fehler in allen berührten Dateien (Projekt-Baseline davor
unabhängig 553 Fehler, unverändert). Manuell auf `trading` deployed
(Ansible-Weg weiterhin blockiert, Backlog #126), `curl localhost:8090/`
→ `200`.

**WP2 (Agent- vs. User-Workspace-Unterscheidung) bewusst NICHT
begonnen** — die in Punkt A gestellte Klärungsfrage ist noch offen.

## Abnahmekriterien

1. Ein Blick in `hierarchy.ts` und `internal/store/workspaces.go`
   ergibt dasselbe Modell, nicht zwei widersprüchliche.
2. Der Sidebar-Button erstellt tatsächlich etwas (kein reiner
   Navigations-No-Op mehr).
3. Agent- und User-Workspaces sind im Datenmodell unterscheidbar
   (`ownerType`), nicht länger dieselbe unklare Sache.
4. Kein Feature aus diesem Sprint erzeugt echte Host-Port-Konflikte bei
   zwei parallelen User-Workspaces — live getestet mit zwei
   gleichzeitigen Instanzen derselben App auf demselben internen Port.

## Referenzen

`docs_dev/sprints/SPRINT-37-WORKSPACES-HIERARCHY.md` (die Original-
Entscheidung), `src/frontend/src/types/domain/hierarchy.ts`,
`src/frontend/src/components/sidebar/HierarchySidebar.tsx`,
`docs_dev/research/networks_gvisor.md` (Routing-Recherche),
Backlog #092/#093 (Sprint-D Discovery).
