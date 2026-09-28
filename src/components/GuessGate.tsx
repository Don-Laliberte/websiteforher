"use client";

import { chickenButtLabel, guessPrompt } from "@/lib/copy";
import { useTypewriter } from "@/hooks/useTypewriter";

type GuessGateProps = {
  onAnswer: () => void;
  prompt?: string;
  buttonLabel?: string;
};

export default function GuessGate({
  onAnswer,
  prompt = guessPrompt,
  buttonLabel = chickenButtLabel,
}: GuessGateProps) {
  const { typed, done } = useTypewriter(prompt, {
    startDelayMs: 280,
    charMs: 55,
  });

  return (
    <div className="guess-gate">
      <h1 className="guess-gate-title" aria-label={prompt}>
        <span aria-hidden="true">
          {typed}
          {!done ? <span className="type-caret" /> : null}
        </span>
      </h1>
      <button
        type="button"
        className={`btn-yes guess-gate-btn${done ? " is-ready" : ""}`}
        onClick={onAnswer}
        disabled={!done}
        tabIndex={done ? 0 : -1}
        aria-hidden={!done}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
