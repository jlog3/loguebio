# Cancer Pathway Interactive Visualizer v3

A production Next.js genomics platform for differential gene expression analysis across KEGG pathways.

## Setup

```bash
unzip cancer-pathway-visualizer.zip
cd cancer-pathway-visualizer
npm install
npm run dev        # → http://localhost:3000
```

## Deploy

```bash
npm run build      # production build
npm start          # serve locally

npx vercel         # deploy to Vercel (zero config)
```

## Project Structure

```
src/
├── app/
│   ├── globals.css        # Tailwind + custom dark theme
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main page — all state & charts
├── components/
│   ├── ChartTooltip.tsx   # Reusable Recharts tooltip
│   ├── ExportMenu.tsx     # CSV/TSV/JSON + clipboard gene lists
│   ├── FileDropZone.tsx   # Drag-and-drop file upload
│   ├── GeneModal.tsx      # Gene detail + external links
│   ├── MethodsPanel.tsx   # Methods paragraph for manuscripts
│   ├── StatCard.tsx       # Summary stat cards
│   └── Toast.tsx          # Notification popups
├── data/
│   ├── example.ts         # 105-gene TCGA example dataset
│   └── pathways.ts        # 344 KEGG human pathways
└── lib/
    ├── analysis.ts        # CSV parser, Welch t-test, BH correction
    ├── export.ts          # CSV/TSV/JSON generation + clipboard
    └── types.ts           # Shared TypeScript interfaces
```

## Tech Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS 3 · Recharts · Papaparse · Lodash

## Input Format

CSV with Ensembl IDs as rows, samples as columns. Raw RNA-seq counts. Version suffixes auto-stripped.

## License

Research use only. KEGG data subject to KEGG terms. TCGA data via GDC.
