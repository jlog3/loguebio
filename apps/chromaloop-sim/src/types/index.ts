export interface ChromatinBead {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  type: 'normal' | 'ctcf_forward' | 'ctcf_reverse' | 'promoter' | 'enhancer';
  gene?: string;
  expression: number;
  compartment: 'A' | 'B';
  tadIndex: number;
  mutated: boolean;
}

export interface CohesinMotor {
  id: number;
  position: number; // bead index (fractional for smooth movement)
  leftAnchor: number;
  rightAnchor: number;
  active: boolean;
  speed: number;
  stalled: boolean;
}

export interface TAD {
  id: number;
  start: number;
  end: number;
  color: string;
  label: string;
}

export interface Loop {
  anchor1: number;
  anchor2: number;
  strength: number;
  type: 'ctcf' | 'enhancer-promoter';
}

export interface SimulationState {
  beads: ChromatinBead[];
  cohesins: CohesinMotor[];
  tads: TAD[];
  loops: Loop[];
  contactMap: number[][];
  time: number;
  temperature: number;
  loopExtrusionEnabled: boolean;
  compartmentalizationStrength: number;
}

export interface DiseasePreset {
  id: string;
  name: string;
  description: string;
  gene: string;
  type: 'boundary_deletion' | 'ctcf_mutation' | 'enhancer_hijack' | 'translocation';
  mutations: { beadIndex: number; newType: ChromatinBead['type'] }[];
  affectedTADs: number[];
  paperRef: string;
}

export interface SimulationConfig {
  numBeads: number;
  springConstant: number;
  bendingStiffness: number;
  excludedVolume: number;
  loopExtrusionSpeed: number;
  ctcfStallProbability: number;
  thermalNoise: number;
  damping: number;
  timeStep: number;
}

export type ViewMode = 'split' | '3d-only' | 'hic-only';
export type ColorScheme = 'tad' | 'compartment' | 'expression' | 'distance';

/* ——— User-defined sequence / annotation types ——— */

export interface SequenceAnnotation {
  position: number;         // bead index
  type: ChromatinBead['type'];
  gene?: string;
  compartment?: 'A' | 'B';
}

export interface UserRegion {
  start: number;
  end: number;
  label: string;
  type: 'tad' | 'ctcf' | 'promoter' | 'enhancer' | 'gene';
}

export interface ImportedData {
  source: 'fasta' | 'bed' | 'hic-csv' | 'preset' | 'json';
  name: string;
  beadCount?: number;
  annotations?: SequenceAnnotation[];
  regions?: UserRegion[];
  contactMatrix?: number[][];
}

export type ExportFormat = 'png' | 'csv' | 'xyz' | 'pdb' | 'tsv' | 'json';
