import * as bbApp from "@get-bb/plugin-sdk/app";
import {
  experimental_Icon as BbIcon,
  experimental_ThreadActionsContextMenu as ThreadActionsContextMenu,
  experimental_ThreadActionsMenu as ThreadActionsMenu,
  experimental_useSidebarThreadSplit as useSidebarThreadSplit,
  experimental_useThreadActions as useThreadActions,
  useBbNavigate,
  type PluginSidebarThread,
  type PluginThreadActionsTriggerProps,
} from "@get-bb/plugin-sdk/app";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./components/Icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/Tooltip";
import { threadDisplayTitle } from "./inbox";
import { RenameEditor, useInlineRename } from "./inlineRename";
import { toThreadActionTarget } from "./threadActionTarget";
import type { PinnedDragBindings } from "./PinnedSortable";
import { useRowWindowing } from "./rowWindowing";

export const RowAppearanceContext = createContext<{
  projects: ReadonlyMap<string, string>;
  now: number;
}>({ projects: new Map(), now: Date.now() });

export function shortProjectName(name: string): string {
  return name.trim().toLowerCase();
}

export function compactAge(at: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export interface ChildToggle {
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
}

export interface RowAction {
  label: string;
  icon: IconName;
  onActivate: () => void;
}

interface HoverButton {
  key: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onActivate: () => void;
}

const NO_QUICK_ACTIONS: readonly string[] = [];
const NO_ANCESTOR_CONTINUATIONS: readonly boolean[] = [];

const ROW_BASE_PADDING_PX = 8;
const ROW_DEPTH_STEP_PX = 16;
const LEAD_SLOT_WIDTH_PX = 16;

function rowPaddingLeft(depth: number): number {
  return ROW_BASE_PADDING_PX + depth * ROW_DEPTH_STEP_PX;
}

/** Integer CSS left for a 1px SVG stroke at x=1, centered under the lead dot. */
function guideLeft(depth: number): number {
  return rowPaddingLeft(depth) + LEAD_SLOT_WIDTH_PX / 2 - 1;
}

function TreeGuides({
  depth,
  lastChild,
  hasExpandedChildren,
  ancestorContinuations,
}: {
  depth: number;
  lastChild: boolean;
  hasExpandedChildren: boolean;
  ancestorContinuations: readonly boolean[];
}) {
  const rawId = useId();
  const maskId = `pl-sb-gm-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (depth === 0 && !hasExpandedChildren) return null;

  return (
    <>
      {ancestorContinuations.map((continues, ancestorDepth) =>
        continues ? (
          <svg
            key={`anc-${ancestorDepth}`}
            aria-hidden="true"
            data-tree-guide="ancestor"
            className="pl-sb-guide-svg"
            style={{ left: guideLeft(ancestorDepth) }}
            width="2"
            height="100%"
          >
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="60"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        ) : null,
      )}
      {depth > 0 ? (
        <svg
          aria-hidden="true"
          data-tree-guide={lastChild ? "branch-last" : "branch"}
          className="pl-sb-guide-svg"
          style={{ left: guideLeft(depth - 1) }}
          width="11"
          height="100%"
        >
          <svg y="50%" overflow="visible">
            {lastChild ? (
              <path
                d="M1 -30 V-6 A6 6 0 0 0 7 0 H10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            ) : (
              <>
                <defs>
                  <mask
                    id={maskId}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="-30"
                    width="11"
                    height="70"
                  >
                    <path
                      d="M1 -30 V40 M1 -6 A6 6 0 0 0 7 0 H10"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="-30"
                  width="11"
                  height="70"
                  fill="currentColor"
                  mask={`url(#${maskId})`}
                />
              </>
            )}
          </svg>
        </svg>
      ) : null}
      {hasExpandedChildren ? (
        <svg
          aria-hidden="true"
          data-tree-guide="parent"
          className="pl-sb-guide-svg"
          style={{ left: guideLeft(depth) }}
          width="2"
          height="100%"
        >
          <svg y="50%" overflow="visible">
            <line
              x1="1"
              y1="6.5"
              x2="1"
              y2="30"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </svg>
      ) : null}
    </>
  );
}

function joinClasses(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

/** A thread's pull request, as some bb versions report it to the sidebar. */
interface PluginSidebarPullRequest {
  number: number;
  title: string;
  url: string;
  state: string;
  attention?: string | null;
}

type PullRequestHook = (threadId: string) => {
  pullRequest: PluginSidebarPullRequest | null;
};

// Not every bb exports this hook; without it rows show no pull request. The
// choice is made once per load, so the hook order never changes.
const useSidebarThreadPullRequest: PullRequestHook =
  (
    bbApp as unknown as {
      experimental_useSidebarThreadPullRequest?: PullRequestHook;
    }
  ).experimental_useSidebarThreadPullRequest ?? (() => ({ pullRequest: null }));

function pullRequestTone(
  pullRequest: PluginSidebarPullRequest,
): "merged" | "attention" | "ready" | undefined {
  if (pullRequest.state === "merged") return "merged";
  if (
    pullRequest.attention === "checks_failed" ||
    pullRequest.attention === "conflicts"
  ) {
    return "attention";
  }
  if (pullRequest.attention === "ready_to_merge") {
    return "ready";
  }
  return undefined;
}

function PullRequestLink({
  pullRequest,
}: {
  pullRequest: PluginSidebarPullRequest;
}) {
  return (
    <Tooltip delayDuration={350} disableHoverableContent>
      <TooltipTrigger asChild>
        <a
          href={pullRequest.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Pull request #${pullRequest.number}: ${pullRequest.title}`}
          onClick={(event) => event.stopPropagation()}
          className="pl-sb-pr"
          data-tone={pullRequestTone(pullRequest)}
        >
          #{pullRequest.number}
        </a>
      </TooltipTrigger>
      <TooltipContent side="bottom">{pullRequest.title}</TooltipContent>
    </Tooltip>
  );
}

function HoverActionButton({ button }: { button: HoverButton }) {
  return (
    <Tooltip delayDuration={350} disableHoverableContent>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={button.label}
          disabled={button.disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.detail > 0) event.currentTarget.blur();
            button.onActivate();
          }}
          className="pl-sb-icon-btn"
        >
          {button.icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{button.label}</TooltipContent>
    </Tooltip>
  );
}

function renderMenuTrigger(props: PluginThreadActionsTriggerProps) {
  return (
    <button
      {...props}
      type="button"
      aria-label="Thread actions"
      className={joinClasses(props.className, "pl-sb-icon-btn")}
      onClick={(event) => {
        props.onClick?.(event);
        event.stopPropagation();
      }}
    >
      <BbIcon name="MoreHorizontal" className="pl-sb-icon-btn-glyph" />
    </button>
  );
}

function dragHandleAttributes(reorder: PinnedDragBindings | undefined) {
  if (!reorder) return {};
  const {
    role: _role,
    tabIndex: _tabIndex,
    ...attributes
  } = reorder.attributes;
  return attributes;
}

interface SidebarRowProps {
  thread: PluginSidebarThread;
  isActive: boolean;
  muted?: boolean;
  depth?: number;
  lastChild?: boolean;
  ancestorContinuations?: readonly boolean[];
  hasExpandedChildren?: boolean;
  childToggle?: ChildToggle;
  lead?: ReactNode;
  metaTitle?: string;
  actions: readonly RowAction[];
  quickActionKeys?: readonly string[];
  reorder?: PinnedDragBindings;
  onNavigate: () => void;
}

export function SidebarRow(props: SidebarRowProps) {
  const windowing = useRowWindowing();
  const register = windowing?.register(props.thread.id);
  const staysMounted = props.isActive || props.reorder !== undefined;
  if (windowing && !staysMounted && !windowing.isRealized(props.thread.id)) {
    return (
      <RowPlaceholder
        thread={props.thread}
        depth={props.depth ?? 0}
        lastChild={props.lastChild ?? false}
        ancestorContinuations={props.ancestorContinuations ?? NO_ANCESTOR_CONTINUATIONS}
        hasExpandedChildren={props.hasExpandedChildren ?? false}
        muted={props.muted ?? false}
        listItemRef={register}
        onNavigate={props.onNavigate}
      />
    );
  }
  return <RealizedSidebarRow {...props} listItemRef={register} />;
}

function RowPlaceholder({
  thread,
  depth,
  lastChild,
  ancestorContinuations,
  hasExpandedChildren,
  muted,
  listItemRef,
  onNavigate,
}: {
  thread: PluginSidebarThread;
  depth: number;
  lastChild: boolean;
  ancestorContinuations: readonly boolean[];
  hasExpandedChildren: boolean;
  muted: boolean;
  listItemRef?: (element: HTMLElement | null) => void;
  onNavigate: () => void;
}) {
  const navigate = useBbNavigate();
  const title = threadDisplayTitle(thread);
  return (
    <li ref={listItemRef} className="pl-sb-item" data-row-placeholder="">
      <a
        data-sidebar-thread-shortcut-target=""
        data-sidebar-thread-id={thread.id}
        href={thread.href}
        aria-label={title}
        onClick={(event) => {
          event.preventDefault();
          navigate.toThread(thread.id, {
            split: event.metaKey || event.ctrlKey,
          });
          onNavigate();
        }}
        className="bb-sidebar-hover-actions-row bb-sidebar-accent-row pl-sb-row pl-sb-row-interactive"
        style={{ paddingLeft: rowPaddingLeft(depth) }}
      >
        <TreeGuides
          depth={depth}
          lastChild={lastChild}
          hasExpandedChildren={hasExpandedChildren}
          ancestorContinuations={ancestorContinuations}
        />
        <span className="pl-sb-lead" aria-hidden="true">
          <span className="pl-sb-dot pl-sb-dot-idle" />
        </span>
        <span
          className="pl-sb-title"
          data-muted={muted ? "true" : undefined}
          data-unread={thread.isUnread ? "true" : undefined}
        >
          {title}
        </span>
      </a>
    </li>
  );
}

function RealizedSidebarRow({
  thread,
  isActive,
  muted = false,
  depth = 0,
  lastChild = false,
  ancestorContinuations = NO_ANCESTOR_CONTINUATIONS,
  hasExpandedChildren = false,
  childToggle,
  lead,
  metaTitle,
  actions,
  quickActionKeys = NO_QUICK_ACTIONS,
  reorder,
  onNavigate,
  listItemRef,
}: SidebarRowProps & {
  listItemRef?: (element: HTMLElement | null) => void;
}) {
  const appearance = useContext(RowAppearanceContext);
  const projectName =
    depth === 0 ? appearance.projects.get(thread.projectId) : undefined;
  const navigate = useBbNavigate();
  const { splitProps, layout } = useSidebarThreadSplit(thread.id);
  const { pullRequest } = useSidebarThreadPullRequest(thread.id);
  const actionTarget = toThreadActionTarget(thread);
  const title = threadDisplayTitle(thread);
  const rename = useInlineRename(thread.id, title);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const setDragActivator = reorder?.setActivatorNodeRef;
  const setAnchor = useCallback(
    (element: HTMLAnchorElement | null) => {
      anchorRef.current = element;
      setDragActivator?.(element);
    },
    [setDragActivator],
  );
  const quickActions = useThreadActions(actionTarget, {
    keys: quickActionKeys,
    requestRename: rename.start,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hoverButtons: HoverButton[] = [
    ...actions.map((action) => ({
      key: action.label,
      label: action.label,
      icon: <Icon name={action.icon} className="pl-sb-icon-btn-glyph" />,
      onActivate: action.onActivate,
    })),
    ...quickActions.map((entry) => ({
      key: entry.key,
      label: entry.action.label,
      icon: <BbIcon name={entry.action.icon} className="pl-sb-icon-btn-glyph" />,
      disabled: entry.action.disabled,
      onActivate: () => void entry.action.run(),
    })),
  ];
  const hoverActionsOpen = isMenuOpen ? "true" : undefined;
  // The age is the last activity that wants attention, not updatedAt, which
  // also moves when the thread is read, renamed or pinned.
  const activityTimestamp = Math.max(thread.latestAttentionAt ?? 0, thread.createdAt ?? 0);
  const age = compactAge(activityTimestamp, appearance.now);
  const childCount = childToggle?.count ?? 0;
  const childToggleLabel = childToggle
    ? childToggle.collapsed
      ? `Show ${childCount} ${childCount === 1 ? "child thread" : "child threads"}`
      : "Hide child threads"
    : undefined;

  return (
    <ThreadActionsContextMenu
      thread={actionTarget}
      requestRename={rename.menuRequestRename}
      onCloseAutoFocus={rename.onMenuCloseAutoFocus}
      disabled={rename.isEditing}
    >
      <li
        ref={listItemRef}
        className="pl-sb-item"
        data-sidebar-rename-row=""
      >
        <div
          data-depth={depth > 0 ? depth : undefined}
          className={joinClasses(
            "bb-sidebar-hover-actions-row pl-sb-row",
            isActive
              ? "bb-sidebar-selected-row pl-sb-row-selected"
              : "bb-sidebar-accent-row pl-sb-row-interactive",
            !isActive && layout !== null && "bb-sidebar-open-in-split-row",
            reorder && "pl-sb-row-reorder",
          )}
          style={{ paddingLeft: rowPaddingLeft(depth) }}
        >
          <TreeGuides
            depth={depth}
            lastChild={lastChild}
            hasExpandedChildren={hasExpandedChildren}
            ancestorContinuations={ancestorContinuations}
          />

          <a
            data-sidebar-thread-shortcut-target=""
            data-sidebar-thread-id={thread.id}
            data-sidebar-rename-anchor=""
            href={thread.href}
            aria-label={title}
            {...splitProps}
            draggable={false}
            ref={setAnchor}
            {...dragHandleAttributes(reorder)}
            {...reorder?.listeners}
            onClick={(event) => {
              event.preventDefault();
              if (rename.isEditing) {
                event.stopPropagation();
                return;
              }
              navigate.toThread(thread.id, {
                split: event.metaKey || event.ctrlKey,
              });
              onNavigate();
            }}
            onDoubleClick={(event) => {
              if (rename.isEditing) return;
              event.preventDefault();
              event.stopPropagation();
              rename.startFromDoubleClick();
            }}
            onKeyDown={(event) => {
              reorder?.listeners?.onKeyDown?.(event);
              if (event.defaultPrevented || rename.isEditing || !childToggle) return;
              if (event.key === "ArrowRight" && childToggle.collapsed) {
                event.preventDefault();
                childToggle.onToggle();
              } else if (event.key === "ArrowLeft" && !childToggle.collapsed) {
                event.preventDefault();
                childToggle.onToggle();
              }
            }}
            className="pl-sb-anchor"
          />

          <span className="pl-sb-lead">
            <span className="pl-sb-lead-status">{lead}</span>
          </span>

          <span className="pl-sb-main">
            {rename.isEditing ? (
              <RenameEditor
                rename={rename}
                label="Thread name"
                anchor={() => anchorRef.current}
              />
            ) : (
              <span
                className="pl-sb-title"
                data-unread={thread.isUnread ? "true" : undefined}
                data-active={isActive ? "true" : undefined}
                data-muted={muted ? "true" : undefined}
              >
                {title}
              </span>
            )}
          </span>

          <span
            data-sidebar-thread-trailing=""
            className={joinClasses(
              "pl-sb-trailing",
              rename.isEditing && "pl-sb-trailing-hidden",
            )}
          >
            {childToggle && !rename.isEditing && childCount > 0 ? (
              <Tooltip delayDuration={350} disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-expanded={!childToggle.collapsed}
                    aria-label={childToggleLabel}
                    data-expanded={!childToggle.collapsed ? "true" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (event.detail > 0) event.currentTarget.blur();
                      childToggle.onToggle();
                    }}
                    className="pl-sb-children-btn"
                  >
                    <BbIcon
                      name="CornerDownRight"
                      aria-hidden="true"
                      className="pl-sb-children-icon"
                    />
                    <span className="pl-sb-children-count">{childCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{childToggleLabel}</TooltipContent>
              </Tooltip>
            ) : null}

            <span
              data-sidebar-hover-actions-open={hoverActionsOpen}
              title={metaTitle ?? projectName ?? undefined}
              className={joinClasses(
                "bb-sidebar-hover-actions-fade pl-sb-meta",
                metaTitle && "pl-sb-meta-titled",
              )}
            >
              {/* Only the age shows at rest; the project is in the tooltip
                  and in the filter at the top, which keeps the column quiet. */}
              <span className="pl-sb-age" data-project={projectName ? shortProjectName(projectName) : undefined}>{age}</span>
            </span>

            <div
              data-sidebar-hover-actions-open={hoverActionsOpen}
              className="bb-sidebar-hover-actions pl-sb-actions"
            >
              {pullRequest ? (
                <PullRequestLink pullRequest={pullRequest} />
              ) : null}
              {hoverButtons.map((button) => (
                <HoverActionButton key={button.key} button={button} />
              ))}
              <ThreadActionsMenu
                thread={actionTarget}
                requestRename={rename.menuRequestRename}
                onCloseAutoFocus={rename.onMenuCloseAutoFocus}
                trigger={renderMenuTrigger}
                side="right"
                align="start"
                sideOffset={8}
                onOpenChange={setIsMenuOpen}
              />
            </div>
          </span>
        </div>
      </li>
    </ThreadActionsContextMenu>
  );
}
