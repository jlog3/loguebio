# Waddington Explorer

Watch cells roll down a Waddington landscape (hills and valleys standing for
how committed a cell is) into four fates: neurons, glia, muscle and blood.
Turn eight genes up or down and see valleys deepen, vanish or tilt, and new
branches form. Read the result as a 3D landscape, a map from above, tables,
text, a chart of gene levels along pseudotime, or sound. A seven-step story
walks newcomers through it; the Learn page explains Waddington's landscape,
single-cell RNA sequencing, UMAP, RNA velocity and pseudotime in plain words.

A simplified teaching model with simulated cells. The app lists what it leaves
out under "About this model"; every export says the data is simulated.

```bash
npm run dev -w apps/waddington-landscape-explorer      # from the repo root, port 3010
```

## How the model works

- A 2D potential: a hill with a small hollow at the summit (Sox2 keeps cells
  there), four valleys whose depth each gene sets, a Wnt tilt and a rim.
- Cells roll downhill by overdamped Langevin dynamics with exact gradients. Each
  cell has its own random stream, so changing a gene re-rolls the same cells with
  the same random kicks and differences come from the gene alone.
- A cell's fate is the valley it ends in (undecided if it stays near the summit).
  Expression is calculated from its position.
- Pseudotime is inferred from expression only, as real tools do (shortest paths
  on a 12-nearest-neighbour graph from the least differentiated cell), and the
  Pseudotime check tab compares it with the true age.

## Layout

```
app/            page, learn/ (articles, genes, glossary, reading), layout, styles
components/     Explorer (composition), Landscape3D (three.js), StateMap (2D map),
                GenePanel, TimeBar, Status (summary, cell card, announcements),
                Panels (Fates, Cells, Genes, Pseudotime check, Log), Story, Dialogs
lib/model/      landscape, simulate, stats, params, rng
lib/store.ts    the one state model every view reads and every control writes
lib/describe.ts the text versions of the pictures (summary, announcements, alt text)
lib/look.ts     fate colours and shapes from the shared palette, contours
lib/export.ts   CSV, JSON and SVG exports, each labelled as simulated data
lib/content.ts  experiments, story, glossary, articles, model limits
```

Settings (theme, contrast, palette, text size, motion, sound) come from
`@repo/access` and carry across tools; charts, tables, tabs, dialogs and sound
come from `@repo/kit`.

## Tests run on this build

- Model: 24 checks against known behaviour (each knockout empties its valley
  and mostly changes the cells that were in it, overexpression enlarges a valley,
  Notch shifts neurons to glia, Wnt tilts towards muscle and blood, inferred
  pseudotime follows true age (rank correlation 0.78: related, not identical),
  the exact slope matches the numerical one, the same seed gives the same cells).
- Browser: 70 checks with Playwright, including axe on every tab and theme,
  keyboard paths through the 3D view, map, chart and dialogs, announcements,
  reduced motion, 200% text, a phone screen, no-WebGL fallback, and settings
  carrying over from Condensate Lab.
