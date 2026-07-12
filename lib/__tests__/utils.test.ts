import { describe, expect, it } from "vitest";
import { e1rm, setVolume, formatCompact, formatDuration, formatClock, toKey } from "../utils";

describe("e1rm (Epley)", () => {
  it("returns the weight itself for a single rep", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 0)).toBe(100);
  });

  it("estimates a higher 1RM for multi-rep sets, rounded to 0.5kg", () => {
    // 100 * (1 + 5/30) = 116.67 → 116.5
    expect(e1rm(100, 5)).toBe(116.5);
  });
});

describe("formatting helpers", () => {
  it("setVolume multiplies weight by reps", () => {
    expect(setVolume(80, 8)).toBe(640);
  });

  it("compacts large numbers", () => {
    expect(formatCompact(500)).toBe("500");
    expect(formatCompact(12_500)).toBe("12.5k");
    expect(formatCompact(2_000_000)).toBe("2.0M");
  });

  it("formats durations and clocks", () => {
    expect(formatDuration(75)).toBe("1h 15m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatClock(125)).toBe("2:05");
  });

  it("builds local ISO date keys", () => {
    expect(toKey(new Date(2026, 6, 5))).toBe("2026-07-05");
  });
});
