# Product Requirements Document — Kuis Bahasa Jepang

## 1. Summary

A lightweight, JSON-driven quiz player for practicing Japanese vocabulary
and grammar. Originally built to support one learner's self-study of
Minna no Nihongo (targeting JLPT N3), it is designed generically enough
to run any quiz dataset that follows its schema — not tied to a specific
textbook or chapter.

## 2. Problem statement

- The learner does not have a Japanese IME/keyboard, so answering
  fill-in-the-blank questions in kana is friction-heavy without romaji
  input support.
- Static PDF/textbook material doesn't provide active recall — retrieval
  practice (quizzes) is significantly more effective for retention than
  re-reading, but generic flashcard apps don't support the specific mix
  of question types (multiple choice, short recall, free-form output)
  this learner's method calls for.
- Kanji readings need furigana for a beginner, but a hover/click
  dictionary lookup is needed for vocabulary that falls outside the
  learner's current "known" word bank, without breaking the flow of the
  quiz by requiring a separate dictionary lookup.
- Pronunciation practice (shadowing) benefits from hearing correct
  Japanese pronunciation, which a static PDF cannot provide.

## 3. Goals

1. Let the learner (or anyone) load an arbitrary quiz JSON file and take
   it, with no setup beyond running the app.
2. Support three question modes: multiple choice (recognition), short
   answer (recall, romaji-tolerant), and free-form output (production,
   manually reviewed).
3. Render furigana natively and let the learner look up any word's
   meaning without leaving the question.
4. Let the learner hear the question read aloud in Japanese.
5. Produce a results summary that clearly separates auto-graded mistakes
   from free-form answers meant for external review.
6. Be simple enough to serve as a portfolio piece demonstrating
   Next.js/TypeScript/React fundamentals.

## 4. Non-goals (explicitly out of scope for now)

- User accounts, login, or multi-user data.
- Server-side persistence of quiz results (see Roadmap for possible
  future local-storage/export options).
- Full IME emulation — the romaji→hiragana converter is a best-effort
  helper, not a certified input method.
- Authoring UI for building quizzes inside the app (quizzes are authored
  as JSON, currently generated externally).
- Spaced-repetition scheduling (see Roadmap).

## 5. Target user

Primary: the original learner (Indonesian speaker, studying Japanese via
Minna no Nihongo, works as a mobile developer, aiming for JLPT N3).
Secondary: any self-learner who wants a lightweight quiz runner for
vocabulary/grammar practice, or a developer looking at this as a
portfolio/reference project.

## 6. Core user stories

- As a learner, I can pick a `.json` quiz file or paste JSON text and
  immediately start answering questions.
- As a learner, I can answer multiple-choice questions and see
  correct/incorrect feedback with an explanation.
- As a learner, I can type romaji into a short-answer field and have it
  auto-converted to hiragana for grading, so I don't need a Japanese
  keyboard.
- As a learner, I can write a free-form sentence for an "output" question
  and copy all my free answers at the end to send elsewhere for
  feedback (e.g. to a tutor or an AI assistant).
- As a learner, I can click any kanji (with furigana) or any word marked
  as a dictionary word to see its reading, meaning, and a short note,
  without leaving the question.
- As a learner, I can hover over a word wrapped for translation and see
  its Indonesian meaning inline.
- As a learner, I can click a "Listen" button to hear the question read
  aloud in Japanese.
- As a learner, I get a score summary at the end showing exactly which
  auto-graded questions I got wrong, with my answer vs. the correct one.

## 7. Data model (quiz JSON schema)

See `README.md` for the authoritative schema reference and
`types/quiz.ts` for the TypeScript source of truth. Summary:

```
QuizData {
  title: string
  dictionary?: { [word]: { reading?, meaning?, note? } }
  questions: Question[]
}

Question = MCQuestion | ShortQuestion | FreeQuestion
```

## 8. Success criteria

- A learner with zero setup experience can go from "double-click the app
  / run `npm run dev`" to "answering question 1" in under a minute.
- No question type requires a Japanese IME to answer.
- Furigana and dictionary lookups reduce the need to alt-tab to an
  external dictionary mid-quiz to near zero for in-scope vocabulary.
- The codebase is readable enough that a new contributor (or future-you)
  can add a new question type or feature within an afternoon, guided by
  `docs/ARCHITECTURE.md`.

## 9. Constraints

- No backend — everything runs client-side in the browser. Any
  persistence must be file-based (import/export) or browser storage, not
  a database.
- Must work fully offline once dependencies are installed (no network
  calls required to take a quiz).
- Text-to-speech quality depends on the OS/browser's installed Japanese
  voice — this is a known external dependency, not something the app
  controls.
