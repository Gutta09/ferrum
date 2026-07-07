"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Columns2, ImagePlus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { activeUserId } from "@/lib/owner";
import { addPhotoFile, removePhoto, usePhotos, type ProgressPhoto } from "@/lib/photo-store";
import { cn, formatShort } from "@/lib/utils";

/** Physique grid: monochrome-first, date-labeled. Compare mode renders two
 * dates split-screen — the honest before/after, no filters. */
export function Physique() {
  const photos = usePhotos().filter((p) => p.userId === activeUserId());
  const [viewer, setViewer] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [compare, setCompare] = useState<[ProgressPhoto, ProgressPhoto] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => {
    setViewer(null);
    setCompare(null);
  }, []);

  useEffect(() => {
    if (viewer === null && !compare) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (viewer !== null) {
        if (e.key === "ArrowRight") setViewer((v) => Math.min((v ?? 0) + 1, photos.length - 1));
        if (e.key === "ArrowLeft") setViewer((v) => Math.max((v ?? 0) - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, compare, photos.length, close]);

  const pick = (p: ProgressPhoto, index: number) => {
    if (!compareMode) return setViewer(index);
    const next = picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id].slice(-2);
    setPicked(next);
    if (next.length === 2) {
      const pair = next
        .map((id) => photos.find((x) => x.id === id)!)
        .sort((a, b) => (a.date < b.date ? -1 : 1)) as [ProgressPhoto, ProgressPhoto];
      setCompare(pair);
      setCompareMode(false);
      setPicked([]);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) if (f.type.startsWith("image/")) addPhotoFile(f);
  };

  return (
    <section aria-label="Physique">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label uppercase tracking-[0.02em] text-tertiary">Physique</p>
        {photos.length >= 2 && (
          <Button
            size="sm"
            onClick={() => {
              setCompareMode((m) => !m);
              setPicked([]);
            }}
            aria-pressed={compareMode}
            className={cn(compareMode && "bg-white/[0.08] text-primary")}
          >
            <Columns2 className="h-3.5 w-3.5" aria-hidden />
            {compareMode ? "Pick two dates" : "Compare"}
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="Add your first photo"
          hint="Progress is easier to see than to feel."
          action={<Button onClick={() => fileRef.current?.click()}>Upload</Button>}
        />
      ) : (
        <div
          className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => pick(p, i)}
              aria-label={`Photo from ${formatShort(p.date)}${compareMode ? ", tap to select for compare" : ""}`}
              className={cn(
                "group relative aspect-[3/4] overflow-hidden rounded-input border bg-surface transition-colors duration-150",
                picked.includes(p.id) ? "border-white/40" : "border-line hover:border-line-hover"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                className="h-full w-full object-cover grayscale transition-[filter] duration-200 group-hover:grayscale-0"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-left font-mono text-[11px] tabular-nums text-secondary">
                {formatShort(p.date)}
              </span>
            </button>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Add photo"
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-input border border-dashed border-line text-tertiary transition-colors duration-150 hover:border-line-hover hover:text-secondary"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            <span className="text-[11.5px]">Add</span>
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      {/* full-screen viewer / compare */}
      <AnimatePresence>
        {(viewer !== null || compare) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-label={compare ? "Photo comparison" : "Photo viewer"}
            className="fixed inset-0 z-50 flex flex-col bg-black/95"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null || viewer === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -48) setViewer(Math.min(viewer + 1, photos.length - 1));
              if (dx > 48) setViewer(Math.max(viewer - 1, 0));
              touchX.current = null;
            }}
          >
            <div className="flex items-center justify-end gap-1 p-3">
              {viewer !== null && (
                <button
                  onClick={() => {
                    removePhoto(photos[viewer].id);
                    close();
                  }}
                  aria-label="Delete photo"
                  className="rounded-input p-2.5 text-tertiary transition-colors hover:bg-white/[0.06] hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={close}
                aria-label="Close viewer"
                className="rounded-input p-2.5 text-secondary transition-colors hover:bg-white/[0.06] hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {compare ? (
              <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden bg-line">
                {compare.map((p) => (
                  <figure key={p.id} className="relative flex min-h-0 items-center justify-center bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Physique on ${p.date}`} className="max-h-full max-w-full object-contain" />
                    <figcaption className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[12px] tabular-nums text-primary">
                      {formatShort(p.date)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : viewer !== null && photos[viewer] ? (
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 pb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[viewer].url}
                  alt={`Physique on ${photos[viewer].date}`}
                  className="max-h-full max-w-full object-contain"
                />
                <p className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[13px] tabular-nums text-secondary">
                  {formatShort(photos[viewer].date)}
                </p>
                <button
                  onClick={() => setViewer(Math.max(viewer - 1, 0))}
                  disabled={viewer === 0}
                  aria-label="Previous photo"
                  className="absolute left-2 rounded-full p-3 text-secondary transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewer(Math.min(viewer + 1, photos.length - 1))}
                  disabled={viewer === photos.length - 1}
                  aria-label="Next photo"
                  className="absolute right-2 rounded-full p-3 text-secondary transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
