# Ferrum

A dark, quiet workout logger built for people who actually track their lifts — the kind of app that gets out of your way. You log a set in about a second, and the numbers that matter are always right in front of you.

I built Ferrum to feel like the good software I admire (Linear, Vercel, Apple Fitness): calm, fast, and honest. No gamification noise, no clutter — just your training, rendered clearly.

## What it does

- **One-second logging.** Every set row already shows what you did last time, so repeating a set is a single keypress. Type a set in plain words too — *"bench 3×8 at 80"* — and it fills itself in.
- **Snap a photo of your log.** Scribbled it on a whiteboard or a notebook? Take a picture and the app reads your sets straight into the screen (you confirm before it saves — it never guesses a number into your history).
- **Nothing gets lost.** An in-progress session is saved as you go, so leaving the screen — or locking your phone — and coming back picks up exactly where you were.
- **Analytics that mean something.** Volume, sets, muscle balance, personal records, and a consistency heatmap — all derived from your real logged data. Want a plain-English read of how your training is going? Tap **Generate insights** and the AI summarizes *your* numbers (and only your numbers — it won't invent anything).
- **Training Circles.** Private, invite-only accountability pods. Share your consistency by default; weights and PRs stay opt-in. Every member gets a short 5-character invite code.
- **The extras that make it yours.** Progress photos, a daily photo streak, favourite exercises, saved routine templates, and your gym playlists (Spotify / Apple Music / YouTube) — all synced to your account across devices.

## How it's built

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**, with a custom dark/light design-token system.
- **MongoDB Atlas** for storage, via the native driver — every piece of data is scoped to its owner and never visible to anyone else.
- **NextAuth** for real email/password accounts (plus a one-click demo to explore).
- **AI runs on Groq** (Llama models) entirely server-side — natural-language set parsing, photo reading, and analytics insights — with deterministic fallbacks so nothing breaks if the AI is ever unavailable.

## Running it locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`. It runs in a demo mode out of the box; to enable real accounts and AI, add a `.env.local` with `DATABASE_URL` (MongoDB) and `GROQ_API_KEY`.

---

Built by Bhargav. Live at **[workout-tracker-iota-weld.vercel.app](https://workout-tracker-iota-weld.vercel.app)**.
