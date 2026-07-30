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
        <h1 className="mb-1 text-xl font-semibold">Kuis Bahasa Jepang</h1>
        <p className="mb-6 text-sm text-muted">
          Load file JSON soal, atau paste JSON langsung. Kata bergaris
          putus-putus bisa di-hover, kanji/kata ber-kamus bisa diklik.
        </p>
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <label className="inline-block cursor-pointer rounded-lg border border-border bg-surface2 px-5 py-2.5 text-sm hover:border-accent">
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
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted">
              Atau paste JSON langsung di sini
            </summary>
            <textarea
              className="mt-2 w-full rounded-lg border border-border bg-surface2 p-3 font-mono text-xs"
              style={{ minHeight: 140 }}
              placeholder="Tempel isi JSON di sini..."
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
            />
            <button
              type="button"
              className="mt-2 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm hover:border-accent"
              onClick={handlePasteLoad}
            >
              Muat dari paste
            </button>
          </details>
        </div>

        <details className="mt-4 rounded-xl border border-dashed border-border p-4 text-left">
          <summary className="cursor-pointer text-sm text-muted">
            Belum punya soal? Bikin sendiri pakai AI
          </summary>
          <p className="mt-2 text-sm text-muted">
            Copy prompt di bawah, tempel ke ChatGPT/Claude/dll bareng materi
            yang mau dijadikan soal (kosakata, halaman buku, dsb). Hasil JSON
            dari AI tinggal paste ke kotak &quot;paste JSON langsung&quot; di
            atas, atau simpan sebagai file <code>.json</code> lalu load lewat
            tombol &quot;Pilih file JSON soal&quot;.
          </p>
          <textarea
            readOnly
            className="mt-2 w-full rounded-lg border border-border bg-surface2 p-3 font-mono text-xs"
            style={{ minHeight: 160 }}
            value={AI_PROMPT_TEMPLATE}
          />
          <button
            type="button"
            className="mt-2 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm hover:border-accent"
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
      <div className="py-4 text-center">
        <p className="mb-1 text-sm text-muted">Skor {quizData.title}</p>
        <p className="mb-6 text-4xl font-semibold">
          {score} / {gradable.length}
        </p>

        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto text-left">
          {wrongs.length === 0 ? (
            <p className="text-sm text-muted">
              Semua benar (di luar soal output bebas).
            </p>
          ) : (
            wrongs.map((r, idx) => (
              <div
                key={idx}
                className="flex gap-2.5 rounded-lg bg-surface2 p-3 text-sm"
              >
                <span className="shrink-0 text-red-400">&#10005;</span>
                <div>
                  <span className="text-muted">{r.tag}</span>
                  <br />
                  <span dangerouslySetInnerHTML={{ __html: r.promptHtml }} />
                  <br />
                  <span className="text-red-400">
                    Jawabanmu: {r.picked}
                  </span>{" "}
                  - <span className="text-green-400">Benar: {r.right}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {freeAnswers.length > 0 && (
          <>
            <p className="mb-2 mt-6 text-left text-sm text-muted">
              Jawaban output bebas (copy-paste ke chat/dosen buat dikoreksi):
            </p>
            <textarea
              readOnly
              className="w-full rounded-lg border border-border bg-surface2 p-3 text-sm"
              style={{ minHeight: 150 }}
              value={freeAnswers
                .map((r, i) => `${i + 1}. ${r.picked}`)
                .join("\n\n")}
            />
          </>
        )}

        <button
          type="button"
          className="mt-6 rounded-lg border border-border bg-surface2 px-5 py-2.5 text-sm hover:border-accent"
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
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Soal {currentIndex + 1} / {questions.length}
        </span>
        <span>Skor: {score}</span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(currentIndex / questions.length) * 100}%` }}
        />
      </div>

      {current.tag && (
        <span className="mb-3 inline-block rounded-md bg-[#2a3352] px-2.5 py-1 text-xs text-[#a9bdf7]">
          {current.tag}
        </span>
      )}

      <button
        type="button"
        className="mb-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm hover:border-accent"
        onClick={() => speakJapanese(current.promptHtml)}
      >
        &#128266; Dengar
      </button>

      <p
        ref={promptRef}
        className="mb-2 text-lg font-medium leading-loose"
        dangerouslySetInnerHTML={{ __html: current.promptHtml }}
      />

      {(promptHasJword || promptHasRuby || promptHasDw) && (
        <p className="-mt-2 mb-4 text-xs text-muted">
          {promptHasJword &&
            "Hover kata bergaris putus-putus untuk lihat artinya. "}
          {(promptHasRuby || promptHasDw) &&
            "Klik kata (kanji atau katakana) untuk lihat kamus singkat."}
        </p>
      )}

      {current.type === "mc" && (
        <div className="flex flex-col gap-2">
          {current.options.map((opt, i) => {
            let stateClasses = "border-border bg-surface hover:border-accent";
            if (answered) {
              if (i === current.answer)
                stateClasses =
                  "border-green-600 bg-green-950 text-green-400";
              else if (i === pickedOption)
                stateClasses = "border-red-600 bg-red-950 text-red-400";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                className={`rounded-lg border px-3.5 py-3 text-left text-sm ${stateClasses}`}
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
          <div className="mb-1.5 flex gap-2">
            <input
              type="text"
              disabled={answered}
              className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2.5 text-sm"
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
              className="rounded-lg border border-border bg-surface2 px-4 text-sm hover:border-accent disabled:opacity-40"
              onClick={handleSubmitShort}
            >
              Cek
            </button>
          </div>
          <div className="text-sm text-muted">
            {shortInput ? "-> " + toHiraganaSafe(shortInput) : ""}
          </div>
        </div>
      )}

      {current.type === "free" && (
        <div>
          <textarea
            className="w-full rounded-lg border border-border bg-surface2 p-3 text-sm"
            style={{ minHeight: 90 }}
            placeholder="Tulis jawabanmu bebas di sini (romaji/hiragana campur boleh)..."
            value={freeInput}
            onChange={(e) => setFreeInput(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">
            Soal ini tidak dinilai otomatis — jawaban bebas, dicek manual.
          </p>
        </div>
      )}

      {feedback && (
        <div className="mt-4 min-h-[20px] text-sm text-muted">{feedback}</div>
      )}

      <div className="mt-4 flex gap-2">
        {current.type === "free" ? (
          <button
            type="button"
            className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-sm hover:border-accent"
            onClick={handleSubmitFree}
          >
            {currentIndex === questions.length - 1 ? "Lihat hasil" : "Lanjut"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!answered}
            className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-sm hover:border-accent disabled:opacity-40"
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
