# PLUGIN-RESEARCH: ARTEMIS (Google) — Mobile Device Automation

> **Repo:** https://github.com/google/artemis
> **Stars:** wachsend (neues Google-Projekt) · **Language:** Python 3.12+ · **License:** Apache-2.0
> **Logo:** assets/icons/integrations/artemis.svg

## Was es ist
**"Let AI assistants and test suites use real phones like a human."**

Google's ARTEMIS ist ein MCP-Native-Server für Android-Geräte-Automation:
- **Cross-App Automation** aus Natural-Language-Instructions
- **Multimodal Targeting** (Element-Indizes → Koordinaten → Visual Fallback)
- **IDE Diagnostics via MCP**: Antigravity, Claude Code, Windsurf können Geräte steuern + **Logcat** + **Screenshots** sammeln
- **Flash Execution**: 3-5s pro Schritt (asynchrone History-Summaries)
- **AndroidWorld 99%+**: SOTA auf Google Research's AndroidWorld Benchmark (100+ Multi-Step-Tasks)
- **Multimodal**: Gemini, Claude, GPT-4o, Qwen-VL

## Warum PERFEKT für JiMesh

| Eigenschaft | Nutzen für JiMesh |
|---|---|
| **MCP Native Server** | Passt exakt zu unserem MCP-Dual-Support (REST + MCP) — deploy als MCP-Container |
| **Multimodal (OpenAI/Claude/Gemini)** | Nutzt den **JiMesh LLM-Proxy (/v1)** — keine externe API nötig |
| **Android-Automation** | Ergänzt Playwright (Web) + KasmWeb (Browser) um **MOBILE Testing** |
| **Logcat + Screenshots** | Test-Artifacts als Components (test-results, screenshots in Design-Folder) |
| **99%+ Success Rate** | Production-quality für Deployment-Testing |
| **Apache-2.0** | Uneingeschränkt integrierbar |

## Integration als JiMesh-Plugin

### Deployment-Typ
- **Container-Plugin**: ARTEMIS + ADB (Android Debug Bridge) als Container auf SSH-Target
- Oder: Remote-ADB zu physischen/emulierten Android-Geräten im Netz
- Framework: `"artemis"` (neuer Deploy-Framework-Typ)

### Was es in JiMesh macht
1. **Mobile Test-Suite**: Nach einem App-Deploy läuft ARTEMIS die Mobile-Tests
2. **Device-Farm**: Mehrere Android-Geräte (emuliert via Android-X container oder physisch via VPN-ADB)
3. **Cross-Platform Testing Pipeline**:
   ```
   Deploy Container → Web-Tests (Playwright) → Mobile-Tests (ARTEMIS) → Report
   ```
4. **MCP-Integration**: Agent kann ARTEMIS als Tool nutzen (Screenshots machen, App testen)
5. **Logcat-Stream**: Wie Container-Logs aber für Android (als `device-logs` Component)

### Plugin-Catalog-Eintrag
- **Kategorie**: Testing & Automation
- **Icon**: artemis.svg
- **Berechtigungen**: ADB-Zugriff, LLM Proxy write (für Natural-Language-Steuerung)
- **Config**: Device-Auswahl (Emulator/Physisch), Modell-Chain (nutzt JiMesh-Proxy), Test-Suite-Definition
- **Install-Wizard**: Schritt 1: Device auswählen (ADB) → Schritt 2: LLM-Chain auswählen → Schritt 3: Test konfigurieren

### Verhältnis zu bestehenden Deploy-Frameworks
| Framework | Was | Platform |
|---|---|---|
| `playwright` | Web-Browser-Testing | Desktop Browser |
| `kasmweb` | Full Browser im Container | Browser-UI |
| `gotty` | Terminal-Shell | CLI |
| **`artemis`** | **Mobile-Automation** | **Android-Geräte** |

### API-Design für JiMesh-Integration
```
POST /api/projects/{id}/mobile-test          — Mobile-Test starten
GET  /api/projects/{id}/mobile-test/{testId}  — Test-Status + Screenshots
GET  /api/projects/{id}/mobile-test/logcat     — Live-Logcat-Stream (SSE)
POST /api/plugins/artemis/webhook             — Test-Ergebnis-Empfang
```

## Nächste Schritte
1. Plugin-Catalog um artemis erweitern
2. Deploy-Framework "artemis" hinzufügen (Python 3.12 + ADB Container)
3. Stitch-Screen: Mobile-Test-Results (Screenshots + Logcat im Test-Tab)
4. Backend: POST /api/projects/{id}/mobile-test implementieren
5. Device-Farm: Android-Emulator-Container Option (android-x oder eigenes Image)
