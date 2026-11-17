"use client";

import { announce } from "@repo/access";
import Link from "next/link";
import { useRef } from "react";
import { STORY } from "@/lib/content";
import { cursorSentence } from "@/lib/describe";
import { useStore } from "./LabContext";

export function Story({
  step,
  setStep,
  onClose,
  onOpenTab,
  onView,
}: {
  step: number;
  setStep: (n: number) => void;
  onClose: () => void;
  onOpenTab: (tab: string) => void;
  onView: (v: "landscape" | "map") => void;
}) {
  const store = useStore();
  const s = STORY[step];
  const headingRef = useRef<HTMLHeadingElement>(null);

  const go = (n: number) => {
    const next = STORY[n];
    setStep(n);
    store.pause();
    store.setCursor(next.cursor);
    if (next.focus) store.setFocusFate(next.focus);
    announce(`Step ${n + 1}: ${next.title}. ${cursorSentence(store.getSnapshot())}`, { topic: "story" });
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const extras: Record<string, { label: string; run: () => void }> = {
    "first-split": {
      label: "Show velocity arrows",
      run: () => {
        store.setArrows(true);
        announce("Velocity arrows on: each points where its cell is heading.", { topic: "story" });
      },
    },
    pseudotime: { label: "Open the Pseudotime check", run: () => onOpenTab("check") },
    map: { label: "Switch to the Map view", run: () => onView("map") },
  };
  const extra = extras[s.id];

  return (
    <section className="guide" aria-labelledby="story-h">
      <div className="guide-top">
        <h2 id="story-h" className="guide-kicker">
          Story <span className="muted">· step {step + 1} of {STORY.length}</span>
        </h2>
        <button type="button" className="button secondary small" onClick={onClose}>
          Hide story
        </button>
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="guide-title">
        {s.title}
      </h3>
      {s.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <p className="guide-look">
        <span className="label">Look for</span> {s.lookFor}
      </p>
      <p>
        <Link href={`/learn#${s.article}`} className="text-link">
          Read more in Learn
        </Link>
      </p>
      <div className="button-row">
        <button type="button" className="button" aria-disabled={step === 0} onClick={() => (step > 0 ? go(step - 1) : announce("This is the first step.", { topic: "story" }))}>
          Previous step
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            store.pause();
            store.setCursor(s.cursor);
            if (s.focus) store.setFocusFate(s.focus);
            announce(cursorSentence(store.getSnapshot()), { topic: "story" });
          }}
        >
          Show this step
        </button>
        {s.tryGenes ? (
          <button
            type="button"
            className="button primary"
            onClick={() => {
              store.applyParams({ genes: s.tryGenes }, s.tryLabel ?? "Story change");
              store.setCursor(1);
            }}
          >
            Try it: {s.tryLabel}
          </button>
        ) : null}
        {extra ? (
          <button type="button" className="button" onClick={extra.run}>
            {extra.label}
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          aria-disabled={step === STORY.length - 1}
          onClick={() => (step < STORY.length - 1 ? go(step + 1) : announce("This is the last step. Hide the story or go back.", { topic: "story" }))}
        >
          Next step
        </button>
      </div>
    </section>
  );
}
