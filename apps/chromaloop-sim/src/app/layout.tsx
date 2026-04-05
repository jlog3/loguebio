import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ChromaLoop Simulator',
    template: '%s — ChromaLoop',
  },
  description:
    'Live 3D Chromatin Folding Playground — Explore genome topology, loop extrusion, TADs, and disease-associated chromatin disruptions in an interactive WebGL simulator.',
  keywords: ['chromatin', 'Hi-C', 'TAD', 'loop extrusion', 'cohesin', 'CTCF', '3D genome', 'gene regulation', 'polymer physics'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="bg-mesh">{children}</body>
    </html>
  );
}
