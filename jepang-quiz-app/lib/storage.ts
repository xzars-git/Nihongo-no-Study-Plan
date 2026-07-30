import type { QuizData } from "@/types/quiz";
import { hashString } from "@/lib/hash";

export interface StoredDeck {
  id: string;
  title: string;
  savedAt: number;
  quizData: QuizData;
}

const DECKS_KEY = "jqa:decks";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function deckIdFor(quizData: QuizData): string {
  return hashString(quizData.title + ":" + quizData.questions.length);
}

export function listDecks(): StoredDeck[] {
  return readJson<StoredDeck[]>(DECKS_KEY, []).sort(
    (a, b) => b.savedAt - a.savedAt
  );
}

export function saveDeck(quizData: QuizData): StoredDeck {
  const id = deckIdFor(quizData);
  const decks = readJson<StoredDeck[]>(DECKS_KEY, []);
  const existing = decks.find((d) => d.id === id);
  const deck: StoredDeck = {
    id,
    title: quizData.title,
    savedAt: existing?.savedAt ?? Date.now(),
    quizData,
  };
  const next = [...decks.filter((d) => d.id !== id), deck];
  writeJson(DECKS_KEY, next);
  return deck;
}

export function deleteDeck(id: string) {
  const decks = readJson<StoredDeck[]>(DECKS_KEY, []);
  writeJson(
    DECKS_KEY,
    decks.filter((d) => d.id !== id)
  );
}

// ---------- Backup / restore ----------
//
// Everything the app writes lives under the "jqa:" localStorage prefix
// (decks, per-deck SRS state, per-deck last-wrong list, global activity
// log). Bundling all of it into one downloadable JSON file is the closest
// local-only equivalent to what paid tools offer as "cloud sync" — it lets
// progress survive a browser reset or move to another device/browser.

const BACKUP_PREFIX = "jqa:";

export interface BackupFile {
  version: 1;
  exportedAt: number;
  data: Record<string, unknown>;
}

export function exportBackup(): BackupFile {
  const data: Record<string, unknown> = {};
  if (typeof window !== "undefined") {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(BACKUP_PREFIX)) continue;
      try {
        data[key] = JSON.parse(window.localStorage.getItem(key) as string);
      } catch {
        // skip unreadable entries rather than failing the whole export
      }
    }
  }
  return { version: 1, exportedAt: Date.now(), data };
}

export function importBackup(file: BackupFile): void {
  if (typeof window === "undefined" || !file?.data) return;
  for (const [key, value] of Object.entries(file.data)) {
    if (!key.startsWith(BACKUP_PREFIX)) continue;
    writeJson(key, value);
  }
}
