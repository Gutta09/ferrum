// No feature calls an AI SDK directly — everything goes through AIProvider.
// Provider selected by AI_PROVIDER env; key server-side only; every method has
// a deterministic fallback in ./fallback so AI is an enhancement, never a dependency.

export interface ParsedSet {
  weight?: number;
  reps?: number;
  rpe?: number;
}

export interface ParseResult {
  exercise?: string;
  sets: ParsedSet[];
  needsClarification: boolean;
}

export interface SessionFacts {
  name: string;
  volume: number;
  seconds: number;
  setsDone: number;
  prCount: number;
  lastVolume?: number;
}

export interface WeekFacts {
  volume: number;
  sessions: number;
  prevVolume: number;
  prevSessions: number;
  topLift?: string;
}

export interface AIProvider {
  parseSets(input: string, exerciseNames: string[]): Promise<ParseResult>;
  summarizeSession(facts: SessionFacts): Promise<string>;
  weeklyRecap(facts: WeekFacts): Promise<string>;
  // interface-ready (implemented in Gemini, not yet wired to UI):
  searchExercises(query: string, names: string[]): Promise<string[]>;
  parseWorkoutImage(imageBase64: string, mime: string, exerciseNames: string[]): Promise<ParseResult>;
  enrichCustomExercise(name: string): Promise<{ muscle: string; equipment: string; cues: string[] }>;
  narratePR(lift: string, weight: number, reps: number, priorBest: number): Promise<string>;
  /** rephrases deterministic takeaways into a short Fitbit-style read;
   * never introduces numbers that aren't in the input */
  analyzeTrends(facts: string[]): Promise<string[]>;
  /** one dry factual line summarizing a training circle's week, grounded in
   * the provided facts only — no ranking or motivation language */
  summarizeCircle(facts: string[]): Promise<string>;
}

/** Server-side only. Returns null when no provider is configured — callers
 * must fall back deterministically. A GEMINI_API_KEY alone activates it (the
 * provider defaults to gemini); no second flag needed. */
export function aiConfigured(): boolean {
  return (
    Boolean(process.env.GEMINI_API_KEY) &&
    (process.env.AI_PROVIDER ?? "gemini") === "gemini"
  );
}

export async function getProvider(): Promise<AIProvider | null> {
  if (aiConfigured()) {
    const { GeminiProvider } = await import("./gemini");
    return new GeminiProvider(process.env.GEMINI_API_KEY!);
  }
  return null;
}
