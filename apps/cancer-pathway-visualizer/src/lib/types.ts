export interface Pathway {
  id: string;
  name: string;
  category: string;
}

export interface GeneResult {
  gene: string;
  log2FC: number;
  baseMean: number;
  pValue: number;
  padj: number;
  negLog10P: number;
  significant: boolean;
  direction: "up" | "down" | "ns";
  tumorMean: number;
  normalMean: number;
  tVals: number[];
  nVals: number[];
}

export interface ParsedData {
  samples: string[];
  data: Record<string, number[]>;
  geneCount: number;
}

export interface FileState {
  data: Record<string, number[]> | null;
  name: string | null;
  geneCount: number;
}

export interface Summary {
  total: number;
  up: number;
  down: number;
  sig: number;
}

export type DirectionFilter = "all" | "sig" | "up" | "down";
export type ExportFormat = "csv" | "tsv" | "json";
export type TabKey = "volcano" | "ma" | "distribution" | "topgenes" | "table";
