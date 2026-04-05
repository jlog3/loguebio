"use client";

import { useState, useCallback, useEffect } from "react";
import { DATA } from "@/lib/data";

import InfoTooltip from "./InfoTooltip";
import LayerToggles from "./LayerToggles";
import UMAPCanvas from "./UMAPCanvas";
import PointTooltip from "./PointTooltip";
import FactorNetwork from "./FactorNetwork";
import FactorDetail from "./FactorDetail";
import CorrelationPanel from "./CorrelationPanel";
import WhatIfPanel from "./WhatIfPanel";

import styles from "./Dashboard.module.css";
import panelStyles from "./Panel.module.css";

export default function Dashboard() {
  const [layers, setLayers] = useState<Record<string, number>>({
    Transcriptomics: 1,
    Proteomics: 0.8,
    Epigenomics: 0.6,
    Metabolomics: 0.7,
  });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [activeFactor, setActiveFactor] = useState(-1);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"factors" | "whatif">("factors");

  // Responsive canvas sizing
  const [canvasSize, setCanvasSize] = useState({ w: 580, h: 360 });

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      if (vw < 960) {
        setCanvasSize({ w: Math.min(vw - 48, 600), h: 320 });
      } else {
        const available = vw - 320 - 80; // sidebar + gaps
        setCanvasSize({ w: Math.min(available, 700), h: 380 });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleLayerChange = useCallback((layer: string, val: number) => {
    setLayers((prev) => ({ ...prev, [layer]: val }));
  }, []);

  // When a factor is selected, pick its top feature for cross-omics view
  useEffect(() => {
    if (activeFactor >= 0) {
      let best: { feature: string; layer: string } | null = null;
      let bestVal = 0;
      DATA.omicsLayers.forEach((layer) => {
        DATA.factorLoadings[layer].forEach((fl) => {
          const v = Math.abs(fl.loadings[activeFactor]);
          if (v > bestVal) {
            bestVal = v;
            best = { feature: fl.feature, layer };
          }
        });
      });
      if (best) {
        setSelectedFeature((best as { feature: string; layer: string }).feature);
        setSelectedLayer((best as { feature: string; layer: string }).layer);
      }
    }
  }, [activeFactor]);

  return (
    <div className={styles.wrapper}>
      {/* Ambient background glows */}
      <div className={styles.glowCyan} />
      <div className={styles.glowPink} />

      {/* ─── Header ─── */}
      <div className={styles.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <span className={styles.logo}>OmniHarmony</span>
            <span className={styles.badge}>MULTI-OMICS</span>
          </div>
          <div className={styles.subtitle}>
            Integrated latent-space fusion dashboard — {DATA.points.length} cells
            across 4 omics layers
          </div>
        </div>
        <div className={styles.metaRight}>
          {DATA.clusters.length} clusters · {DATA.nFactors} factors ·{" "}
          {DATA.omicsLayers.length} layers
        </div>
      </div>

      {/* ─── Layer Controls ─── */}
      <div className={styles.layerBar}>
        <InfoTooltip text="Each slider controls the opacity of one omics layer in the shared UMAP embedding. Overlapping regions indicate cross-layer concordance — cells that cluster together across modalities share biological identity.">
          <span className={styles.layerLabel}>LAYER HARMONY</span>
        </InfoTooltip>
        <div className={styles.divider} />
        <LayerToggles layers={layers} onChange={handleLayerChange} />
      </div>

      {/* ─── Main Grid ─── */}
      <div className={styles.mainGrid}>
        {/* Left column */}
        <div className={styles.leftCol}>
          {/* UMAP panel */}
          <div className={panelStyles.panel}>
            <div className={panelStyles.header}>
              <InfoTooltip text="Shared UMAP embedding computed from the joint latent space of all four omics modalities (MOFA+ integration). Each point is a cell; color encodes omics layer. Overlapping points from different layers indicate multi-modal concordance.">
                <span>Shared Latent Space · UMAP</span>
              </InfoTooltip>
              <span className={panelStyles.headerHint}>
                hover to inspect · click to select
              </span>
            </div>
            <div className={styles.umapWrapper}>
              <UMAPCanvas
                layers={layers}
                hoveredPoint={hoveredPoint}
                onHoverPoint={setHoveredPoint}
                onSelectPoint={setSelectedPoint}
                width={canvasSize.w}
                height={canvasSize.h}
              />
              <PointTooltip pointId={hoveredPoint ?? selectedPoint} />
            </div>
          </div>

          {/* Factor Network + Detail */}
          <div className={styles.factorRow}>
            <div className={panelStyles.panel}>
              <div className={panelStyles.header}>
                <InfoTooltip text="Factor network shows latent factors discovered by MOFA+. Edges connect factors that share high-loading features across omics layers. Click a factor to inspect its top feature loadings.">
                  <span>Factor Network</span>
                </InfoTooltip>
              </div>
              <div style={{ padding: 4 }}>
                <FactorNetwork
                  activeFactor={activeFactor}
                  onSetFactor={setActiveFactor}
                  width={270}
                  height={200}
                />
              </div>
            </div>

            <div className={panelStyles.panel}>
              <div className={panelStyles.header}>
                <span>Factor Loadings</span>
              </div>
              <div className={panelStyles.bodyCompact}>
                <FactorDetail factorIdx={activeFactor} />
              </div>
            </div>
          </div>
        </div>

        {/* Right column / sidebar */}
        <div className={styles.rightCol}>
          {/* Tab switch */}
          <div className={styles.tabBar}>
            {(
              [
                { id: "factors", label: "Cross-Omics" },
                { id: "whatif", label: "What-If Sim" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id ? styles.tabActive : styles.tab
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic panel */}
          <div className={panelStyles.panel}>
            <div className={panelStyles.header}>
              {activeTab === "factors" ? (
                <InfoTooltip text="Shows Pearson correlations between the selected feature and features in other omics layers. High correlations indicate features co-regulated across modalities — key for identifying multi-omics biomarker signatures.">
                  <span>Cross-Layer Correlations</span>
                </InfoTooltip>
              ) : (
                <InfoTooltip text="Perturbation simulation: adjust expression/abundance of a feature in one omics layer and observe predicted cascading effects in other layers. Uses learned inter-omics regression weights from the latent factor model.">
                  <span>Perturbation Simulator</span>
                </InfoTooltip>
              )}
            </div>
            <div className={panelStyles.body}>
              {activeTab === "factors" ? (
                <CorrelationPanel
                  selectedFeature={selectedFeature}
                  selectedLayer={selectedLayer}
                />
              ) : (
                <WhatIfPanel />
              )}
            </div>
          </div>

          {/* Dataset Summary */}
          <div className={panelStyles.panel}>
            <div className={panelStyles.header}>
              <span>Dataset Summary</span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              {[
                { label: "Total Cells", value: String(DATA.points.length) },
                { label: "Clusters", value: String(DATA.clusters.length) },
                { label: "Latent Factors", value: String(DATA.nFactors) },
                { label: "Features / Layer", value: "20" },
                { label: "Integration", value: "MOFA+" },
              ].map((s, i) => (
                <div key={i} className={styles.statRow}>
                  <span className={styles.statLabel}>{s.label}</span>
                  <span className={styles.statValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* XAI Explainability */}
          <div className={panelStyles.panelAccent}>
            <div className={panelStyles.header}>
              <span className={styles.xaiHeader}>
                XAI · How Fusion Works
              </span>
            </div>
            <div className={styles.xaiText}>
              <p>
                <span className={styles.xaiStrong}>
                  Latent Space Integration
                </span>{" "}
                — MOFA+ decomposes each omics matrix into shared factors
                and layer-specific noise. The UMAP is computed from the
                joint factor matrix.
              </p>
              <p>
                <span className={styles.xaiStrong}>Factor Loadings</span>{" "}
                — Each factor captures a biological theme (pathway, cell
                state). High-loading features drive that factor across
                layers.
              </p>
              <p>
                <span className={styles.xaiStrong}>
                  Cross-Layer Signals
                </span>{" "}
                — Correlations use regression weights from the factor model
                to estimate inter-omics relationships.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        OMNIHARMONY · MULTI-OMICS INTEGRATION DASHBOARD · SYNTHETIC DEMO DATA
      </div>
    </div>
  );
}
