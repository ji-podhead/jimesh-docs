# PROMPT-BROWSER-COMPARE — KasmWeb vs Browserless vs Webtop

## Vergleich für JiMesh Browser-Integration

| | KasmWeb Chrome | Browserless | Linuxserver Webtop |
|---|---|---|---|
| Image | kasmweb/chrome | browserless/chrome | lscr.io/linuxserver/webtop |
| Pulls | 25M | 175M | ~10M |
| Ansatz | Voller Chrome via KasmVNC/WebRTC | Headless Chrome als API-Service | Kompletter Desktop via VNC |
| Zugriff | Direkt im Browser-Tab | API/CDP (kein UI) | noVNC im Browser |
| RAM | 1-2 GB | 512 MB | 2-4 GB |
| Best für | Web-Surfen im JiMesh-Tab, Frontend-Preview | Playwright-Testing, Screenshots | Multi-App-Desktop-Umgebung |
| JiMesh-Integration | iframe-Ersatz: Chrome öffnet direkt im JiMesh-Tab | Backend-Integration für Screenshots | Voll-Desktop wenn User alles will |

## Deploy-Optionen für User
```
Bei "Add Browser" Integration:
Option 1: KasmWeb Chrome (empfohlen — leichter, direkt im Tab)
Option 2: VNC Desktop (mehr Ressourcen, volle Desktop-Umgebung)
Zusätzlich: Playwright für Automatisierung
```

## Wichtige Erkennung
Der grosse Container der auch VS Code nutzt = Electron/CEF (Desktop-Apps)
KasmVNC/Webtop = Server-Container für Browser-Streaming via WebSocket/WebRTC
Apache Guacamole = Alternative für Multi-Protocol-Desktop-Gateway