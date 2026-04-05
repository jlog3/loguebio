'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '@/lib/store';
import { generateCells, CellData } from '@/lib/simulation';
import Header from '@/components/Header';
import WaddingtonLandscape from '@/components/WaddingtonLandscape';
import UMAPExplorer from '@/components/UMAPExplorer';
import StoryMode from '@/components/StoryMode';
import GenePanel from '@/components/GenePanel';
import PseudotimeControls from '@/components/PseudotimeControls';
import FateLegend from '@/components/FateLegend';
import EducationalOverlay from '@/components/EducationalOverlay';
import CellInspector from '@/components/CellInspector';
import Onboarding from '@/components/Onboarding';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import styles from './page.module.css';

const CELL_COUNT = 2000;

export default function Home() {
  const {
    viewMode, setViewMode,
    pseudotime, isPlaying, playbackSpeed, genes,
    setPseudotime, setIsPlaying,
    showOverlays, setShowOverlays,
    resetGenes, setSelectedCell,
  } = useStore();
  const [cells, setCells] = useState<CellData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Check if first visit
  useEffect(() => {
    try {
      const visited = sessionStorage.getItem('trajectory-theater-visited');
      if (!visited) {
        setShowOnboarding(true);
        sessionStorage.setItem('trajectory-theater-visited', 'true');
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  // Generate cells when genes change
  useEffect(() => {
    const newCells = generateCells(CELL_COUNT, genes);
    setCells(newCells);
    setLoading(false);
  }, [genes]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const newPseudotime = pseudotime + delta * 0.08 * playbackSpeed;
      if (newPseudotime >= 1) {
        setPseudotime(1);
        useStore.getState().setIsPlaying(false);
      } else {
        setPseudotime(newPseudotime);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, playbackSpeed, pseudotime, setPseudotime]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '1':
          setViewMode('landscape');
          break;
        case '2':
          setViewMode('umap');
          break;
        case '3':
          setViewMode('story');
          break;
        case 'l':
        case 'L':
          setShowOverlays(!showOverlays);
          break;
        case 'r':
        case 'R':
          resetGenes();
          break;
        case ' ':
          if (viewMode !== 'story') {
            e.preventDefault();
            if (pseudotime >= 0.99 && !isPlaying) {
              setPseudotime(0);
            }
            setIsPlaying(!isPlaying);
          }
          break;
        case 'Escape':
          setSelectedCell(null);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, setViewMode, showOverlays, setShowOverlays, resetGenes, isPlaying, setIsPlaying, pseudotime, setPseudotime, setSelectedCell]);

  // Filter cells by pseudotime for display
  const visibleCells = cells.filter((c) => c.pseudotime <= pseudotime + 0.05);

  return (
    <div className={styles.app}>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      <Header />

      <main className={styles.main}>
        <div className={styles.viewport}>
          {loading ? (
            <div className={styles.loader}>
              <div className={styles.loaderOrb} />
              <p>Initializing cell atlas…</p>
            </div>
          ) : (
            <>
              {viewMode === 'landscape' && (
                <WaddingtonLandscape cells={visibleCells} allCells={cells} />
              )}
              {viewMode === 'umap' && (
                <UMAPExplorer cells={visibleCells} allCells={cells} />
              )}
              {viewMode === 'story' && (
                <StoryMode cells={visibleCells} allCells={cells} />
              )}
            </>
          )}

          {/* Floating panels */}
          {viewMode !== 'story' && (
            <>
              <div className={styles.leftPanel}>
                <GenePanel />
              </div>

              <div className={styles.rightPanel}>
                <FateLegend cells={visibleCells} />
                <CellInspector />
              </div>
            </>
          )}

          <EducationalOverlay />
        </div>

        <PseudotimeControls />
      </main>

      <KeyboardShortcuts />
    </div>
  );
}
