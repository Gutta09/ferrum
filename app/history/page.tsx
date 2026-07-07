"use client";

import { CalendarX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkoutCard } from "@/components/workout-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { addPhotoFile } from "@/lib/photo-store";
import { getExercise, workoutRepo } from "@/lib/repo";
import type { Workout } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    workoutRepo.list().then((w) => {
      if (alive) setWorkouts(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!workouts) return null;
    const query = q.trim().toLowerCase();
    if (!query) return workouts;
    return workouts.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.exercises.some((ex) =>
          getExercise(ex.exerciseId)?.name.toLowerCase().includes(query)
        )
    );
  }, [workouts, q]);

  const rename = (id: string, name: string) => {
    setWorkouts((prev) =>
      prev ? prev.map((w) => (w.id === id ? { ...w, name } : w)) : prev
    );
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">History</h1>
          {workouts && (
            <p className="mt-1 text-[13px] text-tertiary">
              <span className="font-mono tabular-nums">{workouts.length}</span> workouts
              over 8 weeks
            </p>
          )}
        </div>
        <Search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search workouts or lifts…"
          aria-label="Search workout history"
          className="w-full sm:w-80"
        />
      </header>

      <div className="relative ml-1.5 mt-8 border-l border-line pl-6 md:pl-8">
        {!filtered ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[188px] rounded-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title={`No workouts match “${q}”`}
            hint="Search by workout name or any exercise in it."
          />
        ) : (
          <div className="flex flex-col gap-5">
            {filtered.map((w) => {
              const hasPR = w.exercises.some((ex) => ex.sets.some((s) => s.isPR));
              return (
                <div key={w.id} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-7 h-2.5 w-2.5 rounded-full border-2 border-bg",
                      "-left-[31px] md:-left-[39px]",
                      hasPR ? "bg-gold" : "bg-white/20"
                    )}
                  />
                  <WorkoutCard
                    workout={w}
                    onRename={(name) => rename(w.id, name)}
                    onAttachPhoto={(file) => {
                      addPhotoFile(file, w.date, w.id);
                      toast({
                        tone: "success",
                        title: "Photo added to Physique",
                        description: w.date,
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
