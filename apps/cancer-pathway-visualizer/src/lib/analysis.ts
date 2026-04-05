import Papa from "papaparse";
import type { ParsedData, GeneResult } from "./types";

export function parseCSV(text: string): ParsedData {
  const result = Papa.parse(text.trim(), {
    header: false,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const rows = result.data as (string | number)[][];
  if (!rows.length) return { samples: [], data: {}, geneCount: 0 };

  const samples = rows[0].slice(1).map(String);
  const data: Record<string, number[]> = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const geneId = String(row[0]).split(".")[0]; // strip Ensembl version
    const vals = row
      .slice(1)
      .map((v) => (typeof v === "number" ? v : parseFloat(String(v)) || 0));

    if (data[geneId]) {
      // average duplicates
      data[geneId] = data[geneId].map((v, j) =>
        Math.round((v + (vals[j] || 0)) / 2)
      );
    } else {
      data[geneId] = vals;
    }
  }

  return { samples, data, geneCount: Object.keys(data).length };
}

/** Benjamini-Hochberg FDR correction */
function adjustPValues(pvals: number[]): number[] {
  const n = pvals.length;
  const indexed = pvals.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => b.p - a.p);

  const adj = new Array<number>(n);
  let cumMin = 1;
  for (let k = 0; k < n; k++) {
    const { p, i } = indexed[k];
    const realRank = n - k;
    cumMin = Math.min(cumMin, Math.min(1, (p * n) / realRank));
    adj[i] = cumMin;
  }
  return adj;
}

/** Run differential expression analysis (Welch's t-test + BH) */
export function computeDEA(
  tumorData: Record<string, number[]>,
  normalData: Record<string, number[]>
): GeneResult[] {
  const allGenes = new Set([
    ...Object.keys(tumorData),
    ...Object.keys(normalData),
  ]);

  const raw: {
    gene: string;
    log2FC: number;
    baseMean: number;
    pValue: number;
    tMean: number;
    nMean: number;
    tVals: number[];
    nVals: number[];
  }[] = [];

  for (const gene of allGenes) {
    const tVals = tumorData[gene];
    const nVals = normalData[gene];
    if (!tVals || !nVals) continue;

    const tMean = tVals.reduce((a, b) => a + b, 0) / tVals.length;
    const nMean = nVals.reduce((a, b) => a + b, 0) / nVals.length;
    const log2FC = Math.log2((tMean + 1) / (nMean + 1));
    const baseMean = (tMean + nMean) / 2;

    let pValue = 1;
    if (tVals.length >= 2 && nVals.length >= 2) {
      const v1 =
        tVals.reduce((s, v) => s + (v - tMean) ** 2, 0) / (tVals.length - 1);
      const v2 =
        nVals.reduce((s, v) => s + (v - nMean) ** 2, 0) / (nVals.length - 1);
      const se = Math.sqrt(v1 / tVals.length + v2 / nVals.length);
      if (se > 0) {
        const absT = Math.abs((tMean - nMean) / se);
        pValue = Math.max(1e-300, 2 * Math.exp(-0.717 * absT - 0.416 * absT * absT));
      }
    } else {
      pValue =
        Math.abs(log2FC) > 2 ? 0.001 : Math.abs(log2FC) > 1 ? 0.05 : 0.5;
    }

    raw.push({ gene, log2FC, baseMean, pValue, tMean, nMean, tVals, nVals });
  }

  const adjP = adjustPValues(raw.map((r) => r.pValue));

  const results: GeneResult[] = raw.map((r, i) => {
    const padj = adjP[i];
    const significant = Math.abs(r.log2FC) > 1 && padj < 0.05;
    const direction: GeneResult["direction"] =
      r.log2FC > 1 && padj < 0.05
        ? "up"
        : r.log2FC < -1 && padj < 0.05
          ? "down"
          : "ns";

    return {
      gene: r.gene,
      log2FC: +r.log2FC.toFixed(4),
      baseMean: +r.baseMean.toFixed(1),
      pValue: r.pValue,
      padj,
      negLog10P: +(-Math.log10(Math.max(1e-300, padj))).toFixed(2),
      significant,
      direction,
      tumorMean: +r.tMean.toFixed(1),
      normalMean: +r.nMean.toFixed(1),
      tVals: r.tVals,
      nVals: r.nVals,
    };
  });

  return results.sort((a, b) => Math.abs(b.log2FC) - Math.abs(a.log2FC));
}
