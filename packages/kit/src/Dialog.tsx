"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal dialog using the native <dialog>: the browser traps focus and Escape
 * closes it. Focus goes back to the button that opened it.
 */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-h`}
      onClose={() => {
        onClose();
        const o = opener.current as HTMLElement | null;
        if (o && typeof o.focus === "function") o.focus();
      }}
      onCancel={(e) => {
        // Escape never closes while typing in a text field
        const a = document.activeElement as HTMLElement | null;
        if (a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && (a as HTMLInputElement).type === "text"))) e.preventDefault();
      }}
    >
      <div className="dialog-head">
        <h2 id={`${id}-h`}>{title}</h2>
        <button type="button" className="button secondary" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
