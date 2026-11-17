// Every setting the simulation reads, with its range and plain-language meaning.
// One source for sliders, presets, exports and descriptions.

export interface SimParams {
  /** Scaffold proteins: the "sticky" molecules that drive droplet formation. */
  proteinCount: number;
  /** RNA molecules: clients that are pulled into droplets by sticking to protein. */
  rnaCount: number;
  /** Stickiness (chi, written χ): how strongly molecules prefer each other over water. */
  chi: number;
  /** Temperature (thermal energy, kT). Higher = more jiggling, droplets melt. */
  temperature: number;
  /** pH. Stickiness is strongest near neutral (7) and weakens towards acid or base. */
  pH: number;
  /** Crowding: other big molecules filling the cell, which push ours together. */
  crowding: number;
  /** Include RNA in the mixture. */
  multiComponent: boolean;
  /** Disease mode: droplets can harden into solid aggregates. */
  diseaseMode: boolean;
  /** How quickly droplets harden in disease mode. */
  aggregationRate: number;
  /** Random seed: the same seed and settings give the same run. */
  seed: number;
}

export type NumericKey =
  | "proteinCount"
  | "rnaCount"
  | "chi"
  | "temperature"
  | "pH"
  | "crowding"
  | "aggregationRate";

export interface ParamSpec {
  key: NumericKey;
  label: string;
  short: string;
  min: number;
  max: number;
  step: number;
  /** Shown after the value, e.g. " kT". Empty for counts. */
  unit: string;
  /** Plain-language help shown under the control. */
  help: string;
  /** Hidden in the simpler interface (still reachable through presets and "Show all settings"). */
  advanced: boolean;
  /** Changing this restarts the run (new molecules), rather than changing it live. */
  restarts: boolean;
  decimals: number;
}

export const PARAM_SPECS: readonly ParamSpec[] = [
  {
    key: "chi",
    label: "Stickiness (χ)",
    short: "stickiness",
    min: 0,
    max: 6,
    step: 0.1,
    unit: "",
    help: "How strongly the proteins prefer touching each other over touching water. Droplets need enough stickiness.",
    advanced: false,
    restarts: false,
    decimals: 1,
  },
  {
    key: "temperature",
    label: "Temperature",
    short: "temperature",
    min: 0.2,
    max: 3,
    step: 0.1,
    unit: " kT",
    help: "Heat makes molecules jiggle harder. Enough heat shakes droplets apart.",
    advanced: false,
    restarts: false,
    decimals: 1,
  },
  {
    key: "proteinCount",
    label: "Protein molecules",
    short: "protein count",
    min: 20,
    max: 400,
    step: 10,
    unit: "",
    help: "More protein in the same space means a higher concentration. Below a threshold concentration, droplets cannot form.",
    advanced: false,
    restarts: true,
    decimals: 0,
  },
  {
    key: "rnaCount",
    label: "RNA molecules",
    short: "RNA count",
    min: 0,
    max: 200,
    step: 10,
    unit: "",
    help: "RNA sticks to protein but barely to itself, so it joins droplets without making them.",
    advanced: false,
    restarts: true,
    decimals: 0,
  },
  {
    key: "pH",
    label: "pH",
    short: "pH",
    min: 4,
    max: 10,
    step: 0.1,
    unit: "",
    help: "How acidic (low) or basic (high) the liquid is. In this model, stickiness is strongest at pH 7.",
    advanced: true,
    restarts: false,
    decimals: 1,
  },
  {
    key: "crowding",
    label: "Crowding",
    short: "crowding",
    min: 0.5,
    max: 2,
    step: 0.1,
    unit: "×",
    help: "Cells are packed with other large molecules. More crowding squeezes our molecules together and helps droplets form.",
    advanced: true,
    restarts: false,
    decimals: 1,
  },
  {
    key: "aggregationRate",
    label: "Hardening speed",
    short: "hardening speed",
    min: 0.1,
    max: 3,
    step: 0.1,
    unit: "×",
    help: "In disease mode, how quickly large droplets turn solid. Only used when disease mode is on.",
    advanced: true,
    restarts: false,
    decimals: 1,
  },
];

export const DEFAULT_PARAMS: SimParams = {
  proteinCount: 160,
  rnaCount: 40,
  chi: 3.0,
  temperature: 1.0,
  pH: 7.0,
  crowding: 1.0,
  multiComponent: true,
  diseaseMode: false,
  aggregationRate: 1.0,
  seed: 1,
};

export function specFor(key: NumericKey): ParamSpec {
  const s = PARAM_SPECS.find((p) => p.key === key);
  if (!s) throw new Error(`Unknown parameter ${key}`);
  return s;
}

export function clampParam(key: NumericKey, value: number): number {
  const s = specFor(key);
  if (!Number.isFinite(value)) return s.min;
  const stepped = Math.round((value - s.min) / s.step) * s.step + s.min;
  const v = Math.min(s.max, Math.max(s.min, stepped));
  return Number(v.toFixed(s.decimals));
}

export function formatParam(key: NumericKey, value: number): string {
  const s = specFor(key);
  return `${value.toFixed(s.decimals)}${s.unit}`;
}

/** Validates params read from a file or URL; unknown or bad values fall back to defaults. */
export function sanitizeParams(input: unknown): SimParams {
  const out: SimParams = { ...DEFAULT_PARAMS };
  if (!input || typeof input !== "object") return out;
  const o = input as Record<string, unknown>;
  for (const s of PARAM_SPECS) {
    const v = o[s.key];
    if (typeof v === "number") out[s.key] = clampParam(s.key, v);
  }
  if (typeof o.multiComponent === "boolean") out.multiComponent = o.multiComponent;
  if (typeof o.diseaseMode === "boolean") out.diseaseMode = o.diseaseMode;
  if (typeof o.seed === "number" && Number.isInteger(o.seed) && o.seed > 0) out.seed = o.seed;
  return out;
}

/**
 * Effective stickiness the molecules feel, after pH and crowding.
 * Also the χ used by the textbook Flory-Huggins curve (divided by temperature there).
 */
export function effectiveChi(p: Pick<SimParams, "chi" | "pH" | "crowding">): number {
  const pHFactor = Math.max(0.2, 1 - 0.12 * Math.abs(p.pH - 7));
  return p.chi * pHFactor * p.crowding;
}
