"use client";

export default function StatusBar({ graph, userVariantCount }) {
  return (
    <div
      className="absolute bottom-3 left-3 right-3 flex justify-between items-center py-2 px-3.5 rounded-lg font-mono"
      style={{
        background: "#0a1525cc",
        border: "1px solid #0e2a47",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="text-[9px] text-[#3d6e8f]">
        {graph.nodes.length} nodes · {graph.edges.length} edges ·{" "}
        {graph.variants.length} variants
        {userVariantCount > 0 && ` · ${userVariantCount} user mutations`}
      </span>
      <span className="text-[9px] text-[#1e3a5f]">
        Click variant bubbles to inspect
      </span>
    </div>
  );
}
