// Words the app uses: presets, the guide, glossary and model limits.
// Kept together so the explanations stay consistent everywhere.

import type { SimParams } from "./sim/params";

export interface Preset {
  id: string;
  name: string;
  /** One line on what it shows. */
  summary: string;
  params: Partial<SimParams>;
}

/** Illustrative settings inspired by real structures. Not measurements of them. */
export const PRESETS: readonly Preset[] = [
  {
    id: "default",
    name: "Starting mix",
    summary: "A moderate mix that forms droplets: a good place to start.",
    params: { proteinCount: 160, rnaCount: 40, chi: 3, temperature: 1, pH: 7, crowding: 1, multiComponent: true, diseaseMode: false, aggregationRate: 1 },
  },
  {
    id: "stress-granule",
    name: "Stress granule",
    summary: "Lots of RNA pulled into protein droplets, as when a stressed cell parks its RNA.",
    params: { proteinCount: 200, rnaCount: 140, chi: 3.2, temperature: 1, pH: 7.2, crowding: 1.1, multiComponent: true, diseaseMode: false },
  },
  {
    id: "threshold",
    name: "Near the threshold",
    summary: "Just sticky enough: small droplets appear and vanish.",
    params: { proteinCount: 160, rnaCount: 40, chi: 1.8, temperature: 1, pH: 7, crowding: 1, multiComponent: true, diseaseMode: false },
  },
  {
    id: "heat",
    name: "Melting by heat",
    summary: "The same molecules at a higher temperature: droplets dissolve.",
    params: { proteinCount: 160, rnaCount: 40, chi: 3, temperature: 2.6, pH: 7, crowding: 1, multiComponent: true, diseaseMode: false },
  },
  {
    id: "dense",
    name: "Crowded and dense",
    summary: "Many sticky proteins and strong crowding, loosely like the packed nucleolus.",
    params: { proteinCount: 320, rnaCount: 80, chi: 4, temperature: 0.9, pH: 7.4, crowding: 1.4, multiComponent: true, diseaseMode: false },
  },
  {
    id: "als",
    name: "Hardening (ALS-like)",
    summary: "Disease mode on: droplets slowly harden into solid clumps, a simplified picture of what happens with some ALS mutations.",
    params: { proteinCount: 200, rnaCount: 30, chi: 4, temperature: 0.9, pH: 6.8, crowding: 1.4, multiComponent: true, diseaseMode: true, aggregationRate: 1.5 },
  },
];

export interface GuideStep {
  id: string;
  title: string;
  body: string[];
  /** Settings the "Try it" button applies. */
  tryParams?: Partial<SimParams>;
  tryLabel?: string;
  /** What to look for after trying. */
  lookFor?: string;
}

export const GUIDE: readonly GuideStep[] = [
  {
    id: "what",
    title: "What is a condensate?",
    body: [
      "Cells have compartments without walls. Some proteins and RNA gather into droplets, the way oil gathers into drops in vinegar. These droplets are called biomolecular condensates.",
      "A droplet collects the molecules a job needs, so the job goes faster, and it can dissolve again in seconds.",
    ],
    tryParams: { proteinCount: 160, rnaCount: 40, chi: 3, temperature: 1, pH: 7, crowding: 1, diseaseMode: false, multiComponent: true },
    tryLabel: "Start the starting mix",
    lookFor: "Within a few seconds, molecules gather into droplets, each outlined and numbered.",
  },
  {
    id: "sticky",
    title: "Stickiness decides",
    body: [
      "Phase separation means one mixture splitting into two parts (phases): a dense part (the droplets) and a dilute part (the liquid around them).",
      "It happens only when molecules are sticky enough. Scientists measure this with a number called χ (chi, said “kai”). Below a threshold, the mixture stays evenly mixed.",
    ],
    tryParams: { chi: 1.0 },
    tryLabel: "Lower stickiness to 1.0",
    lookFor: "The droplets break up and the molecules spread out evenly. Then raise stickiness to 3 and watch them come back.",
  },
  {
    id: "concentration",
    title: "There is a threshold concentration",
    body: [
      "Even sticky molecules need company. Below a certain concentration (called the saturation concentration), there are too few to hold a droplet together.",
      "Above it, extra molecules join droplets rather than staying in the liquid.",
    ],
    tryParams: { proteinCount: 60, chi: 2 },
    tryLabel: "Use 60 proteins at stickiness 2",
    lookFor: "Few or no droplets. Use “Find the threshold” to measure where droplets start for these settings.",
  },
  {
    id: "heat",
    title: "Heat melts droplets",
    body: [
      "Temperature makes molecules jiggle. When the jiggling beats the stickiness, droplets dissolve, like ice melting.",
      "Many real condensates dissolve when warmed, which is one way cells switch them off.",
    ],
    tryParams: { temperature: 2.6, chi: 3 },
    tryLabel: "Raise the temperature to 2.6",
    lookFor: "Droplets shrink and vanish. Lower the temperature again and they reform.",
  },
  {
    id: "theory",
    title: "The theory: two dips mean two phases",
    body: [
      "Flory-Huggins theory gives a curve of “free energy” (roughly, how unhappy the mixture is) against how much of the space the sticky molecules fill.",
      "When χ is above 2, the curve has two dips. The mixture can lower its free energy by splitting into a dilute phase and a dense phase, one at each dip.",
    ],
    lookFor: "Open the Theory tab and move the stickiness slider: watch one dip turn into two.",
  },
  {
    id: "rna",
    title: "Scaffolds and clients",
    body: [
      "Scaffolds are molecules that build droplets by sticking to each other. Clients only stick to scaffolds, so they join droplets without being able to make them.",
      "Here, proteins are scaffolds and RNA is a client: RNA barely sticks to RNA.",
    ],
    tryParams: { rnaCount: 120, multiComponent: true, chi: 3 },
    tryLabel: "Add more RNA",
    lookFor: "The droplets table shows how much RNA each droplet holds. RNA gathers in droplets even though it can't form them on its own.",
  },
  {
    id: "frap",
    title: "Liquid or solid? Bleach and watch",
    body: [
      "FRAP (fluorescence recovery after photobleaching) is how labs test whether a droplet is liquid. They make the molecules glow, then use a laser to bleach a spot dark.",
      "In a liquid, glowing molecules swim back in and the spot recovers quickly. In a solid, molecules are stuck and the spot stays dark.",
    ],
    lookFor: "Select a droplet and press “Bleach a spot”. The FRAP tab draws the recovery and measures how fast it is.",
  },
  {
    id: "disease",
    title: "When liquid turns solid",
    body: [
      "In diseases such as ALS (a disease that damages nerve cells), some mutations make liquid droplets harden into solid clumps (aggregates) that cells cannot dissolve.",
      "Liquid droplets do their job; solid clumps get in the way. Stopping this hardening is a target for new drugs.",
    ],
    tryParams: { diseaseMode: true, aggregationRate: 1.5, chi: 4, proteinCount: 200 },
    tryLabel: "Turn on disease mode",
    lookFor: "Some droplets harden: their molecules turn into squares and stop moving. Bleach one and compare the recovery with a liquid droplet. Turning disease mode off does not undo the clumps.",
  },
];

export const LIMITS: readonly string[] = [
  "It is flat (2D). Real droplets are 3D.",
  "Each molecule is one bead. Real proteins and RNA are long chains with specific sticky patches.",
  "There is no flowing water, no electric charge and no chemistry. pH and crowding are simple multipliers on stickiness.",
  "Units are arbitrary. Times, temperatures and sizes are not seconds, degrees or nanometres.",
  "Hardening in disease mode is a probability rule, not a model of how mutations act.",
  "Simulated droplets hold only tens of molecules, so a single FRAP curve is noisy. Bleach several droplets and compare them in the runs table, as a lab would.",
  "The Theory tab draws the textbook Flory-Huggins curve. It explains the idea but does not predict this simulation's exact threshold; “Find the threshold” measures that.",
  "Presets are illustrative settings inspired by real structures, not measurements of them.",
];

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  { term: "Condensate", definition: "A droplet of proteins and RNA inside a cell, with no membrane around it." },
  { term: "Phase separation", definition: "A mixture splitting into two parts (phases) with different concentrations, such as droplets and the liquid around them." },
  { term: "Dense phase", definition: "The crowded part: inside the droplets." },
  { term: "Dilute phase", definition: "The sparse part: the liquid between droplets." },
  { term: "χ (chi)", definition: "A number for how much molecules prefer each other over water. Higher means stickier." },
  { term: "Saturation concentration", definition: "The concentration above which droplets form. Below it, everything stays mixed." },
  { term: "Scaffold", definition: "A molecule that builds droplets by sticking to its own kind (here, protein)." },
  { term: "Client", definition: "A molecule that joins droplets by sticking to scaffolds but cannot build them (here, RNA)." },
  { term: "FRAP", definition: "Fluorescence recovery after photobleaching: bleach a glowing spot and time how fast brightness returns." },
  { term: "Mobile fraction", definition: "The share of molecules that are free to move. Near 100% means liquid; near 0% means solid." },
  { term: "Half-time", definition: "How long the bleached spot takes to recover half of its lost brightness." },
  { term: "Aggregate", definition: "A solid clump of molecules that no longer moves or dissolves." },
  { term: "Spinodal", definition: "On the theory curve, the region where a mixture is so unstable that it separates immediately everywhere." },
  { term: "Binodal", definition: "The two concentrations a separating mixture settles into: one for the dilute phase, one for the dense phase." },
];
