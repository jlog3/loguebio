// Every setting the model reads, with plain-language meanings.
// Gene levels run from 0 (knocked out) through 0.5 (normal, "wild type") to 1 (overexpressed).

export const GENE_NAMES = ["Sox2", "Neurog2", "Olig2", "MyoD", "Gata1", "Notch1", "Wnt3a", "Shh"] as const;
export type GeneName = (typeof GENE_NAMES)[number];

export const FATES = ["stem", "neuron", "glia", "muscle", "blood"] as const;
export type Fate = (typeof FATES)[number];
export type Lineage = Exclude<Fate, "stem">;
export const LINEAGES: readonly Lineage[] = ["neuron", "glia", "muscle", "blood"];

export interface GeneInfo {
  name: GeneName;
  /** What the gene is, in a sentence. */
  role: string;
  /** What changing it does in this model (and only this model). */
  effect: string;
}

export const GENE_INFO: Record<GeneName, GeneInfo> = {
  Sox2: {
    name: "Sox2",
    role: "Keeps stem cells as stem cells (a pluripotency factor).",
    effect: "Deepens a small hollow at the top of the hill, so cells stay undecided for longer. Knocked out, cells leave the summit sooner.",
  },
  Neurog2: {
    name: "Neurog2",
    role: "Pushes cells to become neurons (a proneural factor).",
    effect: "Deepens the neuron valley and slightly shallows the glia valley, its competitor. Knocked out, the neuron valley disappears.",
  },
  Olig2: {
    name: "Olig2",
    role: "Pushes neural cells to become glia (oligodendrocytes).",
    effect: "Deepens the glia valley and slightly shallows the neuron valley. Knocked out, the glia valley disappears.",
  },
  MyoD: {
    name: "MyoD",
    role: "The master switch for skeletal muscle.",
    effect: "Deepens the muscle valley. Knocked out, the muscle valley disappears.",
  },
  Gata1: {
    name: "Gata1",
    role: "Needed to make red blood cells.",
    effect: "Deepens the blood valley. Knocked out, the blood valley disappears.",
  },
  Notch1: {
    name: "Notch1",
    role: "A signal between neighbouring cells that holds back neuron formation (lateral inhibition).",
    effect: "More Notch1 shallows the neuron valley and deepens the glia valley.",
  },
  Wnt3a: {
    name: "Wnt3a",
    role: "A signal that steers early cells towards mesoderm (muscle and blood).",
    effect: "Tilts the whole landscape towards the muscle and blood side.",
  },
  Shh: {
    name: "Shh",
    role: "Sonic hedgehog: a signal that patterns the neural tube and switches on Olig2.",
    effect: "Deepens the glia valley.",
  },
};

export interface ModelParams {
  genes: Record<GeneName, number>;
  /** Cell-to-cell randomness (like temperature for the marbles). */
  noise: number;
  /** How many cells to simulate. */
  cellCount: number;
  /** Same seed and settings give the same cells. */
  seed: number;
}

export const NORMAL_LEVEL = 0.5;

export const DEFAULT_PARAMS: ModelParams = {
  genes: { Sox2: 0.5, Neurog2: 0.5, Olig2: 0.5, MyoD: 0.5, Gata1: 0.5, Notch1: 0.5, Wnt3a: 0.5, Shh: 0.5 },
  noise: 1,
  cellCount: 1500,
  seed: 7,
};

export const NOISE_RANGE = { min: 0.3, max: 2.5, step: 0.1 };
export const CELL_COUNTS = [500, 1000, 1500, 2500] as const;

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
}

/** A gene level described in words. */
export function levelWord(v: number): string {
  if (v <= 0.02) return "knocked out";
  if (v < 0.35) return "low";
  if (v <= 0.65) return Math.abs(v - 0.5) < 0.02 ? "normal" : v < 0.5 ? "slightly low" : "slightly high";
  if (v < 0.98) return "high";
  return "overexpressed";
}

export function pctLevel(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** Validates params read from a file; anything bad falls back to the default. */
export function sanitizeParams(input: unknown): ModelParams {
  const out: ModelParams = { ...DEFAULT_PARAMS, genes: { ...DEFAULT_PARAMS.genes } };
  if (!input || typeof input !== "object") return out;
  const o = input as Record<string, unknown>;
  const g = o.genes as Record<string, unknown> | undefined;
  if (g && typeof g === "object") {
    for (const n of GENE_NAMES) if (typeof g[n] === "number") out.genes[n] = Math.round(clamp01(g[n] as number) * 100) / 100;
  }
  if (typeof o.noise === "number") out.noise = Math.min(NOISE_RANGE.max, Math.max(NOISE_RANGE.min, Math.round(o.noise * 10) / 10));
  if (typeof o.cellCount === "number" && (CELL_COUNTS as readonly number[]).includes(o.cellCount)) out.cellCount = o.cellCount;
  if (typeof o.seed === "number" && Number.isInteger(o.seed) && o.seed > 0) out.seed = o.seed;
  return out;
}

export function isNormal(p: ModelParams): boolean {
  return GENE_NAMES.every((n) => Math.abs(p.genes[n] - NORMAL_LEVEL) < 1e-9);
}

/** Genes that differ from normal, as words: "Neurog2 knocked out, Shh high". */
export function changesSentence(p: ModelParams): string {
  const parts = GENE_NAMES.filter((n) => Math.abs(p.genes[n] - NORMAL_LEVEL) >= 0.01).map((n) => `${n} ${levelWord(p.genes[n])} (${pctLevel(p.genes[n])})`);
  return parts.length ? parts.join(", ") : "all genes at normal levels";
}
