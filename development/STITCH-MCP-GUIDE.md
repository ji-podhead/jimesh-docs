# STITCH-MCP-GUIDE — Google Stitch ueber MCP/REST nutzen

## Verbindung

MCP-Endpoint: https://stitch.googleapis.com/mcp
API-Key: <API_KEY — aus der Stitch/Google-Console holen, nicht einchecken>
Header: X-Goog-Api-Key

## WICHTIG: Argument-Formate (nach Trial&Error verifiziert)

| Parameter | Format | Beispiel |
|---|---|---|
| projectId | NUR die Nummer, KEIN projects/-Prefix | 18208781056688578837 |
| selectedScreenIds | Array von puren Hex-IDs, KEIN screens/-Prefix | ["b279f9f4e6464543abc2b0545dff35ef"] |
| deviceType | Enum: DESKTOP, MOBILE, TABLET, AGNOSTIC | "DESKTOP" |
| prompt | String (kein screen_name-Parameter!) | — |

## Verfuegbare Tools

| Tool | Was | Argumente |
|---|---|---|
| create_project | Neues Projekt | {title} |
| get_project | Projekt-Details | {projectId} |
| list_projects | Alle Projekte | — |
| list_screens | Screens in Projekt | {projectId} |
| get_screen | Screen-Details (Screenshot+HTML-URLs) | {projectId, screenId} |
| generate_screen_from_text | Neuen Screen aus Prompt | {projectId, prompt, deviceType} |
| edit_screens | Bestehenden Screen per Prompt aendern | {projectId, selectedScreenIds, prompt, deviceType} |
| generate_variants | Varianten eines Screens | {projectId, selectedScreenIds, prompt} |
| upload_design_md | DESIGN.md fuer Design-System | {projectId, ...} |
| create_design_system | Design-System fuer Konsistenz | {projectId, designSystem} |
| apply_design_system | Design-System auf Screens anwenden | {projectId, ...} |

## Aufruf-Muster (HTTP POST)

```bash
curl -s -X POST https://stitch.googleapis.com/mcp \
  -H "X-Goog-Api-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_screen_from_text","arguments":{"projectId":"18208781056688578837","prompt":"Design a dark-mode...","deviceType":"DESKTOP"}}}'
```

## Iterations-Workflow

1. GENERIEREN: generate_screen_from_text (Prompt beschreibt WAS zu sehen ist)
2. PRUEFEN: list_screens -> Titel + IDs der neuen Screens
3. REFINEN: edit_screens (selectedScreenIds = die zu aendernden IDs)
4. LADEN: list_screens -> screenshot.downloadUrl + htmlCode.downloadUrl
5. SPEICHERN: curl -L -o assets/design-assets/stitch/<slug>.png <screenshotUrl>

## JiMesh Stitch-Projekt

Project-ID: 18208781056688578837
Titel: JiMesh v1 Beta - Infrastructure Management Platform
Screens: 56+ (alle in assets/design-assets/stitch/ als PNG+HTML geladen)

## Bewaehrte Prompt-Struktur

SCREEN: <Screen-Name>. Design a dark-mode <was>. <Layout-Beschreibung>.
<konkrete Elemente mit echten Daten (Hostnames, Ports, Farben)>.
<Interaktionen (klickbar, hover, checkboxes)>.
Dark #0d0e15, violet #8b5cf6 accent.

Beispiel:
SCREEN: SSH Target Detail. Design a dark-mode node detail page. HEADER:
hostname root@187.124.2.174, VPN badge 100.64.0.6. HEALTH STRIP: CPU 23%
(bar), RAM 6.2/16GB. GRID: Workspaces (3 rows), Running Containers (5 rows
with type icons), Networks (VLAN), Firewall Status. Dark #0d0e15, violet.

## Timeout-Problem

Stitch braucht 60-120s pro Screen-Generierung. Bei Batch-Generierung:
- Max 4 Screens pro Batch-Script
- Timeout auf 600s setzen
- Bei Timeout: trotzdem list_screens pruefen - Stitch arbeitet oft weiter
  obwohl die Console timed out!

## Node.js-Wrapper (empfohlen statt curl wegen Quoting)

```javascript
const https = require('https');
const KEY = '<API-KEY>';
const PROJECT_ID = '18208781056688578837';

function mcpCall(name, args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});
    const req = https.request({hostname:'stitch.googleapis.com',path:'/mcp',method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':KEY,'Content-Length':Buffer.byteLength(body)}
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
      try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
    });});
    req.write(body); req.end();
  });
}

// Screen generieren:
await mcpCall('generate_screen_from_text', {
  projectId: PROJECT_ID,
  prompt: 'SCREEN: ...',
  deviceType: 'DESKTOP'
});

// Screen refinieren:
await mcpCall('edit_screens', {
  projectId: PROJECT_ID,
  selectedScreenIds: ['<screen-id-hex>'],
  prompt: 'Refine: ...',
  deviceType: 'DESKTOP'
});
```