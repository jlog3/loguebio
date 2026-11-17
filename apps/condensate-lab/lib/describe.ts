// Text versions of what the picture shows. The same words feed the visible
// summary, the screen-reader announcements, exported figure descriptions and
// the droplet list, so every route tells the same story.

import { SIGMA } from "./sim/engine";
import type { Droplet, LabEvent, Snapshot, Summary } from "./store";

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const PHASE_LABEL: Record<Summary["phase"], string> = {
  mixed: "Mixed",
  borderline: "Borderline",
  separated: "Phase-separated",
};

export const STATE_LABEL: Record<Droplet["state"], string> = {
  liquid: "Liquid",
  hardening: "Hardening",
  solid: "Solid",
};

/** One sentence on the overall state. */
export function headline(s: Summary): string {
  const solid = s.solidFraction > 0.02 ? ` ${pct(s.solidFraction)} of the protein has hardened into solid clumps.` : "";
  if (s.phase === "mixed") {
    return s.count === 0
      ? `Mixed: no droplets. The molecules are spread out evenly.${solid}`
      : `Mixed: only ${plural(s.count, "small chance clump")}, holding ${pct(s.fraction)} of the protein.${solid}`;
  }
  if (s.phase === "borderline") {
    return `Borderline: ${plural(s.count, "small droplet")} hold ${pct(s.fraction)} of the protein; droplets come and go.${solid}`;
  }
  return `Phase-separated: ${plural(s.count, "droplet")} hold ${pct(s.fraction)} of the protein.${solid}`;
}

export function trendSentence(s: Summary, running: boolean): string {
  if (s.trend === "unknown") return running ? "Still settling: watch for a few seconds." : "Run the simulation to see where it settles.";
  if (s.trend === "rising") return "More protein is joining droplets.";
  if (s.trend === "falling") return "Droplets are losing protein: they are shrinking or dissolving.";
  return "Steady: about the same amount of protein stays in droplets.";
}

export function rnaSentence(s: Summary): string | null {
  if (s.rnaTotal === 0) return null;
  return `${s.rnaInDroplets} of ${s.rnaTotal} RNA molecules (${pct(s.rnaInDroplets / s.rnaTotal)}) are inside droplets.`;
}

/** Size across, in molecule widths, for a compact droplet of this many molecules. */
export function acrossMolecules(d: Droplet): number {
  return Math.max(1, Math.round((2 * d.radius) / SIGMA));
}

export function describeDroplet(d: Droplet, index?: number, total?: number): string {
  const pos = index !== undefined && total !== undefined ? ` (${index + 1} of ${total})` : "";
  const state =
    d.state === "liquid" ? "liquid" : d.state === "solid" ? "solid" : `hardening, ${pct(d.solidFraction)} solid`;
  return `Droplet ${d.id}${pos}: ${plural(d.size, "molecule")} (${d.protein} protein, ${d.rna} RNA), ${state}, ${d.region}.`;
}

/** The complete text equivalent of the picture right now. */
export function fullDescription(snap: Snapshot): string {
  const parts = [headline(snap.summary), trendSentence(snap.summary, snap.running)];
  const rna = rnaSentence(snap.summary);
  if (rna) parts.push(rna);
  if (snap.droplets.length > 0) {
    const biggest = snap.droplets.slice(0, 3).map((d) => `droplet ${d.id} with ${d.size} molecules (${d.region})`);
    parts.push(`Largest: ${biggest.join("; ")}.`);
  }
  return parts.join(" ");
}

/**
 * A short spoken update from what changed since the last one: events first,
 * then the new total. Returns null when nothing worth saying happened.
 */
export function digest(events: LabEvent[], s: Summary, prev: { count: number; fraction: number } | null): string | null {
  const counts = { formed: 0, merged: 0, dissolved: 0, solidified: 0 };
  const info: string[] = [];
  for (const e of events) {
    if (e.kind === "info") info.push(e.text);
    else counts[e.kind]++;
  }
  const bits: string[] = [];
  if (counts.formed) bits.push(`${plural(counts.formed, "droplet")} formed`);
  if (counts.merged) bits.push(`${plural(counts.merged, "merge")}`);
  if (counts.dissolved) bits.push(`${plural(counts.dissolved, "droplet")} dissolved`);
  if (counts.solidified) bits.push(`${plural(counts.solidified, "droplet")} turned solid`);
  const changedTotal = !prev || prev.count !== s.count || Math.abs(prev.fraction - s.fraction) >= 0.1;
  if (bits.length === 0 && info.length === 0 && !changedTotal) return null;
  const out: string[] = [];
  if (info.length) out.push(info[info.length - 1]);
  if (bits.length) out.push(capitalise(bits.join(", ")) + ".");
  out.push(
    s.count === 0 ? "No droplets." : `${plural(s.count, "droplet")}, holding ${pct(s.fraction)} of the protein.`,
  );
  return out.join(" ");
}

function capitalise(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function formatTime(t: number): string {
  return t < 100 ? t.toFixed(1) : Math.round(t).toString();
}
