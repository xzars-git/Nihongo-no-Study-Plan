# Changelog

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
