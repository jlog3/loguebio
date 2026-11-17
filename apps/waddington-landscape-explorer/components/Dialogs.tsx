"use client";

import { AccessSettingsPanel } from "@repo/access";
import { Dialog, soundSupported } from "@repo/kit";
import { useId, useState, useSyncExternalStore } from "react";
import { cellsCsv, download, fatesCsv, mapSvg, settingsJson } from "@/lib/export";
import type { Look } from "@/lib/look";
import { sanitizeParams } from "@/lib/model/params";
import { useSnapshot, useStore } from "./LabContext";

const noSubscribe = () => () => {};

export function SettingsDialog({ open, onClose, spoken, setSpoken }: { open: boolean; onClose: () => void; spoken: boolean; setSpoken: (v: boolean) => void }) {
  const id = useId();
  const canSound = useSyncExternalStore(noSubscribe, soundSupported, () => true);
  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <p>These choices apply to every LogueBio tool on this device.</p>
      <AccessSettingsPanel headingLevel={3} />
      <h3>In Waddington Explorer</h3>
      <div className="control">
        <label className="check" htmlFor={id}>
          <input id={id} type="checkbox" checked={spoken} onChange={(e) => setSpoken(e.target.checked)} />
          Spoken updates
        </label>
        <p className="control-help">
          For screen readers: what changed after each gene change, and when each branch appears during playback. The summary and the Log tab always have the latest.
        </p>
      </div>
      {!canSound ? <p className="note">This browser cannot play sounds from a web page.</p> : null}
    </Dialog>
  );
}

export function DataDialog({ open, onClose, look }: { open: boolean; onClose: () => void; look: Look }) {
  const store = useStore();
  const snap = useSnapshot();
  const fileId = useId();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Dialog open={open} onClose={onClose} title="Save and load">
      <p>Files are made and read on this device. Nothing is uploaded.</p>
      <h3>Save</h3>
      <ul className="action-list">
        <li>
          <button type="button" className="button" onClick={() => download("waddington-map.svg", mapSvg(snap, look), "image/svg+xml")}>
            Map picture (SVG)
          </button>
          <span className="muted"> with a title and a full text description inside, for alt text.</span>
        </li>
        <li>
          <button type="button" className="button" onClick={() => download("waddington-cells.csv", cellsCsv(snap), "text/csv")}>
            Every cell (CSV)
          </button>
          <span className="muted"> with fate, pseudotime, true age, position, all eight genes and velocity.</span>
        </li>
        <li>
          <button type="button" className="button" onClick={() => download("waddington-fates.csv", fatesCsv(snap), "text/csv")}>
            Fates table (CSV)
          </button>
        </li>
        <li>
          <button type="button" className="button" onClick={() => download("waddington-settings.json", settingsJson(snap), "application/json")}>
            Settings (JSON)
          </button>
          <span className="muted"> to get the same cells again later.</span>
        </li>
      </ul>
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
