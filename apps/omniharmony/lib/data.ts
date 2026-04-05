// ── Seed-based PRNG for reproducible synthetic data ──

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export interface ClusterDef {
  cx: number;
  cy: number;
  label: string;
  cellType: string;
}

export interface LayerOffset {
  dx: number;
  dy: number;
}

export interface DataPoint {
  id: number;
  cluster: number;
  cellType: string;
  clusterLabel: string;
  base: { x: number; y: number };
  layerOffsets: Record<string, LayerOffset>;
}

export interface FeatureLoading {
  feature: string;
  loadings: number[];
}

export interface CorrelationEntry {
  feature: string;
  corr: number;
}

export interface OmicsDataset {
  points: DataPoint[];
  clusters: ClusterDef[];
  omicsLayers: string[];
  layerColors: Record<string, [number, number, number]>;
  features: Record<string, string[]>;
  factorNames: string[];
  factorLoadings: Record<string, FeatureLoading[]>;
  correlations: Record<string, Record<string, CorrelationEntry[]>>;
  nFactors: number;
}

export function generateData(): OmicsDataset {
  const rng = seededRandom(42);
  const gauss = () => {
    let u = 0,
      v = 0;
    while (!u) u = rng();
    while (!v) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const clusters: ClusterDef[] = [
    { cx: -3, cy: 2, label: "Cluster A", cellType: "T-cells" },
    { cx: 2, cy: 3, label: "Cluster B", cellType: "B-cells" },
    { cx: -1, cy: -3, label: "Cluster C", cellType: "Macrophages" },
    { cx: 3, cy: -1, label: "Cluster D", cellType: "NK-cells" },
    { cx: -4, cy: -1, label: "Cluster E", cellType: "Dendritic" },
  ];

  const omicsLayers = [
    "Transcriptomics",
    "Proteomics",
    "Epigenomics",
    "Metabolomics",
  ];

  const layerColors: Record<string, [number, number, number]> = {
    Transcriptomics: [0, 200, 255],
    Proteomics: [255, 100, 200],
    Epigenomics: [100, 255, 150],
    Metabolomics: [255, 200, 50],
  };

  const points: DataPoint[] = [];
  let id = 0;
  clusters.forEach((cl, ci) => {
    const n = 30 + Math.floor(rng() * 20);
    for (let i = 0; i < n; i++) {
      const base = { x: cl.cx + gauss() * 0.7, y: cl.cy + gauss() * 0.7 };
      const layerOffsets: Record<string, LayerOffset> = {};
      omicsLayers.forEach((l) => {
        layerOffsets[l] = { dx: gauss() * 0.25, dy: gauss() * 0.25 };
      });
      points.push({
        id: id++,
        cluster: ci,
        cellType: cl.cellType,
        clusterLabel: cl.label,
        base,
        layerOffsets,
      });
    }
  });

  const geneNames = [
    "TP53", "BRCA1", "MYC", "EGFR", "KRAS", "AKT1", "PIK3CA", "PTEN",
    "RB1", "NOTCH1", "JAK2", "STAT3", "RAF1", "BRAF", "CDK4", "ERBB2",
    "VEGFA", "FGF2", "TGFB1", "IL6",
  ];
  const proteinNames = [
    "p53", "BRCA1-p", "c-Myc", "EGFR-p", "K-Ras", "Akt-p", "PI3K",
    "PTEN-p", "Rb", "Notch-ICD", "JAK2-p", "STAT3-p", "c-Raf", "B-Raf",
    "CDK4-p", "HER2", "VEGF", "FGF2-p", "TGFβ", "IL-6",
  ];
  const epiNames = geneNames.map((g) => `${g}-me`);
  const metNames = [
    "Glucose", "Lactate", "Glutamine", "Citrate", "Pyruvate", "Succinate",
    "Fumarate", "Malate", "ATP", "NAD+", "Acetyl-CoA", "Palmitate",
    "Cholesterol", "Serine", "Glycine", "Alanine", "Tryptophan", "Leucine",
    "Arginine", "Proline",
  ];

  const features: Record<string, string[]> = {
    Transcriptomics: geneNames,
    Proteomics: proteinNames,
    Epigenomics: epiNames,
    Metabolomics: metNames,
  };

  const nFactors = 8;
  const factorNames = [
    "Immune Activation", "Metabolic Shift", "Cell Cycle",
    "Epigenetic Remodel", "Signal Cascade", "Stress Response",
    "Differentiation", "Angiogenesis",
  ];

  const factorLoadings: Record<string, FeatureLoading[]> = {};
  omicsLayers.forEach((layer) => {
    factorLoadings[layer] = features[layer].map((feat) => {
      const loadings: number[] = [];
      for (let f = 0; f < nFactors; f++) loadings.push(gauss() * 0.5);
      return { feature: feat, loadings };
    });
  });

  const correlations: Record<string, Record<string, CorrelationEntry[]>> = {};
  omicsLayers.forEach((l1) => {
    omicsLayers.forEach((l2) => {
      if (l1 === l2) return;
      const key = `${l1}|${l2}`;
      correlations[key] = {};
      features[l1].forEach((f1, i) => {
        correlations[key][f1] = features[l2]
          .map((f2, j) => {
            const base = i === j ? 0.6 + rng() * 0.35 : rng() * 0.4 - 0.1;
            return {
              feature: f2,
              corr: Math.max(-1, Math.min(1, base + gauss() * 0.1)),
            };
          })
          .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
      });
    });
  });

  return {
    points,
    clusters,
    omicsLayers,
    layerColors,
    features,
    factorNames,
    factorLoadings,
    correlations,
    nFactors,
  };
}

// Pre-generated singleton
export const DATA = generateData();

// ── Utility: map data coordinates to canvas pixels ──
export function mapToCanvas(
  x: number,
  y: number,
  w: number,
  h: number,
  pad = 40
) {
  const scale = Math.min((w - pad * 2) / 10, (h - pad * 2) / 10);
  return { px: w / 2 + x * scale, py: h / 2 - y * scale };
}
