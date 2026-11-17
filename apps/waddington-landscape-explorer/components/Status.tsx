"use client";

import { announce, useAccess, vibrate } from "@repo/access";
import { earcon } from "@repo/kit";
import { useEffect, useRef } from "react";
import { FATE_BLURB, FATE_LABEL } from "@/lib/content";
import { branchSentence, cursorSentence, describeCell, fateSentence, fmt, landscapeSentence, pct } from "@/lib/describe";
import { changesSentence, GENE_NAMES } from "@/lib/model/params";
import { regionName } from "@/lib/model/stats";
import { shapeSvg, type Look } from "@/lib/look";
import type { Fate } from "@/lib/model/params";
import { useSnapshot, useStore } from "./LabContext";

/** A fate's shape as a small inline icon (decorative: the word is always next to it or in the text). */
export function FateIcon({ fate, fill, stroke, size = 16 }: { fate: Fate; fill: string; stroke: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" dangerouslySetInnerHTML={{ __html: shapeSvg(fate, 8, 8, 5, fill, stroke, 1.2) }} />;
}

/** Announces finished recalculations and the end of playback; sounds and buzzes follow the settings. */
export function useChangeChannels(spoken: boolean) {
  const snap = useSnapshot();
  const access = useAccess();
  const lastEvent = useRef(snap.events.length ? snap.events[snap.events.length - 1].id : 0);
  const crossed = useRef<Set<string>>(new Set());
  const lastCursor = useRef(snap.cursor);

  useEffect(() => {
    const fresh = snap.events.filter((e) => e.id > lastEvent.current);
    if (fresh.length) lastEvent.current = fresh[fresh.length - 1].id;
    if (fresh.length) {
      const text = fresh[fresh.length - 1].text;
      if (spoken) announce(text, { topic: "change" });
      if (access.settings.sound) earcon("chord");
      vibrate([40, 60, 40], access.settings);
    }
  }, [snap.events, spoken, access.settings]);

  // while playing: say when each branch appears, once per pass
  useEffect(() => {
    if (snap.cursor < lastCursor.current) crossed.current = new Set();
    lastCursor.current = snap.cursor;
    if (!snap.playing) return;
    for (const s of snap.stats) {
      if (s.branchPoint === null || crossed.current.has(s.fate)) continue;
      if (snap.cursor >= s.branchPoint) {
        crossed.current.add(s.fate);
        if (spoken) announce(`The ${FATE_LABEL[s.fate].toLowerCase()} branch appears at pseudotime ${fmt(s.branchPoint)}.`, { topic: "branch" });
        if (access.settings.sound) earcon("rise");
        vibrate([30], access.settings);
      }
    }
  }, [snap.cursor, snap.playing, snap.stats, spoken, access.settings]);
}

export function StatusSummary({ id, look }: { id: string; look: Look }) {
  const snap = useSnapshot();
  return (
    <div className="status">
      <div className="fate-bar" aria-hidden="true">
        {snap.stats
          .filter((s) => s.count > 0)
          .map((s) => (
            <span key={s.fate} className="fate-seg" style={{ flexGrow: s.share, background: look.fate[s.fate] }} title={`${FATE_LABEL[s.fate]} ${pct(s.share)}`}>
              {s.share > 0.04 ? <FateIcon fate={s.fate} fill={look.paper} stroke={look.outline} /> : null}
            </span>
          ))}
      </div>
      <p id={id} className="status-text">
        {snap.computing ? "Recalculating… " : ""}
        {fateSentence(snap)} {landscapeSentence(snap)} {branchSentence(snap)} {cursorSentence(snap)}
      </p>
      <p className="status-latest muted">
        <span className="label">Settings</span> {changesSentence(snap.params)}.
      </p>
    </div>
  );
}

export function CellCard() {
  const store = useStore();
  const snap = useSnapshot();
  const c = snap.pop.cells.find((x) => x.id === snap.selectedId) ?? null;
  const say = (how: "next" | "prev" | "otherNext") => {
    const n = store.moveSelection(how);
    if (!n) {
      announce("No cells shown yet. Move the pseudotime slider forward.", { topic: "selection" });
      return;
    }
    const list = store.branchCells(n.fate);
    announce(describeCell(n, { position: [list.findIndex((x) => x.id === n.id) + 1, list.length], branch: n.fate }), { topic: "selection" });
  };
  return (
    <section className="selection" aria-labelledby="cell-h">
      <h3 id="cell-h">Selected cell</h3>
      {c ? (
        <>
          <p>{describeCell(c)}</p>
          <p className="muted">
            {FATE_BLURB[c.fate]} Left the summit at age {c.committedAt === null ? "— (hasn't)" : c.committedAt.toFixed(2)}. {regionName(c.x, c.y)}.
          </p>
          <table className="data-table compact">
            <caption>Gene levels in cell {c.id}</caption>
            <thead>
              <tr>
                <th scope="col">Gene</th>
                <th scope="col" className="num">
                  Level
                </th>
                <th scope="col">
                  <span className="visually-hidden">Bar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {GENE_NAMES.map((g, i) => (
                <tr key={g}>
                  <th scope="row">{g}</th>
                  <td className="num">{pct(c.expr[i])}</td>
                  <td aria-hidden="true">
                    <span className="bar">
                      <span style={{ width: `${c.expr[i] * 100}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="muted">None. Click or tap a cell, use the buttons, or focus the map and use the arrow keys (left and right move along a branch, up and down change branch).</p>
      )}
      <div className="button-row">
        <button type="button" className="button" onClick={() => say("prev")}>
          Previous on branch
        </button>
        <button type="button" className="button" onClick={() => say("next")}>
          Next on branch
        </button>
        <button type="button" className="button" onClick={() => say("otherNext")}>
          Next branch
        </button>
      </div>
    </section>
  );
}
