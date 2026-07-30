"use client";

import { useState } from "react";
import QuizApp from "@/components/QuizApp";
import Library from "@/components/Library";
import type { StoredDeck } from "@/lib/storage";
import { buildSession, type SessionMode } from "@/lib/srs";
import type { Question } from "@/types/quiz";

interface Session {
  deck: StoredDeck;
  mode: SessionMode;
  questions: Question[];
  runId: number;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  function startSession(deck: StoredDeck, mode: SessionMode) {
    const questions = buildSession(deck.id, deck.quizData.questions, mode);
    setSession((prev) => ({
      deck,
      mode,
      questions,
      runId: (prev?.runId ?? 0) + 1,
    }));
  }

  function retryWrong() {
    if (!session) return;
    startSession(session.deck, "wrong");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-10 pb-20 sm:py-14">
      {session ? (
        session.questions.length === 0 ? (
          <div className="text-center text-sm text-muted">
            Tidak ada soal untuk mode ini.
            <button
              type="button"
              className="mt-4 block w-full cursor-pointer text-accent hover:underline"
              onClick={() => setSession(null)}
            >
              Kembali ke daftar kuis
            </button>
          </div>
        ) : (
          <QuizApp
            key={session.runId}
            quizData={session.deck.quizData}
            sessionQuestions={session.questions}
            deckId={session.deck.id}
            mode={session.mode}
            onExit={() => setSession(null)}
            onRetryWrong={retryWrong}
          />
        )
      ) : (
        <Library onStart={startSession} />
      )}
    </main>
  );
}
