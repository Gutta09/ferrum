// Owner-scoped favourite exercises: localStorage store, one tap to toggle,
// synced across every view via useSyncExternalStore.

import { useSyncExternalStore } from "react";
import { activeUserId } from "./owner";

const KEY = "ferrum:favourites";

// { [userId]: exerciseId[] }
let store: Record<string, string[]> = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) store = JSON.parse(raw);
  } catch {
    store = {};
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(store));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: string[] = [];

/** The active user's favourite exercise ids (stable reference between changes). */
export function useFavourites(): string[] {
  load();
  return useSyncExternalStore(
    subscribe,
    () => store[activeUserId()] ?? EMPTY,
    () => EMPTY
  );
}

export function isFavourite(id: string): boolean {
  load();
  return (store[activeUserId()] ?? []).includes(id);
}

export function toggleFavourite(id: string) {
  load();
  const uid = activeUserId();
  const current = store[uid] ?? [];
  store = {
    ...store,
    [uid]: current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id],
  };
  persist();
}
