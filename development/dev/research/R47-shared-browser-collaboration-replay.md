# R47 — Shared Browser: Kollaboration (neko Multi-User), Camoufox, Replay-Ansätze

Stand23.10.2026. Beantwortet die Operator-Frage, wie „zusammen mit dem team
und agents einen browser in realtime sehen übers internet" und „fake replay
… script abspielen … fotos speichern je nach verbosity level" technisch
werden kann — OHNE Framework in der Zielsite.

##1 — n.eko Multi-User (Kollaboration)

Basis: SPRINT-159 (`ChromiumPluginRenderer.tsx` nutzt bereits das neko-
Protokoll: JSON-Signalisierung über WebSocket + binäre Input-Nachrichten
über DataChannel,3-Byte-Header). neko unterstützt nativ multi-user:

- **Rollen:** `admin` (Maus+Tastatur), `member` (Maus+Tastatur), `viewer`
  (nur Zuschauen). Pro Session kann nur EINER Controller-Priority haben.
- **Handover:** `signal.AdminGrant` / `signal.MemberDisconnect`-Events;
  Kontrolle kann dynamisch übergeben werden (R28-Erkundung: „one takes
  mouse control, or hand it over dynamically").
- **Kamera-Stream:** ein WebRTC-Video pro Session; beliebig viele Zuschauer
  (SFU/Simulcast je nach neko-Version) — das ist EXACT das Meet-Gefühl.
- **Unser Rollout:** Viewer=Standard aller Team-Mitglieder; „Einklinken"
  = `member`-Join; „Maus übernehmen" = AdminGrant-Flow (Queue + Grant).

**Cursor-Presence jenseits von neko:** Die eigenen Mouse-Overlays (Humans +
Agenten-Cursors in der geteilten Ansicht) laufen über EINEN eigenen
WS-Channel (`/api/browser/sessions/{id}/presence`),10 Hz Throttle,
Payload `{principal, kind, x, y, ts}`. Nicht über neko-DataChannel —
sonst verliert jeder Viewer seine eigene Cursor-Identität (neko kennt nur
den EINEN Input-Controller).

##2 — Camoufox („nologin"-Runtime)

Was: Anti-Detect-Firefox-Fork (Fingerprint-Spoofing auf Canvas/WebGL/Audio/
Fonts/Timezone, resistFingerprinting-Basis, eigene Binary + Profil-Management).

Container-Anbindung:
- **Träger = neko firefox-image** (Xvfb + x11vnc + websocket + Firefox).
  Camoufox ersetzt die Firefox-Binary; Profil-Verzeichnis wird als Volume
  gemountet (pro Scope ein Fingerprint-Profil, reproducibel).
- **Kein Login nötig** (Operator: „nologin"): Der Browser selbst braucht
  keinen JiMesh-Auth-Flow — Zugang regelt der Workspace-Scope ( wer die
  Session sieht, bestimmt die Sidebar-Sichtbarkeit + RBAC). Camoufox-Profil
  kann Logins/Fingerprint-Cookies DRIN haben (Anti-Detect-Zweck), das ist
  der Unterschied zu „Browser braucht SSO".
- **Grenzen (ehrlich):** Anti-Detect wirkt nur mit echtem Profil-Kontinuum
  (gleiche IP-Geolocation, gleiche Timezone, konsistente Font-Liste). TLS-
  Fingerprint (JA3/JA4) wird von Camoufox gesetzt — Cloudflare/Kasada
  erkennen trotzdem Datacenter-IPs. Kein Versprechen „unerkennbar".
- **Einsatz wie Operator sagte:** Marketing (Multi-Account) ABER AUCH
  Frontend-Debugging/Vibe-Coding (Camoufox ist normaler Firefox-Kern →
  DevTools laufen mit) und Agent-Tasks (gleicher CDP-Pfad wie Chrome).

Alternativ-Prüfung: KasmWeb-Chrome (aktueller Recommended) behalten wir als
Default für Agent-Tasks (schneller, headless-tauglich); Camoufox wird
Dritte Option + „Marketing/Stealth"-Preset.

##3 — Replay-Ansätze (Vergleich, unser Weg markiert)

| Ansatz | Braucht Zielsite-Framework? | Was es zeigt | Urteil |
|---|---|---|---|
| rrweb | JA (Snippet-Injection, DOM-Serialization; bricht bei cross-origin iframes/Canvas/WebGL) | DOM-Playback perfekt | ausgeschlossen (Operator-Constraint: „nicht für jede xbeliebige website") |
| OpenReplay | JA (Tracker pro Projekt) | Console-UI-Replay | bleibt wie S174 für die CONSOLE, nicht für externe Zielseiten |
| CDP-Traces (Network/Performance) | NEIN (Browser-seitig) | Wassfall, HAR | als Metadaten-Beilage, nicht als „Video" |
| **Action-Script-Replay (unser Weg)** | NEIN | Cursor-Pfade, Klicks, Typings, Navigations als SKRIPT | skriptgetriebene Fake-Replay-Sequenz + Keyframes |
| **Screenshot-Keyframes (unser Weg)** | NEIN (`Page.captureScreenshot`) | Standbilder je verbosity-Schwelle | Bounded Storage, TTL am Session-Ende |

**Fake-Replay konkret:** Der Player rendert (a) eine Leinwand mit dem
Keyframe-Screenshot des aktuellen Abschnitts, (b) den reenacteten Cursor
(Interpolation zwischen geloggten x/y-Punkten), (c) die Typing-/Klick-
Animation aus dem Action-Script, (d) die URL-Leiste. Sprungmarken = die
Verbosity-Klassen (Warnings rot, Auth violett, Mutations orange). Kein
Framework in der Zielsite, läuft bei jedem URL.

##4 — Verbosity-Klassifizierung (CDP-Hooks)

- `Runtime.consoleAPICalled` → L1 (error/warn)
- `Network.responseReceived` → L1 bei status ≥500
- `Network.requestWillBeSent` → L2 wenn URL/Headers Auth riechen
  (`/auth`, `authorization`, password/otp-Felder), L3 bei POST/PUT/PATCH/DELETE
- `Page.frameNavigated` → immer (L0 Metadaten)
- Screenshot: nur bei Klassifizierung ≥ aktivem Level (L4),
  `Page.captureScreenshot` (jpeg q80, max1600px)

##5 — Offene Fragen

1. Camoufox-Profil-Management: pro Scope ein Profil oder pro Session frisch
   (Fingerprint-Kontinuum spricht für Scope-Profil)?
2. Presence-Channel: eigener WS oder über den bestehenden Chat-WS
   (`/api/chat/ws`) als Event-Familie? (Chat-WS hätte Rejoin-Semantik gratis)
3. Replay-Export: JSONL-Download + Embed in AgentSessionDetailPage?
