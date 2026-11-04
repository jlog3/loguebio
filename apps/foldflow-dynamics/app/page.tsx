"use client";

import dynamic from "next/dynamic";

// FoldFlow draws with WebGL and builds its demo ensemble with random numbers,
// so it renders in the browser only (rendering it on the server would not match).
const FoldFlow = dynamic(() => import("@/components/FoldFlow"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0e1a", color: "#c0d8f0", fontFamily: "system-ui, sans-serif" }}
    >
      Loading FoldFlow Dynamics…
    </div>
  ),
});

export default function Page() {
  return <FoldFlow />;
}
