// The Crew tab beside a thread: every thread it started, nested, with what
// each one is doing, like Capy's Captain view.
import { useMemo } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  type ExperimentalThreadContextSegmentProps,
  type PluginAppBuilder,
  type ExperimentalThreadTabProps,
} from "@get-bb/plugin-sdk/app";
import { childrenByParent, descendants, isBusy, needsYou, statusPhrase } from "../model";
import { EmptyNote, ThreadRow, useNow } from "../ui";
import "./crew.css";

export function useHasCrew({ threadId }: { threadId: string }): boolean {
  const { threads } = useSidebarThreads();
  return threads.some((thread) => thread.parentThreadId === threadId && !thread.isArchived && !thread.isHidden);
}

export function CrewTab({ threadId }: ExperimentalThreadTabProps) {
  const { status, threads } = useSidebarThreads();
  const now = useNow();
  const children = useMemo(() => childrenByParent(threads), [threads]);
  const crew = useMemo(() => descendants(threadId, children), [threadId, children]);

  if (status === "loading") return <EmptyNote>Loading…</EmptyNote>;
  if (crew.length === 0) return <EmptyNote>This thread has not started any threads.</EmptyNote>;

  const working = crew.filter(({ thread }) => isBusy(thread)).length;
  const waiting = crew.filter(({ thread }) => needsYou(thread)).length;
  const done = crew.length - working - waiting;

  return (
    <div className="pl-crew">
      <div className="pl-crew-head">
        <span className="pl-crew-count">{crew.length} {crew.length === 1 ? "thread" : "threads"}</span>
        <span className="pl-crew-stats">
          {waiting > 0 ? <span data-bucket="needs"><span className="pl-dot" />{waiting} need you</span> : null}
          {working > 0 ? <span data-bucket="running"><span className="pl-dot" />{working} working</span> : null}
          {done > 0 ? <span data-bucket="ready"><span className="pl-dot" />{done} settled</span> : null}
        </span>
      </div>
      <div className="pl-crew-progress" aria-hidden="true">
        {crew.map(({ thread }) => (
          <span
            key={thread.id}
            data-bucket={needsYou(thread) ? "needs" : isBusy(thread) ? "running" : "ready"}
          />
        ))}
      </div>
      <div className="pl-group-body">
        {crew.map(({ thread, depth }) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            now={now}
            depth={depth}
            showProject={false}
            trailing={statusPhrase(thread) ?? undefined}
          />
        ))}
      </div>
    </div>
  );
}

/** The Crew segment in the context row above the composer. */
export function CrewSegmentSummary({ threadId, isExpanded, onToggle }: ExperimentalThreadContextSegmentProps) {
  const { threads } = useSidebarThreads();
  const children = useMemo(() => childrenByParent(threads), [threads]);
  const crew = useMemo(() => descendants(threadId, children), [threadId, children]);
  if (crew.length === 0) return null;
  const working = crew.filter(({ thread }) => isBusy(thread)).length;
  const waiting = crew.filter(({ thread }) => needsYou(thread)).length;
  const parts = [`${crew.length} ${crew.length === 1 ? "subthread" : "subthreads"}`];
  if (waiting > 0) parts.push(`${waiting} need you`);
  if (working > 0) parts.push(`${working} working`);
  return (
    <button type="button" className="pl-segment" aria-expanded={isExpanded} onClick={onToggle}>
      <span className="pl-segment-dots" aria-hidden="true">
        {crew.slice(0, 8).map(({ thread }) => (
          <span key={thread.id} data-bucket={needsYou(thread) ? "needs" : isBusy(thread) ? "running" : "ready"} />
        ))}
      </span>
      {parts.join(" · ")}
    </button>
  );
}

export function CrewSegmentDetails({ threadId }: ExperimentalThreadContextSegmentProps) {
  const { threads } = useSidebarThreads();
  const now = useNow();
  const children = useMemo(() => childrenByParent(threads), [threads]);
  const crew = useMemo(() => descendants(threadId, children), [threadId, children]);
  return (
    <div className="pl-segment-details">
      {crew.map(({ thread, depth }) => (
        <ThreadRow key={thread.id} thread={thread} now={now} depth={depth} showProject={false} trailing={statusPhrase(thread) ?? undefined} />
      ))}
    </div>
  );
}


function CrewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5.5" r="2" />
      <path d="M6 7.5v9.5a2 2 0 0 0 2 2h3M6 12h5" />
      <circle cx="14" cy="12" r="2" />
      <circle cx="14" cy="19" r="2" />
    </svg>
  );
}

export function registerCrew(app: PluginAppBuilder): void {
  app.experimental_icons.register({ name: "polish.crew", component: CrewIcon });
  app.slots.experimental_tab({
    context: { kind: "thread" },
    availability: "fixed",
    id: "crew",
    title: "Crew",
    icon: "polish.crew",
    tooltip: "Threads this thread started",
    layout: "flush",
    useVisible: useHasCrew,
    component: CrewTab,
  });
  app.slots.experimental_threadContextSegment({
    id: "crew",
    title: "Crew",
    group: "2_crew",
    summary: CrewSegmentSummary,
    details: CrewSegmentDetails,
    useVisible: useHasCrew,
  });
}
