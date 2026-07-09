// Groq implementation of AIProvider — OpenAI-compatible chat completions, very
// fast, and its free key works without the GCP project-quota setup Gemini needs.
// Same grounding discipline: strict JSON extraction, tiny responses.

import type { AIProvider, ParseResult, SessionFacts, WeekFacts } from "./provider";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
// Groq's vision-capable model — reads a whiteboard / written log photo
const VISION_MODEL = process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

interface Msg {
  role: "system" | "user";
  content: string;
}

export class GroqProvider implements AIProvider {
  constructor(private key: string) {}

  private async chat(messages: Msg[], temperature: number, json = false): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: 512,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`groq ${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("groq empty response");
    return text.replace(/```json|```/g, "").trim();
  }

  private validateParse(raw: string): ParseResult {
    const parsed = JSON.parse(raw) as ParseResult & { sets?: unknown };
    const sets = (Array.isArray(parsed.sets) ? parsed.sets : [])
      .slice(0, 12)
      .map((s: { weight?: number; reps?: number; rpe?: number }) => ({
        weight:
          typeof s.weight === "number" && s.weight > 0 && s.weight < 600 ? s.weight : undefined,
        reps: typeof s.reps === "number" && s.reps > 0 && s.reps <= 50 ? Math.round(s.reps) : undefined,
        rpe: typeof s.rpe === "number" && s.rpe >= 1 && s.rpe <= 10 ? s.rpe : undefined,
      }));
    return {
      exercise: typeof parsed.exercise === "string" ? parsed.exercise : undefined,
      sets,
      needsClarification:
        Boolean(parsed.needsClarification) || sets.some((s) => !s.weight || !s.reps),
    };
  }

  async parseSets(input: string, exerciseNames: string[]): Promise<ParseResult> {
    const raw = await this.chat(
      [
        {
          role: "system",
          content: `You are a strict structured-data extractor for a workout logger. Extract ONLY numbers the user actually stated — never invent. Weights are kg unless lb stated (1 lb = 0.4536 kg). Handle x/×/by, RPE mentions. Ambiguous/missing → leave the field out and set needsClarification true. Known exercises: ${exerciseNames.join(", ")}. Respond with JSON ONLY: {"exercise": string|null, "sets": [{"weight": number, "reps": number, "rpe": number|null}], "needsClarification": boolean}`,
        },
        { role: "user", content: input },
      ],
      0,
      true
    );
    return this.validateParse(raw);
  }

  async parseWorkoutImage(
    imageBase64: string,
    mime: string,
    exerciseNames: string[]
  ): Promise<ParseResult> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Read the sets written in this photo of a workout log or whiteboard. Extract ONLY what is legible — never guess. Weights are kg unless lb is written. Known exercises: ${exerciseNames.join(", ")}. Respond with JSON ONLY: {"exercise": string|null, "sets": [{"weight": number, "reps": number, "rpe": number|null}], "needsClarification": boolean}. Set needsClarification true if anything is unclear.`,
              },
              { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20000), // vision is slower than text
    });
    if (!res.ok) throw new Error(`groq vision ${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("groq vision empty");
    return this.validateParse(text.replace(/```json|```/g, "").trim());
  }

  async summarizeSession(f: SessionFacts): Promise<string> {
    const line = await this.chat(
      [
        {
          role: "system",
          content:
            "Write ONE dry, factual sentence summarizing a workout. State only what the data shows; if flat, say so. No motivation, no emojis, no exclamation marks.",
        },
        {
          role: "user",
          content: `session "${f.name}", ${f.setsDone} sets, ${f.volume} kg volume, ${f.prCount} PRs, ${Math.round(f.seconds / 60)} min${f.lastVolume ? `, previous ${f.name} volume ${f.lastVolume} kg` : ""}.`,
        },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 160);
  }

  async weeklyRecap(f: WeekFacts): Promise<string> {
    const line = await this.chat(
      [
        {
          role: "system",
          content:
            "Write ONE dry, factual sentence comparing this training week to last. Only the numbers given — no advice, no motivation, no emojis.",
        },
        {
          role: "user",
          content: `last week ${f.volume} kg over ${f.sessions} sessions; week before ${f.prevVolume} kg over ${f.prevSessions} sessions${f.topLift ? `; most-trained ${f.topLift}` : ""}.`,
        },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 180);
  }

  async searchExercises(query: string, names: string[]): Promise<string[]> {
    const raw = await this.chat(
      [
        {
          role: "system",
          content: `Rank exercise names by relevance to the query. Respond JSON ONLY: {"names": string[]} best first, max 8, only names from the provided list.`,
        },
        { role: "user", content: `Query: "${query}". Names: ${JSON.stringify(names)}` },
      ],
      0,
      true
    );
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed.names;
    return Array.isArray(arr) ? arr.filter((n: string) => names.includes(n)) : [];
  }

  async enrichCustomExercise(name: string) {
    const raw = await this.chat(
      [
        {
          role: "system",
          content:
            'Respond JSON ONLY: {"muscle": one of Chest|Back|Legs|Shoulders|Arms|Core, "equipment": one of Barbell|Dumbbell|Machine|Cable|Bodyweight, "cues": [2-3 short form cues]}',
        },
        { role: "user", content: `Exercise: "${name}"` },
      ],
      0,
      true
    );
    return JSON.parse(raw);
  }

  async narratePR(lift: string, weight: number, reps: number, priorBest: number) {
    const line = await this.chat(
      [
        {
          role: "system",
          content: 'One dry line for a PR notice, ending with "Filed." Only the real numbers, no hype.',
        },
        {
          role: "user",
          content: `lift ${lift}, new best ${weight} kg × ${reps}, prior best e1RM ${priorBest} kg.`,
        },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 120);
  }

  async analyzeTrends(facts: string[]): Promise<string[]> {
    const raw = await this.chat(
      [
        {
          role: "system",
          content:
            'You are a knowledgeable training partner. Rewrite these facts as 3-5 short, dry, plain-English observations. Use ONLY the numbers present — never invent, predict, or advise. No motivation, no emojis. Respond JSON ONLY: {"lines": string[]}',
        },
        { role: "user", content: facts.map((f) => `- ${f}`).join("\n") },
      ],
      0.3,
      true
    );
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed.lines;
    return Array.isArray(arr) ? arr.slice(0, 5).map(String) : [];
  }

  async summarizeCircle(facts: string[]): Promise<string> {
    const line = await this.chat(
      [
        {
          role: "system",
          content:
            "Write ONE dry, factual sentence summarizing a training group's week. Only these facts — no ranking, no motivation, no emojis.",
        },
        { role: "user", content: facts.map((f) => `- ${f}`).join("\n") },
      ],
      0.3
    );
    return line.split("\n")[0].slice(0, 200);
  }
}
