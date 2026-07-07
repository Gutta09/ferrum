import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "gold" | "danger";

const tones: Record<Tone, string> = {
  default: "border-line bg-ink/[0.04] text-secondary",
  success: "border-success/20 bg-success/10 text-success",
  gold: "border-gold/25 bg-gold/10 text-gold",
  danger: "border-danger/20 bg-danger/10 text-danger",
};

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Pill({ tone = "default", className, ...props }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-5",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
