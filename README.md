# Ferrum

**The Linear of workout tracking.** A calm, premium workout logger for serious
lifters — dark by default, keyboard-first, and built to the visual bar of Linear,
Vercel, and Apple Fitness. Every set, PR, coin, and photo belongs to one
authenticated user and persists in a real database.

> Design principle: the data is the only thing allowed to be loud. No gradients,
> no gamification, no confetti. Gold means a personal record; emerald means done.

---

## Highlights

- **Keyboard-first logging** — the hero screen. Last session's numbers ghost into
  every row; `Enter` accepts them, so a straight-sets exercise logs in one keypress
  per set. Quick-log a line (`bench 3×8 @ 80`) or scan a whiteboard photo.
- **Persistent, owner-scoped data** — PostgreSQL via Prisma. A logged workout
  survives refresh, sign-out, and a new device. Every query is scoped to the
  signed-in user; every mutation re-checks ownership on the server.
- **Real accounts** — email + password (bcrypt-hashed), Google OAuth, or a
  one-click demo. A fresh account starts with an empty log.
- **Analytics that explain themselves** — each chart carries a plain-language
  takeaway, computed deterministically and optionally rephrased by Gemini
  (grounded strictly in your real numbers, with a deterministic fallback).
- **Light + dark** — a full token-mirror theme, honoring `prefers-color-scheme`.
- **The quiet extras** — plate calculator, auto-progression suggestions, routine
  templates, a daily coin, progress-photo compare, a variation-driven consistency
  heatmap, a configurable rest timer, favourites, and a multi-source now-playing
  pill (Spotify / Apple Music / YouTube — embed-only, ToS-compliant).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind with a custom CSS-variable token layer (light/dark) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth (Credentials + Google), bcrypt password hashing |
| Motion | Framer Motion |
| Charts | Recharts, restyled to a hairline financial-dashboard look |
| AI (optional) | Gemini free tier behind a provider interface, with deterministic fallbacks |

`DESIGN.md` documents the token system, the signature interactions, the data
model, the privacy model, and every design decision.

## Getting started

```bash
npm install
# create .env with the values below
npx prisma migrate deploy       # create the tables
npx tsx prisma/seed.ts          # optional: populate the demo account
npm run dev                     # http://localhost:3000
```

### Environment

```bash
DATABASE_URL="postgresql://USER@HOST:5432/ferrum?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -hex 32"
# optional
AI_PROVIDER="gemini"
GEMINI_API_KEY=""               # free key from aistudio.google.com
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Everything except `DATABASE_URL` and `NEXTAUTH_*` is optional — the app degrades
gracefully (deterministic AI fallbacks, hidden Google button) when a key is absent.

## Deploy (Vercel + managed Postgres)

1. **Provision Postgres** — create a free database on [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) and copy its connection string.
2. **Set env vars in Vercel** → Project → Settings → Environment Variables
   (Production): `DATABASE_URL` (the Neon/Supabase string), `NEXTAUTH_URL`
   (your production domain), `NEXTAUTH_SECRET` (a fresh `openssl rand -hex 32`),
   and optionally `GEMINI_API_KEY` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
3. **Run migrations against production**: `DATABASE_URL="<prod url>" npx prisma migrate deploy`
   (or append it to the Vercel build command).
4. For Google sign-in, add `https://<domain>/api/auth/callback/google` as an
   authorized redirect URI in Google Cloud Console.

> ⚠️ The app will not boot on Vercel until `DATABASE_URL` and `NEXTAUTH_*` are set.
> Provision Postgres and set those **before** promoting the deploy.

## Project layout

```
app/            routes (pages + /api handlers)
components/     UI primitives, charts, feature components
lib/            repositories, types, utils, AI provider
lib/server/     server-only data access + ownership enforcement
prisma/         schema, migrations, seed
DESIGN.md       the design system and every decision behind it
```
