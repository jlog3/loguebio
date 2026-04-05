import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LogueBio — Open-Source Bioinformatics Tools',
  description:
    'Interactive simulators, 3D explorers, and analysis dashboards for genomics, proteomics, metagenomics, and developmental biology. Free and open-source.',
  keywords: [
    'bioinformatics',
    'genomics',
    'chromatin',
    'proteomics',
    'metagenomics',
    'pangenome',
    'RNA velocity',
    'open source',
    'visualization',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
