# MAGShiny v2

**MAGShiny** is an interactive dashboard for analyzing and visualizing the quality of metagenomically assembled genomes (MAGs). Rebuilt from the ground up with Next.js, React, Recharts, and Tailwind CSS — replacing the original R/Shiny implementation for better performance, modern UX, and easier deployment.

Inspired by [BIgMAG](https://github.com/jeffe107/BIgMAG) and the [MAGFlow](https://github.com/jeffe107/MAGFlow) pipeline.

## What Changed (v1 → v2)

| Area | v1 (Shiny) | v2 (Next.js) |
|------|-----------|--------------|
| **Framework** | R Shiny + shinydashboard | Next.js 15 + React 19 |
| **Styling** | 400+ lines of `!important` CSS hacks | Tailwind CSS utility classes |
| **Charts** | ggplot2 → plotly (server-rendered) | Recharts (client-side, 60fps) |
| **Stats** | R `stats::kruskal.test`, `oneway.test` | Pure JS implementations (Kruskal-Wallis, Welch ANOVA) |
| **Data parsing** | `readr::read_tsv` | PapaParse (streams large files) |
| **Boxplots** | ggplot2 `geom_boxplot` | Custom CSS boxplots (no canvas overhead) |
| **Heatmap** | `heatmaply` (heavy dependency) | Custom z-score normalized HTML heatmap |
| **Table** | DT (DataTables) | Custom sortable/searchable/paginated table |
| **Deployment** | shinyapps.io or local R | Vercel, Netlify, Docker, or any Node host |
| **Bundle size** | ~80MB (R + packages + renv) | ~2MB production build |
| **Layout bugs** | Fixed sidebar/header scroll issues | Clean sticky header, no scroll fighting |

### New in v2
- **MIMAG reference lines** on Completeness vs Contamination scatter (90% completeness, 5% contamination thresholds)
- **N50 vs Completeness** scatter (assembly contiguity correlation)
- **Per-metric boxplots** for Completeness and Contamination (in addition to N50 and CSS)
- **Statistical significance indicators** — visual green/gray badges on test results
- **Stat cards** — at-a-glance summary row with quality counts, GUNC pass rate, and Kruskal-Wallis p-value
- **Color-by selector** — switch scatter coloring between Taxonomy, Sample, or Quality tier
- **Global search** across all columns in the data table
- **TSV download** of processed (filtered + quality-classified) data
- **Zero-dependency stats** — Kruskal-Wallis H test and Welch ANOVA implemented in pure TypeScript (no R runtime needed)

## Quick Start

```bash
# Clone
git clone https://github.com/jlog3/MAGShiny.git
cd MAGShiny

# Install
npm install

# Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload a TSV/CSV or click "Load Sample Data" to explore the demo dataset.

### Production Build

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npx vercel
```

No additional configuration needed — Next.js deploys out of the box.

## Data Format

Upload a TSV or CSV with these columns:

| Column | Description |
|--------|-------------|
| `Sample_ID` | Unique sample identifier |
| `Completeness` | MAG completeness % (CheckM2) |
| `Contamination` | MAG contamination % (CheckM2) |
| `Complete_SCO` | Complete single-copy orthologs (BUSCO) |
| `CSS` | Chimerism contamination score (GUNC) |
| `N50` | Assembly N50 statistic (QUAST) |
| `Taxonomy_Level` | Taxonomic classification |

Example row:
```
Sample1	95.2	2.1	90.0	0.3	50000	Bacteria
```

### Where to Get Real Data

- [MGnify](https://www.ebi.ac.uk/metagenomics/) — EBI's metagenomics analysis platform
- Run [MAGFlow](https://github.com/jeffe107/MAGFlow) on your own FASTA files to generate compatible output

## Dashboard Tabs

- **Summary** — Stacked bar charts of quality tiers per sample, GUNC pass/fail rates, and statistical test results (Kruskal-Wallis, Welch ANOVA)
- **Scatterplots** — Completeness vs Contamination (with MIMAG thresholds), BUSCO SCO vs Contamination, N50 vs Completeness. Colorable by taxonomy, sample, or quality
- **Boxplots** — Distribution of N50, CSS, Completeness, and Contamination per sample with whiskers and outlier detection
- **Taxonomy** — Presence/absence matrix of taxonomic groups across samples
- **Heatmap** — Z-score normalized average metrics per sample with diverging blue→red color scale
- **Data** — Full interactive table with search, sort, pagination, and TSV export

## Quality Classification (MIMAG Standards)

| Tier | Completeness | Contamination |
|------|-------------|---------------|
| **High** | > 90% | < 5% |
| **Medium** | > 50% | < 10% |
| **Low** | Everything else | — |

GUNC pass threshold: CSS < 0.45 (chimeric-free genome).

## Tech Stack

- **Next.js 15** — React framework with App Router
- **React 19** — UI components
- **Tailwind CSS v4** — Utility-first styling
- **Recharts** — Composable chart library
- **PapaParse** — CSV/TSV parser
- **Lodash** — Data utilities
- **TypeScript** — End-to-end type safety

## Project Structure

```
magshiny-next/
├── app/
│   ├── globals.css          # Tailwind + custom theme
│   ├── layout.tsx           # Root layout with fonts
│   └── page.tsx             # Entry point
├── components/
│   └── Dashboard.tsx        # Main dashboard (all tabs)
├── lib/
│   ├── stats.ts             # Kruskal-Wallis, Welch ANOVA, boxplot stats
│   └── types.ts             # TypeScript interfaces
├── public/
│   └── data/
│       └── sample_MAG_data.tsv
├── package.json
├── tsconfig.json
├── next.config.mjs
└── postcss.config.mjs
```

## MAGFlow Integration (Future)

The original Shiny app had a workflow for running MAGFlow via Nextflow + Docker directly from the UI. This has been removed in v2 because browser-based apps cannot spawn Docker containers. Instead, the recommended workflow is:

1. Run MAGFlow separately: `nextflow run jeffe107/MAGFlow -profile docker --files /path/to/mags --outdir results`
2. Upload the resulting `final_df.tsv` to this dashboard

A future version may add a Node.js API route to orchestrate MAGFlow runs server-side.

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature-name`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature-name`
5. Open a pull request

## License

MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [BIgMAG](https://github.com/jeffe107/BIgMAG)
- Built on [MAGFlow](https://github.com/jeffe107/MAGFlow) output format
- Tools: [CheckM2](https://github.com/chklovski/CheckM2), [BUSCO](https://busco.ezlab.org/), [QUAST](https://quast.sourceforge.net/), [GUNC](https://grp-bork.embl-community.io/gunc/)

## Citation

- MAGFlow/BIgMAG (2024): [PMC11445639](https://pmc.ncbi.nlm.nih.gov/articles/PMC11445639/)
- MAGFlow: [jeffe107/MAGFlow](https://github.com/jeffe107/MAGFlow)
- BIgMAG: [jeffe107/BIgMAG](https://github.com/jeffe107/BIgMAG)
