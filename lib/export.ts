// Data in, data out — even against the mock store. Trust is portability.

import { activeUserId } from "./owner";
import { WORKOUTS } from "./seed";
import type { Workout } from "./types";
import { getExercise } from "./repo";
import { toKey } from "./utils";

// exports carry only the signed-in user's log; imports become theirs
const mine = () => WORKOUTS.filter((w) => w.userId === activeUserId());

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

/** Merges valid workouts into the mock store; returns the count imported. */
export async function importJSON(file: File): Promise<number> {
  const text = await file.text();
  const data = JSON.parse(text) as { workouts?: Workout[] };
  const incoming = Array.isArray(data.workouts) ? data.workouts : [];
  const existing = new Set(WORKOUTS.map((w) => w.id));
  let count = 0;
  for (const w of incoming) {
    if (!w?.id || !w?.date || !Array.isArray(w?.exercises) || existing.has(w.id)) continue;
    WORKOUTS.push({ ...w, userId: activeUserId() });
    count += 1;
  }
  WORKOUTS.sort((a, b) => (a.date < b.date ? -1 : 1));
  return count;
}
