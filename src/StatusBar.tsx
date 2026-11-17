// The status line: a quiet row in the gutter under the main area with what is
// running and what is unread; a count of zero is left out, and with nothing
// to say the line and its gutter go away. Threads that need you show in the
// needs-you pill beside it, or here when the pill is off. Also the way out of
// zen mode.
import { useEffect } from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
} from "@get-bb/plugin-sdk/app";
import { useGutterClaim } from "./gutter";
import { isBusy, needsYou } from "./model";
import { setZen, usePrefs, useZen } from "./prefs";

export function StatusBar() {
  const { threads } = useSidebarThreads();
  const navigate = useBbNavigate();
  const [prefs] = usePrefs();
  const zen = useZen();

  useEffect(() => {
    if (!zen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setZen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  const live = threads.filter((thread) => !thread.isArchived && !thread.isHidden);
  const running = live.filter((thread) => isBusy(thread) && !needsYou(thread)).length;
  const waiting = prefs.island ? 0 : live.filter(needsYou).length;
  const unread = live.filter((thread) => thread.isUnread && thread.parentThreadId === null && !needsYou(thread) && !isBusy(thread)).length;
  const items = [
    { count: running, label: "running" },
    { count: waiting, label: waiting === 1 ? "needs you" : "need you" },
    { count: unread, label: "to review" },
  ].filter((item) => item.count > 0);
  const shown = prefs.statusbar && !zen && items.length > 0;
  useGutterClaim(shown);

  if (zen) {
    return (
      <button type="button" className="pl-zen-exit" onClick={() => setZen(false)}>
        Exit zen <kbd>Esc</kbd>
      </button>
    );
  }
  if (!shown) return null;

  return (
    <div className="pl-statusbar" role="status" aria-label="Thread status">
      <button type="button" className="pl-statusbar-item" onClick={() => navigate.toPluginPanel("overview")} title="Open Overview">
        {items.map((item) => (
          <span key={item.label}><b>{item.count}</b> {item.label}</span>
        ))}
      </button>
    </div>
  );
}
