"use client";

import { motion } from "framer-motion";
import { Check, Dumbbell, Pause, Play, ScanLine, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoinEarn } from "@/components/coin";
import {
  ExerciseRow,
  ghostFor,
  type LiveExercise,
  type LiveSet,
} from "@/components/exercise-row";
import { FavouriteStar } from "@/components/favourite-star";
import { NowPlaying } from "@/components/now-playing";
import { RestTimer } from "@/components/rest-timer";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { bestE1rm, getExercise, lastPerformance, userWorkoutCount, workoutRepo } from "@/lib/repo";
import { ensureWorkouts, invalidateWorkouts } from "@/lib/workout-cache";
import { EXERCISES } from "@/lib/seed";
import { useSettings } from "@/lib/settings";
import { useFavourites } from "@/lib/favourites";
import { addTemplate, getTemplate } from "@/lib/templates";
import { aiEnrich, aiNarratePR, aiParseImage, aiParseSets, aiSummarize } from "@/lib/ai/client";
import { sanityCheck } from "@/lib/ai/fallback";
import type { ParseResult } from "@/lib/ai/provider";
import { suggestTarget, type Suggestion } from "@/lib/training";
import type { Difficulty, Equipment, LastPerformance, MuscleGroup } from "@/lib/types";
import {
  cn,
  e1rm,
  formatClock,
  formatWeight,
  toKey,
  uid,
  formatLong,
} from "@/lib/utils";

const emptySet = (): LiveSet => ({
  id: uid("set"),
  weight: null,
  reps: null,
  rpe: null,
  completed: false,
});

interface Summary {
  volume: number;
  seconds: number;
  setsDone: number;
  prCount: number;
  prs: { name: string; weight: number; reps: number; priorBest: number }[];
}

function buildExercise(exerciseId: string, setCount: number): LiveExercise | null {
  const exercise = getExercise(exerciseId);
  if (!exercise) return null;
  return {
    id: `ex-${exerciseId}`,
    exercise,
    sets: Array.from({ length: setCount }, (_, i) => ({
      ...emptySet(),
      id: `set-${exerciseId}-${i}`,
    })),
    notes: "",
    notesOpen: false,
  };
}

function WorkoutView() {
  const { toast } = useToast();
  const params = useSearchParams();
  const templateId = params.get("template");

  // no predefined workouts: every session starts empty unless the user
  // chose one of their own templates
  const [session, setSession] = useState<LiveExercise[]>([]);
  const [sessionName, setSessionName] = useState("Today's session");
  // hydrate the DB workout cache so ghost rows (last time / suggestions) have
  // data, and resolve any chosen template, before the logging grid renders
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    ensureWorkouts().then(() => {
      if (!alive) return;
      if (templateId) {
        const t = getTemplate(templateId);
        if (t) {
          setSessionName(t.name);
          setSession(
            t.exercises.flatMap((te) => {
              const ex = buildExercise(te.exerciseId, te.sets);
              return ex ? [ex] : [];
            })
          );
        }
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [templateId]);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [restSession, setRestSession] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastLogMs, setLastLogMs] = useState<number | null>(null);
  const [finished, setFinished] = useState<Summary | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  const { restSeconds } = useSettings();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeExRef = useRef<string | null>(null);
  const rowTimerRef = useRef(new Map<string, number>());
  const lastCache = useRef(new Map<string, LastPerformance | undefined>());
  const bestCache = useRef(new Map<string, number>());
  const suggestionCache = useRef(new Map<string, Suggestion | undefined>());
  const [summaryLine, setSummaryLine] = useState<string | null>(null);
  const [prNarration, setPrNarration] = useState<string | null>(null);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");

  const getLast = useCallback((exerciseId: string) => {
    if (!lastCache.current.has(exerciseId))
      lastCache.current.set(exerciseId, lastPerformance(exerciseId));
    return lastCache.current.get(exerciseId);
  }, []);

  const getBest = useCallback((exerciseId: string) => {
    if (!bestCache.current.has(exerciseId))
      bestCache.current.set(exerciseId, bestE1rm(exerciseId));
    return bestCache.current.get(exerciseId)!;
  }, []);

  const getSuggestion = useCallback(
    (exerciseId: string) => {
      if (!suggestionCache.current.has(exerciseId))
        suggestionCache.current.set(exerciseId, suggestTarget(getLast(exerciseId)));
      return suggestionCache.current.get(exerciseId);
    },
    [getLast]
  );

  // session stopwatch: starts only when the user starts it
  const [timerState, setTimerState] = useState<"idle" | "running" | "paused">("idle");
  const stopwatchRef = useRef({ base: 0, startedAt: 0 });
  useEffect(() => {
    if (timerState !== "running") return;
    const t = window.setInterval(() => {
      setElapsed(
        Math.floor(
          stopwatchRef.current.base + (Date.now() - stopwatchRef.current.startedAt) / 1000
        )
      );
    }, 500);
    return () => window.clearInterval(t);
  }, [timerState]);
  const toggleTimer = useCallback(() => {
    setTimerState((st) => {
      if (st === "running") {
        stopwatchRef.current.base +=
          (Date.now() - stopwatchRef.current.startedAt) / 1000;
        return "paused";
      }
      stopwatchRef.current.startedAt = Date.now();
      return "running";
    });
  }, []);

  const bestSet = session
    .flatMap((ex) =>
      ex.sets
        .filter((st) => st.completed)
        .map((st) => ({
          w: st.weight ?? 0,
          r: st.reps ?? 0,
          score: e1rm(st.weight ?? 0, st.reps ?? 0),
        }))
    )
    .sort((a, b) => b.score - a.score)[0];
  const setsDone = session.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  const setsTotal = session.reduce((n, ex) => n + ex.sets.length, 0);

  // ---- mutations -----------------------------------------------------------

  const updateSet = useCallback((exId: string, setId: string, patch: Partial<LiveSet>) => {
    setSession((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : ex
      )
    );
  }, []);

  const focusWeight = (setId: string) => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>(`[data-weight-anchor="${setId}"] input`)
        ?.focus();
    });
  };

  const focusNextIncomplete = useCallback((afterSetId: string) => {
    const flat: LiveSet[] = [];
    for (const ex of sessionRef.current) flat.push(...ex.sets);
    const from = flat.findIndex((s) => s.id === afterSetId);
    for (let i = from + 1; i < flat.length + from; i += 1) {
      const s = flat[i % flat.length];
      if (!s.completed) return focusWeight(s.id);
    }
  }, []);

  const completeSet = useCallback(
    (exId: string, setId: string) => {
      const ex = sessionRef.current.find((e) => e.id === exId);
      if (!ex) return;
      const idx = ex.sets.findIndex((s) => s.id === setId);
      const set = ex.sets[idx];
      if (!set) return;

      if (set.completed) {
        updateSet(exId, setId, { completed: false, isPR: false });
        return;
      }

      const ghost = ghostFor(ex, idx, getLast(ex.exercise.id), getSuggestion(ex.exercise.id));
      const weight = set.weight ?? ghost?.weight ?? 0;
      const reps = set.reps ?? ghost?.reps ?? 0;
      if (reps <= 0) return; // nothing to log yet
      const rpe = set.rpe ?? ghost?.rpe ?? null;

      const est = e1rm(weight, reps);
      const isPR = weight > 0 && est > getBest(ex.exercise.id) + 0.5;
      // advisory fat-finger check against this lift's own history
      const warning = sanityCheck(weight, reps, getLast(ex.exercise.id)?.sets[0]?.weight ?? 0);
      if (isPR) bestCache.current.set(ex.exercise.id, est);

      // <2s flow instrumentation: first touch of the row → completion
      const t0 = rowTimerRef.current.get(setId);
      if (t0 !== undefined) {
        const ms = Math.round(performance.now() - t0);
        console.debug(`[perf] set logged in ${ms}ms (target <2000ms)`);
        setLastLogMs(ms);
        rowTimerRef.current.delete(setId);
      }

      setSession((prev) =>
        prev.map((e) => {
          if (e.id !== exId) return e;
          return {
            ...e,
            sets: e.sets.map((s, i) => {
              if (s.id === setId)
                return { ...s, weight, reps, rpe, completed: true, isPR, warning };
              // pre-fill the next untouched set from the one just logged
              if (i === idx + 1 && !s.completed && s.weight === null && s.reps === null)
                return { ...s, weight, reps, rpe };
              return s;
            }),
          };
        })
      );

      if (isPR) {
        toast({
          tone: "gold",
          title: `New PR — ${ex.exercise.name}`,
          description: `${formatWeight(weight)} kg × ${reps} · e1RM ${formatWeight(est)} kg`,
        });
      }
      setRestSession((r) => r + 1);
      requestAnimationFrame(() => focusNextIncomplete(setId));
    },
    [focusNextIncomplete, getBest, getLast, getSuggestion, toast, updateSet]
  );

  const addSet = useCallback((exId: string) => {
    const newSet = emptySet();
    setSession((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, newSet] } : ex))
    );
    focusWeight(newSet.id);
  }, []);

  const addSetToActive = useCallback(() => {
    const list = sessionRef.current;
    const target =
      list.find((e) => e.id === activeExRef.current) ??
      list.find((e) => e.sets.some((s) => !s.completed)) ??
      list[0];
    if (target) addSet(target.id);
  }, [addSet]);

  const removeSet = useCallback((exId: string, setId: string) => {
    setSession((prev) =>
      prev.map((ex) =>
        ex.id === exId && ex.sets.length > 1
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      )
    );
  }, []);

  const removeExercise = useCallback((exId: string) => {
    setSession((prev) => prev.filter((ex) => ex.id !== exId));
  }, []);

  const addExercise = useCallback((exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise) return;
    const first = emptySet();
    setSession((prev) => [
      ...prev,
      {
        id: uid("ex"),
        exercise,
        sets: [first, emptySet(), emptySet()],
        notes: "",
        notesOpen: false,
      },
    ]);
    setPickerOpen(false);
    focusWeight(first.id);
  }, []);

  const finish = useCallback(() => {
    const done = sessionRef.current.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.completed).length,
      0
    );
    if (done === 0) {
      toast({ title: "Nothing logged yet", description: "Complete a set first." });
      return;
    }
    const vol = sessionRef.current.reduce(
      (sum, ex) =>
        sum +
        ex.sets.reduce(
          (s, set) => s + (set.completed ? (set.weight ?? 0) * (set.reps ?? 0) : 0),
          0
        ),
      0
    );
    const prCount = sessionRef.current.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.isPR).length,
      0
    );
    // one PR line per lift — the best filed set of the day
    const prs = sessionRef.current.flatMap((ex) => {
      const best = ex.sets
        .filter((s) => s.isPR)
        .sort((a, b) => e1rm(b.weight ?? 0, b.reps ?? 0) - e1rm(a.weight ?? 0, a.reps ?? 0))[0];
      return best
        ? [
            {
              name: ex.exercise.name,
              weight: best.weight ?? 0,
              reps: best.reps ?? 0,
              // seed history is immutable in mock tier, so this is the pre-session best
              priorBest: bestE1rm(ex.exercise.id),
            },
          ]
        : [];
    });
    const seconds = elapsedRef.current;
    setRestSession(0);
    setTimerState("paused");
    setFinished({ volume: vol, seconds, setsDone: done, prCount, prs });

    // persist to the database — the workout survives refresh, sign-out, devices
    const payload = {
      name: sessionRef.current.length ? sessionName : "Session",
      date: toKey(new Date()),
      durationMin: Math.round(seconds / 60),
      exercises: sessionRef.current.map((ex) => ({
        exerciseId: ex.exercise.id,
        notes: ex.notes || undefined,
        sets: ex.sets
          .filter((s) => s.completed)
          .map((s) => ({
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            rpe: s.rpe ?? null,
            completed: true,
            isPR: Boolean(s.isPR),
          })),
      })),
    };
    fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (!r.ok) throw new Error("save failed");
        invalidateWorkouts(); // next read reflects the DB
      })
      .catch(() =>
        toast({
          title: "Couldn't save to the server",
          description: "Your session is still on screen — check your connection.",
        })
      );
    workoutRepo
      .recent(20)
      .then((ws) => {
        const prev = ws.find((w) => w.name === sessionName);
        const lastVolume = prev
          ? prev.exercises.reduce(
              (sum, ex) => sum + ex.sets.reduce((a, st) => a + st.weight * st.reps, 0),
              0
            )
          : undefined;
        return aiSummarize({
          name: sessionName,
          volume: vol,
          seconds,
          setsDone: done,
          prCount,
          lastVolume,
        });
      })
      .then((line) => setSummaryLine(line))
      .catch(() => {});
    if (prs[0]) {
      aiNarratePR({
        lift: prs[0].name,
        weight: prs[0].weight,
        reps: prs[0].reps,
        priorBest: prs[0].priorBest,
      }).then((line) => line && setPrNarration(line));
    }
    toast({
      tone: "success",
      title: "Workout saved",
      description: `${done} sets · ${formatClock(seconds)}`,
    });
  }, [sessionName, toast]);

  // ---- keyboard + command-palette wiring -----------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if (e.key === "Escape") {
        setPickerOpen(false);
        if (typing) t.blur();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || finished) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        addSetToActive();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setPickerOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addSetToActive, finished]);

  useEffect(() => {
    const onAddSet = () => addSetToActive();
    const onAddExercise = () => setPickerOpen(true);
    const onFinish = () => finish();
    window.addEventListener("ferrum:add-set", onAddSet);
    window.addEventListener("ferrum:add-exercise", onAddExercise);
    window.addEventListener("ferrum:finish", onFinish);
    return () => {
      window.removeEventListener("ferrum:add-set", onAddSet);
      window.removeEventListener("ferrum:add-exercise", onAddExercise);
      window.removeEventListener("ferrum:finish", onFinish);
    };
  }, [addSetToActive, finish]);

  const dismissRest = useCallback(() => setRestSession(0), []);

  /** stages parsed sets into the matching exercise — values only, the lifter
   * still confirms each set with Enter. Nothing auto-completes. */
  const stageParsed = useCallback(
    (r: ParseResult) => {
      if (!r.sets.length) {
        toast({ title: "Couldn't read that", description: "Try \u201cbench 3\u00d78 @ 80\u201d" });
        return;
      }
      const q = r.exercise?.toLowerCase().trim() ?? "";
      let target = q
        ? sessionRef.current.find((e) => e.exercise.name.toLowerCase().includes(q))
        : undefined;
      if (!target && q) {
        const meta = EXERCISES.find((e) => e.name.toLowerCase().includes(q));
        if (meta) {
          const newEx: LiveExercise = {
            id: uid("ex"),
            exercise: meta,
            sets: r.sets.map((ps) => ({
              ...emptySet(),
              weight: ps.weight ?? null,
              reps: ps.reps ?? null,
              rpe: ps.rpe ?? null,
            })),
            notes: "",
            notesOpen: false,
          };
          setSession((prev) => [...prev, newEx]);
          toast({
            tone: "success",
            title: `${r.sets.length} sets staged \u00b7 ${meta.name}`,
            description: r.needsClarification
              ? "Check the numbers before completing"
              : "Enter confirms each set",
          });
          return;
        }
      }
      target =
        target ??
        sessionRef.current.find((e) => e.sets.some((st) => !st.completed)) ??
        sessionRef.current[0];
      if (!target) return;
      const targetId = target.id;
      const targetName = target.exercise.name;
      setSession((prev) =>
        prev.map((e) => {
          if (e.id !== targetId) return e;
          let si = 0;
          const filled = e.sets.map((st) => {
            if (st.completed || si >= r.sets.length) return st;
            if (st.weight === null && st.reps === null) {
              const ps = r.sets[si++];
              return { ...st, weight: ps.weight ?? null, reps: ps.reps ?? null, rpe: ps.rpe ?? null };
            }
            return st;
          });
          while (si < r.sets.length) {
            const ps = r.sets[si++];
            filled.push({
              ...emptySet(),
              weight: ps.weight ?? null,
              reps: ps.reps ?? null,
              rpe: ps.rpe ?? null,
            });
          }
          return { ...e, sets: filled };
        })
      );
      toast({
        tone: "success",
        title: `${r.sets.length} sets staged \u00b7 ${targetName}`,
        description: r.needsClarification
          ? "Check the numbers before completing"
          : "Enter confirms each set",
      });
    },
    [toast]
  );

  const saveTemplate = () => {
    const name = tplName.trim();
    if (!name) return;
    addTemplate(
      name,
      sessionRef.current.map((ex) => ({
        exerciseId: ex.exercise.id,
        sets: ex.sets.length,
      }))
    );
    setSaveTplOpen(false);
    toast({ tone: "success", title: "Template saved", description: name });
  };

  if (!ready) return null;

  // ---- finished view -------------------------------------------------------

  if (finished) {
    // one orchestrated beat: coin lands (0.15s) → PRs file in (0.7s+) → summary settles
    const prDelay = 0.7;
    const statsDelay = prDelay + finished.prs.length * 0.12 + 0.15;
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center pt-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </span>
        <h1 className="mt-6 text-h1 text-primary">Workout complete</h1>
        <p className="mt-2 text-[14px] text-tertiary">{sessionName} · {formatLong(toKey(new Date()))}</p>
        <div className="mt-8">
          <CoinEarn vaultTotal={userWorkoutCount() + 1} />
        </div>
        {finished.prs.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-1.5">
            {finished.prs.map((pr, i) => (
              <motion.p
                key={pr.name}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                  delay: prDelay + i * 0.12,
                }}
                className="text-[13px] text-gold"
              >
                {i === 0 && prNarration ? (
                  prNarration
                ) : (
                  <>
                    New PR · {pr.name} ·{" "}
                    <span className="font-mono tabular-nums">
                      {formatWeight(pr.weight)} kg × {pr.reps}
                    </span>{" "}
                    · Filed.
                  </>
                )}
              </motion.p>
            ))}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: statsDelay, ease: [0.22, 0.61, 0.36, 1] }}
          className="w-full"
        >
        <Card className="mt-8 grid w-full grid-cols-2 gap-px overflow-hidden bg-line p-0 sm:grid-cols-4">
          {[
            { label: "Duration", value: formatClock(finished.seconds) },
            {
              label: "Top set",
              value: finished.prs[0]
                ? `${formatWeight(finished.prs[0].weight)} × ${finished.prs[0].reps}`
                : bestSet
                  ? `${formatWeight(bestSet.w)} × ${bestSet.r}`
                  : "—",
            },
            { label: "Sets", value: String(finished.setsDone) },
            { label: "PRs", value: String(finished.prCount), gold: finished.prCount > 0 },
          ].map((s) => (
            <div key={s.label} className="bg-card px-4 py-5">
              <CardLabel>{s.label}</CardLabel>
              <p
                className={cn(
                  "mt-2 font-mono text-[20px] font-medium tabular-nums",
                  s.gold ? "text-gold" : "text-primary"
                )}
              >
                {s.value}
              </p>
            </div>
          ))}
        </Card>
        </motion.div>
        {summaryLine && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-[13.5px] text-secondary"
          >
            {summaryLine}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: statsDelay + 0.15 }}
          className="mt-8 flex items-center gap-3"
        >
          <Link href="/">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
          <Link href="/analytics">
            <Button>View analytics</Button>
          </Link>
          <Button onClick={() => {
            setTplName(sessionName);
            setSaveTplOpen(true);
          }}>
            Save as template
          </Button>
        </motion.div>

        <Modal
          open={saveTplOpen}
          onClose={() => setSaveTplOpen(false)}
          ariaLabel="Save workout as template"
        >
          <div className="p-6 text-left">
            <CardLabel>Save as template</CardLabel>
            <Input
              autoFocus
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
              placeholder="PPL · Upper A · 5×5…"
              aria-label="Template name"
              className="mt-4"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setSaveTplOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveTemplate}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ---- logging view --------------------------------------------------------

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 -mx-5 mb-8 border-b border-line bg-bg/70 px-5 backdrop-blur-xl transition-[padding] duration-200 ease-swift md:-mx-10 md:px-10",
          scrolled ? "py-1.5 md:py-3" : "py-3"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <CardLabel className={cn(scrolled && "hidden md:block")}>
              {formatLong(toKey(new Date()))}
            </CardLabel>
            <h1
              className={cn(
                "truncate font-semibold tracking-tight text-primary transition-[font-size] duration-200",
                scrolled ? "text-[16px] md:text-[20px]" : "text-[20px]"
              )}
            >
              {sessionName}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-5">
            {lastLogMs !== null && (
              <span
                className="hidden font-mono text-[11px] tabular-nums text-tertiary lg:block"
                title="Time from first keystroke to set completion"
              >
                last set {(lastLogMs / 1000).toFixed(1)}s
              </span>
            )}
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-tertiary">
                Time
              </span>
              <span className="flex items-center gap-1.5">
                <button
                  onClick={toggleTimer}
                  aria-label={
                    timerState === "running"
                      ? "Pause session timer"
                      : timerState === "paused"
                        ? "Resume session timer"
                        : "Start session timer"
                  }
                  className="rounded-md p-0.5 text-tertiary transition-colors hover:text-primary"
                >
                  {timerState === "running" ? (
                    <Pause className="h-3 w-3 fill-current" aria-hidden />
                  ) : (
                    <Play className="h-3 w-3 fill-current" aria-hidden />
                  )}
                </button>
                <span
                  className={cn(
                    "font-mono text-[15px] tabular-nums",
                    timerState === "idle" ? "text-tertiary" : "text-primary"
                  )}
                >
                  {formatClock(elapsed)}
                </span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-tertiary">
                Best set
              </span>
              <motion.span
                key={bestSet ? `${bestSet.w}x${bestSet.r}` : "none"}
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="font-mono text-[15px] tabular-nums text-primary"
              >
                {bestSet ? `${formatWeight(bestSet.w)} × ${bestSet.r}` : "—"}
              </motion.span>
            </div>
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-tertiary">
                Sets
              </span>
              <span className="font-mono text-[15px] tabular-nums text-primary">
                {setsDone}/{setsTotal}
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={finish} className="hidden sm:inline-flex">
              Finish
            </Button>
          </div>
        </div>
      </header>

      {session.length === 0 && (
        <Card className="mb-5 flex flex-col items-center px-6 py-12 text-center">
          <Dumbbell className="h-5 w-5 text-tertiary" aria-hidden />
          <p className="mt-3 text-[15px] font-medium text-primary">Build today&apos;s session</p>
          <p className="mt-1 max-w-sm text-[13px] text-tertiary">
            Add movements from the library, quick-log a line below, or start
            from one of your templates.
          </p>
          <Button variant="primary" className="mt-5" onClick={() => setPickerOpen(true)}>
            Add exercise
          </Button>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <QuickLog
            exerciseNames={session.map((e) => e.exercise.name)}
            onParsed={stageParsed}
          />
        </div>
        <ScanButton
          exerciseNames={session.map((e) => e.exercise.name)}
          onParsed={stageParsed}
          onFail={() =>
            toast({
              title: "Couldn't read the photo",
              description: "Enter the sets manually — nothing was guessed.",
            })
          }
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 [@media(orientation:landscape)_and_(max-height:540px)]:grid-cols-2">
        {session.map((ex) => (
          <ExerciseRow
            key={ex.id}
            data={ex}
            last={getLast(ex.exercise.id)}
            suggestion={getSuggestion(ex.exercise.id)}
            onUpdateSet={updateSet}
            onCompleteSet={completeSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemoveExercise={removeExercise}
            onToggleNotes={(id, open) =>
              setSession((prev) =>
                prev.map((e) => (e.id === id ? { ...e, notesOpen: open } : e))
              )
            }
            onNotesChange={(id, value) =>
              setSession((prev) =>
                prev.map((e) => (e.id === id ? { ...e, notes: value } : e))
              )
            }
            onActivity={(id) => {
              activeExRef.current = id;
            }}
            onTimerStart={(setId) => {
              if (!rowTimerRef.current.has(setId))
                rowTimerRef.current.set(setId, performance.now());
            }}
          />
        ))}

        <button
          onClick={() => setPickerOpen(true)}
          className="flex h-14 items-center justify-center gap-2 rounded-card border border-dashed border-line text-[14px] text-tertiary transition-colors duration-150 hover:border-line-hover hover:text-secondary [@media(orientation:landscape)_and_(max-height:540px)]:col-span-2"
        >
          Add exercise
          <kbd className="rounded border border-line bg-ink/[0.04] px-1.5 font-mono text-[11px]">
            N
          </kbd>
        </button>
      </div>

      {/* thumb-zone action bar — primary actions live in the bottom third */}
      <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-3 border-t border-line bg-bg px-4 py-2 sm:hidden">
        <span className="flex-1 font-mono text-[14px] tabular-nums text-secondary">
          {setsDone}/{setsTotal} sets
        </span>
        <Button size="sm" onClick={addSetToActive}>
          + Set
        </Button>
        <Button variant="primary" size="sm" onClick={finish}>
          Finish
        </Button>
      </div>

      <RestTimer session={restSession} seconds={restSeconds} onDismiss={dismissRest} />
      <NowPlaying />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        exclude={session.map((e) => e.exercise.id)}
      />
    </>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={null}>
      <WorkoutView />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------

/** User-initiated photo scan — whiteboard, written log, weight stack. One
 * vision call per explicit tap; unreadable means manual entry, never a guess. */
function ScanButton({
  exerciseNames,
  onParsed,
  onFail,
}: {
  exerciseNames: string[];
  onParsed: (r: ParseResult) => void;
  onFail: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        aria-label="Scan a whiteboard or written log"
        title="Scan a photo of your sets"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="h-10 w-10 border border-line px-0"
      >
        <ScanLine className="h-4 w-4" aria-hidden />
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          const result = await aiParseImage(f, exerciseNames);
          setBusy(false);
          if (result && result.sets.length) onParsed(result);
          else onFail();
        }}
      />
    </>
  );
}

/** One line in, structured sets out. AI parses server-side when configured;
 * a regex parser is the deterministic floor. No badges — it just works. */
function QuickLog({
  exerciseNames,
  onParsed,
}: {
  exerciseNames: string[];
  onParsed: (r: ParseResult) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const input = value.trim();
    if (!input || busy) return;
    setBusy(true);
    const result = await aiParseSets(input, exerciseNames);
    setBusy(false);
    onParsed(result);
    if (result.sets.length) setValue("");
  };

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          submit();
        }
      }}
      disabled={busy}
      placeholder={'Quick log \u2014 \u201cbench 3\u00d78 @ 80 rpe 8\u201d'}
      aria-label="Quick log a set in plain words"
      className="font-mono text-[13.5px]"
    />
  );
}

function ExercisePicker({
  open,
  onClose,
  onPick,
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  exclude: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [creating, setCreating] = useState(false);
  const [muscle, setMuscle] = useState<MuscleGroup>("Chest");
  const [equipment, setEquipment] = useState<Equipment>("Barbell");
  const [cues, setCues] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setCreating(false);
    }
  }, [open]);

  const startCreate = async () => {
    setCreating(true);
    setCues([]);
    // AI pre-fills as editable ghost values — never silently committed
    const meta = await aiEnrich(query.trim());
    if (meta) {
      const muscles: MuscleGroup[] = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
      const equipments: Equipment[] = ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight"];
      if (muscles.includes(meta.muscle as MuscleGroup)) setMuscle(meta.muscle as MuscleGroup);
      if (equipments.includes(meta.equipment as Equipment)) setEquipment(meta.equipment as Equipment);
      if (Array.isArray(meta.cues)) setCues(meta.cues.slice(0, 3).map(String));
    }
  };

  const confirmCreate = () => {
    const name = query.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!EXERCISES.some((e) => e.id === id)) {
      EXERCISES.push({
        id,
        name,
        muscle,
        equipment,
        difficulty: "Intermediate" as Difficulty,
      });
      // persist so it survives refresh and appears in the catalog next session
      fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, muscle, equipment }),
      }).catch(() => {});
    }
    onPick(id);
  };

  const favourites = useFavourites();
  const favSet = useMemo(() => new Set(favourites), [favourites]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    // favourites float to the top of the picker so common movements are fastest
    return EXERCISES.filter(
      (e) => !exclude.includes(e.id) && (!q || e.name.toLowerCase().includes(q))
    )
      .sort((a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id)))
      .slice(0, 8);
  }, [query, exclude, favSet]);

  useEffect(() => setSelected(0), [query]);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Add exercise" top>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <SearchIcon className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(s + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter" && results[selected]) {
              onPick(results[selected].id);
            }
          }}
          placeholder="Add an exercise…"
          aria-label="Search exercises to add"
          className="w-full bg-transparent py-4 text-[15px] text-primary placeholder:text-tertiary focus:outline-none"
        />
      </div>
      {creating ? (
        <div className="p-5">
          <p className="text-[14px] font-medium text-primary">Create “{query.trim()}”</p>
          <p className="mt-1 text-[12px] text-tertiary">
            Confirm the details — suggestions are editable, nothing commits without you.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <Segmented
              options={["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"] as const}
              value={muscle}
              onChange={(m) => setMuscle(m as MuscleGroup)}
              ariaLabel="Muscle group"
            />
            <Segmented
              options={["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight"] as const}
              value={equipment}
              onChange={(eq) => setEquipment(eq as Equipment)}
              ariaLabel="Equipment"
            />
          </div>
          {cues.length > 0 && (
            <p className="mt-3 text-[12px] leading-relaxed text-tertiary">
              {cues.join(" · ")}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button size="sm" onClick={() => setCreating(false)}>
              Back
            </Button>
            <Button size="sm" variant="primary" onClick={confirmCreate}>
              Add exercise
            </Button>
          </div>
        </div>
      ) : (
      <div className="max-h-[300px] overflow-y-auto p-2">
        {results.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-[13px] text-tertiary">No exercises match “{query}”</p>
            {query.trim().length > 2 && (
              <Button size="sm" className="mt-3 border border-line" onClick={startCreate}>
                Create “{query.trim()}”
              </Button>
            )}
          </div>
        )}
        {results.map((e, i) => {
          const last = lastPerformance(e.id)?.sets[0];
          return (
            <div
              key={e.id}
              onMouseMove={() => setSelected(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-input pr-2 transition-colors duration-100",
                i === selected ? "bg-ink/[0.07]" : ""
              )}
            >
              <button
                onClick={() => onPick(e.id)}
                className="flex flex-1 items-center gap-3 px-3 py-2.5 text-left"
              >
                <Dumbbell className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
                <span className="flex-1 truncate text-[14px] text-primary">{e.name}</span>
                <Pill className="hidden sm:inline-flex">{e.muscle}</Pill>
                {last && (
                  <span className="font-mono text-[11.5px] tabular-nums text-tertiary">
                    {formatWeight(last.weight)}×{last.reps}
                  </span>
                )}
              </button>
              <FavouriteStar exerciseId={e.id} size={15} />
            </div>
          );
        })}
      </div>
      )}
    </Modal>
  );
}
