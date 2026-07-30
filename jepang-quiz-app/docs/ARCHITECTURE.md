# Architecture

## 1. Stack

- **Next.js 14** (App Router) — chosen for portfolio relevance and
  because the app has no backend needs beyond what App Router's client
  components already provide.
- **TypeScript** — the quiz JSON schema is the one piece of "public API"
  in this app (external JSON files must match it), so static types on
  that schema (`types/quiz.ts`) catch shape mismatches early in
  component code even though the JSON itself isn't runtime-validated yet
  (see Roadmap: schema validation).
- **Tailwind CSS** — utility classes directly in JSX keep styling
  colocated with markup, which matters here because most UI is generated
  conditionally per question type.
- **No external state library** — all state lives in one component
  (`QuizApp`) via `useState`. At this size, Redux/Zustand would be
  over-engineering; if the app grows multi-page state (e.g. a quiz
  library/dashboard), revisit this.

## 2. Directory structure

```
app/
  layout.tsx      Root layout, sets <html>/<body>, imports globals.css
  page.tsx         Single route, renders <QuizApp />
  globals.css      Tailwind directives + the non-utility CSS that can't
                    be expressed as Tailwind classes (ruby/rt styling,
                    the .jword hover-swap trick, .dictword hover state)
components/
  QuizApp.tsx      All quiz state + all three question-type renderers +
                    the loader screen + the summary screen
  DictPopup.tsx    Presentational popup for the click-to-lookup dictionary
lib/
  romaji.ts        Pure function: romaji string -> hiragana string
  tts.ts           Wraps window.speechSynthesis, strips furigana/markup
                    before speaking
types/
  quiz.ts          Question/QuizData/DictEntry/AnsweredResult types
public/
  sample_bab10.json  Reference quiz demonstrating every markup feature
docs/
  PRD.md           Why this app exists, what it should do
  ARCHITECTURE.md  This file
  ROADMAP.md       Known gaps / ideas for next iteration
```

## 3. Why `promptHtml` is a raw HTML string, not JSX/Markdown

Questions need inline `<ruby>` (furigana), `<span class="jword">` (hover
translation), and `<span class="dw">` (clickable dictionary word) mixed
directly into a Japanese sentence. Rather than invent a custom markup
language and a parser for it, `promptHtml` is rendered directly via
`dangerouslySetInnerHTML`. This is safe here because:

- Quiz JSON is authored by the user/developer, not submitted by
  untrusted third parties over a network.
- There's no user-generated content rendered this way — only
  quiz-authoring-time content.

**Important implication:** because the content is injected via
`dangerouslySetInnerHTML`, React does not know about the `<ruby>` and
`<span>` elements inside it, so normal `onClick` JSX handlers can't be
attached to them. This is why `QuizApp.tsx` has a `useEffect` that runs
after every render of the prompt, manually queries
`container.querySelectorAll("ruby")` / `querySelectorAll("span.dw")`, and
attaches real DOM event listeners, with a cleanup function that removes
them before the next question renders. If you add a new interactive
inline element type, follow this same pattern: query for it in that
`useEffect`, attach a listener, return a cleanup.

## 4. State machine (three screens)

`QuizApp` renders exactly one of three "screens" based on state, in this
order of precedence:

1. **Loader** — shown when `quizData === null`. File picker or paste
   textarea; both funnel into `loadQuiz(data)`.
2. **Active question** — shown when a quiz is loaded and
   `currentIndex < questions.length`.
3. **Summary** — shown when `currentIndex >= questions.length`
   (`isFinished`).

There's no router/URL state for this — it's all driven by two numbers
(`quizData` presence + `currentIndex` vs `questions.length`). This keeps
the mental model simple: advancing is always `setCurrentIndex(i => i+1)`,
finishing is just "ran out of questions."

## 5. Grading logic per question type

| Type    | Answer path                                                                 |
| ------- | ---------------------------------------------------------------------------- |
| `mc`    | `handleSelectOption(i)` compares `i` to `question.answer` (index-based).     |
| `short` | `handleSubmitShort()` runs `toHiraganaSafe(input)` (from `lib/romaji.ts`) and checks the result against `accepted[]`, OR checks the raw lowercase input against `acceptedRomaji[]`. Either match counts as correct — this dual-check is what makes the field "romaji-tolerant." |
| `free`  | `handleSubmitFree()` never grades — it always pushes `correct: true` with `isFree: true`, so it's excluded from the score denominator and instead surfaced in the summary screen as copyable text. |

All three funnel through `lockAndScore()` (mc/short only) which appends
to `results[]`, bumps `score` if correct, and shows `explain` text.

## 6. The dictionary/popup flow

1. Quiz JSON optionally has a top-level `dictionary` map: `{ "机": {
reading, meaning, note} }`.
2. The `useEffect` described in §3 captures this map in closure and, on
   click of any `<ruby>` or `span.dw`, extracts the visible base text
   (for `<ruby>`, everything except the `<rt>` child) and looks it up.
3. `setDictPopup({ word, entry, x, y })` triggers `<DictPopup />` to
   render at the click coordinates (`position: fixed`).
4. A second, simpler `useEffect` closes the popup on any document click
   that isn't inside it (the popup's own click handler calls
   `stopPropagation` so opening a popup doesn't immediately close it).

## 7. Adding a new question type

1. Add the new variant to the `Question` union in `types/quiz.ts`.
2. Add a render branch in `QuizApp.tsx`'s JSX (`current.type === "..."`).
3. Add its submit/scoring handler, following the `handleSubmitShort`
   pattern if it's auto-graded, or the `handleSubmitFree` pattern if it
   isn't.
4. Update `docs/PRD.md` "Data model" section and `README.md`'s schema
   block so the JSON contract stays documented in one place per
   audience (PRD = why, README = how).

## 8. Known limitations to know about before extending

- No runtime schema validation on loaded JSON — a malformed file will
  either silently render nothing useful or throw inside a render. See
  Roadmap for adding a validator (e.g. Zod).
- `dangerouslySetInnerHTML` means quiz authors are trusted; do not wire
  this app up to accept quizzes from arbitrary internet uploads without
  adding sanitization first.
- Text-to-speech voice availability is entirely OS/browser-dependent —
  there's no fallback or voice-selection UI yet.
