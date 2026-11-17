// FRAP (fluorescence recovery after photobleaching): bleach part of a droplet,
// then watch brightness come back as unbleached molecules move in. Fast, full
// recovery = liquid; slow or partial recovery = gel or solid.

export interface FrapPoint {
  /** Time since the bleach. */
  t: number;
  /** Brightness in the bleached spot: 1 = as before the bleach, 0 = fully dark. */
  intensity: number;
}

export interface FrapFit {
  /** Brightness straight after the bleach. */
  i0: number;
  /** Brightness the curve levels off at. */
  plateau: number;
  /** Time constant of the exponential. */
  tau: number;
  /** Time to recover half of the way to the plateau. */
  halfTime: number;
  /** Share of the bleached molecules that are free to move (0–1). */
  mobileFraction: number;
  /** How well the curve fits (1 = perfectly). */
  r2: number;
}

export type FitResult =
  | { ok: true; fit: FrapFit; reliable: boolean; note: string }
  | { ok: false; reason: string };

/**
 * Fits I(t) = i0 + (plateau − i0)(1 − e^(−t/τ)) by scanning τ and solving the
 * rest by least squares. Returns a reason instead of a fit when the data
 * cannot support one: "not enough data" is a valid answer.
 */
export function fitRecovery(points: FrapPoint[], preBleach = 1): FitResult {
  const pts = points.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.intensity));
  if (pts.length < 8) return { ok: false, reason: "Not enough data yet: at least 8 readings are needed." };
  const tMax = pts[pts.length - 1].t - pts[0].t;
  if (!(tMax > 0)) return { ok: false, reason: "The readings all have the same time." };
  const t0 = pts[0].t;
  let best: { tau: number; a: number; b: number; sse: number } | null = null;
  // τ from tMax/400 to 3·tMax on a log grid
  for (let k = 0; k <= 240; k++) {
    const tau = (tMax / 400) * Math.pow(1200, k / 240);
    // I = a + b·g, g = 1 − e^(−t/τ); linear least squares in a, b
    let sg = 0, sgg = 0, si = 0, sgi = 0;
    const n = pts.length;
    for (const p of pts) {
      const g = 1 - Math.exp(-(p.t - t0) / tau);
      sg += g;
      sgg += g * g;
      si += p.intensity;
      sgi += g * p.intensity;
    }
    const det = n * sgg - sg * sg;
    if (Math.abs(det) < 1e-12) continue;
    const b = (n * sgi - sg * si) / det;
    const a = (si - b * sg) / n;
    let sse = 0;
    for (const p of pts) {
      const g = 1 - Math.exp(-(p.t - t0) / tau);
      sse += (p.intensity - (a + b * g)) ** 2;
    }
    if (!best || sse < best.sse) best = { tau, a, b, sse };
  }
  if (!best) return { ok: false, reason: "The curve could not be fitted." };
  const mean = pts.reduce((s, p) => s + p.intensity, 0) / pts.length;
  const sst = pts.reduce((s, p) => s + (p.intensity - mean) ** 2, 0);
  const r2 = sst > 0 ? 1 - best.sse / sst : 0;
  const i0 = best.a;
  const plateau = best.a + best.b;
  const denom = preBleach - i0;
  const mobileFraction = denom > 1e-6 ? Math.max(0, Math.min(1, (plateau - i0) / denom)) : 0;
  const fit: FrapFit = { i0, plateau, tau: best.tau, halfTime: best.tau * Math.LN2, mobileFraction, r2 };
  const recovered = plateau - i0;
  if (recovered < 0.05) {
    return {
      ok: true,
      fit: { ...fit, halfTime: Number.POSITIVE_INFINITY, mobileFraction: Math.max(0, recovered / Math.max(denom, 1e-6)) },
      reliable: tMax > 0,
      note: "Almost no recovery: the molecules in the spot are not moving. That is how a solid behaves.",
    };
  }
  const coversCurve = tMax >= 2 * best.tau;
  if (best.tau > 1.5 * tMax) {
    // Still creeping up at the end: the plateau cannot be known. Report what was seen as a lower bound.
    const tail = pts.slice(-Math.max(3, Math.floor(pts.length / 10)));
    const end = tail.reduce((s, p) => s + p.intensity, 0) / tail.length;
    const seen = denom > 1e-6 ? Math.max(0, Math.min(1, (end - i0) / denom)) : 0;
    return {
      ok: true,
      fit: { ...fit, plateau: end, halfTime: Number.POSITIVE_INFINITY, mobileFraction: seen },
      reliable: false,
      note: `Uncertain: recovery is slow and has not levelled off, so the half-time cannot be measured. At least ${Math.round(seen * 100)}% has recovered so far.`,
    };
  }
  const reliable = r2 >= 0.8 && coversCurve;
  const note = !coversCurve
    ? "Uncertain: the curve has not levelled off yet, so the half-time and plateau are rough. Keep recording."
    : r2 < 0.8
      ? "Uncertain: the readings are noisy and the curve fits them loosely."
      : "The curve fits the readings well.";
  return { ok: true, fit, reliable, note };
}

/** Plain-language reading of a fit. */
export function interpretFit(r: FitResult): string {
  if (!r.ok) return r.reason;
  const m = r.fit.mobileFraction;
  const kind =
    m >= 0.75 ? "liquid-like: most molecules swap in and out freely" :
    m >= 0.35 ? "gel-like: some molecules move, others are stuck" :
    "solid-like: most molecules are stuck in place";
  return `Mobile fraction ${Math.round(m * 100)}%, ${kind}.`;
}

/**
 * Parses an experimental FRAP curve from CSV or tab-separated text.
 * Two numeric columns are used: time and intensity. A header row is optional.
 * Intensities are scaled so the pre-bleach value (first reading before the
 * lowest point, if present) is 1; otherwise the largest value is 1.
 */
export function parseFrapCsv(text: string): { points: FrapPoint[]; notes: string[] } | { error: string } {
  const notes: string[] = [];
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  const data: [number, number][] = [];
  let skipped = 0;
  for (const row of rows) {
    const cells = row.split(/[,\t;]|\s{2,}/).map((c) => c.trim());
    const nums = cells.map((c) => Number(c)).filter((v) => Number.isFinite(v));
    if (cells.length >= 2 && Number.isFinite(Number(cells[0])) && Number.isFinite(Number(cells[1]))) {
      data.push([Number(cells[0]), Number(cells[1])]);
    } else if (nums.length < 2) {
      skipped++;
    }
  }
  if (data.length < 4) return { error: "No usable data found. The file needs two number columns: time and intensity." };
  if (skipped > 0) notes.push(`${skipped} row${skipped === 1 ? "" : "s"} without two numbers skipped (for example a header).`);
  data.sort((a, b) => a[0] - b[0]);
  let minIdx = 0;
  for (let i = 1; i < data.length; i++) if (data[i][1] < data[minIdx][1]) minIdx = i;
  let scale: number;
  if (minIdx > 0) {
    const pre = data.slice(0, minIdx).reduce((s, d) => s + d[1], 0) / minIdx;
    scale = pre;
    notes.push(`Scaled so the ${minIdx} reading${minIdx === 1 ? "" : "s"} before the bleach average 1.`);
  } else {
    scale = Math.max(...data.map((d) => d[1]));
    notes.push("No pre-bleach readings found, so the largest value is taken as 1.");
  }
  if (!(scale > 0)) return { error: "The intensities are all zero or negative." };
  const t0 = data[minIdx][0];
  const points = data.slice(minIdx).map(([t, v]) => ({ t: t - t0, intensity: v / scale }));
  return { points, notes };
}
