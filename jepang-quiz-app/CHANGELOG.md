# Changelog

## v0.3.0 — Bug fixes, touch-friendly kamus, theme system

- **Fixed TTS reading Indonesian text / wrong voice**: `lib/tts.ts` now
  strips Latin-script words (Indonesian instructions, romaji hints,
  `[placeholder]` fragments) before speaking, explicitly selects an
  installed `ja-*` voice instead of relying on `lang` alone, and shows
  a visible warning on the quiz screen when no Japanese voice is
  installed on the OS/browser (previously failed silently as
  English-accented mispronunciation).
- **Fixed a real SRS scheduling bug**: `recordResult()` was re-applying
  the "2x correct same day" gate to already-graduated cards reviewed on
  their real due date (days later), which reset them back to "due
  tomorrow" instead of advancing to the next interval — due counts
  never stabilized. Now only ungraduated (new) cards need the same-day
  double-check; graduated cards advance on every correct review.
- **Fixed DictPopup rendering off-screen** near the bottom of the
  viewport (only horizontal overflow was clamped before).
- **Fixed a crash on malformed quiz JSON**: `QuizLoader` now validates
  `title`/`questions` shape before handing off to `saveDeck`, instead
  of throwing deep inside `deckIdFor`.
- **Made `.jword` hover-translate work on touch devices** — it only had
  a CSS `:hover` reveal, which never fires on mobile; added a tap-to-
  toggle alongside it.
- **Theme system**: two selectable templates, switchable from the
  library screen and persisted locally — "Gelap" (the existing OLED
  dark theme) and "Klasik Jepang" (Traditional Japanese Art / Cultural
  Vector: washi-paper cream background, ai-iro indigo + shu-iro
  vermillion accents, Noto Serif JP headings). Implemented via CSS
  custom properties so no component styling had to change.

## v0.2.0 — Deck library, spaced repetition, offline PWA

- Local deck library (`localStorage`-backed) — quizzes persist across
  reloads, no more re-uploading the same file every session.
- Spaced repetition engine (`lib/srs.ts`): per-question scheduling
  following Metode_Make_It_Stick.md's rules (2x correct same day →
  rest until a later day on a graduated 1/3/7/14/30/90-day ladder;
  wrong answers stay due immediately).
- Four session modes per deck: Semua soal, Perlu direview, Ulangi yang
  salah, Pelajari (tanpa skor — pure exposure, no grading).
- Sessions are shuffled (interleaving) and capped at 40 questions by
  default, matching the doc's 30-50/session dosage guidance.
- Streak counter + 70-day activity heatmap on the library screen.
- `QuizApp` refactored into a props-driven player (loader UI extracted
  to `components/QuizLoader.tsx`, reused by the new `Library` screen).
- Furigana show/hide toggle and keyboard navigation (1-9 for MC
  options, Enter to advance/submit).
- Installable, offline-capable PWA (`public/manifest.json` +
  hand-written `public/sw.js`, no `next-pwa` dependency).
- Redesigned UI: clean/minimal dark theme with a semantic color token
  system, Inter typeface, SVG icons in place of emoji glyphs.
- AI-prompt guide on the "add deck" screen so anyone can generate a
  compatible quiz JSON from their own material via any chat AI.
- Confirmation prompt before deleting a deck (previously instant/silent
  and would also destroy its SRS history with no way back).
- "Pelajari (tanpa skor)" mode now counts toward the streak/heatmap —
  it wasn't calling into the SRS recorder at all before, so exposure-only
  study days were invisible to the activity tracker.
- Deck cards now list the actual weakest-item sentences (not just a
  count), so "paling sering keliru" is something you can act on.
- Backup/restore: export all local progress (decks + SRS + activity) to
  a JSON file and import it back — the local equivalent of the "sync"
  paid tools charge for, protects against losing everything to a
  cleared browser profile.

## v0.1.0 — Initial Next.js port

- Ported from a single-file HTML/vanilla-JS prototype to Next.js 14 (App
  Router) + TypeScript + Tailwind CSS.
- Core quiz player: file-picker and paste-JSON loaders, progress bar,
  per-question scoring, final summary screen.
- Three question types: `mc` (multiple choice), `short` (auto-graded
  recall with romaji→hiragana conversion), `free` (ungraded output,
  collected for manual review and copy-paste export at the end).
- Furigana rendering via native `<ruby>`/`<rt>`.
- Click-to-open dictionary popup for any `<ruby>` element or
  `<span class="dw">` word, backed by a per-quiz `dictionary` map in the
  JSON.
- Hover-to-translate for words wrapped in
  `<span class="jword"><span class="orig">...</span><span class="trans">...</span></span>`.
  (originally a CSS-only hover reveal from the HTML prototype).
- Text-to-speech "Listen" button using the browser's `SpeechSynthesis`
  API, with furigana/translation markup and `___` blank placeholders
  stripped before speaking.
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` added for
  future-enhancement context.

### Known gaps at this version

- No runtime validation of loaded quiz JSON (see Roadmap).
- No persistence of results between sessions (see Roadmap).
- Not yet verified against a real `npm install && npm run build` —
  written by hand while the execution sandbox was unavailable; treat the
  first local build as the actual acceptance test for this version.
