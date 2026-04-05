"use client";

import { useMemo } from "react";
import { HAPLOTYPES, VARIANT_COLORS } from "@/lib/data";

export default function PangenomeGraph({
  graph,
  activeHaplotypes,
  overlayMode,
  highlightVariant,
  onVariantClick,
  zoom,
  pan,
  userVariants,
}) {
  // Merge graph nodes with user-created mutation nodes
  const allNodes = useMemo(() => {
    const base = [...graph.nodes];
    userVariants.forEach((uv, i) => {
      base.push({
        id: `user_v${i}`,
        x: graph.nodes[uv.segment]?.x + 26 || 300,
        y: 200 + (uv.type === "DEL" ? 65 : -65),
        type: "variant",
        variantType: uv.type,
        label: `User ${uv.type}`,
        popFreq: 0,
        disease: null,
        isUser: true,
      });
    });
    return base;
  }, [graph.nodes, userVariants]);

  // Merge graph edges with user-created mutation edges
  const allEdges = useMemo(() => {
    const base = [...graph.edges];
    userVariants.forEach((uv, i) => {
      const seg = uv.segment;
      if (seg < graph.nodes.length - 1) {
        base.push({
          from: `n${seg}`,
          to: `user_v${i}`,
          type: "bubble",
          haplotypes: ["USER"],
          isUser: true,
        });
        base.push({
          from: `user_v${i}`,
          to: `n${seg + 1}`,
          type: "bubble",
          haplotypes: ["USER"],
          isUser: true,
        });
      }
    });
    return base;
  }, [graph.edges, userVariants, graph.nodes.length]);

  // Build node lookup map
  const nodeMap = useMemo(() => {
    const m = {};
    allNodes.forEach((n) => {
      m[n.id] = n;
    });
    return m;
  }, [allNodes]);

  return (
    <svg
      viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${1060 / zoom} ${420 / zoom}`}
      className="w-full h-full"
      style={{ background: "transparent" }}
    >
      <defs>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="3" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-user">
          <feGaussianBlur stdDeviation="4" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Gene annotations layer */}
      {overlayMode === "genes" &&
        graph.genes.map((g, i) => {
          const startNode = graph.nodes[g.start];
          const endNode = graph.nodes[g.end];
          if (!startNode || !endNode) return null;
          const midX = (startNode.x + endNode.x) / 2;
          return (
            <g key={`gene-${i}`}>
              <rect
                x={startNode.x - 8}
                y={310}
                width={endNode.x - startNode.x + 16}
                height={22}
                rx={4}
                fill="#1a237e88"
                stroke="#42a5f5"
                strokeWidth={1}
              />
              <text
                x={midX}
                y={325}
                textAnchor="middle"
                fill="#90caf9"
                fontSize={10}
                fontFamily="'JetBrains Mono', monospace"
                fontStyle="italic"
              >
                {g.name} ({g.strand})
              </text>
              {g.strand === "+" ? (
                <polygon
                  points={`${endNode.x + 14},321 ${endNode.x + 22},321 ${endNode.x + 22},317`}
                  fill="#42a5f5"
                  opacity={0.7}
                />
              ) : (
                <polygon
                  points={`${startNode.x - 14},321 ${startNode.x - 22},321 ${startNode.x - 22},325`}
                  fill="#42a5f5"
                  opacity={0.7}
                />
              )}
            </g>
          );
        })}

      {/* Edges */}
      {allEdges.map((e, i) => {
        const from = nodeMap[e.from];
        const to = nodeMap[e.to];
        if (!from || !to) return null;

        const isActive = e.haplotypes.some(
          (h) => activeHaplotypes.includes(h) || h === "USER"
        );
        if (!isActive && e.type === "bubble") return null;

        const hapColor = e.isUser
          ? "#ff1744"
          : e.haplotypes.length > 0
          ? HAPLOTYPES.find((h) => h.id === e.haplotypes[0])?.color || "#455a64"
          : "#455a64";

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const curveOffset =
          e.type === "bubble" ? (from.y < 200 ? -15 : 15) : 0;
        const path =
          e.type === "backbone"
            ? `M${from.x},${from.y} L${to.x},${to.y}`
            : `M${from.x},${from.y} Q${midX},${midY + curveOffset} ${to.x},${to.y}`;

        return (
          <path
            key={`e-${i}`}
            d={path}
            fill="none"
            stroke={e.type === "backbone" ? "#37474f" : hapColor}
            strokeWidth={e.type === "backbone" ? 4 : 2.5}
            strokeOpacity={
              e.type === "backbone" ? 0.5 : e.isUser ? 0.9 : 0.7
            }
            filter={e.isUser ? "url(#glow-user)" : undefined}
            strokeDasharray={e.isUser ? "6 3" : undefined}
          />
        );
      })}

      {/* Haplotype trace paths (offset along backbone) */}
      {HAPLOTYPES.filter((h) => activeHaplotypes.includes(h.id)).map(
        (hap, hi) => {
          const backboneNodes = graph.nodes.filter(
            (n) => n.type === "segment"
          );
          const pathD = backboneNodes
            .map(
              (n, i) =>
                `${i === 0 ? "M" : "L"}${n.x},${n.y + (hi - 2) * 3}`
            )
            .join(" ");
          return (
            <path
              key={`hap-${hap.id}`}
              d={pathD}
              fill="none"
              stroke={hap.color}
              strokeWidth={2}
              strokeOpacity={0.6}
              filter="url(#glow-cyan)"
            />
          );
        }
      )}

      {/* Nodes */}
      {allNodes.map((n) => {
        const isVariant = n.type === "variant";
        const isHighlight = highlightVariant === n.id;
        const baseR = isVariant ? 10 : 7;
        const r = isHighlight ? baseR + 4 : baseR;

        let fill = isVariant
          ? VARIANT_COLORS[n.variantType] || "#aaa"
          : "#263238";
        let stroke = isVariant ? "#fff" : "#546e7a";

        if (overlayMode === "popfreq" && isVariant) {
          const intensity = n.popFreq || 0;
          fill = `rgba(${Math.floor(255 * intensity)}, ${Math.floor(
            100 + 155 * (1 - intensity)
          )}, ${Math.floor(255 * (1 - intensity))}, 0.9)`;
        }
        if (overlayMode === "disease" && isVariant && n.disease) {
          stroke = "#ff1744";
          fill = "#ff174455";
        }
        if (n.isUser) {
          fill = "#ff1744";
          stroke = "#ffcdd2";
        }

        return (
          <g
            key={n.id}
            onClick={() => isVariant && onVariantClick?.(n.id)}
            className={isVariant ? "cursor-pointer" : "cursor-default"}
          >
            {/* Pulse ring on highlight */}
            {isHighlight && (
              <circle
                cx={n.x}
                cy={n.y}
                r={r + 6}
                fill="none"
                stroke="#fff"
                strokeWidth={1}
                strokeOpacity={0.3}
              >
                <animate
                  attributeName="r"
                  from={r + 4}
                  to={r + 10}
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  from="0.4"
                  to="0"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            <circle
              cx={n.x}
              cy={n.y}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHighlight ? 2.5 : 1.5}
            />

            {/* Variant label */}
            {isVariant && (
              <text
                x={n.x}
                y={n.y - r - 6}
                textAnchor="middle"
                fill="#b0bec5"
                fontSize={8}
                fontFamily="'JetBrains Mono', monospace"
              >
                {n.label}
              </text>
            )}

            {/* Population frequency overlay */}
            {isVariant && overlayMode === "popfreq" && (
              <text
                x={n.x}
                y={n.y + r + 14}
                textAnchor="middle"
                fill="#80cbc4"
                fontSize={8}
                fontFamily="'JetBrains Mono', monospace"
              >
                {((n.popFreq || 0) * 100).toFixed(0)}%
              </text>
            )}

            {/* Disease association overlay */}
            {isVariant && overlayMode === "disease" && n.disease && (
              <text
                x={n.x}
                y={n.y + r + 14}
                textAnchor="middle"
                fill="#ff5252"
                fontSize={7}
                fontFamily="'JetBrains Mono', monospace"
              >
                ⚠ {n.disease}
              </text>
            )}

            {/* User mutation tag */}
            {n.isUser && (
              <text
                x={n.x}
                y={n.y + r + 14}
                textAnchor="middle"
                fill="#ff8a80"
                fontSize={8}
                fontWeight="bold"
                fontFamily="'JetBrains Mono', monospace"
              >
                USER
              </text>
            )}
          </g>
        );
      })}

      {/* Segment size labels */}
      {graph.nodes
        .filter((n) => n.type === "segment")
        .map((n, i) => (
          <text
            key={`sl-${i}`}
            x={n.x}
            y={n.y + 28}
            textAnchor="middle"
            fill="#546e7a"
            fontSize={7}
            fontFamily="'JetBrains Mono', monospace"
          >
            {(n.length / 1000).toFixed(0)}kb
          </text>
        ))}
    </svg>
  );
}
