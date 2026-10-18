# GLM-Session, nächste Prompts (21.9.2026, nach Item 1 File Browser)

Gleiche Standing-Regeln wie im ersten Prompt (No-Mock, Doku-Pflicht,
Plan-vor-Code, keine Git-Ops ohne Freigabe).

## Item 2 — Secrets/Vault-Konsolidierung (Backlog #099)

Wie im ersten Prompt beschrieben: 4 unkonsolidierte Ablagen zuerst
identifizieren (grep nach "secret" in internal/store, internal/gateway),
dann secrets-Tabelle + /api/secrets-Route + Scope-Selector.

## Item 3 — Fünf fehlende Design→Route-Lücken (NEU, 21.9.2026 gefunden)

Cross-Check von `design-assets/stitch/` (56 Designs) gegen echte Routen
in `src/frontend/src/App.tsx` ergab fünf Designs ohne jede passende Route:

Nachgeprüft (21.9.2026), was am Backend jeweils schon existiert:

1. **App-Discovery** (`jimesh-app-discovery-with-networks.png`) —
   **Backend existiert bereits**: `POST /api/projects/discover`
   (`internal/deploy/deploy.go:52`, `handleProjectsDiscover`). Nur die
   Frontend-Seite/Route fehlt — kein neues Backend nötig, erst prüfen was
   der bestehende Endpoint liefert.
2. **Browser-Integration-Selection** (`jimesh-browser-integration-
   selection.png`) — kein `BrowserSelection`/`BrowserIntegration` im
   Code, auch kein offensichtliches Backend-Gegenstück gefunden. Zuerst
   klären, was das überhaupt sein soll (mit Operator absprechen), bevor
   Code geschrieben wird.
3. **Deployment-Detail-Seite** (`jimesh-deployment-detail-
   deploy-20260919.png`) — **Backend existiert bereits**:
   `GET /api/projects/{id}/deployments/{depId}` +
   `.../redeploy` (`internal/deploy/deploy.go:72-73`, war schon da, nie
   benutzt). Nur `/workspaces/deployments` (Liste) hat eine Route, die
   Detail-Route fehlt im Frontend — kein neues Backend nötig.
4. **Distributed-Trace-Detail / OTel-Waterfall** (`jimesh-distributed-
   trace-detail-dsh-agent-session.png`) — **Backend ist kaputt**, nicht
   nur die Frontend-Route fehlt: Security-Audit F-05 ("OTel-Spine ohne
   Call-Sites + EndSpan schreibt nichts"). Backend-Reparatur ist
   Voraussetzung, bevor eine Trace-Detail-Seite überhaupt echte Daten
   hätte.
5. **SSH-Target-Detail-Seite** (`jimesh-ssh-target-detail-
   root-187-124-2-174.png`) — vermutlich **kein neues Backend nötig**,
   die Daten kommen schon aus der bestehenden Liste
   `/api/settings/ssh_endpoints` — nur eine Detail-Ansicht dafür im
   Frontend fehlt (muss das SPRINT-48-Modell respektieren, siehe unten).

**Wichtig, bevor Code für #5 (SSH-Target-Detail) geschrieben wird**:
SPRINT-48 (`docs_dev/sprints/SPRINT-48-PROJECT-WORKSPACE-MODEL-
REALIGNMENT.md`) hat das Hierarchie-Modell gerade korrigiert — SSHTarget
ist KEINE eigene Hierarchie-Ebene mehr, sondern ein Freitext-Label auf
Workspace (`Workspace.sshTarget`). Eine "SSH-Target-Detail"-Seite muss
das neue Modell respektieren (zeigt z. B. alle Workspaces, deren
`sshTarget`-Feld auf diesen Wert matcht — kein Foreign-Key-Join, das gibt
es nicht), nicht das alte, umgedrehte Modell wiederbeleben.

## Item 4 — WorkspaceDetailPage.tsx: massive Fake-Daten gefunden (NEU, 21.9.2026)

Beim Fixen von SPRINT-48 WP1 wurde in `src/frontend/src/views/
WorkspaceDetailPage.tsx` Folgendes gefunden und bereits teilweise
entfernt (nur die Blocker für den Hierarchie-Fix, NICHT alles):

- Ein fabriziertes Fallback-Workspace-Objekt (fake id/name/createdAt),
  das die echte "not found"-EmptyState maskiert hat — ENTFERNT.
- Sechs hardcodierte Fake-Container (market-data-feed, order-execution-
  engine, redis-cache-tier, ...) mit erfundenen PIDs und Datum
  2025-02-08 — ENTFERNT.
- Mehrere hardcodierte Fallback-Strings mit der ECHTEN Produktions-IP
  (`187.124.2.174`) als Fake-Default — ENTFERNT (durch `target || 'unknown'`
  ersetzt).

**Noch NICHT entfernt, echter Fund, braucht eigenen Task:**
- Eine komplett erfundene Secrets-Liste (`secretsList`, ~Zeile 129):
  `API_KEY_BINANCE_PROD`, `DB_POSTGRES_PASSWORD`, `JWT_SIGNING_PRIVATE_KEY`,
  `FINANCE_LEDGER_MASTER_SECRET`, `AWS_BACKUP_S3_KEY` — komplett
  hardcodiert, keine echte API dahinter.
- Ein Aufruf von `GET /api/security/findings` (Zeile ~112) — diese Route
  existiert im Backend NICHT (derselbe Bug, der schon auf
  SecurityFindingsPage gefunden und gefixt wurde, hier aber unabhängig
  nochmal).
- Weitere kleinere erfundene Werte im Rendering (z. B. "12ms" Latenz,
  "us-east-prod-mesh" Cluster-Name, "10.240.0.14/32" allowed-ips) —
  nicht mandatskritisch wie die Secrets-Liste, aber auch Fiktion.

Diese Datei braucht einen eigenen, fokussierten Cleanup-Pass (eigener
Sprint-Eintrag), das war nicht Teil von SPRINT-48 WP1 und wurde bewusst
nicht mit erledigt, um den Scope nicht zu sprengen.
