"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Menu } from "@/components/ui/menu";
import { aiRecap } from "@/lib/ai/client";
import { activeUserId } from "@/lib/owner";
import { useTemplates } from "@/lib/templates";
import { Calendar } from "@/components/calendar";
import { ConsistencyCard } from "@/components/consistency";
import { PhotoStreakCard } from "@/components/photo-streak";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VolumeArea } from "@/components/charts/volume-area";
import { getExercise, statsRepo, workoutRepo } from "@/lib/repo";
import { e1rm as epley } from "@/lib/utils";
import { PROFILE } from "@/lib/seed";
import type { PersonalRecord, WeekPoint, Workout } from "@/lib/types";
import { addDays, formatLong, formatShort, formatWeight, fromKey, toKey } from "@/lib/utils";

interface DashData {
  weekly: {
    points: WeekPoint[];
    deltaPct: number;
    thisWeek: { volume: number; deltaPct: number };
  };
  streak: number;
  pr?: PersonalRecord;
  recent: Workout[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const templates = useTemplates().filter((t) => t.userId === activeUserId());
  const router = useRouter();
  const { data: authSession, status } = useSession();
  const [recap, setRecap] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      statsRepo.weeklyVolume(8),
      statsRepo.streakWeeks(),
      statsRepo.latestPR(),
      workoutRepo.recent(60),
    ]).then(([weekly, streak, pr, recent]) => {
      if (!alive) return;
      setData({ weekly, streak, pr, recent });
      const pts = weekly.points;
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const sessionsIn = (weekStart?: string) =>
        weekStart
          ? recent.filter((w) => w.date >= weekStart && w.date < toKey(addDays(fromKey(weekStart), 7))).length
          : 0;
      if (last && status === "authenticated") {
        aiRecap({
          volume: last.volume,
          sessions: sessionsIn(last.weekStart),
          prevVolume: prev?.volume ?? 0,
          prevSessions: sessionsIn(prev?.weekStart),
        }).then((line) => alive && setRecap(line || null));
      }
    });
    return () => {
      alive = false;
    };
  }, [status]);

  // strength headline: the best set of the current week (by e1RM)
  const weekBest = useMemo(() => {
    if (!data) return undefined;
    const weekStart = data.weekly.points.length
      ? toKey(addDays(fromKey(data.weekly.points[data.weekly.points.length - 1].weekStart), 7))
      : toKey(new Date());
    return data.recent
      .filter((w) => w.date >= weekStart)
      .flatMap((w) =>
        w.exercises
          .filter((ex) => getExercise(ex.exerciseId)?.equipment === "Barbell")
          .flatMap((ex) =>
            ex.sets.map((st) => ({
              name: getExercise(ex.exerciseId)?.name ?? "",
              w: st.weight,
              r: st.reps,
              score: epley(st.weight, st.reps),
            }))
          )
      )
      .sort((a, b) => b.score - a.score)[0];
  }, [data]);
  const logged = useMemo(
    () => new Set((data?.recent ?? []).map((w) => w.date)),
    [data]
  );
  const prExercise = data?.pr ? getExercise(data.pr.exerciseId) : undefined;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-[16px] font-semibold text-primary">
          F
        </span>
        <h1 className="mt-6 text-display text-primary">Ferrum</h1>
        <p className="mt-3 text-[15px] text-secondary">
          The quiet workout log for numbers that matter.
        </p>
        <Link href="/signin" className="mt-8">
          <Button variant="primary">Sign in to start your log</Button>
        </Link>
        <p className="mt-3 text-[12.5px] text-tertiary">Your log. Yours alone.</p>
      </div>
    );
  }

  const firstName = authSession?.user?.name?.split(" ")[0] ?? PROFILE.name;

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <div>
          {/* time-based, so server and client clocks can differ — let the
              client value win without a hydration warning */}
          <CardLabel suppressHydrationWarning>{formatLong(toKey(new Date()))}</CardLabel>
          <h1 className="mt-1 text-h1 text-primary" suppressHydrationWarning>
            {greeting()}, {firstName}
          </h1>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-[14px] font-semibold text-secondary transition-colors hover:border-line-hover hover:text-primary"
        >
          {firstName[0]}
        </Link>
      </header>

      {/* today */}
      <Card className="mt-8 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <CardLabel>Today</CardLabel>
            <h2 className="mt-2 text-h2 text-primary">Build your session</h2>
            <p className="mt-1 text-[13.5px] text-tertiary">
              Pick movements from the library, quick-log a line, or start from
              one of your templates. Nothing is pre-filled for you.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 md:items-end">
            <Link href="/workout">
              <Button variant="primary" className="w-full md:w-auto">
                Start workout
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Menu
              ariaLabel="Start from a template or blank"
              trigger={
                <span className="flex h-8 items-center gap-1 rounded-input px-3 text-[12.5px] text-tertiary transition-colors duration-150 hover:text-secondary">
                  From template
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </span>
              }
              items={[
                ...templates.map((t) => ({
                  label: t.name,
                  onSelect: () => router.push(`/workout?template=${t.id}`),
                })),
                {
                  label: "Blank workout",
                  onSelect: () => router.push("/workout?blank=1"),
                },
              ]}
            />
          </div>
        </div>
      </Card>

      {recap && <p className="mt-4 text-[13px] text-tertiary">{recap}</p>}

      {/* stats */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {!data ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[124px] rounded-card" />)
        ) : (
          <>
            <Link href="/history" aria-label="Top set this week — open history">
              <StatCard
                label="Top set this week"
                value={weekBest ? formatWeight(weekBest.w) : "—"}
                unit={weekBest ? `kg × ${weekBest.r}` : undefined}
                sub={weekBest ? weekBest.name : "No sets logged yet"}
              />
            </Link>
            <Link href="/profile" aria-label="Current streak — open consistency">
              <StatCard
                label="Current streak"
                value={String(data.streak)}
                unit={data.streak === 1 ? "week" : "weeks"}
                sub="3+ sessions each week"
              />
            </Link>
            <Link href="/analytics" aria-label="Recent PR — open analytics">
              <StatCard
                label="Recent PR"
                gold
                value={data.pr ? formatWeight(data.pr.weight) : "—"}
                unit={data.pr ? `kg × ${data.pr.reps}` : undefined}
                sub={
                  data.pr && prExercise
                    ? `${prExercise.name} · ${formatShort(data.pr.date)}`
                    : undefined
                }
              />
            </Link>
            <PhotoStreakCard />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="p-5 md:p-6 lg:col-span-2">
          {data ? (
            <Calendar
              logged={logged}
              onDay={(key, isLogged) =>
                router.push(isLogged ? `/history?d=${key}` : "/workout")
              }
            />
          ) : (
            <Skeleton className="h-[280px]" />
          )}
        </Card>
        <Card className="p-5 md:p-6 lg:col-span-3">
          <Link
            href="/analytics"
            className="transition-colors hover:text-secondary"
          >
            <CardLabel>Weekly volume · 8 weeks →</CardLabel>
          </Link>
          <div className="mt-4">
            {data ? (
              <VolumeArea points={data.weekly.points} height={220} />
            ) : (
              <Skeleton className="h-[220px]" />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <ConsistencyCard weeks={26} />
      </div>
    </>
  );
}
