'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ContextualHelp.module.css';

interface Props {
  text: string;
  learnMoreId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

export default function ContextualHelp({ text, learnMoreId, position = 'top', children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={styles.wrapper} ref={ref}>
      {children}
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="Help"
      >
        ?
      </button>

      {open && (
        <div className={`${styles.tooltip} ${styles[position]}`}>
          <p className={styles.text}>{text}</p>
          {learnMoreId && (
            <a href={`/learn#${learnMoreId}`} className={styles.learnMore}>
              Read full article →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
