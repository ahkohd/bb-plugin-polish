import { useSyncExternalStore } from "react";
import type { ProjectOption } from "./ProjectPicker";

// The thread list's project filter, shared with the navigation's header row.
// When the Polish dock draws the header, the filter sits there, beside the
// sidebar toggle, and the list drops its own header row.

export const ALL_PROJECTS = "__all__";

interface ProjectScopeState {
  scope: string;
  projects: readonly ProjectOption[];
  headerMounts: number;
}

let state: ProjectScopeState = { scope: ALL_PROJECTS, projects: [], headerMounts: 0 };
const listeners = new Set<() => void>();

function update(next: Partial<ProjectScopeState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export const projectScope = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get(): ProjectScopeState {
    return state;
  },
  setScope(scope: string): void {
    if (scope !== state.scope) update({ scope });
  },
  setProjects(projects: readonly ProjectOption[]): void {
    if (projects !== state.projects) update({ projects });
  },
  mountHeader(): () => void {
    update({ headerMounts: state.headerMounts + 1 });
    return () => update({ headerMounts: Math.max(0, state.headerMounts - 1) });
  },
};

export function useProjectScope(): ProjectScopeState {
  return useSyncExternalStore(projectScope.subscribe, projectScope.get, projectScope.get);
}
