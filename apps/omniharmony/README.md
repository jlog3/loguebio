# OmniHarmony — Multi-Omics Integration Dashboard

Interactive multi-omics data fusion dashboard built with **Next.js 14**, **TypeScript**, and **CSS Modules**.

![OmniHarmony](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)

## Features

- **Shared Latent Space UMAP** — Canvas-rendered embedding with per-layer opacity controls. Each omics modality (Transcriptomics, Proteomics, Epigenomics, Metabolomics) renders as a translucent overlay you can fade in/out.
- **Factor Network** — Interactive SVG network graph showing latent factors discovered by MOFA+. Click any node to drill into its cross-omics loadings.
- **Cross-Layer Correlations** — Select a factor to see how its top feature correlates with features in every other omics layer.
- **What-If Simulator** — Perturb a feature in one layer and watch predicted ripple effects cascade through the other modalities.
- **XAI Tooltips** — Every panel has explainable-AI tooltips describing how the fusion algorithm works.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
omniharmony/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Entry page (server component)
│   ├── globals.css             # Global styles, fonts, CSS variables
│   └── components/
│       ├── Dashboard.tsx       # Main orchestrator (client component)
│       ├── Dashboard.module.css
│       ├── UMAPCanvas.tsx      # Canvas-based UMAP visualization
│       ├── FactorNetwork.tsx   # SVG factor graph
│       ├── FactorDetail.tsx    # Factor loading bars
│       ├── CorrelationPanel.tsx# Cross-omics correlation display
│       ├── WhatIfPanel.tsx     # Perturbation simulator
│       ├── LayerToggles.tsx    # Omics layer opacity sliders
│       ├── PointTooltip.tsx    # Cell hover detail
│       ├── InfoTooltip.tsx     # XAI explainer tooltips
│       └── Panel.module.css    # Shared panel/header styles
├── lib/
│   └── data.ts                 # Synthetic multi-omics data generation
├── package.json
├── tsconfig.json
└── next.config.js
```

## Extending

- **Real data**: Replace `lib/data.ts` with loaders for Seurat/Scanpy `.h5ad` objects or pull from public repositories (GEO, HCA).
- **Backend**: Add Next.js API routes under `app/api/` for server-side data processing.
- **Additional layers**: The architecture supports arbitrary omics layers — just extend the `omicsLayers` array and provide matching colors/features.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | CSS Modules + CSS Variables |
| Visualization | Canvas 2D API + SVG |
| Fonts | DM Sans + DM Mono |

## License

MIT
