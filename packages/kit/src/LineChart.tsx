"use client";

import { announce } from "@repo/access";
import { useId, useState, type ReactNode } from "react";
import { playSeries } from "./sound";
import { SortableTable, type Column } from "./SortableTable";

export type Marker = "circle" | "triangle" | "square" | "diamond" | "plus" | "none";

export interface Series {
  name: string;
  points: { x: number; y: number }[];
  color: string;
  marker: Marker;
  dash?: string;
  /** Draw a line through the points (default true). */
  line?: boolean;
}

export interface RefLine {
  axis: "x" | "y";
  value: number;
  label: string;
}

const W = 520;
const H = 260;
const M = { l: 56, r: 16, t: 16, b: 46 };

function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(10)));
  return out;
}

export function MarkerShape({ m, x, y, size, color }: { m: Marker; x: number; y: number; size: number; color: string }) {
  const s = size;
  switch (m) {
    case "circle":
      return <circle cx={x} cy={y} r={s / 2} fill={color} />;
    case "square":
      return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={color} />;
    case "triangle":
      return <polygon points={`${x},${y - s * 0.6} ${x + s * 0.55},${y + s * 0.45} ${x - s * 0.55},${y + s * 0.45}`} fill={color} />;
    case "diamond":
      return <polygon points={`${x},${y - s * 0.6} ${x + s * 0.6},${y} ${x},${y + s * 0.6} ${x - s * 0.6},${y}`} fill={color} />;
    case "plus": {
      const a = s * 0.6;
      const b = s * 0.22;
      return <path d={`M${x - b} ${y - a}H${x + b}V${y - b}H${x + a}V${y + b}H${x + b}V${y + a}H${x - b}V${y + b}H${x - a}V${y - b}H${x - b}Z`} fill={color} />;
    }
    default:
      return null;
  }
}

/**
 * A line chart with its non-visual equivalents built in: a text summary, a
 * keyboard cursor that reads out each point, and a sortable table of the
 * same numbers.
 */
export function LineChart({
  title,
  summary,
  xLabel,
  yLabel,
  xFormat,
  yFormat,
  series,
  xDomain,
  yDomain,
  refLines = [],
  ink,
  muted,
  grid,
  accent,
  tableLimit = 150,
  emptyText,
  children,
  sound = true,
}: {
  title: string;
  summary: ReactNode;
  xLabel: string;
  yLabel: string;
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  series: Series[];
  xDomain?: [number, number];
  yDomain?: [number, number];
  refLines?: RefLine[];
  ink: string;
  muted: string;
  grid: string;
  accent: string;
  tableLimit?: number;
  emptyText: string;
  children?: ReactNode;
  /** Offer "Hear the line" (pitch follows the values). Default true. */
  sound?: boolean;
}) {
  const uid = useId();
  const [cursor, setCursor] = useState<{ s: number; i: number } | null>(null);
  const [hearIdx, setHearIdx] = useState(0);
  const [hearing, setHearing] = useState(false);
  const all = series.flatMap((s) => s.points);
  const has = all.length > 0;
  const [x0, x1] = xDomain ?? (has ? [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))] : [0, 1]);
  const [y0, y1] = yDomain ?? (has ? [Math.min(0, ...all.map((p) => p.y)), Math.max(...all.map((p) => p.y))] : [0, 1]);
  const xs = (v: number) => M.l + ((v - x0) / (x1 - x0 || 1)) * (W - M.l - M.r);
  const ys = (v: number) => H - M.b - ((v - y0) / (y1 - y0 || 1)) * (H - M.t - M.b);
  const xt = niceTicks(x0, x1, 5);
  const yt = niceTicks(y0, y1, 4);

  const active = cursor && series[cursor.s] && series[cursor.s].points[cursor.i] ? cursor : null;
  const readout = active
    ? `${series[active.s].name}: ${xLabel} ${xFormat(series[active.s].points[active.i].x)}, ${yLabel} ${yFormat(series[active.s].points[active.i].y)}`
    : null;

  const move = (s: number, i: number) => {
    const pts = series[s]?.points;
    if (!pts || pts.length === 0) return;
    const ci = Math.max(0, Math.min(pts.length - 1, i));
    setCursor({ s, i: ci });
    const p = pts[ci];
    announce(`${series[s].name}: ${xLabel} ${xFormat(p.x)}, ${yLabel} ${yFormat(p.y)}. Point ${ci + 1} of ${pts.length}.`, { topic: uid });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!has) return;
    const s = active?.s ?? series.findIndex((x) => x.points.length > 0);
    const i = active?.i ?? -1;
    const len = series[s]?.points.length ?? 0;
    const big = Math.max(1, Math.round(len / 10));
    switch (e.key) {
      case "ArrowRight":
        move(s, i + 1);
        break;
      case "ArrowLeft":
        move(s, i < 0 ? len - 1 : i - 1);
        break;
      case "PageUp":
        move(s, i + big);
        break;
      case "PageDown":
        move(s, i - big);
        break;
      case "Home":
        move(s, 0);
        break;
      case "End":
        move(s, len - 1);
        break;
      case "ArrowUp":
      case "ArrowDown": {
        const dir = e.key === "ArrowUp" ? -1 : 1;
        for (let k = 1; k <= series.length; k++) {
          const ns = (s + dir * k + series.length * 2) % series.length;
          const np = series[ns].points;
          if (np.length === 0) continue;
          // nearest x in the other series
          const x = i >= 0 ? series[s].points[i].x : np[0].x;
          let best = 0;
          for (let j = 1; j < np.length; j++) if (Math.abs(np[j].x - x) < Math.abs(np[best].x - x)) best = j;
          move(ns, best);
          break;
        }
        break;
      }
      case "Escape":
        if (!active) return;
        setCursor(null);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!has || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    let best: { s: number; i: number; d: number } | null = null;
    series.forEach((s, si) =>
      s.points.forEach((p, pi) => {
        const d = Math.abs(xs(p.x) - vx);
        if (!best || d < best.d) best = { s: si, i: pi, d };
      }),
    );
    if (best) setCursor({ s: (best as { s: number }).s, i: (best as { i: number }).i });
  };

  // table: one row per distinct x, one column per series
  const xsAll = Array.from(new Set(all.map((p) => p.x))).sort((a, b) => a - b);
  const rows = xsAll.map((x) => ({ x, ys: series.map((s) => s.points.find((p) => p.x === x)?.y ?? null) }));
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "x", label: xLabel, value: (r) => r.x, format: (r) => xFormat(r.x), numeric: true },
    ...series.map((s, k) => ({
      key: `s${k}`,
      label: s.name,
      value: (r: Row) => r.ys[k] ?? -Infinity,
      format: (r: Row) => (r.ys[k] === null ? "–" : yFormat(r.ys[k] as number)),
      numeric: true,
    })),
  ];

  return (
    <figure className="chart" aria-labelledby={`${uid}-t`}>
      <figcaption id={`${uid}-t`} className="chart-title">
        {title}
      </figcaption>
      <p id={`${uid}-s`} className="chart-summary">
        {summary}
      </p>
      <ul className="legend" aria-label="Key">
        {series.map((s) => (
          <li key={s.name}>
            <svg width="28" height="16" aria-hidden="true">
              {s.line !== false ? <line x1="2" y1="8" x2="26" y2="8" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} /> : null}
              <MarkerShape m={s.marker} x={14} y={8} size={9} color={s.color} />
            </svg>
            {s.name}
          </li>
        ))}
        {refLines.map((r) => (
          <li key={r.label}>
            <svg width="28" height="16" aria-hidden="true">
              <line x1="2" y1="8" x2="26" y2="8" stroke={muted} strokeWidth="1.5" strokeDasharray="2 3" />
            </svg>
            {r.label}
          </li>
        ))}
      </ul>
      {has ? (
        <div
          className="chart-surface"
          tabIndex={0}
          role="application"
          aria-roledescription="chart"
          aria-label={`${title}. Use left and right arrows to read points, up and down to switch lines.`}
          aria-describedby={`${uid}-s`}
          onKeyDown={onKeyDown}
          onBlur={() => setCursor(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" aria-hidden="true" onPointerMove={onPointerMove} onPointerLeave={() => setCursor(null)}>
            {yt.map((v) => (
              <g key={`y${v}`}>
                <line x1={M.l} x2={W - M.r} y1={ys(v)} y2={ys(v)} stroke={grid} />
                <text x={M.l - 6} y={ys(v)} textAnchor="end" dominantBaseline="middle" fill={muted} fontSize="12">
                  {yFormat(v)}
                </text>
              </g>
            ))}
            {xt.map((v) => (
              <text key={`x${v}`} x={xs(v)} y={H - M.b + 16} textAnchor="middle" fill={muted} fontSize="12">
                {xFormat(v)}
              </text>
            ))}
            <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke={ink} />
            <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke={ink} />
            <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" fill={ink} fontSize="13">
              {xLabel}
            </text>
            <text transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fill={ink} fontSize="13">
              {yLabel}
            </text>
            {refLines.map((r) =>
              r.axis === "y" ? (
                <line key={r.label} x1={M.l} x2={W - M.r} y1={ys(r.value)} y2={ys(r.value)} stroke={muted} strokeWidth="1.5" strokeDasharray="2 3" />
              ) : (
                <line key={r.label} y1={M.t} y2={H - M.b} x1={xs(r.value)} x2={xs(r.value)} stroke={muted} strokeWidth="1.5" strokeDasharray="2 3" />
              ),
            )}
            {series.map((s) => (
              <g key={s.name}>
                {s.line !== false && s.points.length > 1 ? (
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeDasharray={s.dash}
                    points={s.points.map((p) => `${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(" ")}
                  />
                ) : null}
                {s.marker !== "none"
                  ? s.points
                      .filter((_, i) => s.points.length <= 40 || i % Math.ceil(s.points.length / 40) === 0)
                      .map((p, i) => <MarkerShape key={i} m={s.marker} x={xs(p.x)} y={ys(p.y)} size={8} color={s.color} />)
                  : null}
              </g>
            ))}
            {active ? (
              <g>
                <line
                  x1={xs(series[active.s].points[active.i].x)}
                  x2={xs(series[active.s].points[active.i].x)}
                  y1={M.t}
                  y2={H - M.b}
                  stroke={accent}
                  strokeWidth="1.5"
                />
                <circle
                  cx={xs(series[active.s].points[active.i].x)}
                  cy={ys(series[active.s].points[active.i].y)}
                  r="7"
                  fill="none"
                  stroke={accent}
                  strokeWidth="3"
                />
              </g>
            ) : null}
          </svg>
          <p className="chart-readout" aria-hidden="true">
            {readout ?? "Focus the chart and use the arrow keys, or point at it, to read values."}
          </p>
        </div>
      ) : (
        <p className="empty">{emptyText}</p>
      )}
      {children}
      {has && sound ? (
        <div className="hear-row" role="group" aria-label={`Hear ${title}`}>
          {series.length > 1 ? (
            <label className="inline-field">
              <span>Line to hear</span>
              <select className="select" value={hearIdx} onChange={(e) => setHearIdx(Number(e.target.value))}>
                {series.map((s, k) => (
                  <option key={s.name} value={k}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="button secondary"
            aria-pressed={hearing}
            onClick={() => {
              const s = series[Math.min(hearIdx, series.length - 1)];
              if (hearing) {
                setHearing(false);
                playSeries([], 0);
                return;
              }
              const span = y1 - y0 || 1;
              const vals = s.points.map((p) => (p.y - y0) / span);
              setHearing(true);
              announce(`Playing ${s.name}: low pitch is ${yFormat(y0)}, high pitch is ${yFormat(y1)}, from ${xLabel} ${xFormat(s.points[0].x)} to ${xFormat(s.points[s.points.length - 1].x)}.`, { topic: uid });
              playSeries(vals, Math.min(6, Math.max(2, vals.length / 8)), () => setHearing(false));
            }}
          >
            {hearing ? "Stop sound" : series.length > 1 ? "Hear this line" : "Hear the line"}
          </button>
        </div>
      ) : null}
      {has ? (
        <details className="numbers">
          <summary>Show the numbers as a table</summary>
          <SortableTable caption={`${title}: data`} columns={columns} rows={rows} rowKey={(r) => r.x} limit={tableLimit} />
        </details>
      ) : null}
    </figure>
  );
}
