import type { Metadata } from "next";
import "./globals.css";
import { SuiteNav } from "@repo/suite";

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
    <html suppressHydrationWarning lang="en">
      <body><SuiteNav />{children}</body>
    </html>
  );
}
