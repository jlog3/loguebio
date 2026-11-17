"use client";

import { categoryColors, useAccess } from "@repo/access";
import { useEffect, useState } from "react";

export interface ThemeColors {
  protein: string;
  rna: string;
  solid: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  grid: string;
  /** Outline width multiplier (thicker in high contrast). */
  stroke: number;
}

const FALLBACK: ThemeColors = {
  protein: "#0072B2",
  rna: "#D55E00",
  solid: "#009E73",
  paper: "#FBFAF7",
  ink: "#1A1D21",
  muted: "#4B5563",
  accent: "#0B5FA5",
  grid: "#E5E3DC",
  stroke: 1,
};

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Colours for drawing (canvas, SVG), from the shared palette and the page's CSS variables. */
export function useThemeColors(): ThemeColors {
  const access = useAccess();
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);
  useEffect(() => {
    // CSS variables change with the data attributes applied by the settings; read them after they apply.
    const id = requestAnimationFrame(() => {
      const cat = categoryColors(access.paletteName, access.dark);
      setColors({
        protein: cat[0],
        rna: cat[1],
        solid: cat[2],
        paper: cssVar("--canvas", FALLBACK.paper),
        ink: cssVar("--ink", FALLBACK.ink),
        muted: cssVar("--muted", FALLBACK.muted),
        accent: cssVar("--accent", FALLBACK.accent),
        grid: cssVar("--grid", FALLBACK.grid),
        stroke: access.highContrast ? 2 : 1,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [access]);
  return colors;
}
