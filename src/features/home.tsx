// The New thread page section: what needs you, what is running and where you
// left off.
import { useMemo } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
  useBbContext,
  useComposer,
  type PluginAppBuilder,
  type PluginHomepageSectionProps,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { dayBuckets, rankProjects } from "./home-model";
import { groupThreads } from "../model";
import { EmptyNote, Group, ThreadRow, useNow, useProjectLookup } from "../ui";
import { OVERVIEW_PATH } from "./overview";
import "./home.css";

/** A short list on the New thread page: what needs you, what is running and
 *  where you left off. */
export function HomeSection({ projectId: selectedProjectId }: PluginHomepageSectionProps) {
  const context = useBbContext();
  const composer = useComposer();
  const candidateProjectId = selectedProjectId ?? context.projectId ?? (composer.scope.kind === "new-thread" ? composer.scope.projectId : null);
  const { status, threads, projects } = useSidebarThreads();
  const projectId = projects.some(project => project.id === candidateProjectId && project.isPersonal) ? null : candidateProjectId;
  const now = useNow();
  const navigate = useBbNavigate();
  const projectLookup = useProjectLookup(projects);
  const byId = useMemo(() => new Map(threads.map((thread) => [thread.id, thread])), [threads]);
  const groups = useMemo(() => groupThreads(threads, now, projectId), [threads, now, projectId]);
  if (status !== "ready") return null;
  const needs = groups.needs.slice(0, 4);
  const running = groups.running.slice(0, 4);
  const recent = [...groups.ready, ...groups.recent].slice(0, needs.length + running.length > 0 ? 3 : 5);
  const scoped = threads.filter(t => !t.isHidden && !t.isArchived && (!projectId || t.projectId === projectId));
  const days = dayBuckets(scoped, now);
  const maximum = Math.max(1, ...days.map(day => day.count));
  const ranked = rankProjects(threads);
  const empty = threads.length === 0;
  const starters = projectId ? <div className="pl-home-starters">{STARTERS.map(starter => (
    <button key={starter.title} type="button" className="pl-home-starter" onClick={() => navigate.toCompose({ projectId, initialPrompt: starter.prompt, focusPrompt: true })}>
      <span>{starter.title}</span><small>{starter.detail}</small>
    </button>
  ))}</div> : null;
  if (empty) return <div className="pl-home">{starters}<EmptyNote>A fresh start. Ask anything above, or choose a place to begin.</EmptyNote></div>;

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
      <div className="pl-home-pulse">
        <div className="pl-summary">
          {[
            { count: groups.running.length, label: "running", bucket: "running" },
            { count: groups.needs.length, label: "need you", bucket: "needs" },
            { count: days.slice(-7).reduce((sum, day) => sum + day.count, 0), label: "this week", bucket: "recent" },
          ].map(item => <span className="pl-summary-item" key={item.label} data-bucket={item.bucket} data-zero={item.count === 0 || undefined}>{item.count} {item.label}</span>)}
        </div>
        <div className="pl-home-spark" aria-label="Threads created over the last 14 days">{days.map(day => <span key={day.timestamp} title={day.label} data-today={day.today || undefined} style={{ height: `${Math.max(2, day.count / maximum * 22)}px` }} />)}</div>
      </div>
      {ranked.length > 1 ? <div className="pl-home-projects">{ranked.map(project => <button type="button" key={project.id} className="pl-chip" onClick={() => navigate.toProject(project.id)}>{project.working ? <span className="pl-dot" /> : null}{projectLookup.get(project.id)?.name ?? "Project"}<span className="pl-home-project-count">{project.count}</span></button>)}</div> : null}
      {starters}
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
        Open Overview <kbd>{/Mac/i.test(navigator.platform) ? "Cmd+Option+O" : "Ctrl+Alt+O"}</kbd>
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

const STARTERS = [
  { title: "Review my changes", detail: "Catch problems before you commit.", prompt: "Review my uncommitted changes. Understand the surrounding code and identify correctness, security and maintainability problems. List actionable findings by severity with file references and evidence. Explain any gaps in verification." },
  { title: "Explain this codebase", detail: "Get a map of the architecture and flows.", prompt: "Explore this codebase and explain its architecture. Map the main modules, entry points and data flows, with links to the key files. Walk through a representative request from start to finish and explain where new functionality belongs." },
  { title: "Find a bug", detail: "Follow the evidence to a likely fix.", prompt: "Look for a likely bug in this codebase. Trace the relevant paths and show concrete evidence or a reproduction. Explain the user-visible impact and propose the smallest sound fix. Do not change code until you have explained the finding." },
  { title: "Plan a feature", detail: "Turn an idea into clear next steps.", prompt: "Help me plan a feature. First ask what I want to build and clarify the desired behaviour and constraints. Then inspect the relevant code and write a step-by-step implementation and verification plan before coding." },
];
