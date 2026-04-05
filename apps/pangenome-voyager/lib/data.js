// ─── Chromosome regions ───
export const CHROMOSOMES = [
  { id: "chr6", label: "Chr 6 – MHC Region", color: "#00e5ff" },
  { id: "chr17", label: "Chr 17 – TP53 Locus", color: "#ff6ec7" },
  { id: "chr11", label: "Chr 11 – Sickle Cell", color: "#7cff6b" },
];

// ─── HPRC-inspired haplotypes ───
export const HAPLOTYPES = [
  { id: "GRCh38", label: "GRCh38 (Reference)", color: "#00e5ff", glow: "0 0 12px #00e5ff88" },
  { id: "HG002", label: "HG002 (Ashkenazi)", color: "#ff6ec7", glow: "0 0 12px #ff6ec788" },
  { id: "HG005", label: "HG005 (Chinese)", color: "#7cff6b", glow: "0 0 12px #7cff6b88" },
  { id: "NA19240", label: "NA19240 (Yoruba)", color: "#ffb340", glow: "0 0 12px #ffb34088" },
  { id: "HG01978", label: "HG01978 (Peruvian)", color: "#c792ea", glow: "0 0 12px #c792ea88" },
];

// ─── Variant type → color map ───
export const VARIANT_COLORS = {
  SNP: "#ffd740",
  INS: "#69f0ae",
  DEL: "#ff5252",
  INV: "#e040fb",
  DUP: "#40c4ff",
  INV_ALT: "#e040fb",
};

// ─── Variant templates used during graph generation ───
const VARIANT_TEMPLATES = [
  { type: "SNP", label: "SNP", popFreq: 0.35, disease: null },
  { type: "INS", label: "Insertion (2.1kb Alu)", popFreq: 0.12, disease: "Autism risk locus" },
  { type: "DEL", label: "Deletion (5.8kb)", popFreq: 0.08, disease: "Immunodeficiency" },
  { type: "INV", label: "Inversion (45kb)", popFreq: 0.03, disease: null },
  { type: "DUP", label: "Duplication (12kb)", popFreq: 0.18, disease: "Cancer susceptibility" },
  { type: "SNP", label: "SNP (rs1234567)", popFreq: 0.45, disease: null },
  { type: "INS", label: "SVA insertion (3.2kb)", popFreq: 0.06, disease: "Neurodegeneration" },
  { type: "DEL", label: "Deletion (890bp)", popFreq: 0.22, disease: null },
];

// ─── Gene annotation templates ───
const GENE_TEMPLATES = [
  { name: "HLA-A", start: 2, end: 4, strand: "+" },
  { name: "HLA-B", start: 6, end: 8, strand: "+" },
  { name: "HLA-DRB1", start: 10, end: 13, strand: "-" },
  { name: "TP53", start: 4, end: 7, strand: "+" },
];

// ─── Deterministic pseudo-random number generator ───
function rng(seed) {
  const s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}

// ─── Generate a pangenome graph for a chromosome region ───
export function generatePangenomeGraph(chrId, seed = 42) {
  let s = seed + chrId.charCodeAt(3);
  const nodes = [];
  const edges = [];
  const variants = [];
  const numSegments = 18;
  const yBase = 200;

  // Create backbone segment nodes
  for (let i = 0; i < numSegments; i++) {
    s++;
    nodes.push({
      id: `n${i}`,
      x: 80 + i * 52,
      y: yBase,
      type: "segment",
      label: `Seg ${i + 1}`,
      length: Math.floor(rng(s) * 50000 + 10000),
      gc: (rng(s + 1) * 0.3 + 0.35).toFixed(2),
    });
  }

  // Create backbone edges
  for (let i = 0; i < numSegments - 1; i++) {
    edges.push({
      from: `n${i}`,
      to: `n${i + 1}`,
      type: "backbone",
      haplotypes: HAPLOTYPES.map((h) => h.id),
    });
  }

  // Create variant bubble nodes and edges
  for (let v = 0; v < VARIANT_TEMPLATES.length; v++) {
    const seg = 2 + v * 2;
    if (seg >= numSegments - 1) break;
    s++;

    const vt = VARIANT_TEMPLATES[v];
    const altHaps = HAPLOTYPES.slice(1)
      .filter(() => {
        s++;
        return rng(s) > 0.4;
      })
      .map((h) => h.id);
    if (altHaps.length === 0) altHaps.push("HG002");

    const bubbleTop = {
      id: `b${v}_top`,
      x: nodes[seg].x + 26,
      y: yBase - 55 - rng(s + 2) * 20,
      type: "variant",
      variantType: vt.type,
      label: vt.label,
      popFreq: vt.popFreq,
      disease: vt.disease,
    };

    const bubbleBot =
      vt.type === "INV"
        ? {
            id: `b${v}_bot`,
            x: nodes[seg].x + 26,
            y: yBase + 55 + rng(s + 3) * 20,
            type: "variant",
            variantType: "INV_ALT",
            label: "Inv. Alt Path",
            popFreq: vt.popFreq,
            disease: vt.disease,
          }
        : null;

    nodes.push(bubbleTop);
    if (bubbleBot) nodes.push(bubbleBot);

    edges.push({ from: `n${seg}`, to: bubbleTop.id, type: "bubble", haplotypes: altHaps });
    edges.push({ from: bubbleTop.id, to: `n${seg + 1}`, type: "bubble", haplotypes: altHaps });

    if (bubbleBot) {
      edges.push({ from: `n${seg}`, to: bubbleBot.id, type: "bubble", haplotypes: altHaps.slice(0, 1) });
      edges.push({ from: bubbleBot.id, to: `n${seg + 1}`, type: "bubble", haplotypes: altHaps.slice(0, 1) });
    }

    variants.push({
      ...vt,
      nodeId: bubbleTop.id,
      segment: seg,
      altHaplotypes: altHaps,
      expanded: false,
    });
  }

  return { nodes, edges, variants, genes: GENE_TEMPLATES };
}
