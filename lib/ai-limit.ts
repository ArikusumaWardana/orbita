export const AI_DAILY_LIMIT = 30;

function offsetAt(date: Date, timeZone: string) {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = offsetName.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "+" ? 1 : -1) * minutes * 60_000;
}

export function nextDailyReset(now: Date, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  }

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const nextLocalMidnight = Date.UTC(value("year"), value("month") - 1, value("day") + 1);
  return new Date(nextLocalMidnight - offsetAt(new Date(nextLocalMidnight), timeZone));
}

export function dailyLimitState(count: unknown, resetAt: unknown, now: Date, timeZone: string) {
  const nextReset = nextDailyReset(now, timeZone);
  const storedReset = new Date(String(resetAt));
  const storedCount = Number(count);
  const belongsToCurrentDay = Number.isFinite(storedReset.getTime())
    && storedReset > now
    && Math.abs(storedReset.getTime() - nextReset.getTime()) < 60_000;
  const used = belongsToCurrentDay && Number.isFinite(storedCount)
    ? Math.max(0, Math.floor(storedCount))
    : 0;

  return {
    used,
    remaining: Math.max(0, AI_DAILY_LIMIT - used),
    nextReset: nextReset.toISOString(),
  };
}
