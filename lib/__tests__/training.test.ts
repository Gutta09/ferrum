import { describe, expect, it } from "vitest";
import { plateBreakdown, suggestTarget } from "../training";
import type { LastPerformance } from "../types";

describe("plateBreakdown", () => {
  it("loads a standard 100kg on a 20kg bar greedily (40 per side = 25+15)", () => {
    const load = plateBreakdown(100, 20, "kg");
    expect(load.perSide).toEqual([{ plate: 25, count: 1 }, { plate: 15, count: 1 }]);
    expect(load.exact).toBe(true);
    expect(load.belowBar).toBe(false);
  });

  it("uses the largest plates first and can repeat a plate", () => {
    // 140 on a 20 bar = 60 per side = 25 + 25 + 10
    const load = plateBreakdown(register(20, 25, 25, 10), 20, "kg");
    expect(load.perSide).toEqual([{ plate: 25, count: 2 }, { plate: 10, count: 1 }]);
    expect(load.exact).toBe(true);
  });

  it("flags a non-loadable remainder as inexact", () => {
    const load = plateBreakdown(21, 20, "kg"); // 0.5 per side, no 0.5 plate in kg set
    expect(load.exact).toBe(false);
  });

  it("reports below-bar and at-bar cases", () => {
    expect(plateBreakdown(15, 20, "kg").belowBar).toBe(true);
    expect(plateBreakdown(20, 20, "kg").exact).toBe(true);
    expect(plateBreakdown(20, 20, "kg").perSide).toEqual([]);
  });
});

// helper: total weight = bar + 2 * sum(plates)
function register(bar: number, ...plates: number[]): number {
  return bar + 2 * plates.reduce((s, p) => s + p, 0);
}

function last(weight: number, reps: number, rpe?: number): LastPerformance {
  return { date: "2026-07-01", sets: [{ weight, reps, ...(rpe !== undefined ? { rpe } : {}) }] };
}

describe("suggestTarget (RPE progression rule)", () => {
  it("adds weight when the last top set was easy (RPE ≤ 7)", () => {
    const s = suggestTarget(last(100, 5, 7));
    expect(s?.weight).toBeGreaterThan(100);
    expect(s?.reason).toMatch(/\+/);
  });

  it("enforces a minimum 2.5kg step even on light loads", () => {
    // 40 * 1.025 = 41 → but min step is +2.5 → 42.5
    expect(suggestTarget(last(40, 8, 6))?.weight).toBe(42.5);
  });

  it("holds when the last set was maximal (RPE ≥ 9)", () => {
    const s = suggestTarget(last(120, 3, 9));
    expect(s?.weight).toBe(120);
    expect(s?.reason).toMatch(/hold/);
  });

  it("repeats when RPE is middling or absent", () => {
    expect(suggestTarget(last(80, 8))?.reason).toMatch(/repeat/);
    expect(suggestTarget(last(80, 8, 8))?.reason).toMatch(/repeat/);
  });

  it("returns nothing without a usable last set", () => {
    expect(suggestTarget(undefined)).toBeUndefined();
    expect(suggestTarget(last(0, 5))).toBeUndefined();
  });
});
