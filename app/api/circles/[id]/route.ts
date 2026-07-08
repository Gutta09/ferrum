import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import {
  getCircleView,
  leaveCircle,
  updateShareSettings,
} from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

const noDb = () =>
  NextResponse.json({ error: "Circles need a database." }, { status: 503 });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!DB_ENABLED) return noDb();
  try {
    const userId = await requireUserId();
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
    await leaveCircle(userId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
