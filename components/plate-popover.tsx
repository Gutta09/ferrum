"use client";

import { useSettings } from "@/lib/settings";
import { plateBreakdown } from "@/lib/training";
import { formatWeight } from "@/lib/utils";

/** Live plate math under a focused weight field. Zero taps, zero confirm —
 * it follows the number as you type. Barbell lifts only. */
export function PlatePopover({ weight }: { weight?: number }) {
  const { barWeight, unit } = useSettings();
  if (!weight || weight <= 0) return null;
  const load = plateBreakdown(weight, barWeight, unit);

  return (
    <div
      role="status"
      className="absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-input border border-line bg-card px-3 py-2 shadow-ambient"
    >
      {load.belowBar ? (
        <span className="text-[11px] text-tertiary">below the {formatWeight(load.bar)} {unit} bar</span>
      ) : (
        <div className="flex items-center gap-1.5">
          {load.perSide.length === 0 ? (
            <span className="font-mono text-[11.5px] tabular-nums text-secondary">bar only</span>
          ) : (
            load.perSide.map((p) => (
              <span
                key={p.plate}
                className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[11.5px] tabular-nums text-primary"
              >
                {p.plate}
                {p.count > 1 && <span className="text-tertiary">×{p.count}</span>}
              </span>
            ))
          )}
          <span className="ml-1 text-[10.5px] text-tertiary">
            {load.exact ? "" : "≈ "}per side · bar {formatWeight(load.bar)}
          </span>
        </div>
      )}
    </div>
  );
}
