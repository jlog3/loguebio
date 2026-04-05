'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import styles from './EducationalOverlay.module.css';

interface TooltipData {
  id: string;
  title: string;
  content: string;
  learnMoreId?: string;
  viewModes: string[];
  position: { bottom?: string; top?: string; left?: string; right?: string };
}

const TOOLTIPS: TooltipData[] = [
  {
    id: 'umap-warning',
    title: 'UMAP is not a real map',
    content:
      'UMAP preserves local neighbors but distorts global distances. Two clusters far apart may be more similar than they look. Cluster sizes are also unreliable.',
    learnMoreId: 'umap',
    viewModes: ['umap'],
    position: { bottom: '100px', left: '310px' },
  },
  {
    id: 'rna-velocity',
    title: 'What are the arrows?',
    content:
      'RNA velocity arrows predict where each cell is heading by comparing unspliced (new) and spliced (mature) mRNA. Longer arrows = stronger direction signal.',
    learnMoreId: 'rna-velocity',
    viewModes: ['umap'],
    position: { bottom: '100px', right: '290px' },
  },
  {
    id: 'landscape-tip',
    title: 'Reading the landscape',
    content:
      'The hilltop = undifferentiated stem cells. Valleys = differentiated fates. Ridges = energy barriers between fates. Cells roll downhill as they lose pluripotency.',
    learnMoreId: 'waddington',
    viewModes: ['landscape'],
    position: { top: '80px', left: '310px' },
  },
  {
    id: 'gene-tip',
    title: 'Try the gene sliders',
    content:
      'The left panel lets you knock out or overexpress genes. This reshapes the landscape — try setting Neurog2 to 0% and watch the neuron branch shrink.',
    learnMoreId: 'gene-regulation',
    viewModes: ['landscape', 'umap'],
    position: { bottom: '100px', left: '310px' },
  },
  {
    id: 'story-suggestion',
    title: 'New here? Try Story Mode',
    content:
      'Story Mode walks you through the biology step by step with narrated explanations. Switch to it using the ▶ button in the header.',
    viewModes: ['landscape', 'umap'],
    position: { top: '80px', right: '290px' },
  },
];

export default function EducationalOverlay() {
  const { showOverlays, viewMode } = useStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!showOverlays || viewMode === 'story') return null;

  const visible = TOOLTIPS.filter(
    (t) => !dismissed.has(t.id) && t.viewModes.includes(viewMode)
  );
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((tip) => (
        <div key={tip.id} className={styles.tooltip} style={tip.position}>
          <div className={styles.header}>
            <span className={styles.icon}>💡</span>
            <h4 className={styles.title}>{tip.title}</h4>
            <button
              className={styles.dismiss}
              onClick={() => setDismissed((s) => new Set(s).add(tip.id))}
              aria-label={`Dismiss ${tip.title}`}
            >
              ✕
            </button>
          </div>
          <p className={styles.content}>{tip.content}</p>
          {tip.learnMoreId && (
            <Link href={`/learn#${tip.learnMoreId}`} className={styles.learnMore}>
              Read full article →
            </Link>
          )}
        </div>
      ))}
    </>
  );
}
