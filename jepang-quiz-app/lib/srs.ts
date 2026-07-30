import type { Question } from "@/types/quiz";
import { hashString } from "@/lib/hash";

export interface CardState {
  reps: number;
  lapses: number;
  streakToday: number;
  lastDay: string;
  dueAt: number;
  totalSeen: number;
  totalCorrect: number;
}

export type SessionMode = "all" | "due" | "wrong" | "learn";

// Graduated review ladder in days, matched to Metode_Make_It_Stick.md's
// "sudah benar 2x berturut -> istirahatkan, baru muncul lagi hari lain" rule.
const INTERVALS_DAYS = [1, 3, 7, 14, 30, 90];
const ONE_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_SIZE = 40; // dosage guidance: 30-50 soal/sesi

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function questionId(q: Question): string {
  const parts =
    q.type === "mc"
      ? [q.type, q.promptHtml, q.options.join("|")]
      : q.type === "short"
      ? [q.type, q.promptHtml, q.accepted.join("|")]
      : [q.type, q.promptHtml];
  return hashString(parts.join("::"));
}

function srsKey(deckId: string) {
  return `jqa:srs:${deckId}`;
}

function wrongKey(deckId: string) {
  return `jqa:lastwrong:${deckId}`;
}

function getCards(deckId: string): Record<string, CardState> {
  return readJson(srsKey(deckId), {} as Record<string, CardState>);
}

function isDue(card: CardState | undefined, now: number): boolean {
  if (!card) return true;
  return card.dueAt <= now;
}

export function recordResult(
  deckId: string,
  qId: string,
  correct: boolean
): void {
  const cards = getCards(deckId);
  const now = Date.now();
  const today = todayStr();
  const prev = cards[qId];
  const streakToday = prev?.lastDay === today ? prev.streakToday : 0;

  let next: CardState;
  if (correct) {
    const newStreak = streakToday + 1;
    const totalSeen = (prev?.totalSeen ?? 0) + 1;
    const totalCorrect = (prev?.totalCorrect ?? 0) + 1;
    if (newStreak >= 2) {
      const reps = (prev?.reps ?? 0) + 1;
      const interval = INTERVALS_DAYS[Math.min(reps - 1, INTERVALS_DAYS.length - 1)];
      next = {
        reps,
        lapses: prev?.lapses ?? 0,
        streakToday: newStreak,
        lastDay: today,
        dueAt: now + interval * ONE_DAY,
        totalSeen,
        totalCorrect,
      };
    } else {
      next = {
        reps: prev?.reps ?? 0,
        lapses: prev?.lapses ?? 0,
        streakToday: newStreak,
        lastDay: today,
        dueAt: now + ONE_DAY,
        totalSeen,
        totalCorrect,
      };
    }
  } else {
    next = {
      reps: Math.max(0, (prev?.reps ?? 0) - 1),
      lapses: (prev?.lapses ?? 0) + 1,
      streakToday: 0,
      lastDay: today,
      dueAt: now,
      totalSeen: (prev?.totalSeen ?? 0) + 1,
      totalCorrect: prev?.totalCorrect ?? 0,
    };
  }
  cards[qId] = next;
  writeJson(srsKey(deckId), cards);
  bumpActivity(today);
}

export function setLastWrong(deckId: string, ids: string[]): void {
  writeJson(wrongKey(deckId), ids);
}

export function getLastWrong(deckId: string): string[] {
  return readJson(wrongKey(deckId), [] as string[]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildSession(
  deckId: string,
  questions: Question[],
  mode: SessionMode,
  sizeCap: number = DEFAULT_SESSION_SIZE
): Question[] {
  const cards = getCards(deckId);
  const now = Date.now();

  let pool: Question[];
  if (mode === "wrong") {
    const wrongIds = new Set(getLastWrong(deckId));
    pool = questions.filter((q) => wrongIds.has(questionId(q)));
  } else if (mode === "due") {
    pool = questions.filter((q) => isDue(cards[questionId(q)], now));
  } else {
    pool = questions;
  }

  const shuffled = shuffle(pool);
  return sizeCap > 0 ? shuffled.slice(0, sizeCap) : shuffled;
}

function plainTextPreview(promptHtml: string, max: number = 60): string {
  const text = promptHtml.replace(/<[^>]+>/g, "").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export interface WeakItem {
  id: string;
  preview: string;
  totalSeen: number;
  totalCorrect: number;
  lapses: number;
}

export interface DeckStats {
  totalCards: number;
  dueCount: number;
  seenCount: number;
  accuracy: number | null;
  weakest: WeakItem[];
}

export function getDeckStats(deckId: string, questions: Question[]): DeckStats {
  const cards = getCards(deckId);
  const now = Date.now();
  let dueCount = 0;
  let seenCount = 0;
  let totalSeen = 0;
  let totalCorrect = 0;
  const withStats: WeakItem[] = [];

  for (const q of questions) {
    const id = questionId(q);
    const card = cards[id];
    if (isDue(card, now)) dueCount++;
    if (card) {
      seenCount++;
      totalSeen += card.totalSeen;
      totalCorrect += card.totalCorrect;
      withStats.push({
        id,
        preview: plainTextPreview(q.promptHtml),
        totalSeen: card.totalSeen,
        totalCorrect: card.totalCorrect,
        lapses: card.lapses,
      });
    }
  }

  withStats.sort((a, b) => {
    const rateA = a.totalCorrect / a.totalSeen;
    const rateB = b.totalCorrect / b.totalSeen;
    return b.lapses - a.lapses || rateA - rateB;
  });

  return {
    totalCards: questions.length,
    dueCount,
    seenCount,
    accuracy: totalSeen > 0 ? totalCorrect / totalSeen : null,
    weakest: withStats.filter((w) => w.lapses > 0).slice(0, 5),
  };
}

// ---------- Global activity log (streak + heatmap) ----------

const ACTIVITY_KEY = "jqa:activity";

function bumpActivity(day: string) {
  const activity = readJson(ACTIVITY_KEY, {} as Record<string, number>);
  activity[day] = (activity[day] ?? 0) + 1;
  writeJson(ACTIVITY_KEY, activity);
}

// Public entry point for modes that don't call recordResult (e.g. "learn",
// which deliberately never scores) but should still count as a study day —
// the streak/heatmap is meant to reflect real engagement, not just grading.
export function logStudyActivity(): void {
  bumpActivity(todayStr());
}

export function getActivity(): Record<string, number> {
  return readJson(ACTIVITY_KEY, {} as Record<string, number>);
}

export function getCurrentStreak(): number {
  const activity = getActivity();
  let streak = 0;
  const cursor = new Date();
  // Today counts even if not yet studied, so the streak doesn't visually
  // break before the day is over; it only requires yesterday onward.
  if (!activity[todayStr()]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!activity[key]) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
