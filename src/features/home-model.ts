import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { isBusy, lastActive } from "../model";

export function dayBuckets(threads: readonly Pick<PluginSidebarThread, "createdAt">[], now: number) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, index) => {
    const start = new Date(today);
    start.setDate(start.getDate() - 13 + index);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = threads.filter(t => t.createdAt >= +start && t.createdAt < +end).length;
    const label = `${start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}: ${count} ${count === 1 ? "thread" : "threads"}`;
    return { timestamp: +start, count, label, today: index === 13 };
  });
}

export function rankProjects(threads: readonly PluginSidebarThread[]) {
  const projects = new Map<string, { id: string; count: number; active: number; working: boolean }>();
  for (const thread of threads) {
    if (thread.isArchived || thread.isHidden) continue;
    const project = projects.get(thread.projectId) ?? { id: thread.projectId, count: 0, active: 0, working: false };
    project.count++;
    project.active = Math.max(project.active, lastActive(thread));
    project.working ||= isBusy(thread);
    projects.set(project.id, project);
  }
  return [...projects.values()].sort((a, b) => b.active - a.active || a.id.localeCompare(b.id)).slice(0, 6);
}
