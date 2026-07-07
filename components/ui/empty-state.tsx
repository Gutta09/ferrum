import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface">
        <Icon className="h-5 w-5 text-tertiary" aria-hidden />
      </div>
      <p className="mt-4 text-[15px] font-medium text-primary">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-[13px] text-tertiary">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
