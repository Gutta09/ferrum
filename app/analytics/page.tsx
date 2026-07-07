"use client";

import { useEffect, useMemo, useState } from "react";
import { E1rmLine } from "@/components/charts/e1rm-line";
import { Heatmap } from "@/components/charts/heatmap";
import { MuscleBalance } from "@/components/charts/muscle-balance";
import { VolumeArea } from "@/components/charts/volume-area";
import { WeeklyBars } from "@/components/charts/weekly-bars";
import { Card, CardLabel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { Table, Td, Th } from "@/components/ui/table";
import { getExercise, statsRepo } from "@/lib/repo";
import type {
  E1rmPoint,
  HeatmapDay,
  MuscleShare,
  PersonalRecord,
  WeekPoint,
} from "@/lib/types";
import { addDays, formatShort, formatWeight, toKey } from "@/lib/utils";

const RANGES = { "8W": 8, "12W": 12, "6M": 26 } as const;
type RangeKey = keyof typeof RANGES;

const LIFTS = [
  { value: "back-squat", label: "Squat" },
  { value: "bench-press", label: "Bench" },
  { value: "deadlift", label: "Deadlift" },
  { value: "overhead-press", label: "Press" },
] as const;
type LiftId = (typeof LIFTS)[number]["value"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("8W");
  const [lift, setLift] = useState<LiftId>("back-squat");

  const [volume, setVolume] = useState<WeekPoint[] | null>(null);
  const [sets, setSets] = useState<WeekPoint[] | null>(null);
  const [e1rm, setE1rm] = useState<E1rmPoint[] | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[] | null>(null);
  const [heat, setHeat] = useState<HeatmapDay[][] | null>(null);
  const [balance, setBalance] = useState<MuscleShare[] | null>(null);

  const weeks = RANGES[range];

  useEffect(() => {
    let alive = true;
    setVolume(null);
    setSets(null);
    Promise.all([statsRepo.weeklyVolume(weeks), statsRepo.weeklySets(weeks)]).then(
      ([v, s]) => {
        if (!alive) return;
        setVolume(v.points);
        setSets(s);
      }
    );
    return () => {
      alive = false;
    };
  }, [weeks]);

  useEffect(() => {
    let alive = true;
    statsRepo.e1rmSeries(lift).then((pts) => {
      if (alive) setE1rm(pts);
    });
    return () => {
      alive = false;
    };
  }, [lift]);

  useEffect(() => {
    let alive = true;
    Promise.all([statsRepo.personalRecords(), statsRepo.heatmap(20), statsRepo.muscleBalance(4)]).then(
      ([p, h, b]) => {
        if (!alive) return;
        // the table stays on the lifts that matter — barbell movements
        setPrs(
          p.filter((pr) => getExercise(pr.exerciseId)?.equipment === "Barbell").slice(0, 6)
        );
        setHeat(h);
        setBalance(b);
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const e1rmInRange = useMemo(() => {
    if (!e1rm) return null;
    const cutoff = toKey(addDays(new Date(), -7 * weeks));
    return e1rm.filter((p) => p.date >= cutoff);
  }, [e1rm, weeks]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 text-primary">Analytics</h1>
        <Segmented
          options={Object.keys(RANGES) as RangeKey[]}
          value={range}
          onChange={setRange}
          ariaLabel="Time range"
        />
      </header>

      <div className="mt-8 flex flex-col gap-5">
        <Card className="p-5 md:p-6">
          <CardLabel>Volume over time</CardLabel>
          <div className="mt-4">
            {volume ? <VolumeArea points={volume} /> : <Skeleton className="h-[240px]" />}
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardLabel>Estimated 1RM</CardLabel>
              <Segmented
                options={LIFTS.map((l) => ({ value: l.value, label: l.label }))}
                value={lift}
                onChange={setLift}
                ariaLabel="Select lift"
              />
            </div>
            <div className="mt-4">
              {e1rmInRange ? (
                <E1rmLine points={e1rmInRange} />
              ) : (
                <Skeleton className="h-[240px]" />
              )}
            </div>
            <p className="mt-3 text-[11.5px] text-tertiary">Gold marks PR sessions</p>
          </Card>

          <Card className="p-5 md:p-6">
            <CardLabel>Sets per week</CardLabel>
            <div className="mt-4">
              {sets ? (
                <WeeklyBars points={sets} format={(v) => `${v} sets`} />
              ) : (
                <Skeleton className="h-[240px]" />
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5 pb-2 md:p-6 md:pb-3">
            <CardLabel>Personal records</CardLabel>
            <div className="mt-2">
              {prs ? (
                <Table>
                  <thead>
                    <tr>
                      <Th className="pl-0">Exercise</Th>
                      <Th numeric>Best set</Th>
                      <Th numeric>e1RM</Th>
                      <Th numeric className="pr-0">Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map((pr) => (
                      <tr key={pr.exerciseId} className="last:[&>td]:border-0">
                        <Td className="pl-0 text-primary">
                          {getExercise(pr.exerciseId)?.name ?? pr.exerciseId}
                        </Td>
                        <Td numeric>
                          {formatWeight(pr.weight)} × {pr.reps}
                        </Td>
                        <Td numeric className="font-medium text-gold">
                          {formatWeight(pr.e1rm)} kg
                        </Td>
                        <Td numeric className="pr-0 text-tertiary">
                          {formatShort(pr.date)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Skeleton className="h-[280px]" />
              )}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <CardLabel>Muscle balance · 4 weeks</CardLabel>
            <div className="mt-6">
              {balance ? <MuscleBalance shares={balance} /> : <Skeleton className="h-[240px]" />}
            </div>
          </Card>
        </div>

        <Card className="p-5 md:p-6">
          <CardLabel>Training days · 20 weeks</CardLabel>
          <div className="mt-5">
            {heat ? <Heatmap grid={heat} /> : <Skeleton className="h-[130px]" />}
          </div>
        </Card>
      </div>
    </>
  );
}
