# Roadmap / Backlog

Ideas for future iterations, roughly ordered by expected value vs.
effort. None of these are committed — pick based on what's actually
useful next.

## High value, low effort

- **Furigana toggle.** A switch to hide all `<rt>` content (via a CSS
  class swap, e.g. `.hide-furigana rt { display: none }`) so the learner
  can try reading kanji cold before revealing readings. Touches only
  `globals.css` + one button + one state flag in `QuizApp`.
- **Keyboard navigation.** `Enter` already submits short-answer; extend
  to number keys 1-4 selecting MC options, and `Enter`/`Space` advancing
  to the next question when answered. Pure event-handler addition, no
  new state.
- **Result export.** A "Download results as JSON" button on the summary
  screen (score, wrong list, free answers, timestamp) so history isn't
  lost when the tab closes. No backend needed — just
  `Blob` + `URL.createObjectURL` + a synthetic `<a download>` click.

## Medium value, medium effort

- **Mark-for-review.** Let the learner star a question mid-quiz; after
  finishing, offer a "retry starred questions only" mode that filters
  `questions` down to a starred subset and resets playback state.
- **Schema validation on load.** Introduce a small validator (Zod is a
  natural fit given the existing TypeScript types) so malformed JSON
  fails with a readable error message instead of a silent blank screen
  or a thrown error deep in a render.
- **Voice picker for TTS.** `speechSynthesis.getVoices()` can enumerate
  installed voices; let the user pick a specific `ja-JP` voice if more
  than one is installed, since quality varies a lot between OS voice
  packs.
- **Multiple quizzes / library view.** A landing screen listing quiz
  files placed in `public/quizzes/` (read via a Next.js API route or
  `fs` in a Server Component) instead of requiring manual file-pick every
  time.

## Larger, more speculative

- **Spaced repetition scheduling.** Track per-question or per-word
  correctness history (needs persistence — likely `localStorage` for a
  purely local app, or a lightweight backend if this becomes multi-quiz
  and multi-session) and resurface previously-missed items on a
  schedule rather than relying on manually re-running old quiz files.
- **In-app quiz authoring UI.** A form-based editor that outputs the
  JSON schema, so quizzes don't need to be hand-written or generated
  externally. Would need its own state/validation layer, likely a
  reasonable candidate for a second route (`/author`).
- **Progress dashboard.** Aggregate results across multiple completed
  quizzes (requires the export/persistence work above to already exist)
  to show trends over time — this is the natural companion to the
  external `Log_Progress.md` learning log already used outside the app.

## Explicitly deferred (see PRD "Non-goals")

- Accounts/login/multi-user.
- Server-side database.
- Full custom Japanese IME.
