"use client";

import { announce } from "@repo/access";
import { useEffect, useMemo, useRef } from "react";
import { describeCell } from "@/lib/describe";
import { FATE_LABEL } from "@/lib/content";
import { drawShape, contourSegments, scaleColor, type Look } from "@/lib/look";
import { EXTENT, sampleGrid, VALLEY_ANGLES } from "@/lib/model/landscape";
import { GENE_NAMES, LINEAGES } from "@/lib/model/params";
import { marbleAt } from "@/lib/model/simulate";
import type { LabStore, PictureMode, Snapshot } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";

const GRID = 81;

/** Value 0–1 used to colour a cell when not colouring by fate. */
export function cellValue(snap: Snapshot, i: number): number {
  const c = snap.pop.cells[i];
  if (snap.colorBy === "pseudotime") return c.pseudotime ?? 0;
  if (snap.colorBy === "age") return c.age;
  const gi = GENE_NAMES.indexOf(snap.colorBy as (typeof GENE_NAMES)[number]);
  return gi >= 0 ? c.expr[gi] : 0;
}

function draw(canvas: HTMLCanvasElement, store: LabStore, snap: Snapshot, look: Look, contours: { level: number; segs: number[] }[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cssW = canvas.clientWidth || 600;
  const cssH = canvas.clientHeight || 600;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const s = (Math.min(cssW, cssH) / (2 * EXTENT)) * dpr;
  const ox = (canvas.width - 2 * EXTENT * s) / 2;
  const oy = (canvas.height - 2 * EXTENT * s) / 2;
  const X = (x: number) => ox + (x + EXTENT) * s;
  const Y = (y: number) => oy + (EXTENT - y) * s; // map y points up
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = look.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // contour lines: every line is one unit of height
  ctx.lineWidth = dpr;
  ctx.strokeStyle = look.contour;
  const g = (2 * EXTENT) / (GRID - 1);
  for (const c of contours) {
    ctx.beginPath();
    for (let k = 0; k < c.segs.length; k += 4) {
      ctx.moveTo(X(-EXTENT + c.segs[k] * g), Y(-EXTENT + c.segs[k + 1] * g));
      ctx.lineTo(X(-EXTENT + c.segs[k + 2] * g), Y(-EXTENT + c.segs[k + 3] * g));
    }
    ctx.stroke();
  }

  // marble trails
  if (snap.marbles) {
    for (const m of snap.pop.marbles) {
      const n = m.path.length / 2;
      const upto = Math.max(1, Math.floor(snap.cursor * (n - 1)));
      ctx.beginPath();
      ctx.moveTo(X(m.path[0]), Y(m.path[1]));
      for (let k = 1; k <= upto; k++) ctx.lineTo(X(m.path[2 * k]), Y(m.path[2 * k + 1]));
      ctx.strokeStyle = look.fate[m.fate];
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // cells
  const r = 3.1 * dpr * (look.highContrast ? 1.15 : 1);
  const cells = snap.pop.cells;
  const byFate = snap.colorBy === "fate";
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.pseudotime === null || c.pseudotime > snap.cursor + 1e-9) continue;
    drawShape(ctx, c.fate, X(c.x), Y(c.y), r);
    ctx.fillStyle = byFate ? look.fate[c.fate] : scaleColor(cellValue(snap, i));
    ctx.fill();
    ctx.lineWidth = 0.6 * dpr * (look.highContrast ? 2 : 1);
    ctx.strokeStyle = look.outline;
    ctx.stroke();
  }

  // velocity arrows (every third shown cell)
  if (snap.arrows) {
    ctx.strokeStyle = look.ink;
    ctx.lineWidth = 1.1 * dpr;
    let k = 0;
    for (const c of cells) {
      if (c.pseudotime === null || c.pseudotime > snap.cursor + 1e-9) continue;
      if (k++ % 3) continue;
      const len = Math.hypot(c.evx, c.evy);
      if (len < 0.05) continue;
      const L = Math.min(1.2, 0.5 * len) / len;
      const x0 = X(c.x);
      const y0 = Y(c.y);
      const x1 = X(c.x + c.evx * L);
      const y1 = Y(c.y + c.evy * L);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      const a = Math.atan2(y1 - y0, x1 - x0);
      ctx.lineTo(x1 - 4 * dpr * Math.cos(a - 0.5), y1 - 4 * dpr * Math.sin(a - 0.5));
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 4 * dpr * Math.cos(a + 0.5), y1 - 4 * dpr * Math.sin(a + 0.5));
      ctx.stroke();
    }
  }

  // marbles (the sample marbles' current positions)
  if (snap.marbles) {
    for (const m of snap.pop.marbles) {
      const [mx, my] = marbleAt(m, snap.cursor);
      ctx.beginPath();
      ctx.arc(X(mx), Y(my), 5.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = look.paper;
      ctx.fill();
      ctx.lineWidth = 2.2 * dpr;
      ctx.strokeStyle = look.fate[m.fate];
      ctx.stroke();
    }
  }

  // place names last, on a paper backing, so cells never hide them
  ctx.font = `600 ${12 * dpr}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of LINEAGES) {
    const a = VALLEY_ANGLES[f];
    const tx = X(8.9 * Math.cos(a));
    const ty = Y(8.9 * Math.sin(a));
    const label = FATE_LABEL[f];
    const w = ctx.measureText(label).width + 8 * dpr;
    ctx.fillStyle = look.paper;
    ctx.fillRect(tx - w / 2, ty - 9 * dpr, w, 18 * dpr);
    ctx.fillStyle = look.ink;
    ctx.fillText(label, tx, ty);
  }
  {
    const w = ctx.measureText("Summit").width + 8 * dpr;
    ctx.fillStyle = look.paper;
    ctx.fillRect(X(0) - w / 2, Y(0) - 31 * dpr, w, 18 * dpr);
    ctx.fillStyle = look.ink;
    ctx.fillText("Summit", X(0), Y(0) - 22 * dpr);
  }

  // selection
  const sel = cells.find((c) => c.id === snap.selectedId);
  if (sel) {
    ctx.beginPath();
    ctx.arc(X(sel.x), Y(sel.y), 11 * dpr, 0, Math.PI * 2);
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = look.accent;
    ctx.stroke();
  }
  void store;
}

export function StateMap({ look, mode, labelId, describedBy }: { look: Look; mode: PictureMode; labelId: string; describedBy: string }) {
  const store = useStore();
  const snap = useSnapshot();
  const ref = useRef<HTMLCanvasElement>(null);
  const contours = useMemo(() => {
    const { heights, min, max } = sampleGrid(snap.pop.terrain, GRID);
    const levels: number[] = [];
    for (let L = Math.ceil(min); L <= Math.floor(max); L += 1) levels.push(L + 0.001);
    return contourSegments(heights, GRID, levels);
  }, [snap.pop.terrain]);
  const latest = useRef({ look, mode, contours });
  const lastDraw = useRef(0);

  useEffect(() => {
    latest.current = { look, mode, contours };
    const c = ref.current;
    if (!c) return;
    if (snap.playing && mode === "still") return;
    if (snap.playing && mode === "second" && performance.now() - lastDraw.current < 1000) return;
    lastDraw.current = performance.now();
    draw(c, store, snap, look, contours);
  }, [store, snap, look, mode, contours]);

  useEffect(() => {
    const off = store.onFrame(() => {
      const c = ref.current;
      if (!c) return;
      const { look: l, mode: m, contours: ct } = latest.current;
      const s = store.getSnapshot();
      const now = performance.now();
      if (s.playing && m === "still") return;
      if (s.playing && m === "second" && now - lastDraw.current < 1000) return;
      lastDraw.current = now;
      // the cursor moves every frame; draw with the store's live value
      draw(c, store, { ...s, cursor: store.getSnapshot().cursor }, l, ct);
    });
    const ro = new ResizeObserver(() => {
      if (ref.current) draw(ref.current, store, store.getSnapshot(), latest.current.look, latest.current.contours);
    });
    if (ref.current) ro.observe(ref.current);
    return () => {
      off();
      ro.disconnect();
    };
  }, [store]);

  const say = (how: Parameters<LabStore["moveSelection"]>[0], jump = 1) => {
    const c = store.moveSelection(how, jump);
    if (!c) {
      announce("No cells shown on this branch yet. Move the pseudotime slider forward.", { topic: "selection" });
      return;
    }
    const list = store.branchCells(c.fate);
    announce(describeCell(c, { position: [list.findIndex((x) => x.id === c.id) + 1, list.length], branch: c.fate }), { topic: "selection" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    switch (e.key) {
      case "ArrowRight":
        say("next");
        break;
      case "ArrowLeft":
        say("prev");
        break;
      case "ArrowDown":
        say("otherNext");
        break;
      case "ArrowUp":
        say("otherPrev");
        break;
      case "PageDown":
        say("next", 10);
        break;
      case "PageUp":
        say("prev", 10);
        break;
      case "Home":
        say("first");
        break;
      case "End":
        say("last");
        break;
      case " ":
        store.toggle();
        announce(store.getSnapshot().playing ? "Playing." : "Paused.", { topic: "play" });
        break;
      case "Escape":
        if (snap.selectedId === null) return;
        store.select(null);
        announce("No cell selected.", { topic: "selection" });
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const side = Math.min(rect.width, rect.height);
    const x = ((e.clientX - rect.left - (rect.width - side) / 2) / side) * 2 * EXTENT - EXTENT;
    const y = EXTENT - ((e.clientY - rect.top - (rect.height - side) / 2) / side) * 2 * EXTENT;
    // reach in map units: about 10 px for a mouse, 22 px for a finger (touch and tremor)
    const reach = ((e.pointerType === "mouse" ? 10 : 22) * 2 * EXTENT) / side;
    const cell = store.cellAt(x, y, reach);
    store.select(cell ? cell.id : null);
    announce(cell ? describeCell(cell) : "No cell there. Selection cleared.", { topic: "selection" });
  };

  return (
    <canvas
      ref={ref}
      className="map-canvas"
      tabIndex={0}
      role="application"
      aria-roledescription="map of cells"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    />
  );
}
