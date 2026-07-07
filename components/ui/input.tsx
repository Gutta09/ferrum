"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-input border border-line bg-surface px-3.5 text-body text-primary placeholder:text-tertiary",
        "transition-colors duration-150 ease-swift hover:border-line-hover focus:border-line-hover",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface SearchProps extends InputHTMLAttributes<HTMLInputElement> {
  hint?: string;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(
  ({ className, hint, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
      />
      <input
        ref={ref}
        type="search"
        className="h-11 w-full rounded-input border border-line bg-surface pl-10 pr-16 text-body text-primary placeholder:text-tertiary transition-colors duration-150 ease-swift hover:border-line-hover focus:border-line-hover [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {hint && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-tertiary">
          {hint}
        </kbd>
      )}
    </div>
  )
);
Search.displayName = "Search";
