"use client";

interface Props {
  active?: boolean;
  payload?: any[];
}

export default function ChartTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-surface-overlay border border-w10 rounded-lg px-3 py-2 text-[11px] font-mono shadow-2xl">
      <div className="text-gene-cyan font-semibold mb-0.5">{d.gene}</div>
      <div className="text-w40">
        log₂FC:{" "}
        <span className={d.log2FC > 0 ? "text-gene-rose" : "text-gene-emerald"}>
          {typeof d.log2FC === "number"
            ? d.log2FC.toFixed(3)
            : d.M?.toFixed(3)}
        </span>
      </div>
      {d.negLog10P !== undefined && (
        <div className="text-w40">
          −log₁₀(padj): <span className="text-white">{d.negLog10P}</span>
        </div>
      )}
      {d.baseMean !== undefined && (
        <div className="text-w40">
          Base mean: <span className="text-white">{d.baseMean}</span>
        </div>
      )}
      {d.tumorMean !== undefined && (
        <div className="text-w40">
          T: {d.tumorMean} · N: {d.normalMean}
        </div>
      )}
      {d.A !== undefined && (
        <div className="text-w40">Mean expr: {d.A.toFixed(1)}</div>
      )}
    </div>
  );
}
