// Exports carry their meaning with them: every CSV starts with a comment line
// saying it is simulated data, and the map picture has a <title> and <desc>
// with the same text summary the page shows.

import { FATE_LABEL, FATE_SHAPE } from "./content";
import { fullDescription } from "./describe";
import { contourSegments, shapeSvg, type Look } from "./look";
import { EXTENT, sampleGrid, VALLEY_ANGLES } from "./model/landscape";
import { changesSentence, GENE_NAMES, LINEAGES, type GeneName } from "./model/params";
import { expressionAlongPseudotime, regionName } from "./model/stats";
import type { Snapshot } from "./store";

const NOTE = "# Simulated cells from Waddington Explorer (a simplified teaching model). Not measurements of real cells.";

function cell(v: string | number | boolean | null): string {
  if (v === null) return "";
  const s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(header: string[], rows: (string | number | boolean | null)[][], note: string): string {
  return [note, header.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n") + "\n";
}

function settingsLine(snap: Snapshot) {
  return `# Settings: ${changesSentence(snap.params)}; randomness ${snap.params.noise}; ${snap.params.cellCount} cells; seed ${snap.params.seed}`;
}

export function cellsCsv(snap: Snapshot): string {
  return csv(
    ["cell", "fate", "pseudotime", "true_age", "left_summit_at_age", "map_x", "map_y", "region", ...GENE_NAMES, "velocity_x_estimated", "velocity_y_estimated", "downhill_x_true", "downhill_y_true"],
    snap.pop.cells.map((c) => [c.id, c.fate, c.pseudotime, c.age, c.committedAt, c.x, c.y, regionName(c.x, c.y), ...c.expr, c.evx, c.evy, c.vx, c.vy]),
    `${NOTE}\n${settingsLine(snap)}\n# Pseudotime is inferred from gene levels (12-neighbour graph from cell ${snap.pop.rootId}); true age is known only because this is a simulation.`,
  );
}

export function fatesCsv(snap: Snapshot): string {
  return csv(
    ["fate", "cells", "share", "change_vs_normal_points", "branch_point_pseudotime", "median_pseudotime", "marker_mean"],
    snap.stats.map((s) => [s.fate, s.count, s.share, s.deltaPoints, s.branchPoint, s.medianPseudotime, s.markerMean]),
    `${NOTE}\n${settingsLine(snap)}`,
  );
}

export function expressionCsv(snap: Snapshot, gene: GeneName): string {
  const rows: (string | number)[][] = [];
  for (const s of expressionAlongPseudotime(snap.pop.cells, gene)) for (const p of s.points) rows.push([s.fate, p.x, p.y, p.n]);
  return csv(["fate", "pseudotime_bin_centre", `${gene}_mean`, "cells_in_bin"], rows, `${NOTE}\n${settingsLine(snap)}\n# Bins of 0.05 pseudotime; bins with fewer than 5 cells are left out.`);
}

export function settingsJson(snap: Snapshot): string {
  return JSON.stringify(
    { app: "Waddington Explorer", note: "Settings for a simplified simulation. Load this file to get the same cells: the same seed and settings give the same run.", params: snap.params },
    null,
    2,
  );
}

function esc(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The map as SVG: contour lines, cells by shape and colour, valley names, and a full text description. */
export function mapSvg(snap: Snapshot, look: Look): string {
  const S = 30; // pixels per map unit
  const W = 2 * EXTENT * S;
  const X = (x: number) => (x + EXTENT) * S;
  const Y = (y: number) => (EXTENT - y) * S;
  const n = 81;
  const { heights, min, max } = sampleGrid(snap.pop.terrain, n);
  const levels: number[] = [];
  for (let L = Math.ceil(min); L <= Math.floor(max); L++) levels.push(L + 0.001);
  const g = (2 * EXTENT) / (n - 1);
  const lines = contourSegments(heights, n, levels)
    .map((c) => {
      let d = "";
      for (let k = 0; k < c.segs.length; k += 4) d += `M${X(-EXTENT + c.segs[k] * g).toFixed(1)} ${Y(-EXTENT + c.segs[k + 1] * g).toFixed(1)}L${X(-EXTENT + c.segs[k + 2] * g).toFixed(1)} ${Y(-EXTENT + c.segs[k + 3] * g).toFixed(1)}`;
      return d ? `<path d="${d}" fill="none" stroke="${look.muted}" stroke-opacity="0.4"/>` : "";
    })
    .join("");
  const cells = snap.pop.cells
    .filter((c) => c.pseudotime !== null && c.pseudotime <= snap.cursor + 1e-9)
    .map((c) => shapeSvg(c.fate, X(c.x), Y(c.y), 4.2, look.fate[c.fate], look.outline, 0.7))
    .join("");
  const labels = LINEAGES.map((f) => `<text x="${X(8.9 * Math.cos(VALLEY_ANGLES[f])).toFixed(0)}" y="${Y(8.9 * Math.sin(VALLEY_ANGLES[f])).toFixed(0)}" font-size="16" font-family="system-ui, sans-serif" text-anchor="middle" fill="${look.ink}">${FATE_LABEL[f]}</text>`).join("");
  const legend = (["stem", ...LINEAGES] as const).map((f) => `${FATE_LABEL[f]} = ${FATE_SHAPE[f]}`).join(", ");
  const title = `Waddington Explorer map: ${snap.visible} cells, ${changesSentence(snap.params)}`;
  const desc = `${fullDescription(snap)} The landscape seen from above: contour lines join points of equal height; the summit is in the middle. Shapes: ${legend}. Simulated cells from a simplified model.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc><rect width="100%" height="100%" fill="${look.paper}"/>${lines}${cells}${labels}</svg>`;
}

/** Saves text as a file on the person's device. Nothing is uploaded. */
export function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
