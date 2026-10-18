# SPRINT-25 — Rich Output Rendering (Epic 13)

**Anlass:** Links (z. B. Produktseiten) und Git-Diffs aus Docker-Logs und
Agent-CLIs (Gemini CLI, Claude Code, DSH) sollen im Dashboard klickbar
bzw. gerendert sein. Bisher nur Backlog, nie als Sprint begonnen.

## Ziel

Eine Rendering-Pipeline, drei Ebenen — vom reinen Terminal-Link-Klick bis
zum optionalen Link-Preview-Relay.

## Work Packages

- **WP1 — Terminal-Layer (xterm.js):** `WebLinksAddon` (URLs) + custom
  `LinkProvider` für `path:line`-Referenzen + OSC-8-Passthrough (moderne
  CLIs emittieren Hyperlinks selbst, Docker-Logs nicht — Regex-Fallback
  nötig). Klick-Regel: externe Links nur per Klick, neuer Tab
  (`rel="noopener noreferrer"`), Domain-Badge sichtbar. `path:line` öffnet
  den Datei-Viewer (CodeMirror, Epic 1 WP3 — Abhängigkeit, prüfen ob WP3
  schon steht). **Kein Auto-Fetch** — Agent-Output ist nicht
  vertrauenswürdig (Nested-Injection-Lektion aus Sprint 19, K-LAF).
- **WP2 — Struktur-Kanal statt ANSI-Scraping:**
  `GET /api/projects/{id}/git/diff|status|log` (SSH-Exec, selbes Muster
  wie `/ports` aus Sprint 15 WP1 bzw. die neue `internal/deploy`-Domäne)
  → Diff2Html-Widget. Docker-Logs (`docker compose logs -f`) und Terminal
  laufen ohnehin über dieselbe SSE-Pipeline (R11) — nur das Widget
  unterscheidet sich.
- **WP3 — Link-Preview via Gateway-Fetch-Relay (optional, später):** macht
  `docs/fetch-relay.md` real (aktuell Doku für ein nicht existierendes
  Feature, siehe SPRINT-24 WP4). **SSRF-Guards sind Pflicht, nicht
  optional:** Link-Local inkl. `169.254.169.254` blocken (K-LAF WP5
  Egress-Allowlist-Konvention direkt weiterverwenden), Private-Ranges
  blocken, Content-Type-Allowlist, Size-Cap.

## Akzeptanzkriterien

- [ ] WP1: kein Auto-Fetch von Agent-Output-Links, verifiziert
- [ ] WP2: Diff-Endpoint nutzt denselben SSH-Exec-Pfad wie bestehende Deploy-Domäne, keine zweite SSH-Implementierung
- [ ] WP3 (falls gebaut): SSRF-Test gegen `169.254.169.254` schlägt fehl (Request wird geblockt)

## Referenz

`docs/backlog/BACKLOG.md` Epic 13.
