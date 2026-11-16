// The Overview page: every thread that needs you, is working, is ready for
// review or ran recently, in Capy's grouped style. Also the badge on its
// navigation item and a short version for the New thread page.
import { useMemo, useState } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
  type ExperimentalBadge,
  type PluginHomepageSectionProps,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import {
  BUCKET_LABELS,
  BUCKET_ORDER,
  childrenByParent,
  groupThreads,
  needsYou,
  type Bucket,
} from "./model";
import { EmptyNote, Group, ThreadRow, useNow, useProjectLookup } from "./ui";

const RECENT_PAGE = 12;

export const OVERVIEW_PATH = "overview";

export function useNeedsYouBadge(): ExperimentalBadge | null {
  const { threads } = useSidebarThreads();
  const count = threads.filter((thread) => !thread.isArchived && !thread.isHidden && needsYou(thread)).length;
  if (count === 0) return null;
  return { count, tone: "warning", label: `${count} ${count === 1 ? "thread needs" : "threads need"} you` };
}

function Summary({ counts }: { counts: Record<Bucket, number> }) {
  const parts: { key: Bucket; text: string }[] = [
    { key: "needs", text: `${counts.needs} need you` },
    { key: "running", text: `${counts.running} in progress` },
    { key: "ready", text: `${counts.ready} ready` },
  ];
  return (
    <div className="pl-summary">
      {parts.map((part) => (
        <span key={part.key} className="pl-summary-item" data-bucket={part.key} data-zero={counts[part.key] === 0 || undefined}>
          <span className="pl-dot" />
          {part.text}
        </span>
      ))}
    </div>
  );
}

export function OverviewPage() {
  const { status, threads, projects } = useSidebarThreads();
  const now = useNow();
  const navigate = useBbNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE);
  const projectLookup = useProjectLookup(projects);
  const children = useMemo(() => childrenByParent(threads), [threads]);
  const byId = useMemo(() => new Map(threads.map((thread) => [thread.id, thread])), [threads]);
  const groups = useMemo(() => groupThreads(threads, now, projectId), [threads, now, projectId]);

  const activeProjects = useMemo(() => {
    const ids = new Set(threads.filter((thread) => !thread.isArchived && !thread.isHidden).map((thread) => thread.projectId));
    return projects.filter((project) => ids.has(project.id));
  }, [threads, projects]);

  const counts = {
    needs: groups.needs.length,
    running: groups.running.length,
    ready: groups.ready.length,
    recent: groups.recent.length,
  };

  const renderRows = (list: PluginSidebarThread[]) =>
    list.map((thread) => (
      <ThreadRow
        key={thread.id}
        thread={thread}
        now={now}
        project={projectLookup.get(thread.projectId)}
        parent={thread.parentThreadId ? byId.get(thread.parentThreadId) : undefined}
        childCount={children.get(thread.id)?.length}
        showProject={projectId === null}
      />
    ));

  return (
    <div className="pl-page">
      <div className="pl-page-inner">
        <header className="pl-hero">
          <div>
            <h1 className="pl-hero-title">{greeting(now)}</h1>
            <Summary counts={counts} />
          </div>
          <button type="button" className="pl-button pl-button-primary" onClick={() => navigate.toCompose({ projectId: projectId ?? undefined, focusPrompt: true })}>
            New thread
          </button>
        </header>

        {activeProjects.length > 1 ? (
          <nav className="pl-filter" aria-label="Project">
            <button type="button" className="pl-chip" data-selected={projectId === null || undefined} onClick={() => setProjectId(null)}>
              All projects
            </button>
            {activeProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="pl-chip"
                data-selected={projectId === project.id || undefined}
                onClick={() => setProjectId(project.id)}
              >
                {project.isPersonal ? "Personal" : project.name}
              </button>
            ))}
          </nav>
        ) : null}

        {status === "loading" ? <EmptyNote>Loading threads…</EmptyNote> : null}
        {status === "error" ? <EmptyNote>Could not load threads.</EmptyNote> : null}

        {status === "ready" && BUCKET_ORDER.every((bucket) => groups[bucket].length === 0) ? (
          <div className="pl-calm">
            <p className="pl-calm-title">All quiet</p>
            <p className="pl-calm-text">Nothing needs you and nothing is running. Start a thread to get going.</p>
          </div>
        ) : null}

        {BUCKET_ORDER.map((bucket) => {
          const list = groups[bucket];
          if (list.length === 0) return null;
          const shown = bucket === "recent" ? list.slice(0, recentLimit) : list;
          return (
            <Group
              key={bucket}
              id={`overview.${bucket}`}
              label={BUCKET_LABELS[bucket]}
              count={list.length}
              tone={bucket === "needs" ? "attention" : "neutral"}
            >
              {renderRows(shown)}
              {bucket === "recent" && list.length > shown.length ? (
                <button type="button" className="pl-more" onClick={() => setRecentLimit((limit) => limit + RECENT_PAGE)}>
                  Show {Math.min(RECENT_PAGE, list.length - shown.length)} more
                </button>
              ) : null}
            </Group>
          );
        })}
      </div>
    </div>
  );
}

function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A short list on the New thread page: what needs you, what is running and
 *  where you left off. */
export function HomeSection({ projectId }: PluginHomepageSectionProps) {
  const { status, threads, projects } = useSidebarThreads();
  const now = useNow();
  const navigate = useBbNavigate();
  const projectLookup = useProjectLookup(projects);
  const byId = useMemo(() => new Map(threads.map((thread) => [thread.id, thread])), [threads]);
  const groups = useMemo(() => groupThreads(threads, now, projectId), [threads, now, projectId]);
  if (status !== "ready") return null;
  const needs = groups.needs.slice(0, 4);
  const running = groups.running.slice(0, 4);
  const recent = [...groups.ready, ...groups.recent].slice(0, needs.length + running.length > 0 ? 3 : 5);
  if (needs.length + running.length + recent.length === 0) {
    return <EmptyNote>No threads yet. Ask anything above to start one.</EmptyNote>;
  }

  const rows = (list: PluginSidebarThread[]) =>
    list.map((thread) => (
      <ThreadRow
        key={thread.id}
        thread={thread}
        now={now}
        project={projectLookup.get(thread.projectId)}
        parent={thread.parentThreadId ? byId.get(thread.parentThreadId) : undefined}
        showProject={projectId === null}
      />
    ));

  return (
    <div className="pl-home">
      {needs.length > 0 ? (
        <Group id="home.needs" label="Needs you" count={groups.needs.length} tone="attention">
          {rows(needs)}
        </Group>
      ) : null}
      {running.length > 0 ? (
        <Group id="home.running" label="In progress" count={groups.running.length}>
          {rows(running)}
        </Group>
      ) : null}
      {recent.length > 0 ? (
        <Group id="home.recent" label="Jump back in" count={groups.ready.length + groups.recent.length}>
          {rows(recent)}
        </Group>
      ) : null}
      <button type="button" className="pl-link-button" onClick={() => navigate.toPluginPanel(OVERVIEW_PATH)}>
        Open Overview
      </button>
    </div>
  );
}
