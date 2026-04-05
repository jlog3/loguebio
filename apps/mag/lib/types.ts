export interface MAGRecord {
  Sample_ID: string;
  Completeness: number;
  Contamination: number;
  Complete_SCO: number;
  CSS: number;
  N50: number;
  Taxonomy_Level: string;
  Quality?: "High" | "Medium" | "Low";
  GUNC_Pass?: boolean;
}

export interface BoxplotStats {
  q1: number;
  median: number;
  q3: number;
  lower: number;
  upper: number;
  min: number;
  max: number;
  outliers: number[];
  mean: number;
}

export interface TestResult {
  statistic: number;
  p: number;
}
