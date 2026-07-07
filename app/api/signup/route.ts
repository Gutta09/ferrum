import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { DB_ENABLED, prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// simple in-memory rate limit per IP (best-effort; a real deploy fronts this
// with the platform's edge rate limiter)
const hits = new Map<string, { n: number; ts: number }>();
function limited(ip: string) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > 60_000) {
    hits.set(ip, { n: 1, ts: now });
    return false;
  }
  rec.n += 1;
  return rec.n > 10;
}

export async function POST(req: Request) {
  if (!DB_ENABLED)
    return NextResponse.json(
      { error: "Sign-up needs the database. Use the demo account for now." },
      { status: 503 }
    );
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(ip))
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim().slice(0, 60) || email.split("@")[0];

  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "That email already has an account." }, { status: 409 });

  // never store plaintext — bcrypt with a per-password salt
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, name, passwordHash } });
  // a fresh account starts with an empty, owner-scoped log — no seed data
  return NextResponse.json({ ok: true });
}
