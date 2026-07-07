"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly (T | SegmentedOption<T>)[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}

/** Quiet segmented control — the active pill slides between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  const id = useId();
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value }
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-input border border-line bg-surface p-0.5",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative h-7 whitespace-nowrap rounded-[9px] px-3 text-[13px] font-medium transition-colors duration-150 ease-swift",
              active ? "text-primary" : "text-tertiary hover:text-secondary"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-active`}
                className="absolute inset-0 rounded-[9px] bg-ink/[0.08]"
                transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
              />
            )}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
