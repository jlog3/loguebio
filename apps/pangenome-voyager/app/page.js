"use client";

import { useState, useMemo } from "react";
import { generatePangenomeGraph } from "@/lib/data";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import PangenomeGraph from "@/components/PangenomeGraph";
import CompareView from "@/components/CompareView";
import MutationSimulator from "@/components/MutationSimulator";
import VariantPanel from "@/components/VariantPanel";
import StatusBar from "@/components/StatusBar";
import AmbientEffects from "@/components/AmbientEffects";

export default function Home() {
  // ── Core state ──
  const [activeChr, setActiveChr] = useState("chr6");
  const [activeHaplotypes, setActiveHaplotypes] = useState([
    "GRCh38",
    "HG002",
    "HG005",
  ]);
  const [overlayMode, setOverlayMode] = useState("none");
  const [viewMode, setViewMode] = useState("graph");

  // ── Graph interaction state ──
  const [highlightVariant, setHighlightVariant] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });

  // ── Mutation simulator state ──
  const [userVariants, setUserVariants] = useState([]);
  const [simType, setSimType] = useState("INS");
  const [simSegment, setSimSegment] = useState(5);

  // ── Derived data ──
  const graph = useMemo(
    () => generatePangenomeGraph(activeChr),
    [activeChr]
  );

  const selectedVarData = selectedVariant
    ? graph.variants.find((v) => v.nodeId === selectedVariant)
    : null;

  // ── Handlers ──
  const toggleHaplotype = (id) => {
    setActiveHaplotypes((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleChrChange = (chrId) => {
    setActiveChr(chrId);
    setSelectedVariant(null);
    setUserVariants([]);
  };

  const handleVariantClick = (id) => {
    setSelectedVariant(id === selectedVariant ? null : id);
  };

  const addUserVariant = () => {
    if (userVariants.length >= 5) return;
    setUserVariants((prev) => [...prev, { type: simType, segment: simSegment }]);
  };

  const removeUserVariant = (idx) => {
    setUserVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full h-screen bg-void-radial relative overflow-hidden">
      <AmbientEffects />

      <div className="relative z-10 flex flex-col h-full">
        <Header viewMode={viewMode} setViewMode={setViewMode} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <Sidebar
            activeChr={activeChr}
            setActiveChr={setActiveChr}
            activeHaplotypes={activeHaplotypes}
            toggleHaplotype={toggleHaplotype}
            overlayMode={overlayMode}
            setOverlayMode={setOverlayMode}
            zoom={zoom}
            setZoom={setZoom}
            onChrChange={handleChrChange}
          />

          {/* Main viewport */}
          <main className="flex-1 relative overflow-hidden">
            {/* ── Graph View & Simulator ── */}
            {(viewMode === "graph" || viewMode === "simulator") && (
              <div className="w-full h-full relative">
                <PangenomeGraph
                  graph={graph}
                  activeHaplotypes={activeHaplotypes}
                  overlayMode={overlayMode}
                  highlightVariant={highlightVariant}
                  onVariantClick={handleVariantClick}
                  zoom={zoom}
                  pan={pan}
                  userVariants={userVariants}
                />
                <StatusBar
                  graph={graph}
                  userVariantCount={userVariants.length}
                />
              </div>
            )}

            {/* ── Compare Mode ── */}
            {viewMode === "compare" && (
              <CompareView
                graph={graph}
                activeHaplotypes={activeHaplotypes}
                overlayMode={overlayMode}
                highlightVariant={highlightVariant}
                selectedVariant={selectedVariant}
                onVariantClick={handleVariantClick}
              />
            )}

            {/* ── Mutation Simulator Panel ── */}
            {viewMode === "simulator" && (
              <MutationSimulator
                graph={graph}
                simType={simType}
                setSimType={setSimType}
                simSegment={simSegment}
                setSimSegment={setSimSegment}
                userVariants={userVariants}
                onAdd={addUserVariant}
                onRemove={removeUserVariant}
              />
            )}

            {/* ── Variant Detail Panel ── */}
            {selectedVariant && selectedVarData && (
              <VariantPanel
                variant={selectedVarData}
                onClose={() => setSelectedVariant(null)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
