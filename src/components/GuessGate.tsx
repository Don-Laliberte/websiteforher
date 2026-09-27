"use client";

import { chickenButtLabel, guessPrompt } from "@/lib/copy";

type GuessGateProps = {
  onAnswer: () => void;
};

export default function GuessGate({ onAnswer }: GuessGateProps) {
  return (
    <div className="guess-gate">
      <h1 className="guess-gate-title">{guessPrompt}</h1>
      <button type="button" className="btn-yes guess-gate-btn" onClick={onAnswer}>
        {chickenButtLabel}
      </button>
    </div>
  );
}
