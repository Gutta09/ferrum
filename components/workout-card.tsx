"use client";

import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { getExercise } from "@/lib/repo";
import type { Workout } from "@/lib/types";
import { e1rm, formatDuration, formatLong, formatWeight } from "@/lib/utils";

export interface WorkoutCardProps {
  workout: Workout;
  onAttachPhoto?: (file: File) => void;
}

export function WorkoutCard({ workout, onAttachPhoto }: WorkoutCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const hasPR = workout.exercises.some((ex) => ex.sets.some((s) => s.isPR));

  // best set per exercise, then the three strongest lifts of the day
  const topSets = workout.exercises
    .map((ex) => {
      const best = [...ex.sets].sort(
        (a, b) => e1rm(b.weight, b.reps) - e1rm(a.weight, a.reps)
      )[0];
      return {
        name: getExercise(ex.exerciseId)?.name ?? ex.exerciseId,
        set: best,
        score: best ? e1rm(best.weight, best.reps) : 0,
      };
    })
    .filter((t) => t.set)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <Card interactive className="p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <CardLabel>{formatLong(workout.date)}</CardLabel>
        <div className="flex items-center gap-2 font-mono text-[12.5px] tabular-nums text-tertiary">
          <span>{formatDuration(workout.durationMin)}</span>
          {onAttachPhoto && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Attach a progress photo to this workout"
                title="Attach progress photo"
                className="ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-ink/[0.06] hover:text-secondary"
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAttachPhoto(f);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2.5">
        <h3 className="text-[17px] font-semibold tracking-tight text-primary">{workout.name}</h3>
        {hasPR && <Pill tone="gold">PR</Pill>}
      </div>

      <div className="mt-4 divide-y divide-line">
        {topSets.map(({ name, set }, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
            <span className="truncate text-[13px] text-secondary">{name}</span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-primary">
              {formatWeight(set.weight)} kg × {set.reps}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
