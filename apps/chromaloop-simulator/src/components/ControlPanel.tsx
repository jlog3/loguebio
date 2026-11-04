'use client';

import { SimulationState, ColorScheme } from '@/types';
import HelpTooltip from './HelpTooltip';

interface Props {
  state: SimulationState;
  running: boolean;
  colorScheme: ColorScheme;
  onToggleRunning: () => void;
  onReset: () => void;
  onTemperatureChange: (val: number) => void;
  onLoopExtrusionToggle: () => void;
  onCompartmentStrength: (val: number) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onMutateCTCF: (beadIndex: number) => void;
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <div className={`toggle-track ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="toggle-knob" />
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  unit,
  help,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  label: string;
  unit?: string;
  help?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] text-[var(--text-secondary)] flex items-center">
          {label}
          {help && <HelpTooltip text={help} />}
        </span>
        <span className="font-mono text-[10px] text-chromatin-cyan">
          {value.toFixed(2)}{unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function ControlPanel({
  state,
  running,
  colorScheme,
  onToggleRunning,
  onReset,
  onTemperatureChange,
  onLoopExtrusionToggle,
  onCompartmentStrength,
  onColorSchemeChange,
  onMutateCTCF,
}: Props) {
  const ctcfSites = state.beads.filter(
    (b) => b.type === 'ctcf_forward' || b.type === 'ctcf_reverse'
  );

  return (
    <div className="control-panel w-[240px] flex-shrink-0 border-r border-[rgba(0,229,255,0.08)] overflow-y-auto p-4 space-y-5">
      {/* Simulation Controls */}
      <section>
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-3 flex items-center">
          Simulation
          <HelpTooltip text="Controls for the physics simulation. Play/Pause with Spacebar, Reset with R." />
        </h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={onToggleRunning}
            className={`flex-1 font-mono text-[11px] py-2 rounded-lg transition-all ${
              running
                ? 'bg-chromatin-green/15 text-chromatin-green border border-chromatin-green/20 hover:bg-chromatin-green/25'
                : 'bg-chromatin-amber/15 text-chromatin-amber border border-chromatin-amber/20 hover:bg-chromatin-amber/25'
            }`}
            title="Spacebar"
          >
            {running ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={onReset}
            className="px-3 font-mono text-[11px] py-2 rounded-lg bg-white/5 text-[var(--text-secondary)] border border-white/10 hover:bg-white/10 transition-all"
            title="R"
          >
            ↻
          </button>
        </div>

        <Slider
          label="Temperature"
          value={state.temperature}
          min={0}
          max={3}
          step={0.05}
          onChange={onTemperatureChange}
          unit=" kT"
          help="Thermal noise intensity. Higher values = more random motion. At 0, the structure only responds to deterministic forces. Biological temperature is ~1 kT."
        />
      </section>

      {/* Loop Extrusion */}
      <section>
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-3 flex items-center">
          Loop Extrusion
          <HelpTooltip text="Cohesin motor proteins that actively extrude chromatin loops. When ON, they create TADs. When OFF, the 3D structure loses its domain organization. Toggle with L." />
        </h3>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] text-[var(--text-secondary)] flex items-center">
            Cohesin Motors
          </span>
          <Toggle active={state.loopExtrusionEnabled} onClick={onLoopExtrusionToggle} />
        </div>

        {state.loopExtrusionEnabled && (
          <div className="space-y-2">
            <div className="glass-panel p-2 space-y-1.5">
              <div className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider flex items-center">
                Cohesin Status
                <HelpTooltip text="Each cohesin ring is assigned to a TAD. Green = actively extruding. Red = stalled at a CTCF boundary (this is normal and desired)." size={10} />
              </div>
              {state.cohesins.map((coh) => (
                <div key={coh.id} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: coh.stalled ? '#ff1744' : coh.active ? '#39ff14' : '#555',
                    }}
                  />
                  <span className="font-mono text-[9px] text-[var(--text-secondary)]">
                    Motor {coh.id}
                  </span>
                  <span className="font-mono text-[8px] text-[var(--text-dim)] ml-auto">
                    {coh.stalled ? 'stalled' : coh.active ? 'extruding' : 'off'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!state.loopExtrusionEnabled && (
          <div className="glass-panel p-2.5">
            <p className="font-body text-[9px] text-chromatin-amber/70 leading-relaxed">
              Loop extrusion is OFF. Without cohesin, TADs dissolve and the polymer relaxes to a random walk. A/B compartments may strengthen—this matches real biology!
            </p>
          </div>
        )}
      </section>

      {/* Compartmentalization */}
      <section>
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-3 flex items-center">
          Compartments
          <HelpTooltip text="A/B compartments are megabase-scale domains: A = active, gene-rich, open chromatin; B = inactive, gene-poor, condensed. They form by phase separation—like regions attract." />
        </h3>
        <Slider
          label="A/B Strength"
          value={state.compartmentalizationStrength}
          min={0}
          max={1}
          step={0.05}
          onChange={onCompartmentStrength}
          help="Controls how strongly A compartment beads attract other A beads (and B attracts B). At 0, there is no compartmentalization. At 1, compartments strongly phase-separate."
        />
        <div className="flex items-center gap-3 mt-2 font-mono text-[9px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-chromatin-cyan" /> A (active)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-chromatin-magenta" /> B (inactive)
          </span>
        </div>
      </section>

      {/* Color Scheme */}
      <section>
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-3 flex items-center">
          Color Scheme
          <HelpTooltip text="Change how the 3D beads are colored. TAD mode shows domain identity, A/B shows compartment type, Expression highlights gene activity levels." />
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { key: 'tad' as ColorScheme, label: 'TADs', icon: '▦', desc: 'Domain identity' },
            { key: 'compartment' as ColorScheme, label: 'A/B', icon: '◐', desc: 'Active vs silent' },
            { key: 'expression' as ColorScheme, label: 'Expression', icon: '◉', desc: 'Gene activity' },
            { key: 'distance' as ColorScheme, label: 'Distance', icon: '◈', desc: 'From selection' },
          ]).map(({ key, label, icon, desc }) => (
            <button
              key={key}
              onClick={() => onColorSchemeChange(key)}
              className={`font-mono text-[10px] px-2 py-1.5 rounded-md transition-all text-left group ${
                colorScheme === key
                  ? 'bg-chromatin-cyan/15 text-chromatin-cyan border border-chromatin-cyan/25'
                  : 'bg-white/5 text-[var(--text-secondary)] border border-transparent hover:bg-white/8'
              }`}
              title={desc}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </section>

      {/* CTCF Mutation */}
      <section>
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-3 flex items-center">
          Mutate CTCF Sites
          <HelpTooltip text="Delete individual CTCF insulator sites to break TAD boundaries. This mimics what happens in diseases where boundary elements are lost—enhancers can then 'leak' into adjacent domains." />
        </h3>
        <p className="font-body text-[10px] text-[var(--text-dim)] mb-2 leading-relaxed">
          Click a CTCF site to delete it. Watch the boundary dissolve and expression change.
        </p>
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {ctcfSites.map((site) => (
            <button
              key={site.id}
              onClick={() => onMutateCTCF(site.id)}
              disabled={site.mutated}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md font-mono text-[9px] transition-all ${
                site.mutated
                  ? 'bg-chromatin-red/10 text-chromatin-red/50 cursor-not-allowed line-through'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:bg-chromatin-red/10 hover:text-chromatin-red cursor-pointer'
              }`}
            >
              <span
                className="w-2 h-2 flex-shrink-0"
                style={{
                  backgroundColor: site.mutated ? '#ff1744' : state.tads[site.tadIndex]?.color,
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                }}
              />
              <span>CTCF #{site.id}</span>
              <span className="ml-auto text-[8px] text-[var(--text-dim)]">
                {site.type === 'ctcf_forward' ? '→' : '←'} {state.tads[site.tadIndex]?.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick experiments */}
      <section>
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-3 flex items-center">
          Try This
          <HelpTooltip text="Suggested experiments to help you understand chromatin biology through the simulator." />
        </h3>
        <div className="space-y-2">
          {[
            {
              label: 'Kill all loops',
              desc: 'Turn off cohesin → watch TADs melt',
              action: 'Toggle "Cohesin Motors" OFF',
              color: '#39ff14',
            },
            {
              label: 'Crank the heat',
              desc: 'Set temperature to 3.0 → random walk',
              action: 'Slide Temperature to max',
              color: '#ffab00',
            },
            {
              label: 'Phase separate',
              desc: 'Max A/B + no cohesin → compartments',
              action: 'Cohesin OFF, A/B = 1.0',
              color: '#ff00e5',
            },
            {
              label: 'Break a boundary',
              desc: 'Mutate a CTCF → enhancer leaks',
              action: 'Click any CTCF site above',
              color: '#ff1744',
            },
          ].map((exp) => (
            <div
              key={exp.label}
              className="glass-panel p-2.5 cursor-default hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: exp.color }} />
                <span className="font-mono text-[10px] text-[var(--text-primary)]">{exp.label}</span>
              </div>
              <p className="font-body text-[9px] text-[var(--text-dim)] pl-3 leading-relaxed">
                {exp.desc}
              </p>
              <p className="font-mono text-[8px] text-[var(--text-dim)] pl-3 mt-1 opacity-60">
                → {exp.action}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Info */}
      <section className="glass-panel p-3">
        <h3 className="font-display text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-2">
          About
        </h3>
        <p className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed mb-2">
          ChromaLoop simulates a bead-spring polymer model of chromatin with Langevin dynamics, loop extrusion forces, CTCF boundaries, and A/B compartmentalization.
        </p>
        <a
          href="/learn"
          className="font-mono text-[9px] text-chromatin-magenta hover:text-chromatin-magenta/80 transition-colors"
        >
          📖 Read the full science guide →
        </a>
      </section>
    </div>
  );
}
