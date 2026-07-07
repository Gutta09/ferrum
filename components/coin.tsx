"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn, formatInt } from "@/lib/utils";

/** Minimal engraved disc in PR gold. No cartoon. */
export function CoinMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="#E6B450" strokeWidth="1.5" />
      <circle
        cx="20"
        cy="20"
        r="15.5"
        fill="none"
        stroke="#E6B450"
        strokeWidth="0.75"
        strokeDasharray="1.5 2.2"
        opacity="0.7"
      />
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono)"
        fontSize="15"
        fontWeight="600"
        fill="#E6B450"
      >
        F
      </text>
    </svg>
  );
}

const EARN_COPY = [
  "Coin secured.",
  "Paid in full.",
  "The gains tax is collected.",
  "Another day at the mint.",
];

const MUTE_KEY = "ferrum:coin-mute";

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.09 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.32);
    });
  } catch {
    /* audio is a garnish, never an error */
  }
}

/** The daily coin — appears only on the finish screen. One per completed
 * workout; the count IS the lifetime workout count. */
export function CoinEarn({ vaultTotal }: { vaultTotal: number }) {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(MUTE_KEY) !== "off";
    setMuted(stored);
    if (!stored) chime();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      localStorage.setItem(MUTE_KEY, m ? "off" : "on");
      return !m;
    });
  }, []);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ rotateY: 0, y: -14, opacity: 0 }}
        animate={{ rotateY: 720, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.15 }}
        style={{ transformPerspective: 400 }}
      >
        <CoinMark size={44} />
      </motion.div>
      <p className="mt-3 text-[13px] text-secondary">
        {EARN_COPY[vaultTotal % EARN_COPY.length]}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="font-mono text-[12px] tabular-nums text-tertiary">
          Vault · {formatInt(vaultTotal)}
        </p>
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute coin sound" : "Mute coin sound"}
          aria-pressed={muted}
          className="rounded-md p-1 text-tertiary transition-colors hover:text-secondary"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

/** Profile vault: one big tabular number, one quiet milestone line. */
export function CoinVault({ total }: { total: number }) {
  const milestones = [365, 100, 50];
  const next = [...milestones].reverse().find((m) => total < m);
  const hit = milestones.find((m) => total >= m);
  return (
    <div className="flex items-center gap-5">
      <CoinMark size={48} />
      <div>
        <p className={cn("font-mono text-[32px] font-medium leading-9 tabular-nums text-gold")}>
          {formatInt(total)}
        </p>
        <p className="mt-1 text-[12.5px] text-tertiary">
          One per completed workout.
          {hit ? ` Past ${hit}.` : next ? ` ${next - total} to ${next}.` : ""}
        </p>
      </div>
    </div>
  );
}
