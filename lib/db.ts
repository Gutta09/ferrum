import { PrismaClient } from "@prisma/client";

/** When no DATABASE_URL is configured the app runs in demo mode on the seed
 * data (no accounts, non-persistent) instead of crashing. Set DATABASE_URL to
 * a reachable Postgres and it flips to real persistence with no code change. */
export const DB_ENABLED = Boolean(process.env.DATABASE_URL);

// Singleton — Next.js hot-reload would otherwise open a new pool per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = DB_ENABLED
  ? globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
  : (null as unknown as PrismaClient);

if (DB_ENABLED && process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
