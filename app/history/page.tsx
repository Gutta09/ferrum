"use client";

import { ArrowRight, CalendarX, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { WorkoutCard } from "@/components/workout-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { addPhotoFile } from "@/lib/photo-store";
import { getExercise, workoutRepo } from "@/lib/repo";
import type { Workout } from "@/lib/types";
import { cn, formatLong } from "@/lib/utils";

function HistoryView() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const day = useSearchParams().get("d");
  const [q, setQ] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const dayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    workoutRepo.list().then((w) => {
      if (alive) setWorkouts(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  // deep-link: scroll the targeted day into view once the list has rendered
  useEffect(() => {
    if (day && workouts) {
      requestAnimationFrame(() =>
        dayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
    }
  }, [day, workouts]);

  const dayHasWorkout = Boolean(day && workouts?.some((w) => w.date === day));

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
    // owner-scoped server-side update
    fetch("/api/workouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    }).catch(() => {});
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

      {day && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-input border border-line bg-surface px-4 py-3">
          <span className="text-[13px] text-secondary">
            Jumped to <span className="text-primary">{formatLong(day)}</span>
          </span>
          {!dayHasWorkout && (
            <>
              <span className="text-[13px] text-tertiary">— no workout logged that day.</span>
              <Link href="/workout">
                <Button size="sm" variant="primary">
                  Add workout
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </Link>
            </>
          )}
          <button
            onClick={() => router.push("/history")}
            aria-label="Clear date filter"
            className="ml-auto flex items-center gap-1 text-[12.5px] text-tertiary transition-colors hover:text-primary"
          >
            Show all
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

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
              const isTarget = w.date === day;
              return (
                <div
                  key={w.id}
                  ref={isTarget ? dayRef : undefined}
                  className={cn(
                    "relative rounded-card transition-shadow",
                    isTarget && "ring-1 ring-line-hover"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-7 h-2.5 w-2.5 rounded-full border-2 border-bg",
                      "-left-[31px] md:-left-[39px]",
                      hasPR ? "bg-gold" : isTarget ? "bg-primary" : "bg-ink/20"
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

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryView />
    </Suspense>
  );
}
