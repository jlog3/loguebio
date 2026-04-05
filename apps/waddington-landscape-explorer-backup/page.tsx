'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface Article {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  readTime: string;
  sections: {
    heading: string;
    content: string;
    aside?: string;
    diagram?: 'landscape' | 'umap' | 'velocity' | 'pseudotime' | 'branching' | 'gene-network';
  }[];
}

const ARTICLES: Article[] = [
  {
    id: 'waddington',
    number: '01',
    title: "Waddington's Epigenetic Landscape",
    subtitle: 'Why cells roll downhill — and what the hills mean',
    icon: '⛰',
    accentColor: '#00e5ff',
    readTime: '8 min read',
    sections: [
      {
        heading: 'A metaphor that became a model',
        content: `In 1957, Conrad Hal Waddington — a British developmental biologist — sketched one of the most influential images in all of biology. He drew a ball sitting atop a ridged surface of hills and valleys. The ball represented a cell; the landscape represented the space of all possible gene expression states a cell could occupy.

The idea was deceptively simple: a stem cell sits at the top of a hill, full of potential. As development proceeds, the cell "rolls" downhill, guided by the contours of the landscape into specific valleys — each valley representing a different cell fate. A neuron valley, a muscle valley, a blood cell valley.

What makes this metaphor so powerful is what the hills represent. The ridges between valleys are *energy barriers* — they correspond to gene regulatory states that are unstable, states a cell passes through but cannot stay in. Once a cell commits to a valley, it becomes increasingly difficult to climb back up or switch to another path. This is why differentiation normally proceeds in one direction.`,
        aside: `Waddington coined the term "epigenetics" — though his original meaning (how genes interact to produce phenotypes) differs from the modern usage (heritable changes not in the DNA sequence).`,
      },
      {
        heading: 'From metaphor to mathematics',
        content: `For decades, Waddington's landscape was just a useful picture. But starting in the 2000s, researchers began formalizing it mathematically. The key insight came from dynamical systems theory: you can model gene regulatory networks as systems of differential equations, and the landscape becomes a *potential energy surface* over gene expression space.

In this formulation, the valleys are **attractors** — stable fixed points of the gene network. The hilltop is an **unstable fixed point**. The ridges are **separatrices** — boundaries between basins of attraction. A cell's "fate" is determined by which basin of attraction it falls into.

This isn't just abstract math. Researchers like Sui Huang showed that real gene expression data, when projected into low-dimensional spaces, actually forms structures that look remarkably like Waddington's original sketch — hills, valleys, and branching paths.`,
        diagram: 'landscape',
        aside: `The mathematical formalization uses concepts from potential theory. If we have a gene network with state vector x, the landscape height h(x) is related to the probability of finding a cell at state x: h(x) ∝ -log P(x). Valleys (low h) correspond to high-probability states.`,
      },
      {
        heading: 'Why it matters for medicine',
        content: `Understanding the landscape has direct implications for regenerative medicine and cancer biology. Yamanaka's Nobel Prize–winning discovery of iPSCs (induced pluripotent stem cells) showed that you can push a cell *back up the hill* — dedifferentiating it to a stem-like state by overexpressing four transcription factors.

In cancer, the landscape metaphor helps explain how tumors arise. Cancer cells may get stuck in abnormal valleys, or they may find ways to tunnel through ridges that normal cells cannot cross. Some researchers view cancer as a disease of the landscape itself — the terrain has been deformed by mutations, creating new, pathological attractors.

In our simulator, when you move the gene expression sliders, you are literally reshaping the landscape — deepening some valleys, filling in others, and changing where cells can flow. This mirrors what real therapeutic interventions (gene therapy, small molecules, epigenetic drugs) attempt to do.`,
      },
    ],
  },
  {
    id: 'scrna-seq',
    number: '02',
    title: 'Single-Cell RNA Sequencing',
    subtitle: 'How we read the recipe book of individual cells',
    icon: '🧬',
    accentColor: '#b388ff',
    readTime: '10 min read',
    sections: [
      {
        heading: 'The resolution revolution',
        content: `For most of the history of molecular biology, we could only measure gene expression in bulk — grinding up thousands or millions of cells and averaging their signals together. This is like measuring the average temperature of a city; you lose all the variation between neighborhoods.

Single-cell RNA sequencing (scRNA-seq), developed in the early 2010s, changed everything. Technologies like Drop-seq, 10x Genomics Chromium, and Smart-seq2 allow us to capture the mRNA molecules inside *individual cells*, giving us a snapshot of which genes each cell is actively using.

A typical modern experiment might profile 10,000 to 1,000,000 individual cells. For each cell, we measure the expression of ~20,000 genes. The result is a massive matrix — cells × genes — that contains the raw material for all downstream analysis.`,
        aside: `The term "RNA sequencing" is slightly misleading. We don't read the RNA directly — we reverse-transcribe it to DNA, amplify it, fragment it, and then sequence the fragments. Computational algorithms then map those fragments back to genes and count them.`,
      },
      {
        heading: 'From counts to clusters',
        content: `Raw scRNA-seq data is extremely high-dimensional (one axis per gene) and noisy (many genes show zero counts due to "dropout" — a technical artifact where mRNA molecules are lost during preparation). The analysis pipeline typically follows these steps:

**Quality control** — Remove dead cells (high mitochondrial gene percentage), doublets (two cells captured as one), and cells with too few detected genes.

**Normalization** — Account for differences in sequencing depth between cells. A cell with 5,000 total counts and another with 10,000 aren't necessarily different — one just happened to be sequenced more deeply.

**Feature selection** — Identify the most variable genes. Housekeeping genes that are expressed at similar levels in every cell aren't informative for distinguishing cell types.

**Dimensionality reduction** — Compress the 20,000-dimensional space down to 2-3 dimensions for visualization (that's where UMAP comes in) or ~50 dimensions for computational analysis (using PCA).

**Clustering** — Group cells with similar expression profiles. Each cluster typically corresponds to a cell type or state.

**Annotation** — Use known marker genes to label what each cluster actually *is*. Cluster 3 expresses high NEUROG2? That's likely a neuronal progenitor.`,
      },
      {
        heading: 'The atlas era',
        content: `We're now in the era of cell atlases. Projects like the Human Cell Atlas aim to profile every cell type in the human body. Databases like CellxGene (by the Chan Zuckerberg Initiative) host hundreds of datasets spanning dozens of tissues and organisms.

These atlases serve as references. If you generate scRNA-seq data from a tumor, you can compare your cells against the atlas to identify which normal cell types they most resemble — and how they diverge. The atlases are also revealing entirely new cell types and states that were invisible to bulk methods.

In our simulator, we generate synthetic cells that mimic the structure of a real developmental dataset — with stem cells, committed progenitors, and terminally differentiated cells. The patterns you see (branching trajectories, gradual gene expression changes) are simplified but representative of what real data looks like.`,
        aside: `As of 2024, the largest single-cell datasets contain over 10 million cells. Specialized tools like AnnData (Python) and Seurat (R) have become the standard frameworks for analysis, each with ecosystems of plugins for trajectory inference, velocity analysis, and more.`,
      },
    ],
  },
  {
    id: 'umap',
    number: '03',
    title: 'UMAP: Beauty and Deception',
    subtitle: 'What your favorite 2D plot is actually telling you (and hiding)',
    icon: '◎',
    accentColor: '#ff2daa',
    readTime: '9 min read',
    sections: [
      {
        heading: 'Squishing 20,000 dimensions into two',
        content: `Imagine you have a dataset where each cell is described by 20,000 numbers (one per gene). You cannot visualize 20,000-dimensional space. You need to project this data down to 2D — a flat plot you can look at on a screen.

UMAP (Uniform Manifold Approximation and Projection), developed by Leland McInnes in 2018, is currently the most popular method for doing this in single-cell biology. It works by constructing a mathematical graph of neighbor relationships in high-dimensional space, then optimizing a 2D layout that preserves those relationships as well as possible.

The result is a scatter plot where each dot is a cell, and cells with similar gene expression profiles tend to be near each other. You'll see clusters (cell types), streams (developmental trajectories), and sometimes beautiful arching structures.`,
        diagram: 'umap',
      },
      {
        heading: 'The five lies UMAP tells',
        content: `UMAP is incredibly useful — but it is also routinely misinterpreted. Here are the key distortions:

**1. Distances between clusters are meaningless.** Two clusters that are far apart on the UMAP are not necessarily more different than two clusters that are close together. The spacing between clusters is an artifact of the optimization, not a measure of biological distance.

**2. Cluster sizes are unreliable.** UMAP tends to expand dense regions and compress sparse ones. A large cluster on the UMAP might actually contain fewer cells than a small cluster — or vice versa.

**3. Shapes are unreliable.** Whether a cluster is round, elongated, or L-shaped has more to do with UMAP's parameters than with biology.

**4. Continuity can be artificial.** UMAP may connect clusters with thin "bridges" that don't represent real biological transitions. These artifacts are especially common when the perplexity (neighbor count) is set too high.

**5. Disconnection can be artificial too.** Conversely, UMAP may split a single population into fragments, especially if there's a gradient of gene expression rather than discrete types.

The takeaway: use UMAP for exploration and hypothesis generation, but validate findings with other methods. Never trust UMAP distances or cluster shapes alone.`,
        aside: `The predecessor to UMAP was t-SNE, developed by Laurens van der Maaten in 2008. t-SNE has similar limitations but is generally slower and less able to preserve global structure. UMAP largely replaced t-SNE in the single-cell field around 2019-2020.`,
      },
      {
        heading: 'Parameters matter more than you think',
        content: `UMAP has several parameters that dramatically change the output:

**n_neighbors** (default ~15) — How many nearest neighbors to consider when building the high-dimensional graph. Low values emphasize local structure (tight clusters). High values emphasize global structure (connectedness between clusters). There is no single "correct" value.

**min_dist** (default ~0.1) — How tightly points are allowed to pack in the 2D layout. Low values produce tighter clusters with more empty space between them. High values produce more diffuse, spread-out layouts.

**metric** — How distance is measured in high-dimensional space. Euclidean, cosine, and correlation metrics can produce very different plots from the same data.

A common malpractice is to run UMAP once with default parameters and treat the result as "the" structure of the data. Good practice is to run UMAP with multiple parameter settings and check which features are robust across all of them.

In our UMAP Explorer, the 2D positions are computed analytically (not via UMAP itself), but they're designed to resemble what a real UMAP output would look like for a branching developmental dataset.`,
      },
    ],
  },
  {
    id: 'rna-velocity',
    number: '04',
    title: 'RNA Velocity',
    subtitle: 'Predicting where cells are going, not just where they are',
    icon: '→',
    accentColor: '#ffab00',
    readTime: '11 min read',
    sections: [
      {
        heading: 'The problem: snapshots vs. movies',
        content: `Single-cell RNA sequencing gives us a *snapshot* — we see the gene expression state of each cell at one instant in time. But development is a process. Cells are constantly changing. What we really want to know is: where is each cell *heading*?

This is like looking at a photograph of a highway and trying to figure out which direction each car is driving. The photo tells you where each car is, but not where it's going. If only there were a way to infer directionality from the static data...

RNA velocity, introduced by La Manno et al. in 2018 and extended by Bergen et al. (scVelo, 2020), provides exactly this. The key insight is that standard scRNA-seq data contains hidden information about the direction of gene expression change — encoded in the ratio of unspliced to spliced mRNA.`,
        diagram: 'velocity',
      },
      {
        heading: 'Spliced vs. unspliced: a built-in clock',
        content: `When a gene is transcribed, the initial product is **pre-mRNA** (unspliced) — it still contains introns. Over the next minutes to hours, the cell's splicing machinery removes the introns to produce **mature mRNA** (spliced), which then gets translated into protein.

Here's the crucial insight: if a gene is being *actively upregulated*, it will have a lot of unspliced mRNA relative to spliced mRNA. The cell is cranking out new transcripts faster than the splicing machinery can process them. Conversely, if a gene is being *downregulated*, unspliced mRNA will be scarce (transcription has stopped) but spliced mRNA may still be present (it hasn't degraded yet).

By comparing the ratio of unspliced to spliced mRNA across many genes in a single cell, we can estimate the cell's **velocity vector** — a direction in gene expression space indicating where the cell is heading.`,
        aside: `Standard 10x Chromium data can distinguish unspliced from spliced reads because unspliced reads map to introns while spliced reads map only to exons. This information was always present in the data — RNA velocity just gave us a framework to use it.`,
      },
      {
        heading: 'From gene-level velocity to cell-level arrows',
        content: `The process works in three stages:

**1. Gene-level velocity** — For each gene in each cell, compare the observed unspliced/spliced ratio to a model of the expected ratio at steady state. The deviation from steady state gives a velocity for that gene: positive (gene is being upregulated) or negative (being downregulated).

**2. Cell-level velocity** — Combine the velocities of all genes into a single vector in gene expression space. This is the cell's overall velocity — a direction in the 20,000-dimensional gene space.

**3. Projection to 2D** — Project the high-dimensional velocity vector onto the 2D UMAP embedding. This produces the arrows you see overlaid on the UMAP plot. Each arrow points from where the cell is now toward where it's predicted to be in the near future.

The arrows are incredibly powerful for understanding developmental directionality. In our simulator, you can see how stem cells have small, random arrows (they're not strongly committed to any direction), while committed progenitors have large arrows pointing firmly along their branch toward terminal differentiation.`,
      },
      {
        heading: 'Caveats and failure modes',
        content: `RNA velocity is powerful but not perfect. Important limitations include:

**Steady-state assumption** — The original model assumes most genes are at steady state most of the time. This can break down during rapid transitions or in highly dynamic cell states.

**Gene selection matters** — Velocity estimates are based on a subset of genes with good unspliced/spliced signal. If the key driver genes aren't well-captured, the velocity may be misleading.

**Timescale blindness** — Velocity tells you the *direction* of change but not the *speed*. An arrow of length 1 on the UMAP doesn't mean the cell will move 1 unit on the UMAP in some fixed time.

**Technical artifacts** — Library preparation biases, ambient RNA contamination, and doublets can all corrupt the unspliced/spliced ratios and produce spurious velocity estimates.

More recent methods like CellRank combine RNA velocity with probabilistic frameworks and gene regulatory network analysis to produce more robust fate predictions.`,
      },
    ],
  },
  {
    id: 'pseudotime',
    number: '05',
    title: 'Pseudotime & Trajectory Inference',
    subtitle: 'Ordering cells along developmental paths without a clock',
    icon: 'ψ',
    accentColor: '#a8ff04',
    readTime: '8 min read',
    sections: [
      {
        heading: 'The ordering problem',
        content: `In a scRNA-seq experiment, we capture cells at a single timepoint. But within that snapshot, cells are at different stages of a process — some are early progenitors, some are mid-transition, and some are fully differentiated. If we could order these cells by how far along they are in the process, we would reconstruct the trajectory of development from a single measurement.

This ordering is called **pseudotime**. It is "pseudo" because it does not correspond to real clock time — a cell at pseudotime 0.5 hasn't necessarily been developing for half as long as a cell at pseudotime 1.0. Instead, pseudotime captures the *progress* of gene expression changes along a developmental path.`,
        diagram: 'pseudotime',
      },
      {
        heading: 'How trajectory inference algorithms work',
        content: `Modern trajectory inference (TI) methods generally follow this logic:

**Step 1: Build a cell graph.** Construct a nearest-neighbor graph where cells are nodes and edges connect cells with similar expression profiles. This graph captures the local topology of the data.

**Step 2: Find the backbone.** Extract the main paths through the graph. Methods differ in how they do this. Monocle 3 learns a principal graph (a tree-like structure). PAGA (Partition-based Graph Abstraction) finds connections between clusters. Slingshot fits smooth curves through the data.

**Step 3: Assign pseudotime.** Once the backbone is established, project each cell onto the nearest point on the backbone and measure the distance from a designated root (starting point) along the path. This distance is the pseudotime.

**Step 4: Identify branch points.** If the backbone splits, that's a bifurcation — a point where cell fates diverge. Cells before the branch could go either way; cells after the branch are committed to one fate.

In our simulator, pseudotime is assigned analytically: stem cells start at ψt ≈ 0, and cells progress along their branch to ψt ≈ 1 at terminal differentiation. When you scrub the pseudotime slider, you're revealing cells in order of their developmental progress.`,
      },
      {
        heading: 'The branching problem',
        content: `Real developmental processes aren't linear — they branch. A stem cell might become a neuron OR a glial cell. Capturing this branching topology is one of the hardest challenges in trajectory inference.

Different algorithms handle branching differently:

**Tree-based methods** (Monocle 3, Slingshot) explicitly model the trajectory as a tree with branch points. They work well when the branching structure is clear.

**Graph-based methods** (PAGA) represent the trajectory as an abstract graph between clusters, allowing more complex topologies (cycles, convergences) but providing less resolution within clusters.

**Probabilistic methods** (CellRank, Palantir) assign each cell a probability of reaching each terminal fate, rather than forcing a hard assignment to a single branch. This handles uncertainty more naturally.

In our simulator, we use hard fate assignment (each cell goes to exactly one branch), but the slider perturbations let you see how changing gene expression shifts the branching probabilities — more Neurog2 means more cells in the neuron branch, less Olig2 means a thinner glia branch.`,
        aside: `A 2019 benchmarking study (Saelens et al., Nature Biotechnology) tested 45 trajectory inference methods on 339 datasets. No single method was best across all scenarios. The authors recommend running multiple methods and looking for consensus.`,
      },
    ],
  },
  {
    id: 'gene-regulation',
    number: '06',
    title: 'Gene Regulatory Networks',
    subtitle: 'The circuit diagrams behind cell-fate decisions',
    icon: '⬡',
    accentColor: '#ff5252',
    readTime: '9 min read',
    sections: [
      {
        heading: 'Cells as computation',
        content: `Every cell in your body contains the same DNA — the same ~20,000 genes. What makes a neuron different from a muscle cell isn't which genes it *has*, but which genes it *uses*. The decision about which genes to turn on or off is governed by **gene regulatory networks** (GRNs) — complex circuits of transcription factors, signaling molecules, and feedback loops.

Think of a GRN as a biological circuit board. Transcription factors (TFs) are the switches. Each TF protein binds to specific DNA sequences near its target genes, either activating (turning on) or repressing (turning off) those genes. Since many TFs regulate other TFs, you get cascades and feedback loops that can create stable states (cell types), oscillations (cell cycles), and switches (fate decisions).

In our simulator, the eight genes on the control panel are simplified representatives of a real GRN: Sox2 maintains stemness, Neurog2 drives neuronal fate, Olig2 drives glial fate, and so on. Their interactions shape the landscape.`,
        diagram: 'gene-network',
      },
      {
        heading: 'The master regulators in our simulation',
        content: `Here's what each gene in our model represents:

**Sox2** — A core pluripotency factor. In real stem cells, Sox2 (along with Oct4 and Nanog) maintains the undifferentiated state. High Sox2 keeps cells on the hilltop. Knocking it out allows differentiation to proceed faster.

**Neurog2** (Neurogenin 2) — A proneural basic helix-loop-helix (bHLH) transcription factor. When activated, it drives cells toward neuronal fate by activating downstream neuronal genes (like NeuroD, Dcx) and repressing alternative fates. In our model, increasing Neurog2 deepens the neuronal valley.

**Olig2** — An oligodendrocyte lineage transcription factor. It's essential for the production of oligodendrocytes (the cells that myelinate neurons in the central nervous system) and also plays roles in motor neuron specification. It competes with Neurog2 for shared progenitor cells.

**MyoD** — The master regulator of skeletal muscle development. It was one of the first TFs shown to be sufficient for fate conversion — expressing MyoD in fibroblasts can turn them into muscle cells.

**Gata1** — Essential for erythropoiesis (red blood cell production). It works with other factors like Klf1 and Tal1 to activate hemoglobin genes and repress alternative lineage programs.

**Notch1** — A transmembrane receptor involved in lateral inhibition. When activated by ligands on neighboring cells, Notch1 suppresses neuronal differentiation in the signal-receiving cell, often promoting glial or progenitor fates instead.

**Wnt3a** — A secreted signaling molecule. Wnt signaling promotes stem cell self-renewal and also plays roles in dorsal/posterior patterning during development.

**Shh** (Sonic Hedgehog) — A morphogen that patterns the ventral nervous system. Its concentration gradient specifies different cell types at different positions along the dorsal-ventral axis.`,
      },
      {
        heading: 'Bistability and irreversibility',
        content: `One of the most important properties of gene regulatory networks is **bistability** — the ability to exist in two (or more) stable states with sharp switching between them. This is what makes cell-fate decisions feel "all-or-nothing."

The classic example is a mutual inhibition circuit: Gene A represses Gene B, and Gene B represses Gene A. This creates two stable states: (A high, B low) and (A low, B high). The cell is pushed into one state or the other depending on which gene gets a head start.

In our model, the Neurog2/Olig2 pair works roughly like this — high Neurog2 suppresses the glial branch, and high Olig2 suppresses the neuronal branch. Try the gene sliders to see this competition play out: crank up Neurog2 while reducing Olig2 and watch cells flood into the neuron valley.

Bistability also explains **irreversibility**. Once a cell tips into one basin of attraction, the mutual inhibition locks it in. The energy barrier to switch back (climb over the ridge) is too high under normal conditions. This is why differentiation is generally a one-way street — and why reprogramming (going backwards) requires forceful overexpression of key TFs.`,
      },
    ],
  },
];

// Inline diagram components
function LandscapeDiagram() {
  return (
    <svg viewBox="0 0 600 260" className={styles.diagram}>
      <defs>
        <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="valleyN" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="valleyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff2daa" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff2daa" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Landscape silhouette */}
      <path d="M0,240 Q50,240 100,200 Q150,120 200,100 Q250,50 300,40 Q350,50 400,100 Q450,120 500,200 Q550,240 600,240" fill="url(#hillGrad)" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Left valley */}
      <path d="M0,240 Q50,240 100,200 Q130,170 160,190 Q180,210 200,200" fill="url(#valleyN)" stroke="none" />
      {/* Right valley */}
      <path d="M400,200 Q420,210 440,190 Q470,170 500,200 Q550,240 600,240" fill="url(#valleyG)" stroke="none" />
      {/* Ball at top */}
      <circle cx="300" cy="32" r="8" fill="white" opacity="0.9">
        <animate attributeName="cy" values="32;28;32" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Arrows showing possible paths */}
      <path d="M290,45 Q200,120 130,190" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      <path d="M310,45 Q400,120 470,190" fill="none" stroke="#ff2daa" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      {/* Labels */}
      <text x="300" y="18" textAnchor="middle" fill="white" fontSize="10" fontFamily="'DM Sans', sans-serif" fontWeight="600">Stem Cell</text>
      <text x="100" y="228" textAnchor="middle" fill="#00e5ff" fontSize="9" fontFamily="'JetBrains Mono', monospace">Neuron valley</text>
      <text x="500" y="228" textAnchor="middle" fill="#ff2daa" fontSize="9" fontFamily="'JetBrains Mono', monospace">Glia valley</text>
      <text x="300" y="254" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">← low potential energy — high potential energy →</text>
    </svg>
  );
}

function UMAPDiagram() {
  return (
    <svg viewBox="0 0 600 280" className={styles.diagram}>
      {/* Cluster blobs */}
      <ellipse cx="300" cy="80" rx="40" ry="30" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.15" />
      <ellipse cx="150" cy="180" rx="55" ry="40" fill="#00e5ff" fillOpacity="0.08" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.15" />
      <ellipse cx="450" cy="170" rx="50" ry="35" fill="#ff2daa" fillOpacity="0.08" stroke="#ff2daa" strokeWidth="1" strokeOpacity="0.15" />
      <ellipse cx="380" cy="230" rx="45" ry="30" fill="#a8ff04" fillOpacity="0.08" stroke="#a8ff04" strokeWidth="1" strokeOpacity="0.15" />
      {/* Dots */}
      {[...Array(12)].map((_, i) => <circle key={`s${i}`} cx={290 + Math.cos(i * 0.5) * 25} cy={75 + Math.sin(i * 0.8) * 18} r="2.5" fill="white" opacity="0.6" />)}
      {[...Array(18)].map((_, i) => <circle key={`n${i}`} cx={140 + Math.cos(i * 0.35) * 40} cy={175 + Math.sin(i * 0.6) * 28} r="2.5" fill="#00e5ff" opacity="0.6" />)}
      {[...Array(15)].map((_, i) => <circle key={`g${i}`} cx={445 + Math.cos(i * 0.42) * 35} cy={168 + Math.sin(i * 0.7) * 25} r="2.5" fill="#ff2daa" opacity="0.6" />)}
      {[...Array(13)].map((_, i) => <circle key={`m${i}`} cx={375 + Math.cos(i * 0.48) * 30} cy={228 + Math.sin(i * 0.65) * 20} r="2.5" fill="#a8ff04" opacity="0.6" />)}
      {/* Warning annotations */}
      <line x1="300" y1="110" x2="300" y2="140" stroke="#ffab00" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <line x1="150" y1="140" x2="300" y2="140" stroke="#ffab00" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <line x1="450" y1="140" x2="300" y2="140" stroke="#ffab00" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <text x="300" y="153" textAnchor="middle" fill="#ffab00" fontSize="8" fontFamily="'JetBrains Mono', monospace" opacity="0.8">⚠ distances ≠ similarity</text>
      {/* Labels */}
      <text x="300" y="55" textAnchor="middle" fill="white" fontSize="9" fontFamily="'JetBrains Mono', monospace">Stem</text>
      <text x="150" y="230" textAnchor="middle" fill="#00e5ff" fontSize="9" fontFamily="'JetBrains Mono', monospace">Neurons</text>
      <text x="450" y="215" textAnchor="middle" fill="#ff2daa" fontSize="9" fontFamily="'JetBrains Mono', monospace">Glia</text>
      <text x="380" y="270" textAnchor="middle" fill="#a8ff04" fontSize="9" fontFamily="'JetBrains Mono', monospace">Muscle</text>
      <text x="300" y="10" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">UMAP 1 →</text>
      <text x="12" y="140" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace" transform="rotate(-90,12,140)">UMAP 2 →</text>
    </svg>
  );
}

function VelocityDiagram() {
  return (
    <svg viewBox="0 0 600 220" className={styles.diagram}>
      {/* mRNA lifecycle */}
      <rect x="40" y="30" width="150" height="60" rx="8" fill="none" stroke="#ffab00" strokeWidth="1" strokeOpacity="0.4" />
      <text x="115" y="55" textAnchor="middle" fill="#ffab00" fontSize="10" fontFamily="'DM Sans', sans-serif" fontWeight="600">Transcription</text>
      <text x="115" y="72" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">DNA → pre-mRNA</text>
      {/* Arrow */}
      <line x1="200" y1="60" x2="240" y2="60" stroke="#4e5d7a" strokeWidth="1" markerEnd="url(#arrowhead)" />
      <rect x="250" y="30" width="130" height="60" rx="8" fill="none" stroke="#b388ff" strokeWidth="1" strokeOpacity="0.4" />
      <text x="315" y="55" textAnchor="middle" fill="#b388ff" fontSize="10" fontFamily="'DM Sans', sans-serif" fontWeight="600">Splicing</text>
      <text x="315" y="72" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">pre-mRNA → mRNA</text>
      <line x1="390" y1="60" x2="430" y2="60" stroke="#4e5d7a" strokeWidth="1" />
      <rect x="440" y="30" width="120" height="60" rx="8" fill="none" stroke="#ff5252" strokeWidth="1" strokeOpacity="0.4" />
      <text x="500" y="55" textAnchor="middle" fill="#ff5252" fontSize="10" fontFamily="'DM Sans', sans-serif" fontWeight="600">Degradation</text>
      <text x="500" y="72" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">mRNA → ∅</text>
      {/* Phase portrait below */}
      <text x="300" y="120" textAnchor="middle" fill="white" fontSize="10" fontFamily="'DM Sans', sans-serif" fontWeight="600">Phase Portrait (one gene)</text>
      <line x1="100" y1="200" x2="500" y2="200" stroke="#4e5d7a" strokeWidth="1" />
      <line x1="100" y1="200" x2="100" y2="140" stroke="#4e5d7a" strokeWidth="1" />
      <text x="300" y="215" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">Spliced (mature mRNA) →</text>
      <text x="72" y="170" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace" transform="rotate(-90,72,170)">Unspliced →</text>
      {/* Phase curve */}
      <path d="M120,195 Q200,145 300,155 Q400,165 480,195" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.7" />
      {/* Points on curve with velocity arrows */}
      <circle cx="160" cy="178" r="4" fill="#ffab00" />
      <line x1="160" y1="178" x2="185" y2="170" stroke="#ffab00" strokeWidth="1.5" />
      <text x="155" y="170" fill="#ffab00" fontSize="7" fontFamily="'JetBrains Mono', monospace">↑ upregulating</text>
      <circle cx="420" cy="178" r="4" fill="#b388ff" />
      <line x1="420" y1="178" x2="445" y2="185" stroke="#b388ff" strokeWidth="1.5" />
      <text x="435" y="176" fill="#b388ff" fontSize="7" fontFamily="'JetBrains Mono', monospace">↓ downregulating</text>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#4e5d7a" />
        </marker>
      </defs>
    </svg>
  );
}

function PseudotimeDiagram() {
  return (
    <svg viewBox="0 0 600 180" className={styles.diagram}>
      {/* Timeline */}
      <line x1="50" y1="90" x2="550" y2="90" stroke="#4e5d7a" strokeWidth="2" />
      {/* Gradient fill */}
      <defs>
        <linearGradient id="ptGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" />
          <stop offset="30%" stopColor="#b388ff" />
          <stop offset="60%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
      </defs>
      <rect x="50" y="86" width="500" height="8" rx="4" fill="url(#ptGrad)" opacity="0.3" />
      {/* Markers */}
      <circle cx="50" cy="90" r="6" fill="white" stroke="white" strokeWidth="2" />
      <text x="50" y="75" textAnchor="middle" fill="white" fontSize="9" fontFamily="'DM Sans', sans-serif" fontWeight="600">Stem</text>
      <text x="50" y="115" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">ψt = 0</text>
      {/* Branch point */}
      <circle cx="225" cy="90" r="5" fill="#ffab00" stroke="#ffab00" strokeWidth="2" />
      <text x="225" y="75" textAnchor="middle" fill="#ffab00" fontSize="9" fontFamily="'DM Sans', sans-serif" fontWeight="600">Branch</text>
      <text x="225" y="115" textAnchor="middle" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">ψt ≈ 0.3</text>
      {/* Fork into two paths */}
      <path d="M225,90 Q350,50 500,40" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
      <path d="M225,90 Q350,130 500,140" fill="none" stroke="#ff2daa" strokeWidth="1.5" opacity="0.6" />
      {/* Terminal fates */}
      <circle cx="500" cy="40" r="5" fill="#00e5ff" />
      <text x="530" y="44" fill="#00e5ff" fontSize="9" fontFamily="'JetBrains Mono', monospace">Neuron</text>
      <circle cx="500" cy="140" r="5" fill="#ff2daa" />
      <text x="530" y="144" fill="#ff2daa" fontSize="9" fontFamily="'JetBrains Mono', monospace">Glia</text>
      <text x="520" y="90" fill="#4e5d7a" fontSize="8" fontFamily="'JetBrains Mono', monospace">ψt = 1</text>
      {/* Warning */}
      <text x="300" y="170" textAnchor="middle" fill="#ffab00" fontSize="8" fontFamily="'JetBrains Mono', monospace" opacity="0.7">⚠ Pseudotime ≠ real clock time. It measures progress, not hours.</text>
    </svg>
  );
}

function BranchingDiagram() {
  return (
    <svg viewBox="0 0 600 200" className={styles.diagram}>
      <text x="300" y="15" textAnchor="middle" fill="#4e5d7a" fontSize="9" fontFamily="'JetBrains Mono', monospace">Trajectory topology</text>
      {/* Tree */}
      <circle cx="300" cy="45" r="8" fill="white" opacity="0.8" />
      <line x1="300" y1="53" x2="300" y2="80" stroke="#4e5d7a" strokeWidth="1.5" />
      <circle cx="300" cy="85" r="4" fill="#ffab00" />
      {/* Split 1 */}
      <line x1="300" y1="89" x2="180" y2="130" stroke="#4e5d7a" strokeWidth="1.5" />
      <line x1="300" y1="89" x2="420" y2="130" stroke="#4e5d7a" strokeWidth="1.5" />
      {/* Left branch splits again */}
      <circle cx="180" cy="130" r="4" fill="#ffab00" />
      <line x1="180" y1="134" x2="120" y2="170" stroke="#4e5d7a" strokeWidth="1.5" />
      <line x1="180" y1="134" x2="240" y2="170" stroke="#4e5d7a" strokeWidth="1.5" />
      {/* Right branch splits */}
      <circle cx="420" cy="130" r="4" fill="#ffab00" />
      <line x1="420" y1="134" x2="360" y2="170" stroke="#4e5d7a" strokeWidth="1.5" />
      <line x1="420" y1="134" x2="480" y2="170" stroke="#4e5d7a" strokeWidth="1.5" />
      {/* Terminal fates */}
      <circle cx="120" cy="175" r="7" fill="#00e5ff" opacity="0.8" />
      <text x="120" y="195" textAnchor="middle" fill="#00e5ff" fontSize="8" fontFamily="'JetBrains Mono', monospace">Neuron</text>
      <circle cx="240" cy="175" r="7" fill="#ff2daa" opacity="0.8" />
      <text x="240" y="195" textAnchor="middle" fill="#ff2daa" fontSize="8" fontFamily="'JetBrains Mono', monospace">Glia</text>
      <circle cx="360" cy="175" r="7" fill="#a8ff04" opacity="0.8" />
      <text x="360" y="195" textAnchor="middle" fill="#a8ff04" fontSize="8" fontFamily="'JetBrains Mono', monospace">Muscle</text>
      <circle cx="480" cy="175" r="7" fill="#ff5252" opacity="0.8" />
      <text x="480" y="195" textAnchor="middle" fill="#ff5252" fontSize="8" fontFamily="'JetBrains Mono', monospace">Blood</text>
    </svg>
  );
}

function GeneNetworkDiagram() {
  return (
    <svg viewBox="0 0 600 280" className={styles.diagram}>
      {/* Central node: Sox2 */}
      <circle cx="300" cy="60" r="24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <text x="300" y="64" textAnchor="middle" fill="white" fontSize="10" fontFamily="'JetBrains Mono', monospace" fontStyle="italic">Sox2</text>
      {/* Downstream TFs */}
      <circle cx="140" cy="170" r="22" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
      <text x="140" y="174" textAnchor="middle" fill="#00e5ff" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontStyle="italic">Neurog2</text>
      <circle cx="280" cy="200" r="22" fill="none" stroke="#ff2daa" strokeWidth="1.5" opacity="0.6" />
      <text x="280" y="204" textAnchor="middle" fill="#ff2daa" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontStyle="italic">Olig2</text>
      <circle cx="420" cy="200" r="22" fill="none" stroke="#a8ff04" strokeWidth="1.5" opacity="0.6" />
      <text x="420" y="204" textAnchor="middle" fill="#a8ff04" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontStyle="italic">MyoD</text>
      <circle cx="530" cy="150" r="22" fill="none" stroke="#ff5252" strokeWidth="1.5" opacity="0.6" />
      <text x="530" y="154" textAnchor="middle" fill="#ff5252" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontStyle="italic">Gata1</text>
      {/* Notch - modulator */}
      <circle cx="80" cy="90" r="18" fill="none" stroke="#ffab00" strokeWidth="1" opacity="0.5" strokeDasharray="4 2" />
      <text x="80" y="94" textAnchor="middle" fill="#ffab00" fontSize="8" fontFamily="'JetBrains Mono', monospace" fontStyle="italic">Notch1</text>
      {/* Activation arrows (green) from Sox2 */}
      <line x1="280" y1="76" x2="170" y2="150" stroke="white" strokeWidth="1" opacity="0.3" />
      <line x1="295" y1="84" x2="282" y2="178" stroke="white" strokeWidth="1" opacity="0.3" />
      <line x1="320" y1="76" x2="410" y2="178" stroke="white" strokeWidth="1" opacity="0.3" />
      <line x1="322" y1="72" x2="512" y2="135" stroke="white" strokeWidth="1" opacity="0.3" />
      {/* Mutual inhibition: Neurog2 ⊣ Olig2 */}
      <line x1="162" y1="175" x2="258" y2="195" stroke="#ff2daa" strokeWidth="1.5" opacity="0.5" />
      <rect x="255" y="190" width="6" height="6" fill="#ff2daa" opacity="0.5" transform="rotate(45,258,193)" />
      <line x1="258" y1="195" x2="162" y2="175" stroke="#00e5ff" strokeWidth="1.5" opacity="0.5" />
      <rect x="159" y="170" width="6" height="6" fill="#00e5ff" opacity="0.5" transform="rotate(45,162,173)" />
      {/* Notch inhibits Neurog2 */}
      <line x1="95" y1="103" x2="125" y2="153" stroke="#ffab00" strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
      <rect x="122" y="150" width="5" height="5" fill="#ffab00" opacity="0.4" transform="rotate(45,124,152)" />
      {/* Legend */}
      <line x1="100" y1="260" x2="130" y2="260" stroke="white" strokeWidth="1" opacity="0.4" />
      <text x="135" y="264" fill="#4e5d7a" fontSize="7" fontFamily="'JetBrains Mono', monospace">activation</text>
      <line x1="230" y1="260" x2="260" y2="260" stroke="#ff2daa" strokeWidth="1" opacity="0.5" />
      <rect x="257" y="257" width="5" height="5" fill="#ff2daa" opacity="0.5" transform="rotate(45,259,259)" />
      <text x="270" y="264" fill="#4e5d7a" fontSize="7" fontFamily="'JetBrains Mono', monospace">inhibition</text>
      <line x1="380" y1="260" x2="410" y2="260" stroke="#ffab00" strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
      <text x="415" y="264" fill="#4e5d7a" fontSize="7" fontFamily="'JetBrains Mono', monospace">modulation</text>
    </svg>
  );
}

const DIAGRAM_MAP: Record<string, React.FC> = {
  landscape: LandscapeDiagram,
  umap: UMAPDiagram,
  velocity: VelocityDiagram,
  pseudotime: PseudotimeDiagram,
  branching: BranchingDiagram,
  'gene-network': GeneNetworkDiagram,
};

// Table of contents tracker
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] || '');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export default function LearnPage() {
  const articleIds = ARTICLES.map((a) => a.id);
  const activeSection = useActiveSection(articleIds);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      {/* Ambient background */}
      <div className={styles.bgGlow} />

      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <span className={styles.backArrow}>←</span>
          Back to Explorer
        </Link>
        <div className={styles.headerCenter}>
          <h1 className={styles.pageTitle}>The Science Behind Trajectory Theater</h1>
          <p className={styles.pageSubtitle}>
            Deep-dive articles on the biology, math, and computational methods that power single-cell trajectory analysis
          </p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.articleCount}>{ARTICLES.length} articles</span>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Sidebar TOC */}
        <aside className={styles.sidebar}>
          <nav className={styles.toc}>
            <span className={styles.tocLabel}>Contents</span>
            {ARTICLES.map((article) => (
              <a
                key={article.id}
                href={`#${article.id}`}
                className={`${styles.tocItem} ${activeSection === article.id ? styles.tocActive : ''}`}
              >
                <span className={styles.tocNumber}>{article.number}</span>
                <span className={styles.tocTitle}>{article.title}</span>
              </a>
            ))}
          </nav>

          <div className={styles.sidebarCta}>
            <p className={styles.ctaText}>Ready to explore interactively?</p>
            <Link href="/" className={styles.ctaButton}>
              Open Explorer →
            </Link>
          </div>
        </aside>

        {/* Articles */}
        <main className={styles.articles}>
          {/* Hero intro card */}
          <div className={styles.heroCard}>
            <div className={styles.heroIcon}>🔬</div>
            <h2 className={styles.heroTitle}>Welcome to the Reading Room</h2>
            <p className={styles.heroText}>
              These articles explain the core concepts visualized in Trajectory Theater. They are written for curious people who want to understand the biology at a deeper level than tooltips allow — no prior computational biology experience required.
            </p>
            <p className={styles.heroText}>
              Each article builds on previous ones, but they can also be read independently. Diagrams are included inline. For hands-on exploration, switch back to the interactive explorer at any time.
            </p>
            <div className={styles.heroTags}>
              <span className={styles.heroTag}>Developmental biology</span>
              <span className={styles.heroTag}>Computational genomics</span>
              <span className={styles.heroTag}>Single-cell analysis</span>
              <span className={styles.heroTag}>Data visualization</span>
            </div>
          </div>

          {ARTICLES.map((article) => {
            const isExpanded = expandedArticle === article.id || expandedArticle === null;
            return (
              <article key={article.id} id={article.id} className={styles.article}>
                <div className={styles.articleHeader}>
                  <div className={styles.articleMeta}>
                    <span className={styles.articleNumber} style={{ color: article.accentColor }}>
                      {article.number}
                    </span>
                    <span className={styles.articleReadTime}>{article.readTime}</span>
                  </div>
                  <div className={styles.articleIcon} style={{ color: article.accentColor }}>
                    {article.icon}
                  </div>
                  <h2 className={styles.articleTitle}>{article.title}</h2>
                  <p className={styles.articleSubtitle}>{article.subtitle}</p>
                </div>

                <div className={styles.articleBody}>
                  {article.sections.map((section, si) => (
                    <section key={si} className={styles.section}>
                      <h3 className={styles.sectionHeading}>{section.heading}</h3>

                      {section.content.split('\n\n').map((para, pi) => (
                        <p key={pi} className={styles.paragraph}>
                          {para.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={idx} className={styles.bold}>
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      ))}

                      {section.aside && (
                        <aside className={styles.aside}>
                          <div className={styles.asideIcon}>📝</div>
                          <p>{section.aside}</p>
                        </aside>
                      )}

                      {section.diagram && DIAGRAM_MAP[section.diagram] && (
                        <div className={styles.diagramContainer}>
                          {(() => {
                            const DiagramComponent = DIAGRAM_MAP[section.diagram!];
                            return <DiagramComponent />;
                          })()}
                        </div>
                      )}
                    </section>
                  ))}
                </div>

                {/* Try it CTA */}
                <div className={styles.tryCta} style={{ borderColor: article.accentColor + '33' }}>
                  <span className={styles.tryIcon}>⚡</span>
                  <div>
                    <p className={styles.tryText}>
                      See this concept in action in the interactive explorer.
                    </p>
                    <Link href="/" className={styles.tryLink} style={{ color: article.accentColor }}>
                      Open Trajectory Theater →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Glossary */}
          <div className={styles.glossary} id="glossary">
            <h2 className={styles.glossaryTitle}>Glossary of Key Terms</h2>
            <div className={styles.glossaryGrid}>
              {[
                { term: 'scRNA-seq', def: 'Single-cell RNA sequencing. Technology for measuring gene expression in individual cells.' },
                { term: 'UMAP', def: 'Uniform Manifold Approximation and Projection. Dimensionality reduction method for visualizing high-dimensional data in 2D.' },
                { term: 'Pseudotime', def: 'A computational ordering of cells along a developmental trajectory. Measures progress, not real clock time.' },
                { term: 'RNA velocity', def: 'Method that infers the direction and speed of gene expression changes by comparing unspliced and spliced mRNA ratios.' },
                { term: 'Transcription factor (TF)', def: 'A protein that binds DNA and controls the rate of gene transcription. Master regulators of cell fate.' },
                { term: 'Attractor', def: 'A stable state in a dynamical system. In biology, attractors correspond to cell types or fates.' },
                { term: 'Bifurcation', def: 'A point where a trajectory branches into two or more paths, corresponding to a cell-fate decision.' },
                { term: 'Bistability', def: 'The property of a circuit having two stable states. Creates switch-like behavior in fate decisions.' },
                { term: 'Knockout (KO)', def: 'Experimental removal of a gene\'s function. In our simulator, setting a gene slider to 0%.' },
                { term: 'Overexpression (OE)', def: 'Artificially increasing a gene\'s expression above normal levels. Setting a slider to 100%.' },
                { term: 'iPSC', def: 'Induced pluripotent stem cell. A differentiated cell reprogrammed back to a stem-like state, reversing the Waddington landscape.' },
                { term: 'Morphogen', def: 'A signaling molecule that forms a concentration gradient and specifies different cell types at different levels.' },
              ].map((entry) => (
                <div key={entry.term} className={styles.glossaryEntry}>
                  <dt className={styles.glossaryTerm}>{entry.term}</dt>
                  <dd className={styles.glossaryDef}>{entry.def}</dd>
                </div>
              ))}
            </div>
          </div>

          {/* Further reading */}
          <div className={styles.furtherReading}>
            <h2 className={styles.furtherTitle}>Further Reading & Resources</h2>
            <div className={styles.resourceGrid}>
              {[
                { title: 'Human Cell Atlas', url: 'https://www.humancellatlas.org/', desc: 'International consortium mapping every cell type in the human body.' },
                { title: 'CellxGene', url: 'https://cellxgene.cziscience.com/', desc: 'Interactive explorer for published single-cell datasets.' },
                { title: 'scVelo Documentation', url: 'https://scvelo.readthedocs.io/', desc: 'RNA velocity analysis toolkit with tutorials and theory.' },
                { title: 'Monocle 3', url: 'https://cole-trapnell-lab.github.io/monocle3/', desc: 'Trajectory inference and pseudotime analysis framework.' },
                { title: 'Scanpy Tutorials', url: 'https://scanpy.readthedocs.io/en/stable/tutorials.html', desc: 'Comprehensive single-cell analysis tutorials in Python.' },
                { title: 'Waddington (1957)', url: 'https://en.wikipedia.org/wiki/Epigenetic_landscape', desc: 'The original epigenetic landscape concept.' },
              ].map((resource) => (
                <a
                  key={resource.title}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.resourceCard}
                >
                  <h3 className={styles.resourceTitle}>{resource.title}</h3>
                  <p className={styles.resourceDesc}>{resource.desc}</p>
                  <span className={styles.resourceLink}>Visit ↗</span>
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
