import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export function matchesFilter(thread: { displayTitle: string; environment: Pick<NonNullable<PluginSidebarThread["environment"]>, "branchName"> | null }, project: string, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  return [thread.displayTitle, project, thread.environment?.branchName ?? ""].some(value => value.toLocaleLowerCase().includes(needle));
}

export function moveSelection(ids: readonly string[], current: string | null, direction: 1 | -1): string | null {
  if (!ids.length) return null;
  const index = current === null ? -1 : ids.indexOf(current);
  if (index < 0) return (direction === 1 ? ids[0] : ids[ids.length - 1]) ?? null;
  return ids[Math.max(0, Math.min(ids.length - 1, index + direction))] ?? null;
}
