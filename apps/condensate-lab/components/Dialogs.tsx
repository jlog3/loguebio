"use client";

import { AccessSettingsPanel } from "@repo/access";
import { Dialog, soundSupported } from "@repo/kit";
import { useId, useState, useSyncExternalStore } from "react";
import { download, dropletsCsv, historyCsv, pictureSvg, settingsJson } from "@/lib/export";
import { sanitizeParams } from "@/lib/sim/params";
import { useSnapshot, useStore } from "./LabContext";
import type { ThemeColors } from "./useTheme";

const noSubscribe = () => () => {};

export function SettingsDialog({
  open,
  onClose,
  spoken,
  setSpoken,
}: {
  open: boolean;
  onClose: () => void;
  spoken: boolean;
  setSpoken: (v: boolean) => void;
}) {
  const id = useId();
  const canSound = useSyncExternalStore(noSubscribe, soundSupported, () => true);
  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <p>These choices apply to every LogueBio tool on this device.</p>
      <AccessSettingsPanel headingLevel={3} />
      <h3>In Condensate Lab</h3>
      <div className="control">
        <label className="check" htmlFor={id}>
          <input id={id} type="checkbox" checked={spoken} onChange={(e) => setSpoken(e.target.checked)} />
          Spoken updates while the simulation runs
        </label>
        <p className="control-help">
          For screen readers: a short update every few seconds about droplets forming, merging and dissolving. Turn off for quiet; the summary under the
          picture and the Log tab always have the latest.
        </p>
      </div>
      {!canSound ? <p className="note">This browser cannot play sounds from a web page.</p> : null}
    </Dialog>
  );
}

export function DataDialog({ open, onClose, colors }: { open: boolean; onClose: () => void; colors: ThemeColors }) {
  const store = useStore();
  const snap = useSnapshot();
  const fileId = useId();
  const [msg, setMsg] = useState<string | null>(null);
  const stamp = `t${Math.round(snap.time)}`;
  return (
    <Dialog open={open} onClose={onClose} title="Save and load">
      <p>Files are made and read on this device. Nothing is uploaded.</p>
      <h3>Save</h3>
      <ul className="action-list">
        <li>
          <button
            type="button"
            className="button"
            onClick={() =>
              download(`condensate-lab-picture-${stamp}.svg`, pictureSvg(store.world, snap, { protein: colors.protein, rna: colors.rna, solid: colors.solid, ink: colors.ink, paper: colors.paper }), "image/svg+xml")
            }
          >
            Picture (SVG)
          </button>
          <span className="muted"> with a title and a full text description inside, for alt text.</span>
        </li>
        <li>
          <button type="button" className="button" onClick={() => download(`condensate-lab-droplets-${stamp}.csv`, dropletsCsv(snap), "text/csv")}>
            Droplets table (CSV)
          </button>
        </li>
        <li>
          <button type="button" className="button" onClick={() => download("condensate-lab-over-time.csv", historyCsv(snap), "text/csv")}>
            Readings over time (CSV)
          </button>
        </li>
        <li>
          <button type="button" className="button" onClick={() => download("condensate-lab-settings.json", settingsJson(snap), "application/json")}>
            Settings (JSON)
          </button>
          <span className="muted"> to repeat this run later: same seed, same start.</span>
        </li>
      </ul>
      <p className="muted">FRAP curves and threshold scans have their own download buttons in their tabs.</p>
      <h3>Load settings</h3>
      <div className="file-field">
        <label htmlFor={fileId} className="button">
          Choose a settings file
        </label>
        <input
          id={fileId}
          type="file"
          accept=".json,application/json"
          className="file-input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const data = JSON.parse(await file.text());
              const params = sanitizeParams(data && typeof data === "object" && "params" in data ? (data as { params: unknown }).params : data);
              store.applyParams(params, `Settings from ${file.name}`);
              setMsg(`Loaded settings from ${file.name}. Anything missing or out of range was set to its default.`);
            } catch {
              setMsg("That file is not a settings file (it is not valid JSON).");
            }
            e.target.value = "";
          }}
        />
      </div>
      {msg ? (
        <p className="note" role="status">
          {msg}
        </p>
      ) : null}
    </Dialog>
  );
}
