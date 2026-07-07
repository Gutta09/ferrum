"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider, useSession } from "next-auth/react";
import { type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { setActiveUserId } from "@/lib/owner";

/** Mirrors the session's user id into the ownership layer before children
 * render — every repo query and assertOwner reads from it. */
function ActiveUserSync() {
  const { data } = useSession();
  setActiveUserId((data?.user as { id?: string } | undefined)?.id ?? null);
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
