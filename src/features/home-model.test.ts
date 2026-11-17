import { expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { dayBuckets, rankProjects } from "./home-model";
const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);
const MIN = 60_000;

function thread(id: string, patch: Partial<PluginSidebarThread> = {}): PluginSidebarThread {
  return {
    id,
    projectId: "p1",
    title: id,
    titleFallback: null,
    displayTitle: id,
    parentThreadId: null,
    lifecycleOwnerThreadId: null,
    parentNotifications: "auto",
    sourceThreadId: null,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    providerId: "claude-code",
    status: "idle",
    runtimeStatus: "idle",
    queuedWork: "none",
    hasPendingInteraction: false,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 },
    indicator: "none",
    indicatorLabel: null,
    isUnread: false,
    isPinned: false,
    pinnedAt: null,
    pinSortKey: null,
    isArchived: false,
    archivedAt: null,
    href: `/projects/p1/threads/${id}`,
    isHidden: false,
    environment: null,
    host: null,
    createdAt: NOW - 60 * MIN,
    updatedAt: NOW - 10 * MIN,
    lastReadAt: null,
    latestAttentionAt: NOW - 10 * MIN,
    ...patch,
  };
}

it("buckets local calendar days, including empty days and midnight boundaries", () => {
  const today = new Date(2026, 10, 17).getTime();
  const days = dayBuckets([{ createdAt: today }, { createdAt: today - 1 }, { createdAt: today + 86400000 }], today + 1000);
  expect(days).toHaveLength(14);
  expect(days[13]?.count).toBe(1);
  expect(days[12]?.count).toBe(1);
  expect(days[0]?.count).toBe(0);
  expect(days[13]?.today).toBe(true);
  expect(days[13]?.label).toContain("1 thread");
});
it("ranks live projects by latest activity, counts them and caps at six", () => {
  const threads = Array.from({ length: 8 }, (_, i) => thread(String(i), { projectId: String(i), updatedAt: NOW + i }));
  threads.push(thread("busy", { projectId: "7", status: "active", updatedAt: NOW + 20 }));
  threads.push(thread("hidden", { projectId: "hidden", isHidden: true, updatedAt: NOW + 30 }));
  const ranked = rankProjects(threads);
  expect(ranked).toHaveLength(6);
  expect(ranked[0]).toMatchObject({ id: "7", count: 2, working: true });
  expect(ranked.some(p => p.id === "hidden")).toBe(false);
});
