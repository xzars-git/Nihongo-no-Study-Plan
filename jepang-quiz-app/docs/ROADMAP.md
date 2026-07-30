# Roadmap / Backlog

Ideas for future iterations, roughly ordered by expected value vs.
effort. None of these are committed — pick based on what's actually
useful next.

## Shipped (v0.2.0)

- Furigana toggle, keyboard navigation (1-9 for MC, Enter to advance),
  spaced repetition scheduling, a local deck library (no re-upload),
  a streak/activity heatmap, and a "Pelajari (tanpa skor)" exposure
  mode — see `docs/ARCHITECTURE.md` §9 for how these fit together.

## High value, low effort

- **Result export.** A "Download results as JSON" button on the summary
  screen (score, wrong list, free answers, timestamp) so history isn't
  lost when the tab closes. No backend needed — just
  `Blob` + `URL.createObjectURL` + a synthetic `<a download>` click.
- **Deck rename/edit title.** Currently a deck's display title is fixed
  to `quizData.title` at import time; a rename control in `Library`
  would help once someone has several similarly-named decks.

## Medium value, medium effort

- **Schema validation on load.** Introduce a small validator (Zod is a
  natural fit given the existing TypeScript types) so malformed JSON
  fails with a readable error message instead of a silent blank screen
  or a thrown error deep in a render.
- **Voice picker for TTS.** `speechSynthesis.getVoices()` can enumerate
  installed voices; let the user pick a specific `ja-JP` voice if more
  than one is installed, since quality varies a lot between OS voice
  packs.
- **Session size control in the UI.** `buildSession`'s cap (default 40,
  matching Metode_Make_It_Stick.md's 30-50/session dosage guidance) is
  currently a hardcoded parameter; exposing it as a picker in `Library`
  would let the user tune it per mood/available time.

## Larger, more speculative

- **In-app quiz authoring UI.** A form-based editor that outputs the
  JSON schema, so quizzes don't need to be hand-written or generated
  externally. Would need its own state/validation layer, likely a
  reasonable candidate for a second route (`/author`).
- **Cross-device sync.** SRS/deck state is per-browser (`localStorage`);
  an optional export/import of the whole `jqa:*` key set (or a
  bring-your-own-sync like a Gist/WebDAV target) would let progress
  follow the user across devices without a real backend.
- **True FSRS scheduling.** The current scheduler is a hand-rolled,
  simplified SM-2-style ladder (`lib/srs.ts`); if review load grows,
  swapping in a proper FSRS implementation would produce better-fit
  intervals per card instead of one fixed ladder for everyone.

## Explicitly deferred (see PRD "Non-goals")

- Accounts/login/multi-user.
- Server-side database.
- Full custom Japanese IME.
