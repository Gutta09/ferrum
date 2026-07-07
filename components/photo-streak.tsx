"use client";

import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useRef } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { activeUserId } from "@/lib/owner";
import { addPhotoFile, usePhotos } from "@/lib/photo-store";
import { addDays, cn, formatInt, toKey } from "@/lib/utils";

/** Daily photo streak: one photo per calendar day keeps it alive; a missed
 * day resets it at local midnight. Gold — earned daily, like the coin. */
export function usePhotoStreak() {
  const photos = usePhotos().filter((p) => p.userId === activeUserId());
  const days = new Set(photos.map((p) => p.date));
  const today = toKey(new Date());
  const todayDone = days.has(today);
  let cursor = todayDone ? new Date() : addDays(new Date(), -1);
  let count = 0;
  while (days.has(toKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, todayDone };
}

export function PhotoStreakCard({ compact }: { compact?: boolean }) {
  const { count, todayDone } = usePhotoStreak();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card interactive className={cn("flex flex-col p-5", compact && "p-4")}>
      <CardLabel>Photo streak</CardLabel>
      <div className="mt-3 flex items-end justify-between gap-3">
        <motion.p
          key={count}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="font-mono text-[28px] font-medium leading-8 tracking-tight tabular-nums text-gold"
        >
          {formatInt(count)}
          <span className="ml-1 text-[14px] font-normal text-tertiary">
            {count === 1 ? "day" : "days"}
          </span>
        </motion.p>
      </div>
      <div className="mt-2">
        {todayDone ? (
          <span className="text-[12px] text-tertiary">Today&apos;s photo is in.</span>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-[12px] text-secondary transition-colors hover:text-primary"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Add today&apos;s photo
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) addPhotoFile(f);
        }}
      />
    </Card>
  );
}
