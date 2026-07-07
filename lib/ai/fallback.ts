// Deterministic fallbacks — the app's floor when the API is absent,
// rate-limited, or wrong. Same shapes as the provider, zero network.

import type { ParseResult, SessionFacts, WeekFacts } from "./provider";

/** "bench 3x8 @ 80 rpe 8" → exercise + sets. Strict: no guess, no invention. */
export function regexParseSets(input: string): ParseResult {
  const m = input
    .trim()
    .match(
      /^(.*?)\s*(\d{1,2})\s*[x×]\s*(\d{1,3})\s*(?:@|at)?\s*(\d{1,4}(?:[.,]\d)?)?\s*(?:kg|kgs|kilos?)?\s*(?:@?\s*rpe\s*(\d{1,2}(?:[.,]5)?))?\s*$/i
    );
  if (!m) return { sets: [], needsClarification: true };
  const [, name, count, reps, weight, rpe] = m;
  const n = Math.min(parseInt(count, 10), 12);
  const set = {
    weight: weight ? parseFloat(weight.replace(",", ".")) : undefined,
    reps: parseInt(reps, 10),
    rpe: rpe ? parseFloat(rpe.replace(",", ".")) : undefined,
  };
  return {
    exercise: name.trim() || undefined,
    sets: Array.from({ length: n }, () => ({ ...set })),
    needsClarification: !weight,
  };
}

export function templateSummary(f: SessionFacts): string {
  const delta =
    f.lastVolume && f.lastVolume > 0
      ? ` · ${f.volume >= f.lastVolume ? "+" : "−"}${Math.abs(
          Math.round(((f.volume - f.lastVolume) / f.lastVolume) * 100)
        )}% vs last ${f.name}`
      : "";
  const pr = f.prCount > 0 ? ` · ${f.prCount} PR${f.prCount > 1 ? "s" : ""}` : "";
  return `${f.setsDone} sets in ${Math.round(f.seconds / 60)} min${delta}${pr}.`;
}

export function templateRecap(f: WeekFacts): string {
  if (f.volume === 0 && f.sessions === 0) return "";
  const delta =
    f.prevVolume > 0
      ? `${f.volume >= f.prevVolume ? "+" : "−"}${Math.abs(
          Math.round(((f.volume - f.prevVolume) / f.prevVolume) * 100)
        )}% vs the week before`
      : "first tracked week";
  return `Last week: ${f.sessions} session${f.sessions === 1 ? "" : "s"} · workload ${delta}.`;
}

/** Fat-finger rule: weight far beyond this lift's history, or absurd reps.
 * Pure numbers; AI only ever rephrases this, never decides it. */
export function sanityCheck(
  weight: number,
  reps: number,
  bestWeight: number
): string | undefined {
  if (reps > 30) return `${reps} reps looks like a typo.`;
  if (bestWeight > 0 && weight > bestWeight * 1.6 + 10)
    return `${weight} kg is far beyond your ${bestWeight} kg best here — typo?`;
  return undefined;
}
