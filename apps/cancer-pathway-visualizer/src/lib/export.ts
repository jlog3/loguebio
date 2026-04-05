import type { GeneResult, ExportFormat } from "./types";

const COLUMNS = [
  "gene",
  "log2FC",
  "baseMean",
  "pValue",
  "padj",
  "tumorMean",
  "normalMean",
  "direction",
  "significant",
] as const;

type CleanRow = Omit<GeneResult, "tVals" | "nVals" | "negLog10P">;

function cleanRow(r: GeneResult): CleanRow {
  const { tVals, nVals, negLog10P, ...rest } = r;
  return rest;
}

function formatValue(v: unknown): string {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return String(v);
    if (v !== 0 && Math.abs(v) < 0.001) return v.toExponential(3);
    return String(v);
  }
  return String(v);
}

function toDelimited(data: GeneResult[], sep: string): string {
  const header = COLUMNS.join(sep);
  const rows = data.map((r) => {
    const clean = cleanRow(r);
    return COLUMNS.map((col) => formatValue(clean[col as keyof CleanRow])).join(sep);
  });
  return header + "\n" + rows.join("\n");
}

export function generateCSV(data: GeneResult[]): string {
  return toDelimited(data, ",");
}

export function generateTSV(data: GeneResult[]): string {
  return toDelimited(data, "\t");
}

export function generateJSON(data: GeneResult[]): string {
  return JSON.stringify(data.map(cleanRow), null, 2);
}

export function downloadBlob(
  content: string,
  filename: string,
  type = "text/csv"
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportData(
  data: GeneResult[],
  format: ExportFormat,
  suffix: string
) {
  switch (format) {
    case "csv":
      downloadBlob(generateCSV(data), `dea_${suffix}.csv`);
      break;
    case "tsv":
      downloadBlob(
        generateTSV(data),
        `dea_${suffix}.tsv`,
        "text/tab-separated-values"
      );
      break;
    case "json":
      downloadBlob(
        generateJSON(data),
        `dea_${suffix}.json`,
        "application/json"
      );
      break;
  }
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export function geneIdList(data: GeneResult[]): string {
  return data.map((r) => r.gene).join("\n");
}
