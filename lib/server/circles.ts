import "server-only";
import { collections, ensureIndexes, newId, type MembershipDoc } from "@/lib/mongo";
import { EXERCISES } from "@/lib/seed";
import { addDays, e1rm, startOfWeek, toKey } from "@/lib/utils";
import { listWorkouts } from "./workouts";

const MEMBER_CAP = 8;
const exerciseName = (id: string) => EXERCISES.find((e) => e.id === id)?.name ?? id;

// 5-character invite code that always contains at least one letter, one digit,
// and one special character (unambiguous letters/digits only; URL-safe specials)
function inviteCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const specials = "!*@$"; // special, but all safe inside a URL query value
  const all = letters + digits + specials;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(letters), pick(digits), pick(specials)];
  while (chars.length < 5) chars.push(pick(all));
  // Fisher–Yates shuffle so the guaranteed types aren't always in fixed slots
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function shareDefaults() {
  return { shareConsistency: true, shareActivity: true, shareWeights: false, sharePRs: false };
}

export async function createCircle(userId: string, name: string) {
  await ensureIndexes();
  const { circles, memberships } = await collections();
  const clean = name.trim().slice(0, 40) || "Training Circle";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = newId("c");
    try {
      await circles.insertOne({
        _id: id,
        name: clean,
        ownerId: userId,
        inviteCode: inviteCode(),
        memberCap: MEMBER_CAP,
        createdAt: new Date(),
      });
      await memberships.insertOne({
        _id: newId("m"),
        circleId: id,
        userId,
        role: "owner",
        joinedAt: new Date(),
        ...shareDefaults(),
      });
      const circle = await circles.findOne({ _id: id });
      return { id, inviteCode: circle!.inviteCode };
    } catch (e) {
      if (attempt === 4) throw e; // invite-code collision, retry
    }
  }
  throw new Error("could not create circle");
}

export async function joinByCode(userId: string, code: string) {
  const { circles, memberships } = await collections();
  const circle = await circles.findOne({ inviteCode: code.trim().toUpperCase() });
  if (!circle) throw new Error("That invite code doesn't match a circle.");
  const already = await memberships.findOne({ circleId: circle._id, userId });
  if (already) return circle._id;
  const count = await memberships.countDocuments({ circleId: circle._id });
  if (count >= circle.memberCap) throw new Error("This circle is full.");
  await memberships.insertOne({
    _id: newId("m"),
    circleId: circle._id,
    userId,
    role: "member",
    joinedAt: new Date(),
    ...shareDefaults(),
  });
  return circle._id;
}

export async function leaveCircle(userId: string, circleId: string) {
  const { circles, memberships, challenges } = await collections();
  const m = await memberships.findOne({ circleId, userId });
  if (!m) return;
  if (m.role === "owner") {
    // owner leaving dissolves the circle
    await memberships.deleteMany({ circleId });
    await challenges.deleteMany({ circleId });
    await circles.deleteOne({ _id: circleId });
  } else {
    await memberships.deleteOne({ _id: m._id });
  }
}

export async function listCircles(userId: string) {
  const { circles, memberships } = await collections();
  const mine = await memberships.find({ userId }).sort({ joinedAt: 1 }).toArray();
  const out = [];
  for (const m of mine) {
    const circle = await circles.findOne({ _id: m.circleId });
    if (!circle) continue;
    const memberCount = await memberships.countDocuments({ circleId: circle._id });
    out.push({ id: circle._id, name: circle.name, memberCount, role: m.role });
  }
  return out;
}

export async function updateShareSettings(
  userId: string,
  circleId: string,
  patch: Partial<Pick<MembershipDoc, "shareConsistency" | "shareActivity" | "shareWeights" | "sharePRs">>
) {
  const { memberships } = await collections();
  const set: Record<string, boolean> = {};
  for (const k of ["shareConsistency", "shareActivity", "shareWeights", "sharePRs"] as const)
    if (patch[k] !== undefined) set[k] = Boolean(patch[k]);
  if (Object.keys(set).length)
    await memberships.updateOne({ circleId, userId }, { $set: set });
}

// --- consistency computations (server-side, over that member's own log) ---

function streakWeeks(dates: string[]): number {
  const byWeek = new Map<string, number>();
  for (const d of dates) {
    const key = toKey(startOfWeek(new Date(d + "T12:00")));
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  let streak = 0;
  let cursor = startOfWeek(new Date());
  if ((byWeek.get(toKey(cursor)) ?? 0) > 0) streak += 1;
  cursor = addDays(cursor, -7);
  while ((byWeek.get(toKey(cursor)) ?? 0) >= 3) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export interface MemberView {
  name: string;
  isYou: boolean;
  role: string;
  streakWeeks?: number;
  activeDays?: number;
  last14?: boolean[];
  lastActivity?: { name: string; date: string; exercises: number };
  topSet?: { weight: number; reps: number; exercise: string };
  recentPR?: { exercise: string; e1rm: number };
}

/** Circle status board — each member's fields filtered by THAT member's own
 * share settings. Server-enforced, never client-trusted. */
export async function getCircleView(circleId: string, viewerId: string) {
  const { circles, memberships, users, challenges } = await collections();
  const viewerMembership = await memberships.findOne({ circleId, userId: viewerId });
  if (!viewerMembership) throw new Error("forbidden");

  const circle = await circles.findOne({ _id: circleId });
  if (!circle) throw new Error("not found");
  const memberDocs = await memberships.find({ circleId }).sort({ joinedAt: 1 }).toArray();

  const today = new Date();
  const members: MemberView[] = [];
  for (const m of memberDocs) {
    const u = await users.findOne({ _id: m.userId });
    const workouts = await listWorkouts(m.userId);
    const dates = workouts.map((w) => w.date);
    const dateSet = new Set(dates);
    const view: MemberView = { name: u?.name ?? "Member", isYou: m.userId === viewerId, role: m.role };
    if (m.shareConsistency) {
      view.streakWeeks = streakWeeks(dates);
      view.activeDays = dateSet.size;
      view.last14 = Array.from({ length: 14 }, (_, i) => dateSet.has(toKey(addDays(today, -(13 - i)))));
    }
    const recent = workouts[workouts.length - 1];
    if (m.shareActivity && recent) {
      view.lastActivity = { name: recent.name, date: recent.date, exercises: recent.exercises.length };
      if (m.shareWeights) {
        let best: { weight: number; reps: number; exercise: string } | undefined;
        let bestScore = 0;
        for (const ex of recent.exercises)
          for (const s of ex.sets) {
            const score = e1rm(s.weight, s.reps);
            if (score > bestScore) {
              bestScore = score;
              best = { weight: s.weight, reps: s.reps, exercise: exerciseName(ex.exerciseId) };
            }
          }
        view.topSet = best;
      }
    }
    if (m.sharePRs) {
      let prScore = 0;
      let pr: { exercise: string; e1rm: number } | undefined;
      for (const w of workouts)
        for (const ex of w.exercises)
          for (const s of ex.sets) {
            const est = e1rm(s.weight, s.reps);
            if (s.isPR && est > prScore) {
              prScore = est;
              pr = { exercise: exerciseName(ex.exerciseId), e1rm: est };
            }
          }
      view.recentPR = pr;
    }
    members.push(view);
  }

  members.sort(
    (a, b) =>
      (b.streakWeeks ?? -1) - (a.streakWeeks ?? -1) ||
      (b.lastActivity?.date ?? "").localeCompare(a.lastActivity?.date ?? "")
  );

  const challengeDoc = (await challenges.find({ circleId }).sort({ createdAt: -1 }).limit(1).toArray())[0];
  const challenge = challengeDoc
    ? await challengeProgress(challengeDoc, memberDocs)
    : null;

  return {
    id: circle._id,
    name: circle.name,
    inviteCode: circle.inviteCode,
    memberCap: circle.memberCap,
    youAreOwner: viewerMembership.role === "owner",
    myShare: {
      shareConsistency: viewerMembership.shareConsistency,
      shareActivity: viewerMembership.shareActivity,
      shareWeights: viewerMembership.shareWeights,
      sharePRs: viewerMembership.sharePRs,
    },
    members,
    challenge,
  };
}

export async function createChallenge(
  userId: string,
  circleId: string,
  name: string,
  days: number,
  targetPerWeek: number
) {
  const { memberships, challenges } = await collections();
  const m = await memberships.findOne({ circleId, userId });
  if (!m) throw new Error("forbidden");
  const start = new Date();
  await challenges.insertOne({
    _id: newId("ch"),
    circleId,
    name: name.trim().slice(0, 60) || "Consistency challenge",
    startDate: toKey(start),
    endDate: toKey(addDays(start, Math.min(90, Math.max(7, days)))),
    targetPerWeek: Math.min(7, Math.max(1, targetPerWeek)),
    createdAt: new Date(),
  });
}

async function challengeProgress(
  challenge: { name: string; startDate: string; endDate: string; targetPerWeek: number },
  memberDocs: MembershipDoc[]
) {
  const todayKey = toKey(new Date());
  const weeks = Math.max(
    1,
    Math.round(
      (new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / (7 * 86_400_000)
    )
  );
  const target = weeks * challenge.targetPerWeek;
  const { users } = await collections();
  const rows: { name: string; sessions: number; target: number }[] = [];
  const end = todayKey < challenge.endDate ? todayKey : challenge.endDate;
  for (const m of memberDocs) {
    const u = await users.findOne({ _id: m.userId });
    const workouts = await listWorkouts(m.userId);
    const sessions = workouts.filter((w) => w.date >= challenge.startDate && w.date <= end).length;
    rows.push({ name: u?.name ?? "Member", sessions, target });
  }
  rows.sort((a, b) => b.sessions - a.sessions);
  return {
    name: challenge.name,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    targetPerWeek: challenge.targetPerWeek,
    active: todayKey <= challenge.endDate,
    rows,
  };
}

export async function circleDigestFacts(circleId: string, viewerId: string) {
  const { memberships } = await collections();
  const viewerMembership = await memberships.findOne({ circleId, userId: viewerId });
  if (!viewerMembership) throw new Error("forbidden");
  const view = await getCircleView(circleId, viewerId);
  const weekStart = toKey(startOfWeek(new Date()));
  const onStreak = view.members.filter((m) => (m.streakWeeks ?? 0) >= 2).map((m) => m.name);

  let sessionsThisWeek = 0;
  const memberDocs = await memberships.find({ circleId }).toArray();
  for (const m of memberDocs) {
    if (!m.shareConsistency) continue;
    const w = await listWorkouts(m.userId);
    sessionsThisWeek += w.filter((x) => x.date >= weekStart).length;
  }
  return [
    `${view.members.length} members · ${sessionsThisWeek} sessions logged this week.`,
    onStreak.length ? `On a streak: ${onStreak.join(", ")}.` : `No multi-week streaks running yet.`,
    view.challenge?.active
      ? `Challenge "${view.challenge.name}" is live — target ${view.challenge.targetPerWeek}×/week.`
      : `No active challenge.`,
  ];
}
