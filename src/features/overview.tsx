// The Overview page: every thread that needs you, is working, is ready for
// review or ran recently, in Capy's grouped style, and the badge on its
// navigation item.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ThreadChat,
  experimental_ProviderIcon as ProviderIcon,
  experimental_ThreadStatusGlyph as ThreadStatusGlyph,
  useSidebarThreadRowStatus,
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
  type ExperimentalBadge,
  type PluginAppBuilder,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import {
  BUCKET_LABELS,
  BUCKET_ORDER,
  childrenByParent, compactAge, lastActive, meaningfulBranch, statusPhrase, isBusy,
  groupThreads,
  needsYou,
  type Bucket,
} from "../model";
import { EmptyNote, useNow, useProjectLookup, useProviderLookup } from "../ui";
import "./overview.css";
import { matchesFilter, moveSelection } from "./overview-model";


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
                    {part.text}
        </span>
      ))}
    </div>
  );
}

function remembered(key: string, fallback: string): string {
  try { return localStorage.getItem(`polish.overview.${key}`) ?? fallback; } catch { return fallback; }
}

function Glyph({ thread }: { thread: PluginSidebarThread }) {
  const rowStatus = useSidebarThreadRowStatus(thread.id);
  return <span className="pl-glyph"><ThreadStatusGlyph indicator={thread.indicator} rowStatus={rowStatus} size="compact" hideIdleDraftLabel /></span>;
}

export function OverviewPage() {
  const { status, threads, projects } = useSidebarThreads();
  const now = useNow();
  const navigate = useBbNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState(() => remembered("view", "list") === "board" ? "board" : "list");
  const [peek, setPeek] = useState(() => remembered("peek", "off") === "on");
  const [wide, setWide] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const filter = useRef<HTMLInputElement>(null);
  const suppressChatAutofocus = useRef(true);
  const projectLookup = useProjectLookup(projects);
  const providers = useProviderLookup();
  const children = useMemo(() => childrenByParent(threads), [threads]);
  const groups = useMemo(() => groupThreads(threads, now, projectId), [threads, now, projectId]);
  const visible = BUCKET_ORDER.map(bucket => ({ bucket, list: groups[bucket].filter(thread => matchesFilter(thread, projectLookup.get(thread.projectId)?.name ?? "", query)) }));
  const ids = visible.flatMap(group => group.list.map(thread => thread.id));
  const selected = threads.find(thread => thread.id === selectedId && ids.includes(thread.id));
  const split = peek && wide;
  const activeProjects = projects.filter(project => threads.some(thread => thread.projectId === project.id && !thread.isArchived && !thread.isHidden));
  const counts = { needs: groups.needs.length, running: groups.running.length, ready: groups.ready.length, recent: groups.recent.length };
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWide((entries[0]?.contentRect.width ?? 0) >= 1180));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { try { localStorage.setItem("polish.overview.view", view); localStorage.setItem("polish.overview.peek", peek ? "on" : "off"); } catch { /* Storage may be unavailable. */ } }, [view, peek]);
  useEffect(() => { if (selectedId && !ids.includes(selectedId)) setSelectedId(null); }, [ids.join("|"), selectedId]);
  useEffect(() => {
    suppressChatAutofocus.current = true;
    if (selectedId) root.current?.querySelector(`[data-thread-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedId, view, split]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") suppressChatAutofocus.current = false;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      if (["j", "k", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation(); setSelectedId(moveSelection(ids, selectedId, event.key === "j" || event.key === "ArrowDown" ? 1 : -1));
      } else if (event.key === "Enter" && selected) { event.preventDefault(); event.stopImmediatePropagation(); navigate.toThread(selected.id); }
      else if (event.key === "Escape") { event.stopImmediatePropagation(); setSelectedId(null); }
      else if (event.key === "/") { event.preventDefault(); event.stopImmediatePropagation(); filter.current?.focus(); }
      else if (event.key === "b") { event.stopImmediatePropagation(); setView(value => value === "list" ? "board" : "list"); }
      else if (event.key === "p") { event.stopImmediatePropagation(); setPeek(value => !value); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  const renderThread = (thread: PluginSidebarThread) => {
    const provider = providers.get(thread.providerId);
    const branch = meaningfulBranch(thread.environment?.branchName);
    const subs = children.get(thread.id) ?? [];
    return <a key={thread.id} href={thread.href} className={view === "board" ? "pl-overview-card" : "pl-row"} data-thread-id={thread.id} data-selected={selectedId === thread.id || undefined} data-unread={thread.isUnread || undefined}
      onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (split) setSelectedId(thread.id); else navigate.toThread(thread.id); }}
      onDoubleClick={event => { event.preventDefault(); navigate.toThread(thread.id); }}>
      {view === "list" ? <Glyph thread={thread} /> : null}
      <span className="pl-row-main">
        <span className="pl-row-title">{thread.displayTitle}</span>
        <span className="pl-row-meta">
          {provider ? <ProviderIcon providerKind="agent" provider={provider} className="pl-provider-icon" aria-hidden /> : null}
          <span className="pl-meta-item">{projectLookup.get(thread.projectId)?.name ?? "Personal"}</span>
          {branch ? <span className="pl-meta-item pl-mono">{branch}</span> : null}
          {subs.length ? <span className="pl-meta-item pl-subcount" data-needs={subs.some(needsYou) || undefined} title={`${subs.length} ${subs.length === 1 ? "subthread" : "subthreads"}${subs.some(isBusy) ? `, ${subs.filter(isBusy).length} working` : ""}`}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 3v6.5a2 2 0 0 0 2 2H11M4.5 6.5H11" /></svg>{subs.length}</span> : null}
        </span>
      </span>
      {view === "board" ? <span className="pl-overview-card-footer"><span><Glyph thread={thread} />{statusPhrase(thread) ?? "Idle"}</span><span>{compactAge(lastActive(thread), now)}</span></span> : <span className="pl-row-time">{compactAge(lastActive(thread), now)}</span>}
    </a>;
  };
  return <div className="pl-overview" ref={root} tabIndex={-1} data-view={view} data-split={split || undefined}>
    <header className="pl-overview-top" data-scrolled={scrolled || undefined}>
      <div className="pl-overview-toolbar"><div><h1 className="pl-hero-title">{greeting(now)}</h1><Summary counts={counts} /></div>
        <div className="pl-overview-actions">
          {activeProjects.length > 1 ? <label className="pl-select"><select aria-label="Project" value={projectId ?? ""} onChange={event => setProjectId(event.target.value || null)}><option value="">All projects</option>{activeProjects.map(project => <option key={project.id} value={project.id}>{project.isPersonal ? "Personal" : project.name}</option>)}</select><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 6.5 8 10l3.5-3.5" /></svg></label> : null}
          <label className="pl-overview-search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4" /><path d="m10 10 3.5 3.5" /></svg><input ref={filter} aria-label="Filter threads" placeholder="Filter threads" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { setQuery(""); event.currentTarget.blur(); event.stopPropagation(); } }} /></label>
          <div className="pl-segmented" aria-label="Overview view">{["list", "board"].map(value => <button key={value} type="button" aria-pressed={view === value} data-selected={view === value || undefined} onClick={() => setView(value)}>{value === "list" ? "List" : "Board"}</button>)}</div>
          <button type="button" className="pl-overview-icon" aria-label="Toggle peek" title="Toggle peek (p)" aria-pressed={peek} onClick={() => setPeek(value => !value)}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M9 3v10" /></svg></button>
          <button type="button" className="pl-button pl-button-primary" onClick={() => navigate.toCompose({ projectId: projectId ?? undefined, focusPrompt: true })}>New thread</button>
        </div>
      </div>
    </header>
    <div className="pl-overview-body">
      <div className="pl-overview-list" onScrollCapture={event => { if (event.target instanceof HTMLElement) setScrolled(event.target.scrollTop > 0); }}>
        {status === "loading" ? <EmptyNote>Loading threads...</EmptyNote> : status === "error" ? <EmptyNote>Could not load threads.</EmptyNote> : <>
          {!ids.length ? query.trim() ? <EmptyNote>No threads match your filter.</EmptyNote> : <div className="pl-calm"><p className="pl-calm-title">All quiet</p><p className="pl-calm-text">Nothing needs you and nothing is running. Start a thread to get going.</p></div> : null}
          {query.trim() && !ids.length ? null : <div className="pl-overview-groups">{visible.map(({ bucket, list }) => !list.length && view === "list" ? null : <section key={bucket} className="pl-overview-group"><h2>{BUCKET_LABELS[bucket]} <span>{list.length}</span></h2><div className="pl-overview-group-items">{list.length ? list.map(renderThread) : <p className="pl-overview-nothing">Nothing here</p>}</div></section>)}</div>}
        </>}
        <p className="pl-overview-legend">j k move · Enter open · p peek · b board · / filter</p>
      </div>
      {split ? <aside className="pl-overview-peek" aria-label="Thread peek"
        onPointerDown={() => { suppressChatAutofocus.current = false; }}
        onFocusCapture={event => {
          // The host composer autofocuses on mount; keep triage on the list until the user enters the pane.
          if (suppressChatAutofocus.current && event.target.closest('[contenteditable], textarea, input')) {
            root.current?.querySelector<HTMLElement>(`[data-thread-id="${selectedId}"]`)?.focus({ preventScroll: true });
          }
        }}>{selected ? <div className="pl-overview-peek-card"><header><div><h2>{selected.displayTitle}</h2><p>{projectLookup.get(selected.projectId)?.name ?? "Personal"}{selected.environment?.branchName ? ` · ${selected.environment.branchName}` : ""}</p></div><button className="pl-button" onClick={() => navigate.toThread(selected.id)}>Open</button><button className="pl-overview-icon" aria-label="Clear selection" onClick={() => setSelectedId(null)}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg></button></header><div className="pl-overview-chat"><ThreadChat key={selected.id} threadId={selected.id} variant="compact" layout="contained" /></div></div> : <p className="pl-overview-hint">Select a thread to peek. j and k move, Enter opens.</p>}</aside> : null}
    </div>
  </div>;
}

function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.5" />
      <path d="M6.5 12.5h11M6.5 16.5h7M6.5 20h9" />
    </svg>
  );
}

export function registerOverview(app: PluginAppBuilder): void {
  app.experimental_icons.register({ name: "polish.overview", component: OverviewIcon });
  app.slots.navPanel({
    id: "overview",
    title: "Overview",
    icon: "polish.overview",
    path: OVERVIEW_PATH,
    component: OverviewPage,
    experimental_useBadge: useNeedsYouBadge,
  });
}
