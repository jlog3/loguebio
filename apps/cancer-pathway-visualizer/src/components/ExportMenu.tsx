"use client";

import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import type { GeneResult, ExportFormat } from "@/lib/types";
import { exportData, copyToClipboard, geneIdList } from "@/lib/export";

interface Props {
  results: GeneResult[];
  filteredResults: GeneResult[];
  onToast: (msg: string) => void;
}

export default function ExportMenu({ results, filteredResults, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sigOnly = useMemo(
    () => results.filter((r) => r.significant),
    [results]
  );

  const doExport = (data: GeneResult[], format: ExportFormat, suffix: string) => {
    exportData(data, format, suffix);
    onToast(`Exported ${data.length} genes as ${format.toUpperCase()}`);
    setOpen(false);
  };

  const doCopy = (data: GeneResult[], label: string) => {
    copyToClipboard(geneIdList(data));
    onToast(`Copied ${data.length} ${label} gene IDs`);
    setOpen(false);
  };

  const downloadSets: [string, string, GeneResult[]][] = [
    ["All results", "results", results],
    ["Significant only", "significant", sigOnly],
    ["Current view", "filtered", filteredResults],
  ];

  const copySets: [string, GeneResult[]][] = [
    ["All gene IDs", results],
    ["Upregulated IDs", results.filter((r) => r.direction === "up")],
    ["Downregulated IDs", results.filter((r) => r.direction === "down")],
    ["Significant IDs", sigOnly],
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3.5 py-2 text-[11px] text-w25 bg-transparent border border-w05 rounded-lg cursor-pointer font-mono hover:border-white/[0.12] hover:text-w40 transition-colors"
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-surface-overlay border border-w10 rounded-xl p-1.5 min-w-[240px] z-[60] shadow-2xl animate-fade-in">
          {/* Downloads */}
          <div className="text-[9px] text-w15 px-2.5 py-1.5 uppercase tracking-[0.15em]">
            Download Results
          </div>
          {downloadSets.map(([label, suffix, data]) => (
            <Fragment key={suffix}>
              {(["csv", "tsv", "json"] as ExportFormat[]).map((fmt) => (
                <button
                  key={`${suffix}-${fmt}`}
                  onClick={() => doExport(data, fmt, suffix)}
                  className="block w-full text-left px-2.5 py-1.5 text-[11px] text-w40 bg-transparent border-none cursor-pointer font-mono rounded hover:bg-w02 transition-colors"
                >
                  {label} · {fmt.toUpperCase()} ({data.length})
                </button>
              ))}
            </Fragment>
          ))}

          {/* Divider */}
          <div className="border-t border-w05 my-1" />

          {/* Clipboard */}
          <div className="text-[9px] text-w15 px-2.5 py-1.5 uppercase tracking-[0.15em]">
            Copy Gene Lists
          </div>
          {copySets.map(([label, data]) => (
            <button
              key={label}
              onClick={() => doCopy(data, label.toLowerCase())}
              className="flex items-center gap-1.5 w-full text-left px-2.5 py-1.5 text-[11px] text-w40 bg-transparent border-none cursor-pointer font-mono rounded hover:bg-w02 transition-colors"
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {label} ({data.length})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
