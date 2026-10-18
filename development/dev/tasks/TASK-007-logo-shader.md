# TASK-007 — Logo (SVG) & Shader-Morph-Loop

> **Status:** ⏳ OFFEN · **Speist:** `repo-assets/` (Landingpage/Dashboard-Hero)
> **Ausführung:** bewusst in einer neuen Session — dieser Task ist vollständig
> selbstbeschreibend, kein Chat-Kontext nötig.
> **Wortmarke:** JiMesh (genau diese Schreibweise!)

## Auftrag

- [ ] **Deliverable 1 — Logo als SVG:** abstraktes Mark für JiMesh (Netzwerk-Mesh
  aus Nodes + Edges: Hexagon-Gitter, Knotengraph oder stilisiertes „J" aus
  Kanten). 2–3 konzeptionelle Varianten entwerfen, eine empfehlen, nur die
  empfohlene als handgeschriebenes SVG (viewBox 0 0 512 512, reine Paths, keine
  externen Fonts, currentColor-fähig, noch erkennbar bei 16×16, monochrom-sicher)
  + Gradient-Variante (Cyan → Violett). Kurze Begründung (3–4 Sätze).
- [ ] **Deliverable 2 — Shader-Loop als EINE HTML-Datei:** reines WebGL (kein
  Three.js, kein CDN, keine externen Assets), direkt im Browser lauffähig,
  Fullscreen-Canvas, devicePixelRatio-korrekt, `prefers-reduced-motion` →
  statisches Logo als Fallback.
- [ ] **Ablage:** `repo-assets/` (bestehende Struktur zuerst ansehen; ggf.
  Unterverzeichnisse logo/ + shader-loop/)

## Technik

* 2D Signed Distance Fields (SDF) im Fragment-Shader; Morphs als kontinuierliche
  SDF-Interpolation (smoothstep/cubic-Easing) — keine harten Schnitte, kein
  Springen, alle Formen zentriert mit gleicher visueller Masse.
* Wortmarke NICHT als handgeschriebenes Buchstaben-SDF: „JiMesh" einmalig in
  ein Offscreen-Canvas (System-Sans, fett) rendern, als Textur hochladen, im
  Shader als Maske samplen (ausdrücklich erlaubter Hybrid-Weg).
* Farben, Speed und Halte-Zeiten als klar benannte Konstanten am Dateianfang.
* GLSL kompilierfähig halten (WebGL1-kompatibel, precision-Qualifier gesetzt,
  keine `#version`-Direktive, keine undeklarierten Variablen).

## Timeline (Endlos-Loop, ~30 s gesamt)

| Phase | Darstellung | Dauer |
|---|---|---|
| 0 | Logo-Mark (Idle: atmendes Glühen, Partikel wandern entlang der Mesh-Kanten) | 10 s Rast |
| 1 | Icon „LLM Security": Schild mit feinen Circuit-Spuren | ~1 s Morph + ~2,5 s Halt |
| 2 | Icon „Gateway/Proxy": Hexagon mit ein-/ausgehenden Routing-Pfeilen/Paketen | ~1 s + ~2,5 s |
| 3 | Icon „DevOps & Deploy": gestapelte Container mit Aufwärtspfeil | ~1 s + ~2,5 s |
| 4 | Wortmarke „JiMesh" | ~1 s + ~3 s |
| 5 | Morph zurück zum Logo → Loop beginnt neu mit der 10-s-Rast | ~1 s |

Ästhetik: Hintergrund fast schwarz (leicht bläulich), Akzente Cyan → Violett,
weiches Glow direkt im Shader (kein Postprocessing-Framework); während der
Morphs Partikel-Flow entlang der Kanten (Form löst sich in Partikel auf und
fließt auf der anderen Seite wieder zusammen), Easing smoothstep/cubic-in-out.

## Ehrlichkeit & Abnahme

* Wenn etwas im Fragment-Shader nicht sauber machbar ist: ehrlich sagen und den
  Hybrid-Weg (Canvas-Textur) nehmen — nichts vortäuschen.
* Die Session kann die Animation NICHT visuell prüfen (kein Browser/GPU in der
  Sandbox). GLSL wird per statischer Kontrolle geprüft; das visuelle OK gibt der
  Operator beim Öffnen im Browser.
* Code vollständig und lauffähig, keine Platzhalter wie „...".

## Ergebnis

_(noch nicht begonnen)_
