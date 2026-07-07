"use client";

import { useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// NextAuth error codes → human sentences; a failed auth always says why
const ERRORS: Record<string, string> = {
  OAuthSignin: "Couldn't start the Google sign-in. Check the OAuth configuration.",
  OAuthCallback: "Google didn't complete the sign-in. The redirect URI may be wrong.",
  OAuthAccountNotLinked: "That email is already linked to a different sign-in method.",
  AccessDenied: "Access was denied for that account.",
  CredentialsSignin: "The demo sign-in failed. Try again.",
  Configuration: "Auth is misconfigured — NEXTAUTH_SECRET or NEXTAUTH_URL is missing.",
  Default: "Sign-in failed. Try again.",
};

function SignInView() {
  const params = useSearchParams();
  const errorCode = params.get("error");
  const [hasGoogle, setHasGoogle] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    getProviders().then((p) => setHasGoogle(Boolean(p?.google)));
  }, []);

  const start = (provider: string) => {
    setPending(provider);
    // redirect-based flow: failures land back here with ?error=
    signIn(provider, { callbackUrl: "/" }).catch(() => setPending(null));
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-[16px] font-semibold text-primary">
        F
      </span>
      <h1 className="mt-6 text-h1 text-primary">Ferrum</h1>
      <p className="mt-2 text-[14px] text-secondary">Your log. Yours alone.</p>

      {errorCode && (
        <p
          role="alert"
          className="mt-4 w-full rounded-input border border-danger/25 bg-danger/10 px-4 py-2.5 text-[13px] text-danger"
        >
          {ERRORS[errorCode] ?? ERRORS.Default}
        </p>
      )}

      <Card className="mt-6 flex w-full flex-col gap-2 p-5">
        {hasGoogle && (
          <Button
            className="w-full border border-line"
            disabled={pending !== null}
            onClick={() => start("google")}
          >
            {pending === "google" ? "Signing in…" : "Continue with Google"}
          </Button>
        )}
        <Button
          className="w-full border border-line"
          disabled={pending !== null}
          onClick={() => start("demo")}
        >
          {pending === "demo" ? "Signing in…" : "Continue as demo lifter"}
        </Button>
      </Card>
      <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-tertiary">
        Every workout, set, PR, coin, and photo is scoped to your account. No
        one else can write to your log.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInView />
    </Suspense>
  );
}
