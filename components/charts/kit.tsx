"use client";

// Shared Recharts chrome: recessive hairline grid, tertiary mono axes, and a
// card-styled tooltip. No default-Recharts look allowed past this file.

export const MONO = "var(--font-geist-mono)";

export const axisStyle = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "#6B6B72", fontSize: 11, fontFamily: MONO },
} as const;

export const GRID_STROKE = "rgba(255,255,255,0.05)";
export const CURSOR_LINE = { stroke: "rgba(255,255,255,0.16)", strokeWidth: 1 };
export const CURSOR_FILL = { fill: "rgba(255,255,255,0.04)" };

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
    <div className="rounded-input border border-line bg-[#1B1C20] px-3 py-2 shadow-ambient">
      <p className="font-mono text-[13px] font-medium tabular-nums text-primary">
        {typeof v === "number" && format ? format(v) : String(v)}
      </p>
      <p className="mt-0.5 text-[11px] text-tertiary">{label}</p>
    </div>
  );
}
