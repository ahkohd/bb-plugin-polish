// The Crew tab beside a thread: every thread it started, nested, with what
// each one is doing, like Capy's Captain view.
import { useMemo } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  type ExperimentalThreadTabProps,
} from "@get-bb/plugin-sdk/app";
import { childrenByParent, descendants, isBusy, needsYou, statusPhrase } from "./model";
import { EmptyNote, ThreadRow, useNow } from "./ui";

export function useHasCrew({ threadId }: ExperimentalThreadTabProps): boolean {
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
