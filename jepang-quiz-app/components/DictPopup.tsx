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
      className="fixed z-50 max-w-[280px] rounded-xl border border-border bg-surface2 p-4 text-sm shadow-xl shadow-black/40"
      style={{ left, top: y + 12 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
        onClick={onClose}
        aria-label="Tutup"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
      <div className="mb-1 pr-6 text-base font-semibold text-fg">{word}</div>
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
