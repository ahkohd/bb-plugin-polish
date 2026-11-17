// Sorting threads into the Overview's groups. Pure functions, no React.
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export type Bucket = "needs" | "running" | "ready" | "recent";

export const BUCKET_ORDER: readonly Bucket[] = ["needs", "running", "ready", "recent"];

export const BUCKET_LABELS: Record<Bucket, string> = {
  needs: "Needs you",
  running: "In progress",
  ready: "Ready for review",
  recent: "Recent",
};

const NEEDS_INDICATORS = new Set(["waiting-for-input", "queued-failed", "unread-error"]);
const BUSY_STATUSES = new Set(["active", "pending", "starting", "stopping", "provisioning", "waiting-for-host"]);
const BUSY_INDICATORS = new Set(["runtime", "background-agent", "background-command", "workflow"]);

const DAY = 24 * 60 * 60 * 1000;
export const RECENT_WINDOW = 7 * DAY;

export function needsYou(thread: PluginSidebarThread): boolean {
  return thread.hasPendingInteraction || NEEDS_INDICATORS.has(thread.indicator);
}

export function isBusy(thread: PluginSidebarThread): boolean {
  return BUSY_STATUSES.has(thread.runtimeStatus) || BUSY_STATUSES.has(thread.status)
    || BUSY_INDICATORS.has(thread.indicator);
}

/**
 * The group a thread belongs in. Child threads show up only while they need
 * the user or are working; settled ones are counted on their parent instead.
 */
export function bucketOf(thread: PluginSidebarThread, now: number): Bucket | null {
  if (thread.isArchived || thread.isHidden) return null;
  if (needsYou(thread)) return "needs";
  if (isBusy(thread)) return "running";
  if (thread.parentThreadId !== null) return null;
  if (thread.isUnread) return "ready";
  if (now - lastActive(thread) <= RECENT_WINDOW) return "recent";
  return null;
}

export function lastActive(thread: PluginSidebarThread): number {
  return Math.max(thread.latestAttentionAt ?? 0, thread.updatedAt ?? 0);
}

export function groupThreads(
  threads: readonly PluginSidebarThread[],
  now: number,
  projectId: string | null,
): Record<Bucket, PluginSidebarThread[]> {
  const groups: Record<Bucket, PluginSidebarThread[]> = { needs: [], running: [], ready: [], recent: [] };
  for (const thread of threads) {
    if (projectId !== null && thread.projectId !== projectId) continue;
    const bucket = bucketOf(thread, now);
    if (bucket) groups[bucket].push(thread);
  }
  for (const bucket of BUCKET_ORDER) {
    groups[bucket].sort((a, b) => lastActive(b) - lastActive(a));
  }
  return groups;
}

/** Map of parent id to its live (not archived, not hidden) children. */
export function childrenByParent(
  threads: readonly PluginSidebarThread[],
): Map<string, PluginSidebarThread[]> {
  const map = new Map<string, PluginSidebarThread[]>();
  for (const thread of threads) {
    if (!thread.parentThreadId || thread.isArchived || thread.isHidden) continue;
    const list = map.get(thread.parentThreadId);
    if (list) list.push(thread);
    else map.set(thread.parentThreadId, [thread]);
  }
  for (const list of map.values()) list.sort((a, b) => a.createdAt - b.createdAt);
  return map;
}

/** Depth-first descendants of a thread, each with its depth below it. */
export function descendants(
  rootId: string,
  children: Map<string, PluginSidebarThread[]>,
): { thread: PluginSidebarThread; depth: number }[] {
  const out: { thread: PluginSidebarThread; depth: number }[] = [];
  const seen = new Set<string>([rootId]);
  const walk = (id: string, depth: number) => {
    for (const child of children.get(id) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push({ thread: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(rootId, 0);
  return out;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function compactAge(timestamp: number, now: number): string {
  const age = Math.max(0, now - timestamp);
  if (age < MINUTE) return "now";
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`;
  if (age < DAY) return `${Math.floor(age / HOUR)}h`;
  if (age < 7 * DAY) return `${Math.floor(age / DAY)}d`;
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", year: "2-digit" });
}

/** A short phrase for what a thread is doing, for the Crew tab; null when it
 *  is simply idle. */
export function statusPhrase(thread: PluginSidebarThread): string | null {
  if (thread.hasPendingInteraction || thread.indicator === "waiting-for-input") return "Needs you";
  if (thread.indicator === "queued-failed") return "Message failed";
  if (thread.indicator === "unread-error" || thread.status === "error") return "Failed";
  if (thread.runtimeStatus === "provisioning") return "Setting up";
  if (thread.runtimeStatus === "waiting-for-host") return "Waiting for machine";
  if (isBusy(thread)) return "Working";
  if (thread.isUnread) return "Finished";
  return null;
}

/** bb names worktree branches after the thread ("bb/fix-x-thr_abc123"); those
 *  repeat the title, so only show branches a person named. */
export function meaningfulBranch(branch: string | null | undefined): string | null {
  if (!branch) return null;
  if (/thr_[a-z0-9]+$/i.test(branch)) return null;
  return branch;
}

/** Threads waiting on the user, the longest-waiting first. */
export function waitingOnYou(threads: readonly PluginSidebarThread[]): PluginSidebarThread[] {
  return threads
    .filter((thread) => !thread.isArchived && !thread.isHidden && needsYou(thread))
    .sort((a, b) => lastActive(a) - lastActive(b));
}

/** The next thread to visit after the open one, wrapping round. */
export function nextNeedingYou(
  threads: readonly PluginSidebarThread[],
  currentThreadId: string | null,
): PluginSidebarThread | null {
  const waiting = waitingOnYou(threads);
  if (waiting.length === 0) return null;
  const index = waiting.findIndex((thread) => thread.id === currentThreadId);
  if (index === -1) return waiting[0] ?? null;
  if (waiting.length === 1) return waiting[0] ?? null;
  return waiting[(index + 1) % waiting.length] ?? null;
}
