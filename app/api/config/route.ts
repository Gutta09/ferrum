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
    // only Gemini does image parsing; Groq's free tier is text-only, so the
    // photo-scan affordance is hidden unless a vision-capable key is present
    aiVision: Boolean(process.env.GEMINI_API_KEY),
  });
}
