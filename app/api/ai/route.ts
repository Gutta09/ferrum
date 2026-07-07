// All AI happens server-side — the key never reaches the client, and every
// call requires a session (writes stay owner-only end to end).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProvider } from "@/lib/ai/provider";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const provider = await getProvider();
  if (!provider) return NextResponse.json({ fallback: true });

  try {
    const { action, payload } = await req.json();
    switch (action) {
      case "parse-sets":
        return NextResponse.json({
          result: await provider.parseSets(
            String(payload.input).slice(0, 300),
            payload.exerciseNames ?? []
          ),
        });
      case "summarize":
        return NextResponse.json({
          result: await provider.summarizeSession(payload),
        });
      case "recap":
        return NextResponse.json({ result: await provider.weeklyRecap(payload) });
      case "parse-image": {
        const image = String(payload.image ?? "");
        if (!image || image.length > 6_000_000)
          return NextResponse.json({ fallback: true });
        return NextResponse.json({
          result: await provider.parseWorkoutImage(
            image,
            String(payload.mime ?? "image/jpeg"),
            payload.exerciseNames ?? []
          ),
        });
      }
      case "narrate-pr":
        return NextResponse.json({
          result: await provider.narratePR(
            String(payload.lift).slice(0, 60),
            Number(payload.weight),
            Number(payload.reps),
            Number(payload.priorBest)
          ),
        });
      case "enrich":
        return NextResponse.json({
          result: await provider.enrichCustomExercise(String(payload.name).slice(0, 60)),
        });
      case "search":
        return NextResponse.json({
          result: await provider.searchExercises(
            String(payload.query).slice(0, 100),
            payload.names ?? []
          ),
        });
      default:
        return NextResponse.json({ fallback: true });
    }
  } catch {
    // rate limit, timeout, malformed output — the client falls back silently
    return NextResponse.json({ fallback: true });
  }
}
