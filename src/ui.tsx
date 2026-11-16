// Shared pieces for Polish's pages: a minute clock, thread rows and
// collapsible groups in Capy's style.
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  experimental_ProviderIcon as ProviderIcon,
  experimental_ThreadStatusGlyph as ThreadStatusGlyph,
  experimental_useProviders as useProviders,
  useBbNavigate,
  useSidebarThreadRowStatus,
  type PluginSidebarProject,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { compactAge, lastActive, meaningfulBranch } from "./model";

const MINUTE = 60_000;

let clockNow = Date.now();
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

/** One shared clock for every row, ticking once a minute. */
export function useNow(): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((tick) => tick + 1);
    clockListeners.add(listener);
    clockNow = Date.now();
    if (clockTimer === null) {
      clockTimer = setInterval(() => {
        clockNow = Date.now();
        for (const notify of clockListeners) notify();
      }, MINUTE / 2);
    }
    return () => {
      clockListeners.delete(listener);
      if (clockListeners.size === 0 && clockTimer !== null) {
        clearInterval(clockTimer);
        clockTimer = null;
      }
    };
  }, []);
  return clockNow;
}

/** Remembered open or closed state for a group, per device. */
export function useCollapsed(key: string, initial = false): [boolean, () => void] {
  const storageKey = `polish.collapsed.${key}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });
  const toggle = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Not remembered; still toggles.
      }
      return next;
    });
  };
  return [collapsed, toggle];
}

export function useProviderLookup() {
  const { providers } = useProviders();
  return useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
}

export function useProjectLookup(projects: readonly PluginSidebarProject[]) {
  return useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className="pl-chevron" data-open={open} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 6.5 8 9.5 11 6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Group(props: {
  id: string;
  label: string;
  count: number;
  tone?: "attention" | "neutral";
  children: ReactNode;
  action?: ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(props.id);
  return (
    <section className="pl-group" data-tone={props.tone ?? "neutral"}>
      <div className="pl-group-header">
        <button type="button" className="pl-group-toggle" aria-expanded={!collapsed} onClick={toggle}>
          <span className="pl-group-label">{props.label}</span>
          <span className="pl-group-count">{props.count}</span>
          <Chevron open={!collapsed} />
        </button>
        {props.action}
      </div>
      {collapsed ? null : <div className="pl-group-body">{props.children}</div>}
    </section>
  );
}

function StatusGlyph({ thread }: { thread: PluginSidebarThread }) {
  const rowStatus = useSidebarThreadRowStatus(thread.id);
  return (
    <span className="pl-glyph">
      <ThreadStatusGlyph indicator={thread.indicator} rowStatus={rowStatus} size="compact" hideIdleDraftLabel />
    </span>
  );
}

export interface ThreadRowProps {
  thread: PluginSidebarThread;
  now: number;
  project?: PluginSidebarProject;
  parent?: PluginSidebarThread;
  childCount?: number;
  depth?: number;
  trailing?: string;
  showProject?: boolean;
}

export function ThreadRow(props: ThreadRowProps) {
  const { thread, now } = props;
  const navigate = useBbNavigate();
  const providers = useProviderLookup();
  const provider = providers.get(thread.providerId);

  const meta: ReactNode[] = [];
  if (props.parent) meta.push(<span key="parent">in {props.parent.displayTitle}</span>);
  if (props.showProject !== false && props.project && !props.project.isPersonal) {
    meta.push(<span key="project">{props.project.name}</span>);
  }
  const branch = meaningfulBranch(thread.environment?.branchName);
  if (branch) meta.push(<span key="branch" className="pl-mono">{branch}</span>);
  if (props.childCount) {
    meta.push(<span key="children">{props.childCount} {props.childCount === 1 ? "thread" : "threads"}</span>);
  }

  const providerIcon = provider ? (
    <span className="pl-provider" title={provider.displayName}>
      <ProviderIcon providerKind="agent" provider={provider} className="pl-provider-icon" aria-hidden />
    </span>
  ) : null;

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate.toThread(thread.id);
  };

  return (
    <a
      className="pl-row"
      href={thread.href}
      onClick={onClick}
      data-unread={thread.isUnread || undefined}
      style={props.depth ? { paddingLeft: `${12 + props.depth * 18}px` } : undefined}
    >
      <StatusGlyph thread={thread} />
      <span className="pl-row-main">
        <span className="pl-row-title-line">
          <span className="pl-row-title">{thread.displayTitle}</span>
          {provider && meta.length === 0 ? providerIcon : null}
        </span>
        {meta.length > 0 ? (
          <span className="pl-row-meta">
            {provider ? providerIcon : null}
            {meta.map((item, index) => (
              <span key={index} className="pl-meta-item">{item}</span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="pl-row-time" title={new Date(lastActive(thread)).toLocaleString()}>
        {props.trailing ?? compactAge(lastActive(thread), now)}
      </span>
    </a>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="pl-empty">{children}</p>;
}
