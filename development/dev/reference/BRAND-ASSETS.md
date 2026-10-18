# JiMesh Brand-Assets

Kanonische Referenz für Logo, Farbpalette und Verwendung. Alle Quelldateien
liegen in [`repo-assets/brand/`](../../repo-assets/brand/) — SVG ist immer die
Quelle, PNG nur der Export davon (nie umgekehrt).

## Logo: Mesh-Cube

![JiMesh Logo](../../repo-assets/brand/png/jimesh-lockup-color-small.png)

Hexagonales Mesh (6 Connector-Nodes, radial symmetrisch) um einen isometrischen
Sandbox-Würfel, mit leuchtendem Core-Cube im Zentrum. Die Metapher: äußerer
Würfel + Achsen = Knotenpunkte/Routing im Mesh-Netzwerk, innerer isolierter
Core-Cube = die Sandbox/Security-Kapselung.

### Varianten

| Stil | Solo-Icon | Icon + Schriftzug | Verwendung |
|---|---|---|---|
| **Farbe (Hauptlogo)** | `svg/jimesh-mesh-cube-neon-small.svg` | `svg/jimesh-lockup-color-small.svg` | Standard — Hero, README, Social |
| Farbe, Variante B (fettere Nodes) | `svg/jimesh-mesh-cube-neon-small-b.svg` | `svg/jimesh-lockup-color-small-b.svg` | Alternative bei sehr kleiner Darstellung |
| Mono (dünne Linien, `currentColor`) | `svg/jimesh-mesh-cube-mono.svg` | `svg/jimesh-lockup-mono.svg` | Inline-Einbindung, freie Einfärbung per CSS |
| Mono Small A/B (verdickt, fest Weiß + Hintergrund) | `svg/jimesh-mesh-cube-mono-small(-b).svg` | `svg/jimesh-lockup-mono-small(-b).svg` | Favicon/Tab-Icon (funktioniert auch via `<img>`, s.u.) |
| Flat-Color Small A/B (Markenfarben, kein Glow) | `svg/jimesh-mesh-cube-flat-small(-b).svg` | `svg/jimesh-lockup-flat-small(-b).svg` | Kontexte ohne SVG-Filter-Support |
| Vollformat (mit Glow/Blur, Basis der Small-Varianten) | `svg/jimesh-mesh-cube.svg` | `svg/jimesh-lockup-color.svg` | Große Darstellung (>128px) |

Alle `png/`-Dateien sind 1:1-Exporte der gleichnamigen `svg/`-Datei, exakt in
Canvas-Nativgröße gerendert (kein Padding).

### Getestete Lesbarkeit bei kleinen Größen

Echter `<img width/height>`-Scaling-Test (nicht nur Browserfenster-Crop): liest
sich ab 32px klar, bei 16px noch als erkennbarer Punkt-Cluster im Kreis — am
unteren Ende des Machbaren, aber funktional, auf hellem wie dunklem Grund
(dank eigenem Hintergrund-Kreis in den `*-small`-Icon-Dateien).

**Wichtige Falle:** `currentColor` erbt **nicht** von der Host-Seite, wenn ein
SVG via `<img src="...">` eingebunden wird (der übliche Favicon-Weg) — jede
`mono*`-Datei, die standalone/als Favicon funktionieren muss, braucht deshalb
ein festes `color="#ffffff"` auf dem Root-`<svg>`-Element statt sich nur auf
Vererbung zu verlassen.

## Farbpalette

Abgeleitet aus dem Farb-Logo, zwei Farben mit klaren Rollen:

| Rolle | Verlauf | Hex |
|---|---|---|
| **Mesh Cyan** — Netzwerk/Mesh/Konnektivität | Cyan → Deep Blue | `#00e5ff` → `#0066ff` |
| **Core Mint** — Kern/Security/Verified | Mint → Deep Green | `#00ffcc` → `#00a344` |
| Void | Badge-/Panel-Hintergrund | `#05070b` |
| Navy | Sekundärer Hintergrund (Hero, Panels) | `#0f172a` |
| Slate | Tertiärer Hintergrund | `#1e293b` |
| Signal White | Text/Highlights | `#f8fafc` |

Kein Lila/Violett mehr — das war ein Überbleibsel der früheren
Circular-Hub-Badge-Ära (siehe `old/`) und ist aus `jimesh-hero.html` und den
aktuellen Logo-Dateien entfernt.

## Schriftzug

`svg/jimesh-text-solo.svg` (JIMESH + Subtitle "GATEWAY, LLM & APP SECURITY")
bzw. `svg/jimesh-text-solo-plain.svg` (nur "JIMESH", ohne Subtitle — für
Lockups). Echter Font (Segoe UI / System-Sans), **kein** eigenes
Letterform-Design — eine frühere Version mit selbstgezeichneten Buchstaben-
Pfaden wurde verworfen (M- und e-Glyph waren nicht eindeutig lesbar) und ist
ersatzlos entfernt.

## `jimesh-hero.html`

Eigenständiger Brand-Loop (eine Datei, keine Abhängigkeiten). Icon = Mesh-Cube
Neon Small, Schriftzug = `jimesh-text-solo-plain.svg`, beide referenziert über
`svg/...`-Pfade relativ zur HTML-Datei. Details zu Animation/Timing siehe
[`repo-assets/brand/README.md`](../../repo-assets/brand/README.md).

## Archiv

`repo-assets/brand/old/` enthält die frühere Hedgehog-/Circular-Hub-Badge-
Designfamilie (inkl. der animierten SMIL-Badge-Version). Nicht mehr aktiv
verlinkt, aus Referenzgründen aufgehoben statt gelöscht.
