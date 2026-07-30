"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QuizData } from "@/types/quiz";
import type { SessionMode } from "@/lib/srs";
import { getDeckStats, getActivity, getCurrentStreak } from "@/lib/srs";
import {
  listDecks,
  saveDeck,
  deleteDeck,
  exportBackup,
  importBackup,
  type StoredDeck,
  type BackupFile,
} from "@/lib/storage";
import QuizLoader from "@/components/QuizLoader";

const primaryBtn =
  "rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40";
const secondaryBtn =
  "cursor-pointer rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-fg transition-colors hover:border-accent/60 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40";
const card = "rounded-2xl border border-border bg-surface p-5";

// Sequential single-hue (blue) ramp, dark-surface variant: lighter step =
// more activity, per dataviz skill guidance (references/palette.md).
const HEAT_LEVELS = ["#1c1c1f", "#184f95", "#256abf", "#3987e5", "#86b6ef"];

function heatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count < 10) return 1;
  if (count < 25) return 2;
  if (count < 50) return 3;
  return 4;
}

function ActivityHeatmap() {
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setActivity(getActivity());
    setStreak(getCurrentStreak());
  }, []);

  const days = useMemo(() => {
    const arr: { date: string; count: number }[] = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 69);
    for (let i = 0; i < 70; i++) {
      const key = cursor.toISOString().slice(0, 10);
      arr.push({ date: key, count: activity[key] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return arr;
  }, [activity]);

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className={card}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-fg">Aktivitas belajar</h2>
        <span className="text-sm text-muted">
          🔥 {streak} hari beruntun
        </span>
      </div>
      <div
        className="flex gap-1 overflow-x-auto"
        role="img"
        aria-label={`Aktivitas belajar 70 hari terakhir, streak saat ini ${streak} hari`}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} jawaban`}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: HEAT_LEVELS[heatLevel(d.count)] }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DeckCardProps {
  deck: StoredDeck;
  onStart: (deck: StoredDeck, mode: SessionMode) => void;
  onDelete: (id: string) => void;
}

function DeckCard({ deck, onStart, onDelete }: DeckCardProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = useMemo(
    () => getDeckStats(deck.id, deck.quizData.questions),
    [deck]
  );

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-fg">{deck.title}</h3>
          <p className="mt-1 text-xs text-muted">
            {stats.totalCards} soal
            {stats.accuracy !== null &&
              ` · akurasi ${Math.round(stats.accuracy * 100)}%`}
            {stats.dueCount > 0 && (
              <span className="text-accent"> · {stats.dueCount} perlu direview</span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 cursor-pointer text-xs text-muted hover:text-danger"
          onClick={() => {
            if (
              window.confirm(
                `Hapus deck "${deck.title}"? Riwayat spaced repetition-nya juga ikut terhapus dan tidak bisa dibatalkan.`
              )
            ) {
              onDelete(deck.id);
            }
          }}
        >
          Hapus
        </button>
      </div>

      {stats.weakest.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted">Paling sering keliru:</p>
          <ul className="mt-1 space-y-0.5">
            {stats.weakest.map((w) => (
              <li key={w.id} className="truncate text-xs text-muted">
                · {w.preview}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!expanded ? (
        <button
          type="button"
          className={`${primaryBtn} mt-4 w-full`}
          onClick={() => setExpanded(true)}
        >
          Mulai belajar
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => onStart(deck, "due")}
            disabled={stats.dueCount === 0}
          >
            Perlu direview ({stats.dueCount})
          </button>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => onStart(deck, "all")}
          >
            Semua soal
          </button>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => onStart(deck, "learn")}
          >
            Pelajari (tanpa skor)
          </button>
          <button
            type="button"
            className="cursor-pointer text-xs text-muted hover:text-fg"
            onClick={() => setExpanded(false)}
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}

function BackupControls({ onRestored }: { onRestored: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  function handleExport() {
    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kuis-bahasa-jepang-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string) as BackupFile;
        importBackup(data);
        setMessage("Backup berhasil dipulihkan.");
        onRestored();
      } catch (err) {
        setMessage("Gagal baca file backup: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <details className={`${card} group mt-4 text-left`}>
      <summary className="cursor-pointer list-none text-sm font-medium text-muted transition-colors hover:text-fg">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        Backup / pindahkan progres
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Semua deck dan riwayat spaced repetition hanya tersimpan di browser
        ini. Export ke file untuk cadangan, atau pindahkan ke
        browser/perangkat lain lewat Import.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondaryBtn} onClick={handleExport}>
          Export backup
        </button>
        <button
          type="button"
          className={secondaryBtn}
          onClick={() => fileRef.current?.click()}
        >
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}
    </details>
  );
}

interface LibraryProps {
  onStart: (deck: StoredDeck, mode: SessionMode) => void;
}

export default function Library({ onStart }: LibraryProps) {
  const [decks, setDecks] = useState<StoredDeck[]>([]);
  const [adding, setAdding] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDecks(listDecks());
    setHydrated(true);
  }, []);

  function handleLoad(quizData: QuizData) {
    const deck = saveDeck(quizData);
    setDecks(listDecks());
    setAdding(false);
    onStart(deck, "all");
  }

  function handleDelete(id: string) {
    deleteDeck(id);
    setDecks(listDecks());
  }

  if (!hydrated) return null;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Kuis Bahasa Jepang
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Deck kuismu tersimpan otomatis di browser ini — tidak perlu upload
        ulang tiap sesi. Semuanya berjalan lokal, tanpa akun, tanpa server.
      </p>

      <div className="mb-6">
        <ActivityHeatmap />
      </div>

      {decks.length === 0 && !adding && (
        <p className="mb-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Belum ada deck. Tambahkan kuis pertamamu di bawah.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3">
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onStart={onStart}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {adding ? (
        <QuizLoader onLoad={handleLoad} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          className={`${secondaryBtn} w-full`}
          onClick={() => setAdding(true)}
        >
          + Tambah kuis baru
        </button>
      )}

      <BackupControls onRestored={() => setDecks(listDecks())} />
    </div>
  );
}
