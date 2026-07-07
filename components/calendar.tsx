import { cn, monthYearLabel, toKey } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Quiet month view — an emerald dot marks a logged day. */
export function Calendar({
  logged,
  onDay,
}: {
  logged: Set<string>;
  onDay?: (key: string, isLogged: boolean) => void;
}) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const todayKey = toKey(now);

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <p className="text-label uppercase tracking-[0.02em] text-tertiary">
        {monthYearLabel(now)}
      </p>
      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] text-tertiary" aria-hidden>
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;
          const key = toKey(new Date(now.getFullYear(), now.getMonth(), day));
          const isToday = key === todayKey;
          const isLogged = logged.has(key);
          const isFuture = key > todayKey;
          const clickable = Boolean(onDay) && !isFuture;
          const Tag = clickable ? "button" : "span";
          return (
            <Tag
              key={key}
              onClick={clickable ? () => onDay?.(key, isLogged) : undefined}
              aria-label={
                isLogged
                  ? `${key}, workout logged — open it`
                  : clickable
                    ? `${key}, no workout — start one`
                    : key
              }
              className={cn(
                "mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg font-mono text-[13px] tabular-nums",
                isToday && "border border-line-hover bg-ink/[0.04] text-primary",
                !isToday && (isFuture ? "text-tertiary/60" : "text-secondary"),
                clickable &&
                  "transition-colors duration-150 hover:bg-ink/[0.06] hover:text-primary"
              )}
            >
              {day}
              <span
                className={cn(
                  "mt-0.5 h-1 w-1 rounded-full",
                  isLogged ? "bg-success" : "bg-transparent"
                )}
                aria-hidden
              />
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
