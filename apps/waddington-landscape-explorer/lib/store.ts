// The single state model. The 3D landscape, the map, the text summary, the
// tables, charts, sounds and announcements all read from here; every control
// writes to here.

import { relativeDepths, terrainFor } from "./model/landscape";
import { DEFAULT_PARAMS, FATES, GENE_NAMES, sanitizeParams, type Fate, type GeneName, type ModelParams } from "./model/params";
import { simulate, type Cell, type Population } from "./model/simulate";
import { fateStats, type FateStat } from "./model/stats";

export type ViewMode = "landscape" | "map";
export type ColorBy = "fate" | "pseudotime" | "age" | GeneName;
export type PictureMode = "live" | "second" | "still";

export interface LabEvent {
  id: number;
  text: string;
}

export interface Snapshot {
  params: ModelParams;
  pop: Population;
  normal: Population;
  stats: FateStat[];
  /** Pseudotime cursor: cells up to here are shown (0–1). */
  cursor: number;
  playing: boolean;
  speed: number;
  view: ViewMode;
  colorBy: ColorBy;
  arrows: boolean;
  marbles: boolean;
  selectedId: number | null;
  /** Fate whose cells the keyboard moves through on the map. */
  focusFate: Fate;
  events: LabEvent[];
  /** Number of cells the cursor has reached. */
  visible: number;
  /** True while a new population is being computed after a change. */
  computing: boolean;
  runId: number;
}

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
const PLAY_SECONDS = 14; // 0 → 1 at normal speed

type Listener = () => void;

function normalKey(p: ModelParams) {
  return `${p.seed}|${p.cellCount}|${p.noise}`;
}

export class LabStore {
  private params: ModelParams;
  private pop: Population;
  private normal: Population;
  private normalFor = "";
  private stats: FateStat[];
  private cursor = 1;
  private playing = false;
  private speed = 1;
  private view: ViewMode = "landscape";
  private colorBy: ColorBy = "fate";
  private arrows = false;
  private marbles = true;
  private selectedId: number | null = null;
  private focusFate: Fate = "neuron";
  private events: LabEvent[] = [];
  private nextEvent = 1;
  private computing = false;
  private runId = 0;
  private raf = 0;
  private lastT = 0;
  private recomputeTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshot: Snapshot;
  private listeners = new Set<Listener>();
  private frameListeners = new Set<Listener>();

  constructor(params: ModelParams = DEFAULT_PARAMS) {
    this.params = sanitizeParams(params);
    this.normal = simulate({ ...this.params, genes: { ...DEFAULT_PARAMS.genes } });
    this.normalFor = normalKey(this.params);
    this.pop = this.isNormalGenes() ? this.normal : simulate(this.params);
    this.stats = fateStats(this.pop.cells, this.normal.cells);
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

  /** Called on every animation frame while playing (for the pictures). */
  onFrame(l: Listener) {
    this.frameListeners.add(l);
    return () => {
      this.frameListeners.delete(l);
    };
  }

  private publish() {
    this.snapshot = this.build();
    for (const l of this.listeners) l();
  }

  private build(): Snapshot {
    let visible = 0;
    for (const c of this.pop.cells) if (c.pseudotime !== null && c.pseudotime <= this.cursor + 1e-9) visible++;
    return {
      params: this.params,
      pop: this.pop,
      normal: this.normal,
      stats: this.stats,
      cursor: this.cursor,
      playing: this.playing,
      speed: this.speed,
      view: this.view,
      colorBy: this.colorBy,
      arrows: this.arrows,
      marbles: this.marbles,
      selectedId: this.selectedId,
      focusFate: this.focusFate,
      events: this.events,
      visible,
      computing: this.computing,
      runId: this.runId,
    };
  }

  private log(text: string) {
    this.events = [...this.events, { id: this.nextEvent++, text }].slice(-60);
  }

  private isNormalGenes() {
    return GENE_NAMES.every((n) => this.params.genes[n] === DEFAULT_PARAMS.genes[n]);
  }

  // ─── settings ──────────────────────────────────────────────────────────

  /** Changes a gene level (0–1). The population is recomputed shortly after the last change. */
  setGene = (name: GeneName, value: number) => {
    const v = Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
    if (this.params.genes[name] === v) return;
    this.params = { ...this.params, genes: { ...this.params.genes, [name]: v } };
    this.scheduleRecompute(`${name} set to ${Math.round(v * 100)}%`);
  };

  /** Applies several settings at once (an experiment, a guide step or a loaded file). */
  applyParams = (partial: Omit<Partial<ModelParams>, "genes"> & { genes?: Partial<ModelParams["genes"]> }, label: string) => {
    this.params = sanitizeParams({ ...this.params, ...partial, genes: { ...this.params.genes, ...(partial.genes ?? {}) } });
    this.recompute(label);
  };

  resetGenes = () => {
    this.params = { ...this.params, genes: { ...DEFAULT_PARAMS.genes } };
    this.recompute("All genes back to normal");
  };

  setNoise = (v: number) => {
    this.params = sanitizeParams({ ...this.params, noise: v });
    this.scheduleRecompute(`Cell-to-cell randomness set to ${this.params.noise.toFixed(1)}`);
  };

  setCellCount = (n: number) => {
    this.params = sanitizeParams({ ...this.params, cellCount: n });
    this.recompute(`${n} cells`);
  };

  newSeed = () => {
    this.params = { ...this.params, seed: 1 + Math.floor(Math.random() * 999999) };
    this.recompute(`New random cells (seed ${this.params.seed})`);
  };

  private scheduleRecompute(label: string) {
    this.computing = true;
    this.publish();
    if (this.recomputeTimer) clearTimeout(this.recomputeTimer);
    this.recomputeTimer = setTimeout(() => this.recompute(label), 220);
  }

  /** Recomputes now and logs what changed compared with before. */
  recompute(label: string) {
    if (this.recomputeTimer) clearTimeout(this.recomputeTimer);
    this.recomputeTimer = null;
    const before = this.stats;
    if (normalKey(this.params) !== this.normalFor) {
      this.normal = simulate({ ...this.params, genes: { ...DEFAULT_PARAMS.genes } });
      this.normalFor = normalKey(this.params);
    }
    this.pop = this.isNormalGenes() ? this.normal : simulate(this.params);
    this.stats = fateStats(this.pop.cells, this.normal.cells);
    this.computing = false;
    this.runId++;
    if (this.selectedId !== null && !this.pop.cells.some((c) => c.id === this.selectedId)) this.selectedId = null;
    this.log(`${label}. ${changeSentence(before, this.stats)}`);
    this.frame();
    this.publish();
  }

  // ─── time ──────────────────────────────────────────────────────────────

  setCursor = (t: number) => {
    this.cursor = Math.round(Math.min(1, Math.max(0, t)) * 1000) / 1000;
    this.frame();
    this.publish();
  };

  play = () => {
    if (this.playing) return;
    if (this.cursor >= 0.999) this.cursor = 0;
    this.playing = true;
    this.lastT = 0;
    this.publish();
    this.raf = requestAnimationFrame(this.loop);
  };

  pause = () => {
    if (!this.playing) return;
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.publish();
  };

  toggle = () => (this.playing ? this.pause() : this.play());

  private loop = (now: number) => {
    if (!this.playing) return;
    if (this.lastT) {
      // keep pace with the clock even when frames are slow (cap only long pauses, e.g. a hidden tab)
      const dt = Math.min(0.5, (now - this.lastT) / 1000);
      this.cursor = Math.min(1, this.cursor + (dt * this.speed) / PLAY_SECONDS);
    }
    this.lastT = now;
    this.frame();
    if (this.cursor >= 1) {
      this.cursor = 1;
      this.playing = false;
      this.log("Reached the end of pseudotime: all cells shown.");
      this.publish();
      return;
    }
    this.snapshot = { ...this.snapshot, cursor: this.cursor };
    this.throttledPublish(now);
    this.raf = requestAnimationFrame(this.loop);
  };

  private lastPublish = 0;
  private throttledPublish(now: number) {
    if (now - this.lastPublish < 200) return;
    this.lastPublish = now;
    this.publish();
  }

  step = (dir: 1 | -1, size = 0.05) => {
    this.pause();
    this.setCursor(Math.round((this.cursor + dir * size) / size) * size);
  };

  setSpeed = (s: number) => {
    this.speed = s;
    this.publish();
  };

  private frame() {
    for (const l of this.frameListeners) l();
  }

  // ─── view ──────────────────────────────────────────────────────────────

  setView = (v: ViewMode) => {
    this.view = v;
    this.publish();
  };

  setColorBy = (c: ColorBy) => {
    this.colorBy = c;
    this.frame();
    this.publish();
  };

  setArrows = (on: boolean) => {
    this.arrows = on;
    this.frame();
    this.publish();
  };

  setMarbles = (on: boolean) => {
    this.marbles = on;
    this.frame();
    this.publish();
  };

  // ─── selection ─────────────────────────────────────────────────────────

  select = (id: number | null) => {
    const c = id === null ? null : this.pop.cells.find((x) => x.id === id) ?? null;
    this.selectedId = c ? c.id : null;
    if (c) this.focusFate = c.fate;
    this.frame();
    this.publish();
  };

  setFocusFate = (f: Fate) => {
    this.focusFate = f;
    this.publish();
  };

  /** Visible cells of a fate, ordered along the branch (by pseudotime). */
  branchCells(f: Fate): Cell[] {
    return this.pop.cells
      .filter((c) => c.fate === f && c.pseudotime !== null && c.pseudotime <= this.cursor + 1e-9)
      .sort((a, b) => (a.pseudotime as number) - (b.pseudotime as number) || a.id - b.id);
  }

  /**
   * Moves the selection along the focused branch (next/prev, by a step of
   * `jump` cells) or to another branch (keeping a similar pseudotime).
   */
  moveSelection = (how: "next" | "prev" | "first" | "last" | "otherNext" | "otherPrev", jump = 1): Cell | null => {
    let fate = this.focusFate;
    const current = this.pop.cells.find((c) => c.id === this.selectedId) ?? null;
    if (how === "otherNext" || how === "otherPrev") {
      const present = FATES.filter((f) => this.branchCells(f).length > 0);
      if (present.length === 0) return null;
      const k = Math.max(0, present.indexOf(fate));
      fate = present[(k + (how === "otherNext" ? 1 : present.length - 1)) % present.length];
      const list = this.branchCells(fate);
      const target = current?.pseudotime ?? 0;
      let best = list[0];
      for (const c of list) if (Math.abs((c.pseudotime as number) - target) < Math.abs((best.pseudotime as number) - target)) best = c;
      this.focusFate = fate;
      this.select(best.id);
      return best;
    }
    const list = this.branchCells(fate);
    if (list.length === 0) return null;
    let i = current && current.fate === fate ? list.findIndex((c) => c.id === current.id) : -1;
    if (how === "first") i = 0;
    else if (how === "last") i = list.length - 1;
    else if (i < 0) i = how === "next" ? 0 : list.length - 1;
    else i = Math.min(list.length - 1, Math.max(0, i + (how === "next" ? jump : -jump)));
    this.select(list[i].id);
    return list[i];
  };

  /** Nearest visible cell to a map point, within reach. */
  cellAt(x: number, y: number, reach: number): Cell | null {
    let best: Cell | null = null;
    let bd = reach * reach;
    for (const c of this.pop.cells) {
      if (c.pseudotime === null || c.pseudotime > this.cursor + 1e-9) continue;
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  dispose() {
    this.pause();
    if (this.recomputeTimer) clearTimeout(this.recomputeTimer);
    this.listeners.clear();
    this.frameListeners.clear();
  }
}

const NAMES: Record<Fate, string> = { stem: "undecided", neuron: "neurons", glia: "glia", muscle: "muscle", blood: "blood" };

/** "Neurons 14% → 0%, glia 14% → 22%." for fates that moved by a point or more. */
export function changeSentence(before: FateStat[], after: FateStat[]): string {
  const bits: string[] = [];
  for (const a of after) {
    const b = before.find((x) => x.fate === a.fate);
    if (!b) continue;
    const d = Math.round(a.share * 100) - Math.round(b.share * 100);
    if (Math.abs(d) >= 1) bits.push(`${NAMES[a.fate]} ${Math.round(b.share * 100)}% → ${Math.round(a.share * 100)}%`);
  }
  if (!bits.length) return "Fates unchanged.";
  const s = bits.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

export { relativeDepths, terrainFor };
