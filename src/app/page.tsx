"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import GuessGate from "@/components/GuessGate";
import Proposal from "@/components/Proposal";
import { haiLabel, haiPrompt } from "@/lib/copy";

const GardenScene = dynamic(() => import("@/components/GardenScene"), {
  ssr: false,
  loading: () => <div className="garden-fallback" aria-hidden="true" />,
});

type Step = "guess" | "hai" | "proposal";

const VEIL_MIN_MS = 700;
const VEIL_FADE_MS = 1200;

export default function Home() {
  const [step, setStep] = useState<Step>("guess");
  const [celebrating, setCelebrating] = useState(false);
  const [veilFaded, setVeilFaded] = useState(false);
  const unlockedAt = useRef<number | null>(null);
  const readyRef = useRef(false);
  const fadeStarted = useRef(false);

  const tryStartFade = useCallback(() => {
    if (fadeStarted.current || unlockedAt.current === null || !readyRef.current) {
      return;
    }
    const elapsed = performance.now() - unlockedAt.current;
    const wait = Math.max(0, VEIL_MIN_MS - elapsed);
    fadeStarted.current = true;
    window.setTimeout(() => setVeilFaded(true), wait);
  }, []);

  const handleChickenButt = () => {
    unlockedAt.current = performance.now();
    readyRef.current = false;
    fadeStarted.current = false;
    setVeilFaded(false);
    setStep("hai");
  };

  const handleRoomReady = useCallback(() => {
    readyRef.current = true;
    tryStartFade();
  }, [tryStartFade]);

  useEffect(() => {
    if (step !== "hai" || veilFaded || !readyRef.current) return;
    tryStartFade();
  }, [step, veilFaded, tryStartFade]);

  if (step === "guess") {
    return (
      <main className="home home-gate">
        <GuessGate onAnswer={handleChickenButt} />
      </main>
    );
  }

  return (
    <main className="home">
      {/* Mount as soon as Chicken Butt is answered so GLBs load under the white veil */}
      <GardenScene
        celebrating={celebrating}
        onReady={handleRoomReady}
        quietLoader
      />

      <div
        className={`white-veil${veilFaded ? " white-veil-faded" : ""}`}
        style={{ transitionDuration: `${VEIL_FADE_MS}ms` }}
        aria-hidden="true"
      />

      {step === "hai" ? (
        <div className="gate-overlay">
          <GuessGate
            prompt={haiPrompt}
            buttonLabel={haiLabel}
            onAnswer={() => setStep("proposal")}
          />
        </div>
      ) : (
        <Proposal celebrating={celebrating} onYes={() => setCelebrating(true)} />
      )}
    </main>
  );
}
