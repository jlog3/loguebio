"use client";

import { announce, useAccess, vibrate } from "@repo/access";
import { useEffect, useRef } from "react";
import { describeDroplet, digest, formatTime, headline, PHASE_LABEL, pct, rnaSentence, STATE_LABEL, trendSentence } from "@/lib/describe";
import { earcon, setDrone, type Earcon } from "@repo/kit";
import { FRAP_MIN_SIZE, type EventKind, type LabEvent } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";

const PRIORITY: EventKind[] = ["solidified", "dissolved", "merged", "formed", "info"];
const EARCON: Record<EventKind, Earcon> = { formed: "rise", dissolved: "fall", merged: "chord", solidified: "buzz", info: "tick" };
const BUZZ: Partial<Record<EventKind, number[]>> = {
  formed: [40],
  merged: [40, 60, 40],
  dissolved: [120],
  solidified: [200, 80, 200],
};

/**
 * Turns state changes into announcements, sounds and vibration. Visual and
 * text channels are always on; sound and vibration follow the settings.
 */
export function useChangeChannels(spoken: boolean, listen: boolean) {
  const snap = useSnapshot();
  const access = useAccess();
  const lastEvent = useRef(0);
  const lastRun = useRef(snap.runId);
  const prev = useRef<{ count: number; fraction: number } | null>(null);

  useEffect(() => {
    if (lastRun.current !== snap.runId) {
      lastRun.current = snap.runId;
      lastEvent.current = 0;
      prev.current = null;
    }
    const fresh: LabEvent[] = snap.events.filter((e) => e.id > lastEvent.current);
    if (fresh.length) lastEvent.current = fresh[fresh.length - 1].id;
    if (!snap.running && fresh.every((e) => e.kind === "info")) {
      // actions while paused announce their own result
      prev.current = { count: snap.summary.count, fraction: snap.summary.fraction };
      return;
    }
    const kinds = new Set(fresh.map((e) => e.kind));
    const top = PRIORITY.find((k) => kinds.has(k) && k !== "info");
    if (top && access.settings.sound) earcon(EARCON[top]);
    if (top && BUZZ[top]) vibrate(BUZZ[top]!, access.settings);
    if (spoken) {
      const text = digest(fresh, snap.summary, prev.current);
      if (text) {
        announce(text, { topic: "digest" });
        prev.current = { count: snap.summary.count, fraction: snap.summary.fraction };
      }
    }
  }, [snap, access.settings, spoken]);

  useEffect(() => {
    if (listen) setDrone(snap.summary.fraction);
  }, [listen, snap.summary.fraction]);
  useEffect(() => {
    if (!listen) setDrone(null);
    return () => setDrone(null);
  }, [listen]);
}

export function StatusSummary({ id }: { id: string }) {
  const snap = useSnapshot();
  const s = snap.summary;
  const latest = [...snap.events].reverse().find((e) => e.kind !== "info") ?? snap.events[snap.events.length - 1];
  const rna = rnaSentence(s);
  return (
    <div className="status">
      <p className="status-phase">
        <span className={`badge phase-${s.phase}`}>
          <span aria-hidden="true" className="badge-glyph">
            {s.phase === "separated" ? "●●" : s.phase === "borderline" ? "●·" : "··"}
          </span>
          {PHASE_LABEL[s.phase]}
        </span>
        <span className="status-stats">
          <span>
            <strong>{s.count}</strong> droplets
          </span>
          <span>
            <strong>{pct(s.fraction)}</strong> of protein in droplets
          </span>
          {s.solidFraction > 0 ? (
            <span>
              <strong>{pct(s.solidFraction)}</strong> solid
            </span>
          ) : null}
        </span>
      </p>
      <p id={id} className="status-text">
        {headline(s)} {trendSentence(s, snap.running)} {rna}
      </p>
      {latest ? (
        <p className="status-latest">
          <span className="label">Latest change</span> {latest.text}{" "}
          <span className="muted">(time {formatTime(latest.t)})</span>
        </p>
      ) : null}
    </div>
  );
}

export function SelectionCard({ onBleach }: { onBleach: () => void }) {
  const store = useStore();
  const snap = useSnapshot();
  const order = store.readingOrder();
  const d = snap.droplets.find((x) => x.id === snap.selectedId) ?? null;
  const nextRef = useRef<HTMLButtonElement>(null);
  const say = (how: "next" | "prev") => {
    const nd = store.moveSelection(how);
    if (!nd) announce("No droplets to select yet.", { topic: "selection" });
    else {
      const o = store.readingOrder();
      announce(describeDroplet(nd, o.findIndex((x) => x.id === nd.id), o.length), { topic: "selection" });
    }
  };
  return (
    <section className="selection" aria-labelledby="sel-h">
      <h3 id="sel-h">Selected droplet</h3>
      {d ? (
        <>
          <p>{describeDroplet(d, order.findIndex((x) => x.id === d.id), order.length)}</p>
          <p className="muted">
            State: {STATE_LABEL[d.state]}
            {d.state !== "liquid" ? ` (${pct(d.solidFraction)} of its protein is solid)` : ""}. About {Math.max(1, Math.round((2 * d.radius) / 10))} molecules across.
          </p>
          {d.size < FRAP_MIN_SIZE ? (
            <p className="note">Too small to bleach part of it: bleaching needs at least {FRAP_MIN_SIZE} molecules.</p>
          ) : null}
        </>
      ) : (
        <p className="muted">
          {snap.droplets.length === 0
            ? "No droplets yet."
            : "None. Click or tap a droplet, use the buttons below, or focus the picture and use the arrow keys."}
        </p>
      )}
      {/* aria-disabled rather than disabled: a button that loses its droplet keeps keyboard focus */}
      <div className="button-row">
        <button type="button" className="button" onClick={() => say("prev")} aria-disabled={snap.droplets.length === 0}>
          Previous droplet
        </button>
        <button ref={nextRef} type="button" className="button" onClick={() => say("next")} aria-disabled={snap.droplets.length === 0}>
          Next droplet
        </button>
        <button
          type="button"
          className="button primary"
          aria-disabled={!d}
          onClick={() => (d ? onBleach() : announce("Select a droplet first.", { topic: "selection" }))}
        >
          Bleach a spot
        </button>
        <button
          type="button"
          className="button secondary"
          aria-disabled={!d}
          onClick={() => {
            if (!d) return;
            store.select(null);
            announce("No droplet selected.", { topic: "selection" });
            nextRef.current?.focus();
          }}
        >
          Deselect
        </button>
      </div>
    </section>
  );
}
