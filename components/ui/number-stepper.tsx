"use client";

import { Minus, Plus } from "lucide-react";
import { useRef, type KeyboardEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { formatWeight } from "@/lib/utils";

export interface NumberStepperProps {
  value: number | null;
  onChange: (v: number | null) => void;
  /** ghost value shown as placeholder and used as the base for stepping */
  ghost?: number;
  step?: number;
  min?: number;
  max?: number;
  ariaLabel: string;
  className?: string;
  onEnter?: () => void;
  inputRef?: RefObject<HTMLInputElement>;
  disabled?: boolean;
}

/** Numeric field for weights/reps/RPE — type, arrow-key, or tap the steppers
 * that appear on hover/focus. Mono, tabular, centered. */
export function NumberStepper({
  value,
  onChange,
  ghost,
  step = 1,
  min = 0,
  max = 999,
  ariaLabel,
  className,
  onEnter,
  inputRef,
  disabled,
}: NumberStepperProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  const base = value ?? ghost ?? 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  // live value for hold-to-repeat — the closure would otherwise go stale
  const liveRef = useRef(base);
  liveRef.current = base;
  const bump = (dir: 1 | -1) => {
    if (disabled) return;
    const next = clamp(liveRef.current + dir * step);
    liveRef.current = next;
    onChange(next);
    ref.current?.focus();
  };

  const holdRef = useRef<{ t?: number; i?: number }>({});
  const startHold = (dir: 1 | -1) => {
    bump(dir);
    holdRef.current.t = window.setTimeout(() => {
      holdRef.current.i = window.setInterval(() => bump(dir), 110);
    }, 420);
  };
  const endHold = () => {
    window.clearTimeout(holdRef.current.t);
    window.clearInterval(holdRef.current.i);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      bump(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      bump(-1);
    } else if (e.key === "Enter") {
      onEnter?.();
    }
  };

  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${ariaLabel}`}
        onPointerDown={() => startHold(-1)}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        disabled={disabled}
        className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 touch-none select-none items-center justify-center rounded-md text-tertiary opacity-0 transition-opacity duration-150 hover:bg-ink/[0.06] hover:text-primary group-focus-within:opacity-100 group-hover:opacity-100 disabled:hidden sm:h-6 sm:w-6"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        disabled={disabled}
        value={value === null ? "" : formatWeight(value)}
        placeholder={ghost !== undefined ? formatWeight(ghost) : "—"}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          if (raw === "") return onChange(null);
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        onKeyDown={handleKey}
        onFocus={(e) => e.target.select()}
        className={cn(
          "h-9 w-full rounded-lg bg-transparent text-center font-mono text-[15px] tabular-nums text-primary placeholder:text-tertiary",
          "transition-colors duration-150 focus:bg-ink/[0.05]",
          disabled && "opacity-50"
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${ariaLabel}`}
        onPointerDown={() => startHold(1)}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        disabled={disabled}
        className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 touch-none select-none items-center justify-center rounded-md text-tertiary opacity-0 transition-opacity duration-150 hover:bg-ink/[0.06] hover:text-primary group-focus-within:opacity-100 group-hover:opacity-100 disabled:hidden sm:h-6 sm:w-6"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
