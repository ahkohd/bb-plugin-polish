// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import type { ExperimentalSidebarNavigationItem } from "@get-bb/plugin-sdk/app";

const app = await loadPluginApp(() => import("../../app"));
const navSlot = app.experimentalSidebarNavigations[0]!;

function navItem(
  overrides: Partial<ExperimentalSidebarNavigationItem> & { id: string; label: string },
): ExperimentalSidebarNavigationItem {
  return {
    icon: { kind: "host", name: "extensions" },
    action: { kind: "open-extensions" },
    isDisabled: false,
    isVisible: true,
    isLoading: false,
    pluginId: null,
    shortcut: null,
    badge: null,
    ...overrides,
  };
}

const sampleItems: ExperimentalSidebarNavigationItem[] = [
  navItem({
    id: "__bb__/new-thread",
    label: "New thread",
    icon: { kind: "host", name: "new-thread" },
    action: { kind: "new-thread" },
    shortcut: { label: "Ctrl+Shift+O", ariaKeyShortcuts: "Control+Shift+O" },
  }),
  navItem({
    id: "__bb__/search-threads",
    label: "Search threads",
    icon: { kind: "host", name: "search" },
    action: { kind: "search-threads" },
    isVisible: false,
    shortcut: { label: "Ctrl+K", ariaKeyShortcuts: "Control+K" },
  }),
  navItem({ id: "__bb__/extensions", label: "Plugins" }),
  navItem({
    id: "polish/overview",
    label: "Overview",
    badge: { count: 2, label: "2 threads need you", tone: "warning" },
  }),
  navItem({ id: "__bb__/skills", label: "Skills", isVisible: false }),
];

afterEach(() => {
  cleanup();
});

describe("Polish dock navigation", () => {
  it("draws Search and New thread in the header and activates them on click", () => {
    const Header = navSlot.headerComponent!;
    const rendered = renderSlot(
      { ...navSlot, component: Header } as never,
      { width: 120, controlSize: 28, isCompactViewport: false } as never,
      { sidebarNavigation: { items: sampleItems, activeItemId: null } },
    );
    const searchBtn = screen.getByRole("button", { name: "Search threads" });
    const newBtn = screen.getByRole("button", { name: "New thread" });
    expect(newBtn.getAttribute("aria-keyshortcuts")).toBe("Control+Shift+O");
    fireEvent.click(searchBtn);
    fireEvent.click(newBtn);
    expect(rendered.inspection.sidebarNavigationCalls).toEqual([
      { method: "activate", itemId: "__bb__/search-threads", target: "current" },
      { method: "activate", itemId: "__bb__/new-thread", target: "current" },
    ]);
  });

  it("drops Search when header width only fits one control", () => {
    const Header = navSlot.headerComponent!;
    renderSlot(
      { ...navSlot, component: Header } as never,
      { width: 32, controlSize: 28, isCompactViewport: false } as never,
      { sidebarNavigation: { items: sampleItems, activeItemId: null } },
    );
    expect(screen.queryByRole("button", { name: "Search threads" })).toBeNull();
    expect(screen.getByRole("button", { name: "New thread" })).toBeDefined();
  });

  it("renders visible labelled rows without New thread or Search, and keeps hidden items in More", () => {
    renderSlot(
      navSlot,
      { isCompactViewport: false, placement: "list", experimental_Original: () => null },
      { sidebarNavigation: { items: sampleItems, activeItemId: "polish/overview" } },
    );
    expect(screen.queryByRole("button", { name: "New thread" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search threads" })).toBeNull();
    expect(screen.getByRole("button", { name: "Plugins" })).toBeDefined();
    const overview = screen.getByRole("button", { name: "Overview, 2 threads need you" });
    expect(overview.getAttribute("aria-current")).toBe("page");
    expect(overview.textContent).toContain("2");

    fireEvent.click(screen.getByRole("button", { name: "More navigation" }));
    expect(screen.getByRole("menuitem", { name: "Skills" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Customize navigation" })).toBeDefined();
  });
});
