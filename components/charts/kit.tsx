"use client";

// Shared Recharts chrome: recessive hairline grid, tertiary mono axes, and a
// card-styled tooltip. No default-Recharts look allowed past this file.

export const MONO = "var(--font-geist-mono)";

export const axisStyle = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--text-tertiary)", fontSize: 11, fontFamily: MONO },
} as const;

export const GRID_STROKE = "rgb(var(--ink) / 0.06)";
export const CURSOR_LINE = { stroke: "rgb(var(--ink) / 0.2)", strokeWidth: 1 };
export const CURSOR_FILL = { fill: "rgb(var(--ink) / 0.05)" };

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string; name?: string }[];
  format?: (v: number) => string;
}

export function ChartTip({ active, label, payload, format }: TipProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="rounded-input border border-line bg-card px-3 py-2 shadow-ambient">
      <p className="font-mono text-[13px] font-medium tabular-nums text-primary">
        {typeof v === "number" && format ? format(v) : String(v)}
      </p>
      <p className="mt-0.5 text-[11px] text-tertiary">{label}</p>
    </div>
  );
}
