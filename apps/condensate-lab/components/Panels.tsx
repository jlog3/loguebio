"use client";

import { announce } from "@repo/access";
import { useId, useState } from "react";
import { describeDroplet, formatTime, pct, plural, STATE_LABEL } from "@/lib/describe";
import { download, frapCsv, historyCsv, importedCsv, scanCsv } from "@/lib/export";
import { binodal, CRITICAL_CHI, freeEnergy, freeEnergyCurve, spinodal } from "@/lib/sim/floryHuggins";
import { interpretFit, type FitResult, type FrapPoint } from "@/lib/sim/frap";
import { effectiveChi } from "@/lib/sim/params";
import { FRAP_MIN_SIZE, scanThreshold, type Droplet, type FrapRun, type ScanKey } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";
import { LineChart, SortableTable, type Series } from "@repo/kit";
import type { ThemeColors } from "./useTheme";

function chartInk(c: ThemeColors) {
  return { ink: c.ink, muted: c.muted, grid: c.grid, accent: c.accent };
}

// ─── Droplets ────────────────────────────────────────────────────────────────

export function DropletsPanel() {
  const store = useStore();
  const snap = useSnapshot();
  const [frozen, setFrozen] = useState<Droplet[] | null>(null);
  const rows = frozen ?? snap.droplets;
  return (
    <div className="panel-body">
      <p>
        {snap.droplets.length === 0
          ? "No droplets yet. A droplet is a group of at least 8 touching molecules."
          : `${plural(snap.droplets.length, "droplet")}. The largest has ${snap.droplets[0].size} molecules.`}{" "}
        {snap.running && !frozen ? "The table updates while the simulation runs." : ""}
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          aria-pressed={frozen !== null}
          onClick={() => {
            setFrozen(frozen ? null : snap.droplets);
            announce(frozen ? "Table follows the simulation again." : "Table frozen. It shows the droplets as they were just now.", { topic: "table" });
          }}
        >
          {frozen ? "Unfreeze table" : "Freeze table"}
        </button>
      </div>
      <SortableTable
        caption={frozen ? "Droplets (frozen copy)" : "Droplets"}
        rows={rows}
        rowKey={(d) => d.id}
        initialSort={{ key: "size", dir: "desc" }}
        columns={[
          { key: "id", label: "Droplet", value: (d) => d.id, numeric: true },
          { key: "size", label: "Molecules", value: (d) => d.size, numeric: true },
          { key: "protein", label: "Protein", value: (d) => d.protein, numeric: true },
          { key: "rna", label: "RNA", value: (d) => d.rna, numeric: true },
          { key: "state", label: "State", value: (d) => d.solidFraction, format: (d) => STATE_LABEL[d.state] },
          { key: "solid", label: "Solid", value: (d) => d.solidFraction, format: (d) => pct(d.solidFraction), numeric: true },
          { key: "where", label: "Where", value: (d) => d.region },
        ]}
        action={{
          label: "Select",
          render: (d) => (
            <button
              type="button"
              className="button small"
              aria-pressed={snap.selectedId === d.id}
              aria-label={`Select droplet ${d.id}`}
              onClick={() => {
                const exists = store.getSnapshot().droplets.some((x) => x.id === d.id);
                store.select(d.id);
                announce(exists ? `Selected. ${describeDroplet(d)}` : `Droplet ${d.id} no longer exists.`, { topic: "selection" });
              }}
            >
              {snap.selectedId === d.id ? "Selected" : "Select"}
            </button>
          ),
        }}
        emptyText="No droplets yet."
      />
    </div>
  );
}

// ─── Over time ───────────────────────────────────────────────────────────────

export function HistoryPanel({ colors }: { colors: ThemeColors }) {
  const snap = useSnapshot();
  const h = snap.history;
  const last = h[h.length - 1];
  const peak = h.reduce((m, p) => Math.max(m, p.fraction), 0);
  const frac: Series[] = [
    { name: "Protein in droplets", points: h.map((p) => ({ x: p.t, y: p.fraction * 100 })), color: colors.protein, marker: "circle" },
  ];
  if (h.some((p) => p.solidFraction > 0))
    frac.push({ name: "Protein that is solid", points: h.map((p) => ({ x: p.t, y: p.solidFraction * 100 })), color: colors.solid, marker: "square", dash: "6 4" });
  const summary = last
    ? `From time 0 to ${formatTime(last.t)}: protein in droplets went from ${pct(h[0].fraction)} to ${pct(last.fraction)} (highest ${pct(peak)}).${last.solidFraction > 0 ? ` ${pct(last.solidFraction)} of the protein is now solid.` : ""}`
    : "Nothing recorded yet. Press Play, Step or Jump ahead.";
  return (
    <div className="panel-body">
      <LineChart
        title="Protein in droplets over time"
        summary={summary}
        xLabel="Time"
        yLabel="Percent of protein"
        xFormat={formatTime}
        yFormat={(v) => `${Math.round(v)}%`}
        yDomain={[0, 100]}
        series={frac}
        emptyText="Nothing recorded yet. Press Play, Step or Jump ahead."
        {...chartInk(colors)}
      />
      <LineChart
        title="Number of droplets over time"
        summary={last ? `Now ${plural(last.count, "droplet")}; the most at any time was ${h.reduce((m, p) => Math.max(m, p.count), 0)}.` : "Nothing recorded yet."}
        xLabel="Time"
        yLabel="Droplets"
        xFormat={formatTime}
        yFormat={(v) => String(Math.round(v))}
        series={[{ name: "Droplets", points: h.map((p) => ({ x: p.t, y: p.count })), color: colors.rna, marker: "triangle" }]}
        emptyText="Nothing recorded yet."
        {...chartInk(colors)}
      />
      <div className="button-row">
        <button type="button" className="button" disabled={h.length === 0} onClick={() => download("condensate-lab-over-time.csv", historyCsv(snap), "text/csv")}>
          Download as CSV
        </button>
      </div>
    </div>
  );
}

// ─── FRAP ────────────────────────────────────────────────────────────────────

function fitCurve(points: FrapPoint[], fit: FitResult): { x: number; y: number }[] {
  if (!fit.ok || !Number.isFinite(fit.fit.halfTime) || points.length < 2) return [];
  const t1 = points[points.length - 1].t;
  const { i0, plateau, tau } = fit.fit;
  return Array.from({ length: 60 }, (_, k) => {
    const t = (t1 * k) / 59;
    return { x: t, y: i0 + (plateau - i0) * (1 - Math.exp(-t / tau)) };
  });
}

function fitLines(fit: FitResult | null): string[] {
  if (!fit) return ["Recording… a fit appears after 8 readings."];
  if (!fit.ok) return [fit.reason];
  const ht = Number.isFinite(fit.fit.halfTime) ? `Half-time ${formatTime(fit.fit.halfTime)}.` : "Half-time: not measurable (no clear recovery).";
  return [interpretFit(fit), ht, fit.note];
}

export function FrapPanel({ colors }: { colors: ThemeColors }) {
  const store = useStore();
  const snap = useSnapshot();
  const f = snap.frap;
  const fileId = useId();
  const [msg, setMsg] = useState<string | null>(null);

  const runChart = (run: FrapRun) => {
    const series: Series[] = [{ name: "Brightness of the spot", points: run.points.map((p) => ({ x: p.t, y: p.intensity })), color: colors.protein, marker: "circle", line: false }];
    if (run.fit && run.fit.ok) {
      const c = fitCurve(run.points, run.fit);
      if (c.length) series.push({ name: "Fitted recovery curve", points: c, color: colors.ink, marker: "none", dash: "6 4" });
    }
    return (
      <LineChart
        title={`FRAP on droplet ${run.dropletId}`}
        summary={`${run.status === "recording" ? "Recording." : run.endReason ?? "Finished."} Bleached ${run.bleachedCount} molecules in a ${STATE_LABEL[run.stateAtBleach].toLowerCase()} droplet. ${fitLines(run.fit).join(" ")}`}
        xLabel="Time since bleach"
        yLabel="Relative brightness"
        xFormat={formatTime}
        yFormat={(v) => v.toFixed(2)}
        yDomain={[0, 1.2]}
        refLines={[{ axis: "y", value: 1, label: "Brightness before bleaching (1)" }]}
        series={series}
        emptyText="No readings yet."
        {...chartInk(colors)}
      />
    );
  };

  const runs = snap.frapRuns;
  const imp = snap.imported;
  const impSeries: Series[] = imp
    ? [
        { name: "Your readings", points: imp.points.map((p) => ({ x: p.t, y: p.intensity })), color: colors.rna, marker: "triangle", line: false },
        ...(imp.fit.ok ? [{ name: "Fitted recovery curve", points: fitCurve(imp.points, imp.fit), color: colors.ink, marker: "none" as const, dash: "6 4" }] : []),
      ]
    : [];
  const lastRun = runs[runs.length - 1] ?? (f && f.status === "ended" ? f : null);

  return (
    <div className="panel-body">
      <p>
        FRAP tests whether a droplet is liquid: bleach a spot dark, then see if glowing molecules move back in. Brightness here is the spot divided by
        the whole droplet, so a fully mixed liquid returns to 1 and a solid stays low.
      </p>
      {!f ? (
        <p className="note">
          Select a droplet with at least {FRAP_MIN_SIZE} molecules (Droplets tab, the picture, or Next droplet), then press <strong>Bleach a spot</strong>.
        </p>
      ) : (
        runChart(f)
      )}
      <div className="button-row">
        {f && f.status === "recording" ? (
          <button type="button" className="button" onClick={() => { store.stopFrap(); announce("Recording stopped.", { topic: "frap" }); }}>
            Stop recording
          </button>
        ) : null}
        {f ? (
          <button type="button" className="button" onClick={() => download(`condensate-lab-frap-droplet-${f.dropletId}.csv`, frapCsv(f), "text/csv")}>
            Download this curve (CSV)
          </button>
        ) : null}
      </div>

      {runs.length > 0 ? (
        <>
          <SortableTable
            caption="Finished FRAP runs, to compare"
            rows={runs}
            rowKey={(r) => r.id}
            columns={[
              { key: "run", label: "Run", value: (r) => r.id, numeric: true },
              { key: "droplet", label: "Droplet", value: (r) => r.dropletId, numeric: true },
              { key: "state", label: "State when bleached", value: (r) => r.solidAtBleach, format: (r) => STATE_LABEL[r.stateAtBleach] },
              { key: "mobile", label: "Mobile fraction", value: (r) => (r.fit && r.fit.ok ? r.fit.fit.mobileFraction : -1), format: (r) => (r.fit && r.fit.ok ? pct(r.fit.fit.mobileFraction) : "–"), numeric: true },
              {
                key: "half",
                label: "Half-time",
                value: (r) => (r.fit && r.fit.ok && Number.isFinite(r.fit.fit.halfTime) ? r.fit.fit.halfTime : Number.MAX_VALUE),
                format: (r) => (r.fit && r.fit.ok ? (Number.isFinite(r.fit.fit.halfTime) ? formatTime(r.fit.fit.halfTime) : "not measurable") : "–"),
                numeric: true,
              },
              { key: "quality", label: "Fit", value: (r) => (r.fit && r.fit.ok && r.fit.reliable ? 1 : 0), format: (r) => (r.fit && r.fit.ok ? (r.fit.reliable ? "Good" : "Uncertain") : "None") },
            ]}
          />
          <div className="button-row">
            <button type="button" className="button secondary" onClick={() => store.clearFrapRuns()}>
              Clear finished runs
            </button>
          </div>
        </>
      ) : null}

      <h3>Compare with your own FRAP data</h3>
      <p>
        Load a CSV or tab-separated file with two columns: time and intensity. It is read on this device and never uploaded. Readings before the bleach,
        if present, are used to scale the curve to 1.
      </p>
      <div className="file-field">
        <label htmlFor={fileId} className="button">
          Choose a FRAP file
        </label>
        <input
          id={fileId}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          className="file-input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const m = store.importFrap(file.name, text);
            setMsg(m);
            announce(m, { topic: "import" });
            e.target.value = "";
          }}
        />
      </div>
      {msg ? (
        <p className="note" role="status">
          {msg}
        </p>
      ) : null}
      {imp ? (
        <>
          <LineChart
            title={`Your data: ${imp.name}`}
            summary={`${imp.points.length} readings. ${imp.notes.join(" ")} ${fitLines(imp.fit).join(" ")}`}
            xLabel="Time since bleach (your units)"
            yLabel="Relative brightness"
            xFormat={(v) => (Math.abs(v) < 100 ? v.toFixed(1) : Math.round(v).toString())}
            yFormat={(v) => v.toFixed(2)}
            yDomain={[0, 1.2]}
            refLines={[{ axis: "y", value: 1, label: "Brightness before bleaching (1)" }]}
            series={impSeries}
            emptyText="No readings."
            {...chartInk(colors)}
          />
          {lastRun && lastRun.fit && lastRun.fit.ok && imp.fit.ok ? (
            <p>
              Mobile fraction: your data {pct(imp.fit.fit.mobileFraction)}, last simulated run {pct(lastRun.fit.fit.mobileFraction)}. Half-times cannot be compared
              directly: the simulation uses arbitrary time units.
            </p>
          ) : null}
          <div className="button-row">
            <button type="button" className="button" onClick={() => download("your-frap-rescaled.csv", importedCsv(imp), "text/csv")}>
              Download rescaled data (CSV)
            </button>
            <button type="button" className="button secondary" onClick={() => { store.clearImported(); setMsg("Your data was removed from the page."); }}>
              Remove your data
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Threshold scan ─────────────────────────────────────────────────────────

const SCAN_LABEL: Record<ScanKey, { name: string; axis: string; fmt: (v: number) => string }> = {
  chi: { name: "Stickiness (χ)", axis: "Stickiness (χ)", fmt: (v) => v.toFixed(1) },
  proteinCount: { name: "Protein molecules", axis: "Protein molecules", fmt: (v) => String(Math.round(v)) },
  temperature: { name: "Temperature", axis: "Temperature (kT)", fmt: (v) => v.toFixed(1) },
};

export function ScanPanel({ colors }: { colors: ThemeColors }) {
  const store = useStore();
  const snap = useSnapshot();
  const [key, setKey] = useState<ScanKey>("chi");
  const groupId = useId();
  const scan = snap.scan;
  const running = scan?.status === "running";
  let verdict = "";
  if (scan && scan.points.length >= 2) {
    const th = scanThreshold(scan);
    const L = SCAN_LABEL[scan.key];
    if (th.kind === "crossing")
      verdict = th.rising
        ? `Droplets start at about ${L.name.toLowerCase()} ${L.fmt(th.value)} (where 30% of the protein is in droplets), with your other settings.`
        : `Droplets disappear above about ${L.name.toLowerCase()} ${L.fmt(th.value)} (where protein in droplets drops below 30%), with your other settings.`;
    else if (th.kind === "all") verdict = "Droplets formed at every value tested, so the threshold is below this range.";
    else if (th.kind === "none") verdict = "No droplets formed at any value tested: with your other settings, the mix stays mixed across this range.";
    else verdict = "Uncertain: the results go up and down, so there is no single clear threshold.";
  }
  const L = SCAN_LABEL[scan?.key ?? key];
  return (
    <div className="panel-body">
      <p>
        Finds where droplets start by running the simulation many times in the background, changing one setting and keeping the rest of your settings.
        It measures this model&apos;s own threshold (its saturation point), rather than the textbook theory&apos;s.
      </p>
      <fieldset className="radio-group">
        <legend>Change</legend>
        {(Object.keys(SCAN_LABEL) as ScanKey[]).map((k) => (
          <label key={k} className="radio">
            <input type="radio" name={groupId} checked={key === k} onChange={() => setKey(k)} disabled={running} />
            {SCAN_LABEL[k].name}
          </label>
        ))}
      </fieldset>
      <div className="button-row">
        <button
          type="button"
          className="button primary"
          aria-disabled={running}
          onClick={() => {
            if (running) return;
            store.runScan(key);
            announce(`Scanning ${SCAN_LABEL[key].name.toLowerCase()}. This takes a little while; results appear as they finish.`, { topic: "scan" });
          }}
        >
          Find the threshold
        </button>
        <button
          type="button"
          className="button"
          aria-disabled={!running}
          onClick={() => {
            if (!running) return;
            store.cancelScan();
            announce("Scan cancelled.", { topic: "scan" });
          }}
        >
          Cancel scan
        </button>
      </div>
      {scan ? (
        <>
          <p role="status" className="note">
            {scan.status === "running"
              ? `Running: ${scan.points.length} of ${scan.total} values done.`
              : scan.status === "cancelled"
                ? `Cancelled after ${scan.points.length} of ${scan.total} values.`
                : `Done: ${scan.total} values, each run twice from different random starts for 500 time units.`}{" "}
            {verdict}
          </p>
          <LineChart
            title={`Protein in droplets as ${L.name.toLowerCase()} changes`}
            summary={`${verdict || "Results appear as each value finishes."} Disease mode is off during the scan.`}
            xLabel={L.axis}
            yLabel="Percent of protein in droplets"
            xFormat={L.fmt}
            yFormat={(v) => `${Math.round(v)}%`}
            yDomain={[0, 100]}
            refLines={[{ axis: "y", value: 30, label: "30%: counted as forming droplets" }]}
            series={[
              { name: "Average of two runs", points: scan.points.map((p) => ({ x: p.value, y: p.fraction * 100 })), color: colors.protein, marker: "circle" },
              { name: "Lowest run", points: scan.points.map((p) => ({ x: p.value, y: p.min * 100 })), color: colors.muted, marker: "triangle", line: false },
              { name: "Highest run", points: scan.points.map((p) => ({ x: p.value, y: p.max * 100 })), color: colors.muted, marker: "square", line: false },
            ]}
            emptyText="Results appear as each value finishes."
            {...chartInk(colors)}
          />
          <div className="button-row">
            <button type="button" className="button" aria-disabled={scan.points.length === 0} onClick={() => scan.points.length && download(`condensate-lab-scan-${scan.key}.csv`, scanCsv(scan), "text/csv")}>
              Download scan (CSV)
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Theory ──────────────────────────────────────────────────────────────────

export function TheoryPanel({ colors }: { colors: ThemeColors }) {
  const snap = useSnapshot();
  const p = snap.params;
  const chi = Number((effectiveChi(p) / p.temperature).toFixed(2));
  const curve = freeEnergyCurve(chi);
  const b = binodal(chi);
  const s = spinodal(chi);
  const series: Series[] = [{ name: "Free energy of mixing", points: curve.map((q) => ({ x: q.phi, y: q.f })), color: colors.protein, marker: "none" }];
  if (b)
    series.push({
      name: "Where the two phases settle (binodal)",
      points: [b.low, b.high].map((x) => ({ x: Number(x.toFixed(4)), y: freeEnergy(x, chi) })),
      color: colors.rna,
      marker: "diamond",
      line: false,
    });
  if (s)
    series.push({
      name: "Edge of instant separation (spinodal)",
      points: [s.low, s.high].map((x) => ({ x: Number(x.toFixed(4)), y: freeEnergy(x, chi) })),
      color: colors.solid,
      marker: "square",
      line: false,
    });
  const summary = b
    ? `χ = ${chi.toFixed(2)}, above the critical value ${CRITICAL_CHI}: the curve has two dips. A mixture between φ = ${b.low.toFixed(2)} and φ = ${b.high.toFixed(2)} lowers its free energy by splitting into a dilute phase (φ ≈ ${b.low.toFixed(2)}) and a dense phase (φ ≈ ${b.high.toFixed(2)}). Between φ = ${s!.low.toFixed(2)} and ${s!.high.toFixed(2)} it separates at once.`
    : `χ = ${chi.toFixed(2)}, at or below the critical value ${CRITICAL_CHI}: the curve has a single dip, so every mixture stays mixed.`;
  return (
    <div className="panel-body">
      <p>
        Flory-Huggins theory, the textbook model of mixing. The horizontal axis, φ (phi), is the share of space taken by the sticky molecules. The
        curve is the free energy of mixing (in units of kT): lower is more stable.
      </p>
      <p className="note">
        χ here = stickiness × the pH and crowding effects ÷ temperature, from your settings. The theory explains the idea; it does not predict this
        simulation&apos;s exact threshold. Use the Threshold tab for that.
      </p>
      <LineChart
        title="Free energy of mixing against composition"
        summary={summary}
        xLabel="φ (share of space)"
        yLabel="Free energy (kT)"
        xFormat={(v) => v.toFixed(2)}
        yFormat={(v) => v.toFixed(2)}
        xDomain={[0, 1]}
        series={series}
        emptyText="No curve."
        {...chartInk(colors)}
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
      <p>Every change the simulation reported in this run, newest first. The same messages are spoken to screen readers, a few at a time.</p>
      {events.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        <ol className="log" reversed tabIndex={0} aria-label="Changes, newest first">
          {events.map((e) => (
            <li key={e.id}>
              <span className="mono muted">t {formatTime(e.t)}</span> {e.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
