'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import styles from './Onboarding.module.css';

interface Step {
  title: string;
  description: string;
  icon: string;
  image?: string;
  tip: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Trajectory Theater',
    description:
      'This app lets you explore how stem cells make fate decisions — one of the most fundamental processes in biology. You\'ll interact with a simulated dataset of 2,000 cells differentiating into four lineages: neurons, glia, muscle, and blood.',
    icon: '🔬',
    tip: 'No biology background needed. Everything is explained as you go.',
  },
  {
    title: 'The Waddington Landscape',
    description:
      'The 3D view shows an "epigenetic landscape" — a metaphor by C.H. Waddington (1957). Stem cells sit on a hilltop. As they differentiate, they roll downhill into valleys that represent specific cell fates. The terrain shape is controlled by gene regulatory networks.',
    icon: '⛰',
    tip: 'Drag to rotate, scroll to zoom. The hilltop = pluripotent, the valleys = differentiated.',
  },
  {
    title: 'The UMAP Explorer',
    description:
      'The 2D view is a scatter plot inspired by UMAP — a technique that projects high-dimensional gene expression data onto a flat plane. Each dot is one cell. Nearby dots have similar gene expression. The arrows show RNA velocity: the predicted direction each cell is heading.',
    icon: '◎',
    tip: 'Click any cell to inspect its gene expression. Toggle velocity arrows on/off.',
  },
  {
    title: 'Gene Perturbation Sliders',
    description:
      'The left panel has 8 gene sliders. Drag them to simulate genetic knockouts (0%) or overexpression (100%). This reshapes the landscape and shifts where cells end up. Try setting Neurog2 to 0% — you\'ll see the neuron branch shrink as cells can no longer differentiate toward that fate.',
    icon: '⬡',
    tip: 'Use the preset buttons ("Neurog2 KO", "Block differentiation") for quick experiments.',
  },
  {
    title: 'Pseudotime & Story Mode',
    description:
      'The timeline at the bottom controls pseudotime — a measure of each cell\'s progress through differentiation. Press play to watch development unfold, or scrub manually. Switch to Story Mode for a guided narration that walks you through each fate decision with educational notes.',
    icon: '▶',
    tip: 'Story Mode is the best starting point. Use arrow keys or spacebar to advance.',
  },
];

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }, [step, onComplete]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const skip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={skip} />

      <div className={styles.modal}>
        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className={styles.content} key={step}>
          <div className={styles.icon}>{current.icon}</div>

          <div className={styles.stepIndicator}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`}
              />
            ))}
          </div>

          <h2 className={styles.title}>{current.title}</h2>
          <p className={styles.description}>{current.description}</p>

          <div className={styles.tipBox}>
            <span className={styles.tipIcon}>💡</span>
            <p className={styles.tipText}>{current.tip}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          <button className={styles.skipBtn} onClick={skip}>
            Skip intro
          </button>

          <div className={styles.navRight}>
            {step > 0 && (
              <button className={styles.prevBtn} onClick={prev}>
                ← Back
              </button>
            )}
            <button className={styles.nextBtn} onClick={next}>
              {step === STEPS.length - 1 ? 'Start exploring →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
