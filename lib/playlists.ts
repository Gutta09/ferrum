// Multiple saved playlists, owner-scoped; the active one drives the pill.

import { useSyncExternalStore } from "react";
import { activeUserId, assertOwner } from "./owner";
import { uid } from "./utils";

export interface SavedPlaylist {
  id: string;
  userId: string;
  label: string;
  embedUrl: string;
  kind: "spotify" | "apple" | "youtube";
  uri?: string;
  pageUrl?: string;
}

interface Store {
  list: SavedPlaylist[];
  /** active playlist id per user */
  active: Record<string, string>;
}

const KEY = "ferrum:playlists";
const LEGACY_KEY = "ferrum:playlist";

let store: Store = { list: [], active: {} };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) store = JSON.parse(raw);
    // migrate the single-playlist era
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && store.list.length === 0) {
      const p = JSON.parse(legacy);
      const entry: SavedPlaylist = {
        id: uid("pl"),
        userId: activeUserId(),
        label: p.label ?? "Gym playlist",
        embedUrl: p.embedUrl,
        kind: p.kind ?? "spotify",
        uri: p.uri,
        pageUrl: p.pageUrl,
      };
      store = { list: [entry], active: { [entry.userId]: entry.id } };
      localStorage.removeItem(LEGACY_KEY);
      persist();
    }
  } catch {
    store = { list: [], active: {} };
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(store));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: Store = { list: [], active: {} };

export function usePlaylistStore(): Store {
  load();
  return useSyncExternalStore(subscribe, () => store, () => EMPTY);
}

export function myPlaylists(s: Store): SavedPlaylist[] {
  return s.list.filter((p) => p.userId === activeUserId());
}

export function activePlaylist(s: Store): SavedPlaylist | undefined {
  const mine = myPlaylists(s);
  return mine.find((p) => p.id === s.active[activeUserId()]) ?? mine[0];
}

export function addPlaylist(p: Omit<SavedPlaylist, "id" | "userId">): SavedPlaylist {
  const entry: SavedPlaylist = { ...p, id: uid("pl"), userId: activeUserId() };
  store = {
    list: [...store.list, entry],
    active: { ...store.active, [entry.userId]: entry.id },
  };
  persist();
  return entry;
}

export function renamePlaylist(id: string, label: string) {
  const src = store.list.find((p) => p.id === id);
  if (!src) return;
  assertOwner(src);
  store = { ...store, list: store.list.map((p) => (p.id === id ? { ...p, label } : p)) };
  persist();
}

export function removePlaylist(id: string) {
  const src = store.list.find((p) => p.id === id);
  if (!src) return;
  assertOwner(src);
  store = { ...store, list: store.list.filter((p) => p.id !== id) };
  persist();
}

export function parsePlaylistUrl(
  raw: string
): Omit<SavedPlaylist, "id" | "userId"> | null {
  let input = raw.trim();
  const asUri = input.match(/^spotify:(playlist|album|track):([A-Za-z0-9]+)$/);
  if (asUri) {
    return {
      label: "Spotify playlist",
      kind: "spotify",
      uri: `spotify:${asUri[1]}:${asUri[2]}`,
      pageUrl: `https://open.spotify.com/${asUri[1]}/${asUri[2]}`,
      embedUrl: `https://open.spotify.com/embed/${asUri[1]}/${asUri[2]}?theme=0`,
    };
  }
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  try {
    const url = new URL(input);
    if (url.hostname === "open.spotify.com") {
      const path = url.pathname.replace(/^\/intl-[a-z]+/i, "").replace(/^\/embed/, "");
      const m = path.match(/^\/(playlist|album|track)\/([A-Za-z0-9]+)/);
      if (!m) return null;
      return {
        label: "Spotify playlist",
        kind: "spotify",
        uri: `spotify:${m[1]}:${m[2]}`,
        pageUrl: `https://open.spotify.com/${m[1]}/${m[2]}`,
        embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`,
      };
    }
    if (url.hostname.endsWith("music.apple.com")) {
      return {
        label: "Apple Music playlist",
        kind: "apple",
        embedUrl: `https://embed.music.apple.com${url.pathname}`,
      };
    }
    // YouTube: embed the playlist compliantly (no audio-only/background — that
    // violates the Data API ToS; this is the standard embedded player)
    if (
      url.hostname.endsWith("youtube.com") ||
      url.hostname === "youtu.be" ||
      url.hostname.endsWith("music.youtube.com")
    ) {
      const list = url.searchParams.get("list");
      if (list)
        return {
          label: "YouTube playlist",
          kind: "youtube",
          pageUrl: `https://www.youtube.com/playlist?list=${list}`,
          embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}`,
        };
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActivePlaylist(id: string) {
  const src = store.list.find((p) => p.id === id);
  if (!src) return;
  assertOwner(src);
  store = { ...store, active: { ...store.active, [activeUserId()]: id } };
  persist();
}
