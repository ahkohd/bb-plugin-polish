import { describe, expect, it } from "vitest";
import { matchesFilter, moveSelection } from "./overview-model";

describe("overview filtering", () => {
  const thread = { displayTitle: "Repair sign in", environment: null };
  it("matches title and project without case sensitivity and trims whitespace", () => {
    expect(matchesFilter(thread, "Website", " SIGN IN ")).toBe(true);
    expect(matchesFilter(thread, "Website", "website")).toBe(true);
    expect(matchesFilter(thread, "Website", "missing")).toBe(false);
    expect(matchesFilter(thread, "Website", "  ")).toBe(true);
  });
  it("matches a branch, including generated branches", () => {
    expect(matchesFilter({ ...thread, environment: { branchName: "fix/login" } }, "", "LOGIN")).toBe(true);
  });
});
describe("overview selection", () => {
  it("starts at either end and moves across group boundaries in flattened order", () => {
    const ids = ["needs", "working", "ready", "recent"];
    expect(moveSelection(ids, null, 1)).toBe("needs");
    expect(moveSelection(ids, null, -1)).toBe("recent");
    expect(moveSelection(ids, "working", 1)).toBe("ready");
    expect(moveSelection(ids, "ready", -1)).toBe("working");
  });
  it("stays at boundaries and recovers from filtered out selections", () => {
    expect(moveSelection(["a", "b"], "a", -1)).toBe("a");
    expect(moveSelection(["a", "b"], "b", 1)).toBe("b");
    expect(moveSelection(["b"], "removed", 1)).toBe("b");
    expect(moveSelection([], "removed", 1)).toBeNull();
  });
});
