// The needs-you pill: a small island at the top of the window that appears
// only while a thread is waiting on you. Clicking it opens the thread that has
// waited longest; hovering lists the rest.
//
// It is mounted once per window as an app overlay, which also makes it the
// bridge for Polish's commands: commands run outside React, so the overlay
// keeps the latest navigator and thread list where they can reach them.
import { useEffect, useState } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
  type BbNavigate,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { useGutterClaim } from "./gutter";
import { compactAge, lastActive, waitingOnYou } from "./model";
import { usePrefs } from "./prefs";
import { useNow } from "./ui";

export const bridge: {
  navigate: BbNavigate | null;
  threads: readonly PluginSidebarThread[];
} = { navigate: null, threads: [] };

/** The open thread, read from the address bar (bb's routes are /…/threads/<id>). */
export function currentThreadId(): string | null {
  const match = /\/threads\/(thr_[A-Za-z0-9]+)/.exec(window.location.pathname);
  return match ? match[1] ?? null : null;
}

function useOpenThreadId(): string | null {
  const [id, setId] = useState(currentThreadId);
  useEffect(() => {
    const timer = setInterval(() => setId(currentThreadId()), 700);
    return () => clearInterval(timer);
  }, []);
  return id;
}

export function NeedsYouIsland() {
  const { threads } = useSidebarThreads();
  const navigate = useBbNavigate();
  const [prefs] = usePrefs();
  const now = useNow();
  const openId = useOpenThreadId();

  useEffect(() => {
    bridge.navigate = navigate;
    bridge.threads = threads;
  }, [navigate, threads]);
  useEffect(() => () => {
    bridge.navigate = null;
    bridge.threads = [];
  }, []);

  const waiting = waitingOnYou(threads).filter((thread) => thread.id !== openId);
  const shown = prefs.island && waiting.length > 0;
  useGutterClaim(shown && prefs.statusbar);
  if (!shown) return null;
  const first = waiting[0]!;
  const label = waiting.length === 1
    ? first.displayTitle
    : `${waiting.length} threads need you`;

  return (
    <div className="pl-island" role="region" aria-label="Threads waiting on you">
      <button
        type="button"
        className="pl-island-pill"
        onClick={() => navigate.toThread(first.id)}
        title={`Open ${first.displayTitle}`}
      >
        <span className="pl-island-pulse" aria-hidden="true" />
        <span className="pl-island-label">{label}</span>
        {waiting.length === 1 ? <span className="pl-island-sub">needs you</span> : null}
      </button>
      {waiting.length > 1 ? (
        <div className="pl-island-list">
          {waiting.slice(0, 6).map((thread) => (
            <button key={thread.id} type="button" className="pl-island-row" onClick={() => navigate.toThread(thread.id)}>
              <span className="pl-island-row-title">{thread.displayTitle}</span>
              <span className="pl-island-row-age">{compactAge(lastActive(thread), now)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
