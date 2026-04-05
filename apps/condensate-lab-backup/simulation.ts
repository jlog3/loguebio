// ─── Types ───────────────────────────────────────────────────────────────────

export type ParticleType = "protein" | "rna" | "aggregate";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  id: number;
  radius: number;
  clusterId: number;
  isAggregated: boolean;
  bleached: boolean; // for FRAP
}

export interface SimParams {
  proteinCount: number;
  rnaCount: number;
  interactionStrength: number; // χ (chi) parameter — Flory-Huggins interaction
  temperature: number; // effectively kBT
  pH: number;
  crowdingFactor: number;
  diseaseMode: boolean;
  aggregationRate: number;
  multiComponent: boolean;
  width: number;
  height: number;
}

export interface SimState {
  particles: Particle[];
  clusters: Map<number, number[]>; // clusterId -> particle indices
  time: number;
  frapActive: boolean;
  frapRegion: { x: number; y: number; radius: number } | null;
  frapRecovery: number[]; // intensity over time
  frapTimePoints: number[];
  phaseSeparated: boolean;
  condensateCount: number;
  avgCondensateSize: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DT = 0.016; // timestep
const DRAG = 0.92;
const INTERACTION_CUTOFF = 80;
const CLUSTER_DISTANCE = 35;
const BROWNIAN_SCALE = 1.8;
const BOUNDARY_FORCE = 0.5;
const BOUNDARY_MARGIN = 20;

// ─── Color Mapping ──────────────────────────────────────────────────────────

export function getParticleColor(p: Particle, diseaseMode: boolean): string {
  if (p.bleached) return "rgba(100,100,100,0.3)";
  if (p.isAggregated) return "#ef4444";
  if (diseaseMode && p.type === "protein" && p.clusterId > 0) {
    // Gradual amber shift in disease mode
    return "#fb923c";
  }
  switch (p.type) {
    case "protein":
      return "#00ffc8";
    case "rna":
      return "#a78bfa";
    case "aggregate":
      return "#ef4444";
    default:
      return "#ffffff";
  }
}

export function getParticleGlow(p: Particle, diseaseMode: boolean): string {
  if (p.bleached) return "transparent";
  if (p.isAggregated) return "rgba(239,68,68,0.4)";
  if (diseaseMode && p.type === "protein" && p.clusterId > 0) {
    return "rgba(251,146,60,0.3)";
  }
  switch (p.type) {
    case "protein":
      return "rgba(0,255,200,0.3)";
    case "rna":
      return "rgba(167,139,250,0.25)";
    default:
      return "transparent";
  }
}

// ─── Initialization ─────────────────────────────────────────────────────────

let nextId = 0;

export function createParticle(
  type: ParticleType,
  width: number,
  height: number
): Particle {
  const margin = 40;
  return {
    x: margin + Math.random() * (width - 2 * margin),
    y: margin + Math.random() * (height - 2 * margin),
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    type,
    id: nextId++,
    radius: type === "protein" ? 5 : type === "rna" ? 4 : 6,
    clusterId: -1,
    isAggregated: false,
    bleached: false,
  };
}

export function initSimulation(params: SimParams): SimState {
  nextId = 0;
  const particles: Particle[] = [];

  for (let i = 0; i < params.proteinCount; i++) {
    particles.push(createParticle("protein", params.width, params.height));
  }
  if (params.multiComponent) {
    for (let i = 0; i < params.rnaCount; i++) {
      particles.push(createParticle("rna", params.width, params.height));
    }
  }

  return {
    particles,
    clusters: new Map(),
    time: 0,
    frapActive: false,
    frapRegion: null,
    frapRecovery: [],
    frapTimePoints: [],
    phaseSeparated: false,
    condensateCount: 0,
    avgCondensateSize: 0,
  };
}

// ─── Physics ────────────────────────────────────────────────────────────────

function interactionPotential(
  r: number,
  chi: number,
  sameType: boolean,
  pH: number,
  crowding: number
): number {
  // Effective interaction: attractive for like, modulated by chi, pH, crowding
  const pHmod = 1.0 - Math.abs(pH - 7.0) * 0.08; // max attraction near neutral
  const sigma = 20;
  const rNorm = r / sigma;

  if (rNorm < 0.8) {
    // Repulsive core
    return 2.0 / (rNorm * rNorm + 0.01);
  }

  // Attractive well depth depends on chi and whether same type
  const wellDepth = sameType
    ? chi * pHmod * crowding * 0.6
    : chi * pHmod * crowding * 0.35;

  // Lennard-Jones-like: -epsilon * (sigma/r)^6 + repulsion
  const attract = -wellDepth * Math.pow(sigma / r, 3);
  const repel = wellDepth * 0.3 * Math.pow(sigma / r, 6);

  return repel + attract;
}

export function stepSimulation(
  state: SimState,
  params: SimParams
): SimState {
  const { particles } = state;
  const n = particles.length;
  const w = params.width;
  const h = params.height;

  // Brownian + interaction forces
  for (let i = 0; i < n; i++) {
    const pi = particles[i];

    // Brownian motion (thermal noise)
    const brownianMag = BROWNIAN_SCALE * Math.sqrt(params.temperature);
    pi.vx += (Math.random() - 0.5) * brownianMag;
    pi.vy += (Math.random() - 0.5) * brownianMag;

    // Pairwise interactions
    for (let j = i + 1; j < n; j++) {
      const pj = particles[j];
      const dx = pj.x - pi.x;
      const dy = pj.y - pi.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < INTERACTION_CUTOFF && dist > 1) {
        const sameType = pi.type === pj.type;
        const force = interactionPotential(
          dist,
          params.interactionStrength,
          sameType,
          params.pH,
          params.crowdingFactor
        );

        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;

        pi.vx += fx * DT;
        pi.vy += fy * DT;
        pj.vx -= fx * DT;
        pj.vy -= fy * DT;
      }
    }

    // Boundary forces (soft walls)
    if (pi.x < BOUNDARY_MARGIN) pi.vx += BOUNDARY_FORCE;
    if (pi.x > w - BOUNDARY_MARGIN) pi.vx -= BOUNDARY_FORCE;
    if (pi.y < BOUNDARY_MARGIN) pi.vy += BOUNDARY_FORCE;
    if (pi.y > h - BOUNDARY_MARGIN) pi.vy -= BOUNDARY_FORCE;

    // Drag
    pi.vx *= DRAG;
    pi.vy *= DRAG;

    // Aggregate stiffening in disease mode
    if (params.diseaseMode && pi.isAggregated) {
      pi.vx *= 0.5;
      pi.vy *= 0.5;
    }

    // Update position
    pi.x += pi.vx * DT * 60;
    pi.y += pi.vy * DT * 60;

    // Hard boundary clamp
    pi.x = Math.max(pi.radius, Math.min(w - pi.radius, pi.x));
    pi.y = Math.max(pi.radius, Math.min(h - pi.radius, pi.y));
  }

  // ─── Cluster detection (simple distance-based) ──────────────────────────
  const clusterMap = new Map<number, number[]>();
  const visited = new Set<number>();
  let clusterIdCounter = 1;

  for (let i = 0; i < n; i++) {
    particles[i].clusterId = -1;
  }

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;

    // BFS to find cluster
    const queue = [i];
    const cluster: number[] = [];
    visited.add(i);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      for (let j = 0; j < n; j++) {
        if (visited.has(j)) continue;
        const dx = particles[j].x - particles[current].x;
        const dy = particles[j].y - particles[current].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CLUSTER_DISTANCE) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    if (cluster.length >= 3) {
      const cid = clusterIdCounter++;
      cluster.forEach((idx) => (particles[idx].clusterId = cid));
      clusterMap.set(cid, cluster);
    }
  }

  // ─── Disease mode: aggregate transition ──────────────────────────────────
  if (params.diseaseMode) {
    for (const [, indices] of clusterMap) {
      if (indices.length >= 5) {
        // Probability of aggregation increases with cluster size and rate
        const prob = params.aggregationRate * 0.002 * indices.length;
        if (Math.random() < prob) {
          indices.forEach((idx) => {
            particles[idx].isAggregated = true;
            particles[idx].radius = 7;
          });
        }
      }
    }
  } else {
    // Clear aggregation when disease mode off
    particles.forEach((p) => {
      if (p.isAggregated) {
        p.isAggregated = false;
        p.radius = p.type === "protein" ? 5 : 4;
      }
    });
  }

  // ─── FRAP tracking ──────────────────────────────────────────────────────
  let frapRecovery = [...state.frapRecovery];
  let frapTimePoints = [...state.frapTimePoints];

  if (state.frapActive && state.frapRegion) {
    const fr = state.frapRegion;
    let fluorescent = 0;
    let total = 0;

    for (const p of particles) {
      const dx = p.x - fr.x;
      const dy = p.y - fr.y;
      if (dx * dx + dy * dy < fr.radius * fr.radius) {
        total++;
        if (!p.bleached) fluorescent++;
      }
    }

    const intensity = total > 0 ? fluorescent / total : 0;
    frapRecovery.push(intensity);
    frapTimePoints.push(state.time);
  }

  // ─── Compute stats ──────────────────────────────────────────────────────
  const condensateCount = clusterMap.size;
  const sizes = Array.from(clusterMap.values()).map((c) => c.length);
  const avgSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
  const phaseSep = condensateCount > 0 && avgSize > 4;

  return {
    particles,
    clusters: clusterMap,
    time: state.time + DT,
    frapActive: state.frapActive,
    frapRegion: state.frapRegion,
    frapRecovery,
    frapTimePoints,
    phaseSeparated: phaseSep,
    condensateCount,
    avgCondensateSize: avgSize,
  };
}

// ─── FRAP Operations ────────────────────────────────────────────────────────

export function bleachRegion(
  state: SimState,
  x: number,
  y: number,
  radius: number
): SimState {
  const newParticles = state.particles.map((p) => {
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy < radius * radius) {
      return { ...p, bleached: true };
    }
    return p;
  });

  return {
    ...state,
    particles: newParticles,
    frapActive: true,
    frapRegion: { x, y, radius },
    frapRecovery: [0],
    frapTimePoints: [state.time],
  };
}

// ─── Flory-Huggins Phase Diagram Data ───────────────────────────────────────

export function computeBinodal(chi: number): { phi: number; freeEnergy: number }[] {
  // Simplified Flory-Huggins free energy: f(φ) = φ ln(φ) + (1-φ) ln(1-φ) + χ φ(1-φ)
  const points: { phi: number; freeEnergy: number }[] = [];
  for (let phi = 0.01; phi <= 0.99; phi += 0.01) {
    const f =
      phi * Math.log(phi) +
      (1 - phi) * Math.log(1 - phi) +
      chi * phi * (1 - phi);
    points.push({ phi, freeEnergy: f });
  }
  return points;
}

export function computeSpinodal(chi: number): { low: number; high: number } | null {
  // Spinodal: d²f/dφ² = 0 → 1/φ + 1/(1-φ) - 2χ = 0
  // Roots: φ = (1 ± sqrt(1 - 2/χ)) / 2
  if (chi <= 2) return null;
  const disc = Math.sqrt(1 - 2 / chi);
  return {
    low: (1 - disc) / 2,
    high: (1 + disc) / 2,
  };
}

export function getCriticalChi(): number {
  return 2.0; // For symmetric polymer blend
}
