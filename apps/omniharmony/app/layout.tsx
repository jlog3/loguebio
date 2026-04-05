import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniHarmony — Multi-Omics Integration Dashboard",
  description:
    "Interactive multi-omics data fusion dashboard with UMAP embeddings, factor networks, cross-layer correlations, and what-if simulation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
