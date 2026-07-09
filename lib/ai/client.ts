"use client";

// Client entry points: try the server route, fall back deterministically on
// any failure. The UI never sees a broken state.

import {
  regexParseSets,
  templateRecap,
  templateSummary,
} from "./fallback";
import { groundedOnly } from "@/lib/insights";
import type { ParseResult, SessionFacts, WeekFacts } from "./provider";

async function post<T>(action: string, payload: unknown, timeoutMs = 7000): Promise<T | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.fallback ? null : (data.result as T);
  } catch {
    return null;
  }
}

/** Downscale a photo to a ~1400px JPEG so it's small enough for the server cap
 * and fast for the vision model. Returns raw base64 (no data: prefix). */
async function toResizedBase64(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1400;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
  } catch {
    return "";
  }
}

export async function aiParseSets(
  input: string,
  exerciseNames: string[]
): Promise<ParseResult> {
  return (
    (await post<ParseResult>("parse-sets", { input, exerciseNames })) ??
    regexParseSets(input)
  );
}

export async function aiSummarize(facts: SessionFacts): Promise<string> {
  return (await post<string>("summarize", facts)) ?? templateSummary(facts);
}

export async function aiRecap(facts: WeekFacts): Promise<string> {
  return (await post<string>("recap", facts)) ?? templateRecap(facts);
}

/** No fake OCR: null means "enter it manually". User-initiated only. */
export async function aiParseImage(
  file: File,
  exerciseNames: string[]
): Promise<ParseResult | null> {
  const image = await toResizedBase64(file);
  if (!image) return null;
  // vision is slower than text — give it up to 22s before falling back
  return post<ParseResult>(
    "parse-image",
    { image, mime: "image/jpeg", exerciseNames },
    22000
  );
}

/** Caller keeps the template line unless the narration checks out. */
export async function aiNarratePR(args: {
  lift: string;
  weight: number;
  reps: number;
  priorBest: number;
}): Promise<string | null> {
  const line = await post<string>("narrate-pr", args);
  // grounded or silent: the line must reference the real number
  return line && line.includes(String(args.weight)) ? line : null;
}

export async function aiEnrich(
  name: string
): Promise<{ muscle: string; equipment: string; cues: string[] } | null> {
  return post("enrich", { name });
}

/** Fitbit-style read: Gemini rephrases, grounding filter drops any line with
 * a number that isn't in the deterministic facts. Fallback = the facts. */
export async function aiInsights(facts: string[]): Promise<string[]> {
  const lines = await post<string[]>("insights", { facts });
  if (lines?.length) {
    const grounded = groundedOnly(lines, facts);
    if (grounded.length >= 2) return grounded;
  }
  return facts;
}

export async function aiSearchNames(
  query: string,
  names: string[]
): Promise<string[] | null> {
  return post<string[]>("search", { query, names });
}

/** Weekly circle digest: Gemini rephrases the deterministic facts; if the line
 * introduces a number not in the facts, or there's no key, fall back to the
 * facts joined into a sentence. Grounded-or-silent. */
export async function aiCircleDigest(facts: string[]): Promise<string> {
  if (!facts.length) return "";
  const line = await post<string>("circle-digest", { facts });
  if (line) {
    const allowed = new Set(
      facts.flatMap((f) => (f.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))
    );
    const ok = (line.match(/\d+(?:\.\d+)?/g) ?? []).every((n) => allowed.has(Number(n)));
    if (ok) return line;
  }
  return facts.join(" ");
}
