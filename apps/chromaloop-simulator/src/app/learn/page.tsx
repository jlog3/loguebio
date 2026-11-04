'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useState } from 'react';

/* ——— Inline SVG illustrations (no external images needed) ——— */

function DNAPackingDiagram() {
  return (
    <svg viewBox="0 0 700 200" className="w-full h-auto my-6" xmlns="http://www.w3.org/2000/svg">
      {/* DNA double helix */}
      <g transform="translate(30, 100)">
        {Array.from({ length: 20 }, (_, i) => {
          const x = i * 8;
          const y1 = Math.sin(i * 0.6) * 25;
          const y2 = Math.sin(i * 0.6 + Math.PI) * 25;
          return (
            <g key={i} opacity={0.8}>
              <circle cx={x} cy={y1} r={2.5} fill="#00e5ff" />
              <circle cx={x} cy={y2} r={2.5} fill="#ff00e5" />
              {i % 3 === 0 && <line x1={x} y1={y1} x2={x} y2={y2} stroke="#ffffff15" strokeWidth={1} />}
            </g>
          );
        })}
        <text x={70} y={55} fill="#7986cb" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">2nm</text>
      </g>

      {/* Arrow */}
      <path d="M 195 100 L 225 100" stroke="#3f51b5" strokeWidth={1.5} markerEnd="url(#arrowhead)" />

      {/* Nucleosome beads-on-string */}
      <g transform="translate(240, 100)">
        {Array.from({ length: 6 }, (_, i) => {
          const x = i * 28;
          const y = Math.sin(i * 1.2) * 8;
          return (
            <g key={i}>
              {i < 5 && <line x1={x + 10} y1={y} x2={x + 18} y2={Math.sin((i + 1) * 1.2) * 8} stroke="#3f51b580" strokeWidth={1} />}
              <circle cx={x} cy={y} r={9} fill="#162955" stroke="#00e5ff40" strokeWidth={1} />
              <circle cx={x} cy={y} r={4} fill="#00e5ff20" />
            </g>
          );
        })}
        <text x={70} y={55} fill="#7986cb" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">11nm</text>
      </g>

      {/* Arrow */}
      <path d="M 420 100 L 450 100" stroke="#3f51b5" strokeWidth={1.5} markerEnd="url(#arrowhead)" />

      {/* 30nm fiber */}
      <g transform="translate(470, 100)">
        {Array.from({ length: 8 }, (_, i) => {
          const x = i * 14;
          const y = Math.sin(i * 0.9) * 20;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={11} fill="#0f1d3d" stroke="#ff00e530" strokeWidth={1.5} />
              <circle cx={x} cy={y} r={5} fill="#ff00e510" />
            </g>
          );
        })}
        <text x={50} y={55} fill="#7986cb" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">30nm</text>
      </g>

      {/* Arrow */}
      <path d="M 590 100 L 620 100" stroke="#3f51b5" strokeWidth={1.5} markerEnd="url(#arrowhead)" />

      {/* Chromosome territory blob */}
      <g transform="translate(645, 100)">
        <ellipse cx="0" cy="0" rx="28" ry="35" fill="#0f1d3d" stroke="#39ff1430" strokeWidth={1.5} />
        <ellipse cx="-5" cy="-5" rx="12" ry="15" fill="#39ff1408" />
        <text x={0} y={55} fill="#7986cb" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">territory</text>
      </g>

      {/* Labels */}
      <text x={70} y={25} fill="#e8eaf6" fontSize="11" fontFamily="DM Sans" textAnchor="middle">DNA</text>
      <text x={310} y={25} fill="#e8eaf6" fontSize="11" fontFamily="DM Sans" textAnchor="middle">Nucleosomes</text>
      <text x={520} y={25} fill="#e8eaf6" fontSize="11" fontFamily="DM Sans" textAnchor="middle">Chromatin Fiber</text>
      <text x={645} y={25} fill="#e8eaf6" fontSize="11" fontFamily="DM Sans" textAnchor="middle">Chromosome</text>

      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#3f51b5" />
        </marker>
      </defs>
    </svg>
  );
}

function LoopExtrusionDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full h-auto my-6" xmlns="http://www.w3.org/2000/svg">
      {/* Step 1 - Linear */}
      <g transform="translate(20, 60)">
        <text x="80" y="-20" fill="#7986cb" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">1. Cohesin loads</text>
        <line x1="0" y1="30" x2="160" y2="30" stroke="#3f51b560" strokeWidth={2} />
        {/* CTCF sites */}
        <polygon points="15,15 25,30 15,45" fill="#00e5ff" opacity={0.7} />
        <polygon points="145,15 135,30 145,45" fill="#00e5ff" opacity={0.7} />
        <text x="15" y="60" fill="#00e5ff80" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">CTCF →</text>
        <text x="145" y="60" fill="#00e5ff80" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">← CTCF</text>
        {/* Cohesin ring */}
        <circle cx="80" cy="30" r="12" fill="none" stroke="#39ff14" strokeWidth={2} opacity={0.8} />
        <circle cx="80" cy="30" r="3" fill="#39ff14" opacity={0.5} />
      </g>

      {/* Step 2 - Small loop */}
      <g transform="translate(220, 60)">
        <text x="80" y="-20" fill="#7986cb" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">2. Extrusion begins</text>
        <path d="M 0 30 L 40 30 Q 80 -15 120 30 L 160 30" fill="none" stroke="#3f51b560" strokeWidth={2} />
        <polygon points="15,15 25,30 15,45" fill="#00e5ff" opacity={0.7} />
        <polygon points="145,15 135,30 145,45" fill="#00e5ff" opacity={0.7} />
        {/* Cohesin at top of loop */}
        <circle cx="80" cy="-5" r="12" fill="none" stroke="#39ff14" strokeWidth={2} opacity={0.8} />
        {/* Arrows showing extrusion direction */}
        <path d="M 55 10 L 45 15" stroke="#39ff1480" strokeWidth={1} markerEnd="url(#arrowG)" />
        <path d="M 105 10 L 115 15" stroke="#39ff1480" strokeWidth={1} markerEnd="url(#arrowG)" />
      </g>

      {/* Step 3 - Full loop, stalled */}
      <g transform="translate(420, 60)">
        <text x="80" y="-20" fill="#7986cb" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">3. Stalled at CTCF</text>
        <path d="M 0 30 L 15 30 Q 80 -40 145 30 L 160 30" fill="none" stroke="#3f51b560" strokeWidth={2} />
        <polygon points="15,15 25,30 15,45" fill="#00e5ff" opacity={1} />
        <polygon points="145,15 135,30 145,45" fill="#00e5ff" opacity={1} />
        {/* Cohesin stalled between CTCFs */}
        <circle cx="80" cy="-25" r="12" fill="none" stroke="#ff1744" strokeWidth={2} opacity={0.8} />
        {/* Glow effect for stall */}
        <circle cx="80" cy="-25" r="18" fill="none" stroke="#ff174430" strokeWidth={1} />
        {/* Stable loop label */}
        <text x="80" y="-45" fill="#e8eaf6" fontSize="9" fontFamily="DM Sans" textAnchor="middle">stable loop</text>
      </g>

      {/* Bottom section — what's inside the loop */}
      <g transform="translate(20, 180)">
        <text x="300" y="-15" fill="#ffab00" fontSize="11" fontFamily="DM Sans" textAnchor="middle">Inside the loop: enhancer meets promoter</text>
        <path d="M 100 40 L 100 40 Q 300 -30 500 40" fill="none" stroke="#3f51b540" strokeWidth={2} />
        {/* Enhancer */}
        <circle cx="200" cy="15" r="8" fill="#ffab0030" stroke="#ffab00" strokeWidth={1.5} />
        <text x="200" y="45" fill="#ffab00" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">Enhancer</text>
        {/* Promoter */}
        <rect x="390" y="7" width="16" height="16" fill="#5c6bc030" stroke="#5c6bc0" strokeWidth={1.5} rx={2} />
        <text x="398" y="45" fill="#5c6bc0" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">Promoter</text>
        {/* Contact arrow */}
        <path d="M 210 12 Q 300 -20 388 12" fill="none" stroke="#ffab0060" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x="300" y="-5" fill="#39ff14" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">gene ON</text>
        {/* CTCF boundaries */}
        <polygon points="105,25 115,40 105,55" fill="#00e5ff60" />
        <polygon points="495,25 485,40 495,55" fill="#00e5ff60" />
      </g>

      <defs>
        <marker id="arrowG" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#39ff14" opacity={0.5} />
        </marker>
      </defs>
    </svg>
  );
}

function TADDiagram() {
  return (
    <svg viewBox="0 0 500 220" className="w-full h-auto my-6" xmlns="http://www.w3.org/2000/svg">
      {/* Hi-C triangle representation */}
      <g transform="translate(50, 20)">
        <text x="200" y="0" fill="#e8eaf6" fontSize="11" fontFamily="DM Sans" textAnchor="middle">Hi-C Contact Map (triangles = TADs)</text>

        {/* Background grid */}
        <rect x="50" y="20" width="300" height="150" fill="#030711" rx={4} />

        {/* TAD triangles */}
        <polygon points="60,160 60,90 130,160" fill="#00e5ff08" stroke="#00e5ff40" strokeWidth={1} />
        <polygon points="135,160 135,70 230,160" fill="#ff00e508" stroke="#ff00e540" strokeWidth={1} />
        <polygon points="235,160 235,85 340,160" fill="#39ff1408" stroke="#39ff1440" strokeWidth={1} />

        {/* Diagonal hot spots */}
        {Array.from({ length: 30 }, (_, i) => {
          const x = 60 + i * 9.3;
          return <rect key={i} x={x} y={155} width={8} height={5} fill="#ffab0060" rx={1} />;
        })}

        {/* Labels */}
        <text x="95" y="185" fill="#00e5ff" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">TAD-A</text>
        <text x="182" y="185" fill="#ff00e5" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">TAD-B</text>
        <text x="287" y="185" fill="#39ff14" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">TAD-C</text>

        {/* Annotation */}
        <line x1="130" y1="70" x2="170" y2="40" stroke="#7986cb40" strokeWidth={0.5} />
        <text x="175" y="38" fill="#7986cb" fontSize="8" fontFamily="JetBrains Mono">strong intra-TAD contacts</text>

        <line x1="133" y1="130" x2="173" y2="115" stroke="#7986cb40" strokeWidth={0.5} />
        <text x="178" y="113" fill="#7986cb" fontSize="8" fontFamily="JetBrains Mono">TAD boundary (insulation)</text>
      </g>
    </svg>
  );
}

function DiseaseDiagram() {
  return (
    <svg viewBox="0 0 600 200" className="w-full h-auto my-6" xmlns="http://www.w3.org/2000/svg">
      {/* Normal */}
      <g transform="translate(20, 30)">
        <text x="120" y="-10" fill="#39ff14" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Normal: insulated</text>
        <line x1="0" y1="40" x2="240" y2="40" stroke="#3f51b530" strokeWidth={2} />
        {/* TAD boundary */}
        <rect x="115" y="25" width="10" height="30" fill="#00e5ff30" stroke="#00e5ff" strokeWidth={1} rx={2} />
        <text x="120" y="75" fill="#00e5ff80" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">CTCF</text>
        {/* Enhancer in left TAD */}
        <circle cx="60" cy="40" r="7" fill="#ffab0030" stroke="#ffab00" strokeWidth={1} />
        <text x="60" y="25" fill="#ffab00" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">enh</text>
        {/* Promoter in left TAD */}
        <rect x="86" y="34" width="12" height="12" fill="#5c6bc030" stroke="#5c6bc0" strokeWidth={1} rx={1} />
        <text x="92" y="25" fill="#5c6bc0" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">gene A</text>
        {/* Gene in right TAD */}
        <rect x="156" y="34" width="12" height="12" fill="#5c6bc030" stroke="#5c6bc0" strokeWidth={1} rx={1} />
        <text x="162" y="25" fill="#5c6bc0" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">gene B</text>
        {/* Normal loop */}
        <path d="M 60 33 Q 78 10 92 33" fill="none" stroke="#ffab0050" strokeWidth={1} strokeDasharray="3 2" />
        <text x="76" y="6" fill="#39ff14" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">ON</text>
        {/* Blocked */}
        <text x="140" y="90" fill="#7986cb" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">boundary blocks</text>
        <text x="140" y="100" fill="#7986cb" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">cross-TAD contact</text>
      </g>

      {/* Arrow */}
      <g transform="translate(280, 60)">
        <text x="20" y="-5" fill="#ff1744" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">mutation</text>
        <path d="M 0 15 L 40 15" stroke="#ff1744" strokeWidth={1.5} markerEnd="url(#arrowR)" />
        <text x="20" y="35" fill="#ff174480" fontSize="16" textAnchor="middle">✕</text>
      </g>

      {/* Mutant */}
      <g transform="translate(340, 30)">
        <text x="120" y="-10" fill="#ff1744" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Disease: boundary lost</text>
        <line x1="0" y1="40" x2="240" y2="40" stroke="#3f51b530" strokeWidth={2} />
        {/* Broken boundary */}
        <rect x="115" y="25" width="10" height="30" fill="#ff174420" stroke="#ff174480" strokeWidth={1} rx={2} strokeDasharray="3 2" />
        <text x="120" y="75" fill="#ff174480" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">deleted</text>
        {/* Enhancer now reaches across */}
        <circle cx="60" cy="40" r="7" fill="#ffab0030" stroke="#ffab00" strokeWidth={1} />
        {/* Gene B now ectopically activated */}
        <rect x="156" y="34" width="12" height="12" fill="#ff174430" stroke="#ff1744" strokeWidth={1.5} rx={1} />
        <text x="162" y="25" fill="#ff1744" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">gene B</text>
        {/* Ectopic loop */}
        <path d="M 60 33 Q 115 -20 162 33" fill="none" stroke="#ff174480" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x="115" y="-10" fill="#ff1744" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle" opacity={0.8}>ectopic activation!</text>
        {/* Result */}
        <text x="120" y="95" fill="#ff1744" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">enhancer adoption → oncogene ON</text>
      </g>

      <defs>
        <marker id="arrowR" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#ff1744" />
        </marker>
      </defs>
    </svg>
  );
}

/* ——— Expandable section component ——— */
function Expandable({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-4 rounded-xl border border-[var(--panel-border)] overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: 'var(--cyan)' }}>▶</span>
        <span className="font-body text-[14px] text-[var(--text-primary)] font-medium flex-1">{title}</span>
        {tag && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-chromatin-magenta/10 text-chromatin-magenta/70 border border-chromatin-magenta/20">
            {tag}
          </span>
        )}
      </button>
      {open && <div className="px-5 pb-5 learn-prose">{children}</div>}
    </div>
  );
}

/* ——— Key concept callout ——— */
function KeyConcept({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="my-5 pl-4 border-l-2 border-chromatin-cyan/40">
      <span className="font-display text-[11px] tracking-wider text-chromatin-cyan uppercase block mb-1">{term}</span>
      <div className="font-body text-[13.5px] text-[var(--text-secondary)] leading-[1.75]">{children}</div>
    </div>
  );
}

/* ——— Main page ——— */
export default function LearnPage() {
  return (
    <div className="min-h-screen bg-mesh">
      <Navigation />

      {/* Hero */}
      <div className="pt-24 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-chromatin-cyan/[0.03] blur-[80px]" />
          <div className="absolute top-32 right-1/4 w-48 h-48 rounded-full bg-chromatin-magenta/[0.03] blur-[60px]" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <p className="font-mono text-[10px] tracking-[0.3em] text-chromatin-magenta/60 uppercase mb-4">
            Interactive Guide
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 leading-tight tracking-tight">
            How DNA Folds to Control
            <span className="block text-chromatin-cyan glow-text-cyan"> Your Genes</span>
          </h1>
          <p className="font-body text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
            Your 2-meter-long genome folds into a nucleus just 6 microns wide—and the way it folds determines which genes turn on. This guide explains the physics, the players, and what goes wrong in disease.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8 font-mono text-[11px] px-5 py-2.5 rounded-lg bg-chromatin-cyan/10 text-chromatin-cyan border border-chromatin-cyan/25 hover:bg-chromatin-cyan/20 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" fill="currentColor" /></svg>
            Try the Simulator
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pb-24">

        {/* ——— CHAPTER 1 ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-chromatin-cyan/10 text-chromatin-cyan border border-chromatin-cyan/20">01</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">The Packing Problem</h2>
          </div>

          <div className="learn-prose">
            <p>
              Every cell in your body contains roughly <strong>2 meters of DNA</strong>. Stretched end to end, the DNA from all your cells would reach the Sun and back 600 times. Yet this enormous molecule must fit inside a <strong>nucleus just 6 micrometers</strong> across—about 1/10 the width of a human hair.
            </p>
            <p>
              This isn&apos;t just a packaging problem. The way DNA folds determines which genes are accessible and which are silenced. A skin cell and a neuron have identical DNA, but radically different folding patterns expose different gene sets. Chromatin architecture <em>is</em> gene regulation.
            </p>
          </div>

          <DNAPackingDiagram />

          <div className="learn-prose">
            <p>
              DNA wraps around <strong>histone proteins</strong> to form nucleosomes (the &quot;beads on a string&quot;), which coil into a 30nm chromatin fiber, which further folds into higher-order structures. But the most exciting discovery of the last decade is that these structures aren&apos;t random—they&apos;re organized into <strong>loops and domains</strong> by molecular machines.
            </p>
          </div>

          <KeyConcept term="Chromatin">
            The complex of DNA wound around histone proteins. Think of histones as spools and DNA as thread. &quot;Chromatin&quot; means &quot;colored body&quot;—it was named for the way it absorbs dye under a microscope.
          </KeyConcept>
        </section>

        {/* ——— CHAPTER 2 ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-chromatin-magenta/10 text-chromatin-magenta border border-chromatin-magenta/20">02</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">Loop Extrusion: The Motor</h2>
          </div>

          <div className="learn-prose">
            <p>
              In 2016, two groups independently proposed a radical idea: a ring-shaped protein called <strong>cohesin</strong> doesn&apos;t just passively hold DNA together—it actively <strong>extrudes loops</strong> by threading chromatin through its ring, reeling in fiber from both directions like a molecular winch.
            </p>
            <p>
              This process is called <strong>loop extrusion</strong>, and it&apos;s now one of the most important mechanisms in genome biology. Cohesin loads onto chromatin and begins enlarging a loop in real time, at a speed of roughly 1 kb per second. But it doesn&apos;t run forever.
            </p>
          </div>

          <LoopExtrusionDiagram />

          <div className="learn-prose">
            <p>
              The motor is stopped by <strong>CTCF</strong>, a zinc-finger protein that binds specific DNA sequences and acts as a barrier. Crucially, CTCF has a <em>directional</em> binding motif—it only blocks cohesin when facing the right way (convergent orientation). Two convergent CTCF sites create a stable loop with cohesin trapped between them.
            </p>
            <p>
              This is what you see in the ChromaLoop simulator: cohesin rings (green tori) that extrude loops between CTCF boundaries (diamond shapes). When you mutate a CTCF site, the cohesin motor passes through, and the loop collapses.
            </p>
          </div>

          <KeyConcept term="Cohesin">
            A ring-shaped SMC protein complex (~40nm diameter) that encircles DNA. Originally discovered for its role in holding sister chromatids together during cell division, it&apos;s now known to be the primary loop extrusion motor in interphase cells.
          </KeyConcept>

          <KeyConcept term="CTCF">
            CCCTC-binding factor. An 11-zinc-finger protein that binds a ~20bp DNA motif. It acts as a &quot;roadblock&quot; for cohesin, and its binding orientation determines which direction it blocks extrusion from. The most important insulator protein in mammals.
          </KeyConcept>

          <Expandable title="What happens if you remove cohesin entirely?" tag="advanced">
            <p>
              In 2017, researchers used an auxin-degron system to rapidly deplete cohesin (or its loader Nipbl) from cells. Within hours, <strong>all TADs and loops disappeared</strong> from Hi-C maps. However, A/B compartments actually <em>strengthened</em>, suggesting compartmentalization and loop extrusion are independent (even competing) forces. In the simulator, toggle off &quot;Cohesin Motors&quot; while increasing &quot;A/B Strength&quot; to see this effect.
            </p>
          </Expandable>

          <Expandable title="How was loop extrusion proven?" tag="history">
            <p>
              Single-molecule experiments in 2018–2020 directly visualized cohesin extruding DNA loops in real time on flow-stretched DNA. These experiments confirmed the model&apos;s predictions: extrusion is bidirectional, ATP-dependent, and blocked by CTCF in a direction-specific manner. Subsequent cryo-EM structures revealed how cohesin&apos;s ATPase domains ratchet along DNA.
            </p>
          </Expandable>
        </section>

        {/* ——— CHAPTER 3 ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-chromatin-green/10 text-chromatin-green border border-chromatin-green/20">03</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">TADs: Neighborhoods of the Genome</h2>
          </div>

          <div className="learn-prose">
            <p>
              When you run a <strong>Hi-C experiment</strong> (a technique that captures all pairwise 3D contacts across the genome), the resulting contact map shows a striking pattern: the genome is divided into ~2,000 self-interacting blocks called <strong>Topologically Associating Domains (TADs)</strong>.
            </p>
            <p>
              TADs are typically 200kb–2Mb in size. Loci within the same TAD contact each other far more frequently than loci in different TADs. On a Hi-C heatmap, they appear as bright triangles along the diagonal—which is exactly what the simulator&apos;s Hi-C panel shows.
            </p>
          </div>

          <TADDiagram />

          <div className="learn-prose">
            <p>
              TADs are formed by loop extrusion: cohesin continuously extrudes loops within a domain, increasing intra-TAD contact frequency, while CTCF barriers at boundaries prevent extrusion from crossing into adjacent domains.
            </p>
            <p>
              The biological purpose of TADs is <strong>insulation</strong>. Enhancers (regulatory elements that can activate genes over long distances) are physically confined to their TAD, preventing them from accidentally activating genes in neighboring domains. This is critical—the human genome has about 1 million enhancers, and they must be precisely matched to their target genes.
            </p>
          </div>

          <KeyConcept term="Hi-C">
            A genome-wide chromosome conformation capture technique. Cells are crosslinked, DNA is digested, proximity-ligated, and then sequenced. The result is a matrix of contact frequencies between all pairs of genomic loci—essentially a 3D proximity map of the genome.
          </KeyConcept>

          <Expandable title="Are TADs conserved across species?" tag="evolution">
            <p>
              Remarkably, yes. About 50–75% of TAD boundaries are conserved between human and mouse, and many are conserved across all mammals. CTCF binding sites at boundaries are under strong evolutionary constraint. Even <em>Drosophila</em> has TAD-like domains, though they&apos;re formed by somewhat different mechanisms (architectural proteins like dCTCF, Su(Hw), and BEAF-32).
            </p>
          </Expandable>

          <Expandable title="A/B compartments vs. TADs" tag="advanced">
            <p>
              The genome has <em>two</em> levels of large-scale organization. <strong>A/B compartments</strong> are megabase-scale regions where A compartments are gene-rich, open, and transcriptionally active, while B compartments are gene-poor, condensed, and silent. Compartments arise from phase separation and homotypic attraction (A attracts A, B attracts B). <strong>TADs</strong> are sub-megabase structures formed by loop extrusion. The two forces actually compete—removing cohesin eliminates TADs but strengthens compartments.
            </p>
          </Expandable>
        </section>

        {/* ——— CHAPTER 4 ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-chromatin-amber/10 text-chromatin-amber border border-chromatin-amber/20">04</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">Enhancers &amp; Promoters: Long-Range Remote Control</h2>
          </div>

          <div className="learn-prose">
            <p>
              The human genome has a puzzling property: enhancers (the sequences that switch genes on) are often <strong>hundreds of kilobases away</strong> from their target promoters on the linear DNA sequence. The SHH gene, for example, is controlled by an enhancer called the ZRS located <em>1 megabase</em> away. How does it work?
            </p>
            <p>
              The answer is <strong>chromatin looping</strong>. The 3D folding of chromatin brings distant enhancers into physical proximity with their target promoters. In the simulator, you can see this directly: enhancers (dodecahedra) and promoters (cubes) within the same TAD are brought together by loop extrusion, and the gene expression bars respond to this 3D proximity in real time.
            </p>
            <p>
              When an enhancer and promoter are close in 3D space, transcription factors bound to the enhancer can interact with the promoter&apos;s transcription machinery, recruiting RNA Polymerase II and initiating transcription. The expression track at the bottom of the simulator directly reflects this: the closer the enhancer-promoter 3D distance, the higher the expression.
            </p>
          </div>

          <KeyConcept term="Enhancer">
            A cis-regulatory DNA element, typically 200–1000bp, that activates transcription of a target gene independent of distance and orientation. Enhancers are bound by transcription factors and marked by H3K4me1 and H3K27ac histone modifications.
          </KeyConcept>

          <Expandable title="The enhancer-promoter specificity problem" tag="unsolved">
            <p>
              How does an enhancer &quot;know&quot; which promoter to activate? Despite being in the same TAD, most enhancers skip over several genes to reach their specific target. Current models propose a combination of (1) compatibility of transcription factor binding sites, (2) promoter-intrinsic activation thresholds, and (3) 3D contact dynamics. This remains one of the biggest open questions in gene regulation.
            </p>
          </Expandable>
        </section>

        {/* ——— CHAPTER 5 ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-chromatin-red/10 text-chromatin-red border border-chromatin-red/20">05</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">When Loops Break: 3D Genome Disease</h2>
          </div>

          <div className="learn-prose">
            <p>
              If TAD boundaries insulate genes from wrong enhancers, what happens when those boundaries are <strong>deleted, mutated, or rearranged</strong>? The answer, discovered through a series of landmark studies from 2014–2020, is <strong>enhancer adoption</strong>—a mechanism where enhancers &quot;adopt&quot; new gene targets across collapsed boundaries, leading to disease.
            </p>
          </div>

          <DiseaseDiagram />

          <div className="learn-prose">
            <p>
              The simulator&apos;s Disease Mode includes four real examples from the literature. Here&apos;s the biology behind each:
            </p>
          </div>

          {/* Disease cards */}
          <div className="space-y-4 my-6">
            <div className="glass-panel p-5 border-l-2 border-chromatin-red/50">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-body text-[14px] font-semibold text-[var(--text-primary)]">Limb Malformation</h4>
                <span className="font-mono text-[8px] text-[var(--text-dim)]">Lupiáñez et al., Cell 2015</span>
              </div>
              <p className="font-body text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Deletions at the WNT6/IHH/EPHA4 locus remove a TAD boundary between WNT6 and IHH. In the wildtype, WNT6 enhancers are insulated from IHH. When the boundary is lost, WNT6 enhancers ectopically activate IHH in the developing limb, causing brachydactyly (short fingers), syndactyly (fused fingers), or polydactyly (extra fingers), depending on the exact deletion.
              </p>
              <p className="font-body text-[12px] text-chromatin-cyan/50 mt-2 leading-relaxed">
                ↳ In the simulator: this deletes the CTCF boundary between TAD-A and TAD-B, allowing cross-domain enhancer activation.
              </p>
            </div>

            <div className="glass-panel p-5 border-l-2 border-chromatin-amber/50">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-body text-[14px] font-semibold text-[var(--text-primary)]">AML Enhancer Hijacking</h4>
                <span className="font-mono text-[8px] text-[var(--text-dim)]">Gröschel et al., Cell 2014</span>
              </div>
              <p className="font-body text-[13px] text-[var(--text-secondary)] leading-relaxed">
                In acute myeloid leukemia, a chromosomal inversion repositions a super-enhancer from the GATA2 locus into the vicinity of the EVI1 oncogene. This creates a &quot;neo-TAD&quot;—a new topological domain that pairs the hijacked enhancer with EVI1, driving its overexpression and fueling leukemia.
              </p>
              <p className="font-body text-[12px] text-chromatin-cyan/50 mt-2 leading-relaxed">
                ↳ In the simulator: boundaries between TAD-C and TAD-D are disrupted, modeling the neo-TAD formation.
              </p>
            </div>

            <div className="glass-panel p-5 border-l-2 border-chromatin-magenta/50">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-body text-[14px] font-semibold text-[var(--text-primary)]">Medulloblastoma</h4>
                <span className="font-mono text-[8px] text-[var(--text-dim)]">Northcott et al., Nature 2014</span>
              </div>
              <p className="font-body text-[13px] text-[var(--text-secondary)] leading-relaxed">
                In the childhood brain cancer medulloblastoma, structural variants disrupt CTCF insulator sites near the GFI1/GFI1B locus. This collapses the TAD boundary and allows nearby enhancers to &quot;adopt&quot; and activate the GFI1 oncogene. This was one of the first examples of &quot;enhancer hijacking&quot; in cancer.
              </p>
              <p className="font-body text-[12px] text-chromatin-cyan/50 mt-2 leading-relaxed">
                ↳ In the simulator: CTCF sites between TAD-D and TAD-E are mutated, removing insulation.
              </p>
            </div>

            <div className="glass-panel p-5 border-l-2 border-[#651fff]/50">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-body text-[14px] font-semibold text-[var(--text-primary)]">Polydactyly (Extra Digits)</h4>
                <span className="font-mono text-[8px] text-[var(--text-dim)]">Lettice et al., PNAS 2003</span>
              </div>
              <p className="font-body text-[13px] text-[var(--text-secondary)] leading-relaxed">
                A single point mutation in the ZRS enhancer, located nearly 1 Mb from the SHH gene, causes ectopic SHH expression in the limb bud anterior, resulting in extra digits. This is a striking demonstration of how long-range enhancers can control distant genes through chromatin looping.
              </p>
              <p className="font-body text-[12px] text-chromatin-cyan/50 mt-2 leading-relaxed">
                ↳ In the simulator: boundaries near TAD-E and TAD-F are disrupted, modeling long-range regulatory disruption.
              </p>
            </div>
          </div>

          <Expandable title="Cancer as a 3D genome disease" tag="frontier">
            <p>
              By 2025, it&apos;s clear that structural variants in cancer don&apos;t just break genes—they break the genome&apos;s 3D regulatory architecture. Deletions, inversions, and translocations can create neo-TADs, destroy insulator boundaries, and rewire enhancer-gene connections. Large-scale projects like PCAWG have found that ~15% of cancer-associated structural variants exert their oncogenic effect through disruption of 3D chromatin topology rather than direct gene disruption.
            </p>
          </Expandable>
        </section>

        {/* ——— CHAPTER 6 ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#651fff]/10 text-[#651fff] border border-[#651fff]/20">06</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">Reading the Simulator</h2>
          </div>

          <div className="learn-prose">
            <p>
              Here&apos;s a quick guide to everything you see in the ChromaLoop interface:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {[
              {
                icon: '◆',
                color: '#00e5ff',
                title: '3D View',
                desc: 'Rotatable WebGL view of the chromatin polymer. Each bead is a ~10kb segment of the fiber. Drag to rotate, scroll to zoom. Different shapes indicate different element types.',
              },
              {
                icon: '▦',
                color: '#ff00e5',
                title: 'Hi-C Contact Map',
                desc: 'Pairwise contact frequency heatmap. Bright spots = close in 3D space. Triangles along the diagonal = TADs. Click any position to highlight that bead in the 3D view.',
              },
              {
                icon: '◉',
                color: '#39ff14',
                title: 'Expression Track',
                desc: 'Bar heights show gene expression level, calculated from real-time enhancer-promoter 3D proximity. Arcs connect enhancer-promoter pairs within each TAD.',
              },
              {
                icon: '⚙',
                color: '#ffab00',
                title: 'Control Panel',
                desc: 'Tune physics parameters: temperature (thermal noise), loop extrusion (cohesin on/off), compartment strength (A/B phase separation). Mutate individual CTCF sites.',
              },
              {
                icon: '⊘',
                color: '#ff1744',
                title: 'Disease Mode',
                desc: 'Apply real cancer/disease mutations. Watch TAD boundaries collapse, enhancers cross domains, and expression patterns change in real time.',
              },
              {
                icon: '◐',
                color: '#7986cb',
                title: 'Color Schemes',
                desc: 'Switch between TAD coloring, A/B compartments, expression-based coloring, and distance-from-selected-bead to explore different aspects of the structure.',
              },
            ].map((item) => (
              <div key={item.title} className="glass-panel p-4 flex gap-3">
                <span className="text-lg flex-shrink-0" style={{ color: item.color }}>{item.icon}</span>
                <div>
                  <h4 className="font-body text-[12px] font-semibold text-[var(--text-primary)] mb-1">{item.title}</h4>
                  <p className="font-body text-[11px] text-[var(--text-dim)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ——— Glossary ——— */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-[var(--text-secondary)] border border-white/10">REF</span>
            <h2 className="font-display text-lg tracking-wide text-[var(--text-primary)]">Glossary</h2>
          </div>

          <div className="space-y-3">
            {[
              { term: 'Chromatin', def: 'DNA + histone proteins. The material chromosomes are made of.' },
              { term: 'Hi-C', def: 'Genome-wide 3D contact mapping technique. Produces an N×N matrix of pairwise locus proximities.' },
              { term: 'TAD', def: 'Topologically Associating Domain. A ~200kb–2Mb self-interacting genomic region. ~2,000 per mammalian genome.' },
              { term: 'CTCF', def: 'CCCTC-binding factor. 11-zinc-finger insulator protein that blocks cohesin. Orientation-dependent.' },
              { term: 'Cohesin', def: 'Ring-shaped SMC complex. Loop extrusion motor. Loads onto chromatin and extrudes loops at ~1 kb/s.' },
              { term: 'Loop extrusion', def: 'Active process where cohesin threads chromatin through its ring, enlarging a loop until blocked by CTCF.' },
              { term: 'Enhancer', def: 'Cis-regulatory element that activates gene transcription. Can act over 100kb–1Mb distances through looping.' },
              { term: 'Promoter', def: 'DNA region at the start of a gene where RNA polymerase binds. The target of enhancer action.' },
              { term: 'A/B compartments', def: 'Megabase-scale genome organization. A = active, open chromatin. B = silent, condensed.' },
              { term: 'Enhancer adoption', def: 'Pathological activation of a gene by an enhancer from a different domain, caused by TAD boundary disruption.' },
              { term: 'Neo-TAD', def: 'A novel topological domain created by structural variants (inversions, translocations) in disease.' },
              { term: 'Langevin dynamics', def: 'Physics simulation combining deterministic forces with random thermal noise. Used in the simulator\'s polymer model.' },
            ].map((entry) => (
              <div key={entry.term} className="flex gap-4 items-baseline py-2 border-b border-white/[0.04] last:border-0">
                <span className="font-display text-[11px] text-chromatin-cyan w-[140px] flex-shrink-0 tracking-wide">{entry.term}</span>
                <span className="font-body text-[12px] text-[var(--text-dim)] leading-relaxed">{entry.def}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ——— CTA ——— */}
        <section className="text-center py-12 border-t border-[var(--panel-border)]">
          <h3 className="font-display text-lg text-[var(--text-primary)] mb-3">Ready to explore?</h3>
          <p className="font-body text-[13px] text-[var(--text-dim)] mb-6 max-w-md mx-auto">
            Open the simulator and watch loop extrusion, TAD formation, and gene regulation happen before your eyes.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[12px] px-6 py-3 rounded-xl bg-chromatin-cyan/10 text-chromatin-cyan border border-chromatin-cyan/25 hover:bg-chromatin-cyan/20 hover:scale-[1.02] transition-all"
          >
            Launch ChromaLoop Simulator →
          </Link>
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-white/[0.04]">
          <p className="font-mono text-[9px] text-[var(--text-dim)]">
            ChromaLoop Simulator · Built for teaching 3D genome biology
          </p>
          <p className="font-mono text-[9px] text-[var(--text-dim)] mt-1">
            References: Lupiáñez et al. Cell 2015 · Gröschel et al. Cell 2014 · Northcott et al. Nature 2014 · Lettice et al. PNAS 2003 · Rao et al. Cell 2014 · Fudenberg et al. Cell Reports 2016
          </p>
        </footer>
      </div>
    </div>
  );
}
