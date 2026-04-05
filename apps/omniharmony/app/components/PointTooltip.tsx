"use client";

import { DATA } from "@/lib/data";
import styles from "./PointTooltip.module.css";

interface Props {
  pointId: number | null;
}

export default function PointTooltip({ pointId }: Props) {
  if (pointId === null) return null;
  const pt = DATA.points[pointId];
  if (!pt) return null;

  return (
    <div className={styles.tooltip}>
      <div className={styles.title}>Cell #{pt.id}</div>
      <div className={styles.row}>
        Type: <span className={styles.value}>{pt.cellType}</span>
      </div>
      <div className={styles.row}>
        Cluster: <span className={styles.value}>{pt.clusterLabel}</span>
      </div>
      <div className={styles.coords}>
        UMAP: ({pt.base.x.toFixed(2)}, {pt.base.y.toFixed(2)})
      </div>
    </div>
  );
}
