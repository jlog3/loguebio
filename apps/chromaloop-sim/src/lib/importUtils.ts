import {
  ChromatinBead,
  CohesinMotor,
  TAD,
  Loop,
  SimulationState,
  SequenceAnnotation,
  UserRegion,
  ImportedData,
} from '@/types';
import { generateContactMap } from './polymerPhysics';

const TAD_COLORS = [
  '#00e5ff', '#ff00e5', '#39ff14', '#ffab00',
  '#ff1744', '#651fff', '#00bfa5', '#ff6d00',
];

/* ——————————————————————————————————————————————————
   Parse FASTA-like annotation format
   Each character = one bead:
     N = normal
     > = CTCF forward
     < = CTCF reverse
     P = promoter
     E = enhancer
     A/B = compartment marker (applied to the previous bead)
   Lines starting with > are header lines (ignored for bead parsing)
   ——————————————————————————————————————————————————*/
export function parseFASTAAnnotation(text: string): ImportedData {
  const lines = text.trim().split('\n');
  let name = 'Custom Sequence';
  let sequence = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      name = trimmed.slice(1).trim() || name;
    } else {
      sequence += trimmed.replace(/\s/g, '');
    }
  }

  const annotations: SequenceAnnotation[] = [];
  let currentCompartment: 'A' | 'B' = 'A';

  for (let i = 0; i < sequence.length; i++) {
    const ch = sequence[i].toUpperCase();

    // Compartment markers modify the previous bead
    if (ch === 'A' || ch === 'B') {
      currentCompartment = ch;
      continue;
    }

    let type: ChromatinBead['type'] = 'normal';
    let gene: string | undefined;

    switch (ch) {
      case '>': type = 'ctcf_forward'; break;
      case '<': type = 'ctcf_reverse'; break;
      case 'P': type = 'promoter'; gene = `Gene${annotations.length}`; break;
      case 'E': type = 'enhancer'; gene = `Enh${annotations.length}`; break;
      case 'N': case '.': case '-': type = 'normal'; break;
      default: type = 'normal';
    }

    annotations.push({
      position: annotations.length,
      type,
      gene,
      compartment: currentCompartment,
    });
  }

  return {
    source: 'fasta',
    name,
    beadCount: annotations.length,
    annotations,
  };
}

/* ——————————————————————————————————————————————————
   Parse BED-like format
   tab-separated: start  end  type  [label]
   type: ctcf_f, ctcf_r, promoter, enhancer, tad
   ——————————————————————————————————————————————————*/
export function parseBEDAnnotation(text: string): ImportedData {
  const lines = text.trim().split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const regions: UserRegion[] = [];
  let maxEnd = 0;

  for (const line of lines) {
    const parts = line.split('\t').map((s) => s.trim());
    if (parts.length < 3) continue;

    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    const typeStr = parts[2].toLowerCase();
    const label = parts[3] || `${typeStr}_${regions.length}`;

    if (isNaN(start) || isNaN(end)) continue;

    let type: UserRegion['type'] = 'tad';
    if (typeStr.includes('ctcf')) type = 'ctcf';
    else if (typeStr.includes('prom')) type = 'promoter';
    else if (typeStr.includes('enh')) type = 'enhancer';
    else if (typeStr.includes('gene')) type = 'gene';
    else if (typeStr.includes('tad')) type = 'tad';

    regions.push({ start, end, label, type });
    maxEnd = Math.max(maxEnd, end);
  }

  return {
    source: 'bed',
    name: 'BED Annotations',
    beadCount: maxEnd + 1,
    regions,
  };
}

/* ——————————————————————————————————————————————————
   Parse CSV contact matrix
   ——————————————————————————————————————————————————*/
export function parseHiCCSV(text: string): ImportedData {
  const lines = text.trim().split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const matrix: number[][] = [];

  for (const line of lines) {
    // Skip header if first cell is non-numeric
    const cells = line.split(/[,\t]/).map((s) => s.trim());
    const firstVal = parseFloat(cells[0]);
    if (isNaN(firstVal) && matrix.length === 0) {
      // header row — skip
      continue;
    }

    const row = cells.map((c) => {
      const v = parseFloat(c);
      return isNaN(v) ? 0 : v;
    });
    matrix.push(row);
  }

  // Ensure square matrix
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    while (matrix[i].length < n) matrix[i].push(0);
    matrix[i] = matrix[i].slice(0, n);
  }

  // Normalize to 0-1
  let maxVal = 0;
  for (const row of matrix) for (const v of row) maxVal = Math.max(maxVal, v);
  if (maxVal > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] /= maxVal;
      }
    }
  }

  return {
    source: 'hic-csv',
    name: 'Imported Hi-C Matrix',
    beadCount: n,
    contactMatrix: matrix,
  };
}

/* ——————————————————————————————————————————————————
   Parse JSON state (re-import previously exported state)
   ——————————————————————————————————————————————————*/
export function parseJSONState(text: string): ImportedData | null {
  try {
    const data = JSON.parse(text);
    if (data.beads && Array.isArray(data.beads)) {
      return {
        source: 'json',
        name: data.meta?.generator ? `${data.meta.generator} snapshot` : 'JSON Import',
        beadCount: data.beads.length,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/* ——————————————————————————————————————————————————
   Build SimulationState from ImportedData
   ——————————————————————————————————————————————————*/
export function buildStateFromImport(imported: ImportedData): SimulationState {
  const numBeads = Math.max(20, Math.min(300, imported.beadCount || 120));

  // For JSON source, attempt full state restoration
  if (imported.source === 'json' && imported.contactMatrix) {
    // handled below
  }

  // Build beads
  const beads: ChromatinBead[] = [];
  const numTADs = Math.max(2, Math.ceil(numBeads / 20));
  const tadSize = Math.floor(numBeads / numTADs);

  for (let i = 0; i < numBeads; i++) {
    const t = i / numBeads;
    const helixRadius = 3.0 + Math.sin(t * Math.PI * 4) * 1.5;
    const angle = t * Math.PI * 8;
    const y = (t - 0.5) * 12;
    const tadIdx = Math.min(Math.floor(i / tadSize), numTADs - 1);

    let type: ChromatinBead['type'] = 'normal';
    let gene: string | undefined;
    let compartment: 'A' | 'B' = tadIdx % 2 === 0 ? 'A' : 'B';

    // Apply annotations from FASTA
    if (imported.annotations) {
      const ann = imported.annotations[i];
      if (ann) {
        type = ann.type;
        gene = ann.gene;
        if (ann.compartment) compartment = ann.compartment;
      }
    }

    // Apply annotations from BED regions
    if (imported.regions) {
      for (const region of imported.regions) {
        if (i >= region.start && i <= region.end) {
          if (region.type === 'ctcf') {
            type = i === region.start ? 'ctcf_forward' : i === region.end ? 'ctcf_reverse' : type;
          } else if (region.type === 'promoter') {
            if (i === region.start) { type = 'promoter'; gene = region.label; }
          } else if (region.type === 'enhancer') {
            if (i === region.start) { type = 'enhancer'; gene = region.label; }
          }
        }
      }
    }

    beads.push({
      id: i,
      position: [
        helixRadius * Math.cos(angle) + (Math.random() - 0.5) * 0.3,
        y + (Math.random() - 0.5) * 0.3,
        helixRadius * Math.sin(angle) + (Math.random() - 0.5) * 0.3,
      ],
      velocity: [0, 0, 0],
      type,
      gene,
      expression: type === 'promoter' ? 0.3 + Math.random() * 0.4 : 0,
      compartment,
      tadIndex: tadIdx,
      mutated: false,
    });
  }

  // Build TADs
  const tads: TAD[] = Array.from({ length: numTADs }, (_, i) => ({
    id: i,
    start: i * tadSize,
    end: Math.min((i + 1) * tadSize - 1, numBeads - 1),
    color: TAD_COLORS[i % TAD_COLORS.length],
    label: `TAD-${String.fromCharCode(65 + i)}`,
  }));

  // Override TADs from BED regions
  if (imported.regions) {
    const tadRegions = imported.regions.filter((r) => r.type === 'tad');
    if (tadRegions.length > 0) {
      tads.length = 0;
      tadRegions.forEach((r, i) => {
        tads.push({
          id: i,
          start: r.start,
          end: Math.min(r.end, numBeads - 1),
          color: TAD_COLORS[i % TAD_COLORS.length],
          label: r.label || `TAD-${String.fromCharCode(65 + i)}`,
        });
        // Update bead tadIndex
        for (let j = r.start; j <= Math.min(r.end, numBeads - 1); j++) {
          if (beads[j]) beads[j].tadIndex = i;
        }
      });
    }
  }

  // Build loops from CTCF sites
  const loops: Loop[] = [];
  const ctcfForward = beads.filter((b) => b.type === 'ctcf_forward');
  const ctcfReverse = beads.filter((b) => b.type === 'ctcf_reverse');

  // Pair convergent CTCF sites
  for (const fwd of ctcfForward) {
    // Find nearest downstream reverse CTCF
    let bestReverse: ChromatinBead | null = null;
    let bestDist = Infinity;
    for (const rev of ctcfReverse) {
      const dist = rev.id - fwd.id;
      if (dist > 0 && dist < bestDist) {
        bestDist = dist;
        bestReverse = rev;
      }
    }
    if (bestReverse && bestDist < numBeads / 2) {
      loops.push({
        anchor1: fwd.id,
        anchor2: bestReverse.id,
        strength: 1.0,
        type: 'ctcf',
      });
    }
  }

  // Enhancer-promoter loops within TADs
  for (const tad of tads) {
    const tadBeads = beads.filter((b) => b.id >= tad.start && b.id <= tad.end);
    const promoters = tadBeads.filter((b) => b.type === 'promoter');
    const enhancers = tadBeads.filter((b) => b.type === 'enhancer');
    for (const p of promoters) {
      for (const e of enhancers) {
        loops.push({
          anchor1: p.id,
          anchor2: e.id,
          strength: 0.6,
          type: 'enhancer-promoter',
        });
      }
    }
  }

  // Cohesins
  const cohesins: CohesinMotor[] = tads.map((tad, i) => ({
    id: i,
    position: (tad.start + tad.end) / 2,
    leftAnchor: tad.start,
    rightAnchor: tad.end,
    active: true,
    speed: 0.15,
    stalled: false,
  }));

  // Contact map — use imported if available, otherwise compute
  const contactMap = imported.contactMatrix && imported.contactMatrix.length === numBeads
    ? imported.contactMatrix
    : generateContactMap(beads);

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

/* ——————————————————————————————————————————————————
   Preset datasets (4D Nucleome inspired)
   ——————————————————————————————————————————————————*/
export interface PresetDataset {
  id: string;
  name: string;
  description: string;
  organism: string;
  cellType: string;
  resolution: string;
  sequence: string;
}

export const PRESET_DATASETS: PresetDataset[] = [
  {
    id: 'hoxd-locus',
    name: 'HoxD Gene Cluster',
    description: 'The HoxD locus on chromosome 2 with its regulatory landscapes — two TADs flanking the cluster control digit vs forearm expression patterns.',
    organism: 'Mouse (mm10)',
    cellType: 'Distal limb bud E12.5',
    resolution: '~25kb per bead',
    sequence: '>HoxD_locus_chr2:74M-76M\n>NNNNPNENNNN<A>NNNENNPNNNN<B>NNNPNENNNN<A>NNENNPNNNN<B>NNNPNENNNN<A>NNENNPNNNN<',
  },
  {
    id: 'myc-locus',
    name: 'MYC Super-Enhancer Locus',
    description: 'The MYC oncogene region with its distal super-enhancer located ~1.7Mb downstream, connected by a long-range loop within a large TAD.',
    organism: 'Human (hg38)',
    cellType: 'K562 (CML)',
    resolution: '~50kb per bead',
    sequence: '>MYC_locus_chr8:127M-131M\n>NNNPNNNNNNNNNNNENNNN<A>NNNNNNPNENNNNNN<B>NNNNNNPNENNNNNN<A>NNNNNNPNENNNNNN<',
  },
  {
    id: 'sox9-kcnj2',
    name: 'SOX9 / KCNJ2 Boundary',
    description: 'The SOX9-KCNJ2 locus on chr17 — a well-studied case where TAD boundary disruption causes limb malformations by mis-regulation of the wrong gene.',
    organism: 'Human (hg38)',
    cellType: 'Fibroblast',
    resolution: '~25kb per bead',
    sequence: '>SOX9_KCNJ2_chr17\n>NNNENNNNPNNN<A>NNNPNENNNN<B>NNNENNPNNNN<A>NNPNENNNN<B>NNENNPNNNN<A>NNPNENNNN<',
  },
  {
    id: 'globin',
    name: 'β-Globin Locus Control Region',
    description: 'The β-globin gene cluster with its distal LCR (Locus Control Region) — a textbook example of long-range enhancer-promoter looping in erythroid cells.',
    organism: 'Human (hg38)',
    cellType: 'Erythroid progenitor',
    resolution: '~10kb per bead',
    sequence: '>beta_globin_chr11\n>NNENNNNNNNN<A>NNNNNPNNNN<B>NNNNPNNENNNN<A>NNPNENNNNNN<B>NNENNPNNN<A>NNNPNENN<',
  },
  {
    id: 'minimal-demo',
    name: 'Minimal 2-TAD Demo',
    description: 'A simple two-TAD system with one enhancer-promoter pair per domain. Good for learning the basics of TAD insulation.',
    organism: 'Synthetic',
    cellType: 'N/A',
    resolution: 'N/A',
    sequence: '>Minimal_2TAD_demo\n>NNNPNENNNN<A>NNNENPNNNN<',
  },
];

/* Auto-detect file format from content */
export function detectFormat(text: string): 'fasta' | 'bed' | 'hic-csv' | 'json' | 'unknown' {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('>')) return 'fasta';

  // Check if lines are tab-separated with numbers at start
  const firstLine = trimmed.split('\n')[0];
  const parts = firstLine.split('\t');
  if (parts.length >= 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
    return 'bed';
  }

  // Check if it looks like a CSV matrix
  const commas = (firstLine.match(/,/g) || []).length;
  if (commas > 3) return 'hic-csv';

  return 'unknown';
}

/* Parse any supported format */
export function parseAny(text: string): ImportedData | null {
  const format = detectFormat(text);
  switch (format) {
    case 'fasta': return parseFASTAAnnotation(text);
    case 'bed': return parseBEDAnnotation(text);
    case 'hic-csv': return parseHiCCSV(text);
    case 'json': return parseJSONState(text);
    default: return null;
  }
}
