"use client";

// Progress photos persist to MongoDB (owner-scoped) via /api/photos. Images are
// resized client-side to a ~1000px JPEG data URL before upload — small enough to
// live in a document, no separate blob store to provision. The guest account is
// a clean, empty slate (no seed, read-only).

import { useSyncExternalStore } from "react";
import { activeUserId, DEMO_USER_ID } from "./owner";
import { toKey } from "./utils";

export interface ProgressPhoto {
  id: string;
  userId: string;
  date: string; // ISO yyyy-mm-dd
  url: string;
  workoutId?: string;
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
      photos = []; // guest starts clean
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
