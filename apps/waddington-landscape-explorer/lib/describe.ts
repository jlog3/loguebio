// Text versions of what the pictures show. The same words feed the visible
// summary, the screen-reader announcements, exported figure descriptions and
// the cell list, so every route tells the same story.

import { FATE_LABEL, FATE_SHAPE } from "./content";
import { relativeDepths } from "./model/landscape";
import { changesSentence, FATES, GENE_NAMES, isNormal, type Fate, type Lineage } from "./model/params";
import type { Cell } from "./model/simulate";
import { ageAgreement, branchOrder, MARKER, regionName } from "./model/stats";
import type { Snapshot } from "./store";

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const fmt = (x: number | null, d = 2) => (x === null ? "not reached" : x.toFixed(d));

const LOWER: Record<Fate, string> = { stem: "undecided", neuron: "neuron", glia: "glia", muscle: "muscle", blood: "blood" };

export function depthWord(rel: number): string {
  if (rel < 0.05) return "gone";
  if (rel < 0.8) return "shallower than normal";
  if (rel <= 1.2) return "normal depth";
  return "deeper than normal";
}

/** One-sentence summary of the fate shares. */
export function fateSentence(snap: Snapshot): string {
  // fates with no cells are still named: "neuron 0%" is the result of a knockout
  const parts = snap.stats
    .filter((s) => s.count > 0 || s.fate !== "stem")
    .map((s) => `${LOWER[s.fate]} ${pct(s.share)}${s.deltaPoints !== null && Math.abs(s.deltaPoints) >= 1 && !isNormal(snap.params) ? ` (${s.deltaPoints > 0 ? "+" : ""}${Math.round(s.deltaPoints)} vs normal)` : ""}`);
  return `${snap.pop.cells.length} cells: ${parts.join(", ")}.`;
}

export function landscapeSentence(snap: Snapshot): string {
  const rel = relativeDepths(snap.pop.terrain, snap.normal.terrain);
  const order: Lineage[] = ["neuron", "glia", "muscle", "blood"];
  if (isNormal(snap.params)) return "The landscape: a summit in the middle and four valleys of normal depth, neurons and glia on one side, muscle and blood on the other.";
  const parts = order.map((f) => `${LOWER[f]} valley ${depthWord(rel[f])}`);
  const t = snap.pop.terrain.tilt;
  const tilt = Math.abs(t) > 0.05 ? ` The surface tilts towards ${t > 0 ? "muscle and blood" : "neurons and glia"}.` : "";
  const hollowRel = snap.normal.terrain.summitHollow > 0 ? snap.pop.terrain.summitHollow / snap.normal.terrain.summitHollow : 0;
  const hollow = hollowRel < 0.05 ? " No hollow on the summit: cells leave it quickly." : hollowRel > 1.2 ? " A deeper hollow on the summit holds cells back." : "";
  return `The landscape: ${parts.join(", ")}.${tilt}${hollow}`;
}

export function cursorSentence(snap: Snapshot): string {
  if (snap.cursor >= 0.999) return `Showing all ${snap.visible} cells.`;
  return `Pseudotime up to ${snap.cursor.toFixed(2)}: ${snap.visible} of ${snap.pop.cells.length} cells shown (those this far along).`;
}

export function branchSentence(snap: Snapshot): string {
  const order = branchOrder(snap.stats);
  if (order.length === 0) return "No branches have formed.";
  return `Branches split off in this order: ${order.map((s) => `${LOWER[s.fate]} at ${fmt(s.branchPoint)}`).join(", ")} (pseudotime).`;
}

/** The complete text equivalent of the current view. */
export function fullDescription(snap: Snapshot): string {
  return [
    `Settings: ${changesSentence(snap.params)}.`,
    fateSentence(snap),
    landscapeSentence(snap),
    branchSentence(snap),
    cursorSentence(snap),
  ].join(" ");
}

export function describeCell(c: Cell, opts: { position?: [number, number]; branch?: Fate } = {}): string {
  const top = GENE_NAMES.map((g, i) => ({ g, v: c.expr[i] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((x) => `${x.g} ${pct(x.v)}`)
    .join(", ");
  const pos = opts.position ? ` (${opts.position[0]} of ${opts.position[1]} along the ${LOWER[opts.branch ?? c.fate]} branch)` : "";
  return `Cell ${c.id}${pos}: ${FATE_LABEL[c.fate].toLowerCase()}, ${FATE_SHAPE[c.fate]}; pseudotime ${fmt(c.pseudotime)}, true age ${c.age.toFixed(2)}; ${regionName(c.x, c.y)}; highest genes ${top}.`;
}

export function markerOf(f: Fate) {
  return MARKER[f];
}

export function agreementSentence(snap: Snapshot): string {
  const rho = ageAgreement(snap.pop.cells);
  if (rho === null) return "Not enough cells to compare pseudotime with true age.";
  const word = rho > 0.9 ? "closely" : rho > 0.7 ? "fairly well" : rho > 0.4 ? "loosely" : "poorly";
  return `Pseudotime follows true age ${word} (rank correlation ${rho.toFixed(2)}; 1 would be a perfect match).${snap.pop.unreached ? ` ${snap.pop.unreached} cells could not be placed (not enough similar cells).` : ""}`;
}

export function fateLabel(f: Fate) {
  return FATE_LABEL[f];
}

export { FATES };
