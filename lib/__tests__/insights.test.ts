import { describe, expect, it } from "vitest";
import { groundedOnly, volumeTakeaway, balanceTakeaway } from "../insights";
import type { WeekPoint, MuscleShare } from "../types";

const wk = (volume: number): WeekPoint => ({ weekStart: "", label: "", volume });

describe("groundedOnly — anti-hallucination filter", () => {
  const facts = ["Weekly volume up 12% over 5 weeks.", "3 active days"];

  it("keeps lines whose numbers all appear in the facts", () => {
    const lines = ["Your volume climbed 12% across 5 weeks.", "Great 3-day consistency."];
    expect(groundedOnly(lines, facts)).toEqual(lines);
  });

  it("drops any line containing a number not present in the facts", () => {
    const lines = ["You improved 12% this month.", "You hit a 200kg PR."]; // 200 is invented
    expect(groundedOnly(lines, facts)).toEqual(["You improved 12% this month."]);
  });

  it("keeps number-free lines untouched", () => {
    expect(groundedOnly(["Keep showing up."], facts)).toEqual(["Keep showing up."]);
  });

  it("handles decimals in both facts and lines", () => {
    expect(groundedOnly(["Ratio was 2.5 today."], ["load 2.5"])).toEqual(["Ratio was 2.5 today."]);
    expect(groundedOnly(["Ratio was 2.6 today."], ["load 2.5"])).toEqual([]);
  });
});

describe("chart takeaways", () => {
  it("needs at least two non-zero weeks to read a volume trend", () => {
    expect(volumeTakeaway([wk(0), wk(100)])).toMatch(/Not enough weeks/);
  });

  it("reports the direction of a volume change", () => {
    expect(volumeTakeaway([wk(100), wk(150)])).toMatch(/up 50%/);
    expect(volumeTakeaway([wk(200), wk(150)])).toMatch(/down 25%/);
  });

  it("calls near-flat volume steady", () => {
    expect(volumeTakeaway([wk(100), wk(103)])).toMatch(/steady/);
  });

  it("summarizes the muscle split from top and bottom shares", () => {
    const shares: MuscleShare[] = [
      { muscle: "Chest" as MuscleShare["muscle"], volume: 400, share: 0.4 },
      { muscle: "Legs" as MuscleShare["muscle"], volume: 100, share: 0.1 },
    ];
    expect(balanceTakeaway(shares)).toMatch(/Chest takes 40%.*Legs just 10%/);
  });
});
