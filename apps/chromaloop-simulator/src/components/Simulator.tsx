'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SimulationState, ViewMode, ColorScheme, DiseasePreset } from '@/types';
import {
  createInitialState,
  stepSimulation,
  applyDiseaseMutation,
  resetMutations,
  DISEASE_PRESETS,
} from '@/lib/polymerPhysics';
import ChromatinViewer3D from './ChromatinViewer3D';
import HiCContactMap from './HiCContactMap';
import GeneExpressionTrack from './GeneExpressionTrack';
import ControlPanel from './ControlPanel';
import DiseaseMode from './DiseaseMode';
import OnboardingTour from './OnboardingTour';
import KeyboardShortcuts from './KeyboardShortcuts';
import ImportExportPanel from './ImportExportPanel';

export default function Simulator() {
  const [simState, setSimState] = useState<SimulationState>(() => createInitialState());
  const [running, setRunning] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('tad');
  const [activeDisease, setActiveDisease] = useState<DiseasePreset | null>(null);
  const [showDiseasePanel, setShowDiseasePanel] = useState(false);
  const [selectedBead, setSelectedBead] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTour, setShowTour] = useState(true);
  const [showImportExport, setShowImportExport] = useState(false);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const hicContainerRef = useRef<HTMLDivElement | null>(null);
  const threeDContainerRef = useRef<HTMLDivElement | null>(null);

  // Simulation loop
  useEffect(() => {
    if (!running) return;

    let animId: number;
    const loop = () => {
      setSimState((prev) => stepSimulation(prev));

      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      frameRef.current++;
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [running]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setRunning((r) => !r);
          break;
        case 'r':
        case 'R':
          setSimState(createInitialState());
          setActiveDisease(null);
          break;
        case '1':
          setViewMode('split');
          break;
        case '2':
          setViewMode('3d-only');
          break;
        case '3':
          setViewMode('hic-only');
          break;
        case 'd':
        case 'D':
          setShowDiseasePanel((v) => !v);
          break;
        case 'l':
        case 'L':
          setSimState((prev) => ({
            ...prev,
            loopExtrusionEnabled: !prev.loopExtrusionEnabled,
          }));
          break;
        case 'Escape':
          setSelectedBead(null);
          setShowShortcuts(false);
          setShowImportExport(false);
          break;
        case 'i':
        case 'I':
          setShowImportExport((v) => !v);
          break;
        case '?':
          setShowShortcuts((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleRunning = useCallback(() => setRunning((r) => !r), []);

  const handleReset = useCallback(() => {
    setSimState(createInitialState());
    setActiveDisease(null);
  }, []);

  const handleTemperatureChange = useCallback((val: number) => {
    setSimState((prev) => ({ ...prev, temperature: val }));
  }, []);

  const handleLoopExtrusionToggle = useCallback(() => {
    setSimState((prev) => ({
      ...prev,
      loopExtrusionEnabled: !prev.loopExtrusionEnabled,
    }));
  }, []);

  const handleCompartmentStrength = useCallback((val: number) => {
    setSimState((prev) => ({ ...prev, compartmentalizationStrength: val }));
  }, []);

  const handleMutateCTCF = useCallback((beadIndex: number) => {
    setSimState((prev) => {
      const newBeads = [...prev.beads];
      const bead = newBeads[beadIndex];
      if (bead.type === 'ctcf_forward' || bead.type === 'ctcf_reverse') {
        newBeads[beadIndex] = { ...bead, type: 'normal', mutated: true };
      }
      const newLoops = prev.loops.map((loop) => {
        if (loop.anchor1 === beadIndex || loop.anchor2 === beadIndex) {
          return { ...loop, strength: 0.05 };
        }
        return loop;
      });
      return { ...prev, beads: newBeads, loops: newLoops };
    });
  }, []);

  const handleDiseaseSelect = useCallback(
    (preset: DiseasePreset) => {
      setActiveDisease(preset);
      setSimState((prev) => applyDiseaseMutation(prev, preset));
    },
    []
  );

  const handleDiseaseReset = useCallback(() => {
    setActiveDisease(null);
    setSimState((prev) => resetMutations(prev));
  }, []);

  const handleLoadState = useCallback((newState: SimulationState) => {
    setSimState(newState);
    setActiveDisease(null);
    setSelectedBead(null);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Onboarding Tour */}
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts show={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Import/Export Panel */}
      <ImportExportPanel
        show={showImportExport}
        onClose={() => setShowImportExport(false)}
        state={simState}
        onLoadState={handleLoadState}
        hicContainerRef={hicContainerRef}
        threeDContainerRef={threeDContainerRef}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-[rgba(0,229,255,0.08)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 rounded-full border-2 border-chromatin-cyan opacity-60 animate-pulse-slow" />
              <div className="absolute inset-1 rounded-full border border-chromatin-magenta opacity-40 animate-pulse-slow" style={{ animationDelay: '1s' }} />
              <div className="absolute inset-[5px] rounded-full bg-chromatin-cyan/30 group-hover:bg-chromatin-cyan/50 transition-colors" />
            </div>
            <div>
              <h1 className="font-display text-[13px] font-bold tracking-wider text-chromatin-cyan glow-text-cyan">
                CHROMALOOP
              </h1>
              <p className="font-mono text-[8px] tracking-widest text-[var(--text-dim)] uppercase">
                3D Chromatin Folding Simulator
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/[0.06]">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded bg-chromatin-cyan/10 text-chromatin-cyan border border-chromatin-cyan/15">
              Simulator
            </span>
            <Link
              href="/learn"
              className="learn-link font-mono text-[10px] px-2.5 py-1 rounded text-[var(--text-secondary)] hover:text-chromatin-magenta hover:bg-chromatin-magenta/5 transition-all flex items-center gap-1"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Learn
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggles */}
          <div className="flex items-center gap-0.5 glass-panel px-1.5 py-0.5">
            {([
              { mode: 'split' as ViewMode, label: '⬒ Split', key: '1' },
              { mode: '3d-only' as ViewMode, label: '◆ 3D', key: '2' },
              { mode: 'hic-only' as ViewMode, label: '▦ Hi-C', key: '3' },
            ]).map(({ mode, label, key }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`font-mono text-[10px] px-2 py-1 rounded transition-all group relative ${
                  viewMode === mode
                    ? 'bg-chromatin-cyan/20 text-chromatin-cyan'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={`${label} (${key})`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Disease mode toggle */}
          <button
            onClick={() => setShowDiseasePanel(!showDiseasePanel)}
            className={`disease-button font-mono text-[10px] px-3 py-1.5 rounded-lg transition-all ${
              showDiseasePanel
                ? 'bg-chromatin-red/20 text-chromatin-red border border-chromatin-red/30'
                : 'glass-panel text-[var(--text-secondary)] hover:text-chromatin-red hover:border-chromatin-red/20'
            }`}
            title="Disease Mode (D)"
          >
            ⚠ Disease
          </button>

          {/* Import/Export toggle */}
          <button
            onClick={() => setShowImportExport(true)}
            className="font-mono text-[10px] px-3 py-1.5 rounded-lg glass-panel text-[var(--text-secondary)] hover:text-chromatin-amber hover:border-chromatin-amber/20 transition-all"
            title="Import / Export (I)"
          >
            ↕ Data
          </button>

          {/* Help buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShortcuts(true)}
              className="font-mono text-[10px] w-7 h-7 flex items-center justify-center rounded-lg glass-panel text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
              title="Keyboard Shortcuts (?)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8" />
              </svg>
            </button>
            <button
              onClick={() => setShowTour(true)}
              className="font-mono text-[10px] w-7 h-7 flex items-center justify-center rounded-lg glass-panel text-[var(--text-dim)] hover:text-chromatin-cyan transition-all"
              title="Restart Tour"
            >
              ?
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 font-mono text-[9px] text-[var(--text-dim)] ml-1">
            <span className={fps > 30 ? 'text-chromatin-green' : 'text-chromatin-amber'}>
              {fps} fps
            </span>
            <div className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-chromatin-green animate-pulse' : 'bg-chromatin-amber'}`} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Control Panel */}
        <ControlPanel
          state={simState}
          running={running}
          colorScheme={colorScheme}
          onToggleRunning={handleToggleRunning}
          onReset={handleReset}
          onTemperatureChange={handleTemperatureChange}
          onLoopExtrusionToggle={handleLoopExtrusionToggle}
          onCompartmentStrength={handleCompartmentStrength}
          onColorSchemeChange={setColorScheme}
          onMutateCTCF={handleMutateCTCF}
        />

        {/* Center: Visualizations */}
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          <div className="flex-1 flex gap-3 min-h-0">
            {/* 3D View */}
            {viewMode !== 'hic-only' && (
              <div ref={threeDContainerRef} className={`glass-panel canvas-container glow-cyan relative ${viewMode === 'split' ? 'flex-1' : 'w-full'}`}>
                <ChromatinViewer3D
                  state={simState}
                  colorScheme={colorScheme}
                  selectedBead={selectedBead}
                  onSelectBead={setSelectedBead}
                  activeDisease={activeDisease}
                />
                {/* Interaction hint */}
                <div className="absolute top-3 left-3 font-mono text-[9px] text-[var(--text-dim)]/50 pointer-events-none select-none">
                  drag · scroll · click beads
                </div>
              </div>
            )}

            {/* Hi-C Map */}
            {viewMode !== '3d-only' && (
              <div ref={hicContainerRef} className={`glass-panel canvas-container glow-magenta ${viewMode === 'split' ? 'w-[340px] flex-shrink-0' : 'w-full'} flex flex-col`}>
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <span className="font-display text-[10px] tracking-wider text-chromatin-magenta/70 uppercase">
                    Hi-C Contact Map
                  </span>
                  <span className="font-mono text-[9px] text-[var(--text-dim)]">
                    {simState.beads.length}×{simState.beads.length} · live
                  </span>
                </div>
                <div className="flex-1 p-2">
                  <HiCContactMap
                    contactMap={simState.contactMap}
                    tads={simState.tads}
                    beads={simState.beads}
                    selectedBead={selectedBead}
                    onSelectBead={setSelectedBead}
                    activeDisease={activeDisease}
                  />
                </div>
                <div className="px-3 pb-2 font-mono text-[8px] text-[var(--text-dim)]/40">
                  bright = close in 3D · triangles = TADs · click to select
                </div>
              </div>
            )}
          </div>

          {/* Gene Expression Track */}
          <div className="h-[120px] flex-shrink-0 glass-panel p-3">
            <GeneExpressionTrack
              beads={simState.beads}
              tads={simState.tads}
              selectedBead={selectedBead}
              onSelectBead={setSelectedBead}
              activeDisease={activeDisease}
            />
          </div>
        </div>

        {/* Right: Disease Mode Panel */}
        {showDiseasePanel && (
          <DiseaseMode
            presets={DISEASE_PRESETS}
            activePreset={activeDisease}
            onSelectPreset={handleDiseaseSelect}
            onReset={handleDiseaseReset}
            state={simState}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-5 py-1 border-t border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-4 font-mono text-[8px] text-[var(--text-dim)]">
          <span>
            {simState.beads.length} beads · {simState.loops.filter(l => l.strength > 0.1).length} active loops · {simState.tads.length} TADs · t={simState.time}
          </span>
          {activeDisease && (
            <span className="text-chromatin-red flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-chromatin-red animate-pulse" />
              {activeDisease.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[8px] text-[var(--text-dim)]">
          <span className={simState.loopExtrusionEnabled ? 'text-chromatin-green/60' : 'text-[var(--text-dim)]'}>
            {simState.loopExtrusionEnabled ? '⟳ loop extrusion' : '⊘ no extrusion'}
          </span>
          <span>T={simState.temperature.toFixed(1)} kT</span>
          <span>A/B={simState.compartmentalizationStrength.toFixed(1)}</span>
          <span className="opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => setShowShortcuts(true)}>
            press ? for shortcuts
          </span>
        </div>
      </div>
    </div>
  );
}
