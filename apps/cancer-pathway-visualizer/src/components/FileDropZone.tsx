"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  label: string;
  fileName: string | null;
  color: string;
  onFileLoaded: (text: string, name: string) => void;
  onClear?: () => void;
}

export default function FileDropZone({
  label,
  fileName,
  color,
  onFileLoaded,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) =>
        onFileLoaded(e.target?.result as string, file.name);
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      className={`
        relative rounded-xl p-4 text-center cursor-pointer transition-all duration-200
        border-2 border-dashed
        ${dragging ? "border-opacity-60" : "border-white/[0.06] hover:border-white/[0.12]"}
      `}
      style={{
        borderColor: dragging ? color : undefined,
        background: dragging
          ? `${color}08`
          : "rgba(255,255,255,0.012)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="text-[9px] uppercase tracking-[0.15em] text-w25 mb-1">
        {label}
      </div>

      {fileName ? (
        <div
          className="text-xs font-mono break-all pr-5"
          style={{ color }}
        >
          {fileName}
          {onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute right-2.5 top-2.5 text-white/25 hover:text-white/50 text-base leading-none"
              title="Clear"
            >
              &times;
            </button>
          )}
        </div>
      ) : (
        <div className="text-xs text-white/25">Drop CSV or click to browse</div>
      )}
    </div>
  );
}
