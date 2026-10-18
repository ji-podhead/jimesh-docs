# TASK-016 — Epic 17: Policy-Konsolidierung (Roadmap §2)

> **Status:** ⏳ OFFEN · **Speist:** Epic 17 WP5 (RBAC-Kette), Roadmap §2 (Access Policy), `docs/research/R21-dap-skills-memory.md` §6 (Frage 4)
> **Ausführung:** diese GLM-Session (Doku-/Entscheidungsarbeit, kein Code-Overlap mit der Security-Charge 008–014)
> **Warum jetzt:** Ohne Konsolidierung baut Epic 17 WP5 eine **vierte** verstreute Scoping-Stelle — genau der Zustand, den Epic 12 „Access Policy" beseitigen soll

## Auftrag

- [ ] Bestandsaufnahme der drei bestehenden Scoping-Orte: (1) Budget-Quotas im Gateway (`quota_handlers.go`, `project_user_budgets`), (2) `rbac.go`-Rollenskelett, (3) Roadmap §2 Access-Policy-Konzept — je: was scoped es, wann wird geprüft, wo liegt der Zustand
- [ ] DAP `acl.md` 3-Layer-Stack als Referenz gegenüberstellen (Casbin-Protocol-ACL / Row-Level / Endpoint-Härtung — was deckt welche Fläche)
- [ ] saits-Kette (TASK-003) zuordnen: Claim → Middleware → Policy → Labels → Egress — welcher Layer wird bei JiMesh Go-Gateway-Code, welcher bleibt Config
- [ ] Entscheidungsvorlage P-R1 (Casbin-Go inline vs. OPA-Sidecar vs. eigene Middleware) mit JiMesh-spezifischen Kriterien: Einzel-VM-Betriebslast, Policy-Format/Versionierung, Testbarkeit, kaskadierende Scopes **vor** Budget-Check
- [ ] Ergebnis: EINE Enforcement-Entscheidung (Entwurf für DECISIONS.md) + Skizze der Scope-Kaskade (User → Project → Agent → Tool) mit Prüfreihenfolge
- [ ] Ablage: Entwurf in diesem File §Ergebnis; DECISIONS.md-Eintrag erst nach Operator-Freigabe (kein selbstständiges Entscheiden über Architektur)

## Regeln

Globale Regeln + Ergebnis-Format: `docs/tasks/README.md`.
Kein Code — diese Task produziert eine Entscheidungsvorlage. R21 §6 Frage 4 (Casbin vs. OPA) wird hier beantwortet oder als offener Punkt an P-R1 zurückgegeben.

## Ergebnis

**Status:** ✅ Entwurf fertig (6.9.2026) — Entscheidungsvorlage, Operator-Freigabe für DECISIONS.md nötig.

### Befund (Ist-Zustand, mit Fundstellen)

| # | Scoping-Ort | Was | Enforcement? |
|---|---|---|---|
| 1 | Budgets: `rbac.go:70 handleBudgetCheck` + `project_user_budgets` (Store) | Echter Check-Service: `account_disabled` → 403, `quota_exceeded` → **402**, sonst allowed+remaining | **NEIN** — nur Route-Registrierung (`gateway.go:264`), **kein einziger Call aus dem Proxy-Pfad**. Budgets werden angezeigt, nicht erzwungen. |
| 2 | Display: `gateway.go:1956–1967` | „Dynamic budgets" + **„Simulate some small initial token usage (e.g. 5% of budget) for visual representation"** | NEIN — fabrizierte Zahlen (Mandat-2-Verstoß im Display-Handler) |
| 3 | Rollen: `teams`/`team_members` (rbac.go, CRUD) | Rollen-Struktur existiert, keine Auswertung im Request-Pfad | NEIN |
| 4 | `model_scope` am Key | Chain/Modell-Scoping am Provider-Key (Bestand) | Teilweise (Routing-Kontext, kein Gate) |
| 5 | Roadmap §2 | Zielarchitektur bereits vorgeschrieben: **ein Policy-Objekt, an einem Ort aufgelöst, kaskadierend (Team → Projekt → User/Agent), VOR dem Budget-Check** + Datenresidenz-Achse + Audit-Nebenprodukt | — |

### Entlastender Befund

Der Enforcement-Baustein **existiert bereits als Service** (`handleBudgetCheck` mit echter 402/403-Semantik) — Epic 17 ist nicht „Policy-Engine bauen", sondern **Wire-in**: ein Aufruf im Proxy-Pfad plus ein Policy-Struct als Aggregat aus bestehenden Tabellen. Der natürliche Hook ist direkt neben TASK-011s `resolveSessionID` im Proxy-Pfad (`handleChatCompletionsProxy`, `gateway.go:2717`).

### Entscheidungsentwurf (für DECISIONS.md nach Freigabe)

1. **Enforcement-Punkt:** EIN Aufruf `s.resolvePolicy(sessionID)` im Proxy-Pfad, direkt nach der Session-Auflösung (WP1-Anker), **vor** Modell-Auswahl und Budget-Check (Roadmap-Reihenfolge-Regel: sonst wird ein nicht erlaubter Call bezahlt).
2. **Kein Casbin/OPA für v1.** Begründung: Der Budget-Block ist gebaut; die Role-Achse ist ein Aggregat aus drei bestehenden Tabellen. Eine Policy-Engine lohnt erst, wenn die Achsenzahl die Hand-Rolle sprengt — P-R1 (Casbin-Go vs. OPA) bleibt offen, ist aber vom kritischen Pfad **entkoppelt**. DAP `acl.md` 3-Layer bleibt Referenz für die spätere Stufe.
3. **Kaskade:** Team → Projekt → User/Agent; jeder Layer kann nur **verengen** (Intersektion, nie Erweiterung).
4. **Simulate-Stelle entfernen** (Mandat 2): echte Werte anzeigen, auch wenn 0.
5. **Datenresidenz-Achse** (Roadmap §2, DSGVO/Real-Estate-Zielmarkt): als Provider-Constraint-Feld im Policy-Struct, Enforcement = Routing-Filter — eigener Teilschritt nach dem Grund-Wire-in (M).
6. **Migration:** kein neues Schema — Policy = Aggregat aus `teams`/`team_members` + `project_user_budgets` + `model_scope` + WP1-Sessions (Identitätsanker).

### Aufwand

| Schritt | Aufwand |
|---|---|
| Wire-in `resolvePolicy` + Policy-Struct-Aggregat | S–M |
| Simulate-Stelle entfernen | S |
| Datenresidenz-Achse (Routing-Filter) | M |
| Casbin/OPA-Evaluierung | zurückgestellt (P-R1) |

### Offene Fragen

1. Freigabe der Entscheidungsvorlage für DECISIONS.md? (Operator)
2. Wire-in direkt nach TASK-011s Merge (der Session-Anker liegt dann auf main) — oder separat?
3. Simulate-Entfernung: eigener Commit oder mit dem Wire-in zusammen?
