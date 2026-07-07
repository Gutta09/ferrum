// Deterministic, per-chart takeaways: the chart proves it, the sentence says
// it. These are the zero-AI floor; Gemini only rephrases them, never invents.

import type { E1rmPoint, MuscleShare, WeekPoint } from "./types";
import { formatInt, formatWeight } from "./utils";

export function volumeTakeaway(points: WeekPoint[]): string {
  const nz = points.filter((p) => p.volume > 0);
  if (nz.length < 2) return "Not enough weeks logged to read a trend yet.";
  const first = nz[0].volume;
  const last = nz[nz.length - 1].volume;
  const pct = Math.round(((last - first) / first) * 100);
  if (Math.abs(pct) < 5) return `Weekly volume steady around ${formatInt(last)} kg over ${nz.length} weeks.`;
  return `Weekly volume ${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% over ${nz.length} weeks.`;
}

export function e1rmTakeaway(lift: string, points: E1rmPoint[]): string {
  if (points.length < 2) return `Not enough ${lift} sessions to read a trend yet.`;
  const diff = points[points.length - 1].e1rm - points[0].e1rm;
  const prs = points.filter((p) => p.isPR).length;
  if (Math.abs(diff) < 1) return `${lift} e1RM flat across ${points.length} sessions.`;
  return `${lift} e1RM ${diff > 0 ? "up" : "down"} ${formatWeight(Math.abs(diff))} kg across ${points.length} sessions${prs ? ` · ${prs} PR${prs > 1 ? "s" : ""}` : ""}.`;
}

export function setsTakeaway(points: WeekPoint[]): string {
  const nz = points.filter((p) => p.volume > 0);
  if (!nz.length) return "No completed sets in this range yet.";
  const avg = Math.round(nz.reduce((s, p) => s + p.volume, 0) / nz.length);
  return `Averaging ${avg} sets per training week.`;
}

export function balanceTakeaway(shares: MuscleShare[]): string {
  if (shares.length < 2) return "Log more lifts to read your split.";
  const top = shares[0];
  const bottom = shares[shares.length - 1];
  return `${top.muscle} takes ${Math.round(top.share * 100)}% of your training · ${bottom.muscle} just ${Math.round(bottom.share * 100)}%.`;
}

export function consistencyTakeaway(c: {
  currentWeeks: number;
  longestWeeks: number;
  activeDays: number;
}): string {
  if (c.activeDays === 0) return "No sessions logged yet.";
  return `${c.activeDays} active days · ${c.currentWeeks}-week streak (best ${c.longestWeeks}).`;
}

/** Grounding validation: a rephrased line may only contain numbers that
 * already exist in the deterministic facts. Foreign number → drop the line. */
export function groundedOnly(lines: string[], facts: string[]): string[] {
  const allowed = new Set(
    facts.flatMap((f) => (f.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))
  );
  return lines.filter((line) =>
    (line.match(/\d+(?:\.\d+)?/g) ?? []).every((n) => allowed.has(Number(n)))
  );
}
