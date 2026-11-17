"use client";

import { useAccess } from "@repo/access";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { makeLook, type Look } from "@/lib/look";
import type { LabStore, Snapshot } from "@/lib/store";

export const LabContext = createContext<LabStore | null>(null);

export function useStore(): LabStore {
  const s = useContext(LabContext);
  if (!s) throw new Error("useStore must be used inside <LabContext.Provider>");
  return s;
}

export function useSnapshot(): Snapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Colours for drawing, from the shared palette and the page's CSS variables. */
export function useLook(): Look {
  const access = useAccess();
  const [look, setLook] = useState<Look>(() => makeLook({ paletteName: "standard", dark: false, highContrast: false, css: (_n, f) => f }));
  useEffect(() => {
    // read CSS variables after the settings have been applied to <html>
    const id = requestAnimationFrame(() => setLook(makeLook({ paletteName: access.paletteName, dark: access.dark, highContrast: access.highContrast, css: cssVar })));
    return () => cancelAnimationFrame(id);
  }, [access]);
  return look;
}


