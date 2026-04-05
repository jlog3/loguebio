"use client";

import { VARIANT_COLORS } from "@/lib/data";

const VARIANT_TYPES = ["SNP", "INS", "DEL", "INV", "DUP"];

export default function MutationSimulator({
  graph,
  simType,
  setSimType,
  simSegment,
  setSimSegment,
  userVariants,
  onAdd,
  onRemove,
}) {
  const maxSegment = graph.nodes.filter((n) => n.type === "segment").length - 2;

  return (
    <div className="glass-panel absolute top-3 left-3 w-64 p-3.5 z-20">
      {/* Title */}
      <div className="text-[11px] font-bold text-red-400 mb-3 tracking-wide font-mono">
        ⚡ MUTATION SIMULATOR
      </div>

      {/* Variant type selector */}
      <div className="mb-3">
        <div className="text-[9px] text-[#3d6e8f] mb-1.5 uppercase tracking-widest">
          Variant Type
        </div>
        <div className="flex gap-1 flex-wrap">
          {VARIANT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSimType(t)}
              className="px-2.5 py-1 rounded text-[9px] font-mono cursor-pointer transition-all-200"
              style={{
                border: `1px solid ${VARIANT_COLORS[t]}44`,
                background:
                  simType === t ? `${VARIANT_COLORS[t]}22` : "transparent",
                color: simType === t ? VARIANT_COLORS[t] : "#37474f",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Segment selector */}
      <div className="mb-3">
        <div className="text-[9px] text-[#3d6e8f] mb-1.5 uppercase tracking-widest">
          Insert at Segment
        </div>
        <input
          type="range"
          min={1}
          max={maxSegment}
          value={simSegment}
          onChange={(e) => setSimSegment(parseInt(e.target.value))}
          className="accent-red"
        />
        <div className="text-[9px] text-gray-600 text-center font-mono">
          Segment {simSegment + 1}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={onAdd}
        disabled={userVariants.length >= 5}
        className="w-full py-2 rounded-md text-[10px] font-mono font-semibold cursor-pointer transition-all-200"
        style={{
          border: "1px solid #ff525244",
          background:
            userVariants.length >= 5
              ? "#1a1a1a"
              : "linear-gradient(135deg, #3e0000, #1a0000)",
          color: userVariants.length >= 5 ? "#37474f" : "#ff8a80",
        }}
      >
        {userVariants.length >= 5 ? "Max 5 mutations" : `+ Add ${simType} Mutation`}
      </button>

      {/* List of added mutations */}
      {userVariants.length > 0 && (
        <div className="mt-3 border-t border-[#1e3a5f] pt-2">
          <div className="text-[9px] text-[#3d6e8f] mb-1.5 uppercase tracking-widest">
            Added Mutations
          </div>
          {userVariants.map((uv, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-1.5 py-1 mb-0.5 rounded"
              style={{ background: "#1a000033" }}
            >
              <span
                className="text-[9px] font-mono"
                style={{ color: VARIANT_COLORS[uv.type] }}
              >
                {uv.type} @ Seg {uv.segment + 1}
              </span>
              <button
                onClick={() => onRemove(i)}
                className="bg-transparent border-none text-gray-500 cursor-pointer text-xs px-1 hover:text-gray-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info text */}
      <div className="mt-3 p-2 rounded-md text-[8px] text-[#4a6a80] leading-relaxed"
           style={{ background: "#0a1f3533" }}>
        Simulated mutations appear as red dashed paths in the graph. Watch how
        new bubbles form when structural variants are introduced — this is how
        pangenome graphs capture real human variation.
      </div>
    </div>
  );
}
