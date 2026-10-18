# SPRINT-49: WorkspaceDetailPage.tsx — Fake-Daten-Cleanup (Item 4)

**Datum:** 21.9.2026 · **Ursprung:** Item 4 aus der GLM-Session — WorkspaceDetailPage.tsx enthielt massiv hardcodierte Fake-Daten (die Blocker für den SPRINT-48 Hierarchie-Fix wurden schon entfernt, aber der Rest nicht).

## Plan

**Ziel:** Alle erfundenen Daten aus WorkspaceDetailPage.tsx entfernen und durch echte API-Aufrufe oder ehrliche Empty-States ersetzen.

**Work Packages:**
- WP1: Hardcodierte Secrets-Liste entfernen (API_KEY_BINANCE_PROD etc., ~Zeile 129) — ersetzen durch echte Vault-Daten (GET /api/vault/secrets) oder ehrliche Empty-State
- WP2: GET /api/security/findings Aufruf ersetzen (Zeile ~112) — dieselbe Route existiert Backend-NICHT; auf /api/security/findings/dismissed oder /api/security/events umstellen (wie SecurityFindingsPage gefixt)
- WP3: Erfundene Werte im Rendering entfernen ("12ms" Latenz, "us-east-prod-mesh", "10.240.0.14/32") — durch echte API-Daten oder '—' ersetzen
- WP4: Verifikation: tsc 0 neue Fehler, keine Mock-Daten

**Abnahmekriterien:**
- Kein hardcodiertes Array/Objekt das als echte Daten ausgegeben wird
- Alle API-Aufrufe gehen an existierende Backend-Routen
- tsc: 0 neue Fehler in dieser Datei
