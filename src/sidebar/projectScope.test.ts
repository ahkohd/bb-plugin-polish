import { describe, expect, it } from "vitest";
import { ALL_PROJECTS, projectScope } from "./projectScope";

describe("projectScope", () => {
  it("shares the filter and counts header mounts", () => {
    const seen: string[] = [];
    const stop = projectScope.subscribe(() => seen.push(projectScope.get().scope));
    projectScope.setScope("proj_a");
    projectScope.setScope("proj_a");
    expect(seen).toEqual(["proj_a"]);
    const unmountA = projectScope.mountHeader();
    const unmountB = projectScope.mountHeader();
    expect(projectScope.get().headerMounts).toBe(2);
    unmountA();
    unmountB();
    unmountB();
    expect(projectScope.get().headerMounts).toBe(0);
    projectScope.setScope(ALL_PROJECTS);
    stop();
  });
});
