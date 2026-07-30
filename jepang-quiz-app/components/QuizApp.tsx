"use client";

import { useEffect, useRef, useState } from "react";
import { toHiraganaSafe } from "@/lib/romaji";
import { speakJapanese } from "@/lib/tts";
import {
  questionId,
  recordResult,
  setLastWrong,
  logStudyActivity,
  type SessionMode,
} from "@/lib/srs";
import DictPopup from "@/components/DictPopup";
import type { QuizData, Question, AnsweredResult, DictEntry } from "@/types/quiz";

interface DictPopupState {
  word: string;
  entry: DictEntry | null;
  x: number;
  y: number;
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

const primaryBtn =
  "rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40";
const secondaryBtn =
  "cursor-pointer rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-accent/60 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40";

const MODE_LABEL: Record<SessionMode, string> = {
  all: "Semua soal",
  due: "Perlu direview",
  wrong: "Ulangi yang salah",
  learn: "Pelajari (tanpa skor)",
};

interface QuizAppProps {
  quizData: QuizData;
  sessionQuestions: Question[];
  deckId: string;
  mode: SessionMode;
  onExit: () => void;
  onRetryWrong: () => void;
}

export default function QuizApp({
  quizData,
  sessionQuestions,
  deckId,
  mode,
  onExit,
  onRetryWrong,
}: QuizAppProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<AnsweredResult[]>([]);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [shortInput, setShortInput] = useState("");
  const [freeInput, setFreeInput] = useState("");
  const [dictPopup, setDictPopup] = useState<DictPopupState | null>(null);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [hideFurigana, setHideFurigana] = useState(false);
  const [revealed, setRevealed] = useState(false); // "learn" mode reveal state

  const promptRef = useRef<HTMLParagraphElement>(null);
  const finishedRef = useRef(false);

  const questions = sessionQuestions;
  const current: Question | undefined = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const isLearnMode = mode === "learn";

  // Bind klik kamus ke elemen <ruby> dan <span class="dw"> tiap kali
  // promptHtml baru dirender (karena dangerouslySetInnerHTML tidak
  // otomatis di-handle React events).
  useEffect(() => {
    const container = promptRef.current;
    if (!container || !current) return;

    const dictionary = quizData.dictionary ?? {};

    function openPopup(word: string, x: number, y: number) {
      setDictPopup({ word, entry: dictionary[word] ?? null, x, y });
    }

    const rubies = container.querySelectorAll("ruby");
    const cleanups: Array<() => void> = [];

    rubies.forEach((rb) => {
      rb.classList.add("dictword");
      let baseText = "";
      rb.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) baseText += node.textContent;
      });
      baseText = baseText.trim();
      const handler = (e: Event) => {
        e.stopPropagation();
        const me = e as MouseEvent;
        openPopup(baseText, me.clientX, me.clientY);
      };
      rb.addEventListener("click", handler);
      cleanups.push(() => rb.removeEventListener("click", handler));
    });

    const plainWords = container.querySelectorAll("span.dw");
    plainWords.forEach((sp) => {
      const word = sp.textContent?.trim() ?? "";
      const handler = (e: Event) => {
        e.stopPropagation();
        const me = e as MouseEvent;
        openPopup(word, me.clientX, me.clientY);
      };
      sp.addEventListener("click", handler);
      cleanups.push(() => sp.removeEventListener("click", handler));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [current, currentIndex, quizData]);

  // Tutup popup kamus kalau klik di luar area popup/kata.
  useEffect(() => {
    if (!dictPopup) return;
    const handleOutsideClick = () => setDictPopup(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [dictPopup]);

  // Keyboard shortcuts: 1-9 pilih opsi MC, Enter lanjut. Dinonaktifkan saat
  // fokus di input/textarea supaya tidak bentrok dengan mengetik jawaban.
  useEffect(() => {
    if (!current || isFinished) return;
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (
        current!.type === "mc" &&
        !answered &&
        !isTyping &&
        /^[1-9]$/.test(e.key)
      ) {
        const i = Number(e.key) - 1;
        if (i < current!.options.length) handleSelectOption(i);
        return;
      }
      if (e.key === "Enter" && !isTyping) {
        if (isLearnMode) {
          if (!revealed) setRevealed(true);
          else goNext();
        } else if (current!.type === "free") {
          handleSubmitFree();
        } else if (answered) {
          goNext();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, answered, isFinished, revealed, isLearnMode]);

  // Simpan hasil sesi ke SRS + daftar salah begitu sesi selesai. Mode
  // "learn" tidak menilai (jadi tidak lewat recordResult sama sekali),
  // tapi tetap dihitung sebagai aktivitas belajar hari itu untuk
  // streak/heatmap — exposure tanpa skor tetaplah belajar.
  useEffect(() => {
    if (!isFinished || finishedRef.current) return;
    finishedRef.current = true;
    if (isLearnMode) {
      logStudyActivity();
      return;
    }
    const wrongIds = results
      .filter((r) => !r.correct && !r.isFree)
      .map((r) => r.qId);
    setLastWrong(deckId, wrongIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  function lockAndScore(correct: boolean, picked: string, right: string) {
    if (!current) return;
    const qId = questionId(current);
    if (!isLearnMode) recordResult(deckId, qId, correct);
    if (correct) setScore((s) => s + 1);
    setResults((r) => [
      ...r,
      {
        tag: current.tag ?? "",
        promptHtml: current.promptHtml,
        correct,
        picked,
        right,
        qId,
      },
    ]);
    if ("explain" in current) setFeedback(current.explain ?? "");
    setAnswered(true);
  }

  function handleSelectOption(i: number) {
    if (!current || current.type !== "mc" || answered) return;
    setPickedOption(i);
    const correct = i === current.answer;
    lockAndScore(correct, current.options[i], current.options[current.answer]);
  }

  function handleSubmitShort() {
    if (!current || current.type !== "short" || answered) return;
    const raw = shortInput.trim().toLowerCase();
    const converted = toHiraganaSafe(shortInput).trim();
    const hiraganaMatch = current.accepted.some(
      (a) => a.trim() === converted || a.trim().toLowerCase() === raw
    );
    const romajiMatch = (current.acceptedRomaji ?? []).some(
      (r) => r.toLowerCase() === raw
    );
    const correct = hiraganaMatch || romajiMatch;
    lockAndScore(
      correct,
      (shortInput || "(kosong)") + (converted ? ` (${converted})` : ""),
      current.accepted[0] ?? ""
    );
  }

  function handleSubmitFree() {
    if (!current || current.type !== "free") return;
    setResults((r) => [
      ...r,
      {
        tag: current.tag ?? "",
        promptHtml: current.promptHtml,
        correct: true,
        picked: freeInput,
        right: "(output bebas)",
        isFree: true,
        qId: questionId(current),
      },
    ]);
    goNext();
  }

  function goNext() {
    setCurrentIndex((i) => i + 1);
    setAnswered(false);
    setFeedback("");
    setShortInput("");
    setFreeInput("");
    setPickedOption(null);
    setRevealed(false);
  }

  // ---------- Layar ringkasan hasil ----------
  if (isFinished) {
    const gradable = results.filter((r) => !r.isFree);
    const wrongs = results.filter((r) => !r.correct);
    const freeAnswers = results.filter((r) => r.isFree);

    return (
      <div className="text-center">
        <p className="mb-1 text-sm text-muted">
          Skor {quizData.title} · {MODE_LABEL[mode]}
        </p>
        {!isLearnMode && (
          <p className="mb-8 text-5xl font-semibold tracking-tight">
            {score}
            <span className="text-2xl font-normal text-muted">
              {" "}
              / {gradable.length}
            </span>
          </p>
        )}

        {!isLearnMode && (
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto text-left">
            {wrongs.length === 0 ? (
              <p className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckIcon />
                </span>
                Semua benar (di luar soal output bebas).
              </p>
            ) : (
              wrongs.map((r, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
                    <CrossIcon />
                  </span>
                  <div className="min-w-0">
                    {r.tag && (
                      <span className="text-xs font-medium text-muted">
                        {r.tag}
                      </span>
                    )}
                    <p
                      className="mt-0.5 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: r.promptHtml }}
                    />
                    <p className="mt-1.5 text-sm">
                      <span className="text-danger">
                        Jawabanmu: {r.picked}
                      </span>
                      <span className="text-muted"> · </span>
                      <span className="text-success">Benar: {r.right}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {freeAnswers.length > 0 && (
          <>
            <p className="mb-2 mt-8 text-left text-sm font-medium text-muted">
              Jawaban output bebas (copy-paste ke chat/dosen buat dikoreksi):
            </p>
            <textarea
              readOnly
              className="w-full rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed text-fg"
              style={{ minHeight: 150 }}
              value={freeAnswers
                .map((r, i) => `${i + 1}. ${r.picked}`)
                .join("\n\n")}
            />
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {!isLearnMode && wrongs.length > 0 && (
            <button
              type="button"
              className={secondaryBtn}
              onClick={onRetryWrong}
            >
              Ulangi yang salah ({wrongs.length})
            </button>
          )}
          <button type="button" className={primaryBtn} onClick={onExit}>
            Kembali ke daftar kuis
          </button>
        </div>
      </div>
    );
  }

  // ---------- Layar soal aktif ----------
  if (!current) return null;

  const promptHasJword = current.promptHtml.includes("jword");
  const promptHasRuby = current.promptHtml.includes("<ruby");
  const promptHasDw = current.promptHtml.includes('class="dw"');

  return (
    <div className={hideFurigana ? "hide-furigana" : undefined}>
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <button
          type="button"
          className="cursor-pointer hover:text-fg"
          onClick={onExit}
        >
          ← Keluar
        </button>
        <span>
          {isLearnMode
            ? `Kartu ${currentIndex + 1} / ${questions.length}`
            : `Soal ${currentIndex + 1} / ${questions.length} · Skor: ${score}`}
        </span>
      </div>
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${(currentIndex / questions.length) * 100}%` }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {current.tag && (
          <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {current.tag}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className={`${secondaryBtn} !px-3 !py-1.5`}
            onClick={() => setHideFurigana((v) => !v)}
            title="Sembunyikan/tampilkan furigana"
          >
            {hideFurigana ? "Tampilkan furigana" : "Sembunyikan furigana"}
          </button>
          <button
            type="button"
            className={`${secondaryBtn} flex items-center gap-1.5 !px-3 !py-1.5`}
            onClick={() => speakJapanese(current.promptHtml)}
            aria-label="Dengar pengucapan soal"
          >
            <SpeakerIcon />
            Dengar
          </button>
        </div>
      </div>

      <p
        ref={promptRef}
        className="mb-2 text-lg font-medium leading-loose"
        dangerouslySetInnerHTML={{ __html: current.promptHtml }}
      />

      {(promptHasJword || promptHasRuby || promptHasDw) && (
        <p className="-mt-1 mb-5 text-xs text-muted">
          {promptHasJword &&
            "Hover kata bergaris putus-putus untuk lihat artinya. "}
          {(promptHasRuby || promptHasDw) &&
            "Klik kata (kanji atau katakana) untuk lihat kamus singkat."}
        </p>
      )}

      {isLearnMode ? (
        <div>
          {!revealed ? (
            <button
              type="button"
              className={`${primaryBtn} w-full`}
              onClick={() => setRevealed(true)}
            >
              Lihat jawaban / penjelasan
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-surface2 p-3.5 text-sm leading-relaxed text-fg">
              {current.type === "mc" && (
                <p className="mb-1 text-success">
                  Jawaban: {current.options[current.answer]}
                </p>
              )}
              {current.type === "short" && (
                <p className="mb-1 text-success">
                  Jawaban: {current.accepted[0]}
                </p>
              )}
              {"explain" in current && current.explain && (
                <p className="text-muted">{current.explain}</p>
              )}
              {current.type === "free" && "note" in current && current.note && (
                <p className="text-muted">{current.note}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {current.type === "mc" && (
            <div className="flex flex-col gap-2">
              {current.options.map((opt, i) => {
                let stateClasses =
                  "border-border bg-surface hover:border-accent/60 hover:bg-surface2";
                if (answered) {
                  if (i === current.answer)
                    stateClasses =
                      "border-success/40 bg-success/10 text-success";
                  else if (i === pickedOption)
                    stateClasses = "border-danger/40 bg-danger/10 text-danger";
                  else stateClasses = "border-border bg-surface opacity-60";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={answered}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed ${stateClasses}`}
                    onClick={() => handleSelectOption(i)}
                  >
                    <span className="mr-2 text-muted">{i + 1}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "short" && (
            <div>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  disabled={answered}
                  className="flex-1 rounded-lg border border-border bg-surface2 px-3.5 py-3 text-sm text-fg placeholder:text-muted disabled:opacity-60"
                  placeholder="Ketik romaji atau hiragana"
                  value={shortInput}
                  onChange={(e) => setShortInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitShort();
                  }}
                />
                <button
                  type="button"
                  disabled={answered}
                  className={secondaryBtn}
                  onClick={handleSubmitShort}
                >
                  Cek
                </button>
              </div>
              <div className="text-sm text-muted">
                {shortInput ? "→ " + toHiraganaSafe(shortInput) : ""}
              </div>
            </div>
          )}

          {current.type === "free" && (
            <div>
              <textarea
                className="w-full rounded-lg border border-border bg-surface2 p-3.5 text-sm text-fg placeholder:text-muted"
                style={{ minHeight: 90 }}
                placeholder="Tulis jawabanmu bebas di sini (romaji/hiragana campur boleh)..."
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted">
                Soal ini tidak dinilai otomatis — jawaban bebas, dicek manual.
              </p>
            </div>
          )}

          {feedback && (
            <div className="mt-4 rounded-lg border border-border bg-surface2 p-3.5 text-sm leading-relaxed text-muted">
              {feedback}
            </div>
          )}
        </>
      )}

      <div className="mt-5 flex gap-2">
        {isLearnMode ? (
          <button
            type="button"
            className={`${primaryBtn} flex-1`}
            disabled={!revealed}
            onClick={goNext}
          >
            {currentIndex === questions.length - 1 ? "Selesai" : "Lanjut"}
          </button>
        ) : current.type === "free" ? (
          <button
            type="button"
            className={`${primaryBtn} flex-1`}
            onClick={handleSubmitFree}
          >
            {currentIndex === questions.length - 1 ? "Lihat hasil" : "Lanjut"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!answered}
            className={`${primaryBtn} flex-1`}
            onClick={goNext}
          >
            {currentIndex === questions.length - 1 ? "Lihat hasil" : "Lanjut"}
          </button>
        )}
      </div>

      {dictPopup && (
        <DictPopup
          word={dictPopup.word}
          entry={dictPopup.entry}
          x={dictPopup.x}
          y={dictPopup.y}
          onClose={() => setDictPopup(null)}
        />
      )}
    </div>
  );
}
