import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { bucketOf, childrenByParent, compactAge, descendants, groupThreads, meaningfulBranch, statusPhrase } from "./model";
import { parsePrefs, DEFAULT_PREFS } from "./prefs";

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
  } as PluginSidebarThread;
}

describe("bucketOf", () => {
  it("puts a pending question in Needs you, even on a child", () => {
    expect(bucketOf(thread("a", { hasPendingInteraction: true, parentThreadId: "p" }), NOW)).toBe("needs");
    expect(bucketOf(thread("b", { indicator: "unread-error" }), NOW)).toBe("needs");
  });
  it("puts working threads in progress", () => {
    expect(bucketOf(thread("a", { status: "active" }), NOW)).toBe("running");
    expect(bucketOf(thread("b", { runtimeStatus: "provisioning" }), NOW)).toBe("running");
  });
  it("leaves settled children to their parent", () => {
    expect(bucketOf(thread("a", { parentThreadId: "p", isUnread: true }), NOW)).toBeNull();
  });
  it("splits unread from recent and drops old or archived threads", () => {
    expect(bucketOf(thread("a", { isUnread: true }), NOW)).toBe("ready");
    expect(bucketOf(thread("b"), NOW)).toBe("recent");
    expect(bucketOf(thread("c", { updatedAt: NOW - 30 * 24 * 60 * MIN, latestAttentionAt: 0 }), NOW)).toBeNull();
    expect(bucketOf(thread("d", { isArchived: true, status: "active" }), NOW)).toBeNull();
  });
});

describe("groupThreads", () => {
  it("filters by project and sorts newest first", () => {
    const groups = groupThreads([
      thread("old", { updatedAt: NOW - 50 * MIN, latestAttentionAt: 0 }),
      thread("new", { updatedAt: NOW - 5 * MIN, latestAttentionAt: 0 }),
      thread("other", { projectId: "p2" }),
    ], NOW, "p1");
    expect(groups.recent.map((t) => t.id)).toEqual(["new", "old"]);
  });
});

describe("descendants", () => {
  it("walks children depth first and survives cycles", () => {
    const threads = [
      thread("root"),
      thread("a", { parentThreadId: "root", createdAt: 1 }),
      thread("b", { parentThreadId: "root", createdAt: 2 }),
      thread("a1", { parentThreadId: "a" }),
      thread("loop", { parentThreadId: "loop" }),
    ];
    const list = descendants("root", childrenByParent(threads));
    expect(list.map(({ thread: t, depth }) => `${t.id}:${depth}`)).toEqual(["a:0", "a1:1", "b:0"]);
  });
});

describe("text helpers", () => {
  it("formats ages", () => {
    expect(compactAge(NOW - 10_000, NOW)).toBe("now");
    expect(compactAge(NOW - 5 * MIN, NOW)).toBe("5m");
    expect(compactAge(NOW - 3 * 60 * MIN, NOW)).toBe("3h");
  });
  it("describes status", () => {
    expect(statusPhrase(thread("a", { hasPendingInteraction: true }))).toBe("Needs you");
    expect(statusPhrase(thread("b", { status: "active" }))).toBe("Working");
    expect(statusPhrase(thread("c"))).toBeNull();
  });
  it("hides generated branch names", () => {
    expect(meaningfulBranch("bb/review-error-handling-thr_uvg4exz48s")).toBeNull();
    expect(meaningfulBranch("feature/login")).toBe("feature/login");
    expect(meaningfulBranch(null)).toBeNull();
  });
});

describe("parsePrefs", () => {
  it("falls back on bad input", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{nope")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ layout: "flat", accent: "pink" }))).toEqual({ ...DEFAULT_PREFS, layout: "flat" });
  });
});
