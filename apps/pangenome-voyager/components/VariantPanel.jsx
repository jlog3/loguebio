"use client";

import { VARIANT_COLORS } from "@/lib/data";

export default function VariantPanel({ variant, onClose }) {
  if (!variant) return null;

  return (
    <div className="glass-panel absolute top-3 right-3 w-72 p-4 z-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span
          className="font-bold text-sm font-mono"
          style={{ color: VARIANT_COLORS[variant.type] || "#fff" }}
        >
          {variant.label}
        </span>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-gray-500 cursor-pointer text-lg hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Details */}
      <div className="text-xs leading-relaxed font-mono text-gray-400 space-y-1">
        <div>
          <span className="text-gray-600">Type:</span> {variant.type}
        </div>
        <div>
          <span className="text-gray-600">Pop. Freq:</span>{" "}
          {(variant.popFreq * 100).toFixed(1)}%
        </div>
        <div>
          <span className="text-gray-600">Alt Haplotypes:</span>{" "}
          {variant.altHaplotypes.join(", ")}
        </div>
        {variant.disease && (
          <div className="text-red-400 mt-1">⚠ {variant.disease}</div>
        )}
      </div>

      {/* Explanation */}
      <div className="mt-3 p-2 bg-indigo-900/20 rounded-md text-[10px] text-indigo-300 leading-relaxed">
        This variant creates a &ldquo;bubble&rdquo; in the pangenome graph —
        different haplotypes traverse different paths through this region.
      </div>
    </div>
  );
}
