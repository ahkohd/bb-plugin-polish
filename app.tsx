// Polish frontend. The theme itself is CSS (themes/polish.css). Each feature
// registers itself from src/features; this file wires them up and owns the
// pieces that span features: the prefs content script, the needs-you pill,
// commands and settings.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { registerCrew } from "./src/features/crew";
import { registerHome } from "./src/features/home";
import { registerNav } from "./src/features/nav";
import { OVERVIEW_PATH, registerOverview } from "./src/features/overview";
import { registerSidebar } from "./src/sidebar/register";
import { bridge, currentThreadId, NeedsYouIsland } from "./src/Island";
import { nextNeedingYou } from "./src/model";
import { PolishSettings } from "./src/Settings";
import { StatusBar } from "./src/StatusBar";
import {
  ACCENTS,
  BACKDROPS,
  DENSITIES,
  LAYOUTS,
  PALETTES,
  applyPrefs,
  clearPrefs,
  cycle,
  isZen,
  readPrefs,
  setZen,
  subscribePrefs,
  writePrefs,
} from "./src/prefs";
import "./app.css";

export default definePluginApp((app) => {
  registerOverview(app);
  registerHome(app);
  registerCrew(app);
  registerNav(app);
  registerSidebar(app);

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

  app.slots.experimental_appOverlay({ id: "needs-you", component: NeedsYouIsland });
  app.slots.experimental_appOverlay({ id: "status", component: StatusBar });

  app.commands.register({
    id: "zen",
    title: "Polish: Toggle zen mode",
    defaultShortcut: { key: "z", mod: true, alt: true },
    run: () => setZen(!isZen()),
  });
  app.commands.register({
    id: "cycle-backdrop",
    title: "Polish: Next backdrop",
    run: () => {
      const prefs = readPrefs();
      writePrefs({ ...prefs, backdrop: cycle(BACKDROPS, prefs.backdrop) });
    },
  });

  app.commands.register({
    id: "next-needs-you",
    title: "Polish: Go to the next thread that needs you",
    defaultShortcut: { key: "j", mod: true, alt: true },
    run: ({ threadId }) => {
      const next = nextNeedingYou(bridge.threads, threadId ?? currentThreadId());
      if (next && bridge.navigate) bridge.navigate.toThread(next.id);
    },
  });
  app.commands.register({
    id: "overview",
    title: "Polish: Open Overview",
    defaultShortcut: { key: "o", mod: true, alt: true },
    run: () => bridge.navigate?.toPluginPanel(OVERVIEW_PATH),
  });
  app.commands.register({
    id: "cycle-palette",
    title: "Polish: Next palette",
    run: () => {
      const prefs = readPrefs();
      writePrefs({ ...prefs, palette: cycle(PALETTES, prefs.palette) });
    },
  });
  app.commands.register({
    id: "toggle-layout",
    title: "Polish: Toggle inset panel",
    run: () => {
      const prefs = readPrefs();
      writePrefs({ ...prefs, layout: cycle(LAYOUTS, prefs.layout) });
    },
  });
  app.commands.register({
    id: "toggle-density",
    title: "Polish: Toggle compact density",
    run: () => {
      const prefs = readPrefs();
      writePrefs({ ...prefs, density: cycle(DENSITIES, prefs.density) });
    },
  });
  app.commands.register({
    id: "cycle-accent",
    title: "Polish: Next accent colour",
    run: () => {
      const prefs = readPrefs();
      writePrefs({ ...prefs, accent: cycle(ACCENTS, prefs.accent) });
    },
  });

  app.slots.settingsSection({
    id: "appearance",
    title: "Appearance",
    description: "Palette, layout, density and accent for the Polish theme.",
    component: PolishSettings,
  });
});
