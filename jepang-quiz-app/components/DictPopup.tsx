"use client";

import { DictEntry } from "@/types/quiz";

interface DictPopupProps {
  word: string;
  entry: DictEntry | null;
  x: number;
  y: number;
  onClose: () => void;
}

export default function DictPopup({ word, entry, x, y, onClose }: DictPopupProps) {
  const popupWidth = 280;
  const left =
    typeof window !== "undefined" && x + 10 + popupWidth > window.innerWidth
      ? window.innerWidth - popupWidth - 20
      : x + 10;

  return (
    <div
      className="fixed z-50 max-w-[280px] rounded-xl border border-border bg-surface2 p-3 text-sm shadow-2xl"
      style={{ left, top: y + 12 }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="absolute right-2 top-1.5 cursor-pointer text-muted"
        onClick={onClose}
      >
        &#10005;
      </span>
      <div className="mb-0.5 text-base font-semibold">{word}</div>
      {entry ? (
        <>
          {entry.reading && (
            <div className="mb-1.5 text-xs text-muted">{entry.reading}</div>
          )}
          {entry.meaning && (
            <div className="mb-1 font-medium text-accent">{entry.meaning}</div>
          )}
          {entry.note && <div className="text-xs text-muted">{entry.note}</div>}
        </>
      ) : (
        <div className="text-xs text-muted">Tidak ada di kamus soal ini.</div>
      )}
    </div>
  );
}
