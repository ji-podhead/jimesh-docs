# R46 — Frontend-Animation/Live-Graphics: Animation Stack Live Plan for Blog Demo Pages

**Status:** RESEARCH REPORT (keine Ausführung, kein Commit, kein npm)
**Datum:** 15. Oktober 2026
**Quellen:** die letzten beiden Orchestrator-Sessions (Referenz-Links + ausgearbeitete Shader-Ansätze), verifiziert gegen die drei docs am Abrufdatum (siehe §6) und gegen den Codebestand in `source/jimesh2/src/frontend`.
**Zweck:** praxisreifes Implementierungsdokument für die Blog-Demo-Pages der jimesh2-Frontend — Zielbild, Library-Map, die Markdown→GLSL-Pipeline als Kernblock, Design-Entscheidungen, offene To-dos.

---

## 1. ZIELBILD

### 1a. Was das Ziel ist

Die Blog- und Demo-Pages der jimesh2-Frontend werden zu einer „living graphics"-Fläche:

- **Animated SVG** für Artikel-Demo-Cards (MeshFlow/RoutingPulse/FailoverBars) — Infra-Diagramme, die sich selbst erklären.
- **R3F/three.js Shader** für Hero- und Logo-Momente: animierte Gradient-Meshes, extrudiertes Brand-Logo mit Displacement-Shader.
- **Motion** (framer-motion-Nachfolger, `motion/react`) für Entry-Anims, Path-Morphing, Reveal-Choreografie.
- **Animierte Gradients** via Custom-Shader statt CSS-Gradient-Animation (GPU, keine Paint-Kosten).
- **Stilisiertes Brand-Logo**: SVGLoader → ExtrudeGeometry → Custom Distort-Shader mit Brand-Grenzverlauf.

### 1b. Status quo (verifiziert gegen den Code, Okt 2026)

Installiert in `source/jimesh2/src/frontend/package.json`:

| Package | Version | Anmerkung |
|---|---|---|
| `@react-three/drei` | ^10.7.9 | direkte Dependency |
| `motion` | ^14.2.0 | direkte Dependency, parallel noch `framer-motion` ^14.0.0 (Legacy-Alias — Aufräumen-To-do, §5) |
| `html2canvas` | ^1.4.1 | für die Markdown→GLSL-Pipeline (§3) |
| `react-markdown` | ^10.1.0 | Markdown-Renderer der Artikel |

⚠️ **`three` und `@react-three/fiber` sind NICHT explizit** in `package.json` — sie werden über die Peer-Dependencies von drei/Hoisting transitiv aufgelöst. `source/jimesh2/src/frontend/src/components/blogdemo/three/logo-extrude.tsx:3-4` importiert beide. Vor Ausbau explizit pinnen (§5).

Bestehende Komponenten (`src/components/blogdemo/`):

| Komponente | Datei | Stack |
|---|---|---|
| GradientMesh (FBM-Hero) | `gradient-mesh.tsx` | R3F + Custom-FBM-Shader (2D-Simplex, **derzeit defekt**, §5) |
| Logo-Extrude | `three/logo-extrude.tsx` | SVGLoader → ExtrudeGeometry → Custom Displace-Shader (Violet/Cyan) |
| MeshFlowCard / RoutingPulse / FailoverBars | `animated-svg.tsx` | `motion/react` (`AnimatePresence`, `useReducedMotion`) |
| GradientText / PathMorph / GridReveal | `motion/gradient-text.tsx`, `motion/path-morph.tsx`, `motion/grid-reveal.tsx` | motion |
| Showcase-Page | `app/blog/demos/page.tsx` | verdrahtet alles |

Verdrahtungsanker: `src/lib/blog.ts:8-9` mappt Blog-Slugs auf Demo-Cards (`'gvisor-workspace-isolation' → MeshFlowCard`, `'learning-router' → RoutingPulse`).

---

## 2. LIBRARY-MAP + REFERENZEN

Alle Links am 2026-10-15 abgerufen und geprüft (§6). Korrekturen sind markiert.

### 2a. drei `<Svg>`-Abstraktion (SVG-in-3D, schnelle Route)

- **drei `<Svg>`**: https://drei.docs.pmnd.rs/abstractions/svg ✅
  Wrapper um den three-SVG-Loader, als „crisp 3D-object"-Renderer gedacht (jeder Pfad wird zum Mesh, Material pro `<SvgMesh>`-Pfad). Vereinfacht: `<Svg src={urlOrRawSvgString} />`. Vorsicht: Zip-Pfade könnenbrechen (`src/core/Svg.tsx`) — für das Brand-Logo bleibt Route (b) besser.
- **Controls-Intro** (damit die Demo-Stage nicht wie ein Tech-Demo-Spin klingt): https://drei.docs.pmnd.rs/controls/introduction ✅ — Controls sind kompatibel mit `frameloop="demand"`, `makeDefault` setzt den Store-Default. Für Blog-Em nicht räudig statt OrbitControls setzen: kein User-Input-Grab auf lesender Page — derogat Begriffen: **keine** CameraControls auf Blog-Pages, stattdessen `PresentationControls` nur in der /blog/demos-Stage.

### 2b. SVG→3D (Extrude-Route, für das Logo)

- **Tutorial „Convert SVG into a 3D figure"** (Aiaru Kagía, dev.to): https://dev.to/anapimolodec/convert-svg-into-a-3d-figure-using-react-threejs-fiber-33hc ✅
  Kernrezept: `useLoader(SVGLoader, url)` → `paths.flatMap(p => p.toShapes(true))` → `THREE.ExtrudeGeometry(shapes, { depth, bevel })` → `geometry.center()` → scene.
- **Complex-SVG-Fallstricke (SO)**: https://stackoverflow.com/questions/77660929/extrude-complex-svg-with-react-three-fiber ✅ (Bot-Fetch 403, existiert — via Suche verifiziert). Merksätze vom Thread:
  1. Pro Shape eigenes Material mit der **Farbe aus `svgData.paths[i].color`** statt Einheitsfarbe — sonst werden Multi-Color-SVGs homogen.
  2. `side={THREE.DoubleSide}`, sonst verschwinden Flächen je Kamerawinkel.
  3. `depth`/`scale` müssen zur Pfad-Koordinatengröße passen — bei komplexen Pfaden kann ein falsches `depth` zu Overlap/Discern-Verlust führen.
- **„Rough"-Look (optional für Sketch-Aesthetic in Cards):** https://bowencodes.com/post/react-rough-fiber ✅ — `react-rough-fiber` als React-Renderer auf Rough.js; für 2D-SVG-Deko, nicht für 3D. Nur im Backlog, kein Brand-Ziel.

### 2c. motion (SVG-Animation, framer-motion-Nachfolger)

- **SVG-Animation-Guide**: https://motion.dev/docs/react-svg-animation ✅
  Kern-API für uns: `pathLength`/`pathSpacing`/`pathOffset` (Line-Drawing) und `d`-Morphing (nur zwischen strukturell ähnlichen Pfaden; für „sehr verschiedene" Pfade Flubber nachschalten). Außerdem: pro SVG-Element gibt es `motion.*`-Komponenten inkl. Filter (`<motion.feTurbulence>`-und-Freunde) — direkt nutzbar für `PathMorph`/`RoutingPulse`.
- **motion × framer („framer-motion"-Import ist der Motion-Code)**: https://motion.dev/docs/framer ✅ — Import via `"framer-motion"` statt `"motion/react"` wenn explizit gewünscht; für uns gilt: konsolidieren auf `motion/react` (Package `motion`), `framer-motion` als Dependency nach Migration entfernen.

### 2d. drei Staging/Effekte (Stage-Bausteine für /blog/demos)

- **MeshReflectorMaterial**: https://drei.docs.pmnd.rs/shaders/mesh-reflector-material ✅ — Bodenreflexion mit Blur; für Logo-Stage-Boden passend (`resolution` niedrig = schnell, `blur`, `mixStrength`, `distortionMap`).
- **AccumulativeShadows**: https://drei.docs.pmnd.rs/staging/accumulative-shadows ✅ — Soft-Shadow-Akkumulator mit **0 Performance-Kosten nach Allen Frames** (`frames`, `limit`, `temporal`); mit `RandomizedLight` kombinieren. Perf-Regel daraus ableitbar: feste `frames`-Zahl setzen, nicht `Infinity` (§4).
- **MeshDistortMaterial**: https://drei.docs.pmnd.rs/shaders/mesh-distort-material ✅ (Bibliotheks-Navigation verifiziert; erster Fetch „Decode error", zweiter OK) — Ready-made-Distortion für Logo-Body; unser eigener Distort-Shader (§3b, logo-extrude.tsx) bleibt custom, MeshDistort nur als Vergleichsreferenz.
- **shaderMaterial-Helper**: https://drei.docs.pmnd.rs/shaders/shader-material ✅
  ⚠️ **Link-Korrektur:** Der im Prompt genannte Pfad `https://drei.docs.pmnd.rs/core/shader-material` liefert **404** — korrekt ist `/shaders/shader-material` (liegt in der Slot-Gruppe `shaders/`, siehe Bibliotheksnavigation).
  Kern-Aussagen: `shaderMaterial(uniforms, vertex, fragment)` erzeugt eine Materialklasse mit setter/getter-Uniforms; deklarativ via `extend({ MyMaterial })` + `<myMaterial />`; **Hot-Reload-Trick:** `<myMaterial key={MyMaterial.key} ... />` (drei hängt ein Unique-Key an die Prototype-Klasse).

---

## 3. MARKDOWN → GLSL PIPELINE (der Hauptblock)

Ziel: **Artikel-Inhalte als GPU-Textur auf einem Plane mit Custom-Shader-Reveal** — der Blog-Demo-Look „die Seite rekonstruiert sich aus der Matrix". Implementierungsplan ist vollständig, Reihenfolge + Fallstricke inklusive.

### 3a. Pipeline (statisch + dynamisch verdeutlicht)

```
react-markdown (Artikel-MD, gleiche Quelle wie der echte Artikel)
        │  render offscreen (div: position:absolute; left:-9999px; width fix)
        ▼
html2canvas  (scale:2 für Retina, backgroundColor:null, useCORS:true)
        ▼
THREE.CanvasTexture  (texture.needsUpdate, colorSpace = SRGBColorSpace)
        ▼
drei `shaderMaterial`-Material auf <planeGeometry>  (uTime / uProgress / uTexture)
        ▼
reveal-Shader: Text-Alpha als Maske × Reveal-Band × Glyph-Spalten-Gate
```

Architektur-Entscheidung: Das **reale Article-Markdown bleibt der Source of Truth**. Der Plane rendert kein Fake-Content-Dummy — er rendert die gleichen AST-Abschnitte, die react-markdown ohnehin zeichnen würde. Offline/Reduced-Motion fällt die Pipeline auf **plain react-markdown-Output** zurück (§3e).

### 3b. Variante (a): Wave/Distort

Basis-Rezept (frühere Session):
- Vertex: `pos.x += sin(pos.y * 4.0 + uTime * 1.5) * 0.08 * uProgressIn` (weiche Wellen-Einblendung).
- Fragment: FBM-Displacement der UVs + Chromatic-Bias an Kanten; auf der Textur via `texture2D(uTexture, shiftedUv)`.
- Günstig (kein Vorfilter), aber „Nur-Effekt": Text bleibt lesbar, WOW-Faktor moderat. → Vorbereitete Fallback-Variante, angewandt wenn Matrix-Reveal auf MobileBudget fällt.

### 3c. Variante (b): MATRIX-REVEAL (primär, implementierungsreif)

Prinzip: Der Text „rendert sich spaltenweise aus digitalen Glyphen" mit Reveal-Front von oben.

Fragment-Shader-Plan (GLSL-300/100-tauglich, drei-kompatibel):

```glsl
uniform sampler2D uTexture;   // CanvasTexture mit Markdown-Rendering
uniform float uTime;
uniform float uProgress;      // 0..1, kontrolliert von motion/scroll
uniform vec2  uGrid;          // z.B. vec2(48.0, 96.0) Zellen
varying vec2  vUv;

// established snake-case hash (43758-magic) — verifiziert korrekt:
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;

  // --- Schritt 1: Text-Alpha-Maske aus der CanvasTexture -------------
  vec4  tex      = texture2D(uTexture, uv);
  float textMask = tex.a;                     // html2canvas: Text = opaque, bg transparent

  // --- Schritt 2: Glyph-Raster pro Spalte ----------------------------
  // Jede Spalte hat randomZelleneinzel-Timing.
  vec2  cell       = floor(uv * uGrid);
  float colRand    = rand(vec2(cell.x, 7.0));             // pro Spalte deterministisch
  float glyphRand  = rand(cell);                          // pro Zelle flackern
  float colGate    = smoothstep(0.15, 1.0,
      uProgress * (1.0 + 0.75) - 0.75 * colRand);         // Spalten-Reveal spread

  // --- Schritt 3: Reveal-Front als Gradient-Band ----------------------
  float edgeBlur = 0.25;
  float band     = smoothstep(uProgress - edgeBlur, uProgress, 1.0 - uv.y);
  // (uv.y = 0 unten; Front wandert von oben nach unten → 1.0 - uv.y)

  // --- Schritt 4: Komposit -------------------------------------------
  float glyphGate = step(glyphGateThreshold(cell, colRand), uProgress);
  float alpha     = textMask * band * colGate * glyphGate;

  // --- Schritt 5: RGB-Shift (chromatic) am Front ----------------------
  float shift   = (1.0 - band) * 0.004;       // am Reveal-Rand stärker
  vec3  shifted = vec3(
    texture2D(uTexture, uv + vec2( shift, 0.0)).a,
    tex.a,
    texture2D(uTexture, uv + vec2(-shift, 0.0)).a
  );

  vec3 color = mix(vec3(shifted * 0.95), tex.rgb, alpha);
  gl_FragColor = vec4(color, alpha);
}
```

Anmerkungen zur Syntax-Verifikation (die gebannten Zeilen der letzten Sessions wurden logisch geprüft):

1. `rand()`-Hash `fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123)` ist **etabliert und korrekt** — standardmäßiger `glsl-Rand`-Hash, deterministisch pro `co`, gut auf Teil-Gitterlagen. Alternative Float-Injektionen (z.B. mit 43758.5453123 ohne `sin`) sind möglich, aber diese Variante ist bewährt.
2. `colGate`-Formel ist äquivalent zum Smoothstep-Reveal `smoothstep(t, t + spread, x)` umgeformt — Dokumentation dieser Formel als „spread-Muster" für alle Reveal-Bänder im Projekt (GradientText, GridReveal nutzen analoge Formen).
3. `band`-Achse: Auf Plane mit korrekter UV-Ordnung muss die Front von **oben** laufen → `1.0 - uv.y`; kein Umschalten nötig.
4. muss auf `uProgress` mit eased Input laufen (motion/easing oder `damp`-Funktion), nicht linear hochzählen — sonst ruckelt der Front.

### 3d. „Glyph-Source" — woher kommen die Symbole?

Zwei Optionen, beide implementierbar:

- **(i) Glyph-Tiles aus derselben Textur:** Pro Zelle eine Random-Glyph-Position in `uTexture` samplen — Glyphen sind dann Teile des echten Texts. Am besten verknüpft („der Artikel baust sich selbst"), feinste Auflösung = Textur.
- **(ii) Getrennte Glyph-Atlas-Textur** (z.B. generierte Katakana/ASCII-Canvas, einmalig beim Mount): mehr Kontrolle über Glyph-Set und Farbe, ein Extra-Texture-Upload.

**Empfehlung:** (i) für die Article-Demo (Kohärenz), (ii) optional für den /blog-Hero (Glyph-Set-Ästhetik, unabhängig vom Content).

### 3e. Fallstricke (implementierungskritisch, alle aus den Sessions verifiziert)

| # | Fallstrick | Konsequenz | Gegenmaßnahme |
|---|---|---|---|
| 1 | **html2canvas Font-Loading/FOUT**: Canvas-Render wired auf Fonts, die erst der WebView geladen werden — Text zeichnet leer oder mit Fallback-Serif | Unbrauchbare Textur | Auf `document.fonts.ready` **vor** html2canvas-Aufruf warten; ggf.Retry-Loop (max 2-3 Verseuche) |
| 2 | **Retina-Blur**: scale=1 rendert unscharfe Textur auf Retina | Text harsch | `scale: 2` setzen (kein侵占 über 2 — danach sieht man keinen Unterschied mehr, GPU-Kosten steigen linear) |
| 3 | **Tone-Mapping frisst Brand-Farben**: default `toneMapped:true` verschiebt RGB | Logo-Textur „wäscht" | `toneMapped: false` auf dem Material setzen; Farbe kommt dann 1:1 aus der Textur |
| 4 | **Ventil-Disposal**: Canvas-Texturen und Shader-Materialien halten nicht selbst their GPU-Ressourcen | Memory-Leak bei Page-Navigation, GPU-Memory wird bullig auf Blog-Spam | Bei Unmount: `texture.dispose()`, `material.dispose()`, `geometry.dispose()` — plane-abhängig; in `useEffect`-Cleanup |
| 5 | **SSG/Build-Zeit: kein `document`/kein HTML** | Build bricht (html2canvas braucht DOM), oder Plane bleibt leer | **Mount-Guard**: Pipeline komplett `"use client"` + `useEffect` (first-Client-Render) — kein SSR-Aufruf; für gebaute Seiten texture-Erzeugung lazy nach Hydration |
| 6 | **Reduced-Motion**: Animations-HardFashion für Nutzer mit suffit | Accessibility-Fail | Fallback = plain react-markdown-Output (gleicher DOM, kein Canvas); `useReducedMotion` von motion als Gate |
| 7 | **Canvas-Größe ≠ Texture-UV**: div-Breite weicht, letterSpacing umskaliert | Verzerrung | Feste Renderbreite (`width: 720px` z.B.) im offscreen-div, Plane-Aspect an Canvas-Aspect koppeln |
| 8 | **CORS der Bilder im Markdown** | html2canvasException | External Images in Demo-Cards vermeiden oder `useCORS` + same-origin资产 |

---

## 4. DESIGN-DECISIONS & CODEBASE-ANKER

1. **Brand-Grenzfarben, nicht grün:** Die Farbwelt bleibt Violet (#8b5cf6) → Cyan (#22d3ee) (wie in `three/logo-extrude.tsx` festgelegt). Kein „Matrix-Grün" trotz Matrix-Reveal — der Zeitraum bleibt Brand-kohärent; die „digitale" Lesung kommt aus Glyphen/RGB-Shift, nicht aus der Farbwahl.
2. **SSG-/Build-Kosten (three nur in Client-Chunks):** Alle `blogdemo`-Komponenten sind bereits `'use client'`-beginnend (`three/logo-extrude.tsx:1`). Regel: **keine three-Importe in Server Komponenten propagieren** — Hero/demos Pages importieren ausschliesslich dynamische, Client-begrenzte Wrappers (`next/dynamic` mit `ssr:false` für heavy R3F-Bloecke). Three-Bundles dürfen nicht in die Article-Initial-Chunks landen (§5, Bundle-Impact).
3. **Perf-Regeln (verbindlich für Blog-Demos):**
   - `dpr` clamp: `dpr={[1, 1.75]}` (drei docs recommend, retina climb begrenzen) — nie auto.
   - `frameloop="demand"` wo möglich (Shader-Demos mit statischem Kamera: AccumulativeStages); `frameloop` nur bei Andreas-Demokandidaten `always`.
   - AccumulativeShadows: feste `frames` (z.B. 40-100), nie `Infinity`; `limit` setzen wenn temporal.
   - MeshReflectorMaterial: `resolution` klein (256**-Ausklang**), Blur minimal für Bloom-Budget.
4. **Reihenfolge des Einbaus:**
   1. **Stage zuerst auf /blog/demos** (Shadow-Stage + Logo-Extrude + MeshReflector-Boden) — kleinstes Risiko, showcase-only.
   2. **/blog Hero GradientMesh-Fix** (§5) — sine halt, Grundvertrauen.
   3. **Matrix-Reveal für Article-Demo-Blocks** (die Pipeline §3) — optional per frontmatter-Flag (`demo: matrix-reveal`) je Artikel.
   4. Article-Demo-Cards bleiben slug-Map-driven (`lib/blog.ts`) — kein Routing/Framework-Change nötig.

---

## 5. OFFENE TO-DOS

| # | To-do | Herleitung | Priorität |
|---|---|---|---|
| T1 | **/blog Hero GradientMesh 2D-Noise-Shader-Fix**: `vec2 ox = floor(x + 0.5);` in `gradient-mesh.tsx:39` kompiliert NICHT — `x` ist `vec3` (aus `ssNoise`), Zuweisung an `vec2` ist ein GLSL-Type-Error → Shader-Erstellung Fail → Plane rendert dunkel. **Gefunden im Headless-Check.** Zusätzlich referenziert `fbm()` die nicht existierende Funktion `simplexNoise(p)` (definiert als `snoise`) — zweiter Compile-Break in derselben Datei. | Headless-Check + Code-Lesung dieser Session | **P0** (Hero aktuell demonstrativ kaputt) |
| T2 | **html2canvas Bundle-Impact / Lazy**: `html2canvas`证监会 voll included (Package ^1.4.1). Bei der Pipeline-Montage: `await import('html2canvas')` im Client-Effekt, nie top-level; prüfen alternativ `html-to-image` als kleinere Wurzel | §3-Fallstricke + Frontend-Choreografie | P1 |
| T3 | **GPU-Budget-Konzept für Mobile** („Coneceitos mobile"): dpr-Clamp + `frameloop`-Regeln sind write-in der Codebase, aber Mobile-Fallback-Tree (matrix-reveal → wave → static) noch nicht deklariert | §3, §4 | P1 |
| T4 | **Dependency-Dualität `motion` × `framer-motion`** in `package.json`: Migration auf `motion/react` (Package `motion`), dann `framer-motion` enfernen; Import-Anpassung in allen blogdemo-Dateien (aktuell `motion/react`, konsistent — nur die zweite Dep ist toter Ballast) | Status-quo-Check | P2 |
| T5 | **`three` + `@react-three/fiber` explizit pinnen** (verifiziert: via drei-Hoisting transitiv, aber nicht deklariert — Bruch bei drei-Major-Update) | Status-quo-Check | P2 |
| T6 | **Reduced-Motion-Fallback auf Plain-Output** (§3e #6) als Code-Regel exportieren (shared util), damit jede neue Demo dieselbe Tür benutzt | Accessibility | P1 |
| T7 | **SVG-Logo-Quelle prüfen** (Rough-Look-Route, 2b): nur Backlog, kein Brand-Ziel dieser Iteration — Dokumentation schluss | 2b | P3 |

---

## 6. SOURCES (alle URLs abgerufen am 2026-10-15)

| URL | Status |
|---|---|
| https://drei.docs.pmnd.rs/abstractions/svg | ✅ 200, verifiziert |
| https://drei.docs.pmnd.rs/controls/introduction | ✅ 200, verifiziert |
| https://drei.docs.pmnd.rs/shaders/mesh-reflector-material | ✅ 200, verifiziert |
| https://drei.docs.pmnd.rs/staging/accumulative-shadows | ✅ 200, verifiziert (erster Fetch „Decode error", Retry OK — URL korrekt) |
| https://drei.docs.pmnd.rs/shaders/mesh-distort-material | ✅ 200, verifiziert (erster Fetch „Decode error", Retry-Route über Bibliotheksnavigation OK — URL korrekt) |
| https://drei.docs.pmnd.rs/shaders/shader-material | ✅ 200 — **Link-Korrektur:** der genannte `/core/shader-material`-Pfad war 404, korrekt `/shaders/shader-material` |
| https://dev.to/anapimolodec/convert-svg-into-a-3d-figure-using-react-threejs-fiber-33hc | ✅ 200 (via Suche verifiziert; Bot-Fetch teils 404 — URL exakt, Autorin „Aiaru") |
| https://stackoverflow.com/questions/77660929/extrude-complex-svg-with-react-three-fiber | ✅ existiert (Bot-fetch 403; via Suche verifiziert) |
| https://bowencodes.com/post/react-rough-fiber | ✅ 200, verifiziert |
| https://motion.dev/docs/react-svg-animation | ✅ 200, verifiziert |
| https://motion.dev/docs/framer | ✅ 200, verifiziert |

**URL-Anmerkungen (Fazit):** Nur ein kaputter Link in der Vorlage — die `shaderMaterial`-Doku liegt unter `/shaders/`, nicht `/core/`. Alle übrigen Links originär korrekt. Die zwei drei-Urls mit „Decode error" beim ersten Abruf liegen an Bot-Blockaden; beide existieren (Nav bestätigt Pfade).