"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HeatmapDay } from "@/lib/types";
import { formatShort, fromKey } from "@/lib/utils";

// lightness-monotonic emerald ramp (validated), level 0 = rest day
const LEVELS = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
];

const CELL = 15;
const GAP = 3;

interface Tip {
  left: number;
  top: number;
  day: HeatmapDay;
}

export function Heatmap({ grid }: { grid: HeatmapDay[][] }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const router = useRouter();
  const today = new Date();
  const openDay = (day: HeatmapDay) => {
    if (day.variations > 0) router.push(`/history?d=${day.date}`);
    else if (fromKey(day.date) <= today) router.push("/workout");
  };

  const show = (e: React.SyntheticEvent<HTMLButtonElement>, day: HeatmapDay) => {
    const el = e.currentTarget;
    setTip({ left: el.offsetLeft + CELL / 2, top: el.offsetTop, day });
  };

  const monthLabels = grid.map((col, i) => {
    const first = fromKey(col[0].date);
    if (i === 0) return null;
    const prev = fromKey(grid[i - 1][0].date);
    return first.getMonth() !== prev.getMonth()
      ? first.toLocaleString("en-US", { month: "short" })
      : null;
  });

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative inline-block">
        <div className="mb-1.5 flex" style={{ gap: GAP, paddingLeft: 30 }}>
          {monthLabels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] text-tertiary"
              style={{ width: CELL, overflow: "visible", whiteSpace: "nowrap" }}
            >
              {label ?? ""}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap: GAP }}>
          <div
            className="flex flex-col text-[10px] leading-none text-tertiary"
            style={{ gap: GAP, width: 26 }}
            aria-hidden
          >
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
              <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>
                {d}
              </span>
            ))}
          </div>
          {grid.map((col, ci) => (
            <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
              {col.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  aria-label={
                    day.variations > 0
                      ? `${formatShort(day.date)}: ${day.variations} variations, ${day.sets} sets — open in history`
                      : `${formatShort(day.date)}: rest day`
                  }
                  onMouseEnter={(e) => show(e, day)}
                  onFocus={(e) => show(e, day)}
                  onMouseLeave={() => setTip(null)}
                  onBlur={() => setTip(null)}
                  onClick={() => openDay(day)}
                  className="rounded-[3px] transition-transform duration-100 hover:scale-110 hover:ring-1 hover:ring-line-hover"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: LEVELS[day.level],
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {tip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-input border border-line bg-card px-3 py-2 shadow-ambient"
            style={{ left: tip.left, top: tip.top - 6 }}
            role="status"
          >
            {tip.day.variations > 0 ? (
              <>
                <span className="block text-[12px] font-medium text-primary">
                  {tip.day.workoutName ?? "Workout"}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-secondary">
                  {tip.day.variations} variation{tip.day.variations === 1 ? "" : "s"} ·{" "}
                  {tip.day.sets} set{tip.day.sets === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="text-[12px] text-secondary">Rest</span>
            )}
            <span className="mt-0.5 block text-[11px] text-tertiary">
              {formatShort(tip.day.date)}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 pl-[30px] text-[10px] text-tertiary">
          <span className="mr-1">Fewer variations</span>
          {LEVELS.map((c) => (
            <span
              key={c}
              className="rounded-[3px]"
              style={{ width: 10, height: 10, background: c }}
            />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
    </div>
  );
}
