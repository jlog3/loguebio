"use client";

import { announce, useAccess } from "@repo/access";
import { useId, useRef, useState } from "react";
import { PRESETS } from "@/lib/content";
import { clampParam, formatParam, PARAM_SPECS, type ParamSpec } from "@/lib/sim/params";
import { useSnapshot, useStore } from "./LabContext";

function Slider({ spec, value, showHelp }: { spec: ParamSpec; value: number; showHelp: boolean }) {
  const store = useStore();
  const id = useId();
  const [draft, setDraft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = draft ?? value;

  // Settings that restart the run (molecule counts) wait until you stop moving the slider.
  const commit = (v: number) => {
    const c = clampParam(spec.key, v);
    if (!spec.restarts) {
      store.setParam(spec.key, c);
      return;
    }
    setDraft(c);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      store.setParam(spec.key, c);
      setDraft(null);
    }, 400);
  };

  const nudge = (dir: 1 | -1) => {
    const c = clampParam(spec.key, shown + dir * spec.step);
    commit(c);
    announce(`${spec.label} ${formatParam(spec.key, c)}`, { topic: `param-${spec.key}` });
  };

  return (
    <div className="control">
      <div className="control-head">
        <label htmlFor={id} className="control-label">
          {spec.label}
        </label>
        <output htmlFor={id} className="control-value" aria-hidden="true">
          {formatParam(spec.key, shown)}
        </output>
      </div>
      <div className="control-row">
        <button
          type="button"
          className="icon-button"
          onClick={() => nudge(-1)}
          disabled={shown <= spec.min}
          aria-label={`Decrease ${spec.short}`}
        >
          −
        </button>
        <input
          id={id}
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={shown}
          aria-valuetext={formatParam(spec.key, shown)}
          aria-describedby={`${id}-help`}
          onChange={(e) => commit(Number(e.target.value))}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => nudge(1)}
          disabled={shown >= spec.max}
          aria-label={`Increase ${spec.short}`}
        >
          +
        </button>
      </div>
      <p id={`${id}-help`} className={showHelp ? "control-help" : "visually-hidden"}>
        {spec.help}
        {spec.restarts ? " Changing it starts a new run." : ""}
      </p>
    </div>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
  showHelp,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  showHelp: boolean;
}) {
  const id = useId();
  return (
    <div className="control">
      <label className="switch" htmlFor={id}>
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={`${id}-help`} />
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
        <span className="control-label">{label}</span>
        <span className="switch-state" aria-hidden="true">
          {checked ? "On" : "Off"}
        </span>
      </label>
      <p id={`${id}-help`} className={showHelp ? "control-help" : "visually-hidden"}>
        {help}
      </p>
    </div>
  );
}

export function Controls() {
  const store = useStore();
  const snap = useSnapshot();
  const access = useAccess();
  const p = snap.params;
  const showHelp = access.beginner;
  const [moreOpen, setMoreOpen] = useState(false);
  const simpler = access.settings.simpler;
  const main = PARAM_SPECS.filter((s) => !s.advanced && (s.key !== "rnaCount" || p.multiComponent));
  const advanced = PARAM_SPECS.filter((s) => s.advanced);
  const presetId = useId();

  const advancedBlock = (
    <>
      {advanced.map((s) => (
        <Slider key={s.key} spec={s} value={p[s.key]} showHelp={showHelp} />
      ))}
    </>
  );

  return (
    <section className="panel controls" aria-labelledby="controls-h">
      <h2 id="controls-h">Settings for the mix</h2>
      <div className="control">
        <label htmlFor={presetId} className="control-label">
          Start from an example
        </label>
        <select
          id={presetId}
          className="select"
          value=""
          onChange={(e) => {
            const pr = PRESETS.find((x) => x.id === e.target.value);
            if (!pr) return;
            store.applyParams(pr.params, pr.name);
            announce(`${pr.name}: ${pr.summary}`, { topic: "preset" });
          }}
        >
          <option value="">Choose an example…</option>
          {PRESETS.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name}
            </option>
          ))}
        </select>
        <p className={showHelp ? "control-help" : "visually-hidden"}>
          Illustrative settings inspired by real structures, not measurements of them.
        </p>
      </div>
      {main.map((s) => (
        <Slider key={s.key} spec={s} value={p[s.key]} showHelp={showHelp} />
      ))}
      <Toggle
        label="Include RNA"
        help="RNA molecules (triangles) join the mix. Changing this starts a new run."
        checked={p.multiComponent}
        onChange={(v) => store.setFlag("multiComponent", v)}
        showHelp={showHelp}
      />
      <Toggle
        label="Disease mode"
        help="Large droplets can slowly harden into solid clumps (squares), as with some ALS mutations. Turning it off stops new hardening but does not undo it."
        checked={p.diseaseMode}
        onChange={(v) => store.setFlag("diseaseMode", v)}
        showHelp={showHelp}
      />
      {simpler ? (
        <div className="more">
          <button
            type="button"
            className="button secondary"
            aria-expanded={moreOpen}
            aria-controls="more-settings"
            onClick={() => setMoreOpen((o) => !o)}
          >
            {moreOpen ? "Hide pH, crowding and hardening speed" : "Show pH, crowding and hardening speed"}
          </button>
          <div id="more-settings" hidden={!moreOpen}>
            {advancedBlock}
          </div>
        </div>
      ) : (
        advancedBlock
      )}
    </section>
  );
}
