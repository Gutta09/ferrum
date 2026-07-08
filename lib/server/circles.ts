import "server-only";
import { prisma } from "@/lib/db";
import { EXERCISES } from "@/lib/seed";
import { addDays, e1rm, startOfWeek, toKey } from "@/lib/utils";
import { assertOwner } from "./session";
import { listWorkouts } from "./workouts";

const MEMBER_CAP = 8;
const exerciseName = (id: string) => EXERCISES.find((e) => e.id === id)?.name ?? id;

function inviteCode() {
  // short, unambiguous (no 0/O/1/I) — feels like a real invite, not spam
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1)
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export async function createCircle(userId: string, name: string) {
  const clean = name.trim().slice(0, 40) || "Training Circle";
  // retry on the rare invite-code collision
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const circle = await prisma.circle.create({
        data: {
          name: clean,
          ownerId: userId,
          inviteCode: inviteCode(),
          memberCap: MEMBER_CAP,
          members: { create: { userId, role: "owner" } },
        },
      });
      return circle;
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
}

export async function joinByCode(userId: string, code: string) {
  const circle = await prisma.circle.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
    include: { _count: { select: { members: true } } },
  });
  if (!circle) throw new Error("That invite code doesn't match a circle.");
  const already = await prisma.circleMembership.findUnique({
    where: { circleId_userId: { circleId: circle.id, userId } },
  });
  if (already) return circle.id;
  if (circle._count.members >= circle.memberCap)
    throw new Error("This circle is full.");
  await prisma.circleMembership.create({ data: { circleId: circle.id, userId } });
  return circle.id;
}

export async function leaveCircle(userId: string, circleId: string) {
  const m = await prisma.circleMembership.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (!m) return;
  assertOwner({ userId: m.userId }, userId); // you can only remove your own membership
  if (m.role === "owner") {
    // owner leaving dissolves the circle (cascade removes memberships)
    await prisma.circle.delete({ where: { id: circleId } });
  } else {
    await prisma.circleMembership.delete({ where: { id: m.id } });
  }
}

export async function listCircles(userId: string) {
  const memberships = await prisma.circleMembership.findMany({
    where: { userId },
    include: { circle: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.circle.id,
    name: m.circle.name,
    memberCount: m.circle._count.members,
    role: m.role,
  }));
}

export async function updateShareSettings(
  userId: string,
  circleId: string,
  patch: Partial<{
    shareConsistency: boolean;
    shareActivity: boolean;
    shareWeights: boolean;
    sharePRs: boolean;
  }>
) {
  // owner-scoped: only your own membership row is touched
  await prisma.circleMembership.updateMany({
    where: { circleId, userId },
    data: {
      ...(patch.shareConsistency !== undefined && { shareConsistency: patch.shareConsistency }),
      ...(patch.shareActivity !== undefined && { shareActivity: patch.shareActivity }),
      ...(patch.shareWeights !== undefined && { shareWeights: patch.shareWeights }),
      ...(patch.sharePRs !== undefined && { sharePRs: patch.sharePRs }),
    },
  });
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
  // consistency (default shared)
  streakWeeks?: number;
  activeDays?: number;
  last14?: boolean[]; // trained on each of the last 14 days
  // activity (default shared)
  lastActivity?: { name: string; date: string; exercises: number };
  // opt-in only
  topSet?: { weight: number; reps: number; exercise: string };
  recentPR?: { exercise: string; e1rm: number };
}

/** Builds the circle status board. Each member's fields are filtered by THAT
 * member's own share settings — server-enforced, never client-trusted. */
export async function getCircleView(circleId: string, viewerId: string) {
  // the viewer must be a member — this IS the access check
  const viewerMembership = await prisma.circleMembership.findFirst({
    where: { circleId, userId: viewerId },
  });
  if (!viewerMembership) throw new Error("forbidden");

  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    include: {
      members: { include: { user: true }, orderBy: { joinedAt: "asc" } },
      challenges: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!circle) throw new Error("not found");

  const today = new Date();
  const members: MemberView[] = [];
  for (const m of circle.members) {
    const workouts = await listWorkouts(m.userId);
    const dates = workouts.map((w) => w.date);
    const dateSet = new Set(dates);
    const view: MemberView = {
      name: m.user.name,
      isYou: m.userId === viewerId,
      role: m.role,
    };
    if (m.shareConsistency) {
      view.streakWeeks = streakWeeks(dates);
      view.activeDays = dateSet.size;
      view.last14 = Array.from({ length: 14 }, (_, i) =>
        dateSet.has(toKey(addDays(today, -(13 - i))))
      );
    }
    const recent = workouts[workouts.length - 1];
    if (m.shareActivity && recent) {
      view.lastActivity = {
        name: recent.name,
        date: recent.date,
        exercises: recent.exercises.length,
      };
      if (m.shareWeights) {
        let best: { weight: number; reps: number; exercise: string } | undefined;
        let bestScore = 0;
        for (const ex of recent.exercises)
          for (const s of ex.sets) {
            const score = e1rm(s.weight, s.reps);
            if (score > bestScore) {
              bestScore = score;
              best = {
                weight: s.weight,
                reps: s.reps,
                exercise: exerciseName(ex.exerciseId),
              };
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

  // sort by consistency (streak) desc, then most recent activity
  members.sort(
    (a, b) =>
      (b.streakWeeks ?? -1) - (a.streakWeeks ?? -1) ||
      (b.lastActivity?.date ?? "").localeCompare(a.lastActivity?.date ?? "")
  );

  const challenge = circle.challenges[0]
    ? await challengeProgress(circle.id, circle.challenges[0], circle.members.map((m) => m.userId), circle.members.map((m) => m.user.name))
    : null;

  return {
    id: circle.id,
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

// --- time-boxed challenges (start, end, then it's over) ---

export async function createChallenge(
  userId: string,
  circleId: string,
  name: string,
  days: number,
  targetPerWeek: number
) {
  const m = await prisma.circleMembership.findFirst({ where: { circleId, userId } });
  if (!m) throw new Error("forbidden");
  const start = new Date();
  return prisma.challenge.create({
    data: {
      circleId,
      name: name.trim().slice(0, 60) || "Consistency challenge",
      startDate: toKey(start),
      endDate: toKey(addDays(start, Math.min(90, Math.max(7, days)))),
      targetPerWeek: Math.min(7, Math.max(1, targetPerWeek)),
    },
  });
}

async function challengeProgress(
  circleId: string,
  challenge: { id: string; name: string; startDate: string; endDate: string; targetPerWeek: number },
  memberIds: string[],
  memberNames: string[]
) {
  const todayKey = toKey(new Date());
  const weeks = Math.max(
    1,
    Math.round(
      (new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) /
        (7 * 86_400_000)
    )
  );
  const target = weeks * challenge.targetPerWeek;
  const rows: { name: string; sessions: number; target: number }[] = [];
  for (let i = 0; i < memberIds.length; i += 1) {
    const workouts = await listWorkouts(memberIds[i]);
    const sessions = workouts.filter(
      (w) => w.date >= challenge.startDate && w.date <= (todayKey < challenge.endDate ? todayKey : challenge.endDate)
    ).length;
    rows.push({ name: memberNames[i], sessions, target });
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

/** Deterministic facts for the weekly digest (AI only rephrases these). */
export async function circleDigestFacts(circleId: string, viewerId: string) {
  const view = await getCircleView(circleId, viewerId);
  const weekStart = toKey(startOfWeek(new Date()));
  // count sessions this week across members who share consistency
  let sessionsThisWeek = 0;
  const onStreak: string[] = [];
  for (const m of view.members) {
    if (m.streakWeeks && m.streakWeeks >= 2) onStreak.push(m.name);
  }
  // sessions this week needs the raw dates; recompute cheaply
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    include: { members: true },
  });
  for (const m of circle?.members ?? []) {
    if (!m.shareConsistency) continue;
    const w = await listWorkouts(m.userId);
    sessionsThisWeek += w.filter((x) => x.date >= weekStart).length;
  }
  const facts = [
    `${view.members.length} members · ${sessionsThisWeek} sessions logged this week.`,
    onStreak.length
      ? `On a streak: ${onStreak.join(", ")}.`
      : `No multi-week streaks running yet.`,
    view.challenge?.active
      ? `Challenge "${view.challenge.name}" is live — target ${view.challenge.targetPerWeek}×/week.`
      : `No active challenge.`,
  ];
  return facts;
}
