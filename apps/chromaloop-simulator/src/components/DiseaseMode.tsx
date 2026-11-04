'use client';

import { useState } from 'react';
import { DiseasePreset, SimulationState } from '@/types';

interface Props {
  presets: DiseasePreset[];
  activePreset: DiseasePreset | null;
  onSelectPreset: (preset: DiseasePreset) => void;
  onReset: () => void;
  state: SimulationState;
}

const TYPE_ICONS: Record<string, string> = {
  boundary_deletion: '⊘',
  ctcf_mutation: '✕',
  enhancer_hijack: '⇋',
  translocation: '⇌',
};

const TYPE_COLORS: Record<string, string> = {
  boundary_deletion: '#ff1744',
  ctcf_mutation: '#ff6d00',
  enhancer_hijack: '#ffab00',
  translocation: '#651fff',
};

export default function DiseaseMode({
  presets,
  activePreset,
  onSelectPreset,
  onReset,
  state,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compute expression changes for active disease
  const expressionChanges = activePreset
    ? state.beads
        .filter((b) => b.type === 'promoter')
        .map((b) => ({
          gene: b.gene || `Bead ${b.id}`,
          expression: b.expression,
          isAffected: activePreset.affectedTADs.includes(b.tadIndex),
        }))
    : [];

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-chromatin-red/15 overflow-y-auto bg-[rgba(30,5,10,0.3)]">
      {/* Header */}
      <div className="p-4 border-b border-chromatin-red/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-chromatin-red text-sm">⚠</span>
          <h2 className="font-display text-[11px] tracking-wider text-chromatin-red uppercase">
            Disease Mode
          </h2>
        </div>
        <p className="font-body text-[10px] text-[var(--text-dim)] leading-relaxed">
          Explore real cancer-associated chromatin loop disruptions. Select a disease to see
          how structural mutations alter 3D genome organization and gene expression.
        </p>

        {activePreset && (
          <button
            onClick={onReset}
            className="mt-3 w-full font-mono text-[10px] py-1.5 rounded-md bg-white/5 text-[var(--text-secondary)] border border-white/10 hover:bg-white/10 transition-all"
          >
            ↻ Reset to Normal
          </button>
        )}
      </div>

      {/* Disease presets */}
      <div className="p-3 space-y-2">
        {presets.map((preset) => {
          const isActive = activePreset?.id === preset.id;
          const isExpanded = expandedId === preset.id;
          const typeColor = TYPE_COLORS[preset.type] || '#ff1744';

          return (
            <div
              key={preset.id}
              className={`rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? 'border-chromatin-red/40 bg-chromatin-red/8 shake-anim'
                  : 'border-white/8 bg-white/3 hover:border-chromatin-red/20 hover:bg-white/5'
              }`}
            >
              {/* Card header */}
              <div
                className="p-3"
                onClick={() => {
                  setExpandedId(isExpanded ? null : preset.id);
                  if (!isActive) onSelectPreset(preset);
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-sm flex-shrink-0 mt-0.5"
                    style={{ color: typeColor }}
                  >
                    {TYPE_ICONS[preset.type]}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-body text-[11px] font-semibold text-[var(--text-primary)] leading-tight">
                      {preset.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: typeColor + '15',
                          color: typeColor,
                        }}
                      >
                        {preset.type.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-[8px] text-[var(--text-dim)]">
                        {preset.gene}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-chromatin-red animate-pulse flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {(isExpanded || isActive) && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  <p className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Mutation sites */}
                  <div className="space-y-1">
                    <span className="font-mono text-[8px] text-[var(--text-dim)] uppercase tracking-wider">
                      Mutations
                    </span>
                    {preset.mutations.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 font-mono text-[9px]">
                        <span className="text-chromatin-red">✕</span>
                        <span className="text-[var(--text-secondary)]">
                          Bead #{m.beadIndex} → {m.newType}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Affected TADs */}
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[8px] text-[var(--text-dim)]">Affected:</span>
                    {preset.affectedTADs.map((tadIdx) => {
                      const tad = state.tads[tadIdx];
                      return tad ? (
                        <span
                          key={tadIdx}
                          className="font-mono text-[8px] px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: tad.color + '15',
                            color: tad.color,
                          }}
                        >
                          {tad.label}
                        </span>
                      ) : null;
                    })}
                  </div>

                  {/* Reference */}
                  <div className="font-mono text-[8px] text-[var(--text-dim)] italic">
                    📄 {preset.paperRef}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expression impact (when disease is active) */}
      {activePreset && expressionChanges.length > 0 && (
        <div className="p-3 border-t border-chromatin-red/10">
          <h3 className="font-display text-[9px] tracking-wider text-chromatin-red/60 uppercase mb-2">
            Expression Impact
          </h3>
          <div className="space-y-1.5">
            {expressionChanges.map((gene, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="font-mono text-[9px] w-[60px] text-right"
                  style={{
                    color: gene.isAffected ? '#ff1744' : 'var(--text-secondary)',
                  }}
                >
                  {gene.gene}
                </span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${gene.expression * 100}%`,
                      backgroundColor: gene.isAffected
                        ? gene.expression > 0.5 ? '#ff1744' : '#ff174480'
                        : gene.expression > 0.5 ? '#39ff14' : '#3f51b5',
                    }}
                  />
                </div>
                <span className="font-mono text-[8px] text-[var(--text-dim)] w-[30px]">
                  {(gene.expression * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="mt-3 glass-panel p-2 border-chromatin-red/20">
            <p className="font-body text-[9px] text-chromatin-red/70 leading-relaxed">
              {activePreset.type === 'boundary_deletion' &&
                'TAD boundary loss allows enhancers from adjacent domains to ectopically activate genes, a mechanism called "enhancer adoption."'}
              {activePreset.type === 'ctcf_mutation' &&
                'CTCF site mutations prevent cohesin stalling, collapsing the insulated loop and allowing aberrant regulatory contacts.'}
              {activePreset.type === 'enhancer_hijack' &&
                'Structural variants reposition super-enhancers near oncogenes, driving overexpression through newly formed chromatin loops.'}
              {activePreset.type === 'translocation' &&
                'Chromosomal translocation fuses regulatory domains, creating neo-TADs with novel enhancer-gene pairings.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
