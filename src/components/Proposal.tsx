"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import {
  celebrationNote,
  celebrationTitle,
  herName,
  noLabels,
  question,
  yesLabel,
  yourName,
} from "@/lib/copy";
import { useTypewriter } from "@/hooks/useTypewriter";

type ProposalProps = {
  onYes: () => void;
  celebrating: boolean;
};

type Offset = { x: number; y: number };

export default function Proposal({ onYes, celebrating }: ProposalProps) {
  const { typed, done: questionReady, reducedMotion } = useTypewriter(
    question,
    { enabled: !celebrating },
  );
  const [attempts, setAttempts] = useState(0);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [drifting, setDrifting] = useState(false);
  const [gone, setGone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const lastDodge = useRef(0);

  const maxLabelIndex = noLabels.length - 1;
  const labelIndex = Math.min(attempts, maxLabelIndex);

  const dodge = useCallback(() => {
    const now = performance.now();
    // Debounce so hover + click don't double-count one gesture
    if (now - lastDodge.current < 280) return;
    lastDodge.current = now;

    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= noLabels.length) {
        setDrifting(true);
        // Yes recenters only after No fully drifts away
        window.setTimeout(() => setGone(true), 900);
      }
      return next;
    });

    if (reducedMotion) return;

    const card = cardRef.current;
    const btn = noRef.current;
    if (!card || !btn) return;

    const cardRect = card.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const pad = 12;
    const maxX = Math.max(0, cardRect.width - btnRect.width - pad * 2);
    const maxY = Math.max(0, cardRect.height - btnRect.height - pad * 2 - 80);

    let nextX = Math.random() * maxX - maxX / 2;
    let nextY = Math.random() * maxY * 0.55;
    // Nudge away from current spot so it feels like a dodge
    if (Math.abs(nextX - offset.x) < 40) nextX += nextX >= 0 ? 60 : -60;
    if (Math.abs(nextY - offset.y) < 30) nextY += 40;

    setOffset({
      x: Math.max(-maxX / 2, Math.min(maxX / 2, nextX)),
      y: Math.max(0, Math.min(maxY, nextY)),
    });
  }, [offset.x, offset.y, reducedMotion]);

  const handleYes = () => {
    onYes();
  };

  // Grow steadily through every No prompt; max size when No is gone
  const growth =
    noLabels.length > 0
      ? Math.min(attempts, noLabels.length) / noLabels.length
      : 0;
  const yesScale = 1 + growth * 1.05;
  const yesGlow = growth * 10;

  if (celebrating) {
    return (
      <div className="proposal-shell">
        <div className="proposal-card celebration" role="status">
          <p className="proposal-kicker">I love you {herName}</p>
          <h1 className="proposal-title">{celebrationTitle}</h1>
          {celebrationNote ? (
            <p className="proposal-note">{celebrationNote}</p>
          ) : null}
          {yourName ? <p className="proposal-sign">— {yourName}</p> : null}
          <div className="celebration-hearts" aria-hidden="true">
            <span>♡</span>
            <span>✿</span>
            <span>♡</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="proposal-shell">
      <div className="proposal-card" ref={cardRef}>
        <p className="proposal-kicker">Hey {herName}</p>
        <h1 className="proposal-title" aria-label={question}>
          <span aria-hidden="true">
            {typed}
            {!questionReady ? <span className="type-caret" /> : null}
          </span>
        </h1>

        <div
          className={`proposal-actions${questionReady ? " is-ready" : ""}${gone ? " is-solo" : ""}`}
          aria-hidden={!questionReady}
        >
          <button
            type="button"
            className="btn-yes"
            style={
              {
                "--yes-scale": yesScale,
                boxShadow: `0 ${8 + yesGlow * 2}px ${20 + yesGlow * 8}px rgba(255, 105, 150, ${0.25 + yesGlow * 0.08})`,
              } as CSSProperties
            }
            onClick={handleYes}
            disabled={!questionReady}
            tabIndex={questionReady ? 0 : -1}
          >
            {yesLabel}
          </button>

          {!gone ? (
            <button
              type="button"
              ref={noRef}
              className={`btn-no${drifting ? " btn-no-drift" : ""}${reducedMotion ? " btn-no-static" : ""}`}
              disabled={!questionReady || drifting}
              tabIndex={questionReady && !drifting ? 0 : -1}
              style={
                reducedMotion || drifting
                  ? {
                      transform: drifting
                        ? undefined
                        : `scale(${Math.max(0.55, 1 - attempts * 0.08)})`,
                      opacity: Math.max(0.35, 1 - attempts * 0.1),
                    }
                  : {
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${Math.max(0.65, 1 - attempts * 0.07)})`,
                    }
              }
              onMouseEnter={() => {
                if (questionReady && !reducedMotion && !drifting) dodge();
              }}
              onPointerDown={(e) => {
                if (!questionReady || drifting) return;
                // First touch on phones dodges instead of activating
                if (e.pointerType === "touch" && !reducedMotion) {
                  e.preventDefault();
                  dodge();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (!questionReady || drifting) return;
                dodge();
              }}
              aria-label={noLabels[labelIndex]}
            >
              {drifting ? "✿" : noLabels[labelIndex]}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
