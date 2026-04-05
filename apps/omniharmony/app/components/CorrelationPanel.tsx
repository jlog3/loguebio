"use client";

import { DATA } from "@/lib/data";

interface Props {
  selectedFeature: string | null;
  selectedLayer: string | null;
}

export default function CorrelationPanel({
  selectedFeature,
  selectedLayer,
}: Props) {
  if (!selectedFeature || !selectedLayer) {
    return (
      <div
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          textAlign: "center",
          padding: 30,
        }}
      >
        <div style={{ fontSize: 20, marginBottom: 8 }}>⟡</div>
        Select a feature from the factor loadings
        <br />
        or click a point on the UMAP to explore
        <br />
        cross-omics correlations
      </div>
    );
  }

  const otherLayers = DATA.omicsLayers.filter((l) => l !== selectedLayer);

  return (
    <div style={{ padding: "0 4px" }}>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        Cross-layer signals for{" "}
        <span
          style={{
            color: `rgb(${DATA.layerColors[selectedLayer].join(",")})`,
          }}
        >
          {selectedFeature}
        </span>
      </div>
      {otherLayers.map((layer) => {
        const key = `${selectedLayer}|${layer}`;
        const corrs = DATA.correlations[key]?.[selectedFeature];
        if (!corrs) return null;
        const top5 = corrs.slice(0, 5);
        const [r, g, b] = DATA.layerColors[layer];
        return (
          <div key={layer} style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 10,
                color: `rgb(${r},${g},${b})`,
                marginBottom: 3,
                fontWeight: 600,
                opacity: 0.7,
              }}
            >
              {layer}
            </div>
            {top5.map((c, j) => (
              <div
                key={j}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    width: 65,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.feature}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 3,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left:
                        c.corr >= 0
                          ? "50%"
                          : `${50 + c.corr * 50}%`,
                      width: `${Math.abs(c.corr) * 50}%`,
                      height: "100%",
                      background:
                        c.corr >= 0
                          ? `rgb(${r},${g},${b})`
                          : "rgb(255,80,80)",
                      borderRadius: 3,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 28,
                    fontSize: 8,
                    color: "rgba(255,255,255,0.35)",
                    textAlign: "right",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {c.corr.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
