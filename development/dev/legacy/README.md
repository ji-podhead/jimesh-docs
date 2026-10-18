# Legacy-Dokumentation (Upstream-Erbe)

Dieser Ordner enthält Dokumentation, die aus dem fremden Upstream-Projekt
**FreeLLMAPI** (Node.js + Express, better-sqlite3, Electron-Desktop-App)
übernommen wurde. Sie beschreibt **nicht** die Realität dieses Repositories:
JiMesh ist ein Go-Backend (CGO-frei) mit PostgreSQL und Redis, und die dort
beschriebenen Verzeichnisse `clients/cli/`, `clients/desktop/` und `server/`
existieren nicht mehr (siehe `CLAUDE.md` — Referenzen darauf sind Bugs).

Die Dateien werden aus historischen Gründen aufgehoben statt gelöscht: sie
dokumentieren, woher Teile der Idee stammen, und dienen als Referenz beim
Nachziehen von Konzepten. **Nichts hier ist als Anleitung zu benutzen.**
Maßgeblich sind stattdessen:

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — die tatsächliche Architektur
- [`../../API_DOCS.md`](../../API_DOCS.md) — die maßgebliche Route-Referenz
- [`../../OPERATOR_GUIDE.md`](../../OPERATOR_GUIDE.md) — Betrieb und Deployment

## Inhalt

| Datei | Warum veraltet |
|---|---|
| [`architecture.md`](architecture.md) | Beschreibt einen Express-Proxy auf Port `:3001`, better-sqlite3 als Persistenz und ein `client/`-Frontend mit React+Vite. Kollidierte außerdem namentlich mit dem gepflegten `docs/ARCHITECTURE.md`, was auf case-insensitiven Dateisystemen (macOS/Windows) einen Clone bricht. Der weiterhin gültige Teil — Provider-ToS-Review und Free-Tier-Limitations — wurde nach [`../PROVIDER-TOS.md`](../PROVIDER-TOS.md) gerettet. |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Verzeichnisbaum mit `cli/`, `server/` und `desktop/`. Praktisch jede Aussage ist falsch; die tatsächliche Struktur liegt unter `src/backend/` und `src/frontend/`. |
| [`install.md`](install.md) | 351 Zeilen Node-Installation, Electron-Desktop-App und SQLite-Backups. Die reale Installation läuft über Docker Compose und die `make`-Targets. |
| [`docker/README.md`](docker/README.md) | Container-Doku für Port `3001`, die Variable `ENCRYPTION_KEY` und das fremde Image `ghcr.io/tashfeenahmed/freellmapi`. Der reale Stack ist die `docker-compose.yml` im Repo-Root (Backend-HTTP auf Host-Port `19091`). |
