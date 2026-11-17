import { expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { filterCrew, formatElapsed, parseCrewFilter } from "./crew-model";
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

it("gives waiting threads precedence over busy state and preserves nesting", () => {
  const crew = [{ thread: thread("waiting", { status: "active", hasPendingInteraction: true }), depth: 2 }, { thread: thread("working", { status: "active" }), depth: 0 }, { thread: thread("idle"), depth: 1 }];
  expect(filterCrew(crew, "needs").map(t => [t.thread.id, t.depth])).toEqual([["waiting", 2]]);
  expect(filterCrew(crew, "working").map(t => t.thread.id)).toEqual(["working"]);
  expect(filterCrew(crew, "settled").map(t => t.thread.id)).toEqual(["idle"]);
  expect(filterCrew(crew, "all")).toHaveLength(3);
  expect(parseCrewFilter("stale")).toBe("all");
});
it("formats elapsed time across minute and hour boundaries and clamps future dates", () => {
  expect(formatElapsed(NOW - 134000, NOW)).toBe("2m 14s");
  expect(formatElapsed(NOW - 3601000, NOW)).toBe("1h 0m 1s");
  expect(formatElapsed(NOW + 1, NOW)).toBe("0m 0s");
});
