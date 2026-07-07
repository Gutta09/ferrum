// App settings: localStorage-backed, useSyncExternalStore-consumable.

import { useSyncExternalStore } from "react";

export interface Settings {
  unit: "kg" | "lb";
  barWeight: number; // in the chosen unit
}

const DEFAULTS: Settings = { unit: "kg", barWeight: 20 };
const KEY = "ferrum:settings";

let settings: Settings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    settings = DEFAULTS;
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSettings(): Settings {
  load();
  return useSyncExternalStore(
    subscribe,
    () => settings,
    () => DEFAULTS
  );
}

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  // switching unit swaps the conventional bar with it
  if (patch.unit && patch.barWeight === undefined) {
    settings.barWeight = patch.unit === "kg" ? 20 : 45;
  }
  localStorage.setItem(KEY, JSON.stringify(settings));
  listeners.forEach((l) => l());
}
