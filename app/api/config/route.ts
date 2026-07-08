import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";

// Lets the client know whether a database is connected, so the sign-in screen
// shows real email/password auth automatically the moment a DATABASE_URL exists
// — no separate flag to flip.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ dbEnabled: DB_ENABLED });
}
