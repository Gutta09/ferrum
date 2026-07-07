import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";
import { listCustomExercises, saveCustomExercise } from "@/lib/server/workouts";

const MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight"];

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json({ exercises: await listCustomExercises(userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const b = await req.json();
    const id = String(b.id).slice(0, 80);
    const muscle = MUSCLES.includes(b.muscle) ? b.muscle : "Chest";
    const equipment = EQUIPMENT.includes(b.equipment) ? b.equipment : "Barbell";
    if (!id || !b.name) throw new Error("invalid exercise");
    await saveCustomExercise(userId, {
      id,
      name: String(b.name),
      muscle,
      equipment,
      difficulty: "Intermediate",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
