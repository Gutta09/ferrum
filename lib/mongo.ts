import "server-only";
import { MongoClient, type Db } from "mongodb";

// Native MongoDB driver (OpenSSL TLS) — Prisma's Rust engine can't complete the
// TLS handshake with Atlas shared clusters, but the native driver connects
// cleanly. DB is optional: no DATABASE_URL → demo mode on the seed.

export const DB_ENABLED = Boolean(process.env.DATABASE_URL);

const globalForMongo = globalThis as unknown as { _mongo?: Promise<MongoClient> };

function connect(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL!;
  const client = new MongoClient(uri, {
    // generous enough that a cold serverless start (first TLS handshake to
    // Atlas can take a few seconds) never times out
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    retryWrites: true,
  });
  return client.connect();
}

async function client(): Promise<MongoClient> {
  // never cache a rejected connection — a transient TLS blip would otherwise
  // poison every later request on a warm lambda until it recycled
  if (globalForMongo._mongo) {
    try {
      return await globalForMongo._mongo;
    } catch {
      globalForMongo._mongo = undefined;
    }
  }
  const p = connect();
  globalForMongo._mongo = p;
  try {
    return await p;
  } catch (e) {
    globalForMongo._mongo = undefined;
    throw e;
  }
}

/** The ferrum database. The db name is embedded in the connection string. */
export async function db(): Promise<Db> {
  const c = await client();
  return c.db();
}

// collections, typed loosely (the app-level types live in lib/types)
export interface UserDoc {
  _id: string;
  email: string;
  name: string;
  passwordHash?: string;
  createdAt: Date;
}
export interface SetDoc {
  weight: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
  isPR?: boolean;
}
export interface ExerciseEntryDoc {
  exerciseId: string;
  notes?: string;
  sets: SetDoc[];
}
export interface WorkoutDoc {
  _id: string;
  userId: string;
  name: string;
  date: string;
  durationMin: number;
  createdAt: Date;
  exercises: ExerciseEntryDoc[];
}
export interface CustomExerciseDoc {
  _id: string;
  userId: string;
  name: string;
  muscle: string;
  equipment: string;
  difficulty: string;
}
export interface CircleDoc {
  _id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberCap: number;
  createdAt: Date;
}
export interface MembershipDoc {
  _id: string;
  circleId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  shareConsistency: boolean;
  shareActivity: boolean;
  shareWeights: boolean;
  sharePRs: boolean;
}
export interface ChallengeDoc {
  _id: string;
  circleId: string;
  name: string;
  startDate: string;
  endDate: string;
  targetPerWeek: number;
  createdAt: Date;
}
export interface PhotoDoc {
  _id: string;
  userId: string;
  date: string;
  dataUrl: string; // resized JPEG data URL (client-compressed)
  workoutId?: string;
  createdAt: Date;
}
export interface PrefDoc {
  // one document per user holding their client-side prefs (favourites,
  // templates, playlists) so they sync across devices
  _id: string; // = userId
  favourites?: string[];
  templates?: unknown[];
  playlists?: { list: unknown[]; activeId?: string };
}

export async function collections() {
  const database = await db();
  return {
    users: database.collection<UserDoc>("users"),
    workouts: database.collection<WorkoutDoc>("workouts"),
    exercises: database.collection<CustomExerciseDoc>("exercises"),
    circles: database.collection<CircleDoc>("circles"),
    memberships: database.collection<MembershipDoc>("memberships"),
    challenges: database.collection<ChallengeDoc>("challenges"),
    photos: database.collection<PhotoDoc>("photos"),
    prefs: database.collection<PrefDoc>("prefs"),
  };
}

let indexed = false;
/** Create the indexes we rely on (idempotent, run once per process). */
export async function ensureIndexes() {
  if (indexed) return;
  indexed = true;
  const c = await collections();
  await Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.workouts.createIndex({ userId: 1, date: 1 }),
    c.exercises.createIndex({ userId: 1 }),
    c.circles.createIndex({ inviteCode: 1 }, { unique: true }),
    c.memberships.createIndex({ circleId: 1, userId: 1 }, { unique: true }),
    c.memberships.createIndex({ userId: 1 }),
    c.challenges.createIndex({ circleId: 1 }),
    c.photos.createIndex({ userId: 1, date: 1 }),
  ]).catch(() => {});
}

export function newId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
