# GLM-Session Prompt — Feature-Lücken schließen (21.9.2026)

Jede Zeile unten ist gegen echten Code oder den Backlog verifiziert (Nacht
20./21.9.2026), keine Vermutungen.

---

Kontext: JiMesh (/home/ji/projects/jimesh). Lies ZUERST CLAUDE.md und
MANDATES.md im Repo-Root, danach docs_dev/backlog/BACKLOG.md komplett —
das ist der aktuelle, ehrliche Stand, keine Annahmen treffen, die dem
widersprechen.

Standing-Regeln für diese Session (nicht verhandelbar):
1. No-Mock-Mandat: kein Endpoint darf simulieren — echte Persistenz,
   echte Daten, ehrliche Leerzustände statt erfundener Platzhalter
   (siehe MANDATES.md).
2. Jede Behauptung "funktioniert" muss live verifiziert sein
   (curl-Beweis, Screenshot, oder Test-Output) — kein "sollte jetzt
   gehen".
3. Doku-Pflicht: jede funktionale Änderung bekommt einen Sprint-Eintrag
   (docs_dev/sprints/) + Backlog-Mirror (docs_dev/backlog/BACKLOG.md)
   IM SELBEN Change, nicht danach.
4. Plan vor Code: für jedes Feature unten erst einen kurzen
   Plan-Abschnitt in einem neuen Sprint-File (Ziel, Work Packages,
   Abnahmekriterien), dann erst implementieren.
5. Keine Git-Operationen (commit/push) ohne explizite Freigabe des
   Operators — nur lokale Änderungen + Doku.

Arbeite die folgenden Lücken der Reihe nach ab (jede einzeln planen →
bauen → live verifizieren → dokumentieren, nicht alles auf einmal
anfangen):

## 1. FILE BROWSER (höchste Priorität — Frontend existiert schon und läuft ins Leere)

- Frontend: `src/frontend/src/components/files/FilePathInput.tsx` und
  `FileBrowserModal.tsx` rufen `apiFetch('/api/ssh/explore', ...)` auf.
- Backend: diese Route existiert NICHT
  (`grep -n '"/api/ssh/explore"' src/backend/internal/gateway/*.go`
  liefert nichts, verifiziert 21.9.).
- Aufgabe: echten Backend-Handler bauen, der über eine registrierte
  SSH-Target-Verbindung (siehe `/api/settings/ssh_endpoints`,
  `internal/gateway/gateway.go` `handleSettings`) ein Verzeichnis
  auflistet. Kein Mock — echte SSH-Session, echte Fehler bei nicht
  erreichbarem Host.
- Nutze die vom Operator bereits recherchierten Go/React-Package-
  Vorschläge (danach fragen, falls nicht im Repo dokumentiert).

## 2. SECRETS/VAULT-KONSOLIDIERUNG (Backlog #099)

- 4 aktuell existierende, unkonsolidierte Secret-Ablagen zuerst
  auflisten (grep nach "secret" in `internal/store`,
  `internal/gateway`) und dokumentieren, WELCHE 4 das genau sind —
  nicht raten.
- Dann: eine secrets-Tabelle, `/api/secrets`-Route, Scope-Selector im
  Frontend, wie im Backlog-Eintrag beschrieben.

## 3. FIREWALL-DASHBOARD-INTEGRATION (Backlog #094, #095, #096, #102)

- Es gibt bereits echte iptables/Allowlist-Mechanik in
  `deploy/ssh-allowlist/` und ein `jimesh-router`-Konzept (SPRINT-45)
  — das NICHT duplizieren, sondern ans Dashboard anbinden.
- Workspace-Sidebar-Sections für WAF/Firewall/Networks/Security
  (Backlog #095).

## 4. SIEM-RESTARBEITEN (Backlog #032 — Kern läuft schon, NICHT neu bauen)

- Offen laut Backlog: WP1-Shipper (JiMesh→Wazuh), WP3-Wazuh-Ruleset,
  security_events-Mapper, `make siem`-Targets.
- Suricata ist laut Backlog "ehrlich v2-Platzhalter" — das SO LASSEN
  und dokumentieren, nicht vortäuschen.

## 5. PLUGIN-SYSTEM (Backlog #106–#116, komplett ungebaut)

- In der dokumentierten Reihenfolge: erst Manifest-Spec (#106), dann
  Registry-API (#107), dann Auth-Connector-Framework (#108) und
  Secret-Scope-RBAC (#109), dann Frontend-Surface-Renderer (#110) —
  DANACH erst konkrete Plugins (#111–114).
- Das ist die größte Baustelle — realistisch nicht in einer Session
  fertig. Nach jedem Work-Package sauber stoppen und dokumentieren,
  was fertig ist und was als Nächstes kommt.

## 6. FEATURE-WORKSPACE BEI SSH-TARGET (vom Operator angefragt, noch nicht recherchiert)

- Der Operator will wissen/haben: warum ist ein SSH-Target nicht mit
  einem eigenen "Feature-Workspace" verknüpft. Zuerst mit dem Operator
  klären, was genau damit gemeint ist, bevor Code geschrieben wird —
  nicht raten.

---

Bekannte, noch ungelöste Nebenbaustelle (nicht Teil dieser Liste, aber
relevant für Deploys): direkter SSH-Zugang zur Public-IP von `trading`
(187.124.2.174:22) war zuletzt blockiert (Timeout, siehe Backlog #126)
— für Redeploys ggf. den VPN-Tunnel-Weg (Port 2222 via
podhead-Client) prüfen, bevor an `make redeploy` verzweifelt wird.

Nach jedem einzelnen Punkt: kurzer Status an den Operator, was live
verifiziert wurde und was noch offen ist — kein Sammel-Report am Ende.
