import "server-only";
import { collections } from "@/lib/mongo";

export interface Prefs {
  favourites: string[];
  templates: unknown[];
  playlists: { list: unknown[]; activeId?: string };
}

const EMPTY: Prefs = { favourites: [], templates: [], playlists: { list: [] } };

export async function getPrefs(userId: string): Promise<Prefs> {
  const { prefs } = await collections();
  const doc = await prefs.findOne({ _id: userId });
  if (!doc) return EMPTY;
  return {
    favourites: Array.isArray(doc.favourites) ? doc.favourites : [],
    templates: Array.isArray(doc.templates) ? doc.templates : [],
    playlists:
      doc.playlists && typeof doc.playlists === "object"
        ? (doc.playlists as Prefs["playlists"])
        : { list: [] },
  };
}

/** Write-through of one or more pref slices. Owner-scoped by _id = userId. */
export async function savePrefs(userId: string, patch: Partial<Prefs>) {
  const set: Record<string, unknown> = {};
  if (Array.isArray(patch.favourites)) set.favourites = patch.favourites.slice(0, 500);
  if (Array.isArray(patch.templates)) set.templates = patch.templates.slice(0, 100);
  if (patch.playlists && typeof patch.playlists === "object") set.playlists = patch.playlists;
  if (!Object.keys(set).length) return;
  const { prefs } = await collections();
  await prefs.updateOne({ _id: userId }, { $set: set }, { upsert: true });
}
