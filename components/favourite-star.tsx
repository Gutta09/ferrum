"use client";

import { Star } from "lucide-react";
import { isFavourite, toggleFavourite, useFavourites } from "@/lib/favourites";
import { cn } from "@/lib/utils";

/** One-tap favourite toggle. Reads the store so every instance stays in sync. */
export function FavouriteStar({
  exerciseId,
  className,
  size = 16,
}: {
  exerciseId: string;
  className?: string;
  size?: number;
}) {
  useFavourites(); // subscribe so this re-renders on any toggle
  const fav = isFavourite(exerciseId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavourite(exerciseId);
      }}
      aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={fav}
      className={cn(
        "flex items-center justify-center rounded-md transition-colors duration-150",
        fav ? "text-gold" : "text-tertiary hover:text-secondary",
        className
      )}
    >
      <Star
        style={{ width: size, height: size }}
        className={fav ? "fill-current" : ""}
        aria-hidden
      />
    </button>
  );
}
