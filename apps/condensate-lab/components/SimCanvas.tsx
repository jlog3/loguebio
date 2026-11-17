"use client";

import { announce } from "@repo/access";
import { useEffect, useRef } from "react";
import { describeDroplet } from "@/lib/describe";
import { KIND_RNA, SIGMA, WORLD_H, WORLD_W } from "@/lib/sim/engine";
import type { LabStore, Snapshot } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";
import type { ThemeColors } from "./useTheme";

export type PictureMode = "live" | "second" | "still";

function draw(canvas: HTMLCanvasElement, store: LabStore, snap: Snapshot, c: ThemeColors) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = store.world;
  const cssW = canvas.clientWidth || WORLD_W;
  const cssH = canvas.clientHeight || WORLD_H;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const k = (cssW / WORLD_W) * dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // faint grid in thirds, matching the region names (top left, centre, …)
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1 / (k / dpr);
  ctx.beginPath();
  for (const gx of [WORLD_W / 3, (2 * WORLD_W) / 3]) {
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, WORLD_H);
  }
  for (const gy of [WORLD_H / 3, (2 * WORLD_H) / 3]) {
    ctx.moveTo(0, gy);
    ctx.lineTo(WORLD_W, gy);
  }
  ctx.stroke();

  const r = SIGMA / 2 - 0.4;
  const lw = (c.stroke * 1.2) / (k / dpr);
  ctx.lineWidth = lw;
  for (let i = 0; i < w.n; i++) {
    const x = w.x[i];
    const y = w.y[i];
    const bleached = w.bleached[i] === 1;
    let color: string;
    ctx.beginPath();
    if (w.solid[i]) {
      color = c.solid;
      const s = r * 1.75;
      ctx.rect(x - s / 2, y - s / 2, s, s);
    } else if (w.kind[i] === KIND_RNA) {
      color = c.rna;
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r, y + r * 0.75);
      ctx.lineTo(x - r, y + r * 0.75);
      ctx.closePath();
    } else {
      color = c.protein;
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    if (bleached) {
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // droplet outlines and numbers
  ctx.font = `600 ${11}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const d of snap.droplets) {
    const selected = d.id === snap.selectedId;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.radius + 2, 0, Math.PI * 2);
    ctx.setLineDash(selected ? [] : [4, 3]);
    ctx.lineWidth = (selected ? 3 * c.stroke : 1.2 * c.stroke) / (k / dpr);
    ctx.strokeStyle = selected ? c.accent : c.muted;
    ctx.stroke();
    ctx.setLineDash([]);
    const label = String(d.id);
    const ly = Math.max(14, d.cy - d.radius - 4);
    const tw = ctx.measureText(label).width + 6;
    ctx.fillStyle = c.paper;
    ctx.fillRect(d.cx - tw / 2, ly - 12, tw, 13);
    ctx.fillStyle = selected ? c.accent : c.ink;
    ctx.fillText(label, d.cx, ly);
  }

  // FRAP spot
  const f = snap.frap;
  if (f && f.status === "recording") {
    ctx.beginPath();
    ctx.arc(f.cx, f.cy, f.radius, 0, Math.PI * 2);
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = (2 * c.stroke) / (k / dpr);
    ctx.strokeStyle = c.ink;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(f.cx - 4, f.cy);
    ctx.lineTo(f.cx + 4, f.cy);
    ctx.moveTo(f.cx, f.cy - 4);
    ctx.lineTo(f.cx, f.cy + 4);
    ctx.stroke();
  }
}

export function SimCanvas({
  colors,
  mode,
  labelId,
  describedBy,
  onBleach,
}: {
  colors: ThemeColors;
  mode: PictureMode;
  labelId: string;
  describedBy: string;
  onBleach: () => void;
}) {
  const store = useStore();
  const snap = useSnapshot();
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ snap, colors, mode });
  const lastDraw = useRef(0);

  // Redraw on every state change, but while running respect the picture mode:
  // "second" = at most once a second, "still" = only when paused or stepped.
  useEffect(() => {
    latest.current = { snap, colors, mode };
    const canvas = ref.current;
    if (!canvas) return;
    const now = performance.now();
    if (snap.running && mode === "still") return;
    if (snap.running && mode === "second" && now - lastDraw.current < 1000) return;
    lastDraw.current = now;
    draw(canvas, store, snap, colors);
  }, [store, snap, colors, mode]);

  useEffect(() => {
    const off = store.onFrame(() => {
      const { colors: c, mode: m } = latest.current;
      const canvas = ref.current;
      if (!canvas) return;
      const now = performance.now();
      const running = store.getSnapshot().running;
      if (running && m === "still") return;
      if (running && m === "second" && now - lastDraw.current < 1000) return;
      lastDraw.current = now;
      draw(canvas, store, store.getSnapshot(), c);
    });
    const ro = new ResizeObserver(() => {
      const canvas = ref.current;
      if (canvas) draw(canvas, store, store.getSnapshot(), latest.current.colors);
    });
    if (ref.current) ro.observe(ref.current);
    return () => {
      off();
      ro.disconnect();
    };
  }, [store]);

  const selectAndSay = (how: "next" | "prev" | "first" | "last") => {
    const d = store.moveSelection(how);
    if (!d) {
      announce("No droplets to select yet.", { topic: "selection" });
      return;
    }
    const order = store.readingOrder();
    announce(describeDroplet(d, order.findIndex((x) => x.id === d.id), order.length), { topic: "selection" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        selectAndSay("next");
        break;
      case "ArrowLeft":
      case "ArrowUp":
        selectAndSay("prev");
        break;
      case "Home":
        selectAndSay("first");
        break;
      case "End":
        selectAndSay("last");
        break;
      case "Enter":
      case "b":
      case "B":
        onBleach();
        break;
      case " ":
        store.toggle();
        announce(store.getSnapshot().running ? "Playing." : "Paused.", { topic: "play" });
        break;
      case "Escape":
        if (snap.selectedId !== null) {
          store.select(null);
          announce("No droplet selected.", { topic: "selection" });
        } else return;
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((e.clientY - rect.top) / rect.height) * WORLD_H;
    // generous reach for touch and tremor: up to 3 molecule widths outside a droplet
    const d = store.dropletAt(x, y, e.pointerType === "mouse" ? 1.5 * SIGMA : 3 * SIGMA);
    store.select(d ? d.id : null);
    announce(d ? describeDroplet(d) : "No droplet there. Selection cleared.", { topic: "selection" });
  };

  return (
    <canvas
      ref={ref}
      className="sim-canvas"
      tabIndex={0}
      role="application"
      aria-roledescription="simulation picture"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    />
  );
}
