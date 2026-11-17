// The status line: a quiet row in the gutter under the main area with what is
// running, what is unread and the time. Threads that need you show in the
// needs-you pill beside it, or here when the pill is off. Also the way out of
// zen mode.
import { useEffect, useState } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
} from "@get-bb/plugin-sdk/app";
import { isBusy, needsYou } from "./model";
import { setZen, usePrefs, useZen } from "./prefs";

function useClock(): string {
  const format = () => new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const timer = setInterval(() => setTime(format()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

export function StatusBar() {
  const { threads } = useSidebarThreads();
  const navigate = useBbNavigate();
  const [prefs] = usePrefs();
  const zen = useZen();
  const time = useClock();

  useEffect(() => {
    if (!zen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setZen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  if (zen) {
    return (
      <button type="button" className="pl-zen-exit" onClick={() => setZen(false)}>
        Exit zen <kbd>Esc</kbd>
      </button>
    );
  }
  if (!prefs.statusbar) return null;

  const live = threads.filter((thread) => !thread.isArchived && !thread.isHidden);
  const running = live.filter((thread) => isBusy(thread) && !needsYou(thread)).length;
  const waiting = live.filter(needsYou).length;
  const unread = live.filter((thread) => thread.isUnread && thread.parentThreadId === null && !needsYou(thread) && !isBusy(thread)).length;

  return (
    <div className="pl-statusbar" role="status" aria-label="Thread status">
      <button type="button" className="pl-statusbar-item" onClick={() => navigate.toPluginPanel("overview")} title="Open Overview">
        <span data-bucket="running" data-zero={running === 0 || undefined}><span className="pl-dot" />{running} running</span>
        {prefs.island ? null : (
          <span data-bucket="needs" data-zero={waiting === 0 || undefined}><span className="pl-dot" />{waiting} need you</span>
        )}
        <span data-bucket="ready" data-zero={unread === 0 || undefined}><span className="pl-dot" />{unread} to review</span>
      </button>
      <span className="pl-statusbar-time">{time}</span>
    </div>
  );
}
