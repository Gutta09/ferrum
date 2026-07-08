// Seeds the demo account into MongoDB using the native driver, in the embedded
// document shape the app reads. Run: DATABASE_URL="..." npx tsx scripts/seed-mongo.ts

import { MongoClient } from "mongodb";
import { WORKOUTS } from "../lib/seed";
import { DEMO_USER_ID } from "../lib/owner";

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL not set");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, retryWrites: true });
  await client.connect();
  const db = client.db();

  // remove the old Prisma-shaped collections (different names/format)
  for (const name of ["User", "Workout", "WorkoutExercise", "SetEntry", "Circle", "CircleMembership", "Challenge", "Exercise"]) {
    await db.collection(name).drop().catch(() => {});
  }

  await db.collection<{ _id: string }>("users").updateOne(
    { _id: DEMO_USER_ID },
    { $setOnInsert: { email: "demo@ferrum.local", name: "Bhargav", createdAt: new Date() } },
    { upsert: true }
  );

  await db.collection("workouts").deleteMany({ userId: DEMO_USER_ID });
  const docs = WORKOUTS.map((w) => ({
    _id: w.id,
    userId: DEMO_USER_ID,
    name: w.name,
    date: w.date,
    durationMin: w.durationMin,
    createdAt: new Date(),
    exercises: w.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      notes: ex.notes ?? undefined,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? null,
        completed: s.completed,
        isPR: s.isPR ?? false,
      })),
    })),
  }));
  await db.collection("workouts").insertMany(docs as never);

  const count = await db.collection("workouts").countDocuments({ userId: DEMO_USER_ID });
  console.log(`Seeded demo user with ${count} workouts (embedded).`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
