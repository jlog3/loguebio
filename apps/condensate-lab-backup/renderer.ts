import { Particle, SimState, getParticleColor, getParticleGlow } from "./simulation";

interface RenderOptions {
  showTrails: boolean;
  showClusters: boolean;
  showFrapRegion: boolean;
  diseaseMode: boolean;
  glowIntensity: number;
}

// Trail buffer
const TRAIL_LENGTH = 8;
const trailBuffers = new Map<number, { x: number; y: number }[]>();

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  options: RenderOptions,
  dpr: number
) {
  const w = ctx.canvas.width / dpr;
  const h = ctx.canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear with subtle background
  ctx.fillStyle = "#060a12";
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = "rgba(28, 40, 65, 0.3)";
  ctx.lineWidth = 0.5;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Cluster halos
  if (options.showClusters) {
    for (const [, indices] of state.clusters) {
      if (indices.length < 3) continue;

      // Compute cluster center and radius
      let cx = 0, cy = 0;
      for (const idx of indices) {
        cx += state.particles[idx].x;
        cy += state.particles[idx].y;
      }
      cx /= indices.length;
      cy /= indices.length;

      let maxR = 0;
      for (const idx of indices) {
        const dx = state.particles[idx].x - cx;
        const dy = state.particles[idx].y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > maxR) maxR = r;
      }

      const isAgg = state.particles[indices[0]]?.isAggregated;
      const haloR = maxR + 20;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      if (isAgg) {
        grad.addColorStop(0, "rgba(239, 68, 68, 0.08)");
        grad.addColorStop(0.6, "rgba(239, 68, 68, 0.04)");
        grad.addColorStop(1, "transparent");
      } else {
        grad.addColorStop(0, "rgba(0, 255, 200, 0.06)");
        grad.addColorStop(0.5, "rgba(0, 255, 200, 0.02)");
        grad.addColorStop(1, "transparent");
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Condensate boundary
      ctx.strokeStyle = isAgg
        ? "rgba(239, 68, 68, 0.2)"
        : "rgba(0, 255, 200, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, haloR - 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // FRAP region
  if (options.showFrapRegion && state.frapRegion) {
    const fr = state.frapRegion;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(fr.x, fr.y, fr.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = "rgba(251, 191, 36, 0.7)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("FRAP", fr.x, fr.y - fr.radius - 8);
  }

  // Trails
  if (options.showTrails) {
    for (const p of state.particles) {
      let trail = trailBuffers.get(p.id);
      if (!trail) {
        trail = [];
        trailBuffers.set(p.id, trail);
      }
      trail.push({ x: p.x, y: p.y });
      if (trail.length > TRAIL_LENGTH) trail.shift();

      if (trail.length > 1) {
        const color = getParticleColor(p, options.diseaseMode);
        for (let i = 1; i < trail.length; i++) {
          const alpha = (i / trail.length) * 0.15;
          ctx.strokeStyle = color.replace(")", `,${alpha})`).replace("rgb", "rgba");
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
      }
    }
  }

  // Particles
  for (const p of state.particles) {
    const color = getParticleColor(p, options.diseaseMode);
    const glow = getParticleGlow(p, options.diseaseMode);

    // Outer glow
    if (!p.bleached && options.glowIntensity > 0) {
      const glowR = p.radius * (2.5 + options.glowIntensity);
      const glowGrad = ctx.createRadialGradient(
        p.x, p.y, p.radius * 0.5,
        p.x, p.y, glowR
      );
      glowGrad.addColorStop(0, glow);
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core particle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Aggregate cross-linking visual
    if (p.isAggregated) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 1.5;
      const s = p.radius * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.stroke();
    }

    // Bright center
    if (!p.bleached) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(p.x - p.radius * 0.2, p.y - p.radius * 0.2, p.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Scale bar
  ctx.fillStyle = "rgba(200, 214, 229, 0.4)";
  ctx.fillRect(w - 80, h - 20, 50, 2);
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("10 μm", w - 55, h - 8);

  // Time display
  ctx.fillStyle = "rgba(200, 214, 229, 0.3)";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`t = ${(state.time * 100).toFixed(1)}s`, 8, h - 8);

  ctx.restore();
}

export function clearTrails() {
  trailBuffers.clear();
}
