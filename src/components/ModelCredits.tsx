"use client";

import { useEffect, useId, useState } from "react";
import { modelCredits } from "@/lib/modelCredits";

export default function ModelCredits() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="model-credits">
      <button
        type="button"
        className="model-credits-toggle"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        Credits
      </button>

      {open ? (
        <div
          className="model-credits-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="model-credits-header">
            <h2 id={titleId}>3D model credits</h2>
            <button
              type="button"
              className="model-credits-close"
              aria-label="Close credits"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <p className="model-credits-note">
            Models from Sketchfab, licensed under Creative Commons Attribution
            4.0.
          </p>
          <ul className="model-credits-list">
            {modelCredits.map((credit) => (
              <li key={credit.url}>
                <a href={credit.url} target="_blank" rel="noreferrer">
                  {credit.title}
                </a>
                {" by "}
                {credit.author}
                {" — "}
                <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
                  {credit.licenseName}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
