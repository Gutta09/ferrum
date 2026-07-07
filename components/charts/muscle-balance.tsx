"use client";

import { motion } from "framer-motion";
import type { MuscleShare } from "@/lib/types";

export function MuscleBalance({ shares }: { shares: MuscleShare[] }) {
  const max = Math.max(...shares.map((s) => s.share), 0.0001);
  return (
    <div className="flex flex-col gap-4">
      {shares.map((s, i) => (
        <div key={s.muscle} className="flex items-center gap-4">
          <span className="w-24 shrink-0 text-[13px] text-secondary">{s.muscle}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.05]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(s.share / max) * 100}%` }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 0.61, 0.36, 1] }}
              className="h-full rounded-full bg-ink/40"
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-[13px] tabular-nums text-primary">
            {Math.round(s.share * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
