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

const ROW_BASE_PADDING_PX = 8;
const ROW_DEPTH_STEP_PX = 14;
const GUIDE_LINE_OFFSET_PX = 8;

function rowPaddingLeft(depth: number): number {
  return ROW_BASE_PADDING_PX + depth * ROW_DEPTH_STEP_PX;
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
  childToggle?: ChildToggle;
  lead?: ReactNode;
  hasLeadStatus?: boolean;
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
  muted,
  listItemRef,
  onNavigate,
}: {
  thread: PluginSidebarThread;
  depth: number;
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
        <span className="pl-sb-lead" aria-hidden="true" />
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
  childToggle,
  lead,
  hasLeadStatus = false,
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
  const guideLeft = rowPaddingLeft(depth - 1) + GUIDE_LINE_OFFSET_PX;

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
          {depth > 0 ? (
            <>
              {!lastChild ? (
                <span
                  aria-hidden="true"
                  className="pl-sb-guide"
                  style={{ left: guideLeft }}
                />
              ) : null}
              <span
                aria-hidden="true"
                className="pl-sb-guide-curve"
                style={{ left: guideLeft }}
              />
            </>
          ) : null}

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
            className="pl-sb-anchor"
          />

          <span
            className="pl-sb-lead"
            data-has-toggle={childToggle && !rename.isEditing ? "true" : undefined}
            data-expanded={
              childToggle && !childToggle.collapsed ? "true" : undefined
            }
            data-empty-status={!hasLeadStatus ? "true" : undefined}
          >
            <span className="pl-sb-lead-status">{lead}</span>
            {childToggle && !rename.isEditing ? (
              <button
                type="button"
                aria-expanded={!childToggle.collapsed}
                aria-label={
                  childToggle.collapsed
                    ? `Expand ${title} threads`
                    : `Collapse ${title} threads`
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  childToggle.onToggle();
                }}
                className="pl-sb-child-toggle"
              >
                <Icon
                  name="ChevronRight"
                  aria-hidden="true"
                  className={joinClasses(
                    "pl-sb-child-chevron",
                    !childToggle.collapsed && "is-open",
                  )}
                />
              </button>
            ) : null}
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
            <span
              data-sidebar-hover-actions-open={hoverActionsOpen}
              title={metaTitle}
              className={joinClasses(
                "bb-sidebar-hover-actions-fade pl-sb-meta",
                metaTitle && "pl-sb-meta-titled",
              )}
            >
              {childToggle?.collapsed && childToggle.count ? (
                <span className="pl-sb-children-count" aria-hidden="true">
                  <Icon
                    name="ChevronRight"
                    aria-hidden="true"
                    className="pl-sb-children-count-icon"
                  />
                  {childToggle.count}
                </span>
              ) : null}
              {projectName ? (
                <span className="pl-sb-project" title={projectName}>
                  {shortProjectName(projectName)}
                </span>
              ) : null}
              <span className="pl-sb-age">{age}</span>
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
