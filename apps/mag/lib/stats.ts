import type { BoxplotStats, TestResult } from "./types";

// ── Gamma & incomplete gamma functions ────────────────────────────────────────
function gamma(z: number): number {
  if (z < 0.5)
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function lnGamma(z: number): number {
  return Math.log(gamma(z));
}

function lowerGamma(s: number, x: number): number {
  let sum = 0;
  let term = 1 / s;
  for (let n = 0; n < 200; n++) {
    sum += term;
    term *= x / (s + n + 1);
    if (Math.abs(term) < 1e-12) break;
  }
  return sum * Math.pow(x, s) * Math.exp(-x);
}

function chiSquaredCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return lowerGamma(k / 2, x / 2) / gamma(k / 2);
}

function betaCF(x: number, a: number, b: number): number {
  const qab = a + b,
    qap = a + 1,
    qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

function betaRegularized(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betaCF(x, a, b)) / a;
  return 1 - (bt * betaCF(1 - x, b, a)) / b;
}

function fDistCDF(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  const t = (d1 * x) / (d1 * x + d2);
  return betaRegularized(t, d1 / 2, d2 / 2);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Kruskal-Wallis H test (non-parametric one-way ANOVA) */
export function kruskalWallis(groups: number[][]): TestResult {
  const allValues: { v: number; g: number; rank: number }[] = [];
  groups.forEach((g, gi) => g.forEach((v) => allValues.push({ v, g: gi, rank: 0 })));
  allValues.sort((a, b) => a.v - b.v);
  allValues.forEach((item, i) => (item.rank = i + 1));

  // Handle ties
  let i = 0;
  while (i < allValues.length) {
    let j = i;
    while (j < allValues.length && allValues[j].v === allValues[i].v) j++;
    const avgRank =
      allValues.slice(i, j).reduce((s, x) => s + x.rank, 0) / (j - i);
    for (let k = i; k < j; k++) allValues[k].rank = avgRank;
    i = j;
  }

  const N = allValues.length;
  const groupRanks = groups.map((_, gi) =>
    allValues.filter((x) => x.g === gi)
  );
  let H = 0;
  groupRanks.forEach((gr) => {
    if (gr.length === 0) return;
    const Ri = gr.reduce((s, x) => s + x.rank, 0);
    H += (Ri * Ri) / gr.length;
  });
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  const df = groups.filter((g) => g.length > 0).length - 1;
  if (df <= 0) return { statistic: 0, p: 1 };
  const p = 1 - chiSquaredCDF(H, df);
  return { statistic: Math.max(0, H), p: Math.max(0, Math.min(1, p)) };
}

/** Welch's ANOVA (unequal variances one-way ANOVA) */
export function welchANOVA(groups: number[][]): TestResult {
  const filtered = groups.filter((g) => g.length > 1);
  if (filtered.length < 2) return { statistic: 0, p: 1 };

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const means = filtered.map(mean);
  const vars = filtered.map((g) => {
    const m = mean(g);
    return g.reduce((s, v) => s + (v - m) ** 2, 0) / (g.length - 1);
  });
  const ns = filtered.map((g) => g.length);
  const weights = ns.map((n, i) => n / vars[i]);
  const totalW = weights.reduce((s, w) => s + w, 0);
  const grandMean =
    weights.reduce((s, w, i) => s + w * means[i], 0) / totalW;
  const k = filtered.length;

  let Fnum = 0;
  weights.forEach((w, i) => (Fnum += w * (means[i] - grandMean) ** 2));
  Fnum /= k - 1;

  let lambda = 0;
  weights.forEach((w, i) => {
    lambda += (1 - w / totalW) ** 2 / (ns[i] - 1);
  });
  lambda *= 3 / (k * k - 1);

  const F = Fnum / (1 + (2 * (k - 2) * lambda) / (k * k - 1));
  const df2 = 1 / lambda;
  const p = 1 - fDistCDF(F, k - 1, df2);

  return { statistic: Math.max(0, F), p: Math.max(0, Math.min(1, p)) };
}

/** Compute boxplot statistics (quartiles, whiskers, outliers) */
export function computeBoxplotStats(values: number[]): BoxplotStats | null {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lower = Math.max(sorted[0], q1 - 1.5 * iqr);
  const upper = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
  const outliers = sorted.filter((v) => v < lower || v > upper);
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  return { q1, median, q3, lower, upper, min: sorted[0], max: sorted[n - 1], outliers, mean };
}

/** Classify MAG quality per MIMAG standards */
export function classifyQuality(
  completeness: number,
  contamination: number
): "High" | "Medium" | "Low" {
  if (completeness > 90 && contamination < 5) return "High";
  if (completeness > 50 && contamination < 10) return "Medium";
  return "Low";
}
