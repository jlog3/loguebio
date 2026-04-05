import "./globals.css";

export const metadata = {
  title: "Pangenome Voyager – Graph-Based Genome Navigator",
  description:
    "Interactive pangenome graph navigator with tube-map visualization, compare mode, and mutation simulator. Inspired by HPRC and long-read sequencing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-void-radial">{children}</body>
    </html>
  );
}
