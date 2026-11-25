import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { SidebarRow, type ChildToggle } from "./SidebarRow";
import { ThreadStatus } from "./StatusSlot";
import { snoozeWakeLabel } from "./lifecycle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/Tooltip";

const RESTORE_LABELS = {
  snoozed: "Wake thread now",
  settled: "Un-settle thread",
  muted: "Unmute thread",
} as const;

const RESTORE_ICONS = {
  snoozed: "Clock",
  settled: "ArrowTurnBackward",
  muted: "Notification",
} as const;

const INDICATORS_THAT_OUTRANK_QUIET_NEWS: ReadonlySet<string> = new Set([
  "runtime",
  "workflow",
  "background-agent",
  "plan-mode",
  "goal",
  "working-draft",
  "waiting-for-input",
  "queued-waiting",
  "queued-failed",
  "unread-error",
]);

function statusOutranksQuietNews(indicator: string): boolean {
  return INDICATORS_THAT_OUTRANK_QUIET_NEWS.has(indicator);
}

function QuietNewsMark({
  note,
  children,
}: {
  note: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={350} disableHoverableContent>
      <TooltipTrigger asChild>
        <span className="pl-sb-quiet-wrap" aria-label={note}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{note}</TooltipContent>
    </Tooltip>
  );
}

export function ParkedRow({
  thread,
  isActive,
  shelf,
  wakeAt,
  now,
  onNavigate,
  childToggle,
  hasExpandedChildren = false,
  statusThread = thread,
  onRestore,
  quietNewsNote,
}: {
  thread: PluginSidebarThread;
  isActive: boolean;
  shelf: "snoozed" | "settled" | "muted";
  wakeAt: number | null;
  now: number;
  onNavigate: () => void;
  childToggle?: ChildToggle;
  hasExpandedChildren?: boolean;
  statusThread?: PluginSidebarThread;
  onRestore: () => void;
  quietNewsNote?: string;
}) {
  const isSnoozed = shelf === "snoozed";
  const status = <ThreadStatus thread={statusThread} />;
  const quietDot = (
    <span
      className="pl-sb-dot pl-sb-dot-quiet"
      data-status-kind="quiet-news"
      aria-hidden="true"
    />
  );
  const showsStatusInstead = statusOutranksQuietNews(statusThread.indicator);
  const wakeTitle =
    isSnoozed && wakeAt !== null
      ? `Wakes in ${snoozeWakeLabel(wakeAt, now)}`
      : undefined;

  return (
    <SidebarRow
      thread={thread}
      isActive={isActive}
      muted
      hasExpandedChildren={hasExpandedChildren}
      metaTitle={wakeTitle}
      lead={
        quietNewsNote ? (
          <QuietNewsMark
            note={
              wakeTitle ? `${quietNewsNote}. ${wakeTitle}.` : quietNewsNote
            }
          >
            {showsStatusInstead ? (
              <>
                <span data-quiet-news-dot="" className="pl-sb-quiet-pip" />
                {status}
              </>
            ) : (
              quietDot
            )}
          </QuietNewsMark>
        ) : (
          status
        )
      }
      actions={[
        {
          label: RESTORE_LABELS[shelf],
          icon: RESTORE_ICONS[shelf],
          onActivate: onRestore,
        },
      ]}
      onNavigate={onNavigate}
      childToggle={childToggle}
    />
  );
}
