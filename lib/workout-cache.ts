"use client";

// The client-side mirror of the user's DB workouts. Hydrated once from
// /api/workouts (owner-scoped server-side); every repo computation reads this
// instead of the old in-memory seed array. Invalidated after a save so the
// next read reflects the database.

import type { Workout } from "./types";

let cache: Workout[] | null = null;
let inflight: Promise<Workout[]> | null = null;

export async function ensureWorkouts(): Promise<Workout[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/api/workouts", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { workouts: [] }))
    .then((d: { workouts?: Workout[] }) => {
      cache = Array.isArray(d.workouts) ? d.workouts : [];
      inflight = null;
      return cache;
    })
    .catch(() => {
      cache = [];
      inflight = null;
      return cache;
    });
  return inflight;
}

/** Synchronous read for render-path helpers (ghost rows). Empty until hydrated;
 * the logging screen awaits ensureWorkouts() before it renders those. */
export function cachedWorkouts(): Workout[] {
  return cache ?? [];
}

export function invalidateWorkouts() {
  cache = null;
  inflight = null;
}

/** Optimistically fold a just-saved workout in so the UI updates before the
 * next fetch round-trips. */
export function pushWorkout(w: Workout) {
  cache = [...(cache ?? []), w];
}
