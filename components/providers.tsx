"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { setActiveUserId } from "@/lib/owner";
import { hydrateCustomExercises } from "@/lib/repo";

/** Mirrors the session's user id into the ownership layer before children
 * render — every repo query and assertOwner reads from it. */
function ActiveUserSync() {
  const { data, status } = useSession();
  setActiveUserId((data?.user as { id?: string } | undefined)?.id ?? null);
  useEffect(() => {
    // once signed in, merge the user's custom exercises into the catalog so
    // their names resolve after a reload
    if (status === "authenticated") void hydrateCustomExercises();
  }, [status]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <ActiveUserSync />
          {children}
        </ToastProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
