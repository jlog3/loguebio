// The single state model. The canvas, text summary, tables, charts, sounds
// and announcements all read from here; every control writes to here.

import {
  bleach,
  brightFraction,
  createWorld,
  DT,
  findClusters,
  harden,
  KIND_PROTEIN,
  proteinCount,
  SIGMA,
  step,
  WORLD_H,
  WORLD_W,
  type World,
} from "./sim/engine";
import { fitRecovery, parseFrapCsv, type FitResult, type FrapPoint } from "./sim/frap";
import { clampParam, DEFAULT_PARAMS, sanitizeParams, specFor, type NumericKey, type SimParams } from "./sim/params";
import { makeRng } from "./sim/rng";

export type DropletState = "liquid" | "hardening" | "solid";

export interface Droplet {
  id: number;
  size: number;
  protein: number;
  rna: number;
  solid: number;
  solidFraction: number;
  state: DropletState;
  cx: number;
  cy: number;
  radius: number;
  region: string;
}

export interface HistoryPoint {
  t: number;
  /** Share of protein inside droplets (0–1). */
  fraction: number;
  count: number;
  /** Share of protein that is solid (0–1). */
  solidFraction: number;
  largest: number;
}

export type EventKind = "formed" | "merged" | "dissolved" | "solidified" | "info";

export interface LabEvent {
  id: number;
  t: number;
  kind: EventKind;
  text: string;
}

export interface FrapRun {
  id: number;
  dropletId: number;
  /** State of the droplet when it was bleached. */
  stateAtBleach: DropletState;
  solidAtBleach: number;
  startT: number;
  cx: number;
  cy: number;
  radius: number;
  bleachedCount: number;
  points: FrapPoint[];
  status: "recording" | "ended";
  endReason: string | null;
  fit: FitResult | null;
}

export type ScanKey = "chi" | "proteinCount" | "temperature";

export interface ScanPoint {
  value: number;
  /** Mean share of protein in droplets. */
  fraction: number;
  min: number;
  max: number;
}

export interface Scan {
  key: ScanKey;
  status: "running" | "done" | "cancelled";
  points: ScanPoint[];
  total: number;
  /** Settings the scan was run with (all except the scanned one). */
  base: SimParams;
}

export interface ImportedFrap {
  name: string;
  points: FrapPoint[];
  notes: string[];
  fit: FitResult;
}

export type Phase = "mixed" | "borderline" | "separated";
export type Trend = "rising" | "falling" | "steady" | "unknown";

export interface Summary {
  fraction: number;
  count: number;
  solidFraction: number;
  largest: number;
  phase: Phase;
  trend: Trend;
  rnaInDroplets: number;
  rnaTotal: number;
}

export interface Snapshot {
  params: SimParams;
  running: boolean;
  speed: number;
  time: number;
  droplets: Droplet[];
  summary: Summary;
  history: HistoryPoint[];
  events: LabEvent[];
  selectedId: number | null;
  frap: FrapRun | null;
  frapRuns: FrapRun[];
  scan: Scan | null;
  imported: ImportedFrap | null;
  /** Increases on every reset, so views can tell a new run from a continued one. */
  runId: number;
}

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
const STEPS_PER_FRAME = 8;
const ANALYSE_EVERY = 5; // steps
const ESTABLISHED_AGE = 3; // analyses before a droplet counts as formed
const HISTORY_MAX = 800;
const FRAP_MAX_T = 1000;
/** Share of a droplet's protein that is bleached. */
const FRAP_SHARE = 1 / 3;
/** Smallest droplet that can be partly bleached. */
export const FRAP_MIN_SIZE = 15;

export const SCAN_VALUES: Record<ScanKey, number[]> = {
  chi: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5],
  proteinCount: [20, 40, 60, 80, 120, 160, 200, 260, 320, 400],
  temperature: [0.4, 0.7, 1, 1.3, 1.6, 2, 2.4, 2.8],
};
const SCAN_STEPS = 2500;
const SCAN_SEEDS = [11, 23];

export function regionName(x: number, y: number): string {
  const col = x < WORLD_W / 3 ? "left" : x < (2 * WORLD_W) / 3 ? "centre" : "right";
  const row = y < WORLD_H / 3 ? "top" : y < (2 * WORLD_H) / 3 ? "middle" : "bottom";
  if (row === "middle" && col === "centre") return "centre";
  if (row === "middle") return `middle ${col}`;
  return `${row} ${col}`;
}

function dropletState(solidFraction: number): DropletState {
  return solidFraction >= 0.8 ? "solid" : solidFraction > 0 ? "hardening" : "liquid";
}

interface Track {
  age: number;
  announcedFormed: boolean;
  announcedSolid: boolean;
  size: number;
}

type Listener = () => void;

export class LabStore {
  private params: SimParams;
  world: World;
  private running = false;
  private speed = 1;
  private droplets: Droplet[] = [];
  private history: HistoryPoint[] = [];
  private events: LabEvent[] = [];
  private selectedId: number | null = null;
  private frap: FrapRun | null = null;
  private frapRuns: FrapRun[] = [];
  private scan: Scan | null = null;
  private imported: ImportedFrap | null = null;
  private runId = 0;

  private owner: Int32Array; // droplet id per molecule from the last analysis
  private membersById = new Map<number, number[]>();
  private tracks = new Map<number, Track>();
  private nextDropletId = 1;
  private nextEventId = 1;
  private nextFrapId = 1;
  private stepAcc = 0;
  private sinceAnalysis = 0;
  private raf = 0;
  private lastPublish = 0;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;

  private snapshot: Snapshot;
  private listeners = new Set<Listener>();
  private frameListeners = new Set<Listener>();

  constructor(params: SimParams = DEFAULT_PARAMS) {
    this.params = sanitizeParams(params);
    this.world = createWorld(this.params);
    this.owner = new Int32Array(this.world.n).fill(-1);
    this.analyse(false);
    this.snapshot = this.build();
  }

  // ─── subscription ──────────────────────────────────────────────────────

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getSnapshot = () => this.snapshot;

  /** Called after every simulated frame (for the canvas), even between published snapshots. */
  onFrame(l: Listener) {
    this.frameListeners.add(l);
    return () => {
      this.frameListeners.delete(l);
    };
  }

  private publish(force = true) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!force && now - this.lastPublish < 250) return;
    this.lastPublish = now;
    this.snapshot = this.build();
    for (const l of this.listeners) l();
  }

  private frame() {
    for (const l of this.frameListeners) l();
  }

  private build(): Snapshot {
    const pTotal = proteinCount(this.world);
    const rnaTotal = this.world.n - pTotal;
    const inDroplets = this.droplets.reduce((s, d) => s + d.protein, 0);
    let solidAll = 0;
    for (let i = 0; i < this.world.n; i++) if (this.world.solid[i]) solidAll++;
    const fraction = pTotal > 0 ? inDroplets / pTotal : 0;
    const phase: Phase = fraction < 0.15 ? "mixed" : fraction < 0.35 ? "borderline" : "separated";
    return {
      params: this.params,
      running: this.running,
      speed: this.speed,
      time: this.world.time,
      droplets: this.droplets,
      summary: {
        fraction,
        count: this.droplets.length,
        solidFraction: pTotal > 0 ? solidAll / pTotal : 0,
        largest: this.droplets[0]?.size ?? 0,
        phase,
        trend: this.trend(),
        rnaInDroplets: this.droplets.reduce((s, d) => s + d.rna, 0),
        rnaTotal,
      },
      history: this.history,
      events: this.events,
      selectedId: this.selectedId,
      frap: this.frap,
      frapRuns: this.frapRuns,
      scan: this.scan,
      imported: this.imported,
      runId: this.runId,
    };
  }

  private trend(): Trend {
    const h = this.history;
    if (h.length < 12) return "unknown";
    const recent = h.slice(-6).reduce((s, p) => s + p.fraction, 0) / 6;
    const before = h.slice(-12, -6).reduce((s, p) => s + p.fraction, 0) / 6;
    const d = recent - before;
    return d > 0.03 ? "rising" : d < -0.03 ? "falling" : "steady";
  }

  // ─── running ───────────────────────────────────────────────────────────

  play = () => {
    if (this.running) return;
    this.running = true;
    this.publish();
    this.loop();
  };

  pause = () => {
    if (!this.running) return;
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.publish();
  };

  toggle = () => (this.running ? this.pause() : this.play());

  private loop = () => {
    if (!this.running) return;
    this.stepAcc += STEPS_PER_FRAME * this.speed;
    const n = Math.floor(this.stepAcc);
    this.stepAcc -= n;
    if (n > 0) this.advance(n, true);
    this.frame();
    this.publish(false);
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Advances `n` steps, analysing on schedule. */
  private advance(n: number, record: boolean) {
    let left = n;
    while (left > 0) {
      const chunk = Math.min(left, ANALYSE_EVERY - this.sinceAnalysis);
      step(this.world, this.params, chunk);
      this.sinceAnalysis += chunk;
      left -= chunk;
      if (this.sinceAnalysis >= ANALYSE_EVERY) {
        this.sinceAnalysis = 0;
        this.analyse(record);
      }
    }
  }

  /** Runs one analysis interval (5 steps) and stops. */
  stepOnce = () => {
    this.pause();
    this.advance(ANALYSE_EVERY - this.sinceAnalysis, true);
    this.frame();
    this.publish();
  };

  /** Computes `timeUnits` of simulation instantly, without animating. */
  jump = (timeUnits: number) => {
    const wasRunning = this.running;
    this.pause();
    this.advance(Math.round(timeUnits / DT), true);
    this.frame();
    this.publish();
    if (wasRunning) this.play();
  };

  setSpeed = (s: number) => {
    this.speed = s;
    this.publish();
  };

  // ─── settings ──────────────────────────────────────────────────────────

  setParam = (key: NumericKey, value: number) => {
    const v = clampParam(key, value);
    if (this.params[key] === v) return;
    this.params = { ...this.params, [key]: v };
    if (specFor(key).restarts) this.restart(`Restarted with ${this.params.proteinCount} proteins and ${this.params.multiComponent ? this.params.rnaCount : 0} RNA.`);
    else this.publish();
  };

  setFlag = (key: "multiComponent" | "diseaseMode", value: boolean) => {
    if (this.params[key] === value) return;
    this.params = { ...this.params, [key]: value };
    if (key === "multiComponent") {
      this.restart(value ? "RNA added. Restarted." : "RNA removed. Restarted with protein only.");
      return;
    }
    if (value) this.log("info", "Disease mode on: large droplets can now harden.");
    else this.log("info", "Disease mode off: no new hardening. Clumps that already formed stay solid until you reset.");
    this.publish();
  };

  /** Applies several settings; restarts only if the molecules themselves change. */
  applyParams = (partial: Partial<SimParams>, label?: string) => {
    const next = sanitizeParams({ ...this.params, ...partial });
    const needsRestart =
      next.proteinCount !== this.params.proteinCount ||
      next.rnaCount !== this.params.rnaCount ||
      next.multiComponent !== this.params.multiComponent ||
      next.seed !== this.params.seed;
    const diseaseTurnedOff = this.params.diseaseMode && !next.diseaseMode;
    this.params = next;
    if (needsRestart) this.restart(label ? `${label}: restarted with new molecules.` : "Restarted with new molecules.");
    else {
      if (label) this.log("info", `${label} applied.`);
      if (diseaseTurnedOff) this.log("info", "Disease mode off: clumps that already formed stay solid until you reset.");
      this.publish();
    }
  };

  /** New molecules in new random places (same settings). */
  reset = () => this.restart("Reset: new run with the same settings.");

  newSeed = () => {
    const rng = makeRng(Date.now() & 0xffffff);
    this.params = { ...this.params, seed: 1 + Math.floor(rng() * 999999) };
    this.restart(`New random start (seed ${this.params.seed}).`);
  };

  private restart(message: string) {
    this.world = createWorld(this.params);
    this.owner = new Int32Array(this.world.n).fill(-1);
    this.tracks.clear();
    this.droplets = [];
    this.history = [];
    this.selectedId = null;
    if (this.frap && this.frap.status === "recording") this.endFrap("The run restarted.");
    this.frap = null;
    this.stepAcc = 0;
    this.sinceAnalysis = 0;
    this.runId++;
    this.events = [];
    this.analyse(false);
    this.log("info", message);
    this.frame();
    this.publish();
  }

  // ─── analysis ──────────────────────────────────────────────────────────

  private log(kind: EventKind, text: string) {
    this.events = [...this.events, { id: this.nextEventId++, t: this.world.time, kind, text }].slice(-60);
  }

  private analyse(record: boolean) {
    const w = this.world;
    let clusters = findClusters(w);
    if (this.params.diseaseMode) {
      harden(w, this.params, clusters, ANALYSE_EVERY * DT);
      // solid counts changed: refresh
      clusters = clusters.map((c) => ({ ...c, solid: c.members.reduce((s, m) => s + w.solid[m], 0) }));
    }

    // match clusters to the previous droplets by shared molecules
    const taken = new Set<number>();
    const newOwner = new Int32Array(w.n).fill(-1);
    const next: Droplet[] = [];
    const absorbedBy = new Map<number, number>();
    const members = new Map<number, number[]>();
    for (const c of clusters) {
      const overlap = new Map<number, number>();
      for (const m of c.members) {
        const o = this.owner[m];
        if (o >= 0) overlap.set(o, (overlap.get(o) ?? 0) + 1);
      }
      const ranked = [...overlap.entries()].sort((a, b) => b[1] - a[1]);
      let id = -1;
      for (const [cand, k] of ranked) {
        if (k >= 3 && !taken.has(cand)) {
          id = cand;
          break;
        }
      }
      if (id < 0) id = this.nextDropletId++;
      taken.add(id);
      for (const [cand, k] of ranked) {
        if (cand === id || k < 3) continue;
        const prev = this.tracks.get(cand);
        if (prev && k >= 0.3 * prev.size) absorbedBy.set(cand, id);
      }
      for (const m of c.members) newOwner[m] = id;
      members.set(id, c.members);
      const solidFraction = c.protein > 0 ? c.solid / c.protein : 0;
      next.push({
        id,
        size: c.members.length,
        protein: c.protein,
        rna: c.rna,
        solid: c.solid,
        solidFraction,
        state: dropletState(solidFraction),
        cx: c.cx,
        cy: c.cy,
        radius: c.radius,
        region: regionName(c.cx, c.cy),
      });
    }

    // events
    const nextTracks = new Map<number, Track>();
    for (const d of next) {
      const prev = this.tracks.get(d.id);
      const t: Track = prev
        ? { ...prev, age: prev.age + 1, size: d.size }
        : { age: 0, announcedFormed: false, announcedSolid: false, size: d.size };
      if (record && !t.announcedFormed && t.age >= ESTABLISHED_AGE) {
        t.announcedFormed = true;
        this.log("formed", `Droplet ${d.id} formed (${d.size} molecules, ${d.region}).`);
      }
      if (record && !t.announcedSolid && d.state === "solid") {
        t.announcedSolid = true;
        this.log("solidified", `Droplet ${d.id} turned solid.`);
      }
      nextTracks.set(d.id, t);
    }
    if (record) {
      const mergedInto = new Map<number, number[]>();
      for (const [oldId, track] of this.tracks) {
        if (nextTracks.has(oldId) || !track.announcedFormed) continue;
        const into = absorbedBy.get(oldId);
        if (into !== undefined) {
          const list = mergedInto.get(into) ?? [];
          list.push(oldId);
          mergedInto.set(into, list);
        } else {
          this.log("dissolved", `Droplet ${oldId} dissolved.`);
        }
      }
      for (const [into, olds] of mergedInto) {
        this.log("merged", `Droplet${olds.length > 1 ? "s" : ""} ${olds.join(" and ")} merged into droplet ${into}.`);
        // a merged droplet keeps being followed
        if (this.frap && olds.includes(this.frap.dropletId)) this.frap = { ...this.frap, dropletId: into };
        if (this.selectedId !== null && olds.includes(this.selectedId)) this.selectedId = into;
      }
    }
    this.tracks = nextTracks;
    this.owner = newOwner;
    this.droplets = next;
    this.membersById = members;

    if (this.selectedId !== null && !next.some((d) => d.id === this.selectedId)) {
      if (record) this.log("info", `The selected droplet (${this.selectedId}) is gone.`);
      this.selectedId = null;
    }

    if (record) {
      const pTotal = Math.max(1, proteinCount(w));
      let solidAll = 0;
      for (let i = 0; i < w.n; i++) if (w.kind[i] === KIND_PROTEIN && w.solid[i]) solidAll++;
      this.history.push({
        t: Number(w.time.toFixed(2)),
        fraction: next.reduce((s, d) => s + d.protein, 0) / pTotal,
        count: next.length,
        solidFraction: solidAll / pTotal,
        largest: next[0]?.size ?? 0,
      });
      if (this.history.length > HISTORY_MAX) {
        // keep the recent half at full detail, thin the older half
        const half = Math.floor(this.history.length / 2);
        this.history = [...this.history.slice(0, half).filter((_, i) => i % 2 === 0), ...this.history.slice(half)];
      } else {
        this.history = [...this.history];
      }
      this.sampleFrap();
    }
  }

  // ─── selection ─────────────────────────────────────────────────────────

  select = (id: number | null) => {
    this.selectedId = id !== null && this.droplets.some((d) => d.id === id) ? id : null;
    this.frame();
    this.publish();
  };

  /** Droplets in reading order (top to bottom, then left to right) for keyboard movement. */
  readingOrder(): Droplet[] {
    const band = WORLD_H / 6;
    return [...this.droplets].sort((a, b) => Math.floor(a.cy / band) - Math.floor(b.cy / band) || a.cx - b.cx);
  }

  /** Moves the selection; returns the newly selected droplet. */
  moveSelection = (how: "next" | "prev" | "first" | "last"): Droplet | null => {
    const order = this.readingOrder();
    if (order.length === 0) {
      this.select(null);
      return null;
    }
    const i = order.findIndex((d) => d.id === this.selectedId);
    let j: number;
    if (how === "first") j = 0;
    else if (how === "last") j = order.length - 1;
    else if (i < 0) j = how === "next" ? 0 : order.length - 1;
    else j = (i + (how === "next" ? 1 : -1) + order.length) % order.length;
    this.select(order[j].id);
    return order[j];
  };

  /** The droplet under a point in world coordinates, or the nearest one within reach. */
  dropletAt(x: number, y: number, reach = 2 * SIGMA): Droplet | null {
    let best: Droplet | null = null;
    let bestD = Infinity;
    for (const d of this.droplets) {
      const dist = Math.hypot(d.cx - x, d.cy - y) - d.radius;
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best && bestD <= reach ? best : null;
  }

  // ─── FRAP ──────────────────────────────────────────────────────────────

  /** Bleaches a spot in the middle of a droplet and starts recording. */
  bleachDroplet = (id: number): string => {
    const d = this.droplets.find((x) => x.id === id);
    if (!d) return "That droplet is gone. Select another one.";
    if (d.size < FRAP_MIN_SIZE)
      return `Droplet ${d.id} has only ${d.size} molecules: too small to bleach part of it. Pick a droplet with at least ${FRAP_MIN_SIZE}.`;
    if (this.frap && this.frap.status === "recording") this.endFrap("A new bleach started.");
    // fresh label: earlier bleaching is cleared so each experiment starts bright
    this.world.bleached.fill(0);
    // Bleach the third of the droplet's protein nearest its centre. A fixed share
    // (rather than a fixed size) keeps the rest of the droplet bright, which the
    // double normalisation needs: a spot covering nearly all of a dense droplet
    // would read as "recovered" even in a solid.
    const w = this.world;
    const prot = (this.membersById.get(d.id) ?? [])
      .filter((m) => w.kind[m] === KIND_PROTEIN)
      .map((m) => ({ m, r: Math.hypot(w.x[m] - d.cx, w.y[m] - d.cy) }))
      .sort((a, b) => a.r - b.r);
    const share = Math.max(3, Math.round(prot.length * FRAP_SHARE));
    const radius = prot.length ? prot[Math.min(share, prot.length) - 1].r + 0.25 * SIGMA : SIGMA;
    const k = bleach(w, d.cx, d.cy, radius);
    this.frap = {
      id: this.nextFrapId++,
      dropletId: d.id,
      stateAtBleach: d.state,
      solidAtBleach: d.solidFraction,
      startT: this.world.time,
      cx: d.cx,
      cy: d.cy,
      radius,
      bleachedCount: k,
      points: [{ t: 0, intensity: this.spotIntensity(d.id, d.cx, d.cy, radius) ?? 0 }],
      status: "recording",
      endReason: null,
      fit: null,
    };
    this.selectedId = d.id;
    this.log("info", `Bleached a spot in droplet ${d.id} (${k} protein molecules). Recording recovery.`);
    this.frame();
    this.publish();
    return `Bleached ${k} protein molecules in droplet ${d.id}. Recording recovery.`;
  };

  /**
   * Brightness of the spot relative to the whole droplet (double normalisation,
   * as labs do): bleaching removes part of the droplet's glow for good, so a
   * fully mixed liquid droplet reads 1 and a frozen spot stays near 0.
   */
  private spotIntensity(dropletId: number, cx: number, cy: number, radius: number): number | null {
    const spot = brightFraction(this.world, cx, cy, radius);
    const mem = this.membersById.get(dropletId);
    if (spot === null || !mem || mem.length === 0) return spot;
    let bright = 0;
    let protein = 0;
    for (const m of mem) {
      if (this.world.kind[m] !== KIND_PROTEIN) continue;
      protein++;
      if (!this.world.bleached[m]) bright++;
    }
    if (protein === 0) return spot;
    const whole = bright / protein;
    return whole > 0 ? Math.min(1.2, spot / whole) : 0;
  }

  private sampleFrap() {
    const f = this.frap;
    if (!f || f.status !== "recording") return;
    const d = this.droplets.find((x) => x.id === f.dropletId);
    if (!d) {
      this.endFrap(`Droplet ${f.dropletId} dissolved, so the recording stopped.`);
      return;
    }
    // The spot moves with the bleached material, as a bleach mark would: in a
    // liquid the dark molecules spread out and their centre drifts to the
    // droplet's centre; in a solid they stay together and the spot stays on them.
    // (Following the droplet's centre instead let the spot slide off a solid's dark
    // patch as liquid molecules joined one side.)
    let bx = 0;
    let by = 0;
    let nb = 0;
    for (const m of this.membersById.get(d.id) ?? []) {
      if (this.world.bleached[m] && this.world.kind[m] === KIND_PROTEIN) {
        bx += this.world.x[m];
        by += this.world.y[m];
        nb++;
      }
    }
    const cx = nb >= 3 ? bx / nb : d.cx;
    const cy = nb >= 3 ? by / nb : d.cy;
    const v = this.spotIntensity(d.id, cx, cy, f.radius);
    const t = Number((this.world.time - f.startT).toFixed(2));
    const points = v === null ? f.points : [...f.points, { t, intensity: v }];
    this.frap = { ...f, cx, cy, points, fit: points.length >= 8 ? fitRecovery(points) : null };
    if (t >= FRAP_MAX_T) this.endFrap("Recording finished.");
  }

  stopFrap = () => {
    if (this.frap && this.frap.status === "recording") {
      this.endFrap("Recording stopped.");
      this.publish();
    }
  };

  private endFrap(reason: string) {
    const f = this.frap;
    if (!f) return;
    const done: FrapRun = { ...f, status: "ended", endReason: reason, fit: fitRecovery(f.points) };
    this.frap = done;
    this.frapRuns = [...this.frapRuns, done].slice(-6);
    this.log("info", `FRAP on droplet ${f.dropletId}: ${reason}`);
  }

  clearFrapRuns = () => {
    this.frapRuns = [];
    if (this.frap?.status === "ended") this.frap = null;
    this.publish();
  };

  // ─── imported data ─────────────────────────────────────────────────────

  importFrap = (name: string, text: string): string => {
    const r = parseFrapCsv(text);
    if ("error" in r) return r.error;
    this.imported = { name, points: r.points, notes: r.notes, fit: fitRecovery(r.points) };
    this.publish();
    return `Loaded ${r.points.length} readings from ${name}.`;
  };

  clearImported = () => {
    this.imported = null;
    this.publish();
  };

  // ─── threshold scan ────────────────────────────────────────────────────

  /** Measures droplet formation across a range of one setting, in the background. */
  runScan = (key: ScanKey) => {
    this.cancelScan(false);
    const values = SCAN_VALUES[key];
    const base = { ...this.params };
    const jobs: { value: number; seed: number }[] = [];
    for (const value of values) for (const seed of SCAN_SEEDS) jobs.push({ value, seed });
    const results = new Map<number, number[]>();
    this.scan = { key, status: "running", points: [], total: values.length, base };
    this.publish();
    let j = 0;
    let world: World | null = null;
    let done = 0;
    let params: SimParams = base;
    const tick = () => {
      if (!this.scan || this.scan.status !== "running") return;
      const job = jobs[j];
      if (!world) {
        params = { ...base, [key]: job.value, seed: job.seed, diseaseMode: false };
        world = createWorld(params);
        done = 0;
      }
      const chunk = 500;
      step(world, params, chunk);
      done += chunk;
      if (done >= SCAN_STEPS) {
        const cl = findClusters(world);
        const frac = cl.reduce((s, c) => s + c.protein, 0) / Math.max(1, proteinCount(world));
        const list = results.get(job.value) ?? [];
        list.push(frac);
        results.set(job.value, list);
        world = null;
        j++;
        const points: ScanPoint[] = values
          .filter((v) => (results.get(v)?.length ?? 0) === SCAN_SEEDS.length)
          .map((v) => {
            const r = results.get(v)!;
            return { value: v, fraction: r.reduce((a, b) => a + b, 0) / r.length, min: Math.min(...r), max: Math.max(...r) };
          });
        const finished = j >= jobs.length;
        this.scan = { ...this.scan, points, status: finished ? "done" : "running" };
        this.publish();
        if (finished) return;
      }
      this.scanTimer = setTimeout(tick, 0);
    };
    this.scanTimer = setTimeout(tick, 0);
  };

  cancelScan = (publish = true) => {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = null;
    if (this.scan && this.scan.status === "running") this.scan = { ...this.scan, status: "cancelled" };
    if (publish) this.publish();
  };

  dispose() {
    this.pause();
    this.cancelScan(false);
    this.listeners.clear();
    this.frameListeners.clear();
  }
}

/** Where the scan says droplets start: the first crossing of 30% protein in droplets. */
export function scanThreshold(scan: Scan): { kind: "crossing"; value: number; rising: boolean } | { kind: "none" | "all" | "unclear" } {
  const pts = scan.points;
  if (pts.length < 2) return { kind: "unclear" };
  const level = 0.3;
  const above = pts.map((p) => p.fraction >= level);
  if (above.every(Boolean)) return { kind: "all" };
  if (!above.some(Boolean)) return { kind: "none" };
  for (let i = 1; i < pts.length; i++) {
    if (above[i] !== above[i - 1]) {
      const a = pts[i - 1];
      const b = pts[i];
      const f = (level - a.fraction) / (b.fraction - a.fraction);
      return { kind: "crossing", value: a.value + f * (b.value - a.value), rising: above[i] };
    }
  }
  return { kind: "unclear" };
}
