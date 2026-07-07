import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { WORKOUTS } from "@/lib/seed";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";
import {
  listWorkouts,
  renameWorkout,
  saveWorkout,
  validateWorkout,
} from "@/lib/server/workouts";

export async function GET() {
  // demo mode (no database): serve the seed log so the site works live
  if (!DB_ENABLED) return NextResponse.json({ workouts: WORKOUTS });
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
  // demo mode: accept but don't persist (matches the pre-DB behavior)
  if (!DB_ENABLED) return NextResponse.json({ id: "demo", demo: true });
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
  if (!DB_ENABLED) return NextResponse.json({ ok: true, demo: true });
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
