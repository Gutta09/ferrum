import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { aiConfigured } from "@/lib/ai/provider";

// Lets the client know whether a database and AI are connected. The sign-in
// screen shows real auth the moment a DATABASE_URL exists; AI activates the
// moment a GEMINI_API_KEY exists — no separate flags to flip.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    dbEnabled: DB_ENABLED,
    aiEnabled: aiConfigured(),
    // photo-scan needs a vision-capable model: Groq (Llama 4 Scout) or Gemini.
    // Hidden only when neither key is present.
    aiVision: Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY),
  });
}
