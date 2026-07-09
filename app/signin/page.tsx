"use client";

import { useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  OAuthSignin: "Couldn't start the Google sign-in. Check the OAuth configuration.",
  OAuthCallback: "Google didn't complete the sign-in. The redirect URI may be wrong.",
  Configuration: "Auth is misconfigured — NEXTAUTH_SECRET or NEXTAUTH_URL is missing.",
  CredentialsSignin: "Wrong email or password.",
  Default: "Sign-in failed. Try again.",
};

function SignInView() {
  const params = useSearchParams();
  const [hasGoogle, setHasGoogle] = useState(false);
  // auto-detected from the server: real accounts appear the moment a database
  // is connected, with no env flag to flip. Assume no DB until we hear back.
  const [dbEnabled, setDbEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? ERRORS[params.get("error")!] ?? ERRORS.Default : null
  );
  // came back from a signup whose auto-login didn't complete (cold start)
  const [notice, setNotice] = useState<string | null>(
    params.get("created") === "1" ? "Account created — please sign in." : null
  );

  useEffect(() => {
    getProviders().then((p) => setHasGoogle(Boolean(p?.google)));
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setDbEnabled(Boolean(d.dbEnabled)))
      .catch(() => setDbEnabled(false));
  }, []);
  // until we know, don't flash an email form that may vanish — the demo button
  // is always available regardless
  const DEMO_MODE = dbEnabled !== true;

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending("credentials");
    const signingUp = mode === "signup";
    try {
      if (signingUp) {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          setError(error ?? "Couldn't create your account.");
          setPending(null);
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok && !result?.error) {
        window.location.href = "/";
        return;
      }
      // On a cold serverless start the first auth can miss while the DB connection
      // warms. For a fresh signup, retry a couple times (the connection is warm by
      // now) so the user lands straight on the dashboard instead of bouncing.
      if (signingUp) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          await new Promise((r) => setTimeout(r, 1200));
          const retry = await signIn("credentials", { email, password, redirect: false });
          if (retry?.ok && !retry?.error) {
            window.location.href = "/";
            return;
          }
        }
        // still not established — never dead-end: clear "please sign in" prompt
        window.location.href = "/signin?created=1";
        return;
      }
      setError(ERRORS.CredentialsSignin);
      setPending(null);
    } catch {
      if (signingUp) {
        // the account was created before the throw — send them to sign in
        window.location.href = "/signin?created=1";
        return;
      }
      setError("Something went wrong. Try again.");
      setPending(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-1 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-[16px] font-semibold text-primary">
        F
      </span>
      <h1 className="mt-6 text-h1 text-primary">
        {mode === "signup" ? "Create your log" : "Ferrum"}
      </h1>
      <p className="mt-2 text-[14px] text-secondary">Your log. Yours alone.</p>

      {error && (
        <p
          role="alert"
          className="mt-4 w-full rounded-input border border-danger/25 bg-danger/10 px-4 py-2.5 text-[13px] text-danger"
        >
          {error}
        </p>
      )}
      {notice && !error && (
        <p
          role="status"
          className="mt-4 w-full rounded-input border border-success/25 bg-success/10 px-4 py-2.5 text-[13px] text-success"
        >
          {notice}
        </p>
      )}

      <Card className="mt-6 flex w-full flex-col gap-3 p-5">
        {DEMO_MODE ? (
          <p className="text-[12.5px] leading-relaxed text-tertiary">
            Live demo — explore with the seeded account. Connect a database to
            enable real sign-ups and saved logs.
          </p>
        ) : (
        <>
        <form onSubmit={submitCredentials} className="flex flex-col gap-2.5">
          {mode === "signup" && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              aria-label="Name"
              autoComplete="name"
            />
          )}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
            aria-label="Password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
          <Button type="submit" variant="primary" disabled={pending !== null} className="mt-1 w-full">
            {pending === "credentials"
              ? mode === "signup"
                ? "Creating…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
          }}
          className="text-[12.5px] text-tertiary transition-colors hover:text-secondary"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] uppercase tracking-[0.02em] text-tertiary">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        </>
        )}

        {hasGoogle && (
          <Button
            className={cn("w-full border border-line")}
            disabled={pending !== null}
            onClick={() => {
              setPending("google");
              signIn("google", { callbackUrl: "/" });
            }}
          >
            {pending === "google" ? "Signing in…" : "Continue with Google"}
          </Button>
        )}
        <Button
          className="w-full border border-line"
          disabled={pending !== null}
          onClick={() => {
            setPending("demo");
            signIn("demo", { callbackUrl: "/" });
          }}
        >
          {pending === "demo" ? "Signing in…" : "Continue as guest"}
        </Button>
      </Card>
      <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-tertiary">
        Every workout, set, PR, coin, and photo is scoped to your account. No one
        else can write to your log.
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
