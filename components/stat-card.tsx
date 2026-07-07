import { type ReactNode } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  deltaPct?: number;
  spark?: number[];
  gold?: boolean;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  unit,
  sub,
  deltaPct,
  spark,
  gold,
  children,
}: StatCardProps) {
  return (
    <Card className="flex flex-col p-5">
      <CardLabel>{label}</CardLabel>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p
          className={cn(
            "font-mono text-[28px] font-medium leading-8 tracking-tight tabular-nums",
            gold ? "text-gold" : "text-primary"
          )}
        >
          {value}
          {unit && (
            <span className="ml-1 text-[14px] font-normal text-tertiary">{unit}</span>
          )}
        </p>
        {spark && <Sparkline data={spark} />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {deltaPct !== undefined && (
          <span
            className={cn(
              "font-mono text-[12px] tabular-nums",
              deltaPct >= 0 ? "text-success" : "text-danger"
            )}
          >
            {deltaPct >= 0 ? "+" : "−"}
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-[12px] text-tertiary">{sub}</span>}
      </div>
      {children}
    </Card>
  );
}
