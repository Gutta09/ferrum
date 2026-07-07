import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-body", className)} {...props} />
    </div>
  );
}

export function Th({
  numeric,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "border-b border-line px-4 pb-3 text-left text-label font-medium uppercase tracking-[0.02em] text-tertiary",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  );
}

export function Td({
  numeric,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-line px-4 py-3 text-[14px] text-secondary",
        numeric && "text-right font-mono tabular-nums text-primary",
        className
      )}
      {...props}
    />
  );
}
