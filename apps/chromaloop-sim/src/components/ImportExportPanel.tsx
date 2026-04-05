'use client';

import { useState, useRef, useCallback } from 'react';
import { SimulationState } from '@/types';
import {
  parseFASTAAnnotation,
  parseBEDAnnotation,
  parseHiCCSV,
  parseAny,
  buildStateFromImport,
  PRESET_DATASETS,
  PresetDataset,
} from '@/lib/importUtils';
import {
  exportContactMapCSV,
  exportCoordinatesXYZ,
  exportCoordinatesPDB,
  exportExpressionTSV,
  exportStateJSON,
  exportHiCPNG,
  export3DScreenshot,
} from '@/lib/exportUtils';
import HelpTooltip from './HelpTooltip';

interface Props {
  show: boolean;
  onClose: () => void;
  state: SimulationState;
  onLoadState: (state: SimulationState) => void;
  hicContainerRef: React.RefObject<HTMLDivElement | null>;
  threeDContainerRef: React.RefObject<HTMLDivElement | null>;
}

type Tab = 'import' | 'presets' | 'export';

/* ——— Sample sequences for the textarea ——— */
const FASTA_PLACEHOLDER = `>My_custom_region
>NNNNPNENNNN<A>NNNENNPNNNN<B

Characters:
N or . = normal bead
>     = CTCF (forward)
<     = CTCF (reverse)
P     = promoter
E     = enhancer
A/B   = set compartment`;

const BED_PLACEHOLDER = `# start	end	type	label
0	19	tad	TAD-Alpha
0	0	ctcf_f	CTCF-1
5	5	promoter	MYC
12	12	enhancer	SE-MYC
19	19	ctcf_r	CTCF-2
20	39	tad	TAD-Beta
20	20	ctcf_f	CTCF-3
28	28	promoter	GATA1
33	33	enhancer	Enh-GATA
39	39	ctcf_r	CTCF-4`;

export default function ImportExportPanel({
  show,
  onClose,
  state,
  onLoadState,
  hicContainerRef,
  threeDContainerRef,
}: Props) {
  const [tab, setTab] = useState<Tab>('import');
  const [inputText, setInputText] = useState('');
  const [inputFormat, setInputFormat] = useState<'fasta' | 'bed' | 'csv' | 'auto'>('auto');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    if (!inputText.trim()) {
      setImportStatus({ type: 'error', message: 'Paste or upload data first.' });
      return;
    }

    try {
      let imported;
      if (inputFormat === 'auto') {
        imported = parseAny(inputText);
      } else if (inputFormat === 'fasta') {
        imported = parseFASTAAnnotation(inputText);
      } else if (inputFormat === 'bed') {
        imported = parseBEDAnnotation(inputText);
      } else {
        imported = parseHiCCSV(inputText);
      }

      if (!imported || (imported.beadCount ?? 0) < 2) {
        setImportStatus({ type: 'error', message: 'Could not parse data. Check format.' });
        return;
      }

      const newState = buildStateFromImport(imported);
      onLoadState(newState);
      setImportStatus({
        type: 'success',
        message: `Loaded "${imported.name}" — ${newState.beads.length} beads, ${newState.tads.length} TADs, ${newState.loops.length} loops`,
      });
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: `Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }, [inputText, inputFormat, onLoadState]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setInputText(text);
        // Auto-detect format from filename
        if (file.name.endsWith('.fa') || file.name.endsWith('.fasta')) setInputFormat('fasta');
        else if (file.name.endsWith('.bed')) setInputFormat('bed');
        else if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) setInputFormat('csv');
        else setInputFormat('auto');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handlePresetLoad = useCallback(
    (preset: PresetDataset) => {
      const imported = parseFASTAAnnotation(preset.sequence);
      const newState = buildStateFromImport(imported);
      onLoadState(newState);
      setImportStatus({
        type: 'success',
        message: `Loaded "${preset.name}" — ${newState.beads.length} beads`,
      });
      setTab('import');
    },
    [onLoadState]
  );

  const handleExport = useCallback(
    (format: string) => {
      setExportStatus(`Exporting ${format}...`);
      try {
        switch (format) {
          case 'hic-csv':
            exportContactMapCSV(state);
            break;
          case 'xyz':
            exportCoordinatesXYZ(state);
            break;
          case 'pdb':
            exportCoordinatesPDB(state);
            break;
          case 'expression':
            exportExpressionTSV(state);
            break;
          case 'json':
            exportStateJSON(state);
            break;
          case 'hic-png':
            exportHiCPNG(hicContainerRef.current, state);
            break;
          case '3d-png':
            export3DScreenshot(threeDContainerRef.current, state);
            break;
        }
        setExportStatus(`✓ ${format} exported`);
        setTimeout(() => setExportStatus(null), 2000);
      } catch (err) {
        setExportStatus(`✕ Export failed: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    },
    [state, hicContainerRef, threeDContainerRef]
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative glass-panel-strong max-w-xl w-full mx-4 max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <h2 className="font-display text-[13px] tracking-wider text-[var(--text-primary)]">
              Import & Export
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors px-2 py-1"
          >
            ESC
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06]">
          {([
            { id: 'import' as Tab, label: '↓ Import Data', color: '#00e5ff' },
            { id: 'presets' as Tab, label: '◆ Presets', color: '#39ff14' },
            { id: 'export' as Tab, label: '↑ Export', color: '#ffab00' },
          ]).map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 font-mono text-[11px] py-2.5 transition-all border-b-2 ${
                tab === id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)] border-transparent'
              }`}
              style={{ borderBottomColor: tab === id ? color : 'transparent' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ——— Import Tab ——— */}
          {tab === 'import' && (
            <div className="space-y-4">
              {/* Format selector */}
              <div>
                <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center">
                  Format
                  <HelpTooltip text="FASTA-like: each character = one bead type. BED: tab-separated regions. CSV: square contact matrix. Auto will try to detect." />
                </label>
                <div className="flex gap-1.5 mt-1.5">
                  {([
                    { id: 'auto' as const, label: 'Auto-detect' },
                    { id: 'fasta' as const, label: 'FASTA Seq' },
                    { id: 'bed' as const, label: 'BED Regions' },
                    { id: 'csv' as const, label: 'Hi-C CSV' },
                  ]).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setInputFormat(id)}
                      className={`font-mono text-[10px] px-2.5 py-1.5 rounded-md transition-all ${
                        inputFormat === id
                          ? 'bg-chromatin-cyan/15 text-chromatin-cyan border border-chromatin-cyan/25'
                          : 'bg-white/5 text-[var(--text-secondary)] border border-transparent hover:bg-white/8'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div>
                <label className="font-mono text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1.5 block">
                  Paste data or upload file
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={inputFormat === 'bed' ? BED_PLACEHOLDER : FASTA_PLACEHOLDER}
                  className="w-full h-40 px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.08]
                    font-mono text-[11px] text-[var(--text-primary)] leading-relaxed
                    placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-chromatin-cyan/30
                    resize-none"
                  spellCheck={false}
                />
              </div>

              {/* File upload + Import button */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fa,.fasta,.bed,.csv,.tsv,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-[10px] px-3 py-2 rounded-lg bg-white/5 text-[var(--text-secondary)] border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload File
                </button>

                <div className="flex-1" />

                <button
                  onClick={handleImport}
                  disabled={!inputText.trim()}
                  className={`font-mono text-[11px] px-5 py-2 rounded-lg transition-all ${
                    inputText.trim()
                      ? 'bg-chromatin-cyan/15 text-chromatin-cyan border border-chromatin-cyan/25 hover:bg-chromatin-cyan/25'
                      : 'bg-white/5 text-[var(--text-dim)] border border-white/5 cursor-not-allowed'
                  }`}
                >
                  Load into Simulator →
                </button>
              </div>

              {/* Status */}
              {importStatus && (
                <div
                  className={`p-3 rounded-lg font-mono text-[10px] leading-relaxed ${
                    importStatus.type === 'success'
                      ? 'bg-chromatin-green/10 text-chromatin-green border border-chromatin-green/20'
                      : 'bg-chromatin-red/10 text-chromatin-red border border-chromatin-red/20'
                  }`}
                >
                  {importStatus.message}
                </div>
              )}

              {/* Format help */}
              <div className="glass-panel p-3 space-y-2">
                <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider">Supported Formats</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-chromatin-cyan block">FASTA Annotation</span>
                    <span className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed block">
                      Each character = one bead. N=normal, {'>'}/{`<`}=CTCF, P=promoter, E=enhancer.
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-chromatin-magenta block">BED Regions</span>
                    <span className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed block">
                      Tab-separated: start, end, type, label. Define TADs, CTCF sites, genes.
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-chromatin-amber block">Hi-C CSV</span>
                    <span className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed block">
                      Square contact matrix (comma or tab separated). Auto-normalized to 0–1.
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-chromatin-green block">JSON State</span>
                    <span className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed block">
                      Re-import a previously exported ChromaLoop state file.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ——— Presets Tab ——— */}
          {tab === 'presets' && (
            <div className="space-y-3">
              <p className="font-body text-[12px] text-[var(--text-dim)] leading-relaxed mb-4">
                Load curated genomic regions inspired by key 3D genome studies and the 4D Nucleome project.
              </p>

              {PRESET_DATASETS.map((preset) => (
                <div
                  key={preset.id}
                  className="glass-panel p-4 cursor-pointer hover:bg-white/[0.03] transition-colors group"
                  onClick={() => handlePresetLoad(preset)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-body text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-chromatin-cyan transition-colors">
                      {preset.name}
                    </h4>
                    <span className="font-mono text-[8px] text-chromatin-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                      click to load →
                    </span>
                  </div>
                  <p className="font-body text-[11px] text-[var(--text-dim)] leading-relaxed mb-2">
                    {preset.description}
                  </p>
                  <div className="flex items-center gap-3 font-mono text-[9px] text-[var(--text-dim)]">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">{preset.organism}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">{preset.cellType}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">{preset.resolution}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ——— Export Tab ——— */}
          {tab === 'export' && (
            <div className="space-y-4">
              <p className="font-body text-[12px] text-[var(--text-dim)] leading-relaxed">
                Export the current simulation state in various formats for downstream analysis or visualization.
              </p>

              {/* Export status */}
              {exportStatus && (
                <div className="font-mono text-[10px] text-chromatin-green px-3 py-1.5 rounded bg-chromatin-green/10 border border-chromatin-green/20">
                  {exportStatus}
                </div>
              )}

              {/* Screenshots */}
              <div>
                <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider block mb-2">
                  Screenshots
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <ExportButton
                    label="3D View"
                    format="PNG"
                    icon="◆"
                    color="#00e5ff"
                    description="Screenshot of the current 3D chromatin structure"
                    onClick={() => handleExport('3d-png')}
                  />
                  <ExportButton
                    label="Hi-C Map"
                    format="PNG"
                    icon="▦"
                    color="#ff00e5"
                    description="Contact map heatmap as rendered"
                    onClick={() => handleExport('hic-png')}
                  />
                </div>
              </div>

              {/* Data exports */}
              <div>
                <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider block mb-2">
                  Data
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <ExportButton
                    label="Contact Matrix"
                    format="CSV"
                    icon="⊞"
                    color="#ffab00"
                    description="N×N Hi-C contact frequency matrix"
                    onClick={() => handleExport('hic-csv')}
                  />
                  <ExportButton
                    label="Expression"
                    format="TSV"
                    icon="◉"
                    color="#39ff14"
                    description="Gene expression values + coordinates"
                    onClick={() => handleExport('expression')}
                  />
                </div>
              </div>

              {/* Structure exports */}
              <div>
                <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider block mb-2">
                  3D Structure
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <ExportButton
                    label="Coordinates"
                    format="XYZ"
                    icon="⊹"
                    color="#00e5ff"
                    description="Bead positions in XYZ molecular format"
                    onClick={() => handleExport('xyz')}
                  />
                  <ExportButton
                    label="Structure"
                    format="PDB"
                    icon="⬡"
                    color="#ff00e5"
                    description="Open in PyMOL, Chimera, or other viewers"
                    onClick={() => handleExport('pdb')}
                  />
                </div>
              </div>

              {/* Full state */}
              <div>
                <span className="font-mono text-[9px] text-[var(--text-dim)] uppercase tracking-wider block mb-2">
                  Full State
                </span>
                <ExportButton
                  label="Complete State"
                  format="JSON"
                  icon="{ }"
                  color="#7986cb"
                  description="All beads, loops, TADs, contacts, and parameters — re-importable"
                  onClick={() => handleExport('json')}
                  wide
                />
              </div>

              {/* Snapshot info */}
              <div className="glass-panel p-3 font-mono text-[9px] text-[var(--text-dim)] space-y-1">
                <div className="flex justify-between">
                  <span>Simulation time</span>
                  <span className="text-[var(--text-secondary)]">t = {state.time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Beads</span>
                  <span className="text-[var(--text-secondary)]">{state.beads.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active loops</span>
                  <span className="text-[var(--text-secondary)]">{state.loops.filter((l) => l.strength > 0.1).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mutated beads</span>
                  <span className={state.beads.some((b) => b.mutated) ? 'text-chromatin-red' : 'text-[var(--text-secondary)]'}>
                    {state.beads.filter((b) => b.mutated).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ——— Export button sub-component ——— */
function ExportButton({
  label,
  format,
  icon,
  color,
  description,
  onClick,
  wide,
}: {
  label: string;
  format: string;
  icon: string;
  color: string;
  description: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-panel p-3 text-left hover:bg-white/[0.04] transition-all group ${wide ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm" style={{ color }}>{icon}</span>
        <span className="font-mono text-[11px] text-[var(--text-primary)] group-hover:text-chromatin-cyan transition-colors">
          {label}
        </span>
        <span className="ml-auto font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-dim)]">
          .{format.toLowerCase()}
        </span>
      </div>
      <p className="font-body text-[9px] text-[var(--text-dim)] leading-relaxed">{description}</p>
    </button>
  );
}
