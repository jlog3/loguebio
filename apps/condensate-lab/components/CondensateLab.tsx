"use client";

import { announce, applySettingsToDocument, setAnnounceGap, useAccess } from "@repo/access";
import { Tabs } from "@repo/kit";
import { useEffect, useRef, useState } from "react";
import { GLOSSARY, LIMITS } from "@/lib/content";
import { LabStore } from "@/lib/store";
import { DataDialog, SettingsDialog } from "./Dialogs";
import { Controls } from "./Controls";
import { Guide } from "./Guide";
import { LabContext } from "./LabContext";
import { DropletsPanel, FrapPanel, HistoryPanel, LogPanel, ScanPanel, TheoryPanel } from "./Panels";
import { Playback } from "./Playback";
import { SimCanvas, type PictureMode } from "./SimCanvas";
import { SelectionCard, StatusSummary, useChangeChannels } from "./Status";
import { useThemeColors, type ThemeColors } from "./useTheme";

function Legend({ c }: { c: ThemeColors }) {
  return (
    <ul className="legend picture-legend" aria-label="Key to the picture">
      <li>
        <svg width="18" height="18" aria-hidden="true">
          <circle cx="9" cy="9" r="6" fill={c.protein} />
        </svg>
        Protein (circle): builds droplets
      </li>
      <li>
        <svg width="18" height="18" aria-hidden="true">
          <polygon points="9,2 16,15 2,15" fill={c.rna} />
        </svg>
        RNA (triangle): joins droplets
      </li>
      <li>
        <svg width="18" height="18" aria-hidden="true">
          <rect x="3" y="3" width="12" height="12" fill={c.solid} />
        </svg>
        Solid protein (square)
      </li>
      <li>
        <svg width="18" height="18" aria-hidden="true">
          <circle cx="9" cy="9" r="6" fill="none" stroke={c.protein} strokeWidth="1.5" />
        </svg>
        Bleached (hollow)
      </li>
      <li>
        <svg width="26" height="18" aria-hidden="true">
          <circle cx="13" cy="9" r="7" fill="none" stroke={c.muted} strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
        Droplet, numbered
      </li>
      <li>
        <svg width="26" height="18" aria-hidden="true">
          <circle cx="13" cy="9" r="7" fill="none" stroke={c.accent} strokeWidth="3" />
        </svg>
        Selected droplet
      </li>
    </ul>
  );
}

function Lab({ store }: { store: LabStore }) {
  const access = useAccess();
  const colors = useThemeColors();
  const [guideChoice, setGuideChoice] = useState<boolean | null>(null);
  const [guideStep, setGuideStep] = useState(0);
  const [tab, setTab] = useState("droplets");
  const [modeChoice, setModeChoice] = useState<PictureMode | null>(null);
  const [spoken, setSpoken] = useState(true);
  const [listen, setListen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const autoplayed = useRef(false);

  const guideOpen = guideChoice ?? access.beginner;
  const mode: PictureMode = modeChoice ?? (access.reducedMotion ? "second" : "live");

  useEffect(() => {
    applySettingsToDocument(access);
    setAnnounceGap(1800 * access.readingFactor);
  }, [access]);

  // Start by itself only when the person's settings allow it, and only once.
  useEffect(() => {
    if (access.server || autoplayed.current) return;
    autoplayed.current = true;
    if (access.autoplay) store.play();
  }, [access, store]);
  // Stop work when the page goes away (also lets development's double mount start cleanly).
  useEffect(
    () => () => {
      autoplayed.current = false;
      store.pause();
      store.cancelScan(false);
    },
    [store],
  );

  useChangeChannels(spoken, listen);

  const onBleach = () => {
    const s = store.getSnapshot();
    if (s.selectedId === null) {
      announce("Select a droplet first: click or tap one, use Next droplet, or focus the picture and use the arrow keys.", { topic: "selection" });
      return;
    }
    const msg = store.bleachDroplet(s.selectedId);
    announce(msg, { topic: "frap" });
    if (store.getSnapshot().frap?.status === "recording") {
      setTab("frap");
      if (!store.getSnapshot().running && access.autoplay) store.play();
      else if (!store.getSnapshot().running) announce("Press Play or Jump ahead to watch the recovery.", { topic: "frap-hint" });
    }
  };

  const tabs = [
    { id: "droplets", label: "Droplets", content: <DropletsPanel /> },
    { id: "time", label: "Over time", content: <HistoryPanel colors={colors} /> },
    { id: "frap", label: "FRAP", content: <FrapPanel colors={colors} /> },
    { id: "scan", label: "Threshold", content: <ScanPanel colors={colors} /> },
    { id: "theory", label: "Theory", content: <TheoryPanel colors={colors} /> },
    { id: "log", label: "Log", content: <LogPanel /> },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <a href="#stage" className="skip-link">
          Skip to the simulation
        </a>
        <div className="brand">
          <h1>Condensate Lab</h1>
          <p className="tagline">See how proteins and RNA gather into droplets: the way cells make compartments without walls.</p>
        </div>
        <div className="header-actions" role="group" aria-label="Lab tools">
          <button type="button" className="button" aria-expanded={guideOpen} aria-controls="guide-region" onClick={() => setGuideChoice(!guideOpen)}>
            {guideOpen ? "Hide guide" : "Guide"}
          </button>
          <button type="button" className="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button" className="button" onClick={() => setDataOpen(true)}>
            Save and load
          </button>
        </div>
      </header>

      <main id="main">
        <div id="guide-region">
          {guideOpen ? (
            <Guide
              step={guideStep}
              setStep={setGuideStep}
              onClose={() => setGuideChoice(false)}
              canAutoplay={access.autoplay}
              onOpenTab={(t) => setTab(t)}
            />
          ) : null}
        </div>

        <div className="layout">
          <section id="stage" className="stage panel" aria-labelledby="stage-h" tabIndex={-1}>
            <h2 id="stage-h">The simulation</h2>
            <div className="figure-wrap">
              <SimCanvas colors={colors} mode={mode} labelId="stage-h" describedBy="summary-text canvas-keys" onBleach={onBleach} />
            </div>
            <p id="canvas-keys" className="hint">
              In the picture: arrow keys move between droplets, B bleaches a spot in the selected droplet, Space plays or pauses, Escape clears the
              selection. Click or tap a droplet to select it.
            </p>
            <Legend c={colors} />
            <Playback mode={mode} setMode={setModeChoice} />
            <StatusSummary id="summary-text" />
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                aria-pressed={listen}
                onClick={() => {
                  setListen(!listen);
                  announce(listen ? "Tone off." : "Tone on: its pitch rises as more protein joins droplets.", { topic: "listen" });
                }}
              >
                {listen ? "Stop the tone" : "Hear the result as a tone"}
              </button>
            </div>
            <SelectionCard onBleach={onBleach} />
          </section>

          <Controls />

          <section className="results panel" aria-labelledby="results-h">
            <h2 id="results-h">Results</h2>
            <Tabs label="Results" tabs={tabs} current={tab} onChange={setTab} />
          </section>
        </div>

        <section className="about panel" aria-labelledby="about-h">
          <h2 id="about-h">About this model</h2>
          <p>
            A simplified simulation for building intuition: molecules are beads that jiggle (Brownian motion) and stick to each other. It shows the
            right trends, not real numbers. What it leaves out:
          </p>
          <ul>
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <details>
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
        </section>
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} spoken={spoken} setSpoken={setSpoken} />
      <DataDialog open={dataOpen} onClose={() => setDataOpen(false)} colors={colors} />
    </div>
  );
}

export default function CondensateLab() {
  const [store] = useState(() => new LabStore());
  return (
    <LabContext.Provider value={store}>
      <Lab store={store} />
    </LabContext.Provider>
  );
}
