"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/utils";

export interface RestTimerProps {
  /** increments to (re)start the timer; 0 = hidden */
  session: number;
  seconds?: number;
  onDismiss: () => void;
}

/** Glass pill that floats up after a completed set. `Space` skips it;
 * pause/resume and +30s adjust mid-rest. Default duration lives in Settings. */
export function RestTimer({ session, seconds = 120, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const endAtRef = useRef(0);
  const active = session > 0;

  useEffect(() => {
    if (!active) return;
    setTotal(seconds);
    setRemaining(seconds);
    setPaused(false);
    endAtRef.current = Date.now() + seconds * 1000;
  }, [active, session, seconds]);

  useEffect(() => {
    if (!active || paused) return;
    const tick = window.setInterval(() => {
      const left = Math.ceil((endAtRef.current - Date.now()) / 1000);
      if (left <= 0) {
        window.clearInterval(tick);
        onDismiss();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [active, paused, session, onDismiss]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (!p) return true;
      endAtRef.current = Date.now() + remaining * 1000;
      return false;
    });
  }, [remaining]);

  const extend = useCallback(() => {
    endAtRef.current += 30_000;
    setTotal((t) => t + 30);
    setRemaining((r) => r + 30);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === " " && !typing) {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onDismiss]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-[120px] left-1/2 z-40 -translate-x-1/2 md:bottom-8"
          role="timer"
          aria-label={`Rest timer, ${formatClock(remaining)} remaining`}
        >
          <div className="flex items-center gap-3 rounded-full border border-line bg-card/70 py-2.5 pl-4 pr-2.5 shadow-ambient backdrop-blur-xl">
            <button
              onClick={togglePause}
              aria-label={paused ? "Resume rest" : "Pause rest"}
              className="rounded-full p-1 text-tertiary transition-colors hover:text-primary"
            >
              {paused ? (
                <Play className="h-3 w-3 fill-current" aria-hidden />
              ) : (
                <Pause className="h-3 w-3 fill-current" aria-hidden />
              )}
            </button>
            <span className="w-[44px] text-center font-mono text-[16px] font-medium tabular-nums text-primary">
              {formatClock(remaining)}
            </span>
            <span className="h-[3px] w-20 overflow-hidden rounded-full bg-ink/[0.08]">
              <span
                className="block h-full rounded-full bg-ink/40 transition-[width] duration-300 ease-linear"
                style={{ width: `${(remaining / total) * 100}%` }}
              />
            </span>
            <button
              onClick={extend}
              aria-label="Add 30 seconds"
              className="rounded-full px-2 py-1 font-mono text-[11px] tabular-nums text-secondary transition-colors hover:bg-ink/[0.06] hover:text-primary"
            >
              +30s
            </button>
            <button
              onClick={onDismiss}
              aria-label="Skip rest (Space)"
              className="flex h-8 items-center gap-2 rounded-full px-3 text-[13px] text-secondary transition-colors hover:bg-ink/[0.06] hover:text-primary"
            >
              Skip
              <kbd className="rounded border border-line bg-ink/[0.04] px-1 font-mono text-[10px] text-tertiary">
                space
              </kbd>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
