import { describe, expect, it } from "vitest";
import type { ExperimentalSidebarNavigationItem } from "@get-bb/plugin-sdk/app";
import { badgeText, splitNavigation } from "./nav-model";

const item = (id: string, isVisible = true): ExperimentalSidebarNavigationItem => ({
  id,
  isVisible,
  label: id,
  icon: { kind: "host", name: "search" },
  action: { kind: "search-threads" },
  isDisabled: false,
  isLoading: false,
  pluginId: null,
  shortcut: null,
  badge: null,
});

describe("navigation arrangement", () => {
  it("keeps saved order and separates New thread and Search even if hidden", () => {
    const items = [
      item("b"),
      item("hidden", false),
      item("__bb__/new-thread", false),
      item("__bb__/search-threads", false),
      item("a"),
    ];
    const result = splitNavigation(items);
    expect(result.newThread?.id).toBe("__bb__/new-thread");
    expect(result.search?.id).toBe("__bb__/search-threads");
    expect(result.visible.map((i) => i.id)).toEqual(["b", "a"]);
    expect(result.hidden.map((i) => i.id)).toEqual(["hidden"]);
  });

  it("handles no registered items", () =>
    expect(splitNavigation([])).toEqual({
      newThread: undefined,
      search: undefined,
      visible: [],
      hidden: [],
    }));
});

describe("badge display", () => {
  it("caps counts at 99+", () => {
    expect(badgeText({ count: 9, label: "nine" })).toBe("9");
    expect(badgeText({ count: 99, label: "ninety-nine" })).toBe("99");
    expect(badgeText({ count: 100, label: "one hundred" })).toBe("99+");
  });

  it("uses dots for text and bare badges", () => {
    expect(badgeText({ text: "NEW", label: "new" })).toBeNull();
    expect(badgeText({ label: "attention" })).toBeNull();
    expect(badgeText(null)).toBeNull();
  });
});
