"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, StickyNote } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Pill } from "@/components/ui/pill";
import { FavouriteStar } from "@/components/favourite-star";
import { PlatePopover } from "@/components/plate-popover";
import type { Suggestion } from "@/lib/training";
import type { Exercise, LastPerformance } from "@/lib/types";
import { cn, formatWeight } from "@/lib/utils";

export interface LiveSet {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  isPR?: boolean;
  /** advisory fat-finger note — dismissible, never blocking */
  warning?: string;
}

export interface LiveExercise {
  id: string;
  exercise: Exercise;
  sets: LiveSet[];
  notes: string;
  notesOpen: boolean;
}

export type GhostSet = { weight: number; reps: number; rpe?: number };

/** Ghost precedence: auto-progression suggestion (top set only) → last
 * session's same set index → last session's final set → the previous live
 * row. Placeholders and Enter-to-accept read from this. */
export function ghostFor(
  ex: LiveExercise,
  idx: number,
  last?: LastPerformance,
  suggestion?: Suggestion
): GhostSet | undefined {
  if (idx === 0 && suggestion)
    return { weight: suggestion.weight, reps: suggestion.reps };
  if (last?.sets[idx]) return last.sets[idx];
  if (last?.sets.length) return last.sets[last.sets.length - 1];
  for (let i = idx - 1; i >= 0; i -= 1) {
    const p = ex.sets[i];
    if (p.weight !== null && p.reps !== null)
      return { weight: p.weight, reps: p.reps, rpe: p.rpe ?? undefined };
  }
  return undefined;
}

export interface ExerciseRowProps {
  data: LiveExercise;
  last?: LastPerformance;
  suggestion?: Suggestion;
  onUpdateSet: (exId: string, setId: string, patch: Partial<LiveSet>) => void;
  onCompleteSet: (exId: string, setId: string) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setId: string) => void;
  onRemoveExercise: (exId: string) => void;
  onToggleNotes: (exId: string, open: boolean) => void;
  onNotesChange: (exId: string, value: string) => void;
  onActivity: (exId: string) => void;
  onTimerStart: (setId: string) => void;
}

// <sm: the ghost placeholders carry "previous", the ✓ gets a 48px thumb target
const GRID =
  "grid grid-cols-[24px_minmax(64px,1.2fr)_minmax(56px,1fr)_48px] sm:grid-cols-[28px_minmax(56px,0.9fr)_minmax(64px,1fr)_minmax(56px,1fr)_44px] items-center gap-1";

export function ExerciseRow({
  data,
  last,
  suggestion,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onToggleNotes,
  onNotesChange,
  onActivity,
  onTimerStart,
}: ExerciseRowProps) {
  const { exercise, sets } = data;
  const lastTop = last?.sets[0];
  const isBarbell = exercise.equipment === "Barbell";
  const [platesFor, setPlatesFor] = useState<string | null>(null);

  return (
    <Card className="overflow-visible" onFocusCapture={() => onActivity(data.id)}>
      <div className="flex items-center gap-3 px-4 pb-3 pt-4 md:px-5">
        <h3 className="truncate text-[15px] font-semibold tracking-tight text-primary">
          {exercise.name}
        </h3>
        <FavouriteStar exerciseId={exercise.id} size={15} />
        <Pill className="hidden sm:inline-flex">{exercise.muscle}</Pill>
        {lastTop && (
          <span className="hidden font-mono text-[12px] tabular-nums text-tertiary md:block">
            Last: {formatWeight(lastTop.weight)} kg × {lastTop.reps}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label={data.notesOpen ? "Hide notes" : "Add note"}
            onClick={() => onToggleNotes(data.id, !data.notesOpen)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-ink/[0.06]",
              data.notesOpen || data.notes
                ? "text-secondary"
                : "text-tertiary hover:text-primary"
            )}
          >
            <StickyNote className="h-4 w-4" aria-hidden />
          </button>
          <Menu
            ariaLabel={`${exercise.name} options`}
            items={[
              { label: "Add set", onSelect: () => onAddSet(data.id) },
              {
                label: "Remove last set",
                onSelect: () => {
                  const lastSet = sets[sets.length - 1];
                  if (lastSet) onRemoveSet(data.id, lastSet.id);
                },
              },
              {
                label: "Remove exercise",
                danger: true,
                onSelect: () => onRemoveExercise(data.id),
              },
            ]}
          />
        </div>
      </div>

      {data.notesOpen && (
        <div className="px-4 pb-3 md:px-5">
          <textarea
            autoFocus
            rows={2}
            value={data.notes}
            onChange={(e) => onNotesChange(data.id, e.target.value)}
            onBlur={() => {
              if (!data.notes.trim()) onToggleNotes(data.id, false);
            }}
            placeholder="Cues, pain, bar speed…"
            aria-label={`${exercise.name} notes`}
            className="w-full resize-none rounded-input border border-line bg-transparent px-3 py-2 text-[13.5px] text-secondary placeholder:text-tertiary focus:border-line-hover"
          />
        </div>
      )}

      <div className={cn(GRID, "border-t border-line px-3 py-2 md:px-4")}>
        {["Set", "Prev", "kg", "Reps", "✓"].map((h) => (
          <span
            key={h}
            aria-hidden
            className={cn(
              "text-center text-label uppercase text-tertiary",
              h === "Prev" && "hidden sm:block"
            )}
          >
            {h}
          </span>
        ))}
      </div>

      <div>
        {sets.map((set, idx) => {
          const prev = ghostFor(data, idx, last); // what actually happened
          const ghost = ghostFor(data, idx, last, suggestion); // what to aim for
          const complete = () => onCompleteSet(data.id, set.id);
          return (
            <div key={set.id}>
            <div
              onFocusCapture={() => {
                if (!set.completed) onTimerStart(set.id);
              }}
              className={cn(
                GRID,
                "border-t border-line px-3 py-1 transition-colors duration-200 ease-swift md:px-4",
                set.completed && "bg-success/[0.05]"
              )}
            >
              <span
                className={cn(
                  "text-center font-mono text-[13px] tabular-nums",
                  set.isPR ? "font-semibold text-gold" : "text-tertiary"
                )}
              >
                {set.isPR ? "PR" : idx + 1}
              </span>

              <button
                tabIndex={-1}
                onClick={() => {
                  if (!prev || set.completed) return;
                  onUpdateSet(data.id, set.id, {
                    weight: prev.weight,
                    reps: prev.reps,
                    rpe: prev.rpe ?? null,
                  });
                }}
                aria-label="Use previous session's values"
                className={cn(
                  "hidden truncate text-center font-mono text-[12px] tabular-nums text-tertiary sm:block",
                  prev &&
                    !set.completed &&
                    "rounded-md py-1 transition-colors hover:bg-ink/[0.04] hover:text-secondary"
                )}
              >
                {prev ? `${formatWeight(prev.weight)}×${prev.reps}` : "—"}
              </button>

              <div
                data-weight-anchor={set.id}
                className="relative mx-auto w-full max-w-[92px]"
                title={idx === 0 && suggestion ? suggestion.reason : undefined}
                onFocusCapture={() => isBarbell && setPlatesFor(set.id)}
                onBlurCapture={() => setPlatesFor((p) => (p === set.id ? null : p))}
              >
                <NumberStepper
                  value={set.weight}
                  ghost={ghost?.weight}
                  step={2.5}
                  ariaLabel={`${exercise.name} set ${idx + 1} weight in kilograms`}
                  onChange={(v) => onUpdateSet(data.id, set.id, { weight: v })}
                  onEnter={complete}
                  disabled={set.completed}
                />
                {platesFor === set.id && !set.completed && (
                  <PlatePopover weight={set.weight ?? ghost?.weight} />
                )}
              </div>
              <NumberStepper
                value={set.reps}
                ghost={ghost?.reps}
                step={1}
                ariaLabel={`${exercise.name} set ${idx + 1} reps`}
                onChange={(v) =>
                  onUpdateSet(data.id, set.id, { reps: v === null ? null : Math.round(v) })
                }
                onEnter={complete}
                disabled={set.completed}
                className="mx-auto w-full max-w-[80px]"
              />

              <motion.button
                onClick={complete}
                whileTap={{ scale: 0.9 }}
                aria-label={set.completed ? `Reopen set ${idx + 1}` : `Complete set ${idx + 1}`}
                aria-pressed={set.completed}
                className={cn(
                  "mx-auto flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-200 ease-swift sm:h-7 sm:w-7",
                  set.completed
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-line text-tertiary hover:border-line-hover hover:text-secondary"
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {set.completed && (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 22 }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            {set.warning && (
              <div className="flex items-center gap-3 border-t border-line bg-ink/[0.02] px-4 py-1.5 md:px-5">
                <span className="flex-1 text-[12px] text-tertiary">{set.warning}</span>
                <button
                  onClick={() => {
                    onUpdateSet(data.id, set.id, { completed: false, isPR: false, warning: undefined });
                  }}
                  className="text-[12px] font-medium text-secondary transition-colors hover:text-primary"
                >
                  Fix
                </button>
                <button
                  onClick={() => onUpdateSet(data.id, set.id, { warning: undefined })}
                  className="text-[12px] text-tertiary transition-colors hover:text-secondary"
                >
                  Dismiss
                </button>
              </div>
            )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onAddSet(data.id)}
        className="flex h-11 w-full items-center gap-2 rounded-b-card border-t border-line px-4 text-[13px] text-tertiary transition-colors duration-150 hover:bg-ink/[0.03] hover:text-secondary md:px-5"
      >
        + Add set
      </button>
    </Card>
  );
}
