"use client";

import { ArrowRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { DEMO_USER_ID } from "@/lib/owner";

interface CircleRow {
  id: string;
  name: string;
  memberCount: number;
  role: string;
}

function CirclesView() {
  const [circles, setCircles] = useState<CircleRow[] | null>(null);
  const [name, setName] = useState("");
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("join") ?? "");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();
  const isGuest = (session?.user as { id?: string } | undefined)?.id === DEMO_USER_ID;

  const load = () =>
    fetch("/api/circles")
      .then((r) => r.json())
      .then((d) => setCircles(d.circles ?? []))
      .catch(() => setCircles([]));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json();
      toast({ title: "Couldn't create circle", description: error });
      return;
    }
    const { id } = await res.json();
    router.push(`/circles/${id}`);
  };

  const join = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/circles/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json();
      toast({ title: "Couldn't join", description: error });
      return;
    }
    const { id } = await res.json();
    router.push(`/circles/${id}`);
  };

  return (
    <>
      <header>
        <h1 className="text-h1 text-primary">Circles</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-tertiary">
          Private, invite-only accountability pods. You share consistency — who
          trained, how often — not weights. No feed, no likes, no leaderboards.
        </p>
      </header>

      {isGuest ? (
        <Card className="mt-8 p-6 md:p-8">
          <EmptyState
            icon={Users}
            title="Circles need an account"
            hint="Create a free account to start a private circle and invite your training partners. The guest view can't create or join circles."
            action={
              <Link href="/signin">
                <Button variant="primary">Create an account</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="p-5 md:p-6">
          <CardLabel>Create a circle</CardLabel>
          <div className="mt-3 flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Sunday Squad, Gym Bros…"
              aria-label="Circle name"
            />
            <Button variant="primary" onClick={create} disabled={busy}>
              <Plus className="h-4 w-4" aria-hidden />
              Create
            </Button>
          </div>
          <p className="mt-2 text-[12px] text-tertiary">Up to 8 members · invite by private code.</p>
        </Card>

        <Card className="p-5 md:p-6">
          <CardLabel>Join with a code</CardLabel>
          <div className="mt-3 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="5-character invite code"
              aria-label="Invite code"
              className="font-mono tracking-[0.15em]"
            />
            <Button onClick={join} disabled={busy} className="border border-line">
              Join
            </Button>
          </div>
          <p className="mt-2 text-[12px] text-tertiary">
            {params.get("join")
              ? "Invite code filled from your link — tap Join."
              : "Join only by invite — there is no public directory."}
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <CardLabel>Your circles</CardLabel>
        {!circles ? (
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-card" />
            ))}
          </div>
        ) : circles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No circles yet"
            hint="Create one and invite your training partners, or join with a code."
          />
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {circles.map((c) => (
              <Link key={c.id} href={`/circles/${c.id}`}>
                <Card interactive className="flex items-center gap-4 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-secondary">
                    <Users className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-primary">{c.name}</p>
                    <p className="font-mono text-[12px] tabular-nums text-tertiary">
                      {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                      {c.role === "owner" ? " · owner" : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-tertiary" aria-hidden />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </>
  );
}

export default function CirclesPage() {
  return (
    <Suspense fallback={null}>
      <CirclesView />
    </Suspense>
  );
}
