"use client";

import { chickenButtLabel, guessPrompt } from "@/lib/copy";

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
  return (
    <div className="guess-gate">
      <h1 className="guess-gate-title">{prompt}</h1>
      <button type="button" className="btn-yes guess-gate-btn" onClick={onAnswer}>
        {buttonLabel}
      </button>
    </div>
  );
}
