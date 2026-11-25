import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useRpc,
  useSdk,
  type PluginSidebarThread,
  type PluginThreadListProps,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "./components/Icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/Tooltip";
import { InboxRow } from "./InboxRow";
import { ParkedRow } from "./ParkedRow";
import { ProjectPicker } from "./ProjectPicker";
import { ALL_PROJECTS, projectScope, useProjectScope } from "./projectScope";
import { CompactViewportContext } from "./inlineRename";
import { SidebarRow, RowAppearanceContext, type ChildToggle } from "./SidebarRow";
import { ThreadStatus } from "./StatusSlot";
import {
  isIdleApartFromBackgroundCommands,
  useLifecycle,
} from "./useLifecycle";
import { useSettleOnRead } from "./useSettleOnRead";
import { useDecisionConfig } from "./useDecisionConfig";
import { InboxMenu } from "./InboxMenu";
import { useSyncedLayout } from "./useSyncedLayout";
import {
  RowWindowingContext,
  useRowWindowingController,
  WINDOWING_THRESHOLD,
} from "./rowWindowing";
import { muteThread, PushLevelError, unmuteThread } from "./muting";
import { forEachLimited } from "./forEachLimited";
import { ShelfMenu, type ShelfMenuItem } from "./ShelfMenu";
import type { bbSidebarRpcContract } from "./server";
import {
  usePinnedReorder,
  type PinnedReorderRequest,
} from "./usePinnedReorder";
import {
  PinnedSortableList,
  SortablePinnedItem,
  type PinnedDragBindings,
} from "./PinnedSortable";
import {
  childrenByParentId,
  familyRootId,
  summarizeSubtrees,
  filterByProject,
  hideChildrenOfVisibleParents,
  sortPinned,
  searchThreadsByTitle,
  sortByCreatedAtDescending,
  visibleInboxThreads,
} from "./inbox";
import "./sidebar.css";


const ARCHIVE_QUICK_ACTION_KEYS = ["bb--core/archive"] as const;

type ShelfId = "pinned" | "inbox" | "snoozed" | "settled" | "muted";

type ParkedShelfId = "snoozed" | "settled" | "muted";

const PARKED_SHELF_LABELS: Record<ParkedShelfId, string> = {
  snoozed: "Snoozed",
  settled: "Settled",
  muted: "Muted",
};

const MUTED_SHELF_OPEN_ITEM = "muted:open";

const AUTO_ARCHIVE_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1", label: "After 1 day" },
  { value: "3", label: "After 3 days" },
  { value: "7", label: "After 7 days" },
  { value: "14", label: "After 14 days" },
  { value: "30", label: "After 30 days" },
] as const;

const DEFAULT_COLLAPSED_SHELVES: readonly ShelfId[] = ["snoozed", "settled"];

const DEFAULT_LAYOUT = {
  collapsedShelves: DEFAULT_COLLAPSED_SHELVES,
  expandedParents: [],
};

function joinClasses(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

/**
 * The sidebar's scrolling list: one flat, statically ordered stack of rows.
 *
 * The host owns New thread and search; this filters by `searchQuery` and keeps
 * the project filter header above the list plus the parked shelves at the bottom.
 */
export function ThreadInbox({
  activeThreadId,
  onNavigate,
  searchQuery,
  isCompactViewport,
}: PluginThreadListProps) {
  const { status, threads, projects } = useSidebarThreads();
  const lifecycle = useLifecycle(threads);
  const decisionModelName = useDecisionConfig().config?.model;
  const quietNewsNote = `Kept here: ${
    decisionModelName || "the decision model"
  } judged this news can wait`;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const { scope, headerMounts } = useProjectScope();
  const setScope = projectScope.setScope;
  useEffect(() => {
    projectScope.setProjects(projects);
  }, [projects]);
  // The navigation above lines its counts up with this list's right edge.
  // bb's thread-list slot can be narrower than the navigation's (a classic
  // scrollbar gutter on Linux and Windows, none on macOS), so publish it.
  useEffect(() => {
    const el = scrollRef.current?.parentElement;
    if (!el) return;
    const apply = () => projectScope.setListRight(Math.round(el.getBoundingClientRect().right));
    apply();
    window.addEventListener("resize", apply);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(el);
    return () => {
      window.removeEventListener("resize", apply);
      observer?.disconnect();
      projectScope.setListRight(null);
    };
  }, []);
  // The filter starts at All projects each time the list mounts, as before.
  useEffect(() => () => projectScope.setScope(ALL_PROJECTS), []);
  const { collapsedShelves, expandedParents, toggleShelf, toggleParent } =
    useSyncedLayout(DEFAULT_LAYOUT);

  const {
    pinned,
    inbox,
    snoozed,
    settled,
    muted,
    mutedThreadAsks,
    quietNewsCounts,
    childrenById,
    summaries,
    hasDescendantWaitingForYou,
    visibleCount,
  } = useMemo(() => {
    const visible = visibleInboxThreads(threads);
    const scoped = filterByProject(
      visible,
      scope === ALL_PROJECTS ? null : scope,
    );
    const searched = searchThreadsByTitle(scoped, searchQuery);
    const childrenById = childrenByParentId(
      searched.filter((thread) => !thread.isPinned),
    );
    const summaries = summarizeSubtrees(
      visible.filter((thread) => !thread.isPinned),
      (thread) => lifecycle.shelfFor(thread) === "muted",
    );
    const hasDescendantWaitingForYou = (thread: PluginSidebarThread) =>
      summaries.get(thread.id)?.waitingForYou ?? false;
    const matched = hideChildrenOfVisibleParents(searched).filter(
      (thread) => !thread.isPinned,
    );
    const active: typeof matched = [];
    const onSnoozeShelf: typeof matched = [];
    const onSettledShelf: typeof matched = [];
    const onMutedShelf: typeof matched = [];
    for (const thread of matched) {
      const ownShelf = lifecycle.shelfFor(thread);
      const shelf =
        ownShelf !== "active" &&
        ownShelf !== "muted" &&
        hasDescendantWaitingForYou(thread)
          ? "active"
          : ownShelf;
      if (shelf === "snoozed") onSnoozeShelf.push(thread);
      else if (shelf === "settled") onSettledShelf.push(thread);
      else if (shelf === "muted") onMutedShelf.push(thread);
      else active.push(thread);
    }
    const mutedThreadAsks = onMutedShelf.some(
      (thread) =>
        thread.hasPendingInteraction || hasDescendantWaitingForYou(thread),
    );
    const quietNewsCounts = {
      snoozed: onSnoozeShelf.filter(lifecycle.hasQuietNews).length,
      settled: onSettledShelf.filter(lifecycle.hasQuietNews).length,
    };
    return {
      pinned: sortPinned(searched.filter((thread) => thread.isPinned)),
      inbox: sortByCreatedAtDescending(active),
      // Soonest wake first: "what comes back next" is the shelf's question.
      snoozed: [...onSnoozeShelf].sort(
        (left, right) =>
          (lifecycle.wakeAtFor(left) ?? 0) - (lifecycle.wakeAtFor(right) ?? 0),
      ),
      settled: sortByCreatedAtDescending(onSettledShelf),
      muted: sortByCreatedAtDescending(onMutedShelf),
      mutedThreadAsks,
      quietNewsCounts,
      childrenById,
      summaries,
      hasDescendantWaitingForYou,
      visibleCount: visible.length,
    };
  }, [lifecycle, scope, searchQuery, threads]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const windowing = useRowWindowingController(
    scrollRef,
    visibleCount >= WINDOWING_THRESHOLD,
  );

  const isShelfCollapsed = (shelf: ShelfId) =>
    shelf === "muted"
      ? !collapsedShelves.has(MUTED_SHELF_OPEN_ITEM)
      : collapsedShelves.has(shelf);
  const toggleShelfCollapsed = (shelf: ShelfId) =>
    toggleShelf(shelf === "muted" ? MUTED_SHELF_OPEN_ITEM : shelf);

  const parkedShelves = ["snoozed", "settled", "muted"] as const;
  const openDockShelf =
    parkedShelves.find(
      (shelf) =>
        ({ snoozed, settled, muted })[shelf].length > 0 &&
        !isShelfCollapsed(shelf),
    ) ?? null;
  const toggleDockShelf = (shelf: ParkedShelfId) => {
    for (const other of parkedShelves) {
      if (other === shelf || !isShelfCollapsed(other))
        toggleShelfCollapsed(other);
    }
  };
  useEffect(() => {
    if (!openDockShelf) return;
    for (const shelf of parkedShelves) {
      if (shelf !== openDockShelf && !isShelfCollapsed(shelf))
        toggleShelfCollapsed(shelf);
    }
  }, [openDockShelf, collapsedShelves]);
  const dockScrollRef = useRef<HTMLDivElement | null>(null);
  const dockWindowing = useRowWindowingController(
    dockScrollRef,
    visibleCount >= WINDOWING_THRESHOLD,
  );
  useEffect(() => {
    if (!openDockShelf) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented)
        toggleShelfCollapsed(openDockShelf);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [openDockShelf, collapsedShelves]);

  const sdk = useSdk();
  const rpc = useRpc<typeof bbSidebarRpcContract>();
  const restoreParked = (shelf: ParkedShelfId, threadId: string) => {
    if (shelf === "snoozed") lifecycle.unsnooze(threadId);
    else if (shelf === "settled") lifecycle.unsettle(threadId);
    else {
      void unmuteThread(rpc, sdk, threadId).catch((error: unknown) => {
        toast.error(
          error instanceof PushLevelError
            ? error.message
            : "Could not unmute the thread",
        );
      });
    }
  };

  const [isInboxMenuOpen, setIsInboxMenuOpen] = useState(false);
  const settleOnRead = useSettleOnRead();
  const parkableInboxIds = inbox
    .filter(
      (thread) =>
        lifecycle.canPark(thread) && !hasDescendantWaitingForYou(thread),
    )
    .map((thread) => thread.id);

  const parkAll = (
    verb: string,
    park: (threadIds: readonly string[]) => Promise<unknown>,
  ) => {
    const threadIds = parkableInboxIds;
    if (threadIds.length === 0) return;
    const before = lifecycle.snapshot(threadIds);
    void park(threadIds)
      .then(() => {
        toast(
          `${verb} ${threadIds.length} ${threadIds.length === 1 ? "thread" : "threads"}`,
          {
            action: {
              label: "Undo",
              onClick: () =>
                void lifecycle.restore(before).catch(() => undefined),
            },
          },
        );
      })
      .catch(() => {
        toast.error(`Could not ${verb.toLowerCase()} threads`);
      });
  };
  const settleAll = () => parkAll("Settled", lifecycle.settleMany);

  const [openShelfMenu, setOpenShelfMenu] = useState<ParkedShelfId | null>(
    null,
  );

  const countLabel = (count: number) =>
    `${count} ${count === 1 ? "thread" : "threads"}`;

  const runBulk = async (
    describe: (count: number) => string,
    failure: string,
    run: () => Promise<{
      count: number;
      failed: number;
      undo: () => Promise<unknown>;
    }>,
  ) => {
    try {
      const { count, failed, undo } = await run();
      if (failed > 0) {
        toast.error(`${failure}: ${countLabel(failed)} failed`);
      }
      if (count === 0) return;
      toast(describe(count), {
        action: {
          label: "Undo",
          onClick: () => void undo().catch(() => toast.error("Could not undo")),
        },
      });
    } catch {
      toast.error(failure);
    }
  };

  const returnToInbox = (
    threadIds: readonly string[],
    describe: (count: number) => string,
    failure: string,
  ) =>
    void runBulk(describe, failure, async () => {
      const before = lifecycle.snapshot(threadIds);
      await lifecycle.restore(
        threadIds.map((threadId) => ({ threadId, row: null })),
      );
      return {
        count: threadIds.length,
        failed: 0,
        undo: () => lifecycle.restore(before),
      };
    });

  const unmuteAll = (threadIds: readonly string[]) =>
    void runBulk(
      (count) => `Unmuted ${countLabel(count)}`,
      "Could not unmute threads",
      async () => {
        const { succeeded, failed } = await forEachLimited(
          threadIds,
          (threadId) => unmuteThread(rpc, sdk, threadId),
        );
        return {
          count: succeeded.length,
          failed: failed.length,
          undo: () =>
            forEachLimited(succeeded, (threadId) =>
              muteThread(rpc, sdk, threadId),
            ),
        };
      },
    );

  const archiveAll = (threadIds: readonly string[]) =>
    void runBulk(
      (count) => `Archived ${countLabel(count)}`,
      "Could not archive threads",
      async () => {
        const recordsBefore = lifecycle.snapshotAll();
        const archivedIds = new Set<string>();
        const { failed } = await forEachLimited(threadIds, async (threadId) => {
          const result = await sdk.threads.archive({ threadId });
          for (const id of result.archivedThreadIds) archivedIds.add(id);
        });
        const archived = [...archivedIds];
        return {
          count: archived.length,
          failed: failed.length,
          undo: async () => {
            await forEachLimited(archived, (threadId) =>
              sdk.threads.unarchive({ threadId }),
            );
            const records = recordsBefore.filter((entry) =>
              archivedIds.has(entry.threadId),
            );
            if (records.length > 0) await lifecycle.restore(records);
          },
        };
      },
    );

  const shelfMenuItems = (
    shelf: ParkedShelfId,
    threadIds: readonly string[],
  ): ShelfMenuItem[] => {
    if (shelf === "snoozed") {
      return [
        {
          label: "Wake all",
          icon: "ClockArrowUp",
          onSelect: () =>
            returnToInbox(
              threadIds,
              (count) => `Woke ${countLabel(count)}`,
              "Could not wake threads",
            ),
        },
      ];
    }
    if (shelf === "settled") {
      return [
        {
          label: "Archive all",
          icon: "Archive",
          onSelect: () => archiveAll(threadIds),
        },
        {
          label: "Move all to Inbox",
          icon: "ArrowTurnBackward",
          onSelect: () =>
            returnToInbox(
              threadIds,
              (count) => `Moved ${countLabel(count)} to Inbox`,
              "Could not move threads to Inbox",
            ),
        },
      ];
    }
    return [
      {
        label: "Unmute all",
        icon: "polish.unmute",
        onSelect: () => unmuteAll(threadIds),
      },
      {
        label: "Archive all",
        icon: "Archive",
        onSelect: () => archiveAll(threadIds),
      },
    ];
  };
  const snoozeAll = (snoozedUntil: number) =>
    parkAll("Snoozed", (threadIds) =>
      lifecycle.snoozeMany(threadIds, snoozedUntil),
    );

  const inboxIdsRef = useRef<ReadonlySet<string>>(new Set());
  inboxIdsRef.current = new Set(inbox.map((thread) => thread.id));
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const previousActiveRef = useRef(activeThreadId);
  useEffect(() => {
    const left = previousActiveRef.current;
    previousActiveRef.current = activeThreadId;
    const since = settleOnRead.since;
    if (since === null || left === null || left === activeThreadId) return;
    const byId = new Map(
      threadsRef.current.map((thread) => [thread.id, thread]),
    );
    const leftFamily = familyRootId(byId, left);
    if (
      activeThreadId !== null &&
      familyRootId(byId, activeThreadId) === leftFamily
    ) {
      return;
    }
    if (!inboxIdsRef.current.has(leftFamily)) return;
    const root = byId.get(leftFamily);
    if (!root || root.isUnread || root.isPinned) return;
    if (root.lastReadAt === null || root.lastReadAt < since) return;
    if (
      !isIdleApartFromBackgroundCommands(root) ||
      hasDescendantWaitingForYou(root)
    ) {
      return;
    }
    lifecycle.settle(leftFamily);
  }, [activeThreadId]);

  const childToggleFor = (
    thread: PluginSidebarThread,
  ): ChildToggle | undefined =>
    (childrenById.get(thread.id)?.length ?? 0) > 0
      ? {
          count: childrenById.get(thread.id)?.length,
          collapsed: !expandedParents.has(thread.id),
          onToggle: () => toggleParent(thread.id),
        }
      : undefined;

  const statusThreadFor = (thread: PluginSidebarThread) =>
    expandedParents.has(thread.id)
      ? thread
      : (summaries.get(thread.id)?.mostUrgent ?? thread);

  const hasVisibleExpandedChildren = (
    parent: PluginSidebarThread,
    ancestors: ReadonlySet<string>,
  ) =>
    expandedParents.has(parent.id) &&
    (childrenById.get(parent.id)?.some((child) => !ancestors.has(child.id)) ??
      false);

  const renderChildren = (
    parent: PluginSidebarThread,
    depth: number,
    ancestors: ReadonlySet<string>,
    ancestorContinuations: readonly boolean[],
  ): ReactNode => {
    if (!expandedParents.has(parent.id)) return null;
    const children = (childrenById.get(parent.id) ?? []).filter(
      (child) => !ancestors.has(child.id),
    );
    return children.map((child, index) => {
      const isLast = index === children.length - 1;
      const childStatus = statusThreadFor(child);
      const nextAncestors = new Set([...ancestors, child.id]);
      return (
        <Fragment key={child.id}>
          <SidebarRow
            thread={child}
            isActive={child.id === activeThreadId}
            depth={depth}
            lastChild={isLast}
            ancestorContinuations={ancestorContinuations}
            hasExpandedChildren={hasVisibleExpandedChildren(child, nextAncestors)}
            childToggle={childToggleFor(child)}
            lead={<ThreadStatus thread={childStatus} />}
            actions={[]}
            quickActionKeys={ARCHIVE_QUICK_ACTION_KEYS}
            onNavigate={onNavigate}
          />
          {renderChildren(child, depth + 1, nextAncestors, [
            ...ancestorContinuations,
            !isLast,
          ])}
        </Fragment>
      );
    });
  };

  const pinnedIds = useMemo(() => pinned.map((thread) => thread.id), [pinned]);
  const reorderPinned = useCallback(
    (request: PinnedReorderRequest) => sdk.threads.reorderPinned(request),
    [sdk],
  );
  const pinnedReorder = usePinnedReorder(pinnedIds, reorderPinned);
  const orderedPinned = useMemo(() => {
    const byId = new Map(pinned.map((thread) => [thread.id, thread]));
    return pinnedReorder.order.flatMap((id) => {
      const thread = byId.get(id);
      return thread ? [thread] : [];
    });
  }, [pinned, pinnedReorder.order]);

  const renderInboxTree = (
    thread: PluginSidebarThread,
    reorder?: PinnedDragBindings,
  ) => {
    const rootAncestors = new Set([thread.id]);
    return (
      <Fragment key={thread.id}>
        <InboxRow
          thread={thread}
          isActive={thread.id === activeThreadId}
          canPark={
            !thread.isPinned &&
            lifecycle.canPark(thread) &&
            !hasDescendantWaitingForYou(thread)
          }
          onNavigate={onNavigate}
          onSettle={() => lifecycle.settle(thread.id)}
          onSnooze={(until) => lifecycle.snooze(thread.id, until)}
          quickActionKeys={
            thread.isPinned ? ARCHIVE_QUICK_ACTION_KEYS : undefined
          }
          childToggle={childToggleFor(thread)}
          hasExpandedChildren={hasVisibleExpandedChildren(thread, rootAncestors)}
          statusThread={statusThreadFor(thread)}
          reorder={reorder}
        />
        {renderChildren(thread, 1, rootAncestors, [])}
      </Fragment>
    );
  };

  const appearanceValue = useMemo(
    () => ({
      now,
      projects: new Map(
        scope === ALL_PROJECTS
          ? projects.map((project) => [project.id, project.name] as const)
          : [],
      ),
    }),
    [now, projects, scope],
  );

  return (
    <RowAppearanceContext.Provider value={appearanceValue}>
      <CompactViewportContext.Provider value={isCompactViewport}>
        <RowWindowingContext.Provider value={windowing}>
          <TooltipProvider delayDuration={350}>
            <div className="pl-sb">
              {headerMounts === 0 ? (
              <div className="pl-sb-list-header">
                <ProjectPicker
                  value={scope}
                  allValue={ALL_PROJECTS}
                  allLabel="All projects"
                  projects={projects}
                  onChange={setScope}
                />
                {scope !== ALL_PROJECTS ? (
                  <div className="pl-sb-list-actions">
                    <Tooltip delayDuration={350} disableHoverableContent>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Show all projects"
                          onClick={() => setScope(ALL_PROJECTS)}
                          className="pl-sb-icon-btn"
                        >
                          <svg
                            className="pl-sb-icon-btn-glyph"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                          </svg>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Show all projects
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : null}
              </div>
              ) : null}

              <div ref={scrollRef} className="pl-sb-scroll">
                {status === "loading" || !lifecycle.isReady ? null : status ===
                  "error" ? (
                  <p role="status" className="pl-sb-status-msg">
                    Could not load threads.
                  </p>
                ) : pinned.length +
                    inbox.length +
                    snoozed.length +
                    settled.length +
                    muted.length ===
                  0 ? (
                  <p role="status" className="pl-sb-status-msg">
                    {searchQuery.trim() ? "No threads found" : "No threads yet"}
                  </p>
                ) : (
                  <>
                    {pinned.length > 0 ? (
                      <Shelf
                        label="Pinned"
                        count={pinned.length}
                        collapsed={isShelfCollapsed("pinned")}
                        onToggle={() => toggleShelfCollapsed("pinned")}
                      >
                        {isShelfCollapsed("pinned") ? null : (
                          <PinnedSortableList
                            ids={pinnedReorder.order}
                            disabled={orderedPinned.length < 2}
                            onDragEnd={pinnedReorder.handleDragEnd}
                          >
                            {orderedPinned.map((thread) => (
                              <SortablePinnedItem key={thread.id} id={thread.id}>
                                {(dragBindings) =>
                                  renderInboxTree(thread, dragBindings)
                                }
                              </SortablePinnedItem>
                            ))}
                          </PinnedSortableList>
                        )}
                      </Shelf>
                    ) : null}
                    {inbox.length > 0 ? (
                      <Shelf
                        label="Inbox"
                        count={inbox.length}
                        collapsed={isShelfCollapsed("inbox")}
                        onToggle={() => toggleShelfCollapsed("inbox")}
                        actionsOpen={isInboxMenuOpen}
                        actions={
                          <InboxMenu
                            parkableCount={parkableInboxIds.length}
                            settleOnRead={settleOnRead.since !== null}
                            onSettleAll={settleAll}
                            onSnoozeAll={snoozeAll}
                            onSettleOnReadChange={(enabled) =>
                              void settleOnRead
                                .setEnabled(enabled)
                                .catch(() =>
                                  toast.error(
                                    "Could not change Settle after reading",
                                  ),
                                )
                            }
                            onOpenChange={setIsInboxMenuOpen}
                          />
                        }
                      >
                        {isShelfCollapsed("inbox")
                          ? null
                          : inbox.map((thread) => renderInboxTree(thread))}
                      </Shelf>
                    ) : null}
                  </>
                )}
              </div>

              {status === "ready" &&
              lifecycle.isReady &&
              snoozed.length + settled.length + muted.length > 0 ? (
                <RowWindowingContext.Provider value={dockWindowing}>
                  <div
                    ref={dockScrollRef}
                    className="pl-sb-dock"
                    data-shelf-dock=""
                  >
                    {(["snoozed", "settled", "muted"] as const).map((shelf) => {
                      const parked =
                        shelf === "snoozed"
                          ? snoozed
                          : shelf === "settled"
                            ? settled
                            : muted;
                      if (parked.length === 0) return null;
                      return (
                        <Shelf
                          key={shelf}
                          label={PARKED_SHELF_LABELS[shelf]}
                          count={parked.length}
                          collapsed={openDockShelf !== shelf}
                          dock
                          onToggle={() => toggleDockShelf(shelf)}
                          actionsOpen={openShelfMenu === shelf}
                          actions={
                            <ShelfMenu
                              label={PARKED_SHELF_LABELS[shelf]}
                              items={shelfMenuItems(
                                shelf,
                                parked.map((thread) => thread.id),
                              )}
                              choice={
                                shelf === "settled"
                                  ? {
                                      label: "Auto-archive",
                                      icon: "Archive",
                                      value:
                                        settleOnRead.autoArchiveDays === null
                                          ? "never"
                                          : String(settleOnRead.autoArchiveDays),
                                      options: AUTO_ARCHIVE_OPTIONS,
                                      onChange: (value) =>
                                        void settleOnRead
                                          .setAutoArchiveDays(
                                            value === "never"
                                              ? null
                                              : Number(value),
                                          )
                                          .catch(() =>
                                            toast.error(
                                              "Could not change auto-archive",
                                            ),
                                          ),
                                    }
                                  : undefined
                              }
                              onOpenChange={(open) =>
                                setOpenShelfMenu(open ? shelf : null)
                              }
                            />
                          }
                          trailing={
                            shelf === "muted" ? (
                              mutedThreadAsks ? (
                                <span
                                  className="pl-sb-dot pl-sb-dot-needs"
                                  data-status-kind="needs-you"
                                  data-status-indicator="waiting-for-input"
                                  aria-label="A muted thread needs you"
                                />
                              ) : null
                            ) : quietNewsCounts[shelf] > 0 ? (
                              <QuietNewsDot count={quietNewsCounts[shelf]} />
                            ) : null
                          }
                        >
                          {openDockShelf !== shelf
                            ? null
                            : parked.map((thread) => {
                                const rootAncestors = new Set([thread.id]);
                                return (
                                  <Fragment key={thread.id}>
                                    <ParkedRow
                                      thread={thread}
                                      isActive={thread.id === activeThreadId}
                                      shelf={shelf}
                                      wakeAt={lifecycle.wakeAtFor(thread)}
                                      now={now}
                                      onNavigate={onNavigate}
                                      onRestore={() =>
                                        restoreParked(shelf, thread.id)
                                      }
                                      childToggle={childToggleFor(thread)}
                                      hasExpandedChildren={hasVisibleExpandedChildren(
                                        thread,
                                        rootAncestors,
                                      )}
                                      statusThread={statusThreadFor(thread)}
                                      quietNewsNote={
                                        lifecycle.hasQuietNews(thread)
                                          ? quietNewsNote
                                          : undefined
                                      }
                                    />
                                    {renderChildren(thread, 1, rootAncestors, [])}
                                  </Fragment>
                                );
                              })}
                        </Shelf>
                      );
                    })}
                  </div>
                </RowWindowingContext.Provider>
              ) : null}
            </div>
          </TooltipProvider>
        </RowWindowingContext.Provider>
      </CompactViewportContext.Provider>
    </RowAppearanceContext.Provider>
  );
}

function QuietNewsDot({ count }: { count: number }) {
  const description =
    count === 1
      ? "1 thread has news that can wait"
      : `${count} threads have news that can wait`;
  return (
    <Tooltip delayDuration={350} disableHoverableContent>
      <TooltipTrigger asChild>
        <span role="img" aria-label={description} className="pl-sb-quiet-count">
          {count}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{description}</TooltipContent>
    </Tooltip>
  );
}

function Shelf({
  label,
  count,
  collapsed,
  onToggle,
  trailing,
  actions,
  actionsOpen = false,
  dock = false,
  children,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  actions?: ReactNode;
  actionsOpen?: boolean;
  dock?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={dock ? "pl-sb-section-dock" : "pl-sb-section"}
    >
      <h2
        data-has-actions={actions ? "true" : undefined}
        data-open={dock && !collapsed ? "true" : undefined}
        className={joinClasses(
          "bb-sidebar-hover-actions-row pl-sb-shelf-head",
          dock && "pl-sb-shelf-head-dock",
        )}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? `Expand ${label} section` : `Collapse ${label} section`
          }
          onClick={onToggle}
          className="pl-sb-shelf-toggle"
        >
          <span className="pl-sb-shelf-label">{label}</span>
          {!dock ? (
            <Icon
              name="ChevronRight"
              aria-hidden="true"
              className={joinClasses(
                "pl-sb-shelf-chevron",
                !collapsed && "is-open",
              )}
            />
          ) : null}
          <span
            data-sidebar-hover-actions-open={actionsOpen ? "true" : undefined}
            className={joinClasses(
              "pl-sb-shelf-right",
              Boolean(actions) && "bb-sidebar-hover-actions-fade",
            )}
          >
            {trailing ? (
              <span data-shelf-trailing="" className="pl-sb-shelf-trailing">
                {trailing}
              </span>
            ) : null}
            <span className="pl-sb-shelf-count">{count}</span>
          </span>
        </button>
        {actions ? (
          <span
            data-sidebar-hover-actions-open={actionsOpen ? "true" : undefined}
            className="bb-sidebar-hover-actions pl-sb-shelf-actions"
          >
            {actions}
          </span>
        ) : null}
      </h2>
      {collapsed ? null : (
        <ul className={joinClasses("pl-sb-list", dock && "pl-sb-list-dock")}>
          {children}
        </ul>
      )}
    </section>
  );
}
