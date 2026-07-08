"use client";

// Cross-device sync for client prefs (favourites, templates, playlists). The
// stores keep localStorage as an instant cache; this hydrates from the
// owner-scoped /api/prefs on load and write-through on change (debounced).

import { activeUserId, DEMO_USER_ID } from "./owner";

interface Prefs {
  favourites: string[];
  templates: unknown[];
  playlists: { list: unknown[]; activeId?: string };
}
const EMPTY: Prefs = { favourites: [], templates: [], playlists: { list: [] } };

let cache: Prefs | null = null;
let inflight: Promise<Prefs> | null = null;

export async function loadPrefs(): Promise<Prefs> {
  if (activeUserId() === DEMO_USER_ID) return EMPTY;
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/api/prefs", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { prefs: EMPTY }))
    .then((d) => {
      cache = (d.prefs as Prefs) ?? EMPTY;
      inflight = null;
      return cache;
    })
    .catch(() => {
      inflight = null;
      return EMPTY;
    });
  return inflight;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: Partial<Prefs> = {};

/** Debounced write-through of one or more pref slices. */
export function pushPref(patch: Partial<Prefs>) {
  if (activeUserId() === DEMO_USER_ID) return;
  pending = { ...pending, ...patch };
  if (cache) cache = { ...cache, ...patch };
  clearTimeout(timer);
  timer = setTimeout(() => {
    const body = pending;
    pending = {};
    fetch("/api/prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, 500);
}

export function resetPrefsCache() {
  cache = null;
  inflight = null;
}
