"use client";

import { announce } from "@repo/access";
import { useRef } from "react";
import { GUIDE } from "@/lib/content";
import { useStore } from "./LabContext";

export function Guide({
  step,
  setStep,
  onClose,
  canAutoplay,
  onOpenTab,
}: {
  step: number;
  setStep: (n: number) => void;
  onClose: () => void;
  canAutoplay: boolean;
  onOpenTab: (tab: string) => void;
}) {
  const store = useStore();
  const g = GUIDE[step];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const go = (n: number) => {
    setStep(n);
    // keep focus with the reader: move it to the new step's heading
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const tabFor: Record<string, string> = { theory: "theory", frap: "frap", rna: "droplets", concentration: "scan" };
  return (
    <section className="guide" aria-labelledby="guide-h">
      <div className="guide-top">
        <h2 id="guide-h" className="guide-kicker">
          Guide <span className="muted">· step {step + 1} of {GUIDE.length}</span>
        </h2>
        <button type="button" className="button secondary small" onClick={onClose}>
          Hide guide
        </button>
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="guide-title">
        {g.title}
      </h3>
      {g.body.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
      {g.lookFor ? (
        <p className="guide-look">
          <span className="label">Look for</span> {g.lookFor}
        </p>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button"
          aria-disabled={step === 0}
          onClick={() => (step > 0 ? go(step - 1) : announce("This is the first step.", { topic: "guide" }))}
        >
          Previous step
        </button>
        {g.tryParams ? (
          <button
            type="button"
            className="button primary"
            onClick={() => {
              store.applyParams(g.tryParams!, g.tryLabel);
              if (canAutoplay) {
                store.play();
                announce(`${g.tryLabel}: done, and playing. ${g.lookFor ?? ""}`, { topic: "guide" });
              } else {
                announce(`${g.tryLabel}: done. Press Play or Jump ahead to see what happens.`, { topic: "guide" });
              }
            }}
          >
            Try it: {g.tryLabel}
          </button>
        ) : null}
        {tabFor[g.id] ? (
          <button type="button" className="button" onClick={() => onOpenTab(tabFor[g.id])}>
            Open the {tabFor[g.id] === "scan" ? "Threshold" : tabFor[g.id] === "frap" ? "FRAP" : tabFor[g.id] === "theory" ? "Theory" : "Droplets"} tab
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() => (step < GUIDE.length - 1 ? go(step + 1) : announce("This is the last step. You can hide the guide or go back.", { topic: "guide" }))}
          aria-disabled={step === GUIDE.length - 1}
        >
          Next step
        </button>
      </div>
    </section>
  );
}
