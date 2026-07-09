"use client";

import { ArrowLeft, Check, Copy, LogOut } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { aiCircleDigest } from "@/lib/ai/client";
import { cn, formatShort, formatWeight } from "@/lib/utils";

interface MemberView {
  name: string;
  isYou: boolean;
  role: string;
  streakWeeks?: number;
  activeDays?: number;
  last14?: boolean[];
  lastActivity?: { name: string; date: string; exercises: number };
  topSet?: { weight: number; reps: number; exercise: string };
  recentPR?: { exercise: string; e1rm: number };
}
interface CircleView {
  id: string;
  name: string;
  inviteCode: string;
  memberCap: number;
  youAreOwner: boolean;
  myShare: {
    shareConsistency: boolean;
    shareActivity: boolean;
    shareWeights: boolean;
    sharePRs: boolean;
  };
  members: MemberView[];
  challenge: null | {
    name: string;
    startDate: string;
    endDate: string;
    targetPerWeek: number;
    active: boolean;
    rows: { name: string; sessions: number; target: number }[];
  };
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="flex w-full items-center gap-3 py-2.5 text-left"
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
          on ? "bg-success/80" : "bg-ink/[0.12]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-150",
            on ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] text-primary">{label}</span>
        {hint && <span className="block text-[12px] text-tertiary">{hint}</span>}
      </span>
    </button>
  );
}

export default function CirclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<CircleView | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [sort, setSort] = useState<"consistency" | "recency">("consistency");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/circles/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d.circle))
      .catch(() => setError(true));
    fetch(`/api/circles/${id}/digest`)
      .then((r) => r.json())
      .then((d) => aiCircleDigest(d.facts ?? []))
      .then((line) => setDigest(line || null))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setShare = async (patch: Partial<CircleView["myShare"]>) => {
    if (!data) return;
    setData({ ...data, myShare: { ...data.myShare, ...patch } });
    await fetch(`/api/circles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load(); // re-pull so the board reflects the new visibility
  };

  const leave = async () => {
    await fetch(`/api/circles/${id}`, { method: "DELETE" });
    toast({ tone: "success", title: "Left the circle" });
    router.push("/circles");
  };

  const startChallenge = async () => {
    await fetch(`/api/circles/${id}/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "30-day consistency", days: 30, targetPerWeek: 4 }),
    });
    toast({ tone: "success", title: "Challenge started", description: "30 days · 4×/week" });
    load();
  };

  const copyInvite = () => {
    if (!data) return;
    const url = `${window.location.origin}/circles?join=${encodeURIComponent(data.inviteCode)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (error)
    return (
      <div className="pt-16 text-center">
        <p className="text-[15px] text-primary">You&apos;re not in this circle.</p>
        <Link href="/circles" className="mt-3 inline-block text-[13px] text-secondary hover:text-primary">
          Back to circles
        </Link>
      </div>
    );

  if (!data)
    return (
      <div className="flex flex-col gap-5 pt-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );

  const members = [...data.members];
  if (sort === "recency")
    members.sort((a, b) => (b.lastActivity?.date ?? "").localeCompare(a.lastActivity?.date ?? ""));

  return (
    <>
      <Link href="/circles" className="inline-flex items-center gap-1.5 text-[13px] text-tertiary transition-colors hover:text-secondary">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Circles
      </Link>

      <header className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">{data.name}</h1>
          <p className="mt-1 font-mono text-[12.5px] tabular-nums text-tertiary">
            {data.members.length}/{data.memberCap} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyInvite}
            className="flex items-center gap-2 rounded-input border border-line bg-surface px-3 py-2 font-mono text-[13px] tracking-[0.12em] text-primary transition-colors hover:border-line-hover"
            aria-label="Copy invite link"
          >
            {data.inviteCode}
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5 text-tertiary" aria-hidden />
            )}
          </button>
          <Button variant="danger" size="sm" onClick={leave} aria-label="Leave circle">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            {data.youAreOwner ? "Dissolve" : "Leave"}
          </Button>
        </div>
      </header>

      {digest && (
        <Card className="mt-6 p-5">
          <CardLabel>This week</CardLabel>
          <p className="mt-2 text-[13.5px] text-secondary">{digest}</p>
        </Card>
      )}

      {/* challenge */}
      <Card className="mt-5 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <CardLabel>Challenge</CardLabel>
          {!data.challenge && data.youAreOwner && (
            <Button size="sm" onClick={startChallenge} className="border border-line">
              Start 30-day
            </Button>
          )}
        </div>
        {data.challenge ? (
          <div className="mt-3">
            <p className="text-[14px] font-medium text-primary">{data.challenge.name}</p>
            <p className="font-mono text-[12px] tabular-nums text-tertiary">
              {formatShort(data.challenge.startDate)} – {formatShort(data.challenge.endDate)} ·{" "}
              {data.challenge.targetPerWeek}×/week · {data.challenge.active ? "active" : "ended"}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {data.challenge.rows.map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-[13px] text-secondary">{r.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div
                      className="h-full rounded-full bg-success/70"
                      style={{ width: `${Math.min(100, (r.sessions / r.target) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-[12px] tabular-nums text-primary">
                    {r.sessions}/{r.target}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] text-tertiary">Framed around showing up — not out-lifting anyone.</p>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-tertiary">
            No active challenge. {data.youAreOwner ? "Start a time-boxed one above." : "The owner can start one."}
          </p>
        )}
      </Card>

      {/* status board */}
      <div className="mt-5 flex items-center justify-between">
        <CardLabel>Members</CardLabel>
        <Segmented
          options={[
            { value: "consistency", label: "Consistency" },
            { value: "recency", label: "Recent" },
          ]}
          value={sort}
          onChange={setSort}
          ariaLabel="Sort members"
        />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {members.map((m, i) => (
          <Card key={i} className="p-4 md:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-semibold text-secondary">
                {m.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-primary">
                  {m.name}
                  {m.isYou && <span className="ml-1.5 text-[12px] text-tertiary">(you)</span>}
                  {m.role === "owner" && <span className="ml-1.5 text-[12px] text-tertiary">· owner</span>}
                </p>
                {m.lastActivity ? (
                  <p className="truncate text-[12.5px] text-tertiary">
                    {m.lastActivity.name} · {m.lastActivity.exercises} exercises · {formatShort(m.lastActivity.date)}
                  </p>
                ) : (
                  <p className="text-[12.5px] text-tertiary">Activity not shared</p>
                )}
              </div>
              {m.streakWeeks !== undefined && (
                <div className="text-right">
                  <p className="font-mono text-[15px] font-medium tabular-nums text-primary">
                    {m.streakWeeks}w
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.02em] text-tertiary">streak</p>
                </div>
              )}
            </div>

            {m.last14 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.02em] text-tertiary">14d</span>
                <div className="flex gap-1">
                  {m.last14.map((on, d) => (
                    <span
                      key={d}
                      className={cn("h-3 w-3 rounded-[3px]", on ? "bg-success/70" : "bg-ink/[0.06]")}
                    />
                  ))}
                </div>
                {m.activeDays !== undefined && (
                  <span className="ml-auto font-mono text-[12px] tabular-nums text-tertiary">
                    {m.activeDays} active days
                  </span>
                )}
              </div>
            )}

            {(m.topSet || m.recentPR) && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 font-mono text-[12px] tabular-nums text-secondary">
                {m.topSet && (
                  <span>
                    Top: {formatWeight(m.topSet.weight)}kg × {m.topSet.reps}{" "}
                    <span className="text-tertiary">{m.topSet.exercise}</span>
                  </span>
                )}
                {m.recentPR && (
                  <span className="text-gold">
                    PR {formatWeight(m.recentPR.e1rm)}kg <span className="opacity-70">{m.recentPR.exercise}</span>
                  </span>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* my privacy panel */}
      <Card className="mt-5 p-5 md:p-6">
        <CardLabel>What you share</CardLabel>
        <p className="mt-1 text-[12.5px] text-tertiary">
          Conservative by default — consistency and activity type, never your weights or PRs unless you turn them on.
        </p>
        <div className="mt-3 divide-y divide-line">
          <Toggle
            label="Consistency"
            hint="Streak, active days, the 14-day grid"
            on={data.myShare.shareConsistency}
            onChange={(v) => setShare({ shareConsistency: v })}
          />
          <Toggle
            label="Activity type"
            hint="What you trained and when — not the numbers"
            on={data.myShare.shareActivity}
            onChange={(v) => setShare({ shareActivity: v })}
          />
          <Toggle
            label="Weights"
            hint="Your top set — off by default"
            on={data.myShare.shareWeights}
            onChange={(v) => setShare({ shareWeights: v })}
          />
          <Toggle
            label="Personal records"
            hint="Your PRs — off by default"
            on={data.myShare.sharePRs}
            onChange={(v) => setShare({ sharePRs: v })}
          />
        </div>
      </Card>
    </>
  );
}
