# SPRINT-45 — jimesh-router als Platform-Firewall

Ausgelöst durch den Recovery-Vorfall vom 16.9. (Tailscale-Primärverbindung
auf `trading` kaputt, SSH-Zugang zwischenzeitlich verloren). Operator-
Direktive danach: `jimesh-router` (real, gebaut in Sprint 36/38/41, bisher
nur als Opt-in-Feature für Kunden-Projekte via `edgeNode: true`-Deploy-
Checkbox genutzt) soll zusätzlich den **Plattform-eigenen** Traffic filtern
— nicht nur Kunden-Workspaces.

## Befund

`jimesh-router`s Alias-/Firewall-Mechanik (`firewall.go`, TASK-050) ist
generisch: sie iteriert die Alias-Registry (`Registry.Snapshot()`), löst
jeden Alias-`host` auf einen lokalen Docker-Container auf und setzt darin
eine default-DROP-nftables-Tabelle (`jimesh_inbound`), erlaubt nur
Loopback/established/den Router selbst/explizite Operator-Grants. Das ist
protokoll-agnostisch — die `kind`-Spalte (`postgres`/`redis`) steuert nur
den Daten-Relay, nicht die Firewall-Iteration. Eine Alias-Zeile für
`jimesh-backend` (kind bleibt `postgres`, wird nie über den PG-Relay
angesprochen) reicht, um den Backend-Container unter echte
nftables-Enforcement zu stellen.

Einschränkung: Das gesamte Router-Ökosystem (Service-Keys, Alias-Registry,
Firewall-Grants) ist **projekt-scoped** in der bestehenden Multi-Tenant-DB
(`CreateServiceKey(projectID, …)`, `router_aliases.project_id`). Für die
Plattform selbst gibt es keine "Projekt"-Zeile — wird über einen
reservierten internen Projekt-Datensatz gelöst (kein neuer Go-Code nötig).

## Ziel

`jimesh-router` läuft auf `trading`, meldet (Report-Loop, immer an) den
echten nftables-Zustand, und — nach expliziter Freigabe — erzwingt
(Enforce-Loop, `--firewall=true`), dass nur Traefik (der VPN-only
Ingress) den `jimesh-backend`-Container erreichen kann.

## Work Packages

- **WP1 — Platform-Projekt + Service-Key bootstrappen.** Ein interner
  Projekt-Datensatz (nicht kundensichtbar) + `CreateServiceKey` dafür.
- **WP2 — `deploy/jimesh-router/` (Ansible-Service).** Image-Build aus
  `src/backend/cmd/jimesh-router/Dockerfile` (gleiche Stream/Build-
  Pipeline wie `deploy/backend/`), Container mit Docker-Socket-Zugriff
  (für die nft-Helper-Pattern), `--firewall=false` (Report-only) als
  Start-Default.
- **WP3 — Alias-Registrierung.** `jimesh-backend` als Alias via
  `POST /api/router/config` (Service-Key, project-pinned).
- **WP4 — Verifikation Report-only.** `GET /api/firewall/status` zeigt
  echten, gemessenen Zustand vom Router-Host.
- **WP5 — Enforcement (SEPARATER, explizit freigegebener Schritt).**
  Firewall-Grant für Traefiks Zugriffspfad via `POST /api/firewall/rules`,
  danach `--firewall=true` redeploy, danach Live-Verifikation (Dashboard
  über VPN weiterhin erreichbar, alles andere geblockt).

## Abnahme-Kriterien

1. Report-only: `docker logs jimesh-router` zeigt periodische
   `firewall: report` Zyklen, keine Fehler.
2. `GET /api/firewall/status` (Dashboard) zeigt `jimesh-backend` mit
   echtem, gemessenem nftables-State (nicht `enforcementEnabled: true`
   vor WP5).
3. WP5 erst nach Live-Test: Dashboard über VPN weiterhin `HTTP 200`,
   direkter Verbindungsversuch von einer NICHT gewhitelisteten Quelle zum
   Backend-Container schlägt fehl.

## Was das NICHT ist

- Kein Ersatz für Traefik (bleibt der HTTP-Ingress/VPN-Gate).
- Keine Nutzung von `internal/deploy/projects_ssh.go`s Kunden-Deploy-Pfad
  — eigener Ansible-Task, eigene Docker-Instanz auf `trading`.
- WP5 (echte Enforcement) läuft NICHT automatisch — erfordert explizite
  Freigabe nach Stufe-1-Verifikation (Risiko: default-DROP auf dem
  laufenden Backend-Container kann das Dashboard aussperren, wenn der
  Grant falsch ist).

## Status

- [ ] WP1 Platform-Projekt + Service-Key
- [ ] WP2 `deploy/jimesh-router/`
- [ ] WP3 Alias-Registrierung
- [ ] WP4 Verifikation Report-only
- [ ] WP5 Enforcement (wartet auf Freigabe)
