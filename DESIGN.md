# Ferrum — Design System

A workout logger for serious lifters, built to the bar of Linear, Vercel, and Apple Fitness.
Dark, quiet, numeric. The data is the only thing allowed to be loud.

## Signature element — the Ghost Set

**Every set row carries last session's numbers inside it.** The previous workout's
`80 × 8 @ 8` renders as the row's placeholder values and as an always-visible
"previous" column. Pressing `Enter` on an untouched row **accepts the ghost** —
logging a repeat set is literally one keystroke, and beating last week is visible
before you type. Completing a set pre-fills the next one, so a straight-sets
exercise logs at one keypress per set. This is the whole product thesis in one
interaction: *the app already knows what you did; you only tell it what changed.*

Set completion is the supporting micro-moment: a 200ms spring scale on the check,
the row washing emerald, volume ticking up in the sticky header. Quiet, earned.

## Tokens

| Token | Value |
|---|---|
| Background | `#0B0B0C` |
| Surface | `#111214` |
| Card | `#17181B` |
| Border | `rgba(255,255,255,0.06)` — hover `0.10` |
| Text primary / secondary / tertiary | `#FFFFFF` / `#A1A1AA` / `#6B6B72` |
| Accent | `#FFFFFF` — one primary action per view, max |
| Success | `#34D399` — completion only |
| PR / Gold | `#E6B450` — personal records only |
| Danger | `#F87171` |
| Shadow (ambient, only) | `0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.24)` |

Depth comes from layered surfaces (`bg → surface → card`) and the one ambient
shadow. No gradients, no glow. Glass (`backdrop-blur`) appears in exactly three
places: command palette, rest-timer pill, sticky logging header.

## Scales

- **Spacing** — 4-based: `4 8 12 16 20 24 32 40 48 64 80 96`. Whitespace is default.
- **Radius** — cards `18px`, inputs/buttons `12px`, pills `999px`.
- **Type** — Geist Sans UI + Geist Mono numerals:
  - Display `48/56 · 600 · -0.03em` — page heroes, big stats
  - H1 `32/40 · 600 · -0.02em` · H2 `22/28 · 600 · -0.01em`
  - Label `13/16 · 500 · +0.02em · uppercase · secondary`
  - Body `15/24 · 400`
  - **Numeric** — mono + `tabular-nums` for every weight/rep/volume/1RM. Aligned
    columns, financial-dashboard confidence.
- **Motion** — 120–240ms, ease `[0.22, 0.61, 0.36, 1]`. One spring (set-complete).
  `prefers-reduced-motion` honored globally via `MotionConfig reducedMotion="user"`.

## Charts

Single-series everywhere by design — the e1RM chart uses a lift selector instead
of four tangled lines, so no legend is ever needed. Specs: 2px lines, area fills
at ~6–10% opacity, bars ≤24px with 4px rounded data-ends (square at baseline),
hairline solid gridlines one step off surface, axis text in tertiary, crosshair
tooltips on lines / per-mark tooltips on bars and heatmap cells, values in mono.
Data marks are monochrome white; emerald appears only as the heatmap's intensity
ramp (`#0F2E23 → #34D399`, lightness-monotonic) and positive deltas; gold marks
PR points only.

## Micro-interactions

1. **Set complete** — spring check (scale 1 → 1.15 → 1), emerald row wash, header
   volume pulse, rest timer slides up.
2. **Ghost accept** — `Enter` on an untouched row fills from placeholders, next
   row inherits the values.
3. **Rest timer** — glass pill, thin progress line draining, `Space` to skip.
4. **Command palette** — `⌘K`, 160ms scale/fade, arrow-key navigation.
5. **Segmented tabs** — active pill slides with a shared-layout animation.
6. **Toasts** — slide from bottom-right, auto-dismiss; PR toasts wear gold.
7. **Skeletons** — shimmer, never spinners.
8. **Nav rail** — collapsed icon rail expands to labels, 200ms.

## UX over typical trackers

- Previous performance is **in the row**, not two taps away.
- Logging is keyboard-first: `Tab/Enter` through weight → reps → RPE → done;
  `A` add set, `N` add exercise, `⌘K` everything else. Instrumented: time from
  first keystroke to completion is logged (`[perf] set logged`) and surfaced in
  the session header — target <2s, ghost-accept lands ~200ms.
- Rest timer starts itself; nobody taps a stopwatch mid-set.
- PR detection is automatic (Epley e1RM vs. history) and celebrated in gold, once.
- Volume, streak, and e1RM trends are computed from the log — no manual entry.

## Accessibility

- Focus: 2px `white/20` outline, offset, on every interactive element.
- Full keyboard operation of the logging flow; shortcuts never trap typing
  (guarded by target checks); `Esc` always closes.
- Contrast: `#A1A1AA` on `#0B0B0C` ≈ 8.7:1, `#6B6B72` reserved for non-essential
  metadata; heatmap low-intensity cells get tooltip + table relief.
- Semantic HTML (`nav`, `main`, `table`, buttons over divs), ARIA labels on
  icon-only controls, `role="dialog"` + focus management on overlays.
- `prefers-reduced-motion` collapses all motion to opacity.

## Self-critique pass — what was removed/changed

- **Dashboard** — removed the in-card "Analytics →" link (the nav rail already
  goes there); the volume stat now compares *this week to the same point last
  week* instead of a raw week-over-week that read −100% on a Monday.
- **Workout** — removed the repeated `A` kbd badge from every card's "+ Add set"
  footer (the shortcut lives in the palette and the page-level hint).
- **Exercises** — removed the misleading ⌘K chip from the search field and the
  results-count footer line.
- **Analytics** — charts plot **complete weeks only** (a mid-flight week reads
  as a crash); PR table restricted to barbell lifts; e1RM caption cut to four words.
- **History** — best set per *distinct* exercise (was: three sets of the same
  lift); dropped the clock/weight icons — mono numbers with units say it.
- **Profile** — removed the fake social handle; favorites tie-break by volume.
- **Seed** — added honest bad days (weight/rep jitter, skipped accessories) so
  PRs land every couple of weeks and gold stays precious.

## The floating overlay system

Three things float above the log: the **rest timer** (bottom-center), the
**now-playing pill** (bottom-right), and toasts (top of the stack). They share
one language — glass (`bg-card/70 backdrop-blur-xl`), hairline border, full
radius, the same spring-in from below — so they read as one instrument panel,
not three features. Z-order is fixed: content `z-0` → sticky header / mobile
action bar `z-30` → timer + pill + nav `z-40` → modals `z-50` → toasts `z-60`.
The **coin** is deliberately *not* an overlay: it exists only on the finish
screen, so completing the session stays the reward moment.

## The coin economy (why one-per-day beats XP)

One coin, earned only by finishing a workout. The count *is* the lifetime
workout count — no separate currency, no levels, no store. Scarcity is the
mechanic: an XP system inflates until numbers mean nothing; a coin that can
only be earned by showing up is a ledger of days you showed up. Gold is
already the PR color, so the coin borrows weight from real achievement.
The warmth lives in dry copy ("The gains tax is collected."), never in
animation volume. Milestones (50/100/365) are one line of text.

## Progress photos — the compare interaction

Monochrome-first grid (color returns on hover), date labels in mono. The core
move is **compare**: pick two dates, they render split-screen with
`tabular-nums` date chips — a financial statement for your body. No filters,
no stickers. Viewer: arrow keys / swipe; photos attach from the Physique grid
or from any workout in History (they land on that workout's date).

## Gym-phone logging (first-class, not polish)

- Works at 320px: the Prev column folds into the ghost placeholders (the
  values are already in the inputs), inputs grow, the ✓ becomes a 44–48px
  thumb target.
- **Thumb zone**: a fixed bottom action bar carries live volume, + Set, and
  Finish; the header collapses on scroll to give the set list the screen.
- Steppers: `inputMode="decimal"` keyboards, tap-and-hold to repeat (420ms
  delay, then 110ms), 32px+ touch targets that appear on focus.
- Short-landscape phones get a two-column exercise grid.
- Playlist is an embed (Spotify/Apple), not a hand-rolled player — 90% of the
  vibe, none of the licensing mess. `M` toggles it; it never autoplays.

## Intelligence — assists, never interruptions

**Auto-progression rule (exact thresholds).** Computed from the last session's
top set: RPE ≤ 7 with target reps hit → **+2.5%, minimum one 2.5 kg step**;
RPE ≥ 9 → **hold** last weight and reps; RPE between 7 and 9 (or unlogged) →
**repeat** the top set. The suggestion becomes the top-set ghost value; every
other set ghosts from last session as before. Reasoning is a hover/long-press
title — `Last: 80×8 @RPE7 → +2.5 kg` — never a tooltip that pops itself.

**Why ghost values, not notifications.** A notification demands a decision
*now* and costs a dismissal even when it's right. A ghost value costs nothing:
it's already where the answer goes, `Enter` accepts it, typing over it is the
dismissal. The assist and the input are the same pixel — zero added taps when
right, zero taps when wrong. Nothing mid-set is ever a modal.

**Plate calculator.** Focus any barbell weight field and the per-side
breakdown appears beneath it, live as you type — `20 ×2 · 5 · per side ·
bar 20`. Monochrome mono pills, no confirm, gone on blur. Bar weight and
kg/lb live in Settings. Non-barbell lifts never show it.

**Template-driven start.** "Start workout" runs today's program; a quiet
"From template" menu underneath starts any saved routine or a blank session
(`/workout?template=…` / `?blank=1`). Any finished session saves as a template
from the finish screen. Templates (seeded from the four program days) live in
Profile → Templates: rename inline, duplicate, delete, start.

**The finish beat.** One orchestrated sequence, not three animations: the
**coin** flips in and settles (~0.15s) → each **PR files in** as a gold line
with the coin's spring (`New PR · Bench Press · 82.5 kg × 5 · Filed.`,
staggered 120ms) → the **summary card** fades up last, buttons after. Every
delay is derived from the PR count so the beat never overlaps itself.

Cut from this block (cleanly, per spec): warmup-ramp generator, 1RM formula
toggle, deload signal, body measurements — each is additive later without
touching what shipped; export/import shipped because data portability is
trust, not a feature.

## Auth & ownership — two tiers

**Tier 1 (shipped).** NextAuth with a real `session.user.id`: Google OAuth
(activates when `GOOGLE_CLIENT_ID/SECRET` are set) and a one-click demo
credentials provider so the mock tier runs with zero setup. **Public routes:**
`/` (signed-out landing) and `/signin`. **Protected (middleware-redirected):**
`/workout`, `/history`, `/profile`, `/analytics`, `/exercises`. Every record —
workout, photo, template — carries a `userId`; every query filters on the
active user (`lib/owner.ts`); every mutation passes the single
`assertOwner(resource)` helper. Exports carry only your log; imports become
yours. Coins/PRs/stats are derived from your workouts only. A fresh Google
account sees an empty log — seeds belong to the demo user.

**Tier 2 (the real enforcement, ready to drop in).** The `activeUserId()`
module variable is replaced by the server session inside server actions; the
same repo interfaces move behind API routes that re-check ownership
server-side, the datastore gets `userId` foreign keys (the model already has
them), inputs are validated and rate-limited server-side, and photos move to
signed owner-only URLs. Because reads/writes already flow through owner-scoped
repos and `assertOwner`, this is a swap, not a refactor.

## AI layer — grounded, invisible, optional

Nothing calls an SDK directly: `lib/ai/provider.ts` defines `AIProvider`,
selected by `AI_PROVIDER` env (Gemini free tier default, key server-side only,
every call behind `/api/ai` which requires a session). **Grounding:** the
model reformats real numbers, never invents them — parses are validated
(bounds-checked, `needsClarification` instead of guesses) before touching
state. **Every feature has a deterministic floor** (`lib/ai/fallback.ts`):
quick-log falls back to a regex parser, session summary and weekly recap to
templates, sanity check *is* a pure numeric rule (AI may only rephrase it).
Wired in: quick-log line on the logging screen, finish-screen summary,
dashboard weekly recap, fat-finger advisory under a completed set (dismissible,
never blocking). No badges, no chatbot — the assist and the input are the same pixel.

**Extended set (all wired).** The two highest-value additions serve the app's
two core promises: **photo → sets** makes logging faster (scan a whiteboard or
written log — one vision call per explicit tap, never automatic; unreadable
fields come back empty for the lifter to fill, and total failure means "enter
it manually", never fake OCR), and the **sanity check** keeps the log
trustworthy (a pure numeric rule against the lift's own history; AI may only
rephrase it). **PR narration** replaces the templated gold line only when the
returned sentence contains the real number — grounded or silent. **Custom
exercise enrichment** obeys confirm-before-commit: AI pre-fills muscle,
equipment, and cues as *editable* values in the create panel; nothing enters
the library until the user taps Add — the user is always the source of truth.
**Semantic search** fires only when keyword search finds nothing, and returns
only names that exist in the library.

## Fix & boost pass

**Light mode** is a token mirror, not a second design: `:root[data-theme="light"]`
overrides every CSS var (bg `#FAFAFA`, white surfaces with stronger borders,
near-black ink, emerald/gold darkened to `#059669`/`#B45309` for contrast). A new
`--ink` RGB channel replaces every hard-coded white-alpha utility
(`bg-ink/[0.06]` etc.), and all chart colors read vars — nothing draws a
hard-coded hex anymore. Toggle lives in the nav rail, persists to
`localStorage`, and a pre-hydration script honors `prefers-color-scheme` on
first load with no flash.

**Manual session timer.** The stopwatch never runs on its own: idle until the
lifter taps ▶ in the header, pause/resume anytime; Finish freezes it. It is
separate from the rest timer.

**Custom rest timer.** Global default in Settings (60/90/120/180 presets +
custom, 15s steps). Mid-rest: pause/resume, +30s, Skip/Space.

**No predefined workouts.** Sessions start empty — the library is a catalog,
not a plan. Seeded routine templates are gone; templates exist only when a
user saves one. The demo account's *history* remains (it is that account's own
log); any fresh account starts at zero workouts, zero templates.

**Daily photo streak.** One photo per calendar day keeps the streak alive;
the day flips at local midnight and a fully missed day resets the count (no
grace period — the prompt "Add today's photo" is the grace). Gold, like the
coin: earned daily, never inflated. Shares the owner-scoped photo store with
Physique; different framing (daily cadence vs milestone compares).

**Multiple playlists.** Saved per user (name auto-resolved via oEmbed), managed
in Settings; the active one drives the now-playing pill.

## Analytics — chart + takeaway pattern

Every chart carries one dry sentence stating what it shows ("Squat e1RM up
7.5 kg across 8 sessions"), computed **deterministically** from the same data
the chart plots (`lib/insights.ts`) — they work offline and on free-tier
zero-key installs. The **Insights panel** at the top is the executive summary:
the deterministic takeaways are the input, `analyzeTrends` (Gemini) only
*rephrases* them into a Fitbit-style read, and a grounding filter drops any
returned line containing a number that doesn't appear in the input facts.
Mismatch or no key → the panel shows the takeaways themselves. Page order:
insights → headline stats → charts with takeaways.

## Favourites, variation heatmap, date deep-linking

**Favourites** are owner-scoped (`lib/favourites.ts`, `localStorage` per user)
and toggle from one `FavouriteStar` that reads the store, so a tap on an
exercise card, a logging-screen row, the add-exercise picker, or the Profile
list syncs everywhere at once. They surface where they save time: a
"Favourites" filter + favourites-first ordering in the library, favourites
floated to the top of the add-exercise picker, and a real Profile "Favourites"
section (the old session-count list stays as "Most trained"). A fresh account
has none.

**Variation-driven heatmap.** Cell intensity now reflects the *number of
distinct exercises* logged that day (0 / ≤2 / ≤4 / ≤6 / 7+ → the 5-step
emerald ramp), not total volume. Tradeoff, stated plainly: variation-count
rewards spread over depth — a 3-hour session on one lift reads cooler than a
quick full-body day. To keep depth honest the **tooltip carries both**: workout
name, variation count, *and* total working sets. Switching the metric back to
sets is a one-line change in `statsRepo.heatmap` (level reads `sets` instead of
`variations`) since both already travel on every cell.

**Date deep-linking.** History reads `?d=YYYY-MM-DD`: it keeps the full
timeline, scrolls the matching card into view, ring-highlights it, and shows a
clearable "Jumped to {date}" banner — or, for a date with no workout, an "Add
workout" prompt. Every date affordance routes here: dashboard calendar days,
and heatmap cells (a logged cell → `/history?d=…`, an empty past cell →
`/workout`). Cells and calendar days show a `line-hover` ring on hover so they
read as interactive.

## Backend, persistence & real auth

**Why Postgres + Prisma.** The mock layer lost data on reload because it lived in
a module array. Postgres (via Prisma) gives durable, relational, type-safe
storage that deploys cleanly on Vercel with a managed provider (Neon/Supabase
free tiers). The schema mirrors the app's types 1:1 — `User`, `Workout`,
`WorkoutExercise`, `SetEntry`, custom `Exercise`, plus `Circle`,
`CircleMembership`, `Challenge` — every user-owned row carrying `userId`.

**The mock→DB swap was a swap, not a rewrite** — because every read was already
scoped through `byUser()` and every write through `assertOwner`. Only the *source*
changed: `byUser()` now returns a client cache (`lib/workout-cache`) hydrated once
from the owner-scoped `GET /api/workouts`; all the derivation logic (volume, e1RM,
heatmap, streaks) is untouched and simply runs over DB data. The exercise
*catalog* stays static reference data; user-created exercises persist to the DB
and merge in.

**Credentials auth + hashing.** Email/password signup (`POST /api/signup`) stores
a **bcrypt** hash (cost 12) — never plaintext — and creates a fresh empty
owner-scoped log. Login verifies via NextAuth's Credentials provider against the
DB. Google OAuth and the one-click demo remain. Sessions are JWT; `session.user.id`
is the real database id. Auth endpoints are rate-limited.

**Tier-2 enforcement is now live.** `lib/server/session.ts` resolves the owner
from the server session (never the request body) and re-checks `assertOwner` on
the server against real rows; owner-scoped `WHERE userId` clauses mean a guessed
id can't touch another user's data. All inputs are validated and bounded
server-side (no negative weights, sane rep/RPE ranges, sanitized text) before
they reach the DB. **Verified:** a logged workout persists across refresh and
sign-out/sign-in; a fresh signup has an empty log; wrong passwords are rejected;
a second account sees none of the first's data.

**YouTube is embed-only, on purpose.** There is no official YouTube Music API,
and the YouTube Data API prohibits audio-only/background playback — building that
would risk the app. So the multi-playlist system accepts a YouTube *playlist*
link and renders the compliant embedded player (`/embed/videoseries?list=…`)
alongside Spotify/Apple, reusing the same paste-a-link, pick-active UX.

**Mobile.** `touch-action: manipulation` + `-webkit-tap-highlight-color:
transparent` on all interactive elements removes the 300ms tap delay and the
grey flash, so taps fire immediately and can't land on an element that shifted
under the finger; a proper `width=device-width` viewport with `viewport-fit:
cover` and theme-aware `themeColor`.

**Personal prefs (favourites, templates, playlists, photo metadata)** remain
client-persisted in `localStorage`, owner-keyed — they already survive reload
per device; migrating them to their (already-defined) DB tables is a
non-blocking follow-up. Progress photos stay client object-URLs until a blob
store is added.

## Final verified state (pre-launch owner audit)

**Database & persistence — VERIFIED LIVE.** MongoDB Atlas via the *native* driver
(`lib/mongo.ts`), not Prisma (Prisma's Rust engine fails Atlas's TLS handshake).
Workouts are embedded documents. A logged workout survives refresh and
sign-out/sign-in on the production site; fresh accounts are empty; account B
cannot see account A's data (owner-scoped queries + `requireUserId` on every
mutation). The demo account is a pure seed showcase with zero DB dependency.

**Auth — VERIFIED.** Email/password (bcrypt) signup+login and the one-click demo
work live; logout clears the session; a fresh signup starts empty. Google OAuth
is wired but dormant until `GOOGLE_CLIENT_ID/SECRET` are set (the button hides
itself when absent — correct graceful degradation).

**AI — wired end-to-end, activates on a key.** Every feature makes a *real*
server-side Gemini call when `GEMINI_API_KEY` is present and falls back to a
deterministic path when absent (proven via the `[ai] … → gemini (real call)` /
`fallback` server trace). Real-model features: quick-log parsing (`parseSets`),
photo scan (`parseWorkoutImage`), analytics Insights (`analyzeTrends`),
finish-screen summary (`summarizeSession`) + PR narration (`narratePR`),
dashboard weekly recap (`weeklyRecap`), circle digest (`summarizeCircle`),
custom-exercise enrichment (`enrichCustomExercise`), and semantic exercise
search (`searchExercises`). Grounding is enforced: `groundedOnly` /
number-in-facts checks drop any AI line whose numbers aren't in the source data.
Activation needs only the key — `getProvider` defaults the provider to gemini,
so no second flag; `/api/config` reports `aiEnabled` for verification.

**Owner's design decision — workout typing.** There is no separate
tag-taxonomy. The freeform workout *name* is the human tag ("Push Day"), and the
analytics muscle-balance is *derived* from the logged exercises' muscle groups —
which is more honest than a hand-set label that can disagree with what you
actually trained. This is deliberate, not a gap.

## Guardrails (enforced)

No emojis, no gradients, no glow, no gamification. White = one primary action per
view. Gold = PRs only. Emerald = success only. Numbers = mono `tabular-nums`,
always. When torn between two directions, the calmer one wins.
