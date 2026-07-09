import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/owner";
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
    if (userId === DEMO_USER_ID)
      return NextResponse.json({ error: "Create a free account to use Circles." }, { status: 403 });
    const { code } = await req.json();
    const id = await joinByCode(userId, String(code ?? ""));
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
