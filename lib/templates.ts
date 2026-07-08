// Routine templates: localStorage-backed store, seeded from the program days.

import { useSyncExternalStore } from "react";
import { activeUserId, assertOwner } from "./owner";
import { loadPrefs, pushPref } from "./prefs-client";
import { uid } from "./utils";

export interface Template {
  id: string;
  userId: string;
  name: string;
  exercises: { exerciseId: string; sets: number }[];
}

const KEY = "ferrum:templates";

// no predefined routines — every template is user-made
const SEEDS: Template[] = [];

let templates: Template[] = SEEDS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) templates = JSON.parse(raw);
  } catch {
    templates = SEEDS;
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(templates));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// sync each slice to the server whenever this user's templates change
function syncUp() {
  pushPref({ templates: templates.filter((t) => t.userId === activeUserId()) });
}

const hydrated = new Set<string>();
function hydrate() {
  const me = activeUserId();
  if (hydrated.has(me)) return;
  hydrated.add(me);
  loadPrefs().then((p) => {
    const mine = (p.templates as Template[]) ?? [];
    if (!mine.length) return;
    const ids = new Set(templates.map((t) => t.id));
    const merged = [...templates, ...mine.filter((t) => t?.id && !ids.has(t.id))];
    if (merged.length !== templates.length) {
      templates = merged;
      persist();
    }
  });
}

/** returns the raw store — consumers filter by `userId === activeUserId()` */
export function useTemplates(): Template[] {
  load();
  hydrate();
  return useSyncExternalStore(subscribe, () => templates, () => SEEDS);
}

export function getTemplate(id: string): Template | undefined {
  load();
  return templates.find((t) => t.id === id);
}

export function addTemplate(name: string, exercises: Template["exercises"]) {
  templates = [...templates, { id: uid("tpl"), userId: activeUserId(), name, exercises }];
  persist();
  syncUp();
}

export function duplicateTemplate(id: string) {
  const src = templates.find((t) => t.id === id);
  if (!src) return;
  assertOwner(src);
  templates = [...templates, { ...src, id: uid("tpl"), name: `${src.name} copy` }];
  persist();
  syncUp();
}

export function renameTemplate(id: string, name: string) {
  const src = templates.find((t) => t.id === id);
  if (src) assertOwner(src);
  templates = templates.map((t) => (t.id === id ? { ...t, name } : t));
  persist();
  syncUp();
}

export function removeTemplate(id: string) {
  const src = templates.find((t) => t.id === id);
  if (src) assertOwner(src);
  templates = templates.filter((t) => t.id !== id);
  persist();
  syncUp();
}
