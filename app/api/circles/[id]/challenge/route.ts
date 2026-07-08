import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { createChallenge } from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!DB_ENABLED)
    return NextResponse.json({ error: "Circles need a database." }, { status: 503 });
  try {
    const userId = await requireUserId();
    const { name, days, targetPerWeek } = await req.json();
    await createChallenge(
      userId,
      params.id,
      String(name ?? ""),
      Number(days ?? 30),
      Number(targetPerWeek ?? 4)
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
