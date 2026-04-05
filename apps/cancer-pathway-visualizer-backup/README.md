# Cancer Pathway Interactive Visualizer v3

A modern genomics analysis platform for differential gene expression across KEGG pathways. Rebuilt from R/Shiny into React with full client-side analysis, comprehensive exports, and interactive gene exploration.

## Quick Start

1. Open the `.jsx` artifact
2. Click **Load Example** (TCGA melanoma tumor vs kidney normal)
3. Click **Run Differential Expression Analysis**
4. Explore results across 5 visualization tabs

## Features

### Analysis
- **Welch's t-test** for differential expression (unequal variance)
- **Benjamini-Hochberg FDR** correction for multiple testing
- Handles **60,000+ genes** from full TCGA datasets
- Automatic Ensembl version stripping and duplicate averaging
- Dynamic significance thresholds (adjustable |FC| and p-value cutoffs)

### 5 Visualization Modes
- **Volcano Plot** — log₂FC vs −log₁₀(padj) with interactive thresholds
- **MA Plot** — fold change vs mean expression for bias detection
- **FC Distribution** — histogram of fold changes (all vs significant)
- **Top Genes** — bar chart of most differentially expressed genes
- **Results Table** — sortable, filterable, paginated (100/page)

### Gene Detail Panel
Click any gene (chart points, bar segments, or table rows) to open:
- Full statistics: log₂FC, adjusted p-value, tumor/normal means
- Sample-level raw counts for each replicate
- Direct links to **Ensembl**, **GeneCards**, **NCBI Gene**, **UniProt**

### Export Suite
Full dropdown menu with:
- **Download formats**: CSV, TSV, JSON
- **Scopes**: All results, significant only, current filtered view
- **Clipboard copy**: All gene IDs, upregulated IDs, downregulated IDs, significant IDs
- Ready for pasting into enrichment tools (DAVID, Enrichr, GSEA, g:Profiler)

### Methods Summary
One-click copyable methods paragraph for manuscripts, auto-populated with your actual sample sizes and gene counts.

### Usability
- **Pathway search** with category filtering (Cancer, Immune, Signaling, Metabolism, etc.)
- **Table filters**: All / Significant / Up / Down quick presets
- **Pagination** for large datasets
- **File clearing** with × buttons on each upload zone
- **Session reset** button in header
- **Keyboard shortcuts**: Escape closes modals/dropdowns
- **Toast notifications** confirming exports and actions
- **KEGG deep links** for selected pathways

## Input Format

CSV with Ensembl gene IDs as rows and sample IDs as columns:

```
"","Sample_1","Sample_2"
"ENSG00000000003.15",1662,1119
"ENSG00000000005.6",2,0
```

- Version suffixes (`.15`) auto-stripped
- Duplicate gene IDs averaged
- Works with STAR, HTSeq, featureCounts output

### Getting Data from TCGA

```r
library(TCGAbiolinks)
query <- GDCquery(
  project = "TCGA-SKCM",
  data.category = "Transcriptome Profiling",
  data.type = "Gene Expression Quantification",
  workflow.type = "STAR - Counts",
  sample.type = "Primary Tumor"
)
GDCdownload(query)
data <- GDCprepare(query)
write.csv(assay(data), "tumor_rawcounts.csv")
```

## Statistical Notes

The client-side analysis is suitable for exploratory analysis and hypothesis generation. For publication-grade results:
- Use **DESeq2** or **edgeR** with ≥3 biological replicates per condition
- Apply library size normalization
- Use shrinkage estimators for fold change
- The p-value approximation uses a logistic approximation to the t-distribution

## Next.js Deployment

```bash
npx create-next-app@latest cancer-viz --typescript --tailwind --app
cd cancer-viz
npm install recharts papaparse lodash @types/lodash
# Copy the .jsx into app/page.tsx with type annotations
vercel deploy
```

## Changelog

### v3 (current)
- Gene detail modal with sample-level counts and 4 external database links
- Full export menu: CSV/TSV/JSON × all/significant/filtered
- Clipboard copy for gene ID lists (paste into enrichment tools)
- Methods summary panel for manuscripts
- Table pagination, direction presets, inline Ensembl links
- File clear buttons, session reset, toast notifications
- Keyboard shortcuts (Escape)
- Clickable chart points for gene inspection

### v2
- Added MA plot, FC distribution, BH FDR correction
- Dynamic volcano thresholds

### v1 (Shiny)
- Basic pathway viewer with KEGG API calls
- Required R server with Bioconductor packages
- Single pathview PNG output

## License

Research use only. KEGG data subject to KEGG terms. TCGA data publicly available via GDC.
