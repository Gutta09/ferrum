"use client";

import { Clock, Flame, Medal, Trophy, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { CoinVault } from "@/components/coin";
import { ConsistencyCard } from "@/components/consistency";
import { Physique } from "@/components/physique";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Menu } from "@/components/ui/menu";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { exportCSV, exportJSON, importJSON } from "@/lib/export";
import { activeUserId } from "@/lib/owner";
import {
  activePlaylist,
  addPlaylist,
  myPlaylists,
  parsePlaylistUrl,
  removePlaylist,
  setActivePlaylist,
  usePlaylistStore,
} from "@/lib/playlists";
import { getExercise, statsRepo } from "@/lib/repo";
import { PROFILE } from "@/lib/seed";
import { updateSettings, useSettings } from "@/lib/settings";
import {
  duplicateTemplate,
  removeTemplate,
  renameTemplate,
  useTemplates,
} from "@/lib/templates";
import type { LifetimeStats } from "@/lib/types";
import { cn, formatInt } from "@/lib/utils";

interface Badge {
  icon: LucideIcon;
  title: string;
  desc: string;
  earned: boolean;
}

export default function ProfilePage() {
  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [streak, setStreak] = useState(0);
  const { data: authSession } = useSession();
  const displayName = authSession?.user?.name ?? PROFILE.name;
  const email = authSession?.user?.email;

  useEffect(() => {
    let alive = true;
    Promise.all([statsRepo.lifetime(), statsRepo.streakWeeks()]).then(([s, st]) => {
      if (!alive) return;
      setStats(s);
      setStreak(st);
    });
    return () => {
      alive = false;
    };
  }, []);

  const badges: Badge[] = stats
    ? [
        {
          icon: Medal,
          title: "100k Club",
          desc: "100,000 kg lifetime volume",
          earned: stats.volume >= 100_000,
        },
        {
          icon: Flame,
          title: "Eight Straight",
          desc: "8-week training streak",
          earned: streak >= 8,
        },
        {
          icon: Trophy,
          title: "PR Hunter",
          desc: "20 personal records",
          earned: stats.prs >= 20,
        },
        {
          icon: Clock,
          title: "Iron Hours",
          desc: "40 hours under the bar",
          earned: stats.hours >= 40,
        },
      ]
    : [];

  return (
    <>
      <header className="flex items-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-card text-[22px] font-semibold text-primary">
          {displayName[0]}
        </span>
        <div>
          <h1 className="text-h1 text-primary">{displayName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-tertiary">
            {email && <span>{email}</span>}
            <span>Training since {PROFILE.since}</span>
            <Pill>{PROFILE.program}</Pill>
          </div>
        </div>
      </header>

      <section className="mt-10" aria-label="Lifetime stats">
        <CardLabel>Lifetime</CardLabel>
        <div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {!stats
            ? Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[104px] rounded-card" />
              ))
            : (
                <>
                  {/* the coin vault IS the workout count — one coin per day showed up */}
                  <Card className="flex items-center p-5">
                    <CoinVault total={stats.workouts} />
                  </Card>
                  {[
                    { label: "Personal records", value: formatInt(stats.prs) },
                    { label: "Sets logged", value: formatInt(stats.sets) },
                    { label: "Hours trained", value: formatInt(stats.hours) },
                  ].map((s) => (
                    <Card key={s.label} className="p-5">
                      <CardLabel>{s.label}</CardLabel>
                      <p className="mt-2.5 font-mono text-[24px] font-medium tabular-nums text-primary">
                        {s.value}
                      </p>
                    </Card>
                  ))}
                </>
              )}
        </div>
      </section>

      <div className="mt-10">
        <ConsistencyCard weeks={26} />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <section aria-label="Favorite exercises">
          <CardLabel>Favorite exercises</CardLabel>
          <Card className="mt-4 divide-y divide-line">
            {!stats ? (
              <Skeleton className="m-5 h-[132px]" />
            ) : (
              stats.favorites.map((f, i) => (
                <div key={f.exercise.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="w-5 text-center font-mono text-[13px] tabular-nums text-tertiary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-primary">
                      {f.exercise.name}
                    </p>
                    <p className="text-[12px] text-tertiary">{f.exercise.muscle}</p>
                  </div>
                  <span className="font-mono text-[13px] tabular-nums text-secondary">
                    {f.sessions} <span className="text-tertiary">sessions</span>
                  </span>
                </div>
              ))
            )}
          </Card>
        </section>

        <section aria-label="Achievements">
          <CardLabel>Achievements</CardLabel>
          <div className="mt-4 grid grid-cols-2 gap-5">
            {(stats ? badges : []).map((b) => (
              <Card
                key={b.title}
                className={cn("p-5", !b.earned && "opacity-40")}
                aria-label={`${b.title}${b.earned ? "" : " (not yet earned)"}`}
              >
                <b.icon className="h-5 w-5 text-secondary" aria-hidden />
                <p className="mt-3 text-[14px] font-semibold text-primary">{b.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-tertiary">{b.desc}</p>
              </Card>
            ))}
            {!stats &&
              Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-card" />
              ))}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <Physique />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <TemplatesSection />
        <SettingsSection />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function TemplateName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const commit = () => {
    setEditing(false);
    const n = draft.trim();
    if (n && n !== name) onRename(n);
    else setDraft(name);
  };
  return editing ? (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(name);
          setEditing(false);
        }
      }}
      aria-label="Template name"
      className="rounded-md bg-ink/[0.05] px-1.5 text-[14px] font-medium text-primary focus:outline-none"
    />
  ) : (
    <button
      onClick={() => setEditing(true)}
      title="Rename template"
      className="-mx-1.5 truncate rounded-md px-1.5 text-left text-[14px] font-medium text-primary transition-colors hover:bg-ink/[0.05]"
    >
      {draft}
    </button>
  );
}

function TemplatesSection() {
  const templates = useTemplates().filter((t) => t.userId === activeUserId());
  const router = useRouter();
  return (
    <section aria-label="Routine templates">
      <CardLabel>Templates</CardLabel>
      <Card className="mt-4 divide-y divide-line">
        {templates.length === 0 && (
          <p className="px-5 py-8 text-center text-[13px] text-tertiary">
            Finish a workout and save it as a template.
          </p>
        )}
        {templates.map((t) => {
          const muscles = [
            ...new Set(
              t.exercises
                .map((e) => getExercise(e.exerciseId)?.muscle)
                .filter((m): m is NonNullable<typeof m> => Boolean(m))
            ),
          ].slice(0, 2);
          return (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <TemplateName name={t.name} onRename={(n) => renameTemplate(t.id, n)} />
                <p className="text-[12px] text-tertiary">
                  {t.exercises.length} exercises
                </p>
              </div>
              {muscles.map((m) => (
                <Pill key={m} className="hidden sm:inline-flex">
                  {m}
                </Pill>
              ))}
              <Button size="sm" onClick={() => router.push(`/workout?template=${t.id}`)}>
                Start
              </Button>
              <Menu
                ariaLabel={`${t.name} options`}
                items={[
                  { label: "Duplicate", onSelect: () => duplicateTemplate(t.id) },
                  { label: "Delete", danger: true, onSelect: () => removeTemplate(t.id) },
                ]}
              />
            </div>
          );
        })}
      </Card>
    </section>
  );
}

function PlaylistsRow() {
  const store = usePlaylistStore();
  const mine = myPlaylists(store);
  const activeId = activePlaylist(store)?.id;
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState(false);

  const add = () => {
    const parsed = parsePlaylistUrl(draft);
    if (!parsed) return setErr(true);
    addPlaylist(parsed);
    setDraft("");
    setErr(false);
  };

  return (
    <div className="px-5 py-4">
      <p className="text-[14px] font-medium text-primary">Playlists</p>
      <p className="text-[12px] text-tertiary">
        The active one drives the now-playing pill while you log.
      </p>
      {mine.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {mine.map((pl) => (
            <div key={pl.id} className="flex items-center gap-2.5">
              <button
                onClick={() => setActivePlaylist(pl.id)}
                aria-label={`Make ${pl.label} the active playlist`}
                aria-pressed={pl.id === activeId}
                className="flex h-7 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-ink/[0.05]"
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full border",
                    pl.id === activeId
                      ? "border-success bg-success"
                      : "border-line-hover bg-transparent"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "max-w-[220px] truncate text-[13px]",
                    pl.id === activeId ? "text-primary" : "text-secondary"
                  )}
                >
                  {pl.label}
                </span>
              </button>
              <button
                onClick={() => removePlaylist(pl.id)}
                aria-label={`Remove ${pl.label}`}
                className="rounded-md p-1 text-tertiary transition-colors hover:text-danger"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setErr(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Spotify or Apple Music link…"
          aria-label="New playlist URL"
          className="h-9 flex-1 font-mono text-[12.5px]"
        />
        <Button size="sm" className="border border-line" onClick={add}>
          Add
        </Button>
      </div>
      {err && (
        <p className="mt-1.5 text-[12px] text-danger">
          That doesn&apos;t look like a Spotify or Apple Music link.
        </p>
      )}
    </div>
  );
}

function SettingsSection() {
  const settings = useSettings();
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement>(null);
  return (
    <section aria-label="Settings">
      <CardLabel>Settings</CardLabel>
      <Card className="mt-4 divide-y divide-line">
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-primary">Rest timer</p>
            <p className="text-[12px] text-tertiary">Default seconds between sets</p>
          </div>
          <Segmented
            options={["60", "90", "120", "180"]}
            value={String(settings.restSeconds)}
            onChange={(v) => updateSettings({ restSeconds: Number(v) })}
            ariaLabel="Rest duration presets"
          />
          <div className="w-20">
            <NumberStepper
              value={settings.restSeconds}
              step={15}
              min={15}
              max={600}
              ariaLabel="Custom rest seconds"
              onChange={(v) => updateSettings({ restSeconds: v ?? 120 })}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-primary">Plate math</p>
            <p className="text-[12px] text-tertiary">Bar weight for the plate calculator</p>
          </div>
          <div className="w-20">
            <NumberStepper
              value={settings.barWeight}
              step={settings.unit === "kg" ? 2.5 : 5}
              ariaLabel="Bar weight"
              onChange={(v) => updateSettings({ barWeight: v ?? 0 })}
            />
          </div>
          <Segmented
            options={["kg", "lb"] as const}
            value={settings.unit}
            onChange={(unit) => updateSettings({ unit })}
            ariaLabel="Weight unit"
          />
        </div>
        <PlaylistsRow />
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-primary">Your data</p>
            <p className="text-[12px] text-tertiary">It leaves and returns whole</p>
          </div>
          <Button size="sm" onClick={exportJSON}>
            Export JSON
          </Button>
          <Button size="sm" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button size="sm" onClick={() => importRef.current?.click()}>
            Import
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const n = await importJSON(f);
                toast({
                  tone: "success",
                  title: `Imported ${n} workout${n === 1 ? "" : "s"}`,
                  description: n === 0 ? "Nothing new in that file" : undefined,
                });
              } catch {
                toast({ title: "Import failed", description: "Not a Ferrum export" });
              }
            }}
          />
        </div>
      </Card>
    </section>
  );
}
