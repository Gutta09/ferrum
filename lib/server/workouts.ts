import "server-only";
import { collections, ensureIndexes, newId } from "@/lib/mongo";
import { DEMO_USER_ID } from "@/lib/owner";
import type { Workout } from "@/lib/types";

/** All of one user's workouts as the app's Workout shape. Owner-scoping is the
 * query filter — it can only ever return the caller's documents. Exercises and
 * sets are embedded, so no joins; synthetic ids are assigned for React keys.
 * The guest account is a clean, empty slate (no seed, no DB writes). */
export async function listWorkouts(userId: string): Promise<Workout[]> {
  if (userId === DEMO_USER_ID) return [];
  await ensureIndexes();
  const { workouts } = await collections();
  const rows = await workouts.find({ userId }).sort({ date: 1 }).toArray();
  return rows.map((w) => ({
    id: w._id,
    userId: w.userId,
    name: w.name,
    date: w.date,
    durationMin: w.durationMin,
    exercises: w.exercises.map((ex, i) => ({
      id: `${w._id}-${i}`,
      exerciseId: ex.exerciseId,
      notes: ex.notes ?? undefined,
      sets: ex.sets.map((s, j) => ({
        id: `${w._id}-${i}-${j}`,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? undefined,
        completed: s.completed,
        isPR: Boolean(s.isPR),
      })),
    })),
  }));
}

// --- input validation (server-side, never trust the client) ---

export interface SaveWorkoutInput {
  name: string;
  date: string;
  durationMin: number;
  exercises: {
    exerciseId: string;
    notes?: string;
    sets: { weight: number; reps: number; rpe?: number | null; completed: boolean; isPR?: boolean }[];
  }[];
}

const clampNum = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

export function validateWorkout(raw: unknown): SaveWorkoutInput {
  const w = raw as Partial<SaveWorkoutInput>;
  if (!w || typeof w !== "object") throw new Error("invalid workout");
  const date = String(w.date ?? "").match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(w.date)
    : new Date().toISOString().slice(0, 10);
  const exercises = Array.isArray(w.exercises) ? w.exercises : [];
  const cleanExercises = exercises
    .slice(0, 40)
    .map((ex) => ({
      exerciseId: String(ex.exerciseId).slice(0, 80),
      notes: ex.notes ? String(ex.notes).slice(0, 500) : undefined,
      sets: (Array.isArray(ex.sets) ? ex.sets : [])
        .slice(0, 30)
        .filter((s) => s && s.completed)
        .map((s) => ({
          weight: clampNum(s.weight, 0, 1000, 0),
          reps: Math.round(clampNum(s.reps, 0, 100, 0)),
          rpe: s.rpe == null ? null : clampNum(s.rpe, 1, 10, 8),
          completed: true,
          isPR: Boolean(s.isPR),
        })),
    }))
    .filter((ex) => ex.sets.length > 0);

  if (cleanExercises.length === 0) throw new Error("nothing to save");
  return {
    name: String(w.name ?? "Session").slice(0, 80) || "Session",
    date,
    durationMin: Math.round(clampNum(w.durationMin, 0, 600, 0)),
    exercises: cleanExercises,
  };
}

export async function saveWorkout(userId: string, input: SaveWorkoutInput) {
  const { workouts } = await collections();
  const _id = newId("w");
  await workouts.insertOne({
    _id,
    userId,
    name: input.name,
    date: input.date,
    durationMin: input.durationMin,
    createdAt: new Date(),
    exercises: input.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      notes: ex.notes,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? null,
        completed: s.completed,
        isPR: s.isPR ?? false,
      })),
    })),
  });
  return { id: _id };
}

export async function renameWorkout(userId: string, workoutId: string, name: string) {
  // owner-scoped: userId is in the filter, so another user's doc can't be hit
  const { workouts } = await collections();
  await workouts.updateOne({ _id: workoutId, userId }, { $set: { name: String(name).slice(0, 80) } });
}

export async function saveCustomExercise(
  userId: string,
  ex: { id: string; name: string; muscle: string; equipment: string; difficulty: string }
) {
  const { exercises } = await collections();
  await exercises.updateOne(
    { _id: ex.id },
    { $setOnInsert: { userId, name: ex.name.slice(0, 80), muscle: ex.muscle, equipment: ex.equipment, difficulty: ex.difficulty } },
    { upsert: true }
  );
}

export async function listCustomExercises(userId: string) {
  const { exercises } = await collections();
  return exercises.find({ userId }).toArray();
}
