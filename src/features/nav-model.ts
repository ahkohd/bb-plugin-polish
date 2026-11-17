import type { ExperimentalBadge, ExperimentalSidebarNavigationItem } from "@get-bb/plugin-sdk/app";

export function splitNavigation(items: readonly ExperimentalSidebarNavigationItem[]) {
  return {
    newThread: items.find(item => item.id === "__bb__/new-thread"),
    visible: items.filter(item => item.id !== "__bb__/new-thread" && item.isVisible),
    hidden: items.filter(item => item.id !== "__bb__/new-thread" && !item.isVisible),
  };
}

export function badgeText(badge: ExperimentalBadge | null): string | null {
  return badge?.count != null ? (badge.count > 9 ? "9+" : String(badge.count)) : null;
}
