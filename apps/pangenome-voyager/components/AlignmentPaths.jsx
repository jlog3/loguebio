"use client";

export default function AlignmentPaths({ graph }) {
  const segments = graph.nodes.filter((n) => n.type === "segment");
  const totalSegs = segments.length - 1;

  return (
    <svg viewBox="0 0 1060 60" className="w-full" style={{ height: "60px" }}>
      {segments.map((n, i) => {
        const topX = n.x;
        const botX = 50 + i * (960 / totalSegs);
        return (
          <line
            key={i}
            x1={topX}
            y1={0}
            x2={botX}
            y2={60}
            stroke="#00e5ff"
            strokeWidth={0.7}
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="8"
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
        );
      })}
    </svg>
  );
}
