# 🧬 Pangenome Voyager

**Graph-Based Genome Navigator** — An interactive visualization tool for exploring pangenome graphs, structural variation, and haplotype diversity in the long-read sequencing era.

Inspired by the [Human Pangenome Reference Consortium (HPRC)](https://humanpangenome.org/) and built to teach why linear reference genomes are giving way to graph-based representations.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### 🗺️ Graph View
Interactive tube-map style pangenome graph where chromosomal segments form the backbone and structural variants appear as "bubbles" — alternate paths that different haplotypes traverse. Click any variant node to inspect its type, population frequency, associated haplotypes, and disease links.

### 🔀 Compare Mode
Side-by-side view of the pangenome graph (top) and GRCh38 linear reference (bottom), connected by animated alignment paths. Clearly demonstrates why a flat string can't capture the full spectrum of human variation.

### ⚡ Mutation Simulator
Add up to 5 custom structural variants (SNP, insertion, deletion, inversion, duplication) at any backbone segment. Watch red dashed paths reroute through the graph in real time — the same mechanism by which real pangenome graphs incorporate newly discovered variation.

### 🎛️ Overlay Controls
- **Population Frequency** — color-codes variant nodes by allele frequency across populations
- **Gene Annotations** — displays gene spans with strand direction (HLA-A, HLA-B, HLA-DRB1, TP53)
- **Disease Associations** — highlights variants linked to clinical phenotypes

### 🧬 Haplotype Tracing
Toggle 5 HPRC-inspired haplotypes (GRCh38, HG002, HG005, NA19240, HG01978) with glowing colored paths. Each haplotype traces its own route through the graph, diverging at variant bubbles.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone or unzip the project
cd pangenome-voyager

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
pangenome-voyager/
├── app/
│   ├── globals.css          # Tailwind directives + custom styles
│   ├── layout.js            # Root layout with metadata
│   └── page.js              # Main page — state management & composition
├── components/
│   ├── AmbientEffects.jsx   # Background grid + floating particles
│   ├── AlignmentPaths.jsx   # Animated SVG connector (compare mode)
│   ├── CompareView.jsx      # Graph ↔ linear side-by-side
│   ├── Header.jsx           # Logo + view mode tabs
│   ├── LinearView.jsx       # GRCh38 linear reference SVG
│   ├── MutationSimulator.jsx# Variant injection controls
│   ├── PangenomeGraph.jsx   # Core tube-map graph renderer
│   ├── Sidebar.jsx          # Region/haplotype/overlay/zoom controls
│   ├── StatusBar.jsx        # Node/edge/variant counts
│   └── VariantPanel.jsx     # Variant detail popup
├── lib/
│   └── data.js              # Constants, graph generation, data models
├── public/
├── jsconfig.json            # Path aliases (@/*)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Architecture

| Layer | Responsibility |
|-------|---------------|
| `lib/data.js` | Deterministic graph generation with seeded PRNG. Produces nodes (segments + variant bubbles), edges (backbone + bubble paths), variant metadata, and gene annotations. Swappable with real GFA/vg data. |
| `PangenomeGraph.jsx` | Pure SVG renderer. Merges base graph with user mutations, builds node lookup map, renders edges with haplotype coloring, nodes with overlay-dependent styling, and animated highlight rings. |
| `page.js` | Top-level state orchestrator. All state lives here and flows down as props — no context or global stores needed at this scale. |
| Components | Each UI panel is a self-contained component receiving props + callbacks. |

---

## Extending with Real Data

The graph generator in `lib/data.js` produces simulated data. To connect real pangenome data:

1. **Parse GFA files** — Use a GFA parser to read `.gfa` output from tools like `minigraph`, `vg`, or `pggb`
2. **Map to node/edge format** — Convert GFA segments → nodes, links → edges, paths → haplotype arrays
3. **Replace `generatePangenomeGraph()`** — Return the same `{ nodes, edges, variants, genes }` shape
4. **Add VCF overlay** — Parse structural variant calls to populate variant metadata

---

## License

MIT
