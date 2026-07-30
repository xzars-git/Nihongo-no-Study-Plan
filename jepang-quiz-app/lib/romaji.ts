// Konverter romaji -> hiragana yang sederhana, dipakai karena user tidak
// punya keyboard input bahasa Jepang. Bukan pengganti IME resmi, tapi cukup
// untuk kebutuhan menjawab kuis kosakata dasar.

const ROMAJI_MAP: Record<string, string> = {
  kya: "きゃ", kyu: "きゅ", kyo: "きょ", sha: "しゃ", shu: "しゅ", sho: "しょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ", mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ", gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  shi: "し", chi: "ち", tsu: "つ", fu: "ふ",
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  sa: "さ", su: "す", se: "せ", so: "そ",
  ta: "た", te: "て", to: "と",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", he: "へ", ho: "ほ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を", n: "ん",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  za: "ざ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
};

export function romajiToHiragana(input: string): string {
  let s = (input || "").toLowerCase().trim();
  s = s.replace(/n'/g, "n");
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "-" || c === " ") {
      i += 1;
      continue;
    }
    // Konsonan ganda -> っ kecil (misal "kk" -> っk...)
    if (/[bcdfghjklmpqrstvwxyz]/.test(c) && s[i + 1] === c && c !== "n") {
      out += "っ";
      i += 1;
      continue;
    }
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      const chunk = s.substr(i, len);
      if (ROMAJI_MAP[chunk]) {
        out += ROMAJI_MAP[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += c;
      i += 1;
    }
  }
  return out;
}

export function looksLikeRomaji(s: string): boolean {
  return /^[a-zA-Z'\-\s]+$/.test(s || "");
}

export function toHiraganaSafe(s: string): string {
  const trimmed = (s || "").trim();
  if (!trimmed) return "";
  if (looksLikeRomaji(trimmed)) return romajiToHiragana(trimmed);
  return trimmed;
}
