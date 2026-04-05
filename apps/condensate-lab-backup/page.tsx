"use client";

import { useState, useCallback, useEffect } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import Header from "@/components/Header";
import SimCanvas from "@/components/SimCanvas";
import ControlPanel from "@/components/ControlPanel";
import StatsPanel from "@/components/StatsPanel";
import FrapChart from "@/components/FrapChart";
import PhaseDiagram from "@/components/PhaseDiagram";
import EducationalPanel from "@/components/EducationalPanel";
import RenderOptions from "@/components/RenderOptions";
import Presets from "@/components/Presets";

export default function Home() {
  const sim = useSimulation();
  const [eduOpen, setEduOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"controls" | "experiments" | "visuals">("controls");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize simulation on mount
  useEffect(() => {
    if (mounted) {
      sim.init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleFrap = useCallback(
    (x: number, y: number) => {
      sim.triggerFrap(x, y, 50);
    },
    [sim]
  );

  const handlePresetApply = useCallback(
    (params: Parameters<typeof sim.updateParams>[0]) => {
      sim.updateParams(params);
    },
    [sim]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lab-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-bio-cyan/20 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-bio-purple/20 animate-[spin_2s_linear_infinite_reverse]" />
            <div className="absolute inset-4 rounded-full bg-bio-cyan/30 animate-pulse" />
          </div>
          <p className="text-sm font-mono text-lab-muted animate-pulse">
            Initializing simulation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lab-bg flex flex-col">
      <Header onOpenEdu={() => setEduOpen(true)} />

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* ─── Left Sidebar: Controls ─── */}
        <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-lab-border/50 overflow-y-auto">
          <div className="p-4">
            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-lg bg-lab-surface border border-lab-border mb-4">
              {(["controls", "experiments", "visuals"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded-md font-mono text-[10px] tracking-wider uppercase transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-lab-panel text-bio-cyan border border-bio-cyan/20"
                      : "text-lab-muted hover:text-lab-text"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "controls" && (
              <ControlPanel
                params={sim.params}
                onUpdate={sim.updateParams}
                isRunning={sim.isRunning}
                onStart={sim.start}
                onPause={sim.pause}
                onReset={sim.reset}
              />
            )}
            {activeTab === "experiments" && (
              <Presets onApply={handlePresetApply} onReset={sim.reset} />
            )}
            {activeTab === "visuals" && (
              <RenderOptions
                options={sim.renderOptions}
                onChange={(opts) =>
                  sim.setRenderOptions((prev) => ({ ...prev, ...opts }))
                }
              />
            )}
          </div>
        </aside>

        {/* ─── Center: Simulation Canvas ─── */}
        <section className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 flex flex-col gap-4">
            {/* Canvas */}
            <div className="flex-1 min-h-[300px]">
              <SimCanvas
                setupCanvas={sim.setupCanvas}
                onFrap={handleFrap}
                isRunning={sim.isRunning}
              />
            </div>

            {/* Bottom charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhaseDiagram
                chi={sim.params.interactionStrength}
                temperature={sim.params.temperature}
              />
              <FrapChart data={sim.frapData} />
            </div>
          </div>
        </section>

        {/* ─── Right Sidebar: Stats ─── */}
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 border-l border-lab-border/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            <StatsPanel
              stats={sim.stats}
              diseaseMode={sim.params.diseaseMode}
            />

            {/* Quick reference card */}
            <div className="glass-panel p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-lab-muted mb-3">
                Quick Reference
              </h3>
              <div className="space-y-2.5 text-[11px] font-mono text-lab-text leading-relaxed">
                <div className="flex gap-2">
                  <span className="text-bio-cyan shrink-0">χ &gt; 2</span>
                  <span className="text-lab-muted">→ Phase separation occurs</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-bio-amber shrink-0">↑ Temp</span>
                  <span className="text-lab-muted">→ Condensates dissolve</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-bio-purple shrink-0">+ RNA</span>
                  <span className="text-lab-muted">→ Co-partitions into droplets</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-bio-red shrink-0">Disease</span>
                  <span className="text-lab-muted">→ Liquid → solid transition</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-bio-amber shrink-0">FRAP</span>
                  <span className="text-lab-muted">→ Click canvas to photobleach</span>
                </div>
              </div>
            </div>

            {/* Key equations */}
            <div className="glass-panel p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-lab-muted mb-3">
                Flory-Huggins
              </h3>
              <div className="bg-lab-bg/50 rounded-lg p-3 border border-lab-border">
                <p className="text-xs font-mono text-bio-cyan leading-loose">
                  f(φ) = φ·ln(φ) + (1-φ)·ln(1-φ) + χ·φ·(1-φ)
                </p>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-mono text-lab-muted">
                  <span className="text-lab-text">φ</span> — volume fraction
                </p>
                <p className="text-[10px] font-mono text-lab-muted">
                  <span className="text-lab-text">χ</span> — Flory-Huggins parameter
                </p>
                <p className="text-[10px] font-mono text-lab-muted">
                  <span className="text-lab-text">χ<sub>c</sub> = 2</span> — critical value
                </p>
              </div>
            </div>

            {/* Open educational mode link */}
            <button
              onClick={() => setEduOpen(true)}
              className="w-full p-4 rounded-lg border border-bio-purple/20 bg-bio-purple/5
                hover:bg-bio-purple/10 hover:border-bio-purple/30 transition-all duration-200
                text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span>🧪</span>
                <span className="text-xs font-mono font-medium text-bio-purple">
                  Learn LLPS
                </span>
              </div>
              <p className="text-[10px] font-mono text-lab-muted leading-relaxed">
                Step-by-step walkthrough of phase separation theory, condensate biology, and
                disease connections.
              </p>
            </button>
          </div>
        </aside>
      </main>

      {/* ─── Educational Modal ─── */}
      <EducationalPanel isOpen={eduOpen} onClose={() => setEduOpen(false)} />
    </div>
  );
}
