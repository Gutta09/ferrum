import "server-only";
import { auth } from "@/lib/auth";

/** The authenticated user id, or null. Server-side source of truth — never the
 * client. Tier-2 ownership: every mutation resolves the owner here, not from
 * anything the request carried. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

/** Throws when unauthenticated — route handlers turn this into a 401. */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new UnauthorizedError();
  return id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Server-side assertOwner: the Tier-2 counterpart of lib/owner.ts. A row only
 * belongs to the caller if its userId matches the session. */
export function assertOwner(resource: { userId: string }, userId: string) {
  if (resource.userId !== userId) throw new ForbiddenError();
}

export class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
    this.name = "ForbiddenError";
  }
}
