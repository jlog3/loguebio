// Cells as marbles. Each cell starts on the summit and rolls for a while
// (its age): drift downhill plus random kicks (overdamped Langevin dynamics).
// A snapshot of many cells of different ages is what a single-cell experiment
// sees: some still on top, some on the way down, some at the end of a valley.
//
// Each cell has its own random stream (seed + cell number), so changing a
// gene moves the same cells under the same kicks: before/after differences
// come from the change, not from new random numbers.

import { basinAt, COMMIT_RADIUS, downhill, EXTENT, terrainFor, type Terrain } from "./landscape";
import { GENE_NAMES, type Fate, type GeneName, type Lineage, type ModelParams } from "./params";
import { gauss, makeRng, type Rng } from "./rng";

export const STEPS = 420; // steps for the oldest cell
const DT = 0.032;
const BASE_DIFFUSION = 0.06;
export const MARBLE_COUNT = 36;
const MARBLE_EVERY = 4;

export interface Cell {
  id: number;
  /** Position on the state map (the landscape seen from above). */
  x: number;
  y: number;
  /** True age, 0–1. Known only because this is a simulation; real experiments cannot measure it. */
  age: number;
  fate: Fate;
  /** Age at which it left the summit (null if it hasn't). */
  committedAt: number | null;
  /** Expression of each gene, 0–1, in GENE_NAMES order. */
  expr: number[];
  /** True downhill drift where the cell is (what RNA velocity tries to estimate). */
  vx: number;
  vy: number;
  /** Estimated velocity: the true drift plus measurement noise, as RNA velocity would report it. */
  evx: number;
  evy: number;
  /** Pseudotime inferred from expression alone (0 = root). Null if the cell could not be reached. */
  pseudotime: number | null;
}

export interface Marble {
  fate: Fate;
  /** Path as [x, y] pairs from age 0 to 1, evenly spaced in time. */
  path: Float32Array;
}

export interface Population {
  terrain: Terrain;
  cells: Cell[];
  marbles: Marble[];
  rootId: number;
  /** Cells the pseudotime graph could not reach. */
  unreached: number;
}

function hashSeed(seed: number, i: number): number {
  let h = (seed * 0x9e3779b1) ^ (i * 0x85ebca77);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

function roll(t: Terrain, rng: Rng, steps: number, noise: number, onStep?: (k: number, x: number, y: number) => void) {
  let x = 0.35 * gauss(rng);
  let y = 0.35 * gauss(rng);
  const kick = Math.sqrt(2 * BASE_DIFFUSION * noise * DT);
  let committedStep: number | null = null;
  for (let k = 0; k < steps; k++) {
    const [dx, dy] = downhill(t, x, y);
    x += dx * DT + kick * gauss(rng);
    y += dy * DT + kick * gauss(rng);
    const lim = EXTENT - 0.2;
    if (x > lim) x = lim;
    if (x < -lim) x = -lim;
    if (y > lim) y = lim;
    if (y < -lim) y = -lim;
    if (committedStep === null && x * x + y * y > COMMIT_RADIUS * COMMIT_RADIUS) committedStep = k;
    if (onStep) onStep(k, x, y);
  }
  return { x, y, committedStep };
}

const smooth = (a: number, b: number, v: number) => {
  const s = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return s * s * (3 - 2 * s);
};

/** Soft membership of a point in each valley (sums to ≤ 1). */
function memberships(t: Terrain, x: number, y: number): Record<Lineage, number> {
  const th = Math.atan2(y, x);
  const raw = {} as Record<Lineage, number>;
  let sum = 0;
  for (const v of t.valleys) {
    const d = Math.atan2(Math.sin(th - v.angle), Math.cos(th - v.angle));
    const w = v.depth * Math.exp(-(d * d) / (v.width * v.width));
    raw[v.fate] = w;
    sum += w;
  }
  for (const k of Object.keys(raw) as Lineage[]) raw[k] = sum > 0 ? raw[k] / sum : 0;
  return raw;
}

/** Gene expression for a cell at (x, y), from the gene levels and where it is. */
function expression(p: ModelParams, t: Terrain, x: number, y: number, rng: Rng): number[] {
  const g = p.genes;
  const r2 = x * x + y * y;
  const progress = smooth(2, 7, Math.sqrt(r2));
  const m = memberships(t, x, y);
  const k = 1.8; // a normal level (0.5) gives 0.9 at full strength
  const vals: Record<GeneName, number> = {
    Sox2: k * g.Sox2 * Math.exp(-r2 / (2 * 2.4 * 2.4)),
    Neurog2: k * g.Neurog2 * m.neuron * progress,
    Olig2: k * g.Olig2 * m.glia * progress,
    MyoD: k * g.MyoD * m.muscle * progress,
    Gata1: k * g.Gata1 * m.blood * progress,
    Notch1: k * g.Notch1 * (0.15 + 0.45 * Math.exp(-r2 / 18) + 0.45 * m.glia * progress),
    Wnt3a: k * g.Wnt3a * (0.3 + 0.55 * (m.muscle + m.blood) * progress),
    Shh: k * g.Shh * (0.3 + 0.55 * (m.neuron + m.glia) * progress),
  };
  return GENE_NAMES.map((n) => {
    const v = vals[n] + 0.035 * gauss(rng);
    return Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  });
}

/** Simulates a population for the given settings. Deterministic for a given seed. */
export function simulate(p: ModelParams): Population {
  const terrain = terrainFor(p);
  const cells: Cell[] = [];
  for (let i = 0; i < p.cellCount; i++) {
    const rng = makeRng(hashSeed(p.seed, i));
    const age = rng();
    const steps = Math.round(age * STEPS);
    const { x, y, committedStep } = roll(terrain, rng, steps, p.noise);
    const r = Math.hypot(x, y);
    const basin = r > COMMIT_RADIUS ? basinAt(terrain, x, y) : null;
    const fate: Fate = basin ?? "stem";
    const [vx, vy] = downhill(terrain, x, y);
    const speed = Math.hypot(vx, vy);
    const err = 0.35 * speed + 0.05;
    cells.push({
      id: i + 1,
      x,
      y,
      age: Math.round(age * 1000) / 1000,
      fate,
      committedAt: committedStep === null ? null : Math.round((committedStep / STEPS) * 1000) / 1000,
      expr: expression(p, terrain, x, y, rng),
      vx,
      vy,
      evx: vx + err * gauss(rng),
      evy: vy + err * gauss(rng),
      pseudotime: null,
    });
  }
  const marbles: Marble[] = [];
  for (let i = 0; i < MARBLE_COUNT; i++) {
    const rng = makeRng(hashSeed(p.seed + 7919, i));
    const path = new Float32Array(2 * (STEPS / MARBLE_EVERY + 1));
    path[0] = 0;
    path[1] = 0;
    const end = roll(terrain, rng, STEPS, p.noise, (k, x, y) => {
      if ((k + 1) % MARBLE_EVERY === 0) {
        const j = (k + 1) / MARBLE_EVERY;
        path[2 * j] = x;
        path[2 * j + 1] = y;
      }
    });
    const r = Math.hypot(end.x, end.y);
    marbles.push({ fate: (r > COMMIT_RADIUS ? basinAt(terrain, end.x, end.y) : null) ?? "stem", path });
  }
  const { rootId, unreached } = inferPseudotime(cells);
  return { terrain, cells, marbles, rootId, unreached };
}

/** Position of a marble at age a (0–1). */
export function marbleAt(m: Marble, a: number): [number, number] {
  const n = m.path.length / 2 - 1;
  const f = Math.min(1, Math.max(0, a)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  return [m.path[2 * i] * (1 - u) + m.path[2 * i + 2] * u, m.path[2 * i + 1] * (1 - u) + m.path[2 * i + 3] * u];
}

// ─── Pseudotime ──────────────────────────────────────────────────────────────

/**
 * Infers pseudotime the way trajectory tools do, from expression alone:
 * connect each cell to its 12 most similar cells, start from the cell with
 * the most Sox2 (the root), and measure the shortest path along that graph.
 * Writes cell.pseudotime (0–1). The model's true ages are not used.
 */
export function inferPseudotime(cells: Cell[], k = 12): { rootId: number; unreached: number } {
  const n = cells.length;
  if (n === 0) return { rootId: 0, unreached: 0 };
  const dims = GENE_NAMES.length;
  const X = new Float32Array(n * dims);
  cells.forEach((c, i) => c.expr.forEach((v, d) => (X[i * dims + d] = v)));
  // k nearest neighbours (brute force; n ≤ a few thousand)
  const nbr = new Int32Array(n * k);
  const nd = new Float32Array(n * k);
  const bestD = new Float32Array(k);
  const bestI = new Int32Array(k);
  for (let i = 0; i < n; i++) {
    bestD.fill(Infinity);
    bestI.fill(-1);
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      let s = 0;
      for (let d = 0; d < dims; d++) {
        const q = X[i * dims + d] - X[j * dims + d];
        s += q * q;
      }
      if (s < bestD[k - 1]) {
        let m = k - 1;
        while (m > 0 && bestD[m - 1] > s) {
          bestD[m] = bestD[m - 1];
          bestI[m] = bestI[m - 1];
          m--;
        }
        bestD[m] = s;
        bestI[m] = j;
      }
    }
    for (let m = 0; m < k; m++) {
      nbr[i * k + m] = bestI[m];
      nd[i * k + m] = Math.sqrt(bestD[m]);
    }
  }
  // symmetric adjacency
  const adj: { j: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let m = 0; m < k; m++) {
      const j = nbr[i * k + m];
      if (j < 0) continue;
      adj[i].push({ j, w: nd[i * k + m] });
      adj[j].push({ j: i, w: nd[i * k + m] });
    }
  }
  // root: the least differentiated cell (most Sox2, least of the four fate genes).
  // Real tools ask the researcher to choose it; this is the usual choice.
  const score = (c: Cell) => c.expr[0] - (c.expr[1] + c.expr[2] + c.expr[3] + c.expr[4]);
  let root = 0;
  for (let i = 1; i < n; i++) if (score(cells[i]) > score(cells[root])) root = i;
  // Dijkstra with a binary heap
  const dist = new Float64Array(n).fill(Infinity);
  dist[root] = 0;
  const heap: [number, number][] = [[0, root]];
  const push = (d: number, i: number) => {
    heap.push([d, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const pr = (c - 1) >> 1;
      if (heap[pr][0] <= heap[c][0]) break;
      [heap[pr], heap[c]] = [heap[c], heap[pr]];
      c = pr;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = 2 * c + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    for (const e of adj[i]) {
      const nd2 = d + e.w;
      if (nd2 < dist[e.j]) {
        dist[e.j] = nd2;
        push(nd2, e.j);
      }
    }
  }
  // normalise by the 99th percentile so a few outliers don't squash the scale
  const finite = Array.from(dist).filter(Number.isFinite).sort((a, b) => a - b);
  const top = finite[Math.floor(0.99 * (finite.length - 1))] || 1;
  let unreached = 0;
  cells.forEach((c, i) => {
    if (!Number.isFinite(dist[i])) {
      c.pseudotime = null;
      unreached++;
    } else c.pseudotime = Math.round(Math.min(1, dist[i] / top) * 1000) / 1000;
  });
  return { rootId: cells[root].id, unreached };
}
