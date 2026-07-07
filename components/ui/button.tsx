"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  // white accent — one of these per view, max
  primary: "bg-white text-black font-medium hover:bg-white/90 active:bg-white/80",
  ghost:
    "text-secondary hover:text-primary hover:bg-white/[0.06] active:bg-white/[0.09]",
  danger: "text-danger hover:bg-danger/10 active:bg-danger/15",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-[14px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-input transition-colors duration-150 ease-swift disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
