// Sound for every LogueBio tool: short tones for events, a steady tone that
// follows a value, and playing a data series as rising and falling pitch.
// Always an extra channel: whatever is heard is also shown as text.
// Browsers allow sound only after a press or key, so it starts on request.

let ctx: AudioContext | null = null;
let drone: { osc: OscillatorNode; gain: GainNode } | null = null;
let seriesStop: (() => void) | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function soundSupported(): boolean {
  return typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", level = 0.12) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(level, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** Kinds of event tone: rise (something appeared), fall (disappeared), chord (joined), buzz (warning), tick (small change). */
export type Earcon = "rise" | "fall" | "chord" | "buzz" | "tick";

export function earcon(kind: Earcon) {
  switch (kind) {
    case "rise":
      tone(523, 0, 0.18);
      tone(784, 0.14, 0.22);
      break;
    case "fall":
      tone(659, 0, 0.18);
      tone(392, 0.14, 0.25);
      break;
    case "chord":
      tone(523, 0, 0.3);
      tone(659, 0, 0.3);
      break;
    case "buzz":
      tone(147, 0, 0.35, "square", 0.06);
      break;
    default:
      tone(880, 0, 0.08, "sine", 0.06);
  }
}

/** Maps 0–1 to two octaves, 220–880 Hz. */
export function pitchFor(v: number): number {
  return 220 * Math.pow(4, Math.min(1, Math.max(0, v)));
}

/** Starts or updates a steady tone whose pitch follows `value` (0–1); null stops it. */
export function setDrone(value: number | null) {
  const a = audio();
  if (!a) return;
  if (value === null) {
    if (drone) {
      drone.gain.gain.setTargetAtTime(0, a.currentTime, 0.1);
      const d = drone;
      setTimeout(() => d.osc.stop(), 400);
      drone = null;
    }
    return;
  }
  const f = pitchFor(value);
  if (!drone) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    gain.gain.value = 0;
    osc.connect(gain).connect(a.destination);
    osc.start();
    gain.gain.setTargetAtTime(0.05, a.currentTime, 0.2);
    drone = { osc, gain };
  } else {
    drone.osc.frequency.setTargetAtTime(f, a.currentTime, 0.3);
  }
}

/**
 * Plays values (already scaled 0–1) as a pitch sweep over `seconds`, left to
 * right, like tracing a line on a chart with a finger. Gaps (null) are silent.
 * Returns a function that stops it; starting a new one stops the old.
 */
export function playSeries(values: (number | null)[], seconds = 3, onDone?: () => void): () => void {
  if (seriesStop) seriesStop();
  const a = audio();
  if (!a || values.length === 0) {
    onDone?.();
    return () => {};
  }
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = "triangle";
  const t0 = a.currentTime + 0.05;
  const stepT = seconds / values.length;
  gain.gain.setValueAtTime(0, a.currentTime);
  values.forEach((v, i) => {
    const t = t0 + i * stepT;
    if (v === null) gain.gain.setTargetAtTime(0, t, 0.01);
    else {
      osc.frequency.setValueAtTime(pitchFor(v), t);
      gain.gain.setTargetAtTime(0.09, t, 0.01);
    }
  });
  gain.gain.setTargetAtTime(0, t0 + seconds, 0.03);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.3);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    seriesStop = null;
    onDone?.();
  };
  osc.onended = finish;
  const stop = () => {
    try {
      gain.gain.cancelScheduledValues(a.currentTime);
      gain.gain.setTargetAtTime(0, a.currentTime, 0.02);
      osc.stop(a.currentTime + 0.1);
    } catch {
      /* already stopped */
    }
    finish();
  };
  seriesStop = stop;
  return stop;
}
