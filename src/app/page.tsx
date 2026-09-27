"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Proposal from "@/components/Proposal";

const GardenScene = dynamic(() => import("@/components/GardenScene"), {
  ssr: false,
  loading: () => <div className="garden-fallback" aria-hidden="true" />,
});

export default function Home() {
  const [celebrating, setCelebrating] = useState(false);

  return (
    <main className="home">
      <GardenScene celebrating={celebrating} />
      <Proposal celebrating={celebrating} onYes={() => setCelebrating(true)} />
    </main>
  );
}
