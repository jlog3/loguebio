"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { LabStore, Snapshot } from "@/lib/store";

export const LabContext = createContext<LabStore | null>(null);

export function useStore(): LabStore {
  const s = useContext(LabContext);
  if (!s) throw new Error("useStore must be used inside <LabContext.Provider>");
  return s;
}

/** The current state of the lab; re-renders when it changes. */
export function useSnapshot(): Snapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
