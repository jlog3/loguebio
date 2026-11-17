// Exports carry their meaning with them: every CSV starts with a comment line
// saying it is simulated data from a simplified model, and the SVG picture has
// a <title> and <desc> with the same text summary the page shows.

import { fullDescription, pct } from "./describe";
import { KIND_RNA, SIGMA, WORLD_H, WORLD_W, type World } from "./sim/engine";
import type { FrapRun, ImportedFrap, Scan, Snapshot } from "./store";

const NOTE = "# Simulated data from Condensate Lab (a simplified 2D model; arbitrary units). Not experimental measurements.";

function csvCell(v: string | number | boolean | null): string {
  if (v === null) return "";
  const s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(header: string[], rows: (string | number | boolean | null)[][], note = NOTE): string {
  return [note, header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
}

function paramsLine(snap: Snapshot): string {
  const p = snap.params;
  return `# Settings: stickiness ${p.chi}, temperature ${p.temperature}, protein ${p.proteinCount}, RNA ${p.multiComponent ? p.rnaCount : 0}, pH ${p.pH}, crowding ${p.crowding}, disease mode ${p.diseaseMode ? "on" : "off"}, seed ${p.seed}`;
}

export function dropletsCsv(snap: Snapshot): string {
  return csv(
    ["droplet", "molecules", "protein", "rna", "state", "solid_fraction", "centre_x", "centre_y", "radius", "region"],
    snap.droplets.map((d) => [d.id, d.size, d.protein, d.rna, d.state, d.solidFraction, d.cx, d.cy, d.radius, d.region]),
    `${NOTE}\n${paramsLine(snap)}\n# Time ${snap.time.toFixed(1)}`,
  );
}

export function historyCsv(snap: Snapshot): string {
  return csv(
    ["time", "protein_in_droplets_fraction", "droplets", "largest_droplet", "solid_protein_fraction"],
    snap.history.map((h) => [h.t, h.fraction, h.count, h.largest, h.solidFraction]),
    `${NOTE}\n${paramsLine(snap)}`,
  );
}

export function frapCsv(run: FrapRun): string {
  return csv(
    ["time_since_bleach", "relative_intensity"],
    run.points.map((p) => [p.t, p.intensity]),
    `${NOTE}\n# FRAP on droplet ${run.dropletId} (${run.stateAtBleach} when bleached). Intensity is the spot divided by the whole droplet (double normalised).`,
  );
}

export function importedCsv(imp: ImportedFrap): string {
  return csv(
    ["time_since_bleach", "relative_intensity"],
    imp.points.map((p) => [p.t, p.intensity]),
    `# Your data from ${imp.name}, rescaled by Condensate Lab. ${imp.notes.join(" ")}`,
  );
}

export function scanCsv(scan: Scan): string {
  return csv(
    [scan.key, "protein_in_droplets_mean", "lowest", "highest"],
    scan.points.map((p) => [p.value, p.fraction, p.min, p.max]),
    `${NOTE}\n# Threshold scan: each value run twice from different random starts for 500 time units.`,
  );
}

export function settingsJson(snap: Snapshot): string {
  return JSON.stringify(
    {
      app: "Condensate Lab",
      note: "Settings for a simplified simulation. Load this file to reproduce the run: the same seed and settings give the same start.",
      params: snap.params,
    },
    null,
    2,
  );
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The current picture as SVG, with shapes per kind and a full text description. */
export function pictureSvg(world: World, snap: Snapshot, colors: { protein: string; rna: string; solid: string; ink: string; paper: string }): string {
  const r = SIGMA / 2 - 0.5;
  const parts: string[] = [];
  for (let i = 0; i < world.n; i++) {
    const x = world.x[i].toFixed(1);
    const y = world.y[i].toFixed(1);
    const bleached = world.bleached[i] === 1;
    if (world.solid[i]) {
      const s = r * 1.7;
      parts.push(`<rect x="${(world.x[i] - s / 2).toFixed(1)}" y="${(world.y[i] - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${bleached ? "none" : colors.solid}" stroke="${colors.solid}"/>`);
    } else if (world.kind[i] === KIND_RNA) {
      const cx = world.x[i];
      const cy = world.y[i];
      const pts = `${cx.toFixed(1)},${(cy - r * 1.15).toFixed(1)} ${(cx + r).toFixed(1)},${(cy + r * 0.75).toFixed(1)} ${(cx - r).toFixed(1)},${(cy + r * 0.75).toFixed(1)}`;
      parts.push(`<polygon points="${pts}" fill="${bleached ? "none" : colors.rna}" stroke="${colors.rna}"/>`);
    } else {
      parts.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${bleached ? "none" : colors.protein}" stroke="${colors.protein}"/>`);
    }
  }
  const halos = snap.droplets
    .map(
      (d) =>
        `<circle cx="${d.cx.toFixed(1)}" cy="${d.cy.toFixed(1)}" r="${d.radius.toFixed(1)}" fill="none" stroke="${colors.ink}" stroke-dasharray="4 3" opacity="0.6"/><text x="${d.cx.toFixed(1)}" y="${(d.cy - d.radius - 3).toFixed(1)}" font-size="10" text-anchor="middle" fill="${colors.ink}">${d.id}</text>`,
    )
    .join("");
  const title = `Condensate Lab at time ${snap.time.toFixed(0)}: ${snap.summary.count} droplets, ${pct(snap.summary.fraction)} of protein in droplets`;
  const desc = `${fullDescription(snap)} Circles are protein, triangles are RNA, squares are solid (hardened) protein, hollow shapes are bleached. Dashed rings mark droplets, numbered. Simulated with a simplified 2D model; arbitrary units.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD_W} ${WORLD_H}" width="${WORLD_W * 2}" height="${WORLD_H * 2}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc><rect width="100%" height="100%" fill="${colors.paper}"/>${parts.join("")}${halos}</svg>`;
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
