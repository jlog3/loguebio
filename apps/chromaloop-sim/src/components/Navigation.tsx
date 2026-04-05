'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const isLearn = pathname === '/learn';
  const isSim = pathname === '/';
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 nav-bar">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-chromatin-cyan opacity-60 animate-pulse-slow" />
          <div className="absolute inset-1 rounded-full border border-chromatin-magenta opacity-40 animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-[6px] rounded-full bg-chromatin-cyan/30 group-hover:bg-chromatin-cyan/50 transition-colors" />
        </div>
        <div>
          <h1 className="font-display text-sm font-bold tracking-wider text-chromatin-cyan glow-text-cyan">
            CHROMALOOP
          </h1>
          <p className="font-mono text-[9px] tracking-widest text-[var(--text-dim)] uppercase">
            3D Chromatin Folding Simulator
          </p>
        </div>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        <Link
          href="/"
          onMouseEnter={() => setHovered('sim')}
          onMouseLeave={() => setHovered(null)}
          className={`relative font-mono text-[11px] px-4 py-2 rounded-lg transition-all ${
            isSim
              ? 'text-chromatin-cyan'
              : 'text-[var(--text-secondary)] hover:text-chromatin-cyan'
          }`}
        >
          {isSim && <span className="absolute inset-0 bg-chromatin-cyan/10 rounded-lg border border-chromatin-cyan/20" />}
          <span className="relative flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
              <circle cx="12" cy="12" r="1" />
            </svg>
            Simulator
          </span>
        </Link>

        <Link
          href="/learn"
          onMouseEnter={() => setHovered('learn')}
          onMouseLeave={() => setHovered(null)}
          className={`relative font-mono text-[11px] px-4 py-2 rounded-lg transition-all ${
            isLearn
              ? 'text-chromatin-magenta'
              : 'text-[var(--text-secondary)] hover:text-chromatin-magenta'
          }`}
        >
          {isLearn && <span className="absolute inset-0 bg-chromatin-magenta/10 rounded-lg border border-chromatin-magenta/20" />}
          <span className="relative flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Learn
          </span>
        </Link>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] px-3 py-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
