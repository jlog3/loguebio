"use client";

import { announce, useAccess } from "@repo/access";
import { useId, useState } from "react";
import { EXPERIMENTS } from "@/lib/content";
import { CELL_COUNTS, GENE_INFO, GENE_NAMES, isNormal, levelWord, NOISE_RANGE, pctLevel, type GeneName } from "@/lib/model/params";
import { useSnapshot, useStore } from "./LabContext";

function GeneControl({ name, value, showHelp }: { name: GeneName; value: number; showHelp: boolean }) {
  const store = useStore();
  const id = useId();
  const info = GENE_INFO[name];
  const set = (v: number, say = true) => {
    store.setGene(name, v);
    if (say) announce(`${name} ${pctLevel(v)}, ${levelWord(v)}. Recalculating.`, { topic: `gene-${name}` });
  };
  const quick: [string, number][] = [
    ["Off", 0],
    ["Normal", 0.5],
    ["Full", 1],
  ];
  return (
    <div className="control gene">
      <div className="control-head">
        <label htmlFor={id} className="control-label gene-name">
          {name}
        </label>
        <output htmlFor={id} className="control-value" aria-hidden="true">
          {pctLevel(value)} · {levelWord(value)}
        </output>
      </div>
      <div className="control-row">
        <button type="button" className="icon-button" aria-label={`Decrease ${name}`} disabled={value <= 0} onClick={() => set(Math.max(0, value - 0.05))}>
          −
        </button>
        <input
          id={id}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          aria-valuetext={`${pctLevel(value)}, ${levelWord(value)}`}
          aria-describedby={`${id}-help`}
          onChange={(e) => set(Number(e.target.value), false)}
        />
        <button type="button" className="icon-button" aria-label={`Increase ${name}`} disabled={value >= 1} onClick={() => set(Math.min(1, value + 0.05))}>
          +
        </button>
      </div>
      <div className="quick-row" role="group" aria-label={`${name} quick levels`}>
        {quick.map(([label, v]) => (
          <button
            key={label}
            type="button"
            className="button small"
            aria-pressed={Math.abs(value - v) < 0.001}
            // starts with the visible word, so voice control ("click Off") works
            aria-label={`${label}: ${name} ${label === "Off" ? "knocked out" : label === "Full" ? "overexpressed" : "at its normal level"}`}
            onClick={() => set(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <p id={`${id}-help`} className={showHelp ? "control-help" : "visually-hidden"}>
        {info.role} <strong>Here:</strong> {info.effect}
      </p>
    </div>
  );
}

export function GenePanel() {
  const store = useStore();
  const snap = useSnapshot();
  const access = useAccess();
  const showHelp = access.beginner;
  const simpler = access.settings.simpler;
  const [moreOpen, setMoreOpen] = useState(false);
  const expId = useId();
  const noiseId = useId();
  const countId = useId();
  const changed = !isNormal(snap.params);
  const main: GeneName[] = simpler ? ["Sox2", "Neurog2", "Olig2", "MyoD", "Gata1"] : [...GENE_NAMES];
  const extra: GeneName[] = simpler ? ["Notch1", "Wnt3a", "Shh"] : [];

  const advanced = (
    <div className="advanced">
      <div className="control">
        <div className="control-head">
          <label htmlFor={noiseId} className="control-label">
            Cell-to-cell randomness
          </label>
          <output htmlFor={noiseId} className="control-value" aria-hidden="true">
            {snap.params.noise.toFixed(1)}
          </output>
        </div>
        <input
          id={noiseId}
          type="range"
          className="wide-range"
          min={NOISE_RANGE.min}
          max={NOISE_RANGE.max}
          step={NOISE_RANGE.step}
          value={snap.params.noise}
          aria-valuetext={snap.params.noise.toFixed(1)}
          aria-describedby={`${noiseId}-help`}
          onChange={(e) => store.setNoise(Number(e.target.value))}
        />
        <p id={`${noiseId}-help`} className={showHelp ? "control-help" : "visually-hidden"}>
          How hard the random kicks are. More randomness lets cells hop over ridges into other valleys.
        </p>
      </div>
      <div className="control">
        <label htmlFor={countId} className="control-label">
          Number of cells
        </label>
        <select id={countId} className="select" value={snap.params.cellCount} onChange={(e) => store.setCellCount(Number(e.target.value))}>
          {CELL_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString()}
            </option>
          ))}
        </select>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button"
          onClick={() => {
            store.newSeed();
            announce(`New random cells, seed ${store.getSnapshot().params.seed}.`, { topic: "seed" });
          }}
        >
          New random cells
        </button>
      </div>
    </div>
  );

  return (
    <section className="panel genes" aria-labelledby="genes-h">
      <div className="panel-head">
        <h2 id="genes-h">Genes</h2>
        <span className={changed ? "badge changed" : "badge"} aria-live="off">
          {changed ? "Changed from normal" : "All normal"}
        </span>
      </div>
      <p className={showHelp ? "control-help" : "visually-hidden"}>
        0% knocks a gene out, 50% is normal, 100% is overexpressed. Each change reshapes the landscape and re-rolls the same cells.
      </p>
      <div className="control">
        <label htmlFor={expId} className="control-label">
          Try an experiment
        </label>
        <select
          id={expId}
          className="select"
          value=""
          onChange={(e) => {
            const ex = EXPERIMENTS.find((x) => x.id === e.target.value);
            if (!ex) return;
            store.applyParams({ genes: ex.genes }, ex.name);
            announce(`${ex.name}: ${ex.summary}`, { topic: "experiment" });
          }}
        >
          <option value="">Choose an experiment…</option>
          {EXPERIMENTS.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>
      {main.map((g) => (
        <GeneControl key={g} name={g} value={snap.params.genes[g]} showHelp={showHelp} />
      ))}
      <div className="button-row">
        <button
          type="button"
          className="button"
          aria-disabled={!changed}
          onClick={() => {
            if (!changed) {
              announce("All genes are already normal.", { topic: "reset" });
              return;
            }
            store.resetGenes();
            announce("All genes back to normal.", { topic: "reset" });
          }}
        >
          Reset all genes
        </button>
      </div>
      <div className="more">
        <button type="button" className="button secondary" aria-expanded={moreOpen} aria-controls="more-genes" onClick={() => setMoreOpen((o) => !o)}>
          {moreOpen ? "Hide" : "Show"} {simpler ? "signalling genes and model settings" : "model settings"}
        </button>
        <div id="more-genes" hidden={!moreOpen}>
          {extra.map((g) => (
            <GeneControl key={g} name={g} value={snap.params.genes[g]} showHelp={showHelp} />
          ))}
          {advanced}
        </div>
      </div>
    </section>
  );
}
