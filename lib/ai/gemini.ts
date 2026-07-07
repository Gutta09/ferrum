// Gemini free-tier implementation. Strict extractor prompts, JSON-only
// output, temperature 0 for parsing. Grounding rule: the model reformats real
// numbers; anything it can't source comes back empty, never invented.

import type {
  AIProvider,
  ParseResult,
  SessionFacts,
  WeekFacts,
} from "./provider";

const MODEL = "gemini-2.0-flash";

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export class GeminiProvider implements AIProvider {
  constructor(private key: string) {}

  private async call(parts: Part[], temperature: number): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${this.key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("gemini empty response");
    return text.replace(/```json|```/g, "").trim();
  }

  private validateParse(raw: string): ParseResult {
    const parsed = JSON.parse(raw) as ParseResult;
    const sets = (Array.isArray(parsed.sets) ? parsed.sets : [])
      .slice(0, 12)
      .map((s) => ({
        weight:
          typeof s.weight === "number" && s.weight > 0 && s.weight < 600
            ? s.weight
            : undefined,
        reps:
          typeof s.reps === "number" && s.reps > 0 && s.reps <= 50
            ? Math.round(s.reps)
            : undefined,
        rpe:
          typeof s.rpe === "number" && s.rpe >= 1 && s.rpe <= 10 ? s.rpe : undefined,
      }));
    return {
      exercise: typeof parsed.exercise === "string" ? parsed.exercise : undefined,
      sets,
      needsClarification:
        Boolean(parsed.needsClarification) || sets.some((s) => !s.weight || !s.reps),
    };
  }

  private parsePrompt(exerciseNames: string[]) {
    return `You are a strict structured-data extractor for a workout logger. Extract ONLY numbers the user actually stated — never suggest, never invent. Weights are kg unless lb is stated (convert lb to kg, 1 lb = 0.4536 kg). Handle "x", "×", "by", RPE mentions. If anything is ambiguous or missing, leave the field out and set needsClarification true. Known exercises: ${exerciseNames.join(", ")}. Respond with JSON only, no prose: {"exercise": string|null, "sets": [{"weight": number, "reps": number, "rpe": number|null}], "needsClarification": boolean}`;
  }

  async parseSets(input: string, exerciseNames: string[]): Promise<ParseResult> {
    const raw = await this.call(
      [{ text: `${this.parsePrompt(exerciseNames)}\n\nUser input: "${input}"` }],
      0
    );
    return this.validateParse(raw);
  }

  async parseWorkoutImage(
    imageBase64: string,
    mime: string,
    exerciseNames: string[]
  ): Promise<ParseResult> {
    const raw = await this.call(
      [
        { text: `${this.parsePrompt(exerciseNames)}\n\nExtract the sets written in this image. Unreadable fields stay empty — do not guess.` },
        { inlineData: { mimeType: mime, data: imageBase64 } },
      ],
      0
    );
    return this.validateParse(raw);
  }

  async summarizeSession(f: SessionFacts): Promise<string> {
    const line = await this.call(
      [
        {
          text: `Write ONE dry, factual sentence summarizing a workout for a serious lifter. State only what the data shows; if flat, say so plainly. No motivational filler, no emojis, no exclamation marks. Data: session "${f.name}", ${f.setsDone} sets, ${f.volume} kg total volume, ${f.prCount} PRs, duration ${Math.round(f.seconds / 60)} min${f.lastVolume ? `, previous ${f.name} volume ${f.lastVolume} kg` : ""}.`,
        },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 160);
  }

  async weeklyRecap(f: WeekFacts): Promise<string> {
    const line = await this.call(
      [
        {
          text: `Write ONE dry, factual sentence comparing a lifter's training week to the prior week. Only the numbers given — no advice, no motivation, no emojis. Data: last week ${f.volume} kg over ${f.sessions} sessions; week before ${f.prevVolume} kg over ${f.prevSessions} sessions${f.topLift ? `; most-trained lift ${f.topLift}` : ""}.`,
        },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 180);
  }

  async searchExercises(query: string, names: string[]): Promise<string[]> {
    const raw = await this.call(
      [
        {
          text: `Rank these exercise names by semantic relevance to the query. JSON array of names only, best first, max 8. Query: "${query}". Names: ${JSON.stringify(names)}`,
        },
      ],
      0
    );
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((n) => names.includes(n)) : [];
  }

  async enrichCustomExercise(name: string) {
    const raw = await this.call(
      [
        {
          text: `For the exercise "${name}", respond JSON only: {"muscle": one of Chest|Back|Legs|Shoulders|Arms|Core, "equipment": one of Barbell|Dumbbell|Machine|Cable|Bodyweight, "cues": [2-3 short form cues]}`,
        },
      ],
      0
    );
    return JSON.parse(raw);
  }

  async narratePR(lift: string, weight: number, reps: number, priorBest: number) {
    const line = await this.call(
      [
        {
          text: `One dry line for a PR notice, ending with "Filed." — only these real numbers, no hype: lift ${lift}, new best ${weight} kg × ${reps}, prior best e1RM ${priorBest} kg.`,
        },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 120);
  }
}
