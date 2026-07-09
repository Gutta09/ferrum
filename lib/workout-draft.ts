"use client";

// Keeps the in-progress workout safe: every change is written to localStorage,
// so leaving the screen (to the dashboard, a refresh, a phone lock) and coming
// back restores exactly what you had logged. Committed to the database on Finish.
// Scoped per user; demo is never persisted.

import type { LiveExercise } from "@/components/exercise-row";
import { activeUserId, DEMO_USER_ID } from "./owner";

export interface Draft {
  name: string;
  session: LiveExercise[];
  savedAt: number;
}

const keyFor = () => `ferrum:draft:${activeUserId()}`;

export function saveDraft(name: string, session: LiveExercise[]) {
  if (typeof window === "undefined" || activeUserId() === DEMO_USER_ID) return;
  try {
    if (!session.length) {
      localStorage.removeItem(keyFor());
      return;
    }
    localStorage.setItem(keyFor(), JSON.stringify({ name, session, savedAt: Date.now() }));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor());
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    // a draft older than ~20h is stale (yesterday's abandoned session) — drop it
    if (!d || !Array.isArray(d.session) || !d.session.length) return null;
    if (Date.now() - (d.savedAt ?? 0) > 20 * 60 * 60 * 1000) {
      localStorage.removeItem(keyFor());
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyFor());
  } catch {
    /* non-fatal */
  }
}
