"use client";

// Progress photos persist to MongoDB (owner-scoped) via /api/photos. Images are
// resized client-side to a ~1000px JPEG data URL before upload — small enough to
// live in a document, no separate blob store to provision. The demo account
// shows seed placeholders (read-only, no DB).

import { useSyncExternalStore } from "react";
import { activeUserId, DEMO_USER_ID } from "./owner";
import { addDays, toKey } from "./utils";

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

let photos: ProgressPhoto[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => photos ?? EMPTY;
const EMPTY: ProgressPhoto[] = [];

async function hydrate() {
  if (inflight) return inflight;
  inflight = (async () => {
    if (activeUserId() === DEMO_USER_ID) {
      photos = seedPhotos();
    } else {
      const r = await fetch("/api/photos", { cache: "no-store" }).catch(() => null);
      const d = r && r.ok ? await r.json() : { photos: [] };
      photos = Array.isArray(d.photos) ? d.photos : [];
    }
    notify();
  })();
  return inflight;
}

export function usePhotos(): ProgressPhoto[] {
  if (photos === null && !inflight) void hydrate();
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Resize to max 1000px on the long edge and JPEG-encode, so a photo is a small
 * data URL that persists in the DB. */
async function resize(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1000;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function addPhotoFile(file: File, date?: string, workoutId?: string) {
  if (activeUserId() === DEMO_USER_ID) return; // demo is read-only
  const dataUrl = await resize(file).catch(() => null);
  if (!dataUrl) return;
  const res = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: date ?? toKey(new Date()), dataUrl, workoutId }),
  });
  if (!res.ok) return;
  const { photo } = await res.json();
  photos = [...(photos ?? []), photo as ProgressPhoto].sort((a, b) =>
    a.date < b.date ? -1 : 1
  );
  notify();
}

export async function removePhoto(id: string) {
  photos = (photos ?? []).filter((p) => p.id !== id);
  notify();
  await fetch("/api/photos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch(() => {});
}
