"use client";

import { useState, type ReactNode } from "react";

export interface Column<R> {
  key: string;
  label: string;
  value: (r: R) => number | string;
  format?: (r: R) => ReactNode;
  numeric?: boolean;
}

/**
 * A plain HTML table with sortable columns. Sort buttons sit in the column
 * headers and report their state with aria-sort, so screen readers and
 * braille displays get the same table everyone sees.
 */
export function SortableTable<R>({
  caption,
  columns,
  rows,
  rowKey,
  initialSort,
  action,
  limit,
  emptyText = "No rows yet.",
}: {
  caption: ReactNode;
  columns: Column<R>[];
  rows: R[];
  rowKey: (r: R) => string | number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  action?: { label: string; render: (r: R) => ReactNode };
  /** Show at most this many rows (evenly spaced); the caption says so. */
  limit?: number;
  emptyText?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: "asc" as const });
  const col = columns.find((c) => c.key === sort.key) ?? columns[0];
  let shown = rows;
  let thinned = false;
  if (limit && rows.length > limit) {
    const stepBy = rows.length / limit;
    shown = Array.from({ length: limit }, (_, i) => rows[Math.floor(i * stepBy)]);
    thinned = true;
  }
  const sorted = [...shown].sort((a, b) => {
    const va = col.value(a);
    const vb = col.value(b);
    const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sort.dir === "asc" ? c : -c;
  });
  return (
    <div className="table-wrap" role="region" aria-label={typeof caption === "string" ? caption : undefined} tabIndex={0}>
      <table className="data-table">
        <caption>
          {caption}
          {thinned ? ` (${limit} of ${rows.length} rows shown, evenly spaced; download the CSV for all)` : ""}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = c.key === sort.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={c.numeric ? "num" : undefined}
                >
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() =>
                      setSort({ key: c.key, dir: active && sort.dir === "asc" ? "desc" : "asc" })
                    }
                  >
                    {c.label}
                    <span aria-hidden="true" className="sort-mark">
                      {active ? (sort.dir === "asc" ? " ▲" : " ▼") : " ⇅"}
                    </span>
                  </button>
                </th>
              );
            })}
            {action ? <th scope="col">{action.label}</th> : null}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (action ? 1 : 0)}>{emptyText}</td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c, i) =>
                  i === 0 ? (
                    <th key={c.key} scope="row" className={c.numeric ? "num" : undefined}>
                      {c.format ? c.format(r) : c.value(r)}
                    </th>
                  ) : (
                    <td key={c.key} className={c.numeric ? "num" : undefined}>
                      {c.format ? c.format(r) : c.value(r)}
                    </td>
                  ),
                )}
                {action ? <td>{action.render(r)}</td> : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
