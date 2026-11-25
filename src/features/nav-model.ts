import type { ExperimentalBadge, ExperimentalSidebarNavigationItem } from "@get-bb/plugin-sdk/app";

const NEW_THREAD_ID = "__bb__/new-thread";
const SEARCH_THREADS_ID = "__bb__/search-threads";

export function splitNavigation(items: readonly ExperimentalSidebarNavigationItem[]) {
  const newThread = items.find((item) => item.id === NEW_THREAD_ID);
  const search = items.find((item) => item.id === SEARCH_THREADS_ID);
  const isHeaderItem = (item: ExperimentalSidebarNavigationItem) =>
    item.id === NEW_THREAD_ID || item.id === SEARCH_THREADS_ID;
  return {
    newThread,
    search,
    visible: items.filter((item) => !isHeaderItem(item) && item.isVisible),
    hidden: items.filter((item) => !isHeaderItem(item) && !item.isVisible),
  };
}

export function badgeText(badge: ExperimentalBadge | null): string | null {
  return badge?.count != null ? (badge.count > 99 ? "99+" : String(badge.count)) : null;
}
