"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  celebrationNote,
  celebrationTitle,
  herName,
  noLabels,
  question,
  yesLabel,
  yourName,
} from "@/lib/copy";

type ProposalProps = {
  onYes: () => void;
  celebrating: boolean;
};

type Offset = { x: number; y: number };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default function Proposal({ onYes, celebrating }: ProposalProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [attempts, setAttempts] = useState(0);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [drifting, setDrifting] = useState(false);
  const [gone, setGone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const lastDodge = useRef(0);

  const maxLabelIndex = noLabels.length - 1;
  const labelIndex = Math.min(attempts, maxLabelIndex);
  const noGone = gone || attempts >= noLabels.length;

  const dodge = useCallback(() => {
    const now = performance.now();
    // Debounce so hover + click don't double-count one gesture
    if (now - lastDodge.current < 280) return;
    lastDodge.current = now;

    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= noLabels.length) {
        setDrifting(true);
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

  const yesScale = 1 + Math.min(attempts, 5) * 0.12;
  const yesGlow = Math.min(attempts, 5);

  if (celebrating) {
    return (
      <div className="proposal-shell">
        <div className="proposal-card celebration" role="status">
          <p className="proposal-kicker">For {herName}</p>
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
        <h1 className="proposal-title">{question}</h1>

        <div className="proposal-actions">
          <button
            type="button"
            className="btn-yes"
            style={{
              transform: `scale(${yesScale})`,
              boxShadow: `0 ${8 + yesGlow * 2}px ${20 + yesGlow * 8}px rgba(255, 105, 150, ${0.25 + yesGlow * 0.08})`,
            }}
            onClick={handleYes}
          >
            {yesLabel}
          </button>

          {!noGone ? (
            <button
              type="button"
              ref={noRef}
              className={`btn-no${drifting ? " btn-no-drift" : ""}${reducedMotion ? " btn-no-static" : ""}`}
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
                if (!reducedMotion) dodge();
              }}
              onPointerDown={(e) => {
                // First touch on phones dodges instead of activating
                if (e.pointerType === "touch" && !reducedMotion && !drifting) {
                  e.preventDefault();
                  dodge();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (reducedMotion) {
                  dodge();
                  return;
                }
                dodge();
              }}
              aria-label={noLabels[labelIndex]}
            >
              {drifting ? "✿" : noLabels[labelIndex]}
            </button>
          ) : null}
        </div>

        {attempts > 0 && !noGone ? (
          <p className="proposal-hint">The Yes button is getting happier…</p>
        ) : null}
        {noGone ? (
          <p className="proposal-hint">Looks like Yes is the only answer left.</p>
        ) : null}
      </div>
    </div>
  );
}
