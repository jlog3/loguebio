"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, ComposedChart,
} from "recharts";
import orderBy from "lodash/orderBy";
import sortBy from "lodash/sortBy";

import { PATHWAYS } from "@/data/pathways";
import { EXAMPLE_TUMOR, EXAMPLE_NORMAL } from "@/data/example";
import { parseCSV, computeDEA } from "@/lib/analysis";
import type {
  GeneResult, FileState, Summary, DirectionFilter, TabKey, Pathway,
} from "@/lib/types";

import FileDropZone from "@/components/FileDropZone";
import StatCard from "@/components/StatCard";
import ChartTooltip from "@/components/ChartTooltip";
import GeneModal from "@/components/GeneModal";
import ExportMenu from "@/components/ExportMenu";
import MethodsPanel from "@/components/MethodsPanel";
import Toast from "@/components/Toast";

/* ─── constants ─── */
const TABS: [TabKey, string][] = [
  ["volcano", "Volcano Plot"],
  ["ma", "MA Plot"],
  ["distribution", "FC Distribution"],
  ["topgenes", "Top Genes"],
  ["table", "Results Table"],
];
const PER_PAGE = 100;

/* ─── page ─── */
export default function HomePage() {
  // pathway
  const [pwSearch, setPwSearch] = useState("");
  const [selPW, setSelPW] = useState<Pathway | null>(null);
  const [showDD, setShowDD] = useState(false);
  const [catFilter, setCatFilter] = useState("All");
  const ddRef = useRef<HTMLDivElement>(null);

  // data
  const [tFile, setTFile] = useState<FileState>({ data: null, name: null, geneCount: 0 });
  const [nFile, setNFile] = useState<FileState>({ data: null, name: null, geneCount: 0 });

  // results
  const [results, setResults] = useState<GeneResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  // UI
  const [tab, setTab] = useState<TabKey>("volcano");
  const [sortField, setSortField] = useState("log2FC");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tableSearch, setTableSearch] = useState("");
  const [dirFilter, setDirFilter] = useState<DirectionFilter>("all");
  const [fcTh, setFcTh] = useState(1);
  const [pTh, setPTh] = useState(0.05);
  const [page, setPage] = useState(0);
  const [selGene, setSelGene] = useState<GeneResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node))
        setShowDD(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelGene(null); setShowDD(false); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* ─── pathway helpers ─── */
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(PATHWAYS.map((p) => p.category)))],
    []
  );

  const filteredPW = useMemo(() => {
    let pw = PATHWAYS;
    if (catFilter !== "All") pw = pw.filter((p) => p.category === catFilter);
    if (pwSearch) {
      const q = pwSearch.toLowerCase();
      pw = pw.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q));
    }
    return pw;
  }, [pwSearch, catFilter]);

  /* ─── file handlers ─── */
  const loadExample = useCallback(() => {
    setTFile({ data: EXAMPLE_TUMOR, name: "TCGA-SKCM Tumor (example)", geneCount: Object.keys(EXAMPLE_TUMOR).length });
    setNFile({ data: EXAMPLE_NORMAL, name: "TCGA-KIRC Normal (example)", geneCount: Object.keys(EXAMPLE_NORMAL).length });
  }, []);

  const handleTumorFile = useCallback((text: string, name: string) => {
    const p = parseCSV(text);
    setTFile({ data: p.data, name, geneCount: p.geneCount });
  }, []);

  const handleNormalFile = useCallback((text: string, name: string) => {
    const p = parseCSV(text);
    setNFile({ data: p.data, name, geneCount: p.geneCount });
  }, []);

  const resetAll = useCallback(() => {
    setResults(null);
    setTFile({ data: null, name: null, geneCount: 0 });
    setNFile({ data: null, name: null, geneCount: 0 });
    setSelPW(null);
    setPwSearch("");
    setDirFilter("all");
    setPage(0);
  }, []);

  /* ─── run analysis ─── */
  const runDEA = useCallback(() => {
    if (!tFile.data || !nFile.data) return;
    setBusy(true);
    setTimeout(() => {
      const r = computeDEA(tFile.data!, nFile.data!);
      setResults(r);
      setBusy(false);
      setTab("volcano");
      setPage(0);
      setToast(`Analysis complete: ${r.length} genes processed`);
    }, 50);
  }, [tFile.data, nFile.data]);

  /* ─── derived data ─── */
  const summary: Summary | null = useMemo(() => {
    if (!results) return null;
    const up = results.filter((r) => r.direction === "up").length;
    const down = results.filter((r) => r.direction === "down").length;
    return { total: results.length, up, down, sig: up + down };
  }, [results]);

  const volcanoData = useMemo(
    () =>
      results?.map((r) => ({
        ...r,
        dd:
          Math.abs(r.log2FC) > fcTh && r.padj < pTh
            ? r.log2FC > 0 ? "up" : "down"
            : "ns",
      })) ?? [],
    [results, fcTh, pTh]
  );

  const maData = useMemo(
    () =>
      results
        ?.filter((r) => r.baseMean > 0)
        .map((r) => ({
          gene: r.gene, A: Math.log2(r.baseMean + 1), M: r.log2FC,
          log2FC: r.log2FC, direction: r.direction, significant: r.significant,
          tumorMean: r.tumorMean, normalMean: r.normalMean,
          negLog10P: r.negLog10P, baseMean: r.baseMean,
        })) ?? [],
    [results]
  );

  const fcDistribution = useMemo(() => {
    if (!results) return [];
    const bins: Record<string, { fc: number; count: number; sig: number }> = {};
    const step = 0.5;
    for (const r of results) {
      const k = (Math.round(r.log2FC / step) * step).toFixed(1);
      if (!bins[k]) bins[k] = { fc: +k, count: 0, sig: 0 };
      bins[k].count++;
      if (r.significant) bins[k].sig++;
    }
    return sortBy(Object.values(bins), "fc");
  }, [results]);

  const topGenes = useMemo(
    () => results?.filter((r) => r.significant).slice(0, 30) ?? [],
    [results]
  );

  // table: direction-filtered, search-filtered, sorted, paginated
  const sortedTable = useMemo(() => {
    if (!results) return [];
    let d = [...results];
    if (dirFilter === "up") d = d.filter((r) => r.direction === "up");
    else if (dirFilter === "down") d = d.filter((r) => r.direction === "down");
    else if (dirFilter === "sig") d = d.filter((r) => r.significant);
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      d = d.filter((r) => r.gene.toLowerCase().includes(q));
    }
    return orderBy(
      d,
      [(r) => (sortField === "log2FC" ? Math.abs(r.log2FC) : r[sortField as keyof GeneResult])],
      [sortDir]
    );
  }, [results, sortField, sortDir, tableSearch, dirFilter]);

  const pagedTable = useMemo(
    () => sortedTable.slice(page * PER_PAGE, (page + 1) * PER_PAGE),
    [sortedTable, page]
  );
  const totalPages = Math.ceil(sortedTable.length / PER_PAGE);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  // helpers for chart clicks
  const onVolcanoClick = (e: any) => {
    if (e?.activePayload?.[0]) setSelGene(e.activePayload[0].payload);
  };
  const onMAClick = (e: any) => {
    if (e?.activePayload?.[0] && results) {
      setSelGene(results.find((r) => r.gene === e.activePayload[0].payload.gene) ?? null);
    }
  };
  const onBarClick = (e: any) => {
    if (e?.activePayload?.[0]) setSelGene(e.activePayload[0].payload);
  };

  const canRun = !!(tFile.data && nFile.data && !busy);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <GeneModal gene={selGene} onClose={() => setSelGene(null)} />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── Header ── */}
      <header className="border-b border-w05 px-6 py-6">
        <div className="max-w-[1200px] mx-auto flex justify-between items-start flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gene-cyan animate-pulse-slow" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-gene-cyan/45">
                Genomics Analysis Platform v3
              </span>
            </div>
            <h1 className="font-display text-[28px] font-light m-0">
              Cancer Pathway <span className="text-gene-cyan">Visualizer</span>
            </h1>
            <p className="text-[11px] text-w15 mt-1 max-w-[600px] leading-relaxed">
              Differential expression analysis on KEGG pathways. Welch&apos;s t-test + BH FDR. Upload RNA-seq raw counts.
            </p>
          </div>
          {results && (
            <div className="flex gap-2 items-center">
              <ExportMenu results={results} filteredResults={sortedTable} onToast={setToast} />
              <button
                onClick={resetAll}
                className="text-[10px] text-w25 bg-transparent border border-w05 rounded-md px-2.5 py-1.5 cursor-pointer font-mono flex items-center gap-1 hover:border-white/[0.12] transition-colors"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.2-4.8M20 15a8 8 0 01-14.2 4.8" />
                </svg>
                Reset
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-[1200px] mx-auto px-6 py-6">

        {/* Setup row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5 mb-6">

          {/* Pathway panel */}
          <div className="bg-w02 border border-w05 rounded-2xl p-6">
            <div className="text-[9px] uppercase tracking-[0.2em] text-w25 mb-3">1 · Pathway</div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border cursor-pointer transition-all ${
                    catFilter === c
                      ? "bg-gene-cyan/[0.05] border-gene-cyan/25 text-gene-cyan"
                      : "border-w05 text-white/20 hover:text-w40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div ref={ddRef} className="relative">
              <input
                className="w-full bg-white/[0.025] border border-w05 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-gene-cyan/40 transition-colors font-mono"
                placeholder="Search 344 pathways…"
                value={pwSearch}
                onChange={(e) => { setPwSearch(e.target.value); setShowDD(true); }}
                onFocus={() => setShowDD(true)}
              />
              {showDD && (
                <div className="absolute z-50 w-full mt-1 bg-surface-overlay border border-w05 rounded-lg shadow-2xl max-h-[220px] overflow-y-auto">
                  {filteredPW.slice(0, 40).map((pw) => (
                    <button
                      key={pw.id}
                      onClick={() => { setSelPW(pw); setPwSearch(pw.name); setShowDD(false); }}
                      className={`w-full text-left px-2.5 py-[7px] text-[11px] flex gap-2 items-center cursor-pointer border-none font-mono transition-colors ${
                        selPW?.id === pw.id ? "bg-gene-cyan/[0.05] text-gene-cyan" : "bg-transparent text-w40 hover:bg-w02"
                      }`}
                    >
                      <span className="text-[9px] text-w10 shrink-0">{pw.id}</span>
                      <span className="truncate">{pw.name}</span>
                    </button>
                  ))}
                  {filteredPW.length === 0 && (
                    <div className="p-4 text-center text-[11px] text-w10">No match</div>
                  )}
                </div>
              )}
            </div>

            {selPW && (
              <div className="mt-2.5 p-2.5 bg-gene-cyan/[0.03] border border-gene-cyan/[0.12] rounded-lg">
                <div className="text-[9px] text-gene-cyan/40 uppercase tracking-[0.12em]">Selected</div>
                <div className="text-xs text-gene-cyan/75 mt-0.5">{selPW.name}</div>
                <div className="text-[10px] text-w10 font-mono mt-0.5">{selPW.id} · {selPW.category}</div>
                <a
                  href={`https://www.kegg.jp/pathway/${selPW.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gene-cyan/35 underline mt-1 inline-block hover:text-gene-cyan/60 transition-colors"
                >
                  View on KEGG →
                </a>
              </div>
            )}
          </div>

          {/* Data panel */}
          <div className="bg-w02 border border-w05 rounded-2xl p-6">
            <div className="text-[9px] uppercase tracking-[0.2em] text-w25 mb-3">2 · Expression Data</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              <FileDropZone label="Tumor / Disease" onFileLoaded={handleTumorFile} fileName={tFile.name} color="#22d3ee" onClear={tFile.name ? () => setTFile({ data: null, name: null, geneCount: 0 }) : undefined} />
              <FileDropZone label="Normal / Control" onFileLoaded={handleNormalFile} fileName={nFile.name} color="#fbbf24" onClear={nFile.name ? () => setNFile({ data: null, name: null, geneCount: 0 }) : undefined} />
            </div>

            {(tFile.geneCount > 0 || nFile.geneCount > 0) && (
              <div className="text-[11px] text-w15 mb-2">
                {tFile.geneCount > 0 && `Tumor: ${tFile.geneCount.toLocaleString()} genes`}
                {tFile.geneCount > 0 && nFile.geneCount > 0 && " · "}
                {nFile.geneCount > 0 && `Normal: ${nFile.geneCount.toLocaleString()} genes`}
              </div>
            )}

            <div className="flex gap-2.5 items-center mb-3">
              <button onClick={loadExample} className="text-[11px] text-w25 border border-w05 rounded-lg px-3.5 py-2 cursor-pointer font-mono hover:border-white/[0.12] hover:text-w40 transition-colors bg-transparent">
                Load Example
              </button>
              <span className="text-[10px] text-w05">TCGA melanoma vs kidney normal</span>
            </div>

            <div className="p-2.5 bg-white/[0.01] rounded-lg border border-white/[0.025] text-[10px] text-w15 leading-relaxed mb-3.5">
              <strong className="text-w25">Format:</strong> CSV, Ensembl IDs as rows, samples as columns. Raw RNA-seq counts. Versions auto-stripped. Handles 60k+ genes.
            </div>

            <button
              onClick={runDEA}
              disabled={!canRun}
              className={`w-full py-3.5 rounded-xl text-[13px] font-medium border-none font-mono transition-all duration-300 ${
                canRun
                  ? "bg-gene-cyan text-black cursor-pointer shadow-[0_4px_20px_rgba(34,211,238,0.18)] hover:brightness-110"
                  : "bg-white/[0.03] text-white/[0.12] cursor-not-allowed"
              }`}
            >
              {busy ? "Computing…" : "Run Differential Expression Analysis"}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        {results && summary && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-1.5">
              <StatCard label="Total Genes" value={summary.total.toLocaleString()} sub="analyzed" />
              <StatCard label="Upregulated" value={summary.up} sub="|log₂FC|>1, padj<0.05" color="#fb7185" />
              <StatCard label="Downregulated" value={summary.down} sub="|log₂FC|>1, padj<0.05" color="#34d399" />
              <StatCard label="Significant" value={summary.sig} sub={`${((summary.sig / summary.total) * 100).toFixed(1)}%`} color="#22d3ee" />
            </div>

            <MethodsPanel results={results} onToast={setToast} />

            {/* Chart tabs */}
            <div className="bg-w02 border border-w05 rounded-2xl overflow-hidden mt-4">
              {/* Tab bar */}
              <div className="flex border-b border-w05 overflow-x-auto">
                {TABS.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setTab(key); setPage(0); }}
                    className={`px-[18px] py-3 text-[11px] whitespace-nowrap cursor-pointer border-none font-mono transition-all ${
                      tab === key
                        ? "text-gene-cyan bg-gene-cyan/[0.03] border-b-2 border-b-gene-cyan"
                        : "text-w15 hover:text-w25 bg-transparent border-b-2 border-b-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* ── VOLCANO ── */}
                {tab === "volcano" && (
                  <div>
                    <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
                      <span className="text-[11px] text-w15">log₂FC vs −log₁₀(padj) · Click points to inspect</span>
                      <div className="flex gap-3.5 text-[11px] text-w25">
                        <label>
                          |FC| ≥{" "}
                          <input type="number" value={fcTh} step={0.5} min={0} onChange={(e) => setFcTh(+e.target.value)}
                            className="w-12 bg-w02 border border-w05 rounded px-1.5 py-0.5 text-white font-mono text-[11px] outline-none" />
                        </label>
                        <label>
                          padj &lt;{" "}
                          <input type="number" value={pTh} step={0.01} min={0} max={1} onChange={(e) => setPTh(+e.target.value)}
                            className="w-14 bg-w02 border border-w05 rounded px-1.5 py-0.5 text-white font-mono text-[11px] outline-none" />
                        </label>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={420}>
                      <ScatterChart margin={{ top: 8, right: 28, left: 8, bottom: 22 }} onClick={onVolcanoClick}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" />
                        <XAxis type="number" dataKey="log2FC" domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} label={{ value: "log₂ Fold Change", position: "bottom", offset: 6, fill: "rgba(255,255,255,0.1)", fontSize: 11 }} />
                        <YAxis type="number" dataKey="negLog10P" tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} label={{ value: "−log₁₀(padj)", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.1)", fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <ReferenceLine x={fcTh} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <ReferenceLine x={-fcTh} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <ReferenceLine y={-Math.log10(pTh)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <Scatter data={volcanoData} cursor="pointer">
                          {volcanoData.map((e, i) => (
                            <Cell key={i} fill={e.dd === "up" ? "rgba(251,113,133,0.65)" : e.dd === "down" ? "rgba(52,211,153,0.65)" : "rgba(255,255,255,0.06)"} r={e.dd !== "ns" ? 4 : 2} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-5 mt-1.5 text-[10px] text-w25">
                      {([["Up", "#fb7185", "up"], ["Down", "#34d399", "down"], ["NS", "rgba(255,255,255,0.15)", "ns"]] as const).map(([l, c, d]) => (
                        <span key={d} className="flex items-center gap-1.5">
                          <span className="w-[7px] h-[7px] rounded-full" style={{ background: c }} />
                          {l} ({volcanoData.filter((v) => v.dd === d).length})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── MA ── */}
                {tab === "ma" && (
                  <div>
                    <div className="text-[11px] text-w15 mb-3.5">MA plot: log₂FC (M) vs mean expression (A) · Click points to inspect</div>
                    <ResponsiveContainer width="100%" height={420}>
                      <ScatterChart margin={{ top: 8, right: 28, left: 8, bottom: 22 }} onClick={onMAClick}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" />
                        <XAxis type="number" dataKey="A" tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} label={{ value: "A = log₂(mean)", position: "bottom", offset: 6, fill: "rgba(255,255,255,0.1)", fontSize: 11 }} />
                        <YAxis type="number" dataKey="M" tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} label={{ value: "M = log₂FC", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.1)", fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                        <ReferenceLine y={1} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <ReferenceLine y={-1} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <Scatter data={maData} cursor="pointer">
                          {maData.map((e, i) => (
                            <Cell key={i} fill={e.direction === "up" ? "rgba(251,113,133,0.55)" : e.direction === "down" ? "rgba(52,211,153,0.55)" : "rgba(255,255,255,0.06)"} r={e.significant ? 3.5 : 1.8} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── DISTRIBUTION ── */}
                {tab === "distribution" && (
                  <div>
                    <div className="text-[11px] text-w15 mb-3.5">log₂FC distribution · Cyan = significant genes</div>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={fcDistribution} margin={{ top: 8, right: 28, left: 8, bottom: 22 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" />
                        <XAxis dataKey="fc" type="number" tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} label={{ value: "log₂ Fold Change", position: "bottom", offset: 6, fill: "rgba(255,255,255,0.1)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} label={{ value: "Count", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.1)", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="count" fill="rgba(255,255,255,0.06)" radius={[3, 3, 0, 0]} name="All" />
                        <Bar dataKey="sig" fill="rgba(34,211,238,0.35)" radius={[3, 3, 0, 0]} name="Significant" />
                        <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── TOP GENES ── */}
                {tab === "topgenes" && (
                  <div>
                    <div className="text-[11px] text-w15 mb-3.5">Top {topGenes.length} significant genes by |log₂FC| · Click bars to inspect</div>
                    {topGenes.length === 0 ? (
                      <div className="text-center py-10 text-w10">No significant genes at current thresholds</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(280, topGenes.length * 17)}>
                        <BarChart data={topGenes} layout="vertical" margin={{ top: 4, right: 28, left: 95, bottom: 4 }} onClick={onBarClick}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 10 }} />
                          <YAxis type="category" dataKey="gene" width={88} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} />
                          <Tooltip content={<ChartTooltip />} />
                          <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
                          <Bar dataKey="log2FC" radius={[0, 3, 3, 0]} cursor="pointer">
                            {topGenes.map((e, i) => (
                              <Cell key={i} fill={e.log2FC > 0 ? "rgba(251,113,133,0.45)" : "rgba(52,211,153,0.45)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}

                {/* ── TABLE ── */}
                {tab === "table" && (
                  <div>
                    <div className="flex gap-2.5 items-center mb-3.5 flex-wrap">
                      <input
                        type="text"
                        placeholder="Filter gene ID…"
                        value={tableSearch}
                        onChange={(e) => { setTableSearch(e.target.value); setPage(0); }}
                        className="w-[220px] bg-white/[0.025] border border-w05 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-gene-cyan/40 font-mono"
                      />
                      <div className="flex gap-1">
                        {([["all", "All"], ["sig", "Significant"], ["up", "Up"], ["down", "Down"]] as const).map(([v, l]) => (
                          <button
                            key={v}
                            onClick={() => { setDirFilter(v); setPage(0); }}
                            className={`text-[10px] px-2.5 py-1 border rounded-md cursor-pointer font-mono transition-all bg-transparent ${
                              dirFilter === v ? "text-gene-cyan border-gene-cyan/25" : "text-w25 border-w05 hover:text-w40"
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-w10 ml-auto">{sortedTable.length.toLocaleString()} genes</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-w05">
                            {[["gene", "Gene"], ["log2FC", "log₂FC"], ["baseMean", "Base Mean"], ["pValue", "p-value"], ["padj", "padj (BH)"], ["tumorMean", "Tumor"], ["normalMean", "Normal"], ["direction", "Dir"]].map(([f, l]) => (
                              <th
                                key={f}
                                onClick={() => handleSort(f)}
                                className="text-left py-[7px] px-2 text-w25 cursor-pointer whitespace-nowrap select-none font-normal hover:text-w40 transition-colors"
                              >
                                {l}
                                {sortField === f ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                              </th>
                            ))}
                            <th className="py-[7px] px-1 w-[30px]" />
                          </tr>
                        </thead>
                        <tbody>
                          {pagedTable.map((r, i) => (
                            <tr
                              key={r.gene}
                              onClick={() => setSelGene(r)}
                              className={`border-b border-white/[0.018] cursor-pointer transition-colors hover:bg-white/[0.025] ${
                                i % 2 ? "bg-w02" : "bg-transparent"
                              }`}
                            >
                              <td className="py-1.5 px-2 text-gene-cyan/60 font-medium">{r.gene}</td>
                              <td className={`py-1.5 px-2 ${r.log2FC > 0 ? "text-gene-rose" : r.log2FC < 0 ? "text-gene-emerald" : "text-w25"}`}>{r.log2FC}</td>
                              <td className="py-1.5 px-2 text-w25">{r.baseMean}</td>
                              <td className="py-1.5 px-2 text-w25">{r.pValue < 0.001 ? r.pValue.toExponential(2) : r.pValue.toFixed(4)}</td>
                              <td className="py-1.5 px-2 text-w25">{r.padj < 0.001 ? r.padj.toExponential(2) : r.padj.toFixed(4)}</td>
                              <td className="py-1.5 px-2 text-w25">{r.tumorMean}</td>
                              <td className="py-1.5 px-2 text-w25">{r.normalMean}</td>
                              <td className="py-1.5 px-2">
                                <span className={`px-1.5 py-px rounded text-[9px] uppercase tracking-[0.08em] ${
                                  r.direction === "up" ? "bg-gene-rose/[0.08] text-gene-rose"
                                    : r.direction === "down" ? "bg-gene-emerald/[0.08] text-gene-emerald"
                                    : "bg-w02 text-w10"
                                }`}>
                                  {r.direction === "ns" ? "n.s." : r.direction}
                                </span>
                              </td>
                              <td className="py-1.5 px-1" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${r.gene}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-w15 hover:text-w40 transition-colors"
                                  title="Open in Ensembl"
                                >
                                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-3 mt-3.5 text-[11px]">
                        <button
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="text-w25 bg-transparent border border-w05 rounded-md px-2.5 py-1 cursor-pointer font-mono disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-white/[0.12] transition-colors"
                        >
                          ← Prev
                        </button>
                        <span className="text-w25">Page {page + 1} of {totalPages}</span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          className="text-w25 bg-transparent border border-w05 rounded-md px-2.5 py-1 cursor-pointer font-mono disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-white/[0.12] transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!results && (
          <div className="text-center py-20 text-white/[0.08]">
            <div className="text-[44px] mb-3.5 opacity-30">◇</div>
            <div className="text-[13px]">Load data and run analysis to see results</div>
            <div className="text-[11px] text-w05 mt-1.5">Tip: Click &quot;Load Example&quot; for a quick demo</div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.025] px-6 py-5">
        <div className="max-w-[1200px] mx-auto flex justify-between flex-wrap gap-2 text-[10px] text-white/[0.08]">
          <span>Cancer Pathway Interactive Visualizer v3 · Next.js + Tailwind + Recharts</span>
          <span>KEGG · TCGA/GDC · For research use only</span>
        </div>
      </footer>
    </>
  );
}
