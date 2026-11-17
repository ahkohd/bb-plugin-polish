// The New thread page section: what needs you, what is running and where you
// left off.
import { useMemo } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
  type PluginAppBuilder,
  type PluginHomepageSectionProps,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { groupThreads } from "../model";
import { EmptyNote, Group, ThreadRow, useNow, useProjectLookup } from "../ui";
import { OVERVIEW_PATH } from "./overview";
import "./home.css";

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

export function registerHome(app: PluginAppBuilder): void {
  app.slots.homepageSection({
    id: "needs-you",
    title: "Your threads",
    component: HomeSection,
  });
}
