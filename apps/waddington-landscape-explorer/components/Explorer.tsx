"use client";

import { announce, applySettingsToDocument, cividis, setAnnounceGap, useAccess } from "@repo/access";
import { Tabs } from "@repo/kit";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { FATE_LABEL, FATE_SHAPE, GLOSSARY, LIMITS } from "@/lib/content";
import type { Look } from "@/lib/look";
import { FATES, GENE_NAMES } from "@/lib/model/params";
import { LabStore, type ColorBy, type PictureMode } from "@/lib/store";
import { DataDialog, SettingsDialog } from "./Dialogs";
import { GenePanel } from "./GenePanel";
import { LabContext, useLook, useSnapshot, useStore } from "./LabContext";
import { Landscape3D } from "./Landscape3D";
import { CellsPanel, FatesPanel, GenesPanel, LogPanel, PseudotimePanel } from "./Panels";
import { StateMap } from "./StateMap";
import { CellCard, FateIcon, StatusSummary, useChangeChannels } from "./Status";
import { Story } from "./Story";
import { TimeBar } from "./TimeBar";

const COLOR_LABEL: Record<string, string> = { fate: "Fate", pseudotime: "Pseudotime", age: "True age" };

function Legend({ look, colorBy }: { look: Look; colorBy: ColorBy }) {
  return (
    <div className="legend-wrap">
      <ul className="legend" aria-label="Key to the pictures">
        {FATES.map((f) => (
          <li key={f}>
            <FateIcon fate={f} fill={colorBy === "fate" ? look.fate[f] : look.paper} stroke={look.outline} />
            {FATE_LABEL[f]} ({FATE_SHAPE[f]})
          </li>
        ))}
        <li>
          <svg width="18" height="18" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill={look.paper} stroke={look.ink} strokeWidth="2" />
          </svg>
          Sample marble (true time)
        </li>
      </ul>
      {colorBy !== "fate" ? (
        <div className="scale-legend">
          <span>{colorBy === "pseudotime" || colorBy === "age" ? "0" : "0%"}</span>
          <span className="scale-bar" aria-hidden="true" style={{ background: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map((t) => cividis(t)).join(", ")})` }} />
          <span>{colorBy === "pseudotime" || colorBy === "age" ? "1" : "100%"}</span>
          <span className="muted">
            Colour shows {COLOR_LABEL[colorBy] ?? `${colorBy} level`} (dark blue low, yellow high); shape still shows fate.
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ViewOptions() {
  const store = useStore();
  const snap = useSnapshot();
  const colorId = useId();
  return (
    <div className="playback-row view-options">
      <div className="inline-field">
        <label htmlFor={colorId}>Colour by</label>
        <select id={colorId} className="select" value={snap.colorBy} onChange={(e) => store.setColorBy(e.target.value as ColorBy)}>
          <option value="fate">Fate</option>
          <option value="pseudotime">Pseudotime</option>
          <option value="age">True age</option>
          {GENE_NAMES.map((g) => (
            <option key={g} value={g}>
              {g} level
            </option>
          ))}
        </select>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={snap.arrows}
          onChange={(e) => {
            store.setArrows(e.target.checked);
            announce(e.target.checked ? "Velocity arrows on: each points where its cell is heading." : "Velocity arrows off.", { topic: "arrows" });
          }}
        />
        Velocity arrows
      </label>
      <label className="check">
        <input type="checkbox" checked={snap.marbles} onChange={(e) => store.setMarbles(e.target.checked)} />
        Sample marbles
      </label>
    </div>
  );
}

function Lab({ store }: { store: LabStore }) {
  const access = useAccess();
  const look = useLook();
  const snap = useSnapshot();
  const [storyChoice, setStoryChoice] = useState<boolean | null>(null);
  const [storyStep, setStoryStep] = useState(0);
  const [tab, setTab] = useState("fates");
  const [modeChoice, setModeChoice] = useState<PictureMode | null>(null);
  const [spoken, setSpoken] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [no3d, setNo3d] = useState<string | null>(null);
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const storyOpen = storyChoice ?? access.beginner;
  const mode: PictureMode = modeChoice ?? (access.reducedMotion ? "second" : "live");
  const view = no3d ? "map" : snap.view;

  useEffect(() => {
    applySettingsToDocument(access);
    setAnnounceGap(1800 * access.readingFactor);
  }, [access]);

  useEffect(() => () => store.pause(), [store]);

  useChangeChannels(spoken);

  const setView = (v: "landscape" | "map") => {
    if (v === "landscape" && no3d) {
      announce(no3d, { topic: "view" });
      return;
    }
    store.setView(v);
    announce(v === "map" ? "Map view: the landscape seen from above, with contour lines." : "3D landscape view. Arrow keys turn it; plus and minus zoom.", { topic: "view" });
  };

  const tabs = [
    { id: "fates", label: "Fates", content: <FatesPanel look={look} /> },
    { id: "cells", label: "Cells", content: <CellsPanel look={look} /> },
    { id: "genes", label: "Genes", content: <GenesPanel look={look} /> },
    { id: "check", label: "Pseudotime check", content: <PseudotimePanel look={look} /> },
    { id: "log", label: "Log", content: <LogPanel /> },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <a href="#stage" className="skip-link">
          Skip to the landscape
        </a>
        <div className="brand">
          <h1>Waddington Explorer</h1>
          <p className="tagline">Watch cells roll down a landscape of hills and valleys into their fates, and reshape it by turning genes up and down.</p>
        </div>
        <nav className="header-actions" aria-label="Explorer tools">
          <button type="button" className="button" aria-expanded={storyOpen} aria-controls="story-region" onClick={() => setStoryChoice(!storyOpen)}>
            {storyOpen ? "Hide story" : "Story"}
          </button>
          <Link href="/learn" className="button">
            Learn
          </Link>
          <button type="button" className="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button" className="button" onClick={() => setDataOpen(true)}>
            Save and load
          </button>
        </nav>
      </header>

      <main id="main">
        <div id="story-region">
          {storyOpen ? (
            <Story step={storyStep} setStep={setStoryStep} onClose={() => setStoryChoice(false)} onOpenTab={setTab} onView={setView} />
          ) : null}
        </div>

        <div className="layout">
          <section id="stage" className="stage panel" aria-labelledby="stage-h" tabIndex={-1}>
            <div className="panel-head">
              <h2 id="stage-h" ref={viewHeading}>
                {view === "map" ? "Map of the landscape" : "The landscape"}
              </h2>
              <div className="segmented" role="group" aria-label="View">
                <button type="button" className="button small" aria-pressed={view === "landscape"} onClick={() => setView("landscape")}>
                  3D landscape
                </button>
                <button type="button" className="button small" aria-pressed={view === "map"} onClick={() => setView("map")}>
                  Map from above
                </button>
              </div>
            </div>
            {no3d ? <p className="note">{no3d}</p> : null}
            {view === "landscape" ? (
              <Landscape3D look={look} mode={mode} labelId="stage-h" describedBy="summary-text" onUnavailable={(r) => setNo3d(r)} />
            ) : (
              <div className="figure-wrap">
                <StateMap look={look} mode={mode} labelId="stage-h" describedBy="summary-text map-keys" />
              </div>
            )}
            {view === "map" ? (
              <p id="map-keys" className="hint">
                In the map: left and right arrows move along a branch, up and down switch branch, Page Up and Page Down jump 10 cells, Space plays or pauses. Click or tap a cell to
                select it.
              </p>
            ) : (
              <p className="hint">Drag to turn, scroll or pinch to zoom, tap a cell to select it. With the keyboard: arrow keys turn, + and − zoom, 0 resets.</p>
            )}
            <Legend look={look} colorBy={snap.colorBy} />
            <ViewOptions />
            <TimeBar mode={mode} setMode={setModeChoice} />
            <StatusSummary id="summary-text" look={look} />
            <CellCard />
          </section>

          <GenePanel />

          <section className="results panel" aria-labelledby="results-h">
            <h2 id="results-h">Results</h2>
            <Tabs label="Results" tabs={tabs} current={tab} onChange={setTab} />
          </section>
        </div>

        <section className="about panel" aria-labelledby="about-h">
          <h2 id="about-h">About this model</h2>
          <p>
            A simplified simulation for building intuition. Each cell is a marble that rolls downhill with random kicks; its fate is the valley it ends in. It shows
            the right trends, not real numbers. What it leaves out:
          </p>
          <ul>
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <details className="disclosure">
            <summary>Words used here</summary>
            <dl className="glossary">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.definition}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p>
            <Link href="/learn" className="text-link">
              Read the longer explanations in Learn
            </Link>
          </p>
        </section>
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} spoken={spoken} setSpoken={setSpoken} />
      <DataDialog open={dataOpen} onClose={() => setDataOpen(false)} look={look} />
    </div>
  );
}

export default function Explorer() {
  const [store] = useState(() => new LabStore());
  return (
    <LabContext.Provider value={store}>
      <Lab store={store} />
    </LabContext.Provider>
  );
}
