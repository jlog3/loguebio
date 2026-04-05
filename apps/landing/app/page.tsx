'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   PROJECT DATA
   ═══════════════════════════════════════════════════════════════ */

interface ProjectFeature {
  label: string;
  color: string;
}

interface ProjectScreenshot {
  caption: string;
  features: string[];
  gradient: string; // placeholder gradient
  icon: string;
}

interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  accentColor: string;
  icon: string;
  category: string;
  features: ProjectFeature[];
  screenshots: ProjectScreenshot[];
  hasLearnPage: boolean;
  hasImportExport: boolean;
  techHighlight: string;
}

const PROJECTS: Project[] = [
  {
    slug: 'chromaloop-simulator',
    name: 'ChromaLoop',
    tagline: 'Live 3D Chromatin Folding Playground',
    description:
      'Real-time polymer physics simulation of how DNA folds in 3D space. Explore loop extrusion by cohesin motors, CTCF boundaries, TADs, and see how chromatin architecture controls gene expression — then break it with real disease mutations.',
    color: '#00e5ff',
    accentColor: '#ff00e5',
    icon: '◎',
    category: 'Structural Genomics',
    features: [
      { label: 'Real-time Langevin dynamics', color: '#00e5ff' },
      { label: 'Synchronized 3D + Hi-C + expression', color: '#ff00e5' },
      { label: '4 disease presets from literature', color: '#ff1744' },
      { label: 'CTCF mutation & loop extrusion toggle', color: '#39ff14' },
      { label: 'FASTA / BED / CSV import & 7 export formats', color: '#ffab00' },
    ],
    screenshots: [
      {
        caption: '3D Chromatin Viewer + Hi-C Contact Map',
        features: ['WebGL polymer model', 'Live Hi-C heatmap', 'TAD triangles', 'Bead selection sync'],
        gradient: 'linear-gradient(135deg, #030711 0%, #0a1128 40%, #00e5ff08 100%)',
        icon: '◆',
      },
      {
        caption: 'Disease Mode — Boundary Disruption',
        features: ['4 cancer mutations', 'Before/after comparison', 'Expression impact', 'Paper references'],
        gradient: 'linear-gradient(135deg, #030711 0%, #1a0511 40%, #ff174408 100%)',
        icon: '⚠',
      },
      {
        caption: 'Gene Expression Track',
        features: ['Live expression bars', 'Enhancer-promoter arcs', 'Click-to-inspect', 'TAD coloring'],
        gradient: 'linear-gradient(135deg, #030711 0%, #0a1128 40%, #39ff1408 100%)',
        icon: '◉',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Three.js · React Three Fiber · Canvas 2D · Polymer Physics',
  },
  {
    slug: 'cancer-pathway-visualizer',
    name: 'Cancer Pathway Visualizer',
    tagline: 'Interactive Differential Expression Analysis',
    description:
      'Upload RNA-seq count data and instantly get volcano plots, MA plots, expression heatmaps, and a full statistical analysis pipeline — with gene detail modals, one-click links to Ensembl/NCBI/UniProt, and manuscript-ready methods summaries.',
    color: '#ff6b6b',
    accentColor: '#ffd93d',
    icon: '⬡',
    category: 'Transcriptomics',
    features: [
      { label: 'Gene detail modal with replicate counts', color: '#ff6b6b' },
      { label: '12 export actions (CSV, TSV, JSON, clipboard)', color: '#ffd93d' },
      { label: 'Auto-generated methods paragraph', color: '#00e5ff' },
      { label: 'Quick filter presets (Sig / Up / Down)', color: '#39ff14' },
      { label: 'One-click Ensembl, GeneCards, NCBI, UniProt links', color: '#ff00e5' },
    ],
    screenshots: [
      {
        caption: 'Volcano Plot + Statistics Dashboard',
        features: ['Interactive data points', 'Significance thresholds', 'Stats cards', 'Direction filters'],
        gradient: 'linear-gradient(135deg, #0a0505 0%, #1a0808 40%, #ff6b6b08 100%)',
        icon: '◇',
      },
      {
        caption: 'Gene Detail Modal',
        features: ['Per-replicate counts', 'External DB links', 'Expression stats', 'Click any row'],
        gradient: 'linear-gradient(135deg, #0a0505 0%, #0a0a15 40%, #ffd93d08 100%)',
        icon: '⊕',
      },
      {
        caption: 'Export Suite + Methods Summary',
        features: ['12 export formats', 'Clipboard for DAVID/Enrichr', 'Methods paragraph', 'Toast notifications'],
        gradient: 'linear-gradient(135deg, #0a0505 0%, #0a0f0a 40%, #39ff1408 100%)',
        icon: '↑',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Recharts · Statistical Analysis · Clipboard API',
  },
  {
    slug: 'condensate-lab',
    name: 'Condensate Lab',
    tagline: 'Biomolecular Condensate Simulations',
    description:
      'Simulate phase separation, stress granules, P-bodies, and disease aggregation in real time. Brownian dynamics with Lennard-Jones potentials, Flory-Huggins thermodynamics, FRAP bleaching/recovery, and a disease mode that transitions liquid droplets to pathological solid aggregates.',
    color: '#00e5ff',
    accentColor: '#ffab00',
    icon: '◐',
    category: 'Biophysics',
    features: [
      { label: 'Brownian dynamics + Lennard-Jones potentials', color: '#00e5ff' },
      { label: 'BFS cluster detection & Flory-Huggins energy', color: '#ffab00' },
      { label: 'FRAP bleaching/recovery tracking', color: '#39ff14' },
      { label: '6 preset experiments (Stress Granule, P-Body, ALS…)', color: '#ff1744' },
      { label: 'Disease mode: liquid → solid aggregation', color: '#ff00e5' },
    ],
    screenshots: [
      {
        caption: 'Phase Separation Canvas + Phase Diagram',
        features: ['Particle glow halos', 'Condensate boundaries', 'Phase diagram', 'Temperature sweep'],
        gradient: 'linear-gradient(135deg, #030711 0%, #051120 40%, #00e5ff08 100%)',
        icon: '◉',
      },
      {
        caption: 'FRAP Recovery & Disease Aggregation',
        features: ['Bleach & recover', 'Recovery curve', 'Aggregate detection', 'Color state transitions'],
        gradient: 'linear-gradient(135deg, #030711 0%, #110508 40%, #ff174408 100%)',
        icon: '◎',
      },
      {
        caption: 'Educational Walkthrough (8 Steps)',
        features: ['What are condensates?', 'Phase separation', 'Biology examples', 'Disease pathology'],
        gradient: 'linear-gradient(135deg, #030711 0%, #0a1128 40%, #ffab0008 100%)',
        icon: '📖',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Canvas 2D · Brownian Dynamics · Flory-Huggins Thermodynamics',
  },
  {
    slug: 'foldflow-dynamics',
    name: 'FoldFlow Dynamics',
    tagline: 'Protein Folding Dynamics Explorer',
    description:
      'Explore protein structure ensembles in 3D with AI explainability. View 120 overlaid conformations, inspect transformer attention heads, mutate any residue to predict stability changes, and color by pLDDT confidence or RMSF flexibility.',
    color: '#651fff',
    accentColor: '#00e5ff',
    icon: '⌬',
    category: 'Structural Biology',
    features: [
      { label: '3D ensemble cloud (120 conformations)', color: '#651fff' },
      { label: 'Transformer attention heatmap (6 heads)', color: '#00e5ff' },
      { label: 'Mutate any residue → ΔΔG prediction', color: '#ff1744' },
      { label: 'pLDDT + RMSF + secondary structure coloring', color: '#39ff14' },
      { label: '5 protein structures (1UBQ, 4HHB, 6LU7…)', color: '#ffab00' },
    ],
    screenshots: [
      {
        caption: '3D Ensemble Viewer + Sequence Strip',
        features: ['Backbone tube geometry', 'Ensemble cloud overlay', 'Residue hover', 'Color by confidence'],
        gradient: 'linear-gradient(135deg, #050511 0%, #0a0520 40%, #651fff08 100%)',
        icon: '◆',
      },
      {
        caption: 'AI Attention Map — Transformer Heads',
        features: ['6 attention heads', 'Local vs long-range', 'Interactive heatmap', 'Residue pair selection'],
        gradient: 'linear-gradient(135deg, #050511 0%, #051120 40%, #00e5ff08 100%)',
        icon: '⊞',
      },
      {
        caption: 'Mutation Analysis Panel',
        features: ['Pick residue + amino acid', 'ΔΔG stability', 'Confidence score', 'Conformational shift'],
        gradient: 'linear-gradient(135deg, #050511 0%, #110508 40%, #ff174408 100%)',
        icon: '✕',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Three.js · Instanced Meshes · AI Attention Visualization',
  },
  {
    slug: 'mag',
    name: 'MAG Dashboard',
    tagline: 'Metagenome-Assembled Genome Quality',
    description:
      'Upload MAG quality stats and get interactive completeness vs contamination scatterplots, N50 analysis, taxonomy heatmaps, Kruskal-Wallis & Welch ANOVA statistics — with per-chart PNG/SVG export and sample/taxonomy filter pills.',
    color: '#00bfa5',
    accentColor: '#ff6d00',
    icon: '▦',
    category: 'Metagenomics',
    features: [
      { label: 'MIMAG-standard quality thresholds', color: '#00bfa5' },
      { label: 'Kruskal-Wallis & Welch ANOVA (pure TS)', color: '#ff6d00' },
      { label: 'Per-chart PNG/SVG export + clipboard', color: '#ffab00' },
      { label: 'Sample & taxonomy filter pills', color: '#00e5ff' },
      { label: 'Animated landing + 6-tab dashboard', color: '#39ff14' },
    ],
    screenshots: [
      {
        caption: 'Completeness vs Contamination Scatter',
        features: ['MIMAG reference lines', 'Quality tiers', 'Color by taxonomy', 'Hover details'],
        gradient: 'linear-gradient(135deg, #030a08 0%, #051510 40%, #00bfa508 100%)',
        icon: '◇',
      },
      {
        caption: 'Statistics & Boxplots',
        features: ['4 metric boxplots', 'Significance badges', 'Summary stat cards', 'Welch ANOVA'],
        gradient: 'linear-gradient(135deg, #030a08 0%, #0a0805 40%, #ff6d0008 100%)',
        icon: '⊞',
      },
      {
        caption: 'Data Table + Taxonomy Heatmap',
        features: ['Search + sort + paginate', 'Column visibility', 'Copy matrix', 'TSV/CSV/JSON export'],
        gradient: 'linear-gradient(135deg, #030a08 0%, #050a15 40%, #00e5ff08 100%)',
        icon: '▤',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Recharts · Pure TS Statistics · Canvas Export',
  },
  {
    slug: 'omniharmony',
    name: 'OmniHarmony',
    tagline: 'Multi-Omics Harmony Integration',
    description:
      'Integrate and visualize multi-omics datasets — transcriptomics, proteomics, metabolomics, and epigenomics — in a unified framework. Explore cross-layer correlations, pathway enrichment, and harmonized dimensionality reduction.',
    color: '#e040fb',
    accentColor: '#00e5ff',
    icon: '❖',
    category: 'Multi-Omics',
    features: [
      { label: 'Cross-omics correlation analysis', color: '#e040fb' },
      { label: 'Harmonized UMAP/PCA embedding', color: '#00e5ff' },
      { label: 'Pathway enrichment overlay', color: '#39ff14' },
      { label: 'Layer toggle (transcriptome, proteome…)', color: '#ffab00' },
      { label: 'Interactive network graphs', color: '#ff1744' },
    ],
    screenshots: [
      {
        caption: 'Multi-Omics Integration Dashboard',
        features: ['Layer selection', 'Correlation matrix', 'Enrichment scores', 'Sample clustering'],
        gradient: 'linear-gradient(135deg, #0a0510 0%, #100520 40%, #e040fb08 100%)',
        icon: '◈',
      },
      {
        caption: 'Cross-Layer Network View',
        features: ['Omics network graph', 'Edge correlations', 'Hub gene detection', 'Pathway coloring'],
        gradient: 'linear-gradient(135deg, #0a0510 0%, #051020 40%, #00e5ff08 100%)',
        icon: '⬡',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'D3.js · Network Graphs · Dimensionality Reduction',
  },
  {
    slug: 'pangenome-voyager',
    name: 'Pangenome Voyager',
    tagline: 'Graph-Based Genome Navigator',
    description:
      'Navigate pangenome variation graphs with tube-map visualizations. Toggle HPRC haplotype paths, inspect structural variant bubbles, compare graph vs linear reference, and simulate mutations (SNPs, indels, inversions, duplications) in real time.',
    color: '#ffab00',
    accentColor: '#00e5ff',
    icon: '⇌',
    category: 'Pangenomics',
    features: [
      { label: 'Tube-map pangenome graph rendering', color: '#ffab00' },
      { label: 'Compare: graph vs GRCh38 linear reference', color: '#00e5ff' },
      { label: 'Mutate: SNPs, indels, inversions, duplications', color: '#ff1744' },
      { label: '5 HPRC haplotype paths with path tracing', color: '#39ff14' },
      { label: 'Population frequency & disease overlays', color: '#ff00e5' },
    ],
    screenshots: [
      {
        caption: 'Graph View — Tube-Map Pangenome',
        features: ['Colored haplotype paths', 'Variant bubbles', 'Zoom slider', 'Click to inspect'],
        gradient: 'linear-gradient(135deg, #0a0805 0%, #151005 40%, #ffab0008 100%)',
        icon: '⬡',
      },
      {
        caption: 'Compare Mode — Graph vs Linear',
        features: ['Side-by-side view', 'Alignment paths', 'Educational footer', 'GRCh38 reference'],
        gradient: 'linear-gradient(135deg, #0a0805 0%, #051020 40%, #00e5ff08 100%)',
        icon: '⇋',
      },
      {
        caption: 'Mutate Mode — Real-Time Rerouting',
        features: ['Add any variant type', 'Red dashed paths', 'Instant rerouting', 'Variant detail panel'],
        gradient: 'linear-gradient(135deg, #0a0805 0%, #150508 40%, #ff174408 100%)',
        icon: '✕',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Canvas 2D · Graph Algorithms · Tube-Map Rendering',
  },
  {
    slug: 'waddington-landscape-explorer',
    name: 'Waddington Explorer',
    tagline: 'Epigenetic Landscape & Cell Fate',
    description:
      'Explore the Waddington epigenetic landscape in interactive 3D. Simulate 2,000 cells rolling from pluripotency into differentiated fates, perturb 8 gene expression sliders, inspect RNA velocity arrows on UMAP, and follow a 7-step Story Mode through developmental biology.',
    color: '#39ff14',
    accentColor: '#ff00e5',
    icon: '⏣',
    category: 'Developmental Biology',
    features: [
      { label: '3D deformable landscape with 2,000 cells', color: '#39ff14' },
      { label: 'UMAP with RNA velocity arrows', color: '#00e5ff' },
      { label: '7-step Story Mode narrative', color: '#ff00e5' },
      { label: '8 gene perturbation sliders', color: '#ffab00' },
      { label: 'Educational overlays (UMAP, velocity, pseudotime)', color: '#651fff' },
    ],
    screenshots: [
      {
        caption: '3D Waddington Landscape',
        features: ['Instanced cell meshes', 'Terrain deformation', 'Orbit controls', 'Fate coloring'],
        gradient: 'linear-gradient(135deg, #030a05 0%, #051505 40%, #39ff1408 100%)',
        icon: '🏔',
      },
      {
        caption: 'UMAP Explorer + RNA Velocity',
        features: ['2D scatter plot', 'Velocity arrows', 'Color by pseudotime', 'Cell inspector'],
        gradient: 'linear-gradient(135deg, #030a05 0%, #050a15 40%, #00e5ff08 100%)',
        icon: '◎',
      },
      {
        caption: 'Story Mode & Gene Perturbation',
        features: ['7 narrative steps', '8 gene sliders', 'Preset experiments', 'Did-you-know notes'],
        gradient: 'linear-gradient(135deg, #030a05 0%, #100510 40%, #ff00e508 100%)',
        icon: '▶',
      },
    ],
    hasLearnPage: true,
    hasImportExport: true,
    techHighlight: 'Three.js · Instanced Meshes · Canvas UMAP · RNA Velocity',
  },
];

const CATEGORIES = [...new Set(PROJECTS.map((p) => p.category))];

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* --- Animated DNA helix for hero --- */
function DNAHelix() {
  return (
    <svg viewBox="0 0 120 600" className="absolute right-[5%] top-0 h-full opacity-[0.07] pointer-events-none select-none" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 50 }, (_, i) => {
        const y = i * 12;
        const x1 = 60 + Math.sin(i * 0.35) * 40;
        const x2 = 60 + Math.sin(i * 0.35 + Math.PI) * 40;
        return (
          <g key={i}>
            <circle cx={x1} cy={y} r={3} fill="#00e5ff" />
            <circle cx={x2} cy={y} r={3} fill="#ff00e5" />
            {i % 3 === 0 && <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ffffff" strokeWidth={0.5} opacity={0.3} />}
          </g>
        );
      })}
    </svg>
  );
}

/* --- Screenshot carousel for a single project --- */
function ScreenshotCarousel({ screenshots, color }: { screenshots: ProjectScreenshot[]; color: string }) {
  const [active, setActive] = useState(0);
  const s = screenshots[active];

  return (
    <div className="space-y-3">
      {/* Placeholder "screenshot" */}
      <div
        className="relative rounded-xl overflow-hidden border border-white/[0.06] aspect-[16/10] flex items-center justify-center transition-all duration-500"
        style={{ background: s.gradient }}
      >
        {/* Placeholder icon & grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative text-center z-10 px-6">
          <span className="text-4xl block mb-3 opacity-60">{s.icon}</span>
          <p className="font-display text-xs tracking-widest uppercase opacity-40" style={{ color }}>
            {s.caption}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {s.features.map((f) => (
              <span key={f} className="font-mono text-[9px] px-2 py-1 rounded-full border border-white/[0.08] text-white/40 bg-white/[0.02]">
                {f}
              </span>
            ))}
          </div>
          {/* Replace this with actual screenshot */}
          <p className="font-mono text-[8px] text-white/20 mt-4">[ screenshot placeholder ]</p>
        </div>
      </div>

      {/* Carousel dots */}
      {screenshots.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {screenshots.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="transition-all duration-300"
              style={{
                width: i === active ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === active ? color : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Single project showcase card --- */
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="project-card relative group"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:border-white/[0.12]"
        style={{ borderColor: `${project.color}10` }}
      >
        {/* Top color accent line */}
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${project.color}, ${project.accentColor})` }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" style={{ color: project.color }}>{project.icon}</span>
              <div>
                <h3 className="font-display text-[15px] font-bold tracking-wide text-white">
                  {project.name}
                </h3>
                <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5" style={{ color: project.color, opacity: 0.6 }}>
                  {project.category}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {project.hasLearnPage && (
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30 border border-white/[0.06]">
                  📖 Learn
                </span>
              )}
              {project.hasImportExport && (
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30 border border-white/[0.06]">
                  ↕ I/O
                </span>
              )}
            </div>
          </div>

          {/* Tagline */}
          <p className="font-body text-[13px] font-medium mb-2" style={{ color: project.color }}>
            {project.tagline}
          </p>

          {/* Description */}
          <p className="font-body text-[12px] text-white/40 leading-relaxed mb-4">
            {project.description}
          </p>

          {/* Screenshot carousel */}
          <ScreenshotCarousel screenshots={project.screenshots} color={project.color} />

          {/* Features */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-2 mt-4 py-2 font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`} style={{ color: project.color }}>▶</span>
            {expanded ? 'Hide' : 'Show'} {project.features.length} features
            <span className="flex-1 h-px bg-white/[0.04]" />
          </button>

          {expanded && (
            <div className="space-y-1.5 pb-2 animate-fadeIn">
              {project.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                  <span className="font-body text-[11px] text-white/50">{f.label}</span>
                </div>
              ))}
              <p className="font-mono text-[9px] text-white/20 mt-2 pt-2 border-t border-white/[0.04]">
                {project.techHighlight}
              </p>
            </div>
          )}

          {/* CTA */}
          <a
            href={`https://${project.slug}.loguebio.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-mono text-[11px] transition-all duration-300 border"
            style={{
              backgroundColor: `${project.color}08`,
              borderColor: `${project.color}20`,
              color: project.color,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${project.color}18`;
              e.currentTarget.style.borderColor = `${project.color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${project.color}08`;
              e.currentTarget.style.borderColor = `${project.color}20`;
            }}
          >
            Launch {project.name} →
          </a>
        </div>
      </div>
    </div>
  );
}

/* --- Platform feature card --- */
function PlatformFeature({ icon, title, description, color, delay }: {
  icon: string; title: string; description: string; color: string; delay: number;
}) {
  return (
    <div className="glass-card rounded-xl p-5 animate-slideUp" style={{ animationDelay: `${delay}s` }}>
      <span className="text-xl block mb-3" style={{ color }}>{icon}</span>
      <h4 className="font-display text-[12px] tracking-wide text-white mb-1.5">{title}</h4>
      <p className="font-body text-[11px] text-white/35 leading-relaxed">{description}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filtered = filter
    ? PROJECTS.filter((p) => p.category === filter)
    : PROJECTS;

  return (
    <div className="min-h-screen landing-page">

      {/* ── Floating nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-[#00e5ff] opacity-50 animate-pulse-slow" />
              <div className="absolute inset-1 rounded-full border border-[#ff00e5] opacity-30 animate-pulse-slow" style={{ animationDelay: '1s' }} />
              <div className="absolute inset-[6px] rounded-full bg-[#00e5ff]/20" />
            </div>
            <div>
              <span className="font-display text-[14px] font-bold tracking-wider text-white">
                LOGUE<span className="text-[#00e5ff]">BIO</span>
              </span>
              <p className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase">
                Open-source bioinformatics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="#projects" className="font-mono text-[10px] text-white/40 hover:text-[#00e5ff] transition-colors">
              Projects
            </a>
            <a href="#platform" className="font-mono text-[10px] text-white/40 hover:text-[#00e5ff] transition-colors">
              Platform
            </a>
            <a
              href="https://github.com/loguebio"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <DNAHelix />

        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full bg-[#00e5ff]/[0.015] blur-[100px]" style={{ transform: `translateY(${scrollY * 0.08}px)` }} />
          <div className="absolute top-[40%] right-[15%] w-[350px] h-[350px] rounded-full bg-[#ff00e5]/[0.012] blur-[80px]" style={{ transform: `translateY(${scrollY * -0.05}px)` }} />
          <div className="absolute bottom-[10%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#39ff14]/[0.008] blur-[70px]" style={{ transform: `translateY(${scrollY * 0.04}px)` }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24">
          <div className="max-w-3xl">
            {/* Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] mb-8 animate-slideUp">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
              <span className="font-mono text-[10px] text-white/40">{PROJECTS.length} open-source tools · all free</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 animate-slideUp" style={{ animationDelay: '0.1s' }}>
              <span className="text-white">Visualize</span>
              <br />
              <span className="text-[#00e5ff] glow-text-cyan">biology</span>{' '}
              <span className="text-white/60">in ways</span>
              <br />
              <span className="text-white/60">textbooks</span>{' '}
              <span className="text-[#ff00e5] glow-text-magenta">can&apos;t.</span>
            </h1>

            <p className="font-body text-[17px] text-white/35 leading-relaxed max-w-xl mb-10 animate-slideUp" style={{ animationDelay: '0.2s' }}>
              Interactive simulators, 3D explorers, and analysis dashboards for genomics, proteomics, metagenomics, and developmental biology. Built for researchers, students, and the endlessly curious.
            </p>

            <div className="flex items-center gap-4 animate-slideUp" style={{ animationDelay: '0.3s' }}>
              <a
                href="#projects"
                className="font-mono text-[12px] px-6 py-3 rounded-xl bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/25 hover:bg-[#00e5ff]/20 transition-all"
              >
                Explore Projects ↓
              </a>
              <a
                href="https://github.com/loguebio"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] px-6 py-3 rounded-xl bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70 transition-all"
              >
                View on GitHub
              </a>
            </div>

            {/* Stat pills */}
            <div className="flex items-center gap-6 mt-14 animate-slideUp" style={{ animationDelay: '0.4s' }}>
              {[
                { value: `${PROJECTS.length}`, label: 'Tools', color: '#00e5ff' },
                { value: '50k+', label: 'Lines of code', color: '#ff00e5' },
                { value: '100%', label: 'Open-source', color: '#39ff14' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className="font-display text-[20px] font-bold" style={{ color: s.color }}>{s.value}</span>
                  <span className="font-mono text-[9px] text-white/25 uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Category disciplines banner ── */}
      <section className="border-y border-white/[0.04] py-6 overflow-hidden">
        <div className="flex items-center gap-8 justify-center flex-wrap px-6">
          {CATEGORIES.map((cat) => {
            const proj = PROJECTS.find((p) => p.category === cat)!;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? null : cat)}
                className={`font-mono text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                  filter === cat
                    ? 'border-white/20 text-white bg-white/[0.05]'
                    : 'border-white/[0.06] text-white/25 hover:text-white/50 hover:border-white/10'
                }`}
              >
                <span style={{ color: proj.color }}>{proj.icon}</span> {cat}
              </button>
            );
          })}
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="font-mono text-[10px] px-2 py-1 text-white/20 hover:text-white/40 transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </section>

      {/* ── Projects Grid ── */}
      <section id="projects" className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#00e5ff]/40 uppercase mb-3">
            The Platform
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
            {filter ? `${filter} Tools` : 'All Projects'}
          </h2>
          <p className="font-body text-[14px] text-white/30 mt-3 max-w-lg mx-auto">
            Each tool includes an interactive simulator, an in-depth learning page, and full data import/export capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="font-body text-[14px] text-white/25">No projects in this category yet.</p>
            <button onClick={() => setFilter(null)} className="font-mono text-[11px] text-[#00e5ff] mt-3">
              Show all →
            </button>
          </div>
        )}
      </section>

      {/* ── Platform Features ── */}
      <section id="platform" className="border-t border-white/[0.04] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12 text-center">
            <p className="font-mono text-[10px] tracking-[0.3em] text-[#ff00e5]/40 uppercase mb-3">
              Every Tool Includes
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
              Built for Research & Education
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PlatformFeature
              icon="📖"
              title="Interactive Learn Pages"
              description="Every tool has an in-depth editorial guide with SVG diagrams, expandable deep-dives, glossaries, and literature references. Understand the science behind each simulation."
              color="#ff00e5"
              delay={0}
            />
            <PlatformFeature
              icon="↕"
              title="Import & Export"
              description="Upload your own data in standard formats (FASTA, BED, CSV, TSV, JSON) and export results as PNG screenshots, data tables, PDB structures, or full state snapshots."
              color="#ffab00"
              delay={0.1}
            />
            <PlatformFeature
              icon="⌨"
              title="Keyboard Shortcuts"
              description="Power-user keyboard shortcuts for every tool. Play/pause simulations, switch views, toggle panels, and export data — all without reaching for the mouse."
              color="#00e5ff"
              delay={0.2}
            />
            <PlatformFeature
              icon="🧬"
              title="Real-Time Simulation"
              description="Not static charts — live physics, live statistics, and live visualizations. Change a parameter and watch the biology respond instantly."
              color="#39ff14"
              delay={0.3}
            />
            <PlatformFeature
              icon="🔬"
              title="Literature-Backed"
              description="Disease presets, pathway models, and simulation parameters are drawn from published research. Every tool cites its sources."
              color="#ff1744"
              delay={0.4}
            />
            <PlatformFeature
              icon="🎓"
              title="Onboarding Tours"
              description="First-time visitors get a guided walkthrough of each tool's interface, explaining every panel, control, and visualization."
              color="#651fff"
              delay={0.5}
            />
            <PlatformFeature
              icon="🌐"
              title="Open Source"
              description="Every tool is MIT-licensed and available on GitHub. Fork it, extend it, self-host it, use it in your course. Built in Next.js + TypeScript."
              color="#00bfa5"
              delay={0.6}
            />
            <PlatformFeature
              icon="📱"
              title="No Install Required"
              description="Everything runs in the browser. No dependencies, no Docker, no configuration. Just open the URL and start exploring."
              color="#ff6d00"
              delay={0.7}
            />
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="border-t border-white/[0.04] py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/20 uppercase mb-8">
            Built with
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-10 gap-y-4">
            {['Next.js 14', 'TypeScript', 'React Three Fiber', 'Three.js', 'Tailwind CSS', 'Canvas API', 'Recharts', 'D3.js', 'Framer Motion'].map((tech) => (
              <span key={tech} className="font-mono text-[12px] text-white/20 hover:text-white/50 transition-colors cursor-default">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 rounded-full border border-[#00e5ff]/30" />
                <div className="absolute inset-[4px] rounded-full bg-[#00e5ff]/15" />
              </div>
              <span className="font-display text-[12px] tracking-wider text-white/40">
                LOGUE<span className="text-[#00e5ff]/60">BIO</span>
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a href="https://github.com/loguebio" target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-white/25 hover:text-white/50 transition-colors">
                GitHub
              </a>
              <span className="font-mono text-[10px] text-white/15">·</span>
              <span className="font-mono text-[10px] text-white/25">MIT License</span>
              <span className="font-mono text-[10px] text-white/15">·</span>
              <span className="font-mono text-[10px] text-white/25">Open-source bioinformatics tools for everyone</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
