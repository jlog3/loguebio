'use client';

interface Props {
  show: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Space'], action: 'Play / Pause simulation' },
  { keys: ['R'], action: 'Reset simulation' },
  { keys: ['1'], action: 'Split view mode' },
  { keys: ['2'], action: '3D-only view' },
  { keys: ['3'], action: 'Hi-C-only view' },
  { keys: ['D'], action: 'Toggle Disease Mode' },
  { keys: ['I'], action: 'Import / Export data' },
  { keys: ['L'], action: 'Toggle Loop Extrusion' },
  { keys: ['Esc'], action: 'Deselect bead' },
  { keys: ['?'], action: 'Show/hide shortcuts' },
];

export default function KeyboardShortcuts({ show, onClose }: Props) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative glass-panel-strong p-6 max-w-sm w-full mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[12px] tracking-wider text-chromatin-cyan uppercase">
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
          >
            ESC
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between py-1.5">
              <span className="font-body text-[12px] text-[var(--text-secondary)]">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[var(--text-primary)] min-w-[28px] text-center"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-white/[0.06]">
          <p className="font-body text-[10px] text-[var(--text-dim)] text-center">
            Press <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
