// Tier-1 ownership: every record carries a userId; every query filters on the
// active user; every mutation passes assertOwner. Tier 2 replaces the module
// variable with the server session — the call sites don't change.

export const DEMO_USER_ID = "demo";

let active: string | null = null;

export function setActiveUserId(id: string | null) {
  active = id;
}

/** The signed-in user id. Falls back to the demo lifter in mock tier so
 * SSR/prerender stays deterministic; protected routes guarantee a session. */
export function activeUserId(): string {
  return active ?? DEMO_USER_ID;
}

export function assertOwner(resource: { userId: string }) {
  if (resource.userId !== activeUserId()) {
    throw new Error("Forbidden: resource belongs to another user");
  }
}
