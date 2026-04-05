"use client";

import PangenomeGraph from "./PangenomeGraph";
import LinearView from "./LinearView";
import AlignmentPaths from "./AlignmentPaths";

export default function CompareView({
  graph,
  activeHaplotypes,
  overlayMode,
  highlightVariant,
  selectedVariant,
  onVariantClick,
}) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Banner */}
      <div
        className="py-2 px-4 text-[10px] text-[#3d6e8f] text-center tracking-wider font-mono"
        style={{ background: "#0a1525", borderBottom: "1px solid #0e2a47" }}
      >
        PANGENOME GRAPH ↔ LINEAR REFERENCE COMPARISON
      </div>

      <div className="flex-1 flex flex-col">
        {/* Graph view (top) */}
        <div className="flex-[2] relative" style={{ borderBottom: "1px solid #0e2a47" }}>
          <div className="absolute top-2 left-3.5 text-[9px] text-cyan-glow font-mono z-5 px-2 py-0.5 rounded"
               style={{ background: "#0a152588" }}>
            Pangenome Graph View
          </div>
          <PangenomeGraph
            graph={graph}
            activeHaplotypes={activeHaplotypes}
            overlayMode={overlayMode}
            highlightVariant={highlightVariant}
            onVariantClick={onVariantClick}
            zoom={0.85}
            pan={{ x: 0, y: 0 }}
            userVariants={[]}
          />
        </div>

        {/* Alignment connector */}
        <div className="relative" style={{ height: 60 }}>
          <AlignmentPaths graph={graph} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-[#1e3a5f] font-mono px-2 py-0.5 rounded"
               style={{ background: "#060e1a" }}>
            alignment paths
          </div>
        </div>

        {/* Linear view (bottom) */}
        <div className="flex-1 relative">
          <div className="absolute top-2 left-3.5 text-[9px] text-pink-glow font-mono z-5 px-2 py-0.5 rounded"
               style={{ background: "#0a152588" }}>
            GRCh38 Linear Reference
          </div>
          <LinearView graph={graph} />
        </div>
      </div>

      {/* Educational footer */}
      <div
        className="py-2.5 px-4 text-[9px] text-gray-700 leading-relaxed text-center font-mono"
        style={{ background: "#0a1525", borderTop: "1px solid #0e2a47" }}
      >
        <span className="text-[#4a6a80]">Why pangenomes matter:</span>{" "}
        The linear reference (bottom) collapses all human variation into a single
        sequence. The graph (top) preserves alternate alleles as bubbles —
        revealing structural variants invisible to short-read aligners. Long-read
        sequencing (PacBio HiFi, ONT) now spans these complex regions end-to-end.
      </div>
    </div>
  );
}
