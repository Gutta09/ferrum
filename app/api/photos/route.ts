import { NextResponse } from "next/server";
import { DB_ENABLED } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/owner";
import { addPhoto, listPhotos, removePhoto } from "@/lib/server/photos";
import { requireUserId, UnauthorizedError } from "@/lib/server/session";

export async function GET() {
  if (!DB_ENABLED) return NextResponse.json({ photos: [] });
  try {
    const userId = await requireUserId();
    // demo is a read-only showcase — it uses client seed placeholders
    if (userId === DEMO_USER_ID) return NextResponse.json({ photos: [] });
    return NextResponse.json({ photos: await listPhotos(userId) });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!DB_ENABLED) return NextResponse.json({ error: "no database" }, { status: 503 });
  try {
    const userId = await requireUserId();
    if (userId === DEMO_USER_ID)
      return NextResponse.json({ error: "demo is read-only" }, { status: 403 });
    const body = await req.json();
    const photo = await addPhoto(userId, body);
    return NextResponse.json({ photo });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!DB_ENABLED) return NextResponse.json({ ok: true });
  try {
    const userId = await requireUserId();
    const { id } = await req.json();
    await removePhoto(userId, String(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
