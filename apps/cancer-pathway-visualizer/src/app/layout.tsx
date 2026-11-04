import type { Metadata } from "next";
import "./globals.css";
import { SuiteNav } from "@repo/suite";

export const metadata: Metadata = {
  title: "Cancer Pathway Visualizer",
  description:
    "Differential expression analysis on KEGG biological pathways. Upload tumor and control RNA-seq count data to identify significantly altered genes.",
  openGraph: {
    title: "Cancer Pathway Visualizer",
    description: "Interactive genomics analysis platform for KEGG pathway visualization",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en" className="dark">
      <body className="antialiased"><SuiteNav />{children}</body>
    </html>
  );
}
