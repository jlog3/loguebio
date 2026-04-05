'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './KeyboardShortcuts.module.css';

const SHORTCUTS = [
  { keys: ['Space'], action: 'Play / Pause pseudotime animation' },
  { keys: ['←', '→'], action: 'Navigate story steps (in Story Mode)' },
  { keys: ['1'], action: 'Switch to Waddington Landscape view' },
  { keys: ['2'], action: 'Switch to UMAP Explorer view' },
  { keys: ['3'], action: 'Switch to Story Mode' },
  { keys: ['L'], action: 'Toggle educational overlays' },
  { keys: ['R'], action: 'Reset all genes to default' },
  { keys: ['?'], action: 'Show / hide this shortcut guide' },
  { keys: ['Esc'], action: 'Deselect cell / close panel' },
];

export default function KeyboardShortcuts() {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, toggle]);

  if (!visible) {
    return (
      <button
        className={styles.trigger}
        onClick={toggle}
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <span className={styles.triggerIcon}>⌨</span>
      </button>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={() => setVisible(false)} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Keyboard Shortcuts</h3>
          <button className={styles.closeBtn} onClick={() => setVisible(false)}>
            ✕
          </button>
        </div>
        <div className={styles.list}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} className={styles.row}>
              <div className={styles.keys}>
                {s.keys.map((k) => (
                  <kbd key={k} className={styles.key}>
                    {k}
                  </kbd>
                ))}
              </div>
              <span className={styles.action}>{s.action}</span>
            </div>
          ))}
        </div>
        <p className={styles.footer}>Press <kbd className={styles.key}>?</kbd> to toggle this panel</p>
      </div>
    </div>
  );
}
