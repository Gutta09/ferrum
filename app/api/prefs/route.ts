import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/owner";
import { getPrefs, savePrefs } from "@/lib/server/prefs";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

const EMPTY = { favourites: [], templates: [], playlists: { list: [] } };

export async function GET() {
  if (!DB_ENABLED) return NextResponse.json({ prefs: EMPTY });
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return NextResponse.json({ prefs: EMPTY });
    return NextResponse.json({ prefs: await getPrefs(userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!DB_ENABLED) return NextResponse.json({ ok: true });
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID) return NextResponse.json({ ok: true }); // demo read-only
    await savePrefs(userId, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
