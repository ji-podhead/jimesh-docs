# GLM-Session Sync — verbindliches Domänenmodell (21.9.2026, spät)

Lies ZUERST `docs/ARCHITECTURE.md` §8 ("Workspace / Project / User
domain model") — das ist das verbindliche, mit dem Operator
ausdiskutierte Modell, ersetzt jede frühere Annahme dazu. Markiert klar
BUILT (echter Code, verifiziert) vs. PLANNED (vereinbart, noch nicht
gebaut). Bei Widerspruch zu irgendwas, das du bisher angenommen hast:
§8 gewinnt.

Kernpunkte kurz:
- Project (Team-Ebene) → Workspace (1 pro User+Project, VOLLER
  Container-Satz dupliziert, kein Shared-Container) → App (viele pro
  Workspace).
- Server ist eine EIGENE, unabhängige Achse — kein Server "gehört" zu
  einem Project, ein Project kann über mehrere Server verteilt sein.
- Routing ist identitätsbasiert (TASK-079, `internal/store/
  workspace_routes.go`, ECHT gebaut) — keine Host-Ports, keine
  separaten Host-User pro JiMesh-User nötig.
- Fünf neue, dokumentierte aber NICHT gebaute Punkte (Backlog #130-133):
  User-Provisionierung mit Pfad-Präfix, Shared Workspaces,
  Projekt-Migration zwischen Servern, Sidebar-Dual-View
  (Project-sortiert/Server-sortiert, andere Achse als Tag statt
  Dropdown).

## Weiter mit den bisherigen Aufträgen

Mach normal weiter mit dem, was du schon hattest:
1. Item 2 — Secrets/Vault-Konsolidierung (Backlog #099)
2. Item 3 — die 5 fehlenden Design-Routen (App-Discovery,
   Browser-Integration-Selection, Deployment-Detail, OTel-Trace-Detail,
   SSH-Target-Detail)
3. Item 4 — echte Backend-Routen für WorkspaceDetailPage
   (`/api/deployments`, Secrets-API)

**Einzige Änderung durch den Sync**: Bei Item 3, SSH-Target-Detail-Seite
— das jetzt explizit gegen §8 bauen: ein Server ist eine geteilte
Ressource, zeigt ALLE Workspaces (verschiedener Projects/User), die
gerade darauf laufen (Match über `Workspace.sshTarget`, ein Freitext-
Label, kein Foreign Key). Nicht das alte, umgedrehte Modell wiederbeleben.

Standing-Regeln unverändert: No-Mock, Doku-Pflicht, Plan-vor-Code, keine
Git-Ops ohne Freigabe.
