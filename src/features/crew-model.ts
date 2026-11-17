import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { isBusy, needsYou } from "../model";
export type CrewFilter = "all" | "working" | "needs" | "settled";
export function parseCrewFilter(value: string | null): CrewFilter {
  return value === "working" || value === "needs" || value === "settled" ? value : "all";
}
export function crewBucket(thread: PluginSidebarThread): Exclude<CrewFilter, "all"> {
  return needsYou(thread) ? "needs" : isBusy(thread) ? "working" : "settled";
}
export function filterCrew<T extends { thread: PluginSidebarThread }>(crew: readonly T[], filter: CrewFilter): T[] {
  return crew.filter(({ thread }) => filter === "all" || crewBucket(thread) === filter);
}
export function formatElapsed(createdAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m ${seconds % 60}s`;
}
