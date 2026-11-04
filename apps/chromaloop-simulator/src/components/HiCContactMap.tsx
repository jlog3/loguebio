'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { TAD, ChromatinBead, DiseasePreset } from '@/types';

interface Props {
  contactMap: number[][];
  tads: TAD[];
  beads: ChromatinBead[];
  selectedBead: number | null;
  onSelectBead: (id: number | null) => void;
  activeDisease: DiseasePreset | null;
}

// Hi-C heatmap color palette (white-hot -> red -> blue -> dark)
function contactColor(value: number, diseaseHighlight: boolean): [number, number, number] {
  if (diseaseHighlight) {
    // Red-shifted palette for disease regions
    const t = Math.min(1, value);
    return [
      Math.round(40 + 215 * t),
      Math.round(10 + 30 * t * (1 - t)),
      Math.round(20 + 20 * (1 - t)),
    ];
  }

  const t = Math.min(1, value);
  if (t < 0.1) return [3, 7, 17]; // deep background
  if (t < 0.3) {
    const s = (t - 0.1) / 0.2;
    return [
      Math.round(3 + 20 * s),
      Math.round(7 + 15 * s),
      Math.round(17 + 80 * s),
    ];
  }
  if (t < 0.5) {
    const s = (t - 0.3) / 0.2;
    return [
      Math.round(23 + 70 * s),
      Math.round(22 + 10 * s),
      Math.round(97 + 50 * s),
    ];
  }
  if (t < 0.7) {
    const s = (t - 0.5) / 0.2;
    return [
      Math.round(93 + 162 * s),
      Math.round(32 + 10 * s),
      Math.round(147 - 70 * s),
    ];
  }
  if (t < 0.9) {
    const s = (t - 0.7) / 0.2;
    return [
      255,
      Math.round(42 + 168 * s),
      Math.round(77 - 57 * s),
    ];
  }
  const s = (t - 0.9) / 0.1;
  return [
    255,
    Math.round(210 + 45 * s),
    Math.round(20 + 235 * s),
  ];
}

export default function HiCContactMap({
  contactMap,
  tads,
  beads,
  selectedBead,
  onSelectBead,
  activeDisease,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  const n = contactMap.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || n === 0) return;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    canvas.width = size * 2; // retina
    canvas.height = size * 2;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    const cellSize = size / n;

    // Build disease-affected set
    const diseaseBeads = new Set<number>();
    if (activeDisease) {
      activeDisease.affectedTADs.forEach((tadIdx) => {
        const tad = tads[tadIdx];
        if (tad) {
          for (let i = tad.start; i <= tad.end; i++) diseaseBeads.add(i);
        }
      });
    }

    // Draw heatmap
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const val = contactMap[i]?.[j] ?? 0;
        const isDiseaseRegion = diseaseBeads.has(i) && diseaseBeads.has(j);
        const [r, g, b] = contactColor(val, isDiseaseRegion);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(j * cellSize, i * cellSize, cellSize + 0.5, cellSize + 0.5);
        if (i !== j) {
          ctx.fillRect(i * cellSize, j * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }

    // TAD boundary lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1;
    tads.forEach((tad) => {
      const x1 = tad.start * cellSize;
      const x2 = (tad.end + 1) * cellSize;

      ctx.beginPath();
      ctx.moveTo(x1, x1);
      ctx.lineTo(x2, x1);
      ctx.lineTo(x2, x2);
      ctx.stroke();

      // Mirror
      ctx.beginPath();
      ctx.moveTo(x1, x1);
      ctx.lineTo(x1, x2);
      ctx.lineTo(x2, x2);
      ctx.stroke();
    });

    // TAD triangles (diagonal annotation)
    tads.forEach((tad) => {
      ctx.strokeStyle = tad.color + '40';
      ctx.lineWidth = 1.5;
      const x1 = tad.start * cellSize;
      const x2 = (tad.end + 1) * cellSize;

      ctx.beginPath();
      ctx.moveTo(x1, x1);
      ctx.lineTo(x2, x2);
      ctx.stroke();
    });

    // Selected bead crosshair
    if (selectedBead !== null && selectedBead < n) {
      const pos = selectedBead * cellSize + cellSize / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);

      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Hover highlight
    if (hoveredCell) {
      const [hi, hj] = hoveredCell;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hj * cellSize, hi * cellSize, cellSize, cellSize);
      ctx.strokeRect(hi * cellSize, hj * cellSize, cellSize, cellSize);
    }

    // Axis TAD labels
    ctx.font = '8px "JetBrains Mono", monospace';
    tads.forEach((tad) => {
      const mid = ((tad.start + tad.end) / 2) * cellSize;
      ctx.fillStyle = tad.color + '80';
      ctx.textAlign = 'center';
      ctx.fillText(tad.label, mid, size - 2);
    });
  }, [contactMap, tads, selectedBead, hoveredCell, activeDisease, n]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || n === 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cellSize = rect.width / n;
      const i = Math.floor(y / cellSize);
      const j = Math.floor(x / cellSize);
      if (i >= 0 && i < n && j >= 0 && j < n) {
        setHoveredCell([i, j]);
      }
    },
    [n]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || n === 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const cellSize = rect.width / n;
      const j = Math.floor(x / cellSize);
      if (j >= 0 && j < n) {
        onSelectBead(selectedBead === j ? null : j);
      }
    },
    [n, selectedBead, onSelectBead]
  );

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredCell(null)}
        onClick={handleClick}
      />
      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="tooltip"
          style={{
            left: '50%',
            top: 4,
            transform: 'translateX(-50%)',
          }}
        >
          [{hoveredCell[0]}, {hoveredCell[1]}] = {(contactMap[hoveredCell[0]]?.[hoveredCell[1]] ?? 0).toFixed(3)}
          {beads[hoveredCell[0]]?.tadIndex === beads[hoveredCell[1]]?.tadIndex
            ? ` (${tads[beads[hoveredCell[0]]?.tadIndex]?.label ?? ''})`
            : ' (inter-TAD)'}
        </div>
      )}
    </div>
  );
}
