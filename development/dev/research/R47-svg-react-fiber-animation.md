# R47 — SVG × React-Fiber-Animation (Research aus den Operator-Links)

Quelle: die vom Operator geschickten Links (Session `ses_ec23bca39ffe`, msgs `13dfd32c`,
`13dfe498`, `13e27835`) — extrahiert aus den Opencode-Logs. Status: research, kein Code
auf der Landing benutzt bisher.

## Links
| # | URL | Thema |
|---|-----|-------|
| 1 | https://dev.to/anapimolodec/convert-svg-into-a-3d-figure-using-react-threejs-fiber-33hc | SVG → 3D-Figur (SVGLoader + Extrude) |
| 2 | https://stackoverflow.com/questions/77660929/extrude-complex-svg-with-react-three-fiber | Komplexe SVGs extrudieren |
| 3 | https://bowencodes.com/post/react-rough-fiber | Hand-drawn-SVG-Renderer (react-reconciler) |
| 4 | https://drei.docs.pmnd.rs/abstractions/svg | drei `<Svg>`-Wrapper |
| 5 | https://motion.dev/docs/react-svg-animation | SVG-Animation mit motion (React) |
| 6 | https://motion.dev/docs/framer | motion = Framer-Motion-Nachfolger |
| 7 | https://drei.docs.pmnd.rs/shaders/mesh-distort-material | Simplex-Noise-Distort-Material |
| 8 | https://drei.docs.pmnd.rs/shaders/mesh-reflector-material | Spiegel-Material |
| 9 | https://drei.docs.pmnd.rs/staging/accumulative-shadows | Accumulative Shadows |
| 10 | https://drei.docs.pmnd.rs/core/shader-material | shaderMaterial-Helper (custom GLSL) |
| 11 | https://drei.docs.pmnd.rs/controls/introduction | OrbitControls & Co |

## Pattern A — SVG → 3D (dev.to, Link 1+2)
```tsx
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'

const Figure = () => {
  const svgData = useLoader(SVGLoader, '/hub.svg')
  const shapes = svgData.paths.flatMap((path) => path.toShapes(true))
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 10 })
  geometry.center()
  return (
    <mesh geometry={geometry} scale={0.07}>
      <meshPhongMaterial attach="material" color="red" />
    </mesh>
  )
}
```
- Canvas + `Suspense` (drei `<Text>` als Loading-Fallback), `OrbitControls`,
  `ambientLight` + `directionalLight`.
- Für flache Darstellung statt Extrude: `SVGLoader.createShapes(path)` pro Path und
  `ShapeGeometry` → Mesh mit `path.userData.style.fill/fillOpacity` (Material muss
  `transparent` + `depthWrite: false` + Paint-Order = Reihenfolge der Paths sein).
- Y-Flip nicht vergessen: SVG-Koordinaten laufen y-down → Gruppe `scale.y = -1`.

## Pattern B — drei `<Svg>` (Link 4)
`<Svg src={url} />` rendert das SVG als THREE-Objekte in der Szene (Wrapper um das
three-SVG-Loader-Demo). Gut für: SVG direkt im 3D-Raum platzieren. Nicht gut für:
per-Pfad-Animation — dafür Pattern A oder C.

## Pattern C — motion für SVG (Link 5+6)
- `motion`-Komponenten für JEDES SVG-Element: `<motion.svg>`, `<motion.path>`,
  `<motion.circle>`, sogar `<motion.feTurbulence>`.
- Attribute animierbar (`cx`, `d`, `viewBox`), Shorthands `attrX/attrY/attrScale`
  wenn das Element selbst x/y/scale als Attribute hat.
- **Line-Drawing:** `pathLength`, `pathSpacing`, `pathOffset` (0..1) —
  `<motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />`.
- **Path-Morphing:** `d`-Attribut animieren, funktioniert nativ bei ähnlichen Pfaden,
  für beliebige Pfade [Flubber](https://www.npmjs.com/package/flubber).
- Transforms: motion rotiert SVG-Elemente um deren Center (anders als natives SVG);
  `transformBox: 'view-box'` stellt natives Verhalten wieder her.

## Pattern D — Shader (Link 7, 8, 10)
- `MeshDistortMaterial` — Simplex-Noise-Verzerrung auf beliebiger Geometrie
  (`<mesh><boxGeometry /><MeshDistortMaterial distort={1} speed={10} /></mesh>`).
- `MeshReflectorMaterial` — Spiegel/Boden.
- `shaderMaterial`-Helper — eigene GLSL-Materialien als JSX-Element
  (`extend()` + uniform-Deklaration), Basis für Matrix/Markdown-GTexture-Pipelines.

## Pattern E — react-rough-fiber (Link 3)
Custom React-Renderer (`react-reconciler`) der bestehende SVGs hand-drawn rendert
(Rough.js). Niche — für JiMesh irrelevant, aber: zeigt das Pattern
`its-fine`/`ContextBridge` für Context über Renderer-Grenzen (nutzt r3f selbst).

## Anwendung auf JiMesh (Vorschlag, Stand vor Neubau)
- **Connectors-Hub** (`connectors_hub.svg`): Pattern A flach — SVGLoader → ShapeGeometry
  Meshes; die Paths der Gruppe `orbit-system` (per `userData.node`-Ancestor erkannt)
  in eine eigene Gruppe → `useFrame` rotiert den Orbit (ersetzt die SMIL-Rotation),
  Cube statisch. Kamera orthographisch (zoom = containerWidth / 900).
- **Laser-Linien / Packets** zwischen den Slides: Pattern C (motion pathLength).
- **3D-Akzente:** Extrude (Pattern A) + MeshDistortMaterial auf Logo-Akzenten,
  NICHT auf dem Brand-Cube selbst (Operator lehnt rotierenden 3D-Cube ab).
- **Hintergrund:** asym-bg radialGradient der SVGs (schon in marketing.css
  als .jmh-gradient-bg portiert).
