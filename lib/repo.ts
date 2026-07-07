// Typed mock repositories. Everything async so a real API can drop in behind
// the same interfaces; stats are derived from the log, never stored.

import { activeUserId } from "./owner";
import { EXERCISES, WORKOUTS } from "./seed";
import type {
  Difficulty,
  E1rmPoint,
  Equipment,
  Exercise,
  HeatmapDay,
  LastPerformance,
  LifetimeStats,
  MuscleGroup,
  MuscleShare,
  PersonalRecord,
  WeekPoint,
  Workout,
} from "./types";
import {
  addDays,
  e1rm,
  formatShort,
  startOfWeek,
  toKey,
} from "./utils";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// every query is scoped to the signed-in user; the exercise library is global
const byUser = () => WORKOUTS.filter((w) => w.userId === activeUserId());

/** lifetime workout count for the active user — the coin vault reads this */
export const userWorkoutCount = () => byUser().length;

const exerciseById = new Map(EXERCISES.map((e) => [e.id, e]));
export function getExercise(id: string): Exercise | undefined {
  // the map is built at load; user-created exercises land in the array later
  const hit = exerciseById.get(id) ?? EXERCISES.find((e) => e.id === id);
  if (hit && !exerciseById.has(id)) exerciseById.set(id, hit);
  return hit;
}

/** Most recent logged sets for an exercise — the ghost data. Sync: the logging
 * screen reads it per-row. */
export function lastPerformance(exerciseId: string): LastPerformance | undefined {
  for (let i = byUser().length - 1; i >= 0; i -= 1) {
    const we = byUser()[i].exercises.find((x) => x.exerciseId === exerciseId);
    if (we) {
      return {
        date: byUser()[i].date,
        sets: we.sets.map(({ weight, reps, rpe }) => ({ weight, reps, rpe })),
      };
    }
  }
  return undefined;
}

export function bestE1rm(exerciseId: string): number {
  let best = 0;
  for (const w of byUser()) {
    const we = w.exercises.find((x) => x.exerciseId === exerciseId);
    if (!we) continue;
    for (const s of we.sets) best = Math.max(best, e1rm(s.weight, s.reps));
  }
  return best;
}

// ---------------------------------------------------------------------------

export interface ExerciseFilter {
  q?: string;
  muscle?: MuscleGroup | "All";
  equipment?: Equipment | "All";
  difficulty?: Difficulty | "All";
}

export const exerciseRepo = {
  async list(): Promise<Exercise[]> {
    await delay(120);
    return EXERCISES;
  },
  async search(f: ExerciseFilter): Promise<Exercise[]> {
    await delay(80);
    const q = f.q?.trim().toLowerCase() ?? "";
    return EXERCISES.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (!f.muscle || f.muscle === "All" || e.muscle === f.muscle) &&
        (!f.equipment || f.equipment === "All" || e.equipment === f.equipment) &&
        (!f.difficulty || f.difficulty === "All" || e.difficulty === f.difficulty)
    );
  },
};

export const workoutRepo = {
  async list(): Promise<Workout[]> {
    await delay(550); // history shows its skeleton honestly
    return [...byUser()].reverse();
  },
  async recent(n: number): Promise<Workout[]> {
    await delay(150);
    return [...byUser()].reverse().slice(0, n);
  },
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function workoutVolume(w: Workout) {
  return w.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0),
    0
  );
}

export const statsRepo = {
  /** Complete weeks only — a mid-flight week would read as a crash on a chart.
   * `thisWeek` carries the running week with a fair same-point-last-week delta. */
  async weeklyVolume(weeks = 8): Promise<{
    points: WeekPoint[];
    deltaPct: number;
    thisWeek: { volume: number; deltaPct: number };
  }> {
    await delay(150);
    const currentStart = startOfWeek(new Date());
    const volumeBetween = (from: Date, to: Date) =>
      byUser().filter((w) => w.date >= toKey(from) && w.date < toKey(to)).reduce(
        (s, w) => s + workoutVolume(w),
        0
      );

    const points: WeekPoint[] = [];
    for (let i = weeks; i >= 1; i -= 1) {
      const ws = addDays(currentStart, -7 * i);
      points.push({
        weekStart: toKey(ws),
        label: formatShort(toKey(ws)),
        volume: volumeBetween(ws, addDays(ws, 7)),
      });
    }
    const cur = points[points.length - 1]?.volume ?? 0;
    const prev = points[points.length - 2]?.volume ?? 0;
    const deltaPct = prev > 0 ? ((cur - prev) / prev) * 100 : 0;

    const tomorrow = addDays(new Date(), 1);
    const elapsedDays = Math.max(
      1,
      Math.round((tomorrow.getTime() - currentStart.getTime()) / 86_400_000)
    );
    const running = volumeBetween(currentStart, tomorrow);
    const prevStart = addDays(currentStart, -7);
    const prevToDate = volumeBetween(prevStart, addDays(prevStart, elapsedDays));
    const thisWeekDelta = prevToDate > 0 ? ((running - prevToDate) / prevToDate) * 100 : 0;

    return { points, deltaPct, thisWeek: { volume: running, deltaPct: thisWeekDelta } };
  },

  /** completed sets per complete week — "weekly progress" without repeating the volume chart */
  async weeklySets(weeks = 8): Promise<WeekPoint[]> {
    await delay(150);
    const currentStart = startOfWeek(new Date());
    const points: WeekPoint[] = [];
    for (let i = weeks; i >= 1; i -= 1) {
      const ws = addDays(currentStart, -7 * i);
      const we = addDays(ws, 7);
      const sets = byUser().filter(
        (w) => w.date >= toKey(ws) && w.date < toKey(we)
      ).reduce(
        (s, w) => s + w.exercises.reduce((n, ex) => n + ex.sets.length, 0),
        0
      );
      points.push({ weekStart: toKey(ws), label: formatShort(toKey(ws)), volume: sets });
    }
    return points;
  },

  async streakWeeks(): Promise<number> {
    await delay(100);
    const byWeek = new Map<string, number>();
    for (const w of byUser()) {
      const key = toKey(startOfWeek(new Date(w.date + "T12:00")));
      byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
    }
    let streak = 0;
    let cursor = startOfWeek(new Date());
    // current (partial) week counts if anything was logged; then walk back
    if ((byWeek.get(toKey(cursor)) ?? 0) > 0) streak += 1;
    cursor = addDays(cursor, -7);
    while ((byWeek.get(toKey(cursor)) ?? 0) >= 3) {
      streak += 1;
      cursor = addDays(cursor, -7);
    }
    return streak;
  },

  /** year-at-a-glance numbers for the consistency graph header */
  async consistency(): Promise<{
    currentWeeks: number;
    longestWeeks: number;
    activeDays: number;
  }> {
    await delay(120);
    const byWeek = new Map<string, number>();
    for (const w of byUser()) {
      const key = toKey(startOfWeek(new Date(w.date + "T12:00")));
      byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
    }
    const weekKeys = [...byWeek.keys()].sort();
    let longest = 0;
    let run = 0;
    if (weekKeys.length) {
      let cursor = new Date(weekKeys[0] + "T12:00");
      const end = startOfWeek(new Date());
      while (toKey(cursor) <= toKey(end)) {
        run = (byWeek.get(toKey(cursor)) ?? 0) >= 3 ? run + 1 : 0;
        longest = Math.max(longest, run);
        cursor = addDays(cursor, 7);
      }
    }
    return {
      currentWeeks: await this.streakWeeks(),
      longestWeeks: longest,
      activeDays: byUser().length,
    };
  },

  async personalRecords(): Promise<PersonalRecord[]> {
    await delay(200);
    const best = new Map<string, PersonalRecord>();
    for (const w of byUser()) {
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.weight === 0) continue;
          const est = e1rm(s.weight, s.reps);
          const cur = best.get(ex.exerciseId);
          if (!cur || est > cur.e1rm) {
            best.set(ex.exerciseId, {
              exerciseId: ex.exerciseId,
              weight: s.weight,
              reps: s.reps,
              e1rm: est,
              date: w.date,
            });
          }
        }
      }
    }
    return [...best.values()].sort((a, b) => b.e1rm - a.e1rm);
  },

  /** most recent PR on a barbell lift — the numbers that matter */
  async latestPR(): Promise<PersonalRecord | undefined> {
    const prs = await this.personalRecords();
    const barbell = prs.filter(
      (p) => exerciseById.get(p.exerciseId)?.equipment === "Barbell"
    );
    return [...(barbell.length ? barbell : prs)].sort((a, b) =>
      a.date > b.date ? -1 : 1
    )[0];
  },

  async e1rmSeries(exerciseId: string): Promise<E1rmPoint[]> {
    await delay(120);
    const points: E1rmPoint[] = [];
    let best = 0;
    for (const w of byUser()) {
      const ex = w.exercises.find((x) => x.exerciseId === exerciseId);
      if (!ex) continue;
      let top = 0;
      for (const s of ex.sets) top = Math.max(top, e1rm(s.weight, s.reps));
      const isPR = top > best + 0.5;
      if (isPR) best = top;
      points.push({ date: w.date, label: formatShort(w.date), e1rm: top, isPR });
    }
    return points;
  },

  async heatmap(weeks = 20): Promise<HeatmapDay[][]> {
    await delay(150);
    const volumes = new Map(byUser().map((w) => [w.date, workoutVolume(w)]));
    const nonzero = [...volumes.values()].sort((a, b) => a - b);
    const q = (p: number) => nonzero[Math.floor(p * (nonzero.length - 1))] ?? 0;
    const t1 = q(0.25);
    const t2 = q(0.5);
    const t3 = q(0.75);
    const level = (v: number): HeatmapDay["level"] =>
      v === 0 ? 0 : v <= t1 ? 1 : v <= t2 ? 2 : v <= t3 ? 3 : 4;

    const grid: HeatmapDay[][] = [];
    const thisMonday = startOfWeek(new Date());
    for (let wk = weeks - 1; wk >= 0; wk -= 1) {
      const col: HeatmapDay[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = toKey(addDays(thisMonday, -7 * wk + d));
        const v = volumes.get(date) ?? 0;
        col.push({ date, volume: v, level: level(v) });
      }
      grid.push(col);
    }
    return grid;
  },

  async muscleBalance(weeksBack = 4): Promise<MuscleShare[]> {
    await delay(150);
    const cutoff = toKey(addDays(new Date(), -7 * weeksBack));
    const acc = new Map<MuscleGroup, number>();
    let total = 0;
    for (const w of byUser()) {
      if (w.date < cutoff) continue;
      for (const ex of w.exercises) {
        const meta = exerciseById.get(ex.exerciseId);
        if (!meta) continue;
        const vol = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);
        acc.set(meta.muscle, (acc.get(meta.muscle) ?? 0) + vol);
        total += vol;
      }
    }
    return [...acc.entries()]
      .map(([muscle, volume]) => ({ muscle, volume, share: total ? volume / total : 0 }))
      .sort((a, b) => b.volume - a.volume);
  },

  async lifetime(): Promise<LifetimeStats> {
    await delay(200);
    let volume = 0;
    let sets = 0;
    let prs = 0;
    let minutes = 0;
    const sessions = new Map<string, number>();
    for (const w of byUser()) {
      volume += workoutVolume(w);
      minutes += w.durationMin;
      for (const ex of w.exercises) {
        sessions.set(ex.exerciseId, (sessions.get(ex.exerciseId) ?? 0) + 1);
        sets += ex.sets.length;
        prs += ex.sets.filter((s) => s.isPR).length;
      }
    }
    const volumeByExercise = new Map<string, number>();
    for (const w of byUser()) {
      for (const ex of w.exercises) {
        const vol = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);
        volumeByExercise.set(
          ex.exerciseId,
          (volumeByExercise.get(ex.exerciseId) ?? 0) + vol
        );
      }
    }
    const favorites = [...sessions.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1] ||
          (volumeByExercise.get(b[0]) ?? 0) - (volumeByExercise.get(a[0]) ?? 0)
      )
      .slice(0, 3)
      .flatMap(([id, count]) => {
        const exercise = exerciseById.get(id);
        return exercise ? [{ exercise, sessions: count }] : [];
      });
    return {
      workouts: byUser().length,
      volume,
      sets,
      prs,
      hours: Math.round(minutes / 60),
      favorites,
    };
  },
};
