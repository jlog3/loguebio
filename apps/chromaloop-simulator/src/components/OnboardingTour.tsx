'use client';

import { useState, useEffect } from 'react';

interface TourStep {
  title: string;
  description: string;
  target: string; // CSS selector hint (not used for actual positioning—just visual)
  position: 'center' | 'left' | 'right' | 'bottom';
  icon: string;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to ChromaLoop',
    description:
      'This simulator shows how your DNA folds in 3D space to control which genes are turned on. You\'re looking at a polymer model of chromatin—each bead is roughly 10kb of DNA fiber.',
    target: 'canvas',
    position: 'center',
    icon: '🧬',
    color: '#00e5ff',
  },
  {
    title: '3D Chromatin View',
    description:
      'Drag to rotate, scroll to zoom. Different bead shapes mean different elements: diamonds are CTCF insulators, cubes are gene promoters, dodecahedra are enhancers, and green rings are cohesin motors extruding loops.',
    target: '.canvas-container',
    position: 'left',
    icon: '◆',
    color: '#00e5ff',
  },
  {
    title: 'Hi-C Contact Map',
    description:
      'This heatmap shows which parts of the genome are close in 3D space. Bright triangles along the diagonal are TADs—self-interacting domains. Click anywhere to highlight that bead in 3D.',
    target: '.hic-panel',
    position: 'right',
    icon: '▦',
    color: '#ff00e5',
  },
  {
    title: 'Gene Expression Track',
    description:
      'Bar heights show real-time gene expression, calculated from the 3D distance between enhancers and promoters. When they\'re close → gene ON. When they\'re far → gene OFF.',
    target: '.expression-track',
    position: 'bottom',
    icon: '◉',
    color: '#39ff14',
  },
  {
    title: 'Physics Controls',
    description:
      'Tune the simulation: adjust temperature (thermal noise), toggle cohesin motors on/off to see TADs collapse, and control A/B compartment strength. You can also click individual CTCF sites to mutate them.',
    target: '.control-panel',
    position: 'left',
    icon: '⚙',
    color: '#ffab00',
  },
  {
    title: 'Disease Mode',
    description:
      'Click "Disease Mode" in the top bar to explore real cancer-associated mutations. See how TAD boundary deletions and CTCF mutations rewire gene regulation and cause disease.',
    target: '.disease-button',
    position: 'right',
    icon: '⚠',
    color: '#ff1744',
  },
  {
    title: 'Learn the Science',
    description:
      'Visit the Learn page for an in-depth guide to chromatin biology, loop extrusion, TADs, and 3D genome diseases—with diagrams and expandable deep-dives.',
    target: '.learn-link',
    position: 'center',
    icon: '📖',
    color: '#ff00e5',
  },
];

const STORAGE_KEY = 'chromaloop-tour-seen';

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    try {
      const seen = window.sessionStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleClose = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    onComplete();
  };

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Tour card */}
      <div
        className="relative glass-panel-strong p-0 max-w-md w-full mx-4 overflow-hidden animate-slide-up"
        style={{
          boxShadow: `0 0 40px ${current.color}15, 0 0 80px ${current.color}08`,
        }}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
              backgroundColor: current.color,
            }}
          />
        </div>

        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{current.icon}</span>
            <div className="flex-1">
              <h3 className="font-display text-[13px] tracking-wide" style={{ color: current.color }}>
                {current.title}
              </h3>
              <span className="font-mono text-[9px] text-[var(--text-dim)]">
                {step + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="font-mono text-[10px] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors px-2 py-1"
            >
              Skip tour
            </button>
          </div>

          {/* Description */}
          <p className="font-body text-[13.5px] text-[var(--text-secondary)] leading-[1.75] mb-6">
            {current.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: i === step ? current.color : 'rgba(255,255,255,0.15)',
                  transform: i === step ? 'scale(1.5)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="font-mono text-[11px] px-4 py-2 rounded-lg bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all"
              >
                ← Back
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleNext}
              className="font-mono text-[11px] px-5 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: `${current.color}15`,
                color: current.color,
                border: `1px solid ${current.color}30`,
              }}
            >
              {isLast ? 'Start Exploring →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
