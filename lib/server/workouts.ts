import "server-only";
import { prisma } from "@/lib/db";
import type { Workout } from "@/lib/types";

/** All of one user's workouts as the app's Workout shape. Owner-scoping is the
 * WHERE clause — a query can only ever return the caller's rows. */
export async function listWorkouts(userId: string): Promise<Workout[]> {
  const rows = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { sets: { orderBy: { position: "asc" } } },
      },
    },
  });
  return rows.map((w) => ({
    id: w.id,
    userId: w.userId,
    name: w.name,
    date: w.date,
    durationMin: w.durationMin,
    exercises: w.exercises.map((ex) => ({
      id: ex.id,
      exerciseId: ex.exerciseId,
      notes: ex.notes ?? undefined,
      sets: ex.sets.map((s) => ({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? undefined,
        completed: s.completed,
        isPR: s.isPR,
      })),
    })),
  }));
}

// --- input validation (server-side, never trust the client) ---

export interface SaveSet {
  weight: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
  isPR?: boolean;
}
export interface SaveExercise {
  exerciseId: string;
  notes?: string;
  sets: SaveSet[];
}
export interface SaveWorkoutInput {
  name: string;
  date: string;
  durationMin: number;
  exercises: SaveExercise[];
}

const clampNum = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

/** Sanitise + bound every field before it reaches the DB. Rejects empties. */
export function validateWorkout(raw: unknown): SaveWorkoutInput {
  const w = raw as Partial<SaveWorkoutInput>;
  if (!w || typeof w !== "object") throw new Error("invalid workout");
  const date = String(w.date ?? "").match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(w.date)
    : new Date().toISOString().slice(0, 10);
  const exercises = Array.isArray(w.exercises) ? w.exercises : [];
  const cleanExercises: SaveExercise[] = exercises
    .slice(0, 40)
    .map((ex) => ({
      exerciseId: String(ex.exerciseId).slice(0, 80),
      notes: ex.notes ? String(ex.notes).slice(0, 500) : undefined,
      sets: (Array.isArray(ex.sets) ? ex.sets : [])
        .slice(0, 30)
        .filter((s) => s && s.completed) // only completed sets are logged
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
  return prisma.workout.create({
    data: {
      userId,
      name: input.name,
      date: input.date,
      durationMin: input.durationMin,
      exercises: {
        create: input.exercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          position: i,
          notes: ex.notes ?? null,
          sets: {
            create: ex.sets.map((s, j) => ({
              position: j,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe ?? null,
              completed: s.completed,
              isPR: s.isPR ?? false,
            })),
          },
        })),
      },
    },
  });
}

export async function renameWorkout(userId: string, workoutId: string, name: string) {
  // owner-scoped update: the WHERE includes userId, so another user's row
  // can't be touched even with a guessed id
  await prisma.workout.updateMany({
    where: { id: workoutId, userId },
    data: { name: String(name).slice(0, 80) },
  });
}

/** Persist a user-created custom exercise (confirm-before-commit already ran). */
export async function saveCustomExercise(
  userId: string,
  ex: { id: string; name: string; muscle: string; equipment: string; difficulty: string }
) {
  await prisma.exercise.upsert({
    where: { id: ex.id },
    update: {},
    create: {
      id: ex.id,
      userId,
      name: ex.name.slice(0, 80),
      muscle: ex.muscle,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
    },
  });
}

export async function listCustomExercises(userId: string) {
  return prisma.exercise.findMany({ where: { userId } });
}
