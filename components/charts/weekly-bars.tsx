"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekPoint } from "@/lib/types";
import { formatCompact, formatKg } from "@/lib/utils";
import { axisStyle, ChartTip, CURSOR_FILL, GRID_STROKE } from "./kit";

export function WeeklyBars({
  points,
  height = 240,
  format = formatKg,
}: {
  points: WeekPoint[];
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="32%">
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="label" {...axisStyle} minTickGap={16} dy={6} />
        <YAxis {...axisStyle} width={44} tickFormatter={(v: number) => formatCompact(v)} />
        <Tooltip cursor={CURSOR_FILL} content={<ChartTip format={format} />} />
        <Bar dataKey="volume" maxBarSize={24} radius={[4, 4, 0, 0]}>
          {points.map((p, i) => (
            <Cell
              key={p.weekStart}
              fill={
                i === points.length - 1
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.25)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
