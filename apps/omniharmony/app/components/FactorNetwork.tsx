"use client";

import { useMemo } from "react";
import { DATA } from "@/lib/data";

interface Props {
  activeFactor: number;
  onSetFactor: (idx: number) => void;
  width: number;
  height: number;
}

export default function FactorNetwork({
  activeFactor,
  onSetFactor,
  width,
  height,
}: Props) {
  const positions = useMemo(() => {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.34;
    return DATA.factorNames.map((_, i) => {
      const a = (i / DATA.nFactors) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
  }, [width, height]);

  const edges = useMemo(() => {
    const e: { from: number; to: number; weight: number }[] = [];
    for (let i = 0; i < DATA.nFactors; i++) {
      for (let j = i + 1; j < DATA.nFactors; j++) {
        let shared = 0;
        DATA.omicsLayers.forEach((l) => {
          DATA.factorLoadings[l].forEach((fl) => {
            if (
              Math.abs(fl.loadings[i]) > 0.3 &&
              Math.abs(fl.loadings[j]) > 0.3
            )
              shared++;
          });
        });
        if (shared > 2) e.push({ from: i, to: j, weight: shared });
      }
    }
    return e;
  }, []);

  return (
    <svg
      width={width}
      height={height}
      style={{ overflow: "visible", display: "block" }}
    >
      {edges.map((e, i) => (
        <line
          key={i}
          x1={positions[e.from].x}
          y1={positions[e.from].y}
          x2={positions[e.to].x}
          y2={positions[e.to].y}
          stroke={`rgba(255,255,255,${Math.min(0.3, e.weight * 0.04)})`}
          strokeWidth={e.weight * 0.5}
        />
      ))}
      {DATA.factorNames.map((name, i) => {
        const p = positions[i];
        const isActive = activeFactor === i;
        return (
          <g
            key={i}
            onClick={() => onSetFactor(isActive ? -1 : i)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={isActive ? 24 : 18}
              fill={
                isActive
                  ? "rgba(0,200,255,0.2)"
                  : "rgba(255,255,255,0.05)"
              }
              stroke={
                isActive
                  ? "rgba(0,200,255,0.7)"
                  : "rgba(255,255,255,0.15)"
              }
              strokeWidth={isActive ? 2 : 1}
            />
            <text
              x={p.x}
              y={p.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isActive ? "#00c8ff" : "rgba(255,255,255,0.5)"}
              fontSize="8"
              fontWeight="600"
              fontFamily="'DM Sans', sans-serif"
            >
              {name.length > 12 ? name.slice(0, 11) + "…" : name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
