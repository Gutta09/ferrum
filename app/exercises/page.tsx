"use client";

import { SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { aiSearchNames } from "@/lib/ai/client";
import { bestE1rm, exerciseRepo } from "@/lib/repo";
import { EXERCISES } from "@/lib/seed";
import type { Difficulty, Equipment, Exercise, MuscleGroup } from "@/lib/types";
import { formatWeight } from "@/lib/utils";

const MUSCLES = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"] as const;
const EQUIPMENT = ["All", "Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight"] as const;
const DIFFICULTY = ["All", "Beginner", "Intermediate", "Advanced"] as const;

function monogram(name: string) {
  return name
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function ExercisesView() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [muscle, setMuscle] = useState<(typeof MUSCLES)[number]>("All");
  const [equipment, setEquipment] = useState<(typeof EQUIPMENT)[number]>("All");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTY)[number]>("All");
  const [results, setResults] = useState<Exercise[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let alive = true;
    exerciseRepo
      .search({
        q,
        muscle: muscle as MuscleGroup | "All",
        equipment: equipment as Equipment | "All",
        difficulty: difficulty as Difficulty | "All",
      })
      .then(async (r) => {
        if (!alive) return;
        // quiet semantic fallback — only when the keyword search finds nothing
        if (r.length === 0 && q.trim().length > 2) {
          const names = await aiSearchNames(q, EXERCISES.map((e) => e.name));
          if (alive && names?.length) {
            const matched = names
              .map((n) => EXERCISES.find((e) => e.name === n))
              .filter((e): e is NonNullable<typeof e> => Boolean(e));
            if (matched.length) return setResults(matched);
          }
        }
        if (alive) setResults(r);
      });
    return () => {
      alive = false;
    };
  }, [q, muscle, equipment, difficulty]);

  return (
    <>
      <header>
        <h1 className="text-h1 text-primary">Exercises</h1>
      </header>

      <Search
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search 200+ movements…"
        aria-label="Search exercises"
        className="mt-6 max-w-xl"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Segmented options={MUSCLES} value={muscle} onChange={setMuscle} ariaLabel="Filter by muscle" />
        <Segmented options={EQUIPMENT} value={equipment} onChange={setEquipment} ariaLabel="Filter by equipment" />
        <Segmented options={DIFFICULTY} value={difficulty} onChange={setDifficulty} ariaLabel="Filter by difficulty" />
      </div>

      <div className="mt-8">
        {!results ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[190px] rounded-card" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={`Nothing matches “${q}”`}
            hint="Try a different movement name, or clear the filters."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((e) => {
              const best = bestE1rm(e.id);
              return (
                <Card key={e.id} interactive className="overflow-hidden">
                  <div className="relative flex h-28 items-center justify-center border-b border-line bg-surface">
                    <span
                      aria-hidden
                      className="font-mono text-[26px] font-medium tracking-[0.08em] text-tertiary"
                    >
                      {monogram(e.name)}
                    </span>
                    <Pill className="absolute right-3 top-3">{e.difficulty}</Pill>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-primary">
                      {e.name}
                    </h3>
                    <p className="mt-0.5 text-[12.5px] text-tertiary">
                      {e.muscle} · {e.equipment}
                    </p>
                    {best > 0 && (
                      <p className="mt-3 font-mono text-[12px] tabular-nums text-secondary">
                        Best e1RM · {formatWeight(best)} kg
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

    </>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-6">
          <Skeleton className="h-10 max-w-xl" />
        </div>
      }
    >
      <ExercisesView />
    </Suspense>
  );
}
