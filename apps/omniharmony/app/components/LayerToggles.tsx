"use client";

import { DATA } from "@/lib/data";
import styles from "./LayerToggles.module.css";

interface Props {
  layers: Record<string, number>;
  onChange: (layer: string, value: number) => void;
}

export default function LayerToggles({ layers, onChange }: Props) {
  return (
    <div className={styles.row}>
      {DATA.omicsLayers.map((layer) => {
        const [r, g, b] = DATA.layerColors[layer];
        const val = layers[layer];
        const color = `rgb(${r},${g},${b})`;

        return (
          <div key={layer} className={styles.item}>
            <div
              className={styles.dot}
              style={{
                background: val > 0 ? color : "rgba(255,255,255,0.1)",
                boxShadow:
                  val > 0 ? `0 0 8px rgba(${r},${g},${b},0.5)` : "none",
              }}
            />
            <span
              className={styles.label}
              style={{
                color: val > 0 ? color : "rgba(255,255,255,0.25)",
              }}
            >
              {layer}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={val}
              onChange={(e) => onChange(layer, +e.target.value)}
              className={styles.slider}
              style={{ color }}
            />
          </div>
        );
      })}
    </div>
  );
}
