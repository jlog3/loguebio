// Numbers computed from a population. Every view and text summary reads these,
// so the picture, the tables, the speech and the exports always agree.

import { relativeDepths, type Terrain } from "./landscape";
import { FATES, GENE_NAMES, type Fate, type GeneName, type Lineage } from "./params";
import type { Cell, Population } from "./simulate";

export const MARKER: Record<Fate, GeneName> = {
  stem: "Sox2",
  neuron: "Neurog2",
  glia: "Olig2",
  muscle: "MyoD",
  blood: "Gata1",
};

export interface FateStat {
  fate: Fate;
  count: number;
  share: number;
  /** Change in share from the normal (wild-type) run, in percentage points. */
  deltaPoints: number | null;
  /** Median inferred pseudotime of these cells. */
  medianPseudotime: number | null;
  /** Inferred pseudotime where the branch starts (5th percentile of its cells). */
  branchPoint: number | null;
  /** Mean marker expression in these cells. */
  markerMean: number;
}

export function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

export function fateStats(cells: Cell[], normal: Cell[] | null): FateStat[] {
  const n = Math.max(1, cells.length);
  return FATES.map((fate) => {
    const of = cells.filter((c) => c.fate === fate);
    const pts = of.map((c) => c.pseudotime).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const mi = GENE_NAMES.indexOf(MARKER[fate]);
    const share = of.length / n;
    const nShare = normal ? normal.filter((c) => c.fate === fate).length / Math.max(1, normal.length) : null;
    return {
      fate,
      count: of.length,
      share,
      deltaPoints: nShare === null ? null : Math.round((share - nShare) * 1000) / 10,
      medianPseudotime: quantile(pts, 0.5),
      branchPoint: fate === "stem" ? null : of.length >= 10 ? quantile(pts, 0.05) : null,
      markerMean: of.length ? of.reduce((s, c) => s + c.expr[mi], 0) / of.length : 0,
    };
  });
}

/** Mean expression of a gene in each fate, along inferred pseudotime (bins of 0.05). */
export function expressionAlongPseudotime(cells: Cell[], gene: GeneName, bins = 20): { fate: Fate; points: { x: number; y: number; n: number }[] }[] {
  const gi = GENE_NAMES.indexOf(gene);
  return FATES.map((fate) => {
    const sums = new Array(bins).fill(0);
    const counts = new Array(bins).fill(0);
    for (const c of cells) {
      if (c.fate !== fate || c.pseudotime === null) continue;
      const b = Math.min(bins - 1, Math.floor(c.pseudotime * bins));
      sums[b] += c.expr[gi];
      counts[b]++;
    }
    const points: { x: number; y: number; n: number }[] = [];
    for (let b = 0; b < bins; b++) {
      // fewer than 5 cells in a bin: not enough data to show a mean
      if (counts[b] >= 5) points.push({ x: Math.round(((b + 0.5) / bins) * 1000) / 1000, y: sums[b] / counts[b], n: counts[b] });
    }
    return { fate, points };
  }).filter((s) => s.points.length > 0);
}

/** Spearman rank correlation between true age and inferred pseudotime. */
export function ageAgreement(cells: Cell[]): number | null {
  const pts = cells.filter((c) => c.pseudotime !== null);
  if (pts.length < 20) return null;
  const rank = (a: number[]) => {
    const idx = a.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(a.length);
    let k = 0;
    while (k < idx.length) {
      let j = k;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[k][0]) j++;
      for (let m = k; m <= j; m++) r[idx[m][1]] = (k + j) / 2;
      k = j + 1;
    }
    return r;
  };
  const ra = rank(pts.map((c) => c.age));
  const rp = rank(pts.map((c) => c.pseudotime as number));
  const mean = (pts.length - 1) / 2;
  let num = 0;
  let da = 0;
  let dp = 0;
  for (let i = 0; i < pts.length; i++) {
    num += (ra[i] - mean) * (rp[i] - mean);
    da += (ra[i] - mean) ** 2;
    dp += (rp[i] - mean) ** 2;
  }
  return da > 0 && dp > 0 ? num / Math.sqrt(da * dp) : null;
}

/** Order in which branches start, earliest first (only branches with enough cells). */
export function branchOrder(stats: FateStat[]): FateStat[] {
  return stats.filter((s) => s.fate !== "stem" && s.branchPoint !== null).sort((a, b) => (a.branchPoint as number) - (b.branchPoint as number));
}

export function depthsVsNormal(t: Terrain, normal: Terrain): Record<Lineage, number> {
  return relativeDepths(t, normal);
}

/** Cells visible at a pseudotime cursor (cells the scrubber has reached). */
export function visibleAt(pop: Population, cursor: number): Cell[] {
  return pop.cells.filter((c) => c.pseudotime !== null && c.pseudotime <= cursor + 1e-9);
}

export function regionName(x: number, y: number): string {
  const r = Math.hypot(x, y);
  if (r < 2) return "on the summit";
  // map y points up
  const ang = (Math.atan2(y, x) * 180) / Math.PI;
  const dirs = ["right", "upper right", "top", "upper left", "left", "lower left", "bottom", "lower right"];
  const k = Math.round(((ang + 360) % 360) / 45) % 8;
  return `${r < 5 ? "partway down, " : "far out, "}${dirs[k]}`;
}
