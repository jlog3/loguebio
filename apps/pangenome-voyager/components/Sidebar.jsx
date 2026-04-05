"use client";

import { CHROMOSOMES, HAPLOTYPES, VARIANT_COLORS } from "@/lib/data";

const OVERLAYS = [
  { id: "none", label: "None", icon: "○" },
  { id: "popfreq", label: "Pop. Frequency", icon: "◐" },
  { id: "genes", label: "Gene Annotations", icon: "≋" },
  { id: "disease", label: "Disease Assoc.", icon: "⚠" },
];

const LEGEND_TYPES = Object.entries(VARIANT_COLORS).filter(
  ([k]) => k !== "INV_ALT"
);

export default function Sidebar({
  activeChr,
  setActiveChr,
  activeHaplotypes,
  toggleHaplotype,
  overlayMode,
  setOverlayMode,
  zoom,
  setZoom,
  onChrChange,
}) {
  return (
    <aside
      className="w-[220px] py-3.5 px-3 border-r border-[#0e2a47] overflow-y-auto flex-shrink-0"
      style={{ background: "#060e1a" }}
    >
      {/* ── Region selector ── */}
      <Section title="Region">
        {CHROMOSOMES.map((chr) => (
          <button
            key={chr.id}
            onClick={() => onChrChange(chr.id)}
            className="block w-full py-1.5 px-2.5 mb-0.5 rounded-md text-[10px] text-left font-mono cursor-pointer transition-all-200"
            style={{
              background: activeChr === chr.id ? "#0a1f35" : "transparent",
              border:
                activeChr === chr.id
                  ? `1px solid ${chr.color}44`
                  : "1px solid transparent",
              color: activeChr === chr.id ? chr.color : "#4a6a80",
            }}
          >
            {chr.label}
          </button>
        ))}
      </Section>

      {/* ── Haplotype toggles ── */}
      <Section title="Haplotypes">
        {HAPLOTYPES.map((hap) => {
          const active = activeHaplotypes.includes(hap.id);
          return (
            <button
              key={hap.id}
              onClick={() => toggleHaplotype(hap.id)}
              className="flex items-center gap-2 w-full py-1 px-2 bg-transparent border-none cursor-pointer font-mono"
            >
              <div
                className="w-2.5 h-2.5 rounded-sm transition-all-200"
                style={{
                  background: active ? hap.color : "transparent",
                  border: `1.5px solid ${hap.color}`,
                  boxShadow: active ? hap.glow : "none",
                }}
              />
              <span
                className="text-[9px] transition-all-200"
                style={{ color: active ? "#b0bec5" : "#37474f" }}
              >
                {hap.label}
              </span>
            </button>
          );
        })}
      </Section>

      {/* ── Overlay controls ── */}
      <Section title="Overlay">
        {OVERLAYS.map((ov) => (
          <button
            key={ov.id}
            onClick={() => setOverlayMode(ov.id)}
            className="flex items-center gap-2 w-full py-1 px-2 mb-0.5 rounded font-mono cursor-pointer text-[10px] text-left transition-all-200"
            style={{
              background: overlayMode === ov.id ? "#0a1f3544" : "transparent",
              border:
                overlayMode === ov.id
                  ? "1px solid #1e3a5f"
                  : "1px solid transparent",
              color: overlayMode === ov.id ? "#80cbc4" : "#37474f",
            }}
          >
            <span className="text-xs">{ov.icon}</span> {ov.label}
          </button>
        ))}
      </Section>

      {/* ── Variant legend ── */}
      <Section title="Variant Types">
        {LEGEND_TYPES.map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 py-0.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[9px] text-gray-600 font-mono">{type}</span>
          </div>
        ))}
      </Section>

      {/* ── Zoom ── */}
      <Section title="Zoom">
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        />
        <div className="text-[9px] text-gray-700 text-center font-mono">
          {zoom.toFixed(1)}×
        </div>
      </Section>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-[9px] text-[#3d6e8f] mb-1.5 uppercase tracking-[0.1em] font-mono">
        {title}
      </div>
      {children}
    </div>
  );
}
