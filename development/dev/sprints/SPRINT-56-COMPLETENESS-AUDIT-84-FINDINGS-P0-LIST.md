# SPRINT-56 — Vollständigkeits-Audit (84 Funde), P0-Liste ersetzt BACKLOG.md als Quelle der Wahrheit

**Status:** ✅ Audit-Ergebnis übernommen, gegen 2 Stichproben verifiziert (beide bestätigt).
**Quelle:** Operator hat ein separates, umfassendes Vollständigkeits-Audit (84 Funde,
kategorisiert Backend/Frontend/Integrations/Plugins/Security/Agent-Features/Deploy-DevOps/
Utility, priorisiert P0/P1/P2) eingebracht.
**Verifiziert (2026-09-27, eigene Stichproben, nicht blind übernommen):**
- Phantom-MCP-Routen bestätigt: `internal/mcpserver/tools_{github,dsh,linear}.go` rufen
  `/api/plugins/{github,dsh,linear}/*` auf — `internal/gateway/gateway.go` registriert im Mux
  NUR `/api/plugins/jules/*`. Die anderen drei würden real 404 werfen.
- Firebase/Gmail/GDrive: 0 Treffer im gesamten `src/backend` — "0 Code" bestätigt.

**Ab jetzt gilt:** `docs_dev/backlog/BACKLOG.md` ist NICHT mehr die alleinige Quelle der Wahrheit
für diese 84 Punkte — mehrfach heute bestätigt (Datalake, CI-Regression, Plugin-Persistenz-Stub),
dass BACKLOG-Zeilen veraltet/falsch sein können. Diese Liste hier + die heutigen
AUDIT-2026-09-27-*.md-Dateien sind aktueller.

## Die 11 P0-Lücken (vom Operator explizit verlangt, nie gebaut) — Prioritätsliste für GLM

1. **Llama-Guard-Dashboard + per-Project-Guard-Rules** — Backend fertig, 0 Frontend.
2. **Prompt-Injection-Enforcement via eBPF/Tetragon** — bereits heute als konkreter nächster
   Schritt in `docs/planning/sprints/rm32_guardrails_concept.md` (jimesh-crew) dokumentiert.
3. **Plugin-Installations-Persistenz** — bestätigt durch den heutigen Task-Docs-Audit:
   `POST /api/plugin-installations` ist No-Op (`success:true` ohne DB-Write), `GET` immer leer.
4. **Multi-Select-Endpoint-Audit-Tabelle** — Operator-Bedingung "BEVOR Multi-Select-UI" verletzt.
5. **Streaming-Response-Guard-Scan** — Agenten-Workflows laufen streaming, ungeschützt.
6. **SIEM-Permanent-Scan-Rest** (Shipper JiMesh→Wazuh, Wazuh-Ruleset, `make siem`-Targets).
7. **GO-PUBLIC Phase 0-2** — Credential-Rotation, Tree-Scrub, History-Rewrite — nichts ausgeführt.
8. **gVisor: crew1-7 laufen weiter unter runc** — deckt sich mit jimesh-crew RM26 (noch offen).
9. **Phantom-MCP-Routen** — `/api/plugins/{linear,github,dsh}/*` nicht im Gateway registriert,
   heute selbst verifiziert (siehe oben).
10. **Firebase/Gmail/GDrive** — 0 Code, heute selbst verifiziert.
11. **Secrets-Rotate aus dem Vault-UI** — fehlt.

## Verteilung insgesamt (nicht einzeln nachverifiziert, Quelle als glaubwürdig eingestuft)

Backend 18 (P0:5) · Frontend 14 (P0:1) · Integrations 9 (P0:0) · Plugins 8 (P0:1) ·
Security 8 (P0:2) · Agent-Features 8 (P0:1) · Deploy/DevOps 10 (P0:1) · Utility 7 (P0:0) ·
**Gesamt 84, davon 11 P0, 37 P1, 36 P2.**

## Nächster Schritt

BACKLOG.md sollte einen Hinweis-Header bekommen ("siehe SPRINT-56 für aktuelleren Stand"), statt
jede der ~170 Zeilen einzeln nachzuziehen — das wäre der nächste eigene Task, hier nicht mehr
im verbleibenden Rahmen gemacht.
