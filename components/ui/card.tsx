import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-card shadow-ambient",
        interactive &&
          "transition-colors duration-150 ease-swift hover:border-line-hover",
        className
      )}
      {...props}
    />
  );
}

export function CardLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-label uppercase tracking-[0.02em] text-tertiary", className)}
      {...props}
    />
  );
}
