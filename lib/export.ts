// Data in, data out. Trust is portability. Exports read the DB-backed cache;
// imports POST each workout to the owner-scoped API so they land in Postgres.

import type { Workout } from "./types";
import { getExercise } from "./repo";
import { toKey } from "./utils";
import { cachedWorkouts, ensureWorkouts, invalidateWorkouts } from "./workout-cache";

// the cache already holds only the signed-in user's rows
const mine = () => cachedWorkouts();

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON() {
  download(
    `ferrum-export-${toKey(new Date())}.json`,
    JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), workouts: mine() }, null, 2),
    "application/json"
  );
}

export function exportCSV() {
  const rows = [
    ["date", "workout", "exercise", "set", "weight_kg", "reps", "rpe", "is_pr"],
  ];
  for (const w of mine()) {
    for (const ex of w.exercises) {
      const name = getExercise(ex.exerciseId)?.name ?? ex.exerciseId;
      ex.sets.forEach((s, i) => {
        rows.push([
          w.date,
          w.name,
          name,
          String(i + 1),
          String(s.weight),
          String(s.reps),
          s.rpe !== undefined ? String(s.rpe) : "",
          s.isPR ? "1" : "0",
        ]);
      });
    }
  }
  const csv = rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
  download(`ferrum-export-${toKey(new Date())}.csv`, csv, "text/csv");
}

/** Imports valid workouts into the signed-in user's log via the server (they
 * become owner-scoped rows). Returns the count imported. */
export async function importJSON(file: File): Promise<number> {
  const text = await file.text();
  const data = JSON.parse(text) as { workouts?: Workout[] };
  const incoming = Array.isArray(data.workouts) ? data.workouts : [];
  let count = 0;
  for (const w of incoming) {
    if (!w?.date || !Array.isArray(w?.exercises)) continue;
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: w.name ?? "Imported",
        date: w.date,
        durationMin: w.durationMin ?? 0,
        exercises: w.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          notes: ex.notes,
          sets: ex.sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe ?? null,
            completed: s.completed,
            isPR: s.isPR,
          })),
        })),
      }),
    });
    if (res.ok) count += 1;
  }
  if (count) {
    invalidateWorkouts();
    await ensureWorkouts();
  }
  return count;
}
