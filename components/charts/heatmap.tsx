"use client";

import { useState } from "react";
import type { HeatmapDay } from "@/lib/types";
import { formatKg, formatShort, fromKey } from "@/lib/utils";

// lightness-monotonic emerald ramp (validated), level 0 = rest day
const LEVELS = [
  "rgba(255,255,255,0.04)",
  "#14523C",
  "#1F7A57",
  "#2BA372",
  "#34D399",
];

const CELL = 12;
const GAP = 3;

interface Tip {
  left: number;
  top: number;
  day: HeatmapDay;
}

export function Heatmap({ grid }: { grid: HeatmapDay[][] }) {
  const [tip, setTip] = useState<Tip | null>(null);

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
                    day.volume > 0
                      ? `${formatShort(day.date)}: ${formatKg(day.volume)}`
                      : `${formatShort(day.date)}: rest day`
                  }
                  onMouseEnter={(e) => show(e, day)}
                  onFocus={(e) => show(e, day)}
                  onMouseLeave={() => setTip(null)}
                  onBlur={() => setTip(null)}
                  className="rounded-[3px] transition-transform duration-100 hover:scale-110"
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
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-input border border-line bg-[#1B1C20] px-3 py-1.5 shadow-ambient"
            style={{ left: tip.left, top: tip.top - 6 }}
            role="status"
          >
            <span className="font-mono text-[12px] tabular-nums text-primary">
              {tip.day.volume > 0 ? formatKg(tip.day.volume) : "Rest"}
            </span>
            <span className="ml-2 text-[11px] text-tertiary">
              {formatShort(tip.day.date)}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 pl-[30px] text-[10px] text-tertiary">
          <span className="mr-1">Less</span>
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
