// The Crew tab beside a thread: every thread it started, nested, with what
// each one is doing, like Capy's Captain view.
import { useEffect, useState, useMemo } from "react";
import {
  useBbNavigate,
  experimental_ProviderIcon as ProviderIcon,
  experimental_useSidebarThreads as useSidebarThreads,
  type PluginAppBuilder,
  type ExperimentalThreadTabProps,
} from "@get-bb/plugin-sdk/app";
import { childrenByParent, descendants, isBusy, needsYou, statusPhrase, waitingOnYou, compactAge, lastActive } from "../model";
import { EmptyNote, ThreadRow, useNow, useProviderLookup } from "../ui";
import { crewBucket, filterCrew, formatElapsed, parseCrewFilter, type CrewFilter } from "./crew-model";
import "./crew.css";

export function useHasCrew({ threadId }: { threadId: string }): boolean {
  const { threads } = useSidebarThreads();
  return threads.some((thread) => thread.parentThreadId === threadId && !thread.isArchived && !thread.isHidden);
}

export function CrewTab({ threadId }: ExperimentalThreadTabProps) {
  const { status, threads } = useSidebarThreads();
  const now = useCrewClock();
  const navigate = useBbNavigate();
  const providers = useProviderLookup();
  const [filter, setFilter] = useState<CrewFilter>(() => {
    try { return parseCrewFilter(localStorage.getItem("polish.crew.filter")); } catch { return "all"; }
  });
  const children = useMemo(() => childrenByParent(threads), [threads]);
  const crew = useMemo(() => descendants(threadId, children), [threadId, children]);

  if (status === "loading") return <EmptyNote>Loading…</EmptyNote>;
  if (crew.length === 0) return <EmptyNote>This thread has not started any threads.</EmptyNote>;

  const working = crew.filter(({ thread }) => crewBucket(thread) === "working").length;
  const waiting = crew.filter(({ thread }) => needsYou(thread)).length;
  const done = crew.length - working - waiting;

  const providerIds = [...new Set(crew.map(({ thread }) => thread.providerId))];
  const filters: { id: CrewFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: crew.length }, { id: "working", label: "Working", count: working },
    { id: "needs", label: "Needs you", count: waiting }, { id: "settled", label: "Settled", count: done },
  ];
  const visibleFilter = filters.some(item => item.id === filter && item.count > 0) ? filter : "all";
  const next = waitingOnYou(crew.map(item => item.thread))[0];
  return (
    <div className="pl-crew">
      <div className="pl-crew-head">
        <div className="pl-crew-title"><span className="pl-crew-count">{crew.length} {crew.length === 1 ? "thread" : "threads"}</span>
        <span className="pl-crew-providers">{providerIds.slice(0, 4).map(id => {
          const provider = providers.get(id);
          return provider ? <span key={id} title={provider.displayName}><ProviderIcon providerKind="agent" provider={provider} className="pl-provider-icon" aria-hidden /></span> : null;
        })}{providerIds.length > 4 ? <small>+{providerIds.length - 4}</small> : null}</span></div>
        <span className="pl-crew-stats">
          {waiting > 0 ? <span data-bucket="needs">{waiting} need you</span> : null}
          {working > 0 ? <span data-bucket="running">{working} working</span> : null}
          {done > 0 ? <span data-bucket="ready">{done} settled</span> : null}
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
      <div className="pl-crew-filters">{filters.filter(item => item.id === "all" || item.count > 0).map(item => <button type="button" className="pl-chip" key={item.id} aria-pressed={visibleFilter === item.id} data-selected={visibleFilter === item.id || undefined} onClick={() => {
        setFilter(item.id);
        try { localStorage.setItem("polish.crew.filter", item.id); } catch { /* Choice still works without storage. */ }
      }}>{item.label} <span>{item.count}</span></button>)}</div>
      <div className="pl-crew-roster">
        {filterCrew(crew, visibleFilter).map(({ thread, depth }) => (
          <div className="pl-crew-entry" key={thread.id} data-working={crewBucket(thread) === "working" || undefined} data-needs={needsYou(thread) || undefined}>
            {Array.from({ length: depth }, (_, level) => <span className="pl-crew-guide" key={level} />)}
            <ThreadRow thread={thread} now={now} showProject={false} trailing={needsYou(thread) ? statusPhrase(thread) ?? "Needs you" : isBusy(thread) ? formatElapsed(thread.createdAt, now) : compactAge(lastActive(thread), now)} />
          </div>
        ))}
      </div>
      {next ? <button type="button" className="pl-button pl-crew-next" onClick={() => navigate.toThread(next.id)}>Go to the next one that needs you</button> : null}
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
}

function useCrewClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (!document.hidden) {
        setNow(Date.now());
        timer = setInterval(() => setNow(Date.now()), 1000);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return now;
}
