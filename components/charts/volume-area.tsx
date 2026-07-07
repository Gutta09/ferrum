"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekPoint } from "@/lib/types";
import { formatCompact, formatKg } from "@/lib/utils";
import { axisStyle, ChartTip, CURSOR_LINE, GRID_STROKE } from "./kit";

export function VolumeArea({ points, height = 240 }: { points: WeekPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="label" {...axisStyle} minTickGap={28} dy={6} />
        <YAxis
          {...axisStyle}
          width={44}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <Tooltip
          cursor={CURSOR_LINE}
          content={<ChartTip format={(v) => formatKg(v)} />}
        />
        <Area
          type="monotone"
          dataKey="volume"
          stroke="var(--text-primary)"
          strokeWidth={2}
          fill="var(--text-primary)"
          fillOpacity={0.06}
          dot={false}
          activeDot={{ r: 4, fill: "var(--text-primary)", stroke: "var(--card)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
