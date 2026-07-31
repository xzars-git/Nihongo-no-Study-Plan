// Text-to-speech pakai Web Speech API bawaan browser (offline, gratis).
// Membersihkan HTML (ruby/rt/span terjemahan) dan placeholder "___" dulu,
// lalu membuang setiap kata berskrip Latin (instruksi Indonesia/romaji)
// supaya yang benar-benar dibacakan cuma teks berskrip Jepang (hiragana/
// katakana/kanji) — banyak soal (terutama tipe short/free) mencampur
// instruksi Indonesia dengan kalimat Jepang di promptHtml yang sama.

function stripToJapanese(htmlText: string): string {
  let clean = htmlText;
  clean = clean.replace(/<rt>[\s\S]*?<\/rt>/g, "");
  clean = clean.replace(/<span class="trans">[\s\S]*?<\/span>/g, "");
  clean = clean.replace(/<[^>]*>/g, "");
  clean = clean.replace(/_+/g, "、");
  // Buang kata/kalimat berskrip Latin (instruksi Indonesia, placeholder
  // seperti "[tempat]", romaji petunjuk) — target ucapan hanya teks Jepang.
  clean = clean.replace(/[A-Za-z][A-Za-z0-9'’.-]*/g, " ");
  clean = clean.replace(/[()[\]{}"'`]/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices) return Promise.resolve(cachedVoices);
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      cachedVoices = voices;
      resolve(voices);
    };
    // Some browsers never fire onvoiceschanged if there simply are none.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}

export async function hasJapaneseVoice(): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const voices = await loadVoices();
  return voices.some((v) => v.lang?.toLowerCase().startsWith("ja"));
}

export async function speakJapanese(htmlText: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    alert("Browser ini tidak mendukung text-to-speech.");
    return;
  }

  const clean = stripToJapanese(htmlText);
  if (!clean) {
    alert("Tidak ada teks bahasa Jepang untuk dibacakan pada soal ini.");
    return;
  }

  const voices = await loadVoices();
  const jaVoice =
    voices.find((v) => v.lang?.toLowerCase() === "ja-jp") ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("ja"));

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "ja-JP";
  if (jaVoice) utter.voice = jaVoice;
  utter.rate = 0.85;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);

  if (!jaVoice) {
    console.warn(
      "Tidak ada voice bahasa Jepang terpasang di browser/OS ini — pengucapan mungkin memakai voice default (bukan Jepang)."
    );
  }
}
