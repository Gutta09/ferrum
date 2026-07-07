// Progress-photo mock layer: module store + useSyncExternalStore. Uploads
// become object URLs; a real API can replace add/remove without UI changes.

import { useSyncExternalStore } from "react";
import { activeUserId, assertOwner, DEMO_USER_ID } from "./owner";
import { addDays, toKey, uid } from "./utils";

export interface ProgressPhoto {
  id: string;
  userId: string;
  date: string; // ISO yyyy-mm-dd
  url: string;
  workoutId?: string;
}

function placeholder(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#17181B"/><rect x="0.5" y="0.5" width="599" height="799" fill="none" stroke="rgba(255,255,255,0.06)"/><ellipse cx="300" cy="330" rx="92" ry="120" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="2"/><path d="M170 640c10-120 80-170 130-170s120 50 130 170" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="2"/><text x="300" y="740" text-anchor="middle" font-family="monospace" font-size="26" fill="#6B6B72">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function seedPhotos(): ProgressPhoto[] {
  const today = new Date();
  return [8, 6, 4, 2].map((weeksAgo) => {
    const date = toKey(addDays(today, -7 * weeksAgo));
    return { id: `seed-${weeksAgo}`, userId: DEMO_USER_ID, date, url: placeholder(date) };
  });
}

let photos: ProgressPhoto[] = seedPhotos();
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => photos;

export function usePhotos(): ProgressPhoto[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function addPhotoFile(file: File, date?: string, workoutId?: string) {
  photos = [
    ...photos,
    {
      id: uid("photo"),
      userId: activeUserId(),
      date: date ?? toKey(new Date()),
      url: URL.createObjectURL(file),
      workoutId,
    },
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  listeners.forEach((l) => l());
}

export function removePhoto(id: string) {
  const target = photos.find((p) => p.id === id);
  if (!target) return;
  assertOwner(target);
  if (target.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
  photos = photos.filter((p) => p.id !== id);
  listeners.forEach((l) => l());
}
