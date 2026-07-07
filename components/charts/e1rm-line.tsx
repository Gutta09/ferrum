"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { E1rmPoint } from "@/lib/types";
import { axisStyle, ChartTip, CURSOR_LINE, GRID_STROKE } from "./kit";

// gold dots mark PR sessions only — everything else is the quiet white line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PRDot(props: any) {
  const { cx, cy, payload, index } = props;
  if (!payload?.isPR) return <g key={`d-${index}`} />;
  return (
    <circle
      key={`d-${index}`}
      cx={cx}
      cy={cy}
      r={4}
      fill="#E6B450"
      stroke="#17181B"
      strokeWidth={2}
    />
  );
}

export function E1rmLine({ points, height = 240 }: { points: E1rmPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis dataKey="label" {...axisStyle} minTickGap={28} dy={6} />
        <YAxis
          {...axisStyle}
          width={40}
          domain={["dataMin - 4", "dataMax + 4"]}
          tickFormatter={(v: number) => String(Math.round(v))}
        />
        <Tooltip
          cursor={CURSOR_LINE}
          content={<ChartTip format={(v) => `${v} kg e1RM`} />}
        />
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke="#FFFFFF"
          strokeWidth={2}
          dot={<PRDot />}
          activeDot={{ r: 4, fill: "#FFFFFF", stroke: "#17181B", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
