// Polish frontend: a compact "last active" time on every sidebar thread row,
// in the spirit of Conductor's thread list ("5m", "2h", "3d", "Nov 2").
//
// The time is an item on bb's thread row metadata line. app.css lifts it
// onto the title line, at the right edge, with bb's own tokens so it suits
// any theme.
import { useEffect, useState } from "react";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import type { ExperimentalThreadRowMetadataProps } from "@get-bb/plugin-sdk/app";
import "./app.css";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** One shared clock for every row, ticking once a minute. */
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function useMinuteClock(): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((tick) => tick + 1);
    listeners.add(listener);
    if (timer === null) {
      timer = setInterval(() => {
        now = Date.now();
        for (const notify of listeners) notify();
      }, MINUTE);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return now;
}

export function compactAge(timestamp: number, current: number): string {
  const age = Math.max(0, current - timestamp);
  if (age < MINUTE) return "now";
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`;
  if (age < DAY) return `${Math.floor(age / HOUR)}h`;
  if (age < 7 * DAY) return `${Math.floor(age / DAY)}d`;
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(current).getFullYear();
  return date.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", year: "2-digit" });
}

function ThreadTime({ thread }: ExperimentalThreadRowMetadataProps) {
  const current = useMinuteClock();
  // Prefer the latest moment that needed the user's attention (a finished
  // turn, a question), else the last update.
  const timestamp = Math.max(thread.latestAttentionAt ?? 0, thread.updatedAt ?? 0);
  if (!timestamp) return null;
  const full = new Date(timestamp).toLocaleString();
  return (
    <span className="polish-thread-time" title={full} aria-label={`Last active ${full}`}>
      {compactAge(timestamp, current)}
    </span>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadRowMetadata({
    id: "time",
    order: 1000,
    component: ThreadTime,
  });
});
