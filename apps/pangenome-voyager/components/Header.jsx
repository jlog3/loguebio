"use client";

const VIEW_TABS = [
  { id: "graph", label: "Graph View" },
  { id: "compare", label: "Compare" },
  { id: "simulator", label: "Mutate" },
];

export default function Header({ viewMode, setViewMode }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#0e2a47] relative z-10">
      {/* Logo / title */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #00e5ff33, #ff6ec733)",
            border: "1px solid #00e5ff44",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2"
          >
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <path d="M9 12h3m0 0l3-4.5M12 12l3 4.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide text-[#e8f4fd] font-mono m-0">
            PANGENOME VOYAGER
          </h1>
          <p className="text-[9px] text-[#3d6e8f] tracking-[0.12em] uppercase m-0 font-mono">
            Graph-Based Genome Navigator · HPRC-Inspired
          </p>
        </div>
      </div>

      {/* View mode tabs */}
      <div
        className="flex gap-0.5 rounded-lg p-[3px]"
        style={{ background: "#0a1525", border: "1px solid #0e2a47" }}
      >
        {VIEW_TABS.map((tab) => {
          const active = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className="py-1.5 px-3.5 border-none rounded-md cursor-pointer text-[10px] font-semibold font-mono tracking-wide transition-all-200"
              style={{
                background: active
                  ? "linear-gradient(135deg, #00344f, #002840)"
                  : "transparent",
                color: active ? "#00e5ff" : "#3d6e8f",
                boxShadow: active ? "0 0 8px #00e5ff22" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
