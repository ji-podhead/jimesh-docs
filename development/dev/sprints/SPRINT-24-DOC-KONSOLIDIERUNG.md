# SPRINT-24 — Doc-Konsolidierung (Epic 11)

**Quelle:** Doc-Audit 6.9.2026 (85 Markdown-Dateien, Trennlinie 03.09. =
FreeLLMAPI-Legacy / 06.09. = gepflegt). Bisher nur Backlog, nie als Sprint
begonnen.

## Ziel

Legacy-Docs und Widersprüche bereinigen, bevor die Sprint-21-Docs-Phase
(OpenAPI/README/SVGs) auf einer sauberen Basis aufsetzt — sonst wird auch
das neue Doc-System mit denselben Altlasten verunreinigt.

## Work Packages

- **WP1 — Legacy verschieben/löschen:** `docs/PROJECT_STRUCTURE.md`,
  `docs/install.md`, `docs/architecture.md` (Case-Kollision mit
  `ARCHITECTURE.md` — auf case-insensitiven Dateisystemen ein echter
  Konflikt!), `docs/docker/README.md`, `docs/README.md` → nach
  `docs/legacy/` oder löschen.
- **WP2 — `SECURITY.md` neu schreiben:** zeigt aktuell auf fremdes Repo +
  fremde Meldeadresse (Rest vom Fork/Rename) — Sicherheits-relevant,
  nicht kosmetisch.
- **WP3 — Route-Referenz konsolidieren:** `docs/api.md` vs. `API_DOCS.md`
  — zwei konkurrierende Quellen. `API_DOCS.md` ist die gepflegte
  (Sprint 20/21-Konvention "Route nicht in gateway.go = existiert nicht"
  MUSS mit genau einer Doku-Quelle zusammenhängen).
- **WP4 — Tote Feature-Doku entfernen:** `docs/fetch-relay.md` beschreibt
  ein Feature, das im Go-Backend nicht existiert (kein `PROXY_MODE`-Treffer)
  — erst real, wenn Epic 13 WP3 (Link-Preview-Relay) gebaut wird.
- **WP5 — `docs/BUILD-STATUS.md` ehrlich machen:** reine Positivliste,
  widerspricht bekannten Umgebungs-Realitäten (Mandat 6, Verifikation).
- **WP6 — Sprint-Retrospektiven nachziehen:** Sprint 13/14 stehen auf
  "PLANNED", obwohl der Code existiert und kompiliert (bestätigt durch
  R20-Review-Ära) — Retrospektive korrigieren (Mandat "Retrospective
  Honesty").
- **WP7 — Duplikat löschen:** `docs/research/ultra.md` ist byte-identisch
  mit R18 (md5 `b9d796b8`).
- **WP8 — Zitat korrigieren:** R15/R17 zitieren arXiv:2406.04692 als
  FrugalGPT — das ist Mixture-of-Agents; FrugalGPT ist 2305.05176.
- **WP9 — Entropy-Routing-Konflikt auflösen:** 4 inkompatible Designs
  (R4 / R8 / `DECISIONS.md` live-verifiziert / R15+R17 RouteLLM) — braucht
  eine Operator-Entscheidung, welches Design gilt (siehe auch
  `docs/research/entropy_routing_conflict.md`-Memory-Eintrag, falls
  vorhanden). Diese Sprint-Datei löst NICHT die Entscheidung, sondern
  macht sie sichtbar — Entscheidung selbst gehört in `DECISIONS.md`.

## Akzeptanzkriterien

- [ ] Kein Doc verweist mehr auf ein fremdes/verkauftes Repo
- [ ] Genau eine Route-Referenz-Quelle (`API_DOCS.md`)
- [ ] Keine als "PLANNED" markierte Sprint-Doku für bereits kompilierten Code
- [ ] Entropy-Routing-Konflikt hat einen benannten Owner + Ziel-Entscheidungsdatum

## Referenz

`docs/backlog/BACKLOG.md` Epic 11 (Originalquelle der WP-Liste).
