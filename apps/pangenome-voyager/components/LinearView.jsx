"use client";

import { VARIANT_COLORS } from "@/lib/data";

export default function LinearView({ graph }) {
  const segments = graph.nodes.filter((n) => n.type === "segment");
  const totalSegs = segments.length - 1;

  return (
    <svg viewBox="0 0 1060 120" className="w-full h-full">
      {/* Backbone line */}
      <line
        x1={50}
        y1={60}
        x2={1010}
        y2={60}
        stroke="#37474f"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Segment ticks */}
      {segments.map((n, i) => {
        const x = 50 + i * (960 / totalSegs);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={48}
              x2={x}
              y2={72}
              stroke="#546e7a"
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={90}
              textAnchor="middle"
              fill="#78909c"
              fontSize={8}
              fontFamily="'JetBrains Mono', monospace"
            >
              {(n.length / 1000).toFixed(0)}kb
            </text>
          </g>
        );
      })}

      {/* Title */}
      <text
        x={530}
        y={30}
        textAnchor="middle"
        fill="#00e5ff"
        fontSize={11}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="bold"
      >
        GRCh38 Linear Reference
      </text>

      {/* Variant markers */}
      {graph.variants.map((v, i) => {
        const x = 50 + v.segment * (960 / totalSegs);
        return (
          <g key={`lv-${i}`}>
            <line
              x1={x}
              y1={55}
              x2={x}
              y2={65}
              stroke={VARIANT_COLORS[v.type]}
              strokeWidth={3}
            />
            <circle cx={x} cy={48} r={3} fill={VARIANT_COLORS[v.type]} />
          </g>
        );
      })}
    </svg>
  );
}
