# TASK-085 — `docs_temp` & OpenAPI + Static HTML GitHub Pages Pipeline

Rolle: Du arbeitest im JiMesh-Repo unter den Operator-Mandaten M1–M7.

## KONTEXT
- Dokumentations-Export für das öffentliche Repository: Ein entkoppelter Ordner `docs_temp/` soll als künftiger öffentlicher Dokuzweig dienen.
- OpenAPI & Static HTML: Das Backend soll sein API-Schema als `openapi.json` bereitstellen. Anstelle schwerfälliger Frameworks (kein Docusaurus, kein MkDocs) wird ein schlanker Static-HTML-Renderer (Scalar / Stoplight Elements) genutzt.
- GitHub Pages Build Workflow: Ein gemeinsamer CI-Workflow baut das Frontend SPA und kompiliert die OpenAPI-Dokumentation + Blog-Artikel zu statischem HTML.

## AUFGABE
1. **Ordner `docs_temp/` aufsetzen (WP1)**:
   - Erstelle `docs_temp/` mit gereinigten Kopien der öffentlichen Dokumente (`API_DOCS.md`, `ARCHITECTURE.md`, `USER_GUIDE.md`, `K-LAF-ARCHITECTURE.md`, `PRODUCT-ROADMAP.md`).
   - Entferne alle internen Entwickler-Pfade, Worktree-Anekdoten und vertraulichen Notizen.
2. **OpenAPI JSON Generator (WP2)**:
   - Stelle sicher, dass die Go API ein valides `/openapi.json` aus den registrierten Routen erzeugen oder bereitstellen kann (`GET /api/bridge/openapi.json` oder zentral `/openapi.json`).
3. **Static HTML OpenAPI Renderer & GitHub Pages Workflow (WP3)**:
   - Erstelle ein eigenständiges statisches HTML-Template (`docs_temp/index.html`), das Scalar oder Stoplight Elements via CDN/Asset einbindet und `/openapi.json` rendert.
   - Erstelle den GitHub Pages Workflow (`.github/workflows/static-pages.yml`), der Frontend-Assets + API-Docs in einem Schritt zu statischem HTML baut.
4. **Blog / Articles Integration (WP4)**:
   - Binde die Blog-Sektion für Veröffentlichungen und Releases in den statischen Seitenbau ein.

## ACCEPTANCE
- Ordner `docs_temp/` existiert mit gereinigter öffentlicher Dokumentation.
- `/openapi.json` ist vom Backend abrufbar und valide.
- Statische HTML-Seite mit Scalar/Stoplight Elements rendert das Schema fehlerfrei ohne MkDocs/Docusaurus.
- `.github/workflows/static-pages.yml` ist angelegt.

## LIVE-VERIFY
- `curl -s http://localhost:19091/openapi.json | jq .` liefert ein valides OpenAPI 3.0 Schema.
- Statische HTML-Seite lädt und zeigt alle Endpunkte übersichtlich an.
