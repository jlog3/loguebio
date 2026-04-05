"use client";

import { DATA } from "@/lib/data";

interface Props {
  factorIdx: number;
}

export default function FactorDetail({ factorIdx }: Props) {
  if (factorIdx < 0) {
    return (
      <div
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          textAlign: "center",
          padding: 20,
        }}
      >
        Click a factor node to explore loadings
      </div>
    );
  }

  const topFeatures: {
    feature: string;
    layer: string;
    loading: number;
  }[] = [];

  DATA.omicsLayers.forEach((layer) => {
    DATA.factorLoadings[layer].forEach((fl) => {
      topFeatures.push({
        feature: fl.feature,
        layer,
        loading: fl.loadings[factorIdx],
      });
    });
  });
  topFeatures.sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading));
  const top = topFeatures.slice(0, 12);

  return (
    <div style={{ padding: "0 4px" }}>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        Top loadings: {DATA.factorNames[factorIdx]}
      </div>
      {top.map((f, i) => {
        const [r, g, b] = DATA.layerColors[f.layer];
        const w = Math.abs(f.loading) * 100;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 3,
            }}
          >
            <div
              style={{
                width: 70,
                fontSize: 9,
                color: `rgb(${r},${g},${b})`,
                textAlign: "right",
                flexShrink: 0,
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
                height: 6,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${w}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, rgb(${r},${g},${b}), rgba(${r},${g},${b},0.3))`,
                  borderRadius: 3,
                  marginLeft: f.loading < 0 ? `${100 - w}%` : 0,
                }}
              />
            </div>
            <div
              style={{
                width: 32,
                fontSize: 9,
                color: "rgba(255,255,255,0.35)",
                textAlign: "right",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {f.loading.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
