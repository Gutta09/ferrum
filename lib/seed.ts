import { DEMO_USER_ID } from "./owner";
import type { Exercise, SetEntry, Workout, WorkoutExercise } from "./types";
import { addDays, e1rm, startOfWeek, toKey } from "./utils";

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export const EXERCISES: Exercise[] = [
  // Chest
  { id: "bench-press", name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell", difficulty: "Intermediate" },
  { id: "incline-db-press", name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell", difficulty: "Beginner" },
  { id: "weighted-dip", name: "Weighted Dip", muscle: "Chest", equipment: "Bodyweight", difficulty: "Intermediate" },
  { id: "cable-fly", name: "Cable Fly", muscle: "Chest", equipment: "Cable", difficulty: "Beginner" },
  { id: "machine-chest-press", name: "Machine Chest Press", muscle: "Chest", equipment: "Machine", difficulty: "Beginner" },
  // Back
  { id: "deadlift", name: "Deadlift", muscle: "Back", equipment: "Barbell", difficulty: "Advanced" },
  { id: "barbell-row", name: "Barbell Row", muscle: "Back", equipment: "Barbell", difficulty: "Intermediate" },
  { id: "pull-up", name: "Pull-Up", muscle: "Back", equipment: "Bodyweight", difficulty: "Intermediate" },
  { id: "lat-pulldown", name: "Lat Pulldown", muscle: "Back", equipment: "Cable", difficulty: "Beginner" },
  { id: "seated-cable-row", name: "Seated Cable Row", muscle: "Back", equipment: "Cable", difficulty: "Beginner" },
  { id: "chest-supported-row", name: "Chest-Supported Row", muscle: "Back", equipment: "Machine", difficulty: "Beginner" },
  // Legs
  { id: "back-squat", name: "Back Squat", muscle: "Legs", equipment: "Barbell", difficulty: "Advanced" },
  { id: "front-squat", name: "Front Squat", muscle: "Legs", equipment: "Barbell", difficulty: "Advanced" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscle: "Legs", equipment: "Barbell", difficulty: "Intermediate" },
  { id: "leg-press", name: "Leg Press", muscle: "Legs", equipment: "Machine", difficulty: "Beginner" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", muscle: "Legs", equipment: "Dumbbell", difficulty: "Intermediate" },
  { id: "leg-curl", name: "Seated Leg Curl", muscle: "Legs", equipment: "Machine", difficulty: "Beginner" },
  { id: "leg-extension", name: "Leg Extension", muscle: "Legs", equipment: "Machine", difficulty: "Beginner" },
  { id: "calf-raise", name: "Standing Calf Raise", muscle: "Legs", equipment: "Machine", difficulty: "Beginner" },
  // Shoulders
  { id: "overhead-press", name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell", difficulty: "Intermediate" },
  { id: "seated-db-press", name: "Seated Dumbbell Press", muscle: "Shoulders", equipment: "Dumbbell", difficulty: "Beginner" },
  { id: "lateral-raise", name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell", difficulty: "Beginner" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", muscle: "Shoulders", equipment: "Machine", difficulty: "Beginner" },
  { id: "face-pull", name: "Face Pull", muscle: "Shoulders", equipment: "Cable", difficulty: "Beginner" },
  // Arms
  { id: "barbell-curl", name: "Barbell Curl", muscle: "Arms", equipment: "Barbell", difficulty: "Beginner" },
  { id: "hammer-curl", name: "Hammer Curl", muscle: "Arms", equipment: "Dumbbell", difficulty: "Beginner" },
  { id: "triceps-pushdown", name: "Triceps Pushdown", muscle: "Arms", equipment: "Cable", difficulty: "Beginner" },
  { id: "skull-crusher", name: "Skull Crusher", muscle: "Arms", equipment: "Barbell", difficulty: "Intermediate" },
  // Core
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscle: "Core", equipment: "Bodyweight", difficulty: "Intermediate" },
  { id: "cable-crunch", name: "Cable Crunch", muscle: "Core", equipment: "Cable", difficulty: "Beginner" },
  { id: "ab-wheel", name: "Ab Wheel Rollout", muscle: "Core", equipment: "Bodyweight", difficulty: "Intermediate" },
];

export const PROFILE = {
  name: "Bhargav",
  handle: "@bhargav",
  since: "Feb 2025",
  program: "SBD Linear Progression",
};

// ---------------------------------------------------------------------------
// 8 weeks of a lifter mid-program (deterministic pseudo-random)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260706);
const pick = (min: number, max: number) => min + rand() * (max - min);
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

interface DayTemplate {
  name: string;
  /** [exerciseId, sets, baseTopWeight, weeklyIncrement, baseReps, backoffPct] */
  main: [string, number, number, number, number, number];
  accessories: [string, number, number, number][]; // id, sets, baseWeight, reps
}

const PROGRAM: DayTemplate[] = [
  {
    name: "Squat Day",
    main: ["back-squat", 4, 140, 2.5, 5, 0.9],
    accessories: [
      ["romanian-deadlift", 3, 100, 9],
      ["leg-press", 3, 220, 10],
      ["leg-curl", 3, 55, 11],
    ],
  },
  {
    name: "Bench Day",
    main: ["bench-press", 5, 100, 1.25, 5, 0.92],
    accessories: [
      ["incline-db-press", 3, 32, 9],
      ["cable-fly", 3, 22, 12],
      ["triceps-pushdown", 3, 30, 12],
    ],
  },
  {
    name: "Deadlift Day",
    main: ["deadlift", 4, 180, 2.5, 4, 0.88],
    accessories: [
      ["barbell-row", 3, 85, 8],
      ["pull-up", 3, 10, 8],
      ["hanging-leg-raise", 3, 0, 12],
    ],
  },
  {
    name: "Press Day",
    main: ["overhead-press", 5, 60, 0.75, 5, 0.92],
    accessories: [
      ["lateral-raise", 3, 12, 13],
      ["face-pull", 3, 25, 14],
      ["barbell-curl", 3, 35, 10],
    ],
  },
];

// Sessions land on Mon / Tue / Thu / Fri.
const DAY_OFFSETS = [0, 1, 3, 4];
const WEEKS = 8;

let setSeq = 0;
const sid = () => `s${(setSeq += 1)}`;
let exSeq = 0;
const xid = () => `x${(exSeq += 1)}`;

function buildHistory(): Workout[] {
  const workouts: Workout[] = [];
  const bestE1rm = new Map<string, number>();
  const today = new Date();
  const thisMonday = startOfWeek(today);
  const firstMonday = addDays(thisMonday, -7 * (WEEKS - 1));

  for (let w = 0; w < WEEKS; w += 1) {
    for (let d = 0; d < PROGRAM.length; d += 1) {
      const date = addDays(addDays(firstMonday, 7 * w), DAY_OFFSETS[d]);
      if (toKey(date) >= toKey(today)) continue; // today stays unlogged
      if (rand() < 0.06) continue; // the occasional missed session

      const tpl = PROGRAM[d];
      const [mainId, mainSets, baseW, inc, baseReps, backoff] = tpl.main;
      const exercises: WorkoutExercise[] = [];

      // main lift: top set + backoffs. Progression with honest bad days, so
      // PRs happen every couple of weeks — not every session.
      const topWeight = roundTo(baseW + inc * w + pick(-5, 2.5), 2.5);
      const sets: SetEntry[] = [];
      for (let s = 0; s < mainSets; s += 1) {
        const isTop = s === 0;
        const weight = isTop ? topWeight : roundTo(topWeight * backoff, 2.5);
        const reps = Math.max(
          3,
          Math.round(baseReps + (isTop ? pick(-2, 1) : pick(0, 2)))
        );
        const est = e1rm(weight, reps);
        const prev = bestE1rm.get(mainId) ?? 0;
        const isPR = isTop && est > prev + 0.5;
        if (isPR) bestE1rm.set(mainId, est);
        sets.push({
          id: sid(),
          weight,
          reps,
          rpe: roundTo(Math.min(9.5, (isTop ? 8.5 : 7.5) + pick(-0.5, 0.5)), 0.5),
          completed: true,
          isPR,
        });
      }
      exercises.push({ id: xid(), exerciseId: mainId, sets });

      for (const [accId, accSets, accBase, accReps] of tpl.accessories) {
        if (rand() < 0.1) continue; // ran out of time that day
        const weight = roundTo(accBase * (1 + 0.008 * w) + pick(-1, 1), 2.5);
        const accEntries: SetEntry[] = [];
        for (let s = 0; s < accSets; s += 1) {
          accEntries.push({
            id: sid(),
            weight: Math.max(0, weight),
            reps: Math.max(5, Math.round(accReps + pick(-2, 2))),
            rpe: roundTo(7.5 + pick(-0.5, 1), 0.5),
            completed: true,
          });
        }
        exercises.push({ id: xid(), exerciseId: accId, sets: accEntries });
      }

      workouts.push({
        id: `w-${toKey(date)}`,
        userId: DEMO_USER_ID,
        name: tpl.name,
        date: toKey(date),
        durationMin: Math.round(pick(48, 63)),
        exercises,
      });
    }
  }

  return workouts.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const WORKOUTS: Workout[] = buildHistory();

/** The next session in the program cycle — powers the dashboard CTA and the logging screen. */
export function nextProgramDay(): DayTemplate {
  const last = WORKOUTS[WORKOUTS.length - 1];
  const idx = PROGRAM.findIndex((p) => p.name === last?.name);
  return PROGRAM[(idx + 1) % PROGRAM.length];
}

export { PROGRAM };
export type { DayTemplate };
