"use client";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({
  label,
  value,
  sub,
  color = "#fff",
}: Props) {
  return (
    <div className="bg-w02 border border-w05 rounded-xl px-3.5 py-3">
      <div className="text-[9px] uppercase tracking-[0.15em] text-w25 mb-0.5">
        {label}
      </div>
      <div
        className="text-[22px] font-light font-mono"
        style={{ color }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-w15 mt-0.5">{sub}</div>}
    </div>
  );
}
