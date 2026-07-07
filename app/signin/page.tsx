"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { getProviders } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    getProviders().then((p) => setHasGoogle(Boolean(p?.google)));
  }, []);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-[16px] font-semibold text-primary">
        F
      </span>
      <h1 className="mt-6 text-h1 text-primary">Ferrum</h1>
      <p className="mt-2 text-[14px] text-secondary">Your log. Yours alone.</p>

      <Card className="mt-8 flex w-full flex-col gap-2 p-5">
        {hasGoogle && (
          <Button
            className="w-full border border-line"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Continue with Google
          </Button>
        )}
        <Button
          className="w-full border border-line"
          onClick={() => signIn("demo", { callbackUrl: "/" })}
        >
          Continue as demo lifter
        </Button>
      </Card>
      <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-tertiary">
        Every workout, set, PR, coin, and photo is scoped to your account. No
        one else can write to your log.
      </p>
    </div>
  );
}
