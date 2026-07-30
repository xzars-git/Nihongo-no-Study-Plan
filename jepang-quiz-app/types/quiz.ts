export type QuestionType = "mc" | "short" | "free";

export interface MCQuestion {
  type: "mc";
  tag?: string;
  promptHtml: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface ShortQuestion {
  type: "short";
  tag?: string;
  promptHtml: string;
  accepted: string[];
  acceptedRomaji?: string[];
  explain?: string;
}

export interface FreeQuestion {
  type: "free";
  tag?: string;
  promptHtml: string;
  note?: string;
}

export type Question = MCQuestion | ShortQuestion | FreeQuestion;

export interface DictEntry {
  reading?: string;
  meaning?: string;
  note?: string;
}

export interface QuizData {
  title: string;
  dictionary?: Record<string, DictEntry>;
  questions: Question[];
}

export interface AnsweredResult {
  tag: string;
  promptHtml: string;
  correct: boolean;
  picked: string;
  right: string;
  isFree?: boolean;
}
