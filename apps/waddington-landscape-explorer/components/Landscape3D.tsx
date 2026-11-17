"use client";

import { announce } from "@repo/access";
import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";
import { describeCell } from "@/lib/describe";
import { FATE_LABEL } from "@/lib/content";
import { scaleColor, type Look } from "@/lib/look";
import { EXTENT, height, sampleGrid, VALLEY_ANGLES, type Terrain } from "@/lib/model/landscape";
import { FATES, LINEAGES, type Fate } from "@/lib/model/params";
import { marbleAt } from "@/lib/model/simulate";
import type { PictureMode, Snapshot } from "@/lib/store";
import { useSnapshot, useStore } from "./LabContext";
import { cellValue } from "./StateMap";

type THREE = typeof THREE_NS;
const VSCALE = 1.15; // vertical exaggeration
const GRID = 141;
const RIM = 9.4; // the landscape is drawn as a disc of this radius

interface Cam {
  azimuth: number; // degrees, 0 = looking from the bottom of the map (south)
  elevation: number; // degrees above the horizon
  distance: number;
}
const DEFAULT_CAM: Cam = { azimuth: 25, elevation: 52, distance: 27 };

function camWords(c: Cam): string {
  const dirs = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  const d = dirs[Math.round((((c.azimuth % 360) + 360) % 360) / 45) % 8];
  const dist = c.distance < 20 ? "close" : c.distance > 34 ? "far" : "middle distance";
  return `Viewing from the ${d}, ${Math.round(c.elevation)}° above, ${dist}.`;
}

/** Map (x, y) and height to scene coordinates: map up = away from a south viewer. */
const toScene = (x: number, y: number, h: number): [number, number, number] => [x, h * VSCALE, -y];

interface Scene {
  T: THREE;
  renderer: THREE_NS.WebGLRenderer;
  scene: THREE_NS.Scene;
  camera: THREE_NS.PerspectiveCamera;
  terrain: THREE_NS.Mesh | null;
  cells: Partial<Record<Fate, { mesh: THREE_NS.InstancedMesh; ids: number[] }>>;
  marbles: THREE_NS.InstancedMesh | null;
  arrows: THREE_NS.LineSegments | null;
  ring: THREE_NS.Mesh;
  raycaster: THREE_NS.Raycaster;
  geoms: Record<Fate, THREE_NS.BufferGeometry>;
  dispose: () => void;
}

function terrainColor(T: THREE, look: Look, t: number, h: number): THREE_NS.Color {
  // light neutral greys (dark theme: dark greys), with a darker band at every whole unit of height
  const lo = look.dark ? 0.1 : 0.42;
  const hi = look.dark ? 0.5 : 0.97;
  let v = lo + (hi - lo) * t;
  const f = h - Math.floor(h);
  if (f < 0.06) v *= look.dark ? 1.35 : 0.86;
  return new T.Color(v, v * (look.dark ? 1 : 0.99), v * (look.dark ? 1.02 : 0.96));
}

function buildTerrain(s: Scene, terrain: Terrain, look: Look) {
  const { T } = s;
  if (s.terrain) {
    s.scene.remove(s.terrain);
    s.terrain.geometry.dispose();
    (s.terrain.material as THREE_NS.Material).dispose();
  }
  const { heights, min, max } = sampleGrid(terrain, GRID);
  const pos = new Float32Array(GRID * GRID * 3);
  const col = new Float32Array(GRID * GRID * 3);
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const k = j * GRID + i;
      const x = -EXTENT + (2 * EXTENT * i) / (GRID - 1);
      const y = -EXTENT + (2 * EXTENT * j) / (GRID - 1);
      const [sx, sy, sz] = toScene(x, y, heights[k]);
      pos.set([sx, sy, sz], 3 * k);
      const c = terrainColor(T, look, (heights[k] - min) / (max - min || 1), heights[k]);
      col.set([c.r, c.g, c.b], 3 * k);
    }
  }
  // a round landscape: keep only squares inside the rim
  const R2 = RIM * RIM;
  const inside = (k: number) => {
    const x = pos[3 * k];
    const z = pos[3 * k + 2];
    return x * x + z * z <= R2;
  };
  const idx: number[] = [];
  for (let j = 0; j < GRID - 1; j++)
    for (let i = 0; i < GRID - 1; i++) {
      const a = j * GRID + i;
      if (inside(a) && inside(a + 1) && inside(a + GRID) && inside(a + GRID + 1)) idx.push(a, a + 1, a + GRID, a + 1, a + GRID + 1, a + GRID);
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  geo.setAttribute("color", new T.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  s.terrain = new T.Mesh(geo, mat);
  s.scene.add(s.terrain);
}

function buildCells(s: Scene, snap: Snapshot, look: Look) {
  const { T } = s;
  for (const f of FATES) {
    const e = s.cells[f];
    if (e) {
      s.scene.remove(e.mesh);
      (e.mesh.material as THREE_NS.Material).dispose();
      e.mesh.dispose();
    }
    delete s.cells[f];
  }
  for (const f of FATES) {
    const list = snap.pop.cells.filter((c) => c.fate === f);
    if (!list.length) continue;
    const mat = new T.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new T.InstancedMesh(s.geoms[f], mat, list.length);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    s.cells[f] = { mesh, ids: list.map((c) => c.id) };
    s.scene.add(mesh);
  }
  if (s.marbles) {
    s.scene.remove(s.marbles);
    s.marbles.geometry.dispose();
    (s.marbles.material as THREE_NS.Material).dispose();
    s.marbles.dispose();
  }
  s.marbles = new T.InstancedMesh(new T.SphereGeometry(0.3, 16, 12), new T.MeshLambertMaterial({ color: 0xffffff }), snap.pop.marbles.length);
  s.marbles.instanceMatrix.setUsage(T.DynamicDrawUsage);
  s.scene.add(s.marbles);
  updateCells(s, snap, look);
}

function updateCells(s: Scene, snap: Snapshot, look: Look) {
  const { T } = s;
  const m = new T.Matrix4();
  const q = new T.Quaternion();
  const one = new T.Vector3(1, 1, 1);
  const zero = new T.Vector3(0, 0, 0);
  const v = new T.Vector3();
  const col = new T.Color();
  const index = new Map(snap.pop.cells.map((c, i) => [c.id, i]));
  for (const f of FATES) {
    const e = s.cells[f];
    if (!e) continue;
    e.ids.forEach((id, k) => {
      const i = index.get(id)!;
      const c = snap.pop.cells[i];
      const shown = c.pseudotime !== null && c.pseudotime <= snap.cursor + 1e-9;
      const [x, y, z] = toScene(c.x, c.y, height(snap.pop.terrain, c.x, c.y));
      v.set(x, y + 0.14, z);
      m.compose(v, q, shown ? one : zero);
      e.mesh.setMatrixAt(k, m);
      col.set(snap.colorBy === "fate" ? look.fate[f] : scaleColor(cellValue(snap, i)));
      e.mesh.setColorAt(k, col);
    });
    e.mesh.instanceMatrix.needsUpdate = true;
    if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true;
  }
  // marbles (built with the cells; moved here)
  if (s.marbles) {
    s.marbles.visible = snap.marbles;
    if (snap.marbles) {
      snap.pop.marbles.forEach((mb, k) => {
        const [mx, my] = marbleAt(mb, snap.cursor);
        const [x, y, z] = toScene(mx, my, height(snap.pop.terrain, mx, my));
        v.set(x, y + 0.3, z);
        m.compose(v, q, one);
        s.marbles!.setMatrixAt(k, m);
        s.marbles!.setColorAt(k, col.set(look.fate[mb.fate]));
      });
      s.marbles.instanceMatrix.needsUpdate = true;
      if (s.marbles.instanceColor) s.marbles.instanceColor.needsUpdate = true;
    }
  }
  // velocity arrows
  if (s.arrows) {
    s.scene.remove(s.arrows);
    s.arrows.geometry.dispose();
    (s.arrows.material as THREE_NS.Material).dispose();
    s.arrows = null;
  }
  if (snap.arrows) {
    const pts: number[] = [];
    let k = 0;
    for (const c of snap.pop.cells) {
      if (c.pseudotime === null || c.pseudotime > snap.cursor + 1e-9) continue;
      if (k++ % 3) continue;
      const len = Math.hypot(c.evx, c.evy);
      if (len < 0.05) continue;
      const L = Math.min(1.2, 0.5 * len) / len;
      const x1 = c.x + c.evx * L;
      const y1 = c.y + c.evy * L;
      const a = toScene(c.x, c.y, height(snap.pop.terrain, c.x, c.y) + 0.25);
      const b = toScene(x1, y1, height(snap.pop.terrain, x1, y1) + 0.25);
      pts.push(...a, ...b);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    s.arrows = new T.LineSegments(g, new T.LineBasicMaterial({ color: look.ink }));
    s.scene.add(s.arrows);
  }
  // selection ring
  const sel = snap.pop.cells.find((c) => c.id === snap.selectedId);
  s.ring.visible = !!sel;
  if (sel) {
    const [x, y, z] = toScene(sel.x, sel.y, height(snap.pop.terrain, sel.x, sel.y));
    s.ring.position.set(x, y + 0.2, z);
    (s.ring.material as THREE_NS.MeshBasicMaterial).color.set(look.accent);
  }
}

function placeCamera(s: Scene, c: Cam) {
  const az = (c.azimuth * Math.PI) / 180;
  const el = (c.elevation * Math.PI) / 180;
  s.camera.position.set(c.distance * Math.cos(el) * Math.sin(az), c.distance * Math.sin(el), c.distance * Math.cos(el) * Math.cos(az));
  s.camera.lookAt(0, -0.6, 0);
}

export function Landscape3D({ look, mode, labelId, describedBy, onUnavailable }: { look: Look; mode: PictureMode; labelId: string; describedBy: string; onUnavailable: (reason: string) => void }) {
  const store = useStore();
  const snap = useSnapshot();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const camRef = useRef<Cam>({ ...DEFAULT_CAM });
  const [ready, setReady] = useState(false);
  const [camText, setCamText] = useState(camWords(DEFAULT_CAM));
  const lastDraw = useRef(0);
  const built = useRef<{ terrain: Terrain | null; runId: number; look: Look | null }>({ terrain: null, runId: -1, look: null });
  const latest = useRef({ look, mode });
  useEffect(() => {
    latest.current = { look, mode };
  }, [look, mode]);

  const render = () => {
    const s = sceneRef.current;
    const wrap = wrapRef.current;
    if (!s || !wrap) return;
    const w = wrap.clientWidth || 600;
    const h = wrap.clientHeight || 450;
    if (s.renderer.domElement.width !== Math.round(w * s.renderer.getPixelRatio())) {
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
    }
    s.renderer.render(s.scene, s.camera);
    // HTML labels follow the valleys
    const L = labelsRef.current;
    if (L) {
      const items: [string, number, number][] = [["Summit", 0, 0], ...LINEAGES.map((f) => [FATE_LABEL[f], 8.6 * Math.cos(VALLEY_ANGLES[f]), 8.6 * Math.sin(VALLEY_ANGLES[f])] as [string, number, number])];
      const terr = store.getSnapshot().pop.terrain;
      items.forEach(([, x, y], k) => {
        const el = L.children[k] as HTMLElement | undefined;
        if (!el) return;
        const v = new s.T.Vector3(...toScene(x, y, height(terr, x, y) + (k === 0 ? 0.9 : 0.6)));
        v.project(s.camera);
        const visible = v.z < 1;
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
        el.style.visibility = visible ? "visible" : "hidden";
      });
    }
  };

  // set up three.js once
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      const T = await import("three");
      if (cancelled || !canvasRef.current) return;
      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
      } catch {
        onUnavailable("This device or browser cannot show 3D graphics (WebGL is not available). The Map view shows the same landscape from above.");
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(42, 1.4, 0.5, 200);
      scene.add(new T.AmbientLight(0xffffff, 0.75));
      const sun = new T.DirectionalLight(0xffffff, 2.3);
      sun.position.set(14, 9, 6);
      scene.add(sun);
      const plus = (() => {
        const a = new T.BoxGeometry(0.42, 0.14, 0.14);
        const b = new T.BoxGeometry(0.14, 0.42, 0.14);
        const c = new T.BoxGeometry(0.14, 0.14, 0.42);
        const merged = new T.BufferGeometry();
        const parts = [a, b, c].map((g) => g.toNonIndexed());
        const posArr = parts.flatMap((g) => Array.from(g.getAttribute("position").array as Float32Array));
        const nrmArr = parts.flatMap((g) => Array.from(g.getAttribute("normal").array as Float32Array));
        merged.setAttribute("position", new T.Float32BufferAttribute(posArr, 3));
        merged.setAttribute("normal", new T.Float32BufferAttribute(nrmArr, 3));
        [a, b, c, ...parts].forEach((g) => g.dispose());
        return merged;
      })();
      const geoms: Record<Fate, THREE_NS.BufferGeometry> = {
        stem: new T.SphereGeometry(0.15, 12, 8),
        neuron: new T.ConeGeometry(0.19, 0.34, 3),
        glia: new T.OctahedronGeometry(0.2),
        muscle: new T.BoxGeometry(0.26, 0.26, 0.26),
        blood: plus,
      };
      const ring = new T.Mesh(new T.TorusGeometry(0.45, 0.07, 8, 32), new T.MeshBasicMaterial({ color: 0x0b5fa5 }));
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      scene.add(ring);
      const s: Scene = {
        T,
        renderer,
        scene,
        camera,
        terrain: null,
        cells: {},
        marbles: null,
        arrows: null,
        ring,
        raycaster: new T.Raycaster(),
        geoms,
        dispose: () => {
          renderer.dispose();
          Object.values(geoms).forEach((g) => g.dispose());
        },
      };
      sceneRef.current = s;
      placeCamera(s, camRef.current);
      const ro = new ResizeObserver(() => render());
      if (wrapRef.current) ro.observe(wrapRef.current);
      const offFrame = store.onFrame(() => {
        const sc = sceneRef.current;
        if (!sc) return;
        const cur = store.getSnapshot();
        const now = performance.now();
        const m = latest.current.mode;
        if (cur.playing && m === "still") return;
        if (cur.playing && m === "second" && now - lastDraw.current < 1000) return;
        lastDraw.current = now;
        updateCells(sc, cur, latest.current.look);
        render();
      });
      cleanup = () => {
        ro.disconnect();
        offFrame();
        s.dispose();
        sceneRef.current = null;
      };
      setReady(true);
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
    // set up once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // rebuild when the landscape, the cells or the colours change; update otherwise
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !ready) return;
    s.renderer.setClearColor(look.paper);
    const b = built.current;
    if (b.terrain !== snap.pop.terrain || b.look !== look) buildTerrain(s, snap.pop.terrain, look);
    if (b.runId !== snap.runId || b.terrain !== snap.pop.terrain || b.look !== look) buildCells(s, snap, look);
    else {
      if (snap.playing && mode === "still") return;
      updateCells(s, snap, look);
    }
    built.current = { terrain: snap.pop.terrain, runId: snap.runId, look };
    render();
    // render reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, look, ready, mode]);

  const moveCam = (d: Partial<Cam>, words?: string) => {
    const c = camRef.current;
    const next: Cam = {
      azimuth: (c.azimuth + (d.azimuth ?? 0) + 360) % 360,
      elevation: Math.min(85, Math.max(8, c.elevation + (d.elevation ?? 0))),
      distance: Math.min(44, Math.max(12, c.distance * (d.distance ?? 1))),
    };
    camRef.current = next;
    const s = sceneRef.current;
    if (s) {
      placeCamera(s, next);
      render();
    }
    const t = camWords(next);
    setCamText(t);
    announce(words ? `${words} ${t}` : t, { topic: "camera" });
  };
  const resetCam = () => {
    camRef.current = { ...DEFAULT_CAM };
    moveCam({}, "View reset.");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowLeft":
        moveCam({ azimuth: -15 });
        break;
      case "ArrowRight":
        moveCam({ azimuth: 15 });
        break;
      case "ArrowUp":
        moveCam({ elevation: 8 });
        break;
      case "ArrowDown":
        moveCam({ elevation: -8 });
        break;
      case "+":
      case "=":
        moveCam({ distance: 0.85 }, "Zoomed in.");
        break;
      case "-":
      case "_":
        moveCam({ distance: 1 / 0.85 }, "Zoomed out.");
        break;
      case "0":
        resetCam();
        break;
      case " ":
        store.toggle();
        announce(store.getSnapshot().playing ? "Playing." : "Paused.", { topic: "play" });
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  // pointer: drag to rotate, wheel or pinch to zoom, tap to select a cell
  const drag = useRef<{ x: number; y: number; moved: boolean; id: number } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = pinch.current;
    if (!pts.has(e.pointerId)) return;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...pts.values()];
      const after = Math.hypot(c.x - d.x, c.y - d.y);
      if (before > 0 && after > 0) {
        const c0 = camRef.current;
        camRef.current = { ...c0, distance: Math.min(44, Math.max(12, (c0.distance * before) / after)) };
        if (sceneRef.current) placeCamera(sceneRef.current, camRef.current);
        render();
      }
      if (drag.current) drag.current.moved = true;
      return;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    const c0 = camRef.current;
    camRef.current = { ...c0, azimuth: (c0.azimuth - dx * 0.4 + 360) % 360, elevation: Math.min(85, Math.max(8, c0.elevation + dy * 0.3)) };
    d.x = e.clientX;
    d.y = e.clientY;
    if (sceneRef.current) placeCamera(sceneRef.current, camRef.current);
    render();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pinch.current.delete(e.pointerId);
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      setCamText(camWords(camRef.current));
      return;
    }
    // tap: pick a cell
    const s = sceneRef.current;
    if (!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ndc = new s.T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    s.raycaster.setFromCamera(ndc, s.camera);
    const meshes = FATES.map((f) => s.cells[f]?.mesh).filter(Boolean) as THREE_NS.InstancedMesh[];
    const hit = s.raycaster.intersectObjects(meshes, false)[0];
    let id: number | null = null;
    if (hit && hit.instanceId !== undefined) {
      const f = FATES.find((x) => s.cells[x]?.mesh === hit.object);
      if (f) id = s.cells[f]!.ids[hit.instanceId];
    }
    if (id === null && s.terrain) {
      // nearest shown cell to where the tap hits the ground (generous for touch)
      const g = s.raycaster.intersectObject(s.terrain, false)[0];
      if (g) {
        const c = store.cellAt(g.point.x, -g.point.z, e.pointerType === "mouse" ? 0.5 : 1);
        id = c ? c.id : null;
      }
    }
    store.select(id);
    const cell = store.getSnapshot().pop.cells.find((c) => c.id === id);
    announce(cell ? describeCell(cell) : "No cell there. Selection cleared.", { topic: "selection" });
  };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const c0 = camRef.current;
    camRef.current = { ...c0, distance: Math.min(44, Math.max(12, c0.distance * (e.deltaY > 0 ? 1.08 : 1 / 1.08))) };
    if (sceneRef.current) placeCamera(sceneRef.current, camRef.current);
    render();
    setCamText(camWords(camRef.current));
  };

  return (
    <div className="view3d">
      <div
        ref={wrapRef}
        className="view3d-wrap"
        tabIndex={0}
        role="application"
        aria-roledescription="3D landscape"
        aria-labelledby={labelId}
        aria-describedby={`${describedBy} cam-words`}
        onKeyDown={onKeyDown}
      >
        <canvas
          ref={canvasRef}
          className="view3d-canvas"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        />
        <div ref={labelsRef} className="view3d-labels" aria-hidden="true">
          <span>Summit</span>
          {LINEAGES.map((f) => (
            <span key={f}>{FATE_LABEL[f]}</span>
          ))}
        </div>
      </div>
      <p id="cam-words" className="hint">
        {camText}
      </p>
      <div className="button-row" role="group" aria-label="Turn and zoom the landscape">
        <button type="button" className="button" onClick={() => moveCam({ azimuth: -30 }, "Turned left.")}>
          Turn left
        </button>
        <button type="button" className="button" onClick={() => moveCam({ azimuth: 30 }, "Turned right.")}>
          Turn right
        </button>
        <button type="button" className="button" onClick={() => moveCam({ elevation: 12 }, "Looking from higher.")}>
          Look from higher
        </button>
        <button type="button" className="button" onClick={() => moveCam({ elevation: -12 }, "Looking from lower.")}>
          Look from lower
        </button>
        <button type="button" className="button" onClick={() => moveCam({ distance: 0.8 }, "Zoomed in.")}>
          Zoom in
        </button>
        <button type="button" className="button" onClick={() => moveCam({ distance: 1 / 0.8 }, "Zoomed out.")}>
          Zoom out
        </button>
        <button type="button" className="button secondary" onClick={resetCam}>
          Reset view
        </button>
      </div>
    </div>
  );
}
