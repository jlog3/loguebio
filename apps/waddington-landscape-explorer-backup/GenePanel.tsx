'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import ContextualHelp from './ContextualHelp';
import styles from './GenePanel.module.css';

export default function GenePanel() {
  const { genes, setGeneExpression, resetGenes, showOverlays } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredGene, setHoveredGene] = useState<string | null>(null);

  // Track if any genes have been modified
  const isModified = useMemo(
    () => genes.some((g) => {
      const defaults: Record<string, number> = {
        Sox2: 1.0, Neurog2: 0.5, Olig2: 0.5, MyoD: 0.5,
        Gata1: 0.5, Notch1: 0.7, Wnt3a: 0.6, Shh: 0.5,
      };
      return Math.abs(g.expression - (defaults[g.name] ?? 0.5)) > 0.01;
    }),
    [genes]
  );

  return (
    <div className={`${styles.panel} glass`}>
      <div className={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>⬡</span>
          <h3 className={styles.title}>Gene Perturbation</h3>
          {isModified && <span className={styles.modifiedBadge}>modified</span>}
        </div>
        <button className={styles.collapseBtn} aria-label={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▸' : '▾'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className={styles.descRow}>
            <p className={styles.desc}>
              Drag sliders to knock out or overexpress genes. The landscape and cell fates reshape in real time.
            </p>
            <ContextualHelp
              text="Each slider represents a transcription factor that controls cell-fate decisions. Setting a gene to 0% simulates a genetic knockout (KO) — the gene is non-functional. Setting it to 100% simulates overexpression (OE). Watch how the cell distribution changes."
              learnMoreId="gene-regulation"
              position="bottom"
            />
          </div>

          <div className={styles.geneList}>
            {genes.map((gene) => {
              const isKnocked = gene.expression < 0.1;
              const isOver = gene.expression > 0.9;

              return (
                <div
                  key={gene.name}
                  className={styles.geneRow}
                  onMouseEnter={() => setHoveredGene(gene.name)}
                  onMouseLeave={() => setHoveredGene(null)}
                >
                  <div className={styles.geneHeader}>
                    <span className={styles.geneName} style={{ color: gene.color }}>
                      {gene.name}
                    </span>
                    <span className={styles.geneValue}>
                      {isKnocked ? (
                        <span className={styles.koTag}>KO</span>
                      ) : isOver ? (
                        <span className={styles.oeTag}>OE</span>
                      ) : (
                        `${Math.round(gene.expression * 100)}%`
                      )}
                    </span>
                  </div>

                  <div className={styles.sliderWrap}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={gene.expression}
                      onChange={(e) =>
                        setGeneExpression(gene.name, parseFloat(e.target.value))
                      }
                      className={styles.slider}
                      style={{
                        '--slider-color': gene.color,
                        '--slider-pct': `${gene.expression * 100}%`,
                      } as React.CSSProperties}
                      aria-label={`${gene.name} expression level`}
                    />
                  </div>

                  {/* Tooltip */}
                  {hoveredGene === gene.name && showOverlays && (
                    <div className={styles.tooltip}>
                      {gene.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            className={`${styles.resetBtn} ${isModified ? styles.resetBtnActive : ''}`}
            onClick={resetGenes}
            disabled={!isModified}
          >
            ↺ Reset All Genes {isModified ? '' : '(no changes)'}
          </button>

          <div className={styles.presets}>
            <span className={styles.presetsLabel}>Quick experiments:</span>
            <button
              className={styles.presetBtn}
              onClick={() => {
                setGeneExpression('Neurog2', 0);
                setGeneExpression('Olig2', 1);
              }}
              title="Knock out Neurog2, overexpress Olig2 — shifts cells from neuron to glia fate"
            >
              Neurog2 KO
            </button>
            <button
              className={styles.presetBtn}
              onClick={() => {
                setGeneExpression('Sox2', 1);
                setGeneExpression('Notch1', 1);
              }}
              title="Max Sox2 + Notch1 — keeps cells in stem state longer"
            >
              Block diff.
            </button>
            <button
              className={styles.presetBtn}
              onClick={() => {
                setGeneExpression('MyoD', 1);
                setGeneExpression('Neurog2', 0);
                setGeneExpression('Olig2', 0);
                setGeneExpression('Gata1', 0);
              }}
              title="Force all differentiation toward muscle fate"
            >
              Force muscle
            </button>
            <button
              className={styles.presetBtn}
              onClick={() => {
                setGeneExpression('Sox2', 0);
                setGeneExpression('Notch1', 0);
              }}
              title="Remove stemness factors — rapid differentiation"
            >
              Rapid diff.
            </button>
          </div>
        </>
      )}
    </div>
  );
}
