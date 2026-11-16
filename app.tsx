// Polish frontend. The theme itself is CSS (themes/polish.css); this adds:
// - Overview: a page of threads that need you, are working, are ready or ran
//   recently, with a badge for the ones that need you;
// - a short Needs you / In progress list on the New thread page;
// - Crew: a tab beside any thread that started other threads;
// - Polish settings (layout, density, accent), applied by a content script.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { CrewTab, useHasCrew } from "./src/Crew";
import { HomeSection, OverviewPage, OVERVIEW_PATH, useNeedsYouBadge } from "./src/Overview";
import { PolishSettings } from "./src/Settings";
import { applyPrefs, clearPrefs, readPrefs, subscribePrefs } from "./src/prefs";
import "./app.css";

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.5" />
      <path d="M6.5 12.5h11M6.5 16.5h7M6.5 20h9" />
    </svg>
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

export default definePluginApp((app) => {
  app.experimental_icons.register({ name: "polish.overview", component: OverviewIcon });
  app.experimental_icons.register({ name: "polish.crew", component: CrewIcon });

  app.contentScripts.register({
    id: "prefs",
    mount({ signal }) {
      const root = document.documentElement;
      const apply = () => applyPrefs(readPrefs(), root);
      apply();
      const unsubscribe = subscribePrefs(apply);
      signal.addEventListener("abort", unsubscribe, { once: true });
      return () => {
        unsubscribe();
        clearPrefs(root);
      };
    },
  });

  app.slots.navPanel({
    id: "overview",
    title: "Overview",
    icon: "polish.overview",
    path: OVERVIEW_PATH,
    component: OverviewPage,
    experimental_useBadge: useNeedsYouBadge,
  });

  app.slots.homepageSection({
    id: "needs-you",
    title: "Your threads",
    component: HomeSection,
  });

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

  app.slots.settingsSection({
    id: "appearance",
    title: "Appearance",
    description: "Layout, density and accent for the Polish theme.",
    component: PolishSettings,
  });
});
