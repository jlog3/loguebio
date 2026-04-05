# 🧪 Condensate Lab

**Liquid-Liquid Phase Separation (LLPS) Simulator**

An interactive, real-time Brownian dynamics simulator for exploring biomolecular condensates — the membraneless organelles formed by phase separation in cells. Built with Next.js, TypeScript, and HTML Canvas.

![Condensate Lab](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)

---

## Features

### 🔬 Particle Simulation
- **Real-time Brownian dynamics** with Lennard-Jones-like interaction potentials
- 2D canvas rendering with glow effects, particle trails, and condensate halos
- Adjustable particle counts (proteins + RNA), interaction strength, temperature, pH, and macromolecular crowding

### 📊 Flory-Huggins Theory
- Live phase diagram showing free energy landscape f(φ)
- Spinodal decomposition regions highlighted
- Critical χ parameter visualization
- Educational walkthrough that makes the math accessible

### 📸 FRAP (Fluorescence Recovery After Photobleaching)
- **Click anywhere** on the simulation to bleach a region
- Watch real-time recovery curves as molecules diffuse back in
- Compare liquid (fast recovery) vs. solid (no recovery) states

### ⚠️ Disease Mode
- Toggle ALS/FTD-linked mutations
- Watch liquid condensates transition to solid aggregates
- Adjustable aggregation rate
- Visual feedback: healthy (cyan) → intermediate (amber) → pathological (red)

### 🧬 Multi-Component Mode
- Proteins (cyan) + RNA (purple) co-partition into condensates
- Different partition coefficients for different molecule types
- Models real biological complexity of stress granules, P-bodies, and nucleoli

### 🧪 Preset Experiments
- **Stress Granule** — High-density protein/RNA condensate
- **P-Body** — RNA-rich processing body
- **ALS Mutation** — FUS/TDP-43 aggregation
- **Dissolution** — Watch condensates melt with temperature
- **Critical Point** — Near the phase boundary
- **Nucleolus** — Multi-layered condensate

### 📖 Educational Mode
- 8-step walkthrough from "What are condensates?" to "Disease: Liquid → Solid"
- Each step includes parameter hints to try in the simulator
- No math prerequisites — builds intuition through interaction

---

## Getting Started

```bash
# Clone and install
git clone <your-repo>
cd condensate-lab
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture

```
src/
├── app/
│   ├── globals.css          # Lab theme, glow effects, custom scrollbar
│   ├── layout.tsx           # Root layout with metadata
│   └── page.tsx             # Main page wiring all components
├── components/
│   ├── SimCanvas.tsx        # Canvas with FRAP click handler
│   ├── ControlPanel.tsx     # Parameter sliders
│   ├── StatsPanel.tsx       # Live metrics display
│   ├── FrapChart.tsx        # FRAP recovery curve
│   ├── PhaseDiagram.tsx     # Flory-Huggins free energy plot
│   ├── EducationalPanel.tsx # Step-by-step theory walkthrough
│   ├── RenderOptions.tsx    # Visual settings (trails, glow)
│   ├── Presets.tsx          # Quick-start experiment configs
│   └── Header.tsx           # Title bar and navigation
├── hooks/
│   └── useSimulation.ts     # Main simulation loop hook
└── lib/
    ├── simulation.ts        # Core physics engine
    └── renderer.ts          # Canvas rendering pipeline
```

### Physics Engine (`simulation.ts`)
- **Brownian dynamics** with configurable thermal noise
- **Pairwise interactions** using a modified Lennard-Jones potential
- **Cluster detection** via BFS on distance graph
- **Aggregation model** for disease-state transitions
- **FRAP bleaching** with region tracking and recovery measurement
- **Flory-Huggins** free energy and spinodal computation

### Rendering (`renderer.ts`)
- Double-buffered canvas rendering at native DPI
- Particle glow halos with radial gradients
- Condensate boundary visualization (dashed circles)
- Optional motion trails
- Scale bar and time display

---

## Key Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| **χ (chi)** | 0.5–8.0 | Interaction strength. >2 = phase separation |
| **Temperature** | 0.1–3.0 | Thermal energy. Higher dissolves condensates |
| **pH** | 4.0–10.0 | Modulates charge-based interactions |
| **Crowding** | 0.5–2.0× | Macromolecular crowding enhancement |
| **Aggregation Rate** | 0.1–2.0 | Speed of liquid→solid transition (disease mode) |

---

## Tech Stack

- **Next.js 15** — App Router, React Server Components
- **TypeScript** — Full type safety
- **Tailwind CSS** — Custom lab-themed design system
- **HTML Canvas** — High-performance 2D rendering
- **Framer Motion** — UI animations (available for extensions)

---

## License

MIT
