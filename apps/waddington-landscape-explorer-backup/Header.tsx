'use client';

import Link from 'next/link';
import { useStore, ViewMode } from '@/lib/store';
import styles from './Header.module.css';

const VIEW_MODES: { mode: ViewMode; label: string; shortLabel: string; icon: string; key: string }[] = [
  { mode: 'landscape', label: 'Waddington Landscape', shortLabel: 'Landscape', icon: '⛰', key: '1' },
  { mode: 'umap', label: 'UMAP Explorer', shortLabel: 'UMAP', icon: '◎', key: '2' },
  { mode: 'story', label: 'Story Mode', shortLabel: 'Story', icon: '▶', key: '3' },
];

export default function Header() {
  const { viewMode, setViewMode, showOverlays, setShowOverlays } = useStore();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Link href="/" className={styles.logoLink}>
          <div className={styles.logo}>
            <span className={styles.logoOrb} />
            <span className={styles.logoOrb2} />
            <span className={styles.logoOrb3} />
          </div>
          <div>
            <h1 className={styles.title}>Trajectory Theater</h1>
            <p className={styles.subtitle}>Interactive Waddington Landscape Explorer</p>
          </div>
        </Link>
      </div>

      <nav className={styles.viewSwitcher}>
        {VIEW_MODES.map(({ mode, label, shortLabel, icon, key }) => (
          <button
            key={mode}
            className={`${styles.viewButton} ${viewMode === mode ? styles.active : ''}`}
            onClick={() => setViewMode(mode)}
            title={`${label} (press ${key})`}
          >
            <span className={styles.viewIcon}>{icon}</span>
            <span className={styles.viewLabel}>{label}</span>
            <span className={styles.viewLabelShort}>{shortLabel}</span>
            <kbd className={styles.viewKey}>{key}</kbd>
          </button>
        ))}
      </nav>

      <div className={styles.controls}>
        <button
          className={`${styles.toggleButton} ${showOverlays ? styles.toggleActive : ''}`}
          onClick={() => setShowOverlays(!showOverlays)}
          title="Toggle educational overlays (L)"
        >
          <span className={styles.toggleIcon}>💡</span>
          <span className={styles.toggleLabel}>Tips</span>
        </button>

        <Link href="/learn" className={styles.learnLink} title="Deep-dive articles on the science">
          <span className={styles.learnIcon}>📖</span>
          <span className={styles.learnLabel}>Learn</span>
        </Link>
      </div>
    </header>
  );
}
