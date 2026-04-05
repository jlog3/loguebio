import Link from "next/link";

export default function Home() {
  const projects = [
    {
      name: "Cancer Pathway Visualizer",
      slug: "cancer-pathway-visualizer",
      description: "Interactive cancer signaling pathways",
    },
    {
      name: "ChromaLoop Simulator",
      slug: "chromaloop-simulator",
      description: "Chromatin loop modeling and simulation",
    },
    {
      name: "Condensate Lab",
      slug: "condensate-lab",
      description: "Biomolecular condensate simulations",
    },
    {
      name: "FoldFlow Dynamics",
      slug: "foldflow-dynamics",
      description: "Protein folding dynamics explorer",
    },
    {
      name: "Mag",
      slug: "mag",
      description: "Magnetic field flow visualization",
    },
    {
      name: "OmniHarmony",
      slug: "omniharmony",
      description: "Multi-omics harmony integration",
    },
    {
      name: "Pangenome Voyager",
      slug: "pangenome-voyager",
      description: "Pangenome browser and explorer",
    },
    {
      name: "Waddington Landscape Explorer",
      slug: "waddington-landscape-explorer",
      description: "Epigenetic landscape visualization",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">LogueBio</h1>
          <p className="text-xl text-zinc-400">
            Open-source bioinformatics tools and visualizations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <a
              key={project.slug}
              href={`https://${project.slug}.yourdomain.com`}
              target="_blank"
              className="group block bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-2xl p-6 transition-all"
            >
              <h3 className="text-2xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-zinc-400">{project.description}</p>
              <div className="mt-6 text-sm text-blue-400 flex items-center gap-2">
                Open project →
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
