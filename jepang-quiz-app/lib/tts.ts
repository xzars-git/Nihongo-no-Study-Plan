// Text-to-speech pakai Web Speech API bawaan browser (offline, gratis).
// Membersihkan HTML (ruby/rt/span terjemahan) dan placeholder "___" dulu
// supaya yang dibaca cuma kalimat Jepang aslinya.

export function speakJapanese(htmlText: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    alert("Browser ini tidak mendukung text-to-speech.");
    return;
  }

  let clean = htmlText;
  clean = clean.replace(/<rt>[\s\S]*?<\/rt>/g, "");
  clean = clean.replace(/<span class="trans">[\s\S]*?<\/span>/g, "");
  clean = clean.replace(/<[^>]*>/g, "");
  clean = clean.replace(/_+/g, "、");
  clean = clean.replace(/\s+/g, " ").trim();

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "ja-JP";
  utter.rate = 0.85;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
