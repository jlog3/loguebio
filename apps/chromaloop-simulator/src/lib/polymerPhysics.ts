import {
  ChromatinBead,
  CohesinMotor,
  TAD,
  Loop,
  SimulationState,
  SimulationConfig,
  DiseasePreset,
} from '@/types';

const DEFAULT_CONFIG: SimulationConfig = {
  numBeads: 120,
  springConstant: 8.0,
  bendingStiffness: 3.0,
  excludedVolume: 1.5,
  loopExtrusionSpeed: 0.15,
  ctcfStallProbability: 0.92,
  thermalNoise: 0.12,
  damping: 0.88,
  timeStep: 0.016,
};

const TAD_COLORS = [
  '#00e5ff', '#ff00e5', '#39ff14', '#ffab00',
  '#ff1744', '#651fff', '#00bfa5', '#ff6d00',
];

const GENE_NAMES = [
  'SOX9', 'SHH', 'MYC', 'GATA1', 'PAX6', 'HOXA',
  'WNT5A', 'NOTCH1', 'TP53', 'BRCA1', 'FOXP2', 'KLF4',
];

export function createInitialState(config: Partial<SimulationConfig> = {}): SimulationState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { numBeads } = cfg;

  // Define TADs
  const numTADs = 6;
  const tadSize = Math.floor(numBeads / numTADs);
  const tads: TAD[] = Array.from({ length: numTADs }, (_, i) => ({
    id: i,
    start: i * tadSize,
    end: Math.min((i + 1) * tadSize - 1, numBeads - 1),
    color: TAD_COLORS[i % TAD_COLORS.length],
    label: `TAD-${String.fromCharCode(65 + i)}`,
  }));

  // Create beads along a helical initial conformation
  const beads: ChromatinBead[] = Array.from({ length: numBeads }, (_, i) => {
    const t = i / numBeads;
    const helixRadius = 3.0 + Math.sin(t * Math.PI * 4) * 1.5;
    const angle = t * Math.PI * 8;
    const y = (t - 0.5) * 12;

    const tadIdx = Math.min(Math.floor(i / tadSize), numTADs - 1);
    const isCtcfSite = (i % tadSize === 0 || i % tadSize === tadSize - 1) && i > 0 && i < numBeads - 1;
    const isBoundaryForward = i % tadSize === 0;
    const isPromoter = i % tadSize === Math.floor(tadSize * 0.3);
    const isEnhancer = i % tadSize === Math.floor(tadSize * 0.7);

    let type: ChromatinBead['type'] = 'normal';
    if (isCtcfSite) type = isBoundaryForward ? 'ctcf_forward' : 'ctcf_reverse';
    if (isPromoter) type = 'promoter';
    if (isEnhancer) type = 'enhancer';

    return {
      id: i,
      position: [
        helixRadius * Math.cos(angle) + (Math.random() - 0.5) * 0.3,
        y + (Math.random() - 0.5) * 0.3,
        helixRadius * Math.sin(angle) + (Math.random() - 0.5) * 0.3,
      ] as [number, number, number],
      velocity: [0, 0, 0] as [number, number, number],
      type,
      gene: isPromoter || isEnhancer ? GENE_NAMES[tadIdx * 2 + (isEnhancer ? 1 : 0)] : undefined,
      expression: isPromoter ? 0.3 + Math.random() * 0.4 : 0,
      compartment: tadIdx % 2 === 0 ? 'A' : 'B',
      tadIndex: tadIdx,
      mutated: false,
    };
  });

  // Create cohesin motors
  const cohesins: CohesinMotor[] = tads.map((tad, i) => ({
    id: i,
    position: (tad.start + tad.end) / 2,
    leftAnchor: tad.start,
    rightAnchor: tad.end,
    active: true,
    speed: cfg.loopExtrusionSpeed,
    stalled: false,
  }));

  // Define loops (CTCF-CTCF and enhancer-promoter)
  const loops: Loop[] = [];
  tads.forEach((tad) => {
    loops.push({
      anchor1: tad.start,
      anchor2: tad.end,
      strength: 1.0,
      type: 'ctcf',
    });
    const promoterIdx = tad.start + Math.floor(tadSize * 0.3);
    const enhancerIdx = tad.start + Math.floor(tadSize * 0.7);
    if (promoterIdx < numBeads && enhancerIdx < numBeads) {
      loops.push({
        anchor1: promoterIdx,
        anchor2: enhancerIdx,
        strength: 0.6,
        type: 'enhancer-promoter',
      });
    }
  });

  const contactMap = generateContactMap(beads);

  return {
    beads,
    cohesins,
    tads,
    loops,
    contactMap,
    time: 0,
    temperature: 1.0,
    loopExtrusionEnabled: true,
    compartmentalizationStrength: 0.5,
  };
}

function dist3(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize3(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function generateContactMap(beads: ChromatinBead[]): number[][] {
  const n = beads.length;
  const map: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const contactThreshold = 3.5;

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const d = dist3(beads[i].position, beads[j].position);
      const contactProb = Math.exp(-d * d / (contactThreshold * contactThreshold));
      const genomicDecay = Math.exp(-Math.abs(i - j) * 0.02);
      const val = Math.min(1, contactProb * 0.7 + genomicDecay * 0.3);

      // TAD enrichment
      if (beads[i].tadIndex === beads[j].tadIndex) {
        map[i][j] = Math.min(1, val * 1.8);
      } else {
        map[i][j] = val * 0.4;
      }
      map[j][i] = map[i][j];
    }
  }
  return map;
}

export function stepSimulation(
  state: SimulationState,
  config: Partial<SimulationConfig> = {}
): SimulationState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { beads, cohesins, loops } = state;
  const n = beads.length;
  const forces: [number, number, number][] = beads.map(() => [0, 0, 0]);

  // 1. Backbone spring forces (connectivity)
  for (let i = 0; i < n - 1; i++) {
    const a = beads[i].position;
    const b = beads[i + 1].position;
    const d = dist3(a, b);
    const restLength = 0.8;
    const forceMag = cfg.springConstant * (d - restLength);
    const dir = normalize3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);

    for (let k = 0; k < 3; k++) {
      forces[i][k] += dir[k] * forceMag;
      forces[i + 1][k] -= dir[k] * forceMag;
    }
  }

  // 2. Bending stiffness (angle potential)
  for (let i = 1; i < n - 1; i++) {
    const prev = beads[i - 1].position;
    const curr = beads[i].position;
    const next = beads[i + 1].position;

    const v1: [number, number, number] = [
      curr[0] - prev[0], curr[1] - prev[1], curr[2] - prev[2],
    ];
    const v2: [number, number, number] = [
      next[0] - curr[0], next[1] - curr[1], next[2] - curr[2],
    ];

    // Force toward straight alignment
    const bendForce = cfg.bendingStiffness;
    for (let k = 0; k < 3; k++) {
      const f = bendForce * (v2[k] - v1[k]) * 0.5;
      forces[i - 1][k] += f * 0.3;
      forces[i][k] -= f * 0.6;
      forces[i + 1][k] += f * 0.3;
    }
  }

  // 3. Excluded volume (soft repulsion)
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      const d = dist3(beads[i].position, beads[j].position);
      const minDist = 0.6;
      if (d < minDist && d > 0.01) {
        const repulsion = cfg.excludedVolume * (minDist - d) / d;
        const dir: [number, number, number] = [
          beads[i].position[0] - beads[j].position[0],
          beads[i].position[1] - beads[j].position[1],
          beads[i].position[2] - beads[j].position[2],
        ];
        for (let k = 0; k < 3; k++) {
          forces[i][k] += dir[k] * repulsion;
          forces[j][k] -= dir[k] * repulsion;
        }
      }
    }
  }

  // 4. Loop forces (CTCF anchors and enhancer-promoter contacts)
  if (state.loopExtrusionEnabled) {
    for (const loop of loops) {
      const a = loop.anchor1;
      const b = loop.anchor2;
      if (a >= n || b >= n) continue;

      // Skip if either anchor is mutated
      if (beads[a].mutated || beads[b].mutated) continue;

      const d = dist3(beads[a].position, beads[b].position);
      const targetDist = loop.type === 'ctcf' ? 1.2 : 1.8;
      const strength = loop.strength * (loop.type === 'ctcf' ? 2.5 : 1.5);

      if (d > targetDist) {
        const forceMag = strength * (d - targetDist);
        const dir = normalize3([
          beads[b].position[0] - beads[a].position[0],
          beads[b].position[1] - beads[a].position[1],
          beads[b].position[2] - beads[a].position[2],
        ]);
        for (let k = 0; k < 3; k++) {
          forces[a][k] += dir[k] * forceMag;
          forces[b][k] -= dir[k] * forceMag;
        }
      }
    }
  }

  // 5. Compartmentalization (A/B compartment attraction)
  const compStrength = state.compartmentalizationStrength;
  if (compStrength > 0) {
    for (let i = 0; i < n; i += 3) {
      for (let j = i + 3; j < n; j += 3) {
        if (beads[i].compartment === beads[j].compartment) {
          const d = dist3(beads[i].position, beads[j].position);
          if (d > 2.0 && d < 8.0) {
            const attract = compStrength * 0.15 / (d * d);
            const dir: [number, number, number] = [
              beads[j].position[0] - beads[i].position[0],
              beads[j].position[1] - beads[i].position[1],
              beads[j].position[2] - beads[i].position[2],
            ];
            for (let k = 0; k < 3; k++) {
              forces[i][k] += dir[k] * attract;
              forces[j][k] -= dir[k] * attract;
            }
          }
        }
      }
    }
  }

  // 6. Confinement (spherical nucleus boundary)
  const nucleusRadius = 10.0;
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(
      beads[i].position[0] ** 2 + beads[i].position[1] ** 2 + beads[i].position[2] ** 2
    );
    if (r > nucleusRadius) {
      const pushback = 5.0 * (r - nucleusRadius) / r;
      for (let k = 0; k < 3; k++) {
        forces[i][k] -= beads[i].position[k] * pushback;
      }
    }
  }

  // Update positions (Langevin dynamics)
  const newBeads = beads.map((bead, i) => {
    const newVel: [number, number, number] = [0, 0, 0];
    const newPos: [number, number, number] = [0, 0, 0];

    for (let k = 0; k < 3; k++) {
      const noise = (Math.random() - 0.5) * cfg.thermalNoise * state.temperature;
      newVel[k] = (bead.velocity[k] + forces[i][k] * cfg.timeStep + noise) * cfg.damping;
      newPos[k] = bead.position[k] + newVel[k] * cfg.timeStep;
    }

    // Update expression based on enhancer-promoter distance
    let expression = bead.expression;
    if (bead.type === 'promoter') {
      const tadBeads = beads.filter((b) => b.tadIndex === bead.tadIndex);
      const enhancer = tadBeads.find((b) => b.type === 'enhancer');
      if (enhancer) {
        const d = dist3(newPos, enhancer.position);
        expression = Math.max(0, Math.min(1, 1.0 - d / 6.0));
        if (enhancer.mutated || bead.mutated) expression *= 0.1;
      }
    }

    return {
      ...bead,
      position: newPos,
      velocity: newVel,
      expression,
    };
  });

  // Update cohesin positions (loop extrusion)
  const newCohesins = state.loopExtrusionEnabled
    ? cohesins.map((coh) => {
        if (!coh.active) return coh;
        const tad = state.tads[coh.id % state.tads.length];
        if (!tad) return coh;

        let newPos = coh.position;
        const leftBead = Math.floor(coh.leftAnchor);
        const rightBead = Math.ceil(coh.rightAnchor);

        // Check if stalled at CTCF
        const leftStall = leftBead >= 0 && leftBead < n &&
          beads[leftBead].type === 'ctcf_forward' && !beads[leftBead].mutated;
        const rightStall = rightBead < n &&
          beads[rightBead].type === 'ctcf_reverse' && !beads[rightBead].mutated;

        const stalled = leftStall && rightStall;

        if (!stalled) {
          // Extrude outward from center
          newPos = coh.position;
        }

        return { ...coh, position: newPos, stalled };
      })
    : cohesins.map((c) => ({ ...c, active: false }));

  // Periodically update contact map (every few frames for performance)
  const shouldUpdateMap = state.time % 5 === 0;
  const newContactMap = shouldUpdateMap ? generateContactMap(newBeads) : state.contactMap;

  return {
    ...state,
    beads: newBeads,
    cohesins: newCohesins,
    contactMap: newContactMap,
    time: state.time + 1,
  };
}

export const DISEASE_PRESETS: DiseasePreset[] = [
  {
    id: 'limb-malformation',
    name: 'Limb Malformation (WNT6/IHH)',
    description: 'TAD boundary deletion causes ectopic WNT6 activation near IHH, leading to digit malformation. Disrupted CTCF sites allow enhancer-promoter cross-talk across domains.',
    gene: 'WNT6 → IHH locus',
    type: 'boundary_deletion',
    mutations: [
      { beadIndex: 20, newType: 'normal' },
      { beadIndex: 19, newType: 'normal' },
    ],
    affectedTADs: [0, 1],
    paperRef: 'Lupiáñez et al., Cell 2015',
  },
  {
    id: 'aml-enhancer-hijack',
    name: 'AML Enhancer Hijacking',
    description: 'Structural variant repositions a super-enhancer near MYC, driving its overexpression in acute myeloid leukemia. Loop disruption creates neo-TAD with ectopic contacts.',
    gene: 'MYC',
    type: 'enhancer_hijack',
    mutations: [
      { beadIndex: 40, newType: 'normal' },
      { beadIndex: 59, newType: 'normal' },
    ],
    affectedTADs: [2, 3],
    paperRef: 'Gröschel et al., Cell 2014',
  },
  {
    id: 'medulloblastoma',
    name: 'Medulloblastoma (GFI1 Activation)',
    description: 'CTCF site mutations in medulloblastoma disrupt insulator boundaries, leading to aberrant GFI1 activation via enhancer adoption across collapsed TAD boundary.',
    gene: 'GFI1',
    type: 'ctcf_mutation',
    mutations: [
      { beadIndex: 60, newType: 'normal' },
      { beadIndex: 79, newType: 'normal' },
    ],
    affectedTADs: [3, 4],
    paperRef: 'Northcott et al., Nature 2014',
  },
  {
    id: 'polydactyly',
    name: 'Polydactyly (SHH Enhancer)',
    description: 'Point mutation in the ZRS enhancer ~1Mb from SHH creates ectopic expression in the limb bud, demonstrating long-range enhancer action through chromatin looping.',
    gene: 'SHH',
    type: 'enhancer_hijack',
    mutations: [
      { beadIndex: 80, newType: 'normal' },
      { beadIndex: 99, newType: 'normal' },
    ],
    affectedTADs: [4, 5],
    paperRef: 'Lettice et al., PNAS 2003',
  },
];

export function applyDiseaseMutation(
  state: SimulationState,
  preset: DiseasePreset
): SimulationState {
  const newBeads = state.beads.map((bead) => {
    const mutation = preset.mutations.find((m) => m.beadIndex === bead.id);
    if (mutation) {
      return { ...bead, type: mutation.newType, mutated: true };
    }
    return { ...bead, mutated: false };
  });

  // Rebuild loops (some may be broken)
  const newLoops = state.loops.map((loop) => {
    const isBroken =
      newBeads[loop.anchor1]?.mutated || newBeads[loop.anchor2]?.mutated;
    return { ...loop, strength: isBroken ? 0.05 : loop.strength };
  });

  return { ...state, beads: newBeads, loops: newLoops };
}

export function resetMutations(state: SimulationState): SimulationState {
  const resetState = createInitialState({ numBeads: state.beads.length });
  return {
    ...resetState,
    temperature: state.temperature,
    loopExtrusionEnabled: state.loopExtrusionEnabled,
    compartmentalizationStrength: state.compartmentalizationStrength,
  };
}
