"use client";

import { announce } from "@repo/access";
import { LineChart, SortableTable, type Marker, type Series } from "@repo/kit";
import { useId, useState } from "react";
import { FATE_LABEL } from "@/lib/content";
import { agreementSentence, depthWord, describeCell, fmt, pct } from "@/lib/describe";
import { cellsCsv, download, expressionCsv, fatesCsv } from "@/lib/export";
import type { Look } from "@/lib/look";
import { relativeDepths } from "@/lib/model/landscape";
import { FATES, GENE_NAMES, isNormal, type Fate, type GeneName, type Lineage } from "@/lib/model/params";
import { expressionAlongPseudotime, MARKER, quantile, regionName } from "@/lib/model/stats";
import { FateIcon } from "./Status";
import { useSnapshot, useStore } from "./LabContext";

export const FATE_MARKER: Record<Fate, Marker> = { stem: "circle", neuron: "triangle", glia: "diamond", muscle: "square", blood: "plus" };

const ink = (l: Look) => ({ ink: l.ink, muted: l.muted, grid: l.grid, accent: l.accent });

// ─── Fates ───────────────────────────────────────────────────────────────────

export function FatesPanel({ look }: { look: Look }) {
  const store = useStore();
  const snap = useSnapshot();
  const rel = relativeDepths(snap.pop.terrain, snap.normal.terrain);
  const normal = isNormal(snap.params);
  return (
    <div className="panel-body">
      <p>
        How many cells took each fate{normal ? "" : ", compared with the normal run (same cells, every gene at 50%)"}. The branch point is the pseudotime by which
        5% of that fate&apos;s cells have appeared.
      </p>
      <SortableTable
        caption="Cell fates"
        rows={snap.stats}
        rowKey={(s) => s.fate}
        columns={[
          { key: "fate", label: "Fate", value: (s) => FATES.indexOf(s.fate), format: (s) => (<span className="fate-cell"><FateIcon fate={s.fate} fill={look.fate[s.fate]} stroke={look.outline} />{FATE_LABEL[s.fate]}</span>) },
          { key: "count", label: "Cells", value: (s) => s.count, numeric: true },
          { key: "share", label: "Share", value: (s) => s.share, format: (s) => pct(s.share), numeric: true },
          { key: "delta", label: "vs normal", value: (s) => s.deltaPoints ?? 0, format: (s) => (s.deltaPoints === null || normal ? "–" : `${s.deltaPoints > 0 ? "+" : ""}${Math.round(s.deltaPoints)} points`), numeric: true },
          { key: "valley", label: "Valley", value: (s) => (s.fate === "stem" ? -1 : rel[s.fate as Lineage]), format: (s) => (s.fate === "stem" ? "summit" : depthWord(rel[s.fate as Lineage])) },
          { key: "branch", label: "Branch point", value: (s) => s.branchPoint ?? 2, format: (s) => (s.fate === "stem" ? "–" : s.branchPoint === null ? "too few cells" : fmt(s.branchPoint)), numeric: true },
          { key: "median", label: "Median pseudotime", value: (s) => s.medianPseudotime ?? -1, format: (s) => fmt(s.medianPseudotime), numeric: true },
          { key: "marker", label: "Marker gene", value: (s) => s.markerMean, format: (s) => `${MARKER[s.fate]} ${pct(s.markerMean)}`, numeric: true },
        ]}
        action={{
          label: "Read",
          render: (s) => (
            <button
              type="button"
              className="button small"
              aria-label={`Read branch: ${FATE_LABEL[s.fate].toLowerCase()}, from its start`}
              onClick={() => {
                store.setFocusFate(s.fate);
                const c = store.moveSelection("first");
                if (!c) {
                  announce(`No ${FATE_LABEL[s.fate].toLowerCase()} cells are shown.`, { topic: "selection" });
                  return;
                }
                const list = store.branchCells(c.fate);
                announce(`${describeCell(c, { position: [1, list.length], branch: c.fate })} Use Next on branch, or the arrow keys in the map, to go on.`, { topic: "selection" });
              }}
            >
              Read branch
            </button>
          ),
        }}
      />
      <div className="button-row">
        <button type="button" className="button" onClick={() => download("waddington-fates.csv", fatesCsv(snap), "text/csv")}>
          Download as CSV
        </button>
      </div>
    </div>
  );
}

// ─── Cells ───────────────────────────────────────────────────────────────────

export function CellsPanel({ look }: { look: Look }) {
  const store = useStore();
  const snap = useSnapshot();
  const [fate, setFate] = useState<Fate | "all">("all");
  const id = useId();
  const rows = snap.pop.cells.filter((c) => c.pseudotime !== null && c.pseudotime <= snap.cursor + 1e-9 && (fate === "all" || c.fate === fate));
  return (
    <div className="panel-body">
      <div className="inline-field">
        <label htmlFor={id}>Show</label>
        <select id={id} className="select" value={fate} onChange={(e) => setFate(e.target.value as Fate | "all")}>
          <option value="all">All shown cells</option>
          {FATES.map((f) => (
            <option key={f} value={f}>
              {FATE_LABEL[f]}
            </option>
          ))}
        </select>
      </div>
      <SortableTable
        caption={`Cells (${rows.length})`}
        rows={rows}
        rowKey={(c) => c.id}
        limit={200}
        initialSort={{ key: "pt", dir: "asc" }}
        columns={[
          { key: "id", label: "Cell", value: (c) => c.id, numeric: true },
          { key: "fate", label: "Fate", value: (c) => FATES.indexOf(c.fate), format: (c) => (<span className="fate-cell"><FateIcon fate={c.fate} fill={look.fate[c.fate]} stroke={look.outline} />{FATE_LABEL[c.fate]}</span>) },
          { key: "pt", label: "Pseudotime", value: (c) => c.pseudotime ?? -1, format: (c) => fmt(c.pseudotime), numeric: true },
          { key: "age", label: "True age", value: (c) => c.age, format: (c) => c.age.toFixed(2), numeric: true },
          { key: "where", label: "Where", value: (c) => regionName(c.x, c.y) },
          { key: "marker", label: "Marker", value: (c) => c.expr[GENE_NAMES.indexOf(MARKER[c.fate])], format: (c) => `${MARKER[c.fate]} ${pct(c.expr[GENE_NAMES.indexOf(MARKER[c.fate])])}`, numeric: true },
        ]}
        action={{
          label: "Select",
          render: (c) => (
            <button
              type="button"
              className="button small"
              // the label repeats the visible word, so voice control and screen readers agree
              aria-label={`${snap.selectedId === c.id ? "Selected" : "Select"}: cell ${c.id}`}
              data-selected={snap.selectedId === c.id || undefined}
              onClick={() => {
                store.select(c.id);
                announce(`Selected. ${describeCell(c)}`, { topic: "selection" });
              }}
            >
              {snap.selectedId === c.id ? "Selected" : "Select"}
            </button>
          ),
        }}
        emptyText="No cells shown yet: move the pseudotime slider forward."
      />
      <div className="button-row">
        <button type="button" className="button" onClick={() => download("waddington-cells.csv", cellsCsv(snap), "text/csv")}>
          Download all cells (CSV)
        </button>
      </div>
    </div>
  );
}

// ─── Genes along pseudotime ─────────────────────────────────────────────────

export function GenesPanel({ look }: { look: Look }) {
  const snap = useSnapshot();
  const [gene, setGene] = useState<GeneName>("Neurog2");
  const id = useId();
  const data = expressionAlongPseudotime(snap.pop.cells, gene);
  const series: Series[] = data.map((d) => ({ name: FATE_LABEL[d.fate], points: d.points.map((p) => ({ x: p.x, y: p.y * 100 })), color: look.fate[d.fate], marker: FATE_MARKER[d.fate] }));
  const parts = data.map((d) => {
    const first = d.points[0];
    const last = d.points[d.points.length - 1];
    const peak = d.points.reduce((m, p) => (p.y > m.y ? p : m), first);
    return `${FATE_LABEL[d.fate].toLowerCase()}: ${pct(first.y)} at ${first.x.toFixed(2)} to ${pct(last.y)} at ${last.x.toFixed(2)} (highest ${pct(peak.y)})`;
  });
  return (
    <div className="panel-body">
      <div className="inline-field">
        <label htmlFor={id}>Gene</label>
        <select id={id} className="select" value={gene} onChange={(e) => setGene(e.target.value as GeneName)}>
          {GENE_NAMES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <LineChart
        title={`${gene} along pseudotime, by fate`}
        summary={parts.length ? `Average ${gene} in each fate's cells: ${parts.join("; ")}. Bins with fewer than 5 cells are left out.` : "Not enough cells to show."}
        xLabel="Pseudotime"
        yLabel={`${gene} level`}
        xFormat={(v) => v.toFixed(2)}
        yFormat={(v) => `${Math.round(v)}%`}
        xDomain={[0, 1]}
        yDomain={[0, 100]}
        series={series}
        emptyText="Not enough cells to show."
        {...ink(look)}
      />
      <div className="button-row">
        <button type="button" className="button" onClick={() => download(`waddington-${gene}-along-pseudotime.csv`, expressionCsv(snap, gene), "text/csv")}>
          Download as CSV
        </button>
      </div>
    </div>
  );
}

// ─── Pseudotime check ───────────────────────────────────────────────────────

export function PseudotimePanel({ look }: { look: Look }) {
  const snap = useSnapshot();
  const bins = 10;
  const med: { x: number; y: number }[] = [];
  const lo: { x: number; y: number }[] = [];
  const hi: { x: number; y: number }[] = [];
  for (let b = 0; b < bins; b++) {
    const v = snap.pop.cells
      .filter((c) => c.pseudotime !== null && c.age >= b / bins && c.age < (b + 1) / bins)
      .map((c) => c.pseudotime as number)
      .sort((p, q) => p - q);
    if (v.length < 5) continue;
    const x = Number(((b + 0.5) / bins).toFixed(2));
    med.push({ x, y: quantile(v, 0.5)! });
    lo.push({ x, y: quantile(v, 0.1)! });
    hi.push({ x, y: quantile(v, 0.9)! });
  }
  return (
    <div className="panel-body">
      <p>
        Real experiments cannot measure a cell&apos;s age, so tools infer pseudotime from genes alone. This simulation knows every cell&apos;s true age, so it
        can check them against each other. Here pseudotime is worked out the usual way: link each cell to its 12 most similar cells and measure the path from the least
        differentiated cell.
      </p>
      <p className="note">{agreementSentence(snap)}</p>
      <LineChart
        title="Inferred pseudotime against true age"
        summary={`Cells grouped by true age (tenths). In each group: the middle pseudotime and the range holding 80% of cells. ${med.length ? `Youngest group: ${fmt(med[0].y)} (from ${fmt(lo[0].y)} to ${fmt(hi[0].y)}); oldest group: ${fmt(med[med.length - 1].y)} (from ${fmt(lo[lo.length - 1].y)} to ${fmt(hi[hi.length - 1].y)}).` : ""} A wide range means cells of the same age are at different stages: some left the summit late.`}
        xLabel="True age"
        yLabel="Pseudotime"
        xFormat={(v) => v.toFixed(2)}
        yFormat={(v) => v.toFixed(2)}
        xDomain={[0, 1]}
        yDomain={[0, 1]}
        refLines={[]}
        series={[
          { name: "Middle (median)", points: med, color: look.fate.neuron, marker: "circle" },
          { name: "Lowest 10%", points: lo, color: look.muted, marker: "triangle", dash: "4 4" },
          { name: "Highest 10%", points: hi, color: look.muted, marker: "square", dash: "4 4" },
        ]}
        emptyText="Not enough cells."
        {...ink(look)}
      />
    </div>
  );
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export function LogPanel() {
  const snap = useSnapshot();
  const events = [...snap.events].reverse();
  return (
    <div className="panel-body">
      <p>Every change and its effect on the fates, newest first. The same messages are spoken to screen readers.</p>
      {events.length === 0 ? (
        <p className="muted">Nothing yet. Change a gene or try an experiment.</p>
      ) : (
        <ol className="log" reversed tabIndex={0} aria-label="Changes, newest first">
          {events.map((e) => (
            <li key={e.id}>{e.text}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
