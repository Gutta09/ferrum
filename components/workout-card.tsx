"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { getExercise } from "@/lib/repo";
import type { Workout } from "@/lib/types";
import {
  cn,
  e1rm,
  formatDuration,
  formatLong,
  formatWeight,
} from "@/lib/utils";

export interface WorkoutCardProps {
  workout: Workout;
  onRename?: (name: string) => void;
  onAttachPhoto?: (file: File) => void;
}

export function WorkoutCard({ workout, onRename, onAttachPhoto }: WorkoutCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(workout.name);
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

  const commit = () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== workout.name) onRename?.(name);
    else setDraft(workout.name);
  };

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
                className="ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-white/[0.06] hover:text-secondary"
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
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(workout.name);
                setEditing(false);
              }
            }}
            aria-label="Workout name"
            className="rounded-lg bg-white/[0.05] px-2 py-0.5 text-[17px] font-semibold tracking-tight text-primary focus:outline-none"
          />
        ) : (
          <button
            onClick={onRename ? () => setEditing(true) : undefined}
            className={cn(
              "rounded-lg text-left text-[17px] font-semibold tracking-tight text-primary",
              onRename && "-mx-2 px-2 py-0.5 transition-colors hover:bg-white/[0.05]"
            )}
            title={onRename ? "Rename workout" : undefined}
          >
            {draft}
          </button>
        )}
        {hasPR && <Pill tone="gold">PR</Pill>}
      </div>

      <div className="mt-4 divide-y divide-[rgba(255,255,255,0.06)]">
        {topSets.map(({ name, set }, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
            <span className="truncate text-[13px] text-secondary">{name}</span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-primary">
              {formatWeight(set.weight)} kg × {set.reps}
              {set.rpe ? <span className="text-tertiary"> @ {formatWeight(set.rpe)}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
