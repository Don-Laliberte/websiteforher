"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import GuessGate from "@/components/GuessGate";
import Proposal from "@/components/Proposal";

const GardenScene = dynamic(() => import("@/components/GardenScene"), {
  ssr: false,
  loading: () => <div className="garden-fallback" aria-hidden="true" />,
});

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Defer the Canvas + GLB loads until she answers the silly first prompt
  if (!unlocked) {
    return (
      <main className="home home-gate">
        <GuessGate onAnswer={() => setUnlocked(true)} />
      </main>
    );
  }

  return (
    <main className="home">
      <GardenScene celebrating={celebrating} />
      <Proposal celebrating={celebrating} onYes={() => setCelebrating(true)} />
    </main>
  );
}
