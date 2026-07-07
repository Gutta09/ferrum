// Seeds the demo account into Postgres so "Continue as demo lifter" shows a
// populated log. Deterministic — reuses the same generator the mock layer used.
// Fresh email/password accounts get NONE of this (empty owner-scoped log).

import { PrismaClient } from "@prisma/client";
import { WORKOUTS } from "../lib/seed";
import { DEMO_USER_ID } from "../lib/owner";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, email: "demo@ferrum.local", name: "Bhargav" },
  });

  // idempotent: clear the demo user's workouts, then reinsert
  await prisma.workout.deleteMany({ where: { userId: demo.id } });

  for (const w of WORKOUTS) {
    await prisma.workout.create({
      data: {
        id: w.id,
        userId: demo.id,
        name: w.name,
        date: w.date,
        durationMin: w.durationMin,
        exercises: {
          create: w.exercises.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            position: i,
            notes: ex.notes ?? null,
            sets: {
              create: ex.sets.map((s, j) => ({
                position: j,
                weight: s.weight,
                reps: s.reps,
                rpe: s.rpe ?? null,
                completed: s.completed,
                isPR: s.isPR ?? false,
              })),
            },
          })),
        },
      },
    });
  }

  const count = await prisma.workout.count({ where: { userId: demo.id } });
  console.log(`Seeded demo user with ${count} workouts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
