"use client";

import { useId, useRef, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/** ARIA tabs: arrow keys move between tabs, Tab moves into the open panel. */
export function Tabs({ label, tabs, current, onChange }: { label: string; tabs: TabDef[]; current: string; onChange: (id: string) => void }) {
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, tabs.findIndex((t) => t.id === current));
  const go = (i: number) => {
    const j = (i + tabs.length) % tabs.length;
    onChange(tabs[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div className="tabs">
      <div role="tablist" aria-label={label} className="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${uid}-tab-${t.id}`}
            aria-selected={i === idx}
            aria-controls={`${uid}-panel-${t.id}`}
            tabIndex={i === idx ? 0 : -1}
            className="tab"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(i + 1);
              else if (e.key === "ArrowLeft") go(i - 1);
              else if (e.key === "Home") go(0);
              else if (e.key === "End") go(tabs.length - 1);
              else return;
              e.preventDefault();
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={i !== idx}
          tabIndex={0}
          className="tabpanel"
        >
          {i === idx ? t.content : null}
        </div>
      ))}
    </div>
  );
}
