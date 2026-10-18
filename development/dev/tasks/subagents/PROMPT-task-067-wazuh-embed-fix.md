# TASK-067 — Wazuh-Dashboard-Embed fixen (Self-Signed-Cert bricht im Iframe)

**Status:** ✅ erledigt (13.9.2026, Option 1) | **Quelle:** SecurityOverviewPage embedet https://localhost:5601 (Wazuh-Dashboard, self-signed cert) in einem iframe — Browser lehnt ab, kein Cert-Interstitial im Iframe möglich.

## Aufgabe (Option 1 bevorzugt, prüfe zuerst ob Option 2 trivial ist)
1. **Option 1:** iframe ersetzen durch einen Link (target="_blank") der das Wazuh-Dashboard in einem neuen Tab öffnet — User akzeptiert das Cert einmal in dem Tab; simpel und robust
2. **Option 2 (falls trivial):** Wazuh-Dashboard durch gleiches TLS-Termination reverse-proxyen oder mkcert/local-CA dokumentieren
- Verifiziere: KEIN iframe mit self-signed origin bleibt, der neue Link/Tab ist korrekt verdrahtet
- SPRINT-32-SIEM-FOUNDATION.md (oder wo TASK-064 die iframe-Entscheidung dokumentierte) updaten
- GIT: explizite Pfade, kein -A, NICHT pushen

## Ergebnis (13.9.2026)

- **Option 2 geprüft → nicht trivial → verworfen:** Das Dashboard terminiert TLS selbst mit eigenem selbstsignierten Cert (`deploy/wazuh/docker-compose.siem.yml`, `gen-certs.sh`, `SERVER_SSL_CERTIFICATE=dashboard.pem`); das JiMesh-Frontend selbst läuft ohne TLS — es gibt kein „gleiches", browser-vertrautes TLS für einen Reverse-Proxy zum Aufsitzen (wäre neue Backend-Route + Edge-TLS-Setup); mkcert/Local-CA wäre eine Ops-Prozedur auf jeder Operator-Maschine.
- **Option 1 umgesetzt:** iframe (ex-`SecurityOverviewPage.tsx:101-108`) entfernt, ersetzt durch prominenten `target="_blank"`-Link (`href` aus `wazuhDashboardURL()` = bestehende Verdrahtung `WAZUH_DASHBOARD_PORT=5601` + `window.location.hostname`; keine Env/Config-Variable vorhanden, deshalb bleibt die bestehende Konstante die Quelle). Der kleine „Open in new tab"-Header-Link (der iframe-Fallback) entfiel mit — die Kachel hat jetzt genau einen klaren CTA statt zweifachem Link + totem Frame.
- **Kein weiterer Fallback-Text:** der bestehende `wazuhTile.fallbackNote` („Falls der Frame oben leer bleibt …") war iframe-Referenzierend und damit nach dem Entfernen falsch — Key aus der Kachel und aus allen 60 Locale-Dateien entfernt, kein Ersatz-Fallback eingebaut. `wazuhTile.description` erklärt stattdessen den echten Grund (selbsigniertes Cert, Browser verweigert Frame, Cert im neuen Tab einmalig akzeptieren).
- **Fundstellen:** `src/frontend/src/views/SecurityOverviewPage.tsx:64-76` (Begründungs-Kommentar TASK-067), `:83-113` (`WazuhDashboardTile`: iframe → Link), `src/frontend/src/i18n/locales/en.json` + `de.json` (description neu, fallbackNote weg), 58 weitere Locales english-verbatim nachgezogen; Doku: `docs/sprints/SPRINT-32-SIEM-FOUNDATION.md` (WP-Frontend WP 2 + TASK-067-Korrekturabsatz).
- **Verifiziert:** kein `<iframe>` mit der Self-Signed-Origin mehr in der Security-Page (grep über `src/frontend/src`, einziger Wazuh-iframe war dieser); `npm run check:i18n` grün (60 Locales, 1903 Keys); `tsc --noEmit -p tsconfig.app.json`: 0 Fehler in den geänderten Dateien (205 pre-existing Fehler in unverwandten Dateien — keys/*, chain-mesh-graph, FallbackPage — unberührt).
- **Scope gewahrt:** außerhalb der Wazuh-Kachel wurde `SecurityOverviewPage.tsx` nicht verändert (Filter/Tabelle/Nav = TASK-069/074-Territorium unberührt).
