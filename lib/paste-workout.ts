import type { Equipment, Exercise, MuscleGroup } from "./types";

/**
 * Turn a pasted workout (a list from notes, WhatsApp, ChatGPT, a coach…) into
 * exercise names only. Sets, reps, weights, RPE, rest and tempo are stripped on
 * purpose — the user logs those live, so nothing numeric is ever guessed.
 */

export interface PastedExercise {
  /** cleaned name as written, e.g. "Incline DB Press" */
  name: string;
  /** catalog match, if any */
  match: Exercise | null;
}

const ALIASES: Record<string, string> = {
  db: "dumbbell",
  dbs: "dumbbell",
  dumbbells: "dumbbell",
  bb: "barbell",
  ohp: "overhead press",
  rdl: "romanian deadlift",
  rdls: "romanian deadlift",
  bss: "bulgarian split squat",
  squats: "squat",
  "pull ups": "pull up",
  pullups: "pull up",
  pullup: "pull up",
  chinups: "chin up",
  dips: "dip",
  curls: "curl",
  rows: "row",
  pulls: "pull",
  presses: "press",
  delts: "delt",
  raises: "raise",
  flys: "fly",
  flyes: "fly",
  pushdowns: "pushdown",
  extensions: "extension",
  crunches: "crunch",
  lats: "lat",
  bench: "bench press",
  tricep: "triceps",
  skullcrushers: "skull crusher",
  skullcrusher: "skull crusher",
};

// headings / filler lines that aren't exercises
const SKIP = /^(.*\b(workout|day|session|routine|split)|day\s*\d+|week\s*\d+|warm\s*-?\s*up|cool\s*-?\s*down|rest( day)?|notes?|workout|session|push( day)?|pull( day)?|legs?( day)?|upper( body)?|lower( body)?|chest( day)?|back( day)?|arms?( day)?|shoulders?( day)?|core|cardio|superset|circuit|finisher)\s*:?\s*$/i;

/** Strip bullets, numbering, and every numeric prescription from one line. */
export function cleanLine(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^[\s>*\-•·–—+]+/, ""); // bullets
  s = s.replace(/^\(?[a-z]?\d{1,2}[a-z]?[.):\]]\s*/i, ""); // 1. 2) A1: B2]
  s = s.replace(/[:\-–—|]\s*$/, "");
  // everything after the first prescription marker is numbers we drop
  s = s.replace(
    /\s*(?:[:\-–—|,(@]|\b)\s*\d+(?:\.\d+)?\s*(?:[x×*]|sets?\b|reps?\b|kg\b|lbs?\b|rpe\b|mins?\b|secs?\b|s\b|m\b|%).*$/i,
    ""
  );
  s = s.replace(/\s*(?:[x×]\s*\d+|@\s*\S+|\brpe\s*\d+).*$/i, "");
  s = s.replace(/\([^)]*\)/g, ""); // (notes)
  s = s.replace(/\s*[:\-–—|,]\s*$/, "");
  s = s.replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
  return s;
}

function normalize(name: string): string {
  let s = name.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  // multi-word aliases first, then single tokens
  for (const [k, v] of Object.entries(ALIASES)) {
    if (k.includes(" ")) s = s.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  }
  return s
    .split(" ")
    .map((t) => ALIASES[t] ?? t)
    .join(" ")
    .split(" ")
    .filter((t) => t && t !== "the" && t !== "with")
    .join(" ");
}

const tokens = (s: string) => new Set(normalize(s).split(" ").filter(Boolean));

/** Best catalog entry for a written name, or null if nothing is close. */
export function matchExercise(name: string, catalog: Exercise[]): Exercise | null {
  const n = normalize(name);
  if (!n) return null;
  const exact = catalog.find((e) => normalize(e.name) === n);
  if (exact) return exact;

  const want = tokens(name);
  let best: Exercise | null = null;
  let bestScore = 0;
  for (const e of catalog) {
    const have = tokens(e.name);
    let inter = 0;
    want.forEach((t) => {
      if (have.has(t)) inter += 1;
    });
    if (!inter) continue;
    // every written word must appear in the catalog name (so "curl" alone
    // won't become "Seated Leg Curl"), unless the catalog name is a subset
    const writtenCovered = inter === want.size;
    const catalogCovered = inter === have.size;
    if (!writtenCovered && !catalogCovered) continue;
    const score = inter / (want.size + have.size - inter);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

/** Parse pasted text into an ordered, de-duplicated list of exercises. */
export function parsePastedWorkout(text: string, catalog: Exercise[]): PastedExercise[] {
  const out: PastedExercise[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n|;/)) {
    const name = cleanLine(raw);
    if (name.length < 3 || !/[a-z]/i.test(name) || SKIP.test(name)) continue;
    const match = matchExercise(name, catalog);
    const key = match ? match.id : normalize(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: match ? match.name : titleCase(name), match });
  }
  return out;
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** Rough muscle/equipment guess for exercises not in the catalog. */
export function guessMeta(name: string): { muscle: MuscleGroup; equipment: Equipment } {
  const n = normalize(name);
  const has = (re: RegExp) => re.test(n);
  const equipment: Equipment = has(/\b(?:dumbbell)\b/)
    ? "Dumbbell"
    : has(/\b(?:cable|pulldown|pushdown)\b/)
      ? "Cable"
      : has(/\b(?:machine|smith|press machine|pec deck|hack)\b/)
        ? "Machine"
        : has(/\b(?:barbell|ez bar)\b/)
          ? "Barbell"
          : has(/\b(?:push up|pull up|chin up|dip|plank|lunge)\b/)
            ? "Bodyweight"
            : "Machine";
  const muscle: MuscleGroup = has(/\b(?:curl|triceps?|biceps?|skull|hammer|pushdown|kickback)\b/)
    ? has(/\b(?:leg curl)\b/) ? "Legs" : "Arms"
    : has(/\b(?:squat|leg|lunge|calf|glute|hip thrust|deadlift|step up)\b/)
      ? "Legs"
        : has(/\b(?:shoulder|lateral|overhead|military|delt|arnold|upright|front raise|reverse pec|reverse fly|face pull|neutral press)\b/)
          ? "Shoulders"
          : has(/\b(?:bench|chest|fly|pec|push up|dip)\b/)
            ? "Chest"
          : has(/\b(?:row|pull|lat|chin|shrug)\b/)
            ? "Back"
            : has(/\b(?:abs?|crunch|plank|core|oblique|sit up|russian)\b/)
              ? "Core"
              : "Chest";
  return { muscle, equipment };
}
