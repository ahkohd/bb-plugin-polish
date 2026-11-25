import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

const NEEDS_YOU_INDICATORS = new Set<string>([
  "waiting-for-input",
  "queued-failed",
  "unread-error",
]);

const RUNNING_INDICATORS = new Set<string>([
  "runtime",
  "workflow",
  "background-agent",
  "plan-mode",
  "working-draft",
  "queued-waiting",
  "goal",
]);

const RUNNING_STATUSES = new Set<string>([
  "active",
  "starting",
  "stopping",
  "pending",
  "provisioning",
  "waiting-for-host",
]);

export type LeadStatusKind = "needs-you" | "running" | "unread" | "idle";

export function threadStatusKind(thread: PluginSidebarThread): LeadStatusKind {
  if (thread.hasPendingInteraction || NEEDS_YOU_INDICATORS.has(thread.indicator)) {
    return "needs-you";
  }
  if (
    RUNNING_INDICATORS.has(thread.indicator) ||
    RUNNING_STATUSES.has(thread.status) ||
    RUNNING_STATUSES.has(thread.runtimeStatus)
  ) {
    return "running";
  }
  if (
    thread.indicator === "unread-success" ||
    (thread.isUnread && thread.indicator === "none")
  ) {
    return "unread";
  }
  return "idle";
}

export function ThreadStatus({ thread }: { thread: PluginSidebarThread }) {
  const kind = threadStatusKind(thread);
  if (kind === "needs-you") {
    return (
      <span
        className="pl-sb-dot pl-sb-dot-needs"
        data-status-kind="needs-you"
        data-status-indicator={thread.indicator}
        aria-hidden="true"
      />
    );
  }
  if (kind === "running") {
    return (
      <svg
        className="pl-sb-spinner"
        data-status-kind="running"
        data-status-indicator={thread.indicator}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="5.5"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.75"
        />
        <path
          d="M8 2.5A5.5 5.5 0 0 1 13.5 8"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "unread") {
    return (
      <span
        className="pl-sb-dot pl-sb-dot-unread"
        data-status-kind="unread"
        data-status-indicator={thread.indicator}
        aria-hidden="true"
      />
    );
  }
  return null;
}
