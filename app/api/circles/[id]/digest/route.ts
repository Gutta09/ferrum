import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/owner";
import { circleDigestFacts } from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

// returns the deterministic facts; the client asks /api/ai to rephrase them and
// falls back to these if there's no key. Grounded-or-silent.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!DB_ENABLED) return NextResponse.json({ facts: [] });
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return NextResponse.json({ facts: [] });
    return NextResponse.json({ facts: await circleDigestFacts(params.id, userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 403 });
  }
}
