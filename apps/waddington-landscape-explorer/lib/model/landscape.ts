// The Waddington landscape as a height map U(x, y): a hill in the middle
// (undecided stem cells), four valleys running out from it (the fates), and a
// rim that keeps cells on the map. Cells roll downhill: their drift is −∇U.
//
// Gene levels change the terrain with simple, stated rules (see GENE_INFO).
// It is a teaching model: the rules are chosen to match well-known effects,
// not fitted to data.

import type { GeneName, Lineage, ModelParams } from "./params";

export const EXTENT = 10; // the map runs from −10 to 10 on both axes
export const COMMIT_RADIUS = 3; // beyond this, a cell has left the summit

export interface Valley {
  fate: Lineage;
  /** Direction from the summit, in radians (0 = right, positive = up on the map). */
  angle: number;
  /** Depth multiplier (0 = no valley). */
  depth: number;
  /** Angular half-width in radians: deeper valleys also catch cells from a wider area. */
  width: number;
}

/** Base directions. Neuron and glia sit side by side (the neural side); muscle and blood on the other (mesoderm). */
export const VALLEY_ANGLES: Record<Lineage, number> = {
  neuron: -0.3 * Math.PI,
  glia: -0.7 * Math.PI,
  muscle: 0.35 * Math.PI,
  blood: 0.75 * Math.PI,
};

const BASE_DEPTH = 2.2;
/** Depth of the stem-cell hollow at a normal Sox2 level. */
export let SUMMIT_HOLLOW = 0.3;
export function _tune(v: { hollow?: number }) {
  if (v.hollow !== undefined) SUMMIT_HOLLOW = v.hollow;
}
const VALLEY_WIDTH = 0.7; // radians at normal depth: narrow enough to leave a ridge between neighbouring valleys
/** Width grows gently with depth (a stronger driver enlarges its basin of attraction). */
function widthFor(depth: number) {
  return VALLEY_WIDTH * Math.min(1.3, Math.max(0.75, 0.7 + 0.3 * (depth / BASE_DEPTH)));
}
const HILL_HEIGHT = 4;
const HILL_SPREAD = 3.2;

/** 0 → 0, 0.5 → 1, 1 → 2: how strongly a gene level scales its valley. */
const gain = (g: number) => 2 * g;

export interface Terrain {
  valleys: Valley[];
  /** Depth of the hollow at the summit that holds stem cells. */
  summitHollow: number;
  /** Tilt towards the mesoderm side (positive map y). */
  tilt: number;
}

export function terrainFor(p: ModelParams): Terrain {
  const g = p.genes;
  const neuron = gain(g.Neurog2) * Math.max(0, 1 - 0.8 * (g.Notch1 - 0.5)) * (1 - 0.3 * (g.Olig2 - 0.5));
  const glia = gain(g.Olig2) * (1 + 0.6 * (g.Notch1 - 0.5)) * (1 + 0.8 * (g.Shh - 0.5)) * (1 - 0.3 * (g.Neurog2 - 0.5));
  const muscle = gain(g.MyoD);
  const blood = gain(g.Gata1);
  return {
    valleys: (
      [
        ["neuron", neuron],
        ["glia", glia],
        ["muscle", muscle],
        ["blood", blood],
      ] as const
    ).map(([fate, k]) => ({ fate, angle: VALLEY_ANGLES[fate], depth: BASE_DEPTH * k, width: widthFor(BASE_DEPTH * k) })),
    summitHollow: SUMMIT_HOLLOW * gain(g.Sox2),
    tilt: 1.6 * (g.Wnt3a - 0.5),
  };
}

function angleDiff(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Radial shape of a valley: starts below the summit and deepens out to the rim. */
function ramp(r: number) {
  const s = Math.min(1, Math.max(0, (r - 1.2) / 4.5));
  return s * s * (3 - 2 * s);
}

/** Height of the landscape at (x, y). */
export function height(t: Terrain, x: number, y: number): number {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);
  const th = Math.atan2(y, x);
  let h = HILL_HEIGHT * Math.exp(-r2 / (2 * HILL_SPREAD * HILL_SPREAD));
  h -= t.summitHollow * Math.exp(-r2 / (2 * 0.9 * 0.9));
  const rr = ramp(r);
  for (const v of t.valleys) {
    if (v.depth <= 0) continue;
    const d = angleDiff(th, v.angle);
    h -= v.depth * rr * Math.exp(-(d * d) / (v.width * v.width));
  }
  h -= t.tilt * (y / EXTENT) * Math.min(1, r / 3);
  if (r > 8) h += 0.25 * (r - 8) * (r - 8);
  return h;
}

/** Downhill direction (−∇U) by central differences. Slow; kept to check `downhill`. */
export function downhillNumeric(t: Terrain, x: number, y: number): [number, number] {
  const e = 1e-4;
  const gx = (height(t, x + e, y) - height(t, x - e, y)) / (2 * e);
  const gy = (height(t, x, y + e) - height(t, x, y - e)) / (2 * e);
  return [-gx, -gy];
}

/** Downhill direction (−∇U), computed exactly from the terms of `height`. */
export function downhill(t: Terrain, x: number, y: number): [number, number] {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2) || 1e-9;
  let gx = 0;
  let gy = 0;
  // hill
  const hill = HILL_HEIGHT * Math.exp(-r2 / (2 * HILL_SPREAD * HILL_SPREAD));
  gx += (-x / (HILL_SPREAD * HILL_SPREAD)) * hill;
  gy += (-y / (HILL_SPREAD * HILL_SPREAD)) * hill;
  // stem-cell hollow
  const hollow = t.summitHollow * Math.exp(-r2 / (2 * 0.81));
  gx += (x / 0.81) * hollow;
  gy += (y / 0.81) * hollow;
  // valleys
  const s = Math.min(1, Math.max(0, (r - 1.2) / 4.5));
  const R = s * s * (3 - 2 * s);
  const dR = s > 0 && s < 1 ? (6 * s * (1 - s)) / 4.5 : 0;
  if (R > 0 || dR > 0) {
    const th = Math.atan2(y, x);
    for (const v of t.valleys) {
      if (v.depth <= 0) continue;
      const W2 = v.width * v.width;
      const d = angleDiff(th, v.angle);
      const G = Math.exp(-(d * d) / W2);
      const dG = ((-2 * d) / W2) * G; // dG/dθ
      // U_v = −D·R(r)·G(θ)
      const dUdr = -v.depth * dR * G;
      const dUdth = -v.depth * R * dG;
      gx += dUdr * (x / r) + dUdth * (-y / r2);
      gy += dUdr * (y / r) + dUdth * (x / r2);
    }
  }
  // tilt: −T·(y/E)·min(1, r/3)
  if (t.tilt !== 0) {
    if (r < 3) {
      gx += (-t.tilt * y * x) / (3 * EXTENT * r);
      gy += (-t.tilt * (r + (y * y) / r)) / (3 * EXTENT);
    } else {
      gy += -t.tilt / EXTENT;
    }
  }
  // rim
  if (r > 8) {
    const w = 0.5 * (r - 8);
    gx += (w * x) / r;
    gy += (w * y) / r;
  }
  return [-gx, -gy];
}

/**
 * Which valley a point belongs to: the valley carving deepest there.
 * Inside COMMIT_RADIUS a cell counts as undecided (stem).
 */
export function basinAt(t: Terrain, x: number, y: number): Lineage | null {
  const th = Math.atan2(y, x);
  let best: Lineage | null = null;
  let bestV = 0.05;
  for (const v of t.valleys) {
    const d = angleDiff(th, v.angle);
    const pull = v.depth * Math.exp(-(d * d) / (v.width * v.width));
    if (pull > bestV) {
      bestV = pull;
      best = v.fate;
    }
  }
  return best;
}

/** Valley depth relative to normal (1 = normal, 0 = gone, 2 = twice as deep). */
export function relativeDepths(t: Terrain, normal: Terrain): Record<Lineage, number> {
  const out = {} as Record<Lineage, number>;
  for (const v of t.valleys) {
    const n = normal.valleys.find((x) => x.fate === v.fate)!;
    out[v.fate] = n.depth > 0 ? v.depth / n.depth : 0;
  }
  return out;
}

/** Height map sampled on a grid, for the 3D view and contour lines. */
export function sampleGrid(t: Terrain, n: number): { heights: Float32Array; min: number; max: number } {
  const heights = new Float32Array(n * n);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -EXTENT + (2 * EXTENT * i) / (n - 1);
      const y = -EXTENT + (2 * EXTENT * j) / (n - 1);
      const h = height(t, x, y);
      heights[j * n + i] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  return { heights, min, max };
}

export type { GeneName };
