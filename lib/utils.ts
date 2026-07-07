export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Epley estimated 1RM, rounded to 0.5 kg. */
export function e1rm(weight: number, reps: number) {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 2) / 2;
}

export function setVolume(weight: number, reps: number) {
  return weight * reps;
}

export function formatInt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function formatKg(n: number) {
  return `${formatInt(n)} kg`;
}

export function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return formatInt(n);
}

export function formatWeight(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---- dates (local time, ISO yyyy-mm-dd keys) ----

export function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday-based start of week. */
export function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -day);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatShort(key: string) {
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatLong(key: string) {
  const d = fromKey(key);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function monthYearLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function isSameDay(a: Date, b: Date) {
  return toKey(a) === toKey(b);
}

let idCounter = 0;
export function uid(prefix = "id") {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}
