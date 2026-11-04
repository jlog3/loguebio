# LogueBio

Interactive, browser-based biology tools: simulators, 3D explorers and analysis
dashboards for genomics, proteomics, metagenomics and developmental biology.
Built for researchers, students and the curious.

**Repository:** https://github.com/jlog3/loguebio

The goal is that anyone, expert or beginner, disabled or not, can explore these
systems, understand what they show and use the results in their own work. That
is a design rule for every feature, and work in progress across the apps.

Everything runs in the browser. There are no accounts, and data you upload stays
on your device.

## The tools

| Tool | Folder | What it does | Dev port |
|---|---|---|---|
| **Landing page** | `apps/landing` | The directory of every tool, with descriptions and previews | **3002** |
| Cancer Pathway Visualizer | `apps/cancer-pathway-visualizer` | Differential expression from RNA-seq counts: volcano and MA plots, heatmaps, KEGG pathways, methods text | 3003 |
| ChromaLoop | `apps/chromaloop-simulator` | 3D chromatin folding: loop extrusion, CTCF boundaries, TADs, a live Hi-C contact map, disease presets | 3004 |
| Condensate Lab | `apps/condensate-lab` | Phase separation of biomolecular condensates, FRAP, liquid-to-solid disease aggregation | 3005 |
| FoldFlow Dynamics | `apps/foldflow-dynamics` | Protein structure ensembles in 3D, attention maps, residue mutation and stability | 3006 |
| MAG Dashboard | `apps/mag` | Quality of metagenome-assembled genomes: MIMAG tiers, completeness vs contamination, statistics | 3007 |
| OmniHarmony | `apps/omniharmony` | Multi-omics integration: factor network, UMAP, cross-layer correlations, what-if analysis | 3008 |
| Pangenome Voyager | `apps/pangenome-voyager` | Pangenome graphs as tube maps, haplotype paths, graph vs linear reference, mutation simulator | 3009 |
| Waddington Explorer | `apps/waddington-landscape-explorer` | Cell-fate landscapes in 3D, RNA velocity on UMAP, gene perturbation, story mode | 3010 |

Some apps have their own README with more detail:
[ChromaLoop](apps/chromaloop-simulator/README.md),
[Cancer Pathway Visualizer](apps/cancer-pathway-visualizer/README.md),
[MAG Dashboard](apps/mag/README.md),
[Pangenome Voyager](apps/pangenome-voyager/README.md).

The simulations are simplified teaching models, not predictions, and bundled
example datasets are examples, not findings.

## Getting started

Requires Node.js 20 or newer and npm 10.

```bash
git clone https://github.com/jlog3/loguebio.git
cd loguebio
npm install
npm run dev
```

Then open **http://localhost:3002**. Every tool starts on its own port (table
above), and the landing page's Launch buttons point at those ports while you are
running in development.

### Run only some apps

Starting all nine takes a while. To start a subset, filter by package name:

```bash
npx turbo run dev --filter=landing --filter=condensate-lab
```

Package names match the folder names. A Launch button for an app you did not
start will not connect.

One app on its own:

```bash
npm run dev -w apps/condensate-lab
```

### "Address already in use"

A port in the table is taken, usually by a dev server that is still running.
Stop servers with **Ctrl+C** in the terminal that started them (closing the
window does not always stop them). To find and stop leftovers:

```bash
ss -ltnp 'sport >= :3002 and sport <= :3010'
pkill -f "next dev"; pkill -f next-server
```

## Other commands

Run from the repo root:

```bash
npm run build     # production build of every app
npm run lint      # lint every app
npm run format    # Prettier on .ts, .tsx and .md files
```

## Landing page previews

Each card on the landing page can show screenshots and short silent clips. They
live in `apps/landing/public/previews/`, listed in `previews.json`. Use
`make_preview.py` (repo root; needs `ffmpeg`) to add them. It resizes and
compresses the file, names it and updates the list:

```bash
python3 make_preview.py --list                           # every slot and its caption
python3 make_preview.py shot.png condensate-lab 1        # screenshot -> 1600x1000 WebP
python3 make_preview.py recording.webm condensate-lab 1  # clip -> 1280x800 MP4, silent, max 10 s
python3 make_preview.py --scan                           # after copying files in by hand
```

For a screenshot that is already the right shape, use your browser's responsive
mode at 1600 × 1000. Clips never play on their own; visitors press Play.

## Repository layout

```
apps/                 one Next.js app per tool, plus the landing page
packages/
  ui/                 shared React components (@repo/ui)
  eslint-config/      shared ESLint config (@repo/eslint-config)
  typescript-config/  shared tsconfig (@repo/typescript-config)
  suite/              tool list, ports, URLs and the "All tools" link (@repo/suite)
make_preview.py       landing page preview helper
turbo.json            Turborepo task pipeline
```

The apps differ in structure (some use `src/app`, some `app/`; some TypeScript,
some JavaScript; some Tailwind, some CSS modules), so check before assuming.

## Deployment

Not live yet. The plan is one deployment per app: the landing page at
`loguebio.com` and each tool at `<slug>.loguebio.com` (for example
`condensate-lab.loguebio.com`). In a production build the landing page's Launch
buttons already point at those addresses.

## License

MIT.
