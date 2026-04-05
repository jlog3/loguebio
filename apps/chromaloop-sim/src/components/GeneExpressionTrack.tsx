'use client';

import { useMemo } from 'react';
import { ChromatinBead, TAD, DiseasePreset } from '@/types';

interface Props {
  beads: ChromatinBead[];
  tads: TAD[];
  selectedBead: number | null;
  onSelectBead: (id: number | null) => void;
  activeDisease: DiseasePreset | null;
}

export default function GeneExpressionTrack({
  beads,
  tads,
  selectedBead,
  onSelectBead,
  activeDisease,
}: Props) {
  const genes = useMemo(() => {
    return beads
      .filter((b) => b.type === 'promoter' || b.type === 'enhancer')
      .map((b) => ({
        id: b.id,
        name: b.gene || `Bead ${b.id}`,
        type: b.type,
        expression: b.expression,
        tadIndex: b.tadIndex,
        mutated: b.mutated,
        position: b.id / beads.length,
      }));
  }, [beads]);

  const enhancerPromoterPairs = useMemo(() => {
    const pairs: { promoter: typeof genes[0]; enhancer: typeof genes[0] }[] = [];
    const promoters = genes.filter((g) => g.type === 'promoter');
    const enhancers = genes.filter((g) => g.type === 'enhancer');

    promoters.forEach((p) => {
      const matchingEnhancer = enhancers.find((e) => e.tadIndex === p.tadIndex);
      if (matchingEnhancer) {
        pairs.push({ promoter: p, enhancer: matchingEnhancer });
      }
    });

    return pairs;
  }, [genes]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-[10px] tracking-wider text-chromatin-green/70 uppercase">
          Gene Expression · Live
        </span>
        <div className="flex items-center gap-3 font-mono text-[9px] text-[var(--text-dim)]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-chromatin-green rounded-full" /> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-chromatin-red rounded-full" /> Suppressed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-chromatin-amber rounded-full" /> Enhancer
          </span>
        </div>
      </div>

      {/* Track content */}
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {/* Genomic coordinate line */}
        <div className="flex-1 relative min-w-0">
          {/* TAD background bands */}
          <div className="absolute inset-0 flex">
            {tads.map((tad) => {
              const width = ((tad.end - tad.start + 1) / beads.length) * 100;
              const left = (tad.start / beads.length) * 100;
              const isAffected = activeDisease?.affectedTADs.includes(tad.id);

              return (
                <div
                  key={tad.id}
                  className="absolute h-full transition-colors duration-500"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: isAffected
                      ? 'rgba(255, 23, 68, 0.08)'
                      : `${tad.color}05`,
                    borderLeft: `1px solid ${tad.color}20`,
                    borderRight: `1px solid ${tad.color}20`,
                  }}
                >
                  <span
                    className="absolute top-0 left-1 font-mono text-[8px] opacity-40"
                    style={{ color: tad.color }}
                  >
                    {tad.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Expression bars */}
          <div className="absolute bottom-0 left-0 right-0 h-[50px] flex items-end">
            {genes.map((gene) => {
              const isSelected = selectedBead === gene.id;
              const barHeight = gene.type === 'promoter'
                ? Math.max(4, gene.expression * 45)
                : 20;
              const barColor = gene.mutated
                ? '#ff1744'
                : gene.type === 'enhancer'
                ? '#ffab00'
                : gene.expression > 0.6
                ? '#39ff14'
                : gene.expression > 0.3
                ? '#00e5ff'
                : '#3f51b5';

              return (
                <div
                  key={gene.id}
                  className="absolute flex flex-col items-center cursor-pointer group"
                  style={{
                    left: `${gene.position * 100}%`,
                    transform: 'translateX(-50%)',
                    bottom: 0,
                  }}
                  onClick={() => onSelectBead(selectedBead === gene.id ? null : gene.id)}
                >
                  {/* Bar */}
                  <div
                    className="expression-bar rounded-t-sm transition-all duration-300 group-hover:opacity-100"
                    style={{
                      width: gene.type === 'promoter' ? 10 : 6,
                      height: barHeight,
                      backgroundColor: barColor,
                      opacity: isSelected ? 1 : 0.7,
                      boxShadow: isSelected ? `0 0 8px ${barColor}80` : 'none',
                    }}
                  />

                  {/* Gene name */}
                  <span
                    className={`font-mono text-[8px] mt-0.5 whitespace-nowrap transition-colors ${
                      isSelected ? 'text-white' : 'text-[var(--text-dim)]'
                    } group-hover:text-[var(--text-primary)]`}
                    style={{
                      fontSize: gene.type === 'promoter' ? '8px' : '7px',
                    }}
                  >
                    {gene.name}
                    {gene.mutated && ' ✕'}
                  </span>

                  {/* Expression value for promoters */}
                  {gene.type === 'promoter' && (
                    <span
                      className="font-mono text-[7px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: barColor }}
                    >
                      {(gene.expression * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhancer-promoter connection arcs */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            {enhancerPromoterPairs.map(({ promoter, enhancer }, i) => {
              const x1 = promoter.position * 100;
              const x2 = enhancer.position * 100;
              const midX = (x1 + x2) / 2;
              const dist = Math.abs(x2 - x1);
              const arcHeight = Math.min(30, dist * 0.8);
              const isBroken = promoter.mutated || enhancer.mutated;

              return (
                <path
                  key={i}
                  d={`M ${x1} 50 Q ${midX} ${50 - arcHeight} ${x2} 50`}
                  fill="none"
                  stroke={isBroken ? '#ff1744' : '#ffab0060'}
                  strokeWidth={isBroken ? 0.3 : 0.5}
                  strokeDasharray={isBroken ? '2 2' : 'none'}
                  opacity={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* Selected bead marker */}
          {selectedBead !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-white/30"
              style={{
                left: `${(selectedBead / beads.length) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Summary stats */}
        <div className="w-[140px] flex-shrink-0 flex flex-col justify-center gap-1.5">
          {enhancerPromoterPairs.slice(0, 4).map(({ promoter, enhancer }, i) => (
            <div
              key={i}
              className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-1.5 py-0.5 transition-colors"
              onClick={() => onSelectBead(promoter.id)}
            >
              <div
                className="w-1 h-5 rounded-full flex-shrink-0 transition-all"
                style={{
                  backgroundColor: promoter.mutated
                    ? '#ff1744'
                    : promoter.expression > 0.5
                    ? '#39ff14'
                    : '#3f51b5',
                  boxShadow: promoter.expression > 0.7
                    ? '0 0 4px rgba(57,255,20,0.5)'
                    : 'none',
                }}
              />
              <div className="min-w-0">
                <div className="font-mono text-[9px] text-[var(--text-primary)] truncate">
                  {promoter.name}
                </div>
                <div className="font-mono text-[8px] text-[var(--text-dim)]">
                  {(promoter.expression * 100).toFixed(0)}% expr
                  {promoter.mutated && <span className="text-chromatin-red ml-1">mut</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
