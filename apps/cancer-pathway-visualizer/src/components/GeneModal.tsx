"use client";

import type { GeneResult } from "@/lib/types";

interface Props {
  gene: GeneResult | null;
  onClose: () => void;
}

const LINKS = (id: string) => [
  ["Ensembl", `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${id}`],
  ["GeneCards", `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${id}`],
  ["NCBI Gene", `https://www.ncbi.nlm.nih.gov/gene/?term=${id}`],
  ["UniProt", `https://www.uniprot.org/uniprotkb?query=${id}`],
];

export default function GeneModal({ gene, onClose }: Props) {
  if (!gene) return null;

  const fc = gene.log2FC;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-raised border border-w10 rounded-2xl p-7 max-w-[520px] w-[90%] max-h-[80vh] overflow-y-auto relative animate-fade-in"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white/25 hover:text-white/50 text-lg bg-transparent border-none cursor-pointer"
        >
          &times;
        </button>

        <div className="text-[9px] uppercase tracking-[0.2em] text-w25 mb-2">
          Gene Detail
        </div>
        <div className="text-xl font-mono text-gene-cyan font-medium mb-4">
          {gene.gene}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            {
              label: "log₂ Fold Change",
              value: fc,
              color: fc > 0 ? "#fb7185" : fc < 0 ? "#34d399" : "#fff",
            },
            {
              label: "Adjusted p-value",
              value: gene.padj < 0.001 ? gene.padj.toExponential(2) : gene.padj.toFixed(4),
              color: gene.padj < 0.05 ? "#22d3ee" : "rgba(255,255,255,0.25)",
            },
            { label: "Tumor Mean", value: gene.tumorMean, color: "#fff" },
            { label: "Normal Mean", value: gene.normalMean, color: "#fff" },
          ].map((item) => (
            <div key={item.label} className="bg-w02 rounded-lg p-3">
              <div className="text-[9px] text-w25 uppercase tracking-[0.1em]">
                {item.label}
              </div>
              <div
                className="text-lg font-mono mt-1"
                style={{ color: item.color }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sample-level counts */}
        {gene.tVals && gene.nVals && (
          <div className="mb-5">
            <div className="text-[10px] text-w25 mb-2 uppercase tracking-[0.1em]">
              Sample-Level Counts
            </div>
            <div className="flex gap-2 flex-wrap">
              {gene.tVals.map((v, i) => (
                <div
                  key={`t${i}`}
                  className="bg-gene-rose/[0.08] border border-gene-rose/[0.15] rounded-md px-2.5 py-1.5 text-[11px] font-mono"
                >
                  <span className="text-[9px] text-w25">T{i + 1}</span>{" "}
                  <span className="text-gene-rose">{v}</span>
                </div>
              ))}
              {gene.nVals.map((v, i) => (
                <div
                  key={`n${i}`}
                  className="bg-gene-emerald/[0.08] border border-gene-emerald/[0.15] rounded-md px-2.5 py-1.5 text-[11px] font-mono"
                >
                  <span className="text-[9px] text-w25">N{i + 1}</span>{" "}
                  <span className="text-gene-emerald">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External links */}
        <div className="text-[10px] text-w25 mb-2 uppercase tracking-[0.1em]">
          External Links
        </div>
        <div className="flex flex-wrap gap-2">
          {LINKS(gene.gene).map(([label, url]) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gene-cyan border border-gene-cyan/20 rounded-md px-2.5 py-1.5 no-underline flex items-center gap-1 hover:bg-gene-cyan/[0.06] transition-colors"
            >
              <svg
                width={11}
                height={11}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
