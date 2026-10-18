# TASK-066 — Vault-Konsolidierung nach E-IA (VaultDashboard gewinnt, /security/vault → Project Secrets)

**Status:** ✅ abgeschlossen 13.9. (SPRINT-40-CONSOLIDATION.md) — Inventar-Ergebnis:
NICHTS aus VaultPage übernommen (alle Unique-Features — allowedAgents-Liste,
JIT-Tokens, Audit-Log, Encryption-Warnbanner, Value-Reveal — sind K-LAF-
Laufzeit-Secret-Features und bleiben auf der Project-Secrets-Seite; Engine-
CRUD/Import/Export waren nie dort). Platform-Tab gebaut (PLATFORM_BASES =
/control-planes, /vault-dashboard, /networks), VaultDashboardPage = „Vault",
VaultPage.tsx → ProjectSecretsPage.tsx, Route /security/vault →
/security/secrets + Redirect (TASK-063-Muster), Palette 2 Einträge, i18n
61 Locales, check:i18n grün (1979 Keys), Live :19090 dreimal 200.
Parallel-Kollisions-Takeover dokumentiert (toter 066-Agent hatte 28a9c00
mit Müll-Platzhaltern in 58 Locales committet — korrigiert; Teile via
Rescue-Sweeps unter fremden Messages committet, s. Sprint-File).
Die Auflage „NICHT mehr blind mergen" war damit erfüllt.

**E-IA hat entschieden:**
1. **VaultDashboardPage gewinnt den Namen „Vault"** → lebt im NEUEN Platform-Tab
   (mit Control-Planes + Networks)
2. **/security/vault (VaultPage) wird „Project Secrets"** → bleibt im Security-Tab
   (per-Project K-LAF-Laufzeit-Secrets), reduziert auf die Projekt-Secret-Liste
3. workspace-secrets-section.tsx bleibt wie es ist (creation-time choice)

## Aufgabe

1. **VaultPage.tsx inventarisieren ZUERST:** was hat es, das VaultDashboardPage
   NICHT hat? (Projekt-gebundene Secret-List-UX vermutlich) — Fundstellen dokumentieren
2. **VaultDashboardPage.tsx** wird DIE Vault-Seite:
   - Nav-Eintrag wandert von PROJECT_BASES in den neuen **Platform-Tab** (E-IA:
     App.tsx navGroups erweitern — Platform zwischen Workspaces und Security,
     ROUTE_PLAT = ['/control-planes', '/vault-dashboard', '/networks'])
   - Einzigartige VaultPage-Features falls vorhanden übernehmen
3. **VaultPage.tsx** wird „Project Secrets" (Security-Tab bleiben):
   - Umbenennen (nav.projectSecrets, i18n de/en), Route bleibt /security/vault oder
     wird /security/secrets (wähle konsistent zu den Security-Siblings)
   - Reduziert auf Projekt-gebundene Secret-Liste (K-LAF-Kontext: diese Secrets liest
     der Guard zur Laufzeit) — Engine-CRUD/Import/Export gehören NICHT hier (das
     hat VaultDashboard)
4. **Redirect:** alte /vault-dashboard oder /security/vault-Pfade die nicht mehr
   existieren → Redirect-Muster wie TASK-063 (/logs → /sdk-logs)
5. **Command-Palette** (App.tsx) updaten: beide Einträge korrekt benannt+gruppiert
6. **Verify:** tsc --noEmit clean, npm run check:i18n grün (backfill-i18n.mjs bei
   Key-Änderungen), Live-Curl :19090 beide Routes 200, Compile-Error-frei
7. **Doku:** API_DOCS (keine Route-Änderung wenn nur Frontend), SPRINT-40-CONSOLIDATION.md
   (was entfernt/gehalten/verschoben wurde + E-IA-Referenz), Task-File-Status

## Regeln
- Scope: src/frontend/** (App.tsx navGroups + beide Pages + i18n), Task-File,
  Sprint-File. NICHT Backend (Routes existieren), NICHT workspace-secrets-section.tsx
- GIT: explizite Pfade, kein -A, NICHT pushen (Staging-Lesson!)
