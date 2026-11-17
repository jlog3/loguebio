// Colours and shapes for each fate, used by every picture, the legend and the
// exports. Colours come from the shared palette; each fate also has its own
// shape, so colour is never the only clue.

import { categoryColors, cividis, type PaletteName } from "@repo/access";
import type { Fate } from "./model/params";

/** Index into the shared category palette for each lineage. */
const PALETTE_INDEX: Record<Exclude<Fate, "stem">, number> = { neuron: 0, blood: 1, muscle: 2, glia: 3 };

export interface Look {
  fate: Record<Fate, string>;
  /** Outline drawn round every marker, so light colours still stand out from the background. */
  outline: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  grid: string;
  contour: string;
  dark: boolean;
  highContrast: boolean;
}

export function makeLook(p: { paletteName: PaletteName; dark: boolean; highContrast: boolean; css: (n: string, f: string) => string }): Look {
  const cat = categoryColors(p.paletteName, p.dark);
  const muted = p.css("--muted", p.dark ? "#b3bcc8" : "#4b5563");
  return {
    fate: {
      stem: muted,
      neuron: cat[PALETTE_INDEX.neuron],
      glia: cat[PALETTE_INDEX.glia],
      muscle: cat[PALETTE_INDEX.muscle],
      blood: cat[PALETTE_INDEX.blood],
    },
    outline: p.dark ? "#000000" : "#1a1d21",
    paper: p.css("--canvas", p.dark ? "#0d1013" : "#fbfaf7"),
    ink: p.css("--ink", p.dark ? "#eceff3" : "#1a1d21"),
    muted,
    accent: p.css("--accent", p.dark ? "#7cc0ff" : "#0b5fa5"),
    grid: p.css("--grid", p.dark ? "#222831" : "#e5e3dc"),
    contour: p.dark ? "rgba(236,239,243,0.22)" : "rgba(26,29,33,0.2)",
    dark: p.dark,
    highContrast: p.highContrast,
  };
}

/** Sequential colour for pseudotime, age or gene level (cividis: readable with any colour vision). */
export const scaleColor = cividis;

/** Draws a fate's shape centred at (x, y) with radius r on a 2D canvas. */
export function drawShape(ctx: CanvasRenderingContext2D, fate: Fate, x: number, y: number, r: number) {
  ctx.beginPath();
  switch (fate) {
    case "stem":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case "neuron":
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.05, y + r * 0.75);
      ctx.lineTo(x - r * 1.05, y + r * 0.75);
      ctx.closePath();
      break;
    case "glia":
      ctx.moveTo(x, y - r * 1.25);
      ctx.lineTo(x + r * 1.05, y);
      ctx.lineTo(x, y + r * 1.25);
      ctx.lineTo(x - r * 1.05, y);
      ctx.closePath();
      break;
    case "muscle":
      ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
      break;
    case "blood": {
      const a = r * 1.15;
      const b = r * 0.42;
      ctx.moveTo(x - b, y - a);
      ctx.lineTo(x + b, y - a);
      ctx.lineTo(x + b, y - b);
      ctx.lineTo(x + a, y - b);
      ctx.lineTo(x + a, y + b);
      ctx.lineTo(x + b, y + b);
      ctx.lineTo(x + b, y + a);
      ctx.lineTo(x - b, y + a);
      ctx.lineTo(x - b, y + b);
      ctx.lineTo(x - a, y + b);
      ctx.lineTo(x - a, y - b);
      ctx.lineTo(x - b, y - b);
      ctx.closePath();
      break;
    }
  }
}

/** The same shapes as SVG markup (for legends and exported figures). */
export function shapeSvg(fate: Fate, x: number, y: number, r: number, fill: string, stroke: string, sw = 1): string {
  const f = (n: number) => n.toFixed(1);
  let d = "";
  switch (fate) {
    case "stem":
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "neuron":
      d = `M${f(x)} ${f(y - r * 1.2)}L${f(x + r * 1.05)} ${f(y + r * 0.75)}L${f(x - r * 1.05)} ${f(y + r * 0.75)}Z`;
      break;
    case "glia":
      d = `M${f(x)} ${f(y - r * 1.25)}L${f(x + r * 1.05)} ${f(y)}L${f(x)} ${f(y + r * 1.25)}L${f(x - r * 1.05)} ${f(y)}Z`;
      break;
    case "muscle":
      return `<rect x="${f(x - r * 0.9)}" y="${f(y - r * 0.9)}" width="${f(r * 1.8)}" height="${f(r * 1.8)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case "blood": {
      const a = r * 1.15;
      const b = r * 0.42;
      d = `M${f(x - b)} ${f(y - a)}H${f(x + b)}V${f(y - b)}H${f(x + a)}V${f(y + b)}H${f(x + b)}V${f(y + a)}H${f(x - b)}V${f(y + b)}H${f(x - a)}V${f(y - b)}H${f(x - b)}Z`;
      break;
    }
  }
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

/** Contour segments of a height grid (marching squares), in grid coordinates. */
export function contourSegments(heights: Float32Array, n: number, levels: number[]): { level: number; segs: number[] }[] {
  return levels.map((L) => {
    const segs: number[] = [];
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = heights[j * n + i];
        const b = heights[j * n + i + 1];
        const c = heights[(j + 1) * n + i + 1];
        const d = heights[(j + 1) * n + i];
        const pts: number[] = [];
        const edge = (h1: number, h2: number, x1: number, y1: number, x2: number, y2: number) => {
          if (h1 < L !== h2 < L) {
            const t = (L - h1) / (h2 - h1);
            pts.push(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
          }
        };
        edge(a, b, i, j, i + 1, j);
        edge(b, c, i + 1, j, i + 1, j + 1);
        edge(c, d, i + 1, j + 1, i, j + 1);
        edge(d, a, i, j + 1, i, j);
        if (pts.length >= 4) segs.push(pts[0], pts[1], pts[2], pts[3]);
        if (pts.length === 8) segs.push(pts[4], pts[5], pts[6], pts[7]);
      }
    }
    return { level: L, segs };
  });
}
