// Words the app uses: story steps, experiments, glossary, model limits and
// the Learn articles. Kept together so explanations stay consistent.

import type { Fate, GeneName, ModelParams } from "./model/params";

export const FATE_LABEL: Record<Fate, string> = {
  stem: "Undecided (stem)",
  neuron: "Neuron",
  glia: "Glia",
  muscle: "Muscle",
  blood: "Blood",
};

export const FATE_SHAPE: Record<Fate, string> = {
  stem: "circle",
  neuron: "triangle",
  glia: "diamond",
  muscle: "square",
  blood: "plus",
};

export const FATE_BLURB: Record<Fate, string> = {
  stem: "Still on the summit: hasn't chosen a fate yet.",
  neuron: "Nerve cells that carry signals.",
  glia: "Support cells of the nervous system (here, oligodendrocytes, which insulate nerve fibres).",
  muscle: "Skeletal muscle cells.",
  blood: "Red blood cells.",
};

export interface Experiment {
  id: string;
  name: string;
  summary: string;
  genes: Partial<ModelParams["genes"]>;
}

const NORMAL = { Sox2: 0.5, Neurog2: 0.5, Olig2: 0.5, MyoD: 0.5, Gata1: 0.5, Notch1: 0.5, Wnt3a: 0.5, Shh: 0.5 };

export const EXPERIMENTS: readonly Experiment[] = [
  { id: "normal", name: "Normal (wild type)", summary: "Every gene at its normal level: the reference every other run is compared with.", genes: NORMAL },
  { id: "neurog2-ko", name: "Knock out Neurog2", summary: "No neuron valley: cells that would have become neurons roll into the neighbouring valleys instead.", genes: { ...NORMAL, Neurog2: 0 } },
  { id: "gata1-ko", name: "Knock out Gata1", summary: "No blood valley: the blood branch disappears.", genes: { ...NORMAL, Gata1: 0 } },
  { id: "sox2-high", name: "Keep cells stem (Sox2 high)", summary: "A deeper hollow on the summit holds cells back from choosing a fate.", genes: { ...NORMAL, Sox2: 1 } },
  { id: "sox2-ko", name: "Rush to differentiate (Sox2 off)", summary: "No hollow on the summit: cells leave it sooner.", genes: { ...NORMAL, Sox2: 0 } },
  { id: "notch-high", name: "Strong Notch signalling", summary: "Lateral inhibition holds back neurons and favours glia.", genes: { ...NORMAL, Notch1: 1 } },
  { id: "wnt-high", name: "High Wnt3a", summary: "The landscape tilts towards muscle and blood.", genes: { ...NORMAL, Wnt3a: 1 } },
  { id: "force-muscle", name: "Force muscle", summary: "MyoD overexpressed and Wnt3a high, other fate genes low.", genes: { ...NORMAL, MyoD: 1, Wnt3a: 0.9, Neurog2: 0.25, Olig2: 0.25, Gata1: 0.25 } },
];

export interface StoryStep {
  id: string;
  title: string;
  body: string[];
  /** Pseudotime cursor to set. */
  cursor: number;
  focus: Fate | null;
  gene: GeneName | null;
  /** Gene levels to apply for "Try it" (relative to normal). */
  tryGenes?: Partial<ModelParams["genes"]>;
  tryLabel?: string;
  lookFor: string;
  article: string;
}

export const STORY: readonly StoryStep[] = [
  {
    id: "summit",
    title: "The summit: undecided cells",
    body: [
      "In 1957 Conrad Waddington drew development as a ball rolling down a landscape. A stem cell sits on the summit: it could still become anything.",
      "Here each cell is a marble. Cells on the summit express Sox2, a gene that keeps them undecided.",
    ],
    cursor: 0.15,
    focus: "stem",
    gene: "Sox2",
    lookFor: "Only the earliest cells are shown: all of them on or near the summit, all undecided.",
    article: "waddington",
  },
  {
    id: "first-split",
    title: "Leaving the summit",
    body: [
      "Random jiggling nudges each cell off the summit at a slightly different moment and in a slightly different direction. That direction decides which valley it rolls into.",
      "RNA velocity, a method that compares new and mature RNA in each cell, estimates where a cell is heading. Turn on the arrows to see it.",
    ],
    cursor: 0.35,
    focus: null,
    gene: "Notch1",
    lookFor: "Cells streaming outwards in four directions. With arrows on, they point downhill, away from the summit.",
    article: "rna-velocity",
  },
  {
    id: "neurons",
    title: "Neurons: Neurog2 carves a valley",
    body: [
      "Neurog2 switches on genes that make a neuron. In the landscape, it digs the neuron valley. The deeper a valley, the more cells it catches.",
      "Once a cell is well down a valley, climbing back over the ridge is unlikely. Biologists call this commitment.",
    ],
    cursor: 0.6,
    focus: "neuron",
    gene: "Neurog2",
    tryGenes: { Neurog2: 0 },
    tryLabel: "Knock out Neurog2",
    lookFor: "With Neurog2 knocked out, the neuron valley fills in and those cells end up as glia or muscle instead. The Fates table shows the change against normal.",
    article: "gene-regulation",
  },
  {
    id: "glia",
    title: "Glia: a neighbouring valley",
    body: [
      "Olig2 makes glia. Its valley sits next to the neuron valley: both are neural fates, and Neurog2 and Olig2 hold each other back.",
      "Notch signalling between neighbouring cells also holds back neurons and favours glia (lateral inhibition).",
    ],
    cursor: 0.7,
    focus: "glia",
    gene: "Olig2",
    tryGenes: { Notch1: 1 },
    tryLabel: "Turn Notch1 up",
    lookFor: "More glia and fewer neurons: the neuron valley gets shallower, the glia valley deeper.",
    article: "gene-regulation",
  },
  {
    id: "pseudotime",
    title: "Pseudotime is not real time",
    body: [
      "An experiment measures each cell once. To rebuild the order of events, tools line cells up by how similar their genes are, starting from a chosen first cell. That order is called pseudotime.",
      "This simulation knows each cell's true age, so you can check how well pseudotime recovers it.",
    ],
    cursor: 1,
    focus: null,
    gene: "MyoD",
    lookFor: "Open the Pseudotime check tab. Order mostly agrees with age, but cells that left the summit late look 'younger' than they are, and cells that have finished look alike.",
    article: "pseudotime",
  },
  {
    id: "map",
    title: "The map is not the territory",
    body: [
      "Single-cell studies usually show cells on a UMAP: a flat picture where similar cells sit close together. Distances between clusters, and cluster sizes, are not reliable.",
      "Here the map is the landscape seen from above, which is what a UMAP tries to recover. Real UMAPs are messier.",
    ],
    cursor: 1,
    focus: "blood",
    gene: "Gata1",
    lookFor: "Switch to the Map view: the same cells, flat, with contour lines showing the height of the landscape.",
    article: "umap",
  },
  {
    id: "reshape",
    title: "Reshape the landscape",
    body: [
      "Every gene slider changes the terrain: knocking a gene out fills in its valley; turning it up digs it deeper; signals like Wnt3a tilt the whole surface.",
      "Changing one gene moves the same cells under the same random kicks, so any difference you see comes from that gene.",
    ],
    cursor: 1,
    focus: null,
    gene: null,
    tryGenes: { Wnt3a: 1 },
    tryLabel: "Turn Wnt3a up",
    lookFor: "The landscape tilts towards muscle and blood, and the Fates table shows them gaining cells from the neural side.",
    article: "waddington",
  },
];

export const LIMITS: readonly string[] = [
  "It is a two-dimensional landscape with four fates. Real development has thousands of genes, many more cell types, and landscapes that change over time.",
  "The gene rules are simple and stated (each gene's card says what it does here). They match well-known effects but are not fitted to data.",
  "Gene expression is calculated from where a cell sits on the landscape, with a little noise. Real expression is far noisier, and many genes drop out.",
  "The map is the landscape seen from above. A real UMAP is computed from expression and distorts distances.",
  "Pseudotime is inferred from expression, as real tools do, but with a simple method (shortest paths on a 12-neighbour graph from the least differentiated cell).",
  "RNA velocity here is the true downhill direction plus noise, standing in for what real velocity tools estimate from spliced and unspliced RNA.",
  "The example cells are simulated, not measurements of real cells.",
];

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  { term: "Waddington landscape", definition: "A picture of development as a ball rolling downhill: the summit is the stem cell, the valleys are the cell types." },
  { term: "Stem cell", definition: "A cell that can still become several kinds of cell." },
  { term: "Fate", definition: "The kind of cell a cell ends up as." },
  { term: "Commitment", definition: "The point after which a cell will not switch to another fate under normal conditions." },
  { term: "Transcription factor", definition: "A protein that switches other genes on or off." },
  { term: "Knockout", definition: "Removing or disabling a gene. Here: setting its slider to 0%." },
  { term: "Overexpression", definition: "Making more of a gene's product than normal. Here: setting its slider to 100%." },
  { term: "Wild type", definition: "Normal, unaltered: every gene at its usual level." },
  { term: "Lateral inhibition", definition: "A cell that commits tells its neighbours not to do the same (here, through Notch)." },
  { term: "scRNA-seq", definition: "Single-cell RNA sequencing: measuring which genes each individual cell is using." },
  { term: "Pseudotime", definition: "An ordering of cells by how far they have progressed, rebuilt from their genes. Not clock time." },
  { term: "Root cell", definition: "The cell chosen as the starting point for pseudotime (here, the least differentiated cell)." },
  { term: "Branch point", definition: "Where cells of one fate first split off. Here: the pseudotime by which 5% of that fate's cells have appeared." },
  { term: "RNA velocity", definition: "An estimate of where a cell is heading, from the balance of new (unspliced) and mature (spliced) RNA." },
  { term: "UMAP", definition: "A method that squashes thousands of gene measurements into a flat map where similar cells sit near each other." },
  { term: "Attractor", definition: "A stable state a system settles into: a valley floor in the landscape." },
];

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  aside?: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  sections: ArticleSection[];
}

export const ARTICLES: readonly Article[] = [
  {
    id: "waddington",
    title: "Waddington's landscape",
    subtitle: "Why cells roll downhill, and what the hills mean",
    sections: [
      {
        heading: "A picture that became a model",
        paragraphs: [
          "In 1957 the biologist Conrad Waddington drew a ball resting on top of a ridged hillside. The ball is a cell. The hillside stands for every combination of genes a cell could be using.",
          "As development goes on, the ball rolls downhill into one of several valleys. Each valley is a kind of cell: a neuron, a muscle cell, a blood cell. The ridges between valleys are combinations of genes that don't last, so cells pass through them but don't stay.",
          "Once a cell is well down a valley it rarely climbs back or crosses into another. That is why development normally runs one way.",
        ],
        aside: "Waddington also coined the word 'epigenetics'. He meant how genes interact to build a body, not the modern meaning (changes passed on without changing the DNA sequence).",
      },
      {
        heading: "From picture to mathematics",
        paragraphs: [
          "Since the 2000s, researchers have turned the picture into equations. Genes that switch each other on and off form a network. A network like that settles into a few stable states, called attractors: the valley floors. The summit is a state that cannot last; tiny nudges push cells off it.",
          "One way to draw the height: states a cell is likely to be in are low, and unlikely states are high. That is how this simulator builds its landscape, and why cells gather on the valley floors.",
        ],
      },
      {
        heading: "Why it matters for medicine",
        paragraphs: [
          "Shinya Yamanaka won a Nobel Prize for pushing cells back up the hill: four genes can turn a skin cell back into a stem-like cell, called an induced pluripotent stem cell.",
          "Some cancers can be seen as cells stuck in abnormal valleys, or as a landscape reshaped by mutations. Drugs that change gene activity try to reshape the landscape, as the sliders do here.",
        ],
      },
    ],
  },
  {
    id: "scrna-seq",
    title: "Single-cell RNA sequencing",
    subtitle: "Reading which genes each individual cell is using",
    sections: [
      {
        heading: "One cell at a time",
        paragraphs: [
          "For decades, gene activity could only be measured in bulk: thousands of cells ground up together, giving an average. That is like knowing a city's average temperature but nothing about its neighbourhoods.",
          "Single-cell RNA sequencing (scRNA-seq), developed in the early 2010s, captures the RNA inside each individual cell. RNA is the working copy a cell makes of a gene it is using. A modern experiment can profile hundreds of thousands of cells, around 20,000 genes each.",
        ],
        aside: "The RNA isn't read directly. It is copied into DNA, multiplied, cut into pieces and sequenced, and software maps each piece back to its gene and counts them.",
      },
      {
        heading: "From counts to cell types",
        paragraphs: [
          "The data is huge and noisy: many genes read zero just because their RNA was lost in preparation (called dropout). A typical analysis removes damaged cells and doublets (two cells read as one), adjusts for how deeply each cell was sequenced, keeps the most variable genes, shrinks the data to fewer dimensions, groups similar cells, and names the groups from genes known to mark each cell type.",
          "The simulated cells here skip that mess: their expression comes straight from where they sit on the landscape, with a little noise.",
        ],
      },
      {
        heading: "Cell atlases",
        paragraphs: [
          "Projects such as the Human Cell Atlas aim to map every cell type in the body, and services such as CELLxGENE share many published datasets. New data can be compared with these references to see which normal cells it resembles and how it differs.",
        ],
      },
    ],
  },
  {
    id: "umap",
    title: "UMAP: useful, and easy to misread",
    subtitle: "What the favourite single-cell picture shows, and what it hides",
    sections: [
      {
        heading: "Thousands of dimensions, flattened",
        paragraphs: [
          "Each cell is described by thousands of numbers, one per gene. Nobody can picture that, so cells are drawn on a flat map. UMAP (Uniform Manifold Approximation and Projection, 2018) builds a network linking each cell to its most similar neighbours, then lays the network out flat while trying to keep neighbours together.",
          "On the result, similar cells sit close together: clusters are cell types, and streams are cells in transition.",
        ],
      },
      {
        heading: "What not to read from a UMAP",
        paragraphs: [
          "Distances between clusters mean little: two far-apart clusters are not necessarily more different than two close ones.",
          "Cluster sizes and shapes are unreliable: UMAP spreads dense groups out and squeezes sparse ones.",
          "Bridges and gaps can be artefacts: thin links between clusters, or one population split in two, can come from the method's settings rather than biology.",
          "Use UMAP to explore and form ideas, then check them with other methods.",
        ],
        aside: "t-SNE, an older method, has similar limits. Its main setting is called perplexity; UMAP's are n_neighbors and min_dist.",
      },
      {
        heading: "Settings change the picture",
        paragraphs: [
          "n_neighbors (often 15) sets how many neighbours each cell is linked to: small values make tight, separate clusters; large values keep more of the overall shape. min_dist sets how tightly points may pack. Good practice is to try several settings and trust only what stays the same.",
          "The Map view here is not a UMAP: it is the landscape seen from above, the true layout a UMAP tries to recover.",
        ],
      },
    ],
  },
  {
    id: "rna-velocity",
    title: "RNA velocity",
    subtitle: "Estimating where cells are going, not just where they are",
    sections: [
      {
        heading: "A photo, not a film",
        paragraphs: [
          "An experiment sees each cell once, like a photo of a motorway: you can see where each car is, but not which way it's driving.",
          "RNA velocity (La Manno and colleagues, 2018; extended in scVelo, 2020) finds a hidden clue in the photo: the balance between new and mature RNA.",
        ],
      },
      {
        heading: "New and mature RNA",
        paragraphs: [
          "A gene is first copied as unspliced RNA, which still contains extra pieces (introns). Within minutes to hours the cell cuts these out, leaving spliced, mature RNA.",
          "If a gene is being switched on, there is more unspliced RNA than usual: new copies are being made faster than they are processed. If it is being switched off, unspliced RNA is scarce while mature RNA lingers. Adding this up over many genes gives an arrow for each cell: the direction its genes are changing.",
        ],
      },
      {
        heading: "Limits",
        paragraphs: [
          "The method assumes things about how fast genes are made and broken down, and those assumptions fail in some cells. The arrows show direction, not speed or timing. Technical noise can produce misleading arrows. Newer tools such as CellRank combine velocity with other evidence.",
          "Here, the arrows are the true downhill direction plus noise, standing in for a real estimate.",
        ],
      },
    ],
  },
  {
    id: "pseudotime",
    title: "Pseudotime",
    subtitle: "Putting cells in order without a clock",
    sections: [
      {
        heading: "Ordering a snapshot",
        paragraphs: [
          "A single experiment catches cells at every stage at once: early, halfway and finished. Lining them up by progress rebuilds the order of development from one measurement. That order is pseudotime.",
          "It is 'pseudo' because it is not clock time. Equal steps in pseudotime are equal amounts of change in the genes, not equal amounts of time.",
        ],
      },
      {
        heading: "How it is worked out",
        paragraphs: [
          "Link each cell to its most similar cells. Choose a starting cell (the root), usually the least differentiated. Measure how far every other cell is from the root along those links. Where the paths split, there is a branch point.",
          "Tools differ in how they find the paths: Monocle 3 fits a branching tree, PAGA links clusters, Slingshot fits smooth curves, and Palantir and CellRank give each cell a probability of each fate instead of one answer. A 2019 comparison of 45 methods found no single best one.",
          "This simulator uses the simple version: 12 neighbours per cell, starting from the least differentiated cell.",
        ],
      },
      {
        heading: "What the check shows",
        paragraphs: [
          "Because a simulation knows each cell's true age, the Pseudotime check tab can compare the two. They agree on order overall, but cells that happened to leave the summit late look younger than they are, and cells that have reached the end of a valley look alike however old they are. Real data adds far more noise.",
        ],
      },
    ],
  },
  {
    id: "gene-regulation",
    title: "Genes that decide fates",
    subtitle: "The circuits behind each valley",
    sections: [
      {
        heading: "Same DNA, different cells",
        paragraphs: [
          "Every cell in your body carries the same genes. A neuron differs from a muscle cell in which genes it uses. Transcription factors, proteins that switch other genes on or off, form networks with feedback loops that create stable states (cell types) and switches (fate decisions).",
        ],
      },
      {
        heading: "The genes in this simulator",
        paragraphs: [
          "Sox2 keeps stem cells as stem cells (with Oct4 and Nanog in real cells). Neurog2 drives neurons. Olig2 drives oligodendrocytes, a kind of glia. MyoD is the master switch for muscle: on its own it can turn other cells into muscle. Gata1 is needed for red blood cells. Notch1 carries signals between neighbouring cells that hold back neurons. Wnt3a is a signal that steers early cells towards mesoderm, the tissue that makes muscle and blood. Shh (Sonic hedgehog) patterns the neural tube and switches on Olig2.",
          "Each gene's card in the explorer says exactly what it does to the landscape here. These are simplifications chosen to match well-known effects.",
        ],
      },
      {
        heading: "Switches and no way back",
        paragraphs: [
          "Two genes that each switch the other off make a switch with two stable states: A on and B off, or the reverse. Whichever gets ahead wins, which is why fate decisions feel all-or-nothing. Here, Neurog2 and Olig2 hold each other back a little.",
          "The same switch explains why going back is hard: once a cell has tipped one way, the loop holds it there. Reprogramming needs strong, forced expression of the right genes.",
        ],
      },
    ],
  },
];

export const RESOURCES = [
  { title: "Human Cell Atlas", url: "https://www.humancellatlas.org/", desc: "An international project mapping every cell type in the human body." },
  { title: "CELLxGENE", url: "https://cellxgene.cziscience.com/", desc: "Explore published single-cell datasets in the browser." },
  { title: "scVelo", url: "https://scvelo.readthedocs.io/", desc: "Documentation and tutorials for RNA velocity." },
  { title: "Monocle 3", url: "https://cole-trapnell-lab.github.io/monocle3/", desc: "Trajectory and pseudotime analysis." },
  { title: "Scanpy tutorials", url: "https://scanpy.readthedocs.io/en/stable/tutorials/", desc: "Single-cell analysis in Python." },
  { title: "Canalisation (Wikipedia)", url: "https://en.wikipedia.org/wiki/Canalisation_(genetics)", desc: "Waddington's idea that development runs down valleys, and where his landscape picture came from." },
];
