"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Trophy, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn, uid } from "@/lib/utils";

type Tone = "default" | "success" | "gold";

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; tone?: Tone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "default" }) => {
      const id = uid("toast");
      setToasts((t) => [...t.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 3800);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[320px] flex-col gap-2 md:bottom-6 md:right-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              className="pointer-events-auto flex items-start gap-3 rounded-input border border-line bg-card px-4 py-3 shadow-ambient"
            >
              {t.tone !== "default" && (
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    t.tone === "success" && "bg-success/15 text-success",
                    t.tone === "gold" && "bg-gold/15 text-gold"
                  )}
                >
                  {t.tone === "gold" ? (
                    <Trophy className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-primary">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 font-mono text-[12px] tabular-nums text-secondary">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-0.5 text-tertiary transition-colors hover:text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
