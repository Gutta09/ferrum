import { describe, expect, it } from "vitest";
import { EXERCISES } from "../seed";
import { cleanLine, guessMeta, parsePastedWorkout } from "../paste-workout";

describe("cleanLine", () => {
  it.each([
    ["1. Bench Press 4x8 @ 80kg", "Bench Press"],
    ["- Incline DB Press: 3 sets x 10 reps", "Incline DB Press"],
    ["• Lat Pulldown 3×12", "Lat Pulldown"],
    ["A1) Romanian Deadlift - 3 x 8 RPE 8", "Romanian Deadlift"],
    ["Lateral raises 4 sets 15 reps (slow)", "Lateral raises"],
    ["Squats — 5x5 100kg", "Squats"],
    ["Face pulls x15", "Face pulls"],
    ["**Leg Press** 3x12", "Leg Press"],
  ])("%s → %s", (raw, want) => expect(cleanLine(raw)).toBe(want));
});

describe("parsePastedWorkout", () => {
  it("matches catalog names and drops all numbers + headings", () => {
    const text = `Push Day
Warm up
1. Bench 4x8 @ 80
2. Incline DB press 3x10
3. OHP 3x8
4. Lateral raises 4x15
5. Tricep pushdowns 3x12
6. Hip Thrust 3x10`;
    const r = parsePastedWorkout(text, EXERCISES);
    expect(r.map((x) => x.name)).toEqual([
      "Barbell Bench Press",
      "Incline Dumbbell Press",
      "Overhead Press",
      "Lateral Raise",
      "Triceps Pushdown",
      "Hip Thrust",
    ]);
    expect(r[5].match).toBeNull();
  });

  it("de-duplicates repeats", () => {
    const r = parsePastedWorkout("RDL 3x8\nRomanian deadlift 3x8", EXERCISES);
    expect(r).toHaveLength(1);
  });

  it("doesn't map a vague 'curl' onto leg curl", () => {
    const r = parsePastedWorkout("Leg curl 3x12\nPreacher curl 3x10", EXERCISES);
    expect(r[0].match?.id).toBe("leg-curl");
    expect(r[1].match).toBeNull();
  });
});

describe("guessMeta", () => {
  it("guesses for unknown lifts", () => {
    expect(guessMeta("Preacher Curl")).toEqual({ muscle: "Arms", equipment: "Machine" });
    expect(guessMeta("Hip Thrust").muscle).toBe("Legs");
    expect(guessMeta("Cable Lateral Raise")).toEqual({ muscle: "Shoulders", equipment: "Cable" });
  });
});

describe("real pasted shoulder day", () => {
  it("logs names only, right muscles, no heading", () => {
    const text = `Shoulder workout
1.seated lateral raise
2.smith machine shoulder press
3.dumbbell neutral press
4.reverse pec 
5.dumbbell upright row
6.face pulls 
7.dumbbell front raises`;
    const r = parsePastedWorkout(text, EXERCISES);
    expect(r.map((x) => x.name)).toEqual([
      "Lateral Raise",
      "Smith Machine Shoulder Press",
      "Dumbbell Neutral Press",
      "Reverse Pec",
      "Dumbbell Upright Row",
      "Face Pull",
      "Dumbbell Front Raises",
    ]);
    for (const x of r.filter((x) => !x.match)) expect(guessMeta(x.name).muscle).toBe("Shoulders");
  });
});
