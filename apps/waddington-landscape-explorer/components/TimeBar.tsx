"use client";

import { announce } from "@repo/access";
import { useId } from "react";
import { cursorSentence, fateSentence } from "@/lib/describe";
import { branchOrder } from "@/lib/model/stats";
import { SPEEDS, type PictureMode } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";

export function TimeBar({ mode, setMode }: { mode: PictureMode; setMode: (m: PictureMode) => void }) {
  const store = useStore();
  const snap = useSnapshot();
  const sliderId = useId();
  const speedId = useId();
  const modeId = useId();
  const branches = branchOrder(snap.stats);
  const say = () => announce(cursorSentence(store.getSnapshot()), { topic: "cursor" });

  return (
    <div className="timebar" role="group" aria-label="Pseudotime controls">
      <div className="control">
        <div className="control-head">
          <label htmlFor={sliderId} className="control-label">
            Pseudotime shown
          </label>
          <output htmlFor={sliderId} className="control-value" aria-hidden="true">
            up to {snap.cursor.toFixed(2)} · {snap.visible} cells
          </output>
        </div>
        <div className="timeline">
          <input
            id={sliderId}
            type="range"
            className="wide-range"
            min={0}
            max={1}
            step={0.01}
            value={snap.cursor}
            aria-valuetext={`${snap.cursor.toFixed(2)}: ${snap.visible} of ${snap.pop.cells.length} cells shown`}
            aria-describedby={`${sliderId}-help`}
            onChange={(e) => {
              store.pause();
              store.setCursor(Number(e.target.value));
            }}
          />
          <div className="branch-ticks" aria-hidden="true">
            {branches.map((b) => (
              <span key={b.fate} className="branch-tick" style={{ left: `${(b.branchPoint as number) * 100}%` }} title={`${b.fate} branch starts`}>
                ⑂
              </span>
            ))}
          </div>
        </div>
        <p id={`${sliderId}-help`} className="control-help">
          Cells appear in order of pseudotime: 0 is the summit, 1 the end of the valleys. The ⑂ marks show where each branch splits off.
        </p>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button primary play"
          onClick={() => {
            store.toggle();
            announce(store.getSnapshot().playing ? "Playing from pseudotime " + store.getSnapshot().cursor.toFixed(2) + "." : `Paused. ${cursorSentence(store.getSnapshot())}`, { topic: "play" });
          }}
        >
          <span aria-hidden="true" className="glyph">
            {snap.playing ? "❚❚" : "▶"}
          </span>
          {snap.playing ? "Pause" : snap.cursor >= 0.999 ? "Play from the start" : "Play"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.step(-1);
            say();
          }}
        >
          Step back
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.step(1);
            say();
          }}
        >
          Step forward
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.pause();
            store.setCursor(0);
            say();
          }}
        >
          Start
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.pause();
            store.setCursor(1);
            announce(`Showing all cells. ${fateSentence(store.getSnapshot())}`, { topic: "cursor" });
          }}
        >
          Show all
        </button>
      </div>
      <div className="playback-row">
        <div className="inline-field">
          <label htmlFor={speedId}>Speed</label>
          <select id={speedId} className="select" value={snap.speed} onChange={(e) => store.setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s === 1 ? "Normal" : s < 1 ? `Slow (${s}×)` : `Fast (${s}×)`}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-field">
          <label htmlFor={modeId}>Pictures update</label>
          <select id={modeId} className="select" value={mode} onChange={(e) => setMode(e.target.value as PictureMode)}>
            <option value="live">Smoothly</option>
            <option value="second">Once a second</option>
            <option value="still">Only when paused</option>
          </select>
        </div>
      </div>
    </div>
  );
}
