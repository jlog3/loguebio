// Condensate Lab simulation engine.
//
// A 2D Brownian-dynamics model (overdamped Langevin): every molecule is a bead
// that gets random thermal kicks and feels short-range forces from its
// neighbours. Proteins attract proteins; RNA attracts protein but barely RNA.
// Above a threshold of stickiness and concentration, the beads gather into
// droplets (a dense phase) that coexist with a dilute phase.
//
// What it leaves out (also shown in the app): it is 2D, molecules are single
// beads rather than chains, there is no water flow (hydrodynamics), no charges
// or specific binding sites, and all units are arbitrary. "Hardening" in
// disease mode is a probability rule, not a molecular mechanism.

import { effectiveChi, type SimParams } from "./params";
import { makeRng, type Rng } from "./rng";

export const WORLD_W = 420;
export const WORLD_H = 280;
/** Bead diameter. */
export const SIGMA = 10;
/**
 * Model constants. Tuned so that at the default mix droplets appear between
 * χ ≈ 1 and 2, dissolve above a temperature of about 2 (at χ = 3), and stay
 * liquid inside (bleached spots recover). A soft, longer-range attraction keeps
 * droplets round and liquid; short, hard attraction made frozen, stringy clumps.
 */
export const TUNE = {
  /** Attraction reaches this far (centre to centre), in bead diameters. */
  rCut: 3,
  /** Stiffness of the soft core: low enough that beads can squeeze past each other. */
  kRepel: 8,
  /** Scales slider stickiness to bead attraction. */
  epsScale: 0.04,
};
let R_CUT = TUNE.rCut * SIGMA;
/** Beads closer than this belong to the same cluster. */
export const CLUSTER_R = 1.4 * SIGMA;
/** A cluster needs this many molecules to count as a droplet. */
export const MIN_DROPLET = 8;
/** Time step, in the arbitrary time units shown in the interface. */
export const DT = 0.2;
/** Movement of solid (aggregated) molecules relative to liquid ones. */
const SOLID_MOBILITY = 0.002;

export const KIND_PROTEIN = 0;
export const KIND_RNA = 1;

/** Attraction between kinds, relative to protein-protein. */
const PAIR = [
  [1.0, 0.75],
  [0.75, 0.12],
];

export interface World {
  n: number;
  x: Float64Array;
  y: Float64Array;
  kind: Uint8Array;
  solid: Uint8Array;
  bleached: Uint8Array;
  /** Index into the latest cluster list, or -1 when not in a droplet. */
  cluster: Int32Array;
  time: number;
  steps: number;
  rng: Rng;
  // scratch
  fx: Float64Array;
  fy: Float64Array;
  cellHead: Int32Array;
  cellNext: Int32Array;
  cols: number;
  rows: number;
}

export function createWorld(p: SimParams): World {
  R_CUT = TUNE.rCut * SIGMA;
  const rng = makeRng(p.seed);
  const nP = Math.round(p.proteinCount);
  const nR = p.multiComponent ? Math.round(p.rnaCount) : 0;
  const n = nP + nR;
  const cols = Math.floor(WORLD_W / R_CUT);
  const rows = Math.floor(WORLD_H / R_CUT);
  const w: World = {
    n,
    x: new Float64Array(n),
    y: new Float64Array(n),
    kind: new Uint8Array(n),
    solid: new Uint8Array(n),
    bleached: new Uint8Array(n),
    cluster: new Int32Array(n).fill(-1),
    time: 0,
    steps: 0,
    rng,
    fx: new Float64Array(n),
    fy: new Float64Array(n),
    cellHead: new Int32Array(cols * rows),
    cellNext: new Int32Array(n),
    cols,
    rows,
  };
  const m = SIGMA;
  for (let i = 0; i < n; i++) {
    w.kind[i] = i < nP ? KIND_PROTEIN : KIND_RNA;
    w.x[i] = m + rng() * (WORLD_W - 2 * m);
    w.y[i] = m + rng() * (WORLD_H - 2 * m);
  }
  return w;
}

function buildGrid(w: World) {
  const { cols, rows } = w;
  w.cellHead.fill(-1);
  const cw = WORLD_W / cols;
  const ch = WORLD_H / rows;
  for (let i = 0; i < w.n; i++) {
    let cx = Math.floor(w.x[i] / cw);
    let cy = Math.floor(w.y[i] / ch);
    if (cx >= cols) cx = cols - 1;
    if (cy >= rows) cy = rows - 1;
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    const c = cy * cols + cx;
    w.cellNext[i] = w.cellHead[c];
    w.cellHead[c] = i;
  }
}

/** Calls fn(i, j) once for every pair closer than `range` (range must be ≤ R_CUT). */
function forEachPair(w: World, range: number, fn: (i: number, j: number, dx: number, dy: number, r: number) => void) {
  const { cols, rows, cellHead, cellNext, x, y } = w;
  const r2max = range * range;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const c = cy * cols + cx;
      for (let i = cellHead[c]; i !== -1; i = cellNext[i]) {
        // same cell: j after i in the list; neighbour cells: half of the 8
        for (let j = cellNext[i]; j !== -1; j = cellNext[j]) {
          const dx = x[j] - x[i];
          const dy = y[j] - y[i];
          const r2 = dx * dx + dy * dy;
          if (r2 < r2max && r2 > 1e-12) fn(i, j, dx, dy, Math.sqrt(r2));
        }
        for (let k = 0; k < 4; k++) {
          const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : k === 2 ? 0 : 1);
          const ny = cy + (k === 0 ? 0 : 1);
          if (nx < 0 || nx >= cols || ny >= rows) continue;
          for (let j = cellHead[ny * cols + nx]; j !== -1; j = cellNext[j]) {
            const dx = x[j] - x[i];
            const dy = y[j] - y[i];
            const r2 = dx * dx + dy * dy;
            if (r2 < r2max && r2 > 1e-12) fn(i, j, dx, dy, Math.sqrt(r2));
          }
        }
      }
    }
  }
}

/** Gaussian random number (Box–Muller). */
function gauss(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Advances the world by `count` time steps. */
export function step(w: World, p: SimParams, count = 1) {
  const chiEff = effectiveChi(p);
  const T = p.temperature;
  const eps = TUNE.epsScale * chiEff;
  const noise = Math.sqrt(2 * T * DT);
  const { x, y, fx, fy, kind, solid } = w;
  for (let s = 0; s < count; s++) {
    buildGrid(w);
    fx.fill(0);
    fy.fill(0);
    forEachPair(w, R_CUT, (i, j, dx, dy, r) => {
      let f: number; // positive pushes apart
      if (r < SIGMA) {
        f = (TUNE.kRepel * (SIGMA - r)) / SIGMA;
      } else {
        let e = eps * PAIR[kind[i]][kind[j]];
        if (solid[i] && solid[j]) e *= 2.5;
        f = -e * Math.sin((Math.PI * (r - SIGMA)) / (R_CUT - SIGMA));
      }
      const ux = dx / r;
      const uy = dy / r;
      fx[i] -= f * ux;
      fy[i] -= f * uy;
      fx[j] += f * ux;
      fy[j] += f * uy;
    });
    const half = SIGMA / 2;
    for (let i = 0; i < w.n; i++) {
      const mob = solid[i] ? SOLID_MOBILITY : 1;
      let nx = x[i] + mob * fx[i] * DT + Math.sqrt(mob) * noise * gauss(w.rng);
      let ny = y[i] + mob * fy[i] * DT + Math.sqrt(mob) * noise * gauss(w.rng);
      // reflecting walls
      if (nx < half) nx = 2 * half - nx;
      if (nx > WORLD_W - half) nx = 2 * (WORLD_W - half) - nx;
      if (ny < half) ny = 2 * half - ny;
      if (ny > WORLD_H - half) ny = 2 * (WORLD_H - half) - ny;
      x[i] = Math.min(WORLD_W - half, Math.max(half, nx));
      y[i] = Math.min(WORLD_H - half, Math.max(half, ny));
    }
    w.time += DT;
    w.steps++;
  }
}

// ─── Clusters ────────────────────────────────────────────────────────────────

export interface RawCluster {
  members: number[];
  protein: number;
  rna: number;
  solid: number;
  cx: number;
  cy: number;
  /** Radius of a circle holding the members (from their spread). */
  radius: number;
}

/** Groups touching molecules; returns clusters big enough to be droplets, largest first. */
export function findClusters(w: World): RawCluster[] {
  buildGrid(w);
  const parent = new Int32Array(w.n);
  for (let i = 0; i < w.n; i++) parent[i] = i;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  forEachPair(w, CLUSTER_R, (i, j) => {
    // RNA-RNA contacts alone don't make a cluster (RNA is a client)
    if (w.kind[i] === KIND_RNA && w.kind[j] === KIND_RNA) return;
    const a = find(i);
    const b = find(j);
    if (a !== b) parent[a] = b;
  });
  const groups = new Map<number, number[]>();
  for (let i = 0; i < w.n; i++) {
    const r = find(i);
    let g = groups.get(r);
    if (!g) groups.set(r, (g = []));
    g.push(i);
  }
  const out: RawCluster[] = [];
  for (const members of groups.values()) {
    let protein = 0;
    for (const m of members) if (w.kind[m] === KIND_PROTEIN) protein++;
    if (members.length < MIN_DROPLET || protein < MIN_DROPLET / 2) continue;
    let sx = 0;
    let sy = 0;
    let solid = 0;
    for (const m of members) {
      sx += w.x[m];
      sy += w.y[m];
      if (w.solid[m]) solid++;
    }
    const cx = sx / members.length;
    const cy = sy / members.length;
    // 90th-percentile distance, so one stray molecule at the edge doesn't balloon the outline
    const dists = members.map((m) => Math.hypot(w.x[m] - cx, w.y[m] - cy)).sort((a, b) => a - b);
    const maxR = dists[Math.min(dists.length - 1, Math.floor(0.9 * dists.length))];
    out.push({
      members,
      protein,
      rna: members.length - protein,
      solid,
      cx,
      cy,
      radius: maxR + SIGMA / 2,
    });
  }
  out.sort((a, b) => b.members.length - a.members.length);
  w.cluster.fill(-1);
  out.forEach((c, k) => {
    for (const m of c.members) w.cluster[m] = k;
  });
  return out;
}

/**
 * Disease mode: each molecule in a droplet of at least 8 molecules may turn solid.
 * Hardening starts at contacts with solid neighbours or at random seeds, so a
 * droplet hardens progressively. Solid molecules stay solid even if disease
 * mode is turned off (as real aggregates do); Reset clears them.
 */
export function harden(w: World, p: SimParams, clusters: RawCluster[], dtElapsed: number) {
  if (!p.diseaseMode) return;
  const seedRate = 0.004 * p.aggregationRate;
  const spreadRate = 0.25 * p.aggregationRate;
  for (const c of clusters) {
    if (c.members.length < 8) continue;
    const sizeFactor = Math.min(3, c.members.length / 20);
    if (c.solid === 0) {
      if (w.rng() < 1 - Math.exp(-seedRate * sizeFactor * dtElapsed)) {
        const m = c.members[Math.floor(w.rng() * c.members.length)];
        if (w.kind[m] === KIND_PROTEIN) w.solid[m] = 1;
      }
      continue;
    }
    // spread: a liquid protein next to a solid one hardens
    const pSpread = 1 - Math.exp(-spreadRate * dtElapsed);
    for (const m of c.members) {
      if (w.solid[m] || w.kind[m] !== KIND_PROTEIN) continue;
      for (const o of c.members) {
        if (!w.solid[o]) continue;
        const d2 = (w.x[m] - w.x[o]) ** 2 + (w.y[m] - w.y[o]) ** 2;
        if (d2 < CLUSTER_R * CLUSTER_R) {
          if (w.rng() < pSpread) w.solid[m] = 1;
          break;
        }
      }
    }
  }
}

/**
 * Bleaches every protein within `radius` of (cx, cy); returns how many.
 * As in a lab, only one kind of molecule carries the glowing label: here the protein.
 */
export function bleach(w: World, cx: number, cy: number, radius: number): number {
  let k = 0;
  for (let i = 0; i < w.n; i++) {
    if (w.kind[i] !== KIND_PROTEIN) continue;
    if ((w.x[i] - cx) ** 2 + (w.y[i] - cy) ** 2 <= radius * radius) {
      w.bleached[i] = 1;
      k++;
    }
  }
  return k;
}

/** Share of the proteins inside the circle that still glow, or null if there are none. */
export function brightFraction(w: World, cx: number, cy: number, radius: number): number | null {
  let total = 0;
  let bright = 0;
  for (let i = 0; i < w.n; i++) {
    if (w.kind[i] !== KIND_PROTEIN) continue;
    if ((w.x[i] - cx) ** 2 + (w.y[i] - cy) ** 2 <= radius * radius) {
      total++;
      if (!w.bleached[i]) bright++;
    }
  }
  return total === 0 ? null : bright / total;
}

export function proteinCount(w: World): number {
  let k = 0;
  for (let i = 0; i < w.n; i++) if (w.kind[i] === KIND_PROTEIN) k++;
  return k;
}

/** Protein area fraction (φ) of the whole box: the concentration used by the theory panel. */
export function proteinAreaFraction(p: SimParams): number {
  const a = Math.PI * (SIGMA / 2) ** 2;
  return (p.proteinCount * a) / (WORLD_W * WORLD_H);
}
