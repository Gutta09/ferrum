"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function Menu({
  items,
  ariaLabel,
  trigger,
  align = "right",
}: {
  items: MenuItem[];
  ariaLabel: string;
  /** custom trigger content — defaults to the ··· icon button */
  trigger?: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          !trigger &&
            "flex h-8 w-8 items-center justify-center rounded-lg text-tertiary transition-colors duration-150 hover:bg-white/[0.06] hover:text-primary"
        )}
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" aria-hidden />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.13, ease: [0.22, 0.61, 0.36, 1] }}
            className={cn(
              "absolute top-full z-40 mt-1 w-48 rounded-input border border-line bg-card p-1 shadow-ambient",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors duration-100",
                  item.danger
                    ? "text-danger hover:bg-danger/10"
                    : "text-secondary hover:bg-white/[0.06] hover:text-primary"
                )}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
