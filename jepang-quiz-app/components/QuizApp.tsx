"use client";

import { useEffect, useRef, useState } from "react";
import { toHiraganaSafe } from "@/lib/romaji";
import { speakJapanese } from "@/lib/tts";
import DictPopup from "@/components/DictPopup";
import type {
  QuizData,
  Question,
  AnsweredResult,
  DictEntry,
} from "@/types/quiz";

interface DictPopupState {
  word: string;
  entry: DictEntry | null;
  x: number;
  y: number;
}

const AI_PROMPT_TEMPLATE = `Buatkan saya file JSON soal kuis bahasa Jepang dari materi yang saya tempel di bawah. Ikuti skema ini PERSIS (hanya field ini, tanpa tambahan):

{
  "title": "string, judul kuis",
  "dictionary": {
    "kata": { "reading": "cara baca (opsional)", "meaning": "arti bahasa Indonesia (opsional)", "note": "catatan singkat (opsional)" }
  },
  "questions": [
    {
      "type": "mc",
      "tag": "label kategori (opsional)",
      "promptHtml": "kalimat soal, boleh pakai <ruby>漢字<rt>かんじ</rt></ruby> untuk furigana",
      "options": ["pilihan 1", "pilihan 2", "..."],
      "answer": 0,
      "explain": "penjelasan singkat kenapa jawaban itu benar"
    },
    {
      "type": "short",
      "tag": "...",
      "promptHtml": "...",
      "accepted": ["jawaban benar dalam hiragana/kanji"],
      "acceptedRomaji": ["alternatif dalam romaji, opsional"],
      "explain": "..."
    },
    {
      "type": "free",
      "tag": "...",
      "promptHtml": "instruksi soal output bebas (menulis kalimat sendiri)",
      "note": "catatan opsional"
    }
  ]
}

Aturan:
- "answer" pada tipe "mc" adalah INDEX (mulai dari 0) dari array "options", bukan teks jawabannya.
- Buat campuran ketiga tipe soal (mc, short, free) secukupnya sesuai materi, jangan cuma satu tipe.
- Isi "dictionary" untuk kata/kanji yang dipakai di "promptHtml" supaya bisa diklik untuk lihat arti.
- Balas HANYA dengan JSON valid (tanpa markdown code fence, tanpa penjelasan tambahan), supaya bisa langsung saya paste ke aplikasi kuis.

Materi soalnya:
[TEMPEL MATERI/TEKS/KOSAKATA KAMU DI SINI]`;

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
const card = "rounded-2xl border border-border bg-surface p-6";

export default function QuizApp() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<AnsweredResult[]>([]);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [shortInput, setShortInput] = useState("");
  const [freeInput, setFreeInput] = useState("");
  const [pastedJson, setPastedJson] = useState("");
  const [loadError, setLoadError] = useState("");
  const [dictPopup, setDictPopup] = useState<DictPopupState | null>(null);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  }

  const promptRef = useRef<HTMLParagraphElement>(null);

  const questions: Question[] = quizData?.questions ?? [];
  const current: Question | undefined = questions[currentIndex];
  const isFinished = quizData !== null && currentIndex >= questions.length;

  function resetPlaybackState() {
    setCurrentIndex(0);
    setScore(0);
    setResults([]);
    setAnswered(false);
    setFeedback("");
    setShortInput("");
    setFreeInput("");
    setPickedOption(null);
  }

  function loadQuiz(data: QuizData) {
    setQuizData(data);
    resetPlaybackState();
    setLoadError("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        loadQuiz(data);
      } catch (err) {
        setLoadError("Gagal baca file JSON: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  function handlePasteLoad() {
    try {
      const data = JSON.parse(pastedJson);
      loadQuiz(data);
    } catch (err) {
      setLoadError("Gagal baca JSON yang dipaste: " + (err as Error).message);
    }
  }

  // Bind klik kamus ke elemen <ruby> dan <span class="dw"> tiap kali
  // promptHtml baru dirender (karena dangerouslySetInnerHTML tidak
  // otomatis di-handle React events).
  useEffect(() => {
    const container = promptRef.current;
    if (!container || !current) return;

    const dictionary = quizData?.dictionary ?? {};

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

  function lockAndScore(correct: boolean, picked: string, right: string) {
    if (!current) return;
    if (correct) setScore((s) => s + 1);
    setResults((r) => [
      ...r,
      {
        tag: current.tag ?? "",
        promptHtml: current.promptHtml,
        correct,
        picked,
        right,
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
  }

  function loadAnother() {
    setQuizData(null);
    setLoadError("");
  }

  // ---------- Layar loader (belum ada kuis dimuat) ----------
  if (!quizData) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Kuis Bahasa Jepang
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted">
          Load file JSON soal, atau paste JSON langsung. Kata bergaris
          putus-putus bisa di-hover, kanji/kata ber-kamus bisa diklik.
        </p>

        <div className={`${card} text-center`}>
          <label className={`${primaryBtn} inline-block cursor-pointer`}>
            Pilih file JSON soal
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <p className="mt-3 text-sm text-muted">
            {loadError || "Belum ada file dimuat."}
          </p>
          <details className="group mt-5 text-left">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted transition-colors hover:text-fg">
              <span className="mr-1 inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              Atau paste JSON langsung di sini
            </summary>
            <textarea
              className="mt-3 w-full rounded-lg border border-border bg-surface2 p-3 font-mono text-xs leading-relaxed text-fg placeholder:text-muted"
              style={{ minHeight: 140 }}
              placeholder="Tempel isi JSON di sini..."
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
            />
            <button
              type="button"
              className={`${secondaryBtn} mt-3`}
              onClick={handlePasteLoad}
            >
              Muat dari paste
            </button>
          </details>
        </div>

        <details className={`${card} group mt-4 text-left`}>
          <summary className="cursor-pointer list-none text-sm font-medium text-muted transition-colors hover:text-fg">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90">
              ▸
            </span>
            Belum punya soal? Bikin sendiri pakai AI
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Copy prompt di bawah, tempel ke ChatGPT/Claude/dll bareng materi
            yang mau dijadikan soal (kosakata, halaman buku, dsb). Hasil JSON
            dari AI tinggal paste ke kotak &quot;paste JSON langsung&quot; di
            atas, atau simpan sebagai file <code>.json</code> lalu load lewat
            tombol &quot;Pilih file JSON soal&quot;.
          </p>
          <textarea
            readOnly
            className="mt-3 w-full rounded-lg border border-border bg-surface2 p-3 font-mono text-xs leading-relaxed text-fg"
            style={{ minHeight: 160 }}
            value={AI_PROMPT_TEMPLATE}
          />
          <button
            type="button"
            className={`${secondaryBtn} mt-3`}
            onClick={handleCopyPrompt}
          >
            {promptCopied ? "Tersalin!" : "Copy prompt"}
          </button>
        </details>
      </div>
    );
  }

  // ---------- Layar ringkasan hasil ----------
  if (isFinished) {
    const gradable = results.filter((r) => !r.isFree);
    const wrongs = results.filter((r) => !r.correct);
    const freeAnswers = results.filter((r) => r.isFree);

    return (
      <div className="text-center">
        <p className="mb-1 text-sm text-muted">Skor {quizData.title}</p>
        <p className="mb-8 text-5xl font-semibold tracking-tight">
          {score}
          <span className="text-2xl font-normal text-muted">
            {" "}
            / {gradable.length}
          </span>
        </p>

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
                    <span className="text-danger">Jawabanmu: {r.picked}</span>
                    <span className="text-muted"> · </span>
                    <span className="text-success">Benar: {r.right}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

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

        <button
          type="button"
          className={`${primaryBtn} mt-8`}
          onClick={loadAnother}
        >
          Muat file lain
        </button>
      </div>
    );
  }

  // ---------- Layar soal aktif ----------
  if (!current) return null;

  const promptHasJword = current.promptHtml.includes("jword");
  const promptHasRuby = current.promptHtml.includes("<ruby");
  const promptHasDw = current.promptHtml.includes('class="dw"');

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span>
          Soal {currentIndex + 1} / {questions.length}
        </span>
        <span>Skor: {score}</span>
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
        <button
          type="button"
          className={`${secondaryBtn} ml-auto flex items-center gap-1.5 !px-3 !py-1.5`}
          onClick={() => speakJapanese(current.promptHtml)}
          aria-label="Dengar pengucapan soal"
        >
          <SpeakerIcon />
          Dengar
        </button>
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

      {current.type === "mc" && (
        <div className="flex flex-col gap-2">
          {current.options.map((opt, i) => {
            let stateClasses =
              "border-border bg-surface hover:border-accent/60 hover:bg-surface2";
            if (answered) {
              if (i === current.answer)
                stateClasses = "border-success/40 bg-success/10 text-success";
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

      <div className="mt-5 flex gap-2">
        {current.type === "free" ? (
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
