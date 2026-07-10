"use client";

import { ChevronDown, ChevronUp, Music2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CardLabel } from "@/components/ui/card";
import {
  activePlaylist,
  addPlaylist,
  parsePlaylistUrl,
  renamePlaylist,
  usePlaylistStore,
} from "@/lib/playlists";
import { cn } from "@/lib/utils";

// ---- Spotify iFrame API -----------------------------------------------------

interface SpotifyEmbedController {
  togglePlay(): void;
  destroy(): void;
  addListener(
    event: string,
    cb: (e: { data?: { isPaused?: boolean } }) => void
  ): void;
}
interface SpotifyIFrameAPI {
  createController(
    el: HTMLElement,
    opts: { uri: string; width?: string | number; height?: string | number },
    cb: (controller: SpotifyEmbedController) => void
  ): void;
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    __ferrumSpotifyApi?: Promise<SpotifyIFrameAPI>;
  }
}

function loadSpotifyApi(): Promise<SpotifyIFrameAPI> {
  if (window.__ferrumSpotifyApi) return window.__ferrumSpotifyApi;
  window.__ferrumSpotifyApi = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("spotify api timeout")), 8000);
    window.onSpotifyIframeApiReady = (api) => {
      window.clearTimeout(timeout);
      resolve(api);
    };
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("spotify api blocked"));
    };
    document.body.appendChild(script);
  });
  return window.__ferrumSpotifyApi;
}

// -----------------------------------------------------------------------------

/** Now-playing pill — rest timer's glass language. Spotify links get the real
 * iFrame controller: play/pause lives in the pill and on `M`; the embed stays
 * mounted while collapsed so music never cuts out. */
export function NowPlaying() {
  const playlist = activePlaylist(usePlaylistStore()) ?? null;
  const [expanded, setExpanded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [controllerReady, setControllerReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);

  // real playlist title via oEmbed — the pill should name the thing playing
  useEffect(() => {
    if (!playlist?.pageUrl || playlist.label.startsWith("Gym ·") === false) {
      if (!playlist?.pageUrl) return;
    }
    let alive = true;
    fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(playlist.pageUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { title?: string } | null) => {
        if (!alive || !data?.title || data.title === playlist.label) return;
        renamePlaylist(playlist.id, data.title);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist?.pageUrl]);

  // mount the Spotify controller (or fall back to a plain iframe)
  useEffect(() => {
    if (!playlist || playlist.kind !== "spotify" || !playlist.uri) return;
    let cancelled = false;
    loadSpotifyApi()
      .then((api) => {
        if (cancelled || !embedRef.current) return;
        api.createController(
          embedRef.current,
          { uri: playlist.uri!, width: "100%", height: 152 },
          (controller) => {
            if (cancelled) {
              controller.destroy();
              return;
            }
            controllerRef.current = controller;
            setControllerReady(true);
            controller.addListener("playback_update", (e) => {
              if (e.data?.isPaused !== undefined) setIsPaused(e.data.isPaused);
            });
          }
        );
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });
    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setControllerReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist?.id]);

  const togglePlay = useCallback(() => {
    controllerRef.current?.togglePlay();
  }, []);

  // M: play/pause when the controller is live, otherwise expand/collapse
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if ((e.key === "m" || e.key === "M") && playlist) {
        e.preventDefault();
        if (controllerRef.current) togglePlay();
        else setExpanded((x) => !x);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playlist, togglePlay]);

  const connect = () => {
    const next = parsePlaylistUrl(draft);
    if (!next) return setError(true);
    addPlaylist(next);
    setConnecting(false);
    setExpanded(true);
    setDraft("");
    setError(false);
  };

  const useController = playlist?.kind === "spotify" && !apiFailed;

  return (
    <>
      <div className="fixed right-4 top-[calc(5rem_+_env(safe-area-inset-top))] z-40 flex flex-col-reverse items-end gap-2 md:right-8 md:top-24">
        {playlist && (
          <div
            className={cn(
              "w-[300px] overflow-hidden rounded-card shadow-ambient transition-all duration-200 ease-swift",
              expanded
                ? "h-[152px] border border-line bg-card/70 opacity-100 backdrop-blur-xl"
                : "pointer-events-none h-0 border-0 opacity-0"
            )}
            aria-hidden={!expanded}
          >
            {useController ? (
              // the controller swaps this div for its iframe
              <div ref={embedRef} />
            ) : (
              <iframe
                src={playlist.embedUrl}
                title="Gym playlist"
                width="300"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block border-0"
              />
            )}
          </div>
        )}

        <div className="flex h-10 items-center rounded-full border border-line bg-card/70 shadow-ambient backdrop-blur-xl">
          {playlist && controllerReady && (
            <button
              onClick={togglePlay}
              aria-label={isPaused ? "Play (M)" : "Pause (M)"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-colors duration-150 hover:text-primary"
            >
              {isPaused ? (
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              ) : (
                <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />
              )}
            </button>
          )}
          <button
            onClick={() => (playlist ? setExpanded((x) => !x) : setConnecting(true))}
            aria-label={
              playlist
                ? expanded
                  ? "Collapse player"
                  : "Expand player"
                : "Connect your gym playlist"
            }
            className={cn(
              "flex h-10 items-center gap-2 rounded-full pr-4 text-[12.5px] text-secondary transition-colors duration-150 hover:text-primary",
              playlist && controllerReady ? "pl-1" : "pl-4"
            )}
          >
            {!(playlist && controllerReady) && (
              <Music2 className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
            )}
            <span className="max-w-[148px] truncate">
              {playlist ? playlist.label : "Connect playlist"}
            </span>
            {playlist &&
              (expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-tertiary" aria-hidden />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-tertiary" aria-hidden />
              ))}
          </button>
        </div>
      </div>

      <Modal
        open={connecting}
        onClose={() => setConnecting(false)}
        ariaLabel="Connect gym playlist"
      >
        <div className="p-6">
          <CardLabel>Gym playlist</CardLabel>
          <p className="mt-2 text-[14px] text-secondary">
            Paste a Spotify or Apple Music playlist link. Spotify gets play/pause
            on <kbd className="rounded border border-line bg-ink/[0.04] px-1 font-mono text-[11px]">M</kbd> —
            hands never leave the log.
          </p>
          <Input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            placeholder="https://open.spotify.com/playlist/…"
            aria-label="Playlist URL"
            className="mt-4 font-mono text-[13px]"
          />
          {error && (
            <p className="mt-2 text-[12.5px] text-danger">
              That doesn&apos;t look like a Spotify or Apple Music link.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setConnecting(false)}>Cancel</Button>
            <Button variant="primary" onClick={connect}>
              Connect
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
