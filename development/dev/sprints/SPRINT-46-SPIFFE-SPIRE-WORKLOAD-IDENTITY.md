# SPRINT-46 — SPIFFE/SPIRE als Workload-Identitätsschicht

Ausgelöst durch: Operator-Anstoß 18.9.2026 (spiffe.io gelesen, Frage ob sich
das fürs eigene Deployment nutzen lässt). Eine von einem anderen KI-Tool
zugespielte Liste "Presets/IaC-Repos" bestand durchweg aus Fake-Links
(`https://github.com` ohne Pfad, keine echten Ziele) und wurde verworfen.
Die Quellen unten sind selbst nachgeprüft (18.9.2026), keine übernommenen
KI-Behauptungen — Standing-Lesson aus
`docs_dev/research/agent_firewalls_article.md` ("KI-Tool-Name/Link ist
kein Beweis, echte URL verlangen und selbst prüfen").

## Quellen (echt, verifiziert 18.9.2026)

- [github.com/spiffe/spire](https://github.com/spiffe/spire) — Server/Agent, offizielle Binaries (kein Docker/K8s zwingend nötig)
- [github.com/spiffe/spire-tutorials](https://github.com/spiffe/spire-tutorials) — Docker-Compose-Tutorials (nested-spire, federation, telemetry) + K8s-Tutorials
- [github.com/spiffe/spire-examples](https://github.com/spiffe/spire-examples) — u.a. Envoy-Docker-Compose-Beispiel (SPIRE-Server + Echo/Envoy + Web, mTLS über die Workload API via Unix-Socket)
- [github.com/spiffe/helm-charts-hardened](https://github.com/spiffe/helm-charts-hardened) — offizielle K8s-Helm-Charts, Status laut eigenem FAQ: **beta**, nicht blind produktionsreif
- Kein offizielles SPIRE↔AWS-IAM-Roles-Anywhere-Terraform-Modul gefunden. Generische Community-Module für Roles Anywhere selbst existieren (z. B. `FriendsOfTerraform/aws-roles-anywhere`), aber die Kopplung "SPIRE als Trust Anchor für Roles Anywhere" wäre Eigenintegration, kein verifiziertes Preset. Diese Behauptung aus der KI-Zusammenfassung war erfunden.

## Ziel

**Nicht:** SPIRE als Ersatz für Keycloak/OPA/Service-Keys/K-LAF. Diese Kette
(SPRINT-27, SPRINT-38, SPRINT-41) deckt bereits Applikations-Identität und
Autorisierung ab, "eine Engine" (OPA, siehe SPRINT-27 Abgrenzung) bleibt
Gesetz und wird von diesem Sprint nicht angetastet.

**Stattdessen:** SPIRE säße darunter, als kryptografische
**Workload-/Node-Identität** (X.509-SVID), die belegt, dass ein Prozess
wirklich auf einem echten, von JiMesh provisionierten Node läuft, bevor er
einen Service-Key/Session-Token bekommt oder benutzt.

Konkrete Lücke, die das schließen würde: ein gespawnter Subagent-Container
bekommt heute einen **statischen Service-Key** vom Backend (SPRINT-38).
Wird dieser Key aus dem Container exfiltriert, kann er von einem beliebigen
anderen Ort aus wiederverwendet werden — das Backend hat aktuell keine
Möglichkeit zu prüfen, ob der Aufrufer wirklich der Container ist, für den
der Key gedacht war. SPIRE schließt das über Attestation: der SPIRE-Agent
auf dem Node prüft beim SVID-Abruf reale Fakten (Docker-Container-ID/
Labels, Unix-UID/PID-Cgroup), nicht nur einen mitgegebenen String.

## Scope-Abgrenzung (verbindlich)

- SPIRE ersetzt NICHT Headscale (Netzwerk-Mesh). Beide sind Singleton-
  artige Control-Plane-Services mit unterschiedlichem Job (Netzwerk vs.
  Workload-Identität), analog zur bestehenden 3-Node-Klassen-Topologie
  (`docs/ARCHITECTURE.md` §7.1).
- SPIRE ersetzt NICHT Keycloak/OPA/Service-Keys/K-LAF (Applikations-
  Identität + Autorisierung).
- Kubernetes-Helm-Charts fallen weg: JiMesh ist Ansible-only auf bare
  Nodes, kein K8s (`docs/ARCHITECTURE.md` §7.5, Real Gap 3: Docker-Compose
  in Produktion ist explizit unerwünscht, nicht nur noch nicht entfernt).
  SPIRE Server/Agent laufen als Ansible-provisionierte systemd-Services aus
  den offiziellen Binaries, nicht als Compose-Stack.
- SPIRE-Server-Datastore: bestehendes Postgres wiederverwenden, kein neuer
  Datenspeicher.
- AWS-IAM-Anbindung ist NICHT Teil dieses Sprints (kein verifiziertes
  Preset dafür, keine AWS-Node-Klasse in der aktuellen Topologie).

## Work Packages

- **WP1 — Research-Spike (read-only, kein Produktionscode).** SPIRE-Server
  als systemd-Service auf einem Test-Node lokal durchspielen (Referenz:
  `spire-tutorials/docker-compose/nested-spire` nur zum Verstehen, nicht
  als Deploy-Artefakt), Join-Token-Attestation, eine
  Docker-Workload-Attestor-Registration-Entry für einen Dummy-Container.
  Ziel: verstehen, nicht deployen.
- **WP2 — Ansible-Rolle `deploy/spire/` (Entwurf).** Analog zu
  `deploy/cp/headscale/`, das laut §7.5 Real Gap 2 selbst noch nicht fertig
  ist — die SPIRE-Rolle zieht NICHT vor Headscale-Fertigstellung, sondern
  übernimmt danach dasselbe Rollen-Muster.
- **WP3 — Attestation-Strategie festlegen.** Node-Attestation via
  Join-Token (analog zum bestehenden Headscale-Preauth-Key-Flow, §7.3),
  Workload-Attestation via Docker-Attestor für Subagent-Container.
- **WP4 — Integrationspunkt im Go-Backend.** `go-spiffe`-Client im
  Subagent-Spawn-Pfad, SVID-Prüfung ZUSÄTZLICH zum bestehenden
  Service-Key, nicht als Ersatz.
- **WP5 — Abnahme.** Ein gespawnter Subagent bekommt SVID + Service-Key;
  ein kopierter/replizierter Service-Key, präsentiert von einem
  nicht-SPIRE-attestierten Prozess, wird abgelehnt (Live-Beweis, kein
  Claim).

## Abnahme-Kriterien

1. WP1 ist dokumentiert (Findings, kein Code) — keine SPIRE-Instanz in
   Produktion ohne expliziten Folge-Sprint mit eigener Freigabe.
2. Kein bestehendes Auth/AuthZ (Keycloak/OPA/Service-Key/K-LAF) wird durch
   diesen Sprint verändert.
3. Jede Behauptung über SPIRE-Verhalten ist gegen die oben verlinkten
   echten Quellen oder eine eigene PoC-Ausführung geprüft, keine
   KI-Recherche ungeprüft übernommen.

## Abhängigkeiten / Reihenfolge

- **Blockiert durch:** SPRINT-40 (Headscale) — §7.5 Real Gap 2 muss zuerst
  geschlossen werden, SPIRE übernimmt dieselbe Ansible-Rollen-Bauweise.
- **Blockiert nicht:** unabhängig von SPRINT-45 (Router-Firewall).
