'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  text: string;
  color?: string;
  size?: number;
}

export default function HelpTooltip({ text, color = 'var(--text-dim)', size = 12 }: Props) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition(rect.top < 180 ? 'below' : 'above');
    }
  }, [show]);

  return (
    <span
      ref={iconRef}
      className="relative inline-flex items-center cursor-help ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-40 hover:opacity-80 transition-opacity"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      {show && (
        <span
          className={`absolute z-50 w-[220px] px-3 py-2 rounded-lg text-[11px] font-body leading-relaxed
            glass-panel-strong border border-[var(--panel-border)]
            text-[var(--text-secondary)] animate-fade-in
            ${position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
            left-1/2 -translate-x-1/2`}
          style={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {text}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 glass-panel-strong border-[var(--panel-border)]
              ${position === 'above'
                ? 'bottom-[-5px] border-r border-b'
                : 'top-[-5px] border-l border-t'
              }`}
          />
        </span>
      )}
    </span>
  );
}
