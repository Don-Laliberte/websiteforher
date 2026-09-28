"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type UseTypewriterOptions = {
  /** Delay before the first character. */
  startDelayMs?: number;
  /** Delay between characters. */
  charMs?: number;
  /** When false, typing is paused / skipped until true again. */
  enabled?: boolean;
};

export function useTypewriter(
  text: string,
  {
    startDelayMs = 420,
    charMs = 38,
    enabled = true,
  }: UseTypewriterOptions = {},
) {
  const reducedMotion = usePrefersReducedMotion();
  const [typed, setTyped] = useState(reducedMotion || !enabled ? text : "");
  const [done, setDone] = useState(reducedMotion || !enabled);

  useEffect(() => {
    if (!enabled) {
      setTyped("");
      setDone(false);
      return;
    }

    if (reducedMotion) {
      setTyped(text);
      setDone(true);
      return;
    }

    setTyped("");
    setDone(false);
    let i = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startId = window.setTimeout(() => {
      intervalId = setInterval(() => {
        i += 1;
        setTyped(text.slice(0, i));
        if (i >= text.length) {
          if (intervalId !== undefined) clearInterval(intervalId);
          setDone(true);
        }
      }, charMs);
    }, startDelayMs);

    return () => {
      window.clearTimeout(startId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [text, startDelayMs, charMs, enabled, reducedMotion]);

  return { typed, done, reducedMotion };
}
