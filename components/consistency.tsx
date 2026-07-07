"use client";

import { useEffect, useState } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { Card, CardLabel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { statsRepo } from "@/lib/repo";
import type { HeatmapDay } from "@/lib/types";
import { formatInt } from "@/lib/utils";

interface Data {
  grid: HeatmapDay[][];
  currentWeeks: number;
  longestWeeks: number;
  activeDays: number;
}

/** Year-at-a-glance training graph with its financial-label header stats. */
export function ConsistencyCard({ weeks = 26 }: { weeks?: number }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([statsRepo.heatmap(weeks), statsRepo.consistency()]).then(
      ([grid, c]) => {
        if (alive) setData({ grid, ...c });
      }
    );
    return () => {
      alive = false;
    };
  }, [weeks]);

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <CardLabel>Consistency</CardLabel>
        {data && (
          <div className="flex items-baseline gap-6">
            {[
              { label: "Streak", value: `${data.currentWeeks}w` },
              { label: "Longest", value: `${data.longestWeeks}w` },
              { label: "Active days", value: formatInt(data.activeDays) },
            ].map((s) => (
              <p key={s.label} className="flex items-baseline gap-1.5">
                <span className="font-mono text-[15px] font-medium tabular-nums text-primary">
                  {s.value}
                </span>
                <span className="text-[11px] uppercase tracking-[0.02em] text-tertiary">
                  {s.label}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5">
        {data ? <Heatmap grid={data.grid} /> : <Skeleton className="h-[130px]" />}
      </div>
    </Card>
  );
}
