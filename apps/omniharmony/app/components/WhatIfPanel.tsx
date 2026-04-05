"use client";

import { useState, useCallback, useEffect } from "react";
import { DATA } from "@/lib/data";

interface SimResult {
  feature: string;
  delta: number;
  corr: number;
}

export default function WhatIfPanel() {
  const [perturbLayer, setPerturbLayer] = useState("Transcriptomics");
  const [perturbFeat, setPerturbFeat] = useState(0);
  const [perturbAmount, setPerturbAmount] = useState(0);
  const [simResults, setSimResults] = useState<Record<
    string,
    SimResult[]
  > | null>(null);

  const runSim = useCallback(() => {
    const feat = DATA.features[perturbLayer][perturbFeat];
    const results: Record<string, SimResult[]> = {};
    const otherLayers = DATA.omicsLayers.filter((l) => l !== perturbLayer);
    otherLayers.forEach((layer) => {
      const key = `${perturbLayer}|${layer}`;
      const corrs = DATA.correlations[key]?.[feat];
      if (corrs) {
        results[layer] = corrs.slice(0, 6).map((c) => ({
          feature: c.feature,
          delta: c.corr * perturbAmount,
          corr: c.corr,
        }));
      }
    });
    setSimResults(results);
  }, [perturbLayer, perturbFeat, perturbAmount]);

  useEffect(() => {
    if (perturbAmount !== 0) runSim();
    else setSimResults(null);
  }, [perturbAmount, perturbLayer, perturbFeat, runSim]);

  return (
    <div>
      {/* Layer selector pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        {DATA.omicsLayers.map((l) => {
          const [r, g, b] = DATA.layerColors[l];
          const active = perturbLayer === l;
          return (
            <button
              key={l}
              onClick={() => {
                setPerturbLayer(l);
                setPerturbFeat(0);
              }}
              style={{
                background: active
                  ? `rgba(${r},${g},${b},0.15)`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  active
                    ? `rgb(${r},${g},${b})`
                    : "rgba(255,255,255,0.08)"
                }`,
                color: active
                  ? `rgb(${r},${g},${b})`
                  : "rgba(255,255,255,0.4)",
                fontSize: 9,
                borderRadius: 4,
                padding: "3px 8px",
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {l.slice(0, 5)}
            </button>
          );
        })}
      </div>

      {/* Feature selector */}
      <div style={{ marginBottom: 8 }}>
        <select
          value={perturbFeat}
          onChange={(e) => setPerturbFeat(+e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            padding: "5px 8px",
            borderRadius: 4,
            outline: "none",
            fontFamily: "inherit",
          }}
        >
          {DATA.features[perturbLayer].map((f, i) => (
            <option
              key={i}
              value={i}
              style={{ background: "#0c0e14" }}
            >
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Perturbation slider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.35)",
            width: 60,
          }}
        >
          Perturbation
        </span>
        <input
          type="range"
          min={-2}
          max={2}
          step={0.1}
          value={perturbAmount}
          onChange={(e) => setPerturbAmount(+e.target.value)}
          style={{
            flex: 1,
            color: `rgb(${DATA.layerColors[perturbLayer].join(",")})`,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.5)",
            width: 32,
            textAlign: "right",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {perturbAmount > 0 ? "+" : ""}
          {perturbAmount.toFixed(1)}
        </span>
      </div>

      {/* Results */}
      {simResults && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Predicted Ripple Effects
          </div>
          {Object.entries(simResults).map(([layer, feats]) => {
            const [r, g, b] = DATA.layerColors[layer];
            return (
              <div key={layer} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: `rgb(${r},${g},${b})`,
                    marginBottom: 3,
                    fontWeight: 600,
                    opacity: 0.7,
                  }}
                >
                  {layer}
                </div>
                {feats.map((f, i) => {
                  const barW = Math.min(
                    100,
                    Math.abs(f.delta) * 30
                  );
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          fontSize: 8,
                          color: "rgba(255,255,255,0.45)",
                          textAlign: "right",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f.feature}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: 5,
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 3,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left:
                              f.delta >= 0
                                ? "50%"
                                : `${50 - barW / 2}%`,
                            width: `${barW}%`,
                            height: "100%",
                            background:
                              f.delta >= 0
                                ? `linear-gradient(90deg, transparent, rgb(${r},${g},${b}))`
                                : "linear-gradient(90deg, rgb(255,80,80), transparent)",
                            borderRadius: 3,
                            transition:
                              "width 0.3s, left 0.3s",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: 34,
                          fontSize: 8,
                          color:
                            f.delta >= 0
                              ? `rgba(${r},${g},${b},0.7)`
                              : "rgba(255,80,80,0.7)",
                          textAlign: "right",
                          fontFamily:
                            "'DM Mono', monospace",
                        }}
                      >
                        {f.delta >= 0 ? "+" : ""}
                        {f.delta.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {!simResults && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
            textAlign: "center",
            padding: 10,
          }}
        >
          Adjust the slider to simulate perturbation effects
        </div>
      )}
    </div>
  );
}
