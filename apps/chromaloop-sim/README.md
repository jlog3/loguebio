# ChromaLoop Simulator

**Live 3D Chromatin Folding Playground**

An interactive Next.js application that simulates 3D genome organization—chromatin loops, TADs (topologically associating domains), loop extrusion by cohesin motors, and their link to gene regulation and disease.

![ChromaLoop](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js) ![Three.js](https://img.shields.io/badge/Three.js-r170-orange?style=flat-square&logo=three.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)

---

## Features

### 🧬 Real-Time Polymer Physics
- Langevin dynamics simulation of a chromatin fiber (bead-spring polymer model)
- Backbone connectivity (spring forces), bending stiffness, excluded volume repulsion
- Spherical nuclear confinement boundary
- Adjustable temperature (thermal noise)

### 🔄 Loop Extrusion
- Simulated cohesin motors that extrude chromatin loops in real time
- CTCF boundary elements (forward/reverse orientation) that stall cohesin
- Toggle loop extrusion on/off to see structural collapse
- Individual cohesin motor status display

### 🗺️ Triple Synchronized View
- **3D WebGL View** — Rotatable, zoomable Three.js chromatin model with bead types (CTCF, promoter, enhancer, normal), loop connections, cohesin rings, and TAD labels
- **Hi-C Contact Map** — Canvas-rendered 2D heatmap showing pairwise contact frequencies with TAD triangles, crosshair selection, and live updates
- **Gene Expression Track** — Genomic coordinate track showing real-time expression levels based on enhancer-promoter 3D proximity, with arc connections

### 🔬 Interactive Controls
- **Mutate CTCF Sites** — Click any CTCF boundary to delete it and watch TAD structure collapse
- **Temperature Slider** — Control thermal fluctuations
- **A/B Compartment Strength** — Tune compartmentalization (euchromatin vs heterochromatin)
- **Color Schemes** — TAD, compartment, expression, or distance-based coloring
- **View Modes** — Split view, 3D-only, or Hi-C-only

### ⚠️ Disease Mode
Four real cancer/disease-associated chromatin disruptions with animated before/after:
1. **Limb Malformation** — TAD boundary deletion (WNT6/IHH locus) — Lupiáñez et al., Cell 2015
2. **AML Enhancer Hijacking** — Super-enhancer repositioning near MYC — Gröschel et al., Cell 2014
3. **Medulloblastoma** — CTCF mutation disrupts GFI1 insulation — Northcott et al., Nature 2014
4. **Polydactyly** — ZRS enhancer mutation activating SHH — Lettice et al., PNAS 2003

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts and metadata
│   ├── page.tsx            # Main page (dynamic import)
│   └── globals.css         # Global styles, glass panels, animations
├── components/
│   ├── Simulator.tsx       # Main orchestrator (state, simulation loop)
│   ├── ChromatinViewer3D.tsx   # Three.js 3D chromatin visualization
│   ├── HiCContactMap.tsx   # Canvas Hi-C heatmap
│   ├── GeneExpressionTrack.tsx # Genomic expression track
│   ├── ControlPanel.tsx    # Left sidebar controls
│   └── DiseaseMode.tsx     # Right panel disease presets
├── lib/
│   └── polymerPhysics.ts   # Simulation engine (forces, integration, diseases)
└── types/
    └── index.ts            # TypeScript interfaces
```

## Tech Stack

- **Next.js 14** — App Router, React Server Components
- **React Three Fiber** + **Drei** — Declarative Three.js
- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Animations
- **TypeScript** — Full type safety
- **Canvas API** — Hi-C heatmap rendering

## The Science

This simulator models the **loop extrusion** mechanism of chromatin organization:

1. **Cohesin** (a ring-shaped motor protein) loads onto chromatin and actively extrudes a loop by reeling in fiber from both sides
2. **CTCF** proteins bound at specific sites act as barriers, stalling cohesin and defining **TAD boundaries**
3. TADs (Topologically Associating Domains) are ~100kb–1Mb self-interacting genomic neighborhoods
4. Within TADs, **enhancers** can contact **promoters** to activate gene expression
5. TAD boundaries **insulate** genes from enhancers in neighboring domains
6. When boundaries are disrupted (mutations, deletions), enhancers can **ectopically activate** genes across domains → disease

The Hi-C contact map is a 2D representation of 3D genome contacts, where each pixel (i,j) represents the frequency that genomic positions i and j are in spatial proximity. TADs appear as triangles along the diagonal.

---

*Built for teaching why distant enhancers suddenly matter.*
