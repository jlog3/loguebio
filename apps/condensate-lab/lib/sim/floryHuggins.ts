// Textbook Flory-Huggins theory for a symmetric two-part mixture.
// Free energy of mixing per site, in units of kT:
//   f(φ) = φ ln φ + (1 − φ) ln(1 − φ) + χ φ (1 − φ)
// φ is the share of space taken by the sticky molecules (0–1).
// Above the critical value χc = 2 the curve has two dips (two stable phases).

export const CRITICAL_CHI = 2;

export function freeEnergy(phi: number, chi: number): number {
  return phi * Math.log(phi) + (1 - phi) * Math.log(1 - phi) + chi * phi * (1 - phi);
}

export function freeEnergyCurve(chi: number, steps = 98): { phi: number; f: number }[] {
  const out: { phi: number; f: number }[] = [];
  for (let k = 1; k <= steps; k++) {
    const phi = k / (steps + 1);
    out.push({ phi: Number(phi.toFixed(4)), f: freeEnergy(phi, chi) });
  }
  return out;
}

/** Spinodal: where the curve bends the other way (f'' = 0). Inside it, a mix separates at once. */
export function spinodal(chi: number): { low: number; high: number } | null {
  if (chi <= CRITICAL_CHI) return null;
  const d = Math.sqrt(1 - 2 / chi);
  return { low: (1 - d) / 2, high: (1 + d) / 2 };
}

/**
 * Binodal (coexistence): the two compositions the mixture splits into.
 * For the symmetric model they satisfy ln(φ / (1 − φ)) = χ(2φ − 1).
 */
export function binodal(chi: number): { low: number; high: number } | null {
  if (chi <= CRITICAL_CHI) return null;
  const g = (phi: number) => Math.log(phi / (1 - phi)) - chi * (2 * phi - 1);
  // g → −∞ at 0, g(0.5) = 0, and g > 0 just below 0.5 when χ > 2; bisect on (1e-12, spinodal low)
  let lo = 1e-12;
  let hi = spinodal(chi)!.low;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (g(mid) < 0) lo = mid;
    else hi = mid;
  }
  const low = (lo + hi) / 2;
  return { low, high: 1 - low };
}

export type TheoryVerdict = "mixed" | "metastable" | "unstable";

/** Where a mixture of composition φ sits for a given χ. */
export function classify(phi: number, chi: number): TheoryVerdict {
  const b = binodal(chi);
  if (!b || phi <= b.low || phi >= b.high) return "mixed";
  const s = spinodal(chi)!;
  return phi > s.low && phi < s.high ? "unstable" : "metastable";
}
