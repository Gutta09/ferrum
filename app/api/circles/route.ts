import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/owner";
import { createCircle, listCircles } from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

const noDb = () =>
  NextResponse.json({ error: "Circles need a database. Sign in with a real account." }, { status: 503 });

// every guest shares one id, so circles must be account-only — otherwise guests
// would collide and see each other's groups
const GUEST_MSG = "Create a free account to use Circles.";

export async function GET() {
  if (!DB_ENABLED) return NextResponse.json({ circles: [] });
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return NextResponse.json({ circles: [] });
    return NextResponse.json({ circles: await listCircles(userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!DB_ENABLED) return noDb();
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return NextResponse.json({ error: GUEST_MSG }, { status: 403 });
    const { name } = await req.json();
    const circle = await createCircle(userId, String(name ?? ""));
    return NextResponse.json({ id: circle!.id, inviteCode: circle!.inviteCode });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
