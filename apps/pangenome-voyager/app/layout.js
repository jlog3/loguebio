import "./globals.css";
import { SuiteNav } from "@repo/suite";

export const metadata = {
  title: "Pangenome Voyager – Graph-Based Genome Navigator",
  description:
    "Interactive pangenome graph navigator with tube-map visualization, compare mode, and mutation simulator. Inspired by HPRC and long-read sequencing.",
};

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="bg-void-radial"><SuiteNav />{children}</body>
    </html>
  );
}
