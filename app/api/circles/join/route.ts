import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { joinByCode } from "@/lib/server/circles";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!DB_ENABLED)
    return NextResponse.json(
      { error: "Circles need a database. Sign in with a real account." },
      { status: 503 }
    );
  try {
    const userId = await requireUserId();
    const { code } = await req.json();
    const id = await joinByCode(userId, String(code ?? ""));
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
