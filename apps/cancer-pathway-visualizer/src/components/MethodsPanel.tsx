"use client";

import { useState } from "react";
import type { GeneResult } from "@/lib/types";
import { copyToClipboard } from "@/lib/export";

interface Props {
  results: GeneResult[];
  onToast: (msg: string) => void;
}

export default function MethodsPanel({ results, onToast }: Props) {
  const [open, setOpen] = useState(false);

  const nTumor = results[0]?.tVals?.length ?? "?";
  const nNormal = results[0]?.nVals?.length ?? "?";
  const nSig = results.filter((r) => r.significant).length;
  const nUp = results.filter((r) => r.direction === "up").length;
  const nDown = results.filter((r) => r.direction === "down").length;

  const text = `Differential expression analysis was performed using a Welch's t-test comparing tumor (n=${nTumor}) and normal (n=${nNormal}) samples. Log2 fold changes were calculated as log2((mean_tumor + 1) / (mean_normal + 1)). P-values were corrected for multiple testing using the Benjamini-Hochberg procedure. Genes with |log2FC| > 1 and adjusted p-value < 0.05 were considered differentially expressed. Of ${results.length} genes analyzed, ${nSig} were significantly differentially expressed (${nUp} upregulated, ${nDown} downregulated).`;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-w25 bg-transparent border-none cursor-pointer font-mono p-0 hover:text-w40 transition-colors"
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {open ? "Hide" : "Show"} methods summary
      </button>

      {open && (
        <div className="mt-2.5 bg-w02 border border-w05 rounded-xl p-4 animate-fade-in">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[9px] text-w25 uppercase tracking-[0.15em]">
              Methods (copy for manuscript)
            </div>
            <button
              onClick={() => {
                copyToClipboard(text);
                onToast("Methods text copied");
              }}
              className="flex items-center gap-1 text-[10px] text-gene-cyan bg-transparent border border-gene-cyan/20 rounded-md px-2 py-0.5 cursor-pointer font-mono hover:bg-gene-cyan/[0.06] transition-colors"
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Copy
            </button>
          </div>
          <p className="text-xs text-w40 leading-relaxed m-0">{text}</p>
        </div>
      )}
    </div>
  );
}
