"use client";

import {
  BarChart3,
  Dumbbell,
  History,
  Home,
  Library,
  PanelLeft,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/exercises", label: "Exercises", icon: Library },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const { data: session, status } = useSession();
  const isPublic = pathname === "/" || pathname === "/signin";

  return (
    <>
      {/* desktop icon rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-bg transition-[width] duration-200 ease-swift md:flex",
          expanded ? "w-52" : "w-16"
        )}
      >
        <div className={cn("flex h-16 items-center", expanded ? "px-5" : "justify-center")}>
          <Link
            href="/"
            aria-label="Ferrum home"
            className="flex items-center gap-3"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-card text-[13px] font-semibold text-primary">
              F
            </span>
            {expanded && (
              <span className="text-[14px] font-semibold tracking-tight text-primary">
                Ferrum
              </span>
            )}
          </Link>
        </div>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-10 items-center rounded-input transition-colors duration-150 ease-swift",
                  expanded ? "gap-3 px-3" : "justify-center",
                  active
                    ? "bg-white/[0.06] text-primary"
                    : "text-tertiary hover:bg-white/[0.04] hover:text-secondary"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                {expanded ? (
                  <span className="text-[13.5px] font-medium">{label}</span>
                ) : (
                  <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-line bg-card px-2.5 py-1 text-[12px] font-medium text-secondary shadow-ambient group-hover:block">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 px-3 pb-4">
          {session?.user ? (
            <Menu
              ariaLabel="Account"
              align="left"
              trigger={
                <span
                  className={cn(
                    "flex h-10 items-center rounded-input text-secondary transition-colors duration-150 hover:bg-white/[0.04] hover:text-primary",
                    expanded ? "w-full gap-3 px-2" : "w-10 justify-center"
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-card text-[11px] font-semibold">
                    {session.user.name?.[0] ?? "?"}
                  </span>
                  {expanded && (
                    <span className="truncate text-[13px]">{session.user.name}</span>
                  )}
                </span>
              }
              items={[
                { label: "Sign out", onSelect: () => signOut({ callbackUrl: "/" }) },
              ]}
            />
          ) : (
            status !== "loading" && (
              <Link
                href="/signin"
                className={cn(
                  "flex h-10 items-center rounded-input text-[13px] font-medium text-secondary transition-colors hover:bg-white/[0.04] hover:text-primary",
                  expanded ? "px-3" : "justify-center"
                )}
              >
                {expanded ? "Sign in" : "→"}
              </Link>
            )
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "flex h-10 items-center rounded-input text-tertiary transition-colors duration-150 hover:bg-white/[0.04] hover:text-secondary",
              expanded ? "w-full gap-3 px-3" : "w-full justify-center"
            )}
          >
            <PanelLeft className="h-[18px] w-[18px]" aria-hidden />
            {expanded && <span className="text-[13.5px] font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* mobile bottom tabs */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 pt-1.5",
                active ? "text-primary" : "text-tertiary"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[10.5px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <main
        className={cn(
          "transition-[padding] duration-200 ease-swift",
          expanded ? "md:pl-52" : "md:pl-16"
        )}
      >
        <div className="mx-auto w-full max-w-[1280px] px-5 pb-32 pt-8 md:px-10 md:pb-20 md:pt-12">
          {!isPublic && status === "loading" ? (
            <div className="flex flex-col gap-5 pt-4">
              <Skeleton className="h-32 rounded-card" />
              <Skeleton className="h-64 rounded-card" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      <CommandPalette />
    </>
  );
}
