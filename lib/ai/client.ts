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

async function post<T>(action: string, payload: unknown): Promise<T | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.fallback ? null : (data.result as T);
  } catch {
    return null;
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
  const image = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  }).catch(() => "");
  if (!image) return null;
  return post<ParseResult>("parse-image", { image, mime: file.type, exerciseNames });
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
