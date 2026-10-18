# Stitch Logo Prompts for JiMesh

Kontext: Brand-Grundlagen, an die sich jede Variante halten muss:

```text
Brand-Canvas:
- Dark background base: #0b0f16 (card gradients #0a0f1d → #070a14)
- Brand gradient: violet #8b5cf6 → cyan #22d3ee (diagonal, userSpaceOnUse)
- Light-theme counterparts: violet #7c3aed, teal #0891b2, text #0f172a
- Signal accents: amber #f59e0b (use sparingly, never two accents at once)
- Cube geometry (720-unit space, center 0,0):
  hexagon 0,-240 208,-120 208,120 0,240 -208,120 -208,-120
  inner edges center → (±208, -120); right vertical is (208,-120)→(208,120)
- Mesh nodes at hexagon × 1.6: (0,±240) (±208,±120)
- Core cube: three isometric faces around the center
Technical constraints (Stitch breaks these constantly):
- xmlns="http://www.w3.org/2000/svg" — never a shortened namespace
- Gradients on LINES need gradientUnits="userSpaceOnUse" with explicit
  coordinates in the element's local space (an objectBoundingBox gradient
  on a <line>/<path> stroke is invisible — zero-height bbox)
- Unique gradient/filter ids per file; viewBox fixed (no 100% sizes);
  glow = feGaussianBlur + feComposite for `in=SourceGraphic in2=blur
  operator=over`, filter region at least -40%/180%
- Every variant must survive 28px (navbar icon) AND 800px (hero)
- Output: ONE self-contained HTML page per variant, SVG inline (not as
  <img>), dark card background, with a small-size strip (16/28/64/512px)
  under the hero so legibility is provable
```

---

### 1. J-Cube Lockup (refine the current brand)
```text
Design the JiMesh lockup: an isometric wireframe cube whose THREE right
strokes (inner edge from center 0,0 → 208,-120, the right vertical down
to 208,120, and the bottom-right edge to the bottom vertex 0,240) are
drawn as ONE continuous stroke in cyan #22d3ee and read as the letter J.
The remaining cube outline (violet #8b5cf6, stroke-width 24 vs 27 for the
J) stays behind it. Follow the cube: wordmark "IMESH" (weight 400,
letter-spacing 6, white→cyan gradient) sits right of the mark so the
mark itself is the initial J of "JIMESH". HTML page: the 640×200 lockup
on #0b0f16 card + the standalone 800×800 mark + the small-size strip.
```

### 2. Hand-drawn Mesh Cube ("verspielt/gezeichnet")
```text
Design a hand-drawn variant of the JiMesh mesh cube: the hexagon, inner
edges, core cube and six mesh nodes are NOT geometric-perfect — build
every stroke as a slightly wobbly cubic path (control points jittered a
few units, deterministic, seeded), add a lighter ghost pass of the same
outline offset by ~4px (pencil overdraw), draw the node circles as
ellipses with pen overshoot (start gap visible), keep hidden edges and
connector lines dashed, and let a small cyan spark radiate off the top
node. Gradient violet→cyan. Output: mark + lockup with handwritten-
feeling text (weight 900, letter-spacing 5, white→cyan).
```

### 3. Reference-Faithful Rich Mesh Mark
```text
Design the "full detail" JiMesh mark exactly on this geometry: hexagon
wireframe + two visible inner edges to the upper vertices (stroke 8-10,
full opacity), three hidden edges dashed at opacity 0.35, six outer mesh
nodes (stroked circle r 9 + filled dot r 3) tied to the hexagon by dimmed
dashed connectors, and a small core cube (three faces, stroke-only) in
the center — all on the violet→cyan brand gradient. Render the hero mark
large, then prove small-size legibility (16/28/64px strip) and offer a
"reduced at small size" flavor that drops the nodes' connectors below
64px via media-query'd inline SVG dimensions.
```

### 4. Hand-Lettered Wordmark Banner
```text
Design a full-width 800×350 banner card (#0a0f1d→#070a14, rx 20) with a
hand-lettered "JIMESH" wordmark: every letter drawn as strokes (height
115 units, stroke-width 14, round caps), letters share one baseline:
J with a glowing cyan dot as antenna above the stem, I with thin cyan
ties top+bottom, E with a softened cyan top arm, H with a glowing cyan
dot on its right stem. Subtle 5%-white grid lines in the background, a
cyan underline spanning exactly the wordmark with two small end-dots.
ALL cyan gradient lines must use userSpaceOnUse gradients. Deliver the
card on dark page background plus the same card inverted for light
theme (#f8fafc card, letters #0f172a, ties/underline teal #0891b2).
```

### 5. Ghost Cube + Bold J
```text
Design a logo mark where the letter J IS the drawing: a ghost cube (the
reference hexagon wireframe + inner edges, opacity 0.3-0.35, thinner
stroke) sits behind a bold J drawn on the cube's center axis — stem from
the top vertex straight down, hook curving under the cube's bottom-left
corner and curling up toward its left vertex, one continuous stroke, full
brand gradient, stroke-width ~30. Output: 800×800 mark, a lockup with
"IMESH" as in the J-Cube concept, and a pure-glyph version where the
ghost cube is dropped entirely.
```

### 6. Negative-Space J Cube
```text
Design a filled variant: the isometric cube silhouette as a solid shape
filled with the violet→cyan gradient (soft diagonal), with a "J" carved
out as NEGATIVE SPACE (the page background color shows through) in the
lower-right of the silhouette, plus a crisp 14px outline stroke around
the silhouette and the two visible inner edges on top. Output: mark +
favicon test strip; be careful that the carved J stays readable at 16px
(width of the counter ≥ 1/8 of the cube width); include a light-theme
flavor with deeper stops (#7c3aed→#4f46e5) and dark carved counter.
```

### 7. Scalp / Favicon System
```text
Design a favicon system for JiMesh derived from the J-Cube mark: exactly
one glyph per size tier — 16px: ONLY the bold J of the cube (gradient,
no remaining outline), 32px: J + short hint of the left cube edge,
64px: full two-tone cube-J, 128px+: cube-J + wordmark flag. Each tier as
its own inline SVG on dark and light chips, plus a one-line rule set in
the page explaining when each tier is used. Verify against browser-tab
mockup and navbar mockup (28px, height-matched) rendered in the page.
```

### 8. Full Brand Sheet (one-pager)
```text
Design a single brand-sheet HTML page (not a logo): dark canvas, the
grid of ALL JiMesh logo assets in context — J-Cube lockup (dark/light),
hand-drawn mark, rich reference mark, ghost-J, favicon ladder, wordmark
banner at 800×350 half-scale — each in a labeled tile with hex codes
chips (#8b5cf6, #22d3ee, #0b0f16, #f59e0b-lead), a misuse row ("never
two accents at once", "never outline thinner than 24 units cube-space",
"never rotated beyond ±3°", "never drop the IMESH J to lowercase J-mix"),
and the navbar mockup strip showing the 28px RGB-bytes in real context.
```
