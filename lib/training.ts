// Training math: plate breakdowns and the auto-progression rule.

import type { LastPerformance } from "./types";
import { formatWeight } from "./utils";

const PLATES: Record<"kg" | "lb", number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export interface PlatePart {
  plate: number;
  count: number;
}

export interface PlateLoad {
  perSide: PlatePart[];
  bar: number;
  /** false when the remainder can't be loaded with standard plates */
  exact: boolean;
  belowBar: boolean;
}

export function plateBreakdown(
  total: number,
  bar: number,
  unit: "kg" | "lb"
): PlateLoad {
  if (total <= bar)
    return { perSide: [], bar, exact: total === bar, belowBar: total < bar };
  let side = (total - bar) / 2;
  const perSide: PlatePart[] = [];
  for (const plate of PLATES[unit]) {
    const count = Math.floor(side / plate + 1e-9);
    if (count > 0) {
      perSide.push({ plate, count });
      side -= count * plate;
    }
  }
  return { perSide, bar, exact: side < 0.01, belowBar: false };
}

// ---------------------------------------------------------------------------

export interface Suggestion {
  weight: number;
  reps: number;
  reason: string;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** The progression rule (stated in DESIGN.md):
 *  top set at RPE ≤ 7 → +2.5% (min one 2.5 kg step);
 *  RPE ≥ 9 → hold;
 *  in between (or no RPE) → repeat last top set. */
export function suggestTarget(last?: LastPerformance): Suggestion | undefined {
  const top = last?.sets[0];
  if (!top || top.weight <= 0) return undefined;
  const base = `Last: ${formatWeight(top.weight)}×${top.reps}${
    top.rpe !== undefined ? ` @RPE${formatWeight(top.rpe)}` : ""
  }`;

  if (top.rpe !== undefined && top.rpe <= 7) {
    const next = Math.max(roundTo(top.weight * 1.025, 2.5), top.weight + 2.5);
    return {
      weight: next,
      reps: top.reps,
      reason: `${base} → +${formatWeight(next - top.weight)} kg`,
    };
  }
  if (top.rpe !== undefined && top.rpe >= 9) {
    return { weight: top.weight, reps: top.reps, reason: `${base} → hold` };
  }
  return { weight: top.weight, reps: top.reps, reason: `${base} → repeat` };
}
