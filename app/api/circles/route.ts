import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { createCircle, listCircles } from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

const noDb = () =>
  NextResponse.json({ error: "Circles need a database. Sign in with a real account." }, { status: 503 });

export async function GET() {
  if (!DB_ENABLED) return NextResponse.json({ circles: [] });
  try {
    const userId = await requireUserId();
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
    const { name } = await req.json();
    const circle = await createCircle(userId, String(name ?? ""));
    return NextResponse.json({ id: circle!.id, inviteCode: circle!.inviteCode });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
