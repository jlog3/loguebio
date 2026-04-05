"use client";

const PARTICLE_COLORS = ["#00e5ff", "#ff6ec7", "#7cff6b", "#ffb340"];

const particles = Array.from({ length: 12 }, (_, i) => ({
  cx: 100 + ((i * 137.5) % 900),
  cy: 50 + ((i * 83.7) % 500),
  r: 1 + (i % 3),
  color: PARTICLE_COLORS[i % 4],
  dur: `${4 + (i % 3)}s`,
  midCy: 20 + ((i * 83.7) % 500),
}));

export default function AmbientEffects() {
  return (
    <>
      {/* Grid overlay */}
      <div className="ambient-grid" />

      {/* Floating particles */}
      <svg
        className="fixed inset-0 pointer-events-none z-0"
        viewBox="0 0 1000 600"
      >
        {particles.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.color} opacity={0.18}>
            <animate
              attributeName="cy"
              values={`${p.cy};${p.midCy};${p.cy}`}
              dur={p.dur}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.18;0.08;0.18"
              dur={p.dur}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </>
  );
}
