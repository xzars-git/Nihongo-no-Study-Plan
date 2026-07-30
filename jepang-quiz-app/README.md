# Kuis Bahasa Jepang

Aplikasi web untuk latihan kosakata dan tata bahasa Jepang, dibangun dengan
**Next.js 14 (App Router) + TypeScript + Tailwind CSS**. Awalnya dibuat
sebagai alat belajar pribadi untuk mengikuti Minna no Nihongo, lalu
dikembangkan jadi aplikasi mandiri yang bisa dipakai untuk soal apa saja
selama datanya mengikuti skema JSON di bawah.

## Fitur

- **Deck library lokal** — kuis yang pernah dimuat tersimpan otomatis di
  browser (`localStorage`), tidak perlu upload ulang file tiap sesi.
- **Spaced repetition (SRS)** — tiap soal dilacak per-item; jawaban benar
  2x berturut hari yang sama "mengistirahatkan" soal itu ke jadwal
  beberapa hari ke depan (1/3/7/14/30/90 hari), jawaban salah membuatnya
  due lagi. Mode "Perlu direview" hanya menampilkan soal yang jatuh
  tempo.
- **4 mode belajar per deck**: Semua soal, Perlu direview (SRS), Ulangi
  yang salah (dari sesi terakhir), dan Pelajari (tanpa skor) — mode
  eksposur murni ala kartu pemandu pola, tanpa dinilai benar/salah.
- **Sesi otomatis diacak & dibatasi** (default 40 soal/sesi) mengikuti
  prinsip interleaving + dosis harian dari `Metode_Make_It_Stick.md`.
- **Streak & activity heatmap** di halaman utama, mirip grafik kontribusi
  GitHub, untuk motivasi belajar konsisten harian.
- **Bikin soal sendiri via AI** — panduan + prompt siap-copy di layar
  "Tambah kuis baru" supaya siapa pun bisa generate kuis JSON dari
  materi sendiri (paste ke ChatGPT/Claude/dll), lalu tinggal upload/paste
  hasilnya.
- **Instalable & offline (PWA)** — bisa di-"Add to Home Screen"/install
  sebagai app, dan tetap jalan tanpa internet berkat service worker.
- **Loader fleksibel** — muat soal dari file `.json` atau paste JSON langsung.
- **3 tipe soal**: pilihan ganda (`mc`), isian singkat (`short`), dan output
  bebas (`free`) untuk latihan menulis kalimat sendiri.
- **Furigana otomatis** lewat tag `<ruby>` HTML native, dengan tombol
  sembunyikan/tampilkan furigana untuk latihan baca kanji cold.
- **Navigasi keyboard** — tombol angka (1-9) memilih opsi pilihan ganda,
  Enter untuk lanjut/submit.
- **Kamus klik** — klik kanji/kata apa pun (yang dibungkus `<ruby>` atau
  `<span class="dw">`) untuk lihat arti + catatan singkat dari kamus per-kuis.
- **Hover-translate** — kata dibungkus `<span class="jword">` akan berganti
  jadi terjemahan Indonesia saat di-hover.
- **Konversi romaji -> hiragana otomatis** di kolom isian, karena banyak
  pengguna (termasuk saya) tidak punya keyboard input Jepang.
- **Text-to-speech** — tombol "Dengar" membaca kalimat pakai Web Speech API
  bawaan browser (butuh voice pack bahasa Jepang terpasang di OS).
- **Ringkasan hasil** dengan daftar kesalahan dan kotak jawaban output bebas
  yang bisa di-copy untuk direview manual.

Semuanya berjalan 100% di browser (client-side) — tanpa akun, tanpa
server, tanpa API eksternal apa pun.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`, lalu load `public/sample_bab10.json` sebagai
contoh, atau file JSON soal lain yang mengikuti skema di bawah.

## Skema data soal (JSON)

```jsonc
{
  "title": "Nama kuis",
  "dictionary": {
    "机": { "reading": "つくえ", "meaning": "meja", "note": "catatan opsional" }
  },
  "questions": [
    {
      "type": "mc",
      "tag": "Label kategori (opsional)",
      "promptHtml": "<ruby>机<rt>つくえ</rt></ruby>の上に本が___。",
      "options": ["あります", "います"],
      "answer": 0,
      "explain": "Penjelasan yang muncul setelah dijawab."
    },
    {
      "type": "short",
      "tag": "...",
      "promptHtml": "...",
      "accepted": ["ひらがな jawaban yang benar"],
      "acceptedRomaji": ["romaji alternatif"],
      "explain": "..."
    },
    {
      "type": "free",
      "tag": "...",
      "promptHtml": "Instruksi soal bebas",
      "note": "Catatan opsional"
    }
  ]
}
```

Markup HTML yang didukung di dalam `promptHtml`:

- `<ruby>漢字<rt>かんじ</rt></ruby>` — kanji dengan furigana, otomatis bisa
  diklik untuk membuka kamus.
- `<span class="dw">パソコン</span>` — kata apa pun (biasanya katakana/tanpa
  kanji) yang juga bisa diklik untuk lihat kamus.
- `<span class="jword"><span class="orig">言葉</span><span class="trans">terjemahan</span></span>` —
  kata yang berganti jadi terjemahan saat di-hover.

## Struktur proyek

```
app/            App Router (layout, page, global styles)
components/     QuizApp (state & UI utama), DictPopup (popup kamus)
lib/            Utilitas romaji->hiragana dan text-to-speech
types/          Tipe TypeScript untuk skema soal
public/         Contoh file JSON soal
```

## Tentang proyek ini

Dibuat sebagai bagian dari proses belajar bahasa Jepang menuju JLPT N3,
sekaligus jadi contoh proyek Next.js/TypeScript untuk portofolio — kombinasi
antara kebutuhan pribadi (belajar bahasa) dan latihan membangun aplikasi web
modern dari nol.
