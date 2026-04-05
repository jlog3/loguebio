"use client";

import { useEffect, useRef, useCallback } from "react";
import { DATA, mapToCanvas } from "@/lib/data";

interface Props {
  layers: Record<string, number>;
  hoveredPoint: number | null;
  onHoverPoint: (id: number | null) => void;
  onSelectPoint: (id: number) => void;
  width: number;
  height: number;
}

export default function UMAPCanvas({
  layers,
  hoveredPoint,
  onHoverPoint,
  onSelectPoint,
  width,
  height,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const layersRef = useRef(layers);
  const hoveredRef = useRef(hoveredPoint);

  layersRef.current = layers;
  hoveredRef.current = hoveredPoint;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let running = true;

    const draw = () => {
      if (!running) return;
      const t = Date.now() * 0.001;
      const currentLayers = layersRef.current;
      const hp = hoveredRef.current;

      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 10; i++) {
        const { px } = mapToCanvas(-5 + i, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
        const { py } = mapToCanvas(0, -5 + i, width, height);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }

      // Points
      const activeLayers = DATA.omicsLayers.filter(
        (l) => currentLayers[l] > 0
      );

      DATA.points.forEach((pt) => {
        activeLayers.forEach((layer) => {
          const alpha = currentLayers[layer];
          if (alpha <= 0) return;
          const off = pt.layerOffsets[layer];
          const { px, py } = mapToCanvas(
            pt.base.x + off.dx,
            pt.base.y + off.dy,
            width,
            height
          );
          const [r, g, b] = DATA.layerColors[layer];
          const isHovered = hp === pt.id;
          const rad = isHovered ? 5 : 2.5;
          const pulse = isHovered ? 0.3 + 0.1 * Math.sin(t * 4) : 0;

          ctx.beginPath();
          ctx.arc(px, py, rad + pulse * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
          ctx.fill();

          if (isHovered) {
            ctx.beginPath();
            ctx.arc(px, py, 12, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      });

      // Cluster labels
      ctx.font = "600 11px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      DATA.clusters.forEach((cl) => {
        const { px, py } = mapToCanvas(cl.cx, cl.cy + 1.5, width, height);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillText(cl.cellType, px, py);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [width, height]);

  // Re-render on layers/hover change without restarting loop
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    hoveredRef.current = hoveredPoint;
  }, [hoveredPoint]);

  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let closest: number | null = null;
      let minD = 15;

      const activeLayers = DATA.omicsLayers.filter((l) => layers[l] > 0);
      DATA.points.forEach((pt) => {
        activeLayers.forEach((layer) => {
          const off = pt.layerOffsets[layer];
          const { px, py } = mapToCanvas(
            pt.base.x + off.dx,
            pt.base.y + off.dy,
            width,
            height
          );
          const d = Math.hypot(px - mx, py - my);
          if (d < minD) {
            minD = d;
            closest = pt.id;
          }
        });
      });
      onHoverPoint(closest);
    },
    [layers, width, height, onHoverPoint]
  );

  const handleClick = useCallback(() => {
    if (hoveredPoint !== null) onSelectPoint(hoveredPoint);
  }, [hoveredPoint, onSelectPoint]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        cursor: hoveredPoint !== null ? "pointer" : "crosshair",
        borderRadius: 8,
        display: "block",
      }}
      onMouseMove={handleMouse}
      onMouseLeave={() => onHoverPoint(null)}
      onClick={handleClick}
    />
  );
}
