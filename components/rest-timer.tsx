"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatClock } from "@/lib/utils";

export interface RestTimerProps {
  /** increments to (re)start the timer; 0 = hidden */
  session: number;
  seconds?: number;
  onDismiss: () => void;
}

/** Glass pill that floats up after a completed set. `Space` skips it. */
export function RestTimer({ session, seconds = 120, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const active = session > 0;

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = seconds - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        window.clearInterval(tick);
        onDismiss();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [active, session, seconds, onDismiss]);

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
          <div className="flex items-center gap-4 rounded-full border border-line bg-card/70 py-2.5 pl-5 pr-2.5 shadow-ambient backdrop-blur-xl">
            <span className="text-label uppercase tracking-[0.02em] text-tertiary">
              Rest
            </span>
            <span className="w-[44px] text-center font-mono text-[16px] font-medium tabular-nums text-primary">
              {formatClock(remaining)}
            </span>
            <span className="h-[3px] w-24 overflow-hidden rounded-full bg-white/[0.08]">
              <span
                className="block h-full rounded-full bg-white/40 transition-[width] duration-300 ease-linear"
                style={{ width: `${(remaining / seconds) * 100}%` }}
              />
            </span>
            <button
              onClick={onDismiss}
              aria-label="Skip rest (Space)"
              className="flex h-8 items-center gap-2 rounded-full px-3 text-[13px] text-secondary transition-colors hover:bg-white/[0.06] hover:text-primary"
            >
              Skip
              <kbd className="rounded border border-line bg-white/[0.04] px-1 font-mono text-[10px] text-tertiary">
                space
              </kbd>
              <X className="h-3.5 w-3.5 md:hidden" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
