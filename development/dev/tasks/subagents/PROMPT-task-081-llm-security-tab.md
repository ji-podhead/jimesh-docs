# TASK-081 — LLM-Security-Tab: Guard-Historie + Verwaltung (Llama Guard Backend ist FERTIG)

**Status:** 🔲 offen | **Quelle:** Operator 14.9. („unter security ein llm security
tab bauen") + Claude-Klärung: das Backend existiert BEREITS (73a21b9: Llama Guard via
Mesh gemerged; TASK-064 baute /security/testing als Demo-Page) — was FEHLT ist die
dauerhafte Verwaltung, nicht der Scanner selbst.

## Aufgabe

1. **SURVEY zuerst** (nicht raten): was liefert das existierende Modell-Scanner-Backend?
   (internal/ai/ — Modell-Scanner-Hook, guard_hook_test; was landet in security_events
   bzw. sdk_logs wenn Llama Guard verdictet? type/alias/felder prüfen)
2. **LLM-Security-Tab** (Security-Sektion, E-IA-konform — Sub-Route /security/llm oder
   als Panel in Overview): 
   - Guard-Verdict-Historie (Liste der geprüften Requests: Verdict safe/unsafe, Regel,
     Modell-Chain, Zeitstempel)
   - Welche Chains/Modelle haben Guarding aktiv (aus der existierenden Konfiguration
     gelesen, nicht erfunden)
   - Stats über Zeit (safe/unsafe-Ratio, Top-Trigger-Regeln)
3. **Kein Backend-Neubau:** der Scanner-Flow ist fertig — du baust die SICHT darauf.
   Falls ein Read-Endpoint fehlt (z.B. GET /api/security/guard-events): nach bestehendem
   Muster ergänzen, API_DOCS pflegen
4. Verify: tsc --noEmit, check:i18n, Live-Curl (die Historie zeigt ECHTE Verdicts aus
   der DB — ehrlicher Empty-State wenn noch keine)
5. Task-File-Status

## Regeln
- Scope: src/frontend (neue Sub-Route + i18n), ggf. ein Read-Endpoint im Backend,
  API_DOCS, Task-File. NICHT internal/ai (Scanner läuft!), NICHT /security/testing
  (Demo-Page bleibt)
- GIT: explizite Pfade, kein -A, NICHT pushen
