import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/owner";
import {
  getCircleView,
  leaveCircle,
  updateShareSettings,
} from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

const noDb = () =>
  NextResponse.json({ error: "Circles need a database." }, { status: 503 });

const guest = () =>
  NextResponse.json({ error: "Create a free account to use Circles." }, { status: 403 });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!DB_ENABLED) return noDb();
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return guest();
    return NextResponse.json({ circle: await getCircleView(params.id, userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!DB_ENABLED) return noDb();
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return guest();
    const patch = await req.json();
    await updateShareSettings(userId, params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!DB_ENABLED) return noDb();
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return guest();
    await leaveCircle(userId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
