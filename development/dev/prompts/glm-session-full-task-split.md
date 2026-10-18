# Vollständige Aufgabenteilung, Claude vs. GLM (21.9.2026, spät)

Basis: `docs/ARCHITECTURE.md` §8 (verbindlich) + Backlog #099, #128-134.

## GLM — bleibt bei der bestehenden Reihenfolge

1. Item 2 — Secrets/Vault (jetzt Pfad-Modell: `internal/*`, `llm/*`,
   `project/<id>/*`, `project/<id>/user/<id>/*`, ARCHITECTURE.md §8.3c)
2. Item 3 — 5 Design-Routen (App-Discovery, Browser-Integration-Selection,
   Deployment-Detail, OTel-Trace-Detail, SSH-Target-Detail) — bei 3 davon
   (App-Discovery, Deployment-Detail, SSH-Target-Detail) existiert das
   Backend schon, nur Frontend fehlt; OTel braucht zuerst einen Backend-
   Fix (Audit F-05); Browser-Integration-Selection zuerst mit Operator
   klären
3. Item 4 — WorkspaceDetailPage echtes Backend (`/api/deployments`,
   Secrets-API aus Item 2)

**Danach, neu zugewiesen an GLM (in dieser Reihenfolge):**

4. Backlog #130 — User-Provisionierung: Pfad-Präfix (`home/<user>/
   projects/<project>`, admin-konfigurierbar) + User-Anlage fragt welche
   Projects zugewiesen werden, Auto-Provisionierung je Project
5. Backlog #131 — Shared Workspace (Gruppen-Space, bei Server-
   Provisionierung konfiguriert, mehrere User teilen sich einen Zugriff)
6. Backlog #132 — Projekt-Migration zwischen Servern (pro-Workspace, da
   ein Project laut §8.2 legitim über mehrere Server verteilt sein kann)

## Claude (ich) — läuft parallel

- Backlog #133 Rest — Dual-View (Project-sortiert/Server-sortiert) auch
  in den Project-/Workspace-Detail-Seiten (Sidebar-Teil bereits live)
- §8.3b — Project-Detail-Seite: Secrets- und Apps-Komponenten inline
  einbauen (UI-Shell jetzt, echtes Wiring sobald GLMs Item 2/4 stehen)
- §8.3b — Visibility/RBAC im Frontend: User sieht nur eigenes+Company-
  Project, Admin sieht alle; Workspace-Expansion mit den zwei Standard-
  Einträgen "my project workspace" / "company workspace"

## Bewusst NICHT zugewiesen, bleibt Backlog (Operator-Priorität: erst
alles andere zum Laufen bringen)

- Datalake/Debezium/DB-Discovery "richtig" bauen (R44-087/TASK-105) —
  Ghost-Page-Entfernung war korrekt (echte "green lie", dokumentiert in
  MANDATES.md), Backlog-Idee bleibt für später stehen
- SIEM-Restarbeiten (Shipper, Wazuh-Ruleset)
- Firewall-Dashboard-Integration
- Komplettes Plugin-System (#106-116)
