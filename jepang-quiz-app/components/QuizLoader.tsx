"use client";

import { useState } from "react";
import type { QuizData } from "@/types/quiz";

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

const primaryBtn =
  "rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40";
const secondaryBtn =
  "cursor-pointer rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-accent/60 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40";
const card = "rounded-2xl border border-border bg-surface p-6";

// Guard rail terhadap JSON yang valid tapi bukan bentuk kuis (mis. file
// JSON lain yang gak sengaja dipilih) — tanpa ini, bentuk salah lolos
// sampai ke saveDeck()/deckIdFor() dan crash di sana (Cannot read
// properties of undefined "length"). Bukan validasi skema penuh (lihat
// Roadmap), cuma jaring pengaman dasar.
function validateQuizData(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return "File ini bukan objek JSON kuis yang valid.";
  }
  const d = data as Record<string, unknown>;
  if (typeof d.title !== "string") {
    return 'Field "title" (judul kuis) tidak ada atau bukan teks.';
  }
  if (!Array.isArray(d.questions) || d.questions.length === 0) {
    return 'Field "questions" tidak ada, bukan array, atau kosong.';
  }
  return null;
}

interface QuizLoaderProps {
  onLoad: (data: QuizData) => void;
  onCancel?: () => void;
}

export default function QuizLoader({ onLoad, onCancel }: QuizLoaderProps) {
  const [pastedJson, setPastedJson] = useState("");
  const [loadError, setLoadError] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        const error = validateQuizData(data);
        if (error) {
          setLoadError(error);
          return;
        }
        onLoad(data);
      } catch (err) {
        setLoadError("Gagal baca file JSON: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  function handlePasteLoad() {
    try {
      const data = JSON.parse(pastedJson);
      const error = validateQuizData(data);
      if (error) {
        setLoadError(error);
        return;
      }
      onLoad(data);
    } catch (err) {
      setLoadError("Gagal baca JSON yang dipaste: " + (err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Tambah kuis baru
        </h2>
        {onCancel && (
          <button
            type="button"
            className="cursor-pointer text-sm text-muted hover:text-fg"
            onClick={onCancel}
          >
            Batal
          </button>
        )}
      </div>

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
