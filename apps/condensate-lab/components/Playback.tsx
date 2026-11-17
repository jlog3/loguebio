"use client";

import { announce } from "@repo/access";
import { useId } from "react";
import { formatTime, headline } from "@/lib/describe";
import { SPEEDS } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";
import type { PictureMode } from "./SimCanvas";

export function Playback({ mode, setMode }: { mode: PictureMode; setMode: (m: PictureMode) => void }) {
  const store = useStore();
  const snap = useSnapshot();
  const speedId = useId();
  const modeId = useId();

  const after = (verb: string) => {
    const s = store.getSnapshot();
    announce(`${verb} Time ${formatTime(s.time)}. ${headline(s.summary)}`, { topic: "play" });
  };

  return (
    <div className="playback" role="group" aria-label="Simulation controls">
      <div className="playback-row">
        <button
          type="button"
          className="button primary play"
          onClick={() => {
            store.toggle();
            announce(store.getSnapshot().running ? "Playing." : `Paused at time ${formatTime(store.getSnapshot().time)}.`, { topic: "play" });
          }}
        >
          <span aria-hidden="true" className="glyph">
            {snap.running ? "❚❚" : "▶"}
          </span>
          {snap.running ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.stepOnce();
            after("Stepped forward.");
          }}
        >
          Step
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.jump(100);
            after("Jumped ahead 100 time units.");
          }}
        >
          Jump ahead 100
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.jump(1000);
            after("Jumped ahead 1000 time units.");
          }}
        >
          Jump ahead 1000
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.reset();
            announce("Reset: a new run with the same settings and the same starting positions.", { topic: "play" });
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.newSeed();
            announce(`New random start, seed ${store.getSnapshot().params.seed}.`, { topic: "play" });
          }}
        >
          New random start
        </button>
      </div>
      <div className="playback-row">
        <p className="time" aria-live="off">
          Time <span className="mono">{formatTime(snap.time)}</span>
          <span className="time-unit"> (arbitrary units)</span>
        </p>
        <div className="inline-field">
          <label htmlFor={speedId}>Speed</label>
          <select
            id={speedId}
            className="select"
            value={snap.speed}
            onChange={(e) => {
              store.setSpeed(Number(e.target.value));
            }}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s === 1 ? "Normal" : s < 1 ? `Slow (${s}×)` : `Fast (${s}×)`}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-field">
          <label htmlFor={modeId}>Picture updates</label>
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
