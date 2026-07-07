"use client";

import {
  BarChart3,
  CheckCircle2,
  CornerDownLeft,
  Dumbbell,
  History,
  Home,
  Library,
  ListPlus,
  Plus,
  Search as SearchIcon,
  User,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { EXERCISES } from "@/lib/seed";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  group: "Actions" | "Navigate" | "Exercises";
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      // focus after the panel mounts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const emit = (event: string) => () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent(event));
    };

    const actions: Item[] =
      pathname === "/workout"
        ? [
            { id: "add-set", group: "Actions", label: "Add set", hint: "A", icon: Plus, run: emit("ferrum:add-set") },
            { id: "add-exercise", group: "Actions", label: "Add exercise", hint: "N", icon: ListPlus, run: emit("ferrum:add-exercise") },
            { id: "finish", group: "Actions", label: "Finish workout", icon: CheckCircle2, run: emit("ferrum:finish") },
          ]
        : [
            { id: "start", group: "Actions", label: "Start today's workout", icon: Dumbbell, run: go("/workout") },
          ];

    const nav: Item[] = [
      { id: "nav-home", group: "Navigate", label: "Dashboard", icon: Home, run: go("/") },
      { id: "nav-workout", group: "Navigate", label: "Workout", icon: Dumbbell, run: go("/workout") },
      { id: "nav-exercises", group: "Navigate", label: "Exercises", icon: Library, run: go("/exercises") },
      { id: "nav-analytics", group: "Navigate", label: "Analytics", icon: BarChart3, run: go("/analytics") },
      { id: "nav-history", group: "Navigate", label: "History", icon: History, run: go("/history") },
      { id: "nav-profile", group: "Navigate", label: "Profile", icon: User, run: go("/profile") },
    ];

    const q = query.trim().toLowerCase();
    const exercises: Item[] = q
      ? EXERCISES.filter((e) => e.name.toLowerCase().includes(q))
          .slice(0, 5)
          .map((e) => ({
            id: `ex-${e.id}`,
            group: "Exercises" as const,
            label: e.name,
            hint: e.muscle,
            icon: Dumbbell,
            run: go(`/exercises?q=${encodeURIComponent(e.name)}`),
          }))
      : [];

    const base = [...actions, ...nav].filter(
      (i) => !q || i.label.toLowerCase().includes(q)
    );
    return [...base, ...exercises];
  }, [pathname, query, router]);

  useEffect(() => setSelected(0), [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[selected]?.run();
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  let lastGroup: string | null = null;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      ariaLabel="Command palette"
      top
      className="max-w-xl overflow-hidden !bg-card/80 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <SearchIcon className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command or search…"
          aria-label="Command palette search"
          className="h-13 w-full bg-transparent py-4 text-[15px] text-primary placeholder:text-tertiary focus:outline-none"
        />
        <kbd className="rounded-md border border-line bg-ink/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-tertiary">
          esc
        </kbd>
      </div>
      <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2" role="listbox">
        {items.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-tertiary">
            Nothing matches “{query}”
          </p>
        )}
        {items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          const active = i === selected;
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {header && (
                <p className="px-3 pb-1 pt-3 text-label uppercase tracking-[0.02em] text-tertiary first:pt-1.5">
                  {header}
                </p>
              )}
              <button
                data-index={i}
                role="option"
                aria-selected={active}
                onClick={item.run}
                onMouseMove={() => setSelected(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-left text-[14px] transition-colors duration-100",
                  active ? "bg-ink/[0.07] text-primary" : "text-secondary"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.hint && (
                  <span className="font-mono text-[11px] text-tertiary">{item.hint}</span>
                )}
                {active && (
                  <CornerDownLeft className="h-3.5 w-3.5 text-tertiary" aria-hidden />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
