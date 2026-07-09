"use client";

import { BarChart3, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { MuscleBalance } from "@/components/charts/muscle-balance";
import { VolumeArea } from "@/components/charts/volume-area";
import { WeeklyBars } from "@/components/charts/weekly-bars";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { Table, Td, Th } from "@/components/ui/table";
import { aiInsights } from "@/lib/ai/client";
import {
  balanceTakeaway,
  consistencyTakeaway,
  setsTakeaway,
  volumeTakeaway,
} from "@/lib/insights";
import { getExercise, statsRepo } from "@/lib/repo";
import type { HeatmapDay, MuscleShare, PersonalRecord, WeekPoint } from "@/lib/types";
import { formatShort, formatWeight } from "@/lib/utils";

const RANGES = { "8W": 8, "12W": 12, "6M": 26 } as const;
type RangeKey = keyof typeof RANGES;

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("8W");
  const [volume, setVolume] = useState<WeekPoint[] | null>(null);
  const [sets, setSets] = useState<WeekPoint[] | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[] | null>(null);
  const [heat, setHeat] = useState<HeatmapDay[][] | null>(null);
  const [balance, setBalance] = useState<MuscleShare[] | null>(null);
  const [cons, setCons] = useState<{ currentWeeks: number; longestWeeks: number; activeDays: number } | null>(null);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  // the deterministic facts derived from the user's real logged data; insights
  // only run when the user asks (button), and only rephrase these numbers
  const factsRef = useRef<string[]>([]);

  const weeks = RANGES[range];

  const generateInsights = async () => {
    if (!factsRef.current.length || insightsLoading) return;
    setInsightsLoading(true);
    const lines = await aiInsights(factsRef.current);
    setInsights(lines);
    setInsightsLoading(false);
  };

  useEffect(() => {
    let alive = true;
    setVolume(null);
    setSets(null);
    Promise.all([statsRepo.weeklyVolume(weeks), statsRepo.weeklySets(weeks)]).then(([v, s]) => {
      if (!alive) return;
      setVolume(v.points);
      setSets(s);
    });
    return () => {
      alive = false;
    };
  }, [weeks]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      statsRepo.personalRecords(),
      statsRepo.heatmap(20),
      statsRepo.muscleBalance(4),
      statsRepo.consistency(),
      statsRepo.weeklyVolume(8),
      statsRepo.weeklySets(8),
    ]).then(([p, h, b, c, wv, ws]) => {
      if (!alive) return;
      const barbell = p.filter((pr) => getExercise(pr.exerciseId)?.equipment === "Barbell").slice(0, 6);
      setPrs(barbell);
      setHeat(h);
      setBalance(b);
      setCons(c);
      // deterministic facts (no e1RM jargon); the model only rephrases these
      const facts = [
        volumeTakeaway(wv.points),
        setsTakeaway(ws),
        balanceTakeaway(b),
        consistencyTakeaway(c),
      ];
      if (barbell[0])
        facts.push(
          `Heaviest logged lift: ${formatWeight(barbell[0].weight)} kg on ${
            getExercise(barbell[0].exerciseId)?.name ?? "a barbell lift"
          }.`
        );
      // store the facts; the model call only happens when the user taps the button
      factsRef.current = facts;
    });
    return () => {
      alive = false;
    };
  }, []);

  const notEnoughData = cons !== null && cons.activeDays < 2;
  const heaviest = prs && prs.length ? Math.max(...prs.map((p) => p.weight)) : 0;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 text-primary">Analytics</h1>
        {!notEnoughData && (
          <Segmented
            options={Object.keys(RANGES) as RangeKey[]}
            value={range}
            onChange={setRange}
            ariaLabel="Time range"
          />
        )}
      </header>

      {notEnoughData ? (
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          hint="Log a couple of workouts and your trends, records, and consistency will appear here."
          action={
            <Link href="/workout">
              <Button variant="primary">Start a workout</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          <Card className="p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardLabel>Insights</CardLabel>
              {(insights || insightsLoading) ? null : (
                <Button variant="primary" onClick={generateInsights}>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Generate insights
                </Button>
              )}
            </div>
            {insights ? (
              <div className="mt-3 flex flex-col gap-1.5">
                {insights.map((line, i) => (
                  <p key={i} className="text-[13.5px] leading-relaxed text-secondary">
                    {line}
                  </p>
                ))}
                <button
                  onClick={generateInsights}
                  className="mt-1 self-start text-[12px] text-tertiary transition-colors hover:text-secondary"
                >
                  Regenerate
                </button>
              </div>
            ) : insightsLoading ? (
              <Skeleton className="mt-3 h-[88px]" />
            ) : (
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-tertiary">
                Get a plain-language read of your training — trends, balance, and
                consistency — generated from your own logged data. Tap the button.
              </p>
            )}
          </Card>

          {cons && prs && (
            <div className="grid grid-cols-3 gap-5">
              {[
                { label: "Heaviest lift", value: heaviest ? `${formatWeight(heaviest)} kg` : "—", gold: true },
                { label: "Streak", value: `${cons.currentWeeks}w` },
                { label: "Active days", value: String(cons.activeDays) },
              ].map((st) => (
                <Card key={st.label} className="p-4">
                  <CardLabel>{st.label}</CardLabel>
                  <p
                    className={
                      "mt-2 font-mono text-[20px] font-medium tabular-nums " +
                      (st.gold ? "text-gold" : "text-primary")
                    }
                  >
                    {st.value}
                  </p>
                </Card>
              ))}
            </div>
          )}

          <Card className="p-5 md:p-6">
            <CardLabel>Volume over time</CardLabel>
            {volume && <p className="mt-1 text-[12.5px] text-secondary">{volumeTakeaway(volume)}</p>}
            <div className="mt-4">
              {volume ? <VolumeArea points={volume} /> : <Skeleton className="h-[240px]" />}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <CardLabel>Sets per week</CardLabel>
            {sets && <p className="mt-1 text-[12.5px] text-secondary">{setsTakeaway(sets)}</p>}
            <div className="mt-4">
              {sets ? (
                <WeeklyBars points={sets} format={(v) => `${v} sets`} />
              ) : (
                <Skeleton className="h-[240px]" />
              )}
            </div>
          </Card>

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
                        <Th numeric className="pr-0">Date</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {prs.map((pr) => (
                        <tr key={pr.exerciseId} className="last:[&>td]:border-0">
                          <Td className="pl-0 text-primary">
                            {getExercise(pr.exerciseId)?.name ?? pr.exerciseId}
                          </Td>
                          <Td numeric className="font-medium text-gold">
                            {formatWeight(pr.weight)} kg × {pr.reps}
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
              {balance && <p className="mt-1 text-[12.5px] text-secondary">{balanceTakeaway(balance)}</p>}
              <div className="mt-6">
                {balance ? <MuscleBalance shares={balance} /> : <Skeleton className="h-[240px]" />}
              </div>
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <CardLabel>Training days · 20 weeks</CardLabel>
            {cons && <p className="mt-1 text-[12.5px] text-secondary">{consistencyTakeaway(cons)}</p>}
            <div className="mt-5">
              {heat ? <Heatmap grid={heat} /> : <Skeleton className="h-[130px]" />}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
