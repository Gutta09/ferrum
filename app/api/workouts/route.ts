import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";
import {
  listWorkouts,
  renameWorkout,
  saveWorkout,
  validateWorkout,
} from "@/lib/server/workouts";

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json({ workouts: await listWorkouts(userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const input = validateWorkout(body);
    const saved = await saveWorkout(userId, input);
    return NextResponse.json({ id: saved.id });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const { id, name } = await req.json();
    await renameWorkout(userId, String(id), String(name));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
